# Lemonteed PageSpeed Fixture — Lighthouse Handoff Model Comparison

**Generated:** 2026-06-14  
**Updated:** 2026-06-14 (post-deterministic audit truth)  
**Benchmark source:** `ai-models/benchmark-results/lighthouse-handoff/benchmark-lemonteed-fixture-2026-06-14T21-21-38-326Z.json`  
**Prior benchmark (model-noise baseline):** `ai-models/benchmark-results/lighthouse-handoff/benchmark-lemonteed-fixture-2026-06-14T21-06-48-132Z.json`  
**Fixture:** `examples/lighthouse-handoff/lemonteed-pagespeed-raw.fixture.json`  
**URL:** https://lemonteed.com/  
**Mode:** `l2_ollama_memory`  
**Compose step:** All runs used `actualComposeModel: deterministic` (model output feeds prioritize only; classify/validate/summary are deterministic).

All five models ran against the **same PageSpeed raw fixture**. All five post-deterministic runs were **benchmark-valid** (`benchmarkValid: true`, `schemaValid: true`, `weakestCategory: performance`, `weakestScore: 77`).

---

## Post-deterministic audit truth (2026-06-14)

After implementing deterministic audit mapping, priority validation, and executive summary template:

| Check | Result |
|---|---|
| `classify_issues` source | `deterministic-audit-mapping` (tool step, not model) |
| Top shared priority | **Reduce unused JavaScript** (`unused-javascript`, score 0, 450 ms savings) |
| Passing audits in Priority Fixes | **None** (e.g. network payloads, main-thread, duplicated JS blocked) |
| Hallucinated “Unused images” in Priority Fixes | **Blocked** (routed to Needs Review when model suggests it) |
| Executive Summary | Clean deterministic template; no opportunity/diagnostic count dump |
| Fastest model | **LFM2.5-1.2B-Instruct** at 1,315 ms |

**Remaining model noise:** `priority_helper` models may still suggest unsupported or passing audits; these appear in **Needs Review**, not Priority Fixes. Wording in `modelReason` still varies by model.

**Updated speed ranking (post-deterministic):** 1.2B Instruct (1.3s) → 350M (2.8s) → llama3.2 (6.8s fresh run) → 1.2B Thinking (8.3s) → 8B (24.5s)

---

## 1. Executive verdict

| LocAIly worker role | Recommended model | Rationale |
|---|---|---|
| **fast_worker** | `hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF` | Fastest run (4.6s), schema-valid, readable handoff. Classification still noisy — pair with deterministic audit mapping. |
| **classification_worker** | **Deterministic audit mapping** (not a model) | Every model mislabeled at least 2–4 audits. `LFM2.5-8B-A1B` is the least bad model fallback if a model must classify. |
| **priority_helper** | `hf.co/LiquidAI/LFM2.5-350M-GGUF` | Only model that ranked **Reduce unused JavaScript** in the top 3 and down-ranked passing audits (network payload, main-thread). |
| **reasoning_worker** | `hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF` **only when latency is acceptable** | Best summary prose and fix reasons, but 4× slower than 1.2B Instruct with no clear priority-order win. |
| **summary_worker** | Deterministic template + optional `LFM2.5-8B-A1B` polish | 8B produced the clearest executive narrative; smaller models dump metrics or hallucinate. Prefer a fixed template fed by parsed fixture data. |
| **fallback_worker** | `hf.co/LiquidAI/LFM2.5-350M-GGUF` | Small, fast enough, and conservatively ranked passing audits lower than other models. |

**Headline:** Pass/fail is identical across models; **practical usefulness diverges sharply**. No model should be the source of truth for category or severity — use fixture-backed deterministic mapping and let models handle wording, ordering hints, and developer-facing explanation.

---

## 2. Benchmark table

| Model | Status | Duration | Speed rank | Schema valid | Benchmark valid | Model mismatch | Memory used | Weakest score preserved |
|---|---|---:|---:|---|---|---|---|---|
| `hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF` | success | 4,633 ms | **1** | yes | yes | no | yes | performance @ 77 |
| `hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF` | success | 5,780 ms | **2** | yes | yes | no | yes | performance @ 77 |
| `hf.co/LiquidAI/LFM2.5-350M-GGUF` | success | 10,447 ms | **3** | yes | yes | no | yes | performance @ 77 |
| `llama3.2` | success | 11,649 ms | **4** | yes | yes | no | yes | performance @ 77 |
| `hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF` | success | 18,394 ms | **5** | yes | yes | no | yes | performance @ 77 |

