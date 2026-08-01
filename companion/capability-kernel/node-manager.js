const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { assertContract, validateContract } = require("./contracts");

const DEFAULT_CONFIG_PATH = path.join(__dirname, "config", "local-node.json");

function generateInstallationId() {
  const rand = crypto.randomBytes(8).toString("hex");
  return `inst-${rand}`;
}

function normalizeNodeConfig(rawConfig = {}) {
  const osName = process.platform === "win32" ? "win32" : (process.platform === "darwin" ? "darwin" : "linux");
  const archName = process.arch === "arm64" ? "arm64" : "x64";

  const config = {
    schema_version: "1.0",
    installation_id: rawConfig.installation_id || generateInstallationId(),
    node_id: rawConfig.node_id || "node-local-default",
    roles: Array.isArray(rawConfig.roles) && rawConfig.roles.length > 0 ? rawConfig.roles : ["hybrid"],
    primary_brain: rawConfig.primary_brain || null,
    platform: rawConfig.platform || { os: osName, arch: archName },
    runtimes: Array.isArray(rawConfig.runtimes) ? rawConfig.runtimes : [
      { id: "node", version: process.version, available: true }
    ],
    resources: rawConfig.resources || { cpu_cores: 4, ram_gb: 8, vram_gb: 0 },
    trust: rawConfig.trust || { tier: "trusted_local", allow_remote_execution: true },
    capability_inventory: Array.isArray(rawConfig.capability_inventory) ? rawConfig.capability_inventory : [],
    availability: rawConfig.availability || "online"
  };

  // Environment variable overrides
  if (process.env.LOCAILY_NODE_ID) {
    config.node_id = process.env.LOCAILY_NODE_ID;
  }
  if (process.env.LOCAILY_NODE_ROLE) {
    const roles = process.env.LOCAILY_NODE_ROLE.split(",").map(r => r.trim()).filter(Boolean);
    if (roles.length > 0) {
      config.roles = roles;
    }
  }

  return config;
}

function loadNodeConfig(customPath = null) {
  const targetPath = customPath || DEFAULT_CONFIG_PATH;
  let raw = {};

  if (fs.existsSync(targetPath)) {
    try {
      raw = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    } catch (err) {
      const error = new Error(`Failed to parse node config at '${targetPath}': ${err.message}`);
      error.code = "MALFORMED_NODE_CONFIG";
      throw error;
    }
  }

  const normalized = normalizeNodeConfig(raw);
  assertContract(normalized, "node-identity.v1", "INVALID_NODE_CONFIG", "node_identity");
  return normalized;
}

function saveNodeConfig(config, targetPath) {
  const validation = validateContract(config, "node-identity.v1", "node_identity");
  if (!validation.ok) {
    const error = new Error(`Node config validation failed: ${validation.errors.join("; ")}`);
    error.code = "INVALID_NODE_CONFIG";
    throw error;
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2) + "\n");
}

module.exports = {
  generateInstallationId,
  normalizeNodeConfig,
  loadNodeConfig,
  saveNodeConfig
};
