// tests/test-expand-r3.js — Harness kiểm thử vòng 3 (nhóm 2): mở rộng mới kiểu
// Mộng Võ Lâm + chuẩn chung vòng 2 đã chốt (nộ khí / raid / AoE / boss thế giới
// / tank aggro / chặn click khi panel mở).
//
// Chạy:  node tests/test-expand-r3.js        (từ thư mục gốc repo)
// Thoát: 0 = không có FAIL (MISSING được phép), 1 = có ít nhất 1 FAIL.
//
// NGUYÊN TẮC (theo test-mongvolam.js):
//  - Mọi số liệu đều đọc từ FILE THẬT tại thời điểm chạy bằng regex scan.
//  - Phần mô phỏng logic chạy THẬT js/06-expand.js trong vm với stub tối thiểu
//    (gameState, ACTIVITIES, các hàm gốc) — assert số liệu cụ thể.
//  - V không có toolchain ở đây nên chỉ kiểm tra tĩnh bằng grep (không `= 0`
//    ở field struct, không TODO/stub, đủ marker chuẩn chung).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'velo', 'web', 'qu_c_c_b_t_hoang_3d.html');
const JS06 = path.join(ROOT, 'velo', 'web', 'js', '06-expand.js');
const VDIR = path.join(ROOT, 'velo', 'quycoc3d');

let pass = 0, fail = 0, missing = 0;
function report(status, name, detail) {
  if (status === 'PASS') pass++;
  else if (status === 'FAIL') fail++;
  else missing++;
  console.log(`[${status}] ${name}${detail ? ' — ' + detail : ''}`);
}
function check(cond, name, detail) { report(cond ? 'PASS' : 'FAIL', name, detail); }
function checkMissing(cond, name, detail) { report(cond ? 'PASS' : 'MISSING', name, detail); }
function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }

// ================= 1. FILE + SỐ LƯỢNG =================
const js06 = read(JS06);
const html = read(HTML);
const js03 = read(path.join(ROOT, 'velo', 'web', 'js', '03-battle.js'));
const js05 = read(path.join(ROOT, 'velo', 'web', 'js', '05-ui.js'));
check(!!js06, '06-expand.js tồn tại');
check(!!html && html.includes('js/06-expand.js'), 'shell nạp js/06-expand.js sau 05-ui.js');
check(!!html && /js\/05-ui\.js[\s\S]*js\/06-expand\.js/.test(html), 'thứ tự nạp 05-ui.js trước 06-expand.js');
['panel-mount', 'panel-war', 'panel-vip', 'panel-mail', 'panel-rank'].forEach((id) => {
  check(!!html && html.includes('id="' + id + '"'), 'shell có ' + id);
});
['mount-body', 'war-body', 'vip-body', 'mail-body', 'rank-body'].forEach((id) => {
  check(!!html && html.includes('id="' + id + '"'), 'shell có ' + id);
});
check(!!html && html.includes('mount-chip-text'), 'shell có chip tọa kỵ trên HUD');

