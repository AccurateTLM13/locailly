const AUDIT_CATEGORY_MAP = {
  "unused-javascript": "performance",
  "unminified-css": "performance",
  "unminified-javascript": "performance",
  "unsized-images": "performance",
  "render-blocking-resources": "performance",
  "render-blocking-insight": "performance",
  "bootup-time": "performance",
  "mainthread-work-breakdown": "performance",
  "total-byte-weight": "performance",
  "server-response-time": "performance",
  "document-latency-insight": "performance",
  "duplicated-javascript-insight": "performance",
  "unused-css-rules": "performance",
  "font-display-insight": "performance",
  "image-delivery-insight": "performance",
  "legacy-javascript-insight": "performance",
  "network-dependency-tree-insight": "performance",
  "cache-insight": "performance",
  "redirects": "performance",
  "speed-index": "performance",
  "first-contentful-paint": "performance",
  "largest-contentful-paint": "performance",
  "interactive": "performance",
  "total-blocking-time": "performance",
  "max-potential-fid": "performance",
  "color-contrast": "accessibility",
  "image-alt": "accessibility",
  "html-has-lang": "accessibility",
  "is-on-https": "bestPractices",
  "uses-http2": "bestPractices",
  "meta-description": "seo",
  "document-title": "seo"
};

const TITLE_TO_AUDIT_ID = {
  "reduce unused javascript": "unused-javascript",
  "reduces unused javascript": "unused-javascript",
  "minify css": "unminified-css",
  "reduce unused css": "unused-css-rules",
  "set explicit width and height on images": "unsized-images",
  "image elements do not have explicit width and height": "unsized-images",
  "remove duplicated javascript modules": "duplicated-javascript-insight",
  "duplicated javascript": "duplicated-javascript-insight",
  "avoid enormous network payloads": "total-byte-weight",
  "avoids enormous network payloads": "total-byte-weight",
  "minimizes main-thread work": "mainthread-work-breakdown",
  "javascript execution time": "bootup-time",
  "initial server response time was short": "server-response-time",
  "keep the server response time short": "server-response-time",
  "improve image delivery": "image-delivery-insight",
  "render-blocking requests": "render-blocking-insight",
  "font display": "font-display-insight"
};

const BLOCKED_SUMMARY_PATTERNS = [
  /opportunity count at \d+/i,
  /diagnostic count at \d+/i,
  /guaranteed improvement/i,
  /will improve your score/i,
  /will guarantee/i
];

const LIGHTHOUSE_SCORE_KEYS = ["performance", "accessibility", "bestPractices", "seo"];

function pickCategoryScores(metrics) {
  const source = metrics || {};
  const picked = {};

  for (const key of LIGHTHOUSE_SCORE_KEYS) {
    if (typeof source[key] === "number") {
      picked[key] = source[key];
    }
  }

  return picked;
}

