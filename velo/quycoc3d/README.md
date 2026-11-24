# Quỷ Cốc Bát Hoang 3D — Velo Engine

Game 3D Wuxia isometric action RPG, xây bằng **Velo Engine (branch 3d)** dựa trên thiết kế
`velo/web/qu_c_c_b_t_hoang_3d.html` (prototype Three.js — file đã chuyển từ thư mục gốc
repo vào `velo/web/`).

> **Bản mở rộng Mộng Võ Lâm:** xem [../../docs/MONG_VO_LAM.md](../../docs/MONG_VO_LAM.md)
> để biết đầy đủ các hệ thống mới (môn phái, kinh tế, trang bị, pet, bang hội, nhiệm vụ,
> hoạt động ngày, PvP, lưu game) + số liệu thật + giới hạn chưa test được.

## Chạy game

⚠️ **File `.exe` KHÔNG có trong repo.** Thư mục `build/` hiện chỉ chứa `assets/` trùng lặp
và 4 file log rỗng — không có `QuocCocBatHoang3D.exe`. Muốn chơi bản V phải build lại
từ source trên máy Windows có toolchain V (xem mục "Build lại" bên dưới), sau đó
double-click file exe vừa build xong:

```
velo/quycoc3d/build/QuocCocBatHoang3D.exe
```

(exe cần thư mục `assets/` nằm cạnh nó.)

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

### Hệ thống mới — Mộng Võ Lâm (8 file V mới, xem chi tiết ở `docs/MONG_VO_LAM.md`)

| Hệ thống | File | Số liệu chính |
|---|---|---|
| Môn phái | `sects.v` (369 dòng) | 8 phái (Thiếu Lâm, Võ Đang, Nga Mi, Cái Bang, Đường Môn, Minh Giáo, Toàn Chân, Cổ Mộ); mỗi phái +atk/hp/def/crit + 2 kỹ năng riêng; nhập phái: cấp 5 + 100 vàng, thưởng 300 vàng + 200 EXP; đổi phái 500 vàng |
| Kinh tế / chợ | `economy.v` (319 dòng) | 3 loại tiền (vàng khởi đầu 500, bạc 2000, linh thạch); shop 10 món; phí chợ 5%; `spend_*` từ chối số âm/thiếu tiền, số dư không âm |
| Trang bị | `equipment.v` (555 dòng) | 6 slot (vũ khí/áo/mũ/giày/nhẫn/dây chuyền), 12 món, 6 loại ngọc, bảng rơi đồ 10 dòng; cường hóa tối đa +10, phí `100×(cấp+1)` vàng, tỉ lệ `100−cấp×10`% (sàn 10%), mỗi cấp +8% chỉ số gốc, roll deterministic |
| Pet / thần thú | `pets.v` (240 dòng) | 6 pet (Thanh Long, Bạch Hổ, Chu Tước, Huyền Vũ, Kỳ Lân, Cửu Vĩ Hồ); tiến hóa tối đa 5–6 cấp, mỗi cấp +12% công / +10% HP; cho ăn tăng 1 cấp |
| Bang hội | `guild.v` (246 dòng) | 4 bang; lập bang 1000 vàng (bang tự lập id 99); buff +1 công/100 điểm cống hiến (tối đa +30); boss bang Ma Tôn Hộ Pháp 50.000 HP, thưởng tối đa 2000 vàng + 20 linh thạch; chat bang chỉ là log nội bộ |
| Nhiệm vụ chính | `quests.v` (526 dòng) | 20 nhiệm vụ chuỗi (kill/collect/map), thưởng trả đúng 1 lần; 7 hoạt động ngày (giới hạn lượt/ngày); 5 sự kiện theo giờ (9–10h, 12–13h, 20–21h, 21–22h, 23–0h) |
| PvP / boss thế giới | `pvp.v` | Đấu trường **giả lập** (8 đối thủ bot theo hạng 1000→10); thắng +25 điểm, thua −15, hạng 1 khi ≥9990 điểm; boss thế giới Thiên Ma Tôn Chủ 200.000 HP, 20–21h, thưởng 5000 vàng + 50 linh thạch |
| Lưu game | `save.v` (227 dòng) | `save_game()` → chuỗi JSON trong bộ nhớ, `load_game()` đọc lại + clamp giá trị ngoài khoảng; **chưa ghi file thật** — cần launcher/bridge nối vào nơi lưu bền |

