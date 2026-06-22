const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createToolRegistry } = require("../companion/tools/registry");
const { validateResult } = require("../companion/core/result-validator");

const toolPackManifestSchema = require("../companion/schemas/internal/tool-pack-manifest.schema.json");
const toolPackManifestToolSchema = require("../companion/schemas/internal/tool-pack-manifest-tool.schema.json");
const internalToolRegistryEntrySchema = require("../companion/schemas/internal/internal-tool-registry-entry.schema.json");
const publicToolMetadataSchema = require("../companion/schemas/internal/public-tool-metadata.schema.json");

const TOOL_PACKS_DIR = path.join(__dirname, "..", "tool-packs");

function snapshotInternalToolMetadata(tool) {
  const snapshot = {
    id: tool.id,
    name: tool.name,
    pack: tool.pack,
    description: tool.description || "",
    tasks: tool.tasks,
    permissions: Array.isArray(tool.permissions) ? tool.permissions : [],
    modelRole: tool.modelRole ?? null,
    requiresRuntime: tool.requiresRuntime !== false,
    inputSchema: tool.inputSchema || null,
    outputSchema: tool.outputSchema || null,
    input: tool.input || null,
    output: tool.output || null
  };

  if (typeof tool.trust === "string") {
    snapshot.trust = tool.trust;
  }

  if (typeof tool.packVersion === "string") {
    snapshot.packVersion = tool.packVersion;
  }

  if (typeof tool.prompt === "string") {
    snapshot.prompt = tool.prompt;
  }

  return snapshot;
}

function loadToolPackManifests() {
  return fs.readdirSync(TOOL_PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(TOOL_PACKS_DIR, entry.name, "tool.json"))
    .filter((manifestPath) => fs.existsSync(manifestPath))
    .map((manifestPath) => ({
      manifestPath,
      manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    }));
}

function assertSchemaValid(label, value, schema) {
  const validation = validateResult(value, schema, label);
  assert(validation.ok, `${label} failed schema validation: ${validation.errors.join("; ")}`);
}

function assertSchemaInvalid(label, value, schema) {
  const validation = validateResult(value, schema, label);
  assert(!validation.ok, `${label} should fail schema validation.`);
  assert(validation.errors.length > 0, `${label} should include validation errors.`);
}

function checkManifestFiles() {
  const manifests = loadToolPackManifests();
  assert(manifests.length >= 2, "Expected at least two tool pack manifests.");

  for (const { manifestPath, manifest } of manifests) {
    assertSchemaValid(path.basename(manifestPath), manifest, toolPackManifestSchema);

    for (const toolDef of manifest.tools) {
      assertSchemaValid(`${manifest.id}/${toolDef.id}`, toolDef, toolPackManifestToolSchema);
    }
  }
}

function checkInternalRegistryEntries() {
  const registry = createToolRegistry();
  const tools = registry.list();
  assert(tools.length >= 10, "Expected registered tools from packs and showcase handlers.");

  for (const tool of tools) {
    assert(typeof tool.handle === "function", `Tool '${tool.id}' must define handle at runtime.`);
    assertSchemaValid(`internal:${tool.id}`, snapshotInternalToolMetadata(tool), internalToolRegistryEntrySchema);
  }

  const showcase = registry.get("lighthouse-handoff");
  assert(!Object.prototype.hasOwnProperty.call(snapshotInternalToolMetadata(showcase), "trust"),
    "Showcase lighthouse-handoff may omit trust before public normalization.");
}

function checkPublicToolsMetadata() {
  const registry = createToolRegistry();

  for (const toolMeta of registry.listPublic()) {
    assertSchemaValid(`public:${toolMeta.id}`, toolMeta, publicToolMetadataSchema);
  }

  const lighthouse = registry.listPublic().find((tool) => tool.id === "lighthouse-handoff");
  assert.equal(lighthouse.pack_trust, "official", "Public metadata defaults pack_trust when internal trust is absent.");
  assert.equal(lighthouse.pack, "showcase-tools");
  assert.equal(lighthouse.model_role, "default_worker");
}

function checkMalformedRepresentatives() {
  assertSchemaInvalid("manifest missing trust", {
    id: "bad-pack",
    name: "Bad",
    version: "0.0.0",
    tools: [{ id: "x", output_schema: "out.json" }]
  }, toolPackManifestSchema);

  assertSchemaInvalid("manifest tool missing output_schema", {
    id: "text.bad"
  }, toolPackManifestToolSchema);

  assertSchemaInvalid("internal missing tasks", {
    id: "bad-tool",
    name: "Bad Tool"
  }, internalToolRegistryEntrySchema);

  assertSchemaInvalid("public uses trust instead of pack_trust", {
    id: "bad-tool",
    name: "Bad Tool",
    pack: "bad-pack",
    trust: "official",
    pack_version: "0.1.0",
    description: "",
    tasks: ["run"],
    permissions: [],
    model_role: null,
    runtime_required: false,
    input_schema: null,
    output_schema: null,
    input: null,
    output: null
  }, publicToolMetadataSchema);

  assertSchemaInvalid("public missing pack_trust", {
    id: "bad-tool",
    name: "Bad Tool",
    pack: "bad-pack",
    pack_version: "0.1.0",
    description: "",
    tasks: ["run"],
    permissions: [],
    model_role: null,
    runtime_required: false,
    input_schema: null,
    output_schema: null,
    input: null,
    output: null
  }, publicToolMetadataSchema);
}

function main() {
  checkManifestFiles();
  checkInternalRegistryEntries();
  checkPublicToolsMetadata();
  checkMalformedRepresentatives();
  console.log("Tool registry schema contract tests passed.");
}

main();
