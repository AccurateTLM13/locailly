# JSON-First Schema Enforcement Audit

**Date:** 2026-06-20  
**Scope:** `companion/schemas/internal/`, orchestration, `decomposer`, validators/verify tools, audit logging, Lighthouse Handoff pipeline.

## Executive Summary

Seven of eight internal JSON schemas remain **documentation-only**. **`workflow-plan.schema.json` is runtime-enforced** at the `buildRunPlan()` boundary via `validateBuiltRunPlan()` in `run-plan-builder.js`.

JSON objects are produced throughout the stack. Enforcement uses **`validateResult()`** (now with `$ref` / `minItems` support for workflow plans), **imperative checks**, and **workflow-specific schemas** (`companion/schemas/`, `companion/pit-crew/schemas/`, `tool-packs/*/schemas/`).

**Safest next implementation step:** validate **task track files** in `decomposer.loadTrackFile()` using `task-track.schema.json` and the existing `validateResult()` helper.

---

## Cross-Cutting Findings

| Finding | Detail |
|---|---|
| Internal schemas referenced in code | **`workflow-plan.schema.json`** loaded in `run-plan-builder.js`; other internal schemas not yet wired |
| Shared validator | `companion/core/result-validator.js` — lightweight JSON Schema subset, already used for tool outputs and step schemas |
| `/tracks/run` vs `/workflows/run` | Workflow path adds per-step validation in `run-plan-validator.js`; direct track path does not validate intermediate tool outputs |
| Lighthouse pipeline | JSON artifacts are real; `final-output-manifest` wrapper is **not** emitted; result is a flat handoff object + `markdown` + `meta.verification` |

---

## Per-Schema Audit

### 1. Workflow Plan (`workflow-plan.schema.json`)

| | |
|---|---|
| **Runtime status** | **Runtime-enforced at build** — validated in `buildRunPlan()` via `validateBuiltRunPlan()` |
| **Producer** | `companion/orchestration/run-plan-builder.js` → `buildRunPlan()` |
| **Consumers** | `run-plan-executor.js` → `executeRunPlan()`; `run-logger.js` → `buildOrchestrationLogEvent()`; `server.js` → `POST /workflows/plan`, `POST /workflows/run` |
| **Validation coverage** | `validateResult(plan, workflowPlanSchema)` immediately after plan construction. Schema loaded from `companion/schemas/internal/workflow-plan.schema.json`. Failures throw `WORKFLOW_PLAN_INVALID` with `error.validation.errors`. `$ref` / `minItems` supported in `result-validator.js` for this schema. |
| **Partial vs complete** | **Enforced at build boundary only** — executed plans (mutated step `output`, `worker_used`, etc.) are not re-validated against this schema after `executeRunPlan()` |
| **Schema fields unused at runtime** | None required by schema are missing from builder output. |
| **Runtime fields not in schema** | `registry.validation_expectations` (nested under `registry`) |
| **Missing enforcement** | Post-execution plan re-validation; contract test on HTTP error envelope for `WORKFLOW_PLAN_INVALID` |
| **Recommended next step** | ~~After `buildRunPlan()`~~ **Done (2026-06-20).** Next: validate task tracks in `decomposer.loadTrackFile()` |

---

### 2. Task Track (`task-track.schema.json`)

| | |
|---|---|
| **Runtime status** | **Loaded, minimally validated** |
| **Producer** | Hand-authored `companion/pit-crew/tracks/*.track.json` |
| **Consumers** | `decomposer.js` → `loadTrack()`; `pit-crew/orchestrator.js`; `run-plan-builder.js`; `track-registry.js` |
| **Validation coverage** | `decomposer.js` checks: parseable JSON, `track_id`, non-empty `steps`, each step has `id` + `executor.type`. Does **not** check: `version`, `name`, `output_schema` path exists, `input_map` shape, model `schema`/`prompt_template`, executor field completeness per type. |
| **Partial vs complete** | **Partial** — structural minimum only |
| **Schema fields unused at runtime** | `version`, `name`, `description`, `result_step`, `verification_step` — accepted but not validated |
| **Runtime behavior not in schema** | Lighthouse track uses `priority_helper` role; schema allows any role string |
| **Missing enforcement** | No JSON Schema validation on load; invalid `input_map` fails at step execution instead of load time |
| **Recommended next step** | Validate each track file against `task-track.schema.json` inside `loadTrackFile()`; extend imperative checks for model executor `schema` + `prompt_template` when `type === "model"` |

---

### 3. Tool Registry Entry (`tool-registry-entry.schema.json`)

