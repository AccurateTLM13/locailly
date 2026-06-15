# Workflow: DealSniper

## Status

**Partial** — showcase tool exists; no Pit Crew track file

## Goal

Analyze marketplace listings and surface structured buying/selling insights for the user.

## User Input

Listing text, price, and marketplace context (see `companion/tools/deal-sniper.js` and input schema).

## Output

Structured analysis object per DealSniper output schema — not a full API envelope from the tool handler.

## Track Plan (Planned)

Core tracks:

- Extraction
- Classification
- Summarization
- Validation

No `*.track.json` exists yet. Today runs via `POST /tasks/run` with tool `deal-sniper` only.

## Current Implementation

- Tool: `companion/tools/deal-sniper.js`
- Entry: `POST /tasks/run` / `POST /analyze`
- Not registered as a workflow track in `companion/pit-crew/tracks/`

## Validation Evidence

No dedicated workflow validation doc. General smoke tests cover tool registration.

## Known Gaps

- No composed track workflow
- No workflow-specific validation tiers
- Not listed in `GET /tracks`

## Next Build Step

Define track plan in [../02-track-system/workflow-registry.md](../02-track-system/workflow-registry.md), add `*.track.json`, and validate with smoke + evidence doc under [../04-validation/](../04-validation/).
