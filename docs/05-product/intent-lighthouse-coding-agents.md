# Lighthouse for Coding Agents

> **What:** Turn PageSpeed/Lighthouse data into structured developer handoff notes that coding agents can act on — without leaving your local machine.
> **Try it:** Run the [built-in demo](/README.md#first-five-minutes) to see an example handoff.

## Problem

Lighthouse reports contain rich performance, accessibility, and SEO data, but the output is a JSON blob. Developers need actionable handoff notes — prioritized fixes, code-level guidance, and acceptance criteria — that coding agents can consume directly.

## Solution

Locaily's **Lighthouse Handoff** workflow transforms raw PageSpeed data into structured developer handoff notes through a multi-step pipeline:

1. **Extract** — parse the Lighthouse JSON into a slim input with scores, opportunities, and diagnostics
2. **Analyze** — classify each issue by severity and impact, produce developer-friendly explanations
3. **Prioritize** — rank fixes by effort vs. impact with clear acceptance criteria
4. **Assemble** — compose the final handoff document with executive summary, priority fixes, and technical notes

## Artifact Output

The workflow produces:
- **Markdown handoff** — human-readable developer notes
- **Track Run Record** — machine-readable evidence of every step, model used, and validation result
- **Exportable JSON bundle** — all artifacts packaged for CI or agent ingestion

## Using with Coding Agents

The exported artifact can be fed directly to coding agents (Cursor, Claude Code, OpenCode) as context for implementation work. The structured format includes:
- URL and scores
- Priority fixes with specific code-level recommendations
- Acceptance criteria for each fix
- Guardrails and testing checklist

## Related

- [Local AI Orchestration](./intent-local-ai-orchestration.md)
- [Ollama Workflow Automation](./intent-ollama-workflow-automation.md)
- [Lighthouse Handoff workflow](../03-workflows/lighthouse-handoff.md)