| | |
|---|---|
| **Runtime status** | **Produced, differently shaped** |
| **Producer** | `companion/tools/registry.js` → `loadToolPack()`, `toPublicToolMetadata()`; built-in tools in `deal-sniper.js`, `lighthouse-handoff.js` |
| **Consumers** | `GET /tools`; `tool-router.js` → `executeToolStep()`; `server.js` task dispatch |
| **Validation coverage** | `validateTool()` (id, name, tasks, handle); manifest checks (pack id, trust enum, tools array). Pack tool `output_schema` files are loaded and attached to handler — validated on **tool result**, not on registry metadata row. |
| **Partial vs complete** | **Partial** — registration works; public metadata does not match internal schema field-for-field |
| **Schema fields unused at runtime** | `trust` as named — runtime exposes `pack_trust` |
| **Runtime fields not in schema** | `pack_trust`, `pack_version`, `input` (required/optional summary), `output` (required keys summary) |
| **Enum mismatch** | Schema `trust`: `official`, `community`, `local`, `experimental`. Registry `TRUST_LEVELS`: `official`, `verified`, `community`, `experimental`, `local_private` |
| **Missing enforcement** | No validation of `GET /tools` rows against `tool-registry-entry.schema.json` |
| **Recommended next step** | Align schema with `toPublicToolMetadata()` output (rename `trust` → `pack_trust`, add `pack_version`) **or** add a mapping layer — then validate in `listPublic()` under a feature flag |

---

### 4. Model Registry Entry (`model-registry-entry.schema.json`)

| | |
|---|---|
| **Runtime status** | **Spec only** |
| **Producer** | None for this schema |
| **Consumers** | None |
| **Closest runtime data** | `companion/core/model-profiles.js` (`ROLE_SUITABILITY`, `DEFAULT_PROFILES`); `GET /models/roles` in-memory role map |
| **Validation coverage** | **None** for scorecard/registry row shape |
| **Partial vs complete** | **Spec only** — documented target for Model Garage Phase 2 |
| **Missing enforcement** | Entire schema |
| **Recommended next step** | Defer until file-backed registry milestone; when implementing, map `model-profiles.js` fields to schema explicitly |

---

### 5. NearbyNode Capability (`nearby-node-capability.schema.json`)

| | |
|---|---|
| **Runtime status** | **Spec only** |
| **Producer** | None |
| **Consumers** | None |
| **Validation coverage** | **None** |
| **Missing enforcement** | Entire schema — NearbyNode not implemented |
| **Recommended next step** | Keep spec-only; validate first reference connector against schema when NearbyNode milestone starts |

---

### 6. Validation Result (`validation-result.schema.json`)

| | |
|---|---|
| **Runtime status** | **Partially aligned shape, not schema-validated** |
| **Producer** | `lighthouse.verify_handoff` → `{ valid, errors }` (`tool-packs/lighthouse-parser-pack/index.js`) |
| **Consumers** | `run-plan-validator.js` (checks `valid` boolean on `verify_output` / `validate_analysis` steps); `pit-crew/orchestrator.js` → `assembleLighthouseTrackResult()` embeds as `meta.verification` |
| **Not a validation-result producer** | `lighthouse.validate_priority_fixes` returns `{ thinking, priorityFixes, needsReview }` — enrichment step, not `{ valid, errors }` |
| **Internal validator shape** | `validateResult()` returns `{ ok, errors }` — different field names from schema |
| **Validation coverage** | Behavioral check on `valid` flag for verify steps; **no** schema file load. Optional `warnings`, `validator_id`, `step_id`, `schema_ref`, `checked_at`, `details` are **never set**. |
| **Partial vs complete** | **Partial** — only `verify_output` matches core `{ valid, errors }`; not validated against internal schema |
| **Missing enforcement** | No wrapper standardizing validation outputs across steps; `validate_priority_fixes` misnamed relative to schema |
| **Recommended next step** | Add `validator_id` + `step_id` to `lighthouse.verify_handoff` return; optionally normalize `validateResult()` failures to `{ valid: false, errors }` at verify step boundary |

---

### 7. Run Log / Audit Record (`run-log-audit-record.schema.json`)

| | |
|---|---|
| **Runtime status** | **Produced, normalized, not schema-validated** |
| **Producer** | `companion/core/audit-log.js` → `normalizeAuditEvent()`; `buildAuditEvent()`; `orchestration/run-logger.js` → `buildOrchestrationLogEvent()` |
| **Consumers** | `GET /audit` via `auditLog.list()`; JSONL file under `data/` |
| **Validation coverage** | Normalization (defaults for `event_id`, `timestamp`, `status` enum coercion). **No** schema validation on write or read. |
| **Partial vs complete** | **Partial** — core fields populated; shapes vary by event type |
| **Shape variance** | Generic tool runs: `input_summary` / `output_summary` are char/key summaries. Orchestration runs: `input_summary` has `task_id`, `workflow_id`, `track_id`, `plan_id`; `output_summary` has `step_statuses[]`. |
| **Dropped fields** | `buildAuditEvent()` passes `status_code` but `normalizeAuditEvent()` does not persist it |
| **Missing enforcement** | No validate-on-write; no contract test for audit JSONL lines |
| **Recommended next step** | Validate normalized events in `record()` during test runs; document orchestration-specific `input_summary` / `output_summary` variants in schema as `oneOf` before enforcing |

