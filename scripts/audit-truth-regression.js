const fs = require("node:fs");
const path = require("node:path");
const { parsePastedPageSpeedReport } = require("../companion/console/pagespeed");
const {
  classifyAudits,
  validateAndEnrichPriorityFixes,
  buildExecutiveSummaryTemplate
} = require("../tool-packs/lighthouse-parser-pack/audit-truth");

const FIXTURE = path.join(__dirname, "..", "examples", "lighthouse-handoff", "lemonteed-pagespeed-raw.fixture.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const raw = fs.readFileSync(FIXTURE, "utf8");
  const { slim } = parsePastedPageSpeedReport(raw, "https://lemonteed.com/");
  const classified = classifyAudits(slim.opportunities);

  assert(classified.rankedOpportunities.length > 0, "Expected ranked actionable opportunities.");
  assert(
    classified.rankedOpportunities[0].id === "unused-javascript",
    `Expected unused-javascript first, got ${classified.rankedOpportunities[0].id}`
  );

  const unusedJsIssue = classified.issues.find((issue) => issue.id === "unused-javascript");
  assert(unusedJsIssue, "Expected unused-javascript in classified issues.");
  assert(unusedJsIssue.category === "performance", "unused-javascript must map to performance.");
  assert(unusedJsIssue.severity === "high", "unused-javascript must be high severity.");

  const passingAudit = classified.issues.find((issue) => issue.id === "total-byte-weight");
  assert(passingAudit, "Expected total-byte-weight audit.");
  assert(passingAudit.severity === "low", "Passing audits must not be high severity.");

  const validated = validateAndEnrichPriorityFixes({
    priorityFixes: [
      { title: "Avoids enormous network payloads", priority: "high", reason: "Model guess." },
      { title: "Unused images", priority: "high", reason: "Hallucinated audit." },
      { title: "Reduce unused JavaScript", priority: "medium", reason: "Real opportunity." }
    ],
    opportunities: slim.opportunities
  });

  assert(
    validated.priorityFixes.some((fix) => fix.sourceAuditId === "unused-javascript"),
    "Reduce unused JavaScript must survive validation."
  );
  assert(
    !validated.priorityFixes.some((fix) => /unused images/i.test(fix.title)),
    "Unsupported Unused images must not appear in priority fixes."
  );
  assert(
    validated.needsReview.some((fix) => fix.unsupported_priority_fix && /unused images/i.test(fix.title)),
    "Unsupported Unused images must land in needsReview."
  );
  assert(
    !validated.priorityFixes.some((fix) => fix.sourceAuditId === "total-byte-weight"),
    "Passing network payload audit must not remain in priority fixes."
  );

  const summary = buildExecutiveSummaryTemplate({
    url: slim.url,
    metrics: slim.scores,
    weakest: { name: "performance", value: 77 },
    rankedOpportunities: classified.rankedOpportunities
  });

  assert(summary.includes("performance at 77"), "Summary must mention weakest score.");
  assert(summary.includes("all scored 100"), "Summary must mention perfect non-performance scores.");
  assert(!/opportunity count at/i.test(summary), "Summary must not dump internal counts.");

  console.log("audit-truth regression passed");
  console.log(`  top opportunity: ${classified.rankedOpportunities[0].title}`);
  console.log(`  validated fixes: ${validated.priorityFixes.map((fix) => fix.title).join(", ")}`);
}

main();
