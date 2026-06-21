import test from "node:test";
import assert from "node:assert/strict";
import { detectImpacts } from "../lib/architecture.js";
import { calculateRisk, detectMissingTests } from "../lib/riskScore.js";
import { buildDeterministicReport } from "../lib/report.js";

const architecture = {
  authentication: {
    label: "Authentication",
    files: ["src/auth/**", "src/session/**"],
    risk: "high",
    required_tests: ["login", "session expiry", "invalid token"]
  }
};

test("maps changed files to architecture impacts", () => {
  const impacts = detectImpacts([{ filename: "src/session/token.ts" }], architecture);

  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].label, "Authentication");
  assert.deepEqual(impacts[0].matchedFiles, ["src/session/token.ts"]);
});

test("detects required tests missing from test output and changed test files", () => {
  const files = [
    { filename: "src/session/token.ts", additions: 20, deletions: 5 },
    { filename: "src/session/token.test.ts", additions: 15, deletions: 0, patch: "it validates login" }
  ];
  const impacts = detectImpacts(files, architecture);

  assert.deepEqual(detectMissingTests(impacts, files, "login passed"), [
    "Session expiry",
    "Invalid token"
  ]);
});

test("scores auth change with no tests as high risk", () => {
  const files = [{ filename: "src/auth/session.ts", additions: 80, deletions: 45 }];
  const impacts = detectImpacts(files, architecture);
  const risk = calculateRisk({ files, impacts, testResults: "unit tests passed" });

  assert.equal(risk.riskLevel, "HIGH");
  assert.ok(risk.missingTests.includes("Session expiry"));
});

test("builds report in PRD format", () => {
  const files = [{ filename: "src/auth/session.ts", additions: 80, deletions: 45 }];
  const impacts = detectImpacts(files, architecture);
  const risk = calculateRisk({ files, impacts, testResults: "" });
  const report = buildDeterministicReport({ risk, impacts });

  assert.match(report, /^Release Risk: HIGH/);
  assert.match(report, /Potential Impact:\n- Authentication/);
  assert.match(report, /Recommendation:\nDo not merge/);
});
