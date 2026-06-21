import { buildDeterministicReport } from "./report.js";

export async function generateRiskReport({ pr, impacts, risk, testResults }) {
  if (!process.env.OPENAI_API_KEY) {
    return buildDeterministicReport({ risk, impacts });
  }

  const prompt = buildPrompt({ pr, impacts, risk, testResults });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a conservative release risk reviewer. Return only the requested plain-text report."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return buildDeterministicReport({ risk, impacts });
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || buildDeterministicReport({ risk, impacts });
}

function buildPrompt({ pr, impacts, risk, testResults }) {
  const context = {
    pr: {
      title: pr.title,
      body: pr.body,
      files: pr.files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: truncate(file.patch || "", 1200)
      }))
    },
    impacts,
    deterministicRisk: {
      score: risk.score,
      riskLevel: risk.riskLevel,
      missingTests: risk.missingTests,
      reasons: risk.reasons
    },
    testResults: truncate(testResults || "", 1500)
  };

  return [
    "Decide whether this PR should be deployed.",
    "",
    "Return exactly this format:",
    "",
    "Release Risk: LOW | MEDIUM | HIGH",
    "",
    "Potential Impact:",
    "- ...",
    "",
    "Missing Tests:",
    "- ...",
    "",
    "Risk Reasons:",
    "- ...",
    "",
    "Recommendation:",
    "Merge | Merge with caution | Do not merge",
    "",
    "Be conservative for auth, payment, permissions, data migration, security, and production config changes.",
    "",
    JSON.stringify(context, null, 2)
  ].join("\n");
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated]`;
}
