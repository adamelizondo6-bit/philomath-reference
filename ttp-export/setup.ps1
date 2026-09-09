#Requires -Version 7
<#
.SYNOPSIS
  One-time setup: create .venv, install the tool and its dependencies, create config.toml.
  There is deliberately NO `playwright install` -- the tool attaches to your own Chrome.
#>
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path .venv)) {
  if (Get-Command py -ErrorAction SilentlyContinue) { & py -3 -m venv .venv } else { & python -m venv .venv }
}
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $python --version
& $python -m pip install --upgrade pip
& $python -m pip install -e .

if (-not (Test-Path config.toml)) {
  Copy-Item config.example.toml config.toml
  Write-Host ""
  Write-Host "Created config.toml from config.example.toml. Open it and fill in the blanks (it is git-ignored)."
}
Write-Host ""
Write-Host "Setup done. Next:"
Write-Host "  1. edit config.toml"
Write-Host "  2. .\launch-chrome.ps1        (log in to TTP, open the dashboard)"
Write-Host "  3. .\.venv\Scripts\python -m ttp_export.connect"
