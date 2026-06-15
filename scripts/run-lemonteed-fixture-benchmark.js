const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const FIXTURE = path.join(REPO_ROOT, "examples", "lighthouse-handoff", "lemonteed-pagespeed-raw.fixture.json");
const URL = "https://lemonteed.com/";
const MODE = "l2_ollama_memory";
const OUTPUT_DIR = path.join(REPO_ROOT, "ai-models", "benchmark-results", "lighthouse-handoff");
const VALIDATE_SCRIPT = path.join(__dirname, "validate-console.js");
const BASELINE_BUNDLE = path.join(
  REPO_ROOT,
  "data",
  "validation",
  "console-validation_20260614T200510Z_11fe11a4ce-llama3-2.bundle.local.json"
);

const MODELS = [
  "hf.co/LiquidAI/LFM2.5-350M-GGUF",
  "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF",
  "hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF",
  "hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF"
];

function loadBaseline() {
  if (!fs.existsSync(BASELINE_BUNDLE)) {
    return null;
  }

  const bundle = JSON.parse(fs.readFileSync(BASELINE_BUNDLE, "utf8"));
  const result = bundle.result || (bundle.summary && bundle.summary.result) || {};

  return {
    model: "llama3.2",
    status: "success",
    exitCode: 0,
    durationMs: bundle.meta && bundle.meta.durationMs ? bundle.meta.durationMs : result.durationMs,
    benchmarkValid: bundle.meta && bundle.meta.benchmarkValid,
    modelMismatch: bundle.meta && bundle.meta.modelMismatch,
    actualAnalyzeModel: bundle.meta && bundle.meta.actualAnalyzeModel,
    actualComposeModel: bundle.meta && bundle.meta.actualComposeModel,
    schemaValid: result.schemaValid,
    weakestCategory: result.weakestCategory,
    weakestScore: result.weakestScore,
    memoryUsed: result.memoryUsed,
    filesUsedCount: Array.isArray(result.filesUsed) ? result.filesUsed.length : 0,
    bundlePath: path.relative(REPO_ROOT, BASELINE_BUNDLE).replace(/\\/g, "/"),
    runId: bundle.runId,
    source: "existing_baseline"
  };
}

function runModel(model) {
  const startedAt = Date.now();
  console.log(`\n→ ${model}`);

  const result = spawnSync(process.execPath, [
    VALIDATE_SCRIPT,
    "--quiet",
    "--mode",
    MODE,
    "--model",
    model,
    "--url",
    URL,
    "--fixture",
    FIXTURE
  ], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 10 * 1024 * 1024
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const exitCode = result.status ?? 1;

  if (exitCode !== 0) {
    console.error(`  failed (exit ${exitCode})`);
    return {
      model,
      status: "failed",
      exitCode,
      durationMs: Date.now() - startedAt,
      error: output.trim().slice(-500)
    };
  }

  const parsed = JSON.parse(output.trim());
  const runResult = parsed.result || {};

  console.log(`  passed in ${parsed.durationMs || runResult.durationMs || "?"} ms`);

  return {
    model,
    status: parsed.status,
    exitCode,
    durationMs: parsed.durationMs || runResult.durationMs || null,
    benchmarkValid: parsed.benchmarkValid,
    modelMismatch: parsed.modelMismatch,
    actualAnalyzeModel: parsed.actualAnalyzeModel,
    actualComposeModel: parsed.actualComposeModel,
    schemaValid: parsed.schemaValid ?? runResult.schemaValid,
    weakestCategory: parsed.weakestCategory ?? runResult.weakestCategory,
    weakestScore: parsed.weakestScore ?? runResult.weakestScore,
    memoryUsed: parsed.memoryUsed ?? runResult.memoryUsed,
    filesUsedCount: parsed.filesUsedCount ?? (Array.isArray(runResult.filesUsed) ? runResult.filesUsed.length : 0),
    bundlePath: parsed.bundlePath,
    runId: parsed.runId
  };
}

function main() {
  if (!fs.existsSync(FIXTURE)) {
    console.error(`Missing fixture: ${FIXTURE}`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Lemonteed fixture model benchmark");
  console.log(`  fixture: ${path.relative(REPO_ROOT, FIXTURE)}`);
  console.log(`  mode:    ${MODE}`);

  const comparison = [];
  const baseline = loadBaseline();

  if (baseline) {
    console.log("\n→ llama3.2 (existing baseline bundle)");
    comparison.push(baseline);
  }

  for (const model of MODELS) {
    comparison.push(runModel(model));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(OUTPUT_DIR, `benchmark-lemonteed-fixture-${timestamp}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    fixture: path.relative(REPO_ROOT, FIXTURE).replace(/\\/g, "/"),
    url: URL,
    mode: MODE,
    comparison,
    runs: comparison
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\n========== COMPARISON ==========");
  comparison.forEach((entry) => {
    console.log(
      `${entry.model.padEnd(48)} ${String(entry.status).padEnd(8)} ${entry.durationMs || "?"} ms  benchmarkValid=${entry.benchmarkValid}`
    );
  });

  console.log(`\nSaved: ${path.relative(REPO_ROOT, reportPath).replace(/\\/g, "/")}`);

  const failures = comparison.filter((entry) => entry.status !== "success").length;
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
