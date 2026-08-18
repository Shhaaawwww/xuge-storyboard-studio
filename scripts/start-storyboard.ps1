$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimeDir "launcher-pids.txt"
$stdoutLog = Join-Path $runtimeDir "storyboard.out.log"
$stderrLog = Join-Path $runtimeDir "storyboard.err.log"
$webUrl = "http://localhost:5173/"
$apiUrl = "http://localhost:4317/api/health"

function Test-Endpoint([string]$url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    return $false
  }
}

function Test-Port([int]$port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $result = $client.BeginConnect("127.0.0.1", $port, $null, $null)
    return $result.AsyncWaitHandle.WaitOne(300) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Fail([string]$message) {
  Write-Host ""
  Write-Host $message -ForegroundColor Red
  exit 1
}

Write-Host "Starting Storyboard Studio..." -ForegroundColor Cyan

$node = Get-Command node.exe -ErrorAction SilentlyContinue
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
  Fail "Node.js was not found. Install Node.js 20 or newer, then double-click the launcher again."
}

if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}

$concurrently = Join-Path $projectRoot "node_modules\.bin\concurrently.cmd"
if (-not (Test-Path $concurrently)) {
  Write-Host "Installing dependencies for the first launch..." -ForegroundColor Yellow
  Push-Location $projectRoot
  try {
    & $npm.Source install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
  } finally {
    Pop-Location
  }
}

$webReady = Test-Endpoint $webUrl
$apiReady = Test-Endpoint $apiUrl

if (-not $webReady -and (Test-Port 5173)) {
  Fail "Port 5173 is already used by another program. Close it and try again."
}
if (-not $apiReady -and (Test-Port 4317)) {
  Fail "Port 4317 is already used by another program. Close it and try again."
}

if ($webReady -and $apiReady) {
  Write-Host "Storyboard Studio is already running." -ForegroundColor Green
  Start-Process $webUrl
  exit 0
}

$npmScript = if (-not $webReady -and -not $apiReady) {
  "dev"
} elseif (-not $webReady) {
  "dev:web"
} else {
  "dev:api"
}

$arguments = "/d /s /c `"`"$($npm.Source)`" run $npmScript`""
$process = Start-Process -FilePath "cmd.exe" `
  -ArgumentList $arguments `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

Add-Content -Path $pidFile -Value $process.Id
Write-Host "Waiting for the web app and API..." -ForegroundColor DarkGray

$ready = $false
for ($attempt = 0; $attempt -lt 90; $attempt++) {
  Start-Sleep -Milliseconds 500
  if ((Test-Endpoint $webUrl) -and (Test-Endpoint $apiUrl)) {
    $ready = $true
    break
  }
  if ($process.HasExited) { break }
}

if (-not $ready) {
  Write-Host ""
  Write-Host "The app did not become ready. Recent log output:" -ForegroundColor Red
  if (Test-Path $stderrLog) { Get-Content $stderrLog -Tail 20 }
  if (Test-Path $stdoutLog) { Get-Content $stdoutLog -Tail 20 }
  exit 1
}

Write-Host "Ready: $webUrl" -ForegroundColor Green
Start-Process $webUrl
exit 0
