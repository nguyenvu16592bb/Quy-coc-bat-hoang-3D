# build_game.ps1 — build exe native (QuocCocBatHoang3D.exe) về thư mục game,
# kèm bản chạy portable: exe + assets/ nằm cạnh nhau.
$ErrorActionPreference = 'Stop'
$env:Path = 'C:\v;C:\mingw64\bin;' + $env:Path
$env:VFLAGS = '-cc gcc'

$script_dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$engine = 'C:\Users\Admin\Documents\GitHub\velo'
$dst = Join-Path $engine 'examples\quycoc3d'
$out_dir = Join-Path $script_dir 'build'
$out_exe = Join-Path $out_dir 'QuocCocBatHoang3D.exe'

Write-Host '== sync game to engine clone =='
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item $script_dir $dst -Recurse -Force

Write-Host '== compile native exe =='
Push-Location $engine
try {
	v -cc gcc -prod -o $out_exe examples/quycoc3d
	$code = $LASTEXITCODE
} finally {
	Pop-Location
}
if ($code -ne 0) { Write-Host 'BUILD FAILED'; exit $code }

Write-Host '== ship assets next to the exe =='
New-Item -ItemType Directory -Force -Path $out_dir | Out-Null
Copy-Item (Join-Path $script_dir 'assets') (Join-Path $out_dir 'assets') -Recurse -Force
Write-Host "OK - build at $out_exe"
