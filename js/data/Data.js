/* =========================================================
 * Mộng Võ Lâm 3D — js/data/Data.js
 * Toàn bộ dữ liệu game: môn phái, kỹ năng, vật phẩm, quái,
 * boss, bản đồ, NPC, nhiệm vụ, thành tựu, khung cảnh giới.
 * (Hợp đồng dữ liệu — mọi module đọc từ MVL.Data)
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var D = {};

  /* ===================== CẤU HÌNH CHUNG ===================== */
  D.config = {
    version: 1,
    gravity: -24,
    playerSpeed: 5.2,
    sprintMult: 1.75,
    jumpVel: 8.6,
    dayLength: 300,          /* giây cho 1 chu kỳ ngày-đêm */
    autosaveSec: 30,
    reviveGoldCost: 500,
    bagSize: 48,
    nameParts: ['Vô', 'Kiếm', 'Hàn', 'Thiên', 'Vũ', 'Lâm', 'Phong', 'Huyết', 'Nguyệt', 'Vân', 'Tử', 'Hà', 'Sơn', 'Linh', 'Tinh', 'Trường'],
    realms: ['Phàm Nhân', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Đăng Tiên', 'Bát Hoang Chí Tôn'],
    rarities: [
      { name: 'Phổ Thông', color: '#c9c9c9' },
      { name: 'Tinh Lương', color: '#5fd35f' },
      { name: 'Trân Quý', color: '#4fa3ff' },
      { name: 'Sử Thi', color: '#c26bff' },
      { name: 'Huyền Thoại', color: '#ff9c2a' },
      { name: 'Thần Cấp', color: '#ff4d5e' }
    ],
    assetManifest: [
      { key: 'tamphong',   type: 'glb', url: 'assets/models/heroes/tamphong.glb' },
      { key: 'lenhhosung', type: 'glb', url: 'assets/models/heroes/lenhhosung.glb' },
      { key: 'coco',       type: 'glb', url: 'assets/models/pet/coco.glb' },
      { key: 'fox',        type: 'glb', url: 'assets/models/monsters/fox.glb' },
      { key: 'cesiumman',  type: 'glb', url: 'assets/models/monsters/cesiumman.glb' },
      { key: 'horse',      type: 'glb', url: 'assets/models/monsters/horse.glb' },
      { key: 'parrot',     type: 'glb', url: 'assets/models/monsters/parrot.glb' },
      { key: 'flamingo',   type: 'glb', url: 'assets/models/monsters/flamingo.glb' },
      { key: 'stork',      type: 'glb', url: 'assets/models/monsters/stork.glb' },
      { key: 'xbot',       type: 'glb', url: 'assets/models/monsters/xbot.glb' },
      { key: 'soldier',    type: 'glb', url: 'assets/models/monsters/soldier.glb' },
      { key: 'robot',      type: 'glb', url: 'assets/models/monsters/robot.glb' },
      { key: 'rigged',     type: 'glb', url: 'assets/models/monsters/rigged.glb' },
      { key: 'dragon',     type: 'glb', url: 'assets/models/bosses/dragon.glb' },
      { key: 'brainstem',  type: 'glb', url: 'assets/models/bosses/brainstem.glb' },
      { key: 'helmet',     type: 'glb', url: 'assets/models/bosses/helmet.glb' },
      { key: 'michelle',   type: 'glb', url: 'assets/models/bosses/michelle.glb' }
    ]
  };

  /* ===================== MÔN PHÁI ===================== */
  D.classes = {
    thieulam: {
      id: 'thieulam', name: 'Thiếu Lâm', icon: '🥋', color: '#e8b34b',
      desc: 'Ngoại công cương mãnh, thân thể như Kim Cang. Đứng đầu đón đòn, quần sơn chấn động.',
      heroModels: ['tamphong', 'lenhhosung'],
      weapon: 'bang',
      base: { hp: 280, mp: 90, atk: 15, def: 14, crit: 5, spd: 4.7 },
      growth: { hp: 26, mp: 7, atk: 2.4, def: 2.0, crit: 0.3 },
      skills: ['kim_cang_quyen', 'phuc_ho_quan_son', 'thiet_bo_kim_than', 'nhu_lai_than_chuong']
    },
    vodang: {
      id: 'vodang', name: 'Võ Đang', icon: '⚔️', color: '#8fc7ff',
      desc: 'Nhẫn cương thủ nhu, kiếm khí tung hoành. Thái cực sinh lưỡng nghi, nhu trung hữu cương.',
      heroModels: ['tamphong', 'lenhhosung'],
      weapon: 'kiem',
      base: { hp: 240, mp: 110, atk: 17, def: 10, crit: 8, spd: 5.0 },
      growth: { hp: 22, mp: 9, atk: 2.8, def: 1.5, crit: 0.4 },
      skills: ['thai_cuc_kiem', 'kiem_khi_tung_hoanh', 'chan_that_tinh_bo', 'vu_dang_kiem_tran']
    },
    duongmon: {
      id: 'duongmon', name: 'Đường Môn', icon: '🗡️', color: '#9be87a',
      desc: 'Ám khí nhập thần, vạn độc sinh tâm. Một tiêu rơi xuống, sinh tử khó lường.',
      heroModels: ['tamphong', 'lenhhosung'],
      weapon: 'tieu',
      base: { hp: 215, mp: 120, atk: 19, def: 8, crit: 10, spd: 5.3 },
      growth: { hp: 20, mp: 10, atk: 3.0, def: 1.2, crit: 0.5 },
      skills: ['doc_tu_phong', 'hoi_xuan_khoan_vu', 'van_doc_tam_kinh', 'thien_vu_man_thanh']
    },
    ngamy: {
      id: 'ngamy', name: 'Nga My', icon: '🌸', color: '#ff9ad5',
      desc: 'Cửu Âm chân kinh, hoa trúc xuyến tâm. Hồi xuân diệu thủ, cứu nhân độ thế.',
      heroModels: ['tamphong', 'lenhhosung'],
      weapon: 'hoan',
      base: { hp: 225, mp: 130, atk: 16, def: 9, crit: 7, spd: 5.1 },
      growth: { hp: 21, mp: 11, atk: 2.6, def: 1.4, crit: 0.4 },
      skills: ['nguyetanh_chien', 'hoa_truc_xuyen_tam', 'cuu_am_hoi_xuan', 'tuyet_tran_song_hoan']
    }
  };

  /* ===================== KỸ NĂNG ===================== */
  D.skills = {
    /* dùng chung */
    cung_ban: { id: 'cung_ban', name: 'Công Kích', class: 'shared', icon: '🗡️', type: 'melee', mp: 0, cd: 0.45, castTime: 0, range: 2.7, radius: 0, dmg: [1.0], fx: { color: '#cfd6dd' }, desc: 'Đòn đánh cơ bản, chạm nhẹ chuột hoặc giữ chuột trái để liên hoàn.' },
    than_hanh: { id: 'than_hanh', name: 'Thân Pháp', class: 'shared', icon: '💨', type: 'dash', mp: 12, cd: 5, castTime: 0, dashDist: 6.5, dmg: [0.6], fx: { color: '#bfe8ff' }, desc: 'Lướt nhanh về phía trước, chém nhẹ kèm theo.' },
    /* Thiếu Lâm */
    kim_cang_quyen: { id: 'kim_cang_quyen', name: 'Kim Cang Quyền', class: 'thieulam', icon: '👊', type: 'melee', mp: 10, cd: 3, castTime: 0, range: 3.0, radius: 0, dmg: [1.8], fx: { color: '#ffb347' }, desc: 'Một quyền mang Kim Cang chi lực, sát thương mạnh ở cự ly gần.' },
    phuc_ho_quan_son: { id: 'phuc_ho_quan_son', name: 'Phục Hổ Quần Sơn', class: 'thieulam', icon: '🌊', type: 'aoe', mp: 24, cd: 8, castTime: 0.15, range: 0, radius: 3.4, dmg: [1.35], fx: { color: '#ff9c2a' }, desc: 'Quyền chấn mặt đất, sóng xung kích quây tròn quanh thân.' },
    thiet_bo_kim_than: { id: 'thiet_bo_kim_than', name: 'Thiết Bố Kim Thân', class: 'thieulam', icon: '🛡️', type: 'buff', mp: 25, cd: 18, castTime: 0, buff: { stat: 'def', mult: 0.45, dur: 8 }, fx: { color: '#ffd700' }, desc: 'Tăng 45% phòng ngự trong 8 giây — Kim thân bất hoại.' },
    nhu_lai_than_chuong: { id: 'nhu_lai_than_chuong', name: 'Như Lai Thần Chưởng', class: 'thieulam', icon: '🖐️', type: 'ranged', mp: 30, cd: 12, castTime: 0.3, range: 14, dmg: [2.6], projectile: { speed: 14, color: '#ffcf6a', size: 0.9 }, fx: { color: '#ffcf6a' }, desc: 'Phát chưởng khí khổng lồ bay xa, xuyên phá hàng quái.' },
    /* Võ Đang */
    thai_cuc_kiem: { id: 'thai_cuc_kiem', name: 'Thái Cực Kiếm', class: 'vodang', icon: '☯️', type: 'melee', mp: 8, cd: 2.5, castTime: 0, range: 3.2, radius: 0, dmg: [1.65], fx: { color: '#8fc7ff' }, desc: 'Kiếm ý nhu hòa, lấy nhu thắng cương.' },
    kiem_khi_tung_hoanh: { id: 'kiem_khi_tung_hoanh', name: 'Kiếm Khí Tung Hoành', class: 'vodang', icon: '💫', type: 'ranged', mp: 18, cd: 7, castTime: 0.2, range: 16, dmg: [1.9], projectile: { speed: 20, color: '#9fd0ff', size: 0.45 }, fx: { color: '#9fd0ff' }, desc: 'Kiếm khí xuất thân xiên bay xa, bén nhọn cắt gió.' },
    chan_that_tinh_bo: { id: 'chan_that_tinh_bo', name: 'Chân Thất Tinh Bộ', class: 'vodang', icon: '⭐', type: 'dash', mp: 20, cd: 10, castTime: 0, dashDist: 7.5, dmg: [1.7], fx: { color: '#c8b6ff' }, desc: 'Bộ pháp thất tinh, dịch chuyển đột phá rồi nhất kiếm chém xuống.' },
    vu_dang_kiem_tran: { id: 'vu_dang_kiem_tran', name: 'Chân Vũ Kiếm Trận', class: 'vodang', icon: '🌀', type: 'aoe', mp: 32, cd: 15, castTime: 0.45, range: 8, radius: 3.6, dmg: [2.3], fx: { color: '#8fc7ff' }, desc: 'Triệu hồi kiếm trận tại điểm chỉ định, vạn kiếm tề minh.' },
    /* Đường Môn */
    doc_tu_phong: { id: 'doc_tu_phong', name: 'Độc Tú Phóng', class: 'duongmon', icon: '🎯', type: 'ranged', mp: 6, cd: 1.8, castTime: 0, range: 15, dmg: [1.25], projectile: { speed: 24, color: '#9be87a', size: 0.3 }, fx: { color: '#9be87a' }, desc: 'Bắn phi tiêu độc tầm xa, nhịp xuất thủ nhanh.' },
    hoi_xuan_khoan_vu: { id: 'hoi_xuan_khoan_vu', name: 'Hồi Xuân Khoạn Vũ', class: 'duongmon', icon: '☠️', type: 'aoe', mp: 20, cd: 9, castTime: 0.2, range: 7, radius: 3.0, dmg: [1.4], dot: { dmg: 0.35, dur: 5 }, fx: { color: '#7ce07c' }, desc: 'Sương độc lan tỏa, kèm bại độc trên người kẻ địch.' },
    van_doc_tam_kinh: { id: 'van_doc_tam_kinh', name: 'Vạn Độc Tâm Kinh', class: 'duongmon', icon: '🐍', type: 'ranged', mp: 24, cd: 12, castTime: 0.25, range: 14, dmg: [1.2], dot: { dmg: 0.55, dur: 8 }, projectile: { speed: 18, color: '#b0ff6a', size: 0.4 }, fx: { color: '#b0ff6a' }, desc: 'Không độc bất thành võ: ngự độc công địch, độc ngữ lâu dài.' },
    thien_vu_man_thanh: { id: 'thien_vu_man_thanh', name: 'Thiên Vũ Mãn Thành', class: 'duongmon', icon: '🌧️', type: 'aoe', mp: 34, cd: 16, castTime: 0.5, range: 9, radius: 4.2, dmg: [2.5], fx: { color: '#9be87a' }, desc: 'Phi tiêu như mưa rào che trời, bao vây diệt địch trong vòng lớn.' },
    /* Nga My */
    nguyetanh_chien: { id: 'nguyetanh_chien', name: 'Nguyệt Ảnh Chiến Hoàn', class: 'ngamy', icon: '🌙', type: 'melee', mp: 8, cd: 2.2, castTime: 0, range: 3.0, radius: 0, dmg: [1.55], fx: { color: '#ff9ad5' }, desc: 'Song hoàn trăng khuất, bóng nguyệt chém người.' },
    hoa_truc_xuyen_tam: { id: 'hoa_truc_xuyen_tam', name: 'Hoa Trúc Xuyên Tâm', class: 'ngamy', icon: '🌹', type: 'ranged', mp: 16, cd: 6, castTime: 0.2, range: 14, dmg: [1.7], projectile: { speed: 22, color: '#ff9ad5', size: 0.45 }, fx: { color: '#ff9ad5' }, desc: 'Hoa trúc nhập tâm, viễn trình phá giáp.' },
    cuu_am_hoi_xuan: { id: 'cuu_am_hoi_xuan', name: 'Cửu Âm Hồi Xuân', class: 'ngamy', icon: '💚', type: 'heal', mp: 28, cd: 12, castTime: 0.6, healMult: 3.2, fx: { color: '#7ce0ff' }, desc: 'Hồi phục sinh lực mạnh — diệu thủ hồi xuân.' },
    tuyet_tran_song_hoan: { id: 'tuyet_tran_song_hoan', name: 'Tuyệt Trần Song Hoàn', class: 'ngamy', icon: '❄️', type: 'aoe', mp: 32, cd: 15, castTime: 0.4, range: 8, radius: 3.8, dmg: [2.0], fx: { color: '#a5f3ff' }, desc: 'Song hoàn vây trận, tuyệt trần tuyến sinh cơ.' }
  };

  /* ===================== VẬT PHẨM ===================== */
  D.items = {
    /* --- đan dược --- */
    hoi_nguyen_dan: { id: 'hoi_nguyen_dan', name: 'Hồi Nguyên Đan', icon: '🔴', type: 'potion', rarity: 0, price: 40, stack: 20, heal: { hp: 150 }, shop: true, desc: 'Hồi 150 sinh lực.' },
    dai_hoi_nguyen_dan: { id: 'dai_hoi_nguyen_dan', name: 'Đại Hồi Nguyên Đan', icon: '🟣', type: 'potion', rarity: 2, price: 130, stack: 20, heal: { hp: 450 }, shop: true, desc: 'Hồi 450 sinh lực.' },
    huyen_linh_dan: { id: 'huyen_linh_dan', name: 'Huyền Linh Đan', icon: '🔵', type: 'potion', rarity: 0, price: 35, stack: 20, heal: { mp: 80 }, shop: true, desc: 'Hồi 80 nội lực.' },
    dai_huyen_linh_dan: { id: 'dai_huyen_linh_dan', name: 'Đại Huyền Linh Đan', icon: '🔷', type: 'potion', rarity: 2, price: 100, stack: 20, heal: { mp: 220 }, shop: true, desc: 'Hồi 220 nội lực.' },
    hoi_sinh_dan: { id: 'hoi_sinh_dan', name: 'Hồi Sinh Đan', icon: '💠', type: 'revive', rarity: 3, price: 600, stack: 5, desc: 'Tự hồi sinh tại chỗ khi ngã xuống.' },
    ngu_hoa_tu: { id: 'ngu_hoa_tu', name: 'Ngũ Hoa Tử', icon: '🍚', type: 'food', rarity: 1, price: 80, stack: 10, buff: { stat: 'atk', mult: 0.15, dur: 60 }, shop: true, desc: 'Bữa ăn giang hồ: +15% công kích trong 60s.' },
    /* --- nguyên liệu --- */
    linh_thach: { id: 'linh_thach', name: 'Linh Thạch', icon: '💎', type: 'material', rarity: 1, price: 25, stack: 99, desc: 'Nguyên liệu cường hóa trang bị.' },
    hac_thiet: { id: 'hac_thiet', name: 'Hắc Thiết', icon: '⛓️', type: 'material', rarity: 1, price: 35, stack: 99, desc: 'Thép đen rèn binh khí.' },
    ho_cot: { id: 'ho_cot', name: 'Hổ Cốt', icon: '🦴', type: 'material', rarity: 1, price: 35, stack: 99, desc: 'Xương hổ dương cường thân.' },
    tuyet_linh_chi: { id: 'tuyet_linh_chi', name: 'Tuyết Linh Chi', icon: '🌿', type: 'material', rarity: 2, price: 45, stack: 99, desc: 'Linh chi nghìn năm trên Tuyết Lĩnh.' },
    /* --- vũ khí (theo phái) --- */
    thieu_lam_bang: { id: 'thieu_lam_bang', name: 'Thiếu Lâm Mộc Bảng', icon: '🏏', type: 'weapon', weaponClass: 'thieulam', rarity: 1, price: 300, tier: 1, stats: { atk: 8 }, shop: true, desc: 'Tăng 8 công kích. Bảng pháp chính tông.' },
    kim_cang_bang: { id: 'kim_cang_bang', name: 'Kim Cang Bảo Bảng', icon: '🥖', type: 'weapon', weaponClass: 'thieulam', rarity: 3, price: 2400, tier: 2, stats: { atk: 20 }, shop: true, desc: 'Tăng 20 công kích. Thần binh Thiếu Lâm.' },
    vodang_kiem: { id: 'vodang_kiem', name: 'Võ Đang Thanh Kiếm', icon: '⚔️', type: 'weapon', weaponClass: 'vodang', rarity: 1, price: 320, tier: 1, stats: { atk: 9, crit: 1 }, shop: true, desc: 'Tăng 9 công kích, 1% bạo kích.' },
    chan_vu_kiem: { id: 'chan_vu_kiem', name: 'Chân Vũ Bảo Kiếm', icon: '🗡️', type: 'weapon', weaponClass: 'vodang', rarity: 3, price: 2600, tier: 2, stats: { atk: 21, crit: 3 }, shop: true, desc: 'Tăng 21 công kích, 3% bạo kích.' },
    duong_mon_tieu: { id: 'duong_mon_tieu', name: 'Đường Môn Độc Tiêu', icon: '🎭', type: 'weapon', weaponClass: 'duongmon', rarity: 1, price: 330, tier: 1, stats: { atk: 9 }, shop: true, desc: 'Tăng 9 công kích. Tú đầu tử độc tâm.' },
    van_doc_ma_tieu: { id: 'van_doc_ma_tieu', name: 'Vạn Độc Ma Tiêu', icon: '🩸', type: 'weapon', weaponClass: 'duongmon', rarity: 3, price: 2700, tier: 2, stats: { atk: 22, crit: 2 }, shop: true, desc: 'Tăng 22 công kích, 2% bạo kích.' },
    nga_my_hoan: { id: 'nga_my_hoan', name: 'Nga My Bảo Hoàn', icon: '⭕', type: 'weapon', weaponClass: 'ngamy', rarity: 1, price: 310, tier: 1, stats: { atk: 8, mp: 20 }, shop: true, desc: 'Tăng 8 công kích, 20 nội lực.' },
    tuyet_tran_hoan: { id: 'tuyet_tran_hoan', name: 'Tuyệt Trần Song Hoàn', icon: '💍', type: 'weapon', weaponClass: 'ngamy', rarity: 3, price: 2500, tier: 2, stats: { atk: 20, mp: 50 }, shop: true, desc: 'Tăng 20 công kích, 50 nội lực.' },
    /* --- giáp các loại --- */
    thiet_dau_kinh: { id: 'thiet_dau_kinh', name: 'Thiết Đầu Kính', icon: '🪖', type: 'helmet', rarity: 1, price: 200, tier: 1, stats: { def: 4, hp: 20 }, shop: true, desc: 'Phòng +4, sinh lực +20.' },
    long_lan_khoi: { id: 'long_lan_khoi', name: 'Long Lân Đầu Khôi', icon: '👑', type: 'helmet', rarity: 3, price: 1600, tier: 2, stats: { def: 9, hp: 60 }, shop: true, desc: 'Phòng +9, sinh lực +60.' },
    bo_bao: { id: 'bo_bao', name: 'Võ Sĩ Bố Bào', icon: '👕', type: 'armor', rarity: 1, price: 240, tier: 1, stats: { def: 6, hp: 30 }, shop: true, desc: 'Phòng +6, sinh lực +30.' },
    kim_to_giap: { id: 'kim_to_giap', name: 'Kim Tơ Bảo Giáp', icon: '🥼', type: 'armor', rarity: 3, price: 2000, tier: 2, stats: { def: 13, hp: 90 }, shop: true, desc: 'Phòng +13, sinh lực +90.' },
    bo_ho_uyan: { id: 'bo_ho_uyan', name: 'Bố Hộ Uyển', icon: '🧤', type: 'gloves', rarity: 1, price: 150, tier: 1, stats: { def: 3, atk: 2 }, shop: true, desc: 'Phòng +3, công +2.' },
    huyen_thiet_uyan: { id: 'huyen_thiet_uyan', name: 'Huyền Thiết Hộ Uyển', icon: '🥊', type: 'gloves', rarity: 3, price: 1300, tier: 2, stats: { def: 6, atk: 6 }, shop: true, desc: 'Phòng +6, công +6.' },
    ma_du_hiep: { id: 'ma_du_hiep', name: 'Ma Du Hiệp', icon: '👟', type: 'boots', rarity: 1, price: 160, tier: 1, stats: { def: 2, spd: 0.3 }, shop: true, desc: 'Phòng +2, thân pháp +0.3.' },
    phong_hanh_lu: { id: 'phong_hanh_lu', name: 'Phong Hành Lư', icon: '🥿', type: 'boots', rarity: 3, price: 1400, tier: 2, stats: { def: 4, spd: 0.8 }, shop: true, desc: 'Phòng +4, thân pháp +0.8.' },
    dong_gioi_chi: { id: 'dong_gioi_chi', name: 'Đồng Giới Chỉ', icon: '🥮', type: 'ring', rarity: 1, price: 180, tier: 1, stats: { crit: 2, atk: 1 }, shop: true, desc: 'Bạo kích +2%, công +1.' },
    loi_dinh_gioi_chi: { id: 'loi_dinh_gioi_chi', name: 'Lôi Đình Giới Chỉ', icon: '💠', type: 'ring', rarity: 3, price: 1500, tier: 2, stats: { crit: 5, atk: 4 }, shop: true, desc: 'Bạo kích +5%, công +4.' },
    binh_an_phu: { id: 'binh_an_phu', name: 'Bình An Phù', icon: '🧿', type: 'amulet', rarity: 1, price: 170, tier: 1, stats: { hp: 25, mp: 20 }, shop: true, desc: 'Sinh lực +25, nội lực +20.' },
    ho_than_ngoc_phu: { id: 'ho_than_ngoc_phu', name: 'Hộ Thân Ngọc Phù', icon: '🔮', type: 'amulet', rarity: 3, price: 1550, tier: 2, stats: { hp: 80, mp: 60, def: 3 }, shop: true, desc: 'Sinh lực +80, nội lực +60, phòng +3.' },
    /* --- đặc biệt --- */
    hoang_ma_lenh: { id: 'hoang_ma_lenh', name: 'Hoàng Mã Lệnh', icon: '🐴', type: 'mount', rarity: 3, price: 0, stack: 1, desc: 'Tín vật thu phục Hắc Tuấn Mã — dùng để cưỡi ngựa (phím Z).' },
    thien_nga_bao_hap: { id: 'thien_nga_bao_hap', name: 'Thiên Nga Bảo Hạp', icon: '🎁', type: 'box', rarity: 2, price: 500, stack: 10, shop: true, desc: 'Mở ra nhận vũ khí tương ứng môn phái.' },
    than_binh_bao_hap: { id: 'than_binh_bao_hap', name: 'Thần Binh Bảo Hạp', icon: '🏆', type: 'box', rarity: 4, price: 0, stack: 10, desc: 'Mở ra nhận thần binh tier 2 theo môn phái + nguyên liệu.' }
  };

  /* -------- nơi chợ bán gì (Trần Thương) -------- */
  D.shopStock = {
    tran_thuong: ['hoi_nguyen_dan', 'dai_hoi_nguyen_dan', 'huyen_linh_dan', 'dai_huyen_linh_dan', 'ngu_hoa_tu', 'thien_nga_bao_hap', 'thiet_dau_kinh', 'bo_bao', 'bo_ho_uyan', 'ma_du_hiep', 'dong_gioi_chi', 'binh_an_phu', 'long_lan_khoi', 'kim_to_giap', 'huyen_thiet_uyan', 'phong_hanh_lu', 'loi_dinh_gioi_chi', 'ho_than_ngoc_phu'],
    tieu_nhi: ['hoi_nguyen_dan', 'huyen_linh_dan', 'ngu_hoa_tu', 'dai_hoi_nguyen_dan'],
    weaponsByClass: { thieulam: ['thieu_lam_bang', 'kim_cang_bang'], vodang: ['vodang_kiem', 'chan_vu_kiem'], duongmon: ['duong_mon_tieu', 'van_doc_ma_tieu'], ngamy: ['nga_my_hoan', 'tuyet_tran_hoan'] }
  };

  /* -------- phụ thuộc cường hóa -------- */
  D.affixes = [
    { id: 'ten_loi', name: 'Tên Lôi', stat: 'atk', add: 3 },
    { id: 'huyet_vuong', name: 'Huyết Vượng', stat: 'hp', add: 30 },
    { id: 'linh_quy', name: 'Linh Quy', stat: 'mp', add: 20 },
    { id: 'phong_khinh', name: 'Phong Khinh', stat: 'spd', add: 0.2 },
    { id: 'ban_tinh', name: 'Bạo Tính', stat: 'crit', add: 2 },
    { id: 'kim_than', name: 'Kim Thân', stat: 'def', add: 3 },
    { id: 'hac_thien', name: 'Hắc Thiên', stat: 'atk', add: 2 },
    { id: 'nguyet_hoa', name: 'Nguyệt Hoa', stat: 'hp', add: 20 }
  ];

  /* ===================== QUÁI ===================== */
  D.monsters = {
    fox: { id: 'fox', name: 'Hồ Ly Tinh', model: 'fox', height: 0.95, level: 2, hp: 120, atk: 10, def: 3, xp: 26, silver: [4, 10], aggro: 8, speed: 3.6, attackRange: 1.7, attackCd: 1.7, wander: 6, leash: 16, animMap: { idle: 'Survey', walk: 'Walk', run: 'Run' }, elite: { chance: 0.08, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'linh_thach', chance: 0.35, qty: [1, 2] }, { id: 'hoi_nguyen_dan', chance: 0.2, qty: [1, 1] }] },
    stork: { id: 'stork', name: 'Bạch Vân Hạc', model: 'stork', height: 0.8, fly: 2.0, level: 3, hp: 105, atk: 11, def: 2, xp: 30, silver: [5, 12], aggro: 9, speed: 4.4, attackRange: 2.2, attackCd: 2.0, wander: 9, leash: 18, animMap: {}, elite: { chance: 0.08, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'linh_thach', chance: 0.3, qty: [1, 1] }, { id: 'tuyet_linh_chi', chance: 0.12, qty: [1, 1] }] },
    parrot: { id: 'parrot', name: 'Linh Vũ Điểu', model: 'parrot', height: 0.55, fly: 1.6, level: 2, hp: 85, atk: 9, def: 2, xp: 22, silver: [3, 8], aggro: 8, speed: 4.8, attackRange: 2.0, attackCd: 1.9, wander: 10, leash: 16, animMap: {}, elite: { chance: 0.06, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'linh_thach', chance: 0.25, qty: [1, 1] }] },
    flamingo: { id: 'flamingo', name: 'Huyết Hạc', model: 'flamingo', height: 0.85, fly: 1.8, level: 4, hp: 150, atk: 13, def: 4, xp: 38, silver: [6, 14], aggro: 9, speed: 4.2, attackRange: 2.2, attackCd: 2.0, wander: 9, leash: 18, animMap: {}, elite: { chance: 0.1, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'ho_cot', chance: 0.3, qty: [1, 2] }, { id: 'huyen_linh_dan', chance: 0.15, qty: [1, 1] }] },
    rigged: { id: 'rigged', name: 'Mộng Ma Ảnh', model: 'rigged', height: 1.8, tint: 0x8899ff, level: 5, hp: 220, atk: 15, def: 6, xp: 46, silver: [8, 18], aggro: 10, speed: 3.9, attackRange: 2.0, attackCd: 1.8, wander: 7, leash: 18, animMap: {}, elite: { chance: 0.12, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'linh_thach', chance: 0.4, qty: [1, 3] }, { id: 'ho_cot', chance: 0.25, qty: [1, 2] }] },
    soldier: { id: 'soldier', name: 'Hắc Phong Phỉ', model: 'soldier', height: 1.8, tint: 0x556677, level: 6, hp: 260, atk: 17, def: 7, xp: 52, silver: [10, 22], aggro: 11, speed: 4.0, attackRange: 2.2, attackCd: 1.7, wander: 8, leash: 20, animMap: { idle: 'Idle', walk: 'Walk', run: 'Run' }, elite: { chance: 0.12, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'hac_thiet', chance: 0.45, qty: [1, 2] }, { id: 'hoi_nguyen_dan', chance: 0.25, qty: [1, 2] }] },
    xbot: { id: 'xbot', name: 'Dạ Xích Sát', model: 'xbot', height: 1.85, tint: 0x9933aa, level: 7, hp: 300, atk: 19, def: 8, xp: 60, silver: [12, 26], aggro: 12, speed: 4.2, attackRange: 2.3, attackCd: 1.6, wander: 8, leash: 20, animMap: { idle: 'idle', walk: 'walk', run: 'run', attack: 'agree' }, elite: { chance: 0.14, hpMult: 2.4, atkMult: 1.5 }, drops: [{ id: 'hac_thiet', chance: 0.5, qty: [1, 3] }, { id: 'huyen_linh_dan', chance: 0.25, qty: [1, 1] }] },
    cesiumman: { id: 'cesiumman', name: 'Cương Thi', model: 'cesiumman', height: 1.75, tint: 0x66ff88, level: 7, hp: 280, atk: 18, def: 5, xp: 58, silver: [10, 24], aggro: 13, speed: 2.9, attackRange: 1.9, attackCd: 2.0, wander: 5, leash: 18, animMap: {}, elite: { chance: 0.14, hpMult: 2.6, atkMult: 1.6 }, drops: [{ id: 'ho_cot', chance: 0.4, qty: [1, 2] }, { id: 'linh_thach', chance: 0.35, qty: [1, 2] }] },
    robot: { id: 'robot', name: 'Cơ Quan Mộc Nhân', model: 'robot', height: 1.7, level: 8, hp: 360, atk: 21, def: 12, xp: 70, silver: [14, 30], aggro: 10, speed: 3.4, attackRange: 2.2, attackCd: 1.9, wander: 6, leash: 18, animMap: { idle: 'Idle', walk: 'Walking', run: 'Running', attack: 'Punch', death: 'Death' }, elite: { chance: 0.15, hpMult: 2.5, atkMult: 1.5 }, drops: [{ id: 'hac_thiet', chance: 0.55, qty: [1, 3] }, { id: 'tuyet_linh_chi', chance: 0.2, qty: [1, 1] }] },
    horse: { id: 'horse', name: 'Hắc Tuấn Mã', model: 'horse', height: 1.6, level: 9, hp: 420, atk: 14, def: 10, xp: 80, silver: [15, 35], aggro: 0, speed: 5.5, attackRange: 2.0, attackCd: 2.5, wander: 10, leash: 24, animMap: { run: 'gallop' }, elite: { chance: 0.1, hpMult: 2, atkMult: 1.4 }, drops: [{ id: 'hoang_ma_lenh', chance: 0.45, qty: [1, 1] }, { id: 'ho_cot', chance: 0.5, qty: [1, 2] }] }
  };

  /* ===================== BOSS ===================== */
  D.bosses = {
    helmet: {
      id: 'helmet', name: 'Vong Giáp Đại Tướng', model: 'helmet', height: 1.1, fly: 2.4,
      tint: 0x88aaff, level: 6, hp: 2400, atk: 26, def: 14, xp: 380, silver: [220, 320], gold: [2, 3],
      aggro: 13, speed: 3.6, attackRange: 2.6, attackCd: 2.2,
      phases: [
        { at: 0.7, msg: 'Vong Giáp triệu hồi âm binh!', adds: { id: 'cesiumman', count: 2 }, skills: ['aoe', 'roar'] },
        { at: 0.35, msg: 'Giáp binh xuất trận — phi động chấn địa!', skills: ['aoe', 'charge', 'roar'] }
      ],
      skills: [
        { name: 'Giáp Ảnh Trấn', type: 'aoe', mult: 1.6, radius: 3.2, cd: 6 },
        { name: 'Phong Ma Xung', type: 'charge', mult: 1.9, cd: 9 },
        { name: 'Vong Giáp Trận Hống', type: 'roar', buff: { stat: 'atk', mult: 0.3, dur: 10 }, cd: 14 }
      ]
    },
    michelle: {
      id: 'michelle', name: 'Huyễn Vũ Ma Nữ', model: 'michelle', height: 1.75,
      tint: 0xff6a9e, level: 8, hp: 3400, atk: 30, def: 15, xp: 480, silver: [280, 420], gold: [3, 4],
      aggro: 13, speed: 4.2, attackRange: 2.4, attackCd: 1.9, animMap: { idle: 'dance' },
      phases: [
        { at: 0.7, msg: 'Vũ bộ lạc hoa — độc tán tứ tán!', adds: { id: 'fox', count: 3 }, skills: ['aoe', 'summon'] },
        { at: 0.35, msg: 'Mộng cảnh vĩnh trầm — ngươi không thể tỉnh!', skills: ['aoe', 'charge', 'aoe'] }
      ],
      skills: [
        { name: 'Huyễn Vũ Đoạt Hồn', type: 'aoe', mult: 1.7, radius: 3.4, cd: 6 },
        { name: 'Lạc Vũ Tập Kích', type: 'charge', mult: 2.0, cd: 8 },
        { name: 'Ma Vũ Triệu Hồn', type: 'summon', id: 'xbot', count: 2, cd: 18 }
      ]
    },
    brainstem: {
      id: 'brainstem', name: 'Cơ Quan Thánh Thủ', model: 'brainstem', height: 2.6,
      level: 10, hp: 5200, atk: 36, def: 22, xp: 620, silver: [350, 520], gold: [4, 5],
      aggro: 14, speed: 3.2, attackRange: 2.8, attackCd: 2.0, animMap: {},
      phases: [
        { at: 0.7, msg: 'Cơ quan đồng khởi — lôi đình vạn năm!', adds: { id: 'robot', count: 2 }, skills: ['aoe', 'charge'] },
        { at: 0.35, msg: 'Thánh thủ chưa từng bại — nghênh chiến đi!', skills: ['aoe', 'charge', 'roar'] }
      ],
      skills: [
        { name: 'Lôi Đình Chấn', type: 'aoe', mult: 1.8, radius: 3.6, cd: 6 },
        { name: 'Thánh Thủ Trảm', type: 'charge', mult: 2.2, cd: 8 },
        { name: 'Kim Cang Hống', type: 'roar', buff: { stat: 'atk', mult: 0.35, dur: 10 }, cd: 15 }
      ]
    },
    dragon: {
      id: 'dragon', name: 'Hắc Long Vương', model: 'dragon', height: 4.2, fly: 2.6,
      level: 12, hp: 7800, atk: 44, def: 26, xp: 900, silver: [500, 800], gold: [6, 8],
      aggro: 16, speed: 4.4, attackRange: 3.4, attackCd: 1.8, animMap: {},
      phases: [
        { at: 0.75, msg: 'Hắc Long thăng thiên — hỏa diễm tha thiên!', skills: ['aoe', 'charge'] },
        { at: 0.4, msg: 'Long uy áp cảnh — tất cả quy về hư vô!', adds: { id: 'xbot', count: 3 }, skills: ['aoe', 'charge', 'summon'] }
      ],
      skills: [
        { name: 'Hắc Long Thổ Hỏa', type: 'aoe', mult: 1.9, radius: 4.0, cd: 5 },
        { name: 'Long Trảo Trảo Tâm', type: 'charge', mult: 2.3, cd: 7 },
        { name: 'Long Ảnh Triệu Hồn', type: 'summon', id: 'cesiumman', count: 3, cd: 20 }
      ]
    },
    monster: {
      id: 'monster', name: 'Cửu Vĩ Huyết Hồ', model: 'fox', height: 3.4,
      tint: 0xcc2222, level: 15, hp: 12000, atk: 55, def: 30, xp: 1500, silver: [900, 1400], gold: [10, 15],
      aggro: 18, speed: 3.8, attackRange: 3.2, attackCd: 1.7, animMap: {},
      phases: [
        { at: 0.8, msg: 'Huyết Ma nộ vọng — thiên địa nhuốm đỏ!', adds: { id: 'cesiumman', count: 3 }, skills: ['aoe', 'roar'] },
        { at: 0.5, msg: 'Ma huyết thủy lao — cuốn theo tất cả!', adds: { id: 'xbot', count: 3 }, skills: ['aoe', 'charge', 'summon'] },
        { at: 0.25, msg: 'Ta chính là ác mộng của võ lâm!', skills: ['aoe', 'charge', 'aoe', 'roar'] }
      ],
      skills: [
        { name: 'Huyết Hải Độn Thiên', type: 'aoe', mult: 2.0, radius: 4.4, cd: 5 },
        { name: 'Ma Trảo Xuyên Tâm', type: 'charge', mult: 2.5, cd: 7 },
        { name: 'Huyết Ma Hống Thiên', type: 'roar', buff: { stat: 'atk', mult: 0.4, dur: 12 }, cd: 14 },
        { name: 'Ma Ấn Triệu Hồn', type: 'summon', id: 'robot', count: 3, cd: 18 }
      ]
    }
  };

  /* ===================== BẢN ĐỒ (SCENES) ===================== */
  D.scenes = {
    mong_hanh_son: {
      id: 'mong_hanh_son', name: 'Mộng Hoành Sơn', desc: 'Thôn trang an nhiên dưới chân Hoành Sơn — nơi bắt đầu giang hồ.',
      bgm: 'village', safe: true,
      terrain: { seed: 20261, size: 220, waterLevel: -0.6, amplitude: 4.2, mountains: 14 },
      sky: { top: '#4a90d9', horizon: '#bfe3ff', sun: '#fff2cc', ambient: 0.55, hemi: 0.6 },
      fog: { color: '#c8ddEE', density: 0.0038 },
      weather: { type: 'clear', wind: 0.4 },
      props: { trees: 130, rocks: 40, houses: 8, pagoda: 1, bridge: 1, lanterns: 10, campfire: 1 },
      spawn: [0, 6],
      npcSpawns: [
        { npc: 'su_phu', x: 3, z: 4 }, { npc: 'thon_truong', x: -6, z: 2 },
        { npc: 'tran_thuong', x: 8, z: -3 }, { npc: 'tieu_nhi', x: -9, z: -4 },
        { npc: 'ly_thiet', x: 10, z: 5 }, { npc: 'phong_van', x: 0, z: -8 },
        { npc: 'lenh_hiep', x: 14, z: -6 }
      ],
      monsterSpawns: [
        { monster: 'parrot', count: 4, center: [30, 20], radius: 16 },
        { monster: 'stork', count: 4, center: [-34, -18], radius: 16 },
        { monster: 'fox', count: 5, center: [26, -30], radius: 18 }
      ],
      portals: [
        { to: 'van_truc_lam', x: 45, z: 0, label: 'Vạn Trúc Lâm' },
        { to: 'hac_phong_coc', x: -45, z: 0, label: 'Hắc Phong Cốc' }
      ]
    },
    van_truc_lam: {
      id: 'van_truc_lam', name: 'Vạn Trúc Lâm', desc: 'Rừng trúc xanh thẫm, tiếng gió như tiếng kiếm.',
      bgm: 'forest', safe: false,
      terrain: { seed: 77713, size: 220, waterLevel: -0.8, amplitude: 5.0, mountains: 16 },
      sky: { top: '#3b6b8f', horizon: '#ffd9a0', sun: '#ffd0a0', ambient: 0.5, hemi: 0.55 },
      fog: { color: '#9fbf9a', density: 0.009 },
      weather: { type: 'clear', wind: 0.7 },
      props: { trees: 60, rocks: 30, bamboo: 220, lanterns: 6 },
      spawn: [0, 10],
      npcSpawns: [{ npc: 'lenh_hiep', x: 2, z: 6 }],
      monsterSpawns: [
        { monster: 'fox', count: 8, center: [-20, -15], radius: 24 },
        { monster: 'flamingo', count: 5, center: [25, 18], radius: 20 },
        { monster: 'rigged', count: 6, center: [18, -28], radius: 22 }
      ],
      bossSpawn: { boss: 'helmet', x: 0, z: -35 },
      portals: [
        { to: 'mong_hanh_son', x: -45, z: 0, label: 'Mộng Hoành Sơn' },
        { to: 'tuyet_linh', x: 45, z: 0, label: 'Tuyết Lĩnh', reqLevel: 6 }
      ]
    },
    hac_phong_coc: {
      id: 'hac_phong_coc', name: 'Hắc Phong Cốc', desc: 'Cốc sâu tăm tối, phỉ khấu gấp năm đường ma phường.',
      bgm: 'canyon', safe: false,
      terrain: { seed: 90210, size: 220, waterLevel: -1.2, amplitude: 8.0, mountains: 22 },
      sky: { top: '#1a1a2e', horizon: '#4a3a5e', sun: '#ff8860', ambient: 0.35, hemi: 0.4 },
      fog: { color: '#2a2438', density: 0.013 },
      weather: { type: 'rain', wind: 1.2 },
      props: { trees: 40, rocks: 70, lanterns: 4, campfire: 2 },
      spawn: [0, 12],
      npcSpawns: [{ npc: 'phong_van', x: 0, z: 8 }],
      monsterSpawns: [
        { monster: 'soldier', count: 7, center: [-22, -10], radius: 22 },
        { monster: 'xbot', count: 6, center: [24, 12], radius: 22 },
        { monster: 'cesiumman', count: 6, center: [0, -25], radius: 20 }
      ],
      bossSpawn: { boss: 'michelle', x: 0, z: -38 },
      portals: [
        { to: 'mong_hanh_son', x: -45, z: 0, label: 'Mộng Hoành Sơn' },
        { to: 'ma_canh', x: 45, z: 0, label: 'Long Môn Mật Cảnh', reqLevel: 10 }
      ]
    },
    tuyet_linh: {
      id: 'tuyet_linh', name: 'Tuyết Lĩnh', desc: 'Nghìn trượng băng phong, tuyết rơi không ngừng.',
      bgm: 'snow', safe: false,
      terrain: { seed: 51515, size: 220, waterLevel: -1.0, amplitude: 9.0, mountains: 26 },
      sky: { top: '#8ea8c3', horizon: '#e8f0f8', sun: '#eef4ff', ambient: 0.6, hemi: 0.65 },
      fog: { color: '#dce8f2', density: 0.011 },
      weather: { type: 'snow', wind: 0.9 },
      props: { trees: 70, rocks: 50, lanterns: 4 },
      spawn: [0, 12],
      npcSpawns: [{ npc: 'tieu_nhi', x: 2, z: 6 }],
      monsterSpawns: [
        { monster: 'robot', count: 7, center: [-20, -18], radius: 22 },
        { monster: 'horse', count: 4, center: [25, 15], radius: 20 },
        { monster: 'stork', count: 4, center: [12, -30], radius: 18 }
      ],
      bossSpawn: { boss: 'brainstem', x: 0, z: -36 },
      portals: [
        { to: 'van_truc_lam', x: -45, z: 0, label: 'Vạn Trúc Lâm' },
        { to: 'ma_canh', x: 45, z: 0, label: 'Long Môn Mật Cảnh', reqLevel: 10 }
      ]
    },
    ma_canh: {
      id: 'ma_canh', name: 'Long Môn Mật Cảnh', desc: 'Mật cảnh ngàn năm — nơi Huyết Ma Quân phong ấn.',
      bgm: 'boss', safe: false,
      terrain: { seed: 66666, size: 200, waterLevel: -2.0, amplitude: 6.0, mountains: 20 },
      sky: { top: '#2b0a12', horizon: '#8a2b1e', sun: '#ff5a3a', ambient: 0.4, hemi: 0.35 },
      fog: { color: '#3a1418', density: 0.012 },
      weather: { type: 'ash', wind: 0.6 },
      props: { trees: 0, rocks: 60, spikes: 26, lanterns: 8, campfire: 4 },
      spawn: [0, 30],
      npcSpawns: [],
      monsterSpawns: [
        { monster: 'cesiumman', count: 6, center: [-25, 0], radius: 20 },
        { monster: 'xbot', count: 5, center: [25, 5], radius: 20 }
      ],
      bossSpawn: { boss: 'dragon', x: 0, z: -30 },
      bossSpawn2: { boss: 'monster', x: 0, z: -55 },
      portals: [
        { to: 'hac_phong_coc', x: -45, z: 0, label: 'Hắc Phong Cốc' },
        { to: 'tuyet_linh', x: 0, z: 45, label: 'Tuyết Lĩnh' }
      ]
    }
  };

  /* ===================== NPC ===================== */
  D.npcs = {
    su_phu: { id: 'su_phu', name: 'Trương Tam Phong', icon: '🧙', model: 'tamphong', height: 1.8, role: 'quest', greeting: 'Ngươi tới rồi. Võ lâm loạn thế, chính cần người như ngươi xuất sơn.', wander: 0 },
    lenh_hiep: { id: 'lenh_hiep', name: 'Lệnh Hồ Đại Hiệp', icon: '🍶', model: 'lenhhosung', height: 1.8, role: 'quest', greeting: 'Rượu ngọt, kiếm lợi hại. Hiệp khách, cùng uống một chén không?', wander: 1 },
    thon_truong: { id: 'thon_truong', name: 'Thôn Trưởng Trần', icon: '👨‍🌾', model: 'soldier', tint: 0xc9a227, height: 1.8, role: 'quest', greeting: 'Hoành Sơn thái bình mấy chục năm, giờ đồ yêu nổi dậy... ngươi xem có giúp được không?', wander: 0 },
    tran_thuong: { id: 'tran_thuong', name: 'Trần Thương', icon: '🏪', model: 'michelle', tint: 0xffcf6a, height: 1.7, role: 'shop', greeting: 'Binh khí, đan dược, bảo hạp — thứ nào cũng có! Cần mua gì cứ nói.', wander: 0 },
    tieu_nhi: { id: 'tieu_nhi', name: 'Tiểu Nhi', icon: '🍡', model: 'coco', height: 0.9, role: 'shop', greeting: 'Meo~ Tiểu Nhi có đan dược ngon lắm đó!', wander: 1 },
    ly_thiet: { id: 'ly_thiet', name: 'Lý Thiết Tương', icon: '🔨', model: 'xbot', tint: 0xb0b8c4, height: 1.8, role: 'smith', greeting: 'Lò lửa chưa tắt bao giờ. Mang Linh Thạch tới, ta giúp ngươi cường hóa!', wander: 0 },
    phong_van: { id: 'phong_van', name: 'Phong Vân Tử', icon: '🌀', model: 'robot', tint: 0xb070ff, height: 1.7, role: 'warp', greeting: 'Phong vân biến ảo, đất trời vào tay. Bản đồ võ lâm đã sẵn sàng.', wander: 0 }
  };

  /* ===================== NHIỆM VỤ ===================== */
  D.quests = [
    { id: 'q1', name: 'Sơ Nhập Giang Hồ', giver: 'su_phu', type: 'talk', target: 'su_phu', count: 1, minLevel: 1, desc: 'Bái kiến Sư Phụ Trương Tam Phong tại Mộng Hoành Sơn.', story: 'Nghe nói võ lâm đại loạn, Huyết Ma giáo đứng dậy. Sư phụ triệu ngươi nhập môn.', rewards: { xp: 80, silver: 100, gold: 0 }, next: 'q2', auto: true },
    { id: 'q2', name: 'Trừ Hồ Giả Mộng', giver: 'su_phu', type: 'kill', target: 'fox', count: 5, minLevel: 1, desc: 'Tiêu diệt 5 Hồ Ly Tinh ngoài bìa rừng Hoành Sơn.', story: 'Hồ ly tinh giả làm mơ cảnh mê hoặc thôn dân. Diệt bớt chúng!', rewards: { xp: 130, silver: 150, gold: 0, items: [{ id: 'hoi_nguyen_dan', qty: 3 }] }, next: 'q3', auto: true },
    { id: 'q3', name: 'Linh Thạch Dị Biến', giver: 'su_phu', type: 'collect', target: 'linh_thach', count: 3, minLevel: 2, desc: 'Thu thập 3 Linh Thạch từ yêu thú.', story: 'Linh thạch trong thân yêu thú là nguyên liệu cường hóa.', rewards: { xp: 170, silver: 200, gold: 1 }, next: 'q4', auto: true },
    { id: 'q4', name: 'Luyện Binh Trong Trận', giver: 'ly_thiet', type: 'talk', target: 'ly_thiet', count: 1, minLevel: 2, desc: 'Gặp Lý Thiết Tương — thợ rèn của thôn.', story: 'Muốn có binh khí tốt, phải đến lò rèn. Ông Lý đợi ngươi lâu rồi.', rewards: { xp: 110, silver: 120, gold: 0, items: [{ id: 'thien_nga_bao_hap', qty: 1 }] }, next: 'q5', auto: true },
    { id: 'q5', name: 'Hạc Ảnh Loạn Thiên', giver: 'thon_truong', type: 'kill', target: 'stork', count: 4, minLevel: 3, desc: 'Diệt 4 Bạch Vân Hạc quấy nhiễu bờ suối.', story: 'Hạc đàn đuổi dân đánh cá. Trượng phu, giải giúp!', rewards: { xp: 200, silver: 220, gold: 0 }, next: 'q6', auto: true },
    { id: 'q6', name: 'Vào Lâm Trúc', giver: 'thon_truong', type: 'reach', target: 'van_truc_lam', count: 1, minLevel: 3, desc: 'Dịch chuyển tới Vạn Trúc Lâm qua cổng phía Đông.', story: 'Rừng trúc có chuyện lạ. Đến đó tự ngươi sẽ biết.', rewards: { xp: 130, silver: 100, gold: 0 }, next: 'q7', auto: true },
    { id: 'q7', name: 'Mộng Ma Vòng Trần', giver: 'lenh_hiep', type: 'kill', target: 'rigged', count: 5, minLevel: 4, desc: 'Tiêu diệt 5 Mộng Ma Ảnh trong Vạn Trúc Lâm.', story: 'Mộng ma đêm đêm cướp mộng người luyện kiếm. Giúp ta dẹp yên!', rewards: { xp: 260, silver: 300, gold: 1 }, next: 'q8', auto: true },
    { id: 'q8', name: 'Vong Giáp Chi Dạ', giver: 'lenh_hiep', type: 'boss', target: 'helmet', count: 1, minLevel: 5, desc: 'Đánh bại Vong Giáp Đại Tướng ở trung tâm Vạn Trúc Lâm.', story: 'Giáp binh cũ không yên — đại tướng vong linh đứng dậy. Chém hắn!', rewards: { xp: 420, silver: 500, gold: 3, items: [{ id: 'dai_hoi_nguyen_dan', qty: 2 }] }, next: 'q9', auto: true },
    { id: 'q9', name: 'Hắc Thiết Luyện Thần', giver: 'ly_thiet', type: 'collect', target: 'hac_thiet', count: 5, minLevel: 5, desc: 'Thu thập 5 Hắc Thiết.', story: 'Cần thêm hắc thiết để rèn hộ uyển mới. Mang về cho ta.', rewards: { xp: 280, silver: 320, gold: 1 }, next: 'q10', auto: true },
    { id: 'q10', name: 'Phong Vân Khởi Xưa', giver: 'phong_van', type: 'talk', target: 'phong_van', count: 1, minLevel: 6, desc: 'Gặp Phong Vân Tử để mở khóa bản đồ võ lâm.', story: 'Bản đồ võ lâm trong tay lão nhân gia này — ai gặp may mắn cả đời.', rewards: { xp: 160, silver: 200, gold: 1 }, next: 'q11', auto: true },
    { id: 'q11', name: 'Vào Cốc Trừ Phỉ', giver: 'thon_truong', type: 'reach', target: 'hac_phong_coc', count: 1, minLevel: 6, desc: 'Dịch chuyển tới Hắc Phong Cốc.', story: 'Phỉ khấu Hắc Phong cướp bóc thương hồ. Cốc đó phía Tây.', rewards: { xp: 220, silver: 200, gold: 0 }, next: 'q12', auto: true },
    { id: 'q12', name: 'Phỉ Khấu Túc Thanh', giver: 'thon_truong', type: 'kill', target: 'soldier', count: 6, minLevel: 6, desc: 'Diệt 6 Hắc Phong Phỉ.', story: 'Trừ hết phỉ khấu, thương đạo mới thông.', rewards: { xp: 320, silver: 360, gold: 1 }, next: 'q13', auto: true },
    { id: 'q13', name: 'Huyễn Vũ Đoạt Hồn', giver: 'lenh_hiep', type: 'boss', target: 'michelle', count: 1, minLevel: 7, desc: 'Đánh bại Huyễn Vũ Ma Nữ cuối Hắc Phong Cốc.', story: 'Ma nữ vũ bộ đoạt hồn luyện kiếm sĩ. Cẩn thận độc tán của nàng!', rewards: { xp: 520, silver: 600, gold: 4, items: [{ id: 'hoi_sinh_dan', qty: 1 }] }, next: 'q14', auto: true },
    { id: 'q14', name: 'Thu Phục Tuấn Mã', giver: 'ly_thiet', type: 'collect', target: 'hoang_ma_lenh', count: 1, minLevel: 8, desc: 'Thu phục Hắc Tuấn Mã trên Tuyết Lĩnh để nhận Hoàng Mã Lệnh.', story: 'Ngựa trời dưới tuyết lỉnh — thu phục được thì cưỡi cả đời.', rewards: { xp: 300, silver: 340, gold: 1 }, next: 'q15', auto: true },
    { id: 'q15', name: 'Cơ Quan Đoạt Khí', giver: 'phong_van', type: 'boss', target: 'brainstem', count: 1, minLevel: 9, desc: 'Đánh bại Cơ Quan Thánh Thủ trên Tuyết Lĩnh.', story: 'Thánh thủ cơ quan nghìn năm —— đoạt lấy chân khí trong nó!', rewards: { xp: 640, silver: 700, gold: 5, items: [{ id: 'dai_huyen_linh_dan', qty: 2 }] }, next: 'q16', auto: true },
    { id: 'q16', name: 'Mật Cảnh Long Môn', giver: 'phong_van', type: 'reach', target: 'ma_canh', count: 1, minLevel: 10, desc: 'Vào Long Môn Mật Cảnh (yêu cầu cấp 10).', story: 'Phong ấn nghìn năm sắp tan. Mật cảnh nơi Huyết Ma trú ngụ.', rewards: { xp: 320, silver: 300, gold: 2 }, next: 'q17', auto: true },
    { id: 'q17', name: 'Long Trần Đoạn Hồn', giver: 'su_phu', type: 'boss', target: 'dragon', count: 1, minLevel: 11, desc: 'Đánh bại Hắc Long Vương trong Long Môn Mật Cảnh.', story: 'Hắc Long giữ cửa mật cảnh. Qua được hắn mới gặp Ma Quân.', rewards: { xp: 950, silver: 1000, gold: 8 }, next: 'q18', auto: true },
    { id: 'q18', name: 'Cửu Vĩ Hồ Vương', giver: 'su_phu', type: 'boss', target: 'monster', count: 1, minLevel: 12, desc: 'Đánh bại Cửu Vĩ Huyết Hồ — thủ lĩnh Huyết Ma giáo.', story: 'Trăm năm giang hồ nợ máu, hôm nay tất cả kết thúc!', rewards: { xp: 1600, silver: 2000, gold: 15, items: [{ id: 'than_binh_bao_hap', qty: 1 }] }, next: 'q19', auto: true },
    { id: 'q19', name: 'Võ Lâm Chi Chủ', giver: 'su_phu', type: 'talk', target: 'su_phu', count: 1, minLevel: 12, desc: 'Quay về bái kiến Sư Phụ — nhận danh hiệu Võ Lâm Chi Chủ.', story: 'Ngươi đã làm được điều mà cả võ lâm ngóng trông.', rewards: { xp: 600, silver: 1000, gold: 3 }, next: null, auto: false }
  ];

  /* ===================== THÀNH TỰU ===================== */
  D.achievements = [
    { id: 'kill_1', name: 'Nhất Kiếm Khai Phong', desc: 'Diệt con quái đầu tiên.', icon: '⚔️', cond: { k: 'kills', v: 1 }, reward: { silver: 50 } },
    { id: 'kill_50', name: 'Trảm Yêu Trừ Ma', desc: 'Diệt 50 quái.', icon: '🗡️', cond: { k: 'kills', v: 50 }, reward: { silver: 500 } },
    { id: 'kill_200', name: 'Sát Thần Bách Chiến', desc: 'Diệt 200 quái.', icon: '💀', cond: { k: 'kills', v: 200 }, reward: { silver: 2000, gold: 2 } },
    { id: 'boss_1', name: 'Sơ Thắng Ma Đầu', desc: 'Đánh bại boss đầu tiên.', icon: '👑', cond: { k: 'bosses', v: 1 }, reward: { silver: 800 } },
    { id: 'boss_5', name: 'Ngũ Ma Tất Dẹp', desc: 'Đánh bại cả 5 boss.', icon: '🏆', cond: { k: 'bosses', v: 5 }, reward: { silver: 5000, gold: 5 } },
    { id: 'lv10', name: 'Trúc Cơ Kỳ Duyên', desc: 'Đạt cấp 10.', icon: '🌟', cond: { k: 'level', v: 10 }, reward: { silver: 1000 } },
    { id: 'lv20', name: 'Kim Đan Thành Thánh', desc: 'Đạt cấp 20.', icon: '✨', cond: { k: 'level', v: 20 }, reward: { silver: 3000, gold: 3 } },
    { id: 'silver_10k', name: 'Gia Tư Vạn Lượng', desc: 'Kiếm tổng 10.000 bạc.', icon: '🥈', cond: { k: 'silver', v: 10000 }, reward: { gold: 2 } },
    { id: 'quest_10', name: 'Hành Hiệp Trượng Nghĩa', desc: 'Hoàn thành 10 nhiệm vụ.', icon: '📜', cond: { k: 'quests', v: 10 }, reward: { silver: 1000 } },
    { id: 'up_3', name: 'Thần Binh Luyện Thành', desc: 'Cường hóa trang bị tới +3.', icon: '🔨', cond: { k: 'upgrades', v: 3 }, reward: { silver: 800 } },
    { id: 'scene_5', name: 'Đạp Biến Ngũ Địa', desc: 'Khám phá đủ 5 bản đồ.', icon: '🗺️', cond: { k: 'scenes', v: 5 }, reward: { gold: 3 } },
    { id: 'gold_20', name: 'Đại Phú Hào', desc: 'Kiếm tổng 20 vàng.', icon: '🪙', cond: { k: 'gold', v: 20 }, reward: { silver: 1500 } }
  ];

  /* ===================== VĂN BẢN ===================== */
  D.story = [
    'Giang hồ đầy sóng gió — Huyết Ma giáo tái xuất giang hồ, năm phái phủ chín địa giới chấn động.',
    'Ngươi là đệ tử trẻ của Trương Tam Phong, xuất sơn thời điểm chính là lúc võ lâm cần người nhất.',
    'Năm tông địa: Mộng Hoành Sơn, Vạn Trúc Lâm, Hắc Phong Cốc, Tuyết Lĩnh, Long Môn Mật Cảnh.',
    'Năm Ma Đầu cầm binh: Vong Giáp, Huyễn Vũ, Cơ Quan Thánh Thủ, Hắc Long, và Huyết Ma Quân.'
  ];

  D.tips = [
    'Giữ chuột trái để liên tục đánh thường, phím 1-4 thi tuyệt kỹ.',
    'Phím Q lướt Thân Pháp — né đòn boss rất hiệu quả.',
    'Phím Tab hoặc nhấp chuột vào quái để khóa mục tiêu.',
    'Nhấn E để nói chuyện NPC, mở cổng dịch chuyển, nhặt đồ.',
    'Linh Thạch dùng để cường hóa trang bị ở Lý Thiết Tương.',
    'Bạc rơi từ quái — dùng mua đan dược tại Trần Thương.',
    'Vàng nhận từ nhiệm vụ và boss — dùng hồi sinh, cường hóa.',
    'Cưỡi Hắc Tuấn Mã (phím Z) sau khi có Hoàng Mã Lệnh!',
    'Thánh thú Coco theo chủ: nhặt đồ giùm và cắn hỗ trợ chiến đấu.',
    'Boss có telegraph vòng đỏ — ra khỏi vòng trước khi nổ!',
    'Ngày-đêm tự chuyển; ban đêm Cương Thi mạnh hơn.',
    'Tự lưu mỗi 30 giây; mở Cài đặt để xuất mã lưu phòng mất.'
  ];

  D.chatLines = [
    ['thiêu_lam_dev', 'Ai đi phó bản Hắc Phong Cốc không, thiếu 1 người!'],
    ['kiem_khach_88', 'Vừa cường hóa +3 thành công, phê quá!'],
    ['nga_my_lan', 'Bán Linh Thạch giá rẻ, pm em nha!'],
    ['duong_mon_vui', 'Boss Hắc Long kiểu gì cũng tấu xong trong 3 phút.'],
    ['hach_phong_dai', 'Chợ Trần Thương hôm nay có Kim Tơ Bảo Giáp đó mọi người!'],
    ['tam_phong_fan', 'Sư phụ Tam Phong đẹp trai nhất võ lâm.'],
    ['tuyet_linh_bac', 'Tuyết Lĩnh lạnh thật, ngựa thu phục mãi mới xong.'],
    ['van_truc_lam', 'Ngồi gốc trúc ngắm hoàng hôn đã đời!'],
    ['mon_do_muon', 'Ai cho xin ít Hồi Nguyên Đan với, sắp ẻm!'],
    ['newbie_2010', 'Lần đầu chơi, cảm ơn mọi người đã chỉ giáo!']
  ];

  D.chatBot = [
    'Chúc đại hiệp sát thương ngày càng mạnh!',
    'Võ lâm nhớ cũng như đời — người đến người đi.',
    'Nghe nói Huyết Ma Quân đã xuất hiện ở Long Môn Mật Cảnh...',
    'Đi phó bản nhớ mang đủ đan dược nhé!',
    'Cường hóa thất bại đừng khóc, Linh Thạch còn mà!',
    'Thánh thú Coco đáng yêu nhất võ lâm.'
  ];

  D.helpText = [
    '<h4>🎮 Điều khiển</h4>',
    '<table>',
    '<tr><td><b>W A S D / ⬆⬇⬅➡</b></td><td>Di chuyển</td></tr>',
    '<tr><td><b>Shift</b></td><td>Chạy nhanh</td></tr>',
    '<tr><td><b>Space</b></td><td>Nhảy</td></tr>',
    '<tr><td><b>Chuột trái</b></td><td>Đánh thường (giữ để liên hoàn)</td></tr>',
    '<tr><td><b>1 2 3 4</b></td><td>Tuyệt kỹ môn phái</td></tr>',
    '<tr><td><b>Q</b></td><td>Thân Pháp (lướt)</td></tr>',
    '<tr><td><b>E</b></td><td>Tương tác: NPC / cổng / nhặt đồ</td></tr>',
    '<tr><td><b>Tab / nhấp chuột</b></td><td>Chọn mục tiêu</td></tr>',
    '<tr><td><b>R</b></td><td>Dùng đan dược tốt nhất</td></tr>',
    '<tr><td><b>Z</b></td><td>Cưỡi / xuống ngựa</td></tr>',
    '<tr><td><b>I / C / K / J / M / H</b></td><td>Túi / Nhân vật / Kỹ năng / Nhiệm vụ / Bản đồ / Hướng dẫn</td></tr>',
    '<tr><td><b>Kéo chuột</b></td><td>Xoay camera · <b>Lăn chuột</b> thu phóng</td></tr>',
    '<tr><td><b>Esc</b></td><td>Đóng bảng / mở Cài đặt</td></tr>',
    '</table>',
    '<h4>📱 Cảm ứng</h4><p>Joystick trái để đi, nút bên phải để hành động, kéo màn hình để xoay camera.</p>',
    '<h4>⚔️ Chiến đấu</h4>',
    '<p>Đánh thường chuỗi 3 đòn; tuyệt kỹ tốn nội lực và có hồi chiêu. Bạo kích ×1.65 sát thương. Quái có cây "giận dữ": đánh nó thì nó lao vào bạn, nhưng đi quá xa nó bỏ chạy về hồi máu.</p>',
    '<h4>👹 Boss</h4>',
    '<p>Boss có nhiều giai đoạn: máu xuống ngưỡng thì nổi điên, triệu hồi linh binh, thi đại chiêu — <b>vòng đỏ trên đất</b> là báo trước vùng nổ, né ngay!</p>',
    '<h4>💰 Kinh tế</h4>',
    '<p><b>Bạc</b> rơi từ quái, dùng mua chợ. <b>Vàng</b> từ nhiệm vụ/boss, dùng hồi sinh và cường hóa. Cường hóa +1 cần Linh Thạch + vàng, tỉ lệ thành công giảm dần theo cấp.</p>',
    '<h4>🍃 Cảnh giới</h4>',
    '<p>Phàm Nhân → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Đăng Tiên — mỗi 3 cấp đột phá một cảnh giới.</p>'
  ].join('\n');

  MVL.Data = D;
})(window.MVL);
