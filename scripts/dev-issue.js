#!/usr/bin/env node
/**
 * scripts/dev-issue.js
 *
 * Report, list, resolve, and link issues (bugs/hotfixes/ad-hoc tasks).
 *
 * Usage:
 *   node scripts/dev-issue.js report --type bug --priority critical --title "X crashes on Y"
 *   node scripts/dev-issue.js list
 *   node scripts/dev-issue.js list --status open
 *   node scripts/dev-issue.js list --type bug
 *   node scripts/dev-issue.js resolve <id> --note "Fixed in commit abc123"
 *   node scripts/dev-issue.js link <id> --milestone <slug>
 *   node scripts/dev-issue.js show <id>
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ISSUES_DIR = path.join(PROJECT_ROOT, "development", "issues");

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

function listIssues() {
  if (!fs.existsSync(ISSUES_DIR)) return [];
  return fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json")).map(f => readJson(path.join(ISSUES_DIR, f), null)).filter(Boolean);
}

function nextId() {
  const issues = listIssues();
  const max = issues.reduce((m, i) => { const n = parseInt(i.id.replace("issue-", ""), 10); return n > m ? n : m; }, 0);
  return `issue-${String(max + 1).padStart(3, "0")}`;
}

function now() {
  return new Date().toISOString();
}

function cmdReport(args) {
  const type = extractArg(args, "--type") || "ad-hoc";
  const priority = extractArg(args, "--priority") || "medium";
  const title = extractArg(args, "--title");
  const description = extractArg(args, "--description") || "";
  const milestoneId = extractArg(args, "--milestone") || null;

  if (!title) {
    console.error("Usage: dev-issue.js report --type bug|hotfix|ad-hoc --priority critical|high|medium|low --title \"...\" [--description \"...\"] [--milestone <slug>]");
    process.exit(1);
  }

  const validTypes = ["bug", "hotfix", "ad-hoc"];
  const validPriorities = ["critical", "high", "medium", "low"];
  if (!validTypes.includes(type)) { console.error(`Invalid type: ${type}`); process.exit(1); }
  if (!validPriorities.includes(priority)) { console.error(`Invalid priority: ${priority}`); process.exit(1); }

  const id = nextId();
  const issue = {
    schema: "locaily.development.issue.v1",
    id,
    type,
    priority,
    title,
    description,
    status: "open",
    milestoneId,
    reportedAt: now(),
    resolvedAt: null,
  };

  fs.mkdirSync(ISSUES_DIR, { recursive: true });
  fs.writeFileSync(path.join(ISSUES_DIR, `${id}.json`), JSON.stringify(issue, null, 2) + "\n");

  console.log(JSON.stringify({ ok: true, id, type, priority, title }, null, 2));
  process.exit(0);
}

function cmdList(args) {
  const statusFilter = extractArg(args, "--status");
  const typeFilter = extractArg(args, "--type");
  const priorityFilter = extractArg(args, "--priority");
  const isJson = args.includes("--json");

  let issues = listIssues();
  if (statusFilter) issues = issues.filter(i => i.status === statusFilter);
  if (typeFilter) issues = issues.filter(i => i.type === typeFilter);
  if (priorityFilter) issues = issues.filter(i => i.priority === priorityFilter);
  issues.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));

  if (isJson) {
    console.log(JSON.stringify(issues, null, 2));
    process.exit(0);
  }

  if (issues.length === 0) {
    console.log("No issues found.");
    process.exit(0);
  }

  for (const i of issues) {
    const icon = i.priority === "critical" ? "!!" : i.priority === "high" ? "!" : "i";
    console.log(`  [${icon}] ${i.id} [${i.status}] ${i.priority} ${i.type}: ${i.title}`);
    if (i.milestoneId) console.log(`        Milestone: ${i.milestoneId}`);
  }
  process.exit(0);
}

function cmdResolve(args) {
  const id = args[0];
  const note = extractArg(args, "--note") || "Resolved";

  if (!id) {
    console.error("Usage: dev-issue.js resolve <id> [--note \"...\"]");
    process.exit(1);
  }

  const issuePath = path.join(ISSUES_DIR, `${id}.json`);
  const issue = readJson(issuePath, null);
  if (!issue) { console.error(`Issue '${id}' not found.`); process.exit(1); }

  issue.status = "closed";
  issue.resolvedAt = now();
  issue.resolutionNote = note;
  fs.writeFileSync(issuePath, JSON.stringify(issue, null, 2) + "\n");

  console.log(JSON.stringify({ ok: true, id, status: "closed" }, null, 2));
  process.exit(0);
}

function cmdLink(args) {
  const id = args[0];
  const milestoneId = extractArg(args, "--milestone");

  if (!id || !milestoneId) {
    console.error("Usage: dev-issue.js link <id> --milestone <slug>");
    process.exit(1);
  }

  const issuePath = path.join(ISSUES_DIR, `${id}.json`);
  const issue = readJson(issuePath, null);
  if (!issue) { console.error(`Issue '${id}' not found.`); process.exit(1); }

  issue.milestoneId = milestoneId;
  fs.writeFileSync(issuePath, JSON.stringify(issue, null, 2) + "\n");

  console.log(JSON.stringify({ ok: true, id, milestoneId }, null, 2));
  process.exit(0);
}

function cmdShow(args) {
  const id = args[0];
  if (!id) { console.error("Usage: dev-issue.js show <id>"); process.exit(1); }

  const issuePath = path.join(ISSUES_DIR, `${id}.json`);
  const issue = readJson(issuePath, null);
  if (!issue) { console.error(`Issue '${id}' not found.`); process.exit(1); }

  console.log(JSON.stringify(issue, null, 2));
  process.exit(0);
}

function extractArg(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "help") {
    console.log(`
Usage: node scripts/dev-issue.js <command> [options]

Commands:
  report    --type bug|hotfix|ad-hoc --priority critical|high|medium|low --title "..." [--description "..."] [--milestone <slug>]
  list      [--status open] [--type bug] [--priority critical] [--json]
  resolve   <id> [--note "..."]
  link      <id> --milestone <slug>
  show      <id>
`);
    process.exit(0);
  }

  switch (cmd) {
    case "report": cmdReport(args.slice(1)); break;
    case "list": cmdList(args.slice(1)); break;
    case "resolve": cmdResolve(args.slice(1)); break;
    case "link": cmdLink(args.slice(1)); break;
    case "show": cmdShow(args.slice(1)); break;
    default: console.error(`Unknown command: ${cmd}`); process.exit(1);
  }
}

main();
