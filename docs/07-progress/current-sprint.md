# Current Sprint

**Updated:** 2026-06-16

## Goal

Close Milestone 4 documentation and capture Milestone 5 planning checkpoint. **No M5 implementation in this sprint.**

## Completed (recent)

- Milestone 4 merged: PR #9 → `main` (`c89db65`)
- Post-merge smoke on `main`: **55/55 PASS**
- Track-based orchestration layer shipped (`companion/orchestration/`, workflow APIs)
- Completion note + M5 checkpoint docs added

## In Scope (planning only)

- Review PR #10 `ai-models/` changes already on `main`
- Decide canonical Lighthouse entry path (tool vs track vs workflow) — see [milestone-5-checkpoint.md](./milestone-5-checkpoint.md)
- Record decision before any M5 code

## Out of Scope (this sprint)

- Milestone 5 implementation (legacy fallback removal, audit hardening)
- Model Swap Manager (`model-swap-manager.md` — local-only, separate track)
- Model swapping, NearbyNode, DAG runner

## Done When

- [x] Milestone 4 completion note published
- [x] Milestone 5 planning checkpoint published
- [ ] User approves M5 start gate (PR #10 review + canonical path decision)
