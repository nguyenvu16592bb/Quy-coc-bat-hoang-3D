// ============================================================
// Quỷ Cốc Bát Hoang 3D — 06-expand.js (VÒNG 3, nhóm 2)
// Mở rộng mới kiểu Mộng Võ Lâm + sửa nhược điểm vòng 2 (chuẩn chung).
// Nạp SAU 05-ui.js bằng <script src> thường, không ES module.
// Chỉ ĐỌC state cũ qua global scope + window.QC; không sửa logic cũ
// trừ các hàm wrap đã ghi rõ (recalcStats / killEnemy /
// onEnemyKilledLoot / addItem / saveGame / loadGame / openPanel /
// closePanels / renderTeam / masterTick — đều gọi hàm gốc trước).
//
// CHUẨN CHUNG VÒNG 3 (khớp V: battle_map.v + pvp.v, xem docs/MONG_VO_LAM.md):
//  1. Nộ khí: đầy 100 nộ → bấm Nộ Trảm tay: dmg = Công x4 + Combo x10,
//     AoE 6m, sau đó nộ về 0, combo về 0. KHÔNG tự bùng +45% 6s.
//     (HTML đã đúng chuẩn từ vòng 2 — castRageSkill; V đổi theo.)
//  2. Boss raid: Kim Thiềm Vương 20000 HP / 120s / 3 phase (66%/33%,
//     mỗi phase gọi 3 quái con).
//  3. AoE raid: 90 dmg cố định (cả hero lẫn đồng đội).
//  4. Thưởng boss thế giới (mốc >=20000 dmg): +5000 vàng + 50 linh thạch
//     (Ngọc Linh Thạch) + 5 Đá Cường Hóa.
//  5. Tank aggro thật: tank khiêu khích (taunt 6s) → quái ưu tiên đuổi
//     theo tank; threat cao nhất = mục tiêu. Không taunt = như cũ.
// ============================================================
window.QC = window.QC || {};

// ---------- DỮ LIỆU MỚI (chỉ dùng trong file này) ----------
var MOUNTS = [
  { id: 0, name: 'Ngựa Bạch', icon: '🐴', color: 0xf1f3f5, speed: 1.25, hp: 40, atk: 4, costGold: 500, desc: 'Ngựa trắng thuần chủng. +25% tốc độ di chuyển.' },
  { id: 1, name: 'Hắc Mã', icon: '🐎', color: 0x343a40, speed: 1.35, hp: 60, atk: 6, costGold: 1500, desc: 'Ngựa đen phi như gió. +35% tốc độ di chuyển.' },
  { id: 2, name: 'Kỳ Lân', icon: '🦄', color: 0xffe066, speed: 1.5, hp: 100, atk: 10, costGold: 5000, desc: 'Thú cưỡi của tiên nhân. +50% tốc độ di chuyển.' },
  { id: 3, name: 'Phượng Hoàng', icon: '🔥', color: 0xe8590c, speed: 1.6, hp: 150, atk: 15, costGold: 12000, desc: 'Chim lửa bay lượn. +60% tốc độ di chuyển.', winged: true },
  { id: 4, name: 'Thanh Long', icon: '🐉', color: 0x2b8a3e, speed: 1.75, hp: 250, atk: 25, costGold: 30000, desc: 'Thần thú phương Đông. +75% tốc độ di chuyển.' },
  { id: 5, name: 'Thần Điêu', icon: '🦅', color: 0x8a6d3b, speed: 2.0, hp: 400, atk: 40, costGold: 80000, desc: 'Thần điêu oai phong. +100% tốc độ di chuyển.', winged: true }
];
var MOUNT_MAX_LV = 5; // mỗi cấp +20 HP +2 Công, nâng bằng Ngọc Linh Thạch: 5*(cấp+1) viên
var FASHIONS = [
  { id: 0, name: 'Bạch Y', icon: '🤍', tint: 0xf1f3f5, hp: 20, atk: 2, costGold: 800, desc: 'Áo trắng tinh khôi.' },
  { id: 1, name: 'Hắc Y', icon: '🖤', tint: 0x2b2b30, hp: 20, atk: 2, costGold: 800, desc: 'Áo đen bí ẩn.' },
  { id: 2, name: 'Hồng Y', icon: '❤️', tint: 0xe03131, hp: 30, atk: 3, costGold: 1500, desc: 'Áo đỏ rực lửa.' },
  { id: 3, name: 'Kim Giáp', icon: '👑', tint: 0xffd43b, hp: 60, atk: 6, costGold: 5000, desc: 'Giáp vàng chói lọi.' },
  { id: 4, name: 'Thanh Sam', icon: '🌿', tint: 0x2f9e44, hp: 30, atk: 3, costGold: 1500, desc: 'Áo xanh lá thanh thoát.' },
  { id: 5, name: 'Tử Y', icon: '💜', tint: 0x7048e8, hp: 40, atk: 4, costGold: 3000, desc: 'Áo tím quý phái.' },
  { id: 6, name: 'Tuyết Y', icon: '❄️', tint: 0xcae8ff, hp: 40, atk: 4, costGold: 3000, desc: 'Áo trắng tuyết lạnh.' },
  { id: 7, name: 'Ma Tôn', icon: '😈', tint: 0x862e9c, hp: 80, atk: 8, costGold: 10000, desc: 'Áo ma tôn uy nghiêm.' }
];
var VIP_LEVELS = [
  { level: 0, nap: 0, expPct: 0, dropPct: 0, activityExtra: 0, bagExtra: 0 },
  { level: 1, nap: 500, expPct: 5, dropPct: 5, activityExtra: 1, bagExtra: 5 },
  { level: 2, nap: 1500, expPct: 10, dropPct: 10, activityExtra: 1, bagExtra: 10 },
  { level: 3, nap: 4000, expPct: 15, dropPct: 15, activityExtra: 2, bagExtra: 15 },
  { level: 4, nap: 9000, expPct: 20, dropPct: 20, activityExtra: 2, bagExtra: 20 },
  { level: 5, nap: 20000, expPct: 30, dropPct: 30, activityExtra: 3, bagExtra: 30 }
];
var RANK_NPCS = [
  { name: 'Đông Phương Bất Bại', level: 48 }, { name: 'Phong Thanh Dương', level: 46 },
  { name: 'Độc Cô Cầu Bại', level: 45 }, { name: 'Tiêu Phong', level: 44 },
  { name: 'Quách Tĩnh', level: 44 }, { name: 'Trương Vô Kỵ', level: 43 },
  { name: 'Tiểu Long Nữ', level: 42 }, { name: 'Dương Quá', level: 41 },
  { name: 'Hoàng Dung', level: 40 }, { name: 'Đoàn Dự', level: 39 },
  { name: 'Lệnh Hồ Xung', level: 38 }, { name: 'Hư Trúc', level: 37 },
  { name: 'Nhậm Doanh Doanh', level: 36 }, { name: 'Tả Lãnh Thiền', level: 36 },
  { name: 'Triệu Mẫn', level: 35 }, { name: 'Nhạc Bất Quần', level: 34 },
  { name: 'Chu Chỉ Nhược', level: 33 }, { name: 'A Châu', level: 30 },
  { name: 'Vương Ngữ Yên', level: 28 }, { name: 'Lâm Bình Chi', level: 25 }
];
var CHAT_WORLD_REPLIES = [
  { who: 'Kiếm Khách Vô Danh', text: 'Đạo hữu nói chí phải!' },
  { who: 'Tiểu Long Nữ', text: 'Quỷ Cốc Bát Hoang, ai dám tranh phong?' },
  { who: 'Độc Cô Cầu Bại', text: 'Vừa hạ boss, rơi toàn đồ ngon!' },
  { who: 'Trưởng Môn Song Ma', text: 'Ai đi phó bản Hoa Đào cùng không?' },
  { who: 'Hồ Ly Tinh', text: 'Bang chiến tối nay 19h, nhớ vào nhé!' }
];
var CHAT_GUILD_REPLIES = [
  { who: 'Phó Bang', text: 'Huynh đệ nói đúng, tối nay tập hợp!' },
  { who: 'Trưởng Lão', text: 'Cống hiến bang càng cao, buff càng mạnh.' },
  { who: 'Tinh Anh', text: 'Vừa cường hóa lên +7, sướng quá!' }
];