function normalizeTitle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[`'"]/g, "")
    .replace(/\s+/g, " ");
}

function classifyAuditCategory(auditId, title) {
  if (auditId && AUDIT_CATEGORY_MAP[auditId]) {
    return AUDIT_CATEGORY_MAP[auditId];
  }

  const normalizedTitle = normalizeTitle(title);

  if (/accessib|contrast|alt |aria|heading|screen reader/.test(normalizedTitle)) {
    return "accessibility";
  }

  if (/seo|meta|index|canonical|crawl|search/.test(normalizedTitle)) {
    return "seo";
  }

  if (/console|https|security|deprecated|best practice|cookie/.test(normalizedTitle)) {
    return "bestPractices";
  }

  return "performance";
}

function readSavingsMs(opportunity) {
  if (typeof opportunity.overallSavingsMs === "number") {
    return opportunity.overallSavingsMs;
  }

  if (typeof opportunity.savingsMs === "number") {
    return opportunity.savingsMs;
  }

  if (opportunity.metricSavings && typeof opportunity.metricSavings.WastedMs === "number") {
    return opportunity.metricSavings.WastedMs;
  }

  return 0;
}

function readSavingsBytes(opportunity) {
  if (typeof opportunity.overallSavingsBytes === "number") {
    return opportunity.overallSavingsBytes;
  }

  if (typeof opportunity.savingsBytes === "number") {
    return opportunity.savingsBytes;
  }

  if (opportunity.metricSavings && typeof opportunity.metricSavings.WastedBytes === "number") {
    return opportunity.metricSavings.WastedBytes;
  }

  return 0;
}

function computeDeterministicSeverity(opportunity) {
  const score = typeof opportunity.score === "number" ? opportunity.score : null;
  const savingsMs = readSavingsMs(opportunity);
  const savingsBytes = readSavingsBytes(opportunity);

  if (score === 1) {
    return "low";
  }

  if (score === 0 && (savingsMs > 0 || savingsBytes > 0)) {
    return "high";
  }

  if (score === 0) {
    return "high";
  }

  if (score === 0.5 && (savingsMs > 0 || savingsBytes > 0)) {
    return "medium";
  }

  if (score === 0.5) {
    return "medium";
  }

  if (score !== null && score < 1) {
    return "medium";
  }

  return "low";
}

function isActionableForPriority(opportunity) {
  if (typeof opportunity.score !== "number") {
    return true;
  }

  return opportunity.score < 1;
}

function severityToPriority(severity) {
  if (severity === "high") {
    return "high";
  }

  if (severity === "low") {
    return "low";
  }

  return "medium";
}

function enrichOpportunity(opportunity) {
  const auditId = opportunity.id || resolveAuditIdFromTitle(opportunity.title);
  const category = classifyAuditCategory(auditId, opportunity.title);
  const deterministicSeverity = computeDeterministicSeverity(opportunity);
  const savingsMs = readSavingsMs(opportunity);
  const savingsBytes = readSavingsBytes(opportunity);

  return {
    ...opportunity,
    id: auditId || opportunity.id || null,
    category,
    deterministicSeverity,
    savingsMs,
    savingsBytes,
    overallSavingsMs: savingsMs,
    overallSavingsBytes: savingsBytes,
    actionable: isActionableForPriority(opportunity)
  };
}

function resolveAuditIdFromTitle(title) {
  const normalized = normalizeTitle(title);
  return TITLE_TO_AUDIT_ID[normalized] || null;
}

function buildAuditIndex(opportunities) {
  const byId = new Map();
  const byTitle = new Map();

  for (const raw of opportunities || []) {
    const enriched = enrichOpportunity(raw);

    if (enriched.id) {
      byId.set(enriched.id, enriched);
    }

    byTitle.set(normalizeTitle(enriched.title), enriched);
  }

  return { byId, byTitle };
}

function findOpportunityMatch(title, auditIndex) {
  const normalized = normalizeTitle(title);
  const aliasId = TITLE_TO_AUDIT_ID[normalized];

  if (aliasId && auditIndex.byId.has(aliasId)) {
    return auditIndex.byId.get(aliasId);
  }

  if (auditIndex.byTitle.has(normalized)) {
    return auditIndex.byTitle.get(normalized);
  }

  for (const [candidateTitle, opportunity] of auditIndex.byTitle.entries()) {
    if (candidateTitle.includes(normalized) || normalized.includes(candidateTitle)) {
      return opportunity;
    }
  }

  return null;
}

function classifyAudits(opportunities) {
  const enriched = (opportunities || []).map(enrichOpportunity);
  const issues = enriched.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    category: opportunity.category,
    severity: opportunity.deterministicSeverity,
    score: opportunity.score,
    savingsMs: opportunity.savingsMs,
    savingsBytes: opportunity.savingsBytes,
    actionable: opportunity.actionable
  }));

  const rankedOpportunities = rankOpportunitiesBySavings(enriched);

  return {
    issues,
    rankedOpportunities
  };
}

function rankOpportunitiesBySavings(opportunities) {
  return [...(opportunities || [])]
    .filter((opportunity) => isActionableForPriority(opportunity))
    .sort((left, right) => {
      const leftScore = rankScore(left);
      const rightScore = rankScore(right);
      return rightScore - leftScore;
    });
}

function rankScore(opportunity) {
  const savingsMs = readSavingsMs(opportunity);
  const savingsBytes = readSavingsBytes(opportunity);
  const scorePenalty = typeof opportunity.score === "number" ? (1 - opportunity.score) * 100 : 50;
  return savingsMs * 10 + savingsBytes / 1024 + scorePenalty;
}

function buildDeterministicPriorityFix(opportunity, reason) {
  return {
    title: opportunity.title,
    priority: severityToPriority(opportunity.deterministicSeverity),
    reason: reason || buildDefaultFixReason(opportunity),
    sourceAuditId: opportunity.id,
    sourceAuditTitle: opportunity.title,
    sourceScore: opportunity.score,
    sourceCategory: opportunity.category,
    sourceSavingsMs: opportunity.savingsMs,
    sourceSavingsBytes: opportunity.savingsBytes,
    modelReason: reason || null,
    deterministicSeverity: opportunity.deterministicSeverity,
    unsupported_priority_fix: false
  };
}

function buildDefaultFixReason(opportunity) {
  const parts = [];

  if (opportunity.savingsMs > 0) {
    parts.push(`Estimated savings of ${opportunity.savingsMs} ms`);
  }

  if (opportunity.savingsBytes > 0) {
    parts.push(`Estimated savings of ${Math.round(opportunity.savingsBytes / 1024)} KiB`);
  }

  if (parts.length > 0) {
    return `${parts.join("; ")} from measured Lighthouse data.`;
  }

  return `Measured Lighthouse audit score ${opportunity.score} indicates room for improvement.`;
}

function validateAndEnrichPriorityFixes({ priorityFixes, opportunities, maxFixes = 3 }) {
  const auditIndex = buildAuditIndex(opportunities);
  const validated = [];
  const needsReview = [];
  const seenIds = new Set();

  for (const fix of priorityFixes || []) {
    const match = findOpportunityMatch(fix.title, auditIndex);

    if (!match) {
      needsReview.push({
        title: fix.title,
        priority: fix.priority || "medium",
        reason: fix.reason || "Model suggested fix could not be matched to fixture audit data.",
        modelReason: fix.reason || null,
        unsupported_priority_fix: true
      });
      continue;
    }

    if (!isActionableForPriority(match)) {
      needsReview.push({
        title: fix.title,
        priority: "low",
        reason: "Audit passes in the submitted fixture (score 1) and should not be a priority fix.",
        modelReason: fix.reason || null,
        sourceAuditId: match.id,
        sourceAuditTitle: match.title,
        sourceScore: match.score,
        sourceCategory: match.category,
        sourceSavingsMs: match.savingsMs,
        sourceSavingsBytes: match.savingsBytes,
        deterministicSeverity: "low",
        unsupported_priority_fix: true
      });
      continue;
    }

    if (match.id && seenIds.has(match.id)) {
      continue;
    }

    if (match.id) {
      seenIds.add(match.id);
    }

    validated.push({
      title: match.title,
      priority: severityToPriority(match.deterministicSeverity),
      reason: fix.reason || buildDefaultFixReason(match),
      sourceAuditId: match.id,
      sourceAuditTitle: match.title,
      sourceScore: match.score,
      sourceCategory: match.category,
      sourceSavingsMs: match.savingsMs,
      sourceSavingsBytes: match.savingsBytes,
      modelReason: fix.reason || null,
      deterministicSeverity: match.deterministicSeverity,
      unsupported_priority_fix: false
    });
  }

  if (validated.length < maxFixes) {
    for (const opportunity of rankOpportunitiesBySavings((opportunities || []).map(enrichOpportunity))) {
      if (validated.length >= maxFixes) {
        break;
      }

      if (opportunity.id && seenIds.has(opportunity.id)) {
        continue;
      }

      if (opportunity.id) {
        seenIds.add(opportunity.id);
      }

      validated.push(buildDeterministicPriorityFix(
        opportunity,
        "Selected from measured Lighthouse savings because model output was missing or unsupported."
      ));
    }
  }

  return {
    priorityFixes: validated.slice(0, maxFixes),
    needsReview
  };
}

function formatScoreName(name) {
  if (name === "bestPractices") {
    return "best practices";
  }

  return String(name || "performance").replace(/([A-Z])/g, " $1").toLowerCase();
}

function formatOtherScoresPhrase(metrics, weakestName) {
  const entries = LIGHTHOUSE_SCORE_KEYS
    .filter((name) => name !== weakestName)
    .map((name) => [name, metrics && metrics[name]])
    .filter(([, value]) => typeof value === "number");

  if (entries.length === 0) {
    return "";
  }

  const allPerfect = entries.every(([, value]) => value === 100);

  if (allPerfect) {
    const names = entries.map(([name]) => formatScoreName(name));

    if (names.length === 1) {
      return `${names[0]} scored 100`;
    }

    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]} all scored 100`;
  }

  return entries.map(([name, value]) => `${formatScoreName(name)} at ${value}`).join(", ");
}

