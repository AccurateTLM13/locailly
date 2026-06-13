const { buildContextPack } = require("./context-pack-builder");

function shouldUseMemoryPreflight(memoryOptions = {}, adapterStatus = {}) {
  if (!memoryOptions || memoryOptions.enabled === false || memoryOptions.enabled === "false") {
    return false;
  }

  if (memoryOptions.enabled === true || memoryOptions.enabled === "auto") {
    return Boolean(adapterStatus.enabled && adapterStatus.readable);
  }

  return false;
}

function resolveMemoryBridgeAdapter(options = {}) {
  if (options.memoryBridge && options.memoryBridge.adapter) {
    return options.memoryBridge.adapter;
  }

  return null;
}

function runMemoryPreflight({
  memoryOptions = {},
  adapter = null,
  project,
  task,
  maxFiles = 6
} = {}) {
  const warnings = [];

  if (!adapter) {
    return {
      used: false,
      pack: null,
      warnings: ["Memory bridge adapter is not available."]
    };
  }

  const status = adapter.getStatus();

  if (!shouldUseMemoryPreflight(memoryOptions, status)) {
    if (memoryOptions.enabled === true) {
      warnings.push("Memory preflight requested but vault is not readable.");
    }

    return {
      used: false,
      pack: null,
      warnings: [...status.warnings, ...warnings]
    };
  }

  const packResult = buildContextPack(adapter, {
    project: memoryOptions.project || project,
    task: memoryOptions.task || task,
    include: [
      "current_state",
      "known_decisions",
      "constraints",
      "open_questions"
    ],
    maxFiles: memoryOptions.maxFiles || maxFiles
  });

  if (!packResult.ok) {
    warnings.push(...(packResult.warnings || []));
    warnings.push(packResult.error.message);

    return {
      used: false,
      pack: null,
      warnings
    };
  }

  return {
    used: true,
    pack: packResult.result,
    warnings: [...(packResult.warnings || []), ...(packResult.result.warnings || [])]
  };
}

function buildProjectContextSection(pack) {
  if (!pack) {
    return null;
  }

  const lines = [
    "Project memory informed constraints and guardrails only.",
    "Lighthouse/PageSpeed metrics in this handoff remain the source of truth for scores and diagnostics."
  ];

  if (pack.knownConstraints.length > 0) {
    lines.push("", "**Constraints from memory:**");
    for (const constraint of pack.knownConstraints.slice(0, 5)) {
      lines.push(`- ${constraint}`);
    }
  }

  if (pack.keyDecisions.length > 0) {
    lines.push("", "**Prior decisions:**");
    for (const decision of pack.keyDecisions.slice(0, 5)) {
      lines.push(`- ${decision}`);
    }
  }

  if (pack.openQuestions.length > 0) {
    lines.push("", "**Open questions:**");
    for (const question of pack.openQuestions.slice(0, 3)) {
      lines.push(`- ${question}`);
    }
  }

  lines.push("", `Context pack: \`${pack.contextPackId}\``);
  lines.push(`Files used: ${pack.filesUsed.join(", ")}`);

  return lines.join("\n");
}

module.exports = {
  shouldUseMemoryPreflight,
  resolveMemoryBridgeAdapter,
  runMemoryPreflight,
  buildProjectContextSection
};
