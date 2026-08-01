const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { assertContract, validateContract } = require("./contracts");
const { canonicalizeJson } = require("./canonical");

function sha256(content) {
  const hash = crypto.createHash("sha256");
  hash.update(content);
  return `sha256:${hash.digest("hex")}`;
}

function listRelativeFiles(dir, currentSub = "") {
  const result = [];
  const entries = fs.readdirSync(path.join(dir, currentSub), { withFileTypes: true });
  for (const entry of entries) {
    const relPath = currentSub ? path.join(currentSub, entry.name) : entry.name;
    const normalizedRelPath = relPath.replace(/\\/g, "/");
    if (normalizedRelPath === "checksums.json") continue;

    if (entry.isDirectory()) {
      result.push(...listRelativeFiles(dir, relPath));
    } else if (entry.isFile()) {
      result.push(normalizedRelPath);
    }
  }
  return result.sort();
}

function generateChecksums(capsuleDir) {
  const relFiles = listRelativeFiles(capsuleDir);
  const files = {};
  const treeHashInput = [];

  for (const relFile of relFiles) {
    const fullPath = path.join(capsuleDir, relFile);
    let hashVal;

    if (relFile === "capability.json") {
      const rawText = fs.readFileSync(fullPath, "utf8");
      try {
        const parsed = JSON.parse(rawText);
        const canon = canonicalizeJson(parsed);
        hashVal = sha256(canon);
      } catch {
        hashVal = sha256(fs.readFileSync(fullPath));
      }
    } else {
      hashVal = sha256(fs.readFileSync(fullPath));
    }

    files[relFile] = hashVal;
    treeHashInput.push(`${relFile}:${hashVal}`);
  }

  const rootTreeHash = sha256(treeHashInput.join("\n"));

  return {
    schema_version: "1.0",
    root_tree_hash: rootTreeHash,
    files
  };
}

function verifyChecksums(capsuleDir) {
  const checksumsPath = path.join(capsuleDir, "checksums.json");
  if (!fs.existsSync(checksumsPath)) {
    return {
      ok: false,
      code: "CHECKSUM_MISMATCH",
      error: "Missing checksums.json in capsule directory."
    };
  }

  let storedChecksums;
  try {
    storedChecksums = JSON.parse(fs.readFileSync(checksumsPath, "utf8"));
  } catch (err) {
    return {
      ok: false,
      code: "CHECKSUM_MISMATCH",
      error: `Malformed checksums.json: ${err.message}`
    };
  }

  const computed = generateChecksums(capsuleDir);

  if (storedChecksums.root_tree_hash !== computed.root_tree_hash) {
    return {
      ok: false,
      code: "CHECKSUM_MISMATCH",
      error: `Root tree hash mismatch. Expected ${storedChecksums.root_tree_hash}, computed ${computed.root_tree_hash}`
    };
  }

  for (const [file, expectedHash] of Object.entries(storedChecksums.files || {})) {
    if (computed.files[file] !== expectedHash) {
      return {
        ok: false,
        code: "CHECKSUM_MISMATCH",
        error: `File hash mismatch for '${file}'. Expected ${expectedHash}, computed ${computed.files[file]}`
      };
    }
  }

  return { ok: true, checksums: computed };
}

function loadCapsule(capsuleDir) {
  const manifestPath = path.join(capsuleDir, "capability.json");
  if (!fs.existsSync(manifestPath)) {
    const error = new Error(`Missing capability.json in capsule directory '${capsuleDir}'`);
    error.code = "CAPSULE_MANIFEST_NOT_FOUND";
    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    const error = new Error(`Malformed capability.json in '${capsuleDir}': ${err.message}`);
    error.code = "MALFORMED_CAPSULE_MANIFEST";
    throw error;
  }

  assertContract(manifest, "capability-capsule-manifest.v1", "INVALID_CAPSULE_MANIFEST", "capability_capsule");

  const checksumResult = verifyChecksums(capsuleDir);
  if (!checksumResult.ok) {
    const error = new Error(`Capsule checksum verification failed: ${checksumResult.error}`);
    error.code = checksumResult.code;
    throw error;
  }

  return {
    manifest,
    dir: capsuleDir,
    checksums: checksumResult.checksums
  };
}

function runCapsuleSelfTest(capsuleDir, timeoutMs = 5000) {
  const manifestPath = path.join(capsuleDir, "capability.json");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, code: "CAPSULE_MANIFEST_NOT_FOUND", error: "Missing capability.json" };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest.self_test || !manifest.self_test.script) {
    return { ok: true, message: "No self_test script declared." };
  }

  const scriptPath = path.join(capsuleDir, manifest.self_test.script);
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, code: "FAILED_SELF_TEST", error: `Self test script '${scriptPath}' not found.` };
  }

  const effectiveTimeout = manifest.self_test.timeout_ms || timeoutMs;

  const result = spawnSync("node", [scriptPath], {
    cwd: capsuleDir,
    encoding: "utf8",
    timeout: effectiveTimeout,
    shell: process.platform === "win32"
  });

  if (result.error && result.error.code === "ETIMEDOUT") {
    return { ok: false, code: "FAILED_SELF_TEST", error: `Self test timed out after ${effectiveTimeout}ms.` };
  }

  if (result.status !== 0) {
    return { ok: false, code: "FAILED_SELF_TEST", error: (result.stderr || result.stdout || "Self test returned non-zero exit code.").trim() };
  }

  return { ok: true, output: (result.stdout || "").trim() };
}

module.exports = {
  sha256,
  generateChecksums,
  verifyChecksums,
  loadCapsule,
  runCapsuleSelfTest
};
