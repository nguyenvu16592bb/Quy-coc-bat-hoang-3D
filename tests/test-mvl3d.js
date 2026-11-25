#!/usr/bin/env node
/* =========================================================
 * Mộng Võ Lâm 3D — tests/test-mvl3d.js
 * Kiểm thử tích hợp dữ liệu & tài sản (không cần trình duyệt).
 * Chạy: node tests/test-mvl3d.js
 * ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) pass++;
  else { fail++; fails.push(msg); }
}

/* --- nạp Utils + Data trong sandbox có window --- */
const sandbox = { window: {}, console, Date, Math, JSON, setTimeout, clearTimeout, Map, Set, Promise };
sandbox.window.MVL = undefined;
vm.createContext(sandbox);
function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}
load('js/core/Utils.js');
load('js/data/Data.js');
const MVL = sandbox.window.MVL;
const D = MVL.Data;
ok(!!D, 'Data.js nạp được');
ok(!!MVL.Utils && !!MVL.Utils.Bus && !!MVL.Utils.RNG && !!MVL.Utils.Noise, 'Utils có Bus/RNG/Noise');

/* --- thư viện vendor --- */
const vendor = [
  'js/lib/three.min.js', 'js/lib/pixi.min.js',
  'js/lib/loaders/GLTFLoader.js', 'js/lib/loaders/DRACOLoader.js', 'js/lib/loaders/SkeletonUtils.js',
  'js/lib/post/EffectComposer.js', 'js/lib/post/RenderPass.js', 'js/lib/post/MaskPass.js',
  'js/lib/post/ShaderPass.js', 'js/lib/post/UnrealBloomPass.js',
  'js/lib/shaders/CopyShader.js', 'js/lib/shaders/LuminosityHighPassShader.js',
  'js/lib/draco/draco_decoder.js', 'js/lib/draco/draco_wasm_wrapper.js', 'js/lib/draco/draco_decoder.wasm'
];
vendor.forEach(function (f) {
  const p = path.join(ROOT, f);
  ok(fs.existsSync(p) && fs.statSync(p).size > 300, 'Thiếu/hỏng vendor: ' + f);
});

/* --- manifest model: tồn tại, đúng magic GLB, đủ dung lượng --- */
const keys = {};
(D.config.assetManifest || []).forEach(function (m) {
  keys[m.key] = true;
  const p = path.join(ROOT, m.url);
  const exists = fs.existsSync(p);
  ok(exists, 'Thiếu model: ' + m.url);
  if (exists) {
    const st = fs.statSync(p);
    ok(st.size > 20000, 'Model quá nhỏ: ' + m.url + ' (' + st.size + 'B)');
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    ok(buf.toString('ascii') === 'glTF', 'Sai magic GLB: ' + m.url);
  }
});
ok(Object.keys(keys).length >= 17, 'Manifest phải có >= 17 model (đang ' + Object.keys(keys).length + ')');

/* --- môn phái & kỹ năng --- */
const classIds = Object.keys(D.classes);
ok(classIds.length === 4, 'Phải có 4 môn phái');
classIds.forEach(function (cid) {
  const c = D.classes[cid];
  ok(c.skills.length === 4, cid + ': phải có 4 kỹ năng');
  ok(keys[c.heroModels[0]] && keys[c.heroModels[1]], cid + ': hero model không có trong manifest');
  c.skills.forEach(function (sid) {
    ok(!!D.skills[sid], cid + ': thiếu skill ' + sid);
    if (D.skills[sid]) ok(D.skills[sid].class === cid, sid + ': class không khớp ' + cid);
  });
});
Object.keys(D.skills).forEach(function (sid) {
  const s = D.skills[sid];
  ok(['melee', 'ranged', 'aoe', 'buff', 'heal', 'dash'].indexOf(s.type) >= 0, sid + ': type lạ ' + s.type);
  ok(typeof s.mp === 'number' && typeof s.cd === 'number', sid + ': thiếu mp/cd');
  if (s.class !== 'shared') ok(!!D.classes[s.class], sid + ': class không tồn tại');
});

