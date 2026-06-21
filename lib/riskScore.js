const TEST_FILE_PATTERN = /(^|\/)(__tests__|tests?|specs?)\/|(\.test|\.spec)\.[jt]sx?$|(_test)\.py$/i;
const PRODUCTION_CONFIG_PATTERN = /(^|\/)(Dockerfile|docker-compose\.ya?ml|\.env|\.github\/workflows\/.+\.ya?ml|k8s\/|helm\/|terraform\/)/i;
const SECURITY_PATTERN = /(auth|session|token|permission|role|oauth|jwt|secret|password|csrf|cors)/i;

export function summarizeFiles(files) {
  const additions = files.reduce((sum, file) => sum + Number(file.additions || 0), 0);
  const deletions = files.reduce((sum, file) => sum + Number(file.deletions || 0), 0);
  const testFiles = files.filter((file) => TEST_FILE_PATTERN.test(file.filename));
  const migrationFiles = files.filter((file) => /(^|\/)(migrations?|prisma|schema)\//i.test(file.filename));
  const configFiles = files.filter((file) => PRODUCTION_CONFIG_PATTERN.test(file.filename));
  const securityFiles = files.filter((file) => SECURITY_PATTERN.test(file.filename));

  return {
    fileCount: files.length,
    additions,
    deletions,
    totalChangedLines: additions + deletions,
    testFiles,
    migrationFiles,
    configFiles,
    securityFiles
  };
}

export function detectMissingTests(impacts, files, testResults = "") {
  const summary = summarizeFiles(files);
  const searchable = [
    testResults,
    ...summary.testFiles.map((file) => `${file.filename}\n${file.patch || ""}`)
  ].join("\n").toLowerCase();

  const missing = new Set();

  for (const impact of impacts) {
    for (const required of impact.requiredTests) {
      if (!containsLoose(searchable, required)) {
        missing.add(required);
      }
    }
  }

  if (impacts.length > 0 && summary.testFiles.length === 0) {
    missing.add("area-specific regression tests");
  }

  return [...missing].map((item) => sentenceCase(item));
}

export function calculateRisk({ files, impacts, testResults = "" }) {
  const summary = summarizeFiles(files);
  const missingTests = detectMissingTests(impacts, files, testResults);
  const reasons = [];
  let score = 0;

  for (const impact of impacts) {
    score += impact.weight;
    reasons.push(`${impact.label} files changed (${impact.risk} baseline risk)`);
  }

  if (summary.testFiles.length === 0 && summary.fileCount > 0) {
    score += 20;
    reasons.push("No test files changed");
  }

  if (/fail|failed|failing|error/i.test(testResults)) {
    score += 25;
    reasons.push("Test results mention failure or error");
  } else if (/pass|passed|success|green/i.test(testResults)) {
    score -= 8;
    reasons.push("Provided test results appear to pass");
  }

  if (summary.totalChangedLines > 500) {
    score += 15;
    reasons.push("Large diff over 500 changed lines");
  } else if (summary.totalChangedLines > 200) {
    score += 8;
    reasons.push("Moderate diff over 200 changed lines");
  }

  if (summary.migrationFiles.length > 0) {
    score += 18;
    reasons.push("Database migration or schema files changed");
  }

  if (summary.configFiles.length > 0) {
    score += 12;
    reasons.push("Production configuration or deployment files changed");
  }

  if (summary.securityFiles.length > 0) {
    score += 14;
    reasons.push("Security-sensitive files changed");
  }

  if (missingTests.length > 0) {
    score += Math.min(24, missingTests.length * 5);
    reasons.push("Required or expected tests appear to be missing");
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: boundedScore,
    riskLevel: levelForScore(boundedScore),
    missingTests,
    reasons,
    summary
  };
}

export function levelForScore(score) {
  if (score >= 61) return "HIGH";
  if (score >= 31) return "MEDIUM";
  return "LOW";
}

function containsLoose(haystack, needle) {
  const words = String(needle)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return words.every((word) => haystack.includes(word));
}

function sentenceCase(value) {
  const text = String(value).trim();
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