// ---------- STATE MỚI (ghi vào save qua wrap saveGame/loadGame) ----------
gameState.mountId = -1; // -1 = chưa cưỡi; 0..5 theo MOUNTS
gameState.mountsOwned = [false, false, false, false, false, false];
gameState.mountLevels = [0, 0, 0, 0, 0, 0];
gameState.mountRiding = false;
gameState.mountSpeedMult = 1;
gameState.fashionId = -1; // -1 = chưa mặc; 0..7 theo FASHIONS
gameState.fashionsOwned = [false, false, false, false, false, false, false, false];
gameState.vipTotalNap = 0;
gameState.vipLevel = 0;
gameState.guildWarScore = 0; gameState.guildWarWins = 0; gameState.guildWarLosses = 0;
gameState.guildWarDate = ''; gameState.guildWarLog = [];
gameState.sectWarScore = 0; gameState.sectWarWins = 0; gameState.sectWarLosses = 0;
gameState.sectWarDate = '';
gameState.mailbox = []; gameState.mailSeeded = false;
gameState.chatWorld = []; gameState.chatGuild = [];
gameState.leaderSlot = 0; // slot đội hình đang điều khiển (0 = Quỷ Cốc)
gameState.tauntT = 0; gameState.tauntSlot = -1; gameState.tauntCd = 0;
gameState._rankTab = 'power'; gameState._mailTab = 'mail';
var ACT_BASE_LIMITS = {};
ACTIVITIES.forEach(function (a) { ACT_BASE_LIMITS[a.id] = a.limit; });

// ---------- HELPERS ----------
function mountDef(id) { return MOUNTS.find(function (m) { return m.id === id; }) || null; }
function fashionDef(id) { return FASHIONS.find(function (f) { return f.id === id; }) || null; }
function vipInfo(lv) { return VIP_LEVELS[Math.max(0, Math.min(5, lv || 0))]; }
function vipExpPct() { return vipInfo(gameState.vipLevel).expPct; }
function vipDropPct() { return vipInfo(gameState.vipLevel).dropPct; }
function vipActivityExtra() { return vipInfo(gameState.vipLevel).activityExtra; }
function bagCap() { return 30 + vipInfo(gameState.vipLevel).bagExtra; } // túi cơ bản 30 ô đồ khác loại
function mountBonus() {
  if (!gameState.mountRiding || gameState.mountId < 0) return { hp: 0, atk: 0 };
  var m = mountDef(gameState.mountId); var lv = gameState.mountLevels[gameState.mountId] || 0;
  return { hp: m.hp + lv * 20, atk: m.atk + lv * 2 };
}
function fashionBonus() {
  if (gameState.fashionId < 0) return { hp: 0, atk: 0 };
  var f = fashionDef(gameState.fashionId);
  return { hp: f.hp, atk: f.atk };
}
function darkenHex(hex, f) {
  var r = Math.round(((hex >> 16) & 255) * f), g = Math.round(((hex >> 8) & 255) * f), b = Math.round((hex & 255) * f);
  return (r << 16) | (g << 8) | b;
}
function npcPower(i, lv) { return lv * 40 + i * 13; } // lực chiến NPC mẫu (cố định, tính được)

// ---------- WRAP recalcStats: cộng tọa kỵ + thời trang + tên đội trưởng/HUD ----------
var _xOrigRecalc = recalcStats;
recalcStats = function () {
  _xOrigRecalc();
  var mb = mountBonus(), fb = fashionBonus();
  if (mb.hp || fb.hp) gameState.maxHp = Math.max(1, gameState.maxHp + mb.hp + fb.hp);
  if (mb.atk || fb.atk) gameState.attackPower = Math.max(1, gameState.attackPower + mb.atk + fb.atk);
  gameState.hp = Math.min(gameState.hp, gameState.maxHp);
  var st = document.getElementById('hud-stats');
  if (st) {
    var leader = heroDefG1(gameState.partyHeroes[gameState.leaderSlot || 0]);
    st.textContent += ' · 👑 ' + leader.name +
      (gameState.mountRiding && gameState.mountId >= 0 ? ' · 🐴 ' + mountDef(gameState.mountId).name + ' Lv' + (gameState.mountLevels[gameState.mountId] || 0) : '') +
      (gameState.fashionId >= 0 ? ' · 👗 ' + fashionDef(gameState.fashionId).name : '') +
      ' · VIP' + (gameState.vipLevel || 0);
  }
};

// ---------- TỌA KỴ ----------
var _xMountMesh = null;
function createMountMesh(m) {
  var g = new THREE.Group();
  var mat = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.7 });
  var dark = new THREE.MeshStandardMaterial({ color: darkenHex(m.color, 0.55), roughness: 0.8 });
  function box(w, h, d, x, y, z, mt, rz) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt || mat);
    mesh.position.set(x, y, z); if (rz) mesh.rotation.z = rz; mesh.castShadow = true; g.add(mesh); return mesh;
  }
  box(1.5, 0.65, 0.7, 0, 0.75, 0); // thân
  box(0.35, 0.8, 0.4, 0.78, 1.15, 0, mat, -0.5); // cổ
  box(0.55, 0.35, 0.3, 1.08, 1.5, 0); // đầu
  [[0.55, 0.22], [0.55, -0.22], [-0.55, 0.22], [-0.55, -0.22]].forEach(function (p) {
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 8), dark);
    leg.position.set(p[0], 0.35, p[1]); leg.castShadow = true; g.add(leg);
  });
  box(0.15, 0.6, 0.15, -0.85, 0.9, 0, dark, 0.3); // đuôi
  if (m.winged) {
    box(0.9, 0.06, 0.45, -0.1, 1.15, 0.45, dark, 0.5);
    box(0.9, 0.06, 0.45, -0.1, 1.15, -0.45, dark, -0.5);
  }
  return g;
}
function applyMountVisual() {
  if (_xMountMesh) { player.root.remove(_xMountMesh); _xMountMesh = null; }
  if (gameState.mountRiding && gameState.mountId >= 0) {
    _xMountMesh = createMountMesh(mountDef(gameState.mountId));
    player.root.add(_xMountMesh);
    player.bodyPivot.position.y = 0.8; // ngồi lên lưng tọa kỵ
    gameState.mountSpeedMult = mountDef(gameState.mountId).speed;
  } else {
    player.bodyPivot.position.y = 0;
    gameState.mountSpeedMult = 1;
  }
  updateMountChip();
}
function updateMountChip() {
  var el = document.getElementById('mount-chip-text');
  if (el) el.textContent = (gameState.mountRiding && gameState.mountId >= 0)
    ? mountDef(gameState.mountId).name + ' Lv' + (gameState.mountLevels[gameState.mountId] || 0) + ' (x' + mountDef(gameState.mountId).speed + ' tốc độ)'
    : 'Chưa cưỡi tọa kỵ — mở Tọa Kỵ để mua';
}
function buyMount(id) {
  var m = mountDef(id); if (!m) return;
  if (gameState.mountsOwned[id]) { showSystemBanner(m.name + ' đã có trong chuồng rồi! Bấm Cưỡi để dùng.'); return; }
  if (!spendGold(m.costGold)) return;
  gameState.mountsOwned[id] = true;
  showSystemBanner('🐴 Đã mua ' + m.name + '! Bấm Cưỡi để lên ngựa.');
  renderMount(); saveGame(false);
}
function rideMount(id) {
  if (!gameState.mountsOwned[id]) { showSystemBanner('Chưa sở hữu tọa kỵ này! Hãy mua trước.'); return; }
  if (gameState.mountRiding && gameState.mountId === id) { leaveMount(); return; }
  gameState.mountId = id; gameState.mountRiding = true;
  applyMountVisual(); recalcStats();
  showSystemBanner('🐴 Đã cưỡi ' + mountDef(id).name + '! Tốc độ x' + mountDef(id).speed + ', +' + mountBonus().hp + ' HP, +' + mountBonus().atk + ' Công.');
  renderMount(); saveGame(false);
}
function leaveMount() {
  if (!gameState.mountRiding) return;
  var name = mountDef(gameState.mountId).name;
  gameState.mountRiding = false;
  applyMountVisual(); recalcStats();
  showSystemBanner('🐴 Đã xuống ' + name + '.');
  renderMount(); saveGame(false);
}
function upgradeMount(id) {
  var m = mountDef(id); if (!m) return;
  if (!gameState.mountsOwned[id]) { showSystemBanner('Chưa sở hữu tọa kỵ này!'); return; }
  var lv = gameState.mountLevels[id] || 0;
  if (lv >= MOUNT_MAX_LV) { showSystemBanner(m.name + ' đã đạt cấp tối đa ' + MOUNT_MAX_LV + '!'); return; }
  var cost = 5 * (lv + 1); // Ngọc Linh Thạch
  if (countItem('ngoc_linh') < cost) { showSystemBanner('Cần ' + cost + ' Ngọc Linh Thạch để nâng cấp (bạn có ' + countItem('ngoc_linh') + ').'); return; }
  removeItem('ngoc_linh', cost);
  gameState.mountLevels[id] = lv + 1;
  if (gameState.mountRiding && gameState.mountId === id) { recalcStats(); updateMountChip(); }
  showSystemBanner('🐴 ' + m.name + ' lên cấp ' + (lv + 1) + '! (+20 HP, +2 Công mỗi cấp).');
  renderMount(); saveGame(false);
}

