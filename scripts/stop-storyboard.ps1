$ErrorActionPreference = "Stop"

& node (Join-Path $PSScriptRoot "stop-storyboard.mjs")
exit $LASTEXITCODE