---

### 8. Final Output Manifest (`final-output-manifest.schema.json`)

| | |
|---|---|
| **Runtime status** | **Spec / target wrapper — not produced** |
| **Producer** | None as a discrete manifest object |
| **Actual Lighthouse output** | `assembleLighthouseTrackResult()` spreads handoff fields at top level + `markdown` + `meta: { track_id, verification }` |
| **Workflow API output** | `POST /workflows/run` returns flat `result` (handoff fields + `markdown`) plus `plan` in envelope `meta` — not `{ structured_result, exports }` wrapper |
| **Consumers** | Clients read flat result; extension integration spec merges `result` fields into Markdown |
| **Validation coverage** | Handoff **content** validated via `companion/schemas/lighthouse-handoff.schema.json` on handoff object (without `markdown`/`meta` in that check). Manifest schema **not** used. |
| **Partial vs complete** | **Spec only** as a manifest type; **partial** if interpreted as "Lighthouse JSON fields exist" |
| **Schema fields unused at runtime** | `workflow_id`, `track_id`, `structured_result`, `exports`, `artifacts` wrapper — entire manifest envelope |
| **Missing enforcement** | No code emits manifest shape; schema describes target export contract, not current API |
| **Recommended next step** | Either (a) treat as future wrapper and keep spec-only, or (b) add thin `buildOutputManifest(plan, result)` in orchestration that wraps without breaking flat `result` for backward compatibility |

---

## Lighthouse Handoff Pipeline — Stage-by-Stage

| Stage | Step | JSON produced | Validated how | Maps to internal schema |
|---|---|---|---|---|
| Normalize | `extract_metrics` | `{ url, performance, … }` | Input only (`validateInput`) | Tool pack output schema exists; **not** checked in `tool-router` |
| Extract issues | `classify_issues` | `{ issues, rankedOpportunities, source }` | Input only | Same |
| Prioritize | `prioritize_fixes` | `{ thinking, priorityFixes }` | Model JSON schema (`prioritize-fixes.schema.json`) on `/workflows/run` only | Not `validation-result` |
| Validate priorities | `validate_priority_fixes` | `{ thinking, priorityFixes, needsReview }` | Input only | **Not** `validation-result` despite step name |
| Match | `match_fixes` | `{ fixes }` | Input only | Tool pack schema |
| Compose | `write_handoff` | Handoff object (+ `markdown` added by orchestrator) | `lighthouse-handoff` input validation in tool | Flat result, not `final-output-manifest` |
| Verify | `verify_output` | `{ valid, errors }` | Boolean gate in `run-plan-validator` | Aligns with `validation-result` (core fields only) |
| Final assembly | `assembleLighthouseTrackResult` | Flat result + `markdown` + `meta.verification` | `lighthouse-handoff.schema.json` on handoff body | **Not** `final-output-manifest` |

**Markdown export:** `formatHandoffMarkdown()` in `companion/pit-crew/markdown.js` — called from orchestrator after `write_handoff`, consistent with export-layer docs.

---

## Safest Next Implementation Step

**Validate workflow plans and task tracks against internal schemas at existing boundaries.**

| Priority | Action | Risk | Why |
|---|---|---|---|
| ~~**1 (recommended)**~~ | ~~`validateResult(plan, workflowPlanSchema)` after `buildRunPlan()`~~ | — | **Done (2026-06-20)** — `validateBuiltRunPlan()` in `run-plan-builder.js` |
| **1 (recommended)** | `validateResult(track, taskTrackSchema)` in `decomposer.loadTrackFile()` | Low | Two track files; fails at server start / first load |
| **2** | Contract test: audit JSONL lines match `run-log-audit-record` core fields | Low | Read-only validation in tests |
| **3** | Align `tool-registry-entry` schema with `toPublicToolMetadata()` | Medium | Doc/schema drift fix before enforcement |
| **Defer** | `final-output-manifest` wrapper, `model-registry-entry`, `nearby-node-capability` | — | No producer code yet |

Use existing `validateResult()` — no new dependencies. Do **not** start by wrapping API responses in `final-output-manifest`; that would break client contracts.

---

## Related

- [../01-architecture/json-first-internal-format.md](../01-architecture/json-first-internal-format.md)
- [../01-architecture/internal-json-schemas.md](../01-architecture/internal-json-schemas.md)
- [../03-workflows/lighthouse-handoff.md](../03-workflows/lighthouse-handoff.md)
