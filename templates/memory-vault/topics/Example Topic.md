# Example Topic

Sample topic page for cross-cutting knowledge.

## Summary

The Memory Bridge connects Locaily to a user-owned local Markdown vault without merging repositories.

## Constraints

- `blockedPaths` always override `allowedPaths`.
- `raw/` is never read or edited by the bridge.

## Decisions

- System improves through memory and reviewable writeback, not model weight changes.

## Open questions

- Should full file content ever be opt-in in a future Context Pack flag?

## Related

- [[projects/Example Project]]
