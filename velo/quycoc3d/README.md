# Quỷ Cốc Bát Hoang 3D — Velo Engine

Game 3D Wuxia isometric action RPG, xây bằng **Velo Engine (branch 3d)** dựa trên thiết kế
`velo/web/qu_c_c_b_t_hoang_3d.html` (prototype Three.js — file đã chuyển từ thư mục gốc
repo vào `velo/web/`).

> **Bản mở rộng Mộng Võ Lâm:** xem [../../docs/MONG_VO_LAM.md](../../docs/MONG_VO_LAM.md)
> để biết đầy đủ các hệ thống mới (môn phái, kinh tế, trang bị, pet, bang hội, nhiệm vụ,
> hoạt động ngày, PvP, lưu game) + số liệu thật + giới hạn chưa test được.
>
> **Battle vòng 2** (docs mục 3.12–3.15): formation 5 người (3 hàng tank/dps/healer),
> auto-battle (đan khi HP < 25%), raid boss Cóc Xanh 3 phase (66%/33%, 3 quái con/lần),
> combo 3s / nộ + damage log 50 dòng, tốc độ x1/x2, tạm dừng/bỏ qua, cường hóa +10
> (thất bại rớt tối đa −1) + 6 loại ngọc, PvP UI + thưởng ngày, thị trấn an toàn,
> 4 panel mới (`BattlePanel` / `TownPanel` / `EnhancePanel` / `PvpPanel` trong
> `assets/scenes/main.scene` — đã có đủ 4 node). 6 lệch số liệu vòng 2 đã khớp
> cả hai bản (đội hình `{0,1,2,5,7}`, ngưỡng uống đan 25%, quái con [3,3], combo 3s,
> log 50 dòng, roll có `attempts×29`).
>
> **Chuẩn chung vòng 3** (docs mục 3.17.2): nộ khí = Nộ Trảm tay, AoE raid = 90 dmg,
> boss thế giới +5000 vàng + 50 linh thạch + 5 Đá Cường Hóa, boss raid Kim Thiềm Vương
> 20000 HP / 120s / 3 phase — **đã hạ cánh cả hai bản** (V: `battle_rage_slash`,
> `raid_aoe_dmg = 90`, `world_boss_fight` + `inventory_add(8)` × 5,
> `raid_boss_max_hp = 20000`; thêm tank aggro thật `battle_taunt` 6s).
> Kiểm tra bằng `node ../../tests/test-battle-mvl.js` (từ gốc repo).
>
> **Module vòng 3** (docs mục 3.16–3.17): bản web đã tách thành shell 358 dòng +
> `quycoc.css` 191 dòng + `js/00–05` (tổng 3811 dòng) + `js/06-expand.js` mới của
> nhóm 2 (tọa kỵ 6, thời trang 8, VIP 6 cấp, bang chiến 19–20h, môn phái chiến,
> thư/chat, xếp hạng 20 NPC, F1/F2/F3) — xem mục "Sơ đồ module web" bên dưới.
> File V mới `mounts.v`/`fashion.v`/`guildwar.v`/`vip.v` chưa có.

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

### Hệ thống mới — Mộng Võ Lâm (10 file V mới, xem chi tiết ở `docs/MONG_VO_LAM.md`)