function countTable(src, varName) {
  if (!src) return 0;
  const m = src.match(new RegExp('var ' + varName + ' = \\[([\\s\\S]*?)\\n\\];'));
  if (!m) return 0;
  return (m[1].match(/\{ id: \d+/g) || []).length;
}
check(countTable(js06, 'MOUNTS') === 6, 'HTML: 6 tọa kỵ', 'đếm được ' + countTable(js06, 'MOUNTS'));
check(countTable(js06, 'FASHIONS') === 8, 'HTML: 8 bộ thời trang', 'đếm được ' + countTable(js06, 'FASHIONS'));
check((js06.match(/level: \d, nap: /g) || []).length === 6, 'HTML: 6 cấp VIP0-VIP5');
check((js06.match(/\{ name: '/g) || []).length >= 20, 'HTML: 20 NPC mẫu bảng xếp hạng');
check(!!js05 && js05.includes("addItem('ngoc_linh', 50)") && js05.includes("addItem('da_cuong_hoa', 5)"),
  'HTML: boss thế giới mốc >=20000 trả +50 linh thạch + 5 Đá Cường Hóa');

// ================= 2. CHUẨN CHUNG VÒNG 3 (cả 2 phía) =================
const vBattle = read(path.join(VDIR, 'battle_map.v'));
check(!!js03 && js03.includes('CHUẨN CHUNG VÒNG 3'), '03-battle.js ghi chuẩn chung vòng 3');
check(!!vBattle && vBattle.includes('CHUẨN CHUNG VÒNG 3'), 'battle_map.v ghi chuẩn chung vòng 3');
check(!!js03 && /attackPower \* 4 \+ \(gameState\.combo/.test(js03), 'HTML Nộ Trảm: Công x4 + Combo x10');
check(!!vBattle && vBattle.includes('battle_rage_slash_mult = 4') && vBattle.includes('battle_rage_slash_combo = 10'),
  'V Nộ Trảm: Công x4 + Combo x10');
check(!!vBattle && !vBattle.includes('s.aura = battle_rage_burst_s') && !vBattle.includes('Nộ Khí Bùng Nổ!'),
  'V: đã gỡ tự bùng +45% 6s (khối auto-burst + banner cũ không còn)');
check(!!js03 && js03.includes('boss.hp = boss.maxHp = 20000') && js03.includes('timeLeft: 120'),
  'HTML raid: Kim Thiềm Vương 20000 HP / 120s');
check(!!vBattle && vBattle.includes('raid_boss_max_hp = 20000') && vBattle.includes('raid_time_limit_s = f32(120.0)'),
  'V raid: Kim Thiềm Vương 20000 HP / 120s');
check(!!vBattle && vBattle.includes('Kim Thiềm Vương'), 'V raid dùng tên Kim Thiềm Vương');
check(!!js03 && /applyAllyDamage\(a, 90\)/.test(js03), 'HTML AoE raid đồng đội = 90');
check(!!vBattle && vBattle.includes('raid_aoe_dmg = 90'), 'V AoE raid = 90 cố định');
check(!!js05 && js05.includes("addItem('ngoc_linh', 50)"), 'HTML boss TG: +50 Ngọc Linh Thạch');
const vPvp = read(path.join(VDIR, 'pvp.v'));
check(!!vPvp && vPvp.includes('add_stones(world_boss.reward_stone)') && vPvp.includes('inventory_add(8)'),
  'V boss TG: +50 linh thạch + 5 Đá Cường Hóa');
check(!!js05 && js05.includes('mountSpeedMult'), 'HTML: tốc độ tọa kỵ thật (mountSpeedMult)');
check(!!js05 && js05.includes('getTauntTargetPos') && js05.includes('tauntTargetAlly'),
  'HTML: quái đuổi/đánh tank khi taunt');
check(!!js05 && js05.includes("typeof currentPanel !== 'undefined' && currentPanel"),
  'HTML: chặn click-to-move khi panel mở');
const vGame = read(path.join(VDIR, 'game.v'));
check(!!vGame && vGame.includes('fn any_panel_open()'), 'V: helper any_panel_open()');
check(!!vGame && vGame.includes('if any_panel_open()'), 'V HeroController: guard any_panel_open()');
const vCombat = read(path.join(VDIR, 'combat.v'));
check(!!vCombat && vCombat.includes('if any_panel_open()'), 'V PlayerCombat: guard any_panel_open()');
const vEnemies = read(path.join(VDIR, 'enemies.v'));
check(!!vEnemies && vEnemies.includes('taunt_target_pos('), 'V EnemyAI: đuổi theo tank khi taunt');
const vTeam = read(path.join(VDIR, 'team.v'));
check(!!vTeam && vTeam.includes('battle_add_threat(c.slot, battle_taunt_per_sec)'),
  'V CompanionAI: tank tích threat');

// ================= 3. FILE V MỚI =================
['mounts.v', 'fashion.v', 'guildwar.v', 'vip.v'].forEach((f) => {
  const src = read(path.join(VDIR, f));
  check(!!src, 'V mới: ' + f + ' tồn tại');
  if (!src) return;
  check(!/TODO|FIXME|stub/i.test(src), 'V mới ' + f + ': không TODO/stub');
  // field struct dùng `= 0`: cấm — chỉ cho phép `= -1` (theo quy ước file cũ) hoặc không default
  const structDefaults = (src.match(/^\t\w+\s+[\w\[\]]+\s*=\s*0\s*$/gm) || []).length;
  check(structDefaults === 0, 'V mới ' + f + ': không field struct `= 0`');
});
const vMounts = read(path.join(VDIR, 'mounts.v'));
check(!!vMounts && (vMounts.match(/MountDef\{/g) || []).length === 6, 'V mounts.v: 6 tọa kỵ');
const vFashion = read(path.join(VDIR, 'fashion.v'));
check(!!vFashion && (vFashion.match(/FashionDef\{/g) || []).length === 8, 'V fashion.v: 8 bộ thời trang');
const vGuildwar = read(path.join(VDIR, 'guildwar.v'));
check(!!vGuildwar && vGuildwar.includes('guildwar_open_hour = 19') && vGuildwar.includes('guildwar_close_hour = 20'),
  'V guildwar.v: bang chiến mở 19h-20h');
const vVip = read(path.join(VDIR, 'vip.v'));
check(!!vVip && (vVip.match(/VipLevelDef\{/g) || []).length === 6, 'V vip.v: 6 cấp VIP');
check(!!vVip && (vVip.match(/RankNpc\{/g) || []).length === 20, 'V vip.v: 20 NPC mẫu bảng xếp hạng');
check(!!vGame && vGame.includes('mount_id') && vGame.includes('fashion_id') && vGame.includes('vip_level')
  && vGame.includes('guildwar_score') && vGame.includes('sectwar_score') && vGame.includes('taunt_active'),
  'V game.v: GState chỉ thêm field mới (mount/fashion/VIP/bang chiến/taunt)');
const vSave = read(path.join(VDIR, 'save.v'));
check(!!vSave && vSave.includes('mount_id') && vSave.includes('vip_level') && vSave.includes('mail'),
  'V save.v: lưu/khôi phục hệ thống vòng 3');
const mainV = read(path.join(VDIR, 'main.v'));
check(!!mainV && !/mounts|fashion|guildwar|vip/.test(mainV.split('fn main')[1] || ''),
  'V main.v: không register thừa (file mới không có component)');
check(!!vGame && vGame.includes('mount_bonus_hp()') && vGame.includes('fashion_bonus_hp()'),
  'V: chỉ số tọa kỵ/thời trang cộng vào apply_hero_stats/gain_exp');

// ================= 4. MÔ PHỎNG LOGIC 06-expand.js TRONG VM =================
function makeCtx() {
  const els = {};
  function elStub() {
    return {
      innerHTML: '', textContent: '', value: '', style: {}, disabled: false,
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, appendChild() {}, querySelector() { return null; },
    };
  }
  const ctx = {
    console, Math, JSON, Date, setTimeout, clearTimeout,
    window: { addEventListener() {}, onload: null },
    document: { getElementById(id) { if (!els[id]) els[id] = elStub(); return els[id]; } },
    localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
    THREE: {
      Group: function () { this.add = function () {}; this.remove = function () {}; this.position = { set() {}, y: 0 }; },
      MeshStandardMaterial: function () { this.color = { setHex() {}, getHex() { return 0xdce2e6; } }; },
      Mesh: function () { this.position = { set() {} }; this.rotation = {}; this.castShadow = false; this.material = { color: { setHex() {}, getHex() { return 0xdce2e6; } } }; this.isMesh = true; this.userData = {}; },
      BoxGeometry: function () {}, CylinderGeometry: function () {},
    },
    gameState: {
      level: 10, gold: 100000, silver: 40932, exp: 0, maxExp: 100, hp: 180, maxHp: 180,
      mp: 426, maxMp: 426, attackPower: 68, defense: 12, critChance: 0.35, kills: 50,
      partyHeroes: [0, 1, 2, 5, 7], pvpPoints: 100, pvpWins: 2, pvpLosses: 1,
      guild: { name: 'Song Ma Quyền Phái', contrib: 250 },
      sectId: 'thieulam', inventory: [{ id: 'hp_pill', qty: 10 }, { id: 'ngoc_linh', qty: 30 }],
      equipment: {}, pills: { hp: 10, mp: 8, rage: 5 },
    },
    ACTIVITIES: [{ id: 'kill10', limit: 3 }, { id: 'dungeon', limit: 2 }],
    ITEMS: {
      hp_pill: { name: 'Hồi Huyết Đan' }, ngoc_linh: { name: 'Ngọc Linh Thạch' },
      da_cuong_hoa: { name: 'Đá Cường Hóa' }, linh_thao: { name: 'Linh Thảo' },
      mp_pill: { name: 'Hồi Khí Đan' },
    },
    SECTS: [
      { id: 'thieulam', name: 'Thiếu Lâm', icon: '🛕', atk: 4 },
      { id: 'vodang', name: 'Võ Đang', icon: '☯️', atk: 12 },
    ],
    GUILD_PRESETS: [
      { name: 'Song Ma Quyền Phái', level: 5, members: 48 },
      { name: 'Bát Hoang Kiếm Tông', level: 4, members: 32 },
    ],
    PVP_OPPONENTS: [],
    HEROES: [],
    allies: [],
    enemies: [],
    player: {
      root: { add() {}, remove() {}, position: { x: 0, y: 0, z: 0 } },
      bodyPivot: { position: { y: 0 } },
      torsoGroup: { traverse() {} }, leftArm: { traverse() {} }, rightArm: { traverse() {} },
    },
    currentPanel: null,
    escHtml(s) { return String(s); },
    fmt(n) { return String(Math.floor(n)); },
    todayStr() { return '2026-11-25'; },
    showSystemBanner() {}, addDmgLog() {},
    addGold(n) { ctx.gameState.gold = Math.max(0, ctx.gameState.gold + n); return ctx.gameState.gold; },
    addSilver(n) { ctx.gameState.silver = Math.max(0, ctx.gameState.silver + n); return ctx.gameState.silver; },
    spendGold(n) { if (ctx.gameState.gold < n) return false; ctx.gameState.gold -= n; return true; },
    spendSilver(n) { if (ctx.gameState.silver < n) return false; ctx.gameState.silver -= n; return true; },
    countItem(id) { const it = ctx.gameState.inventory.find((x) => x.id === id); return it ? it.qty : 0; },
    addItem(id, qty) {
      qty = qty || 1;
      const it = ctx.gameState.inventory.find((x) => x.id === id);
      if (it) it.qty += qty; else ctx.gameState.inventory.push({ id, qty });
      return true;
    },
    removeItem(id, qty) {
      qty = qty || 1;
      const it = ctx.gameState.inventory.find((x) => x.id === id);
      if (!it || it.qty < qty) return false;
      it.qty -= qty; if (it.qty <= 0) ctx.gameState.inventory = ctx.gameState.inventory.filter((x) => x.id !== id);
      return true;
    },
    recalcStats() {}, levelUp() { ctx.gameState.level++; },
    buildAllies() {}, renderTeam() {}, renderBag() {}, saveGame() {}, loadGame() { return false; },
    openPanel() {}, closePanels() {}, masterTick() {},
    killEnemy() {}, onEnemyKilledLoot() {},
    heroDefG1(id) {
      const H = { 0: { id: 0, name: 'Quỷ Cốc Tử', title: 'Bát Hoang Kiếm Chủ', role: 'dps', tint: 0xfff4e2, hpMult: 1, atkMult: 1 },
        1: { id: 1, name: 'Lãnh Nguyệt', title: 'Băng Tâm Kiếm Khách', role: 'support', tint: 0xcde8ff, hpMult: 0.95, atkMult: 1.05 },
        2: { id: 2, name: 'Huyết Đao', title: 'Huyết Ma Đao Vương', role: 'tank', tint: 0xffc6be, hpMult: 1.15, atkMult: 1.25 },
        5: { id: 5, name: 'Kim Cương', title: 'Kim Cang Thiền Sư', role: 'tank', tint: 0xffedbe, hpMult: 1.35, atkMult: 0.9 } };
      return H[id] || H[0];
    },
    partyHeroAt(slot) { return ctx.heroDefG1(ctx.gameState.partyHeroes[slot]); },
    sectDef() { return ctx.SECTS[0]; },
    pvpPower() { return ctx.gameState.attackPower + ctx.gameState.level * 5; },
    findNearestEnemyFrom() { return null; },
    ROLE_NAMES: { tank: 'Tank', dps: 'DPS', healer: 'Hồi máu', support: 'Hỗ trợ' },
  };
  ctx.window.QC = {};
  vm.createContext(ctx);
  return ctx;
}
let ctx = null;
try {
  ctx = makeCtx();
  vm.runInContext(js06, ctx, { filename: '06-expand.js' });
  report('PASS', 'VM: nạp được 06-expand.js với stub tối thiểu');
} catch (e) {
  report('FAIL', 'VM: nạp được 06-expand.js với stub tối thiểu', String(e && e.stack || e));
}
if (ctx) {
  function vrun(code) { return vm.runInContext(code, ctx); }
  try {
    check(vrun('vipLevelFor(0)') === 0, 'VM VIP: nạp 0 → VIP0');
    check(vrun('vipLevelFor(500)') === 1, 'VM VIP: nạp 500 → VIP1');
    check(vrun('vipLevelFor(20000)') === 5, 'VM VIP: nạp 20000 → VIP5');
    check(vrun('vipLevelFor(19999)') === 4, 'VM VIP: nạp 19999 vẫn VIP4');
    check(vrun('guildWarIsOpen(19)') === true && vrun('guildWarIsOpen(20)') === false
      && vrun('guildWarIsOpen(18)') === false, 'VM bang chiến: chỉ mở 19h-20h');
    check(vrun('bagCap()') === 30, 'VM túi: VIP0 = 30 ô');
    vrun('gameState.vipLevel = 5;');
    check(vrun('bagCap()') === 60, 'VM túi: VIP5 = 60 ô (+30)');
    check(vrun('vipExpPct()') === 30 && vrun('vipDropPct()') === 30, 'VM VIP5: +30% EXP, +30% rơi đồ');
    check(vrun('vipActivityExtra()') === 3, 'VM VIP5: +3 lượt hoạt động/ngày');
    vrun('gameState.vipLevel = 0;');
    // Tọa kỵ: mua + cưỡi + nâng cấp
    const goldBefore = vrun('gameState.gold');
    check(vrun('buyMount(0)') === undefined && vrun('gameState.mountsOwned[0]') === true
      && vrun('gameState.gold') === goldBefore - 500, 'VM tọa kỵ: mua Ngựa Bạch trừ 500 vàng thật');
    vrun('rideMount(0);');
    check(vrun('gameState.mountRiding') === true && vrun('gameState.mountSpeedMult') === 1.25,
      'VM tọa kỵ: cưỡi Ngựa Bạch tốc độ x1.25 thật');
    check(vrun('mountBonus().hp') === 40 && vrun('mountBonus().atk') === 4, 'VM tọa kỵ: +40 HP +4 Công');
    vrun('upgradeMount(0);');
    check(vrun('gameState.mountLevels[0]') === 1 && vrun('countItem("ngoc_linh")') === 25,
      'VM tọa kỵ: nâng cấp tốn 5 Ngọc Linh Thạch thật');
    check(vrun('mountBonus().hp') === 60, 'VM tọa kỵ Lv1: +60 HP (+20/cấp)');
    vrun('leaveMount();');
    check(vrun('gameState.mountRiding') === false && vrun('gameState.mountSpeedMult') === 1,
      'VM tọa kỵ: xuống ngựa về tốc độ x1');
    // Thời trang: mua + mặc
    check(vrun('buyFashion(3)') === undefined && vrun('gameState.fashionsOwned[3]') === true,
      'VM thời trang: mua Kim Giáp');
    vrun('wearFashion(3);');
    check(vrun('gameState.fashionId') === 3 && vrun('fashionBonus().hp') === 60,
      'VM thời trang: mặc Kim Giáp +60 HP');
    vrun('removeFashion();');
    check(vrun('gameState.fashionId') === -1, 'VM thời trang: cởi ra được');
    // VIP nạp thật
    const g2 = vrun('gameState.gold');
    vrun('napVip(500);');
    check(vrun('gameState.vipLevel') === 1 && vrun('gameState.vipTotalNap') === 500
      && vrun('gameState.gold') === g2 - 500, 'VM VIP: nạp 500 vàng → VIP1, trừ vàng thật');
    // Thư: gửi + nhận đính kèm thật (lưu ý: napVip trước đó đã gửi 1 thư VIP)
    const mailBefore = vrun('gameState.mailbox.length');
    const unreadBefore = vrun('mailUnreadCount()');
    vrun('sendMail("Hệ thống", "Thưởng test", "Thưởng", { gold: 100, item: "hp_pill", qty: 2 });');
    check(vrun('gameState.mailbox.length') === mailBefore + 1 && vrun('mailUnreadCount()') === unreadBefore + 1,
      'VM thư: nhận thêm 1 thư chưa đọc');
    const mid = vrun('gameState.mailbox[0].id');
    const g3 = vrun('gameState.gold');
    vrun('claimMail(' + mid + ');');
    check(vrun('gameState.gold') === g3 + 100 && vrun('gameState.mailbox[0].claimed') === true,
      'VM thư: nhận đính kèm +100 vàng thật, chỉ nhận 1 lần');
    vrun('claimMail(' + mid + ');');
    check(vrun('gameState.gold') === g3 + 100, 'VM thư: nhận lại không được cộng thêm');
    // Chat: gửi + NPC trả lời theo mẫu (đồng bộ kiểm tra phần gửi)
    check(vrun('sendChat("world", "chào mọi người")') === undefined
      && vrun('gameState.chatWorld.length') === 1, 'VM chat: gửi tin kênh Thế Giới');
    check(vrun('sendChat("guild", "chào bang")') === undefined
      && vrun('gameState.chatGuild.length') === 1, 'VM chat: gửi tin kênh Bang (đã vào bang)');
    // Đổi đội trưởng: F2 (slot 1) hoán đổi hero 0 ↔ 1
    vrun('switchLeaderHTML(1);');
    check(vrun('gameState.partyHeroes[0]') === 1 && vrun('gameState.partyHeroes[1]') === 0,
      'VM đội trưởng: F2 đổi Quỷ Cốc ↔ Lãnh Nguyệt thật');
    // Bảng xếp hạng: người chơi chen vào đúng thứ tự lực chiến
    const rows = vrun('rankList("power")');
    check(Array.isArray(rows) && rows.length === 21, 'VM BXH: 21 hàng (20 NPC + người chơi)');
    check(rows[0].power >= rows[rows.length - 1].power, 'VM BXH: sắp xếp lực chiến giảm dần');
    check(rows.some((r) => r.isYou), 'VM BXH: có hàng người chơi');
    // Đấu thử bang chiến: tùy giờ máy lúc chạy test — nếu ngoài 19h-20h thì
    // từ chối, nếu trong giờ thì đánh đúng 1 trận và ghi ngày (không crash).
    const gwBefore = vrun('gameState.guildWarWins') + vrun('gameState.guildWarLosses');
    const gwOpenNow = vrun('guildWarIsOpen()');
    vrun('fightGuildWar();');
    const gwAfter = vrun('gameState.guildWarWins') + vrun('gameState.guildWarLosses');
    check(gwOpenNow ? (gwAfter === gwBefore + 1 && vrun('gameState.guildWarDate') === '2026-11-25')
      : (gwAfter === gwBefore),
      'VM bang chiến: ngoài giờ thì từ chối, trong giờ thì đánh đúng 1 trận/ngày');
    // Đấu thử môn phái chiến (không giới hạn giờ): có kết quả thắng/thua + thưởng
    const g4 = vrun('gameState.gold');
    vrun('fightSectWar();');
    check(vrun('gameState.sectWarWins') + vrun('gameState.sectWarLosses') === 1
      && vrun('gameState.gold') >= g4 + 50, 'VM môn phái chiến: 1 trận, có thưởng vàng thật');
    check(vrun('gameState.sectWarDate') === '2026-11-25', 'VM môn phái chiến: 1 trận/ngày (đánh lại bị chặn)');
    vrun('fightSectWar();');
    check(vrun('gameState.sectWarWins') + vrun('gameState.sectWarLosses') === 1,
      'VM môn phái chiến: đánh lại cùng ngày bị chặn');
  } catch (e) {
    report('FAIL', 'VM: mô phỏng logic 06-expand.js', String(e && e.stack || e));
  }
}

// ================= 5. MAIN.SCENE =================
const scene = read(path.join(VDIR, 'assets', 'scenes', 'main.scene'));
check(!!scene && scene.includes('bấm N để Nộ Trảm'), 'main.scene: hint Nộ Trảm phím N (không còn +45%)');
check(!!scene && !scene.includes('bùng nổ +45%'), 'main.scene: không còn text tự bùng +45%');

console.log(`\n== KẾT QUẢ: ${pass} PASS / ${fail} FAIL / ${missing} MISSING ==`);
process.exit(fail > 0 ? 1 : 0);
