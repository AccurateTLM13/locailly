const { validateResult } = require("./result-validator");

const intermediateSchemas = {
  extract_metrics: {
    type: "object",
    required: ["url", "performance", "accessibility", "bestPractices", "seo"],
    properties: {
      url: { type: "string" },
      performance: { type: "number" },
      accessibility: { type: "number" },
      bestPractices: { type: "number" },
      seo: { type: "number" }
    }
  },
  classify_issues: {
    type: "object",
    required: ["issues"],
    properties: {
      issues: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "category", "severity"],
          properties: {
            title: { type: "string" },
            category: { type: "string", enum: ["performance", "accessibility", "bestPractices", "seo"] },
            severity: { type: "string", enum: ["low", "medium", "high"] }
          }
        }
      }
    }
  },
  prioritize_fixes: {
    type: "object",
    required: ["thinking", "priorityFixes"],
    properties: {
      thinking: { type: "string" },
      priorityFixes: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "priority", "reason"],
          properties: {
            title: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            reason: { type: "string" }
          }
        }
      }
    }
  }
};

async function executeLighthouseHandoffTrack({ input, runtime, options }) {
  const stepsRun = [];
  const startTrack = Date.now();

  const resolveModel = options.resolveModelForRole || ((role) => ({ ok: true, model: "mock-local-model" }));

  // Step 1: Extract Metrics
  const step1Start = Date.now();
  const step1Role = "fast_worker";
  const step1ModelRes = resolveModel(step1Role);
  const step1Model = step1ModelRes.ok ? step1ModelRes.model : "mock-local-model";
  
  const step1Prompt = `Extract core scores (performance, accessibility, bestPractices, seo) and URL from the Lighthouse report input. Return JSON only conforming to the schema.
Input: ${JSON.stringify(input)}`;

  const step1Result = await runtime.generateJson(step1Prompt, intermediateSchemas.extract_metrics, {
    ...options,
    model: step1Model
  });
  
  stepsRun.push({
    name: "extract_metrics",
    model: step1Model,
    role: step1Role,
    durationMs: Date.now() - step1Start,
    output: step1Result
  });

  // Step 2: Classify Issues
  const step2Start = Date.now();
  const step2Role = "fast_worker";
  const step2ModelRes = resolveModel(step2Role);
  const step2Model = step2ModelRes.ok ? step2ModelRes.model : "mock-local-model";

  const step2Prompt = `Analyze the following Lighthouse opportunities and diagnostics. Classify each opportunity into categories (performance, accessibility, bestPractices, seo) and assign a severity level (low, medium, high). Return JSON only conforming to the schema.
Opportunities: ${JSON.stringify(input.opportunities || [])}
Diagnostics: ${JSON.stringify(input.diagnostics || [])}`;

  const step2Result = await runtime.generateJson(step2Prompt, intermediateSchemas.classify_issues, {
    ...options,
    model: step2Model
  });

  stepsRun.push({
    name: "classify_issues",
    model: step2Model,
    role: step2Role,
    durationMs: Date.now() - step2Start,
    output: step2Result
  });

  // Step 3: Prioritize Fixes
  const step3Start = Date.now();
  const step3Role = "reasoning_worker";
  const step3ModelRes = resolveModel(step3Role);
  const step3Model = step3ModelRes.ok ? step3ModelRes.model : "mock-local-model";

  const step3Prompt = `Review the classified Lighthouse issues below. Reason step-by-step to select the top critical priority fixes (max 3) and explain the reason for each. Return JSON only conforming to the schema.
Classified Issues: ${JSON.stringify(step2Result.issues || [])}`;

  const step3Result = await runtime.generateJson(step3Prompt, intermediateSchemas.prioritize_fixes, {
    ...options,
    model: step3Model
  });

  stepsRun.push({
    name: "prioritize_fixes",
    model: step3Model,
    role: step3Role,
    durationMs: Date.now() - step3Start,
    output: step3Result
  });

  // Step 4: Write Handoff Report
  const step4Start = Date.now();
  const step4Role = "default_worker";
  const step4ModelRes = resolveModel(step4Role);
  const step4Model = step4ModelRes.ok ? step4ModelRes.model : "mock-local-model";

  const step4Prompt = `Draft the final Lighthouse developer handoff JSON object. Incorporate the extracted metrics, classified issues, and prioritized fixes. Return JSON only conforming to the output schema.
Metrics: ${JSON.stringify(step1Result)}
Fixes: ${JSON.stringify(step3Result.priorityFixes || [])}`;

  const outputSchema = require("../schemas/lighthouse-handoff.schema.json");
  const step4Result = await runtime.generateJson(step4Prompt, outputSchema, {
    ...options,
    model: step4Model
  });

  stepsRun.push({
    name: "write_markdown",
    model: step4Model,
    role: step4Role,
    durationMs: Date.now() - step4Start,
    output: step4Result
  });

  // Step 5: Verify Output (Rule Checker)
  const step5Start = Date.now();
  const validation = validateResult(step4Result, outputSchema);
  
  stepsRun.push({
    name: "verify_output",
    model: "rule_based_checker",
    role: "verifier",
    durationMs: Date.now() - step5Start,
    output: {
      valid: validation.ok,
      errors: validation.errors
    }
  });

  return {
    result: step4Result,
    steps: stepsRun,
    durationMs: Date.now() - startTrack
  };
}

module.exports = {
  executeLighthouseHandoffTrack,
  intermediateSchemas
};
