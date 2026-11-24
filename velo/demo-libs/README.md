# PixiJS + Phaser kết hợp với Velo Engine

Cả hai thư viện đã nằm sẵn tại `demo-libs/vendor/` (tải local, chạy offline):

- `phaser.min.js` — Phaser 3.87 (bundle UMD, 1.19 MB)
- `pixi.min.js` — PixiJS 8.6 (bundle UMD, 666 KB)

## Mở thử

```powershell
cd C:\New folder\Hangrong\merge-game
# nếu server chưa chạy:
cd build\webgl; python -m http.server 8090
# rồi mở:
# http://localhost:8090/../demo-libs/demo-libs.html
# (hoặc mở thẳng file demo-libs\demo-libs.html bằng trình duyệt)
```

Trang demo có 3 phần chạy đồng thời: game Velo (iframe) + canvas PixiJS (HUD/particles) + màn menu Phaser, kèm 2 nút chuyển menu ↔ game.

## Vì sao "kết hợp" hoạt động như thế này

Velo engine xuất bản **WebGL canvas riêng** (giống PixiJS/Phaser — cả ba đều là engine JS/WebGL độc lập, không phải plugin của nhau). Vì vậy kết hợp thật sự có 3 mô hình:

1. **PixiJS làm overlay HUD** (khuyên dùng): đặt canvas Pixi `position:absolute` phủ lên canvas Velo, `pointer-events:none`. Pixi lo phần hiệu ứng/hiển thị (chữ bay, damage number, khung viền), Velo lo gameplay. Đồng bộ dữ liệu qua một object global `window.gameBridge = { coins, level, ... }`.

2. **Phaser làm khung app**: Phaser chạy màn menu / chọn map / settings; khi vào trận thì ẩn canvas Phaser, hiện canvas (hoặc iframe) Velo. Đúng như demo ở trên.

3. **Dùng hẳn 1 engine thay thế**: viết lại game bằng Phaser hoặc Pixi thuần — tốn công nhất, không nên vì Velo đã chạy web OK.

## Lưu ý khi build web

Thư mục `build\webgl` bị `build_web.ps1` **xóa và tạo lại mỗi lần build** — đừng đặt file tĩnh vào đó. `demo-libs/` nằm ngoài nên giữ được. Khi đưa lên hosting, copy cả `build\webgl` + `demo-libs` lên cùng cấp.

## API nhanh

```html
<script src="vendor/pixi.min.js"></script>
<script src="vendor/phaser.min.js"></script>
<script>
  // Pixi
  const app = new PIXI.Application();
  await app.init({ width: 540, height: 960, backgroundAlpha: 0 });
  document.body.appendChild(app.canvas);

  // Phaser
  new Phaser.Game({
    type: Phaser.AUTO, width: 540, height: 960,
    scene: { create() { this.add.text(270, 100, 'Menu', { fontSize: '30px' }).setOrigin(0.5); } }
  });
</script>
```
