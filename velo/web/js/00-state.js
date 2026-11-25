// ============================================================
// Quỷ Cốc Bát Hoang 3D — 00-state.js
// 00-state: §1 Global State + §2 Scene/Camera/Lights (dong goc 544-657) + data tables §11 (dong goc 2441-2523: ITEMS/SLOT_NAMES/SHOP_STOCK/SECTS/ACTIVITIES/EVENTS/PETS/GUILD_PRESETS/GUILD_MEMBERS, doi len truoc theo spec module — 0 tham chieu truoc dong 2436).
// Noi dung goc giu byte-identical; chi them dong window.QC o dau
// va dong Object.assign(window.QC, ...) o cuoi (khong doi ten bien/ham,
// khong doi thu tu cau lenh goc). Nap bang <script src> thuong, KHONG
// dung ES module (tranh loi CORS tren GitHub Pages / file://).
// ============================================================
window.QC = window.QC || {}; // Nhom 1 vong 3: namespace chung giua cac module (script thuong chia se global scope).
/* [00-state] Tach tu qu_c_c_b_t_hoang_3d.html goc. Chu thich: data tables o cuoi file von nam o §11 (dong 2441-2523), duoc doi len day theo dung mo ta module 00-state; cac khoi con lai giu nguyen thu tu goc. */
    /**
     * QUỶ CỐC BÁT HOANG 3D - WUXIA ISOMETRIC ACTION RPG
     * 100% True 3D Polygon Models, Articulated Chibi Character, 3D Combat & VFX
     */

    // ==========================================
    // 1. GLOBAL STATE & GAME CONFIGURATION
    // ==========================================
    const frameEl = document.getElementById('game-frame');
    const canvasEl = document.getElementById('three-canvas');
    const floatingLayer = document.getElementById('floating-text-layer');
    const minimapCanvas = document.getElementById('minimap-canvas');
    const minimapCtx = minimapCanvas.getContext('2d');

    const gameState = {
      level: 10,
      realmIndex: 0,
      realms: ['Trúc Cơ Kỳ', 'Kim Đan Kỳ', 'Nguyên Anh Kỳ', 'Hóa Thần Kỳ', 'Đăng Tiên Cảnh'],
      hp: 180,
      maxHp: 180,
      mp: 426,
      maxMp: 426,
      exp: 0,
      maxExp: 100,
      kills: 0,
      questTarget: 15,
      critChance: 0.35,
      dodgeChance: 0.12,
      attackPower: 68,
      auraTimer: 0,
      rageTimer: 0,
      pills: { hp: 10, mp: 8, rage: 5 },
      zoomPercent: 35, // Default 35% as requested
      cameraYaw: Math.PI / 4, // 45 deg true isometric angle
      cameraPitch: 0.72,      // Isometric elevation
      targetPos: null,
      attackAnimTimer: 0,
      spinAnimTimer: 0,
      autoAttackCooldown: 0,
      hitStopTimer: 0
    };

    const skills = [
      { id: 0, name: 'Chém Thường', mp: 0, cd: 0.45, currentCd: 0 },
      { id: 1, name: 'Kiếm Khí Trảm', mp: 15, cd: 2.2, currentCd: 0 },
      { id: 2, name: 'Vạn Kiếm Quy Tông', mp: 30, cd: 5.5, currentCd: 0 },
      { id: 3, name: 'Bát Hoang Toàn Phong', mp: 25, cd: 3.5, currentCd: 0 },
      { id: 4, name: 'Kim Cang Hộ Thể', mp: 35, cd: 7.0, currentCd: 0 },
      { id: 5, name: 'Thiên Lôi Kiếm Trận', mp: 50, cd: 9.0, currentCd: 0 },
      { id: 6, name: 'Cảnh Giới Đột Phá', mp: 80, cd: 15.0, currentCd: 0 }
    ];

    const keysPressed = {};
    const enemies = [];
    const projectiles = [];
    const vfxList = [];
    const floatingParticles = [];
    const waterfalls = [];
    const portals = [];

    // ==========================================
    // 2. THREE.JS SCENE, CAMERA & LIGHTING SETUP
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x163238);
    scene.fog = new THREE.FogExp2(0x1b3b42, 0.0115);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Perspective camera configured with narrow FOV & zoomed distance for true 3D Isometric feel
    const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.5, 250);

    function updateRendererSize() {
      const rect = frameEl.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', updateRendererSize);
    updateRendererSize();

    // Lighting matching the atmospheric jade/teal & warm golden spirit glow
    const hemiLight = new THREE.HemisphereLight(0x88d4dc, 0x1d2b24, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff1d6, 1.35);
    dirLight.position.set(22, 38, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 95;
    const d = 32;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Subtle rim light for 3D depth separation
    const rimLight = new THREE.DirectionalLight(0x4dd0e1, 0.55);
    rimLight.position.set(-25, 18, -22);
    scene.add(rimLight);

    // --- Catalog vat pham (id -> dinh nghia) ---
    const ITEMS = {
      hp_pill:    { name: 'Hồi Huyết Đan', icon: '🧪', type: 'potion', healHp: 85, priceGold: 20, sellGold: 10, desc: 'Hồi 85 HP ngay lập tức.' },
      mp_pill:    { name: 'Tụ Linh Đan', icon: '🔮', type: 'potion', healMp: 160, priceGold: 25, sellGold: 12, desc: 'Hồi 160 MP ngay lập tức.' },
      rage_pill:  { name: 'Bạo Linh Phù', icon: '📜', type: 'potion', rage: true, priceGold: 40, sellGold: 20, desc: 'Tăng tỉ lệ bạo kích 12 giây.' },
      wood_sword: { name: 'Kiếm Gỗ Đào', icon: '🗡️', type: 'equip', slot: 'weapon', atk: 8, priceGold: 120, sellGold: 60, desc: 'Vũ khí: +8 Công.' },
      iron_sword: { name: 'Kiếm Sắt Bát Hoang', icon: '⚔️', type: 'equip', slot: 'weapon', atk: 22, priceGold: 450, sellGold: 225, desc: 'Vũ khí: +22 Công.' },
      gold_sword: { name: 'Kim Kiếm Quỷ Cốc', icon: '🗡️', type: 'equip', slot: 'weapon', atk: 45, hp: 40, priceGold: 1500, sellGold: 750, desc: 'Vũ khí: +45 Công, +40 HP.' },
      cloth_armor:{ name: 'Áo Vải Bố', icon: '👕', type: 'equip', slot: 'armor', hp: 30, def: 3, priceGold: 100, sellGold: 50, desc: 'Áo: +30 HP, +3 Thủ.' },
      iron_armor: { name: 'Giáp Sắt Huyền Vũ', icon: '🛡️', type: 'equip', slot: 'armor', hp: 80, def: 8, priceGold: 500, sellGold: 250, desc: 'Áo: +80 HP, +8 Thủ.' },
      cloth_hat:  { name: 'Mũ Vải Xanh', icon: '🎩', type: 'equip', slot: 'hat', hp: 15, def: 2, priceGold: 80, sellGold: 40, desc: 'Mũ: +15 HP, +2 Thủ.' },
      iron_hat:   { name: 'Mũ Sắt Kim Cang', icon: '⛑️', type: 'equip', slot: 'hat', hp: 45, def: 5, priceGold: 320, sellGold: 160, desc: 'Mũ: +45 HP, +5 Thủ.' },
      cloth_boots:{ name: 'Giày Vải', icon: '🥾', type: 'equip', slot: 'boots', def: 2, hp: 10, priceGold: 70, sellGold: 35, desc: 'Giày: +10 HP, +2 Thủ.' },
      wind_boots: { name: 'Giày Gió Lốc', icon: '👢', type: 'equip', slot: 'boots', atk: 6, def: 4, priceGold: 380, sellGold: 190, desc: 'Giày: +6 Công, +4 Thủ.' },
      copper_ring:{ name: 'Nhẫn Đồng', icon: '💍', type: 'equip', slot: 'ring', atk: 5, priceGold: 90, sellGold: 45, desc: 'Nhẫn: +5 Công.' },
      jade_ring:  { name: 'Nhẫn Ngọc Linh', icon: '💍', type: 'equip', slot: 'ring', atk: 14, hp: 25, priceGold: 600, sellGold: 300, desc: 'Nhẫn: +14 Công, +25 HP.' },
      wood_neck: { name: 'Dây Chuyền Gỗ', icon: '📿', type: 'equip', slot: 'necklace', hp: 20, priceGold: 85, sellGold: 42, desc: 'Dây chuyền: +20 HP.' },
      jade_neck: { name: 'Dây Chuyền Ngọc Bích', icon: '📿', type: 'equip', slot: 'necklace', hp: 60, atk: 8, priceGold: 700, sellGold: 350, desc: 'Dây chuyền: +60 HP, +8 Công.' },
      linh_thao: { name: 'Linh Thảo', icon: '🌿', type: 'material', healHp: 40, priceSilver: 150, sellSilver: 75, desc: 'Dùng: hồi 40 HP. Nguyên liệu luyện đan.' },
      da_cuong_hoa:{ name: 'Đá Cường Hóa', icon: '💎', type: 'material', priceGold: 150, sellGold: 75, desc: 'Nguyên liệu cường hóa trang bị.' },
      ngoc_linh: { name: 'Ngọc Linh Thạch', icon: '🔷', type: 'material', priceGold: 300, sellGold: 150, desc: 'Ngọc quý, bán được giá cao.' },
      hong_ngoc: { name: 'Hồng Ngọc', icon: '🔴', type: 'gem', atk: 10, priceGold: 300, sellGold: 150, desc: 'Ngọc khảm: +10 Công.' },
      luc_ngoc:  { name: 'Lục Ngọc', icon: '🟢', type: 'gem', hp: 60, priceGold: 300, sellGold: 150, desc: 'Ngọc khảm: +60 HP.' },
      lam_ngoc:  { name: 'Lam Ngọc', icon: '🔵', type: 'gem', def: 8, priceGold: 300, sellGold: 150, desc: 'Ngọc khảm: +8 Thủ.' },
      tu_ngoc:   { name: 'Tử Ngọc', icon: '🟣', type: 'gem', crit: 0.04, priceGold: 400, sellGold: 200, desc: 'Ngọc khảm: +4% Bạo kích.' },
      kim_ngoc:  { name: 'Kim Ngọc', icon: '🟡', type: 'gem', atk: 20, def: 3, crit: 0.02, priceGold: 600, sellGold: 300, desc: 'Ngọc khảm: +20 Công, +3 Thủ, +2% Bạo.' },
      huyet_ngoc:{ name: 'Huyết Ngọc', icon: '❤️', type: 'gem', atk: 8, hp: 100, priceGold: 500, sellGold: 250, desc: 'Ngọc khảm: +8 Công, +100 HP.' }
    };
    const SLOT_NAMES = { weapon: 'Vũ khí', armor: 'Áo', hat: 'Mũ', boots: 'Giày', ring: 'Nhẫn', necklace: 'Dây chuyền' };
    const SHOP_STOCK = ['hp_pill', 'mp_pill', 'rage_pill', 'wood_sword', 'iron_sword', 'iron_armor', 'iron_hat', 'wind_boots', 'jade_ring', 'jade_neck', 'linh_thao', 'ngoc_linh'];

    const SECTS = [
      { id: 'thieulam', name: 'Thiếu Lâm', icon: '🛕', atk: 4, hp: 60, def: 8, desc: 'Thể phách như kim cang. +60 HP, +8 Thủ, +4 Công.' },
      { id: 'vodang', name: 'Võ Đang', icon: '☯️', atk: 12, hp: 0, def: 2, mp: 80, desc: 'Thái cực sinh lưỡng nghi. +12 Công, +80 MP, +2 Thủ.' },
      { id: 'ngami', name: 'Nga Mi', icon: '🌸', atk: 6, hp: 40, def: 4, desc: 'Kiếm pháp nhu mà cương. +40 HP, +6 Công, +4 Thủ.' },
      { id: 'caibang', name: 'Cái Bang', icon: '🍶', atk: 10, hp: 20, def: 3, desc: 'Hàng long thập bát chưởng. +10 Công, +20 HP, +3 Thủ.' },
      { id: 'duongmon', name: 'Đường Môn', icon: '🎯', atk: 18, hp: 0, def: -2, desc: 'Ám khí độc bộ thiên hạ. +18 Công, -2 Thủ.' },
      { id: 'minhgiao', name: 'Minh Giáo', icon: '🔥', atk: 15, hp: 20, def: 0, desc: 'Càn khôn đại na di. +15 Công, +20 HP.' },
      { id: 'toanchan', name: 'Toàn Chân', icon: '📿', atk: 8, hp: 30, def: 6, desc: 'Tiên thiên công chính tông. +8 Công, +30 HP, +6 Thủ.' },
      { id: 'como', name: 'Cổ Mộ', icon: '🕯️', atk: 10, hp: 50, def: 2, desc: 'Ngọc nữ tâm kinh. +10 Công, +50 HP, +2 Thủ.' }
    ];

    const ACTIVITIES = [
      { id: 'kill10', name: 'Diệt Yêu Thú', desc: 'Tiêu diệt 5 yêu thú Quỷ Cốc (gọi quái ra ngay).', limit: 3, reqLevel: 1, gold: 120, silver: 200, exp: 40, item: null },
      { id: 'dungeon', name: 'Phó Bản Hoa Đào', desc: 'Vào phó bản, gọi 1 đợt quái tinh anh.', limit: 2, reqLevel: 3, gold: 200, silver: 300, exp: 60, item: 'da_cuong_hoa' },
      { id: 'boss', name: 'Khiêu Chiến Boss', desc: 'Triệu hồi Ma Tôn Giáng Lâm (Boss).', limit: 1, reqLevel: 5, gold: 400, silver: 500, exp: 120, item: 'ngoc_linh' },
      { id: 'luyencong', name: 'Luyện Công Tọa Thiền', desc: 'Ngồi thiền 1 nén hương, tăng kinh nghiệm.', limit: 3, reqLevel: 1, gold: 50, silver: 100, exp: 80, item: null },
      { id: 'haitam', name: 'Hái Linh Thảo', desc: 'Ra vườn hái linh thảo về luyện đan.', limit: 3, reqLevel: 1, gold: 30, silver: 50, exp: 20, item: 'linh_thao' },
      { id: 'baotieu', name: 'Bảo Tiêu Áp Tải', desc: 'Hộ tống thương đội qua Quỷ Cốc Sơn.', limit: 2, reqLevel: 4, gold: 300, silver: 400, exp: 50, item: 'hp_pill' },
      { id: 'luyendan', name: 'Luyện Đan', desc: 'Dùng 1 Linh Thảo luyện thành 2 Hồi Huyết Đan.', limit: 2, reqLevel: 2, gold: 0, silver: 0, exp: 30, item: 'hp_pill', needsItem: 'linh_thao' }
    ];

    const EVENTS = [
      { id: 'boss_world', name: 'Boss Thế Giới — Kim Thiềm Vương', desc: 'Boss cóc xanh khổng lồ xuất hiện, đánh theo đội.', startHour: 8, durationH: 2, gold: 500, exp: 150, item: 'ngoc_linh' },
      { id: 'linh_thach', name: 'Tranh Đoạt Linh Thạch', desc: 'Tranh linh thạch ở Bát Hoang Bí Cảnh.', startHour: 12, durationH: 2, gold: 350, exp: 100, item: 'da_cuong_hoa' },
      { id: 'bang_chien', name: 'Bang Chiến — Song Ma', desc: 'Bang hội quyết chiến, thắng nhận thưởng lớn.', startHour: 20, durationH: 2, gold: 600, exp: 200, item: 'jade_ring' },
      { id: 'linh_thu', name: 'Linh Thú Đại Hội', desc: 'Hội thi linh thú ở Quỷ Cốc Sơn, pet mạnh nhất thắng lớn.', startHour: 15, durationH: 2, gold: 400, exp: 120, item: 'da_cuong_hoa' },
      { id: 'daugia', name: 'Đấu Giá Bát Hoang', desc: 'Đấu giá bảo vật ở Song Ma Quyền Phái.', startHour: 18, durationH: 1, gold: 450, exp: 100, item: 'hp_pill' }
    ];

    const PETS = [
      { id: 'thandieu', name: 'Thần Điêu', icon: '🦅', color: 0x8a6d3b, dmg: 25, desc: 'Thần điêu oai phong, mổ yêu thú mỗi 1,2 giây. Sát thương cơ bản 25.' },
      { id: 'holy', name: 'Hồ Ly', icon: '🦊', color: 0xd9480f, dmg: 18, desc: 'Hồ ly chín đuôi nhanh nhẹn. Sát thương cơ bản 18, đánh nhanh.' },
      { id: 'kimthiem', name: 'Kim Thiềm', icon: '🐸', color: 0x51cf66, dmg: 32, desc: 'Cóc vàng khổng lồ như boss trong ảnh mẫu. Sát thương cơ bản 32.' },
      { id: 'thanhlong', name: 'Thanh Long', icon: '🐉', color: 0x2b8a3e, dmg: 30, desc: 'Thần thú phương Đông (pets.v): Long Ngâm Cửu Thiên — sát thương cơ bản 30, tuyệt kỹ 150.' },
      { id: 'bachho', name: 'Bạch Hổ', icon: '🐯', color: 0xf1f3f5, dmg: 36, desc: 'Chúa tể phương Tây (pets.v): Hổ Gầm Sơn Lâm — sát thương cơ bản 36, tuyệt kỹ 170.' },
      { id: 'chutuoc', name: 'Chu Tước', icon: '🔥', color: 0xe8590c, dmg: 34, desc: 'Chim lửa phương Nam (pets.v): Phượng Hoàng Lửa — sát thương cơ bản 34, tuyệt kỹ 180.' }
    ];

    const GUILD_PRESETS = [
      { name: 'Song Ma Quyền Phái', level: 5, members: 48 },
      { name: 'Bát Hoang Kiếm Tông', level: 4, members: 32 },
      { name: 'Quỷ Cốc Ẩn Sĩ', level: 3, members: 21 },
      { name: 'Tiêu Dao Các', level: 3, members: 64 }
    ];
    const GUILD_MEMBERS = [
      { name: 'Trưởng Môn Song Ma', level: 38, role: 'Bang chủ' },
      { name: 'Kiếm Khách Vô Danh', level: 24, role: 'Phó bang' },
      { name: 'Tiểu Long Nữ', level: 19, role: 'Trưởng lão' },
      { name: 'Độc Cô Cầu Bại', level: 31, role: 'Tinh anh' },
      { name: 'Quỷ Cốc (bạn)', level: 10, role: 'Thành viên' }
    ];

Object.assign(window.QC, { gameState, skills, scene, renderer, camera, updateRendererSize, ITEMS, SLOT_NAMES, SHOP_STOCK, SECTS, ACTIVITIES, EVENTS, PETS, GUILD_PRESETS, GUILD_MEMBERS });