| Hệ thống | File | Số liệu chính |
|---|---|---|
| Môn phái | `sects.v` (369 dòng) | 8 phái (Thiếu Lâm, Võ Đang, Nga Mi, Cái Bang, Đường Môn, Minh Giáo, Toàn Chân, Cổ Mộ); mỗi phái +atk/hp/def/crit + 2 kỹ năng riêng; nhập phái: cấp 5 + 100 vàng, thưởng 300 vàng + 200 EXP; đổi phái 500 vàng |
| Kinh tế / chợ | `economy.v` (319 dòng) | 3 loại tiền (vàng khởi đầu 455, bạc 40932, linh thạch); shop 12 món; phí chợ 5%; `spend_*` từ chối số âm/thiếu tiền, số dư không âm |
| Trang bị | `equipment.v` (555 dòng) | 6 slot (vũ khí/áo/mũ/giày/nhẫn/dây chuyền), 13 món, 6 loại ngọc, bảng rơi đồ 12 dòng; cường hóa tối đa +10, phí `100×(cấp+1)` vàng, tỉ lệ `100−cấp×10`% (sàn 10%), mỗi cấp +8% chỉ số gốc, roll deterministic |
| Pet / thần thú | `pets.v` (240 dòng) | 6 pet (Thanh Long, Bạch Hổ, Chu Tước, Huyền Vũ, Kỳ Lân, Cửu Vĩ Hồ); tiến hóa tối đa 5–6 cấp, mỗi cấp +12% công / +10% HP; cho ăn tăng 1 cấp |
| Bang hội | `guild.v` (246 dòng) | 4 bang; lập bang 1000 vàng (bang tự lập id 99); buff +1 công/100 điểm cống hiến (tối đa +30); boss bang Ma Tôn Hộ Pháp 50.000 HP, thưởng tối đa 2000 vàng + 20 linh thạch; chat bang chỉ là log nội bộ |
| Nhiệm vụ chính | `quests.v` (526 dòng) | 20 nhiệm vụ chuỗi (kill/collect/map), thưởng trả đúng 1 lần; 7 hoạt động ngày (giới hạn lượt/ngày); 5 sự kiện theo giờ (9–10h, 12–13h, 20–21h, 21–22h, 23–0h) |
| PvP / boss thế giới | `pvp.v` | Đấu trường **giả lập** (8 đối thủ bot theo hạng 1000→10); thắng +25 điểm, thua −15, hạng 1 khi ≥9990 điểm; boss thế giới Thiên Ma Tôn Chủ 200.000 HP, 20–21h, thưởng (gây ≥20000 dmg) 5000 vàng + 50 linh thạch + 5 Đá Cường Hóa |
| Lưu game | `save.v` (227 dòng) | `save_game()` → chuỗi JSON trong bộ nhớ, `load_game()` đọc lại + clamp giá trị ngoài khoảng; **chưa ghi file thật** — cần launcher/bridge nối vào nơi lưu bền |

**GState mới** (`game.v`): `sect_id = -1`, `def`, `gold = 455`, `silver = 40932`,
`inventory []int`, `equip_slots [6]int = [-1 × 6]`, `equip_level [6]int`,
`gem_slots [6]int = [-1 × 6]`, `pet_id = -1`, `pet_level = 1`, `pet_evo`,
`guild_id = -1`, `guild_name`, `guild_contrib`, `guild_total_contrib`, `guild_log []string`,
`quest_current`, `quest_progress [20]int`, `quest_done [20]bool`, `daily_count [7]int`,
`pvp_rank = 1000`, `pvp_points`, `pvp_wins`, `pvp_losses`, `world_boss_dmg`.
**GState battle mới** (`battle_map.v` / `town.v`): `hero_ids_extra [2]int = [5, 7]`,
`party_size`, `auto_battle`, `battle_combo`, `battle_combo_t`, `battle_phase = 1`,
`raid_active`, `in_town`, `show_town`, `battle_log []string`.
Toàn bộ field cũ giữ nguyên (level 10, hp 180, atk 68, crit 0,35…).

⚠️ **Lệch mirror với bản HTML** (chuẩn MAX vòng 2 đã chốt — xem docs bảng 3.15):
pet/bang/sự kiện/vàng/bạc/chợ/trang bị đã khớp cả hai bản; 6 lệch battle vòng 2
cũng đã khớp (đội hình `{0,1,2,5,7}`, ngưỡng uống đan 25%, quái con raid [3,3],
combo 3s, log 50 dòng, roll có `attempts×29` cả hai bản; thưởng ngày PvP
+150/+300/+50 đã có ở V qua `claim_pvp_daily()`). Chuẩn chung vòng 3
(Nộ Trảm tay, AoE 90, boss TG +50 linh thạch + 5 Đá Cường Hóa, boss raid
Kim Thiềm Vương 20000 HP) cũng đã khớp cả hai bản. Còn khác nhau: chỉ số phái,
phí đổi phái, cơ chế lưu.

