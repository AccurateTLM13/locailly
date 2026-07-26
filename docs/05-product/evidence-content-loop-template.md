# Evidence → Content Loop Template

> Use this template to convert a Locaily run or benchmark result into discoverable content.

## Pipeline

```
Track Run Record / Benchmark Result
  → Short Report (internal evidence)
    → Lesson (what worked, what failed)
      → Searchable Page (intent-driven docs page)
        → Social / Community Post (link back to page)
          → New users → more runs → more evidence
```

## Template: Short Report

```markdown
# [Model/Workflow] — [Task] — [Date]

## Setup
- Model: [model name + quantization]
- Track: [track ID]
- Runtime: [Ollama / mock / hybrid]

## Result
- Status: [PASS / FAIL / PARTIAL]
- Score: [score]
- Evidence link: `[path to track run record]`

## What Worked
- [bullet points]

## What Failed
- [bullet points]

## Lesson
[One paragraph explaining the actionable takeaway.]
```

## Template: Searchable Page

```markdown
# [Intent-Driven Title]

> **What:** [One-sentence description]
> **Try it:** [Link to runnable example]

## Problem
[What the user is trying to do.]

## Solution with Locaily
[How Locaily's approach differs and solves it.]

## Evidence
[Link to short report, Track Run Record, or test result.]

## Next Steps
[Actionable next step for the reader.]
```

## Template: Social Post

```markdown
[Outcome] with [model] on [task]

- Score: [score]
- What worked: [1-2 sentences]
- What failed: [1-2 sentences]

Full evidence: [link]

#LocalAI #Locaily #[relevant-tag]
```

## Quality Gates

Before publishing any content from this loop:
1. Does the evidence exist as a stored Track Run Record or test result?
2. Does the claim match the evidence scope? (no broadening)
3. Is there a runnable example the reader can try?
4. Does the content link to the evidence path?
