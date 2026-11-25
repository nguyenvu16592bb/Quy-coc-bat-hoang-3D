/* =========================================================
 * Mộng Võ Lâm 3D — js/systems/Effects.js
 * MVL.FX — hiệu ứng 3D toàn game: hệ hạt Points dùng chung
 * (buffer ~2000, tự quản life/vel), vệt chém hình quạt, vòng
 * đất (telegraph boss), tia beam, trụ sáng, đòn đánh, tan biến.
 * Mọi mesh hiệu ứng nằm dưới Engine.fxRoot và tự dọn dẹp.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils;

  var F = {
    _ok: false,
    _psSmall: null,   /* hạt nhỏ (0.38): bụi, dấu chân, vệt bay, hồi máu */
    _psLarge: null,   /* hạt to (0.9): nổ, trụ sáng */
    _pool: [],        /* sprite loé sáng tái dùng (hit / muzzle / heal) */
    _fx: []           /* hiệu ứng đang chạy: {obj, t, dur, tick, end} */
  };

  var _tmpColor = null;

  /* =========================================================
   * HỆ HẠT POINTS DÙNG CHUNG
   * Một buffer cố định, cấp phát MỘT lần lúc init; hạt chỉ là
   * các slot tái sử dụng (round-robin) — không cấp phát mỗi frame.
   * Màu fade về đen (additive blending → đen = vô hình).
   * ========================================================= */
  function makePS(count, size) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: size,
      map: MVL.Assets.tex('dot'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true
    });
    var points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    var ps = {
      points: points, count: count, cursor: 0, live: 0,
      pos: pos, col: col,
      vel: new Float32Array(count * 3),
      life: new Float32Array(count),
      life0: new Float32Array(count),
      grav: new Float32Array(count),
      drag: new Float32Array(count),
      c0: new Float32Array(count * 3),

      /* spawn một hạt vào slot tròn; ghi đè hạt cũ nếu hết chỗ */
      spawn: function (x, y, z, vx, vy, vz, r, g, b, life, grav, drag) {
        var i = this.cursor;
        this.cursor = (this.cursor + 1) % this.count;
        if (this.life[i] <= 0) this.live++;
        var i3 = i * 3;
        this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
        this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
        this.c0[i3] = r; this.c0[i3 + 1] = g; this.c0[i3 + 2] = b;
        this.life[i] = life;
        this.life0[i] = life;
        this.grav[i] = grav || 0;
        this.drag[i] = drag || 0;
      },

      update: function (dt) {
        if (this.live <= 0) return;
        var n = this.count, i, i3, k, dr;
        for (i = 0; i < n; i++) {
          if (this.life[i] <= 0) continue;
          this.life[i] -= dt;
          i3 = i * 3;
          if (this.life[i] <= 0) {           /* hạt hết đời → tắt màu */
            this.life[i] = 0;
            this.live--;
            this.col[i3] = 0; this.col[i3 + 1] = 0; this.col[i3 + 2] = 0;
            continue;
          }
          this.pos[i3] += this.vel[i3] * dt;
          this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
          this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
          this.vel[i3 + 1] -= this.grav[i] * dt;
          dr = 1 - this.drag[i] * dt;
          if (dr < 0) dr = 0;
          this.vel[i3] *= dr; this.vel[i3 + 1] *= dr; this.vel[i3 + 2] *= dr;
          k = this.life[i] / this.life0[i];
          k = k * k;                          /* fade nhanh cuối đời */
          this.col[i3] = this.c0[i3] * k;
          this.col[i3 + 1] = this.c0[i3 + 1] * k;
          this.col[i3 + 2] = this.c0[i3 + 2] * k;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      },

      clear: function () {
        var i;
        for (i = 0; i < this.count * 3; i++) this.col[i] = 0;
        for (i = 0; i < this.count; i++) this.life[i] = 0;
        this.live = 0;
        geo.attributes.color.needsUpdate = true;
      }
    };
    return ps;
  }

  /* ---------- tiện ích nhỏ ---------- */
  function _rgb(c) { _tmpColor.set(c); return _tmpColor; }

  /* đăng ký một hiệu ứng tạm: tick(it, k, dt) — k tiến độ 0..1;
     tick trả true để kết thúc sớm; end() gỡ mesh + giải phóng */
  function addFx(obj, dur, tick, end) {
    F._fx.push({ obj: obj, t: 0, dur: dur > 0 ? dur : 0.01, tick: tick, end: end });
  }

  /* gỡ mesh khỏi fxRoot + dispose geometry/material tự tạo
     (texture dùng chung của Assets — KHÔNG dispose) */
  function _cleanupMesh(mesh) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }

  /* loé sáng billoard từ pool sprite (hit, muzzle, hồi máu…) */
  function _flash(x, y, z, color, scale, dur) {
    var spr = null, i;
    for (i = 0; i < F._pool.length; i++) {
      if (!F._pool[i].visible) { spr = F._pool[i]; break; }
    }
    if (!spr) return;
    spr.visible = true;
    spr.material.color.set(color);
    spr.material.opacity = 1;
    spr.position.set(x, y, z);
    spr.scale.set(scale, scale, 1);
    addFx(spr, dur || 0.16, function (it, k) {
      var s = scale * (0.7 + 0.9 * (1 - k));
      spr.scale.set(s, s, 1);
      spr.material.opacity = 1 - k;
    }, function () {
      spr.visible = false;
      spr.material.opacity = 0;
    });
  }

  /* =========================================================
   * VÒNG ĐỜI MODULE
   * ========================================================= */
  F.init = function () {
    if (F._ok) return;
    if (!MVL.Engine || !MVL.Engine.fxRoot || !MVL.Assets) return;
    _tmpColor = new THREE.Color(1, 1, 1);
    F._psSmall = makePS(1200, 0.38);
    F._psLarge = makePS(800, 0.9);
    MVL.Engine.fxRoot.add(F._psSmall.points);
    MVL.Engine.fxRoot.add(F._psLarge.points);
    /* pool sprite loé sáng */
    for (var i = 0; i < 10; i++) {
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: MVL.Assets.tex('glow'),
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      }));
      spr.visible = false;
      MVL.Engine.fxRoot.add(spr);
      F._pool.push(spr);
    }
    F._ok = true;
  };

  F.update = function (dt) {
    if (!F._ok) return;
    F._psSmall.update(dt);
    F._psLarge.update(dt);
    var i, it, k, early;
    for (i = F._fx.length - 1; i >= 0; i--) {
      it = F._fx[i];
      it.t += dt;
      k = it.dur > 0 ? it.t / it.dur : 1;
      if (k > 1) k = 1;
      early = it.tick ? (it.tick(it, k, dt) === true) : false;
      if (early || it.t >= it.dur) {
        if (it.end) it.end();
        F._fx.splice(i, 1);
      }
    }
  };

  /* dọn sạch mọi hiệu ứng đang chạy (khi rời cảnh) */
  F.clearAll = function () {
    if (!F._ok) return;
    F._psSmall.clear();
    F._psLarge.clear();
    var i;
    for (i = F._fx.length - 1; i >= 0; i--) {
      if (F._fx[i].end) F._fx[i].end();
    }
    F._fx.length = 0;
  };

  F.dispose = function () {
    if (!F._ok) return;
    F.clearAll();
    var root = MVL.Engine.fxRoot;
    root.remove(F._psSmall.points);
    root.remove(F._psLarge.points);
    F._psSmall.points.geometry.dispose();
    F._psSmall.points.material.dispose();
    F._psLarge.points.geometry.dispose();
    F._psLarge.points.material.dispose();
    for (var i = 0; i < F._pool.length; i++) {
      root.remove(F._pool[i]);
      F._pool[i].material.dispose();
    }
    F._pool.length = 0;
    F._psSmall = null;
    F._psLarge = null;
    F._ok = false;
  };

  /* =========================================================
   * HIỆU ỨNG CỤ THỂ
   * ========================================================= */

  /* vụ nổ hạt khi trúng đòn; size phóng đại vận tốc + cỡ loé */
  F.hit = function (pos, opts) {
    if (!F._ok || !pos) return;
    opts = opts || {};
    var size = opts.size || 1;
    var count = Math.min(opts.count || 24, 42);
    var c = _rgb(opts.color || '#ffd27a');
    var ps = size >= 0.8 ? F._psLarge : F._psSmall;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = U.rand(1.6, 4.6) * size;
      ps.spawn(
        pos.x, pos.y + 0.25, pos.z,
        Math.cos(a) * sp * U.rand(0.4, 1),
        U.rand(1.5, 5.2) * size,
        Math.sin(a) * sp * U.rand(0.4, 1),
        c.r, c.g, c.b,
        U.rand(0.28, 0.62), 6.5, 1.4
      );
    }
    _flash(pos.x, pos.y + 0.4, pos.z, opts.color || '#ffd27a', 1.4 * size, 0.16);
  };

  /* vệt chém hình quạt, fade 0.18s.
     angleY theo quy ước atan2(dx, dz) — hướng quạt = (sin a, cos a) */
  F.slash = function (pos, angleY, opts) {
    if (!F._ok || !pos) return;
    opts = opts || {};
    var radius = opts.radius || 1.5;
    var arc = opts.arc === undefined ? 2.1 : opts.arc;
    var color = opts.color || '#e8e2d0';
    /* khúc vành khuyên dựng nằm: tâm quạt ở θ = π/2, xoay -angleY
       quanh trục Y để hướng đúng phía (đã kiểm chứng hình học) */
    var geo = new THREE.RingGeometry(0.22, radius, 18, 1, Math.PI / 2 - arc / 2, arc);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + 1.05, pos.z);
    mesh.rotation.y = -angleY;
    MVL.Engine.fxRoot.add(mesh);
    addFx(mesh, 0.18, function (it, k) {
      mat.opacity = 0.9 * (1 - k);
      var s = 0.85 + 0.45 * k;
      mesh.scale.set(s, 1, s);
    }, function () { _cleanupMesh(mesh); });
  };

  /* vòng đất: thường = nở ra rồi tắt; telegraph = nhấp đỏ dần
     theo duration rồi chớp trắng 0.12s (báo đòn phủ diện rộng boss) */
  F.ring = function (pos, opts) {
    if (!F._ok || !pos) return;
    opts = opts || {};
    var radius = opts.radius || 3;
    var thick = opts.thick || Math.max(0.25, radius * 0.1);
    var dur = opts.duration || (opts.telegraph ? 1.1 : 0.55);
    var color = opts.color || '#ff5040';
    var inner = Math.max(0.05, radius - thick);
    var geo = new THREE.RingGeometry(inner, radius, 40, 1);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opts.telegraph ? 0.3 : 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + 0.07, pos.z);
    MVL.Engine.fxRoot.add(mesh);
    if (opts.telegraph) {
      var base = new THREE.Color(color);
      var red = new THREE.Color('#ff2a2a');
      var white = new THREE.Color('#ffffff');
      var phase = 0;
      addFx(mesh, dur, function (it, k) {
        if (phase === 0) {
          mat.color.copy(base).lerp(red, 0.25 + 0.75 * k);
          mat.opacity = 0.3 + 0.4 * k + Math.sin(it.t * 14) * (0.08 + 0.2 * k);
          if (k >= 1) {          /* hết duration → chớp trắng báo nổ */
            phase = 1;
            it.t = 0;
            it.dur = 0.12;
            mat.color.copy(white);
            mat.opacity = 1;
            mesh.scale.setScalar(1.06);
          }
        } else {
          mat.opacity = 1 - k;
        }
      }, function () { _cleanupMesh(mesh); });
    } else {
      addFx(mesh, dur, function (it, k) {
        var s = 0.35 + 0.65 * k;
        mesh.scale.set(s, 1, s);
        mat.opacity = 0.95 * (1 - k * k);
      }, function () { _cleanupMesh(mesh); });
    }
  };

  /* tia năng lượng nối hai điểm (cylinder chĩa theo hướng a→b) */
  F.beam = function (a, b, opts) {
    if (!F._ok || !a || !b) return;
    opts = opts || {};
    var width = opts.width || 0.12;
    var dur = opts.dur || 0.25;
    var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.01) return;
    var geo = new THREE.CylinderGeometry(width, width, len, 6, 1, true);
    var mat = new THREE.MeshBasicMaterial({
      color: opts.color || '#9fd0ff',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx / len, dy / len, dz / len)
    );
    MVL.Engine.fxRoot.add(mesh);
    addFx(mesh, dur, function (it, k) {
      mat.opacity = 0.9 * (1 - k);
    }, function () { _cleanupMesh(mesh); });
  };

  /* trụ sáng mọc từ mặt đất (lên cấp, hồi sinh) */
  F.pillar = function (pos, opts) {
    if (!F._ok || !pos) return;
    opts = opts || {};
    var color = opts.color || '#ffd700';
    var dur = opts.dur || 1.15;
    var geo = new THREE.CylinderGeometry(0.42, 0.72, 4.6, 10, 1, true);
    geo.translate(0, 2.3, 0);      /* gốc trụ về y=0 để phóng to từ đất */
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + 0.05, pos.z);
    mesh.scale.y = 0.12;
    MVL.Engine.fxRoot.add(mesh);
    addFx(mesh, dur, function (it, k) {
      mesh.scale.y = 0.12 + 0.88 * Math.min(1, k * 2.2);
      mat.opacity = k < 0.25 ? 0.85 * (k / 0.25) : 0.85 * (1 - (k - 0.25) / 0.75);
    }, function () { _cleanupMesh(mesh); });
    /* hạt sáng bay lên quanh trụ */
    var c = _rgb(color);
    for (var i = 0; i < 16; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = U.rand(0.15, 0.6);
      F._psLarge.spawn(
        pos.x + Math.cos(a) * r, pos.y + U.rand(0.1, 3.6), pos.z + Math.sin(a) * r,
        Math.cos(a) * 0.3, U.rand(1.4, 3.2), Math.sin(a) * 0.3,
        c.r, c.g, c.b,
        U.rand(0.5, 1.0), -1.6, 0.8
      );
    }
  };

  /* hạt xanh lục bay lên — hồi máu */
  F.healFx = function (pos) {
    if (!F._ok || !pos) return;
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2;
      var r = U.rand(0.2, 1.0);
      F._psSmall.spawn(
        pos.x + Math.cos(a) * r, pos.y + U.rand(0.2, 0.9), pos.z + Math.sin(a) * r,
        Math.cos(a) * 0.25, U.rand(1.2, 2.4), Math.sin(a) * 0.25,
        0.45, 1.0, 0.62,
        U.rand(0.7, 1.2), -1.4, 0.6
      );
    }
    _flash(pos.x, pos.y + 1.0, pos.z, '#7ce07c', 1.1, 0.3);
  };

  /* bụi đất tung lên (đáp đất, va chạm) */
  F.dust = function (pos) {
    if (!F._ok || !pos) return;
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = U.rand(0.6, 1.8);
      F._psSmall.spawn(
        pos.x, pos.y + 0.15, pos.z,
        Math.cos(a) * sp, U.rand(0.5, 1.6), Math.sin(a) * sp,
        0.72, 0.62, 0.45,
        U.rand(0.35, 0.55), 3.2, 2.0
      );
    }
  };

  /* dấu chân — vài hạt bụi nhỏ rất ngắn */
  F.step = function (pos) {
    if (!F._ok || !pos) return;
    for (var i = 0; i < 3; i++) {
      F._psSmall.spawn(
        pos.x + U.rand(-0.12, 0.12), pos.y + 0.08, pos.z + U.rand(-0.12, 0.12),
        U.rand(-0.5, 0.5), U.rand(0.3, 0.8), U.rand(-0.5, 0.5),
        0.62, 0.58, 0.5,
        U.rand(0.2, 0.32), 1.5, 2.0
      );
    }
  };

  /* dải hạt theo pos (tàng hình thân pháp, đạn bay) — gọi mỗi frame
     khi di chuyển; tự hạn chế nếu hệ hạt gần đầy */
  F.trail = function (pos, color) {
    if (!F._ok || !pos) return;
    if (F._psSmall.live > F._psSmall.count * 0.85) return;
    var c = _rgb(color || '#9fd0ff');
    for (var i = 0; i < 2; i++) {
      F._psSmall.spawn(
        pos.x + U.rand(-0.1, 0.1), pos.y + U.rand(0.3, 0.9), pos.z + U.rand(-0.1, 0.1),
        U.rand(-0.5, 0.5), U.rand(0, 0.6), U.rand(-0.5, 0.5),
        c.r, c.g, c.b,
        U.rand(0.3, 0.55), 0.4, 1.0
      );
    }
  };

  /* tia phát chiêu tại điểm xuất phát của đạn */
  F.muzzle = function (pos, color) {
    if (!F._ok || !pos) return;
    _flash(pos.x, pos.y, pos.z, color || '#ffd27a', 0.8, 0.13);
    var c = _rgb(color || '#ffd27a');
    for (var i = 0; i < 6; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = U.rand(1.2, 2.8);
      F._psSmall.spawn(
        pos.x, pos.y, pos.z,
        Math.cos(a) * sp, Math.sin(a) * sp * 0.5, Math.sin(a) * sp,
        c.r, c.g, c.b,
        0.2, 0, 1.0
      );
    }
  };

  /* tan biến: co nhỏ + chìm xuống rồi gỡ khỏi scene.
     Dùng khi quái chết — geometry GLB dùng chung nên KHÔNG dispose,
     chỉ remove khỏi parent + Assets.untrack để bỏ mixer animation */
  F.dissolve = function (group, dur) {
    if (!group || !group.parent) return;
    dur = dur === undefined ? 0.9 : dur;
    var s0 = group.scale.x || 1;
    var y0 = group.position.y;
    addFx(group, dur, function (it, k) {
      if (!group.parent) return true;       /* nơi khác đã dọn — kết thúc */
      var s = Math.max(0.02, s0 * (1 - k));
      group.scale.set(s, s, s);
      group.position.y = y0 - k * 1.15;
      return false;
    }, function () {
      if (group.parent) group.parent.remove(group);
      if (MVL.Assets && MVL.Assets.untrack) MVL.Assets.untrack(group);
    });
  };

  MVL.FX = F;
})(window.MVL);
