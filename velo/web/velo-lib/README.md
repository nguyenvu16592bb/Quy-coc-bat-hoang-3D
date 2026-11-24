# Velo Engine JS — standalone library build

`velo-engine.js` là **bản bundle đầy đủ duy nhất** của game web:
Velo engine runtime (v2js — core/render/kine2d/audio/serialize/...) **+ PixiJS + các plugin**
(pixi-hud, kine2d-check, live-reload) — tất cả trong **1 file**, không còn
"mỗi thư viện một nẻo".

## Cách dùng

Mọi thứ chạy qua đúng 1 script tag trong `build/webgl/index.html`:

```html
<script type="module" src="game.XXXX.js"></script>
```

- `build/webgl/game.*.js` = bản chính thức (hash theo nội dung).
- `web/velo-lib/velo-engine.js` = bản copy để tham chiếu / nhúng vào nơi khác.

## Velo runtime đã có sẵn trong bundle

- `core` — Node/Component/Scene/Tween/Input/Store
- `render` — Sprite/Label/Panel/ScrollView/ParticleSystem/SpriteAnimator
- `kine2d` — skeletal animation (boss sói từ .kine)
- `audio` — AudioSource / mixer
- `serialize` — .scene / prefab loader
- `assets` — AssetDatabase (resolve/load texture, text, audio, scene)

Truy cập runtime từ bảng điều khiển: `window.velo` (scene, store, fit, registry...).

## Chạy local

```powershell
# cách 1 — double-click:
web\start_server.bat
# cách 2 — thủ công:
cd C:\New folder\Hangrong\merge-game
python -m http.server 8090
# mở: http://localhost:8090/build/webgl/
```

⚠ **Không mở `index.html` bằng double-click** (file://) — trình duyệt chặn
tải asset. Luôn dùng server local (python) — không cần internet.

## Rebuild bundle

Sửa code/plugin → chạy:

```powershell
powershell -ExecutionPolicy Bypass -File build_web.ps1
# hoặc auto: powershell -ExecutionPolicy Bypass -File watch_web.ps1
```
