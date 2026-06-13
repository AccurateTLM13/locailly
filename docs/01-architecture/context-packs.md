# Context Packs

## Purpose

A **Context Pack** is a small, task-specific bundle of memory pulled from an allowlisted local vault. Workflows and agents use it to start with relevant project context without loading the entire vault.

## Design Principles

1. **Task-specific** — built for a `project` + `task`, not a full vault export.
2. **Inspectable** — `filesUsed` lists every source file; users can verify what was read.
3. **Compact by default** — summaries, heading extraction, and limited excerpts. **Full source file content is not returned in v0.**
4. **Honest** — `warnings` when memory is disabled, partially readable, or heuristics fall back.

If full-content packs are added later, they must be an explicit request flag and off by default.

## Request

`POST /memory/context-pack`

```json
{
  "project": "Example Project",
  "task": "Plan Memory Bridge v0",
  "include": [
    "current_state",
    "known_decisions",
    "constraints",
    "open_questions"
  ],
  "maxFiles": 8
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `project` | yes | Matched against project pages (flat or `wiki/projects/`) |
| `task` | yes | Keyword match against topics and excerpts |
| `include` | no | Hints which sections to prioritize |
| `maxFiles` | no | Default `8` |

## Response (success)

```json
{
  "ok": true,
  "result": {
    "contextPackId": "ctx_example-project_memory-bridge-v0",
    "project": "Example Project",
    "task": "Plan Memory Bridge v0",
    "summary": "Short synthesized overview from index and matched pages.",
    "filesUsed": [
      "index.md",
      "projects/Example Project.md",
      "topics/Example Topic.md"
    ],
    "excerpts": [
      {
        "path": "projects/Example Project.md",
        "heading": "Current state",
        "text": "Limited excerpt (truncated)..."
      }
    ],
    "keyDecisions": ["Second Brain stays private."],
    "knownConstraints": ["Writeback is proposal-only."],
    "openQuestions": ["When to wire Lighthouse Handoff?"],
    "warnings": [],
    "recommendedNextStep": "Review filesUsed before running the task."
  },
  "warnings": [],
  "meta": {
    "requestId": "string",
    "durationMs": 0,
    "createdAt": "ISO-8601"
  }
}
```

## Field Definitions

| Field | Description |
|-------|-------------|
| `contextPackId` | Stable slug for this pack build |
| `summary` | Short narrative synthesis (not a file dump) |
| `filesUsed` | Relative vault paths actually read |
| `excerpts` | Per-file heading + truncated text snippets |
| `keyDecisions` | Extracted from `## Decisions` / similar headings |
| `knownConstraints` | Extracted from `## Constraints` / similar headings |
| `openQuestions` | Extracted from `## Open questions` / similar headings |
| `warnings` | Pack-level warnings (also mirrored at envelope root when applicable) |
| `recommendedNextStep` | Suggested next action for the agent or human |

## v0 Selection Rules (Deterministic)

No embeddings or model calls in v0.

1. If allowlisted, include `index.md` and `log.md` when relevant to `include`.
2. Match `project` to filenames under `projects/` or `wiki/projects/`.
3. Match `task` keywords to topic filenames and early content under `topics/` or `wiki/topics/`, `wiki/concepts/`, `wiki/entities/`.
4. Respect `maxFiles`; skip files blocked by `blockedPaths` even if allowlisted.
5. Extract structured lists from standard Markdown headings.
6. Build `summary` from index + matched titles + first excerpt lines.

## Errors and Degraded Mode

When memory is disabled or vault unreadable:

```json
{
  "ok": false,
  "result": null,
  "error": {
    "code": "MEMORY_DISABLED",
    "message": "Memory bridge is not enabled.",
    "nextStep": "Set memoryBridge.enabled and vaultPath in companion/config.json."
  },
  "warnings": ["Memory bridge is disabled."],
  "meta": { }
}
```

Locaily core (`/tasks/run`, `/health`) continues to work regardless.

## Schema

JSON Schema: [companion/schemas/context-pack.schema.json](../../companion/schemas/context-pack.schema.json)

## Related

- [memory-bridge.md](./memory-bridge.md)
- [memory-writeback.md](./memory-writeback.md)
