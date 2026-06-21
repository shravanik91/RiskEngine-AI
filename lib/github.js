import { parseGitHubPrUrl } from "./prUrl.js";

const GITHUB_API = "https://api.github.com";

export async function fetchPullRequest(prUrl, token = process.env.GITHUB_TOKEN) {
  const parsed = parseGitHubPrUrl(prUrl);
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-release-risk-analyzer"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const [prResponse, filesResponse] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}`, { headers }),
    fetch(`${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}/files?per_page=100`, { headers })
  ]);

  if (!prResponse.ok) {
    throw new Error(`GitHub PR fetch failed: ${prResponse.status} ${prResponse.statusText}`);
  }

  if (!filesResponse.ok) {
    throw new Error(`GitHub file fetch failed: ${filesResponse.status} ${filesResponse.statusText}`);
  }

  const pr = await prResponse.json();
  const files = await filesResponse.json();

  return {
    ...parsed,
    title: pr.title || "",
    body: pr.body || "",
    author: pr.user?.login || "unknown",
    baseBranch: pr.base?.ref || "",
    headBranch: pr.head?.ref || "",
    htmlUrl: pr.html_url || prUrl,
    files: files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch || ""
    }))
  };
}

export async function postPullRequestComment({ owner, repo, pullNumber, body, token = process.env.GITHUB_TOKEN }) {
  if (!token) {
    throw new Error("Set GITHUB_TOKEN before posting PR comments.");
  }

  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${pullNumber}/comments`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-release-risk-analyzer"
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    throw new Error(`GitHub comment failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
