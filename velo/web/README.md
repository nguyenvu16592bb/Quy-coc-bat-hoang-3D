# Web development kit cho merge-game (bản Velo web)

Thư mục `web/` chứa toàn bộ công cụ phát triển bản web — không đụng vào `src/`, `tools/` gốc của dự án.

## Cấu trúc

```
web/
├── plugins/
│   ├── velo-pixi-hud.js   ← plugin PixiJS: overlay HUD (coins/level/scene) phủ lên game
│   └── live-reload.js     ← tự reload trang khi build mới xong (hot reload)
├── vendor/
│   └── pixi.min.js        ← PixiJS 8.6 (local, chạy offline)
├── start_server.bat       ← double-click: chạy game OFFLINE + mở trình duyệt
└── README.md
```

## 4 cách dùng

### 1. Chạy offline (không cần internet) — nhanh nhất
```powershell
# double-click file này, hoặc gõ:
C:\New folder\Hangrong\merge-game\web\start_server.bat
# → mở http://localhost:8090/build/webgl/
```
Chỉ cần máy có Python. Game + Pixi + Phaser đều là file local — **không tải gì từ mạng**.

### 2. Chạy online (đưa lên web thật)
Copy 2 thư mục lên hosting tĩnh bất kỳ (Netlify / Vercel / GitHub Pages):
- `build\webgl\` → game
- `demo-libs\` → trang demo Pixi + Phaser

Ví dụ Netlify: kéo thả `build\webgl` vào https://app.netlify.com/drop là xong (URL public ngay).

### 3. Kiểm thử KHÔNG cần build mỗi lần — hot reload
```powershell
powershell -ExecutionPolicy Bypass -File C:\New folder\Hangrong\merge-game\watch_web.ps1
```
Giữ cửa sổ đó mở. Mỗi lần sửa `*.v` / `*.scene` / asset → tự build → **trang trình duyệt tự tải lại**. Chỉ cần F5 không còn nữa.

### 4. Build thủ công (khi muốn)
```powershell
powershell -ExecutionPolicy Bypass -File C:\New folder\Hangrong\merge-game\build_web.ps1
```

## Plugin PixiJS hoạt động thế nào

`velo-pixi-hud.js` tạo **canvas Pixi trong suốt phủ lên canvas Velo**
(`pointer-events:none` — không chặn thao tác game), đọc trạng thái game
mỗi giây qua bridge `window.velo.store` (coins, level, scene) và vẽ HUD
+ hiệu ứng sparkle. Toàn bộ nằm trong try/catch — lỗi plugin không bao giờ
làm hỏng game.

Thêm hiệu ứng của bạn vào `web/plugins/velo-pixi-hud.js` (damage number,
vòng sáng quanh quân, banner…) rồi chạy lại `build_web.ps1` hoặc để
`watch_web.ps1` tự làm.

## Lưu ý

- `build\webgl` bị **xóa mỗi lần build** — mọi thứ phải nằm trong `web\plugins` / `web\vendor` để được inject lại tự động.
- Không mở `index.html` bằng cách double-click (file://) — trình duyệt chặn fetch asset. Luôn dùng server (start_server.bat hoặc watch_web.ps1).
