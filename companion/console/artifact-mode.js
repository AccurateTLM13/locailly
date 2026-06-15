const VALIDATION_ARTIFACT_MODES = new Set(["bundle", "split", "both"]);

function resolveValidationArtifactMode(env = process.env) {
  const raw = String(env.VALIDATION_ARTIFACT_MODE || "bundle").trim().toLowerCase();

  if (!VALIDATION_ARTIFACT_MODES.has(raw)) {
    return "bundle";
  }

  return raw;
}

function shouldWriteSplitArtifacts(mode) {
  return mode === "split" || mode === "both";
}

function shouldWriteBundleArtifacts(mode) {
  return mode === "bundle" || mode === "both";
}

module.exports = {
  VALIDATION_ARTIFACT_MODES,
  resolveValidationArtifactMode,
  shouldWriteSplitArtifacts,
  shouldWriteBundleArtifacts
};
