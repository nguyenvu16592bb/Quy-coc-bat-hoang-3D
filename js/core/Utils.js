/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Utils.js
 * EventBus, RNG có seed, Noise 2D (fbm), tiện ích chung.
 * Module kiểu namespace (KHÔNG ES module).
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = {};
  var __uid = 0;
  U.uid = function (p) {
    __uid++;
    return (p || 'id') + '_' + Date.now().toString(36) + '_' + __uid;
  };

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.damp = function (a, b, lambda, dt) { return U.lerp(a, b, 1 - Math.exp(-lambda * dt)); };
  U.rand = function (a, b) { return a + Math.random() * (b - a); };
  U.randInt = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  U.dist2D = function (x1, z1, x2, z2) {
    var dx = x2 - x1, dz = z2 - z1; return Math.sqrt(dx * dx + dz * dz);
  };
  U.angleDelta = function (a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.fmt = function (n) {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return '' + n;
  };
  U.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- EventBus ---------- */
  var Bus = {
    _m: {},
    on: function (evt, fn) {
      (this._m[evt] = this._m[evt] || []).push(fn);
      var self = this;
      return function () { self.off(evt, fn); };
    },
    once: function (evt, fn) {
      var off = this.on(evt, function (d) { off(); fn(d); });
      return off;
    },
    off: function (evt, fn) {
      var m = this._m[evt]; if (!m) return;
      var i = m.indexOf(fn); if (i >= 0) m.splice(i, 1);
    },
    emit: function (evt, data) {
      var m = this._m[evt]; if (!m || !m.length) return;
      m = m.slice();
      for (var i = 0; i < m.length; i++) {
        try { m[i](data); }
        catch (err) { console.error('[Bus] listener lỗi "' + evt + '":', err && err.message || err); }
      }
    }
  };
  U.Bus = Bus; MVL.Bus = Bus;

  /* ---------- RNG mulberry32 (có seed — dùng cho terrain, spawn) ---------- */
  U.RNG = {
    create: function (seed) {
      var s = (seed || 1337) >>> 0;
      function next() {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        var t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      return {
        next: next,
        range: function (a, b) { return a + next() * (b - a); },
        int: function (a, b) { return Math.floor(a + next() * (b - a + 1)); },
        pick: function (arr) { return arr[Math.floor(next() * arr.length)]; }
      };
    }
  };

  /* ---------- Noise 2D giá trị + fbm (nhanh, đủ cho terrain) ---------- */
  U.Noise = {
    create: function (seed) {
      var rng = U.RNG.create(seed || 1337);
      var S = 256, grid = new Float32Array(S * S), i;
      for (i = 0; i < S * S; i++) grid[i] = rng.next();
      function at(x, y) { return grid[((y & 255) << 8) | (x & 255)]; }
      function sm(t) { return t * t * (3 - 2 * t); }
      function n2(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        var a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
        var u = sm(xf), v = sm(yf);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
      }
      function fbm(x, y, oct, lac, gain) {
        oct = oct || 4; lac = lac || 2; gain = gain || 0.5;
        var amp = 0.5, f = 1, sum = 0, norm = 0;
        for (var o = 0; o < oct; o++) {
          sum += amp * n2(x * f, y * f);
          norm += amp; amp *= gain; f *= lac;
        }
        return sum / norm;
      }
      return {
        n2: function (x, y) { return n2(x, y) * 2 - 1; },
        fbm: function (x, y, oct) { return fbm(x, y, oct) * 2 - 1; }
      };
    }
  };

  /* ---------- Giải phóng sâu geometry/material/texture ---------- */
  U.disposeDeep = function (obj) {
    if (!obj) return;
    obj.traverse(function (o) {
      if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
      if (o.material) {
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        for (var i = 0; i < mats.length; i++) {
          var m = mats[i];
          for (var k in m) {
            var v = m[k];
            if (v && v.isTexture) { try { v.dispose(); } catch (e) {} }
          }
          try { m.dispose(); } catch (e) {}
        }
      }
    });
  };

  /* ---------- Sprite nhãn (dùng cho cổng dịch chuyển, dấu nhiệm vụ) ---------- */
  U.makeTextSprite = function (text, opts) {
    opts = opts || {};
    var size = opts.size || 28;
    var color = opts.color || '#ffd700';
    var pad = 12;
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    ctx.font = 'bold ' + size + 'px "Noto Serif SC", Georgia, serif';
    var w = ctx.measureText(text).width + pad * 2;
    cv.width = Math.max(64, w);
    cv.height = size + pad * 2;
    ctx = cv.getContext('2d');
    ctx.font = 'bold ' + size + 'px "Noto Serif SC", Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 5;
    ctx.strokeText(text, cv.width / 2, cv.height / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, cv.width / 2, cv.height / 2);
    var tex = new THREE.CanvasTexture(cv);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    var spr = new THREE.Sprite(mat);
    var scale = (opts.scale || 1) * 0.012;
    spr.scale.set(cv.width * scale, cv.height * scale, 1);
    return spr;
  };

  MVL.Utils = U;
})(window.MVL);

