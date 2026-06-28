# LocAIly

**Your local intelligence and capability orchestration layer.**

LocAIly coordinates local models, tools, workflows, knowledge, and nearby hardware so they can operate as one system.

Instead of forcing one model to handle every request, LocAIly breaks useful work into structured **Tracks**, finds the best available capability for each step, coordinates execution through the **Local Brain**, and validates the result before returning it.

```txt
One Local Brain.
Many Tracks.
The right capability for each job.
```

## What LocAIly Is

LocAIly is a local-first orchestration system for building practical, user-controlled intelligence.

It is not one model, one agent, one application, or one device.

It is the layer that connects them.

```txt
User Request
    ↓
Local Brain
    ↓
Track Selection
    ↓
Capability Discovery
    ↓
Models · Tools · Rules · Memory · Relay Nodes
    ↓
Validation and Assembly
    ↓
Useful Result
```

LocAIly is designed around a simple idea:

> Useful AI does not always require one large model doing everything.

Many workflows can be decomposed into smaller jobs and routed to specialized models, deterministic tools, scripts, validators, or other available capabilities.

The model is only part of the system.

## The LocAIly System

```txt
LocAIly
├─ Local Brain
│  └─ Coordinates requests, capabilities, context, execution, and results
│
├─ Tracks
│  └─ Reusable workflow contracts that define how work gets completed
│
├─ The Crew
│  └─ Specialized models, tools, rules, and validators assigned to Track jobs
│
├─ Model Lab
│  └─ Evaluates and qualifies models for specific roles and hardware
│
├─ Relay Nodes
│  └─ Connect nearby devices and expose their useful capabilities
│
├─ Memory Bridge
│  └─ Provides controlled access to local context and proposes writebacks
│
├─ Tool Packs
│  └─ Installable bundles of deterministic and model-backed capabilities
│
└─ Lighthouse Handoff
   └─ First practical workflow and end-to-end LocAIly test bench
```

### Local Brain

The **Local Brain** is the runtime coordinator.

It receives structured requests and determines:

* what needs to happen
* which Track should handle it
* what capabilities are required
* which model, tool, rule, or node should perform each job
* what context may be accessed
* how outputs should be validated
* how the final result should be assembled

The Local Brain does not need to be the largest or smartest model in the system.

Its job is coordination.

### Tracks

A **Track** is a reusable contract for completing a type of work.

A Track can define:

* accepted inputs
* required jobs
* execution order
* available capabilities
* model roles
* tool requirements
* context boundaries
* validation rules
* fallback behavior
* expected outputs
* evidence requirements

Tracks turn broad requests into inspectable, repeatable workflows.

Examples include:

```txt
Extract → Classify → Prioritize → Summarize → Validate
```

or:

```txt
Capture Lighthouse Data
→ Identify Priority Issues
→ Generate Developer Tasks
→ Add Guardrails
→ Validate Handoff
→ Export Markdown
```

### The Crew

**The Crew** is the collection of specialized workers available to a Track.

A crew member might be:

* a small local model
* a larger local model
* a deterministic script
* a schema validator
* a search tool
* a formatter
* an OCR engine
* a local knowledge source
* a hardware capability
* a Relay Node
* a human approval step

The Crew is a strategy, not a fixed list of agents.

Each Track assembles the crew it needs.

### Model Lab

The **Model Lab** determines where a model is actually useful.

It evaluates models against specific roles instead of treating model size or general benchmark scores as proof of fitness.

Model Lab work includes:

* controlled model testing
* role-specific benchmark suites
* structured-output evaluation
* hardware and runtime measurements
* capability manifests
* qualification records
* failure evidence
* model cards
* routing recommendations

A model should earn a role through evidence.

Being installed does not automatically make it qualified.

### Relay Nodes

**Relay Nodes** allow other devices to contribute capabilities to LocAIly.

A Relay Node does not need to run an AI model. It only needs to expose something useful through a trusted connector.

```txt
Desktop
├─ GPU inference
├─ Local models
└─ OCR

Laptop
├─ Browser capture
├─ Development tools
└─ Local Brain

NAS
├─ File storage
├─ Document access
└─ Search index

Phone
├─ Camera
├─ Microphone
└─ Sensor input
```

The architectural principle is:

> **Device does not equal model. Device equals capability.**

Relay Nodes are planned as the local-network capability layer. They are not yet represented by a complete production-ready node protocol in this repository.

### Memory Bridge

The **Memory Bridge** gives LocAIly controlled access to local project and user context.

Its current architecture supports:

* memory status checks
* scoped context-pack creation
* preflight validation
* proposed writebacks
* audit redaction
* explicit separation between reading context and changing memory

Memory access should remain bounded, inspectable, and permission-aware.

### Tool Packs

Tool Packs add reusable capabilities without requiring the core runtime to absorb every feature.

The first manifest-backed engine pack is the **Standard Text Pack**:

