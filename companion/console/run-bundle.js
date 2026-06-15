const BUNDLE_SCHEMA_VERSION = 1;

const ARTIFACT_KIND_MAP = {
  "pagespeed-raw": "pageSpeedRaw",
  "lighthouse-slim": "slimInput",
  "analyze-report": "analyzeReport",
  "model-provenance": "modelProvenance",
  "compose-handoff": "composeHandoff",
  "verify-handoff": "verifyHandoff",
  summary: "summary"
};

function buildValidationRunBundle({
  run,
  artifacts = {},
  summary = null,
  handoffMarkdown = "",
  artifactPaths = {}
}) {
  const evidence = summary && summary.evidence ? summary.evidence : run.evidence || null;
  const result = summary && summary.result ? summary.result : run.result || null;

  return {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    runId: run.runId,
    createdAt: run.createdAt,
    completedAt: run.completedAt || null,
    status: run.status,
    meta: {
      workflow: run.workflow,
      url: run.url,
      mode: run.mode,
      model: run.model || null,
      modelSlug: run.modelSlug || null,
      durationMs: run.durationMs || null,
      warnings: run.warnings || [],
      benchmarkValid: result && typeof result.benchmarkValid === "boolean"
        ? result.benchmarkValid
        : null,
      modelMismatch: result && typeof result.modelMismatch === "boolean"
        ? result.modelMismatch
        : null,
      requestedModel: result && result.requestedModel ? result.requestedModel : run.model || null,
      actualAnalyzeModel: result && result.actualAnalyzeModel ? result.actualAnalyzeModel : null,
      actualComposeModel: result && result.actualComposeModel ? result.actualComposeModel : null
    },
    steps: run.steps || [],
    artifacts,
    artifactPaths,
    handoffMarkdown: handoffMarkdown || (result && result.markdown ? result.markdown : ""),
    summary,
    evidence,
    result,
    error: run.error || null
  };
}

function isTerminalRunStatus(status) {
  return status === "success" || status === "failed";
}

function mergeBundleIntoRun(run, bundle) {
  const preferRunLifecycle = isTerminalRunStatus(run.status);

  return {
    ...run,
    status: preferRunLifecycle ? run.status : (bundle.status || run.status),
    completedAt: preferRunLifecycle
      ? run.completedAt
      : (bundle.completedAt || run.completedAt),
    durationMs: preferRunLifecycle && run.durationMs != null
      ? run.durationMs
      : (bundle.meta && bundle.meta.durationMs != null
        ? bundle.meta.durationMs
        : run.durationMs),
    steps: preferRunLifecycle ? run.steps : (bundle.steps || run.steps),
    warnings: bundle.meta && Array.isArray(bundle.meta.warnings)
      ? bundle.meta.warnings
      : run.warnings,
    result: bundle.result || (bundle.summary && bundle.summary.result) || run.result,
    evidence: bundle.evidence || (bundle.summary && bundle.summary.evidence) || run.evidence,
    artifacts: buildLegacyArtifactPaths(run, bundle),
    error: bundle.error || run.error,
    bundleLoaded: true
  };
}

function buildLegacyArtifactPaths(run, bundle) {
  if (run.artifacts && Object.keys(run.artifacts).length > 0) {
    return { ...run.artifacts };
  }

  const paths = { ...(bundle.artifactPaths || {}) };

  if (run.bundlePath && !paths.bundle) {
    paths.bundle = run.bundlePath;
  }

  if (bundle.handoffMarkdown && !paths.markdown) {
    paths.markdown = null;
  }

  return paths;
}

function hasLegacySplitArtifacts(run) {
  if (!run || !run.artifacts || typeof run.artifacts !== "object") {
    return false;
  }

  return Object.entries(run.artifacts).some(([key, value]) => {
    return key !== "bundle" && typeof value === "string" && value.trim();
  });
}

function artifactKindToField(kind) {
  return ARTIFACT_KIND_MAP[kind] || kind;
}

module.exports = {
  BUNDLE_SCHEMA_VERSION,
  ARTIFACT_KIND_MAP,
  artifactKindToField,
  buildValidationRunBundle,
  mergeBundleIntoRun,
  hasLegacySplitArtifacts
};
