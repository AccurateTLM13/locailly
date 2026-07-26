# Ollama Workflow Automation with Locaily

> **What:** Turn a local Ollama model into a multi-step workflow with validation, evidence, and fallbacks — not just a chat endpoint.
> **Try it:** Run the [built-in demo](/README.md#first-five-minutes) — works without Ollama too.

## Problem

Ollama provides excellent local model hosting via `/api/chat`, but each call is stateless. There is no built-in mechanism for multi-step workflows, output validation, model routing, or evidence collection. Every integration reinvents the same pipeline.

## Solution

Locaily wraps Ollama in **The Crew** orchestration layer. A web audit workflow might use three different Ollama models:
- `llama3.2` for fast analysis and classification
- `lfm2.5-1.2b-thinking` for structured reasoning and priority ranking
- `llama3.2:latest` for composing the final handoff document

Each model runs on the same Ollama instance but serves a different role in the pipeline.

## Workflow Example: Lighthouse Handoff

1. **PageSpeed capture** — fetch or paste report data
2. **Analyze report** — Ollama `llama3.2` classifies issues and prioritizes fixes
3. **Model provenance** — verify the expected model ran
4. **Compose handoff** — deterministic Markdown assembly
5. **Schema validation** — check output against Lighthouse Handoff schema
6. **Metric preservation** — verify weakest score is in the output
7. **Privacy audit** — confirm no vault data leaked
8. **Save artifacts** — bundle everything for export

## Running Without Ollama

Every workflow has a deterministic fallback path. The demo runs entirely without Ollama, using built-in fixtures and tool-only execution. AI-enhanced steps are clearly labeled.

## Key Features

- **Role-based routing** — declare which model role handles each step
- **Qualification-aware** — only routes to models with proven capability
- **Deterministic fallback** — works when Ollama is unavailable
- **Track Run Records** — every execution produces inspectable evidence

## Related

- [Local AI Orchestration](./intent-local-ai-orchestration.md)
- [Lighthouse for Coding Agents](./intent-lighthouse-coding-agents.md)
- [API Reference](../05-integrations/api-reference.md)
