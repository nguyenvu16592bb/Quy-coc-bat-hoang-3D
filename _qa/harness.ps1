# harness.ps1 — QA helpers: find the game window, send virtual keys, capture PNG.
param(
    [string]$Action = 'help',
    [string]$Out = '',
    [int]$Vk = 0,
    [int]$Sleep = 700
)

$sig = @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class Win {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll", SetLastError=true)] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool mouse_event(uint f, int dx, int dy, int d, IntPtr e);
  public struct RECT { public int Left, Top, Right, Bottom; }
  public static List<IntPtr> List(uint pid) {
    var res = new List<IntPtr>();
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p==pid && IsWindowVisible(h)) res.Add(h); return true; }, IntPtr.Zero);
    return res;
  }
  public static string Title(IntPtr h){ var sb=new StringBuilder(512); GetWindowText(h,sb,512); return sb.ToString(); }
}
"@
Add-Type -AssemblyName System.Drawing
try { Add-Type $sig } catch { Add-Type $sig -ErrorAction SilentlyContinue }
[Win]::SetProcessDPIAware() | Out-Null

$proc = Get-Process QuocCocBatHoang3D -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) { Write-Output 'NO_GAME'; exit 1 }
$hs = [Win]::List([uint32]$proc.Id)
if ($hs.Count -eq 0) { Write-Output 'NO_WINDOW'; exit 1 }
$h = $hs[0]

switch ($Action) {
    'title' { Write-Output ([Win]::Title($h)) }
    'key' {
        [Win]::PostMessage($h, 0x0100, [IntPtr]$Vk, [IntPtr]0) | Out-Null
        Start-Sleep -Milliseconds 60
        [Win]::PostMessage($h, 0x0101, [IntPtr]$Vk, [IntPtr]0) | Out-Null
        Write-Output ("sent 0x{0:X2}" -f $Vk)
    }
    'click' {
        # screen coordinates (window is at 0,0 after SetForegroundWindow)
        [Win]::SetForegroundWindow($h) | Out-Null
        Start-Sleep -Milliseconds 300
        [Win]::SetCursorPos([int]$env:QA_X, [int]$env:QA_Y) | Out-Null
        Start-Sleep -Milliseconds 120
        [Win]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero) | Out-Null
        Start-Sleep -Milliseconds 70
        [Win]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero) | Out-Null
        Write-Output ("clicked {0},{1}" -f $env:QA_X, $env:QA_Y)
    }
    'capture' {
        [Win]::SetForegroundWindow($h) | Out-Null
        Start-Sleep -Milliseconds 500
        $r = New-Object Win+RECT
        [Win]::GetClientRect($h, [ref]$r) | Out-Null
        $w = $r.Right - $r.Left
        $ht = $r.Bottom - $r.Top
        $bmp = New-Object System.Drawing.Bitmap $w, $ht
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $dc = $g.GetHdc()
        [Win]::PrintWindow($h, $dc, 2) | Out-Null
        $g.ReleaseHdc($dc); $g.Dispose()
        $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Output ("saved {0} {1}x{2} bytes={3}" -f $Out, $w, $ht, (Get-Item $Out).Length)
    }
    default { Write-Output 'actions: title | key -Vk n | click | capture -Out path' }
}
