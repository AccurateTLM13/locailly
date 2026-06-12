function formatHandoffMarkdown(handoff) {
  if (!handoff || typeof handoff !== "object") {
    return "";
  }

  const url = handoff.url || "unknown-url";
  const summary = handoff.developerSummary || handoff.clientSummary || "No summary provided.";
  const priorityFixes = Array.isArray(handoff.priorityFixes) ? handoff.priorityFixes : [];
  const checklist = Array.isArray(handoff.handoffChecklist) ? handoff.handoffChecklist : [];
  const impact = handoff.estimatedImpact || "Medium";

  const priorityLines = priorityFixes.length > 0
    ? priorityFixes.map((fix, index) => {
      const label = String(fix.priority || "medium").toUpperCase();
      return `${index + 1}. **${fix.title}** (${label}) — ${fix.reason || "No reason provided."}`;
    }).join("\n")
    : "1. No priority fixes identified.";

  const checklistLines = checklist.length > 0
    ? checklist.map((item) => `- [ ] ${item}`).join("\n")
    : "- [ ] Review Lighthouse findings manually.";

  return [
    `# Developer Handoff: ${url}`,
    "",
    "## Executive Summary",
    summary,
    "",
    "## Priority Fixes",
    priorityLines,
    "",
    "## Implementation Checklist",
    checklistLines,
    "",
    "## Verification",
    `- Re-run Lighthouse on ${url}`,
    `- Target estimated impact: ${impact}`,
    "",
    "## Agent Instructions",
    "Use this handoff to implement fixes. Do not modify unrelated files."
  ].join("\n");
}

module.exports = {
  formatHandoffMarkdown
};
