const form = document.querySelector("#analyzeForm");
const prUrl = document.querySelector("#prUrl");
const testResults = document.querySelector("#testResults");
const architecture = document.querySelector("#architecture");
const sampleButton = document.querySelector("#sampleButton");
const analyzeButton = document.querySelector("#analyzeButton");
const statusText = document.querySelector("#status");
const riskTitle = document.querySelector("#riskTitle");
const riskBadge = document.querySelector("#riskBadge");
const impactList = document.querySelector("#impactList");
const report = document.querySelector("#report");
const copyButton = document.querySelector("#copyButton");
const commentButton = document.querySelector("#commentButton");
const scoreValue = document.querySelector("#scoreValue");
const fileValue = document.querySelector("#fileValue");
const lineValue = document.querySelector("#lineValue");
const testValue = document.querySelector("#testValue");
const reportState = document.querySelector("#reportState");
const missingTestsList = document.querySelector("#missingTestsList");
const recommendationCopy = document.querySelector("#recommendationCopy");
const workspacePanel = document.querySelector("#workspacePanel");
const panelEyebrow = document.querySelector("#panelEyebrow");
const panelTitle = document.querySelector("#panelTitle");
const panelBody = document.querySelector("#panelBody");
const closePanelButton = document.querySelector("#closePanelButton");
const serverWarning = document.querySelector("#serverWarning");

let lastResult = null;
let useSample = false;
let defaultArchitecture = null;

if (location.protocol === "file:") {
  serverWarning.hidden = false;
}

loadArchitecture();

sampleButton.addEventListener("click", () => {
  useSample = true;
  prUrl.value = "https://github.com/demo/checkout/pull/42";
  testResults.value = "Unit tests passed, but no session expiry, invalid token, webhook retry, or refund tests were run.";
  setStatus("Sample loaded");
  reportState.textContent = "ready";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  reportState.textContent = "running";
  report.textContent = "Analyzing release risk...";
  setLoading(true);

  try {
    const parsedArchitecture = getArchitecture();
    const shouldUseSample = useSample || prUrl.value.includes("github.com/demo/checkout/pull/42");
    const response = await fetch("/api/analyze-pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prUrl: prUrl.value,
        testResults: testResults.value,
        architecture: parsedArchitecture,
        useSample: shouldUseSample
      })
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Analysis failed");
    }

    lastResult = body;
    renderResult(body);
    setStatus("Analysis complete");
  } catch (error) {
    report.textContent = error.message;
    reportState.textContent = "error";
    riskTitle.textContent = "ANALYSIS FAILED";
    riskBadge.textContent = "ERROR";
    riskBadge.className = "risk-badge high";
    setStatus("Could not analyze PR");
  } finally {
    setLoading(false);
  }
});

copyButton.addEventListener("click", async () => {
  const ok = await copyText(report.textContent);
  setStatus(ok ? "Report exported" : "Copy failed");
});

commentButton.addEventListener("click", async () => {
  if (!lastResult?.report) {
    setStatus("Run analysis first");
    return;
  }

  if (lastResult.pr?.owner === "demo") {
    reportState.textContent = "override staged";
    setStatus("Demo override staged");
    return;
  }

  setStatus("Posting comment...");
  try {
    const response = await fetch("/api/comment-pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: lastResult.pr.owner,
        repo: lastResult.pr.repo,
        pullNumber: lastResult.pr.pullNumber,
        report: lastResult.report
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Comment failed");
    setStatus("Comment posted");
  } catch (error) {
    setStatus(error.message);
  }
});

document.querySelectorAll("[data-panel]").forEach((control) => {
  control.addEventListener("click", (event) => {
    event.preventDefault();
    openPanel(control.dataset.panel, control);
  });
});

document.querySelector(".search-box input")?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const query = event.currentTarget.value.trim() || "recent pull requests";
  showPanel("Search Results", "Repository Search", `
    <div class="panel-list">
      <article><strong>demo/high-risk-auth-payment</strong><span>HIGH risk branch touching auth and payments.</span></article>
      <article><strong>demo/low-risk-ui-copy</strong><span>LOW risk branch with a checkout banner copy update.</span></article>
      <article><strong>${escapeHtml(query)}</strong><span>No live repository index is connected in this demo.</span></article>
    </div>
  `);
  setStatus("Search panel opened");
});

closePanelButton?.addEventListener("click", () => {
  workspacePanel.hidden = true;
  setStatus("Panel closed");
});

async function loadArchitecture() {
  try {
    const response = await fetch("/api/default-architecture");
    defaultArchitecture = await response.json();
    architecture.value = JSON.stringify(defaultArchitecture, null, 2);
  } catch {
    defaultArchitecture = null;
    architecture.value = "";
  }
}

function getArchitecture() {
  const raw = architecture.value.trim();
  if (!raw) return defaultArchitecture;
  return JSON.parse(raw);
}

function renderResult(result) {
  const level = result.riskLevel.toLowerCase();
  riskTitle.textContent = recommendationTitle(result.recommendation, result.riskLevel);
  riskBadge.textContent = `${result.riskLevel} RISK`;
  riskBadge.className = `risk-badge ${level}`;
  report.textContent = result.report;
  reportState.textContent = "complete";
  scoreValue.textContent = String(result.score);
  fileValue.textContent = String(result.summary?.fileCount ?? "--");
  lineValue.textContent = String(result.summary?.totalChangedLines ?? "--");
  testValue.textContent = String(result.summary?.testFiles?.length ?? 0);
  useSample = false;

  recommendationCopy.textContent = recommendationText(result);

  const chips = result.impacts.length > 0
    ? result.impacts.map((impact) => {
        const chip = document.createElement("span");
        chip.className = "impact-chip";
        chip.textContent = impact.label;
        return chip;
      })
    : [emptyImpactChip()];

  impactList.replaceChildren(...chips);

  const missing = result.missingTests.length > 0 ? result.missingTests : ["None detected"];
  missingTestsList.replaceChildren(
    ...missing.map((testName) => {
      const item = document.createElement("span");
      item.textContent = testName;
      return item;
    })
  );
}

function setLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeButton.innerHTML = isLoading ? "ANALYZING..." : "ANALYZE RELEASE RISK <span>*</span>";
}

function setStatus(message) {
  statusText.textContent = message;
}

function emptyImpactChip() {
  const chip = document.createElement("span");
  chip.className = "impact-chip";
  chip.textContent = "No mapped impact";
  return chip;
}

function recommendationTitle(recommendation, riskLevel) {
  if (recommendation === "Do not merge" || riskLevel === "HIGH") return "DO NOT MERGE";
  if (recommendation === "Merge with caution" || riskLevel === "MEDIUM") return "MERGE WITH CAUTION";
  return "MERGE";
}

function recommendationText(result) {
  if (result.riskLevel === "HIGH") {
    return "Critical release risk detected in impacted code paths. Remediation is required before deployment.";
  }
  if (result.riskLevel === "MEDIUM") {
    return "Moderate release risk detected. Merge only after the missing tests and review notes are addressed.";
  }
  return "No major release blockers detected from the provided pull request and test evidence.";
}

function openPanel(panel, source) {
  document.querySelectorAll(".side-nav a, .side-footer a").forEach((link) => {
    link.classList.toggle("active", link === source);
  });

  if (panel === "dashboard") {
    workspacePanel.hidden = true;
    document.querySelector(".dashboard-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("Dashboard opened");
    return;
  }

  const config = panelContent(panel);
  showPanel(config.title, config.eyebrow, config.body);
  setStatus(`${config.title} opened`);
}

function showPanel(title, eyebrow, body) {
  panelTitle.textContent = title;
  panelEyebrow.textContent = eyebrow;
  panelBody.innerHTML = body;
  workspacePanel.hidden = false;
  workspacePanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function panelContent(panel) {
  const reports = lastResult
    ? `<article><strong>Latest Analysis</strong><span>${lastResult.riskLevel} risk, score ${lastResult.score}, ${lastResult.recommendation}.</span></article>`
    : `<article><strong>No analysis yet</strong><span>Run the pull request analyzer to add a release decision here.</span></article>`;

  const panels = {
    "release-history": {
      title: "Release History",
      eyebrow: "Recent Decisions",
      body: `
        <div class="panel-list">
          ${reports}
          <article><strong>demo/high-risk-auth-payment</strong><span>Blocked: auth/session and payment retry changes lacked required tests.</span></article>
          <article><strong>demo/low-risk-ui-copy</strong><span>Allowed: UI copy-only change with low release impact.</span></article>
        </div>
      `
    },
    "security-rules": {
      title: "Security Rules",
      eyebrow: "Policy Coverage",
      body: `
        <div class="policy-grid">
          <span>Authentication changes require session expiry tests</span>
          <span>Payment changes require refund and webhook retry tests</span>
          <span>Database migrations require rollback validation</span>
          <span>Production config changes require deployment review</span>
        </div>
      `
    },
    settings: {
      title: "Settings",
      eyebrow: "Analyzer Configuration",
      body: `
        <div class="panel-list">
          <article><strong>GitHub Source</strong><span>Public PRs work without a token. Private PRs require GITHUB_TOKEN.</span></article>
          <article><strong>Architecture Map</strong><span>The hidden architecture JSON is loaded from /api/default-architecture.</span></article>
          <article><strong>AI Enhancement</strong><span>Optional. Set OPENAI_API_KEY to generate richer report wording.</span></article>
        </div>
      `
    },
    documentation: {
      title: "Documentation",
      eyebrow: "How To Demo",
      body: `
        <ol class="panel-steps">
          <li>Click LOAD SAMPLE.</li>
          <li>Click ANALYZE RELEASE RISK.</li>
          <li>Review potential impact, missing tests, and evidence cluster.</li>
          <li>Use EXPORT REPORT to copy the plain text result.</li>
        </ol>
      `
    },
    support: {
      title: "Support",
      eyebrow: "Demo Help",
      body: `
        <div class="panel-list">
          <article><strong>Analyzer fails</strong><span>Check that the PR URL is public or configure GITHUB_TOKEN.</span></article>
          <article><strong>UI looks stale</strong><span>Hard refresh with Ctrl + F5 to reload cache-busted CSS and JS.</span></article>
        </div>
      `
    },
    notifications: {
      title: "Notifications",
      eyebrow: "Inbox",
      body: `
        <div class="panel-list">
          <article><strong>High risk policy</strong><span>Payment and session code changes are currently treated as critical areas.</span></article>
          <article><strong>Demo repository</strong><span>The sample PR is ready to analyze.</span></article>
        </div>
      `
    },
    help: {
      title: "Help",
      eyebrow: "Shortcuts",
      body: `
        <div class="panel-list">
          <article><strong>Real PR test</strong><span>Paste a URL like https://github.com/owner/repo/pull/123.</span></article>
          <article><strong>Test evidence</strong><span>Paste CI failures, passing test notes, or QA gaps into the test box.</span></article>
        </div>
      `
    }
  };

  return panels[panel] || panels.help;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
}
