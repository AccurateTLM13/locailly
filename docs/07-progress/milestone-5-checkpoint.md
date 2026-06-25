# Milestone 5 Planning Checkpoint

**Status:** In progress — parity characterization started  
**Updated:** 2026-06-17

Milestone 4 is complete. This document captures known follow-ups and the proposed Milestone 5 starting point before any code work begins.

## Known follow-ups (non-blocking from M4)

### 1. Workflow-orchestrator audit summaries

Events are written under `tool: workflow-orchestrator`, but `GET /audit` normalization currently summarizes away step-level orchestration detail.

**Target:** Richer audit summaries (step ids, statuses, workers, duration, final workflow status) **without** leaking raw task input/output.

**Modules:** `companion/orchestration/run-logger.js`, `companion/core/audit-log.js`

### 2. Model Swap Manager spec (local-only)

`docs/01-architecture/model-swap-manager.md` remains **untracked / local-only** and is **out of scope** for Milestone 5 unless a separate **M5A** milestone is explicitly opened.

Do not merge that file as part of M5 hardening work without a dedicated review.

### 3. PR #10 on `main` (review before M5)

`main` includes `803439b` — PR #10 AI model candidate docs under `ai-models/` (merged before PR #9).

**Action before M5 implementation:** Review PR #10 scope on `main` so M5 work does not conflate model-candidate documentation with workflow hardening.

---

## Milestone 5 proposed scope — Legacy fallback removal / workflow hardening

**Theme:** Remove duplicate or drifting paths only after tests prove parity.

### Starting questions (decide before coding)

1. **Canonical Lighthouse entry path**
   - Old: `POST /tasks/run` + `lighthouse-handoff` tool (orchestrated tool handler)
   - Track: `POST /tracks/run` with `track_id`
   - New: `POST /workflows/run` with `workflow_id: lighthouse_handoff`

   Confirm which path(s) remain supported long-term and which becomes the **recommended** client entry.

2. **Legacy step-input fallbacks**
   - `buildLegacyToolStepInput()` / `buildLegacyModelStepInput()` in `companion/pit-crew/step-input.js`
   - Both catalog tracks already declare `input_map` on every step
   - Remove only after unit + smoke + workflow run parity is demonstrated

3. **Executor drift**
   - `run-plan-executor.js` mirrors pit-crew `orchestrator.js` step loop (including `write_handoff` markdown handling)
   - Hardening may consolidate shared execution or document intentional duplication — decide before deleting fallbacks

### Proposed work order (when M5 starts)

| Step | Action |
|---|---|
| 1 | Document canonical workflow vs track vs tool paths in architecture docs |
| 2 | Add parity checks: same Lighthouse input through `/workflows/run`, `/tracks/run`, and tool orchestrated path — **started:** `scripts/lighthouse-handoff-parity-test.js` covers validation-console core sequence vs `buildRunPlan`/`executeRunPlan` on `slim-mobile.fixture.json` (no Ollama/PageSpeed) |
| 3 | Remove legacy `step-input.js` fallbacks when parity tests pass |
| 4 | Improve workflow-orchestrator audit summaries (can be same milestone or follow-on) |
| 5 | Re-run **55/55** smoke + orchestration unit tests on clean server |

### Explicitly out of scope for Milestone 5 (unless renamed M5A)

- Model Swap Manager implementation
- Model Garage routing / swapping
- NearbyNode routing
- DAG runner / LLM-generated plans

---

## Gate to start implementation

M5 code work has started with parity characterization (see step 2 above). Remaining gates before fallback removal:

- [ ] PR #10 `ai-models/` changes on `main` are reviewed
- [ ] Canonical Lighthouse entry path decision is recorded (decision log or this doc updated)
- [x] Parity test strategy agreed — fixed fixture `examples/lighthouse-handoff/slim-mobile.fixture.json`; legacy console core vs workflow executor; behavioral parity (not exact prose)

Before removing `step-input.js` fallbacks, extend parity coverage to `POST /tracks/run` and record canonical path decision.
