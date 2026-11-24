      // ================= Matrix2D (2x3 affine) =================
      const Matrix2D = {
        identity() { return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }; },
        translate(m, x, y) { return { a: m.a, b: m.b, c: m.c, d: m.d, tx: m.tx + x, ty: m.ty + y }; },
        scale(m, sx, sy) { return { a: m.a * sx, b: m.b * sx, c: m.c * sy, d: m.d * sy, tx: m.tx, ty: m.ty }; },
        rotate(m, rad) { const c = Math.cos(rad), s = Math.sin(rad); return { a: m.a * c + m.c * s, b: m.b * c + m.d * s, c: m.a * -s + m.c * c, d: m.b * -s + m.d * c, tx: m.tx, ty: m.ty }; },
        apply(m, x, y) { return { x: m.a * x + m.c * y + m.tx, y: m.b * x + m.d * y + m.ty }; },
        mul(a, b) { return { a: a.a * b.a + a.c * b.b, b: a.b * b.a + a.d * b.b, c: a.a * b.c + a.c * b.d, d: a.b * b.c + a.d * b.d, tx: a.a * b.tx + a.c * b.ty + a.tx, ty: a.b * b.tx + a.d * b.ty + a.ty }; },
        invert(m) { const det = m.a * m.d - m.b * m.c; if (Math.abs(det) < 1e-9) return null; const inv = 1 / det; return { a: m.d * inv, b: -m.b * inv, c: -m.c * inv, d: m.a * inv, tx: (m.c * m.ty - m.d * m.tx) * inv, ty: (m.b * m.tx - m.a * m.ty) * inv }; },
      };

      // ================= QuadTree =================
      const QuadTree = {
        create(bounds, capacity = 4, depth = 0) {
          return { bounds, capacity, depth, items: [], nodes: null };
        },
        _split(t) {
          const { x, y, w, h } = t.bounds; const hw = w / 2, hh = h / 2;
          t.nodes = [
            QuadTree.create({ x, y, w: hw, h: hh }, t.capacity, t.depth + 1),
            QuadTree.create({ x: x + hw, y, w: hw, h: hh }, t.capacity, t.depth + 1),
            QuadTree.create({ x, y: y + hh, w: hw, h: hh }, t.capacity, t.depth + 1),
            QuadTree.create({ x: x + hw, y: y + hh, w: hw, h: hh }, t.capacity, t.depth + 1),
          ];
        },
        insert(t, item) {
          const { x, y, w, h } = t.bounds;
          if (item.x < x || item.y < y || item.x >= x + w || item.y >= y + h) return false;
          if (t.nodes) {
            for (const n of t.nodes) if (QuadTree.insert(n, item)) return true;
            return false;
          }
          t.items.push(item);
          if (t.items.length > t.capacity && t.depth < 8) {
            QuadTree._split(t);
            for (const it of t.items.splice(0)) QuadTree.insert(t, it);
          }
          return true;
        },
        query(t, range, out = []) {
          if (range.x > t.bounds.x + t.bounds.w || range.x + range.w < t.bounds.x || range.y > t.bounds.y + t.bounds.h || range.y + range.h < t.bounds.y) return out;
          if (t.nodes) { for (const n of t.nodes) QuadTree.query(n, range, out); return out; }
          for (const it of t.items) if (it.x >= range.x && it.x < range.x + range.w && it.y >= range.y && it.y < range.y + range.h) out.push(it);
          return out;
        },
        clear(t) { t.items.length = 0; t.nodes = null; },
      };

      // ================= Flocking =================
      const Flock = {
        separation(boid, others, radius, strength = 1) {
          let x = 0, y = 0, n = 0;
          for (const o of others) { const d = Math.hypot(o.x - boid.x, o.y - boid.y); if (d > 0 && d < radius) { x -= (o.x - boid.x) / d; y -= (o.y - boid.y) / d; n++; } }
          return n ? { x: (x / n) * strength, y: (y / n) * strength } : { x: 0, y: 0 };
        },
        alignment(boid, others, radius, strength = 1) {
          let x = 0, y = 0, n = 0;
          for (const o of others) { const d = Math.hypot(o.x - boid.x, o.y - boid.y); if (d > 0 && d < radius) { x += o.vx; y += o.vy; n++; } }
          return n ? { x: (x / n - boid.vx) * strength, y: (y / n - boid.vy) * strength } : { x: 0, y: 0 };
        },
        cohesion(boid, others, radius, strength = 1) {
          let x = 0, y = 0, n = 0;
          for (const o of others) { const d = Math.hypot(o.x - boid.x, o.y - boid.y); if (d > 0 && d < radius) { x += o.x; y += o.y; n++; } }
          return n ? { x: (x / n - boid.x) * strength, y: (y / n - boid.y) * strength } : { x: 0, y: 0 };
        },
      };

      // ================= Json =================
      const Json = {
        parse(s, def) { try { return JSON.parse(s); } catch (e) { return def; } },
        stringify(v, pretty) { try { return JSON.stringify(v, null, pretty ? 2 : 0); } catch (e) { return 'null'; } },
        safeGet(obj, path, def) { const parts = path.split('.'); let o = obj; for (const p of parts) { if (o === null || o === undefined) return def; o = o[p]; } return o === undefined ? def : o; },
      };

      // ================= Observable =================
      const Observable = {
        create(obj) {
          const listeners = {};
          const wrap = {};
          for (const k in obj) {
            let val = obj[k];
            Object.defineProperty(wrap, k, {
              get() { return val; },
              set(v) { if (val !== v) { val = v; (listeners[k] || []).slice().forEach((f) => { try { f(v); } catch (e) {} }); } },
            });
          }
          wrap.on = (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); return () => { listeners[k] = (listeners[k] || []).filter((f) => f !== fn); }; };
          wrap.set = (k, v) => { wrap[k] = v; };
          return wrap;
        },
      };

      // ================= UndoStack =================
      const UndoStack = {
        create(limit = 100) {
          const undo = [], redo = [];
          return {
            push(state) { undo.push(state); if (undo.length > limit) undo.shift(); redo.length = 0; },
            canUndo() { return undo.length > 0; },
            canRedo() { return redo.length > 0; },
            undo() { if (!undo.length) return null; const s = undo.pop(); redo.push(s); return s; },
            redo() { if (!redo.length) return null; const s = redo.pop(); undo.push(s); return s; },
            clear() { undo.length = 0; redo.length = 0; },
            depth: () => undo.length,
          };
        },
      };

      // ================= Async utils =================
      const Async = {
        async parallel(fns, concurrency = 4) {
          const results = new Array(fns.length); let i = 0;
          const worker = async () => { while (i < fns.length) { const idx = i++; results[idx] = await fns[idx](); } };
          await Promise.all(Array.from({ length: Math.min(concurrency, fns.length) }, worker));
          return results;
        },
        async retry(fn, attempts = 3, delayMs = 200) {
          let lastErr;
          for (let i = 0; i < attempts; i++) { try { return await fn(); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, delayMs)); } }
          throw lastErr;
        },
        async timeout(promise, ms) {
          return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + ms + 'ms')), ms))]);
        },
        interval(fn, ms) {
          const id = setInterval(async () => { try { await fn(); } catch (e) {} }, ms);
          return () => clearInterval(id);
        },
      };

      // ================= Hash =================
      const Hash = {
        fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; },
        djb2(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return h >>> 0; },
        short(str) { return Hash.fnv1a(str).toString(36); },
      };

      // ================= Spline (catmull-rom) =================
      const Spline = {
        catmullRom(pts, steps = 20) {
          const out = [];
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
            for (let j = 0; j < steps; j++) {
              const t = j / steps;
              const t2 = t * t, t3 = t2 * t;
              out.push({
                x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
              });
            }
          }
          out.push({ ...pts[pts.length - 1] });
          return out;
        },
        length(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return l; },
      };

      // ================= Input2 (wheel / raw keys) =================
      const Input2 = {
        wheel: 0,
        keys: {},
        _onWheel: (e) => { Input2.wheel = e.deltaY; },
        _onKey: (e, down) => { Input2.keys[e.code] = down; },
        init() {
          window.addEventListener('wheel', Input2._onWheel, { passive: true });
          window.addEventListener('keydown', (e) => Input2._onKey(e, true));
          window.addEventListener('keyup', (e) => Input2._onKey(e, false));
          return Input2;
        },
        isKey(code) { return !!Input2.keys[code]; },
        anyKey() { return Object.keys(Input2.keys).some((k) => Input2.keys[k]); },
        consumeWheel() { const w = Input2.wheel; Input2.wheel = 0; return w; },
      };
      Input2.init();

      // ================= Profiler =================
      const Profiler = {
        _marks: {},
        begin(name) { Profiler._marks[name] = performance.now(); },
        end(name) { const s = Profiler._marks[name]; if (s === undefined) return 0; const d = performance.now() - s; Profiler._marks[name] = undefined; return d; },
        time(fn, runs = 100) { const t0 = performance.now(); for (let i = 0; i < runs; i++) fn(); return (performance.now() - t0) / runs; },
      };

      // ================= SaveSlots =================
      const SaveSlots = {
        list() { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('velo_save_') === 0) out.push(k.replace('velo_save_', '')); } return out; },
        load(slot, def) { return Save.get(slot, def); },
        store(slot, val) { return Save.set(slot, val); },
        copy(from, to) { Save.set(to, Save.get(from)); },
        erase(slot) { Save.remove(slot); },
      };

      // ================= Physics (simple AABB helpers) =================
      const Physics = {
        gravity(velY, g = 980, dt = 1 / 60) { return velY + g * dt; },
        aabbResolve(rect, tileRects) {
          let moved = false;
          for (const t of tileRects) {
            if (!Rect.overlaps(rect, t)) continue;
            const left = rect.x + rect.w - t.x, right = t.x + t.w - rect.x;
            const top = rect.y + rect.h - t.y, bottom = t.y + t.h - rect.y;
            const min = Math.min(left, right, top, bottom);
            if (min === left) rect.x = t.x - rect.w;
            else if (min === right) rect.x = t.x + t.w;
            else if (min === top) rect.y = t.y - rect.h;
            else rect.y = t.y + t.h;
            moved = true;
          }
          return moved;
        },
        moveWithCollision(x, y, dx, dy, rects, w, h) {
          let nx = x + dx, ny = y + dy;
          const r = { x: nx, y, w, h };
          for (const t of rects) if (Rect.overlaps(r, t)) { nx = x; break; }
          r.x = nx; r.y = ny;
          for (const t of rects) if (Rect.overlaps(r, t)) { ny = y; break; }
          return { x: nx, y: ny };
        },
      };

      // ================= Timer (pausable) =================
      const Timer = {
        create(ms, autostart = true) {
          const t = { ms, left: ms, paused: !autostart, done: false, onDone: null, onTick: null };
          t.reset = () => { t.left = t.ms; t.done = false; };
          t.pause = () => { t.paused = true; };
          t.resume = () => { t.paused = false; };
          t.update = (dt) => { if (t.paused || t.done) return; t.left -= dt * 1000; if (t.onTick) t.onTick(t.left); if (t.left <= 0) { t.done = true; if (t.onDone) t.onDone(); } };
          return t;
        },
      };

      // ================= NineSlice =================
      const NineSlice = {
        create(texId, w, h, borders, parent) {
          const sp = Sprite(texId, w, h, parent);
          if (!sp) return null;
          const s = findComp(sp.node, 'Sprite');
          if (s) {
            s.draw_mode = 'sliced';
            s.border_left = borders[0]; s.border_top = borders[1]; s.border_right = borders[2]; s.border_bottom = borders[3];
          }
          sp.kind = 'NineSlice';
          return sp;
        },
      };

      // ================= Viewport =================
      const Viewport = {
        centerOn(x, y) { try { V.scene.view_origin.x = x - V.scene.view_size.x / 2; V.scene.view_origin.y = y - V.scene.view_size.y / 2; } catch (e) {} },
        moveBy(dx, dy) { try { V.scene.view_origin.x += dx; V.scene.view_origin.y += dy; } catch (e) {} },
        reset() { try { V.scene.view_origin.x = 0; V.scene.view_origin.y = 0; } catch (e) {} },
        get origin() { return V.scene.view_origin; },
        get size() { return V.scene.view_size; },
      };

