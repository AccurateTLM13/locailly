const { mkdtemp, rm, readFile, readdir } = require("node:fs/promises");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const { createRunStore } = require("../companion/console/run-store");
const { BUNDLE_SCHEMA_VERSION } = require("../companion/console/run-bundle");

const REPO_ROOT = join(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function withTempStore(env, fn) {
  const dir = join(REPO_ROOT, "data", `.validation-artifact-test-${randomUUID().slice(0, 8)}`);

  try {
    const store = createRunStore({
      validationDir: dir,
      env
    });
    await fn(store, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function testBundleWriting() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "bundle" }, async (store, dir) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "l2_ollama",
      model: "llama3.2"
    });

    await store.updateRun(run.runId, (record) => {
      record.status = "success";
      record.completedAt = new Date().toISOString();
      record.durationMs = 1200;
      return record;
    });

    await store.recordJsonArtifact(run.runId, "analyze-report", { ok: true, model: "llama3.2" });
    await store.recordTextArtifact(run.runId, "handoff", "# Handoff");

    const summary = {
      runId: run.runId,
      result: {
        benchmarkValid: true,
        modelMismatch: false,
        requestedModel: "llama3.2",
        actualAnalyzeModel: "llama3.2",
        actualComposeModel: "deterministic",
        markdown: "# Handoff"
      },
      evidence: {
        modelProvenance: {
          benchmarkValid: true
        }
      }
    };

    const finalized = await store.finalizeRunArtifacts(run.runId, {
      summary,
      handoffMarkdown: "# Handoff"
    });

    assert(finalized.bundlePath, "Expected bundlePath from finalizeRunArtifacts.");
    const bundle = JSON.parse(await readFile(join(REPO_ROOT, finalized.bundlePath), "utf8"));
    assert(bundle.schemaVersion === BUNDLE_SCHEMA_VERSION, "Expected bundle schemaVersion.");
    assert(bundle.runId === run.runId, "Expected bundle runId.");
    assert(bundle.handoffMarkdown === "# Handoff", "Expected handoffMarkdown in bundle.");
    assert(bundle.summary.result.benchmarkValid === true, "Expected benchmarkValid preserved in bundle.");
    assert(bundle.artifacts["analyze-report"].model === "llama3.2", "Expected analyze artifact in bundle.");

    const files = await readdir(dir);
    const splitArtifacts = files.filter((file) => file.includes("-pagespeed-") || file.includes("-summary.local.json"));
    assert(splitArtifacts.length === 0, "Bundle mode should not write split artifacts.");
  });
}

async function testIndexBundlePath() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "bundle" }, async (store) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "standard"
    });

    await store.updateRun(run.runId, (record) => {
      record.status = "success";
      record.result = { benchmarkValid: true, schemaValid: true };
      return record;
    });

    const summary = {
      result: { benchmarkValid: true, schemaValid: true },
      evidence: {}
    };

    const finalized = await store.finalizeRunArtifacts(run.runId, {
      summary,
      handoffMarkdown: "ok"
    });

    const listed = await store.listRuns(10);
    const indexEntry = listed.runs.find((entry) => entry.runId === run.runId);
    assert(indexEntry, "Expected run in index.");
    assert(indexEntry.bundlePath === finalized.bundlePath, "Expected index bundlePath.");
    assert(indexEntry.benchmarkValid === true, "Expected benchmarkValid on index entry.");
  });
}

async function testLegacySplitFallback() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "split" }, async (store, dir) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "standard"
    });

    await store.updateRun(run.runId, (record) => {
      record.status = "success";
      return record;
    });

    const analyzePath = await store.recordJsonArtifact(run.runId, "analyze-report", {
      ok: true,
      model: "llama3.2"
    });

    const summary = {
      result: {
        benchmarkValid: true,
        markdown: "legacy markdown",
        actualAnalyzeModel: "llama3.2"
      },
      evidence: {}
    };

    await store.finalizeRunArtifacts(run.runId, {
      summary,
      handoffMarkdown: "legacy markdown"
    });

    const loaded = await store.getRun(run.runId);
    assert(loaded.ok, "Expected legacy split run to load.");
    assert(loaded.run.result.markdown === "legacy markdown", "Expected legacy run result markdown.");
    assert(loaded.run.artifacts.analyzeReport === analyzePath, "Expected legacy analyzeReport path.");
  });
}

