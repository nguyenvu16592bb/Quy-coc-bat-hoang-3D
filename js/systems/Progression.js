/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Progression.js
 * Tiến trình nhân vật (Contract 6e): cấp độ & kinh nghiệm,
 * bạc/vàng, điểm chỉ số, kỹ năng, cảnh giới, thống kê save.
 * Inventory/Combat được gọi CHỈ lúc runtime, có typeof check
 * phòng khi module chưa sẵn sàng.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var D = MVL.Data;

  var P = {};
  P.state = null;                 /* state đúng lược đồ mục 6e */

  var _statCache = null;
  var _statCacheAt = -1;

  function toast(text, kind, icon) {
    try { if (typeof MVL.UI !== 'undefined' && MVL.UI.toast) MVL.UI.toast(text, kind, icon); } catch (e) {}
  }

  function invalidate() { _statCache = null; _statCacheAt = -1; }

  /* ==================== TRẠNG THÁI ==================== */

  function blankState() {
    return {
      name: 'Vô Danh', classId: 'thieulam', heroModel: 'tamphong',
      level: 1, xp: 0, silver: 100, gold: 0,
      statPoints: 5, skillPoints: 1,
      alloc: { luc: 0, the: 0, nhanh: 0, noi: 0, hoi: 0 },
      skills: {},
      hp: 0, mp: 0, playtime: 0,
      kills: 0, bossesKilled: 0, questsDone: 0,
      silverEarned: 0, goldEarned: 0, upgrades: 0, mountOwned: false
    };
  }

  /* Tạo nhân vật mới: level 1, kỹ năng phái + cung_ban + than_hanh = lvl 1 */
  P.newState = function (name, classId, heroModel) {
    var s = blankState();
    var cls = D.classes[classId];
    if (cls) {
      s.classId = cls.id;
      s.heroModel = heroModel || cls.heroModels[0];
      for (var i = 0; i < cls.skills.length; i++) s.skills[cls.skills[i]] = 1;
    } else {
      s.classId = classId || s.classId;
      s.heroModel = heroModel || s.heroModel;
    }
    s.skills.cung_ban = 1;      /* đánh thường — dùng chung */
    s.skills.than_hanh = 1;     /* thân pháp — dùng chung */
    s.name = name || s.name;
    P.state = s;
    invalidate();
    var st = P.computeStats();
    s.hp = st.hpMax;
    s.mp = st.mpMax;
    return s;
  };

  /* Nạp từ save — khử dữ liệu thiếu/hỏng, luôn ra state hợp lệ */
  P.fromSave = function (ps) {
    var s = blankState();
    if (ps && typeof ps === 'object') {
      for (var k in s) {
        if (typeof ps[k] !== 'undefined' && ps[k] !== null) s[k] = ps[k];
      }
      var al = { luc: 0, the: 0, nhanh: 0, noi: 0, hoi: 0 };
      var pa = ps.alloc || {};
      for (var a in al) al[a] = Number(pa[a]) || 0;
      s.alloc = al;
      if (!s.skills || typeof s.skills !== 'object') s.skills = {};
      s.level = Math.max(1, Math.floor(Number(s.level) || 1));
      s.xp = Math.max(0, Math.floor(Number(s.xp) || 0));
      s.silver = Math.max(0, Math.floor(Number(s.silver) || 0));
      s.gold = Math.max(0, Math.floor(Number(s.gold) || 0));
      s.statPoints = Math.max(0, Math.floor(Number(s.statPoints) || 0));
      s.skillPoints = Math.max(0, Math.floor(Number(s.skillPoints) || 0));
      s.mountOwned = !!s.mountOwned;
    }
    P.state = s;
    invalidate();
    var st2 = P.computeStats();
    s.hp = Math.min(st2.hpMax, Math.max(1, Number(s.hp) || st2.hpMax));
    s.mp = Math.min(st2.mpMax, Math.max(0, Number(s.mp) || st2.mpMax));
    return s;
  };

  P.getSaveState = function () {
    if (!P.state) return null;
    return JSON.parse(JSON.stringify(P.state));
  };

  /* ==================== KINH NGHIỆM / LÊN CẤP ==================== */

  /* Kinh nghiệm cần để lên cấp tiếp theo */
  P.xpNeed = function (level) {
    return Math.floor(80 * Math.pow(Math.max(1, level), 1.5));
  };

  P.addXp = function (n) {
    if (!P.state || !(n > 0)) return;
    P.state.xp += Math.floor(n);
    var guard = 0;
    while (P.state.xp >= P.xpNeed(P.state.level) && guard++ < 999) {
      P.state.xp -= P.xpNeed(P.state.level);
      P.state.level++;
      P.state.statPoints += 5;
      P.state.skillPoints += 1;
      onLevelUp();
    }
    MVL.Bus.emit('player:xp', { level: P.state.level, xp: P.state.xp, need: P.xpNeed(P.state.level) });
  };

  function onLevelUp() {
    invalidate();
    var st = P.computeStats();
    P.state.hp = st.hpMax;      /* lên cấp hồi đầy sinh lực & nội lực */
    P.state.mp = st.mpMax;
    MVL.Audio.sfx('levelup');
    MVL.Bus.emit('player:levelup', { level: P.state.level });
    toast('Đột phá cảnh giới — đạt cấp ' + P.state.level + '! (+5 điểm chỉ số, +1 điểm kỹ năng)', 'good', '⬆️');
    if (typeof MVL.FX !== 'undefined' && MVL.FX.pillar) {
      var pl = MVL.Player;
      if (pl && pl.group && pl.group.position) MVL.FX.pillar(pl.group.position);
    }
  }

  /* ==================== BẠC / VÀNG ==================== */

  function emitGold() {
    MVL.Bus.emit('gold:change', { silver: P.state.silver, gold: P.state.gold });
  }

  P.addSilver = function (n) {
    if (!P.state || !(n > 0)) return;
    n = Math.floor(n);
    P.state.silver += n;
    P.state.silverEarned += n;   /* thống kê tổng bạc kiếm được */
    emitGold();
  };

  P.spendSilver = function (n) {
    if (!P.state) return false;
    n = Math.floor(n);
    if (P.state.silver < n) {
      toast('Không đủ bạc! Cần ' + n + ' bạc.', 'bad', '🥈');
      MVL.Audio.sfx('error');
      return false;
    }
    P.state.silver -= n;
    emitGold();
    return true;
  };

  P.addGold = function (n) {
    if (!P.state || !(n > 0)) return;
    n = Math.floor(n);
    P.state.gold += n;
    P.state.goldEarned += n;     /* thống kê tổng vàng kiếm được */
    emitGold();
  };

  P.spendGold = function (n) {
    if (!P.state) return false;
    n = Math.floor(n);
    if (P.state.gold < n) {
      toast('Không đủ vàng! Cần ' + n + ' vàng.', 'bad', '🪙');
      MVL.Audio.sfx('error');
      return false;
    }
    P.state.gold -= n;
    emitGold();
    return true;
  };

  /* canAfford(vàng) hoặc canAfford(vàng, bạc) */
  P.canAfford = function (gold, silver) {
    if (!P.state) return false;
    if (gold != null && P.state.gold < gold) return false;
    if (silver != null && P.state.silver < silver) return false;
    return true;
  };

  /* ==================== ĐIỂM CHỈ SỐ ==================== */

  var ALLOC_INFO = {
    luc:   { label: 'Lực',   hint: 'Công kích +2.5' },
    the:   { label: 'Thể',   hint: 'Sinh lực tối đa +35' },
    nhanh: { label: 'Nhanh', hint: 'Thân pháp +0.06 · Bạo kích +0.4%' },
    noi:   { label: 'Nội',   hint: 'Nội lực tối đa +25' },
    hoi:   { label: 'Hội',   hint: 'Bạo kích +0.8%' }
  };

  P.allocate = function (statId) {
    if (!P.state) return false;
    if (!ALLOC_INFO[statId]) return false;
    if (P.state.statPoints <= 0) {
      toast('Hết điểm chỉ số — hãy lên cấp để nhận thêm!', 'bad', '✦');
      MVL.Audio.sfx('error');
      return false;
    }
    P.state.statPoints--;
    P.state.alloc[statId]++;
    invalidate();
    var st = P.computeStats();
    /* tăng trần máu/nội lực thì hồi bù phần trần mới */
    if (statId === 'the') P.state.hp = Math.min(st.hpMax, P.state.hp + 35);
    if (statId === 'noi') P.state.mp = Math.min(st.mpMax, P.state.mp + 25);
    toast(ALLOC_INFO[statId].label + ' +1 (' + ALLOC_INFO[statId].hint + ')', 'good', '✦');
    MVL.Audio.sfx('ui');
    return true;
  };

  /* ==================== CHỈ SỐ TỔNG HỢP (CACHE 0.5s) ==================== */

  P.computeStats = function () {
    if (!P.state) return { hpMax: 1, mpMax: 1, atk: 1, def: 0, crit: 0, spd: 4 };
    var now = Date.now();
    if (_statCache && now - _statCacheAt < 500) {
      return { hpMax: _statCache.hpMax, mpMax: _statCache.mpMax, atk: _statCache.atk, def: _statCache.def, crit: _statCache.crit, spd: _statCache.spd };
    }
    var cls = D.classes[P.state.classId] || D.classes.thieulam;
    var lv = Math.max(0, P.state.level - 1);
    var s = {
      hpMax: (cls.base.hp  || 0) + (cls.growth.hp  || 0) * lv,
      mpMax: (cls.base.mp  || 0) + (cls.growth.mp  || 0) * lv,
      atk:   (cls.base.atk || 0) + (cls.growth.atk || 0) * lv,
      def:   (cls.base.def || 0) + (cls.growth.def || 0) * lv,
      crit:  (cls.base.crit || 0) + (cls.growth.crit || 0) * lv,
      spd:   (cls.base.spd || 4.7)
    };
    /* điểm chỉ số đã phân phối */
    var al = P.state.alloc;
    s.atk  += (al.luc   || 0) * 2.5;
    s.hpMax += (al.the   || 0) * 35;
    s.spd  += (al.nhanh || 0) * 0.06;
    s.crit += (al.nhanh || 0) * 0.4;
    s.mpMax += (al.noi   || 0) * 25;
    s.crit += (al.hoi   || 0) * 0.8;
    /* trang bị (Inventory nạp sau Progression — typeof check) */
    if (typeof MVL.Inventory !== 'undefined' && MVL.Inventory.statBonus) {
      var ib = MVL.Inventory.statBonus();
      s.atk += ib.atk || 0;
      s.def += ib.def || 0;
      s.hpMax += ib.hp || 0;
      s.mpMax += ib.mp || 0;
      s.crit += ib.crit || 0;
      s.spd += ib.spd || 0;
    }
    /* buff chiến đấu — hệ số nhân (1 = không buff), gọi lúc runtime */
    if (typeof MVL.Combat !== 'undefined' && MVL.Combat.buffStat) {
      s.atk  *= MVL.Combat.buffStat('player', 'atk');
      s.def  *= MVL.Combat.buffStat('player', 'def');
      s.hpMax *= MVL.Combat.buffStat('player', 'hpMax');
      s.mpMax *= MVL.Combat.buffStat('player', 'mpMax');
      s.crit *= MVL.Combat.buffStat('player', 'crit');
      s.spd  *= MVL.Combat.buffStat('player', 'spd');
    }
    s.hpMax = Math.max(1, Math.round(s.hpMax));
    s.mpMax = Math.max(1, Math.round(s.mpMax));
    s.atk  = Math.max(0, Math.round(s.atk * 10) / 10);
    s.def  = Math.max(0, Math.round(s.def * 10) / 10);
    s.crit = Math.max(0, s.crit);
    s.spd  = Math.max(1, s.spd);
    _statCache = s;
    _statCacheAt = now;
    return { hpMax: s.hpMax, mpMax: s.mpMax, atk: s.atk, def: s.def, crit: s.crit, spd: s.spd };
  };

  /* ==================== KỸ NĂNG ==================== */

  P.getSkillLevel = function (id) {
    return (P.state && P.state.skills[id]) || 0;
  };

  /* Tu luyện kỹ năng: tối đa cấp 5, mỗi cấp tốn 1 điểm kỹ năng */
  P.upgradeSkill = function (id) {
    if (!P.state) return false;
    var cur = P.state.skills[id] || 0;
    if (!cur) { toast('Chưa học kỹ năng này!', 'bad'); return false; }
    if (cur >= 5) {
      toast('Kỹ năng đã đạt đại thành (tối đa cấp 5)!', 'bad');
      MVL.Audio.sfx('error');
      return false;
    }
    if (P.state.skillPoints <= 0) {
      toast('Không đủ điểm kỹ năng — lên cấp để nhận thêm!', 'bad');
      MVL.Audio.sfx('error');
      return false;
    }
    P.state.skillPoints--;
    P.state.skills[id] = cur + 1;
    var sk = D.skills[id];
    toast('Tu luyện thành công: ' + (sk ? sk.name : id) + ' → cấp ' + (cur + 1), 'good', '📖');
    MVL.Audio.sfx('upgrade');
    return true;
  };

  /* ==================== CẢNH GIỚI ==================== */

  P.realm = function () {
    var realms = D.config.realms;
    var lv = P.state ? P.state.level : 1;
    return realms[Math.min(Math.floor(lv / 3), realms.length - 1)];
  };

  /* ==================== THỐNG KÊ QUA BUS ==================== */

  var _inited = false;
  P.init = function () {
    if (_inited) return;
    _inited = true;
    MVL.Bus.on('monster:death', function () { if (P.state) P.state.kills++; });
    MVL.Bus.on('boss:death', function () { if (P.state) P.state.bossesKilled++; });
    MVL.Bus.on('item:upgraded', function () { if (P.state) P.state.upgrades++; });
  };
  P.init();   /* tự lắng nghe ngay khi nạp (idempotent — main gọi lại không sao) */

  MVL.Progression = P;
})(window.MVL);
