# AI Release Risk Analyzer

From "what changed?" to "should this deploy?"

This hackathon MVP analyzes a GitHub pull request, test results, and architecture context to produce a plain-text release risk report.

## Features

- Paste a GitHub PR URL
- Optionally paste CI/test output
- Edit architecture rules in JSON
- Detect impacted product/system areas
- Score release risk with deterministic rules
- Generate a plain-English go/no-go report
- Optionally call an OpenAI-compatible chat completion API for richer wording

## Quick Start

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

## Environment Variables

Optional:

```text
GITHUB_TOKEN=github_pat_or_token
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

The app works without keys for public PRs and deterministic local reports.

## API

`POST /api/analyze-pr`

```json
{
  "prUrl": "https://github.com/org/repo/pull/123",
  "testResults": "All tests passed...",
  "architecture": {}
}
```

## Risk Report Format

```text
Release Risk: HIGH

Potential Impact:
- Authentication

Missing Tests:
- Session expiry

Risk Reasons:
- Authentication/session files changed

Recommendation:
Do not merge
```
