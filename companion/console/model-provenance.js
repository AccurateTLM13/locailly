function normalizeModelName(model) {
  if (!model || typeof model !== "string") {
    return "";
  }

  return model.trim().replace(/:latest$/i, "");
}

function modelsMatch(requested, actual) {
  const left = normalizeModelName(requested);
  const right = normalizeModelName(actual);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  return left.endsWith(`/${right}`) || right.endsWith(`/${left}`);
}

function extractOrchestrationSteps(envelopeBody) {
  const result = envelopeBody && envelopeBody.result ? envelopeBody.result : null;
  return result && Array.isArray(result.meta && result.meta.orchestration_steps)
    ? result.meta.orchestration_steps
    : [];
}

function extractModelSteps(envelopeBody) {
  return extractOrchestrationSteps(envelopeBody).filter((step) => step.executor === "model" && step.model);
}

function extractActualAnalyzeModel(envelopeBody, mode) {
  if (mode === "standard") {
    return "deterministic";
  }

  const modelSteps = extractModelSteps(envelopeBody);

  if (modelSteps.length > 0) {
    return modelSteps.map((step) => step.model).filter(Boolean);
  }

  const envelopeModel = envelopeBody && envelopeBody.model ? envelopeBody.model : null;
  return envelopeModel ? [envelopeModel] : [];
}

function extractActualComposeModel(envelopeBody) {
  if (envelopeBody && envelopeBody.runtime_used === false) {
    return "deterministic";
  }

  if (envelopeBody && envelopeBody.runtime_used === true && envelopeBody.model) {
    return envelopeBody.model;
  }

  const modelSteps = extractModelSteps(envelopeBody);

  if (modelSteps.length > 0) {
    return modelSteps.map((step) => step.model).filter(Boolean).join(", ");
  }

  return envelopeBody && envelopeBody.model ? envelopeBody.model : "deterministic";
}

function summarizeModels(value) {
  if (Array.isArray(value)) {
    const uniqueModels = Array.from(new Set(value.filter(Boolean)));
    return uniqueModels.length > 0 ? uniqueModels.join(", ") : null;
  }

  return value || null;
}

function buildModelProvenance({
  requestedModel,
  analyzeEnvelope,
  composeEnvelope,
  providerModel,
  mode
}) {
  const analyzeModels = extractActualAnalyzeModel(analyzeEnvelope && analyzeEnvelope.body, mode);
  const actualAnalyzeModel = summarizeModels(analyzeModels);
  const actualComposeModel = extractActualComposeModel(composeEnvelope && composeEnvelope.body);
  const requested = requestedModel || null;
  const analyzeMismatch = Boolean(
    requested
    && mode !== "standard"
    && actualAnalyzeModel
    && actualAnalyzeModel !== "deterministic"
    && !modelListsMatch(requested, analyzeModels)
  );
  const composeMismatch = Boolean(
    composeEnvelope
    && requested
    && mode !== "standard"
    && typeof actualComposeModel === "string"
    && actualComposeModel !== "deterministic"
    && !modelsMatch(requested, actualComposeModel)
  );
  const modelMismatch = analyzeMismatch || composeMismatch;

  return {
    requestedModel: requested,
    actualAnalyzeModel,
    actualComposeModel,
    providerModel: providerModel || null,
    modelMismatch,
    analyzeMismatch,
    composeMismatch,
    benchmarkValid: mode === "standard" || !requested ? true : !modelMismatch,
    orchestrationSteps: extractOrchestrationSteps(analyzeEnvelope && analyzeEnvelope.body)
  };
}

function modelListsMatch(requested, actualModels) {
  const models = Array.isArray(actualModels) ? actualModels : [actualModels];

  if (models.length === 0) {
    return false;
  }

  return models.every((model) => modelsMatch(requested, model));
}

function buildProvenanceWarning(provenance) {
  if (!provenance || !provenance.modelMismatch) {
    return null;
  }

  const parts = [];

  if (provenance.analyzeMismatch) {
    parts.push(`analyze used '${provenance.actualAnalyzeModel}'`);
  }

  if (provenance.composeMismatch) {
    parts.push(`compose used '${provenance.actualComposeModel}'`);
  }

  return `Model provenance mismatch: requested '${provenance.requestedModel}' but ${parts.join(" and ")}.`;
}

module.exports = {
  buildModelProvenance,
  buildProvenanceWarning,
  extractActualAnalyzeModel,
  extractActualComposeModel,
  modelsMatch,
  normalizeModelName
};
