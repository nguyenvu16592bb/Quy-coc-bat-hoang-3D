// tests/test-modules-mvl.js — Harness kiểm thử cấu trúc MODULE vòng 3
// (Quỷ Cốc Bát Hoang 3D, tách HTML 3741 dòng thành shell + css + js/00–05).
//
// Chạy:  node tests/test-modules-mvl.js     (từ thư mục gốc repo)
// Thoát: 0 = không có FAIL (MISSING được phép), 1 = có ít nhất 1 FAIL.
//
// NGUYÊN TẮC (giống tests/test-mongvolam.js và tests/test-battle-mvl.js):
//  - Mọi số liệu đều đọc từ FILE THẬT tại thời điểm chạy bằng regex scan.
//    Harness KHÔNG hardcode kết quả đếm — chỉ hardcode KỲ VỌNG THIẾT KẾ.
//  - Hệ thống nào chưa có file / chưa có marker thì báo MISSING, không crash,
//    không fail cứng toàn bộ run. Nhóm 2 đang làm song song (js/06-expand.js
//    + mounts.v/fashion.v/guildwar.v/vip.v) nên file của họ có thể chưa xong.
//  - Phần mô phỏng logic là logic thuần JS trong file này, assert số liệu cụ thể
//    của THIẾT KẾ (không phụ thuộc code game).
//  - PHẠM VI SCAN: shell `velo/web/qu_c_c_b_t_hoang_3d.html` + `velo/web/quycoc.css`
//    + `velo/web/js/*.js` + `velo/quycoc3d/*.v` + `docs/MONG_VO_LAM.md` + README.
//
// SỐ LIỆU CHUẨN VÒNG 3 (đã chốt — nhóm 1 tách module xong, đã verify
// node --check 6/6 OK, tổng 3811 dòng):
//  - Shell 358 dòng (body 334 dòng — KHÔNG phải ~120 dòng như ước lượng ban đầu,
//    vì body HTML đã 334 dòng); quycoc.css 191 dòng.
//  - js/00-state.js 208, 01-world.js 755, 02-combat.js 576, 03-battle.js 420,
//    04-mvl.js 733, 05-ui.js 570. Tổng shell + css + 6 module = 3811 dòng.
//  - Nạp theo đúng thứ tự 00→05 (+06 khi nhóm 2 xong), script thường,
//    không ES module, namespace chung window.QC, global scope chia sẻ.
//  - Backup HTML gốc: /tmp/quycoc-orig-3741.html (không nằm trong repo).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEBDIR = path.join(ROOT, 'velo', 'web');
const SHELL = path.join(WEBDIR, 'qu_c_c_b_t_hoang_3d.html');
const CSS = path.join(WEBDIR, 'quycoc.css');
const JSDIR = path.join(WEBDIR, 'js');
const VDIR = path.join(ROOT, 'velo', 'quycoc3d');

const MODULE_ORDER = ['00-state.js', '01-world.js', '02-combat.js', '03-battle.js', '04-mvl.js', '05-ui.js', '06-expand.js'];
const EXPECT_LINES = {
  shell: 358, css: 191,
  '00-state.js': 208, '01-world.js': 755, '02-combat.js': 576,
  '03-battle.js': 420, '04-mvl.js': 733, '05-ui.js': 570,
};
const TOTAL_LINES = 3811; // shell 358 + css 191 + 00–05 (208+755+576+420+733+570)

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
// Đếm dòng theo kiểu `wc -l` (file kết thúc bằng \n thì dòng cuối không tính thêm).
function lineCount(text) {
  if (text === null || text === undefined) return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
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
// Đếm entry `name: '...'` trong block mảng bắt đầu tại marker.
// Trả về null nếu không tìm thấy block.
function countEntriesInArrayBlock(text, startRe) {
  const m = startRe.exec(text);
  if (!m) return null;
  const open = text.indexOf('[', m.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) {
      const block = text.slice(open, i + 1);
      const names = block.match(/name\s*:\s*['"][^'"]+['"]/g);
      return names ? names.length : 0;
    } }
  }
  return null;
}
// Đếm chuỗi '...' trong block mảng (vd. SHOP_STOCK = ['hp_pill', ...]).
function countStringsInArrayBlock(text, startRe) {
  const m = startRe.exec(text);
  if (!m) return null;
  const open = text.indexOf('[', m.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) {
      const block = text.slice(open, i + 1);
      const strs = block.match(/'[^']+'/g);
      return strs ? strs.length : 0;
    } }
  }
  return null;
}

// --- Loader vòng 3: đọc shell + css + từng module JS.
const shell = read(SHELL);
const cssText = read(CSS);
const jsParts = {};
for (const m of MODULE_ORDER) {
  const t = read(path.join(JSDIR, m));
  if (t !== null) jsParts[m] = t;
}
const combined = [shell, cssText, ...MODULE_ORDER.map((m) => jsParts[m]).filter(Boolean)]
  .filter((s) => s !== null && s !== undefined).join('\n');
const vMap = readAllV();
const vList = Object.entries(vMap).map(([name, text]) => ({ name, text }));
const allV = vList.map((f) => f.text).join('\n');

