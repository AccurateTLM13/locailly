#!/usr/bin/env node
/**
 * scripts/dev-closeout.js
 *
 * Generates work-closeout.json from canonical milestone, session, validation,
 * delivery, and brief records. No manual writing needed.
 *
 * Usage:
 *   node scripts/dev-closeout.js --slug <id>
 *   node scripts/dev-closeout.js --slug <id> --output docs/07-progress/work-closeout.json
 *   node scripts/dev-closeout.js --slug <id> --dry-run
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEVELOPMENT_DIR = path.join(PROJECT_ROOT, "development");
const MILESTONES_DIR = path.join(DEVELOPMENT_DIR, "milestones");
const SESSIONS_DIR = path.join(DEVELOPMENT_DIR, "sessions");
const VALIDATION_RESULTS_DIR = path.join(DEVELOPMENT_DIR, "validation-results");
const DELIVERY_DIR = path.join(DEVELOPMENT_DIR, "delivery");
const BRIEFS_DIR = path.join(DEVELOPMENT_DIR, "briefs");
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, "docs", "07-progress", "work-closeout.json");

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

function now() { return new Date().toISOString(); }

function extractArg(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function hasFlag(args, name) { return args.includes(name); }

function main() {
  const args = process.argv.slice(2);
  const slug = extractArg(args, "--slug");
  const outputPath = extractArg(args, "--output") || DEFAULT_OUTPUT;
  const isDryRun = hasFlag(args, "--dry-run");

  if (!slug) {
    console.error("Usage: node scripts/dev-closeout.js --slug <milestone-id> [--output path] [--dry-run]");
    process.exit(1);
  }

  // Load canonical records
  const milestone = readJson(path.join(MILESTONES_DIR, `${slug}.json`), null);
  if (!milestone) {
    console.error(`Milestone '${slug}' not found.`);
    process.exit(1);
  }

  const brief = readJson(path.join(BRIEFS_DIR, `${slug}.json`), null);
  const sessions = fs.existsSync(SESSIONS_DIR) ? fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith(".json")).map(f => readJson(path.join(SESSIONS_DIR, f), null)).filter(Boolean) : [];
  const msSessions = sessions.filter(s => s.milestoneId === slug).sort((a, b) => (a.startedAt || "").localeCompare(b.startedAt || ""));
  const validations = fs.existsSync(VALIDATION_RESULTS_DIR) ? fs.readdirSync(VALIDATION_RESULTS_DIR).filter(f => f.endsWith(".json")).map(f => readJson(path.join(VALIDATION_RESULTS_DIR, f), null)).filter(Boolean) : [];
  const msValidations = validations.filter(v => v.milestoneId === slug);
  const delivery = readJson(path.join(DELIVERY_DIR, `${slug}.json`), null);

  // Build completed list
  const completed = [];
  for (const s of msSessions) {
    if (s.completedWork) {
      for (const w of s.completedWork) {
        if (!completed.includes(w)) completed.push(w);
      }
    }
  }
  if (brief && brief.acceptance) {
    for (const a of brief.acceptance) {
      completed.push(`Acceptance criterion: ${a}`);
    }
  }

  // Build remaining list
  const remaining = [];
  for (const s of msSessions) {
    if (s.remainingWork) {
      for (const w of s.remainingWork) {
        if (typeof w === "string" && !remaining.includes(w)) remaining.push(w);
        else if (typeof w === "object" && w.description && !remaining.includes(w.description)) remaining.push(w.description);
      }
    }
  }

  // Build validation summary
  const validation = { passed: [], failed: [], not_run: [] };
  for (const v of msValidations) {
    const prefix = v.id ? `${v.id} — ` : "";
    if (v.status === "passed") validation.passed.push(`${prefix}PASS`);
    else if (v.status === "failed") validation.failed.push(`${prefix}FAIL`);
    else validation.not_run.push(`${prefix}${v.status}`);
  }

  const closeout = {
    work_id: slug,
    objective_id: milestone.id,
    status: milestone.status === "completed" || milestone.status === "merged" || milestone.status === "ready-for-delivery" || milestone.status === "delivered" ? "complete" : "incomplete",
    closed_at: now(),
    original_goal: milestone.purpose || "",
    completed: completed.length > 0 ? completed : ["(no completed work recorded)"],
    remaining: remaining.length > 0 ? remaining : [],
    next_required_action: milestone.status === "ready-for-delivery"
      ? `Deliver milestone '${slug}' (deliver-milestone.js --slug ${slug} --all)`
      : milestone.status === "delivered"
        ? `Merge PR for '${slug}'`
        : milestone.status === "active"
          ? `Continue working on '${slug}'`
          : `Select next milestone from sprint candidates`,
    blockers: milestone.blockers && milestone.blockers.length > 0 ? milestone.blockers.map(b => (typeof b === "string" ? b : b.description || b.reason || "")) : [],
    safe_to_start_unrelated_work: milestone.status === "completed" || milestone.status === "merged" || (milestone.status === "ready-for-delivery" && (!milestone.blockers || milestone.blockers.length === 0)),
    working_branch: milestone.completionBranch || milestone.preparedBranch || null,
    last_commit: milestone.completionHead ? milestone.completionHead.slice(0, 8) : null,
    validation,
    recommended_next_agent: milestone.status === "completed" || milestone.status === "merged" ? "any" : "worker",
    files_changed: msValidations.length > 0 && msValidations[0].gitState ? msValidations[0].gitState.changedFiles.map(f => f.path) : [],
  };

  if (isDryRun) {
    console.log(JSON.stringify(closeout, null, 2));
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(closeout, null, 2) + "\n");

  console.log(JSON.stringify({
    ok: true,
    milestoneId: slug,
    status: closeout.status,
    completed: closeout.completed.length,
    remaining: closeout.remaining.length,
    output: outputPath,
  }, null, 2));
  process.exit(0);
}

main();
