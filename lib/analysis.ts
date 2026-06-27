export type StepStatus = "Done" | "Ready" | "Waiting";
export type Status = "Draft" | "Ready" | "Applied" | "Follow Up";

export type AgentStep = {
  label: string;
  status: StepStatus;
  detail: string;
};

export type BulletSuggestion = {
  before: string;
  after: string;
  rationale: string;
};

export type ToolRun = {
  name: string;
  status: StepStatus;
  output: string;
};

export type ApprovalGate = {
  label: string;
  status: "Waiting" | "Ready" | "Approved";
  detail: string;
};

export type TrackerItem = {
  id?: string;
  company: string;
  role: string;
  score: number;
  status: Status;
  date: string;
};

export type AnalysisPayload = {
  company: string;
  role: string;
  resumeText: string;
  jobText: string;
};

export type AnalysisResult = {
  matchScore: number;
  summary: string;
  matchingSkills: string[];
  missingKeywords: string[];
  skillGaps: string[];
  bulletSuggestions: BulletSuggestion[];
  coverLetterOpening: string;
  agentSteps: AgentStep[];
  toolRuns: ToolRun[];
  approvalGates: ApprovalGate[];
  nextActions: string[];
};

export const resumeSeed =
  "Frontend developer with React, TypeScript, and dashboard experience. Built reusable components, connected REST APIs, improved responsive layouts, and collaborated with product teams on user-facing workflows.";

export const jobSeed =
  "We are hiring a Frontend Developer to build analytics dashboards with React and TypeScript. The role requires accessible UI, API integration, design system collaboration, and product-minded problem solving.";

export const baseTracker: TrackerItem[] = [
  {
    company: "Northstar Labs",
    role: "Frontend Developer",
    score: 76,
    status: "Ready",
    date: "Jun 26",
  },
  {
    company: "BrightPath",
    role: "Junior Full Stack Developer",
    score: 71,
    status: "Draft",
    date: "Jun 24",
  },
  {
    company: "Atlas Commerce",
    role: "React Developer",
    score: 82,
    status: "Applied",
    date: "Jun 20",
  },
  {
    company: "CivicGrid",
    role: "Product Engineer",
    score: 68,
    status: "Follow Up",
    date: "Jun 18",
  },
];

export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    matchScore: { type: "integer" },
    summary: { type: "string" },
    matchingSkills: {
      type: "array",
      items: { type: "string" },
    },
    missingKeywords: {
      type: "array",
      items: { type: "string" },
    },
    skillGaps: {
      type: "array",
      items: { type: "string" },
    },
    bulletSuggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          before: { type: "string" },
          after: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["before", "after", "rationale"],
      },
    },
    coverLetterOpening: { type: "string" },
    agentSteps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          status: {
            type: "string",
            enum: ["Done", "Ready", "Waiting"],
          },
          detail: { type: "string" },
        },
        required: ["label", "status", "detail"],
      },
    },
    toolRuns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          status: {
            type: "string",
            enum: ["Done", "Ready", "Waiting"],
          },
          output: { type: "string" },
        },
        required: ["name", "status", "output"],
      },
    },
    approvalGates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          status: {
            type: "string",
            enum: ["Waiting", "Ready", "Approved"],
          },
          detail: { type: "string" },
        },
        required: ["label", "status", "detail"],
      },
    },
    nextActions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "matchScore",
    "summary",
    "matchingSkills",
    "missingKeywords",
    "skillGaps",
    "bulletSuggestions",
    "coverLetterOpening",
    "agentSteps",
    "toolRuns",
    "approvalGates",
    "nextActions",
  ],
} as const;

export function createDemoAnalysis(company = "Northstar Labs", role = "Frontend Developer"): AnalysisResult {
  const companyName = company.trim() || "the company";
  const roleName = role.trim() || "the target role";

  return {
    matchScore: 76,
    summary:
      "Your strongest fit is React and TypeScript dashboard work. Add measurable proof and role-specific keywords before applying.",
    matchingSkills: ["React", "TypeScript", "dashboard UI", "API integration", "user workflows"],
    missingKeywords: ["A/B testing", "accessibility audits", "design systems", "analytics events"],
    skillGaps: [
      "Add one measurable example of performance or conversion impact.",
      "Mention accessibility testing if the role expects product quality ownership.",
      "Show collaboration with product or design in one recent project.",
    ],
    bulletSuggestions: [
      {
        before: "Built responsive pages for a web application using React.",
        after:
          "Built responsive React and TypeScript workflows for a customer dashboard, reducing repeated navigation steps across the main application flow.",
        rationale: "Adds stack, product surface, and clearer impact.",
      },
      {
        before: "Worked with APIs and handled frontend data.",
        after:
          "Integrated REST API data into reusable dashboard components with loading, empty, and error states for a more reliable user experience.",
        rationale: "Turns a generic task into an implementation-quality signal.",
      },
      {
        before: "Improved UI based on feedback.",
        after:
          "Translated stakeholder feedback into focused UI improvements, tightening form flows and making key actions easier to scan.",
        rationale: "Shows collaboration and product judgment.",
      },
    ],
    coverLetterOpening: `I am excited to apply for the ${roleName} role at ${companyName}. My React and TypeScript work has focused on building practical dashboard workflows, integrating API data, and improving user-facing interfaces with clear loading, empty, and error states.`,
    agentSteps: [
      {
        label: "Read resume",
        status: "Done",
        detail: "Profile, experience, skills, and proof points mapped.",
      },
      {
        label: "Analyze job",
        status: "Done",
        detail: "Role requirements and keywords grouped by priority.",
      },
      {
        label: "Compare fit",
        status: "Done",
        detail: "Match score, gaps, and strong signals prepared.",
      },
      {
        label: "Rewrite bullets",
        status: "Ready",
        detail: "Three targeted bullets are ready for approval.",
      },
      {
        label: "Draft cover letter",
        status: "Waiting",
        detail: "Queued after bullet approval.",
      },
    ],
    toolRuns: [
      {
        name: "resume_parser",
        status: "Done",
        output: "Mapped role title, frontend skills, dashboard work, and collaboration evidence.",
      },
      {
        name: "job_requirement_analyzer",
        status: "Done",
        output: "Found React, TypeScript, accessible UI, API integration, and product collaboration requirements.",
      },
      {
        name: "match_scorer",
        status: "Done",
        output: "Calculated a strong but incomplete fit because measurable impact and design-system proof are thin.",
      },
      {
        name: "bullet_rewriter",
        status: "Ready",
        output: "Prepared targeted bullet rewrites that need user approval before saving.",
      },
    ],
    approvalGates: [
      {
        label: "Resume bullets",
        status: "Ready",
        detail: "Approve the strongest bullet rewrites before using them.",
      },
      {
        label: "Cover letter opening",
        status: "Waiting",
        detail: "Review after at least one resume bullet is approved.",
      },
      {
        label: "Tracker save",
        status: "Waiting",
        detail: "Save only after the tailored application is ready.",
      },
    ],
    nextActions: [
      "Approve the strongest rewritten bullets.",
      "Add measurable impact where possible.",
      "Save the tailored application to the tracker.",
    ],
  };
}
