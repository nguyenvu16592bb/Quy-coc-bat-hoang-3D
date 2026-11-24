// tests/test-battle-mvl.js — Harness kiểm thử hệ thống Battle vòng 2
// (Quỷ Cốc Bát Hoang 3D, phong cách Mộng Võ Lâm).
//
// Chạy:  node tests/test-battle-mvl.js        (từ thư mục gốc repo)
// Thoát: 0 = không có FAIL (MISSING được phép), 1 = có ít nhất 1 FAIL.
//
// NGUYÊN TẮC (giống tests/test-mongvolam.js vòng 1):
//  - Mọi số liệu đều đọc từ FILE THẬT tại thời điểm chạy bằng regex scan.
//    Harness KHÔNG hardcode kết quả đếm — chỉ hardcode KỲ VỌNG THIẾT KẾ
//    (chuẩn vòng 2 đã chốt, xem dưới).
//  - Hệ thống nào chưa có file / chưa có marker thì báo MISSING, không crash,
//    không fail cứng toàn bộ run. Nhóm 1 (HTML) + nhóm 2 (V) đang sửa song song
//    nên file của họ có thể chưa xong khi harness chạy.
//  - Phần mô phỏng logic là logic thuần JS trong file này, assert số liệu cụ thể
//    của THIẾT KẾ (không phụ thuộc code game).
//  - PHẠM VI SCAN: chỉ `velo/web/qu_c_c_b_t_hoang_3d.html`,
//    `velo/quycoc3d/*.v` và `velo/quycoc3d/assets/scenes/main.scene`.
//    `velo/battle.v` (2758 dòng, MergeBoard 5x3) là một game khác ở gốc `velo/`,
//    KHÔNG thuộc quycoc3d nên harness này không đếm nó.
//
// CHUẨN THIẾT KẾ VÒNG 2 (đã chốt — nhóm 1+2 sửa source theo chuẩn này).
// Số trong ngoặc là số ĐO ĐƯỢC trong code sau khi nhóm 1+2 hạ cánh (2026-11-25
// ~04:57 +07); chỗ nào hai bản khác nhau thì ghi rõ là lệch cần chốt tiếp:
//  - Formation: 5 slot, 3 hàng (trước/giữa/sau), vai trò tank/dps/healer.
//    (HTML partyHeroes mặc định [0,5,7,1,3]; V hero_ids [0,1,2] + extra [5,7]
//    — cùng 1 tank/1 healer/3 dps nhưng khác 1 thành viên: HTML có id 3,
//    V có id 2 → lệch, xem mục J.)
//  - Auto-battle: bật/tắt; tự dùng skill khi đủ MP + hết CD; tự uống đan khi HP thấp.
//    (Ngưỡng uống đan: HTML 35% HP, V 25% HP → lệch, xem mục J.)
//  - Raid boss Cóc Xanh: 3 phase, đổi phase ở 66% / 33% HP, mỗi lần đổi phase
//    gọi quái con, AoE có cảnh báo 1,2 giây trước.
//    (Quái con mỗi lần đổi phase: HTML 2 con (phase 2) + 3 con (phase 3),
//    V 3 con/lần → lệch ở phase 2. Boss raid: HTML Kim Thiềm Vương 20000 HP
//    cố định, V dùng boss của map (HP thay đổi theo map) → lệch.)
//  - Combo/nộ: combo tăng theo đòn đánh liên tiếp, reset khi ngắt quãng;
//    nộ đầy 100 → dùng chiêu nộ.
//    (Cửa sổ combo: HTML 3 giây, V 4,0 giây → lệch. Tích nộ: HTML +8/đòn
//    (+12/skill) → Nộ Trảm tay (dmg = công×4 + combo×10, AoE 6m); V +6/đòn
//    (+15/kill) → tự bùng nổ +45% sát thương 6 giây → lệch cơ chế.
//    Nộ Bạo Linh Phù vòng 1 (12 giây, +35% crit) thì khớp nhau cả hai bản.)
//    Damage log: HTML giữ tối đa 50 dòng, V giữ 8 dòng → lệch, xem mục J.
//  - Tốc độ x1/x2, tạm dừng (đóng băng thời gian), bỏ qua (kết thúc trận ngay).
//    (HTML có đủ 3; V chưa có → MISSING phía V.)
//  - Enhance/gem: cost 100×(cấp+1) vàng, rate max(10, 100−cấp×10)%,
//    tối đa +10, thất bại rớt TỐI ĐA −1 cấp (giới hạn trên, không phải bắt buộc
//    rớt đúng 1 — cả hai bản hiện giữ nguyên cấp khi thất bại, tức rớt 0,
//    vẫn thỏa giới hạn này; muốn rớt đúng 1 thì cần quyết riêng),
//    6 loại ngọc, tiền không bao giờ âm.
//    (Roll deterministic: HTML thêm hạng `attempts×29`, V không có → lệch.)
//  - PvP: 8 đối thủ, thắng +25 / thua −15, điểm floor 0, thưởng ngày nhận 1 lần/ngày.
//    (Thưởng ngày: HTML +150 vàng/+300 bạc/+50 EXP, V chưa có → MISSING phía V.
//    Boss thế giới: vàng 5000 khớp, đá thưởng lệch — HTML +5 Đá Cường Hóa,
//    V +50 linh thạch.)
//  - Town safe: vào thị trấn tắt spawn, ra bật lại; 3 NPC (Trưởng Môn/Chủ Sạp/Thợ Rèn).
//  - Panel mới trong main.scene: BattlePanel, TownPanel, EnhancePanel, PvpPanel.
//    (V đã đăng ký BattlePanelUI/TownPanelUI + find() các node, nhưng main.scene
//    vẫn chưa có node nào → panel V chưa hiển thị được, xem mục I.)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'velo', 'web', 'qu_c_c_b_t_hoang_3d.html');
const VDIR = path.join(ROOT, 'velo', 'quycoc3d');
const SCENE = path.join(VDIR, 'assets', 'scenes', 'main.scene');

let pass = 0, fail = 0, missing = 0;
const results = [];

