# MVL3D — tai lai cac file that bai (them nguon du phong)
$ErrorActionPreference = 'Continue'
$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'

function Get-File($out, $min, $urls) {
  if (Test-Path $out) {
    $len = (Get-Item $out).Length
    if ($len -ge $min) { Write-Output ("SKIP {0} {1}" -f $out, $len); return $true }
  }
  foreach ($u in $urls) {
    for ($try = 0; $try -lt 2; $try++) {
      curl.exe -sSL -A $UA --retry 3 --connect-timeout 25 -o $out $u 2>$null
      if (Test-Path $out) {
        $len = (Get-Item $out).Length
        $okMagic = $true
        if ($out -like '*.glb') {
          $fs = [IO.File]::OpenRead((Resolve-Path $out)); $b = New-Object byte[] 4
          $fs.Read($b, 0, 4) | Out-Null; $fs.Close()
          $okMagic = ([Text.Encoding]::ASCII.GetString($b) -eq 'glTF')
        }
        if ($len -ge $min -and $okMagic) { Write-Output ("OK {0} {1}" -f $out, $len); return $true }
        Remove-Item $out -Force -ErrorAction SilentlyContinue
      }
    }
    Write-Output ("FALLBACK {0} <- {1}" -f $out, $u)
  }
  Write-Output ("FAIL {0}" -f $out)
  return $false
}

$N147 = 'https://cdn.jsdelivr.net/npm/three@0.147.0'
$N147U = 'https://unpkg.com/three@0.147.0'
$KR = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0'
$KG = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0'
$KH = 'https://raw.githack.com/KhronosGroup/glTF-Sample-Models/master/2.0'
$KS = 'https://cdn.statically.io/gh/KhronosGroup/glTF-Sample-Models/master/2.0'
$TR = 'https://raw.githubusercontent.com/mrdoob/three.js/r147/examples/models/gltf'
$TG = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r147/examples/models/gltf'
$TD = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf'

# thu vien post-processing (min nho hon)
Get-File 'js/lib/shaders/CopyShader.js' 600 @("$N147/examples/js/shaders/CopyShader.js","$N147U/examples/js/shaders/CopyShader.js")
Get-File 'js/lib/shaders/LuminosityHighPassShader.js' 800 @("$N147/examples/js/shaders/LuminosityHighPassShader.js","$N147U/examples/js/shaders/LuminosityHighPassShader.js")
Get-File 'js/lib/post/EffectComposer.js' 6000 @("$N147/examples/js/postprocessing/EffectComposer.js","$N147U/examples/js/postprocessing/EffectComposer.js")
Get-File 'js/lib/post/RenderPass.js' 1500 @("$N147/examples/js/postprocessing/RenderPass.js","$N147U/examples/js/postprocessing/RenderPass.js")
Get-File 'js/lib/post/ShaderPass.js' 1500 @("$N147/examples/js/postprocessing/ShaderPass.js","$N147U/examples/js/postprocessing/ShaderPass.js")
Get-File 'js/lib/post/MaskPass.js' 1500 @("$N147/examples/js/postprocessing/MaskPass.js","$N147U/examples/js/postprocessing/MaskPass.js")

# chim (three.js tag r147)
Get-File 'assets/models/monsters/parrot.glb' 80000 @("$TR/Parrot.glb","$TG/Parrot.glb","$TD/Parrot.glb")
Get-File 'assets/models/monsters/flamingo.glb' 80000 @("$TR/Flamingo.glb","$TG/Flamingo.glb","$TD/Flamingo.glb")
Get-File 'assets/models/monsters/stork.glb' 80000 @("$TR/Stork.glb","$TG/Stork.glb","$TD/Stork.glb")

# boss Monster (Khronos, da nguon)
Get-File 'assets/models/bosses/monster.glb' 1000000 @("$KR/Monster/glTF-Binary/Monster.glb","$KH/Monster/glTF-Binary/Monster.glb","$KS/Monster/glTF-Binary/Monster.glb")

# DamagedHelmet (three.js tag r147)
Get-File 'assets/models/bosses/helmet.glb' 400000 @("$TR/DamagedHelmet/glTF-Binary/DamagedHelmet.glb","$TG/DamagedHelmet/glTF-Binary/DamagedHelmet.glb")

# RiggedFigure (neu duoc thi thay Michelle cho quai rigged)
Get-File 'assets/models/monsters/rigged_orig.glb' 300000 @("$KR/RiggedFigure/glTF-Binary/RiggedFigure.glb","$KH/RiggedFigure/glTF-Binary/RiggedFigure.glb")

Write-Output 'RETRY-DONE'
