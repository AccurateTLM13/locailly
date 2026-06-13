# API Contract - Local AI Platform

## Base URL

Default:

```txt
http://127.0.0.1:31313
```

The server binds to localhost by default. The newer engine docs mention `4317`; this repo keeps `31313` for compatibility unless config or environment overrides it.

## Endpoint Status

Canonical engine API:

```txt
GET  /health
GET  /tools
GET  /tracks
POST /tracks/run
POST /tasks/run
GET  /audit
GET  /scoreboard
GET  /providers/status
POST /providers/set
GET  /models/roles
POST /models/roles/set
GET  /memory/status
POST /memory/context-pack
POST /memory/writeback/propose
```

Legacy compatibility API:

```txt
POST /analyze
```

`/analyze` remains supported for old clients and keeps its original envelope. New clients should use `/tasks/run`.

## GET /memory/status

Reports memory bridge configuration and vault readability. Does **not** expose the full private `vaultPath` in normal responses.

```json
{
  "ok": true,
  "result": {
    "enabled": false,
    "mode": "local_markdown_vault",
    "vaultPathConfigured": false,
    "readable": false,
    "readPolicy": "allowlist",
    "writebackMode": "proposal_only",
    "rawAccess": false,
    "effectiveAllowedPaths": ["index.md", "log.md", "projects/", "topics/"],
    "effectiveBlockedPaths": ["raw/", "private/", "personal/", ".git/"],
    "projectCount": 0,
    "topicCount": 0,
    "warnings": ["Memory bridge is disabled."]
  },
  "warnings": ["Memory bridge is disabled."],
  "meta": {
    "requestId": "string",
    "durationMs": 0,
    "createdAt": "ISO-8601"
  }
}
```

When enabled and readable, `projectCount` and `topicCount` reflect allowlisted Markdown files under configured project/topic paths (flat or `wiki/`).

## POST /memory/context-pack

Builds a task-specific Context Pack from allowlisted vault Markdown. Returns summaries, heading extraction, limited excerpts, and `filesUsed` — **not** full source files by default.

Request:

```json
{
  "project": "Example Project",
  "task": "Plan Memory Bridge v0",
  "include": ["current_state", "known_decisions", "constraints", "open_questions"],
  "maxFiles": 8
}
```

Success envelope:

```json
{
  "ok": true,
  "result": {
    "contextPackId": "ctx_example-project_memory-bridge-v0",
    "project": "Example Project",
    "task": "Plan Memory Bridge v0",
    "summary": "string",
    "filesUsed": ["index.md"],
    "excerpts": [{ "path": "index.md", "heading": "Overview", "text": "truncated..." }],
    "keyDecisions": [],
    "knownConstraints": [],
    "openQuestions": [],
    "warnings": [],
    "recommendedNextStep": "string"
  },
  "warnings": [],
  "meta": { }
}
```

Error codes include `MEMORY_DISABLED`, `VAULT_NOT_READABLE`, `BAD_JSON`, `INVALID_REQUEST`.

## POST /memory/writeback/propose

Writes a reviewable proposal Markdown file to `{vault}/.memory-bridge/writeback-inbox/`. Does not edit wiki pages or `raw/`. `requiresHumanReview` must be `true`.

Request:

```json
{
  "taskId": "run_123",
  "project": "Example Project",
  "task": "Plan Memory Bridge v0",
  "whatChanged": [],
  "decisionsMade": [],
  "newLessons": [],
  "suggestedUpdates": [],
  "requiresHumanReview": true
}
```

Success:

```json
{
  "ok": true,
  "result": {
    "proposalId": "2026-06-12-example-project-memory-bridge-v0",
    "proposalPath": ".memory-bridge/writeback-inbox/2026-06-12-example-project-memory-bridge-v0.md",
    "requiresHumanReview": true
  },
  "warnings": [],
  "meta": { }
}
```

`POST /memory/writeback/apply` is **not** implemented in v0.

## GET /health

`/health` preserves the original fields and also exposes engine compatibility hints.