async function testTerminalStatusWinsOverStaleBundle() {
  const { mergeBundleIntoRun } = require("../companion/console/run-bundle");

  const run = {
    runId: "validation_test",
    status: "success",
    completedAt: "2026-06-14T20:54:03.459Z",
    durationMs: 5780,
    steps: [{
      id: "artifact_save",
      status: "passed",
      completedAt: "2026-06-14T20:54:03.466Z"
    }],
    bundlePath: "data/validation/test.bundle.local.json",
    artifacts: { bundle: "data/validation/test.bundle.local.json" }
  };

  const bundle = {
    status: "running",
    completedAt: null,
    meta: { durationMs: null },
    steps: [{
      id: "artifact_save",
      status: "running"
    }],
    result: { benchmarkValid: true, markdown: "from bundle" }
  };

  const hydrated = mergeBundleIntoRun(run, bundle);
  assert(hydrated.status === "success", "Expected terminal run status to win over stale bundle status.");
  assert(hydrated.steps[0].status === "passed", "Expected terminal run steps to win over stale bundle steps.");
  assert(hydrated.result.markdown === "from bundle", "Expected bundle result payload to hydrate.");
}

async function testPreferBundleOverLegacy() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "both" }, async (store, dir) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "l2_ollama_memory",
      model: "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF"
    });

    await store.updateRun(run.runId, (record) => {
      record.status = "success";
      return record;
    });

    const summary = {
      result: {
        benchmarkValid: true,
        markdown: "bundle wins",
        actualAnalyzeModel: "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF"
      },
      evidence: {
        modelProvenance: { benchmarkValid: true }
      }
    };

    const finalized = await store.finalizeRunArtifacts(run.runId, {
      summary,
      handoffMarkdown: "bundle wins"
    });

    const loaded = await store.getRun(run.runId);
    assert(loaded.run.bundlePath === finalized.bundlePath, "Expected hydrated run to keep bundlePath.");
    assert(loaded.run.result.markdown === "bundle wins", "Expected bundle-backed markdown on getRun.");
    assert(loaded.run.bundleLoaded === true, "Expected bundle hydration marker.");
  });
}

async function testMissingBundleHandling() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "bundle" }, async (store, dir) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "standard"
    });

    await store.updateRun(run.runId, (record) => {
      record.status = "failed";
      record.bundlePath = join(dir, "missing.bundle.local.json").replace(/\\/g, "/");
      record.artifacts = {};
      return record;
    });

    const loaded = await store.getRun(run.runId);
    assert(loaded.ok === false, "Expected missing bundle to fail getRun.");
    assert(loaded.error.code === "BUNDLE_NOT_FOUND", "Expected BUNDLE_NOT_FOUND error code.");
  });
}

async function testMissingBundleLegacyFallback() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "split" }, async (store, dir) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "standard"
    });

    const analyzePath = await store.recordJsonArtifact(run.runId, "analyze-report", { ok: true });
    await store.updateRun(run.runId, (record) => {
      record.status = "success";
      record.result = { markdown: "legacy only", benchmarkValid: false };
      record.bundlePath = join(dir, "missing.bundle.local.json").replace(/\\/g, "/");
      record.artifacts.analyzeReport = analyzePath;
      return record;
    });

    const loaded = await store.getRun(run.runId);
    assert(loaded.ok, "Expected legacy split fallback when bundle missing.");
    assert(loaded.run.result.markdown === "legacy only", "Expected legacy result when bundle missing.");
  });
}

async function testBothModeWritesSplitAndBundle() {
  await withTempStore({ VALIDATION_ARTIFACT_MODE: "both" }, async (store, dir) => {
    const run = await store.createRun({
      url: "https://example.com/",
      mode: "standard"
    });

    await store.recordJsonArtifact(run.runId, "summary", { result: { benchmarkValid: true } });
    const finalized = await store.finalizeRunArtifacts(run.runId, {
      summary: { result: { benchmarkValid: true }, evidence: {} },
      handoffMarkdown: "both"
    });

    const files = await readdir(dir);
    assert(files.some((file) => file.endsWith(".bundle.local.json")), "Expected bundle file in both mode.");
    assert(files.some((file) => file.includes("-summary.local.json")), "Expected split summary file in both mode.");
    assert(finalized.bundlePath, "Expected bundlePath in both mode.");
  });
}

async function main() {
  await testBundleWriting();
  await testIndexBundlePath();
  await testLegacySplitFallback();
  await testTerminalStatusWinsOverStaleBundle();
  await testPreferBundleOverLegacy();
  await testMissingBundleHandling();
  await testMissingBundleLegacyFallback();
  await testBothModeWritesSplitAndBundle();
  console.log("Validation artifact bundle tests passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