### Hệ thống battle vòng 2 — trạng thái phía V (lần kiểm chứng cuối)

| Hệ thống | File / vị trí | Trạng thái thật |
|---|---|---|
| Formation 5 (3 hàng tank/dps/healer) | `battle_map.v` | ✅ Có — `battle_party_max = 5`, `hero_role`, `expand_party_to_five()` (đội hình mặc định `{0,1,2,5,7}` khớp HTML) |
| Auto-battle | `battle_map.v` | ✅ Có — `toggle_auto_battle` + `auto_battle_tick` 0.9s (uống đan HP < 25%, khớp HTML) |
| Raid boss Cóc Xanh 3 phase | `battle_map.v` | ✅ Có — `start_raid_boss`, phase 66%/33%, 3 quái con/lần (khớp HTML), AoE cảnh báo 1,2s; boss raid Kim Thiềm Vương 20000 HP (`raid_boss_max_hp`, ép HP boss về 20000 — khớp HTML); AoE raid 90 dmg (`raid_aoe_dmg`, khớp HTML) |
| Combo | `battle_map.v` | ✅ Có — cửa sổ 3,0s (khớp HTML 3s); nộ +6/đòn +15/kill → Nộ Trảm tay `battle_rage_slash` (dmg = công×4 + combo×10, AoE 6m, xong nộ về 0, combo về 0 — khớp HTML) |
| Damage log | `battle_map.v` | ✅ Có — `battle_log_add`, tối đa 50 dòng (khớp HTML) |
| Tốc độ x1/x2, tạm dừng, bỏ qua | — | ⏳ Chưa có (chỉ HTML có) |
| Cường hóa rớt tối đa −1 khi thất bại | `equipment.v` (`enhance_slot`) | ✅ Thỏa giới hạn (thất bại giữ nguyên cấp, rớt 0 ≤ 1); cost `100×(cấp+1)`, rate `max(10, 100−cấp×10)%`, max +10, 6 ngọc đã có; roll có hạng `s.enhance_attempts * 29` (khớp HTML) |
| Thưởng ngày PvP | `pvp.v` | ✅ Có — `claim_pvp_daily()` +150 vàng/+300 bạc/+50 EXP, 1 lần/ngày (khớp HTML); 8 đối thủ +25/−15, floor 0 đã có |
| Thị trấn an toàn | `town.v` | ✅ Có — `enter_town`/`exit_town`, `in_town` tắt spawner, 3 NPC, `TownPanelUI` |
| Panel mới | `assets/scenes/main.scene` | ✅ Có đủ 4 node `BattlePanel`/`TownPanel`/`EnhancePanel`/`PvpPanel` (835 dòng, 145 node); `main.v` đăng ký `BattlePanelUI`/`TownPanelUI` |

## Kiểm thử (không cần build — chạy bằng node từ gốc repo)

```bash
node tests/test-mongvolam.js    # vòng 1: môn phái, kinh tế, pet, bang, nhiệm vụ, PvP, lưu game
node tests/test-battle-mvl.js   # vòng 2: formation 5, auto-battle, raid boss, combo/nộ,
                                # enhance/gem, PvP UI, town safe, panel mới, chuẩn chung vòng 3
node tests/test-modules-mvl.js  # vòng 3: cấu trúc module web (shell + css + js/00–06),
                                # không trùng tên hàm, state/data khớp, hệ thống mới nhóm 2
node --check velo/web/js/00-state.js velo/web/js/01-world.js velo/web/js/02-combat.js \
  velo/web/js/03-battle.js velo/web/js/04-mvl.js velo/web/js/05-ui.js velo/web/js/06-expand.js
```

Cả ba harness đều đọc file thật bằng regex + mô phỏng logic thuần JS, không cần thư viện
ngoài; exit 0 = không có FAIL (MISSING được phép). Kết quả lần chạy cuối vòng 3
(2026-11-25, sau khi cập nhật docs): vòng 1 **90 PASS / 0 FAIL / 0 MISSING**;
vòng 2 **255 PASS / 0 FAIL / 1 MISSING**; vòng 3 (module) **113 PASS / 0 FAIL / 0 MISSING**.
Chi tiết: xem [docs/MONG_VO_LAM.md](../../docs/MONG_VO_LAM.md) mục 6.

