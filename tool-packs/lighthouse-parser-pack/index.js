const FIX_KB = {
  performance: {
    effort: "medium",
    impact: "high",
    steps: [
      "Audit render-blocking resources and defer non-critical scripts.",
      "Optimize images and enable modern formats where possible.",
      "Reduce main-thread work and split long JavaScript tasks."
    ]
  },
  accessibility: {
    effort: "medium",
    impact: "high",
    steps: [
      "Fix missing alt text and insufficient color contrast.",
      "Ensure interactive elements have accessible names.",
      "Verify heading order and landmark regions."
    ]
  },
  bestPractices: {
    effort: "low",
    impact: "medium",
    steps: [
      "Resolve browser console errors and deprecated APIs.",
      "Use HTTPS and secure request patterns.",
      "Review third-party script impact."
    ]
  },
  seo: {
    effort: "low",
    impact: "medium",
    steps: [
      "Confirm indexable meta tags and canonical URLs.",
      "Improve page titles and meta descriptions.",
      "Validate structured data and crawlability."
    ]
  }
};

function normalizeScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

const implementations = {
  "lighthouse.parse": {
    validateInput(input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        return invalidInput("Lighthouse parse input must be an object.", "Send url and scores.");
      }

      if (typeof input.url !== "string" || !input.url.trim()) {
        return invalidInput("Lighthouse parse input requires url.", "Include the tested page URL.");
      }

      if (!input.scores || typeof input.scores !== "object" || Array.isArray(input.scores)) {
        return invalidInput("Lighthouse parse input requires scores.", "Include performance, accessibility, bestPractices, and seo.");
      }

      return null;
    },
    async handle({ input }) {
      const scores = input.scores || {};
      return {
        url: input.url.trim(),
        performance: normalizeScore(scores.performance),
        accessibility: normalizeScore(scores.accessibility),
        bestPractices: normalizeScore(scores.bestPractices),
        seo: normalizeScore(scores.seo),
        opportunityCount: Array.isArray(input.opportunities) ? input.opportunities.length : 0,
        diagnosticCount: Array.isArray(input.diagnostics) ? input.diagnostics.length : 0
      };
    }
  },
  "lighthouse.match_fixes": {
    validateInput(input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        return invalidInput("Match fixes input must be an object.", "Send priorityFixes array.");
      }

      if (!Array.isArray(input.priorityFixes)) {
        return invalidInput("Match fixes input requires priorityFixes.", "Include prioritized fixes from the prior step.");
      }

      return null;
    },
    async handle({ input }) {
      const fixes = (input.priorityFixes || []).map((fix) => {
        const category = inferCategory(fix, input.issues || []);
        const kb = FIX_KB[category] || FIX_KB.performance;

        return {
          title: fix.title,
          effort: kb.effort,
          impact: priorityToImpact(fix.priority),
          steps: kb.steps,
          needs_review: !FIX_KB[category]
        };
      });

      return { fixes };
    }
  },
  "lighthouse.verify_handoff": {
    validateInput(input) {
      if (!input || typeof input !== "object" || !input.handoff) {
        return invalidInput("Verify handoff input requires handoff object.", "Pass the composed handoff result.");
      }

      return null;
    },
    async handle({ input }) {
      const handoff = input.handoff || {};
      const errors = [];
      const required = ["clientSummary", "developerSummary", "priorityFixes", "handoffChecklist", "estimatedImpact"];

      for (const key of required) {
        if (!Object.prototype.hasOwnProperty.call(handoff, key)) {
          errors.push(`handoff.${key} is required.`);
        }
      }

      if (!Array.isArray(handoff.priorityFixes)) {
        errors.push("handoff.priorityFixes must be an array.");
      }

      if (!Array.isArray(handoff.handoffChecklist)) {
        errors.push("handoff.handoffChecklist must be an array.");
      }

      if (handoff.markdown && typeof handoff.markdown === "string") {
        const requiredSections = [
          "# Developer Handoff:",
          "## Executive Summary",
          "## Priority Fixes",
          "## Implementation Checklist",
          "## Verification"
        ];

        for (const section of requiredSections) {
          if (!handoff.markdown.includes(section)) {
            errors.push(`markdown missing section: ${section}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }
  }
};

function inferCategory(fix, issues) {
  const match = issues.find((issue) => issue.title === fix.title);
  return match && match.category ? match.category : "performance";
}

function priorityToImpact(priority) {
  if (priority === "high") {
    return "high";
  }

  if (priority === "low") {
    return "low";
  }

  return "medium";
}

function invalidInput(message, nextStep) {
  return {
    code: "INVALID_INPUT",
    message,
    nextStep
  };
}

module.exports = implementations;
