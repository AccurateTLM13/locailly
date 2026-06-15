# Future DAG Runner

**Status: Research — not implemented. Do not build against this doc without a milestone decision.**

## Purpose

Capture the long-term direction for graph-based track execution without mixing it into current architecture docs.

## Vision

A future **DAG runner** would:

1. Accept a track graph (nodes = steps, edges = dependencies)
2. Resolve `$input` / `$artifacts` references at schedule time
3. Execute independent nodes in parallel where safe
4. Apply validation gates on edges (fail branch vs retry branch)
5. Optionally be **generated** by a planning track from a user request

## Prerequisites Before Building

- [ ] Declarative step input mapping in track files
- [ ] At least two workflow tracks using the same core track patterns
- [ ] Model Garage / scorecard evidence for role routing
- [ ] Validation harness that scores tracks, not just smoke pass/fail
- [ ] Explicit decision in [../06-decisions/decision-log.md](../06-decisions/decision-log.md)

## Non-Goals for v1 DAG

- Cloud offload nodes
- Arbitrary code execution in graph nodes
- Self-modifying graphs mid-run without audit trail

## Related

- [track-graph-planning.md](./track-graph-planning.md)
- [../99-archive/research-notes/](../99-archive/research-notes/) — model and hardware research only
