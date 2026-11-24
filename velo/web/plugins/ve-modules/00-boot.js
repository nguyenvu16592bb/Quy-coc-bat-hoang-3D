// ============================================================
// velo-engine-api.js â€” exposes the FULL Velo engine runtime as a
// Pixi-compatible API on window.VE (v4 "ULTRA").
//
// EVERYTHING creates REAL Velo nodes/components in the SAME scene
// graph and renders through the SAME WebGL pipeline as the game â€”
// no second canvas, no Pixi, no overlay.
//
// Runtime facts (discovered by probing the engine):
//   â€¢ Node class  -> window.velo.scene.root.constructor
//     - constructor takes NO name (node.name is a plain field, set after)
//   â€¢ Components  -> window.velo.registry.types.get('Sprite') etc.
//     - values are ComponentType FACTORIES: .create() â†’ instance
//   â€¢ Sprite.texture must be { id, type:'asset', is_set: () => true }
//     (component.on_load â†’ acquire() calls texture.is_set())
//   â€¢ size/color are plain {x,y} / [r,g,b,a] objects
//   â€¢ attach via node.add_component_dyn(comp) then host.add_child(node)
//
// Modules: Texture, Sprite, AnimatedSprite, Text, Container, Graphics,
// Ticker, Tween, Sequence, Loader, Store, Scene, Input, Audio, Particles,
// Events, StateMachine, Pool, Coroutine, Color, Math2D (Vec2/Rect/Circle/
// collide), Path, SpriteSheet, Layout, Dom, Debug, Fps, Stage + utils.
// ============================================================
(() => {
  'use strict';
  const init = () => {
    try {
      const V = window.velo;
      if (!V || !V.scene || !V.scene.root || !V.registry) return false;

      const NodeCls = V.scene.root.constructor;
      const Comp = (name) => V.registry.types.get(name);
      const norm = (c) => (Array.isArray(c) ? c : [c.r ?? 255, c.g ?? 255, c.b ?? 255, c.a ?? 255]);
      const hex = (h, a = 255) => [(h >> 16) & 255, (h >> 8) & 255, h & 255, a];
      const findComp = (n, name) => n.components.find((x) => x && x.constructor && x.constructor.name === name);

      // ================= Math2D =================
      const Vec2 = {
        create(x = 0, y = 0) { return { x, y }; },
        add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
        sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
        mul(a, s) { return { x: a.x * s, y: a.y * s }; },
        div(a, s) { return { x: a.x / s, y: a.y / s }; },
        dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); },
        len(a) { return Math.hypot(a.x, a.y); },
        norm(a) { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
        dot(a, b) { return a.x * b.x + a.y * b.y; },
        lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; },
        angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); },
        fromAngle(rad, len = 1) { return { x: Math.cos(rad) * len, y: Math.sin(rad) * len }; },
        rot(v, rad) { const c = Math.cos(rad), s = Math.sin(rad); return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }; },
        clamp(a, min, max) { return { x: Math.max(min.x, Math.min(max.x, a.x)), y: Math.max(min.y, Math.min(max.y, a.y)) }; },
        zero: { x: 0, y: 0 },
      };
      const Rect = {
        create(x = 0, y = 0, w = 0, h = 0) { return { x, y, w, h }; },
        contains(r, px, py) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; },
        overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; },
        center(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
        fromCenter(cx, cy, w, h) { return { x: cx - w / 2, y: cy - h / 2, w, h }; },
      };
      const Circle = {
        create(x = 0, y = 0, r = 0) { return { x, y, r }; },
        contains(c, px, py) { return Math.hypot(px - c.x, py - c.y) <= c.r; },
        overlaps(a, b) { return Math.hypot(b.x - a.x, b.y - a.y) <= a.r + b.r; },
      };
      const collide = {
        pointRect(px, py, r) { return Rect.contains(r, px, py); },
        pointCircle(px, py, c) { return Circle.contains(c, px, py); },
        rectRect(a, b) { return Rect.overlaps(a, b); },
        circleCircle(a, b) { return Circle.overlaps(a, b); },
        rectCircle(r, c) {
          const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
          const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
          return Math.hypot(c.x - nx, c.y - ny) <= c.r;
        },
      };

      // ================= Texture =================
      const Texture = {
        from(id) { return { id, type: 'asset', is_set: () => true }; },
        fromAsset(id) { return Texture.from(id); },
        WHITE: 'ui/close.png',
      };

      // ================= Sprite =================
      const Sprite = (texId, w, h, parent) => {
        const host = parent && parent.node ? parent.node : (parent || V.scene.root);
        const n = new NodeCls(); n.name = 'VeSprite';
        const s = Comp('Sprite').create();
        s.texture = { id: texId, type: 'asset', is_set: () => true };
        s.size = { x: w || 0, y: h || 0 };
        s.color = [255, 255, 255, 255];
        n.add_component_dyn(s);
        host.add_child(n);
        const api = {
          node: n,
          kind: 'Sprite',
          get x() { return n.position.x; }, set x(v) { n.position.x = v; },
          get y() { return n.position.y; }, set y(v) { n.position.y = v; },
          get position() { return n.position; }, set position(v) { n.position = v; },
          get rotation() { return n.rotation; }, set rotation(v) { n.rotation = v; },
          get scaleX() { return n.scale.x; }, set scaleX(v) { n.scale.x = v; },
          get scaleY() { return n.scale.y; }, set scaleY(v) { n.scale.y = v; },
          get scale() { return n.scale; }, set scale(v) { n.scale.x = v.x; n.scale.y = v.y; },
          get width() { return s.size ? s.size.x : 0; }, set width(v) { if (s.size) s.size.x = v; },
          get height() { return s.size ? s.size.y : 0; }, set height(v) { if (s.size) s.size.y = v; },
          get visible() { return n.active; }, set visible(v) { n.active = v; },
          get alpha() { return s.color ? s.color[3] : 255; }, set alpha(v) { if (s.color) s.color[3] = v; },
          get tint() { return s.color; }, set tint(c) { s.color = norm(c); },
          get flipX() { return !!s.flip_x; }, set flipX(v) { s.flip_x = !!v; },
          get flipY() { return !!s.flip_y; }, set flipY(v) { s.flip_y = !!v; },
          get frame() { return s.frame; }, set frame(v) { s.frame = v; },
          get anchor() { return s.anchor; }, set anchor(v) { s.anchor = v; },
          get texture() { return s.texture && s.texture.id; },
          set_texture(id) { s.texture = { id, type: 'asset', is_set: () => true }; },
          set_size(w, h) { s.size = { x: w, y: h }; },
          auto_size() { if (s.tex) { try { s.size = { x: s.tex.frame_w(), y: s.tex.frame_h() }; } catch (e) {} } },
          get tex() { return s.tex; },
          move_by(dx, dy) { n.position.x += dx; n.position.y += dy; },
          rotate_by(rad) { n.rotation += rad; },
          look_at(x, y) { n.rotation = Math.atan2(y - n.position.y, x - n.position.x); },
          world_pos() { try { return n.world_position(); } catch (e) { return n.position; } },
          destroy() { n.destroy(); },
        };
        if ((!w || !h) && s.tex) api.auto_size();
        return api;
      };

      // ================= AnimatedSprite =================
      const AnimatedSprite = (texId, frames, fps, parent) => {
        const sp = Sprite(texId, 0, 0, parent);
        if (!sp) return null;
        const s = findComp(sp.node, 'Sprite');
        s._veAnim = { t: 0, fps: fps || 12, frames: frames || 0, playing: true, loop: true };
        sp.kind = 'AnimatedSprite';
        sp.play = () => { s._veAnim.playing = true; };
        sp.stop = () => { s._veAnim.playing = false; };
        sp.goto = (f) => { sp.frame = f % Math.max(1, s._veAnim.frames); };
        sp.loop = (v) => { s._veAnim.loop = v; };
        sp.onEnd = null;
        return sp;
      };

      // ================= Text =================
      const Text = (text, size, color, parent) => {
        const host = parent && parent.node ? parent.node : (parent || V.scene.root);
        const n = new NodeCls(); n.name = 'VeText';
        const l = Comp('Label').create();
        l.text = String(text || '');
        l.size = size || 16;
        l.align = 'center';
        l.color = norm(color || [255, 255, 255, 255]);
        n.add_component_dyn(l);
        host.add_child(n);
        const api = {
          node: n,
          kind: 'Text',
          get x() { return n.position.x; }, set x(v) { n.position.x = v; },
          get y() { return n.position.y; }, set y(v) { n.position.y = v; },
          get rotation() { return n.rotation; }, set rotation(v) { n.rotation = v; },
          get scaleX() { return n.scale.x; }, set scaleX(v) { n.scale.x = v; },
          get scaleY() { return n.scale.y; }, set scaleY(v) { n.scale.y = v; },
          get visible() { return n.active; }, set visible(v) { n.active = v; },
          get text() { return l.text; }, set text(v) { l.text = String(v); },
          get alpha() { return l.color ? l.color[3] : 255; }, set alpha(v) { if (l.color) l.color[3] = v; },
          get color() { return l.color; }, set color(c) { l.color = norm(c); },
          get size() { return l.size; }, set size(v) { l.size = v; },
          get align() { return l.align; }, set align(v) { l.align = v; },
          set_size(v) { l.size = v; },
          fade_in(ms) { const t0 = performance.now(); const step = () => { const t = Math.min(1, (performance.now() - t0) / ms); api.alpha = t * 255; if (t < 1) requestAnimationFrame(step); }; step(); },
          destroy() { n.destroy(); },
        };
        return api;
      };

      // ================= Container =================
      const Container = (name, parent) => {
        const host = parent && parent.node ? parent.node : (parent || V.scene.root);
        const n = new NodeCls(); n.name = name || 'VeContainer';
        if (host) host.add_child(n);
        const api = {
          node: n,
          kind: 'Container',
          get x() { return n.position.x; }, set x(v) { n.position.x = v; },
          get y() { return n.position.y; }, set y(v) { n.position.y = v; },
          get position() { return n.position; }, set position(v) { n.position = v; },
          get rotation() { return n.rotation; }, set rotation(v) { n.rotation = v; },
          get scaleX() { return n.scale.x; }, set scaleX(v) { n.scale.x = v; },
          get scaleY() { return n.scale.y; }, set scaleY(v) { n.scale.y = v; },
          get scale() { return n.scale; }, set scale(v) { n.scale.x = v.x; n.scale.y = v.y; },
          get visible() { return n.active; }, set visible(v) { n.active = v; },
          get children() { return n.children; },
          get alpha() { return n._veAlpha ?? 1; },
          set alpha(v) {
            n._veAlpha = v;
            const st = [n]; while (st.length) { const c = st.pop(); for (const ch of c.children) st.push(ch);
              for (const cc of c.components) { if (cc.color && cc.color.length >= 4) cc.color[3] = v * 255; } }
          },
          addChild(ch) { n.add_child(ch.node || ch); return ch; },
          removeChild(ch) { (ch.node || ch).destroy(); },
          clear() { for (const ch of n.children.slice()) ch.destroy(); },
          find(name) { return n.find(name); },
          get_child(i) { return n.children[i]; },
          count() { return n.children.length; },
          destroy() { n.destroy(); },
        };
        return api;
      };

      // ================= Graphics =================
      const Graphics = (parent) => {
        const host = parent && parent.node ? parent.node : (parent || V.scene.root);
        const n = new NodeCls(); n.name = 'VeGraphics';
        const t = Comp('UITransform').create();
        t.size = { x: 1, y: 1 };
        t.anchor = { x: 0.5, y: 0.5 };
        n.add_component_dyn(t);
        const p = Comp('Panel').create();
        p.color = [255, 255, 255, 255];
        n.add_component_dyn(p);
        host.add_child(n);
        const api = {
          node: n,
          kind: 'Graphics',
          get x() { return n.position.x; }, set x(v) { n.position.x = v; },
          get y() { return n.position.y; }, set y(v) { n.position.y = v; },
          get visible() { return n.active; }, set visible(v) { n.active = v; },
          get alpha() { return p.color ? p.color[3] : 255; }, set alpha(v) { if (p.color) p.color[3] = v; },
          rect(w, h, color, radius) {
            t.size = { x: w, y: h };
            p.color = norm(color || [255, 255, 255, 255]);
            p.radius = radius || 0;
            p.border_width = 0;
          },
          circle(d, color) { api.rect(d, d, color, d / 2); },
          roundRect(w, h, r, color) { api.rect(w, h, color, r); },
          strokeRect(w, h, bw, color) {
            t.size = { x: w, y: h };
            p.color = [0, 0, 0, 0];
            p.radius = 0;
            p.border_width = bw || 2;
            p.border_color = norm(color || [255, 255, 255, 255]);
          },
          strokeCircle(d, bw, color) {
            t.size = { x: d, y: d };
            p.color = [0, 0, 0, 0];
            p.radius = d / 2;
            p.border_width = bw || 2;
            p.border_color = norm(color || [255, 255, 255, 255]);
          },
          bar(w, h, ratio, bg, fg) {
            api.rect(w, h, bg || [40, 40, 40, 220]);
            if (ratio > 0) {
              const f = Graphics(n);
              f.rect(Math.max(2, w * Math.max(0, Math.min(1, ratio)) - 2), h - 2, fg || [255, 60, 60, 255]);
              f.x = -((w - Math.max(2, w * Math.max(0, Math.min(1, ratio)))) / 2);
              f.visible = true;
              api._barFill = f;
            }
          },
          set_bar(ratio, fg) {
            if (api._barFill) { api._barFill.node.destroy(); api._barFill = null; }
            const t2 = findComp(n, 'UITransform');
            if (t2) { const w = t2.size.x; if (ratio > 0) { const f = Graphics(n); f.rect(Math.max(2, w * Math.max(0, Math.min(1, ratio)) - 2), t2.size.y - 2, fg || [255, 60, 60, 255]); f.x = -((w - Math.max(2, w * Math.max(0, Math.min(1, ratio)))) / 2); api._barFill = f; } }
          },
          clear() { p.color = [0, 0, 0, 0]; p.border_width = 0; if (api._barFill) { api._barFill.node.destroy(); api._barFill = null; } },
          destroy() { if (api._barFill) { try { api._barFill.node.destroy(); } catch (e) {} } n.destroy(); },
        };
        return api;
      };

      // ================= Ticker =================
      const Ticker = {
        _fns: [],
        add(fn) { Ticker._fns.push(fn); },
        remove(fn) { Ticker._fns = Ticker._fns.filter((f) => f !== fn); },
        once(fn) { const w = (dt) => { Ticker.remove(w); fn(dt); }; Ticker.add(w); },
        clear() { Ticker._fns = []; },
        _last: performance.now(),
        _loop() {
          const now = performance.now();
          const dt = Math.min(0.05, (now - Ticker._last) / 1000);
          Ticker._last = now;
          for (const fn of Ticker._fns) { try { fn(dt, now); } catch (e) {} }
          requestAnimationFrame(Ticker._loop);
        },
      };
      Ticker._loop();

      // ================= Tween (extended) =================
      const easeFns = {
        linear: (t) => t,
        out: (t) => 1 - Math.pow(1 - t, 3),
        in: (t) => t * t * t,
        inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
        bounce: (t) => { const n1 = 7.5625, d1 = 2.75;
          if (t < 1 / d1) return n1 * t * t;
          if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
          if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
          return n1 * (t -= 2.625 / d1) * t + 0.984375; },
        elastic: (t) => (t === 0 || t === 1 ? t : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3)),
        quadIn: (t) => t * t,
        quadOut: (t) => t * (2 - t),
        quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        cubicIn: (t) => t * t * t,
        cubicOut: (t) => --t * t * t + 1,
        quartIn: (t) => t * t * t * t,
        quartOut: (t) => 1 - --t * t * t * t,
        quintIn: (t) => t * t * t * t * t,
        quintOut: (t) => 1 + --t * t * t * t * t,
        sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
        sineOut: (t) => Math.sin((t * Math.PI) / 2),
        sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
        expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
        expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        circIn: (t) => 1 - Math.sqrt(1 - t * t),
        circOut: (t) => Math.sqrt(1 - --t * t),
      };
      const Tween = {
        _active: [],
        to(node, props, ms, ease, onDone) {
          const c0 = node.components && node.components[0];
          const a0 = c0 && c0.color && c0.color[3] !== undefined ? c0.color[3] / 255 : 1;
          const st = { x: node.position.x, y: node.position.y, sx: node.scale.x, sy: node.scale.y, r: node.rotation, a: a0 };
          const en = { x: props.x ?? st.x, y: props.y ?? st.y, sx: props.scaleX ?? st.sx, sy: props.scaleY ?? st.sy, r: props.rotation ?? st.r, a: props.alpha ?? st.a };
          const t0 = performance.now();
          const k = easeFns[ease] || easeFns.linear;
          const tw = {
            node, st, en, ms, k, onDone, done: false,
            update() {
              const t = Math.min(1, (performance.now() - t0) / tw.ms);
              const e = tw.k(t);
              const nd = tw.node;
              nd.position.x = tw.st.x + (tw.en.x - tw.st.x) * e;
              nd.position.y = tw.st.y + (tw.en.y - tw.st.y) * e;
              nd.scale.x = tw.st.sx + (tw.en.sx - tw.st.sx) * e;
              nd.scale.y = tw.st.sy + (tw.en.sy - tw.st.sy) * e;
              if (tw.en.r !== undefined) nd.rotation = tw.st.r + (tw.en.r - tw.st.r) * e;
              if (tw.en.a !== undefined && nd.components[0] && nd.components[0].color) nd.components[0].color[3] = (tw.st.a + (tw.en.a - tw.st.a) * e) * 255;
              return t;
            },
          };
          Tween._active.push(tw);
          return tw;
        },
        from(node, props, ms, ease, onDone) {
          const c0 = node.components && node.components[0];
          const a0 = c0 && c0.color && c0.color[3] !== undefined ? c0.color[3] / 255 : 1;
          const target = { x: node.position.x, y: node.position.y, sx: node.scale.x, sy: node.scale.y, r: node.rotation, a: a0 };
          const from = { x: props.x ?? target.x, y: props.y ?? target.y, sx: props.scaleX ?? target.sx, sy: props.scaleY ?? target.sy, r: props.rotation ?? target.r, a: props.alpha ?? target.a };
          // apply "from" instantly, then tween back to current
          node.position.x = from.x; node.position.y = from.y;
          node.scale.x = from.sx; node.scale.y = from.sy;
          if (from.r !== undefined) node.rotation = from.r;
          if (c0 && c0.color) c0.color[3] = from.a * 255;
          return Tween.to(node, target, ms, ease, onDone);
        },
        delay(node, ms, onDone) { return Tween.to(node, { x: node.position.x }, ms, 'linear', onDone); },
        chain(node, steps) {
          const out = { onDone: null, cancel() { out._c = true; } };
          let i = 0;
          const next = () => {
            if (out._c || i >= steps.length) { if (out.onDone) out.onDone(); return; }
            const st = steps[i++];
            Tween.to(node, st, st.ms || 300, st.ease || 'out', next);
          };
          next();
          return out;
        },
        stop(node) {
          Tween._active = Tween._active.filter((tw) => {
            if (tw.node === node) { tw.done = true; return false; }
            return true;
          });
        },
        _tick() {
          for (let i = Tween._active.length - 1; i >= 0; i--) {
            const tw = Tween._active[i];
            const t = tw.update();
            if (t >= 1) { Tween._active.splice(i, 1); tw.done = true; if (tw.onDone) tw.onDone(); }
          }
        },
      };
      Ticker.add(() => Tween._tick());

      // ================= Sequence / Timer =================
      const Sequence = {
        _items: [],
        delay(ms, fn) {
          const it = { t: 0, ms, fn, done: false };
          Sequence._items.push(it);
          return it;
        },
        every(ms, fn) {
          const it = { t: 0, ms, fn, done: false, repeat: true };
          Sequence._items.push(it);
          return it;
        },
        cancel(it) { it.done = true; },
        _tick(dt) {
          for (let i = Sequence._items.length - 1; i >= 0; i--) {
            const it = Sequence._items[i];
            it.t += dt;
            if (it.t >= it.ms) {
              if (it.repeat) { it.t -= it.ms; try { it.fn(); } catch (e) {} }
              else { Sequence._items.splice(i, 1); try { it.fn(); } catch (e) {} }
            }
          }
        },
      };
      Ticker.add((dt) => Sequence._tick(dt));

      // ================= Coroutine =================
      const Coroutine = {
        _items: [],
        run(gen) {
          const it = { gen: gen(), done: false };
          const step = (v) => {
            if (it.done) return;
            const r = it.gen.next(v);
            if (r.done) { it.done = true; return; }
            if (typeof r.value === 'number') { setTimeout(() => step(), r.value); }
            else if (r.value && typeof r.value.then === 'function') { r.value.then(step); }
            else { requestAnimationFrame(() => step()); }
          };
          step();
          Coroutine._items.push(it);
          return it;
        },
        sleep(ms) { return ms; },
        cancel(it) { it.done = true; },
      };

      // ================= Loader =================
      const Loader = {
        async json(url) { const r = await fetch(url, { cache: 'no-store' }); return r.json(); },
        async text(url) { const r = await fetch(url, { cache: 'no-store' }); return r.text(); },
        async image(url) { const r = await fetch(url); const b = await r.blob(); return URL.createObjectURL(b); },
        async arrayBuffer(url) { const r = await fetch(url); return r.arrayBuffer(); },
        async base64(url) { const r = await fetch(url); const b = await r.blob(); return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); },
      };

      // ================= Store =================
      const Store = {
        get store() { return V.store; },
        get_int(k, d) { try { return V.store.get_int(k, d ?? 0); } catch (e) { return d ?? 0; } },
        get_string(k, d) { try { return V.store.get_string(k, d ?? ''); } catch (e) { return d ?? ''; } },
        get_bool(k, d) { try { return V.store.get_bool(k, d ?? false); } catch (e) { return d ?? false; } },
        get_float(k, d) { try { return V.store.get_float(k, d ?? 0); } catch (e) { return d ?? 0; } },
        set_int(k, v) { try { V.store.set_int(k, v); } catch (e) {} },
        set_string(k, v) { try { V.store.set_string(k, v); } catch (e) {} },
        set_bool(k, v) { try { V.store.set_bool(k, v); } catch (e) {} },
        set_float(k, v) { try { V.store.set_float(k, v); } catch (e) {} },
        add(k, v) { Store.set_int(k, Store.get_int(k) + v); },
        get all() { return V.store.values; },
      };

      // ================= Scene =================
      const Scene = {
        get scene() { return V.scene; },
        get name() { return V.scene.name; },
        get root() { return V.scene.root; },
        change(name, opts) { V.scene.change_scene(name, opts || { fade: 0.3 }); },
        reload() { V.scene.change_scene(V.scene.name, { fade: 0.2 }); },
        toScreen(wx, wy) {
          const f = V.fit;
          return [(wx - f.view_origin.x) * f.scale + f.area_pos.x, (wy - f.view_origin.y) * f.scale + f.area_pos.y];
        },
        toWorld(sx, sy) {
          const f = V.fit;
          return [(sx - f.area_pos.x) / f.scale + f.view_origin.x, (sy - f.area_pos.y) / f.scale + f.view_origin.y];
        },
        find(name) { return V.scene.root.find(name); },
        every(cb) { V.scene.root.every(cb); },
        isBattle() { const n = V.scene.name; return n === 'BattleRoot' || n.indexOf('Battle') === 0 || n.indexOf('battle') === 0; },
      };

      // ================= Input =================
      const Input = {
        get input() { return V.input; },
        get mouse() { return V.input.mouse; },
        get down() { return V.input.down; },
        pressed(k) { try { return !!V.input.pressed[k]; } catch (e) { return false; } },
        isDown(k) { try { return !!V.input.down[k]; } catch (e) { return false; } },
        released(k) { try { return !!V.input.released[k]; } catch (e) { return false; } },
        get mouseWorld() {
          try {
            const m = V.input.mouse;
            return Scene.toWorld(m.x, m.y);
          } catch (e) { return null; }
        },
        get mouseScreen() { try { const m = V.input.mouse; return [m.x, m.y]; } catch (e) { return null; } },
      };

      // ================= Audio =================
      const Audio = {
        play(sfx) { try { const p = Scene.find('SfxPlayer'); if (p && p.components[0] && p.components[0].play) p.components[0].play(sfx); } catch (e) {} },
        get soundOn() { try { return V.store.get_bool('sound', true); } catch (e) { return true; } },
      };

      // ================= Particles =================
      const Particles = {
        spawn(texId, x, y, opts) {
          try {
            const ps = Comp('ParticleSystem').create();
            const host = new NodeCls(); host.name = 'VeParticles';
            host.position.x = x; host.position.y = y;
            host.add_component_dyn(ps);
            V.scene.root.add_child(host);
            if (ps.texture) { try { ps.texture = { id: texId || 'fx/proj_fire.png', type: 'asset', is_set: () => true }; } catch (e) {} }
            return { node: host, comp: ps, destroy() { host.destroy(); } };
          } catch (e) { return null; }
        },
      };

      // ================= Events =================
      const Events = {
        make() {
          const h = {};
          return {
            on(name, fn) { (h[name] = h[name] || []).push(fn); return () => this.off(name, fn); },
            once(name, fn) { const w = (...a) => { this.off(name, w); fn(...a); }; return this.on(name, w); },
            off(name, fn) { if (h[name]) h[name] = h[name].filter((f) => f !== fn); },
            emit(name, ...a) { (h[name] || []).slice().forEach((f) => { try { f(...a); } catch (e) {} }); },
            clear() { for (const k in h) delete h[k]; },
            count(name) { return (h[name] || []).length; },
          };
        },
      };

      // ================= StateMachine =================
      const StateMachine = {
        create(initial, states) {
          const sm = {
            current: initial,
            states: states || {},
            events: Events.make(),
            on: function (n, f) { this.events.on(n, f); return this; },
            setState(name, ...args) {
              const prev = this.current;
              const s = this.states[prev];
              if (s && s.exit) { try { s.exit.call(this, ...args); } catch (e) {} }
              this.current = name;
              const n = this.states[name];
              if (n && n.enter) { try { n.enter.call(this, ...args); } catch (e) {} }
              this.events.emit('change', name, prev);
              return this;
            },
            update(dt) {
              const s = this.states[this.current];
              if (s && s.update) { try { s.update.call(this, dt); } catch (e) {} }
              return this;
            },
            is(name) { return this.current === name; },
          };
          const st = states[initial];
          if (st && st.enter) { try { st.enter.call(sm); } catch (e) {} }
          return sm;
        },
      };

      // ================= Object Pool =================
      const Pool = {
        create(factory, reset, initial = 4) {
          const items = [];
          const grow = (n) => { for (let i = 0; i < n; i++) items.push(factory()); };
          grow(initial);
          return {
            get() { const o = items.pop(); if (!o) return factory(); if (reset) reset(o); return o; },
            put(o) { items.push(o); },
            size: () => items.length,
            clear() { items.length = 0; },
          };
        },
      };

      // ================= Color =================
      const Color = {
        hex2rgb(h, a = 255) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255, a]; },
        rgb2hex(r, g, b) { return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255); },
        lerp(a, b, t) {
          const A = norm(a), B = norm(b);
          return [Math.round(A[0] + (B[0] - A[0]) * t), Math.round(A[1] + (B[1] - A[1]) * t), Math.round(A[2] + (B[2] - A[2]) * t), Math.round((A[3] ?? 255) + ((B[3] ?? 255) - (A[3] ?? 255)) * t)];
        },
        random() { return [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 255]; },
        withAlpha(c, a) { const r = norm(c).slice(); r[3] = a; return r; },
        hex,
      };

      // ================= Path / Bezier =================
      const Path = {
        bezier(p0, p1, p2, p3, steps = 20) {
          const pts = [];
          for (let i = 0; i <= steps; i++) {
            const t = i / steps, u = 1 - t;
            pts.push({
              x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
              y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
            });
          }
          return pts;
        },
        line(a, b, steps = 10) {
          const pts = [];
          for (let i = 0; i <= steps; i++) { const t = i / steps; pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
          return pts;
        },
        circlePoints(cx, cy, r, n = 16, rot = 0) {
          const pts = [];
          for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
          return pts;
        },
      };

      // ================= SpriteSheet =================
      const SpriteSheet = {
        make(texId, frameW, frameH, cols, rows, fps) {
          return {
            texId, frameW, frameH, cols: cols || 1, rows: rows || 1,
            count: (cols || 1) * (rows || 1), fps: fps || 12,
            create(x, y, parent) {
              const sp = Sprite(texId, frameW, frameH, parent);
              sp._sheet = this;
              sp.goto_frame = (f) => {
                const c = this.cols;
                sp.frame = f;
                // NOTE: engine spritesheet atlas layout â€” frame index maps to the
                // atlas sub-frame; keep simple frame counter for anim cycling.
              };
              return sp;
            },
          };
        },
      };

      // ================= Layout =================
      const Layout = {
        row(container, items, gap, alignY) {
          let x = 0;
          for (const it of items) { const nd = it.node || it; nd.position.x = x; nd.position.y = alignY || 0; x += (it.width || nd.components[0] && nd.components[0].size && nd.components[0].size.x || 0) + (gap || 0); }
          return x;
        },
        column(container, items, gap, alignX) {
          let y = 0;
          for (const it of items) { const nd = it.node || it; nd.position.y = y; nd.position.x = alignX || 0; y += (it.height || nd.components[0] && nd.components[0].size && nd.components[0].size.y || 0) + (gap || 0); }
          return y;
        },
        grid(container, items, cols, cellW, cellH) {
          items.forEach((it, i) => { const nd = it.node || it; nd.position.x = (i % cols) * cellW; nd.position.y = Math.floor(i / cols) * cellH; });
        },
      };

      // ================= Dom =================
      const Dom = {
        canvas() { const c = document.createElement('canvas'); return c; },
        fullscreen() { const el = document.documentElement; if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); } else { (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document); } },
        isFullscreen() { return !!document.fullscreenElement; },
        isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); },
        onResize(fn) { window.addEventListener('resize', fn); },
        textWidth(txt, size, font) { const c = document.createElement('canvas').getContext('2d'); c.font = (size || 16) + 'px ' + (font || 'Arial, sans-serif'); return c.measureText(txt).width; },
      };

      // ================= Debug =================
      const Debug = {
        log() { const msg = Array.from(arguments).map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '); if (!Debug._el) { Debug._el = document.createElement('div'); Debug._el.style.cssText = 'position:fixed;left:4px;bottom:4px;background:rgba(0,0,0,0.7);color:#0f0;font:11px monospace;padding:4px;z-index:9999;pointer-events:none;max-width:60%;white-space:pre-wrap;'; document.body.appendChild(Debug._el); } Debug._el.textContent = msg.slice(0, 500); },
        clear() { if (Debug._el) Debug._el.textContent = ''; },
      };

      // ================= Fps meter =================
      const Fps = {
        value: 0,
        _t: 0,
        _n: 0,
        _tick(dt) { Fps._t += dt; Fps._n++; if (Fps._t >= 0.5) { Fps.value = Math.round(Fps._n / Fps._t); Fps._t = 0; Fps._n = 0; } },
      };
      Ticker.add((dt) => Fps._tick(dt));

      // ================= Stage =================
      const Stage = {
        get root() { return V.scene.root; },
        get width() { return V.scene.view_size ? V.scene.view_size.x : 540; },
        get height() { return V.scene.view_size ? V.scene.view_size.y : 960; },
        get viewOrigin() { return V.scene.view_origin; },
        get center() { return { x: Stage.width / 2, y: Stage.height / 2 }; },
      };

      // ================= utils (extended) =================
      const utils = {
        rand(a, b) { return a + Math.random() * (b - a); },
        randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
        pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
        shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
        clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
        clampAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); },
        lerp(a, b, t) { return a + (b - a) * t; },
        damp(a, b, lambda, dt) { return utils.lerp(a, b, 1 - Math.exp(-lambda * dt)); },
        smoothstep(a, b, x) { const t = utils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
        dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
        angle(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
        angleLerp(a, b, t) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; },
        deg2rad(d) { return d * Math.PI / 180; },
        rad2deg(r) { return r * 180 / Math.PI; },
        map(v, a, b, c, d) { return c + (v - a) / (b - a) * (d - c); },
        wrap(v, a, b) { const r = b - a; return a + ((((v - a) % r) + r) % r); },
        pingpong(t, len) { return len - Math.abs(t % (2 * len) - len); },
        approach(v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); },
        pad(n, len, ch) { return String(n).padStart(len || 2, ch || '0'); },
        formatTime(sec) { const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return utils.pad(m) + ':' + utils.pad(s); },
        formatNumber(n) { return n.toLocaleString('en-US'); },
        sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; },
        ease: easeFns,
        hex,
        now: () => performance.now(),
        noise1(x) { // simple pseudo-random smooth noise
          const n = Math.sin(x * 127.1 + 311.7) * 43758.5453;
          return n - Math.floor(n);
        },
      };

      // ================= Time (scaled time, since, pause) =================
      const Time = {
        get now() { return performance.now(); },
        get delta() { return V.scene.unscaled_dt || 0; },
        get scale() { return V.scene.time_scale || 1; },
        set scale(v) { V.scene.time_scale = v; },
        get paused() { return V.scene.paused; },
        set paused(v) { V.scene.paused = v; },
        pause() { V.scene.paused = true; },
        resume() { V.scene.paused = false; },
        since(t) { return performance.now() - t; },
        _stamps: {},
        stamp(name) { Time._stamps[name] = performance.now(); },
        elapsed(name) { return Time._stamps[name] !== undefined ? performance.now() - Time._stamps[name] : 0; },
      };

      // ================= RNG (seeded, mulberry32) =================
      const RNG = {
        create(seed) {
          let a = seed >>> 0;
          const next = () => {
            a |= 0; a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
          return {
            next,
            range(min, max) { return min + next() * (max - min); },
            int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
            pick(arr) { return arr[Math.floor(next() * arr.length)]; },
            shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
            chance(p) { return next() < p; },
            seed: a,
          };
        },
        get random() { return Math.random; },
      };

      // ================= Grid + Pathfinding (BFS) =================
      const Grid = {
        create(cols, rows, def = 0) {
          const cells = [];
          for (let y = 0; y < rows; y++) { cells[y] = []; for (let x = 0; x < cols; x++) cells[y][x] = def; }
          return { cols, rows, cells, get(x, y) { return cells[y] && cells[y][x]; }, set(x, y, v) { if (cells[y]) cells[y][x] = v; }, inBounds(x, y) { return x >= 0 && y >= 0 && x < cols && y < rows; } };
        },
        // 4-dir BFS; passable(x,y,cell) => bool. Returns array of [x,y] steps (excl start).
        bfs(grid, sx, sy, tx, ty, passable) {
          if (sx === tx && sy === ty) return [];
          const seen = new Set([sx + ',' + sy]);
          const prev = new Map();
          const q = [[sx, sy]];
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          while (q.length) {
            const [cx, cy] = q.shift();
            for (const [dx, dy] of dirs) {
              const nx = cx + dx, ny = cy + dy;
              if (!grid.inBounds(nx, ny) || seen.has(nx + ',' + ny)) continue;
              const cell = grid.get(nx, ny);
              if (passable && !passable(nx, ny, cell)) continue;
              seen.add(nx + ',' + ny);
              prev.set(nx + ',' + ny, cx + ',' + cy);
              if (nx === tx && ny === ty) {
                const path = []; let cur = tx + ',' + ty;
                while (cur !== sx + ',' + sy) { const [px, py] = cur.split(',').map(Number); path.unshift([px, py]); cur = prev.get(cur); }
                return path;
              }
              q.push([nx, ny]);
            }
          }
          return null;
        },
        neighbors(grid, x, y) {
          const out = [];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid.inBounds(x + dx, y + dy)) out.push([x + dx, y + dy]);
          return out;
        },
        floodFill(grid, x, y, passable) {
          const seen = new Set();
          const q = [[x, y]];
          seen.add(x + ',' + y);
          while (q.length) {
            const [cx, cy] = q.shift();
            for (const [nx, ny] of Grid.neighbors(grid, cx, cy)) {
              const k = nx + ',' + ny;
              if (seen.has(k)) continue;
              const cell = grid.get(nx, ny);
              if (passable && !passable(nx, ny, cell)) continue;
              seen.add(k); q.push([nx, ny]);
            }
          }
          return [...seen].map((s) => s.split(',').map(Number));
        },
      };

      // ================= Behaviors (steering helpers) =================
      const Behaviors = {
        seek(pos, target, speed, dt) {
          const dx = target.x - pos.x, dy = target.y - pos.y, d = Math.hypot(dx, dy) || 1;
          return { x: pos.x + (dx / d) * speed * dt, y: pos.y + (dy / d) * speed * dt };
        },
        flee(pos, threat, speed, dt) {
          const dx = pos.x - threat.x, dy = pos.y - threat.y, d = Math.hypot(dx, dy) || 1;
          return { x: pos.x + (dx / d) * speed * dt, y: pos.y + (dy / d) * speed * dt };
        },
        arrive(pos, target, speed, slowRadius, dt) {
          const dx = target.x - pos.x, dy = target.y - pos.y, d = Math.hypot(dx, dy);
          if (d < 0.001) return { x: pos.x, y: pos.y };
          const spd = d < slowRadius ? speed * (d / slowRadius) : speed;
          return { x: pos.x + (dx / d) * spd * dt, y: pos.y + (dy / d) * spd * dt };
        },
        wander(pos, angle, speed, dt, turnSpeed = 2) {
          const a = angle + utils.rand(-turnSpeed * dt, turnSpeed * dt);
          return { x: pos.x + Math.cos(a) * speed * dt, y: pos.y + Math.sin(a) * speed * dt, angle: a };
        },
      };

      // ================= Camera shake =================
      const Camera = {
        shake(amount, ms) {
          Camera._a = amount; Camera._ms = ms; Camera._t = performance.now();
        },
        _a: 0, _ms: 0, _t: 0,
        _tick() {
          if (Camera._a <= 0) return;
          const t = (performance.now() - Camera._t) / Camera._ms;
          if (t >= 1) { Camera._a = 0; return; }
          const o = V.scene.view_origin;
          const decay = 1 - t;
          o.x = Camera._ox + (Math.random() - 0.5) * Camera._a * decay;
          o.y = Camera._oy + (Math.random() - 0.5) * Camera._a * decay;
        },
        start() { Camera._ox = V.scene.view_origin.x; Camera._oy = V.scene.view_origin.y; },
        reset() { if (Camera._ox !== undefined) { V.scene.view_origin.x = Camera._ox; V.scene.view_origin.y = Camera._oy; } },
      };
      Ticker.add(() => Camera._tick());

      // ================= Save (localStorage JSON helpers) =================
      const Save = {
        get(key, def) { try { const v = localStorage.getItem('velo_save_' + key); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
        set(key, val) { try { localStorage.setItem('velo_save_' + key, JSON.stringify(val)); return true; } catch (e) { return false; } },
        remove(key) { try { localStorage.removeItem('velo_save_' + key); } catch (e) {} },
        has(key) { try { return localStorage.getItem('velo_save_' + key) !== null; } catch (e) { return false; } },
        clear() { try { const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('velo_save_') === 0) keys.push(k); } keys.forEach((k) => localStorage.removeItem(k)); } catch (e) {} },
      };

      // ================= Data helpers =================
      const Data = {
        clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); },
        deepEqual(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; } },
        merge(...objs) { return Object.assign({}, ...objs); },
        flatten(arr) { return arr.reduce((acc, v) => acc.concat(Array.isArray(v) ? Data.flatten(v) : [v]), []); },
        countBy(arr, fn) { const out = {}; for (const v of arr) { const k = fn(v); out[k] = (out[k] || 0) + 1; } return out; },
        groupBy(arr, fn) { const out = {}; for (const v of arr) { const k = fn(v); (out[k] = out[k] || []).push(v); } return out; },
        unique(arr) { return [...new Set(arr)]; },
        sum(arr) { return arr.reduce((a, b) => a + b, 0); },
        avg(arr) { return arr.length ? Data.sum(arr) / arr.length : 0; },
        min(arr) { return arr.length ? Math.min(...arr) : undefined; },
        max(arr) { return arr.length ? Math.max(...arr) : undefined; },
        chunk(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; },
        cycle(arr, i) { return arr[((i % arr.length) + arr.length) % arr.length]; },
      };

      // ================= Utils async / misc =================
      const utilExtra = {
        throttle(fn, ms) {
          let last = 0;
          return (...a) => { const now = performance.now(); if (now - last >= ms) { last = now; fn(...a); } };
        },
        debounce(fn, ms) {
          let t = null;
          return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
        },
        weightedPick(items, weightFn) {
          const total = items.reduce((s, it) => s + weightFn(it), 0);
          let r = Math.random() * total;
          for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
          return items[items.length - 1];
        },
        id() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); },
        sleep(ms) { return new Promise((r) => setTimeout(r, ms)); },
      };

      // ================= 2D Perlin-ish noise =================
      const Noise = {
        perlin2(x, y, seed = 0) {
          const p = new Uint8Array(512);
          const perm = new Uint8Array(256);
          for (let i = 0; i < 256; i++) perm[i] = i;
          let s = seed;
          for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [perm[i], perm[j]] = [perm[j], perm[i]]; }
          for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
          const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
          const lerp = (a, b, t) => a + t * (b - a);
          const grad = (h, x, y) => { const g = h & 7; const u = g < 4 ? x : y; const v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); };
          const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
          const xf = x - Math.floor(x), yf = y - Math.floor(y);
          const u = fade(xf), v = fade(yf);
          const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
          return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
        },
      };

