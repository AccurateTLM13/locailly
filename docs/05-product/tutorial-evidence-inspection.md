# Tutorial: Inspect Evidence from a Local AI Run

> **Outcome:** Understand what happened during a workflow run by inspecting Track Run Records, qualification data, and human reviews.
> **Time:** 5 minutes
> **Prerequisites:** Completed the [audit tutorial](./tutorial-audit-your-site.md)

## Step 1: Run a Demo

Open Locaily and click **Run Example Workflow** on the Home screen.

## Step 2: Open the Navigator

Navigate through the shell sections to inspect different evidence layers:

### Runs Section
Shows all completed runs with status, duration, and mode. Click any run to see details.

### Capabilities Section
Shows qualification data: which models are qualified for which roles, their scores, and enforcement state.

### Evidence Section
Shows:
- Learning state (shadow routing comparisons)
- Enforcement review (agreement rates per track)
- Benchmark Lab status (qualification records and checksums)

### Reviews Section
Shows human quality review summaries when reviews have been recorded.

## Step 3: Export Raw Data

From any section with expandable `<details>` blocks, open the JSON preview to see raw API response data.

## Step 4: Check Evidence Files on Disk

Track Run Records are stored at `data/evidence/track-run-records/`. Each file contains:

```json
{
  "schema": "locaily.track_run_record.v1",
  "meta": { "runId": "...", "trackId": "...", "status": "success" },
  "steps": [],
  "evidence": {}
}
```

## Visible Artifacts

- **Track Run Record** — machine-readable evidence of the complete execution
- **Qualification dashboard** — model-by-model capability breakdown
- **Human review records** — when reviewers have evaluated outputs

## Next Steps

- [Explore Benchmark Lab evidence](../../benchmark-lab/evidence/)
- [Read about the evidence system](../../docs/02-track-system/canonical-track-run-records.md)
