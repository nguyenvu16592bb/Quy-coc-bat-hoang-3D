# Quỷ Cốc Bát Hoang 3D — Velo Engine

Game 3D Wuxia isometric action RPG, xây bằng **Velo Engine (branch 3d)** dựa trên thiết kế
`qu_c_c_b_t_hoang_3d.html` ở thư mục gốc repo (prototype Three.js).

## Chạy game

Cách nhanh nhất — double-click:

```
velo/quycoc3d/build/QuocCocBatHoang3D.exe
```

(exe cần thư mục `assets/` nằm cạnh nó — đã kèm sẵn trong `build/`.)

## Cách chơi

| Phím / thao tác | Chức năng |
|---|---|
| `W A S D` / phím mũi tên | Di chuyển (theo hướng camera) |
| **Click chuột trái** | Đi tới điểm click / click vào quái để lao tới đánh |
| **Kéo chuột** hoặc `Q` / `E` | Xoay camera quanh nhân vật |
| **Con lăn chuột** | Zoom 20%–85% (mặc định 35% — góc isometric rộng như thiết kế) |
| `Space` / click ô SPC | Chém Thường (tự động đánh khi đứng cạnh quái) |
| `1` – `6` | 6 tuyệt kỹ (xem bảng dưới) |
| `R` | Uống Hồi Huyết Đan (+85 HP) |
| Click nút | Phó bản (Hoa Đào / Bí Cảnh / Ma Tôn), Đột phá, Góc 3D, 3 loại đạn |

### 7 kỹ năng (đúng thiết kế HTML)

| # | Tên | MP | CD | Hiệu ứng |
|---|---|---|---|---|
| SPC | Chém Thường | 0 | 0.45s | Chém cung 3.3m + xoáy vàng nhỏ |
| 1 | Kiếm Khí Trảm | 15 | 2.2s | 3 kiếm khí vàng bay xuyên quái |
| 2 | Vạn Kiếm Quy Tông | 30 | 5.5s | Mưa 12 thanh kiếm cyan rơi AoE 4.8m |
| 3 | Bát Hoang Toàn Phong | 25 | 3.5s | Vòng xoáy vàng AoE 4.9m, nhân vật xoay tròn |
| 4 | Kim Cang Hộ Thể | 35 | 7s | Hồi 35% HP + chấn bay mọi quái 5.5m |
| 5 | Thiên Lôi Kiếm Trận | 50 | 9s | Cự kiếm giáng xuống AoE 5.8m |
| 6 | Cảnh Giới Đột Phá | 80 | 15s | Aura vàng 10s: +45% sát thương, chạy nhanh hơn |

### Tiến trình

- Bạo kích 35% (Bạo Linh Phù +35%), quái né chém thường 8%, người chơi né đòn quái 12%.
- Kill quái: thường +22 EXP, tinh anh +60, Ma Tôn +120. Lên cấp: +35 HP, +40 MP, +14 công.
- Cảnh giới mỗi 3 cấp: Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Đăng Tiên (banner + xoáy vàng).
- Nhiệm vụ: tiêu diệt 15 Yêu Thú. MP hồi 8.4/giây.
- Quái tự xuất hiện khi arena dưới 6 con; 3 phó bản gọi theo nút bên phải.

## Cấu trúc code (`velo/quycoc3d/`)

| File | Nội dung |
|---|---|
| `main.v` | Tạo app 1280×720 (scale_mode `fit`), register components |
| `game.v` | GState (máu/mana/cấp/cảnh giới/zoom/banner), camera isometric orbit, HeroController (WASD + click-to-move + raycast) |
| `world.v` | Dựng arena từ primitives: 42 đá tảng, cây cổ thụ, 2 chùa, 2 trận pháp, đèn đá, hoa linh, núi nổi + thác nước, đom đóm |
| `enemies.v` | Health + thanh máu 3D, factory quái 4 loại (yêu thú/acsó/tinh anh/Ma Tôn), AI đuổi-đánh-knockback, WaveSpawner |
| `combat.v` | 7 kỹ năng + VFX (WhirlwindFX/SwordBeam/RainSword/GiantSword), crit/né, đạn linh |
| `hud.v` | HUDSync (labels, nút, minimap dots, banner), FloatText (số sát thương nổi theo world_to_screen) |
| `assets/scenes/main.scene` | Scene DSL: môi trường, hero FBX `than_dieu_run.fbx` + kiếm gắn bone RightHand, toàn bộ HUD |
| `run_game.ps1` | Sync sang engine clone → `v run examples/quycoc3d` |
| `build_game.ps1` | Sync → `v -prod` → `build/QuocCocBatHoang3D.exe` + assets |

## Build lại

Yêu cầu: toolchain `C:\v` (V 0.5.2) + `C:\mingw64\bin` (gcc) + engine clone 3D tại
`C:\Users\Admin\Documents\GitHub\velo` (branch `3d`, đã có `core/w32_fixup.h` chống macro
Win16 `near`/`far` của MinGW).

```powershell
# chạy thử từ source
powershell -File run_game.ps1
# build exe
powershell -File build_game.ps1
```

## Ghi chú kỹ thuật đã rút kinh nghiệm khi viết game này

- V: array literal số thực (`[4.2, 3.4]`) suy thành `[]f64` — phải viết `[f32(4.2), ...]` khi vào hàm f32.
- V `-prod` biến warning "unnecessary default value of 0" thành lỗi — không đặt `= 0` cho field struct.
- Loop variable bất biến: dùng `for mut e in ...` + truyền `mut e` vào hàm nhận tham số mut.
- Engine web runtime (branch 3d) chưa có render3d → game 3D chỉ chạy desktop (native exe).
- HUD phải đặt `scale_mode: 'fit'` (mặc định `expand` đẩy widget neo phải/dưới ra ngoài màn hình trên màn DPI 120%).
- Nút HUD bấm một lần chính xác: poll `Button.clicked` rồi tự xoá (quy tắc single-fire của merge-game).
