/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Achievements.js
 * Thành tựu (Contract 6h): đếm kills/bosses/level/silver/
 * quests/upgrades/scenes/gold, tự lắng nghe Bus trong init().
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var D = MVL.Data;

  var A = {};
  A.counters = { kills: 0, bosses: 0, level: 0, silver: 0, quests: 0, upgrades: 0, scenes: 0, gold: 0 };

  var unlocked = {};    /* achievementId → true */
  var seenScenes = {};  /* sceneId → true (đếm scenes theo bản đồ đã đặt chân) */

  function toast(text, kind, icon) {
    try { if (typeof MVL.UI !== 'undefined' && MVL.UI.toast) MVL.UI.toast(text, kind, icon); } catch (e) {}
  }

  /* ==================== RESET / SAVE ==================== */

  A.reset = function () {
    for (var k in A.counters) A.counters[k] = 0;
    unlocked = {};
    seenScenes = {};
  };

  A.fromSave = function (a) {
    A.reset();
    if (!a || typeof a !== 'object') return;
    var c = a.counters || {};
    for (var k in A.counters) A.counters[k] = Number(c[k]) || 0;
    var ul = a.unlocked || [];
    if (Array.isArray(ul)) {
      for (var i = 0; i < ul.length; i++) unlocked[ul[i]] = true;
    } else {
      for (var id in ul) if (ul[id]) unlocked[id] = true;
    }
    var sn = a.scenesSeen || [];
    for (var j = 0; j < sn.length; j++) seenScenes[sn[j]] = true;
    /* đồng bộ cấp từ Progression (phòng save thiếu counters) */
    var PS = MVL.Progression;
    if (PS && PS.state) A.counters.level = Math.max(A.counters.level, PS.state.level || 0);
    checkUnlocks();   /* tự khắc phục save lệch — unlock phần còn thiếu */
  };

  A.exportState = function () {
    var ul = [], sn = [];
    for (var id in unlocked) if (unlocked[id]) ul.push(id);
    for (var s in seenScenes) if (seenScenes[s]) sn.push(s);
    return { counters: JSON.parse(JSON.stringify(A.counters)), unlocked: ul, scenesSeen: sn };
  };

  /* ==================== ĐẾM & MỞ KHÓA ==================== */

  A.notify = function (type, payload) {
    payload = payload || {};
    var C = A.counters;
    var PS = MVL.Progression;
    switch (type) {
      case 'kill': C.kills++; break;
      case 'boss': C.bosses++; break;
      case 'level':
        C.level = Math.max(C.level, Number(payload.level) || (PS && PS.state ? PS.state.level : 0));
        break;
      case 'gold':   /* bạc/vàng cộng dồn — đọc thống kê earned từ Progression */
        if (PS && PS.state) {
          C.silver = PS.state.silverEarned || 0;
          C.gold = PS.state.goldEarned || 0;
        }
        break;
      case 'quests':
        C.quests = (PS && PS.state) ? (PS.state.questsDone || 0) : C.quests + 1;
        break;
      case 'upgrades':
        C.upgrades = (PS && PS.state) ? (PS.state.upgrades || 0) : C.upgrades + 1;
        break;
      case 'scenes': {
        var sid = payload.id || payload.scene;
        if (sid && !seenScenes[sid]) seenScenes[sid] = true;
        if (sid) {   /* chỉ đếm bản đồ đã từng bước tới */
          var n = 0;
          for (var s in seenScenes) if (seenScenes[s]) n++;
          C.scenes = n;
        }
        break;
      }
      default: break;
    }
    checkUnlocks();
  };

  function checkUnlocks() {
    var list = D.achievements || [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (unlocked[a.id]) continue;
      var cond = a.cond || {};
      if ((A.counters[cond.k] || 0) >= cond.v) unlockOne(a);
    }
  }

  function unlockOne(a) {
    unlocked[a.id] = true;
    var rw = a.reward || {};
    var PS = MVL.Progression;
    if (rw.silver && PS) PS.addSilver(rw.silver);
    if (rw.gold && PS) PS.addGold(rw.gold);
    MVL.Bus.emit('achieve:unlock', { def: a });
    MVL.Audio.sfx('achieve');
    toast('Thành tựu: ' + a.name + ' — ' + a.desc, 'ach', a.icon);
  }

  A.list = function () {
    var out = [];
    var list = D.achievements || [];
    for (var i = 0; i < list.length; i++) {
      out.push({ def: list[i], unlocked: !!unlocked[list[i].id] });
    }
    return out;
  };

  /* ==================== LẮNG NGHE BUS ==================== */

  var _inited = false;
  A.init = function () {
    if (_inited) return;
    _inited = true;
    MVL.Bus.on('monster:death', function () { A.notify('kill'); });
    MVL.Bus.on('boss:death', function () { A.notify('boss'); });
    MVL.Bus.on('player:levelup', function (d) { A.notify('level', d || {}); });
    MVL.Bus.on('gold:change', function () { A.notify('gold'); });
    MVL.Bus.on('quest:complete', function () { A.notify('quests'); });
    MVL.Bus.on('item:upgraded', function () { A.notify('upgrades'); });
    MVL.Bus.on('scene:entered', function (d) { A.notify('scenes', d || {}); });
  };
  A.init();   /* tự lắng nghe ngay khi nạp (idempotent) */

  MVL.Achievements = A;
})(window.MVL);
