# Authenticated Two-Device Relay Pilot Runbook

> **Status:** Runbook ready; execution requires two physical devices
> **Prerequisites:** Two machines on same LAN with Locaily installed, Node.js 18+, Ollama
> **Security:** Uses px2 LAN security gate (RELAY_TOKEN, LAN_MODE=1, allowlists)

## Hardware Profile Template

Copy to `scripts/pilot/device-a.json` and `scripts/pilot/device-b.json`:

```json
{
  "deviceName": "desktop-gpu",
  "os": "Windows 11",
  "cpu": "AMD Ryzen 7 8-core",
  "ram": { "gb": 32 },
  "vram": { "gb": 8, "gpu": "NVIDIA RTX 3070" },
  "runtimeProvider": "ollama",
  "availableModels": ["llama3.2", "lfm2.5-1.2b-thinking"],
  "advertisedCapabilities": ["default_worker", "priority_helper"],
  "networkAddress": "http://192.168.1.100:31313"
}
```

## Setup

### Device A (Orchestrator)

```powershell
set RELAY_TOKEN=test-pilot-token
set LAN_MODE=1
set RELAY_ALLOWLIST=192.168.1.0/24
set RELAY_CAPABILITY_ALLOWLIST=default_worker,priority_helper,developer_task_writer
node companion/server.js
```

### Device B (Relay Node)

```powershell
set RELAY_TOKEN=test-pilot-token
set LOCAL_AI_HOST=0.0.0.0
set LAN_MODE=1
set RELAY_ALLOWLIST=192.168.1.0/24
set RELAY_CAPABILITY_ALLOWLIST=default_worker,priority_helper
npm start
```

### Register Device B

```powershell
curl -X POST http://DEVICE_A_IP:31313/relay/register ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer test-pilot-token" ^
  -d "{`"nodeId`":`"device-b`",`"baseUrl`":`"http://DEVICE_B_IP:31313`",`"label`":`"Device B`",`"capabilities`":[`"default_worker`",`"priority_helper`"]}"
```

## Run Procedures

### 1. Local-Only Baseline

```powershell
node scripts/pilot/pilot-runner.js --policy local-only --repeat 3
```

### 2. Local-First Mode

```powershell
node scripts/pilot/pilot-runner.js --policy local-first --repeat 3
```

### 3. Distributed Mode

```powershell
node scripts/pilot/pilot-runner.js --policy distributed --repeat 3
```

### 4. Authenticated API Verification

```powershell
# Unauthenticated calls should be rejected
curl http://DEVICE_A_IP:31313/relay/nodes
# Expected: 401 RELAY_AUTH_MISSING

# Authenticated calls succeed
curl http://DEVICE_A_IP:31313/relay/nodes -H "Authorization: Bearer test-pilot-token"
# Expected: 200 with node list
```

## Evidence Collection

Evidence is written to `data/pilot-evidence/`:
- `run-<runId>-<NNN>.json` — per-run details
- `summary-<runId>.csv` — aggregate timing

## Stop Conditions

Halt if: device crash, registration failure, consistent errors, security concern.

## Residual Risks (After Pilot)

- [ ] No hardware diversity tested beyond two Windows machines
- [ ] No long-running (>1 hour) stability test
- [ ] No network degradation simulation
- [ ] No certificate-based auth (Bearer token only)
