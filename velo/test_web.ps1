# ============================================================
# test_web.ps1 — build web + start local server (1 command, web only)
# Usage:  powershell -ExecutionPolicy Bypass -File test_web.ps1
# Then open in your browser:
#   Game:  http://localhost:8090/build/webgl/
#   Demo Pixi+Phaser: http://localhost:8090/demo-libs/demo-libs.html
# ============================================================
$ErrorActionPreference = 'Stop'
$proj = 'C:\New folder\Hangrong\merge-game'
Set-Location $proj

# 1. sync a clean copy to C:\velo\mergeweb and build webgl (web only — no desktop build)
& powershell -ExecutionPolicy Bypass -File build_web.ps1
if ($LASTEXITCODE -ne 0) { Write-Host 'BUILD FAILED' -ForegroundColor Red; exit 1 }

# 2. stop any old server on 8090, start a fresh one from the project root
#    (root serves BOTH the game and demo-libs/, which build_web.ps1 must not delete)
$conn = Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 800 }
Start-Process python -ArgumentList '-m','http.server','8090' -WorkingDirectory $proj -WindowStyle Hidden
Start-Sleep -Seconds 2

Write-Host ''
Write-Host 'Web build OK — open (Ctrl+Shift+R to hard-refresh):' -ForegroundColor Green
Write-Host '  Game:      http://localhost:8090/build/webgl/' -ForegroundColor Cyan
Write-Host '  Pixi/Phaser demo: http://localhost:8090/demo-libs/demo-libs.html' -ForegroundColor Cyan