Relative speed (vs slowest 8B): 1.2B Instruct **3.97× faster**, 1.2B Thinking **3.18×**, 350M **1.76×**, llama3.2 **1.58×**.

---

## 3. Output quality table

Scores are 1–10 based on bundle outputs vs fixture ground truth. Higher is better.

| Model | Priority usefulness | Summary clarity | Audit / category accuracy | Handoff readability | Guardrail friendliness | Noise / hallucination control | LocAIly fit | **Quality total** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF` | 6 | 8 | 6 | 8 | 7 | 5 | 6 | **46** |
| `hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF` | 5 | 5 | 5 | 7 | 6 | 5 | **7** | **40** |
| `hf.co/LiquidAI/LFM2.5-350M-GGUF` | **7** | 4 | 2 | 5 | 4 | 4 | 4 | **30** |
| `llama3.2` | 4 | 6 | 3 | 6 | 5 | 4 | 5 | **33** |
| `hf.co/LiquidAI/LFM2.5-1.2B-Thinking-GGUF` | 3 | 7 | 4 | 7 | 6 | 3 | 5 | **35** |

**Quality rank:** 8B → 1.2B Instruct → 1.2B Thinking → llama3.2 → 350M (350M ranks higher on priority usefulness alone; classification noise pulls its overall fit down).

**Value rank (quality per second):** 1.2B Instruct → 1.2B Thinking → 350M → llama3.2 → 8B.

---

## 4. Priority fix comparison

### Top 3 priority fixes per model

| Model | #1 | #2 | #3 |
|---|---|---|---|
| **llama3.2** | Avoids enormous network payloads (high) | Duplicated JavaScript (high) | Image width/height (high) |
| **LFM2.5-350M** | Avoids enormous network payloads (low) | Reduce unused JavaScript (medium) | Minimizes main-thread work (low) |
| **LFM2.5-1.2B-Instruct** | Avoids enormous network payloads (high) | Minimizes main-thread work (high) | Set explicit width/height on images (medium) |
| **LFM2.5-1.2B-Thinking** | Avoids enormous network payloads (high) | **Unused images** (high) | *(only 2 fixes returned)* |
| **LFM2.5-8B-A1B** | Avoids enormous network payloads (high) | Minimizes main-thread work (high) | Reduces unused JavaScript (medium) |

### Fixture ground truth (highest-impact real opportunities)

From `examples/lighthouse-handoff/lemonteed-pagespeed-raw.fixture.json`:

| Audit | Fixture score | Savings | Correct category |
|---|---:|---|---|
| **Reduce unused JavaScript** | 0 | 450 ms, 64 KiB | performance |
| Minify CSS | 0.5 | 3 KiB | performance |
| Image width/height | 0.5 | — | performance (CLS) |
| Improve image delivery | 0 | — | performance |
| Render-blocking requests | 0 | — | performance |

**Passing audits (score 1) that models still treated as major fixes:**

| Audit | Fixture score | Model noise |
|---|---:|---|
| Avoids enormous network payloads | 1 (828 KiB, but passing) | All models except 350M ranked it #1 or high |
| Minimizes main-thread work | 1 | Instruct, 8B ranked high |
| JavaScript execution time | 1 | llama3.2 classified high |
| Initial server response time was short | 1 | Several models listed as an issue |
| Duplicated JavaScript | 1 | llama3.2 ranked #2 high |
| Reduce unused CSS | 1 | Multiple models flagged medium |

### Comparison notes

| Question | Answer |
|---|---|
| **Which fixes matched actual fixture opportunities?** | **350M** and **8B** included **Reduce unused JavaScript** (the only audit with measurable ms savings). **Instruct** and **Thinking** omitted it from priority fixes. **llama3.2** listed unsized images (score 0.5) but missed unused JS entirely. |
| **Which fixes were phrased well?** | **8B** — clearest developer-facing reasons without claiming guaranteed score gains. **350M** — reasonable caution on passing audits. |
| **Which fixes were too generic?** | All models share the same deterministic checklist (“Audit render-blocking…”, “Optimize images…”, “Reduce main-thread…”) regardless of fixture-specific opportunities. |
| **Which fixes were unsupported or suspicious?** | **1.2B Thinking** invented **“Unused images”** (no matching fixture audit). **350M** invented **“Keep the server response time short”** as SEO/high. **llama3.2** claimed missing image dimensions “break performance features like screen readers.” |
| **Best developer-useful order?** | **350M** — only ranking that elevates unused JS above passing network-payload noise. **8B** second — includes unused JS with solid reasoning, but still leads with two passing audits. |

---

## 5. Classification accuracy check

Fixture category scores: **performance 77**, accessibility **100**, best practices **100**, SEO **100**.

### Model noise by model (not pipeline failures)

#### llama3.2
- Reduce unused JavaScript → `bestPractices` / low (should be **performance**, high).
- Minimizes main-thread work → `bestPractices` / medium (should be **performance**; audit score 1).
- Reduce unused CSS → `bestPractices` / medium (should be **performance**; audit score 1).
- Image width/height → `accessibility` / high (fixture is a performance/CLS opportunity).
- JavaScript execution time → performance / **high** (audit **passes** with score 1).
- Initial server response time was short → listed as issue (audit **passes** — title describes success).

#### LFM2.5-350M
- Minimizes main-thread work → `accessibility` (wrong category).
- **Keep the server response time short** → `seo` / high — **title not in fixture** (fixture audit is “Initial server response time was short”, score 1).
- Duplicated JavaScript → `bestPractices` / high (audit score 1).
- Duplicate image entries split across accessibility and SEO.

#### LFM2.5-1.2B-Instruct
- Reduce unused JavaScript → `bestPractices` (should be performance).
- Reduce unused CSS → `bestPractices` (audit score 1).
- Remove duplicated JavaScript modules → `bestPractices` (audit score 1).
- Minimizes main-thread work → performance / **high** (audit score 1).

#### LFM2.5-1.2B-Thinking
- **Unused images** → performance / high — **hallucinated audit**.
- JavaScript execution time → `bestPractices` (should be performance; score 1).
- Duplicated JavaScript → `bestPractices` / low (score 1).
- Reduce unused CSS → `bestPractices` (score 1).

#### LFM2.5-8B-A1B
- Best overall classification — unused JS correctly `performance`.
- Still marks passing audits high: network payloads, main-thread work, JS execution time.
- Reduce unused CSS → `bestPractices` (should be performance).
- Image width/height → `accessibility` (minor; primarily performance).

**Pattern:** Models consistently treat audit **titles** as failing items without reading fixture **scores**. Deterministic `audit id → category → severity from score/savings` would eliminate most of this noise.

---

## 6. Summary quality check

### Executive summary text (developerSummary)

| Model | Summary excerpt | Flags |
|---|---|---|
| **llama3.2** | “Weakest… performance (77)… Top 3 fix areas: main-thread, unused JS, image dimensions for accessibility” | Does not state other categories scored 100. Lists unused JS in summary body but **excluded** from priority fixes. Conflates image sizing with accessibility. |
| **350M** | “…performance at 77, while accessibility at 100, best practices at 100, seo at 100, **opportunity count at 8, diagnostic count at 6**…” | **Metric dumping.** Confuses main-thread with server response. Awkward “while X at 100” phrasing. |
| **1.2B Instruct** | “…performance at 77, while accessibility at 100… **The key issues affecting performance and best practices need urgent attention**” | Mentions 100s but adds **generic filler** and false urgency. Does not name concrete fixture opportunities. |
| **1.2B Thinking** | “…performance at 77. Highest-priority work… **Avoids enormous network payloads and Unused images**…” | Good narrative shape. **Unsupported claim** (Unused images). Does not mention other 100 scores. |
| **8B** | “…performance at 77, while accessibility at 100… **several performance issues**. Top critical priorities are network payloads and main-thread… Unused JavaScript… medium” | **Best overall** — mentions all scores, names themes. Still overweights passing audits; no guaranteed-improvement language (good). |

### Preferred summary shape (target)

> For https://lemonteed.com/, the weakest Lighthouse category is performance at 77. Accessibility, best practices, and SEO all scored 100. The highest-priority work is reducing page weight and JavaScript/CSS execution impact, based on the fixture’s measured opportunities.

**Closest match:** 8B (partial). None of the models fully hit the target without also elevating passing audits or omitting unused JavaScript as the lead fix.

---

## 7. Speed / value conclusion

| Model | Duration | Quality total | Quality / sec | Verdict |
|---|---:|---:|---:|---|
| 1.2B Instruct | 4.6 s | 40 | **8.6** | **Best value** — near-best readability at lowest latency. |
| 1.2B Thinking | 5.8 s | 35 | 6.0 | Fast narrative, undermined by hallucinated priority fix. |
| 350M | 10.4 s | 30 | 2.9 | Best priority ranking, worst classification. |
| llama3.2 | 11.6 s | 33 | 2.8 | Mid-tier on both axes; no clear advantage over Liquid 1.2B. |
| 8B A1B | 18.4 s | 46 | 2.5 | **Best quality**, **worst speed** — quality gain does not justify 4× latency for this fixture. |

**Bigger is not better here.** The 8B model produced richer prose and slightly better classification, but every model still prioritized passing audits and missed or under-ranked the fixture’s strongest measured opportunity (unused JavaScript, 450 ms). The 1.2B Instruct model delivers ~87% of the quality at ~25% of the runtime.

---

## 8. Recommended routing decision

```
Use hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF as fast_worker.
Use deterministic audit id → category/severity mapping as classification_worker (not a model).
Use hf.co/LiquidAI/LFM2.5-350M-GGUF as priority_helper (best fixture-aligned ordering on this run).
Use hf.co/LiquidAI/LFM2.5-8B-A1B-GGUF as reasoning_worker only when quality justifies ~18s analyze latency.
Use deterministic compose + template for summary_worker; optional 8B polish for prose.
Use hf.co/LiquidAI/LFM2.5-350M-GGUF as fallback_worker when 1.2B Instruct is unavailable.