```txt
text.clean
text.summarize
text.extract_json
text.classify
text.detect_injection
text.validate_schema
```

Some tools are deterministic. Others can use a selected local model provider.

The long-term direction is closer to installing a capability pack than rebuilding the system every time a new workflow is added.

## First Working Track: Lighthouse Handoff

**Lighthouse Handoff** is the first practical LocAIly workflow and test bench.

It converts Google PageSpeed Insights and Lighthouse data into structured Markdown that a developer or coding agent can act on.

```txt
PageSpeed Data
    ↓
Priority Issues
    ↓
Developer Tasks
    ↓
Guardrails
    ↓
Acceptance Criteria
    ↓
Testing Checklist
    ↓
Agent-Ready Markdown
```

Its product principle is:

> **Deterministic first. AI-enhanced second.**

Without a model, the Track can still produce a useful structured handoff.

When an appropriate runtime and model are available, LocAIly can orchestrate additional steps such as improved prioritization, clearer implementation guidance, risk notes, and output refinement.

**Lighthouse client:**
https://github.com/mnfrdrsh/lighthouse-handoff

## Current Repository Scope

This repository currently contains the working Local Brain companion server and the early LocAIly runtime architecture.

Implemented areas include:

* localhost HTTP server
* canonical task execution endpoint
* legacy client compatibility
* tool registry
* Track registry and execution
* provider routing
* Ollama runtime support
* configurable model roles
* result validation
* permissions
* audit summaries
* Memory Bridge foundations
* Standard Text Pack
* Lighthouse Handoff integration
* DealSniper showcase tool
* smoke and contract tests

Still under development or planned:

* complete Relay Node protocol
* capability discovery across devices
* distributed Track execution
* mature Model Lab integration
* automatic model qualification-based routing
* installable third-party Track and Tool Pack ecosystem
* production packaging and onboarding
* broader permission and trust controls
* polished user-facing management interface

LocAIly is an active prototype. The architecture is broader than the portion currently implemented.

## Current API

The Local Brain binds to localhost by default:

```txt
http://127.0.0.1:31313
```

### Canonical Task Endpoint

New clients should use:

```txt
POST /tasks/run
```

Example:

```json
{
  "tool": "text.validate_schema",
  "input": {
    "data": {
      "title": "Example"
    },
    "schema": {
      "type": "object",
      "required": ["title"]
    }
  },
  "context": {
    "source": "example-client"
  },
  "options": {}
}
```

### Legacy Compatibility Endpoint

Existing clients may continue using:

```txt
POST /analyze
```

Example:

```json
{
  "tool": "deal-sniper",
  "task": "analyze-listing",
  "input": {
    "title": "Used Honda Generator",
    "price": 450,
    "description": "Runs good, pickup only."
  }
}
```

`/analyze` retains its legacy response envelope. New integrations should prefer `/tasks/run`.

## Implemented Endpoints

```txt
GET  /health

GET  /tools

GET  /tracks
POST /tracks/run

POST /tasks/run

GET  /audit

GET  /providers/status
POST /providers/set

GET  /models/roles
POST /models/roles/set

GET  /memory/status
POST /memory/context-pack
POST /memory/writeback/propose

POST /analyze
```

## Repository Map

```txt
companion/
├─ server.js
├─ config.json
│
├─ core/
│  ├─ audit-log.js
│  ├─ context.js
│  ├─ envelope.js
│  ├─ ids.js
│  ├─ input-gate.js
│  ├─ model-roles.js
│  ├─ orchestrator.js
│  ├─ permissions.js
│  └─ result-validator.js
│
├─ providers/
│  └─ router.js
│
├─ runtime/
│  └─ ollama.js
│
├─ tools/
│  ├─ deal-sniper.js
│  ├─ lighthouse-handoff.js
│  ├─ registry.js
│  └─ standard-text.js
│
└─ memory/
   ├─ vault-adapter.js
   ├─ context-pack-builder.js
   ├─ writeback-proposal.js
   ├─ audit-redaction.js
   └─ preflight.js

tool-packs/
└─ standard-text-pack/

scripts/
├─ smoke-test.js
└─ contract-test.js
```

## Included Capabilities

### Workflow and Showcase Tools

```txt
lighthouse-handoff
deal-sniper
```

### Standard Text Pack

```txt
text.clean
text.summarize
text.extract_json
text.classify
text.detect_injection
text.validate_schema
```

`text.validate_schema` does not require Ollama.

Lighthouse Handoff also has a deterministic execution path that remains useful when no model runtime is available.

Other text operations and DealSniper use model-backed execution.

## Run LocAIly

### Requirements

* Node.js 18 or newer
* Ollama for live local model execution
* A locally installed compatible model

The current recommended starter model is:

```txt
llama3.2
```

Install it with:

```bash
ollama pull llama3.2
```

### Start the Local Brain

