# Current Sprint

**Updated:** 2026-06-15

## Goal

Close Milestone 3 documentation and prepare Milestone 4 (legacy step-input fallback removal).

## Completed (recent)

- Milestone 1B: declarative tool-step `input_map` (PR #5)
- Milestone 2: DealSniper workflow track (PR #7)
- Milestone 3: model-step `input_map` (PR #8)
- Clean-server smoke baseline: **51/51**

## In Scope (next)

- Remove `buildLegacyToolStepInput()` / `buildLegacyModelStepInput()` when safe
- Keep Lighthouse + DealSniper tracks passing smoke/contract/unit tests
- Sync progress docs after each merge

## Out of Scope

- DAG runner implementation
- NearbyNode implementation
- Model Garage harness implementation (spec/docs only until evidence)
- Endpoint envelope changes

## Done When

- Legacy fallbacks removed or explicitly deferred with decision-log entry
- `current-state.md`, `build-status.md`, and `next-agent-brief.md` match code
- Smoke suite remains **51/51** on clean server
