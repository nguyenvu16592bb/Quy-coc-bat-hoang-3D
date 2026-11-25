# Quỷ Cốc Bát Hoang 3D — Bản mở rộng theo phong cách Mộng Võ Lâm (Soha)

> Tài liệu này mô tả **đúng những gì có trong code** của đợt mở rộng Mộng Võ Lâm,
> không mô tả tính năng chưa viết. Mọi con số đều đếm/đọc trực tiếp từ file
> (xem mục 6 để kiểm chứng lại bằng harness).
>
> **Trạng thái kiểm chứng:** 2026-11-25 ~05:03 (+07), repo `nguyenvu16592bb/Quy-coc-bat-hoang-3D`
> (bản copy tại `~/workspace/quycoc-latest/repo/`, head `7c34daeb` — **nhóm 1 (HTML)
> và nhóm 2 (V) vẫn đang hạ cánh code vòng 2 vào thư mục này trong lúc kiểm chứng**,
> nên số liệu dưới đây là ảnh chụp tại thời điểm chạy harness cuối).
> HTML `velo/web/qu_c_c_b_t_hoang_3d.html` 3.742 dòng / 194.554 byte;
> V `velo/quycoc3d/` 19 file `.v` (17 file vòng 1 + 2 file vòng 2 mới:
> `battle_map.v` 738 dòng, `town.v` 261 dòng);
> `main.scene` 802 dòng / 141 node (đã có 4 panel mới).
> Harness vòng 1 `tests/test-mongvolam.js`: **76 PASS / 0 FAIL / 0 MISSING** —
> chuẩn MAX vòng 2 (pet 6, bang 4, sự kiện 5, chợ 12, trang bị 13,
> vàng 455 / bạc 40932) đã khớp cả hai bản (xem mục 6).
> Harness vòng 2 mới `tests/test-battle-mvl.js` (971 dòng, 229 assert):
> **219 PASS / 6 FAIL / 4 MISSING** — 6 FAIL đều là lệch số liệu thật
> giữa hai bản battle vòng 2 (xem bảng 3.15), 4 MISSING là hệ thống
> chưa có (tốc độ/tạm dừng/bỏ qua + thưởng ngày PvP phía V).

Ảnh mẫu Mộng Võ Lâm dùng làm chuẩn: (1) thị trấn Song Ma Quyền Phái — nhân vật LV3,
HP 64/160, vàng 455, bạc 40932, 13/30, thanh dưới H. Túi / M. Phái / H. Động / S. Kiện /
Chợ / B. Hội, NPC, sạp hàng, chat, thư, cài đặt; (2) đánh boss cóc xanh khổng lồ theo đội 5 người.

---

## 1. Mã nguồn cũ: ưu điểm và nhược điểm

### 1.1. Điểm mạnh (giữ nguyên, không phá)

| Hạng mục | Số liệu thật trong code cũ |
|---|---|
| Prototype HTML chạy được | `velo/web/qu_c_c_b_t_hoang_3d.html` (gốc 2.301 dòng): Three.js, `gameState` + `skills` + `enemies` + `projectiles`, HUD góc trái HP/MP, minimap, quest 15 yêu thú, skill bar 7 ô |
| Nhân vật & thế giới | Arena đảo nổi bán kính 25 (`world.v` 1.382 dòng: 42 đá tảng, cây cổ thụ, 2 chùa, 2 trận pháp, đèn đá, hoa linh, núi nổi + thác nước, đom đóm) |
| Combat | 7 kỹ năng (`combat.v` 672 dòng; MP 0/15/30/25/35/50/80, CD 0,45s–15s), bạo kích 35%, né quái 8%, né đòn 12%, MP hồi 8,4/giây |
| Tiến trình | Cấp 10 khởi đầu, HP 180, MP 426, công 68; lên cấp +35 HP / +40 MP / +14 công; cảnh giới mỗi 3 cấp: Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Đăng Tiên |
| Nội dung | `content.v` 531 dòng: 8 hero (Quỷ Cốc Tử, Lãnh Nguyệt, Huyết Đao, Thanh Vũ, Hỏa Linh, Kim Cương, Tử Yên, Bạch Hổ), 16 map (Đào Hoa Đảo … Thiếu Lâm Tháp Lâm), 16 enemy archetype + boss; party 3/8 hero (`team.v`) |
| Phó bản | 3 phó bản theo nút (Hoa Đào / Bí Cảnh / Ma Tôn); quái tự spawn khi arena dưới 6 con; kill thường +22 EXP, tinh anh +60, Ma Tôn +120 |
| Kinh nghiệm V đã rút ra, ghi trong README | Số thực vào hàm f32 phải viết `f32(...)`; V `-prod` biến warning `= 0` thành lỗi nên struct không dùng `= 0`; `scale_mode: 'fit'` cho HUD; nút HUD single-fire (poll `Button.clicked` rồi tự xóa) |

### 1.2. Điểm yếu (lý do làm bản mở rộng này)

| Thiếu sót so với Mộng Võ Lâm | Tình trạng trước đợt này |
|---|---|
| Không môn phái | Chỉ có 8 hero, không có phái / kỹ năng phái |
| Không kinh tế / chợ | Không có vàng, bạc, mua bán gì cả (GState cũ không có field tiền) |
| Không trang bị / rèn / khảm | Chỉ có 3 loại đan dược (HP/MP/bạo kích) trong túi pills |
| Không túi đồ | Không có inventory |
| Không pet / thần thú | Không có pet |
| Không bang hội | Không có bang |
| Không hoạt động hằng ngày / sự kiện | Chỉ có 1 nhiệm vụ duy nhất: diệt 15 yêu thú |
| Không PvP / xếp hạng | Không có đấu trường |
| Không thị trấn an toàn | Arena lúc nào cũng có quái tấn công |
| Không phó bản đội 5 | Phó bản chỉ gọi wave quái 1 người chơi |
| **Không lưu game** | Tắt trang / tắt exe là mất hết tiến trình |
| README gốc lỗi thời | Ghi `qu_c_c_b_t_hoang_3d.html` ở thư mục gốc (file đã chuyển vào `velo/web/`), ghi "mở `build/QuocCocBatHoang3D.exe`" trong khi **không có file .exe nào trong repo** |
| Không test V / exe | Chưa từng biên dịch được ở đây (xem mục 5) |
| Bloat trong repo | `_qa/` 19 MB (37 file PNG chụp màn hình test), `velo/quycoc3d/build/` trùng toàn bộ `assets/` (FBX `than_dieu_run.fbx` 3.797.328 byte có mặt 2 lần: `assets/models/` và `build/assets/assets/models/`, cộng thêm bản `build/assets/models/`), `build_err.txt` cho thấy build V còn notice (xem mục 5) |

---

## 2. Bảng so sánh: Mộng Võ Lâm vs Quỷ Cốc cũ vs bản mở rộng này

| Hệ thống | Mộng Võ Lâm (ảnh mẫu) | Quỷ Cốc cũ | Bản mở rộng này |
|---|---|---|---|
| Môn phái | Có phái, nhập/đổi phái | Không | **Có** — HTML 8 phái, V 8 phái (chỉ số hai bản chưa khớp, xem 3.1) |
| Kinh tế | Vàng + bạc, chợ mua bán | Không | **Có** — HTML vàng/bạc + chợ 12 món; V vàng/bạc/linh thạch + shop 10 món, phí chợ 5% |
| Trang bị | 6 slot, cường hóa, khảm ngọc | Không | **Có** — 6 slot cả hai bản; cường hóa +10 & 6 loại ngọc cả hai bản (HTML mới thêm UI cường hóa/khảm ngọc vòng 2, xem 3.13) |
| Túi đồ | Túi đồ, dùng/bán/equip | Chỉ 3 loại đan | **Có** — HTML túi 25 vật phẩm (19 cũ + 6 ngọc); V túi `inventory []int` |
| Pet / thần thú | Thần thú theo chủ | Không | **Có** — 6 pet cả hai bản, đã khớp chuẩn vòng 2 (xem 3.4) |
| Bang hội | Bang, cống hiến, boss bang | Không | **Có** — 4 bang cả hai bản, đã khớp chuẩn vòng 2 (xem 3.5) |
| Nhiệm vụ | Chuỗi nhiệm vụ chính | 1 nhiệm vụ (15 yêu thú) | **Có (V)** — 20 nhiệm vụ chính; HTML giữ nhiệm vụ 15 yêu thú cũ + 7 hoạt động ngày |
| Hoạt động hằng ngày | Có | Không | **Có** — 7 hoạt động cả hai bản, giới hạn lượt/ngày |
| Sự kiện theo giờ | Có | Không | **Có** — 5 sự kiện cả hai bản, đã khớp chuẩn vòng 2 (xem 3.7) |
| PvP / xếp hạng | Đấu trường, hạng | Không | **Có** — 8 đối thủ giả lập, hạng 1000 → 1, cả hai bản; **thưởng ngày PvP chỉ có ở HTML** (+150 vàng/+300 bạc/+50 EXP), V chưa có (xem 3.13) |
| Thị trấn an toàn | Thị trấn, NPC, sạp hàng | Không | **Có** — Song Ma Quyền Phái, 3 NPC, spawn tắt khi vào thị trấn, cả hai bản (xem 3.14) |
| Lưu game | Có | Không | **Có** — HTML localStorage (tự lưu 15 giây); V JSON trong bộ nhớ, chưa ghi file thật (xem 3.8) |
| Phó bản đội 5 người | Đánh boss theo đội 5 | Phó bản 1 người | **Có (chưa multiplayer)** — formation 5 + raid boss Cóc Xanh 3 phase + auto-battle đã có ở cả hai bản (xem 3.12); vẫn không có người chơi thật khác, không có multiplayer |
| PvP người thật | Có | Không | **Chưa có** — chỉ đánh đối thủ giả lập (bot) theo hạng |

---

## 3. Từng hệ thống mới (số liệu thật trong code)

### 3.1. Môn phái — 8 phái (HTML + V)

**HTML** (`SECTS`, `velo/web/qu_c_c_b_t_hoang_3d.html:2423`): Thiếu Lâm, Võ Đang,
Nga Mi, Cái Bang, Đường Môn, Minh Giáo, Toàn Chân, Cổ Mộ. Mỗi phái cộng chỉ số cố định,
ví dụ Thiếu Lâm +60 HP / +8 Thủ / +4 Công; Võ Đang +12 Công / +80 MP / +2 Thủ;
Đường Môn +18 Công / −2 Thủ. Nhập phái **miễn phí**, đổi phái tốn **200 vàng**
(`selectSect`). Chỉ số tính lại qua `recalcStats()`.

