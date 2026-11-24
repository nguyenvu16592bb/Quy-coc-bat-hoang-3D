      // ================= V3D — pseudo-3D engine layer (auto update) =================
      // Billboards real 2D sprites in a perspective 3D space: world (wx, wz, hy)
      // projects to screen (x, y) with per-depth scale, depth sorting and fog.
      // An internal Ticker pass re-projects EVERY tracked item each frame —
      // game code just adds sprites and the 3D layer auto-updates.
      const V3D = {
        camera: { cx: 270, horizonY: 380, ground: 940, nearRef: 560, farRef: 2800, fog: 0.65, zoom: 1 },
        items: [],
        gridNodes: [],
        auto: true,
        _on: false,
        k(wz) { return (V3D.camera.nearRef / Math.max(1, wz)) * V3D.camera.zoom; },
        // project a world point to screen: wx (-270..270), wz (depth >= nearRef), hy (height above ground)
        project(wx, wz, hy) {
          const cam = V3D.camera;
          const k = V3D.k(Math.max(cam.nearRef, wz));
          const x = cam.cx + (wx - 0) * k;
          const gy = cam.horizonY + (cam.ground - cam.horizonY) * k;
          const y = gy - (hy || 0) * k;
          return { x, y, s: k, gy };
        },
        fogAlpha(wz) {
          const cam = V3D.camera;
          const t = Math.max(0, Math.min(1, (wz - cam.nearRef * 2.2) / (cam.farRef - cam.nearRef * 2.2)));
          return Math.round(255 * (1 - cam.fog * t));
        },
        zFor(wz) { return 8 + Math.max(0, Math.min(11, Math.round((wz - V3D.camera.nearRef) / 180))); },
        // add a node (or VE api object with .node) into the 3D layer
        add(nodeOrApi, opts) {
          const o = opts || {};
          const node = nodeOrApi && nodeOrApi.node ? nodeOrApi.node : nodeOrApi;
          if (!node || !node.components) return null;
          const it = { node, wx: o.wx || 0, wz: o.wz || (V3D.camera.nearRef + 200), hy: o.hy || 0, spComp: findComp(node, 'Sprite'), spin: o.spin || 0, t: Math.random() * 6.28 };
          V3D.items.push(it);
          if (!V3D._on) {
            Ticker.add(() => { if (V3D.auto) V3D.tick(); });
            V3D._on = true;
          }
          return it;
        },
        move(it, wx, wz, hy) { if (it) { it.wx = wx; it.wz = wz; if (hy !== undefined) it.hy = hy; } },
        remove(nodeOrIt) {
          const node = nodeOrIt && nodeOrIt.node ? nodeOrIt.node : nodeOrIt;
          V3D.items = V3D.items.filter(it => it.node !== node);
        },
        clear() { V3D.items = []; V3D.clearGrid(); },
        // grid floor: depth bars + side rays, re-projected every tick
        grid(opts) {
          V3D.clearGrid();
          const o = opts || {};
          const rows = o.rows || 6;
          const rays = o.rays || 2;
          const halfW = o.halfW || 300;
          const col = o.color || [160, 200, 255];
          const mkBar = (w, h, alpha) => {
            const n = new NodeCls(); n.name = 'V3DGrid';
            const t = Comp('UITransform').create();
            t.size = { x: Math.max(2, w), y: Math.max(2, h) };
            t.anchor = { x: 0.5, y: 0.5 };
            n.add_component_dyn(t);
            const p = Comp('Panel').create();
            p.color = [col[0], col[1], col[2], alpha];
            p.radius = 0;
            p.border_width = 0;
            p.block_input = false;
            n.add_component_dyn(p);
            n.z_index = 7;
            n.active = true;
            V.scene.root.add_child(n);
            return { node: n, t, p };
          };
          for (let r = 0; r < rows; r++) {
            const wz = V3D.camera.nearRef + (V3D.camera.farRef - V3D.camera.nearRef) * (r / (rows - 1));
            V3D.gridNodes.push({ kind: 'row', wz, bar: mkBar(10, 2, 90) });
          }
          for (let s = 0; s < rays; s++) {
            const wx = (s === 0 ? -1 : 1) * halfW;
            V3D.gridNodes.push({ kind: 'ray', wx, bar: mkBar(2, 10, 70) });
          }
          if (!V3D._on) {
            Ticker.add(() => { if (V3D.auto) V3D.tick(); });
            V3D._on = true;
          }
          return V3D.gridNodes.length;
        },
        clearGrid() {
          for (const g of V3D.gridNodes) { try { g.bar.node.destroy(); } catch (e) {} }
          V3D.gridNodes = [];
        },
        tickGrid() {
          for (const g of V3D.gridNodes) {
            if (g.kind === 'row') {
              const pr = V3D.project(0, g.wz, 0);
              g.bar.node.position.x = pr.x;
              g.bar.node.position.y = pr.y;
              g.bar.t.size.x = Math.max(2, 620 * pr.s);
              g.bar.p.color[3] = Math.round(90 * pr.s);
            } else {
              // side ray: from near bottom to far horizon on one side
              const near = V3D.project(g.wx, V3D.camera.nearRef, 0);
              const far = V3D.project(g.wx, V3D.camera.farRef, 0);
              const dx = far.x - near.x, dy = far.y - near.y;
              const len = Math.max(2, Math.hypot(dx, dy));
              g.bar.node.position.x = (near.x + far.x) / 2;
              g.bar.node.position.y = (near.y + far.y) / 2;
              g.bar.node.rotation = Math.atan2(dy, dx);
              g.bar.t.size.x = len;
              g.bar.p.color[3] = 70;
            }
          }
        },
        tick() {
          const cam = V3D.camera;
          for (const it of V3D.items) {
            if (it.spin) it.t += it.spin * 0.016;
            const wobble = it.spin ? Math.sin(it.t) * 14 : 0;
            const pr = V3D.project(it.wx, it.wz, it.hy + wobble);
            it.node.position.x = pr.x;
            it.node.position.y = pr.y;
            it.node.scale.x = Math.max(0.05, pr.s);
            it.node.scale.y = Math.max(0.05, pr.s);
            it.node.z_index = V3D.zFor(it.wz);
            if (it.spComp && it.spComp.color) it.spComp.color[3] = V3D.fogAlpha(it.wz);
          }
          if (V3D.gridNodes.length) V3D.tickGrid();
        },
        // quick showcase: grid floor + 4 element sprites at different depths
        demo() {
          V3D.clear();
          V3D.grid({});
          const els = ['monsters/fire1.png', 'monsters/water1.png', 'monsters/earth1.png', 'monsters/wind1.png'];
          const spots = [{ wx: -190, wz: 700 }, { wx: -60, wz: 1100 }, { wx: 70, wz: 1500 }, { wx: 200, wz: 1900 }];
          const made = [];
          for (let i = 0; i < els.length; i++) {
            const sp = Sprite(els[i], 60, 90, null);
            const it = V3D.add(sp.node, { wx: spots[i].wx, wz: spots[i].wz, hy: 45, sprite: sp, spin: i % 2 ? 0.8 : 0 });
            made.push({ el: els[i], it });
          }
          return made;
        },
      };