**GState mới** (`game.v`): `sect_id = -1`, `def`, `gold = 500`, `silver = 2000`,
`inventory []int`, `equip_slots [6]int = [-1 × 6]`, `equip_level [6]int`,
`gem_slots [6]int = [-1 × 6]`, `pet_id = -1`, `pet_level = 1`, `pet_evo`,
`guild_id = -1`, `guild_name`, `guild_contrib`, `guild_total_contrib`, `guild_log []string`,
`quest_current`, `quest_progress [20]int`, `quest_done [20]bool`, `daily_count [7]int`,
`pvp_rank = 1000`, `pvp_points`, `pvp_wins`, `pvp_losses`, `world_boss_dmg`.
Toàn bộ field cũ giữ nguyên (level 10, hp 180, atk 68, crit 0,35…).

⚠️ **Lệch mirror với bản HTML** (harness `tests/test-mongvolam.js` mục E báo FAIL):
pet 6 (V) vs 3 (HTML), bang 4 vs 3, sự kiện 5 vs 3, vàng khởi đầu 500 vs 455,
bạc 2000 vs 40932, shop 10 vs 12 món, trang bị 12 vs 13 món; chỉ số phái, phí đổi phái
và cơ chế lưu cũng khác nhau. Cần chốt một bộ số chung trước khi coi hai bản là một game.

## Cấu trúc code (`velo/quycoc3d/`)

| File | Nội dung |
|---|---|
| `main.v` | Tạo app 1280×720 (scale_mode `fit`), register components |
| `game.v` | GState (máu/mana/cấp/cảnh giới/zoom/banner + field mới: môn phái/tiền/trang bị/pet/bang/nhiệm vụ/PvP), camera isometric orbit, HeroController (WASD + click-to-move + raycast) |
| `sects.v` | 8 môn phái + nhập/đổi phái + kỹ năng phái |
| `economy.v` | Vàng/bạc/linh thạch, shop 10 món, mua/bán, phí chợ 5% |
| `equipment.v` | 6 slot trang bị, 12 món, 6 ngọc, cường hóa +10, bảng rơi đồ |
| `pets.v` | 6 thần thú, tiến hóa, cho ăn |
| `guild.v` | 4 bang hội, cống hiến, boss bang, log bang nội bộ |
| `quests.v` | 20 nhiệm vụ chính, 7 hoạt động ngày, 5 sự kiện theo giờ |
| `pvp.v` | Đấu trường giả lập (8 đối thủ bot), xếp hạng, boss thế giới |
| `save.v` | Lưu/tải game dạng JSON (trong bộ nhớ, chưa ghi file thật) |
| `world.v` | Dựng arena từ primitives: 42 đá tảng, cây cổ thụ, 2 chùa, 2 trận pháp, đèn đá, hoa linh, núi nổi + thác nước, đom đóm |
| `enemies.v` | Health + thanh máu 3D, factory quái 4 loại (yêu thú/acsó/tinh anh/Ma Tôn), AI đuổi-đánh-knockback, WaveSpawner |
| `combat.v` | 7 kỹ năng + VFX (WhirlwindFX/SwordBeam/RainSword/GiantSword), crit/né, đạn linh |
| `hud.v` | HUDSync (labels, nút, minimap dots, banner), FloatText (số sát thương nổi theo world_to_screen) |
| `assets/scenes/main.scene` | Scene DSL: môi trường, hero FBX `than_dieu_run.fbx` + kiếm gắn bone RightHand, toàn bộ HUD |
| `run_game.ps1` | Sync sang engine clone → `v run examples/quycoc3d` |
| `build_game.ps1` | Sync → `v -prod` → `build/QuocCocBatHoang3D.exe` + assets |

## Build lại

⚠️ **Chưa biên dịch được ở đây:** VM này không có toolchain V/Windows nên 8 file V mới
chỉ được kiểm bằng regex + đếm (harness `tests/test-mongvolam.js`), **không qua compiler V**.
`build_err.txt` ở gốc repo cho thấy lần build gần nhất trên máy user còn notice
(ví dụ `webp/webp.v:157: shifting a value from a signed type int can change the sign`).
Sau khi thêm file mới, cần build lại trên máy Windows có toolchain để xác nhận biên dịch sạch.

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
