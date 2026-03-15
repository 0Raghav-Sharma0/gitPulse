#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, "lint-baseline.json");
const REPORT_VERSION = 1;

/*
Baseline/report format (deterministic ordering):
{
  version, generatedAt, signature,
  totals: { errors, warnings, problems, filesWithIssues },
  entries: [{ file, ruleId, line, column, severity, messageHash }],
  ruleCounts: { [ruleId]: count },
  fileCounts: { [file]: count }
}
*/

function runEslintJson() {
  const result = spawnSync("npx", ["eslint", ".", "-f", "json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || "Failed to run eslint");
  }

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    throw new Error("eslint did not return JSON output");
  }

  return JSON.parse(stdout);
}

function toPosixRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function normalizeReport(eslintJson) {
  const entries = [];
  const ruleCounts = new Map();
  const fileCounts = new Map();

  for (const fileResult of eslintJson) {
    const file = toPosixRelative(fileResult.filePath);

    for (const message of fileResult.messages ?? []) {
      const ruleId = message.ruleId ?? "(no-rule)";
      const line = message.line ?? 0;
      const column = message.column ?? 0;
      const severity = message.severity ?? 0;
      const messageHash = createHash("sha256")
        .update(String(message.message ?? ""))
        .digest("hex")
        .slice(0, 12);

      entries.push({
        file,
        ruleId,
        line,
        column,
        severity,
        messageHash,
      });

      ruleCounts.set(ruleId, (ruleCounts.get(ruleId) ?? 0) + 1);
      fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
    }
  }

  entries.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.ruleId !== b.ruleId) return a.ruleId.localeCompare(b.ruleId);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    if (a.severity !== b.severity) return a.severity - b.severity;
    return a.messageHash.localeCompare(b.messageHash);
  });

  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.severity === 2) acc.errors += 1;
      if (entry.severity === 1) acc.warnings += 1;
      return acc;
    },
    { errors: 0, warnings: 0, problems: 0, filesWithIssues: fileCounts.size }
  );
  totals.problems = totals.errors + totals.warnings;

  const signature = createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");

  return {
    version: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    signature,
    totals,
    entries,
    ruleCounts: Object.fromEntries([...ruleCounts.entries()].sort((a, b) => b[1] - a[1])),
    fileCounts: Object.fromEntries(
      [...fileCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    ),
  };
}

function signature(entry) {
  return [
    entry.file,
    entry.ruleId,
    entry.line,
    entry.column,
    entry.severity,
    entry.messageHash,
  ].join("|");
}

function buildCountMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = signature(entry);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function topEntries(obj, limit = 10) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function writeJsonFile(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readBaseline() {
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
}

function cmdReport() {
  const report = normalizeReport(runEslintJson());
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function cmdUpdate() {
  const report = normalizeReport(runEslintJson());
  writeJsonFile(BASELINE_PATH, report);
  console.log(`Updated baseline at ${path.relative(ROOT, BASELINE_PATH)}`);
  console.log(
    `Baseline totals: ${report.totals.problems} (${report.totals.errors} errors, ${report.totals.warnings} warnings)`
  );
}

function cmdCheck() {
  const baseline = readBaseline();
  const current = normalizeReport(runEslintJson());

  const baselineMap = buildCountMap(baseline.entries ?? []);
  const currentMap = buildCountMap(current.entries ?? []);

  const newViolations = [];
  for (const [key, count] of currentMap.entries()) {
    const baselineCount = baselineMap.get(key) ?? 0;
    if (count > baselineCount) {
      for (let i = 0; i < count - baselineCount; i += 1) {
        newViolations.push(key);
      }
    }
  }

  const baselineRuleSet = new Set(Object.keys(baseline.ruleCounts ?? {}));
  const newRuleCategories = Object.keys(current.ruleCounts).filter((rule) => !baselineRuleSet.has(rule));

  const deltaProblems = current.totals.problems - (baseline.totals?.problems ?? 0);
  const deltaErrors = current.totals.errors - (baseline.totals?.errors ?? 0);
  const deltaWarnings = current.totals.warnings - (baseline.totals?.warnings ?? 0);

  console.log("Lint baseline summary");
  console.log(
    `Current:  ${current.totals.problems} (${current.totals.errors} errors, ${current.totals.warnings} warnings)`
  );
  console.log(
    `Baseline: ${(baseline.totals?.problems ?? 0)} (${baseline.totals?.errors ?? 0} errors, ${(baseline.totals?.warnings ?? 0)} warnings)`
  );
  console.log(
    `Delta:    ${deltaProblems >= 0 ? "+" : ""}${deltaProblems} problems, ${deltaErrors >= 0 ? "+" : ""}${deltaErrors} errors, ${deltaWarnings >= 0 ? "+" : ""}${deltaWarnings} warnings`
  );

  console.log("\nTop 10 files by remaining issues:");
  for (const [file, count] of topEntries(current.fileCounts, 10)) {
    console.log(`- ${file}: ${count}`);
  }

  console.log("\nNew rule categories introduced:");
  if (newRuleCategories.length === 0) {
    console.log("- none");
  } else {
    for (const rule of newRuleCategories.sort()) {
      console.log(`- ${rule}`);
    }
  }

  const hasRegression = newViolations.length > 0 || deltaProblems > 0;
  if (hasRegression) {
    console.error("\nLint baseline check failed.");
    if (newViolations.length > 0) {
      console.error(`New violations detected: ${newViolations.length}`);
      const sample = newViolations.slice(0, 20);
      for (const key of sample) {
        console.error(`- ${key}`);
      }
      if (newViolations.length > sample.length) {
        console.error(`...and ${newViolations.length - sample.length} more`);
      }
    }
    process.exit(1);
  }

  console.log("\nLint baseline check passed (no regressions).");
}

function main() {
  const command = process.argv[2];
  if (command === "report") return cmdReport();
  if (command === "update") return cmdUpdate();
  if (command === "check") return cmdCheck();

  console.error("Usage: node scripts/eslint-baseline.mjs <report|update|check>");
  process.exit(1);
}

main();
