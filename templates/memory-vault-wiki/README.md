# Wiki-Style Memory Vault (Second Brain Compatible)

Generic **wiki/** layout for testing and documenting Second Brain / Obsidian-style vault configuration. Contains no private content.

## Layout

```txt
index.md
log.md
SCHEMA.md
wiki/projects/
wiki/topics/
wiki/concepts/
wiki/entities/
raw/                    ← blocked (not included in template)
.memory-bridge/
```

## Locaily config

```json
"memoryBridge": {
  "enabled": true,
  "vaultPath": "C:/path/to/templates/memory-vault-wiki",
  "allowedPaths": [
    "index.md",
    "log.md",
    "SCHEMA.md",
    "wiki/projects/",
    "wiki/topics/",
    "wiki/concepts/",
    "wiki/entities/"
  ],
  "blockedPaths": [
    "raw/",
    "private/",
    "personal/",
    ".git/",
    ".memory-bridge/writeback-inbox/"
  ]
}
```

Copy this folder to a private location before adding real notes.

## Related

- [../memory-vault/README.md](../memory-vault/README.md) — flat starter template
- [../../docs/01-architecture/memory-bridge.md](../../docs/01-architecture/memory-bridge.md)
