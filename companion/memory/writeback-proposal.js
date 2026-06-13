const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { validateResult } = require("../core/result-validator");

const WRITEBACK_SCHEMA = JSON.parse(
  readFileSync(join(__dirname, "..", "schemas", "memory-writeback.schema.json"), "utf8")
);

function createWritebackProposal(adapter, request = {}) {
  const warnings = [];
  const status = adapter.getStatus();

  if (!status.enabled) {
    return {
      ok: false,
      warnings: [...status.warnings, "Memory bridge is disabled."],
      error: {
        code: "MEMORY_DISABLED",
        message: "Memory bridge is not enabled.",
        nextStep: "Enable memoryBridge in companion/config.json before proposing writeback."
      }
    };
  }

  if (!status.vaultPathConfigured) {
    return {
      ok: false,
      warnings: [...status.warnings],
      error: {
        code: "VAULT_NOT_CONFIGURED",
        message: "Memory vault path is not configured.",
        nextStep: "Set memoryBridge.vaultPath in companion/config.json."
      }
    };
  }

  if (status.writebackMode !== "proposal_only") {
    return {
      ok: false,
      warnings: ["Writeback mode is not proposal_only."],
      error: {
        code: "WRITEBACK_MODE_UNSUPPORTED",
        message: "Only proposal_only writeback is supported in v0.",
        nextStep: "Set memoryBridge.writebackMode to proposal_only."
      }
    };
  }

  const validationError = validateWritebackRequest(request);

  if (validationError) {
    return {
      ok: false,
      warnings,
      error: validationError
    };
  }

  const schemaValidation = validateResult(request, WRITEBACK_SCHEMA);

  if (!schemaValidation.ok) {
    return {
      ok: false,
      warnings,
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: schemaValidation.errors.join(" "),
        nextStep: "Send a valid writeback proposal request body."
      }
    };
  }

  const proposalId = buildProposalId(request.project, request.task);
  const fileName = `${proposalId}.md`;
  const markdown = renderProposalMarkdown(request);
  const writeResult = adapter.writeProposalFile(fileName, markdown);

  if (!writeResult.ok) {
    return {
      ok: false,
      warnings,
      error: {
        code: writeResult.error.code,
        message: writeResult.error.message,
        nextStep: "Verify vault path permissions and writeback inbox location."
      }
    };
  }

  return {
    ok: true,
    result: {
      proposalId: writeResult.proposalId,
      proposalPath: writeResult.proposalPath,
      requiresHumanReview: true
    },
    warnings
  };
}

function validateWritebackRequest(request) {
  if (!request || typeof request !== "object") {
    return {
      code: "INVALID_REQUEST",
      message: "Writeback request must be a JSON object.",
      nextStep: "Send taskId, project, task, and proposal arrays."
    };
  }

  if (request.requiresHumanReview !== true) {
    return {
      code: "HUMAN_REVIEW_REQUIRED",
      message: "requiresHumanReview must be true in v0.",
      nextStep: "Set requiresHumanReview: true on all writeback proposals."
    };
  }

  const requiredStrings = ["taskId", "project", "task"];

  for (const field of requiredStrings) {
    if (!String(request[field] || "").trim()) {
      return {
        code: "INVALID_REQUEST",
        message: `${field} is required.`,
        nextStep: `Provide a non-empty ${field} string.`
      };
    }
  }

  return null;
}

function buildProposalId(project, task) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = `${project}-${task}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${date}-${slug || "writeback-proposal"}`;
}

function renderProposalMarkdown(request) {
  const sections = [
    `# Writeback Proposal: ${request.project} — ${request.task}`,
    "",
    "## Task",
    request.task,
    "",
    "## What Changed",
    ...renderList(request.whatChanged),
    "",
    "## Decisions Made",
    ...renderList(request.decisionsMade),
    "",
    "## New Lessons",
    ...renderList(request.newLessons),
    "",
    "## Suggested Updates",
    ...renderList(request.suggestedUpdates),
    "",
    "## Requires Human Review",
    "Yes."
  ];

  return `${sections.join("\n")}\n`;
}

function renderList(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (list.length === 0) {
    return ["- (none)"];
  }

  return list.map((item) => `- ${item}`);
}

module.exports = {
  createWritebackProposal,
  buildProposalId,
  renderProposalMarkdown
};