Use deterministic audit mapping as source of truth for category and severity.
Use model output only for explanation, ordering hints, and handoff wording.
Validate priority fix titles against parsed fixture audit ids before surfacing to developers.
```

---

## 9. Next engineering improvements

1. **Deterministic audit id → category mapping** — Map `unused-javascript`, `unminified-css`, `unsized-images`, etc. to Lighthouse categories from fixture metadata; never let models invent categories.

2. **Deterministic severity from audit score / savings** — Score 1 audits cannot be high severity; use `overallSavingsMs` / `overallSavingsBytes` for ordering. “Initial server response time was short” at score 1 should be excluded.

3. **Priority fix source validation** — Reject or downgrade priority items whose audit id is missing from the slim input or whose fixture score is 1. Would have blocked “Unused images” and demoted “Avoids enormous network payloads.”

4. **Cleaner Executive Summary template** — Fill a fixed template from `lighthouse.parse` output (scores, weakest category, top 3 opportunities by savings). Models may only refine wording, not invent metrics.

5. **Model scorecard registry updates** — Persist this comparison into `ai-models/registry.models.json` suitability profiles with fixture-specific evidence links.

6. **Bundle comparison viewer in console UI** — Side-by-side diff of `classifiedIssues`, `priorityFixes`, and `developerSummary` across runs (optional sixth item).

---

## Appendix: per-model run details

| Field | llama3.2 | 350M | 1.2B Instruct | 1.2B Thinking | 8B A1B |
|---|---|---|---|---|---|
| Bundle | `…11fe11a4ce-llama3-2…` | `…0a29f4a0cf-liquidai-lfm2-5-350m…` | `…dabc5464fd-liquidai-lfm2-5-1-2b-instruct…` | `…9d82d86ebe-liquidai-lfm2-5-1-2b-thinking…` | `…f23e70b516-liquidai-lfm2-5-8b-a1b…` |
| classify step | 7,177 ms | 9,217 ms | 3,305 ms | 4,378 ms | 13,363 ms |
| prioritize step | 4,040 ms | 869 ms | 967 ms | 983 ms | 4,601 ms |
| clientSummary | “Handoff for … performance at 77.” | same | same | same | same |
| fallbacks_used | none | none | none | none | none |
| warnings | none | none | none | none | none |

All models: `actualComposeModel: deterministic`, `orchestration_steps`: extract_metrics → classify_issues → prioritize_fixes → match_fixes → write_handoff → verify_output.
