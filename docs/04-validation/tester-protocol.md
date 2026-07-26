# Tester Protocol — Lighthouse Handoff External Validation

> **Status:** Ready for external testers
> **Target:** 5 developers completing Lighthouse Handoff without maintainer help
> **Prerequisites:** Node.js 18+, Windows machine (or manual setup on macOS/Linux)

## Tester Profile

- Has Node.js installed, comfortable with terminal
- Has a website they want to audit (or will use example.com)
- Has not interacted with the Locaily maintainer during the test

## Setup Instructions (for testers)

1. Clone the repository
2. Run `scripts/install-windows.ps1` (or `node scripts/install-windows.ps1` on non-Windows)
3. Run `scripts/start-locaily.ps1` (or `node companion/server.js`)
4. Open browser to `http://127.0.0.1:31313/`
5. Click **Run Example Workflow**

## Tasks

### Task 1: Run the built-in demo
1. Open the Home screen
2. Click "Run Example Workflow"
3. Wait for completion
4. Inspect the steps, evidence, and result
5. Export the artifact

### Task 2: Run Lighthouse Handoff on your site
1. Navigate to your target URL
2. Select "Standard" mode
3. Click "Run Validation"
4. If no PageSpeed API key, paste a PageSpeed report (or use pasted report panel)

### Task 3: Try Local AI mode (if Ollama is installed)
1. Install Ollama and pull `llama3.2`
2. Restart Locaily
3. Select "Local AI" mode
4. Run validation again and compare output

## Feedback Questions

After completing the tasks, please answer:

1. **Setup friction (1-5):** How many steps required maintainer help?
2. **First-output time:** Minutes from clone to seeing a result?
3. **Demo clarity (1-5):** Did the built-in example clearly explain what happened?
4. **Inspector usefulness (1-5):** Were the step details and evidence useful?
5. **Output quality (1-5):** Was the Lighthouse Handoff artifact usable?
6. **Biggest blocker:** What stopped you or confused you the most?
7. **Repeat intent:** Would you use Locaily again for another site audit?
8. **One thing to improve:** Single highest-impact change.
9. **Environment:** OS, Node version, Ollama (Y/N), PageSpeed key (Y/N).
10. **Free text:** Anything else.

## Metric Tracking

| Metric | Target | Actual |
|---|---|---|
| Time to first output | < 10 min | |
| Tasks completed | 3/3 | |
| Setup without help | 5/5 | |
| Repeat-use intent | >3/5 | |
