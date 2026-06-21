import test from "node:test";
import assert from "node:assert/strict";
import { analyzePullRequest } from "../lib/analyzer.js";

test("analyzes a local PR object without external services", async () => {
  const result = await analyzePullRequest({
    pr: {
      title: "Change session expiry",
      body: "",
      files: [
        {
          filename: "src/session/expiry.ts",
          additions: 70,
          deletions: 10,
          patch: "export function expiresAt() {}"
        }
      ]
    },
    architecture: {
      authentication: {
        label: "Authentication",
        files: ["src/session/**"],
        risk: "high",
        required_tests: ["session expiry"]
      }
    },
    testResults: ""
  });

  assert.equal(result.riskLevel, "HIGH");
  assert.equal(result.impacts[0].label, "Authentication");
  assert.match(result.report, /Recommendation:\nDo not merge/);
});
