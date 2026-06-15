const DEFAULT_VALIDATION_MODEL = "llama3.2";

function normalizeValidationModel(model) {
  if (model === null || model === undefined) {
    return null;
  }

  const trimmed = String(model).trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function slugifyModelId(modelId) {
  const normalized = normalizeValidationModel(modelId);

  if (!normalized) {
    return "";
  }

  return normalized
    .toLowerCase()
    .replace(/^hf\.co\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

module.exports = {
  DEFAULT_VALIDATION_MODEL,
  normalizeValidationModel,
  slugifyModelId
};