/* --- vật phẩm --- */
const itemIds = Object.keys(D.items);
ok(itemIds.length >= 28, 'Phải có >= 28 vật phẩm (đang ' + itemIds.length + ')');
itemIds.forEach(function (iid) {
  const it = D.items[iid];
  ok(typeof it.price === 'number', iid + ': thiếu price');
  ok(it.rarity >= 0 && it.rarity <= 5, iid + ': rarity ngoài 0..5');
  if (it.type === 'weapon') {
    ok(!!D.classes[it.weaponClass], iid + ': weaponClass lạ');
    ok(it.tier === 1 || it.tier === 2, iid + ': weapon thiếu tier');
  }
});
(D.shopStock.tran_thuong || []).forEach(function (iid) {
  ok(!!D.items[iid], 'shopStock bán item không tồn tại: ' + iid);
});
(D.shopStock.tieu_nhi || []).forEach(function (iid) {
  ok(!!D.items[iid], 'shopStock Tiểu Nhi bán item lạ: ' + iid);
});
Object.keys(D.shopStock.weaponsByClass).forEach(function (cid) {
  D.shopStock.weaponsByClass[cid].forEach(function (iid) {
    ok(!!D.items[iid] && D.items[iid].weaponClass === cid, 'weaponsByClass sai: ' + cid + '/' + iid);
  });
});
ok(D.affixes.length >= 6, 'Cần >= 6 phụ thuộc cường hóa');
D.affixes.forEach(function (a) {
  ok(['atk', 'def', 'hp', 'mp', 'crit', 'spd'].indexOf(a.stat) >= 0, 'affix stat lạ: ' + a.id);
});

/* --- quái & boss --- */
const monIds = Object.keys(D.monsters);
ok(monIds.length >= 10, 'Phải có >= 10 quái (đang ' + monIds.length + ')');
monIds.forEach(function (mid) {
  const m = D.monsters[mid];
  ok(!!keys[m.model], mid + ': model không có trong manifest (' + m.model + ')');
  ok(m.hp > 0 && m.atk > 0 && m.xp > 0, mid + ': chỉ số thiếu');
  ok(Array.isArray(m.silver) && m.silver.length === 2, mid + ': thiếu silver range');
  (m.drops || []).forEach(function (d) {
    ok(!!D.items[d.id], mid + ': drop item lạ ' + d.id);
    ok(d.chance > 0 && d.chance <= 1, mid + ': drop chance sai');
  });
});
const bossIds = Object.keys(D.bosses);
ok(bossIds.length === 5, 'Phải có 5 boss (đang ' + bossIds.length + ')');
bossIds.forEach(function (bid) {
  const b = D.bosses[bid];
  ok(!!keys[b.model], bid + ': model boss không có (' + b.model + ')');
  ok(b.hp > 1000, bid + ': boss hp quá thấp');
  ok(b.phases && b.phases.length >= 2, bid + ': cần >= 2 phase');
  b.phases.forEach(function (ph) {
    ok(ph.at > 0 && ph.at < 1, bid + ': phase.at phải 0..1');
    if (ph.adds) ok(!!D.monsters[ph.adds.id], bid + ': adds quái lạ ' + ph.adds.id);
  });
  b.skills.forEach(function (sk) {
    ok(['aoe', 'charge', 'summon', 'roar'].indexOf(sk.type) >= 0, bid + ': skill type lạ');
    if (sk.type === 'summon') ok(!!D.monsters[sk.id], bid + ': summon quái lạ ' + sk.id);
  });
});

/* --- bản đồ --- */
const sceneIds = Object.keys(D.scenes);
ok(sceneIds.length === 5, 'Phải có 5 bản đồ');
sceneIds.forEach(function (sid) {
  const s = D.scenes[sid];
  ok(s.spawn && s.spawn.length === 2, sid + ': thiếu spawn');
  ok(s.terrain && s.terrain.size > 100, sid + ': terrain size sai');
  (s.npcSpawns || []).forEach(function (n) {
    ok(!!D.npcs[n.npc], sid + ': npc lạ ' + n.npc);
  });
  (s.monsterSpawns || []).forEach(function (ms) {
    ok(!!D.monsters[ms.monster], sid + ': quái lạ ' + ms.monster);
    ok(ms.count > 0 && ms.radius > 0, sid + ': spawn count/radius sai');
  });
  if (s.bossSpawn) ok(!!D.bosses[s.bossSpawn.boss], sid + ': boss lạ ' + s.bossSpawn.boss);
  if (s.bossSpawn2) ok(!!D.bosses[s.bossSpawn2.boss], sid + ': boss2 lạ ' + s.bossSpawn2.boss);
  (s.portals || []).forEach(function (p) {
    ok(!!D.scenes[p.to], sid + ': portal tới scene lạ ' + p.to);
    ok(p.to !== sid, sid + ': portal tự trỏ chính mình');
  });
});
/* mọi scene phải tiếp cận được từ mong_hanh_son (đồ thị cổng) */
(function () {
  const seen = { mong_hanh_son: true };
  const q = ['mong_hanh_son'];
  while (q.length) {
    const cur = q.shift();
    (D.scenes[cur].portals || []).forEach(function (p) {
      if (!seen[p.to]) { seen[p.to] = true; q.push(p.to); }
    });
  }
  sceneIds.forEach(function (sid) { ok(seen[sid], 'Scene không tiếp cận được: ' + sid); });
})();

