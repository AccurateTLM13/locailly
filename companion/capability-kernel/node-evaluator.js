const fs = require("fs");
const path = require("path");
const { loadCapsule, runCapsuleSelfTest, verifyChecksums } = require("./capsule-loader");
const { isBindingSatisfied } = require("./binding-store");
const { canonicalizeJson } = require("./canonical");

function evaluateCapsuleRequirements(nodeConfig, capsuleManifest, bindingStorePath = null) {
  const reqs = capsuleManifest.requirements || {};
  const platform = nodeConfig.platform || {};
  const resources = nodeConfig.resources || {};
  const runtimes = nodeConfig.runtimes || [];
  const nowStr = new Date().toISOString();

  const provenanceBase = {
    node_id: nodeConfig.node_id,
    capability_id: capsuleManifest.id,
    capability_version: capsuleManifest.version,
    evaluated_at: nowStr
  };

  // 1. OS check
  if (Array.isArray(reqs.os) && !reqs.os.includes(platform.os)) {
    return {
      ok: false,
      code: "UNSUPPORTED_OS",
      error: `Node OS '${platform.os}' is not supported by capability (requires ${reqs.os.join(", ")})`,
      provenance: { ...provenanceBase, code: "UNSUPPORTED_OS" }
    };
  }

  // 2. Resource check
  if (reqs.min_cpu_cores && (resources.cpu_cores || 0) < reqs.min_cpu_cores) {
    return {
      ok: false,
      code: "INSUFFICIENT_RESOURCES",
      error: `Node CPU cores (${resources.cpu_cores || 0}) is below requirement (${reqs.min_cpu_cores})`,
      provenance: { ...provenanceBase, code: "INSUFFICIENT_RESOURCES" }
    };
  }

  if (reqs.min_ram_gb && (resources.ram_gb || 0) < reqs.min_ram_gb) {
    return {
      ok: false,
      code: "INSUFFICIENT_RESOURCES",
      error: `Node RAM (${resources.ram_gb || 0}GB) is below requirement (${reqs.min_ram_gb}GB)`,
      provenance: { ...provenanceBase, code: "INSUFFICIENT_RESOURCES" }
    };
  }

  // 3. Runtime check
  if (Array.isArray(reqs.runtimes)) {
    for (const reqRuntime of reqs.runtimes) {
      const found = runtimes.find(r => r.id === reqRuntime && r.available);
      if (!found) {
        return {
          ok: false,
          code: "MISSING_RUNTIME",
          error: `Required runtime '${reqRuntime}' is not available on Node`,
          provenance: { ...provenanceBase, code: "MISSING_RUNTIME" }
        };
      }
    }
  }

  // 4. Binding check
  if (capsuleManifest.portability === "bindable" || (Array.isArray(reqs.bindings) && reqs.bindings.length > 0)) {
    const bindings = reqs.bindings || [];
    for (const bindingKey of bindings) {
      if (!isBindingSatisfied(bindingKey, bindingStorePath, nodeConfig.node_id)) {
        return {
          ok: false,
          code: "MISSING_BINDING",
          error: `Required binding '${bindingKey}' is not registered or satisfied on Node`,
          provenance: { ...provenanceBase, code: "MISSING_BINDING" }
        };
      }
    }
  }

  return {
    ok: true,
    provenance: { ...provenanceBase, code: "ACCEPTED" }
  };
}

function installCapsuleOnNode(nodeConfig, capsuleDir, bindingStorePath = null) {
  // 1. Verify checksums
  const checksumResult = verifyChecksums(capsuleDir);
  if (!checksumResult.ok) {
    return {
      ok: false,
      code: checksumResult.code || "CHECKSUM_MISMATCH",
      error: checksumResult.error,
      provenance: {
        node_id: nodeConfig.node_id,
        capability_id: path.basename(capsuleDir),
        code: checksumResult.code || "CHECKSUM_MISMATCH",
        evaluated_at: new Date().toISOString()
      }
    };
  }

  // 2. Load manifest
  let capsuleData;
  try {
    capsuleData = loadCapsule(capsuleDir);
  } catch (err) {
    return {
      ok: false,
      code: err.code || "INVALID_CAPSULE_MANIFEST",
      error: err.message,
      provenance: {
        node_id: nodeConfig.node_id,
        capability_id: path.basename(capsuleDir),
        code: err.code || "INVALID_CAPSULE_MANIFEST",
        evaluated_at: new Date().toISOString()
      }
    };
  }

  const manifest = capsuleData.manifest;

  // 3. Evaluate requirements
  const evalResult = evaluateCapsuleRequirements(nodeConfig, manifest, bindingStorePath);
  if (!evalResult.ok) {
    return evalResult;
  }

  // 4. Self-test
  const selfTestResult = runCapsuleSelfTest(capsuleDir);
  if (!selfTestResult.ok) {
    return {
      ok: false,
      code: selfTestResult.code || "FAILED_SELF_TEST",
      error: selfTestResult.error,
      provenance: {
        node_id: nodeConfig.node_id,
        capability_id: manifest.id,
        capability_version: manifest.version,
        code: selfTestResult.code || "FAILED_SELF_TEST",
        evaluated_at: new Date().toISOString()
      }
    };
  }

  // 5. Register in Node inventory
  if (!Array.isArray(nodeConfig.capability_inventory)) {
    nodeConfig.capability_inventory = [];
  }

  const existingIdx = nodeConfig.capability_inventory.findIndex(c => c.capability_id === manifest.id);
  const invRecord = {
    capability_id: manifest.id,
    version: manifest.version,
    portability: manifest.portability,
    root_tree_hash: capsuleData.checksums.root_tree_hash,
    installed_at: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    nodeConfig.capability_inventory[existingIdx] = invRecord;
  } else {
    nodeConfig.capability_inventory.push(invRecord);
  }

  return {
    ok: true,
    code: "REGISTERED",
    manifest,
    checksums: capsuleData.checksums,
    provenance: {
      node_id: nodeConfig.node_id,
      capability_id: manifest.id,
      capability_version: manifest.version,
      root_tree_hash: capsuleData.checksums.root_tree_hash,
      code: "REGISTERED",
      evaluated_at: new Date().toISOString()
    }
  };
}

module.exports = {
  evaluateCapsuleRequirements,
  installCapsuleOnNode
};
