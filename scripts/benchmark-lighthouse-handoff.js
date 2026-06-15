const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "ai-models", "registry.models.json");
const OUTPUT_DIR = path.join(REPO_ROOT, "ai-models", "benchmark-results", "lighthouse-handoff");
const VALIDATE_SCRIPT = path.join(__dirname, "validate-console.js");

const DEFAULT_MODE = "l2_ollama_memory";
const DEFAULT_URL = "https://web.dev/";

function parseArgs(argv) {
  const options = {
    mode: DEFAULT_MODE,
    url: DEFAULT_URL,
    ids: null,
    includeBaseline: true,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--mode") {
      options.mode = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--url") {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--ids") {
      options.ids = argv[index + 1].split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--no-baseline") {
      options.includeBaseline = false;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Run Lighthouse Handoff validation across registry models.

Usage:
  node scripts/benchmark-lighthouse-handoff.js [options]

Options:
  --mode <mode>       Validation mode (default: ${DEFAULT_MODE})
  --url <url>         PageSpeed URL (default: ${DEFAULT_URL})
  --ids <a,b,c>       Registry model ids (default: baseline + Liquid candidates)
  --no-baseline       Skip llama3.2 baseline entry
  --help              Show this help

Requires:
  - companion server running on 127.0.0.1:31313
  - Ollama running with each model pulled first
`);
}

function loadRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  return Array.isArray(registry.models) ? registry.models : [];
}

function selectModels(models, options) {
  if (options.ids) {
    return models.filter((entry) => options.ids.includes(entry.id));
  }

  const selected = [];

  if (options.includeBaseline) {
    selected.push(...models.filter((entry) => entry.status === "baseline"));
  }

  selected.push(...models.filter((entry) => entry.status === "candidate"));
  return selected;
}

function runValidationForModel(entry, options) {
  const args = [
    VALIDATE_SCRIPT,
    "--mode",
    options.mode,
    "--url",
    options.url,
    "--model",
    entry.runtimeModel
  ];

  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env
  });

  if (result.status !== 0) {
    return {
      registryId: entry.id,
      runtimeModel: entry.runtimeModel,
      ok: false,
      stderr: result.stderr,
      stdout: result.stdout
    };
  }

  let parsed = null;

  try {
    const jsonStart = result.stdout.lastIndexOf("{");
    parsed = JSON.parse(result.stdout.slice(jsonStart));
  } catch (error) {
    return {
      registryId: entry.id,
      runtimeModel: entry.runtimeModel,
      ok: false,
      stderr: `Could not parse validation output: ${error.message}`,
      stdout: result.stdout
    };
  }

  return {
    registryId: entry.id,
    runtimeModel: entry.runtimeModel,
    ok: true,
    summary: parsed
  };
}

function buildComparisonTable(results) {
  return results.map((entry) => {
    if (!entry.ok) {
      return {
        registryId: entry.registryId,
        runtimeModel: entry.runtimeModel,
        status: "failed"
      };
    }

    const summary = entry.summary;
    const result = summary.result || {};

    return {
      registryId: entry.registryId,
      runtimeModel: entry.runtimeModel,
      status: summary.status,
      durationMs: summary.durationMs || result.durationMs || null,
      schemaValid: result.schemaValid,
      benchmarkValid: result.benchmarkValid,
      modelMismatch: result.modelMismatch,
      actualAnalyzeModel: result.actualAnalyzeModel,
      actualComposeModel: result.actualComposeModel,
      memoryUsed: result.memoryUsed,
      filesUsedCount: Array.isArray(result.filesUsed) ? result.filesUsed.length : 0,
      weakestCategory: result.weakestCategory,
      weakestScore: result.weakestScore,
      warnings: Array.isArray(summary.warnings) ? summary.warnings.length : 0,
      runId: summary.runId
    };
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const models = selectModels(loadRegistry(), options);

  if (models.length === 0) {
    console.error("No registry models matched the selection.");
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Benchmarking ${models.length} model(s)…`);
  console.log(`  mode: ${options.mode}`);
  console.log(`  url:  ${options.url}`);

  const results = [];

  for (const entry of models) {
    console.log(`\n→ ${entry.id} (${entry.runtimeModel})`);
    const result = runValidationForModel(entry, options);
    results.push(result);

    if (result.ok) {
      console.log(`  passed in ${result.summary.durationMs || result.summary.result?.durationMs || "?"} ms`);
    } else {
      console.error("  failed");
      if (result.stderr) {
        console.error(result.stderr.trim());
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(OUTPUT_DIR, `benchmark-${timestamp}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    url: options.url,
    comparison: buildComparisonTable(results),
    runs: results
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nSaved benchmark report: ${path.relative(REPO_ROOT, outputPath).replace(/\\/g, "/")}`);

  const failures = results.filter((entry) => !entry.ok).length;

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
