#!/usr/bin/env node
/**
 * scripts/dev-loop.js
 *
 * CLI tool for Development Queue & Safe Runner integration (DEV-LOOP-01).
 * Supports:
 *   node scripts/dev-loop.js --enqueue --slug <id> [--desc "..."]
 *   node scripts/dev-loop.js --run-next
 *   node scripts/dev-loop.js --status
 */

const { enqueueMilestoneTask, runNextDevJob, loadDevJobStore } = require("../companion/capability-kernel/dev-queue-adapter");

function extractArg(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function main() {
  const args = process.argv.slice(2);

  if (hasFlag(args, "--enqueue")) {
    const slug = extractArg(args, "--slug");
    const desc = extractArg(args, "--desc");

    if (!slug) {
      console.error("Error: --slug <milestoneId> is required when enqueuing.");
      process.exit(1);
    }

    try {
      const job = enqueueMilestoneTask({ milestoneId: slug, taskDescription: desc });
      console.log(`Enqueued milestone task job: ${job.jobId}`);
      console.log(`Milestone: ${slug}`);
      console.log(`Status: ${job.status}`);
      process.exit(0);
    } catch (err) {
      console.error(`Failed to enqueue dev task: ${err.message}`);
      process.exit(1);
    }
  }

  if (hasFlag(args, "--run-next")) {
    const result = runNextDevJob();
    if (!result.ok) {
      console.log(`Run-next result: ${result.message || result.code}`);
      process.exit(result.code === "NO_CLAIMABLE_JOBS" ? 0 : 1);
    }
    console.log(`Executed dev job: ${result.job.jobId}`);
    console.log(`Status: ${result.job.status}`);
    console.log(`Result: ${JSON.stringify(result.job.result)}`);
    process.exit(0);
  }

  if (hasFlag(args, "--status")) {
    const store = loadDevJobStore();
    const jobs = store.listJobs();

    console.log(`=== Development Job Queue Status (${jobs.length} total jobs) ===`);
    for (const j of jobs) {
      console.log(`  Job ID:      ${j.jobId}`);
      console.log(`  Status:      ${j.status}`);
      console.log(`  Milestone:   ${j.input?.milestoneId || j.trackId || "(none)"}`);
      console.log(`  Created:     ${j.timestamps?.createdAt}`);
      console.log("  ---");
    }
    process.exit(0);
  }

  console.log("Usage:");
  console.log("  node scripts/dev-loop.js --enqueue --slug <milestoneId> [--desc \"...\"]");
  console.log("  node scripts/dev-loop.js --run-next");
  console.log("  node scripts/dev-loop.js --status");
  process.exit(0);
}

main();
