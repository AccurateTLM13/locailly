# Internal JSON Schemas

Canonical JSON Schema files for Local Brain internal state. These document the **target operating format**; not every schema is validated by runtime code yet.

**Location:** `companion/schemas/internal/`

## Schema Index

| Schema | File | Runtime validation | Description |
|---|---|---|---|
| Workflow plan | [workflow-plan.schema.json](../../companion/schemas/internal/workflow-plan.schema.json) | **Partial** — produced by orchestration; shape enforced in builder/executor | Run plan from `POST /workflows/plan` and `/workflows/run` |
| Task track | [task-track.schema.json](../../companion/schemas/internal/task-track.schema.json) | **Partial** — `decomposer.js` validates core fields | Track definition files under `companion/pit-crew/tracks/` |
| Tool registry entry | [tool-registry-entry.schema.json](../../companion/schemas/internal/tool-registry-entry.schema.json) | **Partial** — manifest load + `/tools` metadata | Single tool from a pack manifest or showcase registration |
| Model registry entry | [model-registry-entry.schema.json](../../companion/schemas/internal/model-registry-entry.schema.json) | **Spec only** — roles/profiles exist; no file-backed registry yet | Model scorecard / skill sheet row for routing |
| NearbyNode capability | [nearby-node-capability.schema.json](../../companion/schemas/internal/nearby-node-capability.schema.json) | **Spec only** — NearbyNode not implemented | Capability advertisement from a nearby device |
| Validation result | [validation-result.schema.json](../../companion/schemas/internal/validation-result.schema.json) | **Partial** — used by verify/validate tool steps | Per-step or final structural validation outcome |
| Run log / audit record | [run-log-audit-record.schema.json](../../companion/schemas/internal/run-log-audit-record.schema.json) | **Partial** — `audit-log.js` normalizes events | Summary-only audit JSONL event |
| Final output manifest | [final-output-manifest.schema.json](../../companion/schemas/internal/final-output-manifest.schema.json) | **Partial** — Lighthouse handoff result shape | Structured result + export references (e.g. `markdown`) |

## Usage Rules

1. **Orchestration reads and writes JSON** — plans, artifacts, validation, audit.
2. **Markdown is generated last** — from validated JSON via export renderers.
3. **Do not invent runtime support** — if a schema is marked spec-only, treat it as architecture guidance until wired in code.
4. **Extend schemas additively** — prefer optional fields over breaking changes; document in [decision-log.md](../06-decisions/decision-log.md).

## Relationship to Other Schemas

| Area | Path | Role |
|---|---|---|
| Workflow output contracts | `companion/schemas/*.schema.json` | Client-facing result shapes (e.g. Lighthouse handoff) |
| Step intermediates | `companion/pit-crew/schemas/*.schema.json` | Per-step model JSON outputs |
| Tool pack I/O | `tool-packs/*/schemas/*.schema.json` | Tool input/output validation |
| API envelopes | [api-contract.md](./api-contract.md) | HTTP response wrapper |

## Related

- [json-first-internal-format.md](./json-first-internal-format.md)
- [../02-track-system/track-definition-schema.md](../02-track-system/track-definition-schema.md)
- [../02-track-system/run-plan-format.md](../02-track-system/run-plan-format.md)