## Sơ đồ module web (`velo/web/` — vòng 3)

Bản web (Three.js) đã tách từ 1 file HTML 3741 dòng thành shell + CSS + module JS
(script thường, không ES module, namespace chung `window.QC`):

| File | Dòng (gốc) | Nội dung |
|---|---|---|
| `qu_c_c_b_t_hoang_3d.html` (shell) | 358 | Body 334 dòng + link `quycoc.css` + three.js r128 CDN + tag `<script src="js/0*.js">` |
| `quycoc.css` | 191 | Toàn bộ CSS (`.mvl-panel`, `.mvl-btn`, …) |
| `js/00-state.js` | 208 | `gameState`, `skills`, data tables (`ITEMS`/`SHOP_STOCK`/`SECTS`/`ACTIVITIES`/`EVENTS`/`PETS`/`GUILD_PRESETS`) |
| `js/01-world.js` | 755 | Thế giới 3D (địa hình, chùa, portal, nhân vật Quỷ Cốc) |
| `js/02-combat.js` | 576 | Combat real-time (`damageEnemy` gốc, skill, nộ Bạo Linh Phù) |
| `js/03-battle.js` | 420 | Battle vòng 2 (formation 5, auto-battle, raid 3 phase, combo/nộ, PvP, boss TG) |
| `js/04-mvl.js` | 733 | Hệ thống Mộng Võ Lâm (Túi/Môn Phái/Hoạt Động/Sự Kiện/Chợ/Bang Hội, thị trấn, enhance/gem, lưu game) |
| `js/05-ui.js` | 570 | UI + vòng lặp chính (`animate`, `masterTick` 100ms, HUD, minimap) |
| `js/06-expand.js` | ~800 (đang tăng) | **Nhóm 2, vòng 3:** tọa kỵ 6, thời trang 8, VIP 6 cấp, bang chiến 19–20h, môn phái chiến, thư/chat, xếp hạng 20 NPC, F1/F2/F3 đổi đội trưởng |
| **Tổng shell + css + 00–05** | **3811** | (không tính 06 — file nhóm 2 đang hạ cánh) |

Chơi bản web: mở `velo/web/qu_c_c_b_t_hoang_3d.html` qua server tĩnh hoặc GitHub Pages
(không mở bằng `file://`). Smoke nhanh: `cd velo/web && python3 -m http.server 8123`
rồi curl shell + css + từng module (đều phải trả 200).

**Chưa làm được (vòng 3):** build exe Windows, test điện thoại/trình duyệt thật,
test game V thật (xem [docs/MONG_VO_LAM.md](../../docs/MONG_VO_LAM.md) mục 5).

## Cấu trúc code (`velo/quycoc3d/`)

| File | Nội dung |
|---|---|
| `main.v` | Tạo app 1280×720 (scale_mode `fit`), register components |
| `game.v` | GState (máu/mana/cấp/cảnh giới/zoom/banner + field mới: môn phái/tiền/trang bị/pet/bang/nhiệm vụ/PvP), camera isometric orbit, HeroController (WASD + click-to-move + raycast) |
| `sects.v` | 8 môn phái + nhập/đổi phái + kỹ năng phái |
| `economy.v` | Vàng/bạc/linh thạch, shop 12 món, mua/bán, phí chợ 5% |
| `equipment.v` | 6 slot trang bị, 13 món, 6 ngọc, cường hóa +10, bảng rơi đồ |
| `battle_map.v` | Battle map 5 người, auto-battle, raid boss Cóc Xanh 3 phase, combo/nộ, damage log (vòng 2) |
| `town.v` | Thị trấn Song Ma an toàn, 3 NPC, `TownPanelUI`/`EnhancePanel` (vòng 2) |
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

⚠️ **Chưa biên dịch được ở đây — exe chưa build được ở đây:** VM này không có toolchain V/Windows nên 10 file V mới
chỉ được kiểm bằng regex + đếm (harness `tests/test-mongvolam.js` + `tests/test-battle-mvl.js`), **không qua compiler V**.
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
