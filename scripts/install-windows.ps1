$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$configExamplePath = Join-Path $repoRoot "config.example.json"
$configTargetPath = Join-Path (Join-Path $repoRoot "companion") "config.json"

Write-Host "=== Locaily Windows Install ==="
Write-Host ""

# --- 1. Check Node.js >= 18 ---
Write-Host "[1/5] Checking Node.js..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "ERROR: Node.js was not found on PATH." -ForegroundColor Red
  Write-Host "Install Node.js 18 or newer from https://nodejs.org/ and try again."
  exit 1
}
$nodeVersionRaw = & node --version
$nodeVersion = [version]($nodeVersionRaw -replace '^v', '')
if ($nodeVersion.Major -lt 18) {
  Write-Host ""
  Write-Host "ERROR: Node.js $nodeVersionRaw found, but >= 18 is required." -ForegroundColor Red
  Write-Host "Upgrade Node.js from https://nodejs.org/ and try again."
  exit 1
}
Write-Host "  Node.js $nodeVersionRaw OK"

# --- 2. npm install ---
Write-Host "[2/5] Installing dependencies (npm install)..."
Push-Location $repoRoot
try {
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCmd) { & npm.cmd install } else { & npm install }
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: npm install failed (exit code $LASTEXITCODE)." -ForegroundColor Red
    exit 1
  }
  Write-Host "  Dependencies installed."
} finally { Pop-Location }

# --- 3. Create companion/config.json from example if missing ---
Write-Host "[3/5] Checking runtime config..."
if (Test-Path $configTargetPath) {
  Write-Host "  companion/config.json already exists; leaving it untouched."
} else {
  if (-not (Test-Path $configExamplePath)) {
    Write-Host ""; Write-Host "ERROR: config.example.json not found at $configExamplePath" -ForegroundColor Red; exit 1
  }
  $rawContent = Get-Content -LiteralPath $configExamplePath -Raw -Encoding UTF8
  $strippedContent = $rawContent -replace '(?m)^[ \t]*//.*$', ''
  [System.IO.File]::WriteAllText($configTargetPath, $strippedContent, [System.Text.UTF8Encoding]::new($false))
  Write-Host "  Created companion/config.json from config.example.json (comments stripped)"
}

# --- 4. Check Ollama ---
Write-Host "[4/5] Checking Ollama at http://127.0.0.1:11434..."
$ollamaOk = $false
try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:11434" -UseBasicParsing -TimeoutSec 3
  if ($response.StatusCode -eq 200) { $ollamaOk = $true }
} catch { $ollamaOk = $false }

if ($ollamaOk) {
  Write-Host "  Ollama is reachable."
  Write-Host "  Checking for recommended model (llama3.2)..."
  try {
    $modelList = & ollama list 2>$null
    if ($modelList -match "llama3.2") {
      Write-Host "  Recommended model llama3.2 is already pulled."
    } else {
      Write-Host "  Recommended model llama3.2 not found. Pull it with:" -ForegroundColor Yellow
      Write-Host "    ollama pull llama3.2"
    }
  } catch {
    Write-Host "  Could not list models (ollama list failed)." -ForegroundColor Yellow
  }
} else {
  Write-Host "  WARNING: Ollama is not reachable at http://127.0.0.1:11434" -ForegroundColor Yellow
  Write-Host "  Install from https://ollama.com/ and pull a model when ready."
  Write-Host "  Locaily works in demo mode without Ollama."
}

# --- 5. Firewall / port check ---
Write-Host "[5/5] Checking port 31313..."
$portCheck = netstat -an 2>$null | Select-String ":31313 "
if ($portCheck) {
  Write-Host "  Port 31313 is already in use. Locaily will use a different port if 31313 is occupied." -ForegroundColor Yellow
} else {
  Write-Host "  Port 31313 is available."
}

# --- Summary ---
Write-Host ""
Write-Host "=== Install complete ==="
Write-Host ""
Write-Host "Quick start (recommended):"
Write-Host "  .\scripts\start-locaily.ps1"
Write-Host ""
Write-Host "This will start the server and open your browser to the Locaily Home screen."
Write-Host "From there you can run a built-in demo that needs no API keys or Ollama."
Write-Host ""
Write-Host "Alternative start commands:"
Write-Host "  .\start-windows.bat          (starts server only)"
Write-Host "  node companion\server.js     (direct start)"
Write-Host ""
Write-Host "Expected first output under 10 minutes:"
Write-Host "  1. Run .\scripts\start-locaily.ps1"
Write-Host "  2. Click 'Run Example Workflow' on the Home screen"
Write-Host "  3. Watch the demo complete and inspect the results"
Write-Host ""
Write-Host "Documentation:"
Write-Host "  README.md                     Getting started"
Write-Host "  docs/05-integrations/operator-guide.md  Full walkthrough"
Write-Host "  docs/05-integrations/backup-and-restore.md  Data backup"
Write-Host ""
