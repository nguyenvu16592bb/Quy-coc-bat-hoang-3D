# ============================================================
# build_web.ps1 - build the WebGL build, then BUNDLE PixiJS + plugins
# INTO the single game bundle (game.<hash>.js) so everything ships as
# ONE library file (no separate vendor scripts). The engine runtime
# (velo-runtime) is already inside that bundle.
# ============================================================
$ErrorActionPreference = 'Stop'
$env:Path = 'C:\v;C:\mingw64\bin;' + $env:Path
$env:VFLAGS = '-cc gcc'
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
$clean = 'C:\velo\mergeweb'

Write-Host '== sync project to clean path =='
if (Test-Path $clean) { Remove-Item $clean -Recurse -Force }
Copy-Item $proj $clean -Recurse -Exclude build

Write-Host '== build webgl =='
Push-Location $clean
velo build webgl
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Write-Host 'BUILD FAILED'; exit $code }

Write-Host '== copy result back =='
$dst = Join-Path $proj 'build\webgl'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item (Join-Path $clean 'build\webgl\*') $dst -Recurse -Force

# ---- inject plugins (pixi-hud, kine2d, live-reload) ----
Write-Host '== inject web plugins =='
$plugins = Join-Path $proj 'web\plugins'
New-Item -ItemType Directory -Force -Path (Join-Path $dst 'plugins') | Out-Null
# velo-engine-api.js is split into small per-domain modules (ve-modules/*)
$mods = @('velo-ve-hud.js', 'velo-kine2d.js', 've-modules\00-boot.js', 've-modules\01-core.js', 've-modules\02-ext.js', 've-modules\03-ext2.js', 've-modules\04-rig.js', 've-modules\04b-v3d.js', 've-modules\05-export.js', 'velo-boss-rig.js', 'live-reload.js')
foreach ($p in $mods) {
    if (Test-Path (Join-Path $plugins $p)) { Copy-Item (Join-Path $plugins $p) (Join-Path $dst 'plugins') -Force }
}

# ---- BUNDLE: pixi.min.js + plugins INTO game.<hash>.js ----
$game = Get-ChildItem (Join-Path $dst 'game.*.js') | Select-Object -First 1
$pixiSrc = Join-Path $proj 'web\vendor\pixi.min.js' # pixi removed: unified Velo pipeline
if ($game -and (Test-Path $pixiSrc)) {
    Write-Host '== bundling jszip + plugins into the game bundle (no pixi) =='
    $parts = @()
    $jszipSrc = Join-Path $proj 'web\vendor\jszip.min.js'
    if (Test-Path $jszipSrc) { $parts += Get-Content $jszipSrc -Raw }
    foreach ($p in @('velo-ve-hud.js', 'velo-kine2d.js', 've-modules\00-boot.js', 've-modules\01-core.js', 've-modules\02-ext.js', 've-modules\03-ext2.js', 've-modules\04-rig.js', 've-modules\04b-v3d.js', 've-modules\05-export.js', 'velo-boss-rig.js', 'live-reload.js')) {
        # files are copied FLAT into build/webgl/plugins (basename only)
        $f = Join-Path $dst ('plugins\' + (Split-Path $p -Leaf))
        if (Test-Path $f) { $parts += Get-Content $f -Raw }
    }
    $parts += Get-Content $game.FullName -Raw
    Set-Content $game.FullName ($parts -join "`n") -Encoding UTF8 -NoNewline
    # drop the separate vendor/plugin script tags; the game script becomes a
    # plain script (the bundle has no imports, and UMD pixi needs `this` = window)
    $html = Join-Path $dst 'index.html'
    $h = Get-Content $html -Raw
    $h = $h -replace '<script src="vendor/pixi.min.js"></script>\s*', ''
    $h = $h -replace '<script src="plugins/[^"]*"></script>\s*', ''
    $h = $h -replace 'type="module" ', ''
    Set-Content $html $h -Encoding UTF8 -NoNewline
    Write-Host '  jszip + plugins bundled; index.html loads only the game bundle (pixi removed) - unified pipeline'
} else {
    Write-Host '  (no game bundle or pixi vendor - skip bundling)' -ForegroundColor Yellow
}
# ---- fresh bundle name every build (bypasses proxy/path caches) ----
$fresh = Get-ChildItem (Join-Path $dst 'game.*.js') | Select-Object -First 1
if ($fresh) {
    $newName = 'game.v{0}.js' -f [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    Rename-Item $fresh.FullName (Join-Path $dst $newName)
    $hh = Join-Path $dst 'index.html'
    if (Test-Path $hh) {
        $h2 = Get-Content $hh -Raw
        $h2 = $h2 -replace 'game\.[A-Za-z0-9_.]+\.js', $newName
        Set-Content $hh $h2 -Encoding UTF8 -NoNewline
    }
    Write-Host "  bundle -> $newName"
}

# stamp for live-reload
Set-Content (Join-Path $dst 'watch.txt') (Get-Date -Format o) -Encoding UTF8 -NoNewline

# ---- copy the bundle as a standalone Velo engine JS library ----
$lib = Join-Path $proj 'web\velo-lib'
New-Item -ItemType Directory -Force -Path $lib | Out-Null
if ($game) { Copy-Item $game.FullName (Join-Path $lib 'velo-engine.js') -Force }

Write-Host "OK - web build at $dst"
Write-Host 'Local run: double-click web\start_server.bat  then open http://localhost:8090/build/webgl/'
