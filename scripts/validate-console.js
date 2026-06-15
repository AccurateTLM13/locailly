const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = process.env.LOCAL_AI_BASE_URL || "http://127.0.0.1:31313";
const DEFAULT_MODE = "l2_ollama_memory";
const DEFAULT_URL = "https://web.dev/";
const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = Number(process.env.VALIDATION_TIMEOUT_MS || 20 * 60 * 1000);

function parseArgs(argv) {
  const options = {
    mode: DEFAULT_MODE,
    url: DEFAULT_URL,
    model: null,
    fixture: null,
    quiet: false,
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

    if (arg === "--model") {
      options.model = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--url") {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--fixture") {
      options.fixture = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`LocAIly console validation CLI

Usage:
  node scripts/validate-console.js [options]

Options:
  --mode <mode>       standard | l2_ollama | l2_ollama_memory (default: ${DEFAULT_MODE})
  --model <id>        Ollama model id (default: server config, usually llama3.2)
  --url <url>         PageSpeed target URL (default: ${DEFAULT_URL})
  --fixture <path>    Use pasted PageSpeed JSON instead of live capture
  --quiet, -q         Print compact JSON summary only (no full bundle payload)
  --help              Show this help

Examples:
  node scripts/validate-console.js --mode l2_ollama_memory --model llama3.2
  node scripts/validate-console.js --mode l2_ollama_memory --model hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF
`);
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body.message || body.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForRun(runId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TIMEOUT_MS) {
    const result = await fetchJson(`${BASE_URL}/console/runs/${encodeURIComponent(runId)}`);
    const run = result.run;

    if (!run) {
      throw new Error(`Run '${runId}' was not found.`);
    }

    if (run.status === "success" || run.status === "failed") {
      return run;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for run '${runId}'.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const payload = {
    url: options.url,
    mode: options.mode
  };

  if (options.model) {
    payload.model = options.model;
  }

  if (options.fixture) {
    const fixturePath = path.resolve(options.fixture);
    payload.pastedReport = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  }

  if (!options.quiet) {
    console.log("Starting console validation…");
    console.log(`  baseUrl: ${BASE_URL}`);
    console.log(`  mode:    ${payload.mode}`);
    console.log(`  model:   ${payload.model || "(server default)"}`);
    console.log(`  url:     ${payload.url}`);
  }

  const start = await fetchJson(`${BASE_URL}/console/run-validation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!options.quiet) {
    console.log(`Run queued: ${start.runId}`);
  }

  const run = await waitForRun(start.runId);

  if (run.status !== "success") {
    if (!options.quiet) {
      console.error("Validation failed.");
      console.error(JSON.stringify(run.error || run, null, 2));
    } else {
      console.log(JSON.stringify({
        runId: run.runId,
        status: run.status,
        error: run.error || null
      }));
    }
    process.exitCode = 1;
    return;
  }

  const summary = options.quiet
    ? {
      runId: run.runId,
      status: run.status,
      mode: run.mode,
      model: run.model || run.result?.actualAnalyzeModel || run.result?.model || null,
      modelSlug: run.modelSlug || null,
      requestedModel: run.result?.requestedModel || run.model || null,
      actualAnalyzeModel: run.result?.actualAnalyzeModel || null,
      actualComposeModel: run.result?.actualComposeModel || null,
      providerModel: run.result?.providerModel || null,
      modelMismatch: run.result?.modelMismatch ?? null,
      benchmarkValid: run.result?.benchmarkValid ?? null,
      bundlePath: run.bundlePath || run.artifacts?.bundle || null,
      durationMs: run.durationMs,
      schemaValid: run.result?.schemaValid ?? null,
      weakestCategory: run.result?.weakestCategory ?? null,
      weakestScore: run.result?.weakestScore ?? null,
      memoryUsed: run.result?.memoryUsed ?? null,
      filesUsedCount: Array.isArray(run.result?.filesUsed) ? run.result.filesUsed.length : 0,
      warnings: run.warnings
    }
    : {
      runId: run.runId,
      status: run.status,
      mode: run.mode,
      model: run.model || run.result?.actualAnalyzeModel || run.result?.model || null,
      modelSlug: run.modelSlug || null,
      requestedModel: run.result?.requestedModel || run.model || null,
      actualAnalyzeModel: run.result?.actualAnalyzeModel || null,
      actualComposeModel: run.result?.actualComposeModel || null,
      providerModel: run.result?.providerModel || null,
      modelMismatch: run.result?.modelMismatch ?? null,
      benchmarkValid: run.result?.benchmarkValid ?? null,
      bundlePath: run.bundlePath || run.artifacts?.bundle || null,
      durationMs: run.durationMs,
      result: run.result,
      evidence: run.evidence,
      warnings: run.warnings,
      artifacts: run.artifacts
    };

  if (!options.quiet) {
    console.log("Validation passed.");
  }

  console.log(JSON.stringify(summary, null, options.quiet ? undefined : 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
