param(
  [int] $Port = 31313,
  [string] $HostName = "127.0.0.1",
  [string] $Model = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js was not found on PATH."
  Write-Host "Install Node.js 18 or newer, then run this script again."
  exit 1
}

$env:LOCAL_AI_HOST = $HostName
$env:LOCAL_AI_PORT = [string] $Port

if ($Model) {
  $env:OLLAMA_MODEL = $Model
}

Write-Host "Starting Local AI Platform..."
Write-Host "Server: http://$HostName`:$Port"
Write-Host "Smoke test: `$env:LOCAL_AI_BASE_URL = `"http://$HostName`:$Port`"; node scripts\smoke-test.js"
Write-Host ""

node companion\server.js
