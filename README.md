# Mộng Võ Lâm 3D — Quỷ Cốc Bát Hoàng (Bản Three.js + PixiJS)

Game 3D wuxia MMORPG-lite chạy **100% cục bộ trong trình duyệt**, cảm hứng từ
**Mộng Võ Lâm (Soha Game)** — phiên bản mới viết bằng **Three.js r147 + PixiJS 6**,
chia module **HTML / CSS / JS dạng namespace IIFE (KHÔNG ES module)**.

## 🚀 Cách chạy

**Cách nhanh nhất (Windows):** nhấp đúp `Chay-game.bat` — tự mở `http://localhost:8080`.

**Cách khác:**
```bash
python -m http.server 8080        # hoặc: npx serve .
# rồi mở http://localhost:8080/index.html
```

> ⚠️ Phải chạy qua HTTP server (không mở file:// trực tiếp) vì trình duyệt chặn
> tải model GLB từ file local. Model GLB của bạn nằm sẵn trong `assets/models/`.

## 📂 Cấu trúc

```
index.html              — khung DOM + thứ tự nạp script
css/style.css           — giao diện wuxia "mực tàu ánh vàng đồng"
js/core/                — Engine, Assets, Input, Camera, Audio (tổng hợp WebAudio), Save, Utils
js/data/Data.js         — toàn bộ dữ liệu: 4 môn phái, 18 kỹ năng, ~30 vật phẩm,
                          10 quái, 5 boss, 5 bản đồ, 7 NPC, 19 nhiệm vụ, 12 thành tựu
js/world/World.js       — địa hình procedural, bầu trời, ngày/đêm, thời tiết, cổng
js/entities/Entities.js — Player, Monster AI, Boss (phase + telegraph), NPC, Pet, Ngựa, Loot
js/systems/             — Combat, Effects (VFX), Progression, Inventory, Quests,
                          Achievements, Chat
js/ui/                  — HUD (thanh máu/kỹ năng/minimap PixiJS), FX2D số sát thương,
                          mọi màn hình (login, tạo nhân vật, túi đồ, chợ, bản đồ...)
js/lib/                 — Three.js r147 + GLTFLoader + Draco + SkeletonUtils +
                          post-processing (UnrealBloom) + PixiJS 6 (UMD)
assets/models/          — GLB: 2 hero + pet (bạn cung cấp), 10 quái + 5 boss (CC mẫu)
CONTRACT.md             — hợp đồng API giữa các module
tests/test-mvl3d.js     — kiểm thử tích hợp dữ liệu (node tests/test-mvl3d.js)
tools/watch-test.ps1    — tự kiểm thử lại mỗi khi code thay đổi (kèm monitor)
```

## ⚔️ Tính năng chính

- **4 môn phái** (Thiếu Lâm / Võ Đang / Đường Môn / Nga My) × 4 tuyệt kỹ riêng + Thân Pháp + đánh thường chuỗi 3 đòn
- **5 bản đồ** có khí quyển riêng: Mộng Hoành Sơn (trấn an toàn) → Vạn Trúc Lâm (trúc hoàng hôn) → Hắc Phong Cốc (mưa đêm) → Tuyết Lĩnh (tuyết rơi) → Long Môn Mật Cảnh (núi lửa)
- **10 loài quái** AI tuần tra/nhìn thấy là đuổi/đánh/bỏ chạy/hồi về gốc; **quái tinh anh** ✦ vàng
- **5 Ma Đầu**: Vong Giáp Đại Tướng, Huyễn Vũ Ma Nữ, Cơ Quan Thánh Thủ, Hắc Long Vương, **Cửu Vĩ Huyết Hồ** (boss cuối) — hệ phase, triệu linh binh, **vòng đỏ báo trước AOE**, cuồng hóa dưới 10% máu
- **Kinh tế 2 loại tiền**: Bạc (quái rơi, chợ) + Vàng (nhiệm vụ/boss, cường hóa, hồi sinh)
- **Túi đồ 48 ô, 7 slot trang bị**, hiếm 6 bậc + phụ thuộc ngẫu nhiên, **cường hóa +N** (tỉ lệ giảm dần), hộp quà theo phái
- **19 nhiệm vụ chuỗi** (giết / thu thập / gặp / đến nơi / boss) + thành tựu 12 huy hiệu
- **Thánh thú Coco** (model của bạn) theo chủ, tự nhặt đồ, hỗ trợ cắn quái
- **Cưỡi Hắc Tuấn Mã** sau khi thu phục (phím Z), tốc độ ×2
- Chu kỳ **ngày/đêm**, thời tiết mưa/tuyết/tro, **âm nhạc ngũ cung procedural** theo từng vùng + ~20 SFX tổng hợp WebAudio
- **Minimap PixiJS** xoay theo camera, số sát thương bay (PixiJS overlay), chat giang hồ giả lập, tự lưu localStorage + xuất/nhập mã lưu
- **Chất lượng 3 mức** (Thấp/TB/Cao) — pixel ratio, bóng đổ, bloom
- **Hỗ trợ cảm ứng**: joystick ảo + nút hành động
- **Tự kiểm thử**: mở `index.html?autotest=1` chạy kịch bản toàn trình tự; `node tests/test-mvl3d.js` kiểm dữ liệu; watcher đổi file là chạy lại

## 🎮 Điều khiển

| Phím | Hành động |
|---|---|
| WASD / mũi tên | Di chuyển · **Shift** chạy nhanh · **Space** nhảy |
| Chuột trái | Đánh thường (giữ để liên hoàn) · kéo xoay camera · lăn thu phóng |
| 1–4 / Q / R | Tuyệt kỹ / Thân Pháp / đan dược |
| E / Tab / Z | Tương tác / chọn mục tiêu / cưỡi ngựa |
| I C K J M H | Túi · Nhân vật · Kỹ năng · Nhiệm vụ · Bản đồ · Hướng dẫn |
| Esc | Đóng bảng / Cài đặt |

## 🏅 Ghi nguồn model

- Hero `tamphong.glb`, `lenhhosung.glb`, pet `coco.glb`: do người dùng cung cấp (Tripo AI)
- Quái/boss: Fox, CesiumMan, RiggedFigure, Monster-like, BrainStem, DamagedHelmet —
  [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) (Apache-2.0/CC);
  Horse, Parrot, Flamingo, Stork, Xbot, Soldier, RobotExpressive, Michelle, Dragon —
  [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models) (MIT)

## 🧩 Kiến trúc kỹ thuật

- **Không ES module, không build step** — mọi file là IIFE gắn namespace `window.MVL`,
  nạp bằng thẻ `<script>` theo thứ tự phụ thuộc (xem `index.html`).
- Three.js r147 (UMD) cho 3D: renderer sRGB + ACES tone mapping + UnrealBloomPass.
- PixiJS 6 (UMD) cho lớp 2D: minimap + số sát thương bay + hiệu ứng UI.
- Model GLB tự chuẩn hóa: clone an toàn qua SkeletonUtils, cân theo chiều cao, chân chạm đất.
- Không gọi mạng ngoài sau khi đã tải tài sản; chạy được hoàn toàn offline qua LAN/local.
- Bản cũ (Velo engine, FBX) vẫn còn nguyên tại `velo/` — không ảnh hưởng bản này.