// ---------- THỜI TRANG (đổi màu áo nhân vật 3D thật) ----------
function collectTunicMeshes() {
  if (player._tunicMeshes) return player._tunicMeshes;
  var list = [];
  [player.torsoGroup, player.leftArm, player.rightArm].forEach(function (grp) {
    if (!grp) return;
    grp.traverse(function (o) {
      if (o.isMesh && o.material && o.material.color) {
        var hex = o.material.color.getHex();
        if (hex === 0xdce2e6 || hex === 0x3b4d59) { // chỉ áo trắng / áo navy, không đổi da/tóc/dây nịt
          if (o.userData._origHex === undefined) o.userData._origHex = hex;
          if (!o.userData._cloned) { o.material = o.material.clone(); o.userData._cloned = true; }
          list.push({ mesh: o, dark: hex === 0x3b4d59 });
        }
      }
    });
  });
  player._tunicMeshes = list;
  return list;
}
function applyTunicTint(hex) {
  collectTunicMeshes().forEach(function (t) {
    t.mesh.material.color.setHex(t.dark ? darkenHex(hex, 0.55) : hex);
  });
}
function applyFashionTint() {
  if (gameState.fashionId >= 0) applyTunicTint(fashionDef(gameState.fashionId).tint);
}
function applyLeaderTint() {
  if (gameState.fashionId >= 0) { applyFashionTint(); return; }
  applyTunicTint(heroDefG1(gameState.partyHeroes[gameState.leaderSlot || 0]).tint);
}
function buyFashion(id) {
  var f = fashionDef(id); if (!f) return;
  if (gameState.fashionsOwned[id]) { showSystemBanner(f.name + ' đã có trong tủ rồi! Bấm Mặc để dùng.'); return; }
  if (!spendGold(f.costGold)) return;
  gameState.fashionsOwned[id] = true;
  showSystemBanner('👗 Đã mua ' + f.name + '! Bấm Mặc để thay đồ.');
  renderMount(); saveGame(false);
}
function wearFashion(id) {
  if (!gameState.fashionsOwned[id]) { showSystemBanner('Chưa sở hữu bộ này! Hãy mua trước.'); return; }
  if (gameState.fashionId === id) { removeFashion(); return; }
  gameState.fashionId = id;
  applyFashionTint(); recalcStats();
  showSystemBanner('👗 Đã mặc ' + fashionDef(id).name + '! Áo nhân vật đổi màu thật, +' + fashionDef(id).hp + ' HP, +' + fashionDef(id).atk + ' Công.');
  renderMount(); saveGame(false);
}
function removeFashion() {
  if (gameState.fashionId < 0) return;
  var name = fashionDef(gameState.fashionId).name;
  gameState.fashionId = -1;
  applyLeaderTint(); recalcStats();
  showSystemBanner('👗 Đã cởi ' + name + ', trở về màu áo đội trưởng.');
  renderMount(); saveGame(false);
}

// ---------- ĐỔI ĐỘI TRƯỞNG F1/F2/F3 (như team.v switch_leader) ----------
// Đội trưởng luôn là slot 0 của partyHeroes (nhân vật người chơi điều khiển).
// Đổi đội trưởng = hoán đổi hero ở slot 0 với slot được chọn, chỉ số gốc
// (_baseMaxHp/_baseAtk) nhân theo tỉ lệ hệ số hero mới/cũ nên không cộng dồn.
function switchLeaderHTML(slot) {
  slot = Math.max(0, Math.min(4, slot | 0));
  if (slot === (gameState.leaderSlot || 0)) { showSystemBanner(heroDefG1(gameState.partyHeroes[slot]).name + ' đang dẫn đầu rồi!'); return; }
  var oldHero = heroDefG1(gameState.partyHeroes[0]);
  var newHero = heroDefG1(gameState.partyHeroes[slot]);
  gameState.partyHeroes[0] = newHero.id;
  gameState.partyHeroes[slot] = oldHero.id;
  gameState.leaderSlot = 0;
  if (gameState._baseMaxHp !== undefined) {
    gameState._baseMaxHp = Math.max(1, Math.round(gameState._baseMaxHp * newHero.hpMult / oldHero.hpMult));
    gameState._baseAtk = Math.max(1, Math.round(gameState._baseAtk * newHero.atkMult / oldHero.atkMult));
  }
  buildAllies();
  applyLeaderTint();
  recalcStats();
  showSystemBanner('👑 Đội trưởng mới: ' + newHero.name + ' — ' + newHero.title + ' (Công x' + newHero.atkMult + ', HP x' + newHero.hpMult + ').');
  renderTeam(); saveGame(false);
}
window.addEventListener('keydown', function (e) {
  if (e.key === 'F1') { e.preventDefault(); switchLeaderHTML(0); }
  else if (e.key === 'F2') { e.preventDefault(); switchLeaderHTML(1); }
  else if (e.key === 'F3') { e.preventDefault(); switchLeaderHTML(2); }
});
// Thêm nút đổi đội trưởng + khiêu khích vào cuối panel Đội Hình (giữ nguyên renderTeam gốc).
var _xOrigRenderTeam = renderTeam;
renderTeam = function () {
  _xOrigRenderTeam();
  var body = document.getElementById('team-body'); if (!body) return;
  var h = '<h3 style="font-size:13px;margin-top:8px">👑 Đổi đội trưởng (phím F1/F2/F3)</h3><div class="mvl-grid">';
  for (var slot = 0; slot <= 2; slot++) {
    var hero = heroDefG1(gameState.partyHeroes[slot]);
    h += '<div class="mvl-item"><span class="ic">👑</span><span class="nm">' + hero.name + '</span><div style="font-size:11px">' + ROLE_NAMES[hero.role] + ' • F' + (slot + 1) + '</div>' +
      '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="switchLeaderHTML(' + slot + ')">' + (slot === 0 ? '✓ Đang dẫn đầu' : 'Làm đội trưởng') + '</button></div>';
  }
  h += '</div>';
  var tank = null;
  allies.forEach(function (a) { if (!tank && a.hero.role === 'tank' && !a.down) tank = a; });
  if (tank) {
    h += '<div class="mvl-row"><div class="t"><b>🛡️ Khiêu khích (Tank)</b><div class="sub">' + tank.hero.name + ' hét lớn, quái dồn vào tank trong 6 giây (threat cao nhất = mục tiêu).</div></div>' +
      '<button class="mvl-btn" onclick="castTaunt(' + tank.slot + ')">Khiêu khích!</button></div>';
  }
  body.innerHTML += h;
};

