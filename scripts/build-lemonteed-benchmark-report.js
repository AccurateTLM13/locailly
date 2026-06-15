const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const INDEX_PATH = path.join(REPO_ROOT, "data", "validation", "console-runs.index.local.json");
const OUTPUT_DIR = path.join(REPO_ROOT, "ai-models", "benchmark-results", "lighthouse-handoff");
const FIXTURE = path.join(REPO_ROOT, "examples", "lighthouse-handoff", "lemonteed-pagespeed-raw.fixture.json");
const URL = "https://lemonteed.com/";
const MODE = "l2_ollama_memory";

const TARGET_MODELS = [
  "llama3.2",
  "hf.co/LiquidAI/LFM2.5-350M-GGUF",
  "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF",
  "hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF",
  "hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF"
];

function loadIndex() {
  const parsed = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  return Array.isArray(parsed.runs) ? parsed.runs : [];
}

function pickLatestRunForModel(runs, model) {
  return runs.find((entry) => {
    return entry.mode === MODE
      && entry.url === URL
      && entry.status === "success"
      && entry.model === model
      && entry.bundlePath;
  }) || null;
}

function loadBundleEntry(run) {
  const absolutePath = path.join(REPO_ROOT, run.bundlePath);
  const bundle = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const result = bundle.result || (bundle.summary && bundle.summary.result) || {};

  return {
    model: run.model,
    status: run.status,
    exitCode: 0,
    durationMs: run.durationMs ?? bundle.meta?.durationMs ?? result.durationMs ?? null,
    benchmarkValid: run.benchmarkValid ?? result.benchmarkValid ?? bundle.meta?.benchmarkValid ?? null,
    modelMismatch: run.modelMismatch ?? result.modelMismatch ?? bundle.meta?.modelMismatch ?? null,
    actualAnalyzeModel: result.actualAnalyzeModel ?? bundle.meta?.actualAnalyzeModel ?? null,
    actualComposeModel: result.actualComposeModel ?? bundle.meta?.actualComposeModel ?? null,
    schemaValid: run.schemaValid ?? result.schemaValid ?? null,
    weakestCategory: run.weakestCategory ?? result.weakestCategory ?? null,
    weakestScore: run.weakestScore ?? result.weakestScore ?? null,
    memoryUsed: run.memoryUsed ?? result.memoryUsed ?? null,
    filesUsedCount: Array.isArray(result.filesUsed) ? result.filesUsed.length : 0,
    bundlePath: run.bundlePath,
    runId: run.runId,
    source: "index_bundle"
  };
}

function main() {
  const runs = loadIndex();
  const comparison = [];
  const missing = [];

  for (const model of TARGET_MODELS) {
    const run = pickLatestRunForModel(runs, model);

    if (!run) {
      missing.push(model);
      continue;
    }

    comparison.push(loadBundleEntry(run));
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(OUTPUT_DIR, `benchmark-lemonteed-fixture-${timestamp}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    fixture: path.relative(REPO_ROOT, FIXTURE).replace(/\\/g, "/"),
    url: URL,
    mode: MODE,
    comparison,
    runs: comparison,
    missingModels: missing
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Lemonteed fixture benchmark report");
  console.log(`  models found: ${comparison.length}/${TARGET_MODELS.length}`);
  comparison.forEach((entry) => {
    console.log(
      `${entry.model.padEnd(48)} ${String(entry.status).padEnd(8)} ${entry.durationMs || "?"} ms  benchmarkValid=${entry.benchmarkValid}`
    );
  });

  if (missing.length > 0) {
    console.log("\nMissing fixture runs:");
    missing.forEach((model) => console.log(`  - ${model}`));
  }

  console.log(`\nSaved: ${path.relative(REPO_ROOT, reportPath).replace(/\\/g, "/")}`);

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main();