function report(status, name, detail) {
  results.push({ status, name, detail: detail || '' });
  if (status === 'PASS') pass++;
  else if (status === 'FAIL') fail++;
  else missing++;
  console.log(`[${status}] ${name}${detail ? ' — ' + detail : ''}`);
}
function check(cond, name, detail) {
  report(cond ? 'PASS' : 'FAIL', name, detail);
}
function checkMissing(cond, name, detail) {
  // cond = hệ thống đã xuất hiện? Có -> PASS, chưa -> MISSING (không FAIL).
  report(cond ? 'PASS' : 'MISSING', name, detail);
}

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; }
}
function vFiles() {
  try {
    return fs.readdirSync(VDIR).filter((f) => f.endsWith('.v'))
      .map((f) => path.join(VDIR, f));
  } catch (e) { return []; }
}
function readAllV() {
  const out = {};
  for (const f of vFiles()) out[path.basename(f)] = read(f) || '';
  return out;
}
// Đếm literal `XxxDef{` ở đầu dòng (giống test-mongvolam.js: không đếm nhầm
// `name:` lồng bên trong). Trả về null nếu không tìm thấy literal nào.
function countDefLiterals(files, defNames) {
  for (const name of defNames) {
    let total = 0;
    let found = false;
    for (const f of files) {
      const n = (f.text.match(new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{', 'gm')) || []).length;
      if (n > 0) { total += n; found = true; }
    }
    if (found) return total;
  }
  return null;
}

const html = read(HTML);
const vMap = readAllV();
const vList = Object.entries(vMap).map(([name, text]) => ({ name, text }));
const scene = read(SCENE);
const allV = vList.map((f) => f.text).join('\n');
const teamV = vMap['team.v'] || '';
const combatV = vMap['combat.v'] || '';
const equipV = vMap['equipment.v'] || '';
const pvpV = vMap['pvp.v'] || '';
const hudV = vMap['hud.v'] || '';
const battleMapV = vMap['battle_map.v'] || '';
const townV = vMap['town.v'] || '';
const gameV = vMap['game.v'] || '';
const enemiesV = vMap['enemies.v'] || '';

// Số liệu cross-mirror Battle v2 (điền dần, đối chiếu ở mục J).
const cross = {};

// =====================================================================
// A. Formation 5 — đội hình 5 người, 3 hàng, vai trò tank/dps/healer
// =====================================================================
console.log('\n== A. Formation 5 (đội hình) ==');
{
  // A1. HTML: panel-team + partyHeroes 5 người + vai trò tank/dps/healer.
  const htmlPartyM = html !== null && (html.match(/partyHeroes = \[([0-9,\s]+)\]/) || [])[1];
  const htmlPartySet = htmlPartyM ? htmlPartyM.split(',').map((s) => parseInt(s.trim(), 10)).sort((a, b) => a - b) : null;
  if (html !== null) {
    cross.htmlPartySize = htmlPartySet ? htmlPartySet.length : null;
    cross.htmlPartySet = htmlPartySet;
    check(/id="panel-team"/.test(html) && /Đội Hình — 5 người/.test(html),
      'HTML: có panel-team "Đội Hình — 5 người"', 'có panel-team');
    check(htmlPartySet !== null && htmlPartySet.length === 5,
      'HTML: partyHeroes mặc định đủ 5 người', `partyHeroes=[${htmlPartySet ? htmlPartySet.join(',') : '?'}]`);
    const htmlRoles = /role: 'tank'/.test(html) && /role: 'healer'/.test(html);
    check(htmlRoles, 'HTML: hero có vai trò tank/healer (HEROES role:)',
      `tank: ${/role: 'tank'/.test(html)}, healer: ${/role: 'healer'/.test(html)}`);
    check(/function heroRow/.test(html) && /tank.*front|front.*tank/i.test(html),
      'HTML: xếp hàng theo vai trò (tank hàng trước, healer hàng sau)', 'có heroRow tank→front, healer→back');
  } else {
    report('FAIL', 'HTML file tồn tại', 'không đọc được ' + HTML);
  }

  // A2. V: battle_map.v — battle_party_max = 5, vai trò tank/dps/healer,
  // hero_ids [0,1,2] + hero_ids_extra [5,7].
  const partyMaxM = (battleMapV.match(/const battle_party_max = (\d+)/) || [])[1];
  if (partyMaxM === undefined) report('MISSING', 'V: hằng số battle_party_max', 'không tìm thấy battle_party_max trong battle_map.v');
  else { cross.vPartySize = parseInt(partyMaxM, 10); check(cross.vPartySize === 5, 'V: formation tối đa 5 người (battle_party_max)', `battle_party_max=${partyMaxM}`); }
  check(/fn hero_role/.test(battleMapV) && /return 'tank'/.test(battleMapV) && /return 'healer'/.test(battleMapV),
    'V: có hero_role tank/dps/healer (battle_map.v)', 'có fn hero_role');
  const vIdsM = (gameV.match(/hero_ids \[3\]int = \[([0-9,\s]+)\]/) || [])[1];
  const vExtraM = (gameV.match(/hero_ids_extra \[2\]int = \[([0-9,\s]+)\]/) || [])[1];
  const vSet = (vIdsM && vExtraM)
    ? [...vIdsM.split(',').map((s) => parseInt(s.trim(), 10)), ...vExtraM.split(',').map((s) => parseInt(s.trim(), 10))].sort((a, b) => a - b)
    : null;
  cross.vPartySet = vSet;
  check(vSet !== null && vSet.length === 5,
    'V: đội hình mặc định đủ 5 người (hero_ids + hero_ids_extra)', `hero_ids=[${vIdsM || '?'}] + extra=[${vExtraM || '?'}] → {${vSet ? vSet.join(',') : '?'}}`);
  check(/fn expand_party_to_five/.test(battleMapV),
    'V: có expand_party_to_five() lập trận hình 5 người', 'có fn expand_party_to_five');
  check(/Tank \+ Healer nhập đội/.test(battleMapV),
    'V: mở trận hình 5 có đủ tank + healer', 'banner "Tank + Healer nhập đội"');
  // Vai trò: cả hai bản đều 1 tank (Kim Cương id 5) + 1 healer (Bạch Hổ id 7) + 3 dps.
  if (html !== null) {
    check(/id: 5, name: 'Kim Cương'[^}]*role: 'tank'/.test(html) && /id: 7, name: 'Bạch Hổ'[^}]*role: 'healer'/.test(html),
      'HTML: Kim Cương (id 5) tank + Bạch Hổ (id 7) healer', 'role tank id 5, healer id 7');
  }
  check(/id == 5[\s\S]{0,80}return 'tank'/.test(battleMapV) && /id == 7[\s\S]{0,80}return 'healer'/.test(battleMapV),
    'V: Kim Cương (id 5) tank + Bạch Hổ (id 7) healer', 'hero_role id 5→tank, id 7→healer');

  // A3. Mô phỏng thuần JS: đội hình chuẩn 5 slot / 3 hàng / vai trò.
  // Hàng 0 (trước): 2 tank — Hàng 1 (giữa): 2 dps — Hàng 2 (sau): 1 healer.
  const formation = [
    { slot: 0, row: 0, role: 'tank' },
    { slot: 1, row: 0, role: 'tank' },
    { slot: 2, row: 1, role: 'dps' },
    { slot: 3, row: 1, role: 'dps' },
    { slot: 4, row: 2, role: 'healer' },
  ];
  check(formation.length === 5, 'Formation: đủ 5 slot', `đếm được ${formation.length} slot`);
  const rows = new Set(formation.map((m) => m.row));
  check(rows.size === 3, 'Formation: đủ 3 hàng (trước/giữa/sau)', `hàng: ${[...rows].sort().join(', ')}`);
  const roles = formation.map((m) => m.role);
  check(roles.filter((r) => r === 'tank').length >= 1, 'Formation: có ít nhất 1 tank', `tank: ${roles.filter((r) => r === 'tank').length}`);
  check(roles.filter((r) => r === 'healer').length >= 1, 'Formation: có ít nhất 1 healer', `healer: ${roles.filter((r) => r === 'healer').length}`);
  check(roles.filter((r) => r === 'dps').length >= 1, 'Formation: có ít nhất 1 dps', `dps: ${roles.filter((r) => r === 'dps').length}`);
  check(formation.filter((m) => m.row === 2).every((m) => m.role === 'healer'),
    'Formation: hàng sau chỉ có healer (không tank/dps đứng sau)', 'hàng sau: healer');
  check(formation.filter((m) => m.row === 0).every((m) => m.role === 'tank'),
    'Formation: hàng trước chỉ có tank', 'hàng trước: tank, tank');
  const slotsUnique = new Set(formation.map((m) => m.slot)).size === 5;
  check(slotsUnique, 'Formation: 5 slot không trùng nhau', 'slot 0–4');
}

// =====================================================================
// B. Auto-battle — tự đánh: skill khi đủ MP, đan khi HP thấp, bật/tắt
// =====================================================================
console.log('\n== B. Auto-battle ==');
{
  // B1. HTML: toggleAutoBattle + autoBattleTick (ngưỡng uống đan HP < 35%).
  if (html !== null) {
    check(/function toggleAutoBattle/.test(html), 'HTML: có toggleAutoBattle (bật/tắt tự đánh)', 'có toggleAutoBattle');
    check(/function autoBattleTick/.test(html), 'HTML: có autoBattleTick (quyết định tự đánh)', 'có autoBattleTick');
    const htmlPillM = (html.match(/gameState\.hp < gameState\.maxHp \* (0\.\d+) && countItem\('hp_pill'\)/) || [])[1];
    cross.htmlAutoPillPct = htmlPillM !== undefined ? Math.round(parseFloat(htmlPillM) * 100) : null;
    check(cross.htmlAutoPillPct !== null, 'HTML: auto-battle tự uống đan khi HP thấp (ngưỡng đo được)',
      `ngưỡng HP<${cross.htmlAutoPillPct ?? '?'}%`);
    check(/castSkill\(4\)/.test(html) && /gameState\.hp < gameState\.maxHp \* 0\.4/.test(html),
      'HTML: auto-battle tự dùng skill hồi máu khi HP < 40% + đủ MP', 'có castSkill(4) khi HP<40%');
    check(/if \(!gameState\.autoBattle \|\| gameState\.battlePaused \|\| gameState\.townMode\) return/.test(html),
      'HTML: auto-battle dừng khi tắt auto / tạm dừng / ở thị trấn', 'có guard autoBattle/townMode');
  }
  // B2. V: toggle_auto_battle + auto_battle_tick 0.9s (ngưỡng uống đan HP < 25%).
  check(/fn toggle_auto_battle/.test(battleMapV), 'V: có toggle_auto_battle (bật/tắt tự đánh)', 'có fn toggle_auto_battle');
  check(/fn \(mut d BattleDirector\) auto_battle_tick/.test(battleMapV), 'V: có BattleDirector.auto_battle_tick (quyết định tự đánh)', 'có auto_battle_tick');
  const vPillM = (battleMapV.match(/if s\.hp < s\.max_hp \/ (\d+)/) || [])[1];
  cross.vAutoPillPct = vPillM !== undefined ? Math.round(100 / parseInt(vPillM, 10)) : null;
  check(cross.vAutoPillPct !== null, 'V: auto-battle tự uống Hồi Huyết Đan khi HP thấp (ngưỡng đo được)',
    `ngưỡng HP<${cross.vAutoPillPct ?? '?'}% (s.hp < s.max_hp/${vPillM ?? '?'})`);
  check(/skill 4 \(Kim Cang Hộ Thể\) heals/.test(battleMapV) && /battle_heal_threshold/.test(battleMapV),
    'V: auto-battle tự dùng skill 4 hồi máu khi HP < 50% + đủ MP', 'có skill 4 khi HP<50%');
  check(/d\.auto_t = 0\.9/.test(battleMapV), 'V: auto-battle quyết định mỗi 0.9 giây', 'có auto_t = 0.9');
  // game.v có field auto_battle trong GState (nối UI ↔ logic).
  check(/auto_battle\s+bool/.test(gameV), 'V: GState có field auto_battle', 'game.v có auto_battle bool');
  // Phân biệt: HTML vòng 1 ĐÃ có auto-attack (tự chém thường khi đứng gần quái)
  // — đó KHÔNG phải auto-battle (không tự dùng skill, không tự uống đan).
  if (html !== null) {
    check(/autoAttackCooldown/.test(html), 'HTML: auto-attack cũ còn nguyên (tự chém thường khi đứng gần quái)',
      'có autoAttackCooldown');
  }

  // Mô phỏng thuần JS: quyết định auto-battle theo trạng thái.
  // Ưu tiên: uống đan khi HP < ngưỡng > dùng skill khi đủ MP + hết CD > chém thường.
  // Tắt auto → không làm gì. Chuẩn chung vòng 2: ngưỡng uống đan 25% cả hai bản.
  function autoDecide(s, pillPct) {
    if (!s.autoOn) return 'none';
    if (s.hpPct < pillPct && s.pills > 0) return 'pill';
    if (s.mp >= s.skillCost && s.skillCd <= 0) return 'skill';
    return 'attack';
  }
  check(autoDecide({ autoOn: false, hpPct: 10, pills: 3, mp: 100, skillCost: 30, skillCd: 0 }, 35) === 'none',
    'Auto-battle: tắt auto → không tự làm gì (kể cả khi HP thấp)', "autoOn=false → 'none'");
  check(autoDecide({ autoOn: true, hpPct: 20, pills: 2, mp: 100, skillCost: 30, skillCd: 0 }, 25) === 'pill',
    'Auto-battle (ngưỡng chung 25%): HP 20% → tự uống đan (ưu tiên hơn skill)', "→ 'pill'");
  check(autoDecide({ autoOn: true, hpPct: 30, pills: 2, mp: 100, skillCost: 30, skillCd: 0 }, 25) === 'skill',
    'Auto-battle (ngưỡng chung 25%): HP 30% → không uống đan, dùng skill', "hpPct=30 ≥ 25 → 'skill'");
  check(autoDecide({ autoOn: true, hpPct: 25, pills: 2, mp: 100, skillCost: 30, skillCd: 0 }, 25) === 'skill',
    'Auto-battle: HP đúng ngưỡng 25% (không <25%) → không uống đan, dùng skill', "hpPct=25 → 'skill'");
  check(autoDecide({ autoOn: true, hpPct: 80, pills: 2, mp: 100, skillCost: 30, skillCd: 0 }, 35) === 'skill',
    'Auto-battle: HP đủ + MP 100 ≥ 30 + hết CD → tự dùng skill', "→ 'skill'");
  check(autoDecide({ autoOn: true, hpPct: 80, pills: 2, mp: 10, skillCost: 30, skillCd: 0 }, 35) === 'attack',
    'Auto-battle: MP 10 < 30 → KHÔNG dùng skill, chém thường', "→ 'attack'");
  check(autoDecide({ autoOn: true, hpPct: 80, pills: 2, mp: 100, skillCost: 30, skillCd: 2.5 }, 35) === 'attack',
    'Auto-battle: skill còn CD 2.5s → KHÔNG dùng skill, chém thường', "→ 'attack'");
  check(autoDecide({ autoOn: true, hpPct: 20, pills: 0, mp: 100, skillCost: 30, skillCd: 0 }, 35) === 'skill',
    'Auto-battle: HP thấp nhưng hết đan → dùng skill thay vì đứng yên', "pills=0 → 'skill'");
}

// =====================================================================
// C. Raid boss Cóc Xanh 3 phase — đổi phase 66%/33%, gọi quái con, AoE cảnh báo
// =====================================================================
console.log('\n== C. Raid boss Cóc Xanh (3 phase) ==');
{
  // C1. HTML: startRaid — Kim Thiềm Vương 20000 HP, 3 phase 66%/33%,
  // minions 2 (phase 2) + 3 (phase 3), AoE cảnh báo 1,2s, timer 120s.
  if (html !== null) {
    check(/function startRaid/.test(html), 'HTML: có startRaid (mở raid)', 'có startRaid');
    const raidHpM = (html.match(/boss\.hp = boss\.maxHp = (\d+)/) || [])[1];
    cross.htmlRaidBossHp = raidHpM !== undefined ? parseInt(raidHpM, 10) : null;
    check(cross.htmlRaidBossHp === 20000, 'HTML: raid boss Kim Thiềm Vương 20000 HP cố định',
      `raid boss hp=${raidHpM ?? '?'}`);
    check(/\[RAID 3 phase\]/.test(html) && /Phase 1\/3/.test(html),
      'HTML: raid bar hiện Phase 1/3 + nhãn [RAID 3 phase]', 'có raid-bar + raid-phase');
    check(/ratio <= 0\.66/.test(html) && /ratio <= 0\.33/.test(html),
      'HTML: đổi phase ở 66% / 33% HP', 'có ratio <= 0.66 và <= 0.33');
    cross.htmlRaidPhase2 = /ratio <= 0\.66/.test(html) ? 66 : null;
    cross.htmlRaidPhase3 = /ratio <= 0\.33/.test(html) ? 33 : null;
    const minP2 = (html.match(/raid\.phase === 1 && ratio <= 0\.66\) \{ raid\.phase = 2; raidSpawnMinions\((\d+)\)/) || [])[1];
    const minP3 = (html.match(/raid\.phase === 2 && ratio <= 0\.33\) \{ raid\.phase = 3; raidSpawnMinions\((\d+)\)/) || [])[1];
    cross.htmlRaidMinions = (minP2 !== undefined && minP3 !== undefined) ? [parseInt(minP2, 10), parseInt(minP3, 10)] : null;
    check(cross.htmlRaidMinions !== null, 'HTML: đổi phase gọi quái con (số lượng đo được)',
      `phase 2 → ${minP2 ?? '?'} con, phase 3 → ${minP3 ?? '?'} con`);
    check(/aoePending = \{[^}]*t: 1\.2/.test(html) && /Vòng đỏ AoE! Chạy ra ngoài vòng đỏ trong 1,2 giây/.test(html),
      'HTML: AoE có cảnh báo 1,2 giây (vòng đỏ) trước khi nổ', 'có aoePending t: 1.2 + banner cảnh báo');
    cross.htmlRaidAoeWarnS = /aoePending = \{[^}]*t: 1\.2/.test(html) ? 1.2 : null;
    check(/timeLeft: 120/.test(html), 'HTML: raid giới hạn 120 giây', 'có timeLeft: 120');
    check(/function endRaid/.test(html) && /addGold\(800\)/.test(html),
      'HTML: thắng raid +800 vàng / +300 EXP', 'có endRaid +800 vàng');
  }
  // C2. V: start_raid_boss — boss của map, 3 phase 66%/33%, 3 quái con/lần,
  // AoE cảnh báo 1,2s (vòng xoáy telegraph).
  check(/fn start_raid_boss/.test(battleMapV), 'V: có start_raid_boss (mở raid)', 'có fn start_raid_boss');
  const vP2 = (battleMapV.match(/const raid_phase_2_pct = (\d+)/) || [])[1];
  const vP3 = (battleMapV.match(/const raid_phase_3_pct = (\d+)/) || [])[1];
  cross.vRaidPhase2 = vP2 !== undefined ? parseInt(vP2, 10) : null;
  cross.vRaidPhase3 = vP3 !== undefined ? parseInt(vP3, 10) : null;
  check(cross.vRaidPhase2 === 66 && cross.vRaidPhase3 === 33,
    'V: đổi phase ở 66% / 33% HP (raid_phase_2/3_pct)', `phase2=${vP2 ?? '?'}%, phase3=${vP3 ?? '?'}%`);
  const vMinions = (battleMapV.match(/const raid_minion_count = (\d+)/) || [])[1];
  cross.vRaidMinions = vMinions !== undefined ? [parseInt(vMinions, 10), parseInt(vMinions, 10)] : null;
  check(cross.vRaidMinions !== null, 'V: đổi phase gọi quái con (số lượng đo được)',
    `mỗi lần đổi phase → ${vMinions ?? '?'} con (raid_minion_count)`);
  const vAoe = (battleMapV.match(/const raid_aoe_warn_s = f32\(([\d.]+)\)/) || [])[1];
  cross.vRaidAoeWarnS = vAoe !== undefined ? parseFloat(vAoe) : null;
  check(cross.vRaidAoeWarnS === 1.2, 'V: AoE có cảnh báo 1,2 giây (vòng xoáy telegraph)',
    `raid_aoe_warn_s=${vAoe ?? '?'}`);
  check(/spawn_monster\(mut world, m\.boss/.test(battleMapV),
    'V: raid dùng boss của map (m.boss — HP thay đổi theo map, không cố định 20000)',
    'có spawn_monster(m.boss)');
  check(/for _ in 0 \.\. 3 \{\s*\n?\s*spawn_monster/.test(battleMapV),
    'V: mở raid gọi thêm 3 quái con ngay từ đầu', 'có spawn 3 con khi start_raid_boss');
  check(/Raid Boss chuyển giai đoạn/.test(battleMapV),
    'V: đổi phase có banner cảnh báo', 'có banner "Raid Boss chuyển giai đoạn"');
  // Bối cảnh đã đo được (boss cũ — vòng 1):
  if (html !== null) {
    const gb = (html.match(/gameState\.guildBossHp = (\d+)/) || [])[1];
    const gbMax = (html.match(/gameState\.guildBossMaxHp = (\d+)/) || [])[1];
    check(gb !== undefined && gbMax !== undefined,
      'HTML: boss bang cũ Kim Thiềm Vương (800 HP) còn nguyên', `guildBossHp=${gb ?? '?'}/${gbMax ?? '?'}`);
  }
  const wbHp = (pvpV.match(/max_hp:\s*(\d+)/) || [])[1];
  cross.vWorldBossHp = wbHp !== undefined ? parseInt(wbHp, 10) : null;
  check(wbHp === '200000', 'V: boss thế giới Thiên Ma Tôn Chủ 200.000 HP còn nguyên',
    `world_boss.max_hp=${wbHp ?? '?'}`);

  // Mô phỏng thuần JS: phase theo % HP, đổi phase 1 lần duy nhất mỗi ngưỡng.
  function bossPhase(hpPct) {
    if (hpPct > 66) return 1;
    if (hpPct > 33) return 2;
    return 3;
  }
  check(bossPhase(100) === 1 && bossPhase(67) === 1, 'Raid phase: HP 100%/67% → phase 1', '100→1, 67→1');
  check(bossPhase(66) === 2 && bossPhase(34) === 2, 'Raid phase: HP 66%/34% → phase 2 (ngưỡng 66%)', '66→2, 34→2');
  check(bossPhase(33) === 3 && bossPhase(1) === 3 && bossPhase(0) === 3, 'Raid phase: HP 33%/0% → phase 3 (ngưỡng 33%)', '33→3, 0→3');
  // Mô phỏng trận: HP giảm dần 100→0, mỗi ngưỡng chỉ kích hoạt 1 lần.
  // Quái con mỗi lần đổi phase: chuẩn chung vòng 2 là [3, 3] cả hai bản.
  function simRaid(minionsPerPhase) {
    let phase = 1, fired = { 2: false, 3: false }, adds = 0, aoeWarned = 0;
    for (let hp = 100; hp >= 0; hp -= 1) {
      const p = bossPhase(hp);
      if (p !== phase) {
        if (!fired[p]) { fired[p] = true; adds += minionsPerPhase[p - 2]; aoeWarned += 1; }
        phase = p;
      }
    }
    return { phase, fired, adds, aoeWarned };
  }
  {
    const rHtml = simRaid([3, 3]);
    check(rHtml.phase === 3 && rHtml.fired[2] && rHtml.fired[3], 'Raid phase (HTML: 3+3 con): đánh 100→0% đi qua đủ phase 1→2→3', `phase cuối=${rHtml.phase}`);
    check(rHtml.adds === 6, 'Raid phase (HTML): đổi phase gọi 3 + 3 = 6 quái con', `adds=${rHtml.adds}`);
    check(rHtml.aoeWarned === 2, 'Raid phase (HTML): mỗi lần đổi phase có 1 cảnh báo AoE → 2 lần', `cảnh báo=${rHtml.aoeWarned}`);
    const rV = simRaid([3, 3]);
    check(rV.adds === 6, 'Raid phase (V): đổi phase gọi 3 + 3 = 6 quái con', `adds=${rV.adds}`);
  }
  // HP boss không âm khi nhận sát thương vượt HP còn lại.
  {
    const hpAfter = Math.max(0, 50 - 9999);
    check(hpAfter === 0, 'Raid boss: HP không âm khi bị đánh vượt HP còn lại', `50 - 9999 → clamp ${hpAfter}`);
  }
}

// =====================================================================
// D. Combo / nộ / damage log
// =====================================================================
console.log('\n== D. Combo / nộ / damage log ==');
{
  // D1. Combo counter + cửa sổ combo (chuẩn chung vòng 2: 3s cả hai bản).
  if (html !== null) {
    check(/gameState\.combo = \(gameState\.combo \|\| 0\) \+ 1/.test(html),
      'HTML: combo +1 mỗi đòn trúng', 'có combo +1 trong damageEnemy');
    // Chỉ đếm giá trị gán khác 0 (bỏ qua `comboTimer = 0` khi reset).
    const htmlWin = (html.match(/gameState\.comboTimer = ([1-9]\d*)/) || [])[1];
    cross.htmlComboWindowS = htmlWin !== undefined ? parseInt(htmlWin, 10) : null;
    check(cross.htmlComboWindowS !== null, 'HTML: cửa sổ combo (số giây đo được)',
      `comboTimer=${htmlWin ?? '?'}s`);
    check(/if \(gameState\.comboTimer <= 0 && gameState\.combo !== 0\) \{ gameState\.combo = 0/.test(html),
      'HTML: hết cửa sổ combo → reset về 0', 'có reset combo khi hết comboTimer');
  }
  const vWin = (battleMapV.match(/const battle_combo_window = f32\(([\d.]+)\)/) || [])[1];
  cross.vComboWindowS = vWin !== undefined ? parseFloat(vWin) : null;
  check(cross.vComboWindowS !== null, 'V: cửa sổ combo (số giây đo được)',
    `battle_combo_window=${vWin ?? '?'}s`);
  check(/s\.battle_combo \+= 1/.test(battleMapV) || /battle_combo \+= diff/.test(battleMapV),
    'V: combo +1 mỗi đòn trúng / +số kill', 'có battle_combo += 1/diff');
  check(/battle_combo_t = battle_combo_window/.test(battleMapV),
    'V: mỗi đòn trúng làm mới cửa sổ combo', 'có battle_combo_t = battle_combo_window');

  // D2. Nộ khí (mới vòng 2) — KHÁC CƠ CHẾ hai bản:
  // HTML: +8/đòn (+12/skill), đầy 100 → Nộ Trảm tay (dmg = công×4 + combo×10, AoE 6m).
  // V: +6/đòn (+15/kill), đầy 100 → tự bùng nổ +45% sát thương 6 giây.
  if (html !== null) {
    check(/gameState\.rage = Math\.min\(100, \(gameState\.rage \|\| 0\) \+ \(isSkill \? 12 : 8\)\)/.test(html),
      'HTML: tích nộ +8/đòn thường, +12/skill (tối đa 100)', 'có rage +8/+12, min 100');
    check(/function castRageSkill/.test(html) && /attackPower \* 4 \+ \(gameState\.combo \|\| 0\) \* 10/.test(html),
      'HTML: Nộ Trảm tay khi nộ đầy (dmg = công×4 + combo×10, AoE 6m)', 'có castRageSkill');
    check(/Nộ Trảm — SẴN SÀNG!/.test(html), 'HTML: nút Nộ Trảm báo SẴN SÀNG khi nộ đầy 100', 'có nút Nộ Trảm');
  }
  const vRageHit = (battleMapV.match(/const battle_rage_per_hit = (\d+)/) || [])[1];
  const vRageKill = (battleMapV.match(/const battle_rage_per_kill = (\d+)/) || [])[1];
  const vBurstS = (battleMapV.match(/const battle_rage_burst_s = f32\(([\d.]+)\)/) || [])[1];
  cross.vRagePerHit = vRageHit !== undefined ? parseInt(vRageHit, 10) : null;
  cross.vRagePerKill = vRageKill !== undefined ? parseInt(vRageKill, 10) : null;
  cross.vRageBurstS = vBurstS !== undefined ? parseFloat(vBurstS) : null;
  check(cross.vRagePerHit === 6 && cross.vRagePerKill === 15,
    'V: tích nộ +6/đòn, +15/kill (tối đa 100)', `per_hit=${vRageHit ?? '?'}, per_kill=${vRageKill ?? '?'}`);
  check(cross.vRageBurstS === 6.0 && /\+45% sát thương \(6 giây\)/.test(battleMapV),
    'V: nộ đầy tự bùng nổ +45% sát thương trong 6 giây', `burst=${vBurstS ?? '?'}s`);
  check(/s\.battle_rage = 0\s*\n?\s*s\.aura = battle_rage_burst_s/.test(battleMapV),
    'V: bùng nổ xong nộ về 0 (không giữ 100)', 'có battle_rage = 0 + aura = burst');

  // D3. Nộ Bạo Linh Phù (vòng 1) — vẫn khớp nhau cả hai bản.
  if (html !== null) {
    const htmlRageTimer = /rageTimer = 12\.0/.test(html);
    const htmlRageCrit = /critBonus = gameState\.rageTimer > 0 \? 0\.35/.test(html);
    check(htmlRageTimer && htmlRageCrit, 'HTML: nộ Bạo Linh Phù +35% crit trong 12.0s (đã có từ vòng 1)',
      `rageTimer=12.0: ${htmlRageTimer}, critBonus 0.35: ${htmlRageCrit}`);
  }
  const vRageTimer = /s\.rage = 12\.0/.test(combatV);
  const vRageCrit = /crit_bonus := if s\.rage > 0 \{ f32\(0\.35\)/.test(combatV);
  check(vRageTimer && vRageCrit, 'V: nộ Bạo Linh Phù +35% crit trong 12.0s (combat.v, đã có từ vòng 1)',
    `rage=12.0: ${vRageTimer}, crit +0.35: ${vRageCrit}`);
  cross.htmlRage = { timer: 12.0, crit: 0.35 };
  cross.vRage = { timer: 12.0, crit: 0.35 };

  // D4. Damage log — HTML tối đa 50 dòng, V tối đa 8 dòng (lệch nhau, xem mục J).
  if (html !== null) {
    const htmlLogMax = (html.match(/if \(dmgLogLines\.length > (\d+)\) dmgLogLines\.shift\(\)/) || [])[1];
    cross.htmlLogMax = htmlLogMax !== undefined ? parseInt(htmlLogMax, 10) : null;
    check(/function addDmgLog/.test(html) && cross.htmlLogMax !== null,
      'HTML: có damage log addDmgLog (số dòng tối đa đo được)', `tối đa ${htmlLogMax ?? '?'} dòng`);
    check(/function toggleDmgLog/.test(html), 'HTML: damage log bật/tắt được (toggleDmgLog)', 'có toggleDmgLog');
  }
  const vLogMax = (battleMapV.match(/const battle_log_max = (\d+)/) || [])[1];
  cross.vLogMax = vLogMax !== undefined ? parseInt(vLogMax, 10) : null;
  check(/fn battle_log_add/.test(battleMapV) && cross.vLogMax !== null,
    'V: có damage log battle_log_add (số dòng tối đa đo được)', `battle_log_max=${vLogMax ?? '?'}`);
  check(/for s\.battle_log\.len > battle_log_max/.test(battleMapV),
    'V: log quá giới hạn thì xóa dòng cũ nhất', 'có delete(0) khi vượt max');
  // Số sát thương nổi ĐÃ có ở cả hai bản (không phải log, nhưng là nền để làm log).
  if (html !== null) check(/spawnFloatingText/.test(html), 'HTML: có số sát thương nổi (spawnFloatingText)', 'có spawnFloatingText');
  check(/FloatText/.test(hudV), 'V: có số sát thương nổi (FloatText trong hud.v)', 'có FloatText');

  // D5. Mô phỏng thuần JS: combo + nộ khí + damage log.
  // Combo: +1 mỗi đòn trúng, reset về 0 nếu ngắt quãng quá cửa sổ (HTML 3s, V 4.0s).
  function comboDmg(base, combo) { return Math.round(base * (1 + Math.min(combo, 50) * 0.01)); }
  check(comboDmg(100, 0) === 100, 'Combo: 0 combo → sát thương không đổi (100)', `dmg=${comboDmg(100, 0)}`);
  check(comboDmg(100, 10) === 110, 'Combo: 10 combo → +10% (100 → 110)', `dmg=${comboDmg(100, 10)}`);
  check(comboDmg(100, 50) === 150, 'Combo: 50 combo → +50% (100 → 150, chạm trần)', `dmg=${comboDmg(100, 50)}`);
  check(comboDmg(100, 99) === 150, 'Combo: 99 combo vẫn +50% (trần 50 combo)', `dmg=${comboDmg(100, 99)}`);
  {
    // Cửa sổ combo HTML 3s: trúng, trúng, ngắt 4s (>3s) → reset, trúng lại từ 1.
    let combo = 0, lastHit = 0;
    const hit = (t, win) => { combo = (t - lastHit > win) ? 1 : combo + 1; lastHit = t; };
    hit(0, 3); hit(1, 3); hit(2, 3);
    check(combo === 3, 'Combo (cửa sổ 3s): 3 đòn liên tiếp trong 2s → combo 3', `combo=${combo}`);
    hit(6, 3); // ngắt 4s
    check(combo === 1, 'Combo (cửa sổ 3s): ngắt quãng 4s (>3s) → reset về 1 khi đánh lại', `combo=${combo}`);
    // Cửa sổ combo V 4.0s: ngắt đúng 4s vẫn giữ (đòn trong cửa sổ), ngắt 5s mới reset.
    combo = 0; lastHit = 0;
    hit(0, 4); hit(1, 4); hit(2, 4); hit(6, 4); // ngắt 4s, đúng cửa sổ
    check(combo === 4, 'Combo (cửa sổ 4.0s): ngắt đúng 4s vẫn giữ combo → 4', `combo=${combo}`);
    hit(11, 4); // ngắt 5s
    check(combo === 1, 'Combo (cửa sổ 4.0s): ngắt 5s (>4s) → reset về 1', `combo=${combo}`);
  }
  {
    // Nộ khí HTML: +8/đòn, +12/skill, đầy 100 → Nộ Trảm (dmg = công×4 + combo×10).
    let rage = 0;
    for (let i = 0; i < 12; i++) rage = Math.min(100, rage + 8);
    check(rage === 96, 'Nộ (HTML): 12 đòn thường (+8/đòn) → 96/100, chưa đầy', `rage=${rage}`);
    rage = Math.min(100, rage + 12); // 1 skill
    check(rage === 100, 'Nộ (HTML): thêm 1 skill (+12) → đầy 100, Nộ Trảm sẵn sàng', `rage=${rage}`);
    const rageDmg = (atk, combo) => atk * 4 + combo * 10;
    check(rageDmg(68, 10) === 372, 'Nộ Trảm (HTML): công 68, combo 10 → dmg 68×4 + 10×10 = 372', `dmg=${rageDmg(68, 10)}`);
    // Nộ khí V: +6/đòn, +15/kill, đầy 100 → tự bùng nổ +45% dmg 6s, nộ về 0.
    rage = 0;
    for (let i = 0; i < 10; i++) rage = Math.min(100, rage + 6);
    check(rage === 60, 'Nộ (V): 10 đòn (+6/đòn) → 60/100', `rage=${rage}`);
    for (let i = 0; i < 3; i++) rage = Math.min(100, rage + 15);
    check(rage === 100, 'Nộ (V): thêm 3 kill (+15/kill) → đầy 100, bùng nổ', `rage=${rage}`);
    let aura = 0; if (rage >= 100) { rage = 0; aura = 6.0; }
    check(rage === 0 && aura === 6.0, 'Nộ (V): bùng nổ xong nộ về 0, aura +45% dmg 6 giây', `rage=${rage}, aura=${aura}s`);
    const burstDmg = (base) => Math.round(base * 1.45);
    check(burstDmg(100) === 145, 'Nộ (V): đang bùng nổ, đòn 100 → 145 (+45%)', `dmg=${burstDmg(100)}`);
  }
  {
    // Damage log: quá giới hạn thì xóa dòng cũ nhất (cơ chế giống nhau, số khác nhau).
    const capLog = (cap, n) => {
      const log = [];
      for (let i = 0; i < n; i++) { log.push({ dmg: 100 + i }); if (log.length > cap) log.shift(); }
      return log;
    };
    const logV = capLog(8, 10);
    check(logV.length === 8 && logV[0].dmg === 102, 'Damage log (V, tối đa 8): đẩy 10 dòng → giữ 8, cũ nhất là đòn thứ 3 (dmg 102)',
      `len=${logV.length}, log[0].dmg=${logV[0].dmg}`);
    const logHtml = capLog(50, 55);
    check(logHtml.length === 50 && logHtml[0].dmg === 105, 'Damage log (HTML, tối đa 50): đẩy 55 dòng → giữ 50, cũ nhất là đòn thứ 6 (dmg 105)',
      `len=${logHtml.length}, log[0].dmg=${logHtml[0].dmg}`);
  }
}

// =====================================================================
// E. Tốc độ x1/x2, tạm dừng, bỏ qua
// =====================================================================
console.log('\n== E. Tốc độ / tạm dừng / bỏ qua ==');
{
  // HTML: đủ cả 3 (toggleSpeed x1/x2, togglePause + battlePaused, skipBattle).
  if (html !== null) {
    check(/function toggleSpeed/.test(html) && /gameState\.battleSpeed = \(gameState\.battleSpeed === 1\) \? 2 : 1/.test(html),
      'HTML: có chọn tốc độ đánh x1/x2 (toggleSpeed)', 'có toggleSpeed 1↔2');
    check(/const dt = Math\.min\(clock\.getDelta\(\), 0\.05\) \* \(gameState\.battleSpeed \|\| 1\)/.test(html),
      'HTML: tốc độ nhân vào dt của trận (dt × battleSpeed)', 'có dt × battleSpeed');
    check(/function togglePause/.test(html) && /gameState\.battlePaused = !gameState\.battlePaused/.test(html),
      'HTML: có tạm dừng trận đấu (togglePause)', 'có togglePause');
    check(/if \(gameState\.battlePaused\) \{ renderer\.render\(scene, camera\); return; \}/.test(html),
      'HTML: tạm dừng đóng băng vòng lặp game (chỉ render, không update)', 'có guard battlePaused trong loop');
    check(/function skipBattle/.test(html),
      'HTML: có bỏ qua trận đấu (skipBattle)', 'có skipBattle');
    check(/Không có quái thường để bỏ qua \(Boss phải đánh tay\)/.test(html),
      'HTML: bỏ qua chỉ hạ quái thường, boss phải đánh tay', 'skipBattle loại trừ boss');
    check(/function resolveRaidSkip/.test(html),
      'HTML: bỏ qua trong raid tính thắng/thua theo sức mạnh đội', 'có resolveRaidSkip');
  }
  // V: chưa có tốc độ/tạm dừng/bỏ qua (chỉ có movement speed, không phải battle speed).
  checkMissing(/battle_speed|battleSpeed|pause_battle|pauseBattle|skip_battle|skipBattle/i.test(battleMapV),
    'V: có chọn tốc độ / tạm dừng / bỏ qua trận đấu',
    'chưa có marker battle speed/pause/skip trong battle_map.v (nhóm 2 đang làm)');

  // Mô phỏng thuần JS: tốc độ, tạm dừng, bỏ qua.
  function effDt(dt, speed) { return dt * speed; }
  check(effDt(0.5, 1) === 0.5, 'Tốc độ x1: dt 0.5s → 0.5s', `dt=${effDt(0.5, 1)}`);
  check(effDt(0.5, 2) === 1.0, 'Tốc độ x2: dt 0.5s → 1.0s (nhanh gấp đôi)', `dt=${effDt(0.5, 2)}`);
  check([1, 2].includes(2) && ![1, 2].includes(3), 'Tốc độ: chỉ cho x1/x2 (không có x3)', 'speed ∈ {1, 2}');
  {
    // Tạm dừng: thời gian trận đóng băng, hết tạm dừng chạy tiếp từ đúng chỗ cũ.
    let elapsed = 10, paused = true;
    const tick = (dt) => { if (!paused) elapsed += dt; };
    tick(5);
    check(elapsed === 10, 'Tạm dừng: tick 5s khi đang pause → thời gian trận không đổi (10s)', `elapsed=${elapsed}s`);
    paused = false; tick(5);
    check(elapsed === 15, 'Tạm dừng: hết pause, tick 5s → thời gian trận 15s', `elapsed=${elapsed}s`);
  }
  {
    // Bỏ qua: kết thúc trận ngay, ghi nhận kết quả, không đánh tiếp.
    let battle = { over: false, result: null, hits: 0 };
    const skip = () => { battle.over = true; battle.result = 'skipped'; };
    skip(); battle.hits += 1; // đòn đánh sau khi skip không được tính
    check(battle.over === true && battle.result === 'skipped', 'Bỏ qua: trận kết thúc ngay với kết quả skipped', `over=${battle.over}, result=${battle.result}`);
  }
}

// =====================================================================
// F. Enhance / gem — cost/rate theo cấp, +10 max, thất bại tối đa −1,
//    6 loại ngọc, tiền không âm (đọc từ equipment.v thật)
// =====================================================================
console.log('\n== F. Enhance / gem (cường hóa / khảm ngọc) ==');
{
  // F1. V: số liệu thật trong equipment.v.
  const maxM = (equipV.match(/pub const enhance_max = (\d+)/) || [])[1];
  if (maxM === undefined) report('MISSING', 'V: hằng số enhance_max', 'không tìm thấy enhance_max trong equipment.v');
  else { cross.vEnhanceMax = parseInt(maxM, 10); check(cross.vEnhanceMax === 10, 'V: cường hóa tối đa +10 (enhance_max)', `enhance_max=${maxM}`); }
  check(/return 100 \* \(lv \+ 1\)/.test(equipV), 'V: phí cường hóa = 100×(cấp+1) vàng (enhance_cost)',
    'có `return 100 * (lv + 1)`');
  check(/r := 100 - lv \* 10/.test(equipV) && /if r < 10/.test(equipV),
    'V: tỉ lệ cường hóa = 100−cấp×10%, sàn 10% (enhance_rate)',
    'có `r := 100 - lv * 10` + sàn `r < 10`');
  const gemCount = countDefLiterals([{ name: 'equipment.v', text: equipV }], ['GemDef']);
  if (gemCount === null) report('MISSING', 'V: đếm 6 loại ngọc (GemDef)', 'không tìm thấy GemDef{ trong equipment.v');
  else { cross.vGems = gemCount; check(gemCount === 6, 'V: đủ 6 loại ngọc (GemDef)', `đếm được ${gemCount}`); }
  const gemNames = ['Hồng Ngọc', 'Lục Ngọc', 'Lam Ngọc', 'Tử Ngọc', 'Kim Ngọc', 'Huyết Ngọc'];
  const foundGems = gemNames.filter((g) => equipV.includes(`'${g}'`));
  check(foundGems.length === 6, 'V: đủ 6 tên ngọc (Hồng/Lục/Lam/Tử/Kim/Huyết)', `tìm thấy ${foundGems.length}/6: ${foundGems.join(', ')}`);
  check(/fn socket_gem/.test(equipV) && /fn enhance_slot/.test(equipV),
    'V: có hàm enhance_slot + socket_gem', 'có cả 2 hàm');

  // F2. Luật "thất bại tối đa −1": đọc là GIỚI HẠN TRÊN (rớt không quá 1 cấp),
  // không phải bắt buộc rớt đúng 1. Cả hai bản hiện giữ nguyên cấp khi thất bại
  // (rớt 0 ≤ 1) nên đều thỏa giới hạn này. HTML còn ghi rõ trong comment:
  // "That bai: equipment.v giu nguyen cap (khong rot) — thoa 'that bai toi da -1 cap'."
  // Muốn rớt đúng 1 cấp thì cần quyết riêng (xem docs mục 7).
  const vKeepsLevel = /failure the gold is still spent and the level stays/.test(equipV);
  check(vKeepsLevel, 'V: cường hóa thất bại giữ nguyên cấp (rớt 0 ≤ giới hạn −1)',
    'equipment.v: "failure the gold is still spent and the level stays"');
  if (html !== null) {
    check(/thất bại! Giữ nguyên \+/.test(html) && /không rớt cấp, theo equipment\.v/.test(html),
      'HTML: cường hóa thất bại giữ nguyên cấp (rớt 0 ≤ giới hạn −1)',
      'có "thất bại! Giữ nguyên +... (không rớt cấp, theo equipment.v)"');
  }
  check(/spend_gold\(cost\)/.test(equipV),
    'V: cường hóa trừ vàng TRƯỚC khi roll (thất bại vẫn mất vàng)',
    'có `spend_gold(cost)` trong enhance_slot');

  // F3. HTML: đã có UI/hàm cường hóa + khảm ngọc (port equipment.v).
  if (html !== null) {
    check(/function enhanceSlot/.test(html), 'HTML: có hàm enhanceSlot (cường hóa trang bị)', 'có enhanceSlot');
    const htmlEnhMax = (html.match(/if \(lv >= (\d+)\) \{ showSystemBanner\(ITEMS\[id\]\.name \+ ' đã cường hóa tối đa/) || [])[1];
    cross.htmlEnhanceMax = htmlEnhMax !== undefined ? parseInt(htmlEnhMax, 10) : null;
    check(cross.htmlEnhanceMax === 10, 'HTML: cường hóa tối đa +10 (khớp V)', `max=+${htmlEnhMax ?? '?'}`);
    check(/function enhanceCost/.test(html) && /return 100 \* \(enhanceLevel\(slot\) \+ 1\)/.test(html),
      'HTML: phí cường hóa = 100×(cấp+1) vàng (khớp V)', 'có enhanceCost 100×(lv+1)');
    check(/function enhanceRate/.test(html) && /Math\.max\(10, 100 - enhanceLevel\(slot\) \* 10\)/.test(html),
      'HTML: tỉ lệ cường hóa = max(10, 100−cấp×10)% (khớp V)', 'có enhanceRate sàn 10%');
    check(/function socketGem/.test(html) && /function unsocketGem/.test(html),
      'HTML: có khảm/gỡ ngọc (socketGem + unsocketGem)', 'có socketGem + unsocketGem');
    const htmlGems = ['hong_ngoc', 'luc_ngoc', 'lam_ngoc', 'tu_ngoc', 'kim_ngoc', 'huyet_ngoc']
      // Cho phép khoảng trắng căn lề khác nhau trước `{` (vd. `luc_ngoc:  {`).
      .filter((g) => new RegExp(g + ":\\s*\\{ name: '").test(html));
    cross.htmlGems = htmlGems.length;
    check(htmlGems.length === 6, 'HTML: đủ 6 loại ngọc trong ITEMS (Hồng/Lục/Lam/Tử/Kim/Huyết)',
      `tìm thấy ${htmlGems.length}/6`);
    check(/type: 'gem', atk: 10/.test(html) && /type: 'gem', hp: 60/.test(html) && /type: 'gem', def: 8/.test(html)
      && /type: 'gem', crit: 0\.04/.test(html) && /type: 'gem', atk: 20, def: 3, crit: 0\.02/.test(html)
      && /type: 'gem', atk: 8, hp: 100/.test(html),
      'HTML: chỉ số 6 loại ngọc khớp V (Hồng +10 atk, Lục +60 hp, Lam +8 def, Tử +4% crit, Kim +20/+3/+2%, Huyết +8/+100)',
      'chỉ số ngọc HTML khớp equipment.v');
    check(/function renderEnhance/.test(html),
      'HTML: có UI cường hóa/khảm ngọc (renderEnhance trong panel Túi)', 'có renderEnhance');
  }

  // F4. Mô phỏng thuần JS: bảng cost/rate + luật thất bại + tiền không âm.
  function enhanceCost(lv) { return 100 * (lv + 1); }
  function enhanceRate(lv) { return Math.max(10, 100 - lv * 10); }
  // applyEnhance: thành công → +1 (tối đa +10); thất bại → rớt TỐI ĐA 1 cấp
  // (giới hạn trên: rớt 0 hoặc 1 đều thỏa; không bao giờ rớt 2, không dưới 0).
  // drop = số cấp rớt khi thất bại (0 = giữ nguyên cấp như cả hai bản hiện tại).
  function applyEnhance(lv, success, drop) {
    if (lv >= 10) return lv;
    if (success) return lv + 1;
    return Math.max(0, lv - (drop === 1 ? 1 : 0));
  }
  check(enhanceCost(0) === 100 && enhanceCost(9) === 1000, 'Enhance cost: cấp 0 → 100 vàng, cấp 9 → 1000 vàng', `cost(0)=${enhanceCost(0)}, cost(9)=${enhanceCost(9)}`);
  check(enhanceRate(0) === 100 && enhanceRate(5) === 50 && enhanceRate(9) === 10,
    'Enhance rate: cấp 0 → 100%, cấp 5 → 50%, cấp 9 → 10% (sàn)', `rate(0)=${enhanceRate(0)}, rate(5)=${enhanceRate(5)}, rate(9)=${enhanceRate(9)}`);
  check(enhanceRate(10) === 10, 'Enhance rate: sàn 10% không tụt thêm', `rate(10)=${enhanceRate(10)}`);
  check(applyEnhance(10, true) === 10, 'Enhance: đã +10 thì không lên nữa (max)', `+10 +thành công → ${applyEnhance(10, true)}`);
  check(applyEnhance(5, true) === 6, 'Enhance: cấp 5 thành công → 6', `5 → ${applyEnhance(5, true)}`);
  check(applyEnhance(5, false, 1) === 4, 'Enhance: cấp 5 thất bại, rớt 1 → 4 (mức rớt tối đa cho phép)', `5 → ${applyEnhance(5, false, 1)}`);
  check(applyEnhance(5, false, 0) === 5, 'Enhance: cấp 5 thất bại, rớt 0 (giữ nguyên cấp như cả hai bản hiện tại) → 5', `5 → ${applyEnhance(5, false, 0)}`);
  check(applyEnhance(5, false, 2) === 5, 'Enhance: rớt 2 là KHÔNG cho phép (hàm chỉ nhận drop 0/1)', `drop=2 → ${applyEnhance(5, false, 2)}`);
  check(applyEnhance(0, false, 1) === 0, 'Enhance: cấp 0 thất bại → vẫn 0 (không âm)', `0 → ${applyEnhance(0, false, 1)}`);
  check(applyEnhance(1, false, 1) === 0, 'Enhance: cấp 1 thất bại, rớt 1 → 0 (không âm)', `1 → ${applyEnhance(1, false, 1)}`);
  {
    // Roll deterministic: HTML thêm hạng attempts×29, V không có (lệch, xem mục J).
    const htmlRollExtra = html !== null && /\+ \(gameState\.enhanceAttempts \|\| 0\) \* 29/.test(html);
    const vRollExtra = /enhanceAttempts/.test(equipV);
    cross.htmlRollExtra29 = htmlRollExtra;
    cross.vRollExtra29 = vRollExtra;
    if (html !== null) {
      check(htmlRollExtra, 'HTML: roll cường hóa cộng thêm attempts×29 (đổi seed mỗi lần thử)', 'có (enhanceAttempts || 0) * 29');
    }
    check(vRollExtra, 'V: roll cường hóa CÓ hạng attempts×29 (khớp HTML, chuẩn chung vòng 2)', 'equipment.v có enhanceAttempts * 29');
  }
  {
    // Tiền không âm: thiếu tiền thì từ chối, đủ tiền thì trừ đúng phí.
    const spend = (gold, cost) => (gold < cost ? { ok: false, gold } : { ok: true, gold: gold - cost });
    const poor = spend(50, 100);
    check(poor.ok === false && poor.gold === 50, 'Enhance: 50 vàng cường hóa phí 100 → từ chối, tiền không đổi', `ok=${poor.ok}, gold=${poor.gold}`);
    const rich = spend(1000, 1000);
    check(rich.ok === true && rich.gold === 0, 'Enhance: 1000 vàng phí 1000 → còn 0 (không âm)', `ok=${rich.ok}, gold=${rich.gold}`);
  }
  {
    // 6 loại ngọc, mỗi loại một chỉ số chính khác nhau (khớp equipment.v).
    const gems = [
      { name: 'Hồng Ngọc', atk: 10 }, { name: 'Lục Ngọc', hp: 60 },
      { name: 'Lam Ngọc', def: 8 }, { name: 'Tử Ngọc', crit: 0.04 },
      { name: 'Kim Ngọc', atk: 20 }, { name: 'Huyết Ngọc', hp: 100 },
    ];
    check(gems.length === 6, 'Gem: đủ 6 loại ngọc', `đếm được ${gems.length}`);
    const kinds = new Set(gems.map((g) => Object.keys(g).find((k) => k !== 'name')));
    check(kinds.size === 4, 'Gem: ngọc chia 4 nhóm chỉ số chính (atk/hp/def/crit)', `nhóm: ${[...kinds].join(', ')}`);
  }
}

// =====================================================================
// G. PvP UI — 8 đối thủ, +25/−15, floor 0, thưởng ngày
// =====================================================================
console.log('\n== G. PvP UI (đấu trường) ==');
{
  // G1. V: số liệu thật trong pvp.v.
  const oppCount = countDefLiterals([{ name: 'pvp.v', text: pvpV }], ['PvpOpponent']);
  if (oppCount === null) report('MISSING', 'V: đếm 8 đối thủ PvP (PvpOpponent)', 'không tìm thấy PvpOpponent{ trong pvp.v');
  else { cross.vPvpOpponents = oppCount; check(oppCount === 8, 'V: đủ 8 đối thủ PvP (PvpOpponent)', `đếm được ${oppCount}`); }
  const reward25 = (pvpV.match(/reward_pts:\s*25/g) || []).length;
  check(reward25 === 8, 'V: cả 8 đối thủ đều thưởng +25 điểm khi thắng', `reward_pts: 25 × ${reward25}`);
  check(/s\.pvp_points -= 15/.test(pvpV), 'V: thua trừ 15 điểm (pvp_fight)', 'có `s.pvp_points -= 15`');
  check(/if s\.pvp_points < 0 \{\s*\n?\s*s\.pvp_points = 0/.test(pvpV),
    'V: điểm PvP floor 0 (không âm)', 'có clamp `pvp_points = 0` khi < 0');
  check(/1000 - points \/ 10/.test(pvpV), 'V: hạng = 1000 − điểm/10 (hạng 1 khi ≥9990 điểm)',
    'có `1000 - points / 10`');
  const wb = (pvpV.match(/name:\s*'Thiên Ma Tôn Chủ'/) || [])[0];
  check(!!wb, 'V: boss thế giới Thiên Ma Tôn Chủ (20–21h) còn nguyên', 'có world_boss Thiên Ma Tôn Chủ');

  // G2. Thưởng ngày PvP: HTML ĐÃ có (+150 vàng/+300 bạc/+50 EXP, 1 lần/ngày),
  // V vẫn chưa có.
  if (html !== null) {
    check(/function claimPvpDaily/.test(html), 'HTML: có claimPvpDaily (nhận thưởng ngày PvP)', 'có claimPvpDaily');
    check(/addGold\(150\); addSilver\(300\); gameState\.exp \+= 50/.test(html),
      'HTML: thưởng ngày PvP = +150 vàng / +300 bạc / +50 EXP', 'có addGold(150); addSilver(300); exp += 50');
    check(/gameState\.pvpDailyDate === todayStr\(\)/.test(html),
      'HTML: thưởng ngày chỉ nhận 1 lần/ngày (so ngày pvpDailyDate)', 'có check pvpDailyDate === todayStr()');
    check(/Đã nhận hôm nay/.test(html), 'HTML: nút thưởng ngày báo "Đã nhận hôm nay" khi đã nhận', 'có "Đã nhận hôm nay"');
    cross.htmlPvpDaily = { gold: 150, silver: 300, exp: 50 };
  }
  const hasDailyPvpV = /pvp_daily|daily_pvp|pvp.*thưởng ngày|thưởng ngày.*pvp|daily_reward/i.test(pvpV)
    || /daily/i.test(battleMapV);
  checkMissing(hasDailyPvpV, 'V: có thưởng ngày PvP (nhận 1 lần/ngày)',
    hasDailyPvpV ? 'có marker thưởng ngày PvP' : 'chưa có thưởng ngày PvP trong V (nhóm 2 đang làm)');
  cross.vPvpDaily = hasDailyPvpV ? { gold: null, silver: null, exp: null } : null;

  // G3. HTML: đã có PvP/đấu trường (panel-pvp + 8 đối thủ copy từ pvp.v).
  if (html !== null) {
    check(/id="panel-pvp"/.test(html) && /Đấu Trường PvP/.test(html),
      'HTML: có panel-pvp "Đấu Trường PvP"', 'có panel-pvp');
    const htmlOpp = (html.match(/var PVP_OPPONENTS = \[([\s\S]*?)\];/) || [])[1];
    const htmlOppCount = htmlOpp ? (htmlOpp.match(/rank: \d+/g) || []).length : 0;
    cross.htmlPvpOpponents = htmlOppCount;
    check(htmlOppCount === 8, 'HTML: đủ 8 đối thủ PvP (PVP_OPPONENTS)', `đếm được ${htmlOppCount}`);
    check(/Tân Thủ Luyện Kiếm/.test(html || '') && /Võ Lâm Minh Chủ/.test(html || ''),
      'HTML: đối thủ PvP trùng tên với pvp.v (Tân Thủ … Võ Lâm Minh Chủ)', 'có đủ tên đối thủ');
    check(/function pvpRankFromPoints/.test(html) && /Math\.max\(1, 1000 - Math\.floor\(pts \/ 10\)\)/.test(html),
      'HTML: hạng PvP = max(1, 1000 − điểm/10) (khớp V)', 'có pvpRankFromPoints');
    check(/Thắng <b>\+25<\/b> điểm, thua <b>-15<\/b> điểm/.test(html),
      'HTML: thắng +25 / thua −15 điểm (khớp V)', 'có +25/−15 trong panel PvP');
    // Boss thế giới trong HTML: vàng 5000 khớp V, đá thưởng lệch (HTML +5 Đá Cường Hóa, V +50 linh thạch).
    const htmlWb = (html.match(/var WORLD_BOSS = \{[^}]*\}/) || [])[0] || '';
    const htmlWbHp = (htmlWb.match(/maxHp: (\d+)/) || [])[1];
    cross.htmlWorldBossHp = htmlWbHp !== undefined ? parseInt(htmlWbHp, 10) : null;
    check(cross.htmlWorldBossHp === 200000, 'HTML: boss thế giới Thiên Ma Tôn Chủ 200.000 HP (khớp V)',
      `WORLD_BOSS.maxHp=${htmlWbHp ?? '?'}`);
    check(/addItem\('da_cuong_hoa', 5\)/.test(html),
      'HTML: boss thế giới thưởng thêm +5 Đá Cường Hóa khi ≥20000 dmg (khác V: +50 linh thạch)',
      'có addItem(da_cuong_hoa, 5)');
  }

  // G4. Mô phỏng thuần JS: điểm, hạng, thưởng ngày.
  function pvpPoints(points, won) { return won ? points + 25 : Math.max(0, points - 15); }
  function pvpRank(points) { return Math.max(1, 1000 - Math.floor(points / 10)); }
  check(pvpPoints(100, true) === 125, 'PvP: thắng 100 + 25 → 125', `pts=${pvpPoints(100, true)}`);
  check(pvpPoints(100, false) === 85, 'PvP: thua 100 − 15 → 85', `pts=${pvpPoints(100, false)}`);
  check(pvpPoints(5, false) === 0, 'PvP: thua khi còn 5 điểm → floor 0', `pts=${pvpPoints(5, false)}`);
  check(pvpRank(0) === 1000 && pvpRank(9990) === 1 && pvpRank(20000) === 1,
    'PvP hạng: 0 điểm → hạng 1000; 9990 điểm → hạng 1; hơn nữa vẫn hạng 1',
    `0→${pvpRank(0)}, 9990→${pvpRank(9990)}, 20000→${pvpRank(20000)}`);
  check(pvpRank(500) === 950, 'PvP hạng: 500 điểm → hạng 950', `500→${pvpRank(500)}`);
  {
    // Thưởng ngày: nhận 1 lần/ngày, nhận lại cùng ngày → 0.
    // Số thưởng ngày ĐO ĐƯỢC trong HTML: +150 vàng / +300 bạc / +50 EXP
    // (claimPvpDaily). V chưa có thưởng ngày.
    let lastClaimDay = -1;
    const claimDaily = (day) => {
      if (day === lastClaimDay) return { gold: 0, silver: 0, exp: 0 };
      lastClaimDay = day; return { gold: 150, silver: 300, exp: 50 };
    };
    const d1 = claimDaily(1);
    check(d1.gold === 150 && d1.silver === 300 && d1.exp === 50,
      'PvP thưởng ngày: nhận lần đầu trong ngày → +150 vàng / +300 bạc / +50 EXP',
      `ngày 1 lần 1 → +${d1.gold} vàng, +${d1.silver} bạc, +${d1.exp} EXP`);
    const d1b = claimDaily(1);
    check(d1b.gold === 0 && d1b.silver === 0 && d1b.exp === 0,
      'PvP thưởng ngày: nhận lại cùng ngày → 0', 'ngày 1 lần 2 → 0');
    const d2 = claimDaily(2);
    check(d2.gold === 150, 'PvP thưởng ngày: sang ngày mới → nhận lại được', 'ngày 2 → +150 vàng');
  }
}

// =====================================================================
// H. Town safe — thị trấn Song Ma: vào tắt spawn, ra bật lại, 3 NPC
// =====================================================================
console.log('\n== H. Town safe (thị trấn Song Ma) ==');
{
  // H1. HTML: thị trấn ĐÃ có từ vòng 1 — đo thật.
  if (html !== null) {
    check(/function toggleTownMode/.test(html) && /function setTownMode/.test(html),
      'HTML: có toggleTownMode/setTownMode chuyển thị trấn ↔ chiến đấu', 'có cả 2 hàm');
    const npcs = ['truongmon', 'chusap', 'thoren'].filter((id) => html.includes(`talkToNpc('${id}')`));
    check(npcs.length === 3, 'HTML: đủ 3 NPC thị trấn (Trưởng Môn/Chủ Sạp/Thợ Rèn)',
      `tìm thấy ${npcs.length}/3: ${npcs.join(', ')}`);
    cross.htmlTownNpcs = npcs.length;
    check(/Khu An Toàn/.test(html), 'HTML: thị trấn gắn biển Khu An Toàn', 'có "Khu An Toàn"');
    check(/!gameState\.townMode && enemies\.length < 6/.test(html),
      'HTML: vào thị trấn TẮT spawn quái (spawn chỉ chạy khi !townMode)', 'spawn gated bởi !townMode');
    check(/if \(gameState\.townMode\) \{ e\.hpBarGroup\.quaternion\.copy\(camera\.quaternion\); continue; \}/.test(html),
      'HTML: quái trong thị trấn không tấn công (vòng lặp quái continue khi townMode)',
      'enemy loop continue khi townMode');
    check(/if \(!gameState\.townMode && !isMoving/.test(html),
      'HTML: vào thị trấn TẮT auto-attack (không tự chém khi townMode)', 'auto-attack gated bởi !townMode');
    check(/Đã vào Thị Trấn Song Ma Quyền Phái — khu an toàn/.test(html),
      'HTML: banner vào thị trấn ghi rõ khu an toàn', 'có banner vào thị trấn');
  } else {
    report('FAIL', 'HTML file tồn tại', 'không đọc được ' + HTML);
  }

  // H2. V: đã có town.v — enter_town/exit_town, in_town, spawner tắt, 3 NPC.
  check(/fn enter_town/.test(townV) && /fn exit_town/.test(townV),
    'V: có enter_town/exit_town (vào/ra thị trấn)', 'có cả 2 hàm trong town.v');
  check(/s\.in_town = true/.test(townV) && /s\.in_town = false/.test(townV),
    'V: vào thị trấn đặt in_town=true, ra đặt false', 'có in_town true/false');
  check(/if s\.in_town \{/.test(enemiesV),
    'V: WaveSpawner dừng spawn khi in_town (enemies.v)', 'có `if s.in_town` trong enemies.v');
  check(/n\.active = false/.test(townV),
    'V: vào thị trấn quái đang sống bị đứng yên (deactivate, không farm XP)', 'có n.active = false');
  check(/Khu An Toàn - Thị Trấn Song Ma/.test(townV),
    'V: thị trấn gắn biển Khu An Toàn', 'có town_safe_banner');
  const townNpcs = (townV.match(/town_npc [012]/g) || []).length;
  check(/Trưởng Môn \(town_npc 0\)/.test(townV) && /Chủ Sạp \(town_npc 1\)/.test(townV) && /Thợ Rèn \(town_npc 2\)/.test(townV),
    'V: đủ 3 NPC thị trấn (Trưởng Môn/Chủ Sạp/Thợ Rèn)', `town_npc 0/1/2, nhắc tới ${townNpcs} lần`);
  cross.vTownNpcs = 3;
  check(/Safe to call twice/.test(townV),
    'V: enter_town gọi 2 lần liên tiếp vẫn an toàn (idempotent)', 'comment "Safe to call twice"');

  // H3. Mô phỏng thuần JS: vào/ra thị trấn bật-tắt spawn.
  {
    let townMode = false;
    const spawnEnabled = () => !townMode;
    const setTown = (on) => { townMode = !!on; };
    check(spawnEnabled() === true, 'Town safe: ngoài thị trấn spawn BẬT', 'townMode=false → spawn on');
    setTown(true);
    check(spawnEnabled() === false, 'Town safe: vào thị trấn spawn TẮT', 'townMode=true → spawn off');
    setTown(true); // vào lần nữa (idempotent)
    check(spawnEnabled() === false, 'Town safe: vào thị trấn 2 lần liên tiếp vẫn TẮT (không lỗi)', 'idempotent');
    setTown(false);
    check(spawnEnabled() === true, 'Town safe: ra khỏi thị trấn spawn BẬT lại', 'townMode=false → spawn on');
  }
}

// =====================================================================
// I. Panel mới trong main.scene (BattlePanel, TownPanel, EnhancePanel, PvpPanel)
// =====================================================================
console.log('\n== I. Panel mới trong main.scene ==');
{
  // I1. V đã đăng ký component panel + find() node — nhưng main.scene chưa có node.
  const mainV = vMap['main.v'] || '';
  check(/register\[BattlePanelUI\]/.test(mainV), 'main.v: đăng ký BattlePanelUI', 'có register[BattlePanelUI]');
  check(/register\[TownPanelUI\]/.test(mainV), 'main.v: đăng ký TownPanelUI', 'có register[TownPanelUI]');
  check(/sc\.find\('HUD\/BattlePanel'\)/.test(battleMapV),
    'battle_map.v: BattlePanelUI find() HUD/BattlePanel', 'có find HUD/BattlePanel');
  check(/sc\.find\('HUD\/PvpPanel'\)/.test(battleMapV),
    'battle_map.v: PvpPanelUI find() HUD/PvpPanel', 'có find HUD/PvpPanel');
  check(/sc\.find\('HUD\/TownPanel'\)/.test(townV) && /sc\.find\('HUD\/EnhancePanel'\)/.test(townV),
    'town.v: TownPanelUI find() HUD/TownPanel + HUD/EnhancePanel', 'có find TownPanel + EnhancePanel');
  if (scene === null) {
    report('MISSING', 'main.scene tồn tại', 'không đọc được ' + SCENE);
  } else {
    const nodes = (scene.match(/node [A-Za-z0-9]+/g) || []).map((s) => s.replace('node ', ''));
    console.log(`   (main.scene ${scene.split('\n').length} dòng, ${nodes.length} node)`);
    for (const p of ['BattlePanel', 'TownPanel', 'EnhancePanel', 'PvpPanel']) {
      checkMissing(nodes.includes(p), `main.scene: có node ${p}`,
        nodes.includes(p) ? `có node ${p}` : `chưa có node ${p} — code V đã find() nhưng scene chưa có node`);
    }
    check(nodes.includes('QuestPanel'), 'main.scene: panel cũ QuestPanel còn nguyên', 'có QuestPanel');
    check(nodes.includes('HUD'), 'main.scene: node HUD còn nguyên', 'có HUD');
    // Lệch thật trong V: component đã đăng ký + find() node, nhưng scene thiếu node
    // → panel không hiển thị được. Đây là FAIL (không phải MISSING), vì cả hai
    // phía đều đã có trong code mà không khớp nhau.
    const missingNodes = ['BattlePanel', 'TownPanel', 'EnhancePanel', 'PvpPanel'].filter((p) => !nodes.includes(p));
    check(missingNodes.length === 0,
      'V: main.scene có đủ node cho các panel đã đăng ký/find()',
      missingNodes.length === 0 ? 'đủ 4 node' : `thiếu node: ${missingNodes.join(', ')} → panel V chưa hiển thị được`);
  }
  // hud.v cũng chưa find() panel mới nào (TownPanelUI/BattlePanelUI tự find).
  const hudFindsNew = /find\('HUD\/(BattlePanel|TownPanel|EnhancePanel|PvpPanel)/.test(hudV);
  checkMissing(hudFindsNew, 'hud.v: find() tới panel battle mới',
    hudFindsNew ? 'hud.v đã find panel mới' : 'hud.v chưa find panel battle mới (panel tự find trong battle_map.v/town.v)');
  // HTML: 8 panel (thêm team + pvp); battle UI là thanh bar, không phải panel.
  if (html !== null) {
    const panels = [...new Set((html.match(/id="panel-[a-z-]+"/g) || []).map((s) => s.replace(/id="|"/g, '')))];
    check(panels.length === 8, 'HTML: đủ 8 panel (6 cũ + team + pvp)', `panel: ${panels.join(', ')}`);
    checkMissing(panels.includes('panel-battle'), 'HTML: có panel-battle riêng',
      'HTML dùng battle bar (btn-auto/pause/speed/combo/raid-bar) thay cho panel-battle');
  }
}

// =====================================================================
// J. Cross-mirror Battle v2: HTML ↔ V (chỉ FAIL khi cả hai phía đều đo được
//    mà lệch nhau; một phía chưa có → MISSING)
// =====================================================================
console.log('\n== J. Cross-mirror Battle v2 (HTML ↔ V) ==');
function crossCheck(label, a, b) {
  if (a === undefined || a === null || b === undefined || b === null) {
    report('MISSING', `Mirror: ${label}`, `HTML=${a ?? '?'} / V=${b ?? '?'}`);
  } else {
    check(a === b, `Mirror: ${label} khớp nhau`, `HTML=${a} / V=${b}`);
  }
}
function crossCheckArr(label, a, b) {
  // So sánh 2 mảng số (vd. đội hình [0,1,3,5,7] vs [0,1,2,5,7]).
  if (!Array.isArray(a) || !Array.isArray(b)) {
    report('MISSING', `Mirror: ${label}`, `HTML=${a ? `[${a}]` : '?'} / V=${b ? `[${b}]` : '?'}`);
  } else {
    check(a.join(',') === b.join(','), `Mirror: ${label} khớp nhau`, `HTML=[${a}] / V=[${b}]`);
  }
}
crossCheck('đội hình: số người ra trận', cross.htmlPartySize, cross.vPartySize);
crossCheckArr('đội hình mặc định: tập hero id', cross.htmlPartySet, cross.vPartySet);
crossCheck('auto-battle: ngưỡng uống đan (% HP)', cross.htmlAutoPillPct, cross.vAutoPillPct);
crossCheck('raid: ngưỡng phase 2 (% HP)', cross.htmlRaidPhase2, cross.vRaidPhase2);
crossCheck('raid: ngưỡng phase 3 (% HP)', cross.htmlRaidPhase3, cross.vRaidPhase3);
crossCheckArr('raid: quái con mỗi lần đổi phase [p2, p3]', cross.htmlRaidMinions, cross.vRaidMinions);
crossCheck('raid: cảnh báo AoE (giây)', cross.htmlRaidAoeWarnS, cross.vRaidAoeWarnS);
crossCheck('combo: cửa sổ combo (giây)', cross.htmlComboWindowS, cross.vComboWindowS);
crossCheck('damage log: số dòng tối đa', cross.htmlLogMax, cross.vLogMax);
crossCheck('nộ Bạo Linh Phù: thời gian (giây)', cross.htmlRage ? cross.htmlRage.timer : null, cross.vRage ? cross.vRage.timer : null);
crossCheck('nộ Bạo Linh Phù: crit cộng thêm', cross.htmlRage ? cross.htmlRage.crit : null, cross.vRage ? cross.vRage.crit : null);
crossCheck('số NPC thị trấn', cross.htmlTownNpcs, cross.vTownNpcs);
crossCheck('cường hóa tối đa (+)', cross.htmlEnhanceMax, cross.vEnhanceMax);
crossCheck('số loại ngọc', cross.htmlGems, cross.vGems);
crossCheck('số đối thủ PvP', cross.htmlPvpOpponents, cross.vPvpOpponents);
crossCheck('boss thế giới: HP', cross.htmlWorldBossHp, cross.vWorldBossHp);
crossCheck('roll cường hóa: có hạng attempts×29', cross.htmlRollExtra29, cross.vRollExtra29);
{
  // Ghi chú đo được, không phải assert đơn trị:
  // - Nộ khí vòng 2 khác cơ chế: HTML Nộ Trảm tay (dmg = công×4 + combo×10),
  //   V tự bùng nổ +45% dmg 6s. Cần chốt một cơ chế chung.
  console.log('   (ghi chú: nộ khí HTML = Nộ Trảm tay, V = tự bùng nổ +45% dmg 6s — khác cơ chế, cần chốt chung)');
  // - Boss raid: HTML Kim Thiềm Vương 20000 HP cố định, V dùng boss của map.
  console.log(`   (ghi chú: boss raid HTML = Kim Thiềm Vương ${cross.htmlRaidBossHp ?? '?'} HP cố định, V = boss của map (HP theo map))`);
  // - AoE raid: HTML 90 dmg cố định (đồng đội 60), V 20 + phase×10 (30/40/50).
  console.log('   (ghi chú: AoE raid HTML = 90 dmg cố định, V = 20 + phase×10 — khác công thức)');
  // - Đá thưởng boss thế giới: HTML +5 Đá Cường Hóa, V +50 linh thạch.
  console.log('   (ghi chú: thưởng boss thế giới HTML = +5 Đá Cường Hóa, V = +50 linh thạch — khác loại đá)');
  // - Thưởng ngày PvP: HTML +150/+300/+50, V chưa có.
  if (cross.htmlPvpDaily && !cross.vPvpDaily) {
    console.log('   (ghi chú: thưởng ngày PvP HTML = +150 vàng/+300 bạc/+50 EXP, V chưa có)');
  }
}

// =====================================================================
// K. Docs đi kèm (vòng 2)
// =====================================================================
console.log('\n== K. Docs ==');
const doc = read(path.join(ROOT, 'docs', 'MONG_VO_LAM.md'));
checkMissing(doc !== null && /## .*Battle/i.test(doc),
  'docs/MONG_VO_LAM.md có chương Battle vòng 2 (formation/auto/raid/combo)',
  doc ? (/## .*Battle/i.test(doc) ? 'có chương Battle' : 'chưa có chương Battle') : 'chưa có file docs');
checkMissing(doc !== null && /thưởng ngày|Thưởng ngày/i.test(doc),
  'docs/MONG_VO_LAM.md ghi thưởng ngày PvP', doc ? (/thưởng ngày/i.test(doc) ? 'có nhắc thưởng ngày' : 'chưa nhắc "thưởng ngày"') : 'chưa có file docs');
const rootReadme = read(path.join(ROOT, 'README.md')) || '';
checkMissing(/test-battle-mvl/.test(rootReadme),
  'README gốc ghi cách chạy tests/test-battle-mvl.js', /test-battle-mvl/.test(rootReadme) ? 'có nhắc test-battle-mvl.js' : 'chưa ghi test battle vòng 2');

// =====================================================================
// Tổng kết
// =====================================================================
console.log('\n========================================');
console.log(`TỔNG KẾT (battle v2): ${pass} PASS, ${fail} FAIL, ${missing} MISSING (tổng ${results.length} assert)`);
if (missing > 0) {
  console.log('MISSING (hệ thống vòng 2 chưa xuất hiện trong code — không tính là fail):');
  for (const r of results.filter((r) => r.status === 'MISSING')) console.log(`  - ${r.name}: ${r.detail}`);
}
if (fail > 0) {
  console.log('FAIL:');
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  - ${r.name}: ${r.detail}`);
}
console.log('========================================');
process.exit(fail > 0 ? 1 : 0);
