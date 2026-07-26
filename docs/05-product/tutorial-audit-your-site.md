# Tutorial: Audit Your Website with Local AI

> **Outcome:** A developer-ready handoff document for your website's performance, accessibility, and SEO issues.
> **Time:** 10 minutes (with demo) or 15 minutes (with your real site)
> **Prerequisites:** Node.js 18+, cloned Locaily repository

## Step 1: Start Locaily

```powershell
.\scripts\start-locaily.ps1
```

Wait for the server to print "Server is running" and your browser to open.

## Step 2: Run the Built-in Demo

1. On the Home screen, click **Run Example Workflow**
2. Watch the steps: preflight → PageSpeed capture → analyze → provenance → compose → schema validation → metric check → privacy audit → artifacts
3. When complete, inspect each step in the **Run Inspector**

**Artifact:** Click **Export Artifact** to download the complete run as JSON.

## Step 3: Run on Your Site

1. Click the **Runs** section in the shell nav
2. Note your run appears in history
3. For a real site audit, open the [Console](/console) and enter your URL
4. Select **Standard** mode and click **Run Validation**

## Step 4: Compare Standard vs AI (with Ollama)

1. Install [Ollama](https://ollama.com/) and pull `llama3.2`
2. Restart Locaily
3. Return to Console, select **Local AI** mode
4. Run validation on the same URL

**What changed:** The AI analysis step now produces richer developer explanations and priority classifications.

## Visible Artifacts

- **Export JSON** — complete run bundle with all step outputs
- **Evidence section** — schema validation, metric preservation, privacy audit results
- **Markdown preview** — the generated developer handoff in the Advanced Details panel

## Next Steps

- [Use the exported artifact with a coding agent](./intent-lighthouse-coding-agents.md)
- [Explore the full API](../../docs/05-integrations/api-reference.md)