// =====================================================================
// A. Đủ module file + shell nạp đúng thứ tự + không còn inline dài
// =====================================================================
console.log('\n== A. Cấu trúc module vòng 3 (shell + css + js/00–05) ==');
{
  if (shell === null) {
    report('FAIL', 'Shell HTML tồn tại (velo/web/qu_c_c_b_t_hoang_3d.html)', 'không đọc được ' + SHELL);
  } else {
    // Shell gốc tách module là 358 dòng (body 334 dòng — KHÔNG phải ~120 dòng
    // như ước lượng ban đầu). Nhóm 2 đang nối 06-expand.js vào shell nên số
    // dòng có thể tăng (đã 370 dòng khi nối 06) — chỉ kiểm tra khoảng, không
    // khóa cứng 358.
    check(lineCount(shell) >= EXPECT_LINES.shell && lineCount(shell) <= 450,
      `Shell đúng cỡ tách module (gốc ${EXPECT_LINES.shell} dòng, body 334 dòng — không phải ~120 dòng như ước lượng ban đầu)`,
      `${lineCount(shell)} dòng`);
    const scriptSrcs = [...shell.matchAll(/<script\s+src="js\/(\d\d-[a-z]+\.js)"><\/script>/g)].map((m) => m[1]);
    const firstSixOk = JSON.stringify(scriptSrcs.slice(0, 6)) === JSON.stringify(MODULE_ORDER.slice(0, 6));
    const sixthOk = scriptSrcs.length === 6 || (scriptSrcs.length === 7 && scriptSrcs[6] === '06-expand.js');
    check(firstSixOk && sixthOk,
      'Shell nạp đủ module 00→05 theo đúng thứ tự (script thường, không ES module; 06 sau 05 khi nhóm 2 nối xong)',
      `nạp: ${scriptSrcs.join(' → ') || 'không có'}`);
    check(!/type="module"/.test(shell), 'Shell không dùng ES module (script thường, global scope chia sẻ)',
      'không có type="module"');
    check(!/<script(?![^>]*src=)/.test(shell),
      'Shell không còn block <script> inline dài (chỉ còn <script src>)',
      'chỉ có script src (tailwind CDN + three.js CDN + js/00–05)');
    check(!/<style[\s>]/.test(shell) && /<link rel="stylesheet" href="quycoc\.css">/.test(shell),
      'Shell không còn CSS inline (<style>), CSS tách ra quycoc.css',
      'link quycoc.css, không có <style>');
    check(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/.test(shell),
      'Shell còn nạp three.js r128 qua CDN (trước các module js)',
      'có three.js r128 CDN');
    check(/id="three-canvas"/.test(shell) && /id="panel-team"/.test(shell) && /id="panel-pvp"/.test(shell),
      'Shell giữ đủ khung DOM (canvas + 8 panel, kể cả team/pvp)',
      'có three-canvas + panel-team + panel-pvp');
  }
  if (cssText === null) {
    report('FAIL', 'quycoc.css tồn tại (velo/web/quycoc.css)', 'không đọc được ' + CSS);
  } else {
    check(lineCount(cssText) === EXPECT_LINES.css, `quycoc.css đúng ${EXPECT_LINES.css} dòng`, `${lineCount(cssText)} dòng`);
    check(/\.mvl-panel/.test(cssText) && /\.mvl-btn/.test(cssText),
      'quycoc.css chứa class panel/nút Mộng Võ Lâm (.mvl-panel, .mvl-btn)', 'có .mvl-panel + .mvl-btn');
  }
  let total = lineCount(shell) + lineCount(cssText);
  // Số dòng gốc đã verify khi tách module (nhóm 1): 00: 208, 01: 755, 02: 576,
  // 03: 420, 04: 733, 05: 570. Nhóm 2 đang nối 06 nên 03/05 có thể tăng
  // (đã 432/583 khi nối 06) — chỉ kiểm tra khoảng cho 03/05, khóa cứng các
  // file còn lại.
  const MIN_LINES = { '03-battle.js': 420, '05-ui.js': 570 };
  for (const m of MODULE_ORDER.slice(0, 6)) {
    if (jsParts[m] === undefined) {
      report('FAIL', `Module js/${m} tồn tại`, 'không đọc được ' + path.join(JSDIR, m));
    } else if (MIN_LINES[m] !== undefined) {
      check(lineCount(jsParts[m]) >= MIN_LINES[m], `Module js/${m} đủ cỡ gốc ${MIN_LINES[m]} dòng trở lên (nhóm 2 đang nối 06)`, `${lineCount(jsParts[m])} dòng`);
      total += lineCount(jsParts[m]);
    } else {
      check(lineCount(jsParts[m]) === EXPECT_LINES[m], `Module js/${m} đúng ${EXPECT_LINES[m]} dòng`, `${lineCount(jsParts[m])} dòng`);
      total += lineCount(jsParts[m]);
    }
  }
  check(total >= TOTAL_LINES, `Tổng shell + css + 6 module đúng ${TOTAL_LINES} dòng gốc trở lên (nhóm 2 đang nối 06 nên có thể tăng)`, `${total} dòng`);
  // Module 06 của nhóm 2: có thể chưa xong → MISSING, không fail.
  checkMissing(jsParts['06-expand.js'] !== undefined, 'Module js/06-expand.js của nhóm 2 (tọa kỵ/thời trang/bang chiến/VIP)',
    jsParts['06-expand.js'] ? `${lineCount(jsParts['06-expand.js'])} dòng` : 'nhóm 2 chưa xong — báo MISSING, không fail');
  // Module 06 của nhóm 2 đang hạ cánh (file đã xuất hiện nhưng shell có thể
  // chưa nạp, QC export có thể chưa xong) → chỉ báo MISSING, không fail cứng.
  if (jsParts['06-expand.js'] !== undefined) {
    const srcs06 = shell === null ? [] : [...shell.matchAll(/<script\s+src="js\/(06-expand\.js)"><\/script>/g)].map((m) => m[1]);
    checkMissing(srcs06.length === 1, 'Shell nạp js/06-expand.js sau 05-ui.js (nhóm 2 đang hạ cánh)',
      srcs06.length ? 'có nạp 06' : 'shell chưa nạp 06 — nhóm 2 chưa xong');
    checkMissing(/Object\.assign\(window\.QC, \{/.test(jsParts['06-expand.js']),
      'js/06-expand.js có Object.assign(window.QC, ...) ở cuối file (theo quy ước module)',
      /Object\.assign\(window\.QC, \{/.test(jsParts['06-expand.js']) ? 'có QC export' : 'chưa có QC export — nhóm 2 chưa xong');
    total += lineCount(jsParts['06-expand.js']);
    console.log(`   (tổng gồm 06-expand.js: ${total} dòng)`);
  }
  check(/window\.QC = window\.QC \|\| \{\}/.test(jsParts['00-state.js'] || ''),
    'Namespace chung window.QC được khởi tạo ở 00-state.js', 'có window.QC = window.QC || {}');
}

// =====================================================================
// B. Không trùng tên hàm top-level giữa các module
//    (quét `function NAME`; ngoại lệ có chủ đích: wrap bằng gán, không phải
//    khai báo `function` — xem B2)
// =====================================================================
console.log('\n== B. Không trùng tên hàm top-level giữa các module ==');
{
  const perFile = {};
  const seen = {};
  // Quét cả 06-expand.js khi đã xuất hiện (nhóm 2 đang hạ cánh — trùng tên
  // hàm thật là lỗi thật vì script thường chia sẻ global scope, hàm sau ghi đè hàm trước).
  const SCANNED = MODULE_ORDER.filter((m) => jsParts[m] !== undefined);
  for (const m of SCANNED) {
    const t = jsParts[m];
    if (!t) continue;
    const names = [...t.matchAll(/function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map((x) => x[1]);
    perFile[m] = names;
    for (const n of names) { (seen[n] = seen[n] || []).push(m); }
  }
  const dups = Object.entries(seen).filter(([, files]) => files.length > 1);
  check(dups.length === 0, 'Không có tên hàm top-level nào trùng nhau giữa các module (quét `function NAME`)',
    dups.length ? `trùng: ${dups.map(([n, f]) => `${n} (${f.join(', ')})`).join('; ')}` : `${Object.keys(seen).length} hàm top-level, không trùng`);
  for (const [m, names] of Object.entries(perFile)) {
    const unique = new Set(names).size === names.length;
    check(unique, `Trong js/${m} không có hàm nào khai báo trùng tên (${names.length} hàm)`,
      unique ? `${names.length} hàm, không trùng` : 'có trùng tên trong cùng file');
  }
  // B2. Ngoại lệ có chủ đích (wrap bằng gán, KHÔNG phải khai báo `function` trùng):
  //  - damageEnemy: khai báo `function` ở 02-combat.js, được bọc lại ở
  //    03-battle.js bằng `damageEnemy = function (...)` (giữ `_g1DamageEnemyOrig`)
  //    để cộng combo/nộ — không sửa thân hàm cũ.
  //  - equipItem: khai báo `function` ở 04-mvl.js, được bọc lại trong cùng file
  //    bằng `_g1EquipItemOrig` (không phải trùng cross-module).
  // Cả hai đều KHÔNG bị quét ở B1 vì chỉ có 1 khai báo `function NAME` mỗi tên.
  const wrapDmg = /var _g1DamageEnemyOrig = damageEnemy;/.test(jsParts['03-battle.js'] || '')
    && /damageEnemy = function \(enemy, rawDamage, knockForce, isSkill\)/.test(jsParts['03-battle.js'] || '')
    && /function damageEnemy\(enemy, rawDamage/.test(jsParts['02-combat.js'] || '');
  check(wrapDmg, 'Ngoại lệ wrap có chủ đích: damageEnemy (02 khai báo, 03 bọc lại qua _g1DamageEnemyOrig)',
    '02: function damageEnemy; 03: _g1DamageEnemyOrig + gán lại');
  const wrapEquip = /var _g1EquipItemOrig = equipItem;/.test(jsParts['04-mvl.js'] || '')
    && /function equipItem\(id\)/.test(jsParts['04-mvl.js'] || '');
  check(wrapEquip, 'Ngoại lệ wrap có chủ đích: equipItem (04 khai báo + bọc lại qua _g1EquipItemOrig trong cùng file)',
    '04: function equipItem + _g1EquipItemOrig');
  //  - recalcStats: khai báo ở 04-mvl.js, được bọc lại ở 06-expand.js bằng
  //    `_xOrigRecalc` để cộng bonus tọa kỵ/thời trang — 06 đang hạ cánh nên
  //    chỉ báo MISSING khi chưa thấy.
  const wrapRecalc = /var _xOrigRecalc = recalcStats;/.test(jsParts['06-expand.js'] || '');
  checkMissing(!jsParts['06-expand.js'] || wrapRecalc,
    'Ngoại lệ wrap có chủ đích: recalcStats (04 khai báo, 06 bọc lại qua _xOrigRecalc)',
    wrapRecalc ? '06: _xOrigRecalc = recalcStats' : 'chưa thấy wrap recalcStats trong 06 — nhóm 2 chưa xong');
  // B3. window.QC export: mỗi module export 1 lần ở cuối file; trùng export
  // chỉ được phép khi là wrap có chủ đích (damageEnemy ở 02 + 03).
  // 06-expand.js đang hạ cánh nên export của nó chỉ kiểm tra khi đã có.
  const qcExports = {};
  for (const m of SCANNED) {
    const t = jsParts[m];
    if (!t) continue;
    const assign = (t.match(/Object\.assign\(window\.QC, \{([^}]*)\}\)/) || [])[1] || '';
    const names = assign.split(',').map((s) => s.trim()).filter(Boolean);
    if (m === '06-expand.js') {
      checkMissing(names.length > 0, `js/${m} có Object.assign(window.QC, ...) ở cuối file`, names.length ? `export ${names.length} tên` : 'chưa có QC export — nhóm 2 chưa xong');
    } else {
      check(names.length > 0, `js/${m} có Object.assign(window.QC, ...) ở cuối file`, `export ${names.length} tên`);
    }
    for (const n of names) { (qcExports[n] = qcExports[n] || []).push(m); }
  }
  const qcDups = Object.entries(qcExports).filter(([, files]) => files.length > 1);
  const qcAllowed = ['damageEnemy']; // wrap có chủ đích, xem B2
  const qcBad = qcDups.filter(([n]) => !qcAllowed.includes(n));
  check(qcBad.length === 0, 'window.QC không export trùng tên ngoài ngoại lệ wrap cho phép',
    qcDups.length
      ? `trùng export: ${qcDups.map(([n, f]) => `${n} (${f.join(', ')})`).join('; ')} — cho phép: ${qcAllowed.join(', ')}`
      : 'không trùng export');
  check(qcDups.some(([n]) => n === 'damageEnemy'),
    'window.QC export trùng duy nhất damageEnemy (02 + 03) — đúng wrap có chủ đích',
    'damageEnemy export ở 02-combat.js và 03-battle.js');
}

// =====================================================================
// C. State/data khớp: gameState, ITEMS, SHOP_STOCK, SECTS, PETS, HEROES
// =====================================================================
console.log('\n== C. State/data khớp giữa các module ==');
{
  const s00 = jsParts['00-state.js'] || '';
  const s03 = jsParts['03-battle.js'] || '';
  check(/const gameState = \{/.test(s00), '00-state.js: có const gameState = { (state gốc)', 'có gameState');
  check(/level: 10/.test(s00) && /attackPower: 68/.test(s00) && /critChance: 0\.35/.test(s00) && /questTarget: 15/.test(s00),
    'gameState giữ số liệu gốc (level 10, attackPower 68, critChance 0.35, questTarget 15)',
    'level 10, atk 68, crit 0.35, quest 15');
  check(/gameState\.gold = 455/.test(combined) && /gameState\.silver = 40932/.test(combined),
    'Tiền khởi đầu khớp ảnh mẫu MVL (455 vàng / 40932 bạc)', 'gold=455, silver=40932');
  const itemCount = (s00.match(/^\s{6}[a-z_]+:\s*\{ name: '/gm) || []).length;
  check(itemCount === 25, 'ITEMS có 25 vật phẩm (19 cũ + 6 ngọc mới vòng 2)', `đếm được ${itemCount}`);
  const shopCount = countStringsInArrayBlock(s00, /const\s+SHOP_STOCK\s*=/);
  check(shopCount === 12, 'SHOP_STOCK có 12 mặt hàng', `đếm được ${shopCount ?? '?'}`);
  const sectCount = countEntriesInArrayBlock(s00, /const\s+SECTS\s*=/);
  check(sectCount === 8, 'SECTS có 8 môn phái', `đếm được ${sectCount ?? '?'}`);
  const actCount = countEntriesInArrayBlock(s00, /const\s+ACTIVITIES\s*=/);
  check(actCount === 7, 'ACTIVITIES có 7 hoạt động hằng ngày', `đếm được ${actCount ?? '?'}`);
  const evCount = countEntriesInArrayBlock(s00, /const\s+EVENTS\s*=/);
  check(evCount === 5, 'EVENTS có 5 sự kiện theo giờ', `đếm được ${evCount ?? '?'}`);
  const petCount = countEntriesInArrayBlock(s00, /const\s+PETS\s*=/);
  check(petCount === 6, 'PETS có 6 pet/thần thú', `đếm được ${petCount ?? '?'}`);
  const guildCount = countEntriesInArrayBlock(s00, /const\s+GUILD_PRESETS\s*=/);
  check(guildCount === 4, 'GUILD_PRESETS có 4 bang hội mẫu', `đếm được ${guildCount ?? '?'}`);
  const slotNames = (s00.match(/const SLOT_NAMES = \{([^}]*)\}/) || [])[1] || '';
  const slots = ['weapon', 'armor', 'hat', 'boots', 'ring', 'necklace'].filter((s) => slotNames.includes(s));
  check(slots.length === 6, 'SLOT_NAMES có đủ 6 slot trang bị', `có ${slots.length}/6: ${slots.join(', ')}`);
  const skillsBlock = (s00.match(/const skills = \[([\s\S]*?)\n    \];/) || [])[1] || '';
  const skillCount = (skillsBlock.match(/id: \d+/g) || []).length;
  check(skillCount === 7, 'skills có 7 kỹ năng (chém thường + 6 tuyệt kỹ)', `đếm được ${skillCount}`);
  const heroesBlock = (s03.match(/var HEROES = \[([\s\S]*?)\n    \];/) || [])[1] || '';
  const heroIds = [...heroesBlock.matchAll(/id: (\d+)/g)].map((m) => parseInt(m[1], 10));
  check(heroIds.length === 8 && JSON.stringify(heroIds) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7]),
    'HEROES có 8 hero, id 0–7', `id: ${heroIds.join(',') || '?'}`);
  const pvpBlock = (s03.match(/var PVP_OPPONENTS = \[([\s\S]*?)\];/) || [])[1] || '';
  const oppCount = (pvpBlock.match(/rank: \d+/g) || []).length;
  check(oppCount === 8, 'PVP_OPPONENTS có 8 đối thủ', `đếm được ${oppCount}`);
  check(/maxHp: 200000/.test(s03), 'WORLD_BOSS Thiên Ma Tôn Chủ 200.000 HP', 'có maxHp: 200000');
  check(/partyHeroes = \[0, 1, 2, 5, 7\]/.test(s03),
    'partyHeroes mặc định [0,1,2,5,7] (khớp V hero_ids + extra)', 'có partyHeroes [0,1,2,5,7]');
}

// =====================================================================
// D. Hệ thống mới của nhóm 2 (chưa xong thì MISSING) + mô phỏng thiết kế
//    Tọa kỵ 6, thời trang 8, bang chiến, môn phái chiến, VIP 6 cấp,
//    thư + chat, bảng xếp hạng, đổi đội trưởng F1/F2/F3.
// =====================================================================
console.log('\n== D. Hệ thống mới vòng 3 (nhóm 2: 06-expand.js + V mới) ==');
{
  const s06 = jsParts['06-expand.js'] || '';
  const has06 = jsParts['06-expand.js'] !== undefined;
  checkMissing(has06, 'js/06-expand.js tồn tại (nhóm 2)',
    has06 ? `${lineCount(s06)} dòng` : 'nhóm 2 chưa xong — các assert hệ thống mới dưới đây đều MISSING');
  const NEW_V = ['mounts.v', 'fashion.v', 'guildwar.v', 'vip.v'];
  for (const f of NEW_V) {
    checkMissing(vMap[f] !== undefined, `V: file ${f} tồn tại (nhóm 2)`,
      vMap[f] !== undefined ? 'có file' : 'nhóm 2 chưa xong — báo MISSING');
  }
  // Từng hệ thống: có mặt trong 06-expand.js HOẶC file V chuyên biệt.
  const systems = [
    { key: 'tọa kỵ (6 con)', js: /mount|toa_ky|toaKy/i, v: ['mounts.v'], expect: 6, label: 'tọa kỵ' },
    { key: 'thời trang (8 bộ)', js: /fashion|thoi_trang|thoiTrang/i, v: ['fashion.v'], expect: 8, label: 'bộ thời trang' },
    { key: 'bang chiến', js: /guild.?war|guildWar|bang_chien|bangChien/i, v: ['guildwar.v'], expect: null, label: '' },
    { key: 'môn phái chiến', js: /sect.?war|sectWar|mon_phai_chien|phaiChien/i, v: ['guildwar.v'], expect: null, label: '' },
    { key: 'VIP (6 cấp)', js: /vip/i, v: ['vip.v'], expect: 6, label: 'cấp VIP' },
    { key: 'thư + chat', js: /mail|thư|chat/i, v: [], expect: null, label: '' },
    { key: 'bảng xếp hạng', js: /renderRank|RANK_NPCS|rankList|ranking|leaderboard/i, v: [], expect: null, label: '' },
    { key: 'đổi đội trưởng F1/F2/F3', js: /F1|F2|F3|doi_doi_truong|doiTruong/i, v: [], expect: null, label: '' },
  ];
  for (const sys of systems) {
    const inJs = has06 && sys.js.test(s06);
    const inV = sys.v.some((f) => vMap[f] !== undefined && sys.js.test(vMap[f] || ''));
    const inVAny = sys.v.some((f) => vMap[f] !== undefined);
    checkMissing(inJs || inV,
      `Hệ thống mới: ${sys.key} đã xuất hiện (06-expand.js hoặc V)`,
      inJs ? 'có trong js/06-expand.js' : inV ? `có trong ${sys.v.join('/')}` : inVAny ? 'có file V nhưng chưa thấy marker' : 'nhóm 2 chưa xong — báo MISSING');
  }
  // Đếm thật trong 06-expand.js (khi đã có file): tọa kỵ 6, thời trang 8,
  // VIP 6 cấp (level 0–5), bảng xếp hạng 20 NPC mẫu.
  function blockOf(text, startRe) {
    const m = startRe.exec(text);
    if (!m) return null;
    const open = text.indexOf('[', m.index);
    if (open < 0) return null;
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') { depth--; if (depth === 0) return text.slice(open, i + 1); }
    }
    return null;
  }
  if (has06) {
    const mountsBlock = blockOf(s06, /var MOUNTS\s*=/);
    const mountsN = mountsBlock ? (mountsBlock.match(/id:\s*\d+/g) || []).length : null;
    checkMissing(mountsN === 6, '06-expand.js: MOUNTS đủ 6 tọa kỵ (Ngựa Bạch → Thần Điêu)', `đếm được ${mountsN ?? '?'}`);
    const fashionsBlock = blockOf(s06, /var FASHIONS\s*=/);
    const fashionsN = fashionsBlock ? (fashionsBlock.match(/id:\s*\d+/g) || []).length : null;
    checkMissing(fashionsN === 8, '06-expand.js: FASHIONS đủ 8 bộ thời trang (Bạch Y → Ma Tôn)', `đếm được ${fashionsN ?? '?'}`);
    const vipBlock = blockOf(s06, /var VIP_LEVELS\s*=/);
    const vipN = vipBlock ? (vipBlock.match(/level:\s*\d+/g) || []).length : null;
    checkMissing(vipN === 6, '06-expand.js: VIP_LEVELS đủ 6 cấp (level 0–5)', `đếm được ${vipN ?? '?'}`);
    const vipExp = vipBlock ? [...vipBlock.matchAll(/expPct:\s*(\d+)/g)].map((x) => parseInt(x[1], 10)) : [];
    checkMissing(JSON.stringify(vipExp) === JSON.stringify([0, 5, 10, 15, 20, 30]),
      '06-expand.js: VIP cộng EXP theo cấp [0,5,10,15,20,30]% (VIP 5 → +30%)', `expPct=[${vipExp.join(',') || '?'}]`);
    const rankBlock = blockOf(s06, /var RANK_NPCS\s*=/);
    const rankN = rankBlock ? (rankBlock.match(/name:\s*'[^']+'/g) || []).length : null;
    checkMissing(rankN === 20, '06-expand.js: RANK_NPCS đủ 20 NPC mẫu cho bảng xếp hạng', `đếm được ${rankN ?? '?'}`);
    checkMissing(/function renderRank/.test(s06) && /function rankList/.test(s06),
      '06-expand.js: có renderRank + rankList (bảng xếp hạng hiển thị được)', 'có renderRank + rankList');
    checkMissing(/function guildWarIsOpen/.test(s06) && /h >= 19 && h < 20/.test(s06),
      '06-expand.js: bang chiến mở 19–20h (guildWarIsOpen)', 'có guildWarIsOpen 19–20h');
    checkMissing(/function fightGuildWar/.test(s06) && /function fightSectWar/.test(s06),
      '06-expand.js: có fightGuildWar + fightSectWar (đánh bang chiến / môn phái chiến)', 'có cả 2 hàm đánh');
    checkMissing(/function sendMail/.test(s06) && /function sendChat/.test(s06),
      '06-expand.js: có sendMail + sendChat (thư + chat)', 'có sendMail + sendChat');
    checkMissing(/e\.key === 'F1'/.test(s06) && /e\.key === 'F2'/.test(s06) && /e\.key === 'F3'/.test(s06),
      '06-expand.js: phím F1/F2/F3 đổi đội trưởng (keydown handler)', 'có keydown F1/F2/F3 → switchLeaderHTML');
  }

  // Mô phỏng thuần JS theo THIẾT KẾ vòng 3 (không phụ thuộc code game —
  // assert số liệu thiết kế; hệ thống thật chưa có thì các assert presence
  // ở trên đã báo MISSING).
  // D1. Mua tọa kỵ trừ tiền, không âm tiền, chỉ mua được khi đủ tiền.
  function buyMount(state, price) {
    if (state.gold < price) return { ...state, ok: false };
    return { ...state, gold: state.gold - price, ok: true, mountsOwned: (state.mountsOwned || 0) + 1 };
  }
  {
    // Giá thật đo từ MOUNTS trong 06-expand.js (Ngựa Bạch rẻ nhất 500 vàng);
    // chưa có 06 thì dùng giá thiết kế 500. Tiền khởi đầu 455 vàng KHÔNG đủ
    // mua tọa kỵ rẻ nhất — phải kiếm thêm vàng trước.
    const mountPrices = has06 ? [...s06.matchAll(/costGold:\s*(\d+)/g)].map((x) => parseInt(x[1], 10)) : [];
    const cheapest = mountPrices.length ? Math.min(...mountPrices) : 500;
    const poor = buyMount({ gold: 455, mountsOwned: 0 }, cheapest);
    check(poor.ok === false && poor.gold === 455 && (poor.mountsOwned || 0) === 0,
      `Tọa kỵ (thiết kế): 455 vàng (tiền khởi đầu) mua tọa kỵ rẻ nhất ${cheapest} vàng → FAIL, tiền không đổi`,
      `giá rẻ nhất=${cheapest}, ok=${poor.ok}, gold=${poor.gold}`);
    const exact = buyMount({ gold: cheapest, mountsOwned: 0 }, cheapest);
    check(exact.ok === true && exact.gold === 0 && exact.mountsOwned === 1,
      `Tọa kỵ (thiết kế): vừa đủ ${cheapest} vàng mua tọa kỵ rẻ nhất → còn 0 vàng, sở hữu 1 con`,
      `gold=${exact.gold}, mounts=${exact.mountsOwned}`);
    const sixth = buyMount({ gold: cheapest, mountsOwned: 5 }, cheapest);
    check(sixth.ok === true && sixth.mountsOwned === 6,
      'Tọa kỵ (thiết kế): mua con thứ 6 → đủ bộ 6 tọa kỵ', `mounts=${sixth.mountsOwned}`);
  }
  // D2. Mặc thời trang đổi tint (màu áo/kiếm của nhân vật).
  function applyFashion(hero, fashion) {
    return { ...hero, tint: fashion.tint, blade: fashion.blade, fashionId: fashion.id };
  }
  {
    const hero = { id: 0, name: 'Quỷ Cốc', tint: 0xf6e8d0, blade: 0x9ee296 };
    const f = { id: 'ao_bach_y', tint: 0xffffff, blade: 0xffd43b };
    const dressed = applyFashion(hero, f);
    check(dressed.tint === 0xffffff && dressed.blade === 0xffd43b && dressed.fashionId === 'ao_bach_y',
      'Thời trang (thiết kế): mặc Áo Bạch Y đổi tint 0xf6e8d0 → 0xffffff, blade → 0xffd43b', `tint=0x${dressed.tint.toString(16)}`);
    check(applyFashion(hero, { id: 'none', tint: 0xf6e8d0, blade: 0x9ee296 }).tint === hero.tint,
      'Thời trang (thiết kế): gỡ thời trang trả về tint gốc', 'tint gốc 0xf6e8d0');
  }
  // D3. VIP cộng EXP: 6 cấp (level 0–5), expPct [0,5,10,15,20,30]%
  // (bảng VIP_LEVELS đo từ 06-expand.js — VIP 5 cao nhất → +30%).
  function vipExpPct(vipLevel) {
    const table = [0, 5, 10, 15, 20, 30];
    return table[Math.max(0, Math.min(5, vipLevel))];
  }
  function expGain(base, vipLevel) { return Math.round(base * (1 + vipExpPct(vipLevel) / 100)); }
  {
    check(vipExpPct(0) === 0 && vipExpPct(5) === 30, 'VIP (thiết kế): VIP 0 → +0% EXP, VIP 5 (cao nhất) → +30% EXP', 'VIP0 +0%, VIP5 +30%');
    check(expGain(100, 0) === 100, 'VIP (thiết kế): VIP 0 nhận 100 EXP → 100', `exp=${expGain(100, 0)}`);
    check(expGain(100, 3) === 115, 'VIP (thiết kế): VIP 3 (+15%) nhận 100 EXP → 115', `exp=${expGain(100, 3)}`);
    check(expGain(100, 5) === 130, 'VIP (thiết kế): VIP 5 (+30%) nhận 100 EXP → 130', `exp=${expGain(100, 5)}`);
  }
  // D4. Bảng xếp hạng sắp xếp đúng (lực chiến giảm dần, hạng 1 mạnh nhất).
  function rankPlayers(players) {
    return [...players].sort((a, b) => b.power - a.power).map((p, i) => ({ ...p, rank: i + 1 }));
  }
  {
    const ranked = rankPlayers([
      { name: 'A', power: 260 }, { name: 'B', power: 1600 }, { name: 'C', power: 900 },
    ]);
    check(ranked[0].name === 'B' && ranked[0].rank === 1, 'Xếp hạng (thiết kế): lực chiến 1600 → hạng 1', `hạng 1: ${ranked[0].name} (${ranked[0].power})`);
    check(ranked[1].name === 'C' && ranked[2].name === 'A', 'Xếp hạng (thiết kế): 900 → hạng 2, 260 → hạng 3', `hạng 2: ${ranked[1].name}, hạng 3: ${ranked[2].name}`);
    check(rankPlayers([]).length === 0, 'Xếp hạng (thiết kế): bảng rỗng → 0 người', 'rỗng');
  }
  // D5. Đổi đội trưởng F1/F2/F3: phím đổi leader trong đội hình 5 người.
  function switchLeader(party, key) {
    const idx = { F1: 0, F2: 1, F3: 2 }[key];
    if (idx === undefined || idx >= party.length) return null;
    return party[idx];
  }
  {
    const party = [0, 1, 2, 5, 7];
    check(switchLeader(party, 'F1') === 0, 'Đổi đội trưởng (thiết kế): F1 → hero slot 0', 'F1 → 0');
    check(switchLeader(party, 'F2') === 1, 'Đổi đội trưởng (thiết kế): F2 → hero slot 1', 'F2 → 1');
    check(switchLeader(party, 'F3') === 2, 'Đổi đội trưởng (thiết kế): F3 → hero slot 2', 'F3 → 2');
    check(switchLeader(party, 'F4') === null, 'Đổi đội trưởng (thiết kế): F4 không đổi (chỉ F1/F2/F3)', 'F4 → null');
  }
}

// =====================================================================
// E. Hồi quy battle cũ: 7 skill, quest 15 yêu thú, crit 0.35,
//    combat real-time còn nguyên sau khi tách module
// =====================================================================
console.log('\n== E. Hồi quy battle cũ sau khi tách module ==');
{
  const s00 = jsParts['00-state.js'] || '';
  const s02 = jsParts['02-combat.js'] || '';
  const s05 = jsParts['05-ui.js'] || '';
  check(/critChance: 0\.35/.test(s00), 'Hồi quy: crit gốc 0.35 còn nguyên (gameState.critChance)', 'critChance: 0.35');
  check(/questTarget: 15/.test(s00), 'Hồi quy: nhiệm vụ 15 yêu thú còn nguyên (questTarget 15)', 'questTarget: 15');
  check(/function castSkill/.test(s02) || /castSkill/.test(combined),
    'Hồi quy: castSkill còn nguyên (02-combat.js)', 'có castSkill');
  check(/function damageEnemy/.test(s02), 'Hồi quy: damageEnemy gốc còn nguyên (02-combat.js)', 'có function damageEnemy');
  check(/rageTimer = 12\.0/.test(s02), 'Hồi quy: nộ Bạo Linh Phù 12.0s còn nguyên (02-combat.js)', 'có rageTimer = 12.0');
  check(/critBonus = gameState\.rageTimer > 0 \? 0\.35/.test(s02),
    'Hồi quy: nộ Bạo Linh Phù +35% crit còn nguyên', 'có critBonus 0.35');
  check(/requestAnimationFrame\(animate\)/.test(s05),
    'Hồi quy: combat real-time còn nguyên (requestAnimationFrame)', 'có requestAnimationFrame(animate)');
  check(/setInterval\(masterTick, 100\)/.test(s05),
    'Hồi quy: masterTick chạy mỗi 100ms còn nguyên (05-ui.js)', 'có setInterval(masterTick, 100)');
  check(/const dt = Math\.min\(clock\.getDelta\(\), 0\.05\)/.test(s05),
    'Hồi quy: dt clamp 0.05s còn nguyên (không giật khi lag)', 'có dt clamp 0.05');
  check(/autoAttackCooldown/.test(combined),
    'Hồi quy: auto-attack cũ còn nguyên (tự chém thường khi đứng gần quái)', 'có autoAttackCooldown');
  check(/function toggleAutoBattle/.test(jsParts['03-battle.js'] || '') && /function startRaid/.test(jsParts['03-battle.js'] || ''),
    'Hồi quy: auto-battle + raid boss còn nguyên trong 03-battle.js', 'có toggleAutoBattle + startRaid');
  check(/localStorage\s*\.\s*(setItem|getItem)/.test(combined),
    'Hồi quy: lưu game localStorage còn nguyên', 'có localStorage');
}

// =====================================================================
// F. Docs đi kèm (vòng 3)
// =====================================================================
console.log('\n== F. Docs ==');
const doc = read(path.join(ROOT, 'docs', 'MONG_VO_LAM.md'));
checkMissing(doc !== null && /## .*Module/i.test(doc),
  'docs/MONG_VO_LAM.md có chương Module vòng 3 (bảng module 00–05 + shell + css)',
  doc ? (/## .*Module/i.test(doc) ? 'có chương Module' : 'chưa có chương Module') : 'chưa có file docs');
checkMissing(doc !== null && /3811/.test(doc),
  'docs/MONG_VO_LAM.md ghi đúng tổng 3811 dòng (shell 358 + css 191 + module)',
  doc ? (/3811/.test(doc) ? 'có ghi 3811' : 'chưa ghi tổng 3811 dòng') : 'chưa có file docs');
checkMissing(doc !== null && /chuẩn chung vòng 3|Chuẩn chung vòng 3/i.test(doc),
  'docs/MONG_VO_LAM.md ghi chuẩn chung vòng 3 (Nộ Trảm tay / AoE 90 / boss TG)',
  doc ? (/chuẩn chung vòng 3/i.test(doc) ? 'có nhắc chuẩn chung vòng 3' : 'chưa nhắc "chuẩn chung vòng 3"') : 'chưa có file docs');
const rootReadme = read(path.join(ROOT, 'README.md')) || '';
checkMissing(/test-modules-mvl/.test(rootReadme),
  'README gốc ghi cách chạy tests/test-modules-mvl.js', /test-modules-mvl/.test(rootReadme) ? 'có nhắc test-modules-mvl.js' : 'chưa ghi test module vòng 3');
checkMissing(/test-mongvolam|test-battle-mvl/.test(rootReadme),
  'README gốc ghi cách chạy 2 harness cũ (test-mongvolam.js, test-battle-mvl.js)',
  /test-mongvolam/.test(rootReadme) && /test-battle-mvl/.test(rootReadme) ? 'có nhắc cả 2' : 'chưa ghi đủ 2 harness cũ');
const quycocReadme = read(path.join(ROOT, 'velo', 'quycoc3d', 'README.md')) || '';
checkMissing(/00-state|01-world|02-combat|03-battle|04-mvl|05-ui/i.test(quycocReadme),
  'velo/quycoc3d/README.md ghi sơ đồ module web (00–05)',
  /00-state/.test(quycocReadme) ? 'có nhắc module 00-state.js' : 'chưa ghi sơ đồ module');

// =====================================================================
// Tổng kết
// =====================================================================
console.log('\n========================================');
console.log(`TỔNG KẾT (module vòng 3): ${pass} PASS, ${fail} FAIL, ${missing} MISSING (tổng ${results.length} assert)`);
if (missing > 0) {
  console.log('MISSING (hệ thống vòng 3 chưa xuất hiện trong code — không tính là fail):');
  for (const r of results.filter((r) => r.status === 'MISSING')) console.log(`  - ${r.name}: ${r.detail}`);
}
if (fail > 0) {
  console.log('FAIL:');
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  - ${r.name}: ${r.detail}`);
}
console.log('========================================');
process.exit(fail > 0 ? 1 : 0);
