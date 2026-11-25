/* =========================================================
 * Mộng Võ Lâm 3D — js/ui/HUD.js
 * Ba namespace trong 1 file (CONTRACT mục 6j):
 *   1) MVL.FX2D    — lớp PIXI phủ màn hình: chữ sát thương bay lên
 *   2) MVL.Minimap — bản đồ tròn 184×184 xoay theo hướng camera
 *   3) MVL.HUD     — gắn + cập nhật toàn bộ DOM HUD (mục 7)
 * IIFE + namespace window.MVL — KHÔNG ES module.
 * Giả định ghi rõ trong code:
 *   - timeOfDay 0 ↔ 08:00 (khớp badge mặc định "☀️ 08:00" trong index.html).
 *   - #minimap-compass chỉ set transform rotate (CSS sẽ định vị phần tử).
 *   - quest-tracker đánh ★ vào mục đầu tiên (khớp Quests.currentTargetPos
 *     theo chain — trackerList không mang id).
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils, Bus = MVL.Bus;

  function $id(id) { return document.getElementById(id); }

  /* ---------- helpers ghi DOM có throttle (chỉ ghi khi giá trị đổi) ---------- */
  function setTxt(el, v) {
    if (!el) return;
    v = String(v);
    if (el.__mvlT === v) return;
    el.__mvlT = v;
    el.textContent = v;
  }
  function setPct(el, pct) {
    if (!el) return;
    if (!isFinite(pct)) pct = 0;
    pct = U.clamp(pct, 0, 100);
    var r = Math.round(pct * 10) / 10;
    if (el.__mvlW === r) return;
    el.__mvlW = r;
    el.style.width = r + '%';
  }
  function toggleCls(el, cls, on) {
    if (!el) return;
    var k = '__mvlC_' + cls;
    if (el[k] === on) return;
    el[k] = on;
    el.classList.toggle(cls, on);
  }

  /* =========================================================
   * 1) MVL.FX2D — PIXI overlay trên #fx2d-canvas
   * ========================================================= */
  var FX2D = {
    app: null,
    root: null,
    _pool: [],   /* kho tái sử dụng PIXI.Text — tránh cấp phát liên tục */
    _live: []    /* các chữ đang bay */
  };
  var FX2D_MAX = 90;

  FX2D.init = function () {
    if (FX2D.app) return;
    var cv = $id('fx2d-canvas');
    if (!cv || typeof PIXI === 'undefined') return;
    FX2D.app = new PIXI.Application({
      view: cv,
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    FX2D.root = FX2D.app.stage;
  };

  /* tạo 1 mục pool: object trạng thái + PIXI.Text */
  FX2D._make = function () {
    var t = new PIXI.Text('', {
      fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
      fontSize: 18,
      fontWeight: '800',
      fill: '#ffffff',
      stroke: '#1a0e06',
      strokeThickness: 3,
      align: 'center'
    });
    t.anchor.set(0.5);
    t.visible = false;
    return { txt: t, t: 0, x0: 0, y0: 0, active: false };
  };

  /* lấy mục rảnh; pool đầy + vượt hạn mức → tái dùng chữ cũ nhất */
  FX2D._acquire = function () {
    var i;
    for (i = 0; i < FX2D._pool.length; i++) {
      if (!FX2D._pool[i].active) return FX2D._pool[i];
    }
    if (FX2D._live.length >= FX2D_MAX) {
      var old = FX2D._live.shift();
      old.active = false;
      return old;
    }
    var made = FX2D._make();
    FX2D._pool.push(made);
    return made;
  };

  /* chữ sát thương: bay lên 40px trong 0.9s rồi biến mất.
     x,y = toạ độ px CSS (từ Engine.projectToScreen) */
  FX2D.damageText = function (x, y, text, opts) {
    if (!FX2D.root) FX2D.init();
    if (!FX2D.root) return;
    opts = opts || {};
    var crit = !!opts.crit;
    var d = FX2D._acquire();
    d.txt.text = String(text) + (crit ? '!' : '');
    d.txt.style.fontSize = Math.round((opts.size || 18) * (crit ? 1.75 : 1));
    d.txt.style.fill = crit ? '#ffd700' : (opts.color || '#ffffff');
    d.x0 = x + (Math.random() * 14 - 7);
    d.y0 = y;
    d.t = 0;
    d.active = true;
    d.txt.visible = true;
    d.txt.alpha = 1;
    d.txt.scale.set(1);
    d.txt.position.set(d.x0, y);
    FX2D.root.addChild(d.txt);
    FX2D._live.push(d);
  };

  FX2D.update = function (dt) {
    if (!FX2D.root) return;
    for (var i = FX2D._live.length - 1; i >= 0; i--) {
      var d = FX2D._live[i];
      d.t += dt;
      var k = d.t / 0.9;                       /* đời sống 0.9s */
      if (k >= 1) {
        d.active = false;
        d.txt.visible = false;
        FX2D.root.removeChild(d.txt);
        FX2D._live.splice(i, 1);
        continue;
      }
      d.txt.y = d.y0 - 40 * k;                 /* bay lên 40px */
      d.txt.alpha = 1 - k;                     /* mờ dần theo 0.9s */
      var pop = d.t < 0.14 ? 1 + 0.35 * (1 - d.t / 0.14) : 1;
      d.txt.scale.set(pop);
    }
  };

  MVL.FX2D = FX2D;

  /* =========================================================
   * 2) MVL.Minimap — PIXI trên #minimap-canvas 184×184
   *    Khung tròn, nền rgba(8,12,18,.85), xoay theo camYaw
   *    (hướng camera = hướng lên trên bản đồ).
   * ========================================================= */
  var Minimap = {
    app: null,
    _bg: null, _dots: null, _arrow: null,
    _compassEl: null, _zoneEl: null, _zone: '',
    _cx: 92, _cy: 92, _rim: 88, _drawR: 82,
    _lastDeg: -999
  };

  var DOT_STYLE = {
    monster: { c: 0xff5555, r: 2.2 },   /* #ff5555 */
    elite:   { c: 0xffaa00, r: 3.1 },   /* #ffaa00 — to hơn thường */
    boss:    { c: 0xff2220, r: 5.2 },   /* #ff2220 — lớn nhất */
    npc:     { c: 0xffd700, r: 2.4 },   /* #ffd700 */
    portal:  { c: 0x7ee8ff, r: 3.4 },   /* #7ee8ff */
    quest:   { c: 0xff5ad5, r: 3.4 },   /* #ff5ad5 */
    pet:     { c: 0xaaff88, r: 2.6 },   /* #aaff88 */
    loot:    { c: 0xffee55, r: 2.0 }    /* #ffee55 */
  };

  Minimap.init = function () {
    if (Minimap.app) return;
    var cv = $id('minimap-canvas');
    if (!cv || typeof PIXI === 'undefined') return;
    Minimap.app = new PIXI.Application({
      view: cv, width: 184, height: 184,
      antialias: true, backgroundAlpha: 0,
      autoDensity: true, resolution: window.devicePixelRatio || 1
    });

    /* nền tròn + khung vàng đồng + vòng khoảng cách nhạt */
    var bg = new PIXI.Graphics();
    bg.beginFill(0x080c12, 0.85);            /* rgba(8,12,18,.85) */
    bg.drawCircle(92, 92, 88);
    bg.endFill();
    bg.lineStyle(2, 0xc9a227, 0.95);
    bg.drawCircle(92, 92, 88);
    bg.lineStyle(1, 0x33415a, 0.4);
    bg.drawCircle(92, 92, 54);
    bg.drawCircle(92, 92, 27);
    bg.moveTo(38, 92); bg.lineTo(146, 92);
    bg.moveTo(92, 38); bg.lineTo(92, 146);
    bg.lineStyle(0);
    Minimap._bg = bg;
    Minimap.app.stage.addChild(bg);

    /* lớp dot — một Graphics duy nhất, vẽ lại (clear) mỗi lần update */
    Minimap._dots = new PIXI.Graphics();
    Minimap.app.stage.addChild(Minimap._dots);

    /* mũi tên trắng của người chơi ở giữa (hướng lên mặc định) */
    var a = new PIXI.Graphics();
    a.lineStyle(1, 0x0b0e14, 0.85);
    a.beginFill(0xffffff, 0.96);
    a.moveTo(0, -8);
    a.lineTo(5.5, 6);
    a.lineTo(0, 2.5);
    a.lineTo(-5.5, 6);
    a.lineTo(0, -8);
    a.endFill();
    a.lineStyle(0);
    a.position.set(92, 92);
    Minimap._arrow = a;
    Minimap.app.stage.addChild(a);

    Minimap._compassEl = $id('minimap-compass');
    Minimap._zoneEl = $id('minimap-zone');
  };

  /* Quay điểm thế giới → màn hình:
     tiến của camera f = (−sin yaw, −cos yaw) phải map thành (0, −1) (lên),
     phép quay R(yaw): sx = c·dx − s·dz ; sy = s·dx + c·dz  (kiểm: yaw=0 OK). */
  Minimap.update = function (data) {
    if (!Minimap.app || !data || !data.player) return;
    var yaw = data.camYaw || 0;
    var c = Math.cos(yaw), s = Math.sin(yaw);
    var px = data.player.x, pz = data.player.z;
    var R = data.radius > 1 ? data.radius : 100;
    var zoom = Minimap._drawR / R;

    var g = Minimap._dots;
    g.clear();
    var ents = data.entities || [];
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      var dx = e.x - px, dz = e.z - pz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > R) {                        /* ngoài bán kính → kẹp vào rìa */
        var cl = R * 0.96 / dist;
        dx *= cl; dz *= cl;
      }
      var sx = Minimap._cx + (c * dx - s * dz) * zoom;
      var sy = Minimap._cy + (s * dx + c * dz) * zoom;
      var st = DOT_STYLE[e.type] || DOT_STYLE.monster;
      g.beginFill(st.c, e.type === 'loot' ? 0.9 : 1);
      g.drawCircle(sx, sy, st.r);
      g.endFill();
      if (e.type === 'boss') {               /* boss thêm vành sáng vàng */
        g.lineStyle(1.5, 0xffd27a, 0.85);
        g.drawCircle(sx, sy, st.r + 2.6);
        g.lineStyle(0);
      }
    }

    /* mũi tên player: hướng thân (yaw) quay trong hệ xoay camera */
    var fy = data.player.yaw || 0;
    var ax = c * Math.sin(fy) - s * Math.cos(fy);
    var ay = s * Math.sin(fy) + c * Math.cos(fy);
    Minimap._arrow.rotation = Math.atan2(ax, -ay);

    /* kim N (DOM) xoay theo camYaw; tên scene (DOM) chỉ ghi khi đổi */
    var deg = Math.round(yaw * 180 / Math.PI);
    if (deg !== Minimap._lastDeg && Minimap._compassEl) {
      Minimap._lastDeg = deg;
      Minimap._compassEl.style.transform = 'rotate(' + deg + 'deg)';
    }
    if (data.zone && data.zone !== Minimap._zone && Minimap._zoneEl) {
      Minimap._zone = data.zone;
      Minimap._zoneEl.textContent = data.zone;
    }
  };

  MVL.Minimap = Minimap;

  /* =========================================================
   * 3) MVL.HUD — gắn mọi DOM (CONTRACT mục 7) + vòng cập nhật
   * ========================================================= */
  var HUD = {
    _inited: false,
    _dom: {},
    _skillSlots: [],
    _ents: [],
    _mmData: null,
    _cast: null,
    _boss: null,
    _hurtT: 0,
    _phaseT: 0,
    _trackerSig: '',
    _buffSig: '',
    _pMp: 0,
    _tMap: 0, _tBuff: 0, _tFast: 0, _tInfo: 0, _tFps: 0, _tClock: 0,
    _lastT: -1
  };

  var BUFF_ICON = { atk: '⚔️', def: '🛡️', crit: '✨', spd: '💨', hp: '❤️', mp: '🔷' };

  var HUD_IDS = {
    hpFill: 'hp-fill', hpText: 'hp-text',
    mpFill: 'mp-fill', mpText: 'mp-text',
    xpFill: 'xp-fill', xpText: 'xp-text',
    goldText: 'gold-text', silverText: 'silver-text',
    levelBadge: 'level-badge', classBadge: 'class-badge',
    playerName: 'player-name', buffRow: 'buff-row',
    targetFrame: 'target-frame', targetName: 'target-name',
    targetLevel: 'target-level', targetHpf: 'target-hp-fill',
    targetHpText: 'target-hp-text',
    bossBar: 'boss-bar', bossName: 'boss-name', bossFill: 'boss-fill',
    bossPhase: 'boss-phase',
    castBar: 'cast-bar', castFill: 'cast-fill', castLabel: 'cast-label',
    clockBadge: 'clock-badge', fpsBadge: 'fps-badge',
    questTracker: 'quest-tracker', trackerList: 'tracker-list',
    logList: 'log-list',
    interactHint: 'interact-hint', interactLabel: 'interact-label',
    skillBar: 'skill-bar', hurtFx: 'hurt-fx'
  };

  /* ---------------- khởi tạo ---------------- */
  HUD.init = function () {
    if (HUD._inited) return;
    HUD._inited = true;

    var D = HUD._dom;
    for (var k in HUD_IDS) D[k] = $id(HUD_IDS[k]);

    FX2D.init();
    Minimap.init();

    /* dữ liệu minimap tái sử dụng — không cấp phát trong update */
    HUD._mmData = {
      player: { x: 0, z: 0, yaw: 0 },
      camYaw: 0, radius: 100,
      entities: HUD._ents,
      zone: ''
    };

    /* --- Bus theo CONTRACT mục 5: boss / hurt / cast / chat / interact --- */
    Bus.on('boss:engage', function (d) {
      HUD._boss = { name: (d && d.name) || 'Ma Đầu', maxHp: (d && d.maxHp) || 1 };
      setTxt(HUD._dom.bossName, HUD._boss.name);
      setPct(HUD._dom.bossFill, 100);
      toggleCls(HUD._dom.bossBar, 'hidden', false);
    });
    Bus.on('boss:phase', function (d) {
      setTxt(HUD._dom.bossPhase, (d && d.msg) || '');
      if (HUD._phaseT) clearTimeout(HUD._phaseT);
      HUD._phaseT = setTimeout(function () { setTxt(HUD._dom.bossPhase, ''); }, 3200);
    });
    Bus.on('boss:death', function () {
      HUD._boss = null;
      toggleCls(HUD._dom.bossBar, 'hidden', true);
    });
    Bus.on('cast:start', function (d) {
      HUD._cast = {
        dur: Math.max(0.05, (d && d.dur) || 1),
        t: 0,
        label: (d && d.label) || 'Đọc chú...'
      };
      setTxt(HUD._dom.castLabel, HUD._cast.label);
      setPct(HUD._dom.castFill, 0);
      toggleCls(HUD._dom.castBar, 'hidden', false);
    });
    Bus.on('cast:end', function () {
      HUD._cast = null;
      toggleCls(HUD._dom.castBar, 'hidden', true);
    });
    Bus.on('chat:new', function (d) {
      if (d && d.type === 'system') HUD._logLine(d);
    });
    Bus.on('interact:target', function (d) {
      var ok = !!(d && d.type && d.type !== 'none' && d.label);
      toggleCls(HUD._dom.interactHint, 'hidden', !ok);
      if (ok) setTxt(HUD._dom.interactLabel, d.label);
    });
    Bus.on('player:hurt', function () {
      var el = HUD._dom.hurtFx;
      if (!el) return;
      el.classList.add('active');
      if (HUD._hurtT) clearTimeout(HUD._hurtT);
      HUD._hurtT = setTimeout(function () { el.classList.remove('active'); }, 250);
    });

    HUD.buildSkillBar();

    /* Vòng dự phòng: main.js có thể không đăng ký HUD vào Engine loop —
       HUD tự chạy để FX2D/minimap không đóng băng.
       HUD.update có khử gọi trùng trong cùng khung hình nên an toàn khi
       main.js cũng gọi MVL.HUD.update(dt) mỗi frame. */
    if (MVL.Engine && MVL.Engine.addUpdate) {
      MVL.Engine.addUpdate(function (dt) { HUD.update(dt); });
    }
  };

  /* ---------------- skill bar ---------------- */
  /* [🗡 cơ bản][1-4 kỹ năng phái][Q thân pháp][R đan dược] */
  HUD.buildSkillBar = function () {
    var bar = HUD._dom.skillBar;
    if (!bar) return;
    bar.innerHTML = '';
    HUD._skillSlots.length = 0;

    var D = MVL.Data, P = MVL.Progression;
    var st = P && P.state;
    var cls = (D && D.classes && st) ? D.classes[st.classId] : null;

    /* đánh thường — chuột trái */
    var basic = (D && D.skills) ? D.skills.cung_ban : null;
    if (basic) {
      _addSlot(bar, basic, 'attack', '🖱️', basic.name + ' — chuột trái / giữ để liên hoàn');
    }

    /* 4 tuyệt kỹ phái — phím 1..4 */
    if (cls) {
      for (var i = 0; i < cls.skills.length; i++) {
        var sk = D.skills[cls.skills[i]];
        if (sk) _addSlot(bar, sk, 'skill' + i, '' + (i + 1), null);
      }
    }

    /* thân pháp — Q */
    var dash = (D && D.skills) ? D.skills.than_hanh : null;
    if (dash) _addSlot(bar, dash, 'dash', 'Q', null);

    /* đan dược — R */
    _addPotionSlot(bar);
  };

  function _addSlot(bar, skill, act, keyLabel, title) {
    var P = MVL.Progression;
    var lv = (P && P.getSkillLevel) ? (P.getSkillLevel(skill.id) || 1) : 1;
    var el = document.createElement('div');
    el.className = 'skill-slot';
    el.setAttribute('data-act', act);
    el.title = title || (skill.name + ' · ' + skill.mp + ' nội lực · hồi ' + skill.cd + 's');
    el.innerHTML =
      '<span class="icon">' + skill.icon + '</span>' +
      '<span class="key">' + keyLabel + '</span>' +
      '<span class="lv">' + lv + '</span>' +
      '<div class="cd-mask"></div>';
    el.addEventListener('click', function () {
      if (MVL.Input && MVL.Input.triggerAction) MVL.Input.triggerAction(act);
    });
    bar.appendChild(el);
    HUD._skillSlots.push({
      el: el,
      mask: el.querySelector('.cd-mask'),
      lvEl: el.querySelector('.lv'),
      skillId: skill.id, skill: skill, act: act,
      mp: skill.mp || 0, cdMax: skill.cd || 0,
      lv: lv | 0, pct: -1, noMp: null
    });
  }

  function _addPotionSlot(bar) {
    var el = document.createElement('div');
    el.className = 'skill-slot';
    el.setAttribute('data-act', 'potion');
    el.title = 'Đan dược — phím R (dùng đan tốt nhất trong túi)';
    el.innerHTML =
      '<span class="icon">🧪</span>' +
      '<span class="key">R</span>' +
      '<span class="lv">0</span>' +
      '<div class="cd-mask"></div>';
    el.addEventListener('click', function () {
      if (MVL.Input && MVL.Input.triggerAction) MVL.Input.triggerAction('potion');
    });
    bar.appendChild(el);
    HUD._skillSlots.push({
      el: el,
      mask: el.querySelector('.cd-mask'),
      lvEl: el.querySelector('.lv'),
      skillId: null, skill: null, act: 'potion',
      mp: 0, cdMax: 0,
      lv: -1, pct: -1, noMp: null
    });
  }

  function _potionCount() {
    var D = MVL.Data, I = MVL.Inventory;
    if (!D || !D.items || !I || !I.count) return 0;
    var n = 0;
    for (var id in D.items) {
      if (D.items[id].type === 'potion') n += I.count(id) || 0;
    }
    return n;
  }

  /* ---------------- vòng cập nhật chính ---------------- */
  HUD.update = function (dt) {
    if (!HUD._inited) return;

    /* khử gọi trùng trong cùng 1 khung hình (main + vòng dự phòng) */
    var now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
    if (now - HUD._lastT < 4) return;
    HUD._lastT = now;

    FX2D.update(dt);
    _castTick(dt);
    _barsTick();
    _targetTick();
    _bossTick();
    _skillTick();

    HUD._tBuff += dt;
    if (HUD._tBuff >= 0.25) { HUD._tBuff = 0; _buffsTick(); }

    HUD._tMap += dt;
    if (HUD._tMap >= 0.15) { HUD._tMap = 0; _minimapTick(); }

    HUD._tFast += dt;
    if (HUD._tFast >= 0.3) { HUD._tFast = 0; _fastTick(); }

    HUD._tInfo += dt;
    if (HUD._tInfo >= 0.5) {
      HUD._tInfo = 0;
      _infoTick();
      _trackerTick();
    }

    HUD._tFps += dt;
    if (HUD._tFps >= 0.5) { HUD._tFps = 0; _fpsTick(); }

    HUD._tClock += dt;
    if (HUD._tClock >= 1) { HUD._tClock = 0; _clockTick(); }
  };

  /* ---------------- cast-bar (Bus cast:start/end) ---------------- */
  function _castTick(dt) {
    if (!HUD._cast) return;
    HUD._cast.t += dt;
    setPct(HUD._dom.castFill, HUD._cast.t / HUD._cast.dur * 100);
    if (HUD._cast.t >= HUD._cast.dur + 0.5) {   /* tự ẩn nếu thiếu cast:end */
      HUD._cast = null;
      toggleCls(HUD._dom.castBar, 'hidden', true);
    }
  }

  /* ---------------- thanh hp / mp / xp ---------------- */
  function _barsTick() {
    var D = HUD._dom;
    var P = MVL.Progression;
    var st = P && P.state;
    var p = (MVL.Game && MVL.Game.currentPlayer) || null;

    var hp = 0, hpMax = 1, mp = 0, mpMax = 1;
    if (p && typeof p.hp === 'number') {
      /* ưu tiên giá trị thật của thực thể player */
      hp = p.hp;
      hpMax = p.maxHp || 1;
      mp = (typeof p.mp === 'number') ? p.mp : 0;
      mpMax = p.maxMp || 1;
    } else if (st && P.computeStats) {
      var cs = P.computeStats();
      hpMax = cs.hpMax || 1;
      mpMax = cs.mpMax || 1;
      hp = (typeof st.hp === 'number') ? st.hp : hpMax;
      mp = (typeof st.mp === 'number') ? st.mp : mpMax;
    }

    setPct(D.hpFill, hp / hpMax * 100);
    setTxt(D.hpText, Math.max(0, Math.ceil(hp)) + '/' + Math.ceil(hpMax));
    setPct(D.mpFill, mp / mpMax * 100);
    setTxt(D.mpText, Math.max(0, Math.ceil(mp)) + '/' + Math.ceil(mpMax));
    HUD._pMp = mp;

    /* kinh nghiệm: % theo next = floor(80 * level^1.5) */
    var level = (p && p.level) || (st && st.level) || 1;
    var xp = st ? (st.xp || 0) : 0;
    var next = Math.max(1, Math.floor(80 * Math.pow(level, 1.5)));
    setPct(D.xpFill, xp / next * 100);
    setTxt(D.xpText, Math.min(100, Math.floor(xp / next * 100)) + '%');
  }

  /* ---------------- target-frame (Combat.currentTarget) ---------------- */
  function _targetTick() {
    var D = HUD._dom;
    var C = MVL.Combat;
    var t = C ? C.currentTarget : null;
    var show = !!(t && t.group && t.alive && t.maxHp > 0);
    toggleCls(D.targetFrame, 'hidden', !show);
    if (!show) return;
    setTxt(D.targetName, t.name || '???');
    setTxt(D.targetLevel, 'Lv.' + (t.level | 0));
    setPct(D.targetHpf, t.hp / t.maxHp * 100);
    setTxt(D.targetHpText, Math.max(0, Math.ceil(t.hp)) + '/' + Math.ceil(t.maxHp));
  }

  /* ---------------- boss-bar: fill theo currentTarget trùng maxHp ---------------- */
  function _bossTick() {
    if (!HUD._boss) return;
    var D = HUD._dom;
    var C = MVL.Combat;
    var t = C ? C.currentTarget : null;
    if (t && t.maxHp === HUD._boss.maxHp) {
      if (t.alive) {
        setPct(D.bossFill, U.clamp(t.hp / t.maxHp * 100, 0, 100));
      } else {
        HUD._boss = null;
        toggleCls(D.bossBar, 'hidden', true);
      }
    }
  }

  /* ---------------- skill-bar: hồi chiêu + thiếu nội lực ---------------- */
  function _skillTick() {
    var C = MVL.Combat;
    var slots = HUD._skillSlots;
    var mp = HUD._pMp;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (!s.skill) continue;                  /* slot đan dược không có hồi chiêu */
      var frac = 0;
      if (C && C.getCD && s.cdMax > 0) {
        var cd = C.getCD(s.skillId);
        if (cd > 0) frac = U.clamp(cd / s.cdMax, 0, 1);
      }
      var pct = Math.round(frac * 100);
      if (pct !== s.pct) {
        s.pct = pct;
        if (pct <= 0) s.mask.style.background = '';
        else s.mask.style.background =
          'conic-gradient(rgba(4,7,12,.78) ' + pct + '%, rgba(0,0,0,0) ' + pct + '%)';
      }
      var noMp = s.mp > 0 && mp < s.mp;
      if (noMp !== s.noMp) {
        s.noMp = noMp;
        toggleCls(s.el, 'no-mp', noMp);
      }
    }
  }

  /* ---------------- buff-row (Combat.getPlayerBuffs) ---------------- */
  function _buffsTick() {
    var D = HUD._dom;
    var C = MVL.Combat;
    if (!C || !C.getPlayerBuffs || !D.buffRow) return;
    var buffs = C.getPlayerBuffs() || [];
    var sig = '';
    for (var i = 0; i < buffs.length; i++) {
      sig += (buffs[i].icon || buffs[i].stat || '?') + Math.ceil(buffs[i].remain || 0) + ';';
    }
    if (sig === HUD._buffSig) return;
    HUD._buffSig = sig;
    var html = '';
    for (var j = 0; j < buffs.length; j++) {
      var b = buffs[j];
      var icon = b.icon || BUFF_ICON[b.stat] || '✨';
      html += '<span class="buff" title="' + (b.stat || '') + ' ×' + (b.mult || 1) + '">' +
        icon + ' ' + Math.ceil(b.remain || 0) + 's</span>';
    }
    D.buffRow.innerHTML = html;
  }

  /* ---------------- minimap: cập nhật mỗi 0.15s ---------------- */
  var _entN = 0;
  function _pushEnt(x, z, type) {
    var ents = HUD._ents;
    var e = ents[_entN];
    if (!e) { e = { x: 0, z: 0, type: 'monster' }; ents[_entN] = e; }
    e.x = x; e.z = z; e.type = type;
    _entN++;
  }

  function _minimapTick() {
    if (!Minimap.app) return;
    var W = MVL.World, G = MVL.Game, Cm = MVL.Cam;
    var p = (G && G.currentPlayer) || null;
    if (!p || !p.group || !p.group.position) return;
    _entN = 0;

    /* quái còn sống: monster / elite / boss (boss = def có phases) */
    var M = MVL.Mobs;
    if (M && M.all) {
      for (var i = 0; i < M.all.length; i++) {
        var m = M.all[i];
        if (!m || !m.alive || !m.group || !m.group.position) continue;
        _pushEnt(m.group.position.x, m.group.position.z,
          (m.def && m.def.phases) ? 'boss' : (m.elite ? 'elite' : 'monster'));
      }
    }
    /* NPC */
    var N = MVL.NPCs;
    if (N && N.all) {
      for (var i2 = 0; i2 < N.all.length; i2++) {
        var npc = N.all[i2];
        if (!npc || !npc.group || !npc.group.position) continue;
        _pushEnt(npc.group.position.x, npc.group.position.z, 'npc');
      }
    }
    /* cổng dịch chuyển */
    if (W && W.getPortals) {
      var ports = W.getPortals() || [];
      for (var i3 = 0; i3 < ports.length; i3++) {
        if (ports[i3]) _pushEnt(ports[i3].x, ports[i3].z, 'portal');
      }
    }
    /* hồi vật phẩm rơi (Loot.orbs: pos hoặc group.position) */
    var L = MVL.Loot;
    if (L && L.orbs) {
      for (var i4 = 0; i4 < L.orbs.length; i4++) {
        var o = L.orbs[i4];
        var op = o ? (o.pos || (o.group && o.group.position)) : null;
        if (op) _pushEnt(op.x, op.z, 'loot');
      }
    }
    /* pet theo chủ */
    var pet = p.pet || (MVL.Entities && MVL.Entities.pet) || null;
    if (pet && pet.alive !== false && pet.group && pet.group.position) {
      _pushEnt(pet.group.position.x, pet.group.position.z, 'pet');
    }
    /* mục tiêu nhiệm vụ — chỉ khi cùng scene */
    var Q = MVL.Quests;
    if (Q && Q.currentTargetPos) {
      var qt = Q.currentTargetPos();
      if (qt && (!W || !W.currentId || qt.sceneId === W.currentId)) {
        _pushEnt(qt.x, qt.z, 'quest');
      }
    }
    HUD._ents.length = _entN;

    var radius = 100;
    if (W && W.getMinimapData) {
      var md = W.getMinimapData();
      if (md && md.radius > 1) radius = md.radius;
    }
    var camYaw = (Cm && typeof Cm.yaw === 'number') ? Cm.yaw : 0;
    var pyaw = 0;
    if (p.group.rotation && isFinite(p.group.rotation.y)) pyaw = p.group.rotation.y;

    var d = HUD._mmData;
    d.player.x = p.group.position.x;
    d.player.z = p.group.position.z;
    d.player.yaw = pyaw;
    d.camYaw = camYaw;
    d.radius = radius;
    d.zone = (W && W.def && W.def.name) || '';

    Minimap.update(d);
  }

  /* ---------------- vàng / bạc + cấp kỹ năng + đan dược (0.3s) ---------------- */
  function _fastTick() {
    var D = HUD._dom;
    var P = MVL.Progression;
    var st = P && P.state;
    if (st) {
      setTxt(D.goldText, U.fmt(st.gold || 0));
      setTxt(D.silverText, U.fmt(st.silver || 0));
    }
    var slots = HUD._skillSlots;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s.skillId && P && P.getSkillLevel) {
        var lv = P.getSkillLevel(s.skillId) | 0;
        if (lv !== s.lv) { s.lv = lv; setTxt(s.lvEl, '' + lv); }
      } else if (!s.skillId && s.act === 'potion') {
        var n = _potionCount();
        if (n !== s.lv) { s.lv = n; setTxt(s.lvEl, '' + n); }
      }
    }
  }

  /* ---------------- level / tên / phái (0.5s) ---------------- */
  function _infoTick() {
    var D = HUD._dom;
    var P = MVL.Progression;
    var st = P && P.state;
    if (!st) return;
    var p = (MVL.Game && MVL.Game.currentPlayer) || null;
    var level = (p && p.level) || st.level || 1;
    setTxt(D.levelBadge, '' + level);
    setTxt(D.playerName, st.name || 'Vô Danh');
    var cls = (MVL.Data && MVL.Data.classes) ? MVL.Data.classes[st.classId] : null;
    if (cls) {
      setTxt(D.classBadge, cls.icon + ' ' + cls.name);
      if (D.classBadge.__mvlColor !== cls.color) {
        D.classBadge.__mvlColor = cls.color;
        D.classBadge.style.color = cls.color;
      }
    }
    if (P && P.realm) {
      var realm = P.realm();
      if (realm && D.levelBadge.__mvlRealm !== realm) {
        D.levelBadge.__mvlRealm = realm;
        D.levelBadge.title = 'Cảnh giới: ' + realm;
      }
    }
  }

  /* ---------------- quest-tracker (0.5s) — mục đầu là mục đang làm ★ ------- */
  function _trackerTick() {
    var D = HUD._dom;
    var Q = MVL.Quests;
    if (!Q || !Q.trackerList) return;
    var list = Q.trackerList() || [];
    var sig = '';
    for (var i = 0; i < list.length; i++) {
      sig += list[i].text + '~' + list[i].prog + '/' + list[i].count + ';';
    }
    if (sig === HUD._trackerSig) return;
    HUD._trackerSig = sig;
    var ul = D.trackerList;
    if (!ul) return;
    ul.innerHTML = '';
    for (var j = 0; j < list.length; j++) {
      var li = document.createElement('li');
      li.textContent = (j === 0 ? '★ ' : '') + list[j].text +
        ' — ' + (list[j].prog | 0) + '/' + (list[j].count | 0);
      ul.appendChild(li);
    }
    toggleCls(D.questTracker, 'hidden', list.length === 0);
  }

  /* ---------------- fps-badge (0.5s) ---------------- */
  function _fpsTick() {
    var E = MVL.Engine;
    if (E && E.stats) setTxt(HUD._dom.fpsBadge, E.stats.fps + ' FPS');
  }

  /* ---------------- clock-badge: ☀️/🌙 + HH:MM (1s) ---------------- */
  function _clockTick() {
    var W = MVL.World;
    var tod = (W && typeof W.timeOfDay === 'number') ? W.timeOfDay : 0;
    if (tod < 0) tod = 0;
    if (tod > 1) tod -= Math.floor(tod);
    /* mốc: timeOfDay 0 = 08:00 sáng — khớp badge mặc định trong index.html */
    var hour = (tod * 24 + 8) % 24;
    var hh = Math.floor(hour);
    var mm = Math.floor((hour - hh) * 60);
    var icon = (hour >= 6 && hour < 18) ? '☀️' : '🌙';
    setTxt(HUD._dom.clockBadge, icon + ' ' + U.pad2(hh) + ':' + U.pad2(mm));
  }

  /* ---------------- system-log: Bus chat:new (type system), tối đa 30 dòng -- */
  HUD._logLine = function (d) {
    var ul = HUD._dom.logList;
    if (!ul) return;
    var li = document.createElement('li');
    li.textContent = (d.author ? d.author + ': ' : '') + (d.text || '');
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 30) ul.removeChild(ul.lastChild);
    /* dòng cũ mờ dần */
    var kids = ul.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.opacity = Math.max(0.3, 1 - i * 0.045).toFixed(2);
    }
  };

  /* ---------------- tự gắn khi DOM sẵn sàng ----------------
     main.js không gọi HUD.init() nên HUD tự khởi tạo; nếu có nơi khác
     gọi MVL.HUD.init() thì cờ _inited chặn khởi tạo kép. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { HUD.init(); });
  } else {
    HUD.init();
  }

  MVL.HUD = HUD;
})(window.MVL);
