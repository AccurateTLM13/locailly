const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { validateResult } = require("../core/result-validator");

const CONTEXT_PACK_SCHEMA = JSON.parse(
  readFileSync(join(__dirname, "..", "schemas", "context-pack.schema.json"), "utf8")
);

const DEFAULT_MAX_FILES = 8;
const EXCERPT_CHAR_LIMIT = 400;
const SUMMARY_CHAR_LIMIT = 600;

const HEADING_PATTERNS = {
  decisions: [/^##\s+decisions?\b/i, /^##\s+key decisions?\b/i],
  constraints: [/^##\s+constraints?\b/i, /^##\s+known constraints?\b/i],
  openQuestions: [/^##\s+open questions?\b/i, /^##\s+questions?\b/i]
};

const PROJECT_PREFIXES = ["projects/", "wiki/projects/"];
const TOPIC_PREFIXES = ["topics/", "wiki/topics/", "wiki/concepts/", "wiki/entities/"];

function buildContextPack(adapter, request = {}) {
  const warnings = [];
  const status = adapter.getStatus();

  if (!status.enabled) {
    return {
      ok: false,
      warnings: [...status.warnings, "Memory bridge is disabled."],
      error: {
        code: "MEMORY_DISABLED",
        message: "Memory bridge is not enabled.",
        nextStep: "Set memoryBridge.enabled and vaultPath in companion/config.json."
      }
    };
  }

  if (!status.readable) {
    return {
      ok: false,
      warnings: status.warnings,
      error: {
        code: "VAULT_NOT_READABLE",
        message: "Configured memory vault is not readable.",
        nextStep: "Verify vaultPath, index.md, and allowlisted paths."
      }
    };
  }

  const project = String(request.project || "").trim();
  const task = String(request.task || "").trim();
  const maxFiles = normalizeMaxFiles(request.maxFiles);

  if (!project || !task) {
    return {
      ok: false,
      warnings,
      error: {
        code: "INVALID_REQUEST",
        message: "project and task are required.",
        nextStep: "Send project and task strings in the request body."
      }
    };
  }

  const include = normalizeInclude(request.include);
  const candidates = selectCandidateFiles(adapter, { project, task, include, maxFiles, warnings });
  const filesUsed = [];
  const excerpts = [];
  const keyDecisions = [];
  const knownConstraints = [];
  const openQuestions = [];

  for (const filePath of candidates) {
    const readResult = adapter.readMarkdownFile(filePath);

    if (!readResult.ok) {
      warnings.push(`Skipped unreadable file: ${filePath}`);
      continue;
    }

    filesUsed.push(filePath);

    const sections = parseMarkdownSections(readResult.content);
    const primaryHeading = sections[0] ? sections[0].heading : filePath;
    const excerptText = buildExcerptText(sections);

    excerpts.push({
      path: filePath,
      heading: primaryHeading,
      text: truncateText(excerptText, EXCERPT_CHAR_LIMIT)
    });

    if (shouldIncludeDecisions(include)) {
      keyDecisions.push(...extractSectionItems(sections, HEADING_PATTERNS.decisions));
    }

    if (shouldIncludeConstraints(include)) {
      knownConstraints.push(...extractSectionItems(sections, HEADING_PATTERNS.constraints));
    }

    if (shouldIncludeOpenQuestions(include)) {
      openQuestions.push(...extractSectionItems(sections, HEADING_PATTERNS.openQuestions));
    }
  }

  if (filesUsed.length === 0) {
    warnings.push("No allowlisted files matched the request; using fallback selection failed.");
    return {
      ok: false,
      warnings,
      error: {
        code: "NO_FILES_MATCHED",
        message: "No allowlisted Markdown files matched this context pack request.",
        nextStep: "Check project/task names and allowedPaths configuration."
      }
    };
  }

  const summary = buildSummary({ project, task, excerpts, filesUsed });
  const contextPack = {
    contextPackId: buildContextPackId(project, task),
    project,
    task,
    summary: truncateText(summary, SUMMARY_CHAR_LIMIT),
    filesUsed,
    excerpts,
    keyDecisions: dedupeStrings(keyDecisions),
    knownConstraints: dedupeStrings(knownConstraints),
    openQuestions: dedupeStrings(openQuestions),
    warnings,
    recommendedNextStep: "Review filesUsed and excerpts before executing the task."
  };

  const validation = validateResult(contextPack, CONTEXT_PACK_SCHEMA);

  if (!validation.ok) {
    return {
      ok: false,
      warnings: [...warnings, "Context pack failed schema validation."],
      error: {
        code: "SCHEMA_VALIDATION_FAILED",
        message: validation.errors.join(" "),
        nextStep: "Report this as a platform bug."
      }
    };
  }

  if (candidates.length >= maxFiles) {
    warnings.push(`File selection capped at maxFiles=${maxFiles}.`);
  }

  return {
    ok: true,
    result: contextPack,
    warnings
  };
}

function selectCandidateFiles(adapter, { project, task, include, maxFiles, warnings }) {
  const allFiles = adapter.listMarkdownFiles();
  const selected = [];
  const used = new Set();
  const projectNeedle = project.toLowerCase();
  const taskTokens = tokenize(task);

  const addFile = (filePath) => {
    if (selected.length >= maxFiles || used.has(filePath)) {
      return;
    }

    selected.push(filePath);
    used.add(filePath);
  };

  if (shouldIncludeCurrentState(include)) {
    if (allFiles.includes("index.md")) {
      addFile("index.md");
    } else {
      warnings.push("index.md is not available for current_state.");
    }

    if (allFiles.includes("log.md")) {
      addFile("log.md");
    }
  }

  const projectMatches = allFiles.filter((filePath) => {
    if (!PROJECT_PREFIXES.some((prefix) => filePath.startsWith(prefix))) {
      return false;
    }

    const fileName = filePath.split("/").pop().toLowerCase();
    return fileName.includes(projectNeedle) || projectNeedle.includes(fileName.replace(/\.md$/, ""));
  });

  for (const match of projectMatches) {
    addFile(match);
  }

  if (projectMatches.length === 0) {
    warnings.push(`No project page matched '${project}'.`);
  }

  const topicMatches = rankTopicMatches(allFiles, taskTokens);

  for (const match of topicMatches) {
    addFile(match.path);
  }

  if (topicMatches.length === 0) {
    warnings.push(`No topic page strongly matched task '${task}'.`);
  }

  return selected;
}

function rankTopicMatches(allFiles, taskTokens) {
  const topicFiles = allFiles.filter((filePath) =>
    TOPIC_PREFIXES.some((prefix) => filePath.startsWith(prefix))
  );

  const scored = topicFiles.map((filePath) => {
    const fileName = filePath.split("/").pop().toLowerCase();
    let score = 0;

    for (const token of taskTokens) {
      if (fileName.includes(token)) {
        score += 3;
      }
    }

    return { path: filePath, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}

function parseMarkdownSections(content) {
  const lines = String(content || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      if (current) {
        sections.push(current);
      }

      current = {
        heading: headingMatch[2].trim(),
        lines: []
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

function extractSectionItems(sections, patterns) {
  const items = [];

  for (const section of sections) {
    if (!patterns.some((pattern) => pattern.test(`## ${section.heading}`))) {
      continue;
    }

    for (const line of section.lines) {
      const trimmed = line.trim();

      if (/^[-*]\s+/.test(trimmed)) {
        items.push(trimmed.replace(/^[-*]\s+/, "").trim());
      }
    }
  }

  return items;
}

function buildExcerptText(sections) {
  const preferred = sections.find((section) =>
    /current state|summary|overview/i.test(section.heading)
  ) || sections[0];

  if (!preferred) {
    return "";
  }

  return preferred.lines.join("\n").trim();
}

function buildSummary({ project, task, excerpts, filesUsed }) {
  const titles = filesUsed.map((filePath) => filePath.split("/").pop().replace(/\.md$/i, ""));
  const excerptBits = excerpts
    .slice(0, 2)
    .map((entry) => entry.text)
    .filter(Boolean)
    .join(" ");

  return `Context for project '${project}' and task '${task}' from ${titles.join(", ")}. ${excerptBits}`.trim();
}

function buildContextPackId(project, task) {
  const slug = `${project}-${task}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `ctx_${slug || "pack"}`;
}

function normalizeInclude(value) {
  if (!Array.isArray(value)) {
    return ["current_state", "known_decisions", "constraints", "open_questions"];
  }

  return value.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
}

function normalizeMaxFiles(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_MAX_FILES;
  }

  return Math.min(parsed, 20);
}

function shouldIncludeCurrentState(include) {
  return include.includes("current_state");
}

function shouldIncludeDecisions(include) {
  return include.includes("known_decisions") || include.includes("decisions");
}

function shouldIncludeConstraints(include) {
  return include.includes("constraints") || include.includes("known_constraints");
}

function shouldIncludeOpenQuestions(include) {
  return include.includes("open_questions") || include.includes("questions");
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function dedupeStrings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function truncateText(text, limit) {
  const value = String(text || "").trim();

  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3).trim()}...`;
}

module.exports = {
  buildContextPack,
  buildContextPackId,
  parseMarkdownSections,
  extractSectionItems
};