```bash
node companion/server.js
```

Windows helper:

```bat
start-windows.bat
```

PowerShell development helper:

```powershell
.\start-dev.ps1
```

Use another development port:

```powershell
.\start-dev.ps1 -Port 31314
```

At startup, the server reports:

* local server URL
* canonical task endpoint
* selected provider
* provider availability
* default model role
* model readiness
* registered tool count
* smoke-test command

### Port Conflicts

When port `31313` is already in use:

```powershell
netstat -ano | findstr :31313
```

Stop the existing process or use another port:

```powershell
.\start-dev.ps1 -Port 31314
```

## Verify the Runtime

With the server running:

```bash
node scripts/smoke-test.js
```

For an alternate port:

```powershell
$env:LOCAL_AI_BASE_URL = "http://127.0.0.1:31314"
node scripts/smoke-test.js
```

Current clean-server expectation:

```txt
Smoke test summary: 55/55 checks passed.
```

This expectation assumes the Memory Bridge is disabled in the default configuration or local setup.

For a clean-server run, clear `memoryValidationVaultPath` in:

```txt
data/console/local-setup.json
```

## Design Principles

### Local First

Useful work should remain on user-controlled hardware whenever the required capability is available locally.

Cloud services may eventually be supported as explicit capabilities or fallbacks, but they should not silently become the architecture.

### Capability Before Model

LocAIly should ask:

```txt
What capability does this job require?
```

—not merely:

```txt
Which model should receive the entire prompt?
```

A script, rule, validator, database, or storage node may be the better worker.

### Tracks Before Agents

Tracks define the work.

Workers remain replaceable.

A workflow should not collapse because one model, agent framework, or provider changes.

### Deterministic Where Possible

Known operations should use code, schemas, and rules.

Models should be used where interpretation, transformation, classification, or judgment adds measurable value.

### Evidence Before Routing Claims

A model is not considered best for a role because it is popular, large, or impressive in a general benchmark.

Model Lab evidence should determine routing qualifications.

### Graceful Degradation

LocAIly should remain useful when:

* Ollama is unavailable
* a selected model is missing
* a model returns malformed output
* a Relay Node disconnects
* an AI enhancement step fails

A stronger system is not one that never encounters failure. It is one that understands what can still be completed safely.

### User-Controlled Context

Memory and project context should be intentionally scoped.

Reading context and changing stored knowledge are separate actions.

### Honest Validation

Do not claim:

* benchmark victories without recorded results
* model qualifications without evidence
* hardware support that has not been tested
* production readiness while the system is still experimental
* privacy guarantees beyond the actual implementation

LocAIly is being built to test a thesis, not declare it proven ahead of the evidence.

## Why This Exists

Most AI systems begin with the model.

LocAIly begins with the work.

The project is exploring whether useful local intelligence can emerge from coordinating:

* smaller specialized models
* larger local models when hardware permits
* deterministic tools
* reusable Tracks
* structured context
* validators
* local files and knowledge
* existing consumer hardware
* connected Relay Nodes

The goal is not to prove that small models replace large models everywhere.

The goal is to discover where a coordinated local system is already good enough—and where it may be more private, efficient, understandable, modular, or strategically useful.

## Documentation

Start here:

* [Documentation entry point](docs/00-start-here/README.md)
* [Current state](docs/00-start-here/current-state.md)
* [Current vision](docs/00-start-here/current-vision.md)
* [Repository map](docs/00-start-here/repo-map.md)

Architecture:

* [LocAIly overview](docs/01-architecture/locaily-overview.md)
* [Memory Bridge](docs/01-architecture/memory-bridge.md)
* [API contract](docs/01-architecture/api-contract.md)

Tracks and workflows:

* [Track system](docs/02-track-system/README.md)
* [Lighthouse Handoff](docs/03-workflows/lighthouse-handoff.md)
* [Lighthouse validation record](docs/03-workflows/lighthouse-handoff-validation.md)

Product and progress:

* [Roadmap](docs/05-product/roadmap.md)
* [Packaging plan](docs/05-product/packaging-plan.md)
* [Publish-readiness checklist](docs/05-product/publish-readiness-checklist.md)
* [Next agent brief](docs/07-progress/next-agent-brief.md)

Agent integration:

* [Client integration guide](docs/08-agents/client-integration-guide.md)
* [Agent context](docs/08-agents/agent-context.md)

## Current Thesis

> Useful AI does not always require one large, expensive, general-purpose model.

LocAIly tests whether models, tools, rules, memory, workflows, and nearby devices can be coordinated into a practical local intelligence system.

By breaking work into Tracks, assigning each job to the best available capability, and validating the combined result, LocAIly aims to make local AI more useful on the hardware people already own.

```txt
Use what you already own.
Connect what is useful.
Route work intelligently.
Keep control local.
```

---

**LocAIly: Local Intelligence and Capability Orchestration Layer.**
