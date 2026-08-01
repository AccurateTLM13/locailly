const fs = require("fs");
const path = require("path");
const { assertContract, validateContract } = require("./contracts");

const DEFAULT_BINDING_PATH = path.join(__dirname, "..", "..", "data", "bindings", "node-bindings.json");

function loadBindingStore(customPath = null, nodeId = "node-local-default") {
  const targetPath = customPath || DEFAULT_BINDING_PATH;
  let storeData = {
    schema_version: "1.0",
    node_id: nodeId,
    bindings: {}
  };

  if (fs.existsSync(targetPath)) {
    try {
      storeData = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    } catch (err) {
      const error = new Error(`Failed to parse binding store at '${targetPath}': ${err.message}`);
      error.code = "MALFORMED_BINDING_STORE";
      throw error;
    }
  }

  assertContract(storeData, "node-local-binding.v1", "INVALID_BINDING_STORE", "binding_store");
  return storeData;
}

function saveBindingStore(storeData, customPath = null) {
  const targetPath = customPath || DEFAULT_BINDING_PATH;
  const validation = validateContract(storeData, "node-local-binding.v1", "binding_store");
  if (!validation.ok) {
    const error = new Error(`Binding store validation failed: ${validation.errors.join("; ")}`);
    error.code = "INVALID_BINDING_STORE";
    throw error;
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(storeData, null, 2) + "\n");
}

function registerBinding(bindingKey, bindingDef, customPath = null, nodeId = "node-local-default") {
  const store = loadBindingStore(customPath, nodeId);
  store.bindings[bindingKey] = bindingDef;
  saveBindingStore(store, customPath);
  return store.bindings[bindingKey];
}

function getBinding(bindingKey, customPath = null, nodeId = "node-local-default") {
  const store = loadBindingStore(customPath, nodeId);
  return store.bindings[bindingKey] || null;
}

function isBindingSatisfied(bindingKey, customPath = null, nodeId = "node-local-default") {
  const binding = getBinding(bindingKey, customPath, nodeId);
  if (!binding) return false;

  if (binding.type === "env_var") {
    return Boolean(process.env[binding.ref]);
  }
  if (binding.type === "local_path") {
    return fs.existsSync(binding.ref);
  }
  if (binding.type === "credential_ref") {
    return Boolean(binding.ref);
  }
  return false;
}

module.exports = {
  loadBindingStore,
  saveBindingStore,
  registerBinding,
  getBinding,
  isBindingSatisfied
};
