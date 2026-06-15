# Blockers

Active impediments. Remove items when resolved; log resolution in [progress-log.md](./progress-log.md).

**Updated:** 2026-06-14

## Open

| Blocker | Impact | Mitigation |
|---|---|---|
| Step input mapping hardcoded for Lighthouse | Blocks clean second workflow track | M2: declarative `input_map` — see [../02-track-system/step-input-mapping.md](../02-track-system/step-input-mapping.md) |
| Extension ↔ Local Brain HTTP bridge not implemented | L4 validation blocked | Spec: [../03-workflows/lighthouse-handoff-extension-integration.md](../03-workflows/lighthouse-handoff-extension-integration.md) |
| No persistent job status API | Clients cannot poll long track runs | Future `GET /jobs/{id}/status` — in-memory jobs exist today |

## Resolved Recently

| Blocker | Resolution |
|---|---|
| Pit Crew embedded only in lighthouse tool | Extracted to `companion/pit-crew/` — see gap analysis |
| No `/tracks/run` endpoint | Implemented — proof track on mock provider |

## Not Blockers (Explicitly Deferred)

- DAG runner
- NearbyNode protocol
- Track classifier
- Desktop Companion UI