**V** (`sects.v`, 369 dòng, `SectDef` × 8): mỗi phái có `atk_add` / `hp_add` /
`def_add` / `crit_add` + **2 kỹ năng riêng** (ví dụ Thiếu Lâm: La Hán Quyền 120 dmg /
3,0s, Kim Cang Chưởng 200 dmg / 6,0s; Cái Bang: Hàng Long Thập Bát Chưởng 260 dmg /
8,0s). Nhập phái phải làm **nhiệm vụ nhập môn: cấp 5 + 100 vàng**, thưởng
**300 vàng + 200 EXP**; đổi phái tốn **500 vàng** (`sect_change_cost`).
Bonus tính lại từ công thức gốc nên không cộng dồn 2 lần (`apply_sect_buff`).

> ⚠️ **Lệch mirror (harness FAIL):** chỉ số hai bản khác nhau (HTML Thiếu Lâm +4 Công /
> +60 HP, V Thiếu Lâm +12 Công / +120 HP / +15 Thủ / +2% crit), phí đổi phái
> 200 vàng (HTML) vs 500 vàng (V), HTML nhập phái miễn phí còn V yêu cầu cấp 5 + 100 vàng.
> Cần user (hoặc đợt sau) chốt một bộ số chung.

### 3.2. Kinh tế / chợ (HTML + V)

**HTML:** tiền khởi đầu **455 vàng / 40932 bạc** — đúng con số trong ảnh mẫu MVL.
Bảng `ITEMS` 19 vật phẩm, `SHOP_STOCK` 12 món bán ở Chợ. Giá bán lại = **50% giá mua**
(ví dụ Kiếm Gỗ Đào mua 120 → bán 60; Kim Kiếm Quỷ Cốc mua 1500 → bán 750).
Linh Thảo mua bằng bạc (150 bạc). Tiền không bao giờ âm: `addGold`/`addSilver`
dùng `Math.max(0, ...)`; mua khi thiếu tiền thì thất bại, tiền không đổi
(harness mục C kiểm chứng bằng mô phỏng).

**V** (`economy.v`, 319 dòng): **3 loại tiền** — vàng (`gold`, khởi đầu 500),
bạc (`silver`, khởi đầu 2000), linh thạch (`stones`, đã có từ map cũ).
`shop_items` **10 món** (Hồi Huyết Đan 50 vàng, Hồi Khí Đan 40, Bạo Linh Phù 120,
Thanh Đồng Kiếm 300, Đá Cường Hóa 150, Túi Linh Thạch Nhỏ 500 bạc, thức ăn pet…).
Mọi giao dịch qua `spend_gold` / `spend_silver` / `spend_stones`: từ chối số âm
và thiếu tiền, số dư không bao giờ âm. `market_fee_pct = 5` (phí chợ 5%).

> ✅ **Đã khớp chuẩn vòng 2** (harness vòng 1: 76 PASS / 0 FAIL): vàng khởi đầu
> 455 / bạc 40932 / chợ 12 món ở cả hai bản — V đã sửa `gold = 500 → 455`,
> `silver = 2000 → 40932` trong `game.v` và thêm 2 món vào `shop_items`.

### 3.3. Trang bị — 6 slot (HTML + V)

Slot (cả hai bản): **0 Vũ khí, 1 Áo, 2 Mũ, 3 Giày, 4 Nhẫn, 5 Dây chuyền**
(`equip_slot_count = 6`, `slot_names`).

**HTML** (`ITEMS`): 13 món trang bị trong 19 vật phẩm, ví dụ Kiếm Gỗ Đào +8 Công (120 vàng),
Kiếm Sắt Bát Hoang +22 Công (450), Kim Kiếm Quỷ Cốc +45 Công / +40 HP (1500),
Giáp Sắt Huyền Vũ +80 HP / +8 Thủ (500), Nhẫn Ngọc Linh +14 Công / +25 HP (600).
Mở đầu đã mặc sẵn 6 món (Kiếm Gỗ Đào, Áo Vải Bố, Mũ Vải Xanh, Giày Vải, Nhẫn Đồng,
Dây Chuyền Gỗ). Bấm để mặc/tháo, đồ tháo trả về Túi. **Chưa có cường hóa, chưa có khảm ngọc**
trong HTML (Đá Cường Hóa chỉ là vật phẩm trong túi).

