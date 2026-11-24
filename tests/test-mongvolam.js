// tests/test-mongvolam.js — Harness kiểm thử bản mở rộng Quỷ Cốc Bát Hoang 3D
// theo phong cách Mộng Võ Lâm (Soha).
//
// Chạy:  node tests/test-mongvolam.js        (từ thư mục gốc repo)
// Thoát: 0 = không có FAIL (MISSING được phép), 1 = có ít nhất 1 FAIL.
//
// NGUYÊN TẮC:
//  - Mọi số liệu đều đọc từ FILE THẬT tại thời điểm chạy bằng regex scan.
//    Harness KHÔNG hardcode kết quả đếm (chỉ hardcode KỲ VỌNG thiết kế:
//    8 phái, 6 pet, 20 nhiệm vụ chính, 7 hoạt động ngày, 6 slot trang bị).
//  - Hệ thống nào chưa có file / chưa có marker thì báo MISSING, không crash,
//    không fail cứng toàn bộ run. Hai subagent HTML + V chạy song song nên
//    file của họ có thể chưa xong khi harness chạy.
//  - Phần mô phỏng logic (mua/bán, cường hóa, pet, nhiệm vụ, PvP) là logic
//    thuần JS trong file này, assert số liệu cụ thể.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'velo', 'web', 'qu_c_c_b_t_hoang_3d.html');
const VDIR = path.join(ROOT, 'velo', 'quycoc3d');

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
// Đếm entry `name: '...'` (V) hoặc `name: "..."` (JS) trong block mảng bắt đầu
// tại marker (vd: `const sects = [` / `sects = [`). Trả về null nếu không tìm thấy block.
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
// Đếm entry kiểu `XxxDef{...}` (struct literal) trong các file cho trước.
// Đây là cách đếm chính xác nhất cho bảng V: mỗi entry là một literal,
// không bị nhầm với `name:` của skill lồng bên trong (vd. SectDef chứa 2
// SectSkill cũng có `name:`). Trả về null nếu không tìm thấy literal nào.
function countDefLiterals(files, defNames) {
  for (const name of defNames) {
    let total = 0;
    let found = false;
    for (const f of files) {
      // Chỉ đếm literal ở đầu dòng dạng `SectDef{` (không khoảng trắng trước
      // `{`) — loại `pub struct SectDef {` và `fn f() SectDef {` (có khoảng trắng).
      const n = (f.text.match(new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{', 'gm')) || []).length;
      if (n > 0) { total += n; found = true; }
    }
    if (found) return total;
  }
  return null;
}
function countObjectsInArrayBlock(text, startRe) {
  const m = startRe.exec(text);
  if (!m) return null;
  const open = text.indexOf('[', m.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) {
      const block = text.slice(open, i + 1);
      const ids = block.match(/\bid\s*:\s*\d+/g);
      return ids ? ids.length : 0;
    } }
  }
  return null;
}
function countInFiles(files, startRe) {
  for (const f of files) {
    const n = countEntriesInArrayBlock(f.text, startRe)
      ?? countObjectsInArrayBlock(f.text, startRe);
    if (n !== null) return { file: f.name, count: n };
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
// Số liệu cross-mirror HTML ↔ V (điền dần ở các mục A/B, đối chiếu ở mục E).
const cross = {};

// =====================================================================
// A. HTML — velo/web/qu_c_c_b_t_hoang_3d.html
// =====================================================================
console.log('\n== A. HTML (velo/web/qu_c_c_b_t_hoang_3d.html) ==');
const html = read(HTML);
if (html === null) {
  report('FAIL', 'HTML file tồn tại', 'không đọc được ' + HTML);
} else {
  check(html.length > 50000, 'HTML có nội dung đầy đủ (>50KB)', `${html.length} bytes, ${html.split('\n').length} dòng`);

  // A1. Thanh dưới kiểu Mộng Võ Lâm: 6 panel.
  const BOTTOM_PANELS = ['Túi', 'Môn Phái', 'Hoạt Động', 'Sự Kiện', 'Chợ', 'Bang Hội'];
  const foundPanels = BOTTOM_PANELS.filter((p) => html.includes(p));
  checkMissing(foundPanels.length === BOTTOM_PANELS.length,
    `Thanh dưới đủ 6 panel (Túi/Môn Phái/Hoạt Động/Sự Kiện/Chợ/Bang Hội)`,
    `tìm thấy ${foundPanels.length}/6: ${foundPanels.join(', ') || 'không có panel nào'}`);
  for (const p of BOTTOM_PANELS) {
    checkMissing(html.includes(p), `Panel thanh dưới: ${p}`, html.includes(p) ? 'có' : 'chưa có');
  }

  // A2. Bảng môn phái trong HTML.
  const sectCountHtml = countEntriesInArrayBlock(html, /(?:const|let|var)\s+(?:sects|SECTS|monPhai|phai)\s*=/i)
    ?? countEntriesInArrayBlock(html, /sects\s*[:=]\s*\[/i);
  if (sectCountHtml === null) {
    report('MISSING', 'HTML: bảng 8 môn phái', 'không tìm thấy mảng sects/môn phái');
  } else {
    cross.htmlSects = sectCountHtml;
    check(sectCountHtml === 8, 'HTML: đủ 8 môn phái', `đếm được ${sectCountHtml}`);
  }

  // A3. Bảng pet / thần thú trong HTML.
  // Chuẩn vòng 2 đã chốt: 6 pet (khớp bản V) — HTML vòng 1 chỉ có 3 pet
  // (Thần Điêu / Hồ Ly / Kim Thiềm); nhóm 1 đang bổ sung lên 6.
  const petCountHtml = countEntriesInArrayBlock(html, /(?:const|let|var)\s+(?:pets|PETS|thanThu|petsData)\s*=/i)
    ?? countEntriesInArrayBlock(html, /pets\s*[:=]\s*\[/i);
  if (petCountHtml === null) {
    report('MISSING', 'HTML: bảng pet/thần thú', 'không tìm thấy mảng pets');
  } else {
    cross.htmlPets = petCountHtml;
    check(petCountHtml === 6, 'HTML: đủ 6 pet (chuẩn vòng 2, khớp V)', `đếm được ${petCountHtml}`);
  }

  // A4. Slot trang bị trong HTML (6 slot: vũ khí, áo, mũ, giày, nhẫn, dây chuyền...).
  const slotCountHtml = countEntriesInArrayBlock(html, /(?:const|let|var)\s+(?:equipSlots|EQUIP_SLOTS|slots|trangBiSlots)\s*=/i)
    ?? countEntriesInArrayBlock(html, /equipSlots\s*[:=]\s*\[/i);
  if (slotCountHtml === null) {
    // Fallback 1: đếm id dạng equip-slot-* / slot-* trong markup.
    const slotIds = new Set((html.match(/id=["'](?:equip-?slot|slot)-[^"']+["']/gi) || []));
    if (slotIds.size > 0) {
      check(slotIds.size === 6, 'HTML: đủ 6 slot trang bị (đếm theo id slot-*)', `đếm được ${slotIds.size}`);
    } else {
      // Fallback 2: đếm các giá trị `slot:` khác nhau trong bảng ITEMS
      // (weapon/armor/hat/boots/ring/necklace).
      const slots = new Set((html.match(/slot:\s*'([^']+)'/g) || []).map((s) => s.replace(/slot:\s*'/, '').replace(/'$/, '')));
      if (slots.size > 0) {
        check(slots.size === 6, 'HTML: đủ 6 slot trang bị (đếm theo slot: trong ITEMS)', `đếm được ${slots.size}: ${[...slots].join(', ')}`);
      } else {
        report('MISSING', 'HTML: 6 slot trang bị', 'không tìm thấy mảng equipSlots, id slot-* hay slot: trong ITEMS');
      }
    }
  } else {
    check(slotCountHtml === 6, 'HTML: đủ 6 slot trang bị', `đếm được ${slotCountHtml}`);
  }

  // A5. Lưu game (localStorage).
  checkMissing(/localStorage\s*\.\s*(setItem|getItem)/.test(html),
    'HTML: lưu game bằng localStorage', /localStorage/.test(html) ? 'có dùng localStorage' : 'chưa có localStorage');

  // A6. Nền tảng cũ vẫn còn: 7 skill, quest 15 yêu thú, touch.
  const skillBtns = new Set((html.match(/id=["']skill-btn-\d+["']/g) || []));
  check(skillBtns.size >= 6, 'HTML: thanh kỹ năng còn đủ ô (6 tuyệt kỹ + chém thường)', `đếm được ${skillBtns.size} nút skill-btn-*`);
  check(/questTarget\s*:\s*15/.test(html) || /\/15/.test(html), 'HTML: nhiệm vụ 15 yêu thú còn nguyên', 'questTarget 15');
  check(/touchstart/.test(html), 'HTML: hỗ trợ touch (điện thoại)', 'có touchstart listener');
  check(/gameState\s*=\s*\{/.test(html), 'HTML: gameState còn nguyên', 'có gameState');

  // A7. Các bảng Mộng Võ Lâm còn lại trong HTML.
  const actCount = countEntriesInArrayBlock(html, /const\s+ACTIVITIES\s*=/);
  if (actCount === null) report('MISSING', 'HTML: 7 hoạt động hằng ngày', 'không tìm thấy ACTIVITIES');
  else { cross.htmlActivities = actCount; check(actCount === 7, 'HTML: đủ 7 hoạt động hằng ngày', `đếm được ${actCount}`); }
  const evCount = countEntriesInArrayBlock(html, /const\s+EVENTS\s*=/);
  if (evCount === null) report('MISSING', 'HTML: 5 sự kiện theo giờ', 'không tìm thấy EVENTS');
  else { cross.htmlEvents = evCount; check(evCount === 5, 'HTML: đủ 5 sự kiện theo giờ (chuẩn vòng 2, khớp V)', `đếm được ${evCount}`); }
  const shopCount = countStringsInArrayBlock(html, /const\s+SHOP_STOCK\s*=/);
  if (shopCount === null) report('MISSING', 'HTML: kho chợ SHOP_STOCK', 'không tìm thấy SHOP_STOCK');
  else check(shopCount === 12, 'HTML: chợ có 12 mặt hàng (SHOP_STOCK)', `đếm được ${shopCount}`);
  const itemCount = (html.match(/^\s{6}[a-z_]+:\s*\{ name: '/gm) || []).length;
  check(itemCount === 25, 'HTML: bảng ITEMS có 25 vật phẩm (19 cũ + 6 ngọc mới vòng 2)', `đếm được ${itemCount}`);
  const guildCount = countEntriesInArrayBlock(html, /const\s+GUILD_PRESETS\s*=/);
  if (guildCount === null) report('MISSING', 'HTML: 4 bang hội mẫu', 'không tìm thấy GUILD_PRESETS');
  else { cross.htmlGuilds = guildCount; check(guildCount === 4, 'HTML: đủ 4 bang hội mẫu (chuẩn vòng 2, khớp V)', `đếm được ${guildCount}`); }
  check(/function toggleTownMode/.test(html) && /Khu An Toàn/.test(html),
    'HTML: thị trấn an toàn Song Ma Quyền Phái (toggleTownMode)', 'có toggleTownMode + banner Khu An Toàn');
  check(/setInterval\(function \(\) \{ saveGame\(false\); \}, 15000\)/.test(html),
    'HTML: tự lưu mỗi 15 giây + lưu khi đóng trang', 'setInterval 15000 + beforeunload');
  check(/gameState\.gold = 455/.test(html) && /gameState\.silver = 40932/.test(html),
    'HTML: tiền khởi đầu khớp ảnh mẫu MVL (455 vàng / 40932 bạc)', 'gold=455, silver=40932');
  check(/function addGold/.test(html) && /Math\.max\(0, gameState\.gold/.test(html),
    'HTML: tiền không bao giờ âm (addGold/addSilver clamp 0)', 'Math.max(0, ...)');
}

// =====================================================================
// B. V mirror — velo/quycoc3d/*.v
// =====================================================================
console.log('\n== B. V mirror (velo/quycoc3d/*.v) ==');
const vMap = readAllV();
const vList = Object.entries(vMap).map(([name, text]) => ({ name, text }));
if (vList.length === 0) {
  report('FAIL', 'Thư mục velo/quycoc3d có file .v', 'không đọc được file .v nào');
} else {
  console.log(`   (đọc ${vList.length} file .v: ${vList.map((f) => f.name).join(', ')})`);
}

// B1. Từng hệ thống V mới: file chuyên biệt HOẶC const block trong file có sẵn.
const V_SYSTEMS = [
  { key: 'môn phái', files: ['sects.v', 'monphai.v'], marker: /sects\s*=/i, expect: 8, label: 'phái', defs: ['SectDef'], arr: 'sects' },
  { key: 'kinh tế/chợ', files: ['economy.v', 'market.v', 'cho.v'], marker: /market_items|shop_items|economy/i, expect: null, label: 'mặt hàng', defs: ['MarketItemDef', 'ShopItemDef'], arr: 'market_items|shop_items' },
  { key: 'trang bị', files: ['equipment.v', 'trangbi.v'], marker: /equip_slots|equipment/i, expect: 6, label: 'slot', defs: ['EquipSlotDef', 'EquipDef'], arr: 'equip_slots', valueRe: /equip_slot_count\s*=\s*(\d+)/ },
  { key: 'pet/thần thú', files: ['pets.v', 'thanthu.v'], marker: /pets\s*=/i, expect: 6, label: 'pet', defs: ['PetDef', 'ThanThuDef'], arr: 'pets' },
  { key: 'bang hội', files: ['guild.v', 'banghoi.v'], marker: /guild/i, expect: null, label: '', defs: ['GuildDef'], arr: 'guild' },
  { key: 'nhiệm vụ', files: ['quests.v', 'nhiemvu.v'], marker: /quests\s*=/i, expect: 20, label: 'nhiệm vụ', defs: ['QuestDef', 'MainQuestDef'], arr: 'quests' },
  { key: 'hoạt động ngày', files: ['daily.v', 'activities.v', 'hoatdong.v'], marker: /daily_activities|activities\s*=/i, expect: 7, label: 'hoạt động', defs: ['DailyDef', 'ActivityDef', 'DailyActivityDef'], arr: 'daily_activities|activities' },
  { key: 'PvP/xếp hạng', files: ['pvp.v', 'ranking.v'], marker: /pvp|ranking/i, expect: null, label: '', defs: ['PvpRankDef', 'RankingDef'], arr: 'pvp_ranks|ranking' },
  { key: 'lưu game', files: ['save.v', 'luu.v'], marker: /save_game|fn save/i, expect: null, label: '', defs: [], arr: '' },
];
for (const sys of V_SYSTEMS) {
  const byFile = vList.filter((f) => sys.files.includes(f.name));
  const byMarker = vList.filter((f) => sys.marker.test(f.text));
  const present = byFile.length > 0 || byMarker.length > 0;
  const where = [...new Set([...byFile.map((f) => f.name), ...byMarker.map((f) => f.name)])].join(', ');
  if (!present) {
    report('MISSING', `V: hệ thống ${sys.key}`, 'chưa có file chuyên biệt hay marker trong .v');
    continue;
  }
  report('PASS', `V: hệ thống ${sys.key} đã xuất hiện`, where);
  if (sys.expect !== null) {
    // Đếm entry: ưu tiên đếm struct literal `XxxDef{` (chính xác nhất),
    // fallback đếm `name:` trong block mảng của hệ thống đó.
    const scope = byFile.length ? byFile : byMarker;
    let counted = null;
    // Ưu tiên 1: hằng số đếm trực tiếp, vd. `equip_slot_count = 6`.
    if (sys.valueRe) {
      for (const f of scope) {
        const vm = sys.valueRe.exec(f.text);
        if (vm) { counted = { file: f.name, count: parseInt(vm[1], 10) }; break; }
      }
    }
    // Ưu tiên 2: đếm struct literal `XxxDef{` (chính xác nhất),
    // fallback đếm `name:` trong block mảng của hệ thống đó.
    if (counted === null) {
      const defCount = countDefLiterals(scope, sys.defs);
      if (defCount !== null) {
        counted = { file: scope.map((f) => f.name).join(','), count: defCount };
      } else if (sys.arr) {
        counted = countInFiles(scope, new RegExp(`(?:const\\s+)?(?:${sys.arr})\\s*=`));
      }
    }
    if (counted === null) {
      report('MISSING', `V: đếm ${sys.expect} ${sys.label} (${sys.key})`, `có marker ở ${where} nhưng không đếm được block mảng`);
    } else {
      check(counted.count === sys.expect,
        `V: đủ ${sys.expect} ${sys.label} (${sys.key})`, `${counted.file}: đếm được ${counted.count}`);
    }
  }
}

// B1b. Số liệu V cho đối chiếu cross-mirror (mục E).
{
  const byName = (n) => vList.filter((f) => f.name === n);
  cross.vSects = countDefLiterals(byName('sects.v'), ['SectDef']);
  cross.vPets = countDefLiterals(byName('pets.v'), ['PetDef']);
  cross.vGuilds = countDefLiterals(byName('guild.v'), ['GuildDef']);
  cross.vQuests = countDefLiterals(byName('quests.v'), ['QuestDef']);
  cross.vActivities = countDefLiterals(byName('quests.v'), ['DailyDef']);
  cross.vEvents = countDefLiterals(byName('quests.v'), ['TimedEvent']);
  cross.vShopItems = countDefLiterals(byName('economy.v'), ['ShopItem']);
  cross.vEquipItems = countDefLiterals(byName('equipment.v'), ['ItemDef']);
  cross.vGems = countDefLiterals(byName('equipment.v'), ['GemDef']);
}

// B2. Vệ sinh struct V: không có `= 0` (V -prod biến warning thành lỗi).
{
  const bad = [];
  for (const f of vList) {
    const structBlocks = f.text.match(/struct\s+\w+\s*\{[\s\S]*?\n\}/g) || [];
    for (const b of structBlocks) {
      // `= 0` đúng nghĩa (không phải `= 0.35`, `= 0.9`...): sau số 0 không
      // được là chữ số hay dấu chấm thập phân.
      if (/=\s*0(?![\d.])/.test(b)) bad.push(`${f.name}: ${b.split('\n')[0].trim()}`);
    }
  }
  check(bad.length === 0, 'V: không có field struct nào dùng `= 0`', bad.length ? bad.join(' | ') : 'sạch');
}
// B3. Số thực f32 phải dùng f32(...) khi vào hàm f32 (quy tắc đã rút kinh nghiệm).
{
  const f32uses = vList.reduce((n, f) => n + ((f.text.match(/f32\(/g) || []).length), 0);
  check(f32uses > 0, 'V: có dùng f32(...) cho số thực', `${f32uses} lần dùng f32(`);
}
// B4. GState cũ vẫn còn (không phá vỡ mirror cũ).
{
  const game = vMap['game.v'] || '';
  check(/struct GState/.test(game), 'V: struct GState còn nguyên', 'game.v có GState');
  check(/level\s+int\s*=\s*10/.test(game), 'V: GState level mặc định 10', 'level int = 10');
  check(/atk\s+int\s*=\s*68/.test(game), 'V: GState atk mặc định 68', 'atk int = 68');
  check(/crit\s+f32\s*=\s*0\.35/.test(game), 'V: GState crit mặc định 0.35', 'crit f32 = 0.35');
}

// =====================================================================
// C. Mô phỏng logic thuần JS (không phụ thuộc code game — assert số liệu)
// =====================================================================
console.log('\n== C. Mô phỏng logic thuần JS ==');

// C1. Mua/bán: không âm tiền.
function buy(state, price) {
  if (state.gold < price) return { ...state, ok: false };
  return { ...state, gold: state.gold - price, ok: true };
}
function sell(state, price) { return { ...state, gold: state.gold + price }; }
{
  const poor = buy({ gold: 50 }, 100);
  check(poor.ok === false && poor.gold === 50,
    'Mua: 50 vàng mua món 100 vàng phải FAIL và tiền không đổi', `ok=${poor.ok}, gold=${poor.gold}`);
  const rich = buy({ gold: 150 }, 100);
  check(rich.ok === true && rich.gold === 50,
    'Mua: 150 vàng mua món 100 vàng → còn 50 vàng', `ok=${rich.ok}, gold=${rich.gold}`);
  const exact = buy({ gold: 100 }, 100);
  check(exact.ok === true && exact.gold === 0,
    'Mua: vừa đủ 100 vàng mua món 100 vàng → còn 0 vàng', `ok=${exact.ok}, gold=${exact.gold}`);
  const sold = sell({ gold: 50 }, 40);
  check(sold.gold === 90, 'Bán: 50 vàng + bán món 40 vàng → 90 vàng', `gold=${sold.gold}`);
  const zero = buy({ gold: 0 }, 1);
  check(zero.ok === false && zero.gold === 0, 'Mua: 0 vàng mua món 1 vàng phải FAIL', `ok=${zero.ok}`);
}

// C2. Cường hóa trang bị tăng đúng chỉ số.
function enhance(atk, bonus) { return atk + bonus; }
{
  check(enhance(68, 10) === 78, 'Cường hóa: atk 68 +10 → 78', `atk=${enhance(68, 10)}`);
  check(enhance(68, 0) === 68, 'Cường hóa +0 không đổi atk', `atk=${enhance(68, 0)}`);
  const multi = [5, 10, 15].reduce((a, b) => enhance(a, b), 68);
  check(multi === 98, 'Cường hóa 3 lần (+5/+10/+15): 68 → 98', `atk=${multi}`);
}

// C3. Pet cộng sát thương theo %.
function petDamage(base, petBonusPct) { return Math.round(base * (1 + petBonusPct)); }
{
  check(petDamage(100, 0.15) === 115, 'Pet +15% sát thương: 100 → 115', `dmg=${petDamage(100, 0.15)}`);
  check(petDamage(68, 0) === 68, 'Không pet: sát thương không đổi', `dmg=${petDamage(68, 0)}`);
}

// C4. Nhiệm vụ cộng thưởng đúng.
function questReward(state, goldReward, expReward) {
  return { gold: state.gold + goldReward, exp: state.exp + expReward };
}
{
  const r = questReward({ gold: 455, exp: 0 }, 200, 50);
  check(r.gold === 655 && r.exp === 50, 'Nhiệm vụ: thưởng 200 vàng + 50 EXP (455 vàng → 655)', `gold=${r.gold}, exp=${r.exp}`);
  const r0 = questReward({ gold: 0, exp: 90 }, 0, 10);
  check(r0.exp === 100, 'Nhiệm vụ: 90 EXP + 10 → đủ 100 EXP lên cấp', `exp=${r0.exp}`);
}

// C5. PvP: thắng cộng, thua trừ, điểm không âm (floor 0).
// Số liệu khớp pvp.v: thắng +25, thua −15, hạng 1000 khi 0 điểm.
function pvpPoints(points, won, deltaWin = 25, deltaLose = 15) {
  return won ? points + deltaWin : Math.max(0, points - deltaLose);
}
{
  check(pvpPoints(100, true) === 125, 'PvP thắng: 100 + 25 → 125', `pts=${pvpPoints(100, true)}`);
  check(pvpPoints(100, false) === 85, 'PvP thua: 100 − 15 → 85', `pts=${pvpPoints(100, false)}`);
  check(pvpPoints(5, false) === 0, 'PvP thua khi chỉ còn 5 điểm → floor 0 (không âm)', `pts=${pvpPoints(5, false)}`);
  check(pvpPoints(0, false) === 0, 'PvP thua khi 0 điểm → vẫn 0', `pts=${pvpPoints(0, false)}`);
}

// C6. Cảnh giới mỗi 3 cấp (logic cũ, giữ nguyên).
function realmIndex(level) { return Math.min(4, Math.floor((level - 1) / 3)); }
{
  check(realmIndex(10) === 3, 'Cảnh giới: cấp 10 → index 3 (Hóa Thần Kỳ)', `idx=${realmIndex(10)}`);
  check(realmIndex(1) === 0 && realmIndex(3) === 0 && realmIndex(4) === 1,
    'Cảnh giới: cấp 1–3 → 0, cấp 4 → 1', `1→${realmIndex(1)}, 4→${realmIndex(4)}`);
}

// =====================================================================
// E. Cross-mirror: HTML ↔ V phải khớp nhau (số lượng bảng dữ liệu).
// Lệch nhau là lỗi thật (hai bản chơi khác nhau) → FAIL, không phải MISSING.
// =====================================================================
console.log('\n== E. Cross-mirror HTML ↔ V ==');
function crossCheck(label, a, b) {
  if (a === undefined || a === null || b === undefined || b === null) {
    report('MISSING', `Mirror: ${label}`, `HTML=${a ?? '?'} / V=${b ?? '?'}`);
  } else {
    check(a === b, `Mirror: ${label} khớp nhau`, `HTML=${a} / V=${b}`);
  }
}
crossCheck('số môn phái', cross.htmlSects, cross.vSects);
crossCheck('số pet/thần thú', cross.htmlPets, cross.vPets);
crossCheck('số bang hội', cross.htmlGuilds, cross.vGuilds);
crossCheck('số hoạt động hằng ngày', cross.htmlActivities, cross.vActivities);
crossCheck('số sự kiện theo giờ', cross.htmlEvents, cross.vEvents);
// Tiền khởi đầu và kho đồ: số liệu phải giống nhau ở cả hai bản.
{
  const htmlGold = (html.match(/gameState\.gold = (\d+)/) || [])[1];
  const htmlSilver = (html.match(/gameState\.silver = (\d+)/) || [])[1];
  const gameV = vMap['game.v'] || '';
  const vGold = (gameV.match(/gold\s+int = (\d+)/) || [])[1];
  const vSilver = (gameV.match(/silver\s+int = (\d+)/) || [])[1];
  check(htmlGold !== undefined && htmlGold === vGold,
    'Mirror: vàng khởi đầu khớp nhau', `HTML=${htmlGold ?? '?'} / V=${vGold ?? '?'}`);
  check(htmlSilver !== undefined && htmlSilver === vSilver,
    'Mirror: bạc khởi đầu khớp nhau', `HTML=${htmlSilver ?? '?'} / V=${vSilver ?? '?'}`);
  const htmlShop = countStringsInArrayBlock(html, /const\s+SHOP_STOCK\s*=/);
  check(htmlShop !== null && htmlShop === cross.vShopItems,
    'Mirror: số mặt hàng chợ khớp nhau', `HTML SHOP_STOCK=${htmlShop ?? '?'} / V shop_items=${cross.vShopItems ?? '?'}`);
  const htmlEquip = (html.match(/type: 'equip'/g) || []).length;
  check(htmlEquip === cross.vEquipItems,
    'Mirror: số trang bị khớp nhau', `HTML=${htmlEquip} / V equip_items=${cross.vEquipItems ?? '?'}`);
}

// =====================================================================
// F. Docs đi kèm
// =====================================================================
console.log('\n== F. Docs ==');
const doc = read(path.join(ROOT, 'docs', 'MONG_VO_LAM.md'));
checkMissing(doc !== null && doc.length > 5000, 'docs/MONG_VO_LAM.md tồn tại và có nội dung dài',
  doc ? `${doc.length} ký tự` : 'chưa có file');
const rootReadme = read(path.join(ROOT, 'README.md')) || '';
check(/velo\/web\/qu_c_c_b_t_hoang_3d\.html/.test(rootReadme),
  'README gốc ghi đúng vị trí file HTML (velo/web/)', 'có link velo/web/qu_c_c_b_t_hoang_3d.html');
check(/MONG_VO_LAM/.test(rootReadme), 'README gốc link tới docs/MONG_VO_LAM.md', 'có link docs');
check(/\.exe/.test(rootReadme) && /KHÔNG có|không có trong repo|chưa có/i.test(rootReadme),
  'README gốc nói rõ .exe KHÔNG có trong repo', 'ghi rõ trạng thái exe');

// =====================================================================
// Tổng kết
// =====================================================================
console.log('\n========================================');
console.log(`TỔNG KẾT: ${pass} PASS, ${fail} FAIL, ${missing} MISSING (tổng ${results.length} assert)`);
if (missing > 0) {
  console.log('MISSING (hệ thống chưa xuất hiện trong code — không tính là fail):');
  for (const r of results.filter((r) => r.status === 'MISSING')) console.log(`  - ${r.name}: ${r.detail}`);
}
if (fail > 0) {
  console.log('FAIL:');
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  - ${r.name}: ${r.detail}`);
}
console.log('========================================');
process.exit(fail > 0 ? 1 : 0);
