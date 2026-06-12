const PROMPT_TEMPLATES = {
  classify_issues(context) {
    const input = context.input || {};
    return [
      "Analyze the following Lighthouse opportunities and diagnostics.",
      "Classify each opportunity into categories (performance, accessibility, bestPractices, seo)",
      "and assign a severity level (low, medium, high). Return JSON only conforming to the schema.",
      `Opportunities: ${JSON.stringify(input.opportunities || [])}`,
      `Diagnostics: ${JSON.stringify(input.diagnostics || [])}`
    ].join("\n");
  },
  prioritize_fixes(context) {
    const classified = context.artifacts.classify_issues || {};
    return [
      "Review the classified Lighthouse issues below.",
      "Reason step-by-step to select the top critical priority fixes (max 3) and explain the reason for each.",
      "Return JSON only conforming to the schema.",
      `Classified Issues: ${JSON.stringify(classified.issues || [])}`
    ].join("\n");
  }
};

function buildPrompt(templateKey, context) {
  const builder = PROMPT_TEMPLATES[templateKey];

  if (!builder) {
    throw new Error(`Unknown prompt template '${templateKey}'.`);
  }

  return builder(context);
}

module.exports = {
  buildPrompt,
  PROMPT_TEMPLATES
};
