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

Kiểm thử: `node tests/test-mongvolam.js` (xem mục 6 trong docs trên).

## Chạy game

**Bản HTML (chơi ngay trên điện thoại / trình duyệt):** mở
`velo/web/qu_c_c_b_t_hoang_3d.html` qua server tĩnh hoặc GitHub Pages
(không mở bằng `file://` — trình duyệt chặn tải asset).

**Bản V (Windows, cần build):** build bằng V toolchain rồi chạy exe — xem
[velo/quycoc3d/README.md](velo/quycoc3d/README.md).
⚠️ **File `.exe` KHÔNG có trong repo** (thư mục `velo/quycoc3d/build/` chỉ chứa
`assets/` trùng lặp, không có exe) — muốn chơi bản V phải build lại từ source
bằng `build_game.ps1` trên máy Windows có toolchain V.

Hướng dẫn phím + build lại: xem [velo/quycoc3d/README.md](velo/quycoc3d/README.md).
