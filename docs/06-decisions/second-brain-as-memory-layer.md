# Second Brain as Memory Layer

## Decision

**Second Brain** (private user vault) is the long-term **memory layer**. **Locaily** (public repo) is the **runtime layer**. They connect through the **Memory Bridge** — not repo merge, not shared content in the public tree.

## Why

- Second Brain may contain personal and project-private information.
- Locaily must remain open-source without shipping private memory.
- Users should point Locaily at **their own** local vault path.
- System improvement comes from memory, context, routing, validation, and reviewable writeback — not from claiming models learn new weights.

## Architecture

```txt
Second Brain (private)     Locaily (public)
├─ raw/ (immutable)        ├─ companion/memory/* (bridge code)
├─ wiki/ or projects/      ├─ templates/memory-vault/ (starter only)
├─ index.md, log.md        ├─ schemas + docs
└─ .memory-bridge/         └─ HTTP memory endpoints
         │                           │
         └─────── local path ────────┘
```

## Rules

| Rule | Detail |
|------|--------|
| No repo merge | Keep separate git repos |
| No private content in Locaily | Only generic starter template |
| Read policy | Allowlist + blocked paths; **blocked always wins** |
| Raw sources | Never edited by bridge |
| Context packs | Summaries/excerpts by default; not full file dumps |
| Writeback | Proposal-only to inbox in v0 |
| No auto-apply | `/memory/writeback/apply` deferred |
| Workflow wiring | One proof workflow after v0 (likely Lighthouse Handoff) |

## Vault Layouts

- **Public starter template:** flat `projects/`, `topics/`
- **Second Brain / Obsidian-style:** enable `wiki/projects/`, `wiki/topics/`, `wiki/concepts/`, `wiki/entities/` via config

## Status

Confirmed — Memory Bridge v0 implementation in progress

## Notes

- Alignment source: [LocAIly_ and_Second Brain_Alignment_and_Connection.md](../LocAIly_%20and_Second%20Brain_Alignment_and_Connection.md)
- Implementation: [memory-bridge.md](../01-architecture/memory-bridge.md)
