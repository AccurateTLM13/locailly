# Step Input Mapping

How track steps receive input from the original request and prior step artifacts.

## Current Implementation

Step input mapping is **hardcoded by step id** in `companion/pit-crew/tool-router.js`:

```javascript
function buildStepInput(step, context) {
  // branches on step.id === "extract_metrics", "classify_issues", etc.
}
```

The model router uses similar context access patterns for model-backed steps.

### Lighthouse Step IDs With Custom Mapping

| Step ID | Input source |
|---|---|
| `extract_metrics` | Full original `context.input` |
| `classify_issues` | `input.opportunities` |
| `validate_priority_fixes` | opportunities + `artifacts.prioritize_fixes` |
| `match_fixes` | `artifacts.classify_issues` + `artifacts.validate_priority_fixes` |
| `write_handoff` | URL, metrics, classifications, priorities, matches, opportunities |
| `verify_output` | `artifacts.write_handoff` |

Any step id not listed falls through to `return input` (full original input).

## Problem

This does **not** scale to more workflows:

- Every new track requires editing shared router code
- Step ids are global strings — collision risk across tracks
- Mapping logic is invisible in track JSON files
- Agents reading track files cannot see data flow without reading router source

## Target

Track files should declare how each step receives input from `$input` and `$artifacts`:

```json
{
  "id": "write_handoff",
  "input_map": {
    "url": "$input.url",
    "metrics": "$artifacts.extract_metrics",
    "classifiedIssues": "$artifacts.classify_issues",
    "prioritizedFixes": "$artifacts.validate_priority_fixes",
    "matchedFixes": "$artifacts.match_fixes",
    "opportunities": "$input.opportunities"
  },
  "executor": {
    "type": "tool",
    "tool": "lighthouse-handoff",
    "task": "compose-handoff"
  }
}
```

Resolver rules (target behavior):

- `$input.*` — fields from the track run request input
- `$artifacts.<step_id>` — full output object from a prior step
- `$artifacts.<step_id>.<path>` — nested field (optional v2)

## Transition Plan

| Phase | Action |
|---|---|
| **Now** | Document hardcoded mapping (this file); do not add new step ids to router without tracking debt |
| **Next** | Add optional `input_map` to track JSON schema; resolver in tool-router reads map when present |
| **Next** | Migrate `website_audit.lighthouse_handoff` to declarative maps |
| **Later** | Remove Lighthouse-specific branches from router once all tracks use maps |

## Do Not

- Claim declarative `input_map` is implemented — it is the target shape only
- Add DealSniper or other workflows by extending the `if (step.id === ...)` chain without a plan to migrate

## Related

- [track-definition-schema.md](./track-definition-schema.md)
- [../07-progress/current-sprint.md](../07-progress/current-sprint.md)
- Code: `companion/pit-crew/tool-router.js`
