export function parseGitHubPrUrl(input) {
  let url;

  try {
    url = new URL(String(input).trim());
  } catch {
    throw new Error("Enter a valid GitHub pull request URL.");
  }

  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new Error("Only github.com pull request URLs are supported in this MVP.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 4 || parts[2] !== "pull") {
    throw new Error("URL must look like https://github.com/owner/repo/pull/123.");
  }

  const pullNumber = Number(parts[3]);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
    throw new Error("Pull request number must be a positive integer.");
  }

  return {
    owner: parts[0],
    repo: parts[1],
    pullNumber
  };
}
