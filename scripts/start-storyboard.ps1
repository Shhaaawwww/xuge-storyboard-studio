$ErrorActionPreference = "Stop"

& node (Join-Path $PSScriptRoot "start-storyboard.mjs")
exit $LASTEXITCODE
