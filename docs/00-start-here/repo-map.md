# Repo Map

Quick map of the `docs/` tree. For the full index see [project-index.md](./project-index.md).

```txt
docs/
├─ 00-start-here/     What Locaily is; current state; glossary
├─ 01-architecture/   Major system organs (Local Brain, API, memory, …)
├─ 02-track-system/   How work is broken down and dispatched (tracks, workflows)
├─ 03-workflows/      User-facing workflows (Lighthouse Handoff, …)
├─ 04-validation/     Evidence — validate tracks and workflows, not vibes
├─ 05-product/        UX, setup, packaging, roadmap
├─ 06-decisions/      Decision log and open questions
├─ 07-progress/       Build status, sprint, agent brief, progress log
├─ 08-agents/         Rules for coding, documentation, and evaluation agents
└─ 99-archive/        Superseded plans and research notes
```

## Code Map (Local Brain)

```txt
companion/
├─ server.js              HTTP API
├─ core/                  Input gate, permissions, audit, legacy orchestrator
├─ pit-crew/              Track runner, routers, tracks/*.track.json
├─ tools/                 Showcase tools + registry loader
├─ providers/             Ollama + mock
├─ memory/                Memory Bridge v0
└─ console/               Local validation UI (partial)

tool-packs/               Manifest-backed capability packs
scripts/                  smoke-test.js, contract-test.js
templates/memory-vault/   Public starter vault template
```

## Layer Mental Model

```txt
Locaily
├─ Local Brain        coordinator (companion server)
├─ Track system       units of work + step dispatch
├─ Workflows          composed user jobs (Lighthouse Handoff = proof)
├─ AI Pit Crew        model/tool/track strategy (implementation: pit-crew/)
├─ NearbyNode         nearby capability layer (not built)
└─ Memory Bridge      optional context/writeback layer (v0)
```

## What To Read For…

| Goal | Start here |
|---|---|
| Resume after time away | [current-state.md](./current-state.md) → [../07-progress/next-agent-brief.md](../07-progress/next-agent-brief.md) |
| Add a workflow | [../02-track-system/workflow-registry.md](../02-track-system/workflow-registry.md) → [../03-workflows/workflow-template.md](../03-workflows/workflow-template.md) |
| Change API | [../01-architecture/api-contract.md](../01-architecture/api-contract.md) |
| Prove something works | [../04-validation/README.md](../04-validation/README.md) |
| Avoid inventing DAG/NearbyNode | [../02-track-system/track-graph-planning.md](../02-track-system/track-graph-planning.md) |
