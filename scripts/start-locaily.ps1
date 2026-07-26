<#
.SYNOPSIS
  Start Locaily Local Brain and open browser to the Home screen.
.DESCRIPTION
  Starts the companion server, waits for it to become healthy,
  opens the default browser to the Locaily unified shell at /,
  and keeps the server running in the current window.
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== Locaily Start ===" -ForegroundColor Green
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js not found. Run scripts/install-windows.ps1 first." -ForegroundColor Red
  exit 1
}

# Check dependencies exist
$serverPath = Join-Path $repoRoot "companion" "server.js"
if (-not (Test-Path $serverPath)) {
  Write-Host "ERROR: companion/server.js not found. Are you in the Locaily repository root?" -ForegroundColor Red
  exit 1
}

$nodeModulesPath = Join-Path $repoRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
  Write-Host "Dependencies not installed. Running install first..."
  & (Join-Path $PSScriptRoot "install-windows.ps1")
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Install failed." -ForegroundColor Red
    exit 1
  }
}

# Suggest Ollama if not running
try {
  $ollamaCheck = Invoke-WebRequest -Uri "http://127.0.0.1:11434" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
  if ($ollamaCheck.StatusCode -ne 200) { throw "not ok" }
} catch {
  Write-Host "NOTE: Ollama does not appear to be running." -ForegroundColor Yellow
  Write-Host "  Locaily works in demo mode without Ollama."
  Write-Host "  To use AI features, start Ollama and pull a model: ollama pull llama3.2"
  Write-Host ""
}

# Start the server
Write-Host "Starting Local Brain server..." -ForegroundColor Cyan
Write-Host ""

$serverProcess = Start-Process -PassThru -NoNewWindow -FilePath "node" -ArgumentList "$serverPath"

# Wait for server to start
$timeout = 15
$healthy = $false
for ($i = 0; $i -lt $timeout; $i++) {
  Start-Sleep -Seconds 1
  try {
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:31313/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($health.StatusCode -eq 200) {
      $healthy = $true
      break
    }
  } catch {}
}

if ($healthy) {
  Write-Host ""
  Write-Host "Server is running at http://127.0.0.1:31313" -ForegroundColor Green
  Write-Host "Opening browser to Locaily Home..."
  Start-Process "http://127.0.0.1:31313/"
  Write-Host ""
  Write-Host "Browser should open automatically. If not, visit:" -ForegroundColor Yellow
  Write-Host "  http://127.0.0.1:31313/"
  Write-Host ""
  Write-Host "Press Ctrl+C to stop the server."
  Wait-Process -Id $serverProcess.Id
} else {
  Write-Host ""
  Write-Host "ERROR: Server did not become healthy within ${timeout}s." -ForegroundColor Red
  Write-Host "Check the console output above for errors."
  if ($serverProcess -and !$serverProcess.HasExited) { $serverProcess.Kill() }
  exit 1
}
