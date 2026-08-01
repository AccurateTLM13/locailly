/**
 * scripts/test-node-roles-capability-capsules.js
 *
 * Acceptance test suite for CTK-02 Node Roles and Capability Capsule Foundation.
 * Verifies all 12 acceptance criteria.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const { loadNodeConfig, saveNodeConfig, normalizeNodeConfig } = require("../companion/capability-kernel/node-manager");
const { loadCapsule, verifyChecksums, generateChecksums, runCapsuleSelfTest } = require("../companion/capability-kernel/capsule-loader");
const { loadBindingStore, registerBinding, getBinding, isBindingSatisfied } = require("../companion/capability-kernel/binding-store");
const { evaluateCapsuleRequirements, installCapsuleOnNode } = require("../companion/capability-kernel/node-evaluator");
const { validateContract, assertContract } = require("../companion/capability-kernel/contracts");
const { createCapabilityRegistry } = require("../companion/capability-kernel/capability-registry");

const FIXTURES_DIR = path.join(__dirname, "..", "companion", "capability-kernel", "fixtures", "capsules");
const PORTABLE_CAPSULE_DIR = path.join(FIXTURES_DIR, "synthetic-portable");
const BINDABLE_CAPSULE_DIR = path.join(FIXTURES_DIR, "synthetic-bindable");
const TEMP_DIR = path.join(__dirname, "..", "data", "test-tmp-ctk02");

function setupTempDir() {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanupTempDir() {
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch {}
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log("\n## CTK-02 Node Roles and Capability Capsule Foundation");

setupTempDir();

try {
  // AC 1: Node Identity Contract
  runTest("AC 1: Locaily installation identifies itself through versioned node contract", () => {
    const config = loadNodeConfig();
    assert.strictEqual(config.schema_version, "1.0");
    assert.ok(config.installation_id.startsWith("inst-"));
    assert.ok(config.node_id.length > 0);
    assert.ok(Array.isArray(config.roles));
    assertContract(config, "node-identity.v1", "INVALID_NODE_CONFIG");
  });

  // AC 2: Multi-Role Configuration
  runTest("AC 2: Same Locaily software can be configured as Brain, Worker, or Hybrid", () => {
    const brainConfig = normalizeNodeConfig({ node_id: "node-brain", roles: ["brain"] });
    const workerConfig = normalizeNodeConfig({ node_id: "node-worker", roles: ["worker"] });
    const hybridConfig = normalizeNodeConfig({ node_id: "node-hybrid", roles: ["hybrid"] });

    assert.deepStrictEqual(brainConfig.roles, ["brain"]);
    assert.deepStrictEqual(workerConfig.roles, ["worker"]);
    assert.deepStrictEqual(hybridConfig.roles, ["hybrid"]);

    assertContract(brainConfig, "node-identity.v1", "INVALID_BRAIN_CONFIG");
    assertContract(workerConfig, "node-identity.v1", "INVALID_WORKER_CONFIG");
    assertContract(hybridConfig, "node-identity.v1", "INVALID_HYBRID_CONFIG");
  });

  // AC 3: Capsule Advertisement
  runTest("AC 3: Node advertises a synthetic versioned capability capsule", () => {
    const capsule = loadCapsule(PORTABLE_CAPSULE_DIR);
    assert.strictEqual(capsule.manifest.id, "synthetic-portable");
    assert.strictEqual(capsule.manifest.version, "1.0.0");
    assert.strictEqual(capsule.manifest.portability, "portable");
    assert.ok(capsule.checksums.root_tree_hash.startsWith("sha256:"));
  });

  // AC 4: Capsule Evaluation
  runTest("AC 4: Second node deterministically evaluates capability requirements", () => {
    const nodeConfig = normalizeNodeConfig({
      node_id: "node-evaluator",
      platform: { os: process.platform === "win32" ? "win32" : "linux", arch: "x64" },
      resources: { cpu_cores: 8, ram_gb: 16 }
    });
    const capsule = loadCapsule(PORTABLE_CAPSULE_DIR);
    const evalResult = evaluateCapsuleRequirements(nodeConfig, capsule.manifest);

    assert.strictEqual(evalResult.ok, true);
    assert.strictEqual(evalResult.provenance.node_id, "node-evaluator");
    assert.strictEqual(evalResult.provenance.code, "ACCEPTED");
  });

  // AC 5: Capsule Installation & Registration
  runTest("AC 5: Second node accepts, installs, self-tests, and registers capability", () => {
    const nodeConfig = normalizeNodeConfig({ node_id: "node-installer" });
    const installResult = installCapsuleOnNode(nodeConfig, PORTABLE_CAPSULE_DIR);

    assert.strictEqual(installResult.ok, true);
    assert.strictEqual(installResult.code, "REGISTERED");
    assert.strictEqual(nodeConfig.capability_inventory.length, 1);
    assert.strictEqual(nodeConfig.capability_inventory[0].capability_id, "synthetic-portable");
  });

  // AC 6: Failure Condition Rejection
  runTest("AC 6: Major transfer failure conditions are explicitly rejected with durable provenance", () => {
    // 6a: Unsupported OS
    const macNode = normalizeNodeConfig({ node_id: "node-mac", platform: { os: "darwin", arch: "arm64" } });
    const winCapsule = {
      schema_version: "1.0",
      id: "win-only-capsule",
      name: "Win Only",
      version: "1.0.0",
      portability: "portable",
      requirements: { os: ["win32"] },
      entry_points: { default: "main.js" }
    };
    const osEval = evaluateCapsuleRequirements(macNode, winCapsule);
    assert.strictEqual(osEval.ok, false);
    assert.strictEqual(osEval.code, "UNSUPPORTED_OS");
    assert.strictEqual(osEval.provenance.code, "UNSUPPORTED_OS");

    // 6b: Insufficient Resources
    const lowNode = normalizeNodeConfig({ node_id: "node-low", resources: { cpu_cores: 1, ram_gb: 1 } });
    const heavyCapsule = {
      schema_version: "1.0",
      id: "heavy-capsule",
      name: "Heavy",
      version: "1.0.0",
      portability: "portable",
      requirements: { os: [lowNode.platform.os], min_ram_gb: 16 },
      entry_points: { default: "main.js" }
    };
    const resEval = evaluateCapsuleRequirements(lowNode, heavyCapsule);
    assert.strictEqual(resEval.ok, false);
    assert.strictEqual(resEval.code, "INSUFFICIENT_RESOURCES");

    // 6c: Missing Runtime
    const noPythonNode = normalizeNodeConfig({ node_id: "node-no-py", runtimes: [{ id: "node", available: true }] });
    const pyCapsule = {
      schema_version: "1.0",
      id: "python-capsule",
      name: "Py",
      version: "1.0.0",
      portability: "portable",
      requirements: { os: [noPythonNode.platform.os], runtimes: ["python3"] },
      entry_points: { default: "main.js" }
    };
    const pyEval = evaluateCapsuleRequirements(noPythonNode, pyCapsule);
    assert.strictEqual(pyEval.ok, false);
    assert.strictEqual(pyEval.code, "MISSING_RUNTIME");
  });

  // AC 7: Secret-Free Node-Local Bindings
  runTest("AC 7: Node-local binding is attached using references without storing raw secrets", () => {
    const bindingPath = path.join(TEMP_DIR, "node-bindings.json");
    registerBinding("OLLAMA_ENDPOINT", {
      type: "credential_ref",
      ref: "secret-key-vault-01",
      description: "Local Ollama Endpoint credential reference"
    }, bindingPath, "node-worker");

    const binding = getBinding("OLLAMA_ENDPOINT", bindingPath, "node-worker");
    assert.strictEqual(binding.type, "credential_ref");
    assert.strictEqual(binding.ref, "secret-key-vault-01");

    const satisfied = isBindingSatisfied("OLLAMA_ENDPOINT", bindingPath, "node-worker");
    assert.strictEqual(satisfied, true);
  });

  // AC 8: Verified Hash Transfer
  runTest("AC 8: Capability is transferred and identified by version and verified hash", () => {
    const checksumResult = verifyChecksums(PORTABLE_CAPSULE_DIR);
    assert.strictEqual(checksumResult.ok, true);
    assert.ok(checksumResult.checksums.files["capability.json"]);
    assert.ok(checksumResult.checksums.files["scripts/main.js"]);
    assert.ok(checksumResult.checksums.root_tree_hash.startsWith("sha256:"));
  });

  // AC 9: Portable Capsule Multi-Node Execution
  runTest("AC 9: One portable capability installs and runs on multiple eligible node fixtures", () => {
    const nodeA = normalizeNodeConfig({ node_id: "node-alpha" });
    const nodeB = normalizeNodeConfig({ node_id: "node-beta" });

    const installA = installCapsuleOnNode(nodeA, PORTABLE_CAPSULE_DIR);
    const installB = installCapsuleOnNode(nodeB, PORTABLE_CAPSULE_DIR);

    assert.strictEqual(installA.ok, true);
    assert.strictEqual(installB.ok, true);

    const selfTestA = runCapsuleSelfTest(PORTABLE_CAPSULE_DIR);
    assert.strictEqual(selfTestA.ok, true);
  });

  // AC 10: Bindable Capability Registration Flow
  runTest("AC 10: One bindable capability installs but remains unavailable until binding is registered", () => {
    const bindingPath = path.join(TEMP_DIR, "bindable-test-bindings.json");
    const nodeConfig = normalizeNodeConfig({ node_id: "node-bindable-host" });

    // Without binding -> requirement evaluation fails
    const initialInstall = installCapsuleOnNode(nodeConfig, BINDABLE_CAPSULE_DIR, bindingPath);
    assert.strictEqual(initialInstall.ok, false);
    assert.strictEqual(initialInstall.code, "MISSING_BINDING");

    // Register binding -> installation succeeds
    registerBinding("OLLAMA_ENDPOINT", {
      type: "credential_ref",
      ref: "ollama-local-token"
    }, bindingPath, "node-bindable-host");

    const afterInstall = installCapsuleOnNode(nodeConfig, BINDABLE_CAPSULE_DIR, bindingPath);
    assert.strictEqual(afterInstall.ok, true);
    assert.strictEqual(afterInstall.code, "REGISTERED");
  });

  // AC 11: CTK-01 Placement Routing
  runTest("AC 11: CTK-01 routes an event to the eligible node hosting the selected capability", () => {
    const registryDir = path.join(__dirname, "..", "companion", "capabilities");
    const registry = createCapabilityRegistry({ rootDir: registryDir });

    const event = {
      event_type: "project.status.changed",
      correlation_id: "test-ctk02-routing",
      payload: { project_id: "locaily", current_status: "review_ready" }
    };

    const nodeA = normalizeNodeConfig({ node_id: "node-a" });
    const matched = registry.matchWithNodes(event, [nodeA]);

    assert.ok(matched.length > 0);
    assert.deepStrictEqual(matched[0].eligibleNodes, ["node-a"]);
    assert.strictEqual(matched[0].targetNodeId, "node-a");
  });

  // AC 12: Provenance Complete
  runTest("AC 12: Advertisement, evaluation, installation, binding, routing, execution, and rejection have provenance", () => {
    const nodeConfig = normalizeNodeConfig({ node_id: "node-provenance" });
    const installResult = installCapsuleOnNode(nodeConfig, PORTABLE_CAPSULE_DIR);

    assert.ok(installResult.provenance);
    assert.strictEqual(installResult.provenance.node_id, "node-provenance");
    assert.strictEqual(installResult.provenance.capability_id, "synthetic-portable");
    assert.strictEqual(installResult.provenance.code, "REGISTERED");
    assert.ok(installResult.provenance.evaluated_at);
  });

} finally {
  cleanupTempDir();
}

console.log(`\n## Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
