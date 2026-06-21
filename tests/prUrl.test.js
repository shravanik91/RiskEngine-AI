import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubPrUrl } from "../lib/prUrl.js";

test("parses a GitHub PR URL", () => {
  assert.deepEqual(parseGitHubPrUrl("https://github.com/acme/app/pull/42"), {
    owner: "acme",
    repo: "app",
    pullNumber: 42
  });
});

test("rejects non-PR URLs", () => {
  assert.throws(
    () => parseGitHubPrUrl("https://github.com/acme/app/issues/42"),
    /github\.com\/owner\/repo\/pull\/123/
  );
});