```json
{
  "ok": true,
  "engine": "local-ai-engine-core",
  "service": "local-ai-platform",
  "version": "0.1.0",
  "status": "running",
  "canonicalEndpoint": "/tasks/run",
  "compatibilityEndpoints": ["/analyze"],
  "runtime": {
    "provider": "ollama",
    "available": false,
    "baseUrl": "http://127.0.0.1:11434"
  },
  "model": {
    "name": "llama3.2",
    "ready": false
  },
  "tools": ["deal-sniper", "lighthouse-handoff", "text.clean"]
}
```

## GET /tools

Returns public metadata for currently enabled tools.

```json
{
  "ok": true,
  "tools": [
    {
      "id": "text.clean",
      "name": "Text Clean",
      "pack": "standard-text-pack",
      "description": "Clean messy text into a requested format.",
      "tasks": ["run"],
      "permissions": ["model.run"],
      "model_role": "default_worker",
      "runtime_required": true
    }
  ]
}
```

## POST /tasks/run

Canonical execution endpoint.

Request:

```json
{
  "tool": "text.validate_schema",
  "input": {
    "data": { "title": "Example" },
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

Success envelope:

```json
{
  "ok": true,
  "run_id": "run_123",
  "trace_id": "trace_abc",
  "tool": "text.validate_schema",
  "task": "run",
  "provider": "ollama",
  "model": "llama3.2",
  "model_role": "default_worker",
  "result": {},
  "confidence": 1,
  "warnings": [],
  "fallbacks_used": [],
  "meta": {
    "duration_ms": 12,
    "schema_valid": true
  }
}
```

Error envelope:

```json
{
  "ok": false,
  "run_id": "run_123",
  "trace_id": "trace_abc",
  "tool": "deal-sniper",
  "task": "analyze-listing",
  "provider": "ollama",
  "model": "llama3.2",
  "model_role": "default_worker",
  "code": "PROVIDER_UNAVAILABLE",
  "message": "Provider 'ollama' is not available at http://127.0.0.1:11434.",
  "next_step": "Start Ollama, then try again.",
  "warnings": [],
  "fallbacks_used": [],
  "meta": {
    "duration_ms": 12,
    "schema_valid": false
  }
}
```

## POST /analyze

Legacy compatibility endpoint. It remains available for existing DealSniper and Lighthouse clients.

Request:

```json
{
  "tool": "deal-sniper",
  "task": "analyze-listing",
  "input": {},
  "options": {}
}
```

Legacy success envelope:

```json
{
  "ok": true,
  "tool": "deal-sniper",
  "task": "analyze-listing",
  "provider": "ollama",
  "model": "llama3.2",
  "result": {},
  "meta": {
    "requestId": "string",
    "durationMs": 0,
    "createdAt": "ISO-8601 string"
  }
}
```

Legacy errors use the same shape with `ok: false`, `result: null`, and `error`.

## Other Engine Endpoints

Provider status and switching:

```txt
GET  /providers/status
POST /providers/set
```

Model role inspection and updates:

```txt
GET  /models/roles
POST /models/roles/set
```

Audit log:

```txt
GET /audit?limit=50&run_id=run_123&tool=text.clean&source=example-client
```

Audit entries are summary-only and do not persist raw input/output values by default.

## Error Codes

Common legacy codes:

```txt
BAD_JSON
UNKNOWN_TOOL
UNKNOWN_TASK
INVALID_INPUT
OLLAMA_NOT_RUNNING
MODEL_NOT_READY
MODEL_RESPONSE_INVALID
UNSAFE_INPUT_DETECTED
PERMISSION_DENIED
INTERNAL_ERROR
```

Common engine codes:

```txt
BAD_JSON
TOOL_NOT_FOUND
TASK_NOT_FOUND
INVALID_INPUT
PROVIDER_UNAVAILABLE
MODEL_UNAVAILABLE
SCHEMA_VALIDATION_FAILED
UNSAFE_INPUT_DETECTED
PERMISSION_DENIED
INTERNAL_ERROR
```

## Compatibility Rule

Do not remove or rename fields that existing clients use. Add fields instead.
