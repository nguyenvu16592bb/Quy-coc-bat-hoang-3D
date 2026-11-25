# MVL3D — watcher tu kiem thu (polling): doi file la chay lai kiem tra
# Ghi ket qua vao tests/watch.log (monitor cua AutoClaw doc log nay)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$log = Join-Path $root 'tests\watch.log'
$testJs = Join-Path $root 'tests\test-mvl3d.js'

function Write-Log($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -Path $log -Value "[$ts] $msg"
}

Write-Log "watcher khoi dong (polling 3s - js/, css/, index.html)"

function Snapshot-Targets {
  $map = @{}
  $files = @(Get-ChildItem (Join-Path $root 'js') -Recurse -File -Filter '*.js' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\lib\\' })
  $files += Get-ChildItem (Join-Path $root 'css') -File -Filter '*.css' -ErrorAction SilentlyContinue
  $files += Get-Item (Join-Path $root 'index.html') -ErrorAction SilentlyContinue
  foreach ($f in $files) {
    $map[$f.FullName] = (Get-FileHash $f.FullName -Algorithm MD5 -ErrorAction SilentlyContinue).Hash
  }
  return $map
}

$known = Snapshot-Targets

while ($true) {
  Start-Sleep -Seconds 3
  try {
    $now = Snapshot-Targets
    $changed = @()
    foreach ($k in $now.Keys) {
      if (-not $known.ContainsKey($k) -or $known[$k] -ne $now[$k]) { $changed += $k }
    }
    foreach ($k in @($known.Keys)) {
      if (-not $now.ContainsKey($k)) { $changed += $k }
    }
    if ($changed.Count -gt 0) {
      $names = ($changed | ForEach-Object { Split-Path $_ -Leaf }) -join ', '
      foreach ($c in $changed) {
        $ext = [IO.Path]::GetExtension($c).ToLower()
        $relName = Split-Path $c -Leaf
        if ($ext -eq '.js') {
          $out = node --check $c 2>&1
          if ($LASTEXITCODE -eq 0) { Write-Log "SYNTAX PASS $relName" }
          else { Write-Log "SYNTAX FAIL $relName :: $($out | Out-String)" }
        }
      }
      $t = node $testJs 2>&1
      if ($LASTEXITCODE -eq 0) { Write-Log "DATA PASS (doi: $names)" }
      else { Write-Log "DATA FAIL :: $($t | Out-String)" }
      $known = $now
    }
  } catch {
    Write-Log "WATCHER-ERR $($_.Exception.Message)"
  }
}
