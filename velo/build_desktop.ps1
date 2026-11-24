# ============================================================
# build_desktop.ps1 - desktop build (needs -enable-globals for
# the game's global vars): sync to clean path, `velo build
# desktop --debug -enable-globals`, copy build/desktop back.
# ============================================================
$ErrorActionPreference = 'Stop'
$env:Path = 'C:\v;C:\mingw64\bin;' + $env:Path
$env:VFLAGS = '-cc gcc'
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
$clean = 'C:\velo\mergeweb'

Write-Host '== sync project to clean path =='
if (Test-Path $clean) { Remove-Item $clean -Recurse -Force }
Copy-Item $proj $clean -Recurse -Exclude build

Write-Host '== build desktop =='
Push-Location $clean
velo build desktop --debug -enable-globals
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Write-Host 'BUILD FAILED'; exit $code }

Write-Host '== copy result back =='
$dst = Join-Path $proj 'build\desktop'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item (Join-Path $clean 'build\desktop\*') $dst -Recurse -Force

$exe = Get-ChildItem $dst -Recurse -Filter '*.exe' | Select-Object -First 1
if ($exe) {
    # the output folder/exe take the CLEAN DIR name (mergeweb) — rename to the app name
    $appDir = Join-Path $dst 'merge-game'
    if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force }
    if ((Split-Path $exe.DirectoryName -Leaf) -ne 'merge-game') { Rename-Item $exe.DirectoryName 'merge-game' }
    # re-resolve after the folder rename
    $exe = Get-ChildItem $appDir -Filter '*.exe' | Select-Object -First 1
    $newexe = Join-Path $appDir 'merge-game.exe'
    if ($exe -and (Split-Path $exe.FullName -Leaf) -ne 'merge-game.exe') { Rename-Item $exe.FullName 'merge-game.exe' }
    Write-Host "OK - desktop build at $newexe"
}
else { Write-Host 'WARN - no exe found in desktop build output' }