// ---------- TANK AGGRO THẬT (chuẩn chung vòng 3) ----------
// Tank khiêu khích 6s: quái trong animate() đuổi theo tank thay vì người chơi,
// đòn đánh tay của quái trúng tank (applyAllyDamage) thay vì trừ HP người chơi.
// Không có taunt đang chạy → mọi hành vi như cũ.
function castTaunt(slot) {
  var a = null;
  allies.forEach(function (x) { if (x.slot === slot) a = x; });
  if (!a || a.down) { showSystemBanner('Tank chưa sẵn sàng để khiêu khích!'); return; }
  if (a.hero.role !== 'tank') { showSystemBanner('Chỉ Tank mới khiêu khích được!'); return; }
  gameState.tauntSlot = slot; gameState.tauntT = 6; gameState.tauntCd = 8;
  addDmgLog('🛡️ ' + a.hero.name + ' khiêu khích! Quái dồn vào tank (6 giây).');
  showSystemBanner('🛡️ ' + a.hero.name + ' KHIÊU KHÍCH! Quái đang dồn vào tank!');
  if (typeof renderTeam === 'function' && currentPanel === 'team') renderTeam();
  saveGame(false);
}
function tauntTargetAlly() {
  if ((gameState.tauntT || 0) <= 0 || gameState.tauntSlot < 0) return null;
  var found = null;
  allies.forEach(function (a) { if (a.slot === gameState.tauntSlot && !a.down && a.mesh) found = a; });
  return found;
}
function getTauntTargetPos() {
  var a = tauntTargetAlly();
  return a ? a.mesh.position.clone() : null;
}
function expandTick(dt) {
  if (gameState.tauntT > 0) {
    gameState.tauntT -= dt;
    if (gameState.tauntT <= 0) { gameState.tauntT = 0; gameState.tauntSlot = -1; }
  }
  if (gameState.tauntCd > 0) gameState.tauntCd -= dt;
  // Tank tự khiêu khích mỗi 8s khi có quái trong vòng 12m (như V BattleCompanionAI).
  if (gameState.tauntT <= 0 && gameState.tauntCd <= 0 && !gameState.townMode) {
    var tank = null;
    allies.forEach(function (a) { if (!tank && a.hero.role === 'tank' && !a.down) tank = a; });
    if (tank) {
      var near = findNearestEnemyFrom(tank.mesh.position, 12);
      if (near) castTaunt(tank.slot);
    }
  }
}
var _xOrigMasterTick = masterTick;
masterTick = function () { _xOrigMasterTick(); expandTick(0.1); };

// ---------- VIP (nạp vàng mô phỏng, không tiền thật) ----------
function vipLevelFor(total) {
  var lv = 0;
  VIP_LEVELS.forEach(function (v) { if (total >= v.nap) lv = v.level; });
  return lv;
}
function applyVipActivityLimits() {
  var extra = vipActivityExtra();
  ACTIVITIES.forEach(function (a) { a.limit = ACT_BASE_LIMITS[a.id] + extra; });
}
function napVip(amount) {
  amount = Math.max(0, amount | 0);
  if (amount <= 0) return;
  if (!spendGold(amount)) return;
  gameState.vipTotalNap = Math.max(0, (gameState.vipTotalNap || 0) + amount);
  var oldLv = gameState.vipLevel || 0;
  var newLv = vipLevelFor(gameState.vipTotalNap);
  gameState.vipLevel = newLv;
  applyVipActivityLimits();
  if (newLv > oldLv) {
    sendMail('Hệ thống VIP', 'Chúc mừng lên VIP' + newLv + '!',
      'Đạo hữu đã tích lũy nạp ' + fmt(gameState.vipTotalNap) + ' vàng, đạt VIP' + newLv + '. Quyền lợi mới: +' + vipExpPct() + '% EXP, +' + vipDropPct() + '% rơi đồ, +' + vipActivityExtra() + ' lượt hoạt động/ngày, +' + vipInfo(newLv).bagExtra + ' ô túi.',
      { gold: 200 * newLv, silver: 500 * newLv, item: 'ngoc_linh', qty: newLv });
    showSystemBanner('👑 CHÚC MỪNG LÊN VIP' + newLv + '! +' + vipExpPct() + '% EXP, +' + vipDropPct() + '% rơi đồ. Thư thưởng đã gửi vào hộp thư!');
  } else {
    var next = VIP_LEVELS[newLv + 1];
    showSystemBanner('👑 Đã nạp ' + fmt(amount) + ' vàng (tổng nạp ' + fmt(gameState.vipTotalNap) + ').' + (next ? ' Còn ' + fmt(next.nap - gameState.vipTotalNap) + ' vàng nữa lên VIP' + (newLv + 1) + '.' : ' Đã VIP tối đa!'));
  }
  renderVip(); saveGame(false);
}
// Wrap killEnemy: VIP cộng % EXP thật (tính trên EXP gốc 22 / 120 của quái/boss).
var _xOrigKillEnemy = killEnemy;
killEnemy = function (enemy) {
  var base = (enemy && enemy.isBoss) ? 120 : 22;
  _xOrigKillEnemy(enemy);
  var bonus = Math.floor(base * vipExpPct() / 100);
  if (bonus > 0) {
    gameState.exp += bonus;
    addDmgLog('👑 VIP' + gameState.vipLevel + ': +' + bonus + ' EXP thêm.');
    if (gameState.exp >= gameState.maxExp) levelUp();
  }
};
// Wrap onEnemyKilledLoot: VIP cộng % rơi đồ thật (thêm 1 lần roll rơi đồ).
var _xOrigLoot = onEnemyKilledLoot;
onEnemyKilledLoot = function (enemy) {
  _xOrigLoot(enemy);
  if (Math.random() * 100 < vipDropPct()) {
    var drops = ['linh_thao', 'hp_pill', 'mp_pill', 'da_cuong_hoa'];
    var d = drops[Math.floor(Math.random() * drops.length)];
    addItem(d, 1);
    addDmgLog('👑 VIP' + gameState.vipLevel + ': rơi thêm ' + ITEMS[d].name + '!');
  }
};
// Wrap addItem: túi có giới hạn ô thật (30 + VIP), hết ô thì không nhận thêm loại mới.
var _xOrigAddItem = addItem;
addItem = function (id, qty) {
  qty = qty || 1;
  var exists = gameState.inventory.some(function (x) { return x.id === id; });
  if (!exists && gameState.inventory.length >= bagCap()) {
    showSystemBanner('Túi đã đầy (' + bagCap() + ' ô)! Bán bớt đồ hoặc lên VIP để thêm ô túi.');
    return false;
  }
  return _xOrigAddItem(id, qty);
};

