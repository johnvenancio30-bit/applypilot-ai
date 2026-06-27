const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
}

try {
  const response = await request("/");
  const html = await response.text();

  record("homepage status", response.status === 200, `status=${response.status}`);
  record("homepage content", html.includes("ApplyPilot AI"), "contains product name");
  record("homepage secret exposure", !html.includes("AQ."), "no local key pattern in HTML");
} catch (error) {
  record("homepage", false, error.message);
}

try {
  const response = await request("/api/analyze");
  record("GET /api/analyze rejected", [404, 405].includes(response.status), `status=${response.status}`);
} catch (error) {
  record("GET /api/analyze rejected", false, error.message);
}

try {
  const response = await request("/api/analyze", {
    method: "POST",
    body: "{ bad json",
  });

  record("invalid JSON rejected", response.status === 400, `status=${response.status}`);
} catch (error) {
  record("invalid JSON rejected", false, error.message);
}

try {
  const response = await request("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      company: "Smoke Test",
      role: "Frontend Developer",
      resumeText: "",
      jobText: "React role",
    }),
  });

  record("missing resume rejected", response.status === 400, `status=${response.status}`);
} catch (error) {
  record("missing resume rejected", false, error.message);
}

try {
  const started = Date.now();
  const response = await request("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      company: "Northstar Labs",
      role: "Frontend Developer",
      resumeText:
        "React TypeScript frontend developer with dashboard experience, API integration, reusable components, and UI polish.",
      jobText:
        "Frontend developer role requiring React, TypeScript, accessible UI, API integration, design systems, and product collaboration.",
    }),
  });
  const json = await response.json();
  const result = json.result || {};
  const shapeOk =
    Number.isInteger(result.matchScore) &&
    result.matchScore >= 0 &&
    result.matchScore <= 100 &&
    Array.isArray(result.matchingSkills) &&
    result.matchingSkills.length > 0 &&
    Array.isArray(result.missingKeywords) &&
    result.missingKeywords.length > 0 &&
    Array.isArray(result.bulletSuggestions) &&
    result.bulletSuggestions.length > 0 &&
    Array.isArray(result.toolRuns) &&
    result.toolRuns.length > 0 &&
    Array.isArray(result.approvalGates) &&
    result.approvalGates.length > 0 &&
    typeof result.coverLetterOpening === "string" &&
    result.coverLetterOpening.length > 40;

  record(
    "valid analysis shape",
    response.status === 200 && ["gemini", "demo"].includes(json.source) && shapeOk,
    `status=${response.status}; source=${json.source}; score=${result.matchScore}; ms=${Date.now() - started}`,
  );
} catch (error) {
  record("valid analysis shape", false, error.message);
}

let failed = 0;

for (const result of results) {
  const status = result.ok ? "PASS" : "FAIL";
  console.log(`${status}\t${result.name}\t${result.detail}`);

  if (!result.ok) {
    failed += 1;
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
