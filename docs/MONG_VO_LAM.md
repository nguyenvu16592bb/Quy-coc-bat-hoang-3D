# Quỷ Cốc Bát Hoang 3D — Bản mở rộng theo phong cách Mộng Võ Lâm (Soha)

> Tài liệu này mô tả **đúng những gì có trong code** của đợt mở rộng Mộng Võ Lâm,
> không mô tả tính năng chưa viết. Mọi con số đều đếm/đọc trực tiếp từ file
> (xem mục 6 để kiểm chứng lại bằng harness).
>
> **Trạng thái kiểm chứng:** 2026-11-25 ~02:45 (+07), repo `nguyenvu16592bb/Quy-coc-bat-hoang-3D`
> (bản copy tại `~/workspace/quycoc-latest/repo/`).
> HTML `velo/web/qu_c_c_b_t_hoang_3d.html` 3.057 dòng / 143.036 byte;
> V `velo/quycoc3d/` 17 file `.v` (9 file cũ + 8 file mới:
> `sects.v`, `economy.v`, `equipment.v`, `pets.v`, `guild.v`, `quests.v`, `pvp.v`, `save.v`).
> Harness `tests/test-mongvolam.js`: **69 PASS / 7 FAIL / 0 MISSING** (xem mục 6 —
> cả 7 FAIL đều là lệch số liệu thật giữa HTML và V, chưa có cách sửa nào khác ngoài
> việc chốt một bộ số chung).

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
| Trang bị | 6 slot, cường hóa, khảm ngọc | Không | **Có** — 6 slot cả hai bản; V có cường hóa +10 & 6 loại ngọc, HTML chưa có cường hóa (xem 3.3) |
| Túi đồ | Túi đồ, dùng/bán/equip | Chỉ 3 loại đan | **Có** — HTML túi 19 vật phẩm; V túi `inventory []int` |
| Pet / thần thú | Thần thú theo chủ | Không | **Có** — HTML 3 pet, V 6 pet (lệch nhau, xem 3.4) |
| Bang hội | Bang, cống hiến, boss bang | Không | **Có** — HTML 3 bang mẫu + boss bang cóc; V 4 bang + boss bang (xem 3.5) |
| Nhiệm vụ | Chuỗi nhiệm vụ chính | 1 nhiệm vụ (15 yêu thú) | **Có (V)** — 20 nhiệm vụ chính; HTML giữ nhiệm vụ 15 yêu thú cũ + 7 hoạt động ngày |
| Hoạt động hằng ngày | Có | Không | **Có** — 7 hoạt động cả hai bản, giới hạn lượt/ngày |
| Sự kiện theo giờ | Có | Không | **Có** — HTML 3 sự kiện, V 5 sự kiện (lệch nhau, xem 3.7) |
| PvP / xếp hạng | Đấu trường, hạng | Không | **Có (V)** — 8 đối thủ giả lập, hạng 1000 → 1; HTML **chưa có** PvP |
| Thị trấn an toàn | Thị trấn, NPC, sạp hàng | Không | **Có (HTML)** — Song Ma Quyền Phái, 3 NPC; V chưa có thị trấn |
| Lưu game | Có | Không | **Có** — HTML localStorage (tự lưu 15 giây); V JSON trong bộ nhớ, chưa ghi file thật (xem 3.8) |
| Phó bản đội 5 người | Đánh boss theo đội 5 | Phó bản 1 người | **Chưa có thật** — chỉ giả lập: boss thế giới theo giờ + party 3 hero (V) / pet theo chủ (HTML). Không có người chơi thật khác, không có multiplayer |
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

