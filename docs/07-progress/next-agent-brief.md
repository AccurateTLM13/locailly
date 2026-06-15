# Next Agent Brief

Hand this to Cursor, Claude, Codex, or any coding agent continuing Locaily work.

**Updated:** 2026-06-14

## Read First

1. [../00-start-here/current-state.md](../00-start-here/current-state.md)
2. [../02-track-system/README.md](../02-track-system/README.md)
3. [../03-workflows/lighthouse-handoff.md](../03-workflows/lighthouse-handoff.md)
4. [../07-progress/current-sprint.md](./current-sprint.md)

Also: root [AGENTS.md](../../AGENTS.md) and [../08-agents/agent-context.md](../08-agents/agent-context.md)

## Do Not

- Replace the current server or break existing endpoints
- Break `POST /tasks/run` or `POST /tracks/run` response envelopes
- Claim DAG support, NearbyNode, or automatic track classification exists
- Add NearbyNode implementation without an explicit milestone decision
- Make model benchmark claims without evidence in [../04-validation/](../04-validation/)
- Expand Lighthouse-specific `if (step.id === ...)` in tool-router without a migration plan

## Current Task

**After docs restructure (this sprint):** Implement declarative step `input_map` in track JSON and a resolver in `companion/pit-crew/tool-router.js`, then migrate `website_audit.lighthouse_handoff` off hardcoded step ids.

See [../02-track-system/step-input-mapping.md](../02-track-system/step-input-mapping.md).

## Architecture Reminder

```txt
Models plug into tracks.
Tools plug into tracks.
NearbyNodes will provide track capabilities (future).
Workflows compose tracks.
Validation scores tracks.
Local Brain dispatches tracks — not raw model names.
```

## Quick Code Map

| Concern | Path |
|---|---|
| Server | `companion/server.js` |
| Track run | `companion/pit-crew/orchestrator.js` |
| Track files | `companion/pit-crew/tracks/` |
| Step input (debt) | `companion/pit-crew/tool-router.js` |
| Tools | `companion/tools/registry.js`, `tool-packs/` |
| Proof workflow tool | `companion/tools/lighthouse-handoff.js` |

## When Done

Add an entry to [progress-log.md](./progress-log.md) and update [build-status.md](./build-status.md) if status changed.
