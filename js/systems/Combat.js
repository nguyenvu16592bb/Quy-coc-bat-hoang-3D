/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Combat.js
 * MVL.Combat — trung tâm chiến đấu: mục tiêu hiện tại, combo
 * đánh thường 3 đòn, kỹ năng 4 slot (melee/ranged/aoe/buff/
 * heal/dash), đạn bay, Dot, buff, hồi chiêu, sát thương vùng,
 * công thức giảm thương theo def + bạo kích.
 * Chỉ số lấy qua Progression.computeStats() (có cache nội bộ).
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils;
  var Bus = MVL.Bus;

  var C = {
    currentTarget: null,       /* Monster|Boss|null — Game đặt qua setCurrentTarget */
    _cds: {},                  /* skillId → giây hồi chiêu còn lại */
    _buffs: new Map(),         /* entity → [{stat, mult, dur, remain, icon}] */
    _shots: [],                /* đạn bay đang hoạt động */
    _dots: [],                 /* Dot damage đang chạy */
    _casts: [],                /* castTime đang chờ (update-driven, không setTimeout) */
    _comboStep: 0,
    _comboTimer: 0,
    _sphere: null              /* geometry cầu dùng chung cho đạn */
  };

  var DEF_RATIO = 100;                 /* giảm thương ×100/(100+def) */
  var CRIT_MULT = 1.65;
  var COMBO_WINDOW = 1.1;              /* cửa sổ combo đánh thường */
  var COMBO_MULT = [1.0, 1.12, 1.4];
  var CONE_COS = Math.cos((75 * Math.PI / 180) / 2);   /* nón trước 75° */
  var BASIC_RANGE = 2.7;
  var TARGET_RADIUS = 25;              /* phạm vi Tab chọn mục tiêu */
  var SHOT_HIT_RADIUS = 0.9;           /* đạn trúng entity dist < 0.9 */
  var SHOT_LIFE = 2;                   /* đạn sống 2s */
  var STAT_NAMES = {
    atk: 'Công kích', def: 'Phòng ngự', crit: 'Bạo kích',
    spd: 'Thân pháp', hp: 'Sinh lực', mp: 'Nội lực'
  };

  /* =========================================================
   * TIỆN ÍCH NỘI BỘ
   * ========================================================= */
  function stats() {
    return (MVL.Progression && MVL.Progression.computeStats)
      ? MVL.Progression.computeStats() : null;
  }

  /* player tra runtime: Game.currentPlayer → Game.player → MVL.Player
     (Entities nạp sau Combat nên chỉ được gọi trong hàm, không top-level) */
  function getPlayer() {
    var g = MVL.Game;
    if (g && g.currentPlayer && g.currentPlayer.pos) return g.currentPlayer;
    if (g && g.player && g.player.pos) return g.player;
    if (MVL.Player && MVL.Player.pos && MVL.Player.group) return MVL.Player;
    return null;
  }

  function resolveEntity(e) {
    return (e === 'player') ? getPlayer() : (e || null);
  }

  function toast(msg, kind) {
    if (MVL.UI && MVL.UI.toast) MVL.UI.toast(msg, kind || 'bad');
  }

  function sfx(name) {
    if (MVL.Audio) MVL.Audio.sfx(name);
  }

  /* hướng nhìn player: quy ước rotation.y = atan2(dx, dz)
     → phía trước = (sin ry, cos ry) */
  function facingOf(pl) {
    var ry = (pl.group && pl.group.rotation) ? pl.group.rotation.y : 0;
    return { x: Math.sin(ry), z: Math.cos(ry), a: ry };
  }

  /* hướng theo phím di chuyển camera-relative (dự phòng khi model
     chưa kịp xoay theo hướng đánh) */
  function inputFacing() {
    if (!MVL.Input || !MVL.Cam) return null;
    var ax = MVL.Input.axis();
    if (!ax || (ax.x === 0 && ax.z === 0)) return null;
    var yaw = MVL.Cam.yaw;
    var fx = -Math.sin(yaw), fz = -Math.cos(yaw);   /* tiến */
    var rx = -fz, rz = fx;                           /* phải */
    var dx = fx * ax.z + rx * ax.x;
    var dz = fz * ax.z + rz * ax.x;
    var l = Math.sqrt(dx * dx + dz * dz) || 1;
    dx /= l; dz /= l;
    return { x: dx, z: dz, a: Math.atan2(dx, dz) };
  }

  /* quái còn sống trong nón trước player (range, 75°).
     currentTarget ưu tiên nếu đạt điều kiện; sắp xếp gần → xa
     để kỹ năng hình nón đánh nhiều mục tiêu */
  function coneTargets(pl, facing, range) {
    var mobs = (MVL.Mobs && MVL.Mobs.all) || [];
    var list = [], i, m, dx, dz, d, dot, l;
    var ct = C.currentTarget;
    if (ct && ct.alive !== false && ct.pos) {
      d = U.dist2D(pl.pos.x, pl.pos.z, ct.pos.x, ct.pos.z);
      if (d <= range + 0.3) {
        dx = ct.pos.x - pl.pos.x; dz = ct.pos.z - pl.pos.z;
        l = Math.sqrt(dx * dx + dz * dz) || 1;
        dot = (dx * facing.x + dz * facing.z) / l;
        if (dot >= CONE_COS) list.push(ct);
      }
    }
    for (i = 0; i < mobs.length; i++) {
      m = mobs[i];
      if (!m || m.alive === false || m === ct || !m.pos) continue;
      dx = m.pos.x - pl.pos.x; dz = m.pos.z - pl.pos.z;
      d = Math.sqrt(dx * dx + dz * dz);
      if (d > range + 0.3) continue;
      dot = (dx * facing.x + dz * facing.z) / (d || 1);
      if (dot < CONE_COS) continue;
      list.push(m);
    }
    list.sort(function (a, b) {
      return U.dist2D(pl.pos.x, pl.pos.z, a.pos.x, a.pos.z) -
             U.dist2D(pl.pos.x, pl.pos.z, b.pos.x, b.pos.z);
    });
    return list;
  }

  /* =========================================================
   * KHỞI TẠO / ĐẶT LẠI
   * ========================================================= */
  C.init = function () {
    if (C._sphere) return;
    C._sphere = new THREE.SphereGeometry(1, 8, 6);
    Bus.on('scene:entered', C.reset);
  };

  /* rời cảnh: dọn đạn/dot/buff/hồi chiêu/mục tiêu/combo */
  C.reset = function () {
    var i;
    for (i = C._shots.length - 1; i >= 0; i--) _removeShot(C._shots[i], false);
    C._shots.length = 0;
    C._dots.length = 0;
    if (C._casts.length) Bus.emit('cast:end');
    C._casts.length = 0;
    C._cds = {};
    C._buffs = new Map();
    C.currentTarget = null;
    C._comboStep = 0;
    C._comboTimer = 0;
  };

  /* =========================================================
   * CẬP NHẬT MỖI FRAME
   * ========================================================= */
  C.update = function (dt) {
    var i, k, it, d;
    /* hồi chiêu đếm ngược */
    for (k in C._cds) {
      C._cds[k] -= dt;
      if (C._cds[k] <= 0) delete C._cds[k];
    }
    /* cửa sổ combo */
    if (C._comboTimer > 0) {
      C._comboTimer -= dt;
      if (C._comboTimer <= 0) C._comboStep = 0;
    }
    /* đọc chú castTime rồi mới thi triển */
    for (i = C._casts.length - 1; i >= 0; i--) {
      it = C._casts[i];
      it.t -= dt;
      if (it.t <= 0) {
        C._casts.splice(i, 1);
        if (!it.silent) Bus.emit('cast:end');
        it.fn();
      }
    }
    /* Dot: tick mỗi interval (1s), chữ thương màu dot qua takeDamage */
    for (i = C._dots.length - 1; i >= 0; i--) {
      d = C._dots[i];
      d.remain -= dt;
      d.t += dt;
      if (!d.entity || d.entity.alive === false) { C._dots.splice(i, 1); continue; }
      while (d.t >= d.interval && d.remain > 0) {
        d.t -= d.interval;
        C.dealDamage(d.entity, d.dmg, { color: d.color, dot: true, source: d.source });
      }
      if (d.remain <= 0) C._dots.splice(i, 1);
    }
    /* buff hết hạn */
    C._buffs.forEach(function (arr, key) {
      for (var j = arr.length - 1; j >= 0; j--) {
        arr[j].remain -= dt;
        if (arr[j].remain <= 0) arr.splice(j, 1);
      }
      if (!arr.length) C._buffs.delete(key);
    });
    /* mục tiêu chết → nhả để HUD ẩn target-frame */
    if (C.currentTarget && C.currentTarget.alive === false) C.currentTarget = null;
    _updateShots(dt);
  };

  /* =========================================================
   * ĐẠN BAY
   * ========================================================= */
  C.spawnProjectile = function (o) {
    if (!o || !o.dir || !MVL.Engine || !MVL.Engine.fxRoot || !MVL.FX) return null;
    var dir = o.dir;
    var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
    var speed = o.speed || 18;
    var size = o.size || 0.28;
    var color = o.color || '#ffd27a';
    var mesh = new THREE.Mesh(C._sphere, new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    mesh.scale.setScalar(size);
    mesh.position.set(o.from.x, o.from.y, o.from.z);
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: MVL.Assets.tex('glow'),
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    }));
    spr.scale.set(size * 6, size * 6, 1);
    mesh.add(spr);
    MVL.Engine.fxRoot.add(mesh);
    var p = {
      mesh: mesh, spr: spr, size: size, color: color,
      dmgColor: o.dmgColor || color,
      dmg: o.dmg || 0, crit: o.crit || 0,
      source: o.source || null, team: o.team || 'player',
      dot: o.dot || 0, dotDur: o.dotDur || 0,
      onHit: o.onHit || null,
      vx: dir.x / len * speed,
      vy: dir.y / len * speed,
      vz: dir.z / len * speed,
      life: SHOT_LIFE
    };
    C._shots.push(p);
    return p;
  };

  /* gỡ đạn khỏi scene; boom=true nổ FX.hit; geometry dùng chung
     nên chỉ dispose material tự tạo */
  function _removeShot(p, boom) {
    var mesh = p.mesh;
    if (boom && MVL.FX) {
      MVL.FX.hit(mesh.position, { color: p.color, size: 0.7 + p.size * 1.6, count: 14 });
    }
    if (mesh.parent) mesh.parent.remove(mesh);
    if (p.spr) p.spr.material.dispose();
    mesh.material.dispose();
  }

  function _updateShots(dt) {
    var i, p, pos, gy, dead;
    for (i = C._shots.length - 1; i >= 0; i--) {
      p = C._shots[i];
      pos = p.mesh.position;
      p.life -= dt;
      pos.x += p.vx * dt;
      pos.y += p.vy * dt;
      pos.z += p.vz * dt;
      dead = p.life <= 0;
      /* trúng địa hình (theo độ cao lưới của World) */
      if (!dead && MVL.World && MVL.World.ready) {
        gy = MVL.World.getHeight(pos.x, pos.z);
        if (pos.y <= gy + 0.05) {
          _removeShot(p, true);
          C._shots.splice(i, 1);
          continue;
        }
      }
      /* trúng thực thể theo team */
      if (!dead && _shotCheckEntities(p, pos)) {
        C._shots.splice(i, 1);
        continue;
      }
      if (dead) { _removeShot(p, false); C._shots.splice(i, 1); }
    }
  }

  function _shotCheckEntities(p, pos) {
    var r = SHOT_HIT_RADIUS + p.size, i, m, d2, dy, cy;
    if (p.team === 'player') {
      var mobs = (MVL.Mobs && MVL.Mobs.all) || [];
      for (i = 0; i < mobs.length; i++) {
        m = mobs[i];
        if (!m || m.alive === false || !m.pos) continue;
        d2 = U.dist2D(pos.x, pos.z, m.pos.x, m.pos.z);
        if (d2 > r + 1.2) continue;               /* lọc nhanh 2D */
        cy = m.pos.y + (m.height || 1.6) * 0.55;  /* tâm thân */
        dy = pos.y - cy;
        if (d2 * d2 + dy * dy <= r * r) { _shotStrike(p, m); return true; }
      }
    } else {
      var gp = getPlayer();
      if (gp && gp.alive !== false && gp.pos) {
        if (U.dist2D(pos.x, pos.z, gp.pos.x, gp.pos.z) <= r) { _shotStrike(p, gp); return true; }
      }
      var pet = gp && gp.pet;
      if (pet && pet.alive !== false && pet.pos) {
        if (U.dist2D(pos.x, pos.z, pet.pos.x, pet.pos.z) <= r) { _shotStrike(p, pet); return true; }
      }
    }
    return false;
  }

  function _shotStrike(p, target) {
    var def = (target === getPlayer())
      ? ((stats() || {}).def || 0)
      : (target.def || 0);
    var r = C.compute(p.dmg, def, 1, p.crit);
    if (p.onHit) {
      try { p.onHit(target, r); }
      catch (e) { console.error('[Combat] onHit:', e && e.message || e); }
    }
    C.dealDamage(target, r.dmg, { crit: r.crit, source: p.source, color: p.dmgColor });
    if (p.dot > 0) {
      C.applyDot(target, { dmg: p.dot, dur: p.dotDur, color: p.dmgColor, source: p.source });
    }
    sfx('hit');
    _removeShot(p, true);
  }

  /* =========================================================
   * ĐÁNH THƯỜNG — CHUỖI 3 ĐÒN
   * ========================================================= */
  C.playerBasicAttack = function () {
    var pl = getPlayer();
    if (!pl || pl.alive === false || !pl.pos) return null;
    var st = stats();
    if (!st) return null;
    /* đúng cửa sổ combo thì tăng đòn, quá 1.1s thì về đòn 1 */
    if (C._comboTimer > 0) C._comboStep = (C._comboStep % 3) + 1;
    else C._comboStep = 1;
    C._comboTimer = COMBO_WINDOW;
    var mult = COMBO_MULT[C._comboStep - 1];
    var facing = facingOf(pl);
    var hits = coneTargets(pl, facing, BASIC_RANGE);
    if (!hits.length) {
      var inf = inputFacing();
      if (inf) hits = coneTargets(pl, inf, BASIC_RANGE);
    }
    var angleY = facing.a;
    var result = null;
    if (hits.length) {
      var tgt = hits[0];
      angleY = Math.atan2(tgt.pos.x - pl.pos.x, tgt.pos.z - pl.pos.z);
      var r = C.compute(st.atk, tgt.def || 0, mult, st.crit);
      C.dealDamage(tgt, r.dmg, { crit: r.crit, source: pl, color: '#f2ead8' });
      C.aggro(tgt, pl);
      result = { target: tgt, dmg: r.dmg, crit: r.crit, step: C._comboStep };
    }
    sfx('swing');
    if (result) sfx(result.crit ? 'crit' : 'hit');
    if (MVL.FX) {
      MVL.FX.slash(pl.pos, angleY, {
        radius: 1.45 + 0.15 * C._comboStep,
        color: '#e8e2d0',
        arc: 2.0 + 0.25 * C._comboStep
      });
    }
    return result;
  };

  /* =========================================================
   * KỸ NĂNG 4 SLOT — slot 0..3 theo Data.classes[phái].skills
   * ========================================================= */
  C.castPlayerSkill = function (slotIndex) {
    var pl = getPlayer();
    var prog = MVL.Progression;
    if (!pl || pl.alive === false || !pl.pos || !prog || !prog.state || !MVL.Data) return false;
    var cls = MVL.Data.classes[prog.state.classId];
    var sid = (cls && cls.skills) ? cls.skills[slotIndex] : null;
    var sk = sid ? MVL.Data.skills[sid] : null;
    if (!sk) return false;
    /* hồi chiêu */
    var cd = C.getCD(sid);
    if (cd > 0) {
      toast('「' + sk.name + '」 còn ' + Math.ceil(cd) + 's hồi chiêu', 'bad');
      sfx('error');
      return false;
    }
    /* nội lực */
    var curMp = (typeof pl.mp === 'number') ? pl.mp : (prog.state.mp || 0);
    if (curMp < (sk.mp || 0)) {
      toast('Nội lực bất túc, không thi triển được 「' + sk.name + '」', 'bad');
      sfx('error');
      return false;
    }
    /* trừ nội lực + vào hồi chiêu ngay khi bắt đầu */
    if (typeof pl.mp === 'number') pl.mp = Math.max(0, pl.mp - (sk.mp || 0));
    else prog.state.mp = Math.max(0, (prog.state.mp || 0) - (sk.mp || 0));
    if ((sk.cd || 0) > 0) C._cds[sid] = sk.cd;
    var st = stats() || { atk: 10, crit: 5, hpMax: 0 };
    var exec = function () { _execSkill(pl, sk, st); };
    /* có castTime → Bus cast:start {dur,label}, đọc chú xong cast:end rồi thi */
    if ((sk.castTime || 0) > 0) {
      Bus.emit('cast:start', { dur: sk.castTime, label: sk.name });
      C._casts.push({ t: sk.castTime, fn: exec });
    } else {
      exec();
    }
    return true;
  };

  /* thi triển thực sự sau castTime (hoặc ngay nếu castTime = 0) */
  function _execSkill(pl, sk, st) {
    var atk = st.atk || 0;
    var mult = (sk.dmg && sk.dmg.length) ? sk.dmg[0] : 1;
    var col = (sk.fx && sk.fx.color) || '#ffd27a';
    var facing, hits, i, r, inf;
    switch (sk.type) {

      case 'melee':   /* hình nón trước: range, 75° */
        facing = facingOf(pl);
        hits = coneTargets(pl, facing, sk.range || BASIC_RANGE);
        if (!hits.length) {
          inf = inputFacing();
          if (inf) hits = coneTargets(pl, inf, sk.range || BASIC_RANGE);
        }
        if (MVL.FX) MVL.FX.slash(pl.pos, facing.a, {
          radius: sk.range || 2.7, color: col, arc: 2.3
        });
        sfx(hits.length ? 'hit' : 'swing');
        for (i = 0; i < hits.length; i++) {
          r = C.compute(atk, hits[i].def || 0, mult, st.crit);
          C.dealDamage(hits[i], r.dmg, { crit: r.crit, source: pl, color: col });
          C.aggro(hits[i], pl);
        }
        break;

      case 'ranged':  /* đạn bay về currentTarget hoặc hướng player */
        _castRanged(pl, sk, st, mult, col);
        break;

      case 'aoe':     /* ring + areaAttack tại target.pos hoặc trước player */
        _castAoe(pl, sk, st, mult, col);
        break;

      case 'buff':    /* tự buff player */
        if (!sk.buff || !sk.buff.stat) break;
        C.addBuff(pl, { stat: sk.buff.stat, mult: sk.buff.mult, dur: sk.buff.dur, icon: sk.icon });
        if (MVL.FX && pl.pos) MVL.FX.ring(pl.pos, { radius: 1.15, color: col, duration: 0.5 });
        sfx('cast');
        toast('「' + sk.name + '」 vận công thành — ' + _statName(sk.buff.stat) +
              ' tăng trong ' + sk.buff.dur + 's', 'good');
        break;

      case 'heal':    /* hồi healMult × atk, không vượt maxHp */
        var amt = (sk.healMult || 1) * atk;
        if (typeof pl.heal === 'function') pl.heal(amt);
        else if (st.hpMax) pl.hp = Math.min(st.hpMax, (pl.hp || 0) + amt);
        if (MVL.FX && pl.pos) MVL.FX.healFx(pl.pos);
        sfx('heal');
        break;

      case 'dash':    /* thân pháp lao tới rồi chém quanh 3m */
        if (typeof pl.execDash === 'function') pl.execDash(sk.dashDist || 6);
        sfx('dash');
        if (MVL.FX && pl.pos) MVL.FX.trail({ x: pl.pos.x, y: pl.pos.y + 0.6, z: pl.pos.z }, col);
        C._casts.push({
          t: 0.16, silent: true,
          fn: function () {
            C.areaAttack({
              pos: pl.pos, radius: 3, team: 'player',
              dmg: mult * atk, source: pl, color: col, crit: st.crit
            });
            if (MVL.FX && pl.pos) {
              MVL.FX.slash(pl.pos, facingOf(pl).a, { radius: 1.7, color: col, arc: 2.4 });
            }
          }
        });
        break;
    }
  }

  function _castRanged(pl, sk, st, mult, col) {
    var ct = C.currentTarget;
    var from = { x: pl.pos.x, y: pl.pos.y + 1.25, z: pl.pos.z };
    var dir;
    if (ct && ct.alive !== false && ct.pos) {
      var ty = ct.pos.y + (ct.height || 1.5) * 0.55;
      dir = { x: ct.pos.x - from.x, y: ty - from.y, z: ct.pos.z - from.z };
      var l = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
      dir.x /= l; dir.y /= l; dir.z /= l;
    } else {
      var f = facingOf(pl);
      dir = { x: f.x, y: 0, z: f.z };
    }
    var pj = sk.projectile || { speed: 16, color: col, size: 0.3 };
    if (MVL.FX) MVL.FX.muzzle(from, pj.color || col);
    sfx('cast');
    C.spawnProjectile({
      from: from,
      dir: dir,
      speed: pj.speed,
      color: pj.color || col,
      size: pj.size,
      dmg: mult * st.atk,
      crit: st.crit,
      source: pl,
      team: 'player',
      dmgColor: col,
      dot: sk.dot ? sk.dot.dmg * st.atk : 0,
      dotDur: sk.dot ? sk.dot.dur : 0
    });
  }

  function _castAoe(pl, sk, st, mult, col) {
    var ct = C.currentTarget;
    var center;
    if (ct && ct.alive !== false && ct.pos) {
      center = ct.pos;
    } else {
      var f = facingOf(pl);
      var reach = (sk.range || sk.radius || 3) * 0.7;
      center = { x: pl.pos.x + f.x * reach, y: pl.pos.y, z: pl.pos.z + f.z * reach };
    }
    if (MVL.FX) MVL.FX.ring(center, { radius: sk.radius || 3, color: col, duration: 0.45 });
    sfx('aoe');
    var hitList = C.areaAttack({
      pos: center, radius: sk.radius || 3, team: 'player',
      dmg: mult * st.atk, source: pl, color: col, crit: st.crit
    });
    if (sk.dot) {
      for (var i = 0; i < hitList.length; i++) {
        C.applyDot(hitList[i], {
          dmg: sk.dot.dmg * st.atk, interval: 1, dur: sk.dot.dur,
          color: col, source: pl
        });
      }
    }
  }

  /* =========================================================
   * QUÁI / THÚ CƯU
   * ========================================================= */
  C.monsterAttack = function (monster, target, skill) {
    if (!monster || !target || target.alive === false) return null;
    var mult = (skill && skill.mult) ? skill.mult : 1;
    var gp = getPlayer();
    var defStat = (target === gp) ? ((stats() || {}).def || 0) : (target.def || 0);
    var r = C.compute(monster.atk || 5, defStat, mult, 0);   /* quái không bạo */
    C.dealDamage(target, r.dmg, { crit: r.crit, source: monster, color: '#ff8a7a' });
    sfx('hit');
    C.aggro(monster, target);
    return r;
  };

  /* thú cửu cắn nhẹ: cố định ~8 sát thương trước def */
  C.petAttack = function (pet, target) {
    if (!pet || !target || target.alive === false || !target.pos) return null;
    var r = C.compute(8, target.def || 0, 1, 0);
    C.dealDamage(target, r.dmg, { crit: r.crit, source: pet, color: '#bfe8ff' });
    if (MVL.FX) {
      MVL.FX.hit({ x: target.pos.x, y: target.pos.y + 0.8, z: target.pos.z },
                 { color: '#bfe8ff', size: 0.5, count: 8 });
    }
    return r;
  };

  /* =========================================================
   * SÁT THƯƠNG VÙNG — trả về danh sách entity trúng đòn
   * ========================================================= */
  C.areaAttack = function (o) {
    var hits = [];
    if (!o || !o.pos) return hits;
    var radius = o.radius || 3;
    var pos = o.pos;
    var i, e, d;
    if (o.team === 'monster') {
      /* đòn quái quét player + thú cửu */
      var gp = getPlayer();
      if (gp && gp.alive !== false && gp.pos) {
        d = U.dist2D(pos.x, pos.z, gp.pos.x, gp.pos.z);
        if (d <= radius) {
          var st = stats();
          var r = C.compute(o.dmg, (st || {}).def || 0, 1, o.crit || 0);
          C.dealDamage(gp, r.dmg, { crit: r.crit, source: o.source, color: o.color || '#ff8a7a' });
          hits.push(gp);
        }
      }
      var pet = gp && gp.pet;
      if (pet && pet.alive !== false && pet.pos) {
        d = U.dist2D(pos.x, pos.z, pet.pos.x, pet.pos.z);
        if (d <= radius) {
          var rp = C.compute(o.dmg, pet.def || 0, 1, o.crit || 0);
          C.dealDamage(pet, rp.dmg, { crit: rp.crit, source: o.source, color: o.color || '#ff8a7a' });
          hits.push(pet);
        }
      }
    } else {
      /* đòn phe ta quét mọi quái/boss còn sống */
      var mobs = (MVL.Mobs && MVL.Mobs.all) || [];
      var pl = getPlayer();
      for (i = 0; i < mobs.length; i++) {
        e = mobs[i];
        if (!e || e.alive === false || !e.pos) continue;
        d = U.dist2D(pos.x, pos.z, e.pos.x, e.pos.z);
        if (d > radius) continue;
        var rr = C.compute(o.dmg, e.def || 0, 1, o.crit || 0);
        C.dealDamage(e, rr.dmg, { crit: rr.crit, source: o.source, color: o.color });
        C.aggro(e, o.source || pl);
        hits.push(e);
      }
    }
    return hits;
  };

  /* =========================================================
   * CÔNG THỨC SÁT THƯƠNG
   * dmg = mult × atk × 100/(100+def) × rand(0.9..1.1)
   * crit nếu rand < crit% → ×1.65; critChance truyền thêm (mặc định 0)
   * ========================================================= */
  C.compute = function (atkStat, defStat, mult, critChance) {
    mult = mult || 1;
    defStat = defStat || 0;
    var dmg = mult * (atkStat || 0) * DEF_RATIO / (DEF_RATIO + defStat);
    dmg *= U.rand(0.9, 1.1);
    var crit = Math.random() * 100 < (critChance || 0);
    if (crit) dmg *= CRIT_MULT;
    return { dmg: Math.max(1, Math.round(dmg)), crit: crit };
  };

  /* wrapper gọi takeDamage — chặn entity chết / thiếu phương thức */
  C.dealDamage = function (entity, amount, opts) {
    if (!entity || entity.alive === false || !(amount > 0)) return null;
    if (typeof entity.takeDamage !== 'function') return null;
    return entity.takeDamage(amount, opts || {});
  };

  /* =========================================================
   * DOT — tick mỗi interval (1s), chữ thương màu dot qua takeDamage
   * ========================================================= */
  C.applyDot = function (entity, o) {
    if (!entity || entity.alive === false || !o || !(o.dmg > 0)) return null;
    var d = {
      entity: entity,
      dmg: o.dmg,
      interval: Math.max(0.1, o.interval || 1),   /* chặn 0/âm → lặp vô hạn */
      dur: o.dur || 3,
      remain: o.dur || 3,
      t: 0,
      color: o.color || '#9be87a',
      source: o.source || null
    };
    C._dots.push(d);
    return d;
  };

  /* =========================================================
   * BUFF — hệ số cộng dồn; cùng icon+stat thì làm mới thời gian
   * ========================================================= */
  C.addBuff = function (entity, b) {
    var ent = resolveEntity(entity);
    if (!ent || !b || !b.stat) return null;
    var arr = C._buffs.get(ent);
    if (!arr) { arr = []; C._buffs.set(ent, arr); }
    var i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i].stat === b.stat && arr[i].icon === b.icon) {
        arr[i].mult = b.mult || 0;
        arr[i].dur = b.dur || 5;
        arr[i].remain = arr[i].dur;
        return arr[i];
      }
    }
    var buff = { stat: b.stat, mult: b.mult || 0, dur: b.dur || 5, remain: b.dur || 5, icon: b.icon || '' };
    arr.push(buff);
    return buff;
  };

  /* [{stat, mult, remain, icon}] cho HUD buff-row */
  C.getPlayerBuffs = function () {
    var ent = resolveEntity('player');
    var arr = ent ? C._buffs.get(ent) : null;
    if (!arr || !arr.length) return [];
    var out = [], i;
    for (i = 0; i < arr.length; i++) {
      out.push({ stat: arr[i].stat, mult: arr[i].mult, remain: arr[i].remain, icon: arr[i].icon });
    }
    return out;
  };

  /* hệ số buff hiện tại của một chỉ số (1 = không buff).
     Nhận entity hoặc 'player' — Progression gọi buffStat('player', stat) */
  C.buffStat = function (entity, stat) {
    var ent = resolveEntity(entity);
    var arr = ent ? C._buffs.get(ent) : null;
    if (!arr || !arr.length) return 1;
    var f = 1, i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i].stat === stat && arr[i].remain > 0) f += arr[i].mult;
    }
    return f;
  };

  /* =========================================================
   * HỒI CHIÊU
   * ========================================================= */
  C.getCD = function (skillId) { return C._cds[skillId] || 0; };
  C.isReady = function (skillId) { return C.getCD(skillId) <= 0; };

  /* =========================================================
   * AGGRO — báo quái chuyển mục tiêu khi bị đánh
   * Entity Monster có thể tự xử lý qua takeDamage; nếu có
   * onAggro/setTarget thì gọi, không thì ghi trường aggroTarget
   * ========================================================= */
  C.aggro = function (monster, source) {
    if (!monster || monster.alive === false || !source) return;
    if (typeof monster.onAggro === 'function') { monster.onAggro(source); return; }
    if (typeof monster.setTarget === 'function') { monster.setTarget(source); return; }
    monster.aggroTarget = source;
  };

  /* =========================================================
   * MỤC TIÊU
   * ========================================================= */
  C.setCurrentTarget = function (e) {
    C.currentTarget = (e && e.alive !== false) ? e : null;
    return C.currentTarget;
  };

  /* Tab: quái gần player nhất còn sống trong 25m; có mục tiêu
     sẵn thì chuyển sang quái gần tiếp theo (vòng tròn) */
  C.cycleTarget = function () {
    var pl = getPlayer();
    if (!pl || !pl.pos) return C.currentTarget;
    var mobs = (MVL.Mobs && MVL.Mobs.all) || [];
    var list = [], i, e, d;
    for (i = 0; i < mobs.length; i++) {
      e = mobs[i];
      if (!e || e.alive === false || !e.pos) continue;
      d = U.dist2D(pl.pos.x, pl.pos.z, e.pos.x, e.pos.z);
      if (d <= TARGET_RADIUS) list.push({ e: e, d: d });
    }
    if (!list.length) { C.currentTarget = null; return null; }
    list.sort(function (a, b) { return a.d - b.d; });
    var next = null;
    if (C.currentTarget) {
      for (i = 0; i < list.length; i++) {
        if (list[i].e === C.currentTarget) {
          next = list[(i + 1) % list.length].e;
          break;
        }
      }
    }
    if (!next) next = list[0].e;
    C.currentTarget = next;
    return next;
  };

  function _statName(s) { return STAT_NAMES[s] || s; }

  MVL.Combat = C;
})(window.MVL);