> ⚠️ **Lệch mirror (harness FAIL):** vàng khởi đầu 455 (HTML) vs 500 (V);
> bạc khởi đầu 40932 (HTML) vs 2000 (V); chợ 12 món (HTML) vs 10 món (V).

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
(`gems`: Hồng / Lục / Lam / Tử / Kim / Huyết Ngọc), **bảng rơi đồ 10 dòng**
(theo loại quái: yêu thú / ác só / tinh anh / Ma Tôn). Cường hóa:
tối đa **+10**, phí `100 × (cấp + 1)` vàng, tỉ lệ thành công `100 − cấp × 10`%
(sàn 10%), mỗi cấp **+8% chỉ số gốc** của món (`equip_total_atk` cộng
`atk + atk × cấp × 8 / 100`); roll **deterministic** từ trạng thái game
(`kills × 37 + slot × 13 + cấp × 7 + level × 11) % 100` — cùng trạng thái cho
cùng kết quả; thất bại vẫn mất vàng, cấp giữ nguyên. Khảm ngọc: `socket_gem`,
ngọc cũ trả về túi.

> ⚠️ **Lệch mirror (harness FAIL):** 13 món trang bị (HTML) vs 12 món (V).

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

> ⚠️ **Lệch mirror (harness FAIL):** 3 pet (HTML) vs 6 pet (V).
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

> ⚠️ **Lệch mirror (harness FAIL):** 3 bang (HTML) vs 4 bang (V); boss bang khác nhau
> (Kim Thiềm Vương ở HTML, Ma Tôn Hộ Pháp ở V).

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

> ⚠️ **Lệch mirror (harness FAIL):** 3 sự kiện (HTML) vs 5 sự kiện (V),
> khung giờ và tên sự kiện không khớp nhau.

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

## 4. Cách chơi

### 4.1. Trên điện thoại (bản HTML — cách chơi chính, không cần cài đặt)

1. Mở `velo/web/qu_c_c_b_t_hoang_3d.html` bằng trình duyệt điện thoại
   (qua GitHub Pages / hosting tĩnh — **không mở bằng `file://`**, trình duyệt chặn
   tải asset; xem `velo/web/README.md`).
2. Di chuyển: **chạm vào màn hình** để đi tới điểm chạm (đã có `touchstart`);
   đánh quái: chạm quái để lao tới chém; kỹ năng: bấm 7 ô dưới màn hình
   (Chém Thường + 6 tuyệt kỹ), đan dược: bấm 3 nút tròn Hồi Huyết / Tụ Linh / Bạo Linh.
   Xoay camera: kéo; zoom: con lăn (desktop) — trên điện thoại dùng nút góc 3D.
3. Thanh dưới mở 6 panel: Túi (mặc/tháo/dùng/bán), Môn Phái (nhập/đổi phái),
   Hoạt Động (làm nhiệm vụ ngày lấy thưởng), Sự Kiện (chỉ mở đúng giờ thật),
   Chợ (mua/bán), Bang Hội (lập/gia nhập bang, đánh boss bang).
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
- **Đồng bộ HTML ↔ V:** 7 lệch số liệu đã liệt kê (pet 3/6, bang 3/4, sự kiện 3/5,
  vàng 455/500, bạc 40932/2000, chợ 12/10 món, trang bị 13/12 món) + chỉ số phái,
  phí đổi phái, cơ chế lưu khác nhau. Hai bản chơi **chưa giống hệt nhau**.
- **Nhiệm vụ 20 chuỗi + PvP + thị trấn:** mỗi thứ mới chỉ có ở một bản
  (nhiệm vụ/PvP chỉ ở V; thị trấn chỉ ở HTML).

---

## 6. Kiểm thử — chạy lại thế nào

```bash
cd ~/workspace/quycoc-latest/repo
node tests/test-mongvolam.js        # exit 0 = pass, exit 1 = có FAIL
# node --check cho JS trích từ HTML (trích <script> ra /tmp rồi check):
python3 -c "
import re
html = open('velo/web/qu_c_c_b_t_hoang_3d.html', encoding='utf-8').read()
open('/tmp/mvl-html.js','w',encoding='utf-8').write('\n'.join(re.findall(r'<script>(.*?)</script>', html, re.S)))
"
node --check /tmp/mvl-html.js
```

Harness `tests/test-mongvolam.js` làm 4 việc, **không hardcode kết quả đếm**
(mọi số liệu đọc từ file thật bằng regex tại thời điểm chạy; hệ thống chưa xuất hiện
thì báo MISSING chứ không crash):

- **A. HTML:** đếm 6 panel thanh dưới, 8 phái, 3 pet, 6 slot, localStorage, 7 hoạt động,
  3 sự kiện, chợ 12 món, ITEMS 19 món, 3 bang mẫu, thị trấn an toàn, tự lưu 15 giây,
  tiền khởi đầu 455/40932, tiền không âm; giữ nguyên 7 skill, quest 15 yêu thú, touch.
- **B. V:** đếm 8 phái / 6 pet / 20 nhiệm vụ / 7 hoạt động / 6 slot từ `XxxDef{` literal
  (không đếm nhầm `name:` lồng trong skill); kiểm tra struct không dùng `= 0`,
  có dùng `f32(...)`, GState cũ còn nguyên.
- **C. Mô phỏng logic thuần JS:** mua 100 vàng khi có 50 vàng → FAIL + tiền không đổi;
  mua vừa đủ 100 → còn 0; bán +40; cường hóa +10 atk (68 → 78); pet +15% (100 → 115);
  nhiệm vụ +200 vàng/+50 EXP; PvP thắng +25 / thua −15 / floor 0; cảnh giới mỗi 3 cấp.
- **E. Cross-mirror HTML ↔ V:** phái, pet, bang, hoạt động, sự kiện, vàng/bạc khởi đầu,
  số món chợ, số trang bị.
- **F. Docs:** `docs/MONG_VO_LAM.md` tồn tại + README gốc link đúng.

**Kết quả lần chạy cuối (2026-11-25 ~02:45): 69 PASS / 7 FAIL / 0 MISSING (tổng 76 assert).**

- 7 FAIL đều là lệch mirror thật, cần chốt số liệu chung (xem 3.1–3.5, 3.7):
  pet 3/6, bang 3/4, sự kiện 3/5, vàng 455/500, bạc 40932/2000, chợ 12/10, trang bị 13/12.
  Không còn MISSING nào — mọi hệ thống đã xuất hiện trong code, docs và cả 2 README
  đều đã được cập nhật (các check README/docs đều PASS).
- **JS trong HTML:** `node --check` **PASS** (1 block `<script>`, 112.769 byte).
- **jsdom:** không có sẵn → không smoke test DOM được (ghi rõ, không giả vờ).

---

## 7. Cần user quyết

1. **Xóa bloat hay giữ?** `_qa/` (19 MB PNG) và `build/assets` trùng FBX/scene —
   xóa thì repo nhẹ, giữ thì còn bản sao dự phòng. (Docs này không tự xóa.)
2. **Chốt bộ số chung HTML ↔ V:** pet lấy 3 hay 6? bang 3 hay 4? sự kiện 3 hay 5?
   vàng/bạc khởi đầu 455/40932 hay 500/2000? chợ 12 hay 10 món? trang bị 13 hay 12 món?
   Chỉ số phái + phí đổi phái (HTML 200 vàng / V 500 vàng / nhập phái miễn phí hay cấp 5 + 100 vàng)?
3. **GitHub Pages:** bật Pages cho repo để chơi thử bản HTML từ điện thoại
   (mở `velo/web/qu_c_c_b_t_hoang_3d.html` qua URL công khai thay vì `file://`).
4. **Build V trên máy Windows của user:** chạy `build_game.ps1` sau khi đã có 8 file V mới
   để xác nhận biên dịch sạch + exe chạy được; báo lại nếu V báo lỗi (đặc biệt các field
   GState mới và `save.v`).
5. **Lưu game V:** chọn nơi lưu bền cho JSON của `save_game()` (file native trong launcher,
   bridge message, hay storage qua engine) — hiện tại mới chỉ có JSON trong bộ nhớ.
