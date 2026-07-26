#!/usr/bin/env node
/**
 * scripts/dev-brief.js
 *
 * Create, show, and list milestone briefs.
 *
 * Usage:
 *   node scripts/dev-brief.js create --slug <id> --context "What problem" --acceptance "criterion1" --acceptance "criterion2"
 *   node scripts/dev-brief.js create --slug <id> --context "..." --file "path/a.js" --file "path/b.js"
 *   node scripts/dev-brief.js show <id>
 *   node scripts/dev-brief.js list
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BRIEFS_DIR = path.join(PROJECT_ROOT, "development", "briefs");

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

function now() { return new Date().toISOString(); }

function extractMulti(args, name) {
  const values = [];
  while (true) {
    const idx = args.indexOf(name);
    if (idx === -1 || idx + 1 >= args.length) break;
    values.push(args[idx + 1]);
    args.splice(idx, 2);
  }
  return values;
}

function extractArg(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  const val = args[idx + 1];
  args.splice(idx, 2);
  return val;
}

function cmdCreate(args) {
  const slug = extractArg(args, "--slug");
  const context = extractArg(args, "--context");
  const acceptances = extractMulti(args, "--acceptance");
  const files = extractMulti(args, "--file");
  const constraints = extractMulti(args, "--constraint");

  if (!slug || !context || acceptances.length === 0) {
    console.error("Usage: dev-brief.js create --slug <id> --context \"...\" --acceptance \"criterion\" [--acceptance \"...\"] [--file \"path\"] [--constraint \"...\"]");
    process.exit(1);
  }

  const brief = {
    schema: "locaily.development.brief.v1",
    milestoneId: slug,
    context,
    files,
    acceptance: acceptances,
    constraints,
    decisions: [],
    createdAt: now(),
  };

  fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  fs.writeFileSync(path.join(BRIEFS_DIR, `${slug}.json`), JSON.stringify(brief, null, 2) + "\n");

  console.log(JSON.stringify({ ok: true, milestoneId: slug, acceptance: acceptances.length, files: files.length, constraints: constraints.length }, null, 2));
  process.exit(0);
}

function cmdShow(args) {
  const id = args[0];
  if (!id) { console.error("Usage: dev-brief.js show <milestone-id>"); process.exit(1); }

  const brief = readJson(path.join(BRIEFS_DIR, `${id}.json`), null);
  if (!brief) { console.error(`Brief '${id}' not found.`); process.exit(1); }

  console.log(JSON.stringify(brief, null, 2));
  process.exit(0);
}

function cmdList(args) {
  if (!fs.existsSync(BRIEFS_DIR)) { console.log("[]"); process.exit(0); }
  const briefs = fs.readdirSync(BRIEFS_DIR).filter(f => f.endsWith(".json")).map(f => {
    const b = readJson(path.join(BRIEFS_DIR, f), null);
    return b ? { milestoneId: b.milestoneId, acceptance: (b.acceptance || []).length, files: (b.files || []).length } : null;
  }).filter(Boolean);
  console.log(JSON.stringify(briefs, null, 2));
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "help") {
    console.log(`
Usage: node scripts/dev-brief.js <command> [options]

Commands:
  create  --slug <id> --context "..." --acceptance "..." [--acceptance "..."] [--file "path"] [--constraint "..."]
  show    <id>
  list
`);
    process.exit(0);
  }

  switch (cmd) {
    case "create": cmdCreate(args.slice(1)); break;
    case "show": cmdShow(args.slice(1)); break;
    case "list": cmdList(args.slice(1)); break;
    default: console.error(`Unknown: ${cmd}`); process.exit(1);
  }
}

main();
