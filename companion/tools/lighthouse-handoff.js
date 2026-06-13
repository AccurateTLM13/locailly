const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { executeLighthouseHandoffTrack } = require("../core/orchestrator");
const { recordScoreboardEntry } = require("../core/scoreboard");
const { formatHandoffMarkdown } = require("../pit-crew/markdown");
const {
  resolveMemoryBridgeAdapter,
  runMemoryPreflight,
  buildProjectContextSection
} = require("../memory/preflight");

const promptTemplate = readFileSync(join(__dirname, "..", "prompts", "lighthouse-handoff.md"), "utf8");
const outputSchema = require("../schemas/lighthouse-handoff.schema.json");

const lighthouseHandoffTool = {
  id: "lighthouse-handoff",
  name: "Lighthouse Handoff",
  pack: "showcase-tools",
  description: "Convert Lighthouse/PageSpeed-style report data into developer handoff notes.",
  tasks: ["analyze-report", "compose-handoff"],
  permissions: ["model.run"],
  modelRole: "default_worker",
  requiresRuntime: false,
  inputSchema: "companion/schemas/lighthouse-handoff.input.schema.json",
  outputSchema: "companion/schemas/lighthouse-handoff.schema.json",
  input: {
    required: ["url", "scores"],
    optional: ["opportunities", "diagnostics"]
  },
  output: outputSchema,
  prompt: promptTemplate,
  validateInput: validateToolInput,
  async handle({ task, input, runtime, options }) {
    if (task === "compose-handoff") {
      const validationError = validateComposeInput(input);

      if (validationError) {
        throwToolError(validationError.code, validationError.message, validationError.nextStep);
      }

      const memoryPreflight = runMemoryPreflight({
        memoryOptions: options && options.memory,
        adapter: resolveMemoryBridgeAdapter(options || {}),
        project: options && options.memory && options.memory.project
          ? options.memory.project
          : "Lighthouse Handoff",
        task: options && options.memory && options.memory.task
          ? options.memory.task
          : "Generate coding-agent handoff from PageSpeed report",
        maxFiles: options && options.memory && options.memory.maxFiles
          ? options.memory.maxFiles
          : 6
      });

      return buildComposedHandoff(input, memoryPreflight);
    }

    if (task !== "analyze-report") {
      throwToolError("UNKNOWN_TASK", `Task '${task}' is not supported by Lighthouse Handoff.`);
    }

    const validationError = validateAnalyzeInput(input);

    if (validationError) {
      throwToolError(validationError.code, validationError.message, validationError.nextStep);
    }

    const executionMode = (options && options.execution_mode) || "orchestrated";
    const useRuntime = await shouldUseRuntime(runtime, options);

    if (!useRuntime) {
      return buildDemoResult(input);
    }

    const start = Date.now();

    if (executionMode === "baseline") {
      const prompt = `Convert this Lighthouse/PageSpeed report data into developer handoff notes.
Input URL: ${input.url}
Scores: ${JSON.stringify(input.scores)}
Opportunities: ${JSON.stringify(input.opportunities || [])}
Diagnostics: ${JSON.stringify(input.diagnostics || [])}

Make sure to return JSON only conforming to the schema.`;

      try {
        const result = await runtime.generateJson(prompt, outputSchema, {
          ...options,
          temperature: 0.2
        });

        recordScoreboardEntry({
          track: "lighthouse_handoff",
          mode: "baseline",
          durationMs: Date.now() - start,
          schemaValid: true,
          steps: [
            {
              name: "monolithic_baseline",
              model: options.model || runtime.model,
              role: options.model_role || "default_worker",
              durationMs: Date.now() - start
            }
          ]
        });

        return result;
      } catch (err) {
        recordScoreboardEntry({
          track: "lighthouse_handoff",
          mode: "baseline",
          durationMs: Date.now() - start,
          schemaValid: false,
          steps: []
        });
        throw err;
      }
    }

    try {
      const orchestrationResult = await executeLighthouseHandoffTrack({
        input,
        runtime,
        options,
        toolRegistry: options.toolRegistry
      });

      recordScoreboardEntry({
        track: "lighthouse_handoff",
        mode: "orchestrated",
        durationMs: orchestrationResult.durationMs,
        schemaValid: orchestrationResult.schemaValid !== false,
        steps: orchestrationResult.steps
      });

      return orchestrationResult.result;
    } catch (err) {
      recordScoreboardEntry({
        track: "lighthouse_handoff",
        mode: "orchestrated",
        durationMs: Date.now() - start,
        schemaValid: false,
        steps: []
      });
      throw err;
    }
  }
};

async function shouldUseRuntime(runtime, options) {
  if (!runtime) {
    return false;
  }

  if (runtime.provider === "mock") {
    return true;
  }

  if (runtime.provider !== "ollama") {
    return false;
  }

  try {
    const available = await runtime.isAvailable();

    if (!available) {
      return false;
    }

    const modelName = options.model || runtime.model;
    return runtime.hasModel(modelName);
  } catch (err) {
    return false;
  }
}

function validateComposeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      code: "INVALID_INPUT",
      message: "Compose handoff input must be an object.",
      nextStep: "Send url, metrics, and prioritized fix artifacts."
    };
  }

  if (!isNonEmptyString(input.url)) {
    return {
      code: "INVALID_INPUT",
      message: "Compose handoff input requires url.",
      nextStep: "Include the tested page URL."
    };
  }

  return null;
}

