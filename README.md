# Quy-coc-bat-hoang-3D

Repo game **Quỷ Cốc Bát Hoang 3D** — Wuxia isometric action RPG.

- `velo/web/qu_c_c_b_t_hoang_3d.html` — thiết kế gốc (prototype Three.js chạy trong
  browser): nhân vật, 7 kỹ năng, HUD wuxia, cảnh giới, phó bản. **Mở bằng trình duyệt
  (kể cả trình duyệt điện thoại)** — xem [velo/web/README.md](velo/web/README.md).
  ⚠️ File HTML gốc từng nằm ở thư mục gốc repo, nay đã chuyển vào `velo/web/`.
- `velo/quycoc3d/` — **game 3D chính thức xây bằng Velo Engine (branch 3d)**, dịch toàn bộ
  thiết kế trên sang engine: arena đảo núi nổi, nhân vật FBX thần điệu mang đại kiếm,
  7 tuyệt kỹ với VFX, 4 loại quái + Ma Tôn, camera isometric orbit/zoom, HUD đầy đủ
  (minimap, nhiệm vụ, phó bản, thanh kỹ năng, số sát thương nổi, banner).

## Bản mở rộng Mộng Võ Lâm (Soha)

Game đã được mở rộng theo phong cách **Mộng Võ Lâm**: 8 môn phái, kinh tế vàng/bạc/chợ,
trang bị 6 slot + cường hóa + khảm ngọc, túi đồ, pet/thần thú, bang hội, 20 nhiệm vụ chính,
7 hoạt động hằng ngày, sự kiện theo giờ, PvP đấu trường giả lập, thị trấn an toàn,
lưu game. Chi tiết đầy đủ + số liệu thật + giới hạn chưa làm được:
xem **[docs/MONG_VO_LAM.md](docs/MONG_VO_LAM.md)**.

**Battle vòng 2** (xem [docs/MONG_VO_LAM.md](docs/MONG_VO_LAM.md) mục 3.12–3.15):
formation 5 người (3 hàng tank/dps/healer), auto-battle (tự dùng skill khi đủ MP,
tự uống đan khi HP < 25%), raid boss Cóc Xanh 3 phase (đổi phase ở 66%/33% HP,
gọi 3 quái con mỗi lần đổi phase, AoE có cảnh báo 1,2s), combo (cửa sổ 3s) / nộ
(Nộ Trảm tay + Bạo Linh Phù +35% crit trong 12 giây) + damage log 50 dòng,
tốc độ x1/x2, tạm dừng/bỏ qua, cường hóa tối đa +10 (thất bại tối đa −1 cấp) +
6 loại ngọc, PvP 8 đối thủ (+25/−15, floor 0) + thưởng ngày, thị trấn Song Ma
(vào tắt spawn, ra bật lại), 4 panel mới (Battle/Town/Enhance/PvP).
Chuẩn số liệu vòng 2 đã chốt: pet 6, bang 4, sự kiện 5, chợ 12 món, trang bị 13 món,
vàng khởi đầu 455 / bạc khởi đầu 40932 — **đã khớp cả hai bản**
(6 lệch battle vòng 2 đã khớp: đội hình `{0,1,2,5,7}`, ngưỡng uống đan 25%,
quái con raid [3,3], combo 3s, log 50 dòng, roll cường hóa có `attempts×29` cả hai bản;
thưởng ngày PvP + tốc độ/tạm dừng/bỏ qua phía V cũng đã có).
**Chuẩn chung vòng 3** (docs mục 3.17.2): nộ khí = Nộ Trảm tay
(dmg = công×4 + combo×10, AoE 6m), AoE raid = 90 dmg (cả hero + đồng đội),
boss thế giới +5000 vàng + 50 linh thạch + 5 Đá Cường Hóa, boss raid
Kim Thiềm Vương 20000 HP / 120s / 3 phase — **đã hạ cánh cả hai bản**
(harness battle mục L: 0 FAIL, chỉ còn 1 MISSING theo thiết kế).

**Module vòng 3** (xem [docs/MONG_VO_LAM.md](docs/MONG_VO_LAM.md) mục 3.16–3.17):
HTML gốc 3741 dòng đã tách thành shell `velo/web/qu_c_c_b_t_hoang_3d.html`
(**358 dòng**, body 334 dòng — không phải ~120 dòng như ước lượng ban đầu) +
`velo/web/quycoc.css` (191 dòng) + `velo/web/js/00-state.js` (208) /
`01-world.js` (755) / `02-combat.js` (576) / `03-battle.js` (420) /
`04-mvl.js` (733) / `05-ui.js` (570) — tổng **3811 dòng**, script thường
(không ES module), namespace chung `window.QC`. Nhóm 2 đang hạ cánh
`velo/web/js/06-expand.js` (tọa kỵ 6, thời trang 8, VIP 6 cấp, bang chiến 19–20h,
môn phái chiến, thư/chat, xếp hạng 20 NPC, đổi đội trưởng F1/F2/F3) — shell đã nạp
06 và thêm 5 panel mới (tổng 13 panel); file V mới `mounts.v`/`fashion.v`/
`guildwar.v`/`vip.v` chưa có.

