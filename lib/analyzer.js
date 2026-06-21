import { detectImpacts, normalizeArchitecture } from "./architecture.js";
import { calculateRisk } from "./riskScore.js";
import { generateRiskReport } from "./llm.js";

export async function analyzePullRequest({ pr, architecture, testResults = "" }) {
  const normalizedArchitecture = normalizeArchitecture(architecture);
  const impacts = detectImpacts(pr.files, normalizedArchitecture);
  const risk = calculateRisk({ files: pr.files, impacts, testResults });
  const report = await generateRiskReport({ pr, impacts, risk, testResults });

  return {
    riskLevel: risk.riskLevel,
    score: risk.score,
    impacts: impacts.map((impact) => ({
      key: impact.key,
      label: impact.label,
      risk: impact.risk,
      matchedFiles: impact.matchedFiles
    })),
    missingTests: risk.missingTests,
    reasons: risk.reasons,
    recommendation: report.split("Recommendation:").at(-1)?.trim() || "",
    report,
    summary: risk.summary
  };
}
