$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".runtime\launcher-pids.txt"

function Get-Descendants([int]$parentId) {
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    $child
    Get-Descendants $child.ProcessId
  }
}

if (-not (Test-Path $pidFile)) {
  Write-Host "No launcher-managed Storyboard Studio process was found."
  exit 0
}

$stopped = 0
$pids = Get-Content $pidFile | ForEach-Object {
  $parsed = 0
  if ([int]::TryParse($_, [ref]$parsed)) { $parsed }
} | Select-Object -Unique

foreach ($processId in $pids) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if (-not $process) { continue }

  $processTree = @($process) + @(Get-Descendants $processId)
  $belongsToProject = $processTree | Where-Object { ([string]$_.CommandLine) -like "*$projectRoot*" } | Select-Object -First 1
  if (-not $belongsToProject) {
    Write-Host "Skipped PID $processId because it no longer belongs to this project." -ForegroundColor Yellow
    continue
  }

  & taskkill.exe /PID $processId /T /F | Out-Null
  $stopped += 1
}

Remove-Item -LiteralPath $pidFile -Force
if ($stopped -gt 0) {
  Write-Host "Storyboard Studio stopped." -ForegroundColor Green
} else {
  Write-Host "Storyboard Studio was not running."
}
