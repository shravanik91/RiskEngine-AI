import test from "node:test";
import assert from "node:assert/strict";
import { server } from "../server.js";

test("POST /api/analyze-pr returns sample risk report", async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/analyze-pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        useSample: true,
        testResults: "unit tests passed"
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.riskLevel, "HIGH");
    assert.match(body.report, /Release Risk: HIGH/);
    assert.ok(body.impacts.some((impact) => impact.label === "Authentication"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
