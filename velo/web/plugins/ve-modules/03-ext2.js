      // ================= Gesture (tap / double / long press / swipe) =================
      const Gesture = {
        _t0: 0, _lastTap: 0, _moved: 0, _sx: 0, _sy: 0, _pressed: false,
        tap: null, doubleTap: null, longPress: null, swipe: null,
        _onDown(x, y) { Gesture._t0 = performance.now(); Gesture._sx = x; Gesture._sy = y; Gesture._moved = 0; Gesture._pressed = true; },
        _onMove(x, y) { if (Gesture._pressed) Gesture._moved = Math.max(Gesture._moved, Math.hypot(x - Gesture._sx, y - Gesture._sy)); },
        _onUp(x, y) {
          Gesture._pressed = false;
          const dt = performance.now() - Gesture._t0;
          if (Gesture._moved > 24) { if (Gesture.swipe) Gesture.swipe(x - Gesture._sx, y - Gesture._sy, dt); return; }
          if (dt > 600) { if (Gesture.longPress) Gesture.longPress(x, y); return; }
          if (Gesture._lastTap && performance.now() - Gesture._lastTap < 320) { if (Gesture.doubleTap) Gesture.doubleTap(x, y); Gesture._lastTap = 0; return; }
          Gesture._lastTap = performance.now();
          if (Gesture.tap) Gesture.tap(x, y);
        },
        init() {
          window.addEventListener('pointerdown', (e) => Gesture._onDown(e.clientX, e.clientY));
          window.addEventListener('pointermove', (e) => Gesture._onMove(e.clientX, e.clientY));
          window.addEventListener('pointerup', (e) => Gesture._onUp(e.clientX, e.clientY));
          return Gesture;
        },
      };
      Gesture.init();

      // ================= Polygon (regular / star generators) =================
      const Polygon = {
        regular(cx, cy, radius, sides, rot = -Math.PI / 2) {
          return Array.from({ length: sides }, (_, i) => ({ x: cx + Math.cos(rot + (i / sides) * Math.PI * 2) * radius, y: cy + Math.sin(rot + (i / sides) * Math.PI * 2) * radius }));
        },
        star(cx, cy, outer, inner, points, rot = -Math.PI / 2) {
          const out = [];
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outer : inner;
            out.push({ x: cx + Math.cos(rot + (i / (points * 2)) * Math.PI * 2) * r, y: cy + Math.sin(rot + (i / (points * 2)) * Math.PI * 2) * r });
          }
          return out;
        },
        rounded(cx, cy, w, h, r) { return [{ x: cx - w / 2 + r, y: cy - h / 2 }, { x: cx + w / 2 - r, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 + r }, { x: cx + w / 2, y: cy + h / 2 - r }, { x: cx + w / 2 - r, y: cy + h / 2 }, { x: cx - w / 2 + r, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 - r }, { x: cx - w / 2, y: cy - h / 2 + r }]; },
      };

      // ================= TweenPath (move a node along a Path/Bezier) =================
      const TweenPath = {
        follow(node, points, ms, ease, onDone) {
          const t0 = performance.now();
          const k = easeFns[ease] || easeFns.linear;
          const total = points.length - 1;
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / ms);
            const e = k(t) * total;
            const i = Math.min(total, Math.floor(e));
            const f = e - i;
            const a = points[i], b = points[Math.min(total, i + 1)];
            node.position.x = a.x + (b.x - a.x) * f;
            node.position.y = a.y + (b.y - a.y) * f;
            if (t < 1) requestAnimationFrame(step); else if (onDone) onDone();
          };
          step();
        },
      };

      // ================= Serialize (object <-> query string) =================
      const Serialize = {
        toQuery(obj) { return Object.entries(obj).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&'); },
        fromQuery(qs) {
          const out = {};
          for (const pair of qs.replace(/^\?/, '').split('&')) { if (!pair) continue; const [k, v] = pair.split('='); out[decodeURIComponent(k)] = decodeURIComponent(v || ''); }
          return out;
        },
      };

      // ================= Vec3 / Matrix3 =================
      const Vec3 = {
        create(x = 0, y = 0, z = 0) { return { x, y, z }; },
        add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
        sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
        dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
        cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; },
        len(a) { return Math.hypot(a.x, a.y, a.z); },
        norm(a) { const l = Vec3.len(a) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; },
      };
      const Matrix3 = {
        identity() { return [1, 0, 0, 0, 1, 0, 0, 0, 1]; },
        mul(a, b) { return [a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8], a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8], a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8]]; },
      };

      // ================= Text2 (format helpers) =================
      const Text2 = {
        ellipsis(s, n) { return s.length > n ? s.slice(0, n - 1) + 'â€¦' : s; },
        padTime(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return utils.pad(m) + ':' + utils.pad(s); },
        money(n) { return n.toLocaleString('en-US'); },
        ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); },
      };

      // ================= SceneFlow =================
      const SceneFlow = {
        to(name, opts) { Scene.change(name, opts || { fade: 0.3 }); },
        back() { if (V.scene.history && V.scene.history.length) { V.scene.change_scene(V.scene.history[V.scene.history.length - 1]); } else { Scene.change('scenes/map.scene'); } },
        reload() { Scene.reload(); },
      };

      // ================= Grid2 (hex grid helpers) =================
      const Grid2 = {
        hexAxial(q, r) { return { q, r }; },
        hexToPixel(q, r, size) { return { x: size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r), y: size * (3 / 2 * r) }; },
        hexDistance(a, b) { return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2; },
        hexNeighbors(q, r) { return [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([dq, dr]) => ({ q: q + dq, r: r + dr })); },
      };

      // ================= Anim (frame cycling helper) =================
      const Anim = {
        cycle(frames, fps, onFrame) {
          let t = 0;
          const id = setInterval(() => { t = (t + 1) % frames; onFrame(t); }, 1000 / fps);
          return () => clearInterval(id);
        },
        pingpong(frames, fps, onFrame) {
          let t = 0, dir = 1;
          const id = setInterval(() => { t += dir; if (t >= frames - 1 || t <= 0) dir *= -1; onFrame(t); }, 1000 / fps);
          return () => clearInterval(id);
        },
      };

      // ================= Utils3 =================
      const Utils3 = {
        memoize(fn) { const c = new Map(); return (...a) => { const k = JSON.stringify(a); if (c.has(k)) return c.get(k); const v = fn(...a); c.set(k, v); return v; }; },
        once(fn) { let done = false, v; return (...a) => { if (done) return v; done = true; v = fn(...a); return v; }; },
        deepFreeze(o) { if (o && typeof o === 'object') { Object.freeze(o); for (const k of Object.keys(o)) Utils3.deepFreeze(o[k]); } return o; },
        flatten(arr) { return arr.reduce((a, v) => a.concat(Array.isArray(v) ? Utils3.flatten(v) : [v]), []); },
      };

