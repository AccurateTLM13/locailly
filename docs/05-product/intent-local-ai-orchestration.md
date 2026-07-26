# Local AI Orchestration with Locaily

> **What:** Coordinate multiple small AI models, deterministic tools, and validators through one local service — no cloud API keys required.
> **Try it:** Run the [built-in demo](/README.md#first-five-minutes) in under 10 minutes.

## Problem

Most local AI setups route every task through one large model. This works for chat but fails for structured workflows: auditing a website, analyzing a codebase, or generating a report. You end up with a single slow model trying to do everything.

## Solution

Locaily decomposes work into **track contracts** — narrow, testable execution steps. Each step is routed to the **smallest qualified capability**: a tiny model for classification, a medium model for analysis, a deterministic tool for validation, or a rule for schema checking.

No step runs unvalidated. Every output passes through schema checks, metric preservation, and privacy audit before reaching the final artifact.

## How It Works

1. Define a track (inputs, steps, roles, validation rules)
2. Locaily resolves roles to qualified models at runtime
3. Steps execute in dependency order with optional parallelism
4. Each step output is validated before the next step starts
5. A complete evidence record is emitted for every run

## Run It

```powershell
git clone https://github.com/mnfrdrsh/locailly
cd locaily
.\scripts\start-locaily.ps1
```

Or manually:
```powershell
node companion\server.js
```

Open `http://127.0.0.1:31313/` and click **Run Example Workflow**.

## Key Capabilities

- **No cloud dependency** — everything runs locally
- **Multiple models** — route different steps to different qualified models
- **Deterministic fallbacks** — work without any AI runtime
- **Evidence records** — every run produces an inspectable Track Run Record
- **Human gates** — optional review before destructive actions

## Related

- [Ollama Workflow Automation](./intent-ollama-workflow-automation.md)
- [Lighthouse for Coding Agents](./intent-lighthouse-coding-agents.md)
- [Operator Guide](../05-integrations/operator-guide.md)
