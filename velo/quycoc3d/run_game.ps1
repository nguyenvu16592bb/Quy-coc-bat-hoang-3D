# run_game.ps1 — đồng bộ game sang engine clone (branch 3d) và chạy thử.
# Engine 3D chỉ chạy desktop (native), nên game được chạy bằng `v run` từ engine root.
$ErrorActionPreference = 'Stop'
$env:Path = 'C:\v;C:\mingw64\bin;' + $env:Path
$env:VFLAGS = '-cc gcc'

$script_dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$engine = 'C:\Users\Admin\Documents\GitHub\velo'
$dst = Join-Path $engine 'examples\quycoc3d'

Write-Host '== sync game to engine clone =='
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
Copy-Item $script_dir $dst -Recurse -Force

Write-Host '== v run examples/quycoc3d =='
Push-Location $engine
try {
	v run examples/quycoc3d
	$code = $LASTEXITCODE
} finally {
	Pop-Location
}
exit $code
