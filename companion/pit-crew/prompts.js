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
    const input = context.input || {};
    const scores = input.scores || {};
    const ranked = classified.rankedOpportunities || [];

    return [
      "Review the deterministically classified Lighthouse issues below.",
      "Select up to 3 priority fixes using only audit titles that appear in the opportunities list.",
      "Do not invent audits such as 'Unused images'.",
      "Do not prioritize audits with score 1.",
      "Return JSON only conforming to the schema.",
      "",
      "Optional thinking text may refine wording only. Do not include opportunity count, diagnostic count, or guaranteed improvement claims.",
      "",
      `Page URL: ${input.url || "unknown"}`,
      `Scores: ${JSON.stringify(scores)}`,
      `Ranked actionable opportunities: ${JSON.stringify(ranked.slice(0, 8))}`,
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