function buildComposedHandoff(input, memoryPreflight = null) {
  const metrics = input.metrics || {};
  const priorityFixes = Array.isArray(input.prioritizedFixes?.priorityFixes)
    ? input.prioritizedFixes.priorityFixes
    : [];
  const matchedFixes = Array.isArray(input.matchedFixes?.fixes) ? input.matchedFixes.fixes : [];
  const weakest = findWeakestScore({
    performance: metrics.performance,
    accessibility: metrics.accessibility,
    bestPractices: metrics.bestPractices,
    seo: metrics.seo
  });

  const checklist = matchedFixes.flatMap((fix) => fix.steps || []).slice(0, 5);

  if (checklist.length === 0) {
    checklist.push(
      "Review the lowest Lighthouse score first.",
      "Confirm opportunities and diagnostics against the live page.",
      "Retest after fixes and compare the score changes."
    );
  }

  const handoff = {
    clientSummary: `Handoff for ${input.url}: lowest score is ${formatScoreName(weakest.name)} at ${weakest.value}.`,
    developerSummary: input.prioritizedFixes?.thinking
      || "Prioritized Lighthouse fixes assembled by the pit crew orchestrator for coding agent implementation.",
    priorityFixes: priorityFixes.length > 0 ? priorityFixes : buildPriorityFixes(weakest, { opportunities: [] }),
    handoffChecklist: checklist,
    estimatedImpact: estimateImpact(weakest.value)
  };

  const memoryUsed = Boolean(memoryPreflight && memoryPreflight.used && memoryPreflight.pack);
  const projectContextSection = memoryUsed
    ? buildProjectContextSection(memoryPreflight.pack)
    : null;

  handoff.markdown = formatHandoffMarkdown({
    ...handoff,
    url: input.url,
    projectContextSection,
    memoryUsed
  });

  handoff.memory = {
    used: memoryUsed,
    contextPackId: memoryUsed ? memoryPreflight.pack.contextPackId : null,
    filesUsed: memoryUsed ? memoryPreflight.pack.filesUsed : [],
    warnings: memoryPreflight ? memoryPreflight.warnings : []
  };

  return handoff;
}

function validateToolInput(input) {
  if (input && typeof input === "object" && (input.metrics || input.prioritizedFixes || input.matchedFixes)) {
    return validateComposeInput(input);
  }

  return validateAnalyzeInput(input);
}

function validateAnalyzeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      code: "INVALID_INPUT",
      message: "Lighthouse Handoff input must be an object.",
      nextStep: "Send url, scores, and optional opportunities or diagnostics arrays."
    };
  }

  if (!isNonEmptyString(input.url)) {
    return {
      code: "INVALID_INPUT",
      message: "Lighthouse Handoff input requires a non-empty url.",
      nextStep: "Include the page URL that was tested."
    };
  }

  if (!input.scores || typeof input.scores !== "object" || Array.isArray(input.scores)) {
    return {
      code: "INVALID_INPUT",
      message: "Lighthouse Handoff input requires a scores object.",
      nextStep: "Include Lighthouse scores such as performance, accessibility, bestPractices, and seo."
    };
  }

  return null;
}

function buildDemoResult(input) {
  const scores = input.scores || {};
  const performance = normalizeScore(scores.performance);
  const accessibility = normalizeScore(scores.accessibility);
  const bestPractices = normalizeScore(scores.bestPractices);
  const seo = normalizeScore(scores.seo);
  const weakest = findWeakestScore({
    performance,
    accessibility,
    bestPractices,
    seo
  });
  const priorityFixes = buildPriorityFixes(weakest, input);

  return {
    clientSummary: `MVP demo handoff for ${input.url}: the report was received and the lowest visible score is ${formatScoreName(weakest.name)}.`,
    developerSummary: "This is a deterministic MVP stub. It validates Lighthouse-style input and produces a stable handoff shape before full AI-backed analysis is added.",
    priorityFixes,
    handoffChecklist: [
      "Review the lowest Lighthouse score first.",
      "Confirm opportunities and diagnostics against the live page.",
      "Retest after fixes and compare the score changes."
    ],
    estimatedImpact: estimateImpact(weakest.value)
  };
}

function buildPriorityFixes(weakest, input) {
  const firstOpportunity = Array.isArray(input.opportunities) && input.opportunities.length > 0
    ? input.opportunities[0]
    : null;
  const opportunityTitle = firstOpportunity && typeof firstOpportunity.title === "string"
    ? firstOpportunity.title
    : `Improve ${formatScoreName(weakest.name)}`;

  return [
    {
      title: opportunityTitle,
      priority: weakest.value < 70 ? "high" : "medium",
      reason: "This item is tied to the lowest available Lighthouse score in the submitted report."
    }
  ];
}

function findWeakestScore(scores) {
  return Object.entries(scores)
    .filter((entry) => typeof entry[1] === "number")
    .sort((a, b) => a[1] - b[1])
    .map(([name, value]) => ({ name, value }))[0] || {
      name: "performance",
      value: 0
    };
}

function normalizeScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function estimateImpact(score) {
  if (score < 50) {
    return "High";
  }

  if (score < 85) {
    return "Medium";
  }

  return "Low";
}

function formatScoreName(name) {
  if (name === "bestPractices") {
    return "best practices";
  }

  return String(name || "performance").replace(/([A-Z])/g, " $1").toLowerCase();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function throwToolError(code, message, nextStep) {
  const error = new Error(message);
  error.code = code;
  error.nextStep = nextStep;
  throw error;
}

module.exports = {
  lighthouseHandoffTool
};
