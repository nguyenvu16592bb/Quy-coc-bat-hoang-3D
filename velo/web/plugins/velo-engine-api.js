// ============================================================
// velo-engine-api.js — exposes the FULL Velo engine runtime as a
// Pixi-compatible API on window.VE (v4 "ULTRA").
//
// EVERYTHING creates REAL Velo nodes/components in the SAME scene
// graph and renders through the SAME WebGL pipeline as the game —
// no second canvas, no Pixi, no overlay.
//
// Runtime facts (discovered by probing the engine):
//   • Node class  -> window.velo.scene.root.constructor
//     - constructor takes NO name (node.name is a plain field, set after)
//   • Components  -> window.velo.registry.types.get('Sprite') etc.
//     - values are ComponentType FACTORIES: .create() → instance
//   • Sprite.texture must be { id, type:'asset', is_set: () => true }
//     (component.on_load → acquire() calls texture.is_set())
//   • size/color are plain {x,y} / [r,g,b,a] objects
//   • attach via node.add_component_dyn(comp) then host.add_child(node)
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
                // NOTE: engine spritesheet atlas layout — frame index maps to the
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
        truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; },
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
        ellipsis(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; },
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

      // ================= Rig (Spine-style rig animation toolkit) =================
      // Wraps a Kine2D component with post-processed mesh rigging:
      //   • footPlant — lock feet slots to a ground level (no sliding/lifting)
      //   • ikArm — 2-bone-style IK: rotate an arm slot around its shoulder so
      //     the hand reaches a target point (classic Spine IK)
      //   • constraints — clamp a bone's rotation to [min, max] (editor limits)
      //   • skin / crossfade / speed / paused / time — playback control
      //   • pose() — world transform of any bone (for targeting/debug)
      const Rig = {
        wrap(k2, opts) {
          if (!k2) return null;
          const rig = {
            k2,
            opts: opts || {},
            speed: 1,
            paused: false,
            skin: null,
            _orig: k2.meshes.bind(k2),
            footPlant: [],
            ik: [],
            constraints: [],
            shifts: [],
            tint: null,
            onEvent: null,
            _lastFrame: -1,
            // ---------- controls ----------
            play(clip, loop) { if (k2.play) k2.play(clip, loop !== false); else { k2.animation = clip; k2.time = 0; } rig.paused = false; },
            pause() { rig.paused = true; },
            resume() { rig.paused = false; },
            goto(t) { k2.time = t; },
            setSkin(name) { k2.skin = name || ''; rig.skin = name || null; },
            get clip() { return k2.animation; },
            get time() { return k2.time; },
            get duration() { try { const a = k2.current_animation(); return a ? a.duration() : 0; } catch (e) { return 0; } },
            // ---------- rig features ----------
            addFootPlant(indices, groundY) {
              rig.footPlant.push({ indices: indices || [], groundY: groundY });
            },
            addIK(index, targetFn, shoulderBone) {
              rig.ik.push({ index, target: targetFn, shoulder: shoulderBone || null });
            },
            addConstraint(bone, minDeg, maxDeg) {
              rig.constraints.push({ bone, min: minDeg, max: maxDeg });
            },
            // shift a mesh by a fixed dy every frame (attach/offset helper)
            addShift(index, dy) {
              rig.shifts.push({ index, dy });
            },
            setTint(r, g, b) {
              rig.tint = { r: r / 255, g: g / 255, b: b / 255 };
            },
            // bone world pose (skel units -> world px via canvas scaling)
            pose(name) {
              try {
                const sk = k2.skeleton;
                const cw = sk.canvas_width || 960, ch = sk.canvas_height || 600;
                const b = sk.bones.find((x) => x.name === name);
                if (!b) return null;
                const rec = (nm) => {
                  const bb = sk.bones.find((x) => x.name === nm);
                  if (!bb) return { x: 0, y: 0, rot: 0 };
                  const rot = bb.rotation * Math.PI / 180;
                  const par = bb.parent ? rec(bb.parent) : null;
                  const wx = par ? par.x + bb.x * Math.cos(par.rot) - bb.y * Math.sin(par.rot) : bb.x;
                  const wy = par ? par.y + bb.x * Math.sin(par.rot) + bb.y * Math.cos(par.rot) : bb.y;
                  return { x: wx, y: wy, rot: par ? par.rot + rot : rot };
                };
                const p = rec(name);
                return { x: p.x * cw / 100, y: p.y * ch / 180, rot: p.rot };
              } catch (e) { return null; }
            },
            parts() {
              try { return (k2.skeleton.slots || []).map((s) => s.name); } catch (e) { return []; }
            },
            // ---------- post-processed meshes ----------
            meshes() {
              const ms = rig._orig();
              if (rig.paused) return ms;
              // foot planting: keep the foot slot's BOTTOM (lowest vertex) on the ground
              for (const fp of rig.footPlant) {
                for (let mi = 0; mi < ms.length; mi++) {
                  if (fp.indices.indexOf(mi) === -1) continue;
                  const m = ms[mi];
                  let maxY = -Infinity;
                  for (let i = 1; i < m.positions.length; i += 2) if (m.positions[i] > maxY) maxY = m.positions[i];
                  const dy = fp.groundY - maxY;
                  if (Math.abs(dy) > 0.01) for (let i = 1; i < m.positions.length; i += 2) m.positions[i] += dy;
                }
              }
              // arm IK: rotate the slot around its shoulder so the hand aims at the target
              for (const ik of rig.ik) {
                const m = ms[ik.index];
                if (!m) continue;
                const t = ik.target ? ik.target() : null;
                if (!t) continue;
                  const n = m.positions.length / 2;
                  let cx = 0, cy = 0;
                  for (let j = 0; j < n; j++) { cx += m.positions[j * 2]; cy += m.positions[j * 2 + 1]; }
                  cx /= n; cy /= n;
                  // shoulder point: top-edge center of the slot (min y) or explicit bone pose
                  let sx = cx, sy = cy;
                  if (ik.shoulder) { const p = rig.pose(ik.shoulder); if (p) { sx = p.x; sy = p.y; } }
                  else {
                    let minY = Infinity;
                    for (let i = 1; i < m.positions.length; i += 2) if (m.positions[i] < minY) minY = m.positions[i];
                    let sumX = 0, cnt = 0;
                    for (let i = 0; i < m.positions.length; i += 2) if (Math.abs(m.positions[i + 1] - minY) < 0.5) { sumX += m.positions[i]; cnt++; }
                    sx = sumX / Math.max(1, cnt); sy = minY;
                  }
                  // hand: the vertex farthest from the shoulder
                  let hx = cx, hy = cy, hd = 0;
                  for (let j = 0; j < n; j++) {
                    const d = Math.hypot(m.positions[j * 2] - sx, m.positions[j * 2 + 1] - sy);
                    if (d > hd) { hd = d; hx = m.positions[j * 2]; hy = m.positions[j * 2 + 1]; }
                  }
                  // rotate the slot by the angle delta around the shoulder
                  const cur = Math.atan2(hy - sy, hx - sx);
                  const want = Math.atan2(t.y - sy, t.x - sx);
                  const da = utils.clampAngle(want - cur);
                  if (Math.abs(da) > 0.02) {
                    const cos = Math.cos(da), sin = Math.sin(da);
                    for (let j = 0; j < n; j++) {
                      const vx = m.positions[j * 2] - sx, vy = m.positions[j * 2 + 1] - sy;
                      m.positions[j * 2] = sx + vx * cos - vy * sin;
                      m.positions[j * 2 + 1] = sy + vx * sin + vy * cos;
                    }
                  }
              }
              // fixed mesh shifts (e.g. attach the upper legs to the torso)
              for (const sh of rig.shifts) {
                const m = ms[sh.index];
                if (!m || Math.abs(sh.dy) < 0.01) continue;
                for (let i = 1; i < m.positions.length; i += 2) m.positions[i] += sh.dy;
              }
              // boss tint: multiply every mesh color
              if (rig.tint) {
                for (const m of ms) {
                  if (!m.color) continue;
                  m.color.r = Math.min(255, Math.round(m.color.r * rig.tint.r));
                  m.color.g = Math.min(255, Math.round(m.color.g * rig.tint.g));
                  m.color.b = Math.min(255, Math.round(m.color.b * rig.tint.b));
                }
              }
              // constraints: clamp bone rotations (post-process bone list)
              if (rig.constraints.length && k2.skeleton) {
                for (const c of rig.constraints) {
                  const b = k2.skeleton.bones.find((x) => x.name === c.bone);
                  if (b) b.rotation = utils.clamp(b.rotation, c.min, c.max);
                }
              }
              // playback
              if (rig.speed !== 1 && k2.speed !== undefined) k2.speed = rig.speed;
              return ms;
            },
          };
          try { k2.meshes = rig.meshes; } catch (e) {}
          return rig;
        },
        // helper: build a rig with sensible defaults for a humanoid boss
        humanoid(k2, opts) {
          const rig = Rig.wrap(k2, opts);
          if (!rig) return null;
          const parts = rig.parts();
          const feet = parts.filter((p) => /leg_\d$/.test(p));
          if (feet.length) rig.addFootPlant(feet, opts.groundY);
          return rig;
        },
      };

      // ================= Rig2 (constraint / playback extras) =================
      const Rig2 = {
        crossfade(k2, clipA, clipB, dur, onDone) {
          // quick fade-out/in of the whole node through its color alpha
          const n = k2.node;
          if (!n) return;
          const t0 = performance.now();
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / (dur || 300));
            const a = Math.abs(2 * t - 1); // 1 -> 0 -> 1
            if (n.components[0] && n.components[0].color) n.components[0].color[3] = a * 255;
            if (t >= 1) { k2.play(clipB, true); if (onDone) onDone(); return; }
            if (t >= 0.5 && !Rig2._switched) { Rig2._switched = true; k2.play(clipB, true); }
            requestAnimationFrame(step);
          };
          Rig2._switched = false;
          step();
        },
      };

      const VE = {
        version: 'velo-webgl-9.0',
        runtime: 'WebGL — ONE pipeline, same scene graph as the game (no Pixi, no second canvas)',
        core: { get Node() { return V.scene.root.constructor; } },
        render: {
          get Sprite() { return Comp('Sprite'); }, get Label() { return Comp('Label'); },
          get Panel() { return Comp('Panel'); }, get UITransform() { return Comp('UITransform'); },
          get ParticleSystem() { return Comp('ParticleSystem'); },
        },
        get db() { return V.db; },
        get scene() { return V.scene; },
        get store() { return V.store; },
        get fit() { return V.fit; },
        get registry() { return V.registry; },
        get gfx() { return V.gfx; },
        Texture, Sprite, AnimatedSprite, Text, Container, Graphics,
        Ticker, Tween, Sequence, Coroutine, Loader, Store, Scene, Input, Audio,
        Particles, Events, StateMachine, Pool, Color, Math2D: { Vec2, Rect, Circle, collide },
        Path, SpriteSheet, Layout, Dom, Debug, Fps, Stage, Time, RNG, Grid, Behaviors, Camera, Save, Data, Noise,
        Matrix2D, QuadTree, Flock, Json, Observable, UndoStack, Async, Hash, Spline, Input2, Profiler, SaveSlots, Physics, Timer, NineSlice, Viewport,
        Gamepad, AStar, Geom, Bezier, Tween2, Color2, Strings, Arrays, EventBus, ParticlesFX, Audio2, SaveIO, Perf, ScreenFx, Utils2,
        Gesture, Polygon, TweenPath, Serialize, Vec3, Matrix3, Text2, SceneFlow, Grid2, Anim, Utils3,
        Rig, Rig2,
        utils,
        extras: utilExtra,
      };
      window.VE = VE;
      // auto-advance AnimatedSprites
      Ticker.add((dt) => {
        try {
          const root = V.scene.root;
          const st = [root];
          while (st.length) {
            const n = st.pop();
            for (const ch of n.children) st.push(ch);
            for (const c of n.components) {
              if (c._veAnim && c._veAnim.playing) {
                c._veAnim.t += dt;
                const f = Math.floor(c._veAnim.t * c._veAnim.fps) % Math.max(1, c._veAnim.frames);
                if (!c._veAnim.loop && f === 0 && c._veAnim.t > 0.01) {
                  c._veAnim.playing = false;
                  c.frame = Math.max(1, c._veAnim.frames) - 1;
                  if (c._veAnim.onEnd) { try { c._veAnim.onEnd(); } catch (e) {} }
                } else c.frame = f;
              }
            }
          }
        } catch (e) {}
      });
      console.log('[ve-api] Velo engine exposed as window.VE v9 RIG — one shared WebGL pipeline');
      return true;
    } catch (e) {
      console.warn('[ve-api] init failed (game unaffected):', e);
      return false;
    }
  };
  let tries = 0;
  const iv = setInterval(() => { if (init() || ++tries > 40) clearInterval(iv); }, 300);
})();