**V** (`equipment.v`, 555 dòng): `equip_items` **12 món** (`ItemDef`), **6 loại ngọc**
(`gems`: Hồng / Lục / Lam / Tử / Kim / Huyết Ngọc), **bảng rơi đồ 12 dòng**
(theo loại quái: yêu thú / ác só / tinh anh / Ma Tôn / boss bang). Cường hóa:
tối đa **+10**, phí `100 × (cấp + 1)` vàng, tỉ lệ thành công `100 − cấp × 10`%
(sàn 10%), mỗi cấp **+8% chỉ số gốc** của món (`equip_total_atk` cộng
`atk + atk × cấp × 8 / 100`); roll **deterministic** từ trạng thái game
(`kills × 37 + slot × 13 + cấp × 7 + level × 11) % 100` — cùng trạng thái cho
cùng kết quả; thất bại vẫn mất vàng, cấp giữ nguyên. Khảm ngọc: `socket_gem`,
ngọc cũ trả về túi.

> ✅ **Đã khớp chuẩn vòng 2** (13 món cả hai bản — V đã thêm 1 món vào `equip_items`).
> **Luật cường hóa khi thất bại:** chuẩn vòng 2 ghi "thất bại tối đa −1 cấp" được
> hiểu là **giới hạn trên** (rớt không quá 1 cấp, không bắt buộc rớt đúng 1).
> Cả hai bản hiện giữ nguyên cấp khi thất bại (rớt 0 ≤ 1) nên đều thỏa giới hạn
> này — HTML còn ghi rõ trong comment: *"That bai: equipment.v giu nguyen cap
> (khong rot) — thoa 'that bai toi da -1 cap'"*. Muốn rớt đúng 1 cấp thì cần
> quyết riêng (xem mục 7). Roll deterministic: HTML thêm hạng `attempts×29`
> (đổi seed mỗi lần thử), V không có → hai bản roll khác nhau với cùng trạng thái
> (harness vòng 2 mục J báo FAIL, xem bảng 3.15).
>
> **HTML vòng 2 đã có UI cường hóa/khảm ngọc** (`enhanceSlot`, `socketGem`/
> `unsocketGem`, `renderEnhance` trong panel Túi): cost/rate/max +10 và chỉ số
> 6 loại ngọc khớp V; mua ngọc bằng vàng (Hồng/Lục/Lam 300, Tử 400, Huyết 500,
> Kim 600).

### 3.4. Pet / thần thú (HTML + V)

**HTML** (`PETS`, 3 pet): **Thần Điêu** (🦅, dmg 25 — mổ yêu thú mỗi 1,2 giây),
**Hồ Ly** (🦊, dmg 18, đánh nhanh), **Kim Thiềm** (🐸, dmg 32 — cóc vàng khổng lồ
như boss trong ảnh mẫu). Chọn pet trong Túi; nâng cấp tốn `100 × cấp hiện tại` vàng.

**V** (`pets.v`, 240 dòng, `PetDef` × 6): **Thanh Long** (Mộc, 30 công / 200 HP,
Long Ngâm Cửu Thiên 150 dmg / 6,0s), **Bạch Hổ** (Kim, 36/160, Hổ Gầm Sơn Lâm 170/5,0s),
**Chu Tước** (Hỏa, 34/150, Phượng Hoàng Lửa 180/5,5s), **Huyền Vũ** (Thủy, 22/320,
Huyền Vũ Hộ Thể 90/7,0s), **Kỳ Lân** (Thổ, 32/240, Kỳ Lân Thụy Khí 160/6,0s),
**Cửu Vĩ Hồ** (Hỏa, 38/170, Cửu Vĩ Hồ Hỏa 200/4,5s). Một pet theo chủ, cộng công vào
mỗi đòn đánh. Tiến hóa: tối đa 5–6 cấp, mỗi cấp **+12% công / +10% HP**,
tốn linh thạch + vàng (ví dụ Thanh Long 10 đá + 300 vàng/lần; Kỳ Lân 15 đá + 500 vàng).
Cho ăn: 1 thức ăn pet (shop id 7) tăng 1 cấp pet (`feed_pet`).

> ✅ **Đã khớp chuẩn vòng 2** (6 pet cả hai bản): HTML đã thêm Thanh Long,
> Bạch Hổ, Chu Tước (dmg 30/36/34, tuyệt kỹ 150/170/180 theo `pets.v`).
> HTML chưa có tiến hóa pet kiểu V; V chưa có pet Kim Thiềm/Thần Điêu/Hồ Ly kiểu HTML.

### 3.5. Bang hội (HTML + V)

**HTML** (`GUILD_PRESETS`, 3 bang mẫu): **Song Ma Quyền Phái** (cấp 5, 48 thành viên),
**Bát Hoang Kiếm Tông** (cấp 4, 32), **Quỷ Cốc Ẩn Sĩ** (cấp 3, 21); danh sách 5 thành viên
(Bang chủ Trưởng Môn Song Ma cấp 38 … "Quỷ Cốc (bạn)" cấp 10, Thành viên).
Lập bang (nhập tên, tối đa 24 ký tự), gia nhập, cống hiến; **Boss Bang — Kim Thiềm Vương**
có thanh HP riêng, bấm để chém (sát thương có cộng dmg pet), hết HP thì thắng.

**V** (`guild.v`, 246 dòng, `GuildDef` × 4): **Thiên Hạ Hội** (128 thành viên),
**Võ Lâm Minh** (96), **Ma Giáo** (87), **Tiêu Dao Các** (64). Lập bang tốn
**1000 vàng**; bang tự lập có id 99. Cống hiến vàng lấy điểm cống hiến; buff bang
**+1 công / 100 điểm cống hiến tổng, tối đa +30**. Boss bang **Ma Tôn Hộ Pháp**,
50.000 HP: thưởng theo sát thương gây ra — ≥10.000 dmg nhận đủ **2000 vàng + 20 linh thạch**,
≥5.000 nhận một nửa, ≥1.000 nhận 1/5, dưới 1.000 không thưởng. Chat bang chỉ là
**log nội bộ** (giữ 20 dòng mới nhất, các sự kiện found/join/leave/contrib/boss/win),
không có mạng.

> ✅ **Đã khớp chuẩn vòng 2** (4 bang cả hai bản). Boss bang vẫn khác nhau
> (Kim Thiềm Vương ở HTML, Ma Tôn Hộ Pháp ở V) — chưa chốt chung.

### 3.6. Nhiệm vụ chính — 20 nhiệm vụ (chỉ có ở V)

`quests.v` (526 dòng, `main_quests`, `QuestDef` × 20) — chuỗi nhiệm vụ kill / collect / map,
thưởng trả **đúng 1 lần** khi tiến độ chạm mốc (`quest_add_progress`, `quest_done`):

| # | Tên | Loại / mục tiêu | Thưởng |
|---|---|---|---|
| 0 | Sơ Nhập Giang Hồ | Diệt 5 yêu thú | 100 vàng / 50 EXP |
| 1 | Linh Chi Đầu Tiên | Thu 3 Linh Chi Thảo | 120 / 60 + item 5 |
| 2 | Ác Sói Hoành Hành | Diệt 8 ác sói | 180 / 90 |
| 3 | Mở Đường Hoa Đào | Dọn 10 quái map Hoa Đào Cốc | 200 / 100 |
| 4 | Tinh Anh Đầu Tiên | Đánh bại 3 quái tinh anh | 250 / 130 + item 8 |
| 5 | Bí Cảnh Mở Ra | Hoàn thành phó bản Bí Cảnh (12 quái) | 300 / 150 |
| 6 | Huyền Thiết Rèn Kiếm | Thu 5 Huyền Thiết | 320 / 160 + item 101 |
| 7 | Ma Tôn Xuất Hiện | Đánh bại 1 Ma Tôn | 500 / — |
| 8 | Cảnh Giới Kim Đan | (theo chuỗi) | — |
| 9 | Độc Cốc Thí Luyện | (theo chuỗi) | — |
| 10 | Ngọc Bội Linh Lung | (theo chuỗi) | — |
| 11 | Thiên Lôi Kiếm Trận | (theo chuỗi) | — |
| 12 | Bát Hoang Toàn Phong | (theo chuỗi) | — |
| 13 | Ma Tôn Thứ Hai | (theo chuỗi) | — |
| 14 | Nguyên Anh Xuất Thế | (theo chuỗi) | — |
| 15 | Vạn Kiếm Quy Tông | (theo chuỗi) | — |
| 16 | Cổ Mộ Bí Ẩn | (theo chuỗi) | — |
| 17 | Hóa Thần Kiếp Nạn | (theo chuỗi) | — |
| 18 | Bát Hoang Nhất Thống | (theo chuỗi) | — |
| 19 | Đăng Tiên Cảnh | (cuối chuỗi) | — |

Tiến độ lưu trong `GState.quest_progress[20]` / `quest_done[20]`, nhiệm vụ hiện tại
`quest_current`. Nhiệm vụ cũ "diệt 15 yêu thú" vẫn còn nguyên ở cả hai bản
(HTML `questTarget: 15`, V `quest int = 15`).

> HTML **chưa có** chuỗi 20 nhiệm vụ này — HTML chỉ có nhiệm vụ 15 yêu thú cũ
> cộng 7 hoạt động ngày (mục 3.7).

### 3.7. Hoạt động hằng ngày + sự kiện theo giờ (HTML + V)

**Hoạt động ngày — 7 hoạt động, khớp nhau cả hai bản** (harness PASS):

| Hoạt động | Giới hạn/ngày | Yêu cầu | Thưởng (HTML) |
|---|---|---|---|
| Diệt Yêu Thú | 3 | Cấp 1 | 120 vàng / 200 bạc / 40 EXP |
| Phó Bản Hoa Đào | 2 | Cấp 3 | 200 / 300 / 60 + Đá Cường Hóa |
| Khiêu Chiến Boss | 1 | Cấp 5 | 400 / 500 / 120 + Ngọc Linh |
| Luyện Công Tọa Thiền | 3 | Cấp 1 | 50 / 100 / 80 |
| Hái Linh Thảo | 3 | Cấp 1 | 30 / 50 / 20 + Linh Thảo |
| Bảo Tiêu Áp Tải | 2 | Cấp 4 | 300 / 400 / 50 + Hồi Huyết Đan |
| Luyện Đan | 2 | Cấp 2 (cần 1 Linh Thảo) | 30 EXP + Hồi Huyết Đan |

Lượt tính theo ngày thật (đổi ngày làm lại được); V dùng `daily_count[7]` + `daily_reset()`.

**Sự kiện theo giờ:**

| Sự kiện | HTML (3) | V (5) |
|---|---|---|
| Bí Cảnh Mở | — | 9–10h, 300 vàng / 150 EXP |
| Ma Tôn Giáng Lâm | — | 12–13h, 800 / 400 |
| Boss Thế Giới | Kim Thiềm Vương, 8h + 2h, 500 / 150 + Ngọc Linh | Boss Thế Giới, 20–21h, 1500 / 700 |
| Tranh Đoạt Linh Thạch | 12h + 2h, 350 / 100 + Đá Cường Hóa | — |
| Bang Chiến — Song Ma | 20h + 2h, 600 / 200 + Nhẫn Ngọc Linh | — |
| Công Thành Chiến | — | 21–22h |
| Đêm Săn Yêu | — | 23–0h |

Giờ theo đồng hồ thật của máy; HTML chỉ tham gia được khi sự kiện đang **Mở**,
mỗi sự kiện nhận thưởng 1 lần/ngày.

> ✅ **Đã khớp chuẩn vòng 2** (5 sự kiện cả hai bản — HTML đã thêm 2 sự kiện).
> Khung giờ và tên sự kiện: xem bảng trên (V: Bí Cảnh Mở 9–10h, Ma Tôn Giáng Lâm
> 12–13h, Boss Thế Giới 20–21h, Công Thành Chiến 21–22h, Đêm Săn Yêu 23–0h).

### 3.8. PvP / đấu trường + boss thế giới (chỉ có ở V)

`pvp.v` — **đấu trường giả lập** (không có người thật): 8 đối thủ theo hạng,
mỗi trận thắng **+25 điểm** (theo `reward_pts` của đối thủ), thua **−15 điểm**,
điểm không bao giờ âm; hạng 1000 khi 0 điểm, hạng 1 khi ≥9990 điểm:

| Hạng | Đối thủ | Danh hiệu | Lực chiến |
|---|---|---|---|
| 1000 | Tân Thủ Luyện Kiếm | Mới vào giang hồ | 80 |
| 800 | Đệ Tử Ngoại Môn | Luyện khí sơ kỳ | 150 |
| 600 | Đệ Tử Nội Môn | Trúc Cơ sơ kỳ | 260 |
| 400 | Chân Truyền Đệ Tử | Kim Đan sơ kỳ | 420 |
| 200 | Trưởng Lão Ngoại Môn | Nguyên Anh sơ kỳ | 650 |
| 100 | Trưởng Lão Nội Môn | Hóa Thần sơ kỳ | 900 |
| 50 | Chưởng Môn Kế Vị | Hóa Thần hậu kỳ | 1200 |
| 10 | Võ Lâm Minh Chủ | Đăng Tiên Cảnh | 1600 |

Lực chiến người chơi = công + tăng trưởng theo cấp + trang bị (`pvp_power`).
**Boss thế giới:** Thiên Ma Tôn Chủ, 200.000 HP, mở **20–21h**, thưởng
5000 vàng + 50 linh thạch, thưởng tăng theo sát thương gây ra trong lượt đánh.

HTML **chưa có** PvP/đấu trường (chỉ có hoạt động ngày "Đấu Trường" là đánh quái giả lập
theo lượt, không có hạng).

### 3.9. Thị trấn an toàn (chỉ có ở HTML)

Nút **🏯 Thị Trấn** chuyển qua lại giữa **Quỷ Cốc Sơn** (chiến đấu) và
**Song Ma Quyền Phái — Khu An Toàn (không quái tấn công)**. Trong thị trấn hiện
banner + 3 NPC bấm được: **Trưởng Môn** (Môn Phái), **Chủ Sạp Hàng** (Chợ),
**Thợ Rèn** (Túi / Trang bị) — bấm NPC mở đúng panel tương ứng.
Thanh dưới kiểu Mộng Võ Lâm (6 nút): **H. Túi / M. Phái / H. Động / S. Kiện / Chợ / B. Hội**,
mở 6 panel `panel-bag / panel-sect / panel-activity / panel-event / panel-shop / panel-guild`.
V chưa có thị trấn.

### 3.10. Lưu game (HTML + V — khác cơ chế)

**HTML:** `SAVE_KEY = 'quycoc_bat_hoang_3d_v1'`, `saveGame()` / `loadGame()` qua
`localStorage`; **tự lưu mỗi 15 giây** + lưu khi đóng trang (`beforeunload`).
Lưu: cấp, cảnh giới, EXP, HP/MP, vàng/bạc, kills, môn phái, pet (+cấp pet),
bang, chế độ thị trấn, túi đồ, trang bị đang mặc, đan dược, lượt hoạt động/ngày,
sự kiện đã nhận/ngày, HP boss bang, chỉ số gốc. Nút **💾 Lưu** lưu ngay.
Nếu trình duyệt chặn localStorage thì bỏ qua lặng lẽ (không crash).

**V** (`save.v`, 227 dòng): `SaveData` chứa toàn bộ trạng thái mới (cấp, cảnh giới,
tiền, túi, trang bị, môn phái, pet, bang, nhiệm vụ, hoạt động ngày, PvP);
`save_game()` trả về **chuỗi JSON trong bộ nhớ**, `load_game()` đọc lại chuỗi đó,
giá trị ngoài khoảng hợp lệ thì **clamp về mặc định an toàn** thay vì áp dụng mù
(`apply_save`). **Chưa ghi file thật:** file này cố tình không gọi API file —
nơi ghi JSON (bridge message, local storage qua engine, hay file native trong
launcher) là việc của phía game/launcher, chưa làm xong.

> ⚠️ **Lệch mirror:** HTML lưu thật vào localStorage; V mới chỉ serialize JSON
> trong bộ nhớ, chưa có nơi lưu bền. Thoát exe V lúc này vẫn mất tiến trình
> nếu launcher chưa nối `save_game()`/`load_game()` vào chỗ lưu thật.

### 3.11. GState mới (V)

`game.v` thêm vào `GState` (giữ nguyên toàn bộ field cũ — level 10, hp 180, atk 68,
crit 0,35…): `sect_id = -1`, `def`, `gold = 500`, `silver = 2000`,
`inventory []int`, `equip_slots [6]int = [-1 × 6]`, `equip_level [6]int`,
`gem_slots [6]int = [-1 × 6]`, `pet_id = -1`, `pet_level = 1`, `pet_evo`,
`guild_id = -1` (99 = bang tự lập), `guild_name`, `guild_contrib`,
`guild_total_contrib`, `guild_log []string`, `quest_current`,
`quest_progress [20]int`, `quest_done [20]bool`, `daily_count [7]int`,
`pvp_rank = 1000`, `pvp_points`, `pvp_wins`, `pvp_losses`, `world_boss_dmg`.
(`-1` = chưa có, đúng quy tắc V không dùng `= 0` cho field struct.)

---

## 3.12. Battle vòng 2 — formation 5, auto-battle, raid boss 3 phase, combo/nộ, damage log, tốc độ/tạm dừng/bỏ qua

> **Trạng thái:** nhóm 1 (HTML) + nhóm 2 (V) đã hạ cánh code vòng 2 trong lúc
> kiểm chứng (HTML 3.056 → 3.742 dòng, thêm `battle_map.v` 738 dòng +
> `town.v` 261 dòng, `main.scene` 387 → 802 dòng). Hầu hết hệ thống dưới đây **đã có ở cả hai bản và đã khớp số liệu chuẩn chung**
sau đợt khớp của coordinator: 6 lệch số liệu vòng 2 đã sửa — đội hình, ngưỡng
uống đan, quái con raid, cửa sổ combo, số dòng log, roll cường hóa — và 2 hệ
thống còn thiếu phía V (tốc độ/tạm dừng/bỏ qua, thưởng ngày PvP) đã bổ sung
thật. Harness `tests/test-battle-mvl.js` (229 assert) kiểm tra tất cả bằng
regex scan + mô phỏng thuần JS.

### 3.12.1. Formation 5 — đội hình 5 người, 3 hàng

Chuẩn thiết kế: **5 slot, 3 hàng, vai trò tank/dps/healer** — hàng trước tank,
hàng giữa dps, hàng sau healer.

| | Trạng thái thật |
|---|---|
| HTML | **Có** — panel-team "Đội Hình — 5 người", `partyHeroes` mặc định `[0,1,2,5,7]` (chuẩn chung vòng 2, khớp V), hero có `role:` (tank id 2 Huyết Đao + id 5 Kim Cương, healer id 7 Bạch Hổ), `heroRow` xếp tank→front, healer→back; bấm đổi chỗ/đổi thành viên; đồng đội tự đánh (sát thương = Công × hệ số × 0,55) |
| V | **Có** — `battle_map.v`: `battle_party_max = 5`, `hero_role` (id 5 Kim Cương tank, id 7 Bạch Hổ healer, còn lại dps), `hero_ids [0,1,2] + hero_ids_extra [5,7]`, `expand_party_to_five()` |

> ✅ **Đã khớp (coordinator):** đội hình mặc định chung `{0,1,2,5,7}` — theo V
> (`hero_ids [0,1,2]` gốc + extra `[5,7]`), HTML đã đổi theo. Thành phần vai trò:
> 2 tank (id 2, 5) / 1 healer (id 7) / 2 dps.

### 3.12.2. Auto-battle — tự đánh

| | Trạng thái thật |
|---|---|
| HTML | **Có** — `toggleAutoBattle()` + `autoBattleTick()`: uống đan HP khi HP < **25%** (chuẩn chung vòng 2, khớp V), uống đan MP khi MP < 25%, dùng skill 4 hồi máu khi HP < 40% + đủ MP, rồi skill 5 (MP≥50) / skill 2 (MP≥30) / skill 3 (MP≥25); dừng khi tắt auto / tạm dừng / ở thị trấn |
| V | **Có** — `toggle_auto_battle()` + `BattleDirector.auto_battle_tick()` mỗi 0,9 giây: uống Hồi Huyết Đan khi HP < **25%**, dùng skill 4 hồi máu khi HP < 50% + đủ MP, skill 3 AoE khi ≥3 quái gần, skill 1 đánh đơn; healer AI riêng (hồi khi HP đội < 50%, tốn 20 MP, CD 6 giây) |

> ✅ **Đã khớp (coordinator):** ngưỡng uống đan chung **25% HP** cả hai bản
> (theo V `s.hp < s.max_hp / 4`).

### 3.12.3. Raid boss Cóc Xanh — 3 phase

| | Trạng thái thật |
|---|---|
| HTML | **Có** — `startRaid()`: Kim Thiềm Vương **20000 HP** cố định (dmg 30, tốc độ 2.0), giới hạn **120 giây**, đổi phase ở **66% / 33%**, phase 2 gọi **3** quái con, phase 3 gọi **3** quái con (chuẩn chung vòng 2, khớp V), AoE cảnh báo **1,2 giây** (vòng đỏ, chạy ra ngoài; trúng AoE −90 HP, đồng đội −60 HP, HP không dưới 15); thắng +800 vàng / +300 EXP (+rơi đồ); bỏ qua raid tính thắng/thua theo sức mạnh đội |
| V | **Có** — `start_raid_boss()` trong `battle_map.v`: dùng **boss của map** (`m.boss`, HP thay đổi theo map) + 3 quái con ngay từ đầu, đổi phase ở **66% / 33%** (`raid_phase_2/3_pct`), mỗi lần đổi phase gọi **3** quái con (`raid_minion_count = 3`), AoE cảnh báo **1,2 giây** (`raid_aoe_warn_s`, vòng xoáy telegraph; sát thương AoE `20 + phase×10`, HP không dưới 15) |

> ✅ **Đã khớp (coordinator):** quái con mỗi lần đổi phase **[3, 3]** cả hai bản.
> Còn khác cơ chế (chưa chốt chung): boss raid (HTML cóc 20000 HP cố định, V boss
> của map) và sát thương AoE (HTML 90 cố định, V 20 + phase×10 = 30/40/50).

### 3.12.4. Combo / nộ / damage log

| Hệ thống | Trạng thái thật |
|---|---|
| Combo counter | **Có cả hai bản, đã khớp:** cửa sổ combo **3 giây** cả hai bản (HTML `comboTimer = 3`, V `battle_combo_window = 3.0`). Combo +1 mỗi đòn trúng, hết cửa sổ reset về 0; sát thương combo chưa nhân theo combo ở cả hai bản (HTML chỉ dùng combo trong dmg Nộ Trảm) |
| Nộ khí (mới vòng 2) | **Có cả hai bản, khác cơ chế:** HTML +8/đòn (+12/skill), đầy 100 → **Nộ Trảm tay** (dmg = công×4 + combo×10, AoE 6m, tiêu hết nộ + combo); V +6/đòn (+15/kill), đầy 100 → **tự bùng nổ +45% sát thương 6 giây** (nộ về 0). Cần chốt một cơ chế chung |
| Nộ Bạo Linh Phù (vòng 1) | **Đã có ở cả hai bản, khớp nhau** (harness mirror PASS): 12,0 giây / +35% crit |
| Damage log | **Có cả hai bản, đã khớp:** tối đa **50 dòng** cả hai bản (HTML `addDmgLog`, V `battle_log_add`, `battle_log_max = 50`; panel V hiển thị 4 dòng cuối qua `HUD/BattlePanel/Log0–3`) |

### 3.12.5. Tốc độ x1/x2, tạm dừng, bỏ qua

| | Trạng thái thật |
|---|---|
| HTML | **Có đủ 3** — `toggleSpeed()` x1↔x2 (dt × `battleSpeed`), `togglePause()` + `battlePaused` đóng băng vòng lặp game (chỉ render), `skipBattle()` hạ hết quái thường (boss phải đánh tay) + `resolveRaidSkip()` trong raid |
| V | **Đã có (coordinator bổ sung)** — `toggle_battle_speed()` x1↔x2 (`GState.battle_speed`, `BattleDirector.update` nhân dt), `toggle_battle_pause()` (`GState.battle_paused`, update return sớm), `skip_battle()` + `skip_battle_clear()` (hạ quái thường qua `apply_hit`, boss loại trừ, có đủ thưởng); 3 nút mới `BtnSpeed/BtnPause/BtnSkip` trong `BattlePanel` (scene) + `BattlePanelUI` nối nút |

### 3.12.6. Panel battle mới trong `main.scene`

`velo/quycoc3d/assets/scenes/main.scene` (**802 dòng, 141 node**) **đã có đủ 4 node
mới**: `BattlePanel`, `TownPanel`, `EnhancePanel`, `PvpPanel` (harness mục I PASS).
`main.v` đăng ký `BattlePanelUI` + `TownPanelUI`; `battle_map.v` có `BattlePanelUI`
(find `HUD/BattlePanel`, nút Auto/Raid/Expand/Close, `ThreatValue`, `Log0–7`)
và `PvpPanelUI` (find `HUD/PvpPanel`); `town.v` có `TownPanelUI` (find
`HUD/TownPanel` + `HUD/EnhancePanel`). `hud.v` đã find cả 4 panel mới
(`BattlePanel/TownPanel/EnhancePanel/PvpPanel`) trong `HUDSync.start()`.
HTML có **8 panel** (`panel-bag / -sect / -activity / -event / -shop / -guild /
-team / -pvp`); battle UI của HTML là **thanh battle bar** (nút Tự đánh / Tạm dừng /
Bỏ qua / Tốc độ / Combo / Nộ / log / raid-bar), không có `panel-battle` riêng.

> Lưu ý để khỏi nhầm: `velo/battle.v` (2.758 dòng, `MergeBoard` 5×3) là một game
> khác ở gốc `velo/`, **không thuộc `velo/quycoc3d/`** nên không tính là hệ thống
> battle của game này; harness vòng 2 không scan file đó.

## 3.13. Enhance / Gem / PvP vòng 2 — công thức, cost/rate, thưởng ngày

### 3.13.1. Cường hóa — công thức đã có trong V (`equipment.v`)

| Cấp hiện tại | Phí (vàng) `100 × (cấp+1)` | Tỉ lệ thành công `max(10, 100 − cấp×10)%` |
|---|---|---|
| 0 → 1 | 100 | 100% |
| 1 → 2 | 200 | 90% |
| 2 → 3 | 300 | 80% |
| 3 → 4 | 400 | 70% |
| 4 → 5 | 500 | 60% |
| 5 → 6 | 600 | 50% |
| 6 → 7 | 700 | 40% |
| 7 → 8 | 800 | 30% |
| 8 → 9 | 900 | 20% |
| 9 → 10 | 1000 | 10% (sàn) |

Tối đa **+10** (đã +10 thì không lên nữa). Mỗi cấp **+8% chỉ số gốc** của món.
Roll deterministic `(kills × 37 + slot × 13 + cấp × 7 + level × 11) % 100`.
**Thất bại vẫn mất vàng** (`spend_gold(cost)` chạy trước khi roll — đã có trong code).
**Thất bại rớt cấp:** luật vòng 2 là **tối đa −1 cấp** (cấp 0 thất bại vẫn 0, không âm);
`equipment.v` vòng 1 vẫn giữ luật cũ "thất bại giữ nguyên cấp" — **chưa cập nhật**,
harness mục F báo MISSING. HTML chưa có UI/hàm cường hóa (chỉ có vật phẩm
Đá Cường Hóa trong túi).

### 3.13.2. Khảm ngọc — 6 loại ngọc đã có trong V (`equipment.v`, `gems`)

| ID | Tên | Nhóm chỉ số chính | Chỉ số |
|---|---|---|---|
| 200 | Hồng Ngọc | Công | +10 công |
| 201 | Lục Ngọc | HP | +60 HP |
| 202 | Lam Ngọc | Thủ | +8 thủ |
| 203 | Tử Ngọc | Bạo kích | +4% crit |
| 204 | Kim Ngọc | Công | +20 công / +3 thủ / +2% crit |
| 205 | Huyết Ngọc | HP | +8 công / +100 HP |

Khảm bằng `socket_gem`: ngọc cũ trả về túi; tháo đồ (`unequip_slot`) trả cả ngọc
về túi. HTML **chưa có** khảm ngọc.

### 3.13.3. PvP — đấu trường + thưởng ngày

Số liệu PvP đã có trong V (`pvp.v`, xem bảng 8 đối thủ ở mục 3.8): **8 đối thủ**,
mỗi đối thủ thưởng **+25 điểm** khi thắng, thua **−15 điểm**, điểm **floor 0**,
hạng `1000 − điểm/10` (hạng 1 khi ≥9990 điểm). HTML **đã có** đấu trường tương tự
(`PVP_OPPONENTS` 8 người, tên/cấp/power trùng `pvp.v`; `pvpRankFromPoints`;
panel-pvp "Đấu Trường PvP"; boss thế giới Thiên Ma Tôn Chủ 200.000 HP, 20–21h,
thưởng 5000 vàng theo sát thương).

**Thưởng ngày PvP: có ở cả hai bản, khớp nhau** — HTML `claimPvpDaily()` và V
`claim_pvp_daily()` (`pvp.v`, khóa bằng `GState.pvp_daily_date`, lưu bền qua
`save.v`): **+150 vàng / +300 bạc / +50 EXP, nhận 1 lần/ngày** (nút V
`BtnDaily` trong `PvpPanel`, nút HTML báo "Đã nhận hôm nay").

**Lệch boss thế giới:** vàng thưởng khớp (5000), đá thưởng khác nhau — HTML
+5 Đá Cường Hóa (`addItem('da_cuong_hoa', 5)` khi ≥20000 dmg), V +50 linh thạch
(`reward_stone: 50`). Cần chốt một loại đá chung.

## 3.14. Thị trấn Song Ma vòng 2 — Town safe đã có ở cả hai bản

**HTML đã có thật từ vòng 1** (harness `test-battle-mvl.js` mục H PASS toàn bộ):

- `toggleTownMode()` / `setTownMode(on)` chuyển qua lại Quỷ Cốc Sơn ↔ Song Ma Quyền Phái.
- **Vào thị trấn tắt spawn:** quái chỉ spawn khi `!gameState.townMode && enemies.length < 6`
  (tỉ lệ 0,025/tick); **quái không tấn công trong thị trấn** (vòng lặp quái `continue`
  khi `townMode`); **tắt cả auto-attack** khi `townMode`.
- **3 NPC** bấm được: Trưởng Môn (`truongmon` → mở Môn Phái), Chủ Sạp Hàng
  (`chusap` → mở Chợ), Thợ Rèn (`thoren` → mở Túi/Trang bị); banner
  "Đã vào Thị Trấn Song Ma Quyền Phái — khu an toàn, quái không tấn công";
  bản đồ đổi tên thành "Song Ma Quyền Phái"; `townMode` được lưu/tải cùng save game.

**V đã có thật từ vòng 2** (`town.v`, 261 dòng — harness mục H PASS toàn bộ):

- `enter_town()` / `exit_town()`: vào đặt `in_town = true` (gọi 2 lần liên tiếp vẫn
  an toàn), ra đặt `false`; quái đang sống bị deactivate (không đánh, không farm XP).
- **WaveSpawner dừng spawn khi `in_town`** (`enemies.v` có `if s.in_town`); ra khỏi
  thị trấn spawner chạy lại; banner "Khu An Toàn - Thị Trấn Song Ma (không có yêu thú)".
- **3 NPC** (`town_npc` 0/1/2): Trưởng Môn → môn phái, Chủ Sạp → chợ, Thợ Rèn → mở
  `EnhancePanel`; `TownPanelUI` điều khiển cả `TownPanel` lẫn `EnhancePanel`.

## 3.15. Bảng khớp số liệu HTML ↔ V — chuẩn vòng 2 (MAX) và số đo hiện tại

Chuẩn MAX đã chốt vòng 2: **pet 6, bang 4, sự kiện 5, chợ 12 món, trang bị 13 món,
vàng đầu 455 / bạc đầu 40932**. Bảng dưới là số đo thật tại lần chạy harness cuối
(2026-11-25 ~05:03 +07 — nhóm 1+2 vẫn đang hạ cánh code nên số có thể đổi):

| Hạng mục | Chuẩn vòng 2 | HTML đo được | V đo được | Trạng thái |
|---|---|---|---|---|
| Môn phái | 8 | 8 | 8 | ✅ Khớp |
| Pet / thần thú | 6 | 6 | 6 | ✅ Khớp |
| Bang hội | 4 | 4 | 4 | ✅ Khớp |
| Hoạt động ngày | 7 | 7 | 7 | ✅ Khớp |
| Sự kiện theo giờ | 5 | 5 | 5 | ✅ Khớp |
| Vàng khởi đầu | 455 | 455 | 455 | ✅ Khớp |
| Bạc khởi đầu | 40932 | 40932 | 40932 | ✅ Khớp |
| Chợ (món) | 12 | 12 | 12 | ✅ Khớp |
| Trang bị (món) | 13 | 13 | 13 | ✅ Khớp |
| Vật phẩm ITEMS (HTML) | 25 (19 + 6 ngọc) | 25 | — | ✅ Khớp kỳ vọng mới |
| Slot trang bị | 6 | 6 | 6 | ✅ Khớp |
| Cường hóa tối đa | +10 | +10 | +10 | ✅ Khớp |
| Loại ngọc | 6 | 6 | 6 | ✅ Khớp |
| Đối thủ PvP | 8 | 8 | 8 | ✅ Khớp |
| NPC thị trấn | 3 | 3 | 3 | ✅ Khớp |
| Formation ra trận | 5 | 5 | 5 | ✅ Khớp (số người) |
| Nộ Bạo Linh Phù | 12s / +35% crit | 12.0s / 0.35 | 12.0s / 0.35 | ✅ Khớp |
| Boss thế giới HP | 200.000 | 200.000 | 200.000 | ✅ Khớp |

**6 lệch vòng 2 đã khớp (coordinator, harness vòng 2 mục J về 0 FAIL):**

| Hạng mục | HTML đo được | V đo được | Chuẩn chung đã chốt |
|---|---|---|---|
| Đội hình mặc định | `{0,1,2,5,7}` | `{0,1,2,5,7}` | Theo V (`hero_ids [0,1,2]` + extra `[5,7]`) |
| Auto-battle: ngưỡng uống đan | HP < 25% | HP < 25% | 25% cả hai bản |
| Raid: quái con mỗi lần đổi phase | [3, 3] | [3, 3] | 3 con mỗi lần đổi phase |
| Combo: cửa sổ combo | 3 giây | 3,0 giây | 3 giây cả hai bản |
| Damage log: số dòng tối đa | 50 dòng | 50 dòng | 50 dòng cả hai bản |
| Roll cường hóa | có hạng `attempts×29` | có hạng `attempts×29` | `enhance_attempts * 29` cả hai bản |

**Lệch khác chưa chốt số chung (không phải assert đơn trị):** nộ khí (HTML Nộ Trảm tay
dmg = công×4 + combo×10, V tự bùng nổ +45% dmg 6s); boss raid (HTML Kim Thiềm Vương
20000 HP cố định, V boss của map); AoE raid (HTML 90 dmg cố định, V 20 + phase×10);
đá thưởng boss thế giới (HTML +5 Đá Cường Hóa, V +50 linh thạch); chỉ số phái,
phí đổi phái, nhập phái, cơ chế lưu, boss bang (Kim Thiềm Vương vs Ma Tôn Hộ Pháp).

> **Cập nhật vòng 3 (2026-11-25):** cả 4 lệch cơ chế trên đã có **chuẩn chung
> vòng 3** (xem §3.17.2) và **đã hạ cánh cả hai bản**: nộ khí = Nộ Trảm tay,
> AoE raid = 90 dmg, đá boss thế giới = +50 linh thạch **+** 5 Đá Cường Hóa,
> boss raid = Kim Thiềm Vương 20000 HP / 120s / 3 phase. Harness battle mục L
> về 0 FAIL (chỉ còn 1 MISSING theo thiết kế: HTML không có `panel-battle` riêng).

---

## 3.16. Module vòng 3 — tách HTML 3741 dòng thành shell + css + js/00–05

Nhóm 1 tách xong, đã verify `node --check` 6/6 module OK. HTML gốc 3741 dòng
được tách thành shell + CSS + 6 module JS (script thường, **không ES module**,
global scope chia sẻ, namespace chung `window.QC`). Backup HTML gốc:
`/tmp/quycoc-orig-3741.html` (không nằm trong repo).

| File | Dòng | Nội dung |
|---|---|---|
| `velo/web/qu_c_c_b_t_hoang_3d.html` (shell) | **358** | Body 334 dòng + link `quycoc.css` + three.js r128 CDN + 6 tag `<script src="js/0*.js">` 00→05 |
| `velo/web/quycoc.css` | 191 | Toàn bộ CSS (`.mvl-panel`, `.mvl-btn`, …) — shell không còn `<style>` |
| `velo/web/js/00-state.js` | 208 | §1 Global State (`gameState`, `skills`) + §2 Scene/Camera/Lights + data tables §11 (`ITEMS`/`SHOP_STOCK`/`SECTS`/`ACTIVITIES`/`EVENTS`/`PETS`/`GUILD_PRESETS`) |
| `velo/web/js/01-world.js` | 755 | Thế giới 3D (địa hình, pagoda, portal, đèn đá, hoa linh, đỉnh bay, nhân vật Quỷ Cốc) |
| `velo/web/js/02-combat.js` | 576 | Combat real-time (quái, skill, `damageEnemy` gốc, nộ Bạo Linh Phù 12s/+35% crit) |
| `velo/web/js/03-battle.js` | 420 | Battle vòng 2 (formation 5, auto-battle, raid 3 phase, combo/nộ, PvP, boss thế giới) |
| `velo/web/js/04-mvl.js` | 733 | Hệ thống Mộng Võ Lâm (Túi/Môn Phái/Hoạt Động/Sự Kiện/Chợ/Bang Hội, thị trấn, pet, enhance/gem, lưu game) |
| `velo/web/js/05-ui.js` | 570 | UI + vòng lặp chính (`animate`, `masterTick` 100ms, HUD, minimap, PvP UI) |
| **Tổng shell + css + 6 module** | **3811** | 358 + 191 + 208 + 755 + 576 + 420 + 733 + 570 |

**Lưu ý:** shell **không phải ~120 dòng** như ước lượng ban đầu — body HTML đã 334 dòng
(khung DOM: canvas + 8 panel gốc + battle bar + HUD), nên shell tách xong là 358 dòng.
Nhóm 2 đang nối `js/06-expand.js` vào shell nên số dòng shell/03/05 có thể tăng thêm
(đã 370/432/583 khi nối 06) — harness vòng 3 chỉ khóa khoảng cho các file này, không
khóa cứng 358/420/570.

**Quy ước module (harness `tests/test-modules-mvl.js` kiểm tra):**

- Mỗi module export 1 lần ở cuối file bằng `Object.assign(window.QC, {...})`.
- **Không trùng tên hàm top-level** giữa các module (quét `function NAME`):
  138 hàm (00–05), không trùng; kể cả 06 thì 195 hàm, không trùng.
- **Ngoại lệ wrap có chủ đích** (bọc bằng gán, không phải khai báo `function` trùng):
  `damageEnemy` (02 khai báo, 03 bọc lại qua `_g1DamageEnemyOrig` để cộng combo/nộ),
  `equipItem` (04 khai báo + bọc lại qua `_g1EquipItemOrig` trong cùng file),
  `recalcStats` (04 khai báo, 06 bọc lại qua `_xOrigRecalc` để cộng bonus tọa kỵ/thời trang).
  `window.QC` chỉ export trùng đúng 1 tên: `damageEnemy` (02 + 03).
- Mọi số liệu chuẩn MAX vòng 2 giữ nguyên sau khi tách (harness cũ đọc gộp
  shell + css + module thay cho 1 file HTML duy nhất — xem §6).

## 3.17. Hệ thống mới vòng 3 (nhóm 2) + chuẩn chung vòng 3

### 3.17.1. js/06-expand.js — tọa kỵ, thời trang, bang chiến, VIP, thư/chat, xếp hạng

Nhóm 2 đang hạ cánh `velo/web/js/06-expand.js` (đã ~800 dòng, `node --check` OK).
Shell đã nạp 06 sau 05 và thêm 5 panel mới (`panel-mount`, `panel-war`, `panel-vip`,
`panel-mail`, `panel-rank`) — tổng 13 panel. File V mới **đã có** (nhóm 2 hạ cánh
2026-11-25): `mounts.v` 230 dòng, `fashion.v` 208 dòng, `guildwar.v` 172 dòng,
`vip.v` 423 dòng — không có component mới nên `main.v` không cần register thêm.

| Hệ thống | Số đo thật trong 06-expand.js | Ghi chú |
|---|---|---|
| Tọa kỵ `MOUNTS` | **6 con** (Ngựa Bạch 500 vàng → Thần Điêu 80000 vàng; tốc độ ×1.25 → ×2.0) | Mua trừ vàng, không âm; tiền khởi đầu 455 vàng **không đủ** mua con rẻ nhất (500) — phải kiếm thêm vàng trước |
| Thời trang `FASHIONS` | **8 bộ** (Bạch Y 800 vàng → Ma Tôn 10000 vàng) | Mặc đổi tint áo nhân vật thật (`applyTunicTint`), +HP/+Công |
| VIP `VIP_LEVELS` | **6 cấp** (level 0–5) | EXP cộng theo cấp `expPct [0,5,10,15,20,30]%` — VIP 5 cao nhất +30% EXP; còn +drop, +lượt hoạt động, +ô túi |
| Bang chiến | Mở **19–20h** (`guildWarIsOpen`) | `fightGuildWar()` — thắng +điểm bang, thua vẫn có điểm an ủi |
| Môn phái chiến | `fightSectWar()` | Đánh phái kề theo vòng tròn 8 phái; thắng +400 vàng/+150 EXP/+100 điểm phái |
| Thư + chat | `sendMail`/`seedMail`/`mailbox`, `sendChat` (kênh thế giới + bang) | Thư có thưởng nhận được, chat có câu trả lời mẫu của NPC |
| Bảng xếp hạng | `RANK_NPCS` **20 NPC mẫu** + `renderRank`/`rankList` | Xếp theo lực chiến giảm dần |
| Đổi đội trưởng | Phím **F1/F2/F3** (`keydown` → `switchLeaderHTML`) | Đổi leader trong đội hình 5 người; taunt (`castTaunt`) kéo quái đánh tank |

### 3.17.2. Chuẩn chung vòng 3 (nhóm 2 đang chốt)

| Chuẩn chung | HTML (03-battle.js) | V (battle_map.v / pvp.v) | Trạng thái |
|---|---|---|---|
| Nộ khí: **Nộ Trảm tay**, dmg = công×4 + combo×10, AoE 6m, xong nộ về 0, combo về 0 | ✅ `castRageSkill` | ✅ `battle_rage_slash` (mult 4, combo 10, range 6.0); auto-burst +45% cũ đã gỡ | ✅ Khớp |
| AoE raid: **90 dmg** (người chơi + đồng đội), HP sàn 15 | ✅ `raidDetonateAoe` dmg=90 | ✅ `raid_aoe_dmg = 90`, `dmg := raid_aoe_dmg` | ✅ Khớp |
| Boss thế giới (gây ≥20000 dmg): **+5000 vàng + 50 linh thạch + 5 Đá Cường Hóa** | ✅ Đủ cả 3 (`worldBossAttack` ở 05-ui.js: `addItem('ngoc_linh', 50)` + `addItem('da_cuong_hoa', 5)`) | ✅ `world_boss_fight` + `inventory_add(8)` × 5 (Đá Cường Hóa, shop id 8) | ✅ Khớp |
| Boss raid: **Kim Thiềm Vương 20000 HP / 120s / 3 phase** | ✅ Boss 20000 HP cố định | ✅ `raid_boss_max_hp = 20000`, `raid_time_limit_s = 120s` (`raid_time_left` đếm ngược, hết giờ thua), `start_raid_boss` ép HP boss về 20000 (hình boss của map giữ cho map thường) | ✅ Khớp |

Nhóm 2 hạ cánh thêm **tank aggro thật** phía V (`battle_taunt` 6s, threat 200 —
tank khiêu khích thì EnemyAI đuổi theo slot tank; không có taunt thì quái vẫn đuổi
leader như cũ) và phím Nộ Trảm tay phía V là phím **N** (phím T đã dùng cho panel Đội
ở `ui_map.v`).

Harness `tests/test-battle-mvl.js` mục L kiểm tra 3 chuẩn chung này: phía nào chưa
có thì báo MISSING, không fail. Mô phỏng thuần JS trong harness assert công thức
chuẩn: Nộ Trảm (68, combo 10) → 372 dmg; AoE 90: HP 100 → sàn 15; boss TG 20000 dmg
→ +5000 vàng + 50 linh thạch + 5 đá, 10000 dmg → +2500 vàng (không đá), 1999 dmg → 0.

---

## 4. Cách chơi

### 4.1. Trên điện thoại (bản HTML — cách chơi chính, không cần cài đặt)

1. Mở `velo/web/qu_c_c_b_t_hoang_3d.html` bằng trình duyệt điện thoại
   (qua GitHub Pages / hosting tĩnh — **không mở bằng `file://`**, trình duyệt chặn
   tải asset; xem `velo/web/README.md`).
2. Di chuyển: **chạm vào màn hình** để đi tới điểm chạm (đã có `touchstart`);
   đánh quái: chạm quái để lao tới chém; kỹ năng: bấm 7 ô dưới màn hình
   (Chém Thường + 6 tuyệt kỹ), đan dược: bấm 3 nút tròn Hồi Huyết / Tụ Linh / Bạo Linh.
   Xoay camera: kéo; zoom: con lăn (desktop) — trên điện thoại dùng nút góc 3D.
3. Thanh dưới mở 13 panel: 8 panel gốc — Túi (mặc/tháo/dùng/bán + cường hóa/khảm ngọc),
   Môn Phái (nhập/đổi phái), Hoạt Động (làm nhiệm vụ ngày lấy thưởng),
   Sự Kiện (chỉ mở đúng giờ thật), Chợ (mua/bán), Bang Hội (lập/gia nhập bang,
   đánh boss bang), Đội Hình (đổi chỗ/đổi thành viên 5 người),
   Đ. Trường (đấu trường PvP + thưởng ngày + boss thế giới) — và 5 panel mới vòng 3
   (nhóm 2, `js/06-expand.js`): Tọa Kỵ (mua/cưỡi/nâng cấp 6 con), Bang Chiến
   (đánh 19–20h), VIP (6 cấp, nạp lên cấp), Thư (nhận thưởng thư), Xếp Hạng
   (20 NPC mẫu theo lực chiến). Đổi đội trưởng bằng phím F1/F2/F3 (desktop)
   hoặc nút trong panel Đội Hình.
   **Battle bar** trên màn hình: nút 🤖 Tự đánh (bật/tắt auto-battle),
   ⏸ Tạm dừng, ⏭ Bỏ qua trận, ⚡ Tốc độ x1/x2, Combo, Nộ Trảm, damage log,
   thanh HP raid boss (Phase 1/3, 120 giây).
4. Bấm **🏯 Thị Trấn** để vào khu an toàn Song Ma Quyền Phái, nói chuyện với
   Trưởng Môn / Chủ Sạp / Thợ Rèn. Bấm **💾 Lưu** hoặc để game tự lưu mỗi 15 giây;
   mở lại trang là chơi tiếp từ chỗ đã lưu.
5. Lưu ý: **không có phím WASD trên điện thoại** — di chuyển hoàn toàn bằng chạm.

### 4.2. Trên desktop (bản V — exe Windows)

1. Cần **Windows** + toolchain V (`C:\v`, V 0.5.2) + MinGW gcc + engine clone 3D
   (`C:\Users\Admin\Documents\GitHub\velo`, branch `3d`).
2. Chạy thử từ source: `powershell -File run_game.ps1` (trong `velo/quycoc3d/`).
   Build exe: `powershell -File build_game.ps1` → `build/QuocCocBatHoang3D.exe`
   (cần thư mục `assets/` nằm cạnh exe).
3. Phím: `W A S D` / mũi tên di chuyển, click trái đi tới/đánh quái, kéo chuột
   hoặc `Q`/`E` xoay camera, con lăn zoom 20–85%, `Space` chém thường,
   `1`–`6` tuyệt kỹ, `R` uống Hồi Huyết Đan (+85 HP).
4. **.exe KHÔNG có trong repo** — phải build lại từ source theo bước 2
   (xem mục 5 vì sao chưa build được ở đây).

---

## 5. Giới hạn thật — những gì CHƯA test được, CHƯA làm được

### 5.1. Chưa test được

| Hạng mục | Tình trạng thật |
|---|---|
| Build V / exe Windows | **Chưa biên dịch được ở đây.** VM này không có toolchain V/Windows (`C:\v`, MinGW, engine clone 3D). `build_err.txt` cho thấy lần build gần nhất trên máy user còn **notice** (ví dụ `webp/webp.v:157: shifting a value from a signed type int can change the sign`, `team.v:70: e0 is immutable…`) — đó là notice, không phải lỗi dừng build, nhưng chưa ai xác nhận bản build mới nhất (sau 8 file V mới) biên dịch sạch. Các file V mới chỉ được kiểm bằng regex + đếm (harness), **không qua compiler V**. |
| Chạy game V thật | Chưa chạy được exe (không có exe, không có Windows ở đây). GState mới đã thêm field nhưng **chưa ai xác nhận** HUD/scene gọi đúng các hàm mới (`join_sect`, `buy_item`, `enhance_slot`…) trong game chạy thật. |
| Điện thoại thật | Chưa test trên điện thoại thật. Chỉ kiểm tra: cú pháp JS trong HTML qua `node --check` (PASS), đếm panel/bảng bằng regex (harness), hỗ trợ `touchstart` có mặt trong code. Chưa ai mở trang trên trình duyệt điện thoại thật để bấm thử 6 panel. |
| Trình duyệt thật (battle v2) | **Chưa test được trên trình duyệt thật** — các hệ thống battle vòng 2 (formation, auto-battle, raid 3 phase, enhance UI, PvP UI) chỉ mới kiểm tra bằng `node --check` (PASS) + harness đếm file (`tests/test-battle-mvl.js`). Chưa ai mở trang trên trình duyệt điện thoại thật để bấm thử 13 panel / battle bar / raid. Vòng 3 tách module: `node --check` 6/6 module OK + smoke `python3 -m http.server` trong `velo/web` trả 200 cho shell + css + từng module (xem §6) — vẫn chưa phải test trình duyệt thật. |
| Game V thật (battle v2) | Chưa chạy được; `battle_map.v` + `town.v` + 4 node panel mới trong `main.scene` mới hạ cánh, chưa qua compiler V, chưa chạy exe thật. |
| Hệ thống mới vòng 3 (nhóm 2) | `js/06-expand.js` đã hạ cánh (tọa kỵ 6, thời trang 8, VIP 6 cấp, bang chiến 19–20h, môn phái chiến, thư/chat, xếp hạng 20 NPC, F1/F2/F3) — chỉ kiểm bằng `node --check` + harness mô phỏng VM (`tests/test-expand-r3.js`: **95 PASS / 0 FAIL**), **chưa test trên trình duyệt thật**; file V mới `mounts.v`/`fashion.v`/`guildwar.v`/`vip.v` **đã có** (chỉ kiểm tĩnh bằng grep, chưa qua compiler V); chuẩn chung vòng 3 phía V (Nộ Trảm tay, AoE 90, +5 Đá Cường Hóa boss TG, boss raid 20000 HP) **đã hạ cánh** trong `battle_map.v`/`pvp.v` (harness battle mục L: 0 FAIL). |
| Thưởng ngày PvP | Đã có ở cả hai bản, khớp nhau: +150 vàng/+300 bạc/+50 EXP, 1 lần/ngày (V: `claim_pvp_daily()`, lưu bền qua `save.v`). |
| Luật cường hóa vòng 2 | "Thất bại tối đa −1" được hiểu là giới hạn trên; cả hai bản giữ nguyên cấp (rớt 0). Muốn rớt đúng 1 cấp thì cần quyết riêng (xem mục 7). |
| Lưu game V | `save.v` mới serialize JSON trong bộ nhớ; chưa nối vào nơi lưu bền nên chưa test được "tắt exe → mở lại còn đồ". |
| jsdom smoke test | **Không có jsdom** trong môi trường này nên không chạy được smoke test DOM; thay bằng `node --check` + harness đếm panel (ghi rõ ở đây thay vì giả vờ đã smoke test). |

### 5.2. Bloat chưa dọn — cần user quyết, KHÔNG tự xóa

| Thư mục | Nội dung | Ghi chú |
|---|---|---|
| `_qa/` — **19 MB, 37 file PNG** | Ảnh chụp màn hình test (burst_1..6, f2, clicked_map…) + script `click_map.ps1` | Chỉ phục vụ QA thủ công, không ảnh hưởng game. Xóa thì repo nhẹ 19 MB. |
| `velo/quycoc3d/build/` trùng `assets/` | `than_dieu_run.fbx` 3.797.328 byte có **3 bản** trong repo: `assets/models/`, `build/assets/models/`, `build/assets/assets/models/` (+ file `.meta` kèm theo); `main.scene` cũng trùng 2–3 bản. `build/` còn 4 file log rỗng (`out.txt`, `err.txt`, `o2.txt`, `e2.txt`, 0 byte) | `build/` là output của `build_game.ps1`, đúng ra không nên commit; nhưng **.exe thì lại không có trong repo** (chỉ có assets trùng). Cần user quyết: xóa `_qa/` và `build/assets` trùng hay giữ lại làm bản sao dự phòng. **Subagent docs này không tự xóa file nào.** |

### 5.3. Chưa làm (đừng hiểu lầm là đã có)

- **Phó bản đội 5 người thật:** không có multiplayer, không có người chơi thật khác.
  Boss thế giới / boss bang là 1 người đánh boss giả lập theo giờ; party V tối đa 3 hero
  (điều khiển 1 leader, 2 đồng đội AI).
- **PvP người thật:** chỉ đánh bot theo hạng (8 đối thủ cố định). Không có xếp hạng
  toàn server, không có mùa giải.
- **Chợ người chơi:** chợ chỉ bán đồ hệ thống (shop cố định), không có rao bán/đấu giá
  giữa người chơi với nhau.
- **Đồng bộ HTML ↔ V:** chuẩn MAX vòng 2 đã khớp toàn bộ (harness vòng 1:
  76 PASS / 0 FAIL). Chuẩn chung vòng 3 (Nộ Trảm tay, AoE raid 90, boss TG
  +50 linh thạch + 5 Đá Cường Hóa, boss raid Kim Thiềm Vương 20000 HP) đã chốt
  và **đã hạ cánh cả hai bản** (harness battle mục L: 0 FAIL). Còn khác nhau:
  chỉ số phái, phí đổi phái, cơ chế lưu. Hai bản chơi **chưa giống hệt nhau**.
- **Nhiệm vụ 20 chuỗi** mới chỉ có ở V (HTML chỉ có nhiệm vụ 15 yêu thú cũ +
  7 hoạt động ngày). PvP và thị trấn đã có ở cả hai bản; battle vòng 2 đã có
  ở cả hai bản (kể cả tốc độ/tạm dừng/bỏ qua + thưởng ngày PvP phía V, đã bổ sung vòng 2).

---

## 6. Kiểm thử — chạy lại thế nào

```bash
cd ~/workspace/quycoc-latest/repo
node tests/test-mongvolam.js        # vòng 1+3: exit 0 = pass, exit 1 = có FAIL
node tests/test-battle-mvl.js       # vòng 2+3: exit 0 = pass, exit 1 = có FAIL
node tests/test-modules-mvl.js      # vòng 3 (module): exit 0 = pass, exit 1 = có FAIL
node tests/test-expand-r3.js        # vòng 3 (nhóm 2): 95 assert, exit 0 = pass
# node --check từng module JS (vòng 3 không còn trích <script> từ HTML nữa):
node --check velo/web/js/00-state.js
node --check velo/web/js/01-world.js
node --check velo/web/js/02-combat.js
node --check velo/web/js/03-battle.js
node --check velo/web/js/04-mvl.js
node --check velo/web/js/05-ui.js
node --check velo/web/js/06-expand.js   # nhóm 2, khi đã có file
# Smoke server (vòng 3): phục vụ velo/web rồi curl từng file, phải trả 200:
cd velo/web && python3 -m http.server 8123
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8123/qu_c_c_b_t_hoang_3d.html
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8123/quycoc.css
for f in 00-state 01-world 02-combat 03-battle 04-mvl 05-ui 06-expand; do
  curl -s -o /dev/null -w "%{http_code} js/$f.js\n" http://127.0.0.1:8123/js/$f.js
done
# (server này chỉ để kiểm file trả 200 + shell không còn <script> inline dài —
# không thay cho test trình duyệt thật, xem §5.)
```

Harness vòng 1 `tests/test-mongvolam.js` làm 4 việc, **không hardcode kết quả đếm**
(mọi số liệu đọc từ file thật bằng regex tại thời điểm chạy; hệ thống chưa xuất hiện
thì báo MISSING chứ không crash). Vòng 3: mọi scan "HTML" chạy trên nội dung **gộp**
shell + `quycoc.css` + module `js/00–05` (+06 khi có), kỳ vọng số liệu giữ nguyên:

- **A. HTML + module vòng 3:** shell 358 dòng gốc, nạp đủ module 00→05 đúng thứ tự,
  không còn `<script>` inline dài, không còn `<style>` inline (CSS ra `quycoc.css`),
  namespace `window.QC`; 6 panel thanh dưới, 8 phái, **6 pet (chuẩn vòng 2)**, 6 slot,
  localStorage, 7 hoạt động, **5 sự kiện (chuẩn vòng 2)**, chợ 12 món, ITEMS 25 món
  (19 cũ + 6 ngọc), **4 bang mẫu (chuẩn vòng 2)**, thị trấn an toàn, tự lưu 15 giây,
  tiền khởi đầu 455/40932, tiền không âm; giữ nguyên 7 skill, quest 15 yêu thú, touch.
- **B. V:** đếm 8 phái / 6 pet / 20 nhiệm vụ / 7 hoạt động / 6 slot từ `XxxDef{` literal
  (không đếm nhầm `name:` lồng trong skill); kiểm tra struct không dùng `= 0`,
  có dùng `f32(...)`, GState cũ còn nguyên.
- **C. Mô phỏng logic thuần JS:** mua 100 vàng khi có 50 vàng → FAIL + tiền không đổi;
  mua vừa đủ 100 → còn 0; bán +40; cường hóa +10 atk (68 → 78); pet +15% (100 → 115);
  nhiệm vụ +200 vàng/+50 EXP; PvP thắng +25 / thua −15 / floor 0; cảnh giới mỗi 3 cấp.
- **E. Cross-mirror HTML ↔ V:** phái, pet, bang, hoạt động, sự kiện, vàng/bạc khởi đầu,
  số món chợ, số trang bị.
- **F. Docs:** `docs/MONG_VO_LAM.md` tồn tại + có chương Module vòng 3;
  README gốc link đúng.

Harness vòng 2 `tests/test-battle-mvl.js` làm 3 việc, cùng nguyên tắc
(đọc file thật bằng regex, MISSING thay vì crash; vòng 3 cũng đọc gộp module):

- **A–J. Scan + mô phỏng battle:** formation 5 (5 slot / 3 hàng / tank-dps-healer),
  auto-battle (skill khi đủ MP, đan khi HP < 25%, bật/tắt), raid boss Cóc Xanh
  3 phase (ngưỡng 66%/33%, 3 quái con mỗi lần đổi phase, AoE cảnh báo 1,2s),
  combo (cửa sổ 3s, trần +50%) / nộ (Nộ Trảm tay + Bạo Linh Phù 12s, +35% crit) /
  damage log (tối đa 50 dòng), tốc độ x1/x2 / tạm dừng / bỏ qua, enhance/gem
  (cost `100×(cấp+1)`, rate `max(10, 100−cấp×10)%`, max +10, thất bại tối đa −1,
  6 loại ngọc, tiền không âm, roll có `attempts×29`), PvP UI (8 đối thủ, +25/−15,
  floor 0, thưởng ngày 1 lần/ngày +150/+300/+50), town safe (vào tắt spawn,
  ra bật lại, 3 NPC), 4 panel mới trong `main.scene`, cross-mirror battle HTML ↔ V
  (chỉ FAIL khi cả hai phía đo được mà lệch nhau).
- **L. Chuẩn chung vòng 3 (nhóm 2 đang chốt):** Nộ Trảm tay (dmg = công×4 + combo×10,
  AoE 6m), AoE raid 90 dmg (hero + đồng đội), HP sàn 15, boss thế giới
  +5000 vàng + 50 linh thạch + 5 Đá Cường Hóa khi gây ≥20000 dmg — phía nào chưa
  có thì MISSING, không fail.
- **K. Docs:** `docs/MONG_VO_LAM.md` có chương Battle + nhắc thưởng ngày +
  nhắc chuẩn chung vòng 3; README gốc ghi cách chạy `test-battle-mvl.js`.

Harness vòng 3 `tests/test-modules-mvl.js` (mới) kiểm tra cấu trúc module:

- **A. Cấu trúc module:** đủ file shell + css + js/00–05 (đúng số dòng gốc 358/191/
  208/755/576/420/733/570, tổng 3811 — riêng shell/03/05 chỉ khóa khoảng vì nhóm 2
  đang nối 06 nên số dòng tăng), shell nạp 00→05 đúng thứ tự (06 sau 05 khi nối xong),
  không ES module, không `<script>` inline dài, không `<style>` inline, three.js r128 CDN.
- **B. Không trùng tên hàm:** quét `function NAME` qua tất cả module (kể cả 06 khi có);
  ngoại lệ wrap có chủ đích: `damageEnemy` (02→03), `equipItem` (04), `recalcStats`
  (04→06); `window.QC` chỉ export trùng đúng `damageEnemy`.
- **C. State/data khớp:** `gameState` (level 10, atk 68, crit 0.35, quest 15),
  ITEMS 25, SHOP_STOCK 12, SECTS 8, ACTIVITIES 7, EVENTS 5, PETS 6, GUILD_PRESETS 4,
  SLOT_NAMES 6, skills 7, HEROES 8 (id 0–7), PVP_OPPONENTS 8, WORLD_BOSS 200000 HP,
  partyHeroes [0,1,2,5,7], vàng/bạc khởi đầu 455/40932.
- **D. Hệ thống mới nhóm 2:** 06-expand.js + V mới (`mounts.v`/`fashion.v`/`guildwar.v`/
  `vip.v`) — chưa có thì MISSING; đếm thật MOUNTS 6 / FASHIONS 8 / VIP_LEVELS 6 cấp
  (expPct [0,5,10,15,20,30]%) / RANK_NPCS 20, bang chiến 19–20h, F1/F2/F3 đổi đội
  trưởng; mô phỏng thiết kế (mua tọa kỵ trừ tiền, mặc thời trang đổi tint, VIP cộng
  EXP, xếp hạng sắp xếp đúng).
- **E. Hồi quy battle cũ:** 7 skill, quest 15, crit 0.35, combat real-time
  (`requestAnimationFrame` + `masterTick` 100ms + dt clamp 0.05), auto-attack,
  auto-battle + raid, localStorage — còn nguyên sau khi tách module.
- **F. Docs:** chương Module + tổng 3811 dòng + chuẩn chung vòng 3 trong docs này;
  README gốc ghi cách chạy `test-modules-mvl.js`; `velo/quycoc3d/README.md` ghi sơ đồ module.

**Kết quả lần chạy cuối vòng 3 (2026-11-25, sau khi cập nhật docs):**

- `tests/test-mongvolam.js`: **90 PASS / 0 FAIL / 0 MISSING** (tổng 90 assert).
- `tests/test-battle-mvl.js`: **255 PASS / 0 FAIL / 1 MISSING** (tổng 256 assert —
  MISSING duy nhất theo thiết kế: HTML không có `panel-battle` riêng, dùng battle bar).
- `tests/test-modules-mvl.js`: **113 PASS / 0 FAIL / 0 MISSING** (tổng 113 assert).
- `node --check`: 00–06 OK (06 khi đã có file).
- Smoke `python3 -m http.server` trong `velo/web`: shell + css + 7 module đều 200;
  shell có 9 `<script src>` (tailwind CDN + three.js CDN + 7 module), 0 `<style>`.

**Lưu ý khi chạy lại:** nhóm 1+2 vẫn đang hạ cánh code trong lúc kiểm chứng
(nhóm 2 đang nối 06-expand.js: shell 358 → 370 dòng, 03-battle.js 420 → 432,
05-ui.js 570 → 583, thêm 5 panel mới, AoE đồng đội 60 → 90) — số liệu trong docs
này là ảnh chụp tại lần chạy harness cuối; chạy lại harness để có số mới nhất.
Các check số dòng shell/03/05 trong harness vòng 3 dùng khoảng (≥ số gốc) thay vì
khóa cứng, đúng vì các file này đang được nhóm 2 sửa song song.

---

## 7. Cần user quyết

1. **Xóa bloat hay giữ?** `_qa/` (19 MB PNG) và `build/assets` trùng FBX/scene —
   xóa thì repo nhẹ, giữ thì còn bản sao dự phòng. (Docs này không tự xóa.)
2. **~~Chốt bộ số chung HTML ↔ V~~ — ĐÃ CHỐT VÀ ĐÃ HẠ CÁNH (chuẩn MAX):** pet 6,
   bang 4, sự kiện 5, chợ 12 món, trang bị 13 món, vàng khởi đầu 455 / bạc khởi đầu
   40932 (xem bảng 3.15). Harness vòng 1 đã về 0 FAIL.
   Chưa chốt: chỉ số phái, phí đổi phái, nhập phái miễn phí hay cấp 5 + 100 vàng,
   boss bang (Kim Thiềm Vương hay Ma Tôn Hộ Pháp) — cần user hoặc đợt sau chốt.
3. **~~Chốt 6 lệch battle vòng 2~~ — ĐÃ CHỐT VÀ ĐÃ HẠ CÁNH (coordinator):**
   đội hình `{0,1,2,5,7}` (theo V), ngưỡng uống đan 25%, quái con raid [3,3],
   combo 3s, log 50 dòng, roll cường hóa có `attempts×29` cả hai bản.
   **Chuẩn chung vòng 3 — ĐÃ CHỐT VÀ ĐÃ HẠ CÁNH CẢ HAI BẢN (nhóm 2):**
   nộ khí = Nộ Trảm tay (dmg = công×4 + combo×10, AoE 6m; V: `battle_rage_slash`,
   auto-burst +45% cũ đã gỡ), AoE raid = 90 dmg (cả hero + đồng đội; V:
   `raid_aoe_dmg = 90`), đá boss thế giới = +50 linh thạch **+** 5 Đá Cường Hóa
   (V: `world_boss_fight` + `inventory_add(8)` × 5), boss raid = Kim Thiềm Vương
   20000 HP / 120s / 3 phase (V: `raid_boss_max_hp = 20000`) — xem §3.17.2.
   Thêm: tank aggro thật phía V (`battle_taunt` 6s).
4. **~~Thưởng ngày PvP phía V~~ — ĐÃ CÓ:** V áp dụng đúng số HTML
   (+150 vàng/+300 bạc/+50 EXP, 1 lần/ngày, `claim_pvp_daily()`).
5. **Luật cường hóa "thất bại tối đa −1":** hiểu là giới hạn trên (cả hai bản giữ
   nguyên cấp, rớt 0 — đã thỏa) hay bắt buộc rớt đúng 1 cấp? Nếu bắt buộc rớt 1
   thì cả hai bản cùng phải sửa.
6. **Tốc độ/tạm dừng/bỏ qua phía V:** HTML đã có đủ 3, V chưa có — nhóm 2 bổ sung
   hay để bản V không có tính năng này?
5. **GitHub Pages:** bật Pages cho repo để chơi thử bản HTML từ điện thoại
   (mở `velo/web/qu_c_c_b_t_hoang_3d.html` qua URL công khai thay vì `file://`).
6. **Build V trên máy Windows của user:** chạy `build_game.ps1` sau khi đã có 8 file V mới
   để xác nhận biên dịch sạch + exe chạy được; báo lại nếu V báo lỗi (đặc biệt các field
   GState mới và `save.v`).
7. **Lưu game V:** chọn nơi lưu bền cho JSON của `save_game()` (file native trong launcher,
   bridge message, hay storage qua engine) — hiện tại mới chỉ có JSON trong bộ nhớ.
