# Evidence Log

Chronological index of validation milestones. Detail lives in linked docs — this is the dashboard.

| Date | Claim | Evidence | Status |
|---|---|---|---|
| 2026-06-15 | M3 model-step `input_map` (51/51 smoke) | [../07-progress/progress-log.md](../07-progress/progress-log.md) | Passed |
| 2026-06-15 | M2 DealSniper track (`marketplace.dealsniper`) | [../03-workflows/dealsniper.md](../03-workflows/dealsniper.md) | Passed (mock track run) |
| 2026-06-13 | L1 smoke + contract (51/51 current suite; was 48/48 pre–DealSniper track checks) | [../03-workflows/lighthouse-handoff-validation.md](../03-workflows/lighthouse-handoff-validation.md) | Passed |
| 2026-06-13 | Memory Bridge + Lighthouse compose (controlled vault) | [memory-bridge-lighthouse-v0.md](./memory-bridge-lighthouse-v0.md) | Passed (local) |
| 2026-06-13 | L2 live Ollama + Memory Bridge | [l2-live-ollama-memory-bridge.md](./l2-live-ollama-memory-bridge.md) | Passed (documented run) |
| — | L3 extension standalone | External extension repo | Open |
| — | L4 extension ↔ Local Brain | [../03-workflows/lighthouse-handoff-extension-integration.md](../03-workflows/lighthouse-handoff-extension-integration.md) | Not implemented |
| — | DAG / track classifier | — | Not built |

Add a row when new evidence lands. Remove "Passed" if regressions break smoke tests.
