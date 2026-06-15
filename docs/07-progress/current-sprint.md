# Current Sprint

**Updated:** 2026-06-14

## Goal

Make the track system explicit, documented, and ready for additional workflows.

## In Scope

- Create `docs/02-track-system/` (core tracks, registry, workflow registry, step input mapping gap)
- Create `docs/07-progress/` (build status, sprint, agent brief)
- Add `docs/00-start-here/current-state.md`
- Reorganize docs folders (workflows, validation, product, archive research)
- Align entry-point READMEs with source-of-truth order
- Document Lighthouse track as proof workflow without overstating DAG/classifier

## Out of Scope

- DAG runner implementation
- NearbyNode implementation
- Cloud providers
- New UI polish
- Runtime behavior changes

## Done When

- Docs reflect current architecture (pipeline-stage runner)
- An agent can read `current-state.md` + `next-agent-brief.md` and know what to build next
- No major vision docs contradict `current-state.md` or `build-status.md`
- Step input mapping debt is documented with a clear target

## Next Sprint Candidate

Implement declarative `input_map` in track JSON + resolver in tool-router; migrate Lighthouse track.