Kiểm thử: `node tests/test-mongvolam.js` (vòng 1) , `node tests/test-battle-mvl.js`
(vòng 2) và `node tests/test-modules-mvl.js` (vòng 3, module mới) — xem mục Kiểm thử
bên dưới và mục 6 trong docs trên.

## Chạy game

**Bản HTML (chơi ngay trên điện thoại / trình duyệt):** mở
`velo/web/qu_c_c_b_t_hoang_3d.html` qua server tĩnh hoặc GitHub Pages
(không mở bằng `file://` — trình duyệt chặn tải asset).

**Bản V (Windows, cần build):** build bằng V toolchain rồi chạy exe — xem
[velo/quycoc3d/README.md](velo/quycoc3d/README.md).
⚠️ **File `.exe` KHÔNG có trong repo** (thư mục `velo/quycoc3d/build/` chỉ chứa
`assets/` trùng lặp, không có exe) — muốn chơi bản V phải build lại từ source
bằng `build_game.ps1` trên máy Windows có toolchain V. **Exe cũng chưa build được
ở đây** (VM này không có toolchain V/Windows) — chỉ kiểm tra file V bằng regex
+ đếm qua harness, không qua compiler V.

Hướng dẫn phím + build lại: xem [velo/quycoc3d/README.md](velo/quycoc3d/README.md).

## Kiểm thử

```bash
node tests/test-mongvolam.js    # vòng 1 (môn phái, kinh tế, pet, bang, nhiệm vụ, PvP, lưu game)
node tests/test-battle-mvl.js   # vòng 2 (formation 5, auto-battle, raid boss 3 phase,
                                # combo/nộ, damage log, tốc độ/tạm dừng/bỏ qua,
                                # enhance/gem, PvP UI, town safe, panel mới,
                                # chuẩn chung vòng 3)
node tests/test-modules-mvl.js  # vòng 3 (cấu trúc module shell + css + js/00–06,
                                # không trùng tên hàm, state/data khớp,
                                # hệ thống mới nhóm 2, hồi quy battle cũ)
node --check velo/web/js/00-state.js velo/web/js/01-world.js velo/web/js/02-combat.js \
  velo/web/js/03-battle.js velo/web/js/04-mvl.js velo/web/js/05-ui.js velo/web/js/06-expand.js
```

Cả ba harness đều chạy bằng `node` thuần, không cần thư viện ngoài; exit 0 = không có FAIL
(MISSING được phép — hệ thống chưa có trong code thì báo MISSING chứ không
fail cứng). Kết quả lần chạy cuối vòng 3 (2026-11-25, sau khi cập nhật docs):
vòng 1 **90 PASS / 0 FAIL / 0 MISSING**; vòng 2 **255 PASS / 0 FAIL / 1 MISSING**;
vòng 3 (module) **113 PASS / 0 FAIL / 0 MISSING**; `node --check` 00–06 OK.
Smoke server: `cd velo/web && python3 -m http.server 8123` rồi curl shell + css +
từng module — đều trả 200.
Chi tiết từng assert + số đo thật: xem [docs/MONG_VO_LAM.md](docs/MONG_VO_LAM.md) mục 6.

## Mở panel mới (battle vòng 2 + hệ thống mới vòng 3)

- **Bản HTML:** 13 panel mở bằng thanh dưới — 8 panel gốc (Túi / Môn Phái / Hoạt Động /
  Sự Kiện / Chợ / Bang Hội / Đội Hình / Đ. Trường) + 5 panel mới vòng 3
  (Tọa Kỵ / Bang Chiến / VIP / Thư / Xếp Hạng) + nút **🏯 Thị Trấn** vào khu an toàn
  (3 NPC: Trưởng Môn, Chủ Sạp, Thợ Rèn). Battle UI là **thanh battle bar** trên màn
  hình (🤖 Tự đánh / ⏸ Tạm dừng / ⏭ Bỏ qua / ⚡ Tốc độ x1/x2 / Combo / Nộ Trảm /
  damage log / thanh HP raid boss), không có `panel-battle` riêng.
- **Bản V:** panel nằm trong `velo/quycoc3d/assets/scenes/main.scene` (node
  `BattlePanel` / `TownPanel` / `EnhancePanel` / `PvpPanel`, nối qua `hud.v` /
  `BattlePanelUI` / `TownPanelUI`); 4 node này đã có trong scene (835 dòng, 145 node).
