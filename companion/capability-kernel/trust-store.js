const fs = require("fs");
const path = require("path");

const DEFAULT_TRUST_STORE_PATH = path.join(__dirname, "..", "..", "data", "nodes", "node-trust-store.json");

function loadTrustStore(customPath = null, localNodeId = "node-local-default") {
  const targetPath = customPath || DEFAULT_TRUST_STORE_PATH;
  let store = {
    schema_version: "1.0",
    local_node_id: localNodeId,
    trusted_nodes: {}
  };

  if (fs.existsSync(targetPath)) {
    try {
      store = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    } catch (err) {
      const error = new Error(`Malformed trust store at '${targetPath}': ${err.message}`);
      error.code = "MALFORMED_TRUST_STORE";
      throw error;
    }
  }

  return store;
}

function saveTrustStore(store, customPath = null) {
  const targetPath = customPath || DEFAULT_TRUST_STORE_PATH;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(store, null, 2) + "\n");
}

function getTrustRecord(nodeId, customPath = null) {
  const store = loadTrustStore(customPath);
  return store.trusted_nodes[nodeId] || null;
}

function addTrustRecord(nodeId, record, customPath = null) {
  const store = loadTrustStore(customPath);
  store.trusted_nodes[nodeId] = {
    node_id: nodeId,
    status: record.status || "active",
    tier: record.tier || "trusted_local",
    secretToken: record.secretToken,
    pairedAt: record.pairedAt || new Date().toISOString(),
    revokedAt: null,
    revocationReason: null
  };
  saveTrustStore(store, customPath);
  return store.trusted_nodes[nodeId];
}

function revokeTrustRecord(nodeId, reason = "Manual revocation", customPath = null) {
  const store = loadTrustStore(customPath);
  const record = store.trusted_nodes[nodeId];
  if (!record) {
    return { ok: false, code: "NODE_NOT_FOUND", message: `Node '${nodeId}' not found in trust store.` };
  }

  record.status = "revoked";
  record.revokedAt = new Date().toISOString();
  record.revocationReason = reason;

  saveTrustStore(store, customPath);
  return { ok: true, record };
}

module.exports = {
  loadTrustStore,
  saveTrustStore,
  getTrustRecord,
  addTrustRecord,
  revokeTrustRecord
};
