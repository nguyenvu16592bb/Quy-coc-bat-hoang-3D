/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Inventory.js
 * Túi đồ & trang bị (Contract 6f): items[], equipment 7 slot,
 * rơi rải quái, cường hóa, mua/bán chợ, đan dược, bảo hạp.
 * Quests nạp SAU file này — gọi ngược bằng typeof check.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils;
  var D = MVL.Data;

  var INV = {};
  INV.items = [];               /* [{uid,id,qty,rarity?,affixes?,plus?,stats?}] — tham chiếu sống cho UI */
  INV.equipment = { weapon: null, helmet: null, armor: null, gloves: null, boots: null, ring: null, amulet: null };

  var SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
  var RARITY_WEIGHTS = [55, 25, 12, 6, 1.8, 0.2];

  function toast(text, kind, icon) {
    try { if (typeof MVL.UI !== 'undefined' && MVL.UI.toast) MVL.UI.toast(text, kind, icon); } catch (e) {}
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function bagSize() { return (D.config && D.config.bagSize) || 48; }
  function prog() { return (typeof MVL.Progression !== 'undefined') ? MVL.Progression : null; }
  function liveP() {
    try { return (MVL.Game && MVL.Game.currentPlayer) || (MVL.Player && MVL.Player.inst) || null; } catch (e) { return null; }
  }

  function findByUid(uid) {
    for (var i = 0; i < INV.items.length; i++) if (INV.items[i].uid === uid) return INV.items[i];
    for (var s in INV.equipment) if (INV.equipment[s] && INV.equipment[s].uid === uid) return INV.equipment[s];
    return null;
  }
  function findFirst(id) {
    for (var i = 0; i < INV.items.length; i++) if (INV.items[i].id === id) return INV.items[i];
    return null;
  }
  function displayName(it) {
    var def = D.items[it.id];
    var n = def ? def.name : it.id;
    if (it.plus) n += ' +' + it.plus;
    return n;
  }
  function affixById(id) {
    var list = D.affixes || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function consumeOne(it) {
    it.qty = (it.qty || 1) - 1;
    if (it.qty <= 0) INV.removeUid(it.uid);
  }
  function removeQty(id, n) {
    var left = n;
    for (var i = INV.items.length - 1; i >= 0 && left > 0; i--) {
      var it = INV.items[i];
      if (it.id !== id) continue;
      var take = Math.min(it.qty || 1, left);
      it.qty -= take;
      left -= take;
      if (it.qty <= 0) INV.items.splice(i, 1);
    }
    return left <= 0;
  }
  function notifyCollect(id) {
    try {
      if (typeof MVL.Quests !== 'undefined' && MVL.Quests.notify) MVL.Quests.notify('collect', { id: id });
    } catch (e) {}
  }
  function playerPos() {
    var pl = MVL.Player;
    return (pl && pl.group && pl.group.position) ? pl.group.position : null;
  }
  function healFx() {
    try {
      if (typeof MVL.FX !== 'undefined' && MVL.FX.healFx && playerPos()) MVL.FX.healFx(playerPos());
    } catch (e) {}
  }

  /* ==================== RESET / SAVE ==================== */

  INV.reset = function () {
    INV.items.length = 0;
    for (var i = 0; i < SLOTS.length; i++) INV.equipment[SLOTS[i]] = null;
  };

  INV.fromSave = function (list, equip) {
    INV.reset();
    if (Array.isArray(list)) {
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (!it || !D.items[it.id]) continue;
        var copy = clone(it);
        if (!copy.uid) copy.uid = U.uid('it');
        copy.qty = Math.max(1, Math.floor(Number(copy.qty) || 1));
        if (!Array.isArray(copy.affixes)) copy.affixes = [];
        if (!copy.plus) copy.plus = 0;
        if (!copy.stats || typeof copy.stats !== 'object') copy.stats = {};
        INV.items.push(copy);
      }
    }
    if (equip && typeof equip === 'object') {
      for (var s in INV.equipment) {
        var e = equip[s];
        if (!e || !e.id || !D.items[e.id]) continue;
        var ec = clone(e);
        if (!ec.uid) ec.uid = U.uid('eq');
        if (!Array.isArray(ec.affixes)) ec.affixes = [];
        if (!ec.plus) ec.plus = 0;
        if (!ec.stats || typeof ec.stats !== 'object') ec.stats = {};
        INV.equipment[s] = ec;
      }
    }
  };

  INV.exportState = function () {
    return { items: clone(INV.items), equipment: clone(INV.equipment) };
  };

  /* ==================== TÌM KIẾM / ĐẾM ==================== */

  INV.removeUid = function (uid) {
    for (var i = 0; i < INV.items.length; i++) {
      if (INV.items[i].uid === uid) { INV.items.splice(i, 1); return true; }
    }
    return false;
  };

  INV.count = function (id) {
    var n = 0;
    for (var i = 0; i < INV.items.length; i++) if (INV.items[i].id === id) n += INV.items[i].qty || 1;
    return n;
  };

  INV.hasItem = function (id, n) { return INV.count(id) >= (n || 1); };

  INV.firstEmptySlot = function () {
    return INV.items.length < bagSize() ? INV.items.length : -1;
  };

  /* ==================== ROLLS ==================== */

  /* rarity = base + offset theo weights [55,25,12,6,1.8,0.2], chặn trần 5 */
  function rollRarity(base) {
    base = base || 0;
    var r = Math.random() * 100, acc = 0, k = RARITY_WEIGHTS.length - 1;
    for (var i = 0; i < RARITY_WEIGHTS.length; i++) {
      acc += RARITY_WEIGHTS[i];
      if (r < acc) { k = i; break; }
    }
    return Math.min(5, base + k);
  }

  /* Trang bị nhận về là instance riêng: rarity + affixes + stats scale */
  function makeEquipInstance(def) {
    var base = def.rarity || 0;
    var rarity = rollRarity(base);
    var scale = 1 + (rarity - base) * 0.15;
    var stats = {};
    if (def.stats) {
      for (var k in def.stats) stats[k] = Math.round(def.stats[k] * scale * 100) / 100;
    }
    var affixes = [];
    if (rarity >= 2) {
      var n = Math.min(rarity - 1, (D.affixes || []).length);
      var pool = (D.affixes || []).slice();
      for (var i = 0; i < n; i++) {
        var idx = Math.floor(Math.random() * pool.length);
        affixes.push(pool[idx].id);
        pool.splice(idx, 1);
      }
    }
    return { uid: U.uid('it'), id: def.id, qty: 1, rarity: rarity, affixes: affixes, plus: 0, stats: stats };
  }

  /* ==================== THÊM VÀO TÚI ==================== */

  INV.addItem = function (id, qty) {
    var def = D.items[id];
    if (!def) return null;
    qty = Math.max(1, Math.floor(qty || 1));
    var isEquip = SLOTS.indexOf(def.type) >= 0;
    if (isEquip) {
      if (INV.items.length >= bagSize()) {
        toast('Túi đã đầy — không thể nhận ' + def.name, 'bad', '🎒');
        return null;
      }
      INV.items.push(makeEquipInstance(def));
      notifyCollect(id);
      return INV.items[INV.items.length - 1];
    }
    /* vật phẩm cộng dồn theo def.stack */
    var stack = def.stack || 1;
    var left = qty;
    for (var i = 0; i < INV.items.length && left > 0; i++) {
      var it = INV.items[i];
      if (it.id === id && !it.rarity && !it.plus && it.qty < stack) {
        var take = Math.min(stack - it.qty, left);
        it.qty += take;
        left -= take;
      }
    }
    while (left > 0) {
      if (INV.items.length >= bagSize()) {
        toast('Túi đã đầy — còn ' + left + ' ' + def.name + ' không vừa!', 'bad', '🎒');
        break;
      }
      var take2 = Math.min(stack, left);
      INV.items.push({ uid: U.uid('it'), id: id, qty: take2 });
      left -= take2;
    }
    if (left === qty) return null;   /* không nhét được gì */
    notifyCollect(id);
    return findFirst(id);
  };

  /* ==================== TRANG BỊ ==================== */

  INV.equip = function (uid) {
    var it = findByUid(uid);
    if (!it) return false;
    var def = D.items[it.id];
    if (!def) return false;
    var slot = def.type;
    if (SLOTS.indexOf(slot) < 0) {
      toast('Vật phẩm này không thể trang bị!', 'bad');
      return false;
    }
    /* vũ khí phải khớp môn phái */
    if (slot === 'weapon' && def.weaponClass) {
      var PS = prog();
      var cls = PS && PS.state ? PS.state.classId : null;
      if (cls && def.weaponClass !== cls) {
        toast(def.name + ' chỉ dành cho ' + (D.classes[def.weaponClass] ? D.classes[def.weaponClass].name : def.weaponClass) + '!', 'bad');
        MVL.Audio.sfx('error');
        return false;
      }
    }
    var old = INV.equipment[slot];
    INV.removeUid(uid);          /* gỡ khỏi túi trước — chừa chỗ cho đồ cũ trở lại */
    INV.equipment[slot] = it;
    if (old) INV.items.push(old);
    toast('Đã trang bị ' + displayName(it), 'good', def.icon);
    MVL.Audio.sfx('ui');
    return true;
  };

  INV.unequip = function (slot) {
    if (SLOTS.indexOf(slot) < 0 || !INV.equipment[slot]) return false;
    if (INV.items.length >= bagSize()) {
      toast('Túi đã đầy — không thể tháo trang bị!', 'bad', '🎒');
      return false;
    }
    INV.items.push(INV.equipment[slot]);
    INV.equipment[slot] = null;
    MVL.Audio.sfx('close');
    return true;
  };

  /* Tổng chỉ số từ trang bị: stats × (1 + plus×0.12) + affixes */
  INV.statBonus = function () {
    var b = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0, spd: 0 };
    for (var i = 0; i < SLOTS.length; i++) {
      var it = INV.equipment[SLOTS[i]];
      if (!it) continue;
      var mult = 1 + (it.plus || 0) * 0.12;
      var st = it.stats || {};
      for (var k in st) if (b[k] !== undefined) b[k] += st[k] * mult;
      var ax = it.affixes || [];
      for (var j = 0; j < ax.length; j++) {
        var af = affixById(ax[j]);
        if (af && b[af.stat] !== undefined) b[af.stat] += af.add;
      }
    }
    return b;
  };

  /* ==================== DÙNG VẬT PHẨM ==================== */

  INV.use = function (uid) {
    var it = findByUid(uid);
    if (!it) return false;
    var def = D.items[it.id];
    if (!def) return false;
    var PS = prog();
    switch (def.type) {
      case 'potion': {
        var heal = def.heal || {};
        var LP = liveP();
        if (PS && PS.state) {
          var st = PS.computeStats();
          if (heal.hp && PS.state.hp < st.hpMax) {
            var gHp = Math.min(heal.hp, st.hpMax - PS.state.hp);
            PS.state.hp = Math.min(st.hpMax, PS.state.hp + heal.hp);
            if (LP && LP.alive && typeof LP.hp === 'number') LP.hp = Math.min(LP.maxHp || st.hpMax, LP.hp + heal.hp);
            toast('+' + Math.round(gHp) + ' sinh lực', 'good', def.icon);
          }
          if (heal.mp && PS.state.mp < st.mpMax) {
            var gMp = Math.min(heal.mp, st.mpMax - PS.state.mp);
            PS.state.mp = Math.min(st.mpMax, PS.state.mp + heal.mp);
            if (LP && LP.alive && typeof LP.mp === 'number') LP.mp = Math.min(LP.maxMp || st.mpMax, LP.mp + heal.mp);
            toast('+' + Math.round(gMp) + ' nội lực', 'good', def.icon);
          }
        }
        MVL.Audio.sfx('heal');
        healFx();
        consumeOne(it);
        return true;
      }
      case 'food': {
        if (def.buff && typeof MVL.Combat !== 'undefined' && MVL.Combat.addBuff) {
          MVL.Combat.addBuff('player', { stat: def.buff.stat, mult: def.buff.mult, dur: def.buff.dur, icon: def.icon });
        }
        MVL.Audio.sfx('cast');
        toast('Dùng ' + def.name + ' — hiệu lực ' + (def.buff ? def.buff.dur : 0) + 's', 'good', def.icon);
        consumeOne(it);
        return true;
      }
      case 'revive': {
        /* không tiêu hao — chỉ "đánh dấu": Game kiểm hasReviveItem khi chết */
        toast('Hồi Sinh Đan sẽ tự phát tác dụng khi ngã xuống.', 'info', def.icon);
        return true;
      }
      case 'mount': {
        if (PS && PS.state) PS.state.mountOwned = true;
        MVL.Bus.emit('mount:unlock', { item: def.id });
        toast('Thu phục tọa mã thành công! Nhấn Z để cưỡi ngựa.', 'good', def.icon);
        MVL.Audio.sfx('achieve');
        consumeOne(it);
        return true;
      }
      case 'box': {
        var clsId = PS && PS.state ? PS.state.classId : null;
        var wb = (D.shopStock && D.shopStock.weaponsByClass) || {};
        var list = wb[clsId] || [];
        if (it.id === 'thien_nga_bao_hap') {
          if (!list[0]) { toast('Không tìm thấy vũ khí cho môn phái của ngươi!', 'bad'); return false; }
          consumeOne(it);       /* mở hạp trước để chừa slot túi */
          var w1 = INV.addItem(list[0], 1);
          toast('Mở ' + def.name + ' — nhận ' + (w1 ? displayName(w1) : 'vũ khí'), 'good', '🎁');
        } else if (it.id === 'than_binh_bao_hap') {
          if (!list[1]) { toast('Không tìm thấy thần binh cho môn phái của ngươi!', 'bad'); return false; }
          consumeOne(it);
          var w2 = INV.addItem(list[1], 1);
          INV.addItem('linh_thach', 5);
          toast('Mở ' + def.name + ' — nhận ' + (w2 ? displayName(w2) : 'thần binh') + ' + 5 Linh Thạch!', 'good', '🏆');
        } else {
          toast('Bảo hạp này chưa biết cách mở...', 'bad');
          return false;
        }
        MVL.Audio.sfx('open');
        return true;
      }
      default: {
        toast('Không thể dùng trực tiếp: ' + def.name, 'bad');
        return false;
      }
    }
  };

  /* ==================== MUA / BÁN ==================== */

  /* Bán cả chồng đang chọn: bạc = price×0.4 mỗi đơn vị */
  INV.sell = function (uid) {
    var it = findByUid(uid);
    if (!it) return false;
    var def = D.items[it.id];
    if (!def || !def.price) {
      toast('Vật phẩm này không bán được!', 'bad');
      return false;
    }
    var n = it.qty || 1;
    var silver = Math.floor(def.price * 0.4) * n;
    INV.removeUid(uid);
    var PS = prog();
    if (PS) PS.addSilver(silver);
    MVL.Audio.sfx('coin');
    toast('Bán ' + def.name + (n > 1 ? ' ×' + n : '') + ' — +' + silver + ' bạc', 'good', '🥈');
    return true;
  };

  INV.buy = function (itemId) {
    var def = D.items[itemId];
    if (!def || !def.price) {
      toast('Vật phẩm này không bán trong chợ!', 'bad');
      return false;
    }
    var PS = prog();
    if (!PS || !PS.spendSilver(def.price)) return false;
    var got = INV.addItem(itemId, 1);
    if (!got) {
      /* túi đầy — hoàn lại bạc (không tính vào silverEarned) */
      PS.state.silver += def.price;
      MVL.Bus.emit('gold:change', { silver: PS.state.silver, gold: PS.state.gold });
      return false;
    }
    MVL.Audio.sfx('coin');
    toast('Mua ' + def.name + ' — −' + def.price + ' bạc', 'good', def.icon);
    return true;
  };

  /* ==================== CƯỜNG HÓA ==================== */

  /* Thông tin chi phí — tiện cho UI hiển thị cost + chance */
  INV.upgradeInfo = function (uid) {
    var it = findByUid(uid);
    if (!it) return null;
    var plus = it.plus || 0;
    return {
      gold: Math.floor(200 * Math.pow(plus + 1, 1.35)),
      stones: plus + 1,
      chance: Math.max(0.2, 0.95 - 0.12 * plus)
    };
  };

  INV.upgrade = function (uid) {
    var it = findByUid(uid);
    if (!it) return 'fail';
    var def = D.items[it.id];
    if (!def || SLOTS.indexOf(def.type) < 0 || !def.stats) {
      toast('Chỉ cường hóa được trang bị!', 'bad');
      return 'fail';
    }
    var plus = it.plus || 0;
    var goldCost = Math.floor(200 * Math.pow(plus + 1, 1.35));
    var stoneNeed = plus + 1;
    var PS = prog();
    if (!PS || !INV.hasItem('linh_thach', stoneNeed) || PS.state.gold < goldCost) {
      toast('Cần ' + goldCost + ' vàng + ' + stoneNeed + ' Linh Thạch!', 'bad', '🔨');
      return 'no_res';
    }
    PS.spendGold(goldCost);
    removeQty('linh_thach', stoneNeed);
    var chance = Math.max(0.2, 0.95 - 0.12 * plus);
    if (Math.random() < chance) {
      it.plus = plus + 1;
      MVL.Bus.emit('item:upgraded', { name: def.name, plus: it.plus });
      MVL.Audio.sfx('upgrade');
      toast('Cường hóa thành công — ' + def.name + ' +' + it.plus + '!', 'good', '🔨');
      return 'ok';
    }
    /* thất bại: mất nguyên liệu & vàng đã tiêu */
    MVL.Audio.sfx('error');
    toast('Cường hóa thất bại — nguyên liệu tan thành khói...', 'bad', '💥');
    return 'fail';
  };

  /* ==================== RƠI RẢI ==================== */

  /* [{silver:n}|{gold:n}|{item:id, qty:n}] — elite: qty ×1.8 */
  INV.rollDrops = function (def, elite) {
    var out = [];
    if (!def) return out;
    if (def.silver) out.push({ silver: U.randInt(def.silver[0], def.silver[1]) });
    if (def.gold) out.push({ gold: U.randInt(def.gold[0], def.gold[1]) });
    var drops = def.drops || [];
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (Math.random() < (d.chance || 0)) {
        var q = U.randInt(d.qty[0], d.qty[1]);
        if (elite) q = Math.max(1, Math.round(q * 1.8));
        out.push({ item: d.id, qty: q });
      }
    }
    return out;
  };

  /* ==================== ĐAN DƯỢC / HỒI SINH ==================== */

  /* Phím R: thiếu máu → uống đan máu tốt nhất, else đan nội lực tốt nhất */
  INV.useBestPotion = function () {
    var PS = prog();
    if (!PS || !PS.state) return false;
    var st = PS.computeStats();
    var hpMiss = PS.state.hp < st.hpMax - 0.5;
    var mpMiss = PS.state.mp < st.mpMax - 0.5;
    var kind = hpMiss ? 'hp' : (mpMiss ? 'mp' : null);
    if (!kind) {
      toast('Sinh lực và nội lực đều đầy.', 'info', '💊');
      return false;
    }
    var best = null, bestV = -1;
    for (var i = 0; i < INV.items.length; i++) {
      var d = D.items[INV.items[i].id];
      if (!d || d.type !== 'potion' || !d.heal || !d.heal[kind]) continue;
      if (d.heal[kind] > bestV) { bestV = d.heal[kind]; best = INV.items[i]; }
    }
    if (!best) {
      toast(kind === 'hp' ? 'Hết đan hồi máu!' : 'Hết đan hồi nội lực!', 'bad', '💊');
      MVL.Audio.sfx('error');
      return false;
    }
    return INV.use(best.uid);
  };

  INV.hasReviveItem = function () {
    return INV.count('hoi_sinh_dan') > 0;
  };

  INV.consumeReviveItem = function () {
    if (INV.count('hoi_sinh_dan') <= 0) return false;
    removeQty('hoi_sinh_dan', 1);
    return true;
  };

  INV.reset();   /* trạng thái ban đầu: túi rỗng */
  MVL.Inventory = INV;
})(window.MVL);