/* --- NPC --- */
Object.keys(D.npcs).forEach(function (nid) {
  const n = D.npcs[nid];
  ok(!!keys[n.model], nid + ': model NPC không có (' + n.model + ')');
  ok(['quest', 'shop', 'smith', 'warp', 'food'].indexOf(n.role) >= 0, nid + ': role lạ');
});

/* --- nhiệm vụ --- */
ok(D.quests.length >= 16, 'Cần >= 16 nhiệm vụ');
const qids = {};
D.quests.forEach(function (q) { qids[q.id] = q; });
D.quests.forEach(function (q) {
  ok(!!D.npcs[q.giver], q.id + ': giver lạ ' + q.giver);
  ok(['kill', 'collect', 'talk', 'reach', 'boss'].indexOf(q.type) >= 0, q.id + ': type lạ');
  if (q.type === 'kill' || q.type === 'boss') {
    const tgt = q.type === 'kill' ? D.monsters[q.target] : D.bosses[q.target];
    ok(!!tgt, q.id + ': target quái/boss lạ ' + q.target);
  } else if (q.type === 'collect') ok(!!D.items[q.target], q.id + ': collect item lạ');
  else if (q.type === 'talk') ok(!!D.npcs[q.target], q.id + ': talk npc lạ');
  else if (q.type === 'reach') ok(!!D.scenes[q.target], q.id + ': reach scene lạ');
  ok(q.count > 0, q.id + ': count phải > 0');
  ok(q.rewards && (q.rewards.xp > 0 || q.rewards.silver > 0), q.id + ': thiếu thưởng');
  (q.rewards.items || []).forEach(function (it) {
    ok(!!D.items[it.id], q.id + ': thưởng item lạ ' + it.id);
  });
  if (q.next) ok(!!qids[q.next], q.id + ': next lạ ' + q.next);
});
ok(D.achievements.length >= 10, 'Cần >= 10 thành tựu');
D.achievements.forEach(function (a) {
  ok(['kills', 'bosses', 'level', 'silver', 'quests', 'upgrades', 'scenes', 'gold'].indexOf(a.cond.k) >= 0, a.id + ': điều kiện lạ');
  ok(a.cond.v > 0, a.id + ': ngưỡng phải > 0');
});

/* --- index.html: mọi file script trò chơi phải tồn tại --- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcs = [];
html.replace(/<script[^>]+src="([^"]+)"/g, function (_, s) { srcs.push(s.split('?')[0]); });
srcs.forEach(function (s) {
  ok(fs.existsSync(path.join(ROOT, s)), 'index.html trỏ file không tồn tại: ' + s);
});
['js/main.js', 'js/ui/HUD.js', 'js/ui/Screens.js', 'js/world/World.js',
 'js/entities/Entities.js', 'js/systems/Combat.js', 'js/systems/Effects.js',
 'js/systems/Progression.js', 'js/systems/Inventory.js', 'js/systems/Quests.js',
 'js/systems/Achievements.js', 'js/systems/Chat.js', 'css/style.css'].forEach(function (f) {
  ok(srcs.some(function (s) { return s === f; }) || f === 'css/style.css', 'index.html thiếu script: ' + f);
});
ok(fs.existsSync(path.join(ROOT, 'css/style.css')), 'Thiếu css/style.css');

/* --- tổng kết --- */
console.log('==============================================');
console.log(' MVL3D — kiểm thử dữ liệu & tài sản');
console.log(' PASS: ' + pass + '   FAIL: ' + fail);
if (fail) {
  console.log('----------------------------------------------');
  fails.slice(0, 40).forEach(function (f) { console.log('  ✗ ' + f); });
  if (fails.length > 40) console.log('  ... và ' + (fails.length - 40) + ' lỗi nữa');
}
console.log('==============================================');
process.exit(fail ? 1 : 0);
