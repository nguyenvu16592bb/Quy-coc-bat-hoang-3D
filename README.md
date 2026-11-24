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
tự uống đan khi HP < 30%), raid boss Cóc Xanh 3 phase (đổi phase ở 66%/33% HP,
gọi quái con, AoE có cảnh báo), combo/nộ (+35% crit trong 12 giây) + damage log,
tốc độ x1/x2, tạm dừng/bỏ qua, cường hóa tối đa +10 (thất bại tối đa −1 cấp) +
6 loại ngọc, PvP 8 đối thủ (+25/−15, floor 0) + thưởng ngày, thị trấn Song Ma
(vào tắt spawn, ra bật lại), 4 panel mới (Battle/Town/Enhance/PvP).
Chuẩn số liệu vòng 2 đã chốt: pet 6, bang 4, sự kiện 5, chợ 12 món, trang bị 13 món,
vàng khởi đầu 455 / bạc khởi đầu 40932 — **đã khớp cả hai bản**
(harness vòng 1: 76 PASS / 0 FAIL).
⚠️ Hai bản battle vòng 2 **chưa giống hệt nhau**: còn 6 lệch số liệu
(đội hình mặc định, ngưỡng uống đan auto, quái con raid, cửa sổ combo,
số dòng damage log, roll cường hóa) + tốc độ/tạm dừng/bỏ qua và thưởng ngày PvP
mới chỉ có ở HTML, chưa có ở V — kiểm tra bằng `tests/test-battle-mvl.js`
(harness vòng 2: 219 PASS / 6 FAIL / 4 MISSING, xem mục Kiểm thử bên dưới).

Kiểm thử: `node tests/test-mongvolam.js` (vòng 1) và `node tests/test-battle-mvl.js`
(vòng 2) — xem mục Kiểm thử bên dưới và mục 6 trong docs trên.

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
                                # enhance/gem, PvP UI, town safe, panel mới)
```

Cả hai đều chạy bằng `node` thuần, không cần thư viện ngoài; exit 0 = không có FAIL
(MISSING được phép — hệ thống chưa có trong code thì báo MISSING chứ không
fail cứng). Kết quả lần chạy cuối (2026-11-25 ~05:03):
vòng 1 **76 PASS / 0 FAIL / 0 MISSING** (chuẩn MAX vòng 2 đã khớp cả hai bản);
vòng 2 **219 PASS / 6 FAIL / 4 MISSING** (6 FAIL đều là lệch số liệu HTML↔V
của battle vòng 2, cần chốt số chung mới về 0 FAIL; 4 MISSING là tốc độ/tạm dừng/
bỏ qua + thưởng ngày PvP phía V).
Chi tiết từng assert + số đo thật: xem [docs/MONG_VO_LAM.md](docs/MONG_VO_LAM.md) mục 6.

## Mở panel mới (battle vòng 2)

- **Bản HTML:** 8 panel mở bằng thanh dưới (Túi / Môn Phái / Hoạt Động / Sự Kiện /
  Chợ / Bang Hội / Đội Hình / Đ. Trường) + nút **🏯 Thị Trấn** vào khu an toàn
  (3 NPC: Trưởng Môn, Chủ Sạp, Thợ Rèn). Battle UI là **thanh battle bar** trên màn
  hình (🤖 Tự đánh / ⏸ Tạm dừng / ⏭ Bỏ qua / ⚡ Tốc độ x1/x2 / Combo / Nộ Trảm /
  damage log / thanh HP raid boss), không có `panel-battle` riêng.
- **Bản V:** panel nằm trong `velo/quycoc3d/assets/scenes/main.scene` (node
  `BattlePanel` / `TownPanel` / `EnhancePanel` / `PvpPanel`, nối qua `hud.v` /
  `BattlePanelUI` / `TownPanelUI`); 4 node này đã có trong scene (802 dòng, 141 node).
