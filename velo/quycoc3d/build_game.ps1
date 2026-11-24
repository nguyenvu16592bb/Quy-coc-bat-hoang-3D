# build_game.ps1 — build exe native (QuocCocBatHoang3D.exe) về thư mục game,
# kèm bản chạy portable: exe + assets/ nằm cạnh nhau.
#
# LƯU Ý — exe KHÔNG build được ở Linux (script này chạy trên Windows, cần
# V toolchain + MinGW: C:\v, C:\mingw64\bin). Ở Linux chỉ kiểm tra tĩnh
# (grep/node) được; muốn có exe thì chạy script này trên máy Windows.
#
# Checklist file mới (vòng 2 — trận hình 5 người + thị trấn Song Ma):
#   velo/quycoc3d/battle_map.v  (trận hình 5 người, auto-battle, raid boss 3 phase)
#   velo/quycoc3d/town.v        (thị trấn Song Ma an toàn + 3 NPC)
#   velo/quycoc3d/assets/scenes/main.scene  (thêm BattlePanel/TownPanel/
#     EnhancePanel/PvpPanel + 4 nút HUD; node cũ giữ nguyên)
# Script dừng lại (exit 1) khi thiếu bất kỳ file nào trong checklist, trước
# khi sync sang engine clone — để không build ra exe thiếu tính năng mới.
$ErrorActionPreference = 'Stop'
$env:Path = 'C:\v;C:\mingw64\bin;' + $env:Path
$env:VFLAGS = '-cc gcc'

$script_dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$required_files = @(
	'battle_map.v',
	'town.v',
	(Join-Path 'assets' (Join-Path 'scenes' 'main.scene'))
)
foreach ($rel in $required_files) {
	$p = Join-Path $script_dir $rel
	if (-not (Test-Path $p)) {
		Write-Host "MISSING REQUIRED FILE: $p"
		exit 1
	}
}
Write-Host '== checklist file moi OK (battle_map.v, town.v, main.scene) =='
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