// ---------- BANG CHIẾN (19h–20h) + MÔN PHÁI CHIẾN ----------
function guildWarIsOpen(h) { h = (h === undefined ? new Date().getHours() : h); return h >= 19 && h < 20; }
function guildWarPower() { return pvpPower() + (gameState.guild ? Math.floor(gameState.guild.contrib / 10) : 0); }
function simulateDuel(myPow, foePow, myName, foeName) {
  var myHp = myPow * 10, foeHp = foePow * 10, log = [], round = 0;
  while (myHp > 0 && foeHp > 0 && round < 30) {
    round++;
    var md = Math.round(myPow * (0.9 + Math.random() * 0.25));
    var fd = Math.round(foePow * (0.9 + Math.random() * 0.25));
    foeHp -= md; myHp -= fd;
    log.push('Hiệp ' + round + ': ' + myName + ' -' + md + ' → ' + foeName + ' còn ' + Math.max(0, foeHp) + ' HP; ' + foeName + ' -' + fd + ' → ' + myName + ' còn ' + Math.max(0, myHp) + ' HP.');
  }
  return { win: foeHp <= 0 && myHp > 0, log: log, myHp: Math.max(0, myHp), foeHp: Math.max(0, foeHp) };
}
function fightGuildWar() {
  if (!gameState.guild) { showSystemBanner('Hãy vào bang trước (mở Bang Hội) rồi mới đánh bang chiến!'); openPanel('guild'); return; }
  if (!guildWarIsOpen()) { showSystemBanner('Bang chiến chỉ mở 19:00–20:00 hằng ngày (giờ máy hiện tại: ' + new Date().getHours() + 'h)!'); return; }
  if (gameState.guildWarDate === todayStr()) { showSystemBanner('Hôm nay bang của bạn đã đánh bang chiến rồi! Mai quay lại.'); return; }
  var foes = GUILD_PRESETS.filter(function (g) { return g.name !== gameState.guild.name; });
  var foe = foes[new Date().getDate() % foes.length];
  var myPow = guildWarPower(), foePow = 300 + foes.indexOf(foe) * 150 + (gameState.kills % 120);
  var r = simulateDuel(myPow, foePow, gameState.guild.name, foe.name);
  gameState.guildWarDate = todayStr();
  if (r.win) {
    gameState.guildWarWins++; gameState.guildWarScore += 100;
    addGold(600); gameState.exp += 200;
    gameState.guild.contrib = Math.max(0, gameState.guild.contrib + 30);
    if (gameState.exp >= gameState.maxExp) levelUp();
    sendMail('Bang chiến', 'Bang chiến thắng lợi!', 'Bang ' + gameState.guild.name + ' đã thắng ' + foe.name + ' với tỉ số áp đảo! Thưởng kèm theo thư: +200 vàng, +30 cống hiến đã cộng trực tiếp.', { gold: 200, item: 'da_cuong_hoa', qty: 2 });
    gameState.guildWarLog.unshift('🏆 ' + todayStr() + ': thắng ' + foe.name + ' (+100 điểm, +600 vàng, +200 EXP, +30 cống hiến).');
    showSystemBanner('🏆 BANG CHIẾN THẮNG! ' + gameState.guild.name + ' thắng ' + foe.name + '! +600 vàng, +200 EXP, +30 cống hiến.');
  } else {
    gameState.guildWarLosses++; gameState.guildWarScore += 10;
    addGold(100); gameState.exp += 50;
    if (gameState.exp >= gameState.maxExp) levelUp();
    gameState.guildWarLog.unshift('💔 ' + todayStr() + ': thua ' + foe.name + ' (+10 điểm, +100 vàng an ủi).');
    showSystemBanner('💔 Bang chiến thua ' + foe.name + '. +100 vàng an ủi, +10 điểm tham gia.');
  }
  gameState.guildWarLog = gameState.guildWarLog.slice(0, 20);
  r.log.forEach(function (l) { addDmgLog('⚔️ ' + l); });
  recalcStats(); renderWar(); saveGame(false);
}
function sectScoreOf(idx) {
  var base = 500 + (idx * 137) % 400;
  var myIdx = SECTS.findIndex(function (s) { return s.id === gameState.sectId; });
  if (idx === myIdx) base += gameState.sectWarScore || 0;
  return base;
}
function fightSectWar() {
  if (!gameState.sectId) { showSystemBanner('Hãy nhập môn phái trước (mở Môn Phái) rồi mới đánh môn phái chiến!'); openPanel('sect'); return; }
  if (gameState.sectWarDate === todayStr()) { showSystemBanner('Hôm nay đã đánh môn phái chiến rồi! Mai quay lại.'); return; }
  var myIdx = SECTS.findIndex(function (s) { return s.id === gameState.sectId; });
  var foe = SECTS[(myIdx + 1) % SECTS.length];
  var sec = sectDef();
  var myPow = pvpPower() + (sec ? sec.atk * 3 : 0), foePow = 250 + ((myIdx + 1) % SECTS.length) * 120 + (gameState.kills % 100);
  var r = simulateDuel(myPow, foePow, sec.name, foe.name);
  gameState.sectWarDate = todayStr();
  if (r.win) {
    gameState.sectWarWins++; gameState.sectWarScore += 100;
    addGold(400); gameState.exp += 150;
    if (gameState.exp >= gameState.maxExp) levelUp();
    showSystemBanner('🏆 MÔN PHÁI CHIẾN THẮNG! ' + sec.name + ' thắng ' + foe.name + '! +400 vàng, +150 EXP, +100 điểm phái.');
  } else {
    gameState.sectWarLosses++; gameState.sectWarScore += 10;
    addGold(50); gameState.exp += 20;
    if (gameState.exp >= gameState.maxExp) levelUp();
    showSystemBanner('💔 Môn phái chiến thua ' + foe.name + '. +50 vàng an ủi, +10 điểm phái.');
  }
  r.log.forEach(function (l) { addDmgLog('⚔️ ' + l); });
  renderWar(); saveGame(false);
}

// ---------- THƯ + CHAT ----------
function sendMail(from, title, body, attach) {
  attach = attach || {};
  gameState.mailbox.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000), from: from, title: title, body: body,
    gold: attach.gold || 0, silver: attach.silver || 0, item: attach.item || null, qty: attach.qty || 0,
    read: false, claimed: false, date: todayStr()
  });
  gameState.mailbox = gameState.mailbox.slice(0, 30);
}
function seedMail() {
  if (gameState.mailSeeded || gameState.mailbox.length) return;
  gameState.mailSeeded = true;
  sendMail('Hệ thống', 'Chào mừng đến Quỷ Cốc Bát Hoang 3D!', 'Đạo hữu mới vào giang hồ, hệ thống tặng chút lộ phí. Bấm Nhận đính kèm để lấy thưởng. Bang chiến mở 19h–20h, Boss Thế Giới mở 20h–21h mỗi ngày!', { gold: 100, item: 'hp_pill', qty: 5 });
  sendMail('Trưởng Môn Song Ma', 'Nhiệm vụ tân thủ', 'Đi diệt 5 yêu thú Quỷ Cốc rồi quay lại gặp ta. Thưởng: 1 Ngọc Linh Thạch. (Mở Hoạt Động → Diệt Yêu Thú.)', { item: 'ngoc_linh', qty: 1 });
}
function mailUnreadCount() { return gameState.mailbox.filter(function (m) { return !m.read; }).length; }
function readMail(id) {
  var m = gameState.mailbox.find(function (x) { return x.id === id; });
  if (m) m.read = true;
  renderMail(); saveGame(false);
}
function claimMail(id) {
  var m = gameState.mailbox.find(function (x) { return x.id === id; });
  if (!m || m.claimed) return;
  if (m.gold) addGold(m.gold);
  if (m.silver) addSilver(m.silver);
  if (m.item && m.qty) addItem(m.item, m.qty);
  m.claimed = true; m.read = true;
  showSystemBanner('✉️ Đã nhận đính kèm thư: ' + (m.gold ? '+' + fmt(m.gold) + ' vàng ' : '') + (m.silver ? '+' + fmt(m.silver) + ' bạc ' : '') + (m.item ? '+' + m.qty + ' ' + ITEMS[m.item].name : ''));
  renderMail(); renderBag(); saveGame(false);
}
function deleteMail(id) {
  gameState.mailbox = gameState.mailbox.filter(function (x) { return x.id !== id; });
  renderMail(); saveGame(false);
}
function sendChat(channel, text) {
  text = String(text || '').trim().slice(0, 100);
  if (!text) return;
  if (channel === 'guild' && !gameState.guild) { showSystemBanner('Hãy vào bang trước mới chat kênh Bang được!'); return; }
  var log = channel === 'guild' ? gameState.chatGuild : gameState.chatWorld;
  log.push({ who: 'Bạn', text: text });
  if (log.length > 30) log.splice(0, log.length - 30);
  var pool = channel === 'guild' ? CHAT_GUILD_REPLIES : CHAT_WORLD_REPLIES;
  var reply = pool[(text.length + log.length) % pool.length];
  setTimeout(function () {
    log.push({ who: reply.who, text: reply.text });
    if (log.length > 30) log.splice(0, log.length - 30);
    if (currentPanel === 'mail') renderMail();
    saveGame(false);
  }, 900 + Math.random() * 1200);
  renderMail(); saveGame(false);
}

