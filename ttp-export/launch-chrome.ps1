#Requires -Version 7
<#
.SYNOPSIS
  Launch YOUR Google Chrome with remote debugging on a dedicated profile.

  This is the only place a browser is ever started. The Python scripts only
  attach to it. Chrome refuses --remote-debugging-port on the default profile,
  so a separate profile folder is used; log in to TTP once in this window and
  the profile keeps the session across launches.

.EXAMPLE
  .\launch-chrome.ps1
#>
param(
  [int]$Port = 9222,
  [string]$ProfileDir = (Join-Path $env:LOCALAPPDATA 'ttp-chrome-profile')
)

$bases = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA) | Where-Object { $_ }
$candidates = $bases | ForEach-Object { Join-Path $_ 'Google\Chrome\Application\chrome.exe' }
$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  Write-Error "chrome.exe not found. Looked in:`n  $($candidates -join "`n  ")"
  exit 1
}

# If a Chrome using this profile is already open, a new launch just opens a
# window in it and the debugging flag is ignored -- so check first.
try {
  $v = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2
  Write-Host "Remote debugging is already up on port $Port ($($v.Browser)). Nothing to do."
  exit 0
} catch { }

Write-Host "Chrome:   $chrome"
Write-Host "Profile:  $ProfileDir"
Write-Host "CDP port: $Port"
& $chrome --remote-debugging-port=$Port --user-data-dir="$ProfileDir"

Start-Sleep -Seconds 4
try {
  $v = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 5
  Write-Host "Remote debugging is up: $($v.Browser)"
} catch {
  Write-Warning ("Chrome started but http://127.0.0.1:$Port/json/version did not answer. " +
    "If a Chrome window with this profile was already open, close ALL of its windows and re-run.")
}
Write-Host ""
Write-Host "Next: log in to TTP in that window (first time only), open the dashboard, then run:"
Write-Host "  .\.venv\Scripts\python -m ttp_export.connect"
