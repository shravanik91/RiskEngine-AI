export function recommendationForRisk(riskLevel) {
  if (riskLevel === "HIGH") return "Do not merge";
  if (riskLevel === "MEDIUM") return "Merge with caution";
  return "Merge";
}

export function buildDeterministicReport({ risk, impacts }) {
  const impactLabels = impacts.length > 0
    ? impacts.map((impact) => impact.label)
    : ["No mapped architecture area"];
  const missingTests = risk.missingTests.length > 0 ? risk.missingTests : ["None detected"];
  const reasons = risk.reasons.length > 0 ? risk.reasons : ["Small change with no mapped high-risk area"];

  return [
    `Release Risk: ${risk.riskLevel}`,
    "",
    "Potential Impact:",
    ...impactLabels.map((label) => `- ${label}`),
    "",
    "Missing Tests:",
    ...missingTests.map((test) => `- ${test}`),
    "",
    "Risk Reasons:",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    "Recommendation:",
    recommendationForRisk(risk.riskLevel)
  ].join("\n");
}
