const { spawn } = require("node:child_process");

const PORT = 31400;
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;
const children = [];

function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`PASS: ${name}`); }
  else { failed += 1; console.error(`FAIL: ${name}`); if (detail) console.error(`  ${detail}`); }
}

async function waitForHealth(base, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${base} not healthy in ${timeoutMs}ms`);
}

function startServer() {
  const child = spawn(process.execPath, ["companion/server.js"], {
    env: { ...process.env, LOCAL_AI_HOST: "127.0.0.1", LOCAL_AI_PORT: String(PORT) },
    stdio: ["ignore", "ignore", "ignore"]
  });
  children.push(child);
  return child;
}

async function main() {
  console.log("Starting server for golden path test...");
  const child = startServer();
  await waitForHealth(BASE);
  console.log("Server healthy.");

  // Test 1: GET /console/demo returns demo info
  const demoInfoRes = await fetch(`${BASE}/console/demo`);
  check("GET /console/demo returns 200", demoInfoRes.status === 200);
  const demoInfo = await demoInfoRes.json();
  check("Demo info has ok:true", demoInfo.ok === true);
  check("Demo info shows demoAvailable", demoInfo.demoAvailable === true);

  // Test 2: POST /console/demo starts a validation run
  const demoRunRes = await fetch(`${BASE}/console/demo`, { method: "POST" });
  check("POST /console/demo returns 202", demoRunRes.status === 202);
  const demoRun = await demoRunRes.json();
  check("Demo run has runId", demoRun.runId && typeof demoRun.runId === "string");
  const runId = demoRun.runId;

  // Test 3: Poll for completion
  let run = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(`${BASE}/console/runs/${encodeURIComponent(runId)}`);
    const body = await res.json();
    run = body.run;
    if (run && (run.status === "success" || run.status === "failed")) break;
  }
  check("Demo run completes", run && run.status === "success", run ? `status: ${run.status}` : "run not found");

  // Test 4: Steps are populated
  const steps = run.steps || [];
  check("Demo run has steps", steps.length > 0, `got ${steps.length} steps`);
  const stepLabels = steps.map(s => s.label || s.step_id);
  check("Steps include analyze report", stepLabels.some(l => /analyze/i.test(l)));
  check("Steps include compose handoff", stepLabels.some(l => /compose/i.test(l)));
  check("Steps include schema validation", stepLabels.some(l => /schema/i.test(l)));

  // Test 5: Result has expected fields
  check("Run URL is example.com", run.url === "https://example.com");
  const result = run.result || {};
  check("Result has scores", result.scores && result.scores.performance === 65);
  check("Result has markdown", result.markdown && result.markdown.length > 0);

  // Test 6: Evidence is present
  const evidence = run.evidence || {};
  check("Evidence has schema", evidence.schema != null);
  check("Evidence has metricPreservation", evidence.metricPreservation != null);
  check("Evidence has modelProvenance", evidence.modelProvenance != null);

  // Test 7: Run appears in history
  const historyRes = await fetch(`${BASE}/console/runs`);
  const history = await historyRes.json();
  const runs = history.runs || [];
  check("Demo run appears in history", runs.some(r => r.runId === runId));

  // Test 8: Console status shows demo info
  const statusRes = await fetch(`${BASE}/console/status`);
  const status = await statusRes.json();
  check("Console status is ok", status.ok === true);
  check("Console status has engine running", status.engine && status.engine.running === true);

  child.kill("SIGKILL");

  console.log(`\n${passed}/${passed + failed} golden path tests passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Golden path test error:", error);
  process.exit(1);
}).finally(() => {
  for (const c of children) {
    try { if (c && !c.killed) c.kill("SIGKILL"); } catch {}
  }
});
