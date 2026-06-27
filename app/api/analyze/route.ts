import { NextResponse } from "next/server";
import {
  analysisJsonSchema,
  createDemoAnalysis,
  type AgentStep,
  type ApprovalGate,
  type AnalysisPayload,
  type AnalysisResult,
  type BulletSuggestion,
  type ToolRun,
} from "../../../lib/analysis";

const GEMINI_INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export async function POST(request: Request) {
  let payload: AnalysisPayload;

  try {
    payload = (await request.json()) as AnalysisPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.resumeText?.trim() || !payload.jobText?.trim()) {
    return NextResponse.json(
      { error: "Resume text and job description are required." },
      { status: 400 },
    );
  }

  const fallback = createDemoAnalysis(payload.company, payload.role);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      source: "demo",
      notice: "Add GEMINI_API_KEY to enable live Gemini analysis.",
      result: fallback,
    });
  }

  try {
    const result = await analyzeWithGemini(payload, fallback, apiKey);

    return NextResponse.json({
      source: "gemini",
      notice: "Live Gemini analysis generated.",
      result,
    });
  } catch {
    return NextResponse.json({
      source: "demo",
      notice: "Gemini was unavailable, so demo analysis was returned.",
      result: fallback,
    });
  }
}

async function analyzeWithGemini(
  payload: AnalysisPayload,
  fallback: AnalysisResult,
  apiKey: string,
) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(GEMINI_INTERACTIONS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(payload),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: analysisJsonSchema,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}.`);
  }

  const data = (await response.json()) as unknown;
  const outputText = extractOutputText(data);
  const parsed = JSON.parse(outputText) as Partial<AnalysisResult>;

  return normalizeAnalysis(parsed, fallback);
}

function buildPrompt(payload: AnalysisPayload) {
  return [
    "You are ApplyPilot AI, a careful job application assistant.",
    "Analyze the resume against the job description.",
    "Return only valid JSON that follows the requested schema.",
    "Keep all content practical, specific, and suitable for a job seeker to approve before using.",
    "",
    `Company: ${payload.company || "Not provided"}`,
    `Target role: ${payload.role || "Not provided"}`,
    "",
    "Resume:",
    payload.resumeText,
    "",
    "Job description:",
    payload.jobText,
  ].join("\n");
}

function extractOutputText(data: unknown): string {
  const record = data as Record<string, unknown>;

  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  if (typeof record.outputText === "string") {
    return record.outputText;
  }

  if (typeof record.text === "string") {
    return record.text;
  }

  const candidateText = extractGenerateContentText(record);

  if (candidateText) {
    return candidateText;
  }

  const interactionText = extractInteractionText(record);

  if (interactionText) {
    return interactionText;
  }

  throw new Error("Gemini response did not include text output.");
}

function extractInteractionText(record: Record<string, unknown>) {
  const steps = record.steps;

  if (!Array.isArray(steps)) {
    return "";
  }

  for (const step of steps) {
    const stepRecord = step as Record<string, unknown>;

    if (stepRecord.type !== "model_output" || !Array.isArray(stepRecord.content)) {
      continue;
    }

    const firstText = stepRecord.content
      .map((item) => item as Record<string, unknown>)
      .find((item) => typeof item.text === "string" && item.text.trim());

    if (typeof firstText?.text === "string") {
      return firstText.text;
    }
  }

  return "";
}

function extractGenerateContentText(record: Record<string, unknown>) {
  const candidates = record.candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  const firstPart = parts[0] as Record<string, unknown> | undefined;
  return typeof firstPart?.text === "string" ? firstPart.text : "";
}

function normalizeAnalysis(candidate: Partial<AnalysisResult>, fallback: AnalysisResult): AnalysisResult {
  return {
    matchScore: clampScore(candidate.matchScore, fallback.matchScore),
    summary: normalizeString(candidate.summary, fallback.summary),
    matchingSkills: normalizeStringArray(candidate.matchingSkills, fallback.matchingSkills),
    missingKeywords: normalizeStringArray(candidate.missingKeywords, fallback.missingKeywords),
    skillGaps: normalizeStringArray(candidate.skillGaps, fallback.skillGaps),
    bulletSuggestions: normalizeBullets(candidate.bulletSuggestions, fallback.bulletSuggestions),
    coverLetterOpening: normalizeString(candidate.coverLetterOpening, fallback.coverLetterOpening),
    agentSteps: normalizeAgentSteps(candidate.agentSteps, fallback.agentSteps),
    toolRuns: normalizeToolRuns(candidate.toolRuns, fallback.toolRuns),
    approvalGates: normalizeApprovalGates(candidate.approvalGates, fallback.approvalGates),
    nextActions: normalizeStringArray(candidate.nextActions, fallback.nextActions),
  };
}

function clampScore(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  return cleaned.length ? cleaned.slice(0, 8) : fallback;
}

function normalizeBullets(value: unknown, fallback: BulletSuggestion[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => item as Partial<BulletSuggestion>)
    .filter((item) => item.before?.trim() && item.after?.trim())
    .map((item) => ({
      before: item.before?.trim() || "",
      after: item.after?.trim() || "",
      rationale: item.rationale?.trim() || "Improves relevance for the target role.",
    }));

  return cleaned.length ? cleaned.slice(0, 5) : fallback;
}

function normalizeAgentSteps(value: unknown, fallback: AgentStep[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const statuses = new Set(["Done", "Ready", "Waiting"]);
  const cleaned = value
    .map((item) => item as Partial<AgentStep>)
    .filter((item) => item.label?.trim() && item.detail?.trim())
    .map((item) => ({
      label: item.label?.trim() || "",
      status: statuses.has(item.status || "") ? item.status || "Ready" : "Ready",
      detail: item.detail?.trim() || "",
    })) as AgentStep[];

  return cleaned.length ? cleaned.slice(0, 6) : fallback;
}

function normalizeToolRuns(value: unknown, fallback: ToolRun[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const statuses = new Set(["Done", "Ready", "Waiting"]);
  const cleaned = value
    .map((item) => item as Partial<ToolRun>)
    .filter((item) => item.name?.trim() && item.output?.trim())
    .map((item) => ({
      name: item.name?.trim() || "",
      status: statuses.has(item.status || "") ? item.status || "Ready" : "Ready",
      output: item.output?.trim() || "",
    })) as ToolRun[];

  return cleaned.length ? cleaned.slice(0, 6) : fallback;
}

function normalizeApprovalGates(value: unknown, fallback: ApprovalGate[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const statuses = new Set(["Waiting", "Ready", "Approved"]);
  const cleaned = value
    .map((item) => item as Partial<ApprovalGate>)
    .filter((item) => item.label?.trim() && item.detail?.trim())
    .map((item) => ({
      label: item.label?.trim() || "",
      status: statuses.has(item.status || "") ? item.status || "Waiting" : "Waiting",
      detail: item.detail?.trim() || "",
    })) as ApprovalGate[];

  return cleaned.length ? cleaned.slice(0, 5) : fallback;
}
