      // ================= Gamepad =================
      const Gamepad = {
        get all() { try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; } },
        get connected() { return Gamepad.all.filter((g) => g && g.connected).length; },
        get first() { return Gamepad.all.find((g) => g && g.connected) || null; },
        button(pad, index) { return pad && pad.buttons[index] ? pad.buttons[index].pressed : false; },
        axis(pad, index) { return pad && pad.axes[index] !== undefined ? pad.axes[index] : 0; },
        onConnect(fn) { window.addEventListener('gamepadconnected', (e) => fn(e.gamepad)); },
        onDisconnect(fn) { window.addEventListener('gamepaddisconnected', (e) => fn(e.gamepad)); },
      };

      // ================= A* pathfinding =================
      const AStar = {
        find(grid, sx, sy, tx, ty, passable, diag = false) {
          if (!grid.inBounds(sx, sy) || !grid.inBounds(tx, ty)) return null;
          const open = [[sx, sy]], came = new Map(), g = new Map(), f = new Map();
          const key = (x, y) => x + ',' + y;
          g.set(key(sx, sy), 0); f.set(key(sx, sy), Math.hypot(tx - sx, ty - sy));
          const dirs = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
          const closed = new Set();
          while (open.length) {
            let bi = 0; for (let i = 1; i < open.length; i++) { if (f.get(key(open[i][0], open[i][1])) < f.get(key(open[bi][0], open[bi][1]))) bi = i; }
            const [cx, cy] = open.splice(bi, 1)[0];
            const ck = key(cx, cy);
            if (cx === tx && cy === ty) {
              const path = []; let cur = ck;
              while (cur !== key(sx, sy)) { const [px, py] = cur.split(',').map(Number); path.unshift([px, py]); cur = came.get(cur); }
              return path;
            }
            closed.add(ck);
            for (const [dx, dy] of dirs) {
              const nx = cx + dx, ny = cy + dy, nk = key(nx, ny);
              if (!grid.inBounds(nx, ny) || closed.has(nk)) continue;
              if (passable && !passable(nx, ny, grid.get(nx, ny))) continue;
              const ng = g.get(ck) + (dx && dy ? 1.414 : 1);
              if (g.has(nk) && ng >= g.get(nk)) continue;
              came.set(nk, ck); g.set(nk, ng); f.set(nk, ng + Math.hypot(tx - nx, ty - ny));
              if (!open.some((p) => p[0] === nx && p[1] === ny)) open.push([nx, ny]);
            }
          }
          return null;
        },
      };

      // ================= Geometry =================
      const Geom = {
        pointInPolygon(px, py, poly) {
          let inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
          }
          return inside;
        },
        lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
          const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
          if (Math.abs(d) < 1e-9) return null;
          const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
          const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
          return null;
        },
        polygonArea(poly) {
          let a = 0;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
          return Math.abs(a) / 2;
        },
        closestPointOnSegment(px, py, x1, y1, x2, y2) {
          const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
          const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
          return { x: x1 + t * dx, y: y1 + t * dy };
        },
      };

      // ================= Bezier (cubic eval + arc length) =================
      const Bezier = {
        eval(p0, p1, p2, p3, t) {
          const u = 1 - t;
          return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
        },
        length(p0, p1, p2, p3, steps = 24) {
          let l = 0, prev = p0;
          for (let i = 1; i <= steps; i++) { const pt = Bezier.eval(p0, p1, p2, p3, i / steps); l += Math.hypot(pt.x - prev.x, pt.y - prev.y); prev = pt; }
          return l;
        },
        tangent(p0, p1, p2, p3, t) {
          const u = 1 - t;
          return { x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x), y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y) };
        },
      };

      // ================= Tween2 (repeat / yoyo / stagger) =================
      const Tween2 = {
        repeat(node, props, ms, times, ease, onDone) {
          let n = 0;
          const step = () => { if (n >= times) { if (onDone) onDone(); return; } n++; Tween.to(node, props, ms, ease, step); };
          step();
        },
        yoyo(node, propsA, propsB, ms, times, ease) {
          let n = 0;
          const go = (p) => { if (n >= times) return; n++; Tween.to(node, p, ms, ease, () => go(p === propsA ? propsB : propsA)); };
          go(propsA);
        },
        stagger(nodes, props, ms, delay, ease) {
          nodes.forEach((n, i) => { setTimeout(() => Tween.to(n, props, ms, ease), i * delay); });
        },
      };

      // ================= Color2 (HSL + palettes) =================
      const Color2 = {
        hsl2rgb(h, s, l) {
          h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
          const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
          return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), 255];
        },
        rgb2hsl(r, g, b) {
          r /= 255; g /= 255; b /= 255;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
          if (mx === mn) return [0, 0, l * 100];
          const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
          let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
          return [h * 60, s * 100, l * 100];
        },
        palette(baseHue, n, sat = 70, light = 55) {
          return Array.from({ length: n }, (_, i) => Color2.hsl2rgb(baseHue + (360 / n) * i, sat, light));
        },
        randomHue(sat = 75, light = 55) { return Color2.hsl2rgb(Math.random() * 360, sat, light); },
      };

      // ================= String utils =================
      const Strings = {
        slugify(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-'); },
        truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + 'â€¦' : s; },
        capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
        camelCase(s) { return String(s).replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')); },
        kebab(s) { return Strings.slugify(s); },
        pluralize(n, singular, plural) { return n === 1 ? singular : (plural || singular + 's'); },
        padStart(s, len, ch) { return String(s).padStart(len, ch || '0'); },
      };

      // ================= Array utils =================
      const Arrays = {
        range(n, start = 0) { return Array.from({ length: n }, (_, i) => start + i); },
        zip(a, b) { return a.map((x, i) => [x, b[i]]); },
        pairs(arr) { return arr.map((v, i) => [v, arr[(i + 1) % arr.length]]); },
        fill(n, v) { return Array.from({ length: n }, () => (typeof v === 'function' ? v() : v)); },
        keyBy(arr, fn) { const o = {}; for (const x of arr) o[fn(x)] = x; return o; },
        toMatrix(arr, cols) { const m = []; for (let i = 0; i < arr.length; i += cols) m.push(arr.slice(i, i + cols)); return m; },
        rotate(arr, k) { const n = arr.length; return arr.map((_, i) => arr[((i + k) % n + n) % n]); },
      };

      // ================= EventBus (global) =================
      const EventBus = {
        _h: {},
        on(name, fn) { (EventBus._h[name] = EventBus._h[name] || []).push(fn); return () => EventBus.off(name, fn); },
        once(name, fn) { const w = (...a) => { EventBus.off(name, w); fn(...a); }; return EventBus.on(name, w); },
        off(name, fn) { if (EventBus._h[name]) EventBus._h[name] = EventBus._h[name].filter((f) => f !== fn); },
        emit(name, ...a) { (EventBus._h[name] || []).slice().forEach((f) => { try { f(...a); } catch (e) {} }); },
        clear(name) { if (name) delete EventBus._h[name]; else EventBus._h = {}; },
      };

      // ================= ParticlesFX presets =================
      const ParticlesFX = {
        burst(x, y, n, tex, speed) {
          const fx = Particles.spawn(tex || 'fx/proj_fire.png', x, y);
          return fx;
        },
        confetti(x, y, n = 24) { return ParticlesFX.burst(x, y, n, 'fx/proj_fire.png', 120); },
        explosion(x, y) { return ParticlesFX.burst(x, y, 18, 'fx/proj_fire.png', 200); },
      };

      // ================= Audio2 (WebAudio synth fallback) =================
      const Audio2 = {
        _ctx: null,
        ctx() { if (!Audio2._ctx) { try { Audio2._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return Audio2._ctx; },
        tone(freq, dur = 0.15, vol = 0.2, type = 'square') {
          const c = Audio2.ctx(); if (!c) return;
          const o = c.createOscillator(), g = c.createGain();
          o.type = type; o.frequency.value = freq;
          g.gain.setValueAtTime(vol, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
          o.connect(g).connect(c.destination);
          o.start(); o.stop(c.currentTime + dur);
        },
        blip(freq = 880, dur = 0.08) { Audio2.tone(freq, dur, 0.12, 'sine'); },
        click() { Audio2.blip(1200, 0.05); },
      };

      // ================= SaveIO =================
      const SaveIO = {
        exportBase64() {
          const all = {};
          for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('velo_save_') === 0) all[k] = localStorage.getItem(k); }
          try { return btoa(unescape(encodeURIComponent(JSON.stringify(all)))); } catch (e) { return null; }
        },
        importBase64(b64) {
          try {
            const all = JSON.parse(decodeURIComponent(escape(atob(b64))));
            let n = 0;
            for (const k in all) { localStorage.setItem(k, all[k]); n++; }
            return n;
          } catch (e) { return 0; }
        },
      };

      // ================= Perf =================
      const Perf = {
        history: [],
        _tick(dt) {
          Perf.history.push(1 / Math.max(0.001, dt));
          if (Perf.history.length > 120) Perf.history.shift();
        },
        get avgFps() { return Perf.history.length ? Math.round(Perf.history.reduce((a, b) => a + b, 0) / Perf.history.length) : 0; },
        get minFps() { return Perf.history.length ? Math.round(Math.min(...Perf.history)) : 0; },
        get maxFps() { return Perf.history.length ? Math.round(Math.max(...Perf.history)) : 0; },
      };
      Ticker.add((dt) => Perf._tick(dt));

      // ================= ScreenFx (flash / fade overlays) =================
      const ScreenFx = {
        _flash: null,
        flash(color, ms = 200) {
          if (!ScreenFx._flash) {
            ScreenFx._flash = Graphics(Stage.root);
            ScreenFx._flash.rect(Stage.width * 2, Stage.height * 2, [255, 255, 255, 0]);
            ScreenFx._flash.x = Stage.width / 2; ScreenFx._flash.y = Stage.height / 2;
            ScreenFx._flash.node.z_index = 999;
          }
          const p = findComp(ScreenFx._flash.node, 'Panel');
          if (p) { p.color = norm(color || [255, 255, 255, 255]); p.color[3] = 200; }
          Tween.to(ScreenFx._flash.node, { alpha: 0 }, ms, 'out');
        },
      };

      // ================= Utils2 =================
      const Utils2 = {
        clampAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); },
        smoothDamp(current, target, smoothTime, dt) {
          return utils.damp(current, target, 1 / Math.max(0.01, smoothTime), dt);
        },
        mapClamp(v, a, b, c, d) { return utils.clamp(utils.map(v, a, b, c, d), Math.min(c, d), Math.max(c, d)); },
        formatBytes(n) { if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; },
        uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }); },
        throttleMs(fn, ms) { return utilExtra.throttle(fn, ms); },
      };

