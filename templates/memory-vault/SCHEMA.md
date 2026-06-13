# Memory Vault Schema

Operating rules for a Locaily-compatible local Markdown vault.

## Layers

| Layer | Purpose | Bridge access |
|-------|---------|---------------|
| `index.md` | Navigation map | Read (allowlisted) |
| `log.md` | Activity history | Read (allowlisted) |
| `projects/` or `wiki/projects/` | Project state | Read (allowlisted) |
| `topics/` or `wiki/topics/` | Cross-cutting knowledge | Read (allowlisted) |
| `wiki/concepts/`, `wiki/entities/` | Second Brain synthesis | Read when allowlisted |
| `raw/` | Immutable sources | **Blocked** — never edited |
| `.memory-bridge/writeback-inbox/` | Review queue | Write (proposals only) |

## Layout Options

### Flat (this starter template)

```txt
projects/Example Project.md
topics/Example Topic.md
```

Default `allowedPaths`: `index.md`, `log.md`, `SCHEMA.md`, `projects/`, `topics/`

### Wiki (Second Brain / Obsidian-style)

```txt
wiki/projects/LocAIly.md
wiki/topics/Capability Registry.md
wiki/concepts/Some Concept.md
wiki/entities/Some Entity.md
raw/...   ← never exposed
```

Enable via config — see `.memory-bridge/allowlist.example.json`.

## Page Conventions

Use clear headings so Context Packs can extract structure:

```md
## Current state
## Decisions
## Constraints
## Open questions
## Lessons
```

## Writeback Rules

1. Locaily writes **only** proposal files to `.memory-bridge/writeback-inbox/`.
2. Humans review and edit wiki pages manually.
3. Never edit `raw/` through the bridge.
4. `requiresHumanReview` must be true for all v0 proposals.

## Path Policy

- `allowedPaths` — prefixes Locaily may read
- `blockedPaths` — always win over allowed paths
- Only `.md` files are read in v0
