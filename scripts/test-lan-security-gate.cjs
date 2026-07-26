const { spawn } = require("node:child_process");

let portCounter = 31330;
function nextPort() { return ++portCounter; }

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
  throw new Error(`Server at ${base} did not become healthy in ${timeoutMs}ms`);
}

async function waitForExit(child, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { resolve({ timedOut: true }); }, timeoutMs);
    child.on("exit", (code) => { clearTimeout(timer); resolve({ code }); });
    child.on("error", () => { clearTimeout(timer); resolve({ code: -1 }); });
  });
}

function startServerOnHost(host, port, env) {
  const child = spawn(process.execPath, ["companion/server.js"], {
    env: { ...process.env, LOCAL_AI_HOST: host, LOCAL_AI_PORT: String(port), ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  return child;
}

function collectOutput(child) {
  let stdout = "", stderr = "";
  child.stdout.on("data", (d) => { stdout += d.toString(); });
  child.stderr.on("data", (d) => { stderr += d.toString(); });
  return { getOutput: () => ({ stdout, stderr }) };
}

async function main() {
  // Test 1: Loopback default starts without RELAY_TOKEN
  console.log("\n=== Test 1: Loopback default starts without RELAY_TOKEN ===");
  {
    const p = nextPort();
    const child = startServerOnHost("127.0.0.1", p, {});
    await waitForHealth(`http://127.0.0.1:${p}`);
    const res = await fetch(`http://127.0.0.1:${p}/health`);
    check("Loopback server starts and is healthy", res.ok);
    const json = await res.json();
    check("Loopback server returns ok: true", json.ok === true);
    child.kill("SIGKILL");
  }

  // Test 2: Server on non-loopback refuses startup without RELAY_TOKEN, LAN_MODE, allowlists
  console.log("\n=== Test 2: Non-loopback refuses without RELAY_TOKEN + LAN_MODE + allowlists ===");
  {
    const child = startServerOnHost("0.0.0.0", nextPort(), {});
    const out = collectOutput(child);
    const exit = await waitForExit(child, 5000);
    check("Server exits on non-loopback without security config", exit.code === 1 || exit.timedOut === false);
    const stderr = out.getOutput().stderr;
    check("Stderr contains SECURITY GATE", stderr.includes("SECURITY GATE"));
    check("Stderr mentions RELAY_TOKEN", stderr.includes("RELAY_TOKEN"));
    check("Stderr mentions LAN_MODE", stderr.includes("LAN_MODE"));
    check("Stderr mentions RELAY_ALLOWLIST", stderr.includes("RELAY_ALLOWLIST"));
    check("Stderr mentions RELAY_CAPABILITY_ALLOWLIST", stderr.includes("RELAY_CAPABILITY_ALLOWLIST"));
  }

  // Test 3: Non-loopback with partial config still fails
  console.log("\n=== Test 3: Non-loopback with partial config still fails ===");
  {
    const child = startServerOnHost("0.0.0.0", nextPort(), { RELAY_TOKEN: "test-token" });
    const exit = await waitForExit(child, 5000);
    check("Partial config (token only) still fails", exit.code === 1 || exit.timedOut === false);
  }

  // Test 4: Non-loopback with full config starts
  console.log("\n=== Test 4: Non-loopback with full config starts ===");
  {
    const p = nextPort();
    const child = startServerOnHost("0.0.0.0", p, {
      RELAY_TOKEN: "test-token",
      LAN_MODE: "1",
      RELAY_ALLOWLIST: "192.168.1.0/24,10.0.0.0/8",
      RELAY_CAPABILITY_ALLOWLIST: "ollama,model_run"
    });
    try {
      await waitForHealth(`http://127.0.0.1:${p}`, 10000);
      check("Full security config starts successfully", true);
    } catch (e) {
      check("Full security config starts successfully", false, e.message);
    }
    child.kill("SIGKILL");
  }

  // Test 5: Loopback with RELAY_TOKEN still works
  console.log("\n=== Test 5: Loopback with RELAY_TOKEN still works ===");
  {
    const p = nextPort();
    const child = startServerOnHost("127.0.0.1", p, { RELAY_TOKEN: "test-token" });
    await waitForHealth(`http://127.0.0.1:${p}`);
    check("Loopback with RELAY_TOKEN starts fine", true);
    child.kill("SIGKILL");
  }

  // Test 6: Security summary printed at startup
  console.log("\n=== Test 6: Security summary at startup ===");
  {
    const p = nextPort();
    const child = startServerOnHost("127.0.0.1", p, { RELAY_TOKEN: "test-token" });
    const out = collectOutput(child);
    await waitForHealth(`http://127.0.0.1:${p}`);
    const stdout = out.getOutput().stdout;
    check("Startup prints Security section", stdout.includes("Security"));
    check("Startup shows binding", stdout.includes("Binding"));
    check("Startup shows relay auth state", stdout.includes("Relay auth"));
    check("Startup shows trusted hosts", stdout.includes("Trusted hosts"));
    check("Startup shows exposed capabilities", stdout.includes("Exposed capabilities"));
    child.kill("SIGKILL");
  }

  // Test 7: Unauthenticated relay calls fail with RELAY_TOKEN set
  console.log("\n=== Test 7: Unauthenticated relay calls fail with RELAY_TOKEN ===");
  {
    const p = nextPort();
    const child = startServerOnHost("127.0.0.1", p, { RELAY_TOKEN: "test-secret-789" });
    const out = collectOutput(child);
    await waitForHealth(`http://127.0.0.1:${p}`);
    const res = await fetch(`http://127.0.0.1:${p}/relay/nodes`);
    const body = await res.json();
    const stdout = out.getOutput().stdout;
    const stderr = out.getOutput().stderr;
    if (res.status !== 401) {
      console.log(`  stdout snippet: ${stdout.slice(0, 400)}`);
      console.log(`  stderr: ${stderr.slice(0, 400)}`);
    }
    check("GET /relay/nodes returns 401 without auth when RELAY_TOKEN set", res.status === 401);
    check("Error code is RELAY_AUTH_MISSING", body.error && body.error.code === "RELAY_AUTH_MISSING");
    child.kill("SIGKILL");
  }

  // Test 8: Authenticated relay calls succeed with valid token
  console.log("\n=== Test 8: Authenticated relay calls succeed ===");
  {
    const p = nextPort();
    const child = startServerOnHost("127.0.0.1", p, { RELAY_TOKEN: "test-secret-789" });
    await waitForHealth(`http://127.0.0.1:${p}`);
    const res = await fetch(`http://127.0.0.1:${p}/relay/nodes`, {
      headers: { Authorization: "Bearer test-secret-789" }
    });
    check("GET /relay/nodes succeeds with valid token", res.status === 200);
    child.kill("SIGKILL");
  }

  // Test 9: localhost env var is recognized as loopback
  console.log("\n=== Test 9: Explicit localhost host starts without LAN config ===");
  {
    const p = nextPort();
    const child = startServerOnHost("localhost", p, {});
    try {
      await waitForHealth(`http://localhost:${p}`, 5000);
      check("localhost binding starts without LAN config", true);
    } catch (e) {
      const out = collectOutput(child);
      console.log(`  localhost stderr: ${out.getOutput().stderr.slice(0, 300)}`);
      check("localhost binding starts without LAN config", false, e.message);
    }
    child.kill("SIGKILL");
  }

  console.log(`\n${passed}/${passed + failed} LAN security gate tests passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("LAN security gate test harness error:", error);
  process.exit(1);
}).finally(() => {
  for (const child of children) {
    try { if (child && !child.killed) child.kill("SIGKILL"); } catch {}
  }
});
