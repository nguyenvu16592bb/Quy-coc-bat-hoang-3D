/* =========================================================
 * Mộng Võ Lâm 3D — js/entities/Entities.js
 * Thực thể: Entity (nameplate 256×64), Player, Monster, Boss,
 * NPC, Pet + quản lý MVL.Mounts / MVL.Mobs / MVL.NPCs / MVL.Loot.
 * (Theo CONTRACT.md mục 3, 4, 5, 6b — IIFE, không ES module)
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var D = MVL.Data;
  var U = MVL.Utils;

  var RESPAWN_TIME = 22;   // giây hồi sinh quái thường (boss không hồi sinh)
  var ENGAGE_DIST = 14;    // boss kích hoạt trận đấu khi player tới gần
  var PICKUP_DIST = 3.2;   // orb tự bay về player
  var PET_AURA_DIST = 6;   // aura Coco nhặt đồ hộp chủ
  var COLLECT_DIST = 1.0;  // khoảng chạm để nhặt
  var LOOT_LIFETIME = 60;  // orb tự biến mất sau N giây
  var NP_THROTTLE = 0.2;   // giây giữa 2 lần vẽ lại nameplate

  var _v1 = new THREE.Vector3();

  /* ===================== TIỆN ÍCH CHUNG ===================== */

  function getPlayer() { return (MVL.Player && MVL.Player.inst) || null; }

  function groundAt(x, z) {
    if (MVL.World && MVL.World.ready && MVL.World.getHeight) return MVL.World.getHeight(x, z);
    return 0;
  }

  function wrapAngle(d) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /* quay nhóm entity về hướng di chuyển (dx, dz) */
  function faceDir(e, dx, dz, dt, rate) {
    var t = Math.atan2(dx, dz), c = e.group.rotation.y;
    e.group.rotation.y = c + wrapAngle(t - c) * Math.min(1, rate * dt);
  }

  function faceToward(e, tx, tz, dt, rate) { faceDir(e, tx - e.pos.x, tz - e.pos.z, dt, rate); }

  /* đi thẳng về điểm; trả về khoảng cách còn lại */
  function stepToward(e, tx, tz, spd, dt) {
    var dx = tx - e.pos.x, dz = tz - e.pos.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1e-4) return 0;
    var s = Math.min(spd * dt, d);
    e.pos.x += (dx / d) * s;
    e.pos.z += (dz / d) * s;
    faceDir(e, dx, dz, dt, 10);
    return d - s;
  }

  /* điểm ngẫu nhiên trong vòng tròn, tránh mặt nước nếu có thể */
  function randInCircle(cx, cz, r) {
    for (var t = 0; t < 3; t++) {
      var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
      var x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      if (!(MVL.World && MVL.World.isWater && MVL.World.isWater(x, z))) return { x: x, z: z };
    }
    return { x: cx, z: cz };
  }

  /* ===================== NAMEPLATE (canvas 256×64) ===================== */

  function createNameplate() {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var tex = new THREE.CanvasTexture(cv);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearFilter;
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    var spr = new THREE.Sprite(mat);
    spr.renderOrder = 60;
    return { cv: cv, ctx: cv.getContext('2d'), tex: tex, mat: mat, sprite: spr };
  }

  /* vẽ: tên (màu npColor) + Lv + thanh máu; chỉ gọi khi dirty */
  function drawNameplate(e) {
    var np = e._np;
    if (!np) return;
    var ctx = np.ctx;
    ctx.clearRect(0, 0, 256, 64);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var f = 19;
    ctx.font = 'bold ' + f + 'px "Be Vietnam Pro",Arial,sans-serif';
    while (f > 12 && ctx.measureText(e.name).width > 168) { f--; ctx.font = 'bold ' + f + 'px "Be Vietnam Pro",Arial,sans-serif'; }
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(8,10,16,0.9)';
    ctx.strokeText(e.name, 124, 18);
    ctx.fillStyle = e.npColor || '#ffffff';
    ctx.fillText(e.name, 124, 18);
    ctx.font = '11px "Be Vietnam Pro",Arial,sans-serif';
    ctx.textAlign = 'right'; ctx.lineWidth = 2;
    ctx.strokeText('Lv.' + e.level, 250, 19);
    ctx.fillStyle = '#d9e6ff';
    ctx.fillText('Lv.' + e.level, 250, 19);
    var bw = 176, bx = (256 - bw) / 2, by = 42, bh = 11;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    var pct = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 0;
    ctx.fillStyle = pct > 0.5 ? '#4cd964' : (pct > 0.25 ? '#ffb347' : '#ff4d5e');
    ctx.fillRect(bx, by, bw * pct, bh);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(201,162,39,0.85)';
    ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
    np.tex.needsUpdate = true;
  }

  /* ===================== ENTITY (lớp nền) ===================== */

  class Entity {
    constructor(opts) {
      opts = opts || {};
      this.name = opts.name || '???';
      this.level = opts.level || 1;
      this.team = opts.team || 'neutral';
      this.maxHp = opts.maxHp || opts.hp || 100;
      this.hp = opts.hp != null ? opts.hp : this.maxHp;
      this.alive = true;
      this.group = new THREE.Group();
      this.pos = this.group.position;
      if (MVL.Engine && MVL.Engine.entityRoot) MVL.Engine.entityRoot.add(this.group);
      this._np = createNameplate();
      this.npColor = opts.npColor || '#ffffff';
      this.npW = opts.npW || 2.4;
      this.npH = opts.npH || 0.6;
      this._np.sprite.scale.set(this.npW, this.npH, 1);
      this.group.add(this._np.sprite);
      this._npH = opts.npHeight || 2;
      this._np.sprite.position.y = this._npH;
      this._npDirty = true;
      this._npT = 0;
      this.model = null;
      this.modelGroup = null;
    }

    setNameplateHeight(h) { this._npH = h; this._np.sprite.position.y = h; }

    /* trừ máu + nháy model + chữ sát thương 2D + nameplate; hết máu → die() */
    takeDamage(amount, opts) {
      if (!this.alive) return 0;
      opts = opts || {};
      amount = Math.max(1, Math.round(amount));
      this.hp -= amount;
      this._npDirty = true;
      var hex = 0x991111;
      if (opts.color) { try { hex = new THREE.Color(opts.color).getHex(); } catch (e) { hex = 0x991111; } }
      if (this.modelGroup && MVL.Assets && MVL.Assets.flash) MVL.Assets.flash(this.modelGroup, hex, 0.16);
      if (MVL.FX2D && MVL.FX2D.damageText && MVL.Engine && MVL.Engine.projectToScreen) {
        _v1.set(this.pos.x, this.pos.y + (this._npH || 2) * 0.85, this.pos.z);
        var s = MVL.Engine.projectToScreen(_v1);
        if (s && s.visible) {
          MVL.FX2D.damageText(s.x, s.y, String(amount), { color: opts.crit ? '#ffd700' : (opts.color || '#ffffff'), size: opts.crit ? 26 : 18, crit: !!opts.crit });
        }
      }
      if (this.hp <= 0) { this.hp = 0; this.die(); }
      return amount;
    }

    heal(n) {
      if (!this.alive || !(n > 0)) return 0;
      var before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + n);
      var got = this.hp - before;
      if (got > 0) this._npDirty = true;
      return got;
    }

    /* khoảng cách ngang mặt đất XZ */
    distanceTo(other) { return U.dist2D(this.pos.x, this.pos.z, other.pos.x, other.pos.z); }

    die() { if (!this.alive) return; this.alive = false; this.hp = 0; this._npDirty = true; }

    update(dt) {
      this._npT -= dt;
      if (this._npDirty && this._npT <= 0) { drawNameplate(this); this._npDirty = false; this._npT = NP_THROTTLE; }
    }

    /* gỡ khỏi scene + bỏ theo dõi anim + dọn texture tự tạo */
    destroy() {
      if (this.modelGroup && MVL.Assets) MVL.Assets.untrack(this.modelGroup);
      if (this._np) { this._np.tex.dispose(); this._np.mat.dispose(); }
      if (this.group.parent) this.group.parent.remove(this.group);
    }
  }

  /* ===================== PLAYER ===================== */

  class Player extends Entity {
    constructor(opts) {
      opts = opts || {};
      super({ name: opts.name || 'Vô Danh', level: opts.level || 1, team: 'player', hp: 1, maxHp: 1, npColor: '#cfe3ff' });
      this._inited = false;
      this.npW = 2.2; this.npH = 0.55;
      this._np.sprite.scale.set(2.2, 0.55, 1);
      this.setNameplateHeight(2.15);
      this.vy = 0; this.onGround = true;
      this.dashT = 0; this.dashSpeed = 0; this.dashColor = '#bfe8ff';
      this.dashDir = { x: 0, z: -1 };
      this.lastMoveX = 0; this.lastMoveZ = -1;
      this._interT = 0; this._regenT = 0; this._statsT = 0.5;
      this.interactTarget = null;
      this.mounted = false;
      this.mountInst = null;
      this._horseRun = 'run';
      this.pet = null;
      this._animSt = ''; this._bobT = 0;
      this._hasClips = false;
      this._hasAttackClip = false; this._attackClip = null;
      this.mp = 0; this.maxMp = 1;
      this.stats = null; this.spd = 5;
      if (opts && opts.classId) this.init(opts);
    }

    /* init({name, classId, heroModel, level, hp, mp, pos}) */
    init(o) {
      o = o || {};
      this.classId = o.classId || 'thieulam';
      var cls = D.classes[this.classId] || D.classes.thieulam;
      this.name = o.name || 'Vô Danh';
      this.level = o.level || 1;
      this.heroModel = o.heroModel || cls.heroModels[0];
      var inst = MVL.Assets.instantiate(this.heroModel, { height: 1.75 });
      this.model = inst;
      this.modelGroup = inst.group;
      this.group.add(this.modelGroup);
      this._hasClips = !!(inst.anims && inst.anims.length);
      var an = inst.anims || [];
      for (var i = 0; i < an.length; i++) {
        var a = an[i].toLowerCase();
        if (!this._hasAttackClip && (a.indexOf('attack') >= 0 || a.indexOf('punch') >= 0 || a.indexOf('slash') >= 0 || a.indexOf('kick') >= 0)) {
          this._hasAttackClip = true; this._attackClip = an[i];
        }
      }
      this.applyStats();
      this.hp = o.hp != null ? Math.min(o.hp, this.maxHp) : this.maxHp;
      this.mp = o.mp != null ? Math.min(o.mp, this.maxMp) : this.maxMp;
      var px = 0, pz = 0;
      if (o.pos) {
        px = o.pos.x != null ? o.pos.x : (o.pos[0] || 0);
        pz = o.pos.z != null ? o.pos.z : (o.pos[1] || 0);
      }
      this.pos.set(px, groundAt(px, pz), pz);
      this.group.rotation.y = Math.PI; /* mặt hướng -Z, lưng về camera */
      if (MVL.Cam && MVL.Cam.follow) MVL.Cam.follow(this.group);
      if (MVL.Pet && !this.pet) this.pet = new MVL.Pet(this);
      if (this._hasClips) this.model.playAnim('idle');
      this._npDirty = true;
      this._inited = true;
      MVL.Player.inst = this;
    }

    /* đồng bộ maxHp/maxMp/spd từ Progression.computeStats() (cache 0.5s) */
    applyStats() {
      var s = null;
      try {
        if (MVL.Progression && MVL.Progression.computeStats) s = MVL.Progression.computeStats();
      } catch (e) { s = null; }
      if (!s) { /* dự phòng khi Progression chưa sẵn sàng */
        var c = D.classes[this.classId] || D.classes.thieulam;
        var L = Math.max(0, (this.level || 1) - 1);
        s = { hpMax: c.base.hp + c.growth.hp * L, mpMax: c.base.mp + c.growth.mp * L, atk: c.base.atk + c.growth.atk * L, def: c.base.def + c.growth.def * L, crit: c.base.crit + c.growth.crit * L, spd: c.base.spd };
      }
      this.stats = s;
      this.spd = s.spd || 5;
      var oldMax = this.maxHp;
      this.maxHp = Math.max(1, Math.round(s.hpMax));
      this.maxMp = Math.max(1, Math.round(s.mpMax));
      if (this.alive && this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
      if (this.hp > this.maxHp) this.hp = this.maxHp;
      if (this.mp > this.maxMp) this.mp = this.maxMp;
      if (this.hp < 0) this.hp = 0;
      this._npDirty = true;
    }

    basicAttack() {
      if (!this.alive) return false;
      if (this._hasAttackClip && this.model) this.model.playAnim(this._attackClip, { loop: false, fade: 0.06 });
      return !!(MVL.Combat && MVL.Combat.playerBasicAttack && MVL.Combat.playerBasicAttack());
    }

    castSkill(i) {
      if (!this.alive) return false;
      return !!(MVL.Combat && MVL.Combat.castPlayerSkill && MVL.Combat.castPlayerSkill(i));
    }

    /* lướt nhanh về hướng đang facing; FX.trail chạy trong lúc lướt */
    execDash(dist, color) {
      if (!this.alive || !dist || this.dashT > 0) return false;
      var dx = this.lastMoveX, dz = this.lastMoveZ;
      if (!dx && !dz) { dx = Math.sin(this.group.rotation.y); dz = Math.cos(this.group.rotation.y); }
      var l = Math.sqrt(dx * dx + dz * dz) || 1;
      this.dashDir.x = dx / l;
      this.dashDir.z = dz / l;
      this.dashSpeed = dist / 0.18;
      this.dashT = 0.18;
      this.dashColor = color || '#bfe8ff';
      if (MVL.Audio) MVL.Audio.sfx('dash');
      return true;
    }

    /* main.js gọi khi nhấn E — NPC phát 'npc:interact', cổng do main tự xử lý */
    performInteract() {
      var t = this.interactTarget;
      if (!t) return null;
      if (t.type === 'npc' && MVL.Bus) MVL.Bus.emit('npc:interact', { npc: t.ref });
      return t;
    }

    mountUp() {
      if (this.mounted || !this.alive) return false;
      var owned = MVL.Progression && MVL.Progression.state && MVL.Progression.state.mountOwned;
      if (!owned) {
        if (MVL.UI && MVL.UI.toast) MVL.UI.toast('Ngươi chưa thu phục tọa kỵ — Hắc Tuấn Mã còn trên Tuyết Lĩnh!', 'bad');
        return false;
      }
      if (!this.mountInst) {
        this.mountInst = MVL.Mounts.createHorse();
        this.group.add(this.mountInst.group);
        var an = this.mountInst.anims || [];
        for (var i = 0; i < an.length; i++) {
          if (an[i].toLowerCase().indexOf('gallop') >= 0) { this._horseRun = an[i]; break; }
        }
      }
      this.mountInst.group.visible = true;
      this.mountInst.stopAnim();
      this.modelGroup.position.y = 0.92; /* ngồi trên lưng ngựa */
      this.mounted = true;
      this.setNameplateHeight(3.1);
      this._animSt = '';
      if (MVL.Audio) MVL.Audio.sfx('upgrade');
      if (MVL.FX && MVL.FX.dust) MVL.FX.dust(this.pos);
      return true;
    }

    dismount(silent) {
      if (!this.mounted) return;
      this.mounted = false;
      if (this.mountInst) this.mountInst.group.visible = false;
      this.modelGroup.position.y = 0;
      this.setNameplateHeight(2.15);
      this._animSt = '';
      if (!silent) {
        if (MVL.Audio) MVL.Audio.sfx('ui');
        if (MVL.FX && MVL.FX.dust) MVL.FX.dust(this.pos);
      }
    }

    toggleMount() { if (this.mounted) this.dismount(); else this.mountUp(); }

    /* quét NPC (2.4m) + cổng (2.8m) mỗi 0.15s, chỉ phát Bus khi đổi mục tiêu */
    _scanInteract() {
      var best = null, bd = 1e9;
      var npcs = MVL.NPCs ? MVL.NPCs.all : null;
      if (npcs) {
        for (var i = 0; i < npcs.length; i++) {
          var n = npcs[i];
          if (!n.alive) continue;
          var d = U.dist2D(this.pos.x, this.pos.z, n.pos.x, n.pos.z);
          if (d < 2.4 && d < bd) { bd = d; best = { type: 'npc', label: n.name, ref: n }; }
        }
      }
      if (MVL.World && MVL.World.ready && MVL.World.getPortals) {
        var ps = MVL.World.getPortals();
        for (var j = 0; j < ps.length; j++) {
          var p = ps[j];
          var d2 = U.dist2D(this.pos.x, this.pos.z, p.x, p.z);
          if (d2 < 2.8 && d2 < bd) { bd = d2; best = { type: 'portal', label: p.label + (p.reqLevel ? ' · Cấp ' + p.reqLevel : ''), ref: p }; }
        }
      }
      var cur = this.interactTarget;
      var same = (best && cur && best.type === cur.type && best.ref === cur.ref) || (!best && !cur);
      if (!same) {
        this.interactTarget = best;
        if (MVL.Bus) MVL.Bus.emit('interact:target', best || { type: 'none', label: '', ref: null });
      }
    }

    /* không có clip animation: bob theo tốc độ + nghiêng người nhẹ */
    _updateAnim(dt, moving, running) {
      var mg = this.modelGroup;
      if (this._hasClips) {
        var st = 'idle';
        if (!this.mounted && moving) st = running ? 'run' : 'walk';
        if (st !== this._animSt) { this._animSt = st; this.model.playAnim(st, { fade: 0.18 }); }
      } else {
        this._bobT += dt * (moving ? (running ? 11 : 8) : 3);
        var amp = moving ? (running ? 0.09 : 0.06) : 0.02;
        mg.position.y = Math.abs(Math.sin(this._bobT)) * amp;
        mg.rotation.z = Math.sin(this._bobT) * 0.05 * (moving ? 1 : 0.25);
        mg.rotation.x = moving ? 0.07 : 0;
      }
    }

    takeDamage(amount, opts) {
      if (!this.alive) return 0;
      opts = opts || {};
      var dealt = super.takeDamage(amount, opts);
      if (MVL.Bus) MVL.Bus.emit('player:hurt', { amount: dealt, crit: !!opts.crit, source: opts.source || null });
      if (MVL.Cam && MVL.Cam.shake) MVL.Cam.shake(0.1, 0.18);
      return dealt;
    }

    die() {
      if (!this.alive) return;
      this.alive = false;
      this.hp = 0;
      this._npDirty = true;
      this.dashT = 0;
      if (this.mounted) this.dismount(true);
      this.group.visible = false; /* ẩn model */
      this.interactTarget = null;
      if (MVL.Bus) MVL.Bus.emit('interact:target', { type: 'none', label: '', ref: null });
      if (MVL.Audio) MVL.Audio.sfx('death');
      if (MVL.Bus) MVL.Bus.emit('player:death', { pos: { x: this.pos.x, z: this.pos.z } });
    }

    /* hồi sinh 50% máu tại vị trí cho trước, hiện lại model */
    revive(pos) {
      if (pos) {
        this.pos.x = pos.x != null ? pos.x : (pos[0] || 0);
        this.pos.z = pos.z != null ? pos.z : (pos[1] || 0);
      }
      this.pos.y = groundAt(this.pos.x, this.pos.z);
      this.hp = Math.max(1, Math.round(this.maxHp * 0.5));
      this.mp = Math.round(this.maxMp * 0.5);
      this.alive = true;
      this.group.visible = true;
      this.vy = 0; this.onGround = true; this.dashT = 0;
      this._npDirty = true;
      if (MVL.Audio) MVL.Audio.sfx('revive');
      if (MVL.FX && MVL.FX.pillar) MVL.FX.pillar(this.pos, { color: '#7ce0ff' });
      if (this.pet) {
        this.pet.alive = true;
        this.pet.hp = this.pet.maxHp;
        this.pet.group.visible = true;
        this.pet._npDirty = true;
      }
    }

    update(dt) {
      super.update(dt);
      if (this.pet) this.pet.update(dt);
      if (!this._inited || !this.alive) return;

      this._statsT -= dt;
      if (this._statsT <= 0) { this._statsT = 0.5; this.applyStats(); }

      var ax = MVL.Input ? MVL.Input.axis() : { x: 0, z: 0 };
      var sprint = MVL.Input ? MVL.Input.sprinting() : false;
      var inWater = !!(MVL.World && MVL.World.isWater && MVL.World.isWater(this.pos.x, this.pos.z));
      var moving = false, running = false;

      if (this.dashT > 0) {
        /* đang lướt: đi thẳng theo hướng dash */
        this.dashT -= dt;
        var st = this.dashSpeed * dt;
        this.pos.x += this.dashDir.x * st;
        this.pos.z += this.dashDir.z * st;
        faceDir(this, this.dashDir.x, this.dashDir.z, dt, 20);
        if (MVL.FX && MVL.FX.trail) MVL.FX.trail(this.pos, this.dashColor);
        moving = true; running = true;
        if (this.dashT <= 0) { this.lastMoveX = this.dashDir.x; this.lastMoveZ = this.dashDir.z; }
      } else {
        /* di chuyển camera-relative: tiến = (-sin yaw, -cos yaw) */
        var az = ax.z, axx = ax.x;
        if (az !== 0 || axx !== 0) {
          var yaw = MVL.Cam ? MVL.Cam.yaw : 0;
          var fx = -Math.sin(yaw), fz = -Math.cos(yaw);
          var rx = -fz, rz = fx; /* phải = xoay tiến -90° */
          var dx = fx * az + rx * axx, dz = fz * az + rz * axx;
          var l = Math.sqrt(dx * dx + dz * dz);
          if (l > 1e-5) { dx /= l; dz /= l; }
          var spd = this.spd * (sprint ? D.config.sprintMult : 1) * (this.mounted ? 2 : 1) * (inWater ? 0.45 : 1);
          this.pos.x += dx * spd * dt;
          this.pos.z += dz * spd * dt;
          faceDir(this, dx, dz, dt, 12);
          this.lastMoveX = dx;
          this.lastMoveZ = dz;
          moving = true;
          running = sprint;
        }
      }

      /* trọng lực + nhảy */
      if (this.dashT <= 0 && MVL.Input && MVL.Input.consumeJump && MVL.Input.consumeJump() && this.onGround && !this.mounted) {
        this.vy = D.config.jumpVel;
        this.onGround = false;
      }
      this.vy += D.config.gravity * dt;
      var ny = this.pos.y + this.vy * dt;
      var g = groundAt(this.pos.x, this.pos.z);
      if (ny <= g) {
        if (!this.onGround && this.vy < -7 && MVL.FX && MVL.FX.dust) MVL.FX.dust(this.pos);
        ny = g; this.vy = 0; this.onGround = true;
      } else {
        this.onGround = false;
      }
      this.pos.y = ny;

      /* quét mục tiêu tương tác 0.15s một lần */
      this._interT -= dt;
      if (this._interT <= 0) { this._interT = 0.15; this._scanInteract(); }

      /* hồi phục 1%/2s */
      this._regenT += dt;
      if (this._regenT >= 2) {
        this._regenT -= 2;
        if (this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.01); this._npDirty = true; }
        if (this.mp < this.maxMp) this.mp = Math.min(this.maxMp, this.mp + this.maxMp * 0.01);
      }

      this._updateAnim(dt, moving, running);

      /* ngựa chạy theo tốc độ di chuyển */
      if (this.mounted && this.mountInst) {
        if (moving) this.mountInst.playAnim(this._horseRun, { fade: 0.15 });
        else this.mountInst.stopAnim();
      }
    }
  }

  /* ===================== MONSTER ===================== */

  class Monster extends Entity {
    /* constructor(def, {x, z, level, elite}) */
    constructor(def, opts) {
      opts = opts || {};
      var elite = !!opts.elite && !!(def.elite && def.elite.hpMult);
      var lvl = opts.level || def.level || 1;
      var maxHp = Math.max(1, Math.round(def.hp * (elite ? def.elite.hpMult : 1)));
      super({ name: (elite ? '✦ ' : '') + def.name, level: lvl, team: 'monster', hp: maxHp, maxHp: maxHp, npColor: elite ? '#ffd700' : '#e6ecff' });
      this.def = def;
      this.elite = elite;
      this.isBoss = false;
      this.atk = def.atk * (elite ? def.elite.atkMult : 1);
      this.defStat = def.def || 0;
      this.speed = def.speed || 3;
      this.aggroR = def.aggro || 0;
      this.attackRange = def.attackRange || 2;
      this.attackCd = def.attackCd || 2;
      this.wanderR = def.wander || 0;
      this.leash = def.leash || 26;
      this.fly = def.fly || 0;
      this.state = 'idle';
      this.cdT = U.rand(0.2, 0.8);
      this._idleT = U.rand(0.4, 1.6);
      this.home = { x: opts.x || 0, z: opts.z || 0 };
      this.wTarget = { x: this.home.x, z: this.home.z };
      this.animMap = def.animMap || {};
      this._lastAnim = null;
      this._animHold = 0;
      this._flyT = U.rand(0, 6.28);
      var inst = MVL.Assets.instantiate(def.model, { height: def.height || 1.75 });
      this.model = inst;
      this.modelGroup = inst.group;
      this.group.add(this.modelGroup);
      if (def.tint) inst.setTint(def.tint);
      if (elite) this.modelGroup.scale.multiplyScalar(1.35);
      this.npW = elite ? 2.9 : 2.4;
      this.npH = elite ? 0.72 : 0.6;
      this._np.sprite.scale.set(this.npW, this.npH, 1);
      this.setNameplateHeight((def.height || 1.75) + (elite ? 0.55 : 0.4) + (this.fly > 0 ? 0.3 : 0));
      this.pos.set(this.home.x, groundAt(this.home.x, this.home.z), this.home.z);
      this._npDirty = true;
    }

    _setState(s) { this.state = s; this._lastAnim = null; }

    /* bị đánh → tức thì truy sát (kể cả quái thụ động aggro 0) */
    takeDamage(amount, opts) {
      var wasAlive = this.alive;
      super.takeDamage(amount, opts);
      if (wasAlive && this.alive && (this.state === 'idle' || this.state === 'wander' || this.state === 'return' || this.state === 'flee')) {
        this._setState('chase');
      }
    }

    _strike(target) {
      var an = this.animMap.attack;
      if (an && this.model.anims.indexOf(an) >= 0) {
        this.model.playAnim(an, { loop: false, fade: 0.05 });
        this._lastAnim = an;
        this._animHold = 0.45;
      }
      if (MVL.Combat && MVL.Combat.monsterAttack) MVL.Combat.monsterAttack(this, target);
    }

    _updateAnim() {
      if (this._animHold > 0) return;
      var st = this.state;
      var kind = (st === 'idle' || st === 'attack') ? 'idle' : (st === 'wander' ? 'walk' : 'run');
      var name = this.animMap[kind];
      if (!name) {
        var an = this.model.anims;
        for (var i = 0; i < an.length; i++) {
          if (an[i].toLowerCase().indexOf(kind) >= 0) { name = an[i]; break; }
        }
      }
      if (!name || name === this._lastAnim) return;
      this._lastAnim = name;
      this.model.playAnim(name, { fade: 0.18 });
    }

    /* FSM: idle/wander → chase → attack → flee → return */
    fsmUpdate(dt) {
      var P = getPlayer();
      var Pok = !!(P && P.alive);
      var dP = Pok ? U.dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z) : 1e9;
      var dH = U.dist2D(this.pos.x, this.pos.z, this.home.x, this.home.z);
      var st = this.state;

      if (st === 'idle' || st === 'wander') {
        if (this.aggroR > 0 && Pok && dP < this.aggroR) {
          this._setState('chase');
        } else if (!this.isBoss) {
          if (st === 'idle') {
            this._idleT -= dt;
            if (this._idleT <= 0) {
              var a = Math.random() * Math.PI * 2, r = Math.random() * this.wanderR;
              this.wTarget.x = this.home.x + Math.cos(a) * r;
              this.wTarget.z = this.home.z + Math.sin(a) * r;
              this._setState('wander');
            }
          } else if (stepToward(this, this.wTarget.x, this.wTarget.z, this.speed * 0.55, dt) < 0.5) {
            this._setState('idle');
            this._idleT = U.rand(1.2, 3.5);
          }
        }
      } else if (st === 'chase') {
        if (!Pok || dH > this.leash) this._setState('return');
        else if (dP <= this.attackRange) this._setState('attack');
        else stepToward(this, P.pos.x, P.pos.z, this.speed, dt);
      } else if (st === 'attack') {
        if (!Pok || dH > this.leash) this._setState('return');
        else if (dP > this.attackRange * 1.25) this._setState('chase');
        else {
          faceToward(this, P.pos.x, P.pos.z, dt, 8);
          this.cdT -= dt;
          if (this.cdT <= 0) {
            this.cdT = this.attackCd * U.rand(0.9, 1.15);
            this._strike(P);
          }
        }
      } else if (st === 'flee') {
        if (!Pok || dH > this.leash) this._setState('return');
        else {
          var ax = this.pos.x - P.pos.x, az = this.pos.z - P.pos.z;
          var l = Math.sqrt(ax * ax + az * az) || 1;
          stepToward(this, this.pos.x + (ax / l) * 5, this.pos.z + (az / l) * 5, this.speed * 1.15, dt);
        }
      } else if (st === 'return') {
        if (dH < 0.8) {
          this._setState('idle');
          this._idleT = U.rand(0.5, 1.5);
          this.hp = this.maxHp;
          this._npDirty = true;
        } else {
          stepToward(this, this.home.x, this.home.z, this.speed * 1.05, dt);
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.4 * dt);
          this._npDirty = true;
        }
      }

      /* bỏ chạy khi máu thấp nếu def.flee */
      if ((st === 'chase' || st === 'attack') && this.def.flee && this.hp < this.maxHp * 0.2) this._setState('flee');

      /* cao độ: lượn + bob sin (fly) hoặc bám đất */
      var g = groundAt(this.pos.x, this.pos.z);
      if (this.fly > 0) {
        this._flyT += dt;
        var ty = g + this.fly + Math.sin(this._flyT * 1.7) * 0.35;
        this.pos.y += (ty - this.pos.y) * Math.min(1, dt * 4);
      } else {
        this.pos.y = g;
      }
    }

    update(dt) {
      super.update(dt);
      if (!this.alive) return;
      if (this._animHold > 0) this._animHold -= dt;
      this.fsmUpdate(dt);
      this._updateAnim();
    }

    die() {
      if (!this.alive) return;
      this.alive = false;
      this.hp = 0;
      this._npDirty = true;
      if (this.pending) this.pending.length = 0;
      if (this.chargeT) this.chargeT = 0;
      if (MVL.Audio) MVL.Audio.sfx('death');
      if (MVL.Assets) MVL.Assets.untrack(this.modelGroup);
      if (MVL.FX && MVL.FX.dissolve) MVL.FX.dissolve(this.group, this.isBoss ? 1.6 : 1.1);
      if (MVL.Bus) {
        MVL.Bus.emit('monster:death', { def: this.def, elite: this.elite, pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z } });
        if (this.isBoss) MVL.Bus.emit('boss:death', { name: this.name });
      }
      if (MVL.Loot) MVL.Loot.drop(this.pos, this.def, this.elite);
    }
  }

  /* ===================== BOSS ===================== */

  class Boss extends Monster {
    constructor(def, opts) {
      opts = opts || {};
      opts.elite = false;
      super(def, opts);
      this.isBoss = true;
      this.engaged = false;
      this.phaseIdx = 0;
      this.unlocked = {};
      this.skillT = [];
      var skills = def.skills || [];
      for (var i = 0; i < skills.length; i++) this.skillT.push(U.rand(1.5, 3));
      this.pending = [];   /* telegraph AOE chờ nổ */
      this.chargeT = 0;
      this.chargeVX = 0;
      this.chargeVZ = 0;
      this.chargeHit = false;
      this.chargeSkill = null;
      this.enraged = false;
      this.npW = 3.4; this.npH = 0.85;
      this._np.sprite.scale.set(3.4, 0.85, 1);
      this.npColor = '#ff9d6b';
      this.setNameplateHeight((def.height || 2) + 0.9);
      this._npDirty = true;
    }

    update(dt) {
      Entity.prototype.update.call(this, dt); /* nameplate */
      if (!this.alive) return;
      if (this._animHold > 0) this._animHold -= dt;
      this._bossLogic(dt);
      if (this.chargeT > 0) this._chargeMove(dt);
      else this.fsmUpdate(dt);
      this._tickPending(dt);
      this._updateAnim();
    }

    _bossLogic(dt) {
      var P = getPlayer();
      if (!(P && P.alive)) return;
      var dP = U.dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z);

      /* kích hoạt trận đấu khi player vào 14m */
      if (!this.engaged) {
        if (dP <= ENGAGE_DIST) {
          this.engaged = true;
          if (MVL.Audio) MVL.Audio.sfx('boss');
          if (MVL.Bus) MVL.Bus.emit('boss:engage', { name: this.name, maxHp: this.maxHp });
        }
        return;
      }

      /* giai đoạn theo % máu: thông báo + triệu adds + mở khóa chiêu */
      var phs = this.def.phases || [];
      while (this.phaseIdx < phs.length && this.hp <= this.maxHp * phs[this.phaseIdx].at) {
        var ph = phs[this.phaseIdx++];
        if (MVL.Bus) MVL.Bus.emit('boss:phase', { msg: ph.msg });
        if (MVL.Audio) MVL.Audio.sfx('roar');
        if (MVL.FX && MVL.FX.ring) MVL.FX.ring(this.pos, { radius: 3, color: '#ff5533', duration: 0.9 });
        if (ph.adds && MVL.Mobs) MVL.Mobs.spawnAdd(ph.adds.id, this.pos, { count: ph.adds.count });
        var unl = ph.skills || [];
        for (var u = 0; u < unl.length; u++) this.unlocked[unl[u]] = true;
      }

      /* cuồng hóa dưới 10% máu, đúng 1 lần */
      if (!this.enraged && this.hp < this.maxHp * 0.1) {
        this.enraged = true;
        this.speed *= 1.5;
        this.atk *= 1.3;
        if (MVL.Bus) MVL.Bus.emit('boss:phase', { msg: this.name + ' cuồng hóa — sát khí phủ trời!' });
        if (MVL.Audio) MVL.Audio.sfx('roar');
        if (MVL.Assets) MVL.Assets.flash(this.modelGroup, 0xff2222, 0.7);
        this._npDirty = true;
      }

      if (this.chargeT > 0) return;
      if (dP > Math.max(this.aggroR, 16)) return;

      /* dùng chiêu theo cd riêng từng skill */
      var skills = this.def.skills || [];
      for (var i = 0; i < skills.length; i++) {
        var s = skills[i];
        this.skillT[i] -= dt;
        if (this.skillT[i] > 0 || !this.unlocked[s.type]) continue;
        if (this._castSkill(s, P, dP)) this.skillT[i] = s.cd * U.rand(0.95, 1.1);
      }
    }

    _castSkill(s, P, dP) {
      if (s.type === 'aoe') {
        if (dP > s.radius + 7) return false;
        /* telegraph vòng đỏ tại vị trí player, nổ sau 1.1s */
        var tx = P.pos.x, tz = P.pos.z;
        if (MVL.FX && MVL.FX.ring) {
          MVL.FX.ring(new THREE.Vector3(tx, groundAt(tx, tz) + 0.05, tz), { radius: s.radius, color: '#ff3b30', duration: 1.1, telegraph: true });
        }
        this.pending.push({ t: 1.1, x: tx, z: tz, r: s.radius, mult: s.mult });
        if (MVL.Audio) MVL.Audio.sfx('cast');
        return true;
      }
      if (s.type === 'charge') {
        if (dP < 2.5 || dP > 14) return false;
        /* lao về player: đi trọn quãng đường trong 0.5s */
        var dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z;
        this.chargeVX = dx / 0.5;
        this.chargeVZ = dz / 0.5;
        this.chargeT = 0.5;
        this.chargeHit = false;
        this.chargeSkill = s;
        faceToward(this, P.pos.x, P.pos.z, 1, 999);
        if (MVL.Audio) MVL.Audio.sfx('dash');
        return true;
      }
      if (s.type === 'summon') {
        if (MVL.Mobs) MVL.Mobs.spawnAdd(s.id, this.pos, { count: s.count || 2 });
        if (MVL.Audio) MVL.Audio.sfx('cast');
        if (MVL.FX && MVL.FX.ring) MVL.FX.ring(this.pos, { radius: 2.2, color: '#b06aff', duration: 0.7 });
        return true;
      }
      if (s.type === 'roar') {
        if (dP > 14) return false;
        if (s.buff && MVL.Combat && MVL.Combat.addBuff) MVL.Combat.addBuff(this, s.buff);
        if (MVL.Audio) MVL.Audio.sfx('roar');
        if (MVL.FX && MVL.FX.ring) MVL.FX.ring(this.pos, { radius: 3.2, color: '#ffcf6a', duration: 0.7 });
        return true;
      }
      return false;
    }

    _chargeMove(dt) {
      this.chargeT -= dt;
      this.pos.x += this.chargeVX * dt;
      this.pos.z += this.chargeVZ * dt;
      this.pos.y = groundAt(this.pos.x, this.pos.z);
      if (MVL.FX && MVL.FX.trail) MVL.FX.trail(this.pos, '#ff7a4d');
      var P = getPlayer();
      if (P && P.alive && !this.chargeHit) {
        var d = U.dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z);
        if (d < this.attackRange + 0.5) {
          this.chargeHit = true;
          if (MVL.Combat && MVL.Combat.monsterAttack) MVL.Combat.monsterAttack(this, P, this.chargeSkill);
          if (MVL.FX && MVL.FX.hit) MVL.FX.hit(P.pos, { color: '#ff5533' });
        }
      }
    }

    _tickPending(dt) {
      for (var i = this.pending.length - 1; i >= 0; i--) {
        var p = this.pending[i];
        p.t -= dt;
        if (p.t <= 0) {
          this.pending.splice(i, 1);
          if (MVL.Combat && MVL.Combat.areaAttack) {
            MVL.Combat.areaAttack({ pos: { x: p.x, y: groundAt(p.x, p.z) + 0.1, z: p.z }, radius: p.r, team: 'monster', dmg: p.mult * this.atk, source: this, color: '#ff3b30' });
          }
          if (MVL.Audio) MVL.Audio.sfx('aoe');
        }
      }
    }
  }

  /* ===================== NPC ===================== */

  class NPC extends Entity {
    /* constructor(def, {x, z}) — def từ Data.npcs */
    constructor(def, opts) {
      opts = opts || {};
      super({ name: def.name, level: def.level || 1, team: 'npc', hp: 100, maxHp: 100, npColor: '#ffd700' });
      this.def = def;
      this.id = def.id;
      this.role = def.role;
      this.wanderR = def.wander || 0;
      this.home = { x: opts.x || 0, z: opts.z || 0 };
      this.wTarget = { x: this.home.x, z: this.home.z };
      this._idleT = U.rand(1, 3);
      this._wandering = false;
      this._animSt = '';
      var inst = MVL.Assets.instantiate(def.model, { height: def.height || 1.75 });
      this.model = inst;
      this.modelGroup = inst.group;
      this.group.add(this.modelGroup);
      if (def.tint) inst.setTint(def.tint);
      this.npW = 2.4; this.npH = 0.6;
      this._np.sprite.scale.set(2.4, 0.6, 1);
      this.setNameplateHeight((def.height || 1.75) + 0.45);
      this.pos.set(this.home.x, groundAt(this.home.x, this.home.z), this.home.z);
      this._npDirty = true;
      if (inst.anims && inst.anims.length) inst.playAnim('idle');
    }

    interact() {
      if (MVL.Bus) MVL.Bus.emit('npc:interact', { npc: this });
      return this;
    }

    update(dt) {
      super.update(dt);
      if (!this.alive) return;
      var moving = false;
      /* đi dạo nhẹ quanh nhà nếu def.wander > 0 */
      if (this.wanderR > 0) {
        if (this._wandering) {
          if (stepToward(this, this.wTarget.x, this.wTarget.z, 1.1, dt) < 0.35) {
            this._wandering = false;
            this._idleT = U.rand(2.5, 6);
          } else {
            moving = true;
          }
        } else {
          this._idleT -= dt;
          if (this._idleT <= 0) {
            var a = Math.random() * Math.PI * 2, r = Math.random() * this.wanderR;
            this.wTarget.x = this.home.x + Math.cos(a) * r;
            this.wTarget.z = this.home.z + Math.sin(a) * r;
            this._wandering = true;
          }
        }
      }
      /* quay mặt nhìn người chơi khi lại gần */
      var P = getPlayer();
      if (P && P.alive && U.dist2D(this.pos.x, this.pos.z, P.pos.x, P.pos.z) < 4) faceToward(this, P.pos.x, P.pos.z, dt, 6);
      if (this.model.anims.length) {
        var st = moving ? 'walk' : 'idle';
        if (st !== this._animSt) { this._animSt = st; this.model.playAnim(st, { fade: 0.2 }); }
      }
      this.pos.y = groundAt(this.pos.x, this.pos.z);
    }
  }

  /* ===================== PET (Coco) ===================== */

  class Pet extends Entity {
    constructor(player) {
      super({ name: 'Coco', level: player ? player.level : 1, team: 'player', hp: 300, maxHp: 300, npColor: '#ffb1d0', npW: 1.6, npH: 0.4, npHeight: 1.25 });
      this.player = player || null;
      var inst = MVL.Assets.instantiate('coco', { height: 0.9 });
      this.model = inst;
      this.modelGroup = inst.group;
      this.group.add(this.modelGroup);
      this._respT = 0;
      this._assistT = 4;
      this._t = U.rand(0, 6.28);
      var p = this.player ? this.player.pos : null;
      var sx = p ? p.x + 1.5 : 2, sz = p ? p.z + 1.5 : 2;
      this.pos.set(sx, groundAt(sx, sz), sz);
      this._npDirty = true;
      if (inst.anims && inst.anims.length) inst.playAnim('idle');
    }

    update(dt) {
      super.update(dt);
      var P = this.player;
      if (!P) return;
      if (!this.alive) {
        this._respT -= dt;
        if (this._respT <= 0) {
          this.alive = true;
          this.hp = this.maxHp;
          this.group.visible = true;
          this._npDirty = true;
        }
        return;
      }
      this._t += dt;
      /* bám sau lưng chủ 1.8m bằng spring, xa quá 10m dịch chuyển tức thời */
      var ry = P.group.rotation.y;
      var bx = P.pos.x - Math.sin(ry) * 1.8;
      var bz = P.pos.z - Math.cos(ry) * 1.8;
      var d = U.dist2D(this.pos.x, this.pos.z, bx, bz);
      if (d > 10) {
        this.pos.x = bx;
        this.pos.z = bz;
      } else {
        this.pos.x = U.damp(this.pos.x, bx, 5, dt);
        this.pos.z = U.damp(this.pos.z, bz, 5, dt);
      }
      this.pos.y = groundAt(this.pos.x, this.pos.z);
      faceToward(this, P.pos.x, P.pos.z, dt, 5);
      this.modelGroup.position.y = Math.abs(Math.sin(this._t * 7)) * 0.06 * (d > 0.6 ? 1 : 0.3);
      /* hỗ trợ chiến đấu: cắn mục tiêu hiện tại mỗi 4s nếu <7m */
      this._assistT -= dt;
      if (this._assistT <= 0) {
        var t = (MVL.Combat && MVL.Combat.currentTarget) || null;
        if (t && t.alive && t.team === 'monster' && U.dist2D(this.pos.x, this.pos.z, t.pos.x, t.pos.z) < 7 && d < 12) {
          if (MVL.Combat && MVL.Combat.petAttack) MVL.Combat.petAttack(this, t);
          this._assistT = 4;
        } else {
          this._assistT = 1;
        }
      }
    }

    die() {
      if (!this.alive) return;
      this.alive = false;
      this.hp = 0;
      this._npDirty = true;
      this.group.visible = false;
      this._respT = 8; /* tự hồi sinh cạnh chủ sau 8s */
    }
  }

  /* ===================== MVL.Mounts ===================== */

  var Mounts = {
    /* mô hình ngựa cao 1.5 — Player tự gắn vào group và điều khiển anim */
    createHorse() {
      var inst = MVL.Assets.instantiate('horse', { height: 1.5 });
      inst.group.userData.isMount = true;
      return inst;
    }
  };

  /* ===================== MVL.Mobs ===================== */

  var Mobs = {
    all: [],
    _dying: [],
    _respawn: [],

    /* spawn theo sceneDef.monsterSpawns + bossSpawn + bossSpawn2 */
    spawnScene(sceneDef) {
      if (!sceneDef) return;
      var sps = sceneDef.monsterSpawns || [];
      for (var i = 0; i < sps.length; i++) {
        var ms = sps[i];
        var def = D.monsters[ms.monster];
        if (!def) continue;
        for (var n = 0; n < (ms.count || 1); n++) {
          var p = randInCircle(ms.center[0], ms.center[1], ms.radius || 10);
          this._spawnOne(def, p.x, p.z);
        }
      }
      var bs = sceneDef.bossSpawn;
      if (bs && D.bosses[bs.boss]) this._spawnBoss(D.bosses[bs.boss], bs.x, bs.z);
      var bs2 = sceneDef.bossSpawn2;
      if (bs2 && D.bosses[bs2.boss]) this._spawnBoss(D.bosses[bs2.boss], bs2.x, bs2.z);
    },

    _spawnOne(def, x, z, opts) {
      opts = opts || {};
      var lvl = opts.level != null ? opts.level : (def.level || 1) + U.randInt(0, 2);
      var elite = opts.elite != null ? !!opts.elite : (def.elite ? Math.random() < def.elite.chance : false);
      var m = new Monster(def, { x: x, z: z, level: lvl, elite: elite });
      this.all.push(m);
      if (!opts.transient) this._respawn.push({ def: def, x: x, z: z, t: RESPAWN_TIME });
      return m;
    },

    _spawnBoss(def, x, z) {
      var b = new Boss(def, { x: x, z: z, level: def.level });
      this.all.push(b);
      return b;
    },

    /* quái do boss triệu gọi — không hồi sinh */
    spawnAdd(monsterId, pos, opts) {
      opts = opts || {};
      var def = D.monsters[monsterId];
      if (!def) return null;
      var count = opts.count || 1;
      var out = [];
      var cx = pos.x != null ? pos.x : (pos[0] || 0);
      var cz = pos.z != null ? pos.z : (pos[1] || 0);
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2, r = U.rand(1.5, 4);
        var m = this._spawnOne(def, cx + Math.cos(a) * r, cz + Math.sin(a) * r, { level: opts.level, elite: opts.elite, transient: true });
        out.push(m);
      }
      return count === 1 ? out[0] : out;
    },

    update(dt) {
      var i, m;
      for (i = this.all.length - 1; i >= 0; i--) {
        m = this.all[i];
        m.update(dt);
        if (!m.alive) {
          /* giữ xác ~1.4s cho FX.dissolve chạy xong rồi mới destroy */
          this.all.splice(i, 1);
          this._dying.push({ e: m, t: m.isBoss ? 1.9 : 1.4 });
        }
      }
      for (i = this._dying.length - 1; i >= 0; i--) {
        var dy = this._dying[i];
        dy.t -= dt;
        if (dy.t <= 0) { this._dying.splice(i, 1); dy.e.destroy(); }
      }
      for (i = this._respawn.length - 1; i >= 0; i--) {
        var r = this._respawn[i];
        r.t -= dt;
        if (r.t <= 0) { this._respawn.splice(i, 1); this._spawnOne(r.def, r.x, r.z); }
      }
    },

    nearest(pos, maxDist, filterFn) {
      var best = null, bd = maxDist != null ? maxDist : 1e9;
      for (var i = 0; i < this.all.length; i++) {
        var m = this.all[i];
        if (!m.alive) continue;
        if (filterFn && !filterFn(m)) continue;
        var d = U.dist2D(pos.x, pos.z, m.pos.x, m.pos.z);
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    },

    clear() {
      var i;
      for (i = 0; i < this.all.length; i++) this.all[i].destroy();
      for (i = 0; i < this._dying.length; i++) this._dying[i].e.destroy();
      this.all.length = 0;
      this._dying.length = 0;
      this._respawn.length = 0;
    },

    aliveCount() {
      var n = 0;
      for (var i = 0; i < this.all.length; i++) if (this.all[i].alive) n++;
      return n;
    },

    getBoss() {
      for (var i = 0; i < this.all.length; i++) {
        if (this.all[i].isBoss && this.all[i].alive) return this.all[i];
      }
      return null;
    }
  };

  /* ===================== MVL.NPCs ===================== */

  var NPCs = {
    all: [],

    spawnScene(sceneDef) {
      if (!sceneDef || !sceneDef.npcSpawns) return;
      for (var i = 0; i < sceneDef.npcSpawns.length; i++) {
        var ns = sceneDef.npcSpawns[i];
        var def = D.npcs[ns.npc];
        if (!def) continue;
        this.all.push(new NPC(def, { x: ns.x, z: ns.z }));
      }
    },

    get(id) {
      for (var i = 0; i < this.all.length; i++) if (this.all[i].id === id) return this.all[i];
      return null;
    },

    update(dt) {
      for (var i = 0; i < this.all.length; i++) this.all[i].update(dt);
    },

    clear() {
      for (var i = 0; i < this.all.length; i++) this.all[i].destroy();
      this.all.length = 0;
    }
  };

  /* ===================== MVL.Loot ===================== */

  /* geometry/material dùng chung cho mọi orb — không cấp phát lại */
  var _geoItem = null, _geoOrb = null;
  var _matsR = null, _matSilver = null, _matGold = null;

  function lootAssets() {
    if (_geoItem) return;
    _geoItem = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    _geoOrb = new THREE.SphereGeometry(0.17, 10, 8);
    _matsR = D.config.rarities.map(function (r) {
      return new THREE.MeshStandardMaterial({ color: r.color, emissive: r.color, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.25 });
    });
    _matSilver = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffb52a, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.6 });
    _matGold = new THREE.MeshStandardMaterial({ color: 0xffe25a, emissive: 0xffc21a, emissiveIntensity: 1.1, roughness: 0.25, metalness: 0.7 });
  }

  function makeOrb(pos, drop) {
    lootAssets();
    var mesh, kind, item = null, scale = 1;
    if (drop.item != null && D.items[drop.item]) {
      item = D.items[drop.item];
      mesh = new THREE.Mesh(_geoItem, _matsR[Math.min(item.rarity || 0, 5)]);
      kind = 'item';
    } else if (drop.gold != null) {
      mesh = new THREE.Mesh(_geoOrb, _matGold);
      kind = 'gold';
      scale = 1.35;
    } else {
      mesh = new THREE.Mesh(_geoOrb, _matSilver);
      kind = 'silver';
    }
    mesh.scale.setScalar(scale);
    var a = Math.random() * Math.PI * 2, r = U.rand(0.3, 0.9);
    var cx = pos.x != null ? pos.x : (pos[0] || 0);
    var cz = pos.z != null ? pos.z : (pos[1] || 0);
    var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    var y0 = groundAt(x, z) + 0.35;
    mesh.position.set(x, y0, z);
    mesh.castShadow = false;
    if (MVL.Engine && MVL.Engine.entityRoot) MVL.Engine.entityRoot.add(mesh);
    return {
      mesh: mesh, kind: kind, item: item, id: drop.item,
      qty: drop.qty || 1, n: drop.silver != null ? drop.silver : (drop.gold || 0),
      age: 0, y0: y0, attract: false, retry: 0, spin: U.rand(2, 3.2)
    };
  }

  var Loot = {
    orbs: [],

    /* spawn(pos, drops) — drops dạng [{gold?, silver?, item?, qty?}] */
    spawn(pos, drops) {
      if (!drops || !drops.length) return;
      for (var i = 0; i < drops.length; i++) this.orbs.push(makeOrb(pos, drops[i]));
    },

    /* rút Inventory.rollDrops rồi rải orb quanh vị trí quái chết */
    drop(pos, def, elite) {
      var drops = null;
      try {
        if (MVL.Inventory && MVL.Inventory.rollDrops) drops = MVL.Inventory.rollDrops(def, elite);
      } catch (e) { drops = null; }
      if (drops && drops.length) this.spawn(pos, drops);
    },

    update(dt) {
      var P = getPlayer();
      var pok = !!(P && P.alive);
      var px = P ? P.pos.x : 1e9, pz = P ? P.pos.z : 1e9;
      var pet = P && P.pet && P.pet.alive ? P.pet : null;
      for (var i = this.orbs.length - 1; i >= 0; i--) {
        var o = this.orbs[i];
        var m = o.mesh;
        o.age += dt;
        if (o.age > LOOT_LIFETIME) { this._remove(i); continue; }
        if (o.retry > 0) o.retry -= dt;
        m.rotation.y += o.spin * dt;
        m.position.y = o.y0 + Math.sin(o.age * 3) * 0.12;
        var petD = (pet && !o.attract) ? U.dist2D(m.position.x, m.position.z, pet.pos.x, pet.pos.z) : 1e9;
        if (pok && !o.attract) {
          var d0 = U.dist2D(m.position.x, m.position.z, px, pz);
          if (d0 < PICKUP_DIST || petD < PET_AURA_DIST) o.attract = true;
        }
        if (o.attract && pok) {
          var dx = px - m.position.x, dz = pz - m.position.z;
          var dd = Math.sqrt(dx * dx + dz * dz);
          if (dd < COLLECT_DIST) {
            if (o.retry <= 0 && this._collect(o)) this._remove(i);
            continue;
          }
          var st = Math.min(9 * dt, dd);
          m.position.x += (dx / dd) * st;
          m.position.z += (dz / dd) * st;
          m.position.y += ((P.pos.y + 0.9) - m.position.y) * Math.min(1, dt * 6);
        }
      }
    },

    _collect(o) {
      try {
        if (o.kind === 'silver') {
          if (MVL.Progression) MVL.Progression.addSilver(o.n);
          if (MVL.Audio) MVL.Audio.sfx('coin');
          return true;
        }
        if (o.kind === 'gold') {
          if (MVL.Progression) MVL.Progression.addGold(o.n);
          if (MVL.Audio) MVL.Audio.sfx('coin');
          return true;
        }
        if (MVL.Inventory) {
          var it = MVL.Inventory.addItem(o.id, o.qty);
          if (!it) { o.retry = 1.5; return false; } /* túi đầy — thử lại sau */
          if (MVL.Audio) MVL.Audio.sfx('pickup');
          if (o.item && o.item.rarity >= 2 && MVL.UI && MVL.UI.toast) {
            MVL.UI.toast('Thu được: ' + o.item.name + (o.qty > 1 ? ' ×' + o.qty : ''), 'good', o.item.icon);
          }
          return true;
        }
      } catch (e) { /* an toàn khi hệ chưa sẵn sàng */ }
      return false;
    },

    _remove(i) {
      var o = this.orbs[i];
      if (o.mesh.parent) o.mesh.parent.remove(o.mesh);
      this.orbs.splice(i, 1);
    },

    clear() {
      for (var i = 0; i < this.orbs.length; i++) {
        var o = this.orbs[i];
        if (o.mesh.parent) o.mesh.parent.remove(o.mesh);
      }
      this.orbs.length = 0;
    }
  };

  /* ===================== XUẤT API ===================== */

  MVL.Entity = Entity;
  MVL.Player = Player;
  MVL.Monster = Monster;
  MVL.Boss = Boss;
  MVL.NPC = NPC;
  MVL.Pet = Pet;
  MVL.Mounts = Mounts;
  MVL.Mobs = Mobs;
  MVL.NPCs = NPCs;
  MVL.Loot = Loot;
  MVL.Player.inst = null;
  /* gom nhóm tiện tra cứu */
  MVL.Entities = { Entity: Entity, Player: Player, Monster: Monster, Boss: Boss, NPC: NPC, Pet: Pet, Mounts: Mounts, Mobs: Mobs, NPCs: NPCs, Loot: Loot };
})(window.MVL);
