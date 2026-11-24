# click_map.ps1 — focus window, click the "Địa Đồ" button, capture the result.
# Button geometry (client 1600x900, map panel centered):
#   BtnMap : right=12, top=58, size 78x28  -> x [1510,1588], y [58,86]
#   BtnTeam: right=96, top=58, size 82x28  -> x [1422,1504], y [58,86]
param(
    [string]$Target = 'map',
    [string]$Out = '_qa\clicked.png',
    [int]$X = 0,
    [int]$Y = 0
)

$cs = @"
using System;
using System.Runtime.InteropServices;
public class Clk {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, int d, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
try { Add-Type $cs } catch { Add-Type $cs -ErrorAction SilentlyContinue }

$p = Get-Process QuocCocBatHoang3D -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $p) { Write-Output 'NO_GAME'; exit 1 }
$h = [IntPtr]$p.MainWindowHandle
$r = New-Object Clk+RECT
[Clk]::GetWindowRect($h, [ref]$r) | Out-Null
$winX = $r.Left; $winY = $r.Top
Write-Output "window at $winX,$winY  client=$($r.Right-$r.Left)x$($r.Bottom-$r.Top)"

if ($Target -eq 'map')   { $X = 1549; $Y = 72 }
if ($Target -eq 'team')  { $X = 1463; $Y = 72 }
# screen coords = window origin + client coord (client top-left == window top-left for borderless-canvas apps)
$sx = $winX + $X; $sy = $winY + $Y

[Clk]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 350
[Clk]::SetCursorPos($sx, $sy) | Out-Null
Start-Sleep -Milliseconds 150
[Clk]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)  # left down
Start-Sleep -Milliseconds 70
[Clk]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)  # left up
Write-Output "clicked $Target at screen $sx,$sy"

Start-Sleep -Milliseconds 500
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\harness.ps1" -Action capture -Out $Out
