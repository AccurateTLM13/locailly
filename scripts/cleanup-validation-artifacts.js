const { readFile, writeFile, readdir, rm } = require("node:fs/promises");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const DEFAULT_VALIDATION_DIR = path.join(REPO_ROOT, "data", "validation");
const INDEX_FILE_NAME = "console-runs.index.local.json";

function parseArgs(argv) {
  const options = {
    dir: DEFAULT_VALIDATION_DIR,
    dryRun: false,
    maxRuns: null,
    maxAgeDays: null,
    keepBenchmarkValid: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--keep-benchmark-valid") {
      options.keepBenchmarkValid = true;
      continue;
    }

    if (arg === "--dir") {
      options.dir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--max-runs") {
      options.maxRuns = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--max-age-days") {
      options.maxAgeDays = Number(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Cleanup local validation artifacts.

Usage:
  node scripts/cleanup-validation-artifacts.js [options]

Options:
  --dir <path>              Validation directory (default: data/validation)
  --max-runs <n>            Keep only the newest N indexed runs
  --max-age-days <n>        Delete indexed runs older than N days
  --keep-benchmark-valid    Skip runs where benchmarkValid is true
  --dry-run                 Print actions without deleting files
  --help                    Show this help
`);
}

async function readIndex(validationDir) {
  const indexPath = path.join(validationDir, INDEX_FILE_NAME);

  try {
    const parsed = JSON.parse(await readFile(indexPath, "utf8"));
    return {
      indexPath,
      runs: Array.isArray(parsed.runs) ? parsed.runs : []
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { indexPath, runs: [] };
    }

    throw error;
  }
}

function resolveRepoPath(relativePath) {
  if (!relativePath) {
    return null;
  }

  return path.isAbsolute(relativePath)
    ? relativePath
    : path.join(REPO_ROOT, relativePath);
}

function isProtectedRun(entry, options) {
  return options.keepBenchmarkValid && entry.benchmarkValid === true;
}

function isOlderThan(entry, maxAgeDays) {
  if (!maxAgeDays || maxAgeDays <= 0) {
    return false;
  }

  const createdAt = Date.parse(entry.createdAt || entry.updatedAt || "");
  if (!Number.isFinite(createdAt)) {
    return false;
  }

  const ageMs = Date.now() - createdAt;
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

async function collectRunFiles(entry, validationDir) {
  const files = new Set();
  const runRecordPath = resolveRepoPath(entry.artifactPath);
  const bundlePath = resolveRepoPath(entry.bundlePath);

  if (runRecordPath) {
    files.add(runRecordPath);
  }

  if (bundlePath) {
    files.add(bundlePath);
  }

  if (runRecordPath) {
    try {
      const runRecord = JSON.parse(await readFile(runRecordPath, "utf8"));
      Object.values(runRecord.artifacts || {}).forEach((artifactPath) => {
        const resolved = resolveRepoPath(artifactPath);
        if (resolved) {
          files.add(resolved);
        }
      });

      if (runRecord.bundlePath) {
        files.add(resolveRepoPath(runRecord.bundlePath));
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const prefix = `console-${entry.runId}`;
  const dirEntries = await readdir(validationDir);
  dirEntries.forEach((fileName) => {
    if (fileName.startsWith(prefix)) {
      files.add(path.join(validationDir, fileName));
    }
  });

  return Array.from(files);
}

async function findOrphanFiles(validationDir, referencedFiles) {
  let entries = [];

  try {
    entries = await readdir(validationDir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const orphans = [];

  for (const fileName of entries) {
    if (fileName === INDEX_FILE_NAME) {
      continue;
    }

    const absolutePath = path.join(validationDir, fileName);
    if (!referencedFiles.has(absolutePath)) {
      orphans.push(absolutePath);
    }
  }

  return orphans;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const { indexPath, runs } = await readIndex(options.dir);
  const sortedRuns = [...runs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const deleteRunIds = new Set();

  if (Number.isInteger(options.maxRuns) && options.maxRuns >= 0) {
    sortedRuns.slice(options.maxRuns).forEach((entry) => {
      if (!isProtectedRun(entry, options)) {
        deleteRunIds.add(entry.runId);
      }
    });
  }

  sortedRuns.forEach((entry) => {
    if (isOlderThan(entry, options.maxAgeDays) && !isProtectedRun(entry, options)) {
      deleteRunIds.add(entry.runId);
    }
  });

  const keptRuns = sortedRuns.filter((entry) => !deleteRunIds.has(entry.runId));
  const referencedFiles = new Set([indexPath]);
  const filesToDelete = new Set();

  for (const entry of sortedRuns) {
    const runFiles = await collectRunFiles(entry, options.dir);
    runFiles.forEach((filePath) => referencedFiles.add(filePath));

    if (deleteRunIds.has(entry.runId)) {
      runFiles.forEach((filePath) => filesToDelete.add(filePath));
    }
  }

  const orphanFiles = await findOrphanFiles(options.dir, referencedFiles);
  orphanFiles.forEach((filePath) => filesToDelete.add(filePath));

  console.log(`Validation cleanup (${options.dryRun ? "dry run" : "live"})`);
  console.log(`  dir: ${options.dir}`);
  console.log(`  indexed runs: ${runs.length}`);
  console.log(`  runs marked for deletion: ${deleteRunIds.size}`);
  console.log(`  orphan files: ${orphanFiles.length}`);
  console.log(`  files to delete: ${filesToDelete.size}`);

  for (const filePath of filesToDelete) {
    const label = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
    console.log(`${options.dryRun ? "[dry-run] delete" : "delete"} ${label}`);
    if (!options.dryRun) {
      await rm(filePath, { force: true });
    }
  }

  if (!options.dryRun) {
    await writeFile(indexPath, `${JSON.stringify({ runs: keptRuns }, null, 2)}\n`, "utf8");
  }

  console.log(`${options.dryRun ? "Would keep" : "Kept"} ${keptRuns.length} run(s) in index.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
