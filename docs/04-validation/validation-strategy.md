# Validation Strategy

Locaily validates **tracks** and **workflows**, not the whole product in one vague claim.

## Principles

1. **Evidence over narrative** — record pass/fail with fixture, provider, and date
2. **Tiered validation** — L1 automated → L2 live runtime → L3 client → L4 integration
3. **No benchmark marketing** — do not claim model wins without logged runs in this folder
4. **Per-workflow docs** — each workflow links its validation record

## Tiers

| Tier | Scope | Typical evidence |
|---|---|---|
| L1 | Local Brain contract + smoke | `scripts/smoke-test.js`, workflow validation md |
| L2 | Live Ollama / hardware | [l2-live-ollama-memory-bridge.md](./l2-live-ollama-memory-bridge.md) |
| L3 | Standalone client | External repos (e.g. Chrome extension) |
| L4 | Client ↔ Local Brain HTTP | Not implemented for Lighthouse extension bridge |

## Good vs Bad Claims

**Good:**

```txt
website_audit.lighthouse_handoff and marketplace.dealsniper pass smoke on mock provider (**51/51** suite on clean server).
L2 Ollama Memory Bridge passed on lemonteed fixture (2026-06-13).
```

**Bad:**

```txt
LocAIly works.
Small models beat GPT-4 on all tasks.
```

## Where To Log Evidence

- Workflow-specific: [../03-workflows/*-validation.md](../03-workflows/)
- Cross-cutting milestones: this folder
- Session notes: [../07-progress/progress-log.md](../07-progress/progress-log.md)
- Index: [evidence-log.md](./evidence-log.md)

## Related

- [README.md](./README.md)
- [../03-workflows/validation-template.md](../03-workflows/validation-template.md)
