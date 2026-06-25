# Next Agent Brief

Hand this to Cursor, Claude, Codex, or any coding agent continuing Locaily work.

**Updated:** 2026-06-16

## Read First

1. [../00-start-here/current-state.md](../00-start-here/current-state.md)
2. [milestone-4-completion.md](./milestone-4-completion.md) — M4 closed
3. [milestone-5-checkpoint.md](./milestone-5-checkpoint.md) — **M5 planning gate (read before coding)**
4. [build-status.md](./build-status.md)

Also: root [AGENTS.md](../../AGENTS.md) and [../08-agents/agent-context.md](../08-agents/agent-context.md)

## Do Not (until M5 explicitly started)

- Start Milestone 5 implementation without canonical-path decision and PR #10 review
- Implement Model Swap Manager from local `model-swap-manager.md` unless M5A is opened
- Replace the current server or break existing endpoints
- Break `POST /tasks/run`, `POST /tracks/run`, or `POST /workflows/run` response envelopes
- Claim DAG support, NearbyNode, or automatic track classification exists

## Current Task

**Planning checkpoint only.** Milestone 4 is complete (PR #9, merge `c89db65`, smoke 55/55).

When the user opens Milestone 5:

1. Review PR #10 `ai-models/` on `main`
2. Decide canonical Lighthouse path (tool / track / workflow)
3. Prove parity, then remove legacy step-input fallbacks in `step-input.js`
4. Optionally harden workflow-orchestrator audit summaries

See [milestone-5-checkpoint.md](./milestone-5-checkpoint.md).

## Architecture Reminder

```txt
Workflow requests → run plans → track steps.
Models plug into tracks.
Tools plug into tracks.
Track JSON declares input_map for tool and model steps.
Internal orchestration state is JSON; Markdown is export-only.
NearbyNodes will provide track capabilities (future).
Workflows compose tracks.
Validation scores tracks.
Local Brain dispatches tracks — not raw model names.
```

## Quick Code Map

| Concern | Path |
|---|---|
| Server | `companion/server.js` |
| Workflow orchestration | `companion/orchestration/` |
| Track run | `companion/pit-crew/orchestrator.js` |
| Track files | `companion/pit-crew/tracks/` |
| Step input | `companion/pit-crew/step-input.js`, `input-map-resolver.js` |
| Model / tool routers | `companion/pit-crew/model-router.js`, `tool-router.js` |
| Tools | `companion/tools/registry.js`, `tool-packs/` |
| Proof workflows | `lighthouse-handoff.track.json`, `dealsniper.track.json` |

## When Done

Add an entry to [progress-log.md](./progress-log.md) and update [build-status.md](./build-status.md) if status changed.
