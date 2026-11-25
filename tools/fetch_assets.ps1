# MVL3D — tai thu vien (Three.js r147 UMD + PixiJS 6) va 15 model GLB quai/boss
# Primary: raw.githubusercontent.com — Fallback: cdn.jsdelivr.net/gh
$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'
$log = @()

function Get-File($out, $min, $urls) {
  if (Test-Path $out) {
    $len = (Get-Item $out).Length
    if ($len -ge $min) { Write-Output ("SKIP {0} {1}" -f $out, $len); return $true }
  }
  foreach ($u in $urls) {
    curl.exe -sSL -A $UA --retry 2 --connect-timeout 20 -o $out $u 2>$null
    if (Test-Path $out) {
      $len = (Get-Item $out).Length
      $okSize = $len -ge $min
      $okMagic = $true
      if ($out -like '*.glb') {
        $fs = [IO.File]::OpenRead((Resolve-Path $out)); $b = New-Object byte[] 4
        $fs.Read($b, 0, 4) | Out-Null; $fs.Close()
        $okMagic = ([Text.Encoding]::ASCII.GetString($b) -eq 'glTF')
      }
      if ($okSize -and $okMagic) { Write-Output ("OK {0} {1}" -f $out, $len); return $true }
      Remove-Item $out -Force -ErrorAction SilentlyContinue
    }
    Write-Output ("RETRY-FALLBACK {0} <- {1}" -f $out, $u)
  }
  Write-Output ("FAIL {0}" -f $out)
  return $false
}

$C  = 'https://cdn.jsdelivr.net/npm/three@0.147.0'
$K1 = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0'
$K2 = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0'
$T1 = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf'
$T2 = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf'

# --- thu vien ---
Get-File 'js/lib/three.min.js' 400000 @("$C/build/three.min.js")
Get-File 'js/lib/loaders/GLTFLoader.js' 40000 @("$C/examples/js/loaders/GLTFLoader.js")
Get-File 'js/lib/loaders/DRACOLoader.js' 12000 @("$C/examples/js/loaders/DRACOLoader.js")
Get-File 'js/lib/loaders/SkeletonUtils.js' 8000 @("$C/examples/js/utils/SkeletonUtils.js")
Get-File 'js/lib/post/EffectComposer.js' 10000 @("$C/examples/js/postprocessing/EffectComposer.js")
Get-File 'js/lib/post/RenderPass.js' 2500 @("$C/examples/js/postprocessing/RenderPass.js")
Get-File 'js/lib/post/ShaderPass.js' 2500 @("$C/examples/js/postprocessing/ShaderPass.js")
Get-File 'js/lib/post/MaskPass.js' 2500 @("$C/examples/js/postprocessing/MaskPass.js")
Get-File 'js/lib/post/UnrealBloomPass.js' 10000 @("$C/examples/js/postprocessing/UnrealBloomPass.js")
Get-File 'js/lib/shaders/CopyShader.js' 1500 @("$C/examples/js/shaders/CopyShader.js")
Get-File 'js/lib/shaders/LuminosityHighPassShader.js' 2000 @("$C/examples/js/shaders/LuminosityHighPassShader.js")
Get-File 'js/lib/draco/draco_decoder.js' 200000 @("$C/examples/js/libs/draco/draco_decoder.js")
Get-File 'js/lib/draco/draco_wasm_wrapper.js' 15000 @("$C/examples/js/libs/draco/draco_wasm_wrapper.js")
Get-File 'js/lib/draco/draco_decoder.wasm' 150000 @("$C/examples/js/libs/draco/draco_decoder.wasm")
Get-File 'js/lib/pixi.min.js' 300000 @('https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js','https://unpkg.com/pixi.js@6.5.10/dist/browser/pixi.min.js')

# --- 10 quai ---
Get-File 'assets/models/monsters/fox.glb' 100000 @("$K1/Fox/glTF-Binary/Fox.glb","$K2/Fox/glTF-Binary/Fox.glb")
Get-File 'assets/models/monsters/cesiumman.glb' 80000 @("$K1/CesiumMan/glTF-Binary/CesiumMan.glb","$K2/CesiumMan/glTF-Binary/CesiumMan.glb")
Get-File 'assets/models/monsters/horse.glb' 100000 @("$T1/Horse.glb","$T2/Horse.glb")
Get-File 'assets/models/monsters/parrot.glb' 100000 @("$T1/Parrot.glb","$T2/Parrot.glb")
Get-File 'assets/models/monsters/flamingo.glb' 100000 @("$T1/Flamingo.glb","$T2/Flamingo.glb")
Get-File 'assets/models/monsters/stork.glb' 100000 @("$T1/Stork.glb","$T2/Stork.glb")
Get-File 'assets/models/monsters/xbot.glb' 100000 @("$T1/Xbot.glb","$T2/Xbot.glb")
Get-File 'assets/models/monsters/soldier.glb' 100000 @("$T1/Soldier.glb","$T2/Soldier.glb")
Get-File 'assets/models/monsters/robot.glb' 100000 @("$T1/RobotExpressive/RobotExpressive.glb","$T2/RobotExpressive/RobotExpressive.glb")
Get-File 'assets/models/monsters/rigged.glb' 80000 @("$K1/RiggedFigure/glTF-Binary/RiggedFigure.glb","$T1/Michelle.glb","$T2/Michelle.glb")

# --- 5 boss ---
Get-File 'assets/models/bosses/monster.glb' 1000000 @("$K1/Monster/glTF-Binary/Monster.glb","$K2/Monster/glTF-Binary/Monster.glb")
Get-File 'assets/models/bosses/dragon.glb' 800000 @("$T1/DragonAttenuation.glb","$T2/DragonAttenuation.glb")
Get-File 'assets/models/bosses/brainstem.glb' 400000 @("$K1/BrainStem/glTF-Binary/BrainStem.glb","$K2/BrainStem/glTF-Binary/BrainStem.glb")
Get-File 'assets/models/bosses/helmet.glb' 400000 @("$T1/DamagedHelmet/glTF-Binary/DamagedHelmet.glb","$T2/DamagedHelmet/glTF-Binary/DamagedHelmet.glb")
Get-File 'assets/models/bosses/michelle.glb' 800000 @("$T1/Michelle.glb","$T2/Michelle.glb")

Write-Output 'DONE-ALL'