// ---------- BẢNG XẾP HẠNG ----------
function rankList(kind) {
  var rows = RANK_NPCS.map(function (n, i) {
    return {
      name: n.name, level: n.level, power: npcPower(i, n.level),
      pvp: Math.max(0, 1200 - i * 55), guild: GUILD_PRESETS[i % GUILD_PRESETS.length].name, isYou: false
    };
  });
  rows.push({
    name: 'Quỷ Cốc (bạn)', level: gameState.level, power: pvpPower(), pvp: gameState.pvpPoints,
    guild: gameState.guild ? gameState.guild.name : '—', isYou: true
  });
  var key = kind === 'level' ? 'level' : kind === 'pvp' ? 'pvp' : kind === 'guild' ? 'guild' : 'power';
  if (key === 'guild') {
    var gscore = {};
    GUILD_PRESETS.forEach(function (g) { gscore[g.name] = g.members * 20 + g.level * 50; });
    if (gameState.guild) gscore[gameState.guild.name] = (gscore[gameState.guild.name] || 0) + (gameState.guildWarScore || 0) + (gameState.guild.contrib || 0);
    rows.sort(function (a, b) { return (gscore[b.guild] || 0) - (gscore[a.guild] || 0) || b.power - a.power; });
    rows.forEach(function (r) { r.guildScore = gscore[r.guild] || 0; });
  } else {
    rows.sort(function (a, b) { return b[key] - a[key]; });
  }
  return rows;
}

