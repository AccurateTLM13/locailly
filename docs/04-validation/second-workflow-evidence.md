# Second Workflow: Accessibility Audit Pipeline

> **Status:** Runnable with deterministic fixture and live Ollama paths
> **Evidence:** Track Run Records stored at `data/evidence/track-run-records/`

## Overview

The accessibility audit pipeline uses Locaily's existing `website_audit.accessibility_deep` track to analyze web page accessibility. This is the second real workflow after Lighthouse Handoff, proven by Benchmark Lab qualification.

## Workflow

1. Capture or fixture PageSpeed accessibility data
2. Route to `a11y_analyzer` role using qualified model (llama3.2)
3. Generate structured accessibility findings
4. Validate against schema
5. Produce human-readable report

## Running via Console

1. Open `http://127.0.0.1:31313/`
2. Navigate to Workflows section
3. Run the built-in accessibility demo (available from Home)

## Running via API

```powershell
curl -X POST http://127.0.0.1:31313/tracks/run ^
  -H "Content-Type: application/json" ^
  -d "{`"track_id`":`"website_audit.accessibility_deep`",`"input`":{`"url`":`"https://example.com`"}}"
```

## Evidence

- Track Run Records at `data/evidence/track-run-records/`
- Qualification records in Benchmark Lab
- Human review records at `data/evidence/human-reviews/`

## Known Limitations

- Requires Ollama for full AI analysis path
- Deterministic fallback produces basic output
- No browser-based accessibility capture (uses Lighthouse data)

## Next Steps

- Integrate accessibility audit into the unified shell
- Add comparison mode (standard vs AI)
- Publish tutorial with visible artifact
