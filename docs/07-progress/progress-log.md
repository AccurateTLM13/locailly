# Progress Log

Dated record of meaningful build and planning sessions.

---

## 2026-06-14 — Track System Direction Clarified

### Changed

- Reframed Local Brain as dispatching **tracks**, not models.
- Identified Lighthouse Handoff as first official proof workflow track.
- Added `docs/02-track-system/` (registry, core tracks, workflow registry, step input mapping gap, graph planning).
- Added `docs/07-progress/` (build status, sprint, agent brief, milestone map).
- Added `docs/00-start-here/current-state.md` as blunt status anchor.
- Reorganized docs: `03-workflows`, `04-validation`, `05-product`, `08-agents`, research → archive.

### Why

Current implementation is already pipeline-stage orchestration (`POST /tracks/run`, pit-crew runner). The project needs explicit track docs before adding more workflows or agents invent conflicting architecture.

### Evidence

- `POST /tracks/run` exists in `companion/server.js`
- `companion/pit-crew/tracks/lighthouse-handoff.track.json` exists
- `companion/pit-crew/orchestrator.js` runs linear steps
- Hardcoded step mapping in `companion/pit-crew/tool-router.js`

### Next

- Implement declarative `input_map` per [../02-track-system/step-input-mapping.md](../02-track-system/step-input-mapping.md)
- Keep Lighthouse Handoff compatibility through migration

---

## 2026-06-13 — L2 Live Ollama + Memory Bridge

See [../06-decisions/decision-log.md](../06-decisions/decision-log.md) and [../04-validation/l2-live-ollama-memory-bridge.md](../04-validation/l2-live-ollama-memory-bridge.md).

---

## Template for Future Entries

```md
## YYYY-MM-DD — Short title

### Changed
- ...

### Why
- ...

### Evidence
- ...

### Next
- ...
```