// ---------- RENDER CÁC PANEL MỚI ----------
function renderMount() {
  var body = document.getElementById('mount-body'); if (!body) return;
  var h = '<h3 style="font-size:13px">🐴 Tọa kỵ — cưỡi thật, tăng tốc độ + chỉ số</h3>';
  h += '<p class="text-[11px] text-[#b4c8c9]">Đang cưỡi: <b>' + (gameState.mountRiding && gameState.mountId >= 0 ? mountDef(gameState.mountId).name + ' Lv' + (gameState.mountLevels[gameState.mountId] || 0) + ' (tốc độ x' + mountDef(gameState.mountId).speed + ')' : 'chưa cưỡi') + '</b> • Nâng cấp bằng Ngọc Linh Thạch.</p><div class="mvl-grid">';
  MOUNTS.forEach(function (m) {
    var owned = gameState.mountsOwned[m.id], lv = gameState.mountLevels[m.id] || 0;
    var riding = gameState.mountRiding && gameState.mountId === m.id;
    h += '<div class="mvl-item"><span class="ic">' + m.icon + '</span><span class="nm">' + m.name + (riding ? ' ✓' : '') + '</span><div style="font-size:11px">Tốc độ x' + m.speed + ' • +' + (m.hp + lv * 20) + ' HP • +' + (m.atk + lv * 2) + ' Công<br>Cấp ' + lv + '/' + MOUNT_MAX_LV + ' • ' + (owned ? 'Đã sở hữu' : fmt(m.costGold) + ' vàng') + '<br>' + m.desc + '</div>' +
      (owned
        ? '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="rideMount(' + m.id + ')">' + (riding ? 'Xuống ngựa' : 'Cưỡi') + '</button>' +
          (lv < MOUNT_MAX_LV ? '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="upgradeMount(' + m.id + ')">Nâng cấp (' + (5 * (lv + 1)) + ' 💎)</button>' : '')
        : '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="buyMount(' + m.id + ')">Mua ' + fmt(m.costGold) + ' vàng</button>') +
      '</div>';
  });
  h += '</div><h3 style="font-size:13px;margin-top:8px">👗 Thời trang — đổi màu áo nhân vật thật</h3><div class="mvl-grid">';
  FASHIONS.forEach(function (f) {
    var owned = gameState.fashionsOwned[f.id], worn = gameState.fashionId === f.id;
    h += '<div class="mvl-item"><span class="ic">' + f.icon + '</span><span class="nm">' + f.name + (worn ? ' ✓' : '') + '</span><div style="font-size:11px">+' + f.hp + ' HP • +' + f.atk + ' Công<br>' + (owned ? 'Đã sở hữu' : fmt(f.costGold) + ' vàng') + ' • ' + f.desc + '</div>' +
      (owned
        ? '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="wearFashion(' + f.id + ')">' + (worn ? 'Cởi ra' : 'Mặc') + '</button>'
        : '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="buyFashion(' + f.id + ')">Mua ' + fmt(f.costGold) + ' vàng</button>') +
      '</div>';
  });
  h += '</div>';
  body.innerHTML = h;
}
function renderWar() {
  var body = document.getElementById('war-body'); if (!body) return;
  var hour = new Date().getHours();
  var h = '<h3 style="font-size:13px">⚔️ Bang chiến — 19:00–20:00 hằng ngày</h3>';
  h += '<p class="text-[12px]">Bang của bạn: <b>' + (gameState.guild ? gameState.guild.name : 'chưa vào bang') + '</b> • Điểm bang chiến: <b>' + fmt(gameState.guildWarScore) + '</b> • Thắng ' + gameState.guildWarWins + ' • Thua ' + gameState.guildWarLosses + '<br>Giờ máy: ' + hour + 'h — ' + (guildWarIsOpen() ? '<b style="color:#51cf66">ĐANG MỞ</b>' : '<b style="color:#ff8787">Đang đóng (mở 19h–20h)</b>') + '<br>Thắng: +600 vàng, +200 EXP, +30 cống hiến, +100 điểm. Thua: +100 vàng, +50 EXP, +10 điểm. Mỗi ngày 1 trận.</p>';
  h += '<button class="mvl-btn green" style="min-height:44px" ' + (guildWarIsOpen() && gameState.guild && gameState.guildWarDate !== todayStr() ? '' : 'disabled') + ' onclick="fightGuildWar()">⚔️ Đánh bang chiến</button>';
  h += '<h3 style="font-size:13px;margin-top:8px">📜 Log bang chiến</h3>';
  h += gameState.guildWarLog.length ? gameState.guildWarLog.map(function (l) { return '<div class="text-[12px]">' + escHtml(l) + '</div>'; }).join('') : '<p class="text-[12px] text-[#b4c8c9]">Chưa đánh trận nào.</p>';
  var myIdx = SECTS.findIndex(function (s) { return s.id === gameState.sectId; });
  h += '<h3 style="font-size:13px;margin-top:8px">🥋 Môn phái chiến — đấu theo phái</h3>';
  h += '<p class="text-[12px]">Phái của bạn: <b>' + (gameState.sectId ? sectDef().name : 'chưa nhập phái') + '</b> • Điểm phái: <b>' + fmt(gameState.sectWarScore) + '</b> • Thắng ' + gameState.sectWarWins + ' • Thua ' + gameState.sectWarLosses + '<br>Thắng: +400 vàng, +150 EXP, +100 điểm phái. Thua: +50 vàng, +20 EXP, +10 điểm. Mỗi ngày 1 trận.</p>';
  h += '<button class="mvl-btn green" style="min-height:44px" ' + (gameState.sectId && gameState.sectWarDate !== todayStr() ? '' : 'disabled') + ' onclick="fightSectWar()">🥋 Đánh môn phái chiến</button>';
  h += '<h3 style="font-size:13px;margin-top:8px">📊 Bảng điểm 8 phái</h3>';
  SECTS.map(function (s, i) { return { s: s, score: sectScoreOf(i) }; })
    .sort(function (a, b) { return b.score - a.score; })
    .forEach(function (row, rank) {
      h += '<div class="mvl-row"><div class="t"><b>#' + (rank + 1) + ' ' + row.s.icon + ' ' + row.s.name + '</b><div class="sub">' + fmt(row.score) + ' điểm' + (row.s.id === gameState.sectId ? ' • <b style="color:#8ce99a">Phái của bạn</b>' : '') + '</div></div></div>';
    });
  body.innerHTML = h;
}
function renderVip() {
  var body = document.getElementById('vip-body'); if (!body) return;
  var lv = gameState.vipLevel || 0, info = vipInfo(lv), next = VIP_LEVELS[lv + 1];
  var h = '<h3 style="font-size:13px">👑 VIP — nạp vàng mô phỏng (không tiền thật)</h3>';
  h += '<p class="text-[12px]">Bạn đang <b>VIP' + lv + '</b> • Tổng nạp: <b>' + fmt(gameState.vipTotalNap || 0) + ' vàng</b>' + (next ? ' • Còn ' + fmt(next.nap - gameState.vipTotalNap) + ' vàng nữa lên VIP' + (lv + 1) : ' • Đã VIP tối đa') + '</p>';
  h += '<p class="text-[12px]">Quyền lợi VIP' + lv + ': <b>+' + info.expPct + '% EXP</b> • <b>+' + info.dropPct + '% rơi đồ</b> • <b>+' + info.activityExtra + ' lượt hoạt động/ngày</b> • <b>+' + info.bagExtra + ' ô túi</b> (túi hiện ' + bagCap() + ' ô).</p>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="mvl-btn" onclick="napVip(100)">Nạp 100 vàng</button><button class="mvl-btn" onclick="napVip(500)">Nạp 500 vàng</button><button class="mvl-btn" onclick="napVip(1000)">Nạp 1000 vàng</button></div>';
  h += '<h3 style="font-size:13px;margin-top:8px">Bảng cấp VIP</h3>';
  VIP_LEVELS.forEach(function (v) {
    h += '<div class="mvl-row"><div class="t"><b>VIP' + v.level + '</b>' + (v.level === lv ? ' • <b style="color:#8ce99a">Bạn đang ở đây</b>' : '') + '<div class="sub">Nạp tích lũy ' + fmt(v.nap) + ' vàng • +' + v.expPct + '% EXP • +' + v.dropPct + '% rơi đồ • +' + v.activityExtra + ' lượt/ngày • +' + v.bagExtra + ' ô túi</div></div></div>';
  });
  body.innerHTML = h;
}
function renderMail() {
  var body = document.getElementById('mail-body'); if (!body) return;
  var tab = gameState._mailTab || 'mail';
  var h = '<div style="display:flex;gap:6px;margin-bottom:6px"><button class="mvl-btn' + (tab === 'mail' ? ' green' : '') + '" onclick="switchMailTab(\'mail\')">✉️ Thư (' + mailUnreadCount() + ' chưa đọc)</button><button class="mvl-btn' + (tab === 'chat' ? ' green' : '') + '" onclick="switchMailTab(\'chat\')">💬 Chat</button></div>';
  if (tab === 'mail') {
    if (!gameState.mailbox.length) h += '<p class="text-[12px] text-[#b4c8c9]">Hộp thư trống.</p>';
    gameState.mailbox.forEach(function (m) {
      var attach = (m.gold ? '+' + fmt(m.gold) + ' vàng ' : '') + (m.silver ? '+' + fmt(m.silver) + ' bạc ' : '') + (m.item ? '+' + m.qty + ' ' + ITEMS[m.item].name : '');
      h += '<div class="mvl-row"><div class="t"><b>' + (m.read ? '' : '● ') + escHtml(m.title) + '</b><div class="sub">Từ ' + escHtml(m.from) + ' • ' + m.date + '<br>' + escHtml(m.body) + (attach ? '<br>Đính kèm: <b>' + attach + '</b>' + (m.claimed ? ' (đã nhận)' : '') : '') + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:4px">' +
        (attach && !m.claimed ? '<button class="mvl-btn green" onclick="claimMail(' + m.id + ')">Nhận</button>' : '') +
        (!m.read ? '<button class="mvl-btn" onclick="readMail(' + m.id + ')">Đọc</button>' : '') +
        '<button class="mvl-btn red" onclick="deleteMail(' + m.id + ')">Xóa</button></div></div>';
    });
  } else {
    h += '<p class="text-[11px] text-[#b4c8c9]">Kênh Thế Giới: ai cũng thấy. Kênh Bang: chỉ thành viên bang (cần vào bang). NPC sẽ trả lời ngẫu nhiên theo mẫu có sẵn.</p>';
    h += '<div id="chat-world-log" class="text-[12px]" style="max-height:120px;overflow-y:auto;background:rgba(0,0,0,.25);border-radius:8px;padding:6px;margin-bottom:6px">' +
      (gameState.chatWorld.length ? gameState.chatWorld.map(function (c) { return '<div><b>' + escHtml(c.who) + ':</b> ' + escHtml(c.text) + '</div>'; }).join('') : '<div class="text-[#b4c8c9]">Chưa có tin nhắn nào.</div>') + '</div>';
    h += '<div style="display:flex;gap:6px"><input id="chat-world-input" placeholder="Nhắn kênh Thế Giới..." style="flex:1;min-height:44px;border-radius:8px;border:1px solid #8c6d3f;background:#171208;color:#f5d896;padding:0 10px"><button class="mvl-btn" onclick="sendChatFromInput(\'world\')">Gửi</button></div>';
    h += '<h3 style="font-size:13px;margin-top:8px">🏰 Kênh Bang</h3><div class="text-[12px]" style="max-height:120px;overflow-y:auto;background:rgba(0,0,0,.25);border-radius:8px;padding:6px;margin-bottom:6px">' +
      (gameState.chatGuild.length ? gameState.chatGuild.map(function (c) { return '<div><b>' + escHtml(c.who) + ':</b> ' + escHtml(c.text) + '</div>'; }).join('') : '<div class="text-[#b4c8c9]">Chưa có tin nhắn nào.</div>') + '</div>';
    h += '<div style="display:flex;gap:6px"><input id="chat-guild-input" placeholder="Nhắn kênh Bang..." style="flex:1;min-height:44px;border-radius:8px;border:1px solid #8c6d3f;background:#171208;color:#f5d896;padding:0 10px"><button class="mvl-btn" onclick="sendChatFromInput(\'guild\')">Gửi</button></div>';
  }
  body.innerHTML = h;
}
function switchMailTab(tab) { gameState._mailTab = tab; renderMail(); }
function sendChatFromInput(channel) {
  var el = document.getElementById(channel === 'guild' ? 'chat-guild-input' : 'chat-world-input');
  if (!el) return;
  var text = el.value; el.value = '';
  sendChat(channel, text);
}
function renderRank() {
  var body = document.getElementById('rank-body'); if (!body) return;
  var tab = gameState._rankTab || 'power';
  var tabs = [['power', '⚔️ Lực chiến'], ['level', '📈 Cấp độ'], ['pvp', '🏆 PvP'], ['guild', '🏰 Bang']];
  var h = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">';
  tabs.forEach(function (t) {
    h += '<button class="mvl-btn' + (tab === t[0] ? ' green' : '') + '" onclick="switchRankTab(\'' + t[0] + '\')">' + t[1] + '</button>';
  });
  h += '</div>';
  var rows = rankList(tab);
  rows.forEach(function (r, i) {
    var val = tab === 'level' ? 'Cấp ' + r.level : tab === 'pvp' ? fmt(r.pvp) + ' điểm PvP' : tab === 'guild' ? fmt(r.guildScore || 0) + ' điểm bang' : fmt(r.power) + ' lực chiến';
    h += '<div class="mvl-row" style="' + (r.isYou ? 'border-color:#ffe082;background:rgba(255,213,79,.12)' : '') + '"><div class="t"><b>#' + (i + 1) + ' ' + escHtml(r.name) + '</b><div class="sub">' + val + ' • Cấp ' + r.level + ' • Bang: ' + escHtml(r.guild) + (r.isYou ? ' • <b style="color:#8ce99a">Bạn</b>' : '') + '</div></div></div>';
  });
  body.innerHTML = h;
}
function switchRankTab(tab) { gameState._rankTab = tab; renderRank(); }