function describeOpportunityTheme(opportunities) {
  const titles = (opportunities || []).map((item) => String(item.title || "").toLowerCase()).join(" ");

  if (/javascript|unused js|bootup|main-thread|execution/.test(titles)) {
    return "reducing unused JavaScript and script execution impact";
  }

  if (/css|render-blocking|network|payload|byte/.test(titles)) {
    return "reducing page weight and JavaScript/CSS execution impact";
  }

  if (/image|width|height|delivery/.test(titles)) {
    return "improving image delivery and layout stability";
  }

  if (opportunities && opportunities.length > 0) {
    return opportunities.slice(0, 2).map((item) => item.title).join(" and ");
  }

  return "addressing measured Lighthouse performance opportunities";
}

function isBlockedExecutiveSummary(text) {
  const value = String(text || "").trim();

  if (!value) {
    return true;
  }

  return BLOCKED_SUMMARY_PATTERNS.some((pattern) => pattern.test(value));
}

function buildExecutiveSummaryTemplate({ url, metrics, weakest, rankedOpportunities }) {
  const categoryScores = pickCategoryScores(metrics);
  const weakestCategory = formatScoreName(weakest.name);
  const otherScores = formatOtherScoresPhrase(categoryScores, weakest.name);
  const theme = describeOpportunityTheme(rankedOpportunities);
  const otherScoresSentence = otherScores ? `${otherScores}.` : "";

  return `For ${url}, the weakest Lighthouse category is ${weakestCategory} at ${weakest.value}. ${otherScoresSentence} The highest-priority work is ${theme}, based on measured Lighthouse opportunities from the fixture.`.replace(/\s+/g, " ").trim();
}

function resolveExecutiveSummary({ url, metrics, weakest, rankedOpportunities, modelThinking }) {
  const categoryScores = pickCategoryScores(metrics);
  const template = buildExecutiveSummaryTemplate({
    url,
    metrics: categoryScores,
    weakest,
    rankedOpportunities
  });

  if (isBlockedExecutiveSummary(modelThinking)) {
    return template;
  }

  const thinking = String(modelThinking || "").trim();

  if (!thinking) {
    return template;
  }

  const hasLead = thinking.toLowerCase().includes(String(url).toLowerCase())
    && thinking.toLowerCase().includes(String(weakest.value));

  if (!hasLead) {
    return template;
  }

  return thinking;
}

module.exports = {
  AUDIT_CATEGORY_MAP,
  LIGHTHOUSE_SCORE_KEYS,
  classifyAuditCategory,
  computeDeterministicSeverity,
  enrichOpportunity,
  classifyAudits,
  rankOpportunitiesBySavings,
  validateAndEnrichPriorityFixes,
  buildExecutiveSummaryTemplate,
  resolveExecutiveSummary,
  findOpportunityMatch,
  isActionableForPriority,
  normalizeTitle,
  pickCategoryScores
};
