import fs from "node:fs";
import { matchesGlob } from "./glob.js";

const RISK_WEIGHT = {
  low: 5,
  medium: 12,
  high: 24,
  critical: 34
};

export function loadDefaultArchitecture() {
  const raw = fs.readFileSync(new URL("../data/architecture.example.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

export function normalizeArchitecture(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return loadDefaultArchitecture();
  }

  return input;
}

export function detectImpacts(files, architectureInput) {
  const architecture = normalizeArchitecture(architectureInput);
  const impacts = [];

  for (const [key, config] of Object.entries(architecture)) {
    const patterns = Array.isArray(config.files) ? config.files : [];
    const matchedFiles = files
      .map((file) => file.filename)
      .filter((filename) => patterns.some((pattern) => matchesGlob(filename, pattern)));

    if (matchedFiles.length > 0) {
      const risk = String(config.risk || "medium").toLowerCase();
      impacts.push({
        key,
        label: config.label || titleCase(key),
        risk,
        weight: RISK_WEIGHT[risk] ?? RISK_WEIGHT.medium,
        requiredTests: Array.isArray(config.required_tests) ? config.required_tests : [],
        matchedFiles
      });
    }
  }

  return impacts;
}

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