// ---------- MỞ RỘNG openPanel/closePanels CHO 5 PANEL MỚI ----------
var _xOrigOpenPanel = openPanel;
openPanel = function (name) {
  _xOrigOpenPanel(name);
  if (name === 'mount') renderMount();
  else if (name === 'war') renderWar();
  else if (name === 'vip') renderVip();
  else if (name === 'mail') renderMail();
  else if (name === 'rank') renderRank();
};
var _xOrigClosePanels = closePanels;
closePanels = function () {
  _xOrigClosePanels();
  ['mount', 'war', 'vip', 'mail', 'rank'].forEach(function (n) {
    var el = document.getElementById('panel-' + n);
    if (el) el.classList.add('hidden');
  });
};

// ---------- WRAP saveGame/loadGame: lưu/khôi phục hệ thống mới ----------
var _xOrigSaveGame = saveGame;
saveGame = function (showMsg) {
  _xOrigSaveGame(showMsg);
  try {
    var d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.expand = {
      mountId: gameState.mountId, mountsOwned: gameState.mountsOwned, mountLevels: gameState.mountLevels,
      mountRiding: gameState.mountRiding, fashionId: gameState.fashionId, fashionsOwned: gameState.fashionsOwned,
      vipTotalNap: gameState.vipTotalNap, vipLevel: gameState.vipLevel,
      guildWarScore: gameState.guildWarScore, guildWarWins: gameState.guildWarWins, guildWarLosses: gameState.guildWarLosses,
      guildWarDate: gameState.guildWarDate, guildWarLog: gameState.guildWarLog,
      sectWarScore: gameState.sectWarScore, sectWarWins: gameState.sectWarWins, sectWarLosses: gameState.sectWarLosses,
      sectWarDate: gameState.sectWarDate, mailbox: gameState.mailbox, mailSeeded: gameState.mailSeeded,
      chatWorld: gameState.chatWorld, chatGuild: gameState.chatGuild, leaderSlot: gameState.leaderSlot
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
  } catch (e) { /* bỏ qua khi trình duyệt chặn localStorage */ }
};
var _xOrigLoadGame = loadGame;
loadGame = function () {
  var ok = _xOrigLoadGame();
  try {
    var raw = localStorage.getItem(SAVE_KEY); if (!raw) return ok;
    var d = JSON.parse(raw); var x = d && d.expand; if (!x) return ok;
    if (typeof x.mountId === 'number' && x.mountId >= -1 && x.mountId < 6) gameState.mountId = x.mountId;
    if (Array.isArray(x.mountsOwned) && x.mountsOwned.length === 6) gameState.mountsOwned = x.mountsOwned.map(Boolean);
    if (Array.isArray(x.mountLevels) && x.mountLevels.length === 6) gameState.mountLevels = x.mountLevels.map(function (v) { return Math.max(0, Math.min(MOUNT_MAX_LV, v | 0)); });
    gameState.mountRiding = !!x.mountRiding && gameState.mountId >= 0 && gameState.mountsOwned[gameState.mountId];
    if (typeof x.fashionId === 'number' && x.fashionId >= -1 && x.fashionId < 8) gameState.fashionId = x.fashionId;
    if (Array.isArray(x.fashionsOwned) && x.fashionsOwned.length === 8) gameState.fashionsOwned = x.fashionsOwned.map(Boolean);
    gameState.vipTotalNap = Math.max(0, x.vipTotalNap | 0);
    gameState.vipLevel = vipLevelFor(gameState.vipTotalNap);
    gameState.guildWarScore = Math.max(0, x.guildWarScore | 0);
    gameState.guildWarWins = Math.max(0, x.guildWarWins | 0);
    gameState.guildWarLosses = Math.max(0, x.guildWarLosses | 0);
    gameState.guildWarDate = x.guildWarDate || '';
    if (Array.isArray(x.guildWarLog)) gameState.guildWarLog = x.guildWarLog.slice(0, 20);
    gameState.sectWarScore = Math.max(0, x.sectWarScore | 0);
    gameState.sectWarWins = Math.max(0, x.sectWarWins | 0);
    gameState.sectWarLosses = Math.max(0, x.sectWarLosses | 0);
    gameState.sectWarDate = x.sectWarDate || '';
    if (Array.isArray(x.mailbox)) gameState.mailbox = x.mailbox.slice(0, 30);
    gameState.mailSeeded = !!x.mailSeeded;
    if (Array.isArray(x.chatWorld)) gameState.chatWorld = x.chatWorld.slice(-30);
    if (Array.isArray(x.chatGuild)) gameState.chatGuild = x.chatGuild.slice(-30);
    if (typeof x.leaderSlot === 'number') gameState.leaderSlot = 0; // đội trưởng luôn về slot 0 sau khi tải (tránh lệch đội hình)
    applyVipActivityLimits();
    applyMountVisual();
    applyLeaderTint();
    recalcStats();
  } catch (e) { /* save cũ không có expand: giữ mặc định */ }
  return ok;
};

// ---------- KHỞI ĐỘNG ----------
function initExpand() {
  seedMail();
  applyVipActivityLimits();
  applyMountVisual();
  applyLeaderTint();
  updateMountChip();
  recalcStats();
}
var _xOrigOnload = window.onload;
window.onload = function () { _xOrigOnload(); initExpand(); };

Object.assign(window.QC, {
  MOUNTS, FASHIONS, VIP_LEVELS, RANK_NPCS, mountDef, fashionDef, vipInfo,
  buyMount, rideMount, leaveMount, upgradeMount, applyMountVisual, updateMountChip,
  buyFashion, wearFashion, removeFashion, applyFashionTint, applyLeaderTint,
  switchLeaderHTML, castTaunt, tauntTargetAlly, getTauntTargetPos, expandTick,
  vipLevelFor, napVip, applyVipActivityLimits, bagCap,
  guildWarIsOpen, guildWarPower, fightGuildWar, fightSectWar, sectScoreOf,
  sendMail, seedMail, readMail, claimMail, deleteMail, sendChat, sendChatFromInput, switchMailTab,
  rankList, renderMount, renderWar, renderVip, renderMail, renderRank, switchRankTab, initExpand
});
