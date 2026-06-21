import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePullRequest } from "./lib/analyzer.js";
import { fetchPullRequest, postPullRequestComment } from "./lib/github.js";
import { loadDefaultArchitecture } from "./lib/architecture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);

export const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/api/analyze-pr") {
      await handleAnalyze(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/comment-pr") {
      await handleComment(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/default-architecture") {
      sendJson(response, 200, loadDefaultArchitecture());
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Unexpected server error" });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, () => {
    console.log(`AI Release Risk Analyzer running at http://localhost:${port}`);
  });
}

async function handleAnalyze(request, response) {
  const body = await readJson(request);
  const architecture = body.architecture || loadDefaultArchitecture();
  const testResults = body.testResults || "";

  let pr;
  if (body.useSample) {
    pr = samplePullRequest();
  } else {
    pr = await fetchPullRequest(body.prUrl);
  }

  const result = await analyzePullRequest({ pr, architecture, testResults });
  sendJson(response, 200, { ...result, pr });
}

async function handleComment(request, response) {
  const body = await readJson(request);
  const comment = await postPullRequestComment({
    owner: body.owner,
    repo: body.repo,
    pullNumber: body.pullNumber,
    body: body.report
  });

  sendJson(response, 200, { url: comment.html_url });
}

async function serveStatic(urlPath, response) {
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden", "text/plain");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    sendText(response, 200, file, contentType(filePath));
  } catch {
    sendText(response, 404, "Not found", "text/plain");
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, status, data) {
  sendText(response, status, JSON.stringify(data, null, 2), "application/json");
}

function sendText(response, status, body, type) {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function contentType(filePath) {
  const extension = path.extname(filePath);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function samplePullRequest() {
  return {
    owner: "demo",
    repo: "checkout",
    pullNumber: 42,
    title: "Adjust session expiry and checkout retry behavior",
    body: "Updates session expiry handling and payment retry conditions.",
    author: "hackathon-demo",
    baseBranch: "main",
    headBranch: "session-payment-risk",
    htmlUrl: "https://github.com/demo/checkout/pull/42",
    files: [
      {
        filename: "src/session/expiry.ts",
        status: "modified",
        additions: 96,
        deletions: 34,
        changes: 130,
        patch: "export function shouldExpireSession(user, now) { return now > user.sessionExpiresAt }"
      },
      {
        filename: "src/payments/retry.ts",
        status: "modified",
        additions: 74,
        deletions: 20,
        changes: 94,
        patch: "export function shouldRetryPayment(error) { return error.retryable }"
      }
    ]
  };
}
