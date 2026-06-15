# Milestone Map

Layered planning — not a six-month prophecy.

**Updated:** 2026-06-14

## Milestone 1 — Track System Explicit (Now)

**Status:** In progress

- Document core tracks, track registry, workflow registry
- One proof track: `website_audit.lighthouse_handoff`
- Identify step input mapping as transition debt
- Validation evidence linked per workflow

**Exit criteria:** Agent brief + track docs match code; no false DAG/classifier claims.

---

## Milestone 2 — Declarative Step Input (Next)

**Status:** Not started

- `input_map` in track JSON
- Generic resolver in tool-router
- Lighthouse track migrated off hardcoded step ids
- Smoke tests unchanged or expanded

---

## Milestone 3 — Second Workflow Track (Next)

**Status:** Not started

- Choose workflow (DealSniper track or Repo Review stub)
- Prove two tracks share core track patterns without router forks

---

## Milestone 4 — Model Garage Evidence (Later)

**Status:** Spec only

- Evaluation harness using [../99-archive/research-notes/model-evaluation-template.md](../99-archive/research-notes/model-evaluation-template.md)
- Scoreboard baselines with logged runs
- No benchmark marketing without data

---

## Milestone 5 — Simple Dependency Graph (Later)

**Status:** Research gate

- Topological runner for explicit `depends_on` in track files
- Still no LLM-generated graphs

---

## Milestone 6 — NearbyNode (Future)

**Status:** Not built

- Capability connector protocol
- Device pairing — see [../01-architecture/nearby-node.md](../01-architecture/nearby-node.md)

---

## Milestone 7 — Planner-Generated DAG (Research)

**Status:** Archive-ready research

- See [../02-track-system/future-dag-runner.md](../02-track-system/future-dag-runner.md)
