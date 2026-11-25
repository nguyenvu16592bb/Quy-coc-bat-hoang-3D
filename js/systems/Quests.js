/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Quests.js
 * Nhiệm vụ (Contract 6g): nhận/tiến độ/hoàn thành, chuỗi tự
 * động, điểm chỉ đường minimap. Tự lắng nghe Bus các sự kiện
 * kill / boss / talk / reach; collect kiểm theo Inventory.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var D = MVL.Data;

  var Q = {};
  Q.active = [];    /* [{id, prog}] — tham chiếu sống cho UI */
  Q.done = [];      /* [questId] */

  var _gen = 0;     /* chặn chuỗi nhiệm vụ cũ chui vào save mới */

  function toast(text, kind, icon) {
    try { if (typeof MVL.UI !== 'undefined' && MVL.UI.toast) MVL.UI.toast(text, kind, icon); } catch (e) {}
  }
  function questById(id) {
    var list = D.quests || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isActive(id) {
    for (var i = 0; i < Q.active.length; i++) if (Q.active[i].id === id) return true;
    return false;
  }
  function isDoneId(id) { return Q.done.indexOf(id) >= 0; }
  function playerLevel() {
    var PS = MVL.Progression;
    return (PS && PS.state) ? PS.state.level : 1;
  }

  /* ==================== RESET / SAVE ==================== */

  Q.reset = function () {
    Q.active.length = 0;
    Q.done.length = 0;
    _gen++;
  };

  Q.fromSave = function (q) {
    Q.reset();
    if (!q) return;
    var act = Array.isArray(q.active) ? q.active : [];
    for (var i = 0; i < act.length; i++) {
      var e = act[i];
      if (!e || !questById(e.id) || isDoneId(e.id)) continue;
      Q.active.push({ id: e.id, prog: Math.max(0, Math.floor(Number(e.prog) || 0)) });
    }
    var dn = Array.isArray(q.done) ? q.done : [];
    for (var j = 0; j < dn.length; j++) {
      if (questById(dn[j]) && !isDoneId(dn[j])) Q.done.push(dn[j]);
    }
  };

  Q.exportState = function () {
    return { active: JSON.parse(JSON.stringify(Q.active)), done: Q.done.slice() };
  };

  /* ==================== NHẬN NHIỆM VỤ ==================== */

  Q.accept = function (id, silent) {
    var def = questById(id);
    if (!def) return false;
    if (isActive(id)) {
      if (!silent) { toast('Đang làm nhiệm vụ này rồi!', 'bad'); MVL.Audio.sfx('error'); }
      return false;
    }
    if (isDoneId(id)) return false;
    if (playerLevel() < def.minLevel) {
      if (!silent) {
        toast('Cần đạt cấp ' + def.minLevel + ' mới nhận được nhiệm vụ này.', 'bad');
        MVL.Audio.sfx('error');
      }
      return false;
    }
    /* collect: tiến độ tính sẵn theo số vật phẩm đang có trong túi */
    var prog = (def.type === 'collect' && MVL.Inventory)
      ? Math.min(def.count, MVL.Inventory.count(def.target))
      : 0;
    var entry = { id: id, prog: prog };
    Q.active.push(entry);
    MVL.Bus.emit('quest:accept', { def: def });
    if (!silent) {
      MVL.Audio.sfx('quest');
      toast('Nhận nhiệm vụ: ' + def.name, 'quest', '📜');
    }
    MVL.Bus.emit('quest:update');
    if (entry.prog >= def.count) completeEntry(entry, def);
    return true;
  };

  Q.isActive = isActive;

  /* Nhiệm vụ có thể nhận tại NPC: đúng giver, chưa nhận/xong, đủ cấp */
  Q.getAvailableFor = function (npcId) {
    var out = [];
    var list = D.quests || [];
    for (var i = 0; i < list.length; i++) {
      var def = list[i];
      if (def.giver !== npcId) continue;
      if (isDoneId(def.id) || isActive(def.id)) continue;
      if (playerLevel() < def.minLevel) continue;
      out.push(def);
    }
    return out;
  };

  /* ==================== TIẾN ĐỘ ==================== */

  function bossTargetId(p) {
    if (!p) return null;
    if (typeof p.id === 'string') return p.id;
    if (p.def && p.def.id) return p.def.id;
    if (p.name) {
      for (var id in D.bosses) if (D.bosses[id].name === p.name) return id;
    }
    return null;
  }
  function npcTargetId(p) {
    var npc = p && p.npc;
    if (!npc) return null;
    return (typeof npc === 'string') ? npc : (npc.id || null);
  }
  function sceneTargetId(p) {
    if (!p) return null;
    if (typeof p.scene === 'string') return p.scene;
    return (p.scene && p.scene.id) || p.id || null;
  }

  /* notify('kill'|'boss'|'talk'|'reach'|'collect', payload) — sau mỗi
   * notify đều kiểm lại collect theo Inventory.count(target) */
  Q.notify = function (type, payload) {
    payload = payload || {};
    var changed = false;
    var snap = Q.active.slice();
    for (var i = 0; i < snap.length; i++) {
      var e = snap[i];
      var def = questById(e.id);
      if (!def) continue;
      if (type === 'kill' && def.type === 'kill' && def.target === payload.id) {
        e.prog++; changed = true;
      } else if (type === 'boss' && def.type === 'boss' && def.target === bossTargetId(payload)) {
        e.prog++; changed = true;
      } else if (type === 'talk' && def.type === 'talk' && def.target === npcTargetId(payload)) {
        e.prog = def.count; changed = true;
      } else if (type === 'reach' && def.type === 'reach' && def.target === sceneTargetId(payload)) {
        e.prog = def.count; changed = true;
      }
    }
    /* collect: đếm theo số lượng thật trong túi */
    if (MVL.Inventory) {
      var snap2 = Q.active.slice();
      for (var j = 0; j < snap2.length; j++) {
        var e2 = snap2[j];
        var d2 = questById(e2.id);
        if (!d2 || d2.type !== 'collect') continue;
        var c = Math.min(d2.count, MVL.Inventory.count(d2.target));
        if (c !== e2.prog) { e2.prog = c; changed = true; }
      }
    }
    if (changed) MVL.Bus.emit('quest:update');
    var doneList = Q.active.slice();
    for (var k = 0; k < doneList.length; k++) {
      var d3 = questById(doneList[k].id);
      if (d3 && doneList[k].prog >= d3.count) completeEntry(doneList[k], d3);
    }
  };

  /* ==================== HOÀN THÀNH ==================== */

  function completeEntry(entry, def) {
    if (Q.active.indexOf(entry) < 0) return;   /* đã xong ở vòng lồng khác */
    Q.active.splice(Q.active.indexOf(entry), 1);
    if (!isDoneId(def.id)) Q.done.push(def.id);
    var rw = def.rewards || {};
    var PS = MVL.Progression;
    if (PS && PS.state) {
      if (rw.xp) PS.addXp(rw.xp);
      if (rw.silver) PS.addSilver(rw.silver);
      if (rw.gold) PS.addGold(rw.gold);
      PS.state.questsDone++;                  /* đếm trước khi emit để thành tựu kịp đọc */
    }
    if (rw.items && MVL.Inventory) {
      for (var i = 0; i < rw.items.length; i++) {
        MVL.Inventory.addItem(rw.items[i].id, rw.items[i].qty || 1);
      }
    }
    MVL.Bus.emit('quest:complete', { def: def });
    MVL.Audio.sfx('quest');
    toast('Hoàn thành nhiệm vụ: ' + def.name, 'quest', '📜');
    MVL.Bus.emit('quest:update');
    /* chuỗi nhiệm vụ: def.next auto — tự nhận sau 1.2s */
    if (def.next && def.auto) {
      var g = _gen;
      setTimeout(function () {
        if (g !== _gen) return;
        var next = questById(def.next);
        if (!next || isActive(def.next) || isDoneId(def.next)) return;
        if (Q.accept(def.next, true)) {
          toast('Nhiệm vụ mới: ' + next.name, 'quest', '📜');
        }
      }, 1200);
    }
  }

  /* ==================== TRACKER / CHỈ ĐƯỜNG ==================== */

  Q.trackerList = function () {
    var out = [];
    for (var i = 0; i < Q.active.length; i++) {
      var def = questById(Q.active[i].id);
      if (!def) continue;
      out.push({
        text: def.name,
        prog: Math.min(Q.active[i].prog, def.count),
        count: def.count,
        def: def
      });
    }
    return out;
  };

  /* Vị trí mục tiêu cho minimap: center spawn quái / vị trí NPC /
   * tọa độ cổng dẫn tới scene reach — tra trực tiếp Data.scenes */
  Q.currentTargetPos = function () {
    for (var i = 0; i < Q.active.length; i++) {
      var def = questById(Q.active[i].id);
      if (!def) continue;
      var pos = locateTarget(def);
      if (pos) return pos;
    }
    return null;
  };

  function locateTarget(def) {
    var scenes = D.scenes || {};
    var sid, i, j;
    if (def.type === 'kill') {
      for (sid in scenes) {
        var ms = scenes[sid].monsterSpawns || [];
        for (i = 0; i < ms.length; i++) {
          if (ms[i].monster === def.target) return { x: ms[i].center[0], z: ms[i].center[1], sceneId: sid };
        }
      }
    } else if (def.type === 'boss') {
      for (sid in scenes) {
        var bs = scenes[sid].bossSpawn, bs2 = scenes[sid].bossSpawn2;
        if (bs && bs.boss === def.target) return { x: bs.x, z: bs.z, sceneId: sid };
        if (bs2 && bs2.boss === def.target) return { x: bs2.x, z: bs2.z, sceneId: sid };
      }
    } else if (def.type === 'talk') {
      for (sid in scenes) {
        var ns = scenes[sid].npcSpawns || [];
        for (i = 0; i < ns.length; i++) {
          if (ns[i].npc === def.target) return { x: ns[i].x, z: ns[i].z, sceneId: sid };
        }
      }
    } else if (def.type === 'collect') {
      /* tìm quái rơi vật phẩm này để chỉ hướng */
      for (sid in scenes) {
        var ms2 = scenes[sid].monsterSpawns || [];
        for (i = 0; i < ms2.length; i++) {
          var mdef = D.monsters[ms2[i].monster];
          if (!mdef || !mdef.drops) continue;
          for (j = 0; j < mdef.drops.length; j++) {
            if (mdef.drops[j].id === def.target) return { x: ms2[i].center[0], z: ms2[i].center[1], sceneId: sid };
          }
        }
      }
    } else if (def.type === 'reach') {
      /* cổng dẫn tới scene đích — ưu tiên cổng đang ở scene hiện tại */
      var cur = (typeof MVL.World !== 'undefined' && MVL.World.currentId) || null;
      var fallback = null;
      for (sid in scenes) {
        var ps = scenes[sid].portals || [];
        for (i = 0; i < ps.length; i++) {
          if (ps[i].to !== def.target) continue;
          var pos = { x: ps[i].x, z: ps[i].z, sceneId: sid };
          if (sid === cur) return pos;
          if (!fallback) fallback = pos;
        }
      }
      return fallback;
    }
    return null;
  }

  /* ==================== LẮNG NGHE BUS ==================== */

  var _inited = false;
  Q.init = function () {
    if (_inited) return;
    _inited = true;
    MVL.Bus.on('monster:death', function (d) {
      Q.notify('kill', { id: d && d.def ? d.def.id : null, elite: !!(d && d.elite) });
    });
    MVL.Bus.on('boss:death', function (d) { Q.notify('boss', d || {}); });
    MVL.Bus.on('npc:interact', function (d) { Q.notify('talk', { npc: d ? d.npc : null }); });
    MVL.Bus.on('scene:entered', function (d) { Q.notify('reach', { scene: d ? d.id : null }); });
  };
  Q.init();   /* tự lắng nghe ngay khi nạp (idempotent) */

  MVL.Quests = Q;
})(window.MVL);
