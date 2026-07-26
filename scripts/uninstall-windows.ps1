<#
.SYNOPSIS
  Remove Locaily from a Windows machine: stop server, remove node_modules, config, and data.
.DESCRIPTION
  Stops any running Locaily server process, removes installed dependencies,
  and optionally removes config and user data. Does not remove the repository
  clone itself — delete the folder manually if desired.
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== Locaily Uninstall ===" -ForegroundColor Yellow
Write-Host ""

# 1. Stop any running Locaily server
Write-Host "[1/4] Stopping Locaily server..."
$stopped = $false
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
  try {
    $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
    $cmdLine -match "companion[/\\]server\.js"
  } catch { $false }
} | ForEach-Object {
  $_.Kill()
  $stopped = $true
  Write-Host "  Stopped server process (PID $($_.Id))."
}
if (-not $stopped) { Write-Host "  No running Locaily server found." }

# 2. Remove node_modules
Write-Host "[2/4] Removing dependencies..."
$nm = Join-Path $repoRoot "node_modules"
if (Test-Path $nm) {
  Remove-Item -LiteralPath $nm -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "  Removed node_modules."
} else {
  Write-Host "  No node_modules found."
}

# 3. Remove config (optional)
Write-Host "[3/4] Removing config..."
$configPath = Join-Path $repoRoot "companion" "config.json"
$removeConfig = $false
if (Test-Path $configPath) {
  $confirm = Read-Host "  Remove companion/config.json? (y/N)"
  if ($confirm -eq "y" -or $confirm -eq "Y") {
    Remove-Item -LiteralPath $configPath -Force
    Write-Host "  Removed companion/config.json."
  } else {
    Write-Host "  Kept companion/config.json."
  }
} else {
  Write-Host "  No config file found."
}

# 4. Remove user data (optional)
Write-Host "[4/4] Removing user data..."
$dataPath = Join-Path $repoRoot "data"
if (Test-Path $dataPath) {
  $confirm = Read-Host "  Remove data/ directory (evidence, jobs, audit logs)? (y/N)"
  if ($confirm -eq "y" -or $confirm -eq "Y") {
    Remove-Item -LiteralPath $dataPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed data/ directory."
  } else {
    Write-Host "  Kept data/ directory."
  }
} else {
  Write-Host "  No data directory found."
}

Write-Host ""
Write-Host "=== Uninstall complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "The repository clone remains at: $repoRoot"
Write-Host "Delete this folder manually if you want to remove all traces."
Write-Host ""
