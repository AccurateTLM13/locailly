# Memory Writeback

## Purpose

After a task completes, useful outputs may deserve to be filed back into the memory vault: decisions, lessons, and suggested page updates. **v0 is proposal-only** — Locaily never auto-edits wiki pages, `index.md`, `log.md`, or `raw/` sources.

## The Safe Loop

```txt
Task completes
    → Locaily builds writeback proposal (JSON in, Markdown file out)
    → Proposal lands in .memory-bridge/writeback-inbox/
    → Human reviews
    → Human edits vault manually (or future /apply flow)
```

## What Can Be Written in v0

| Target | v0 |
|--------|-----|
| `.memory-bridge/writeback-inbox/*.md` | Yes (proposal files only) |
| `wiki/projects/*.md` | No (suggested in proposal text only) |
| `index.md`, `log.md` | No (suggested in proposal text only) |
| `raw/**` | **Never** |

## Request

`POST /memory/writeback/propose`

```json
{
  "taskId": "run_abc123",
  "project": "Example Project",
  "task": "Plan Memory Bridge v0",
  "whatChanged": ["Defined context pack contract."],
  "decisionsMade": [
    "Second Brain remains private.",
    "Writeback stays proposal-only in v0."
  ],
  "newLessons": [
    "blockedPaths must override allowedPaths."
  ],
  "suggestedUpdates": [
    "Append entry to log.md",
    "Update projects/Example Project.md current state"
  ],
  "requiresHumanReview": true
}
```

`requiresHumanReview` must be `true` in v0. Requests with `false` are rejected.

## Response (success)

```json
{
  "ok": true,
  "result": {
    "proposalId": "2026-06-12-example-project-memory-bridge-v0",
    "proposalPath": ".memory-bridge/writeback-inbox/2026-06-12-example-project-memory-bridge-v0.md",
    "requiresHumanReview": true
  },
  "warnings": [],
  "meta": { }
}
```

`proposalPath` is relative to the vault root. The full private vault path is not returned.

## Proposal File Format

Inbox files use Markdown for human review:

```md
# Writeback Proposal: Example Project — Plan Memory Bridge v0

## Task
Plan Memory Bridge v0.

## What Changed
- Defined context pack contract.

## Decisions Made
- Second Brain remains private.

## New Lessons
- blockedPaths must override allowedPaths.

## Suggested Updates
- Append entry to log.md
- Update projects/Example Project.md

## Requires Human Review
Yes.
```

## Permissions

Writeback uses `memory.writeback.propose`, separate from denied `file.write`. Enable it in permissions when the user opts into writeback.

## Not in v0

- `POST /memory/writeback/apply` — deferred until proposal flow is trusted
- Automatic index/log append
- Editing `raw/` sources

## Schema

JSON Schema: [companion/schemas/memory-writeback.schema.json](../../companion/schemas/memory-writeback.schema.json)

## Related

- [memory-bridge.md](./memory-bridge.md)
- [context-packs.md](./context-packs.md)
- [../06-decisions/second-brain-as-memory-layer.md](../06-decisions/second-brain-as-memory-layer.md)
