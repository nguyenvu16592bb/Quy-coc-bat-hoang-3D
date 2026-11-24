// ============================================================
// velo-ve-hud.js — HUD + FX built on window.VE (Velo nodes).
// Replaces velo-pixi-hud.js: NO second canvas, NO Pixi — everything
// renders through the SAME Velo WebGL pipeline as the game.
//   • HUD: coins, level/unlocked, scene, FPS
//   • Coin popup "+N" on gain
//   • Wave banner "WAVE N" pop-in
//   • Spawn ring (Panel circle) + LEVEL UP glow on units
//   • Boss HP bar above the boss
// ============================================================
(() => {
  'use strict';
  window.__veHud = { state: 'none', scans: 0, ensure: 0, err: null };
  const init = () => {
    const VE = window.VE;
    const V = window.velo;
    if (!VE || !V || !V.scene || !V.scene.root) return false;

    // world -> screen / screen -> world (fit mode)
    const toWin = (wx, wy) => {
      try {
        const f = V.fit;
        return [(wx - f.view_origin.x) * f.scale + f.area_pos.x, (wy - f.view_origin.y) * f.scale + f.area_pos.y];
      } catch (e) { return [wx, wy]; }
    };
    const toWorld = (sx, sy) => {
      try {
        const f = V.fit;
        return [(sx - f.area_pos.x) / f.scale + f.view_origin.x, (sy - f.area_pos.y) / f.scale + f.view_origin.y];
      } catch (e) { return [sx, sy]; }
    };

    const rootC = () => V.scene.root;
    const floaters = []; // { node, life, vy }
    const spawnFloat = (txt, wx, wy, size, color, rise = 40) => {
      const t = VE.Text(txt, size, color, rootC());
      if (!t) return;
      t.x = wx; t.y = wy - 8;
      floaters.push({ node: t.node, life: 0.95, vy: rise / 0.95 });
    };

    // ---------- HUD texts (top center) — rebuilt per scene ----------
    let hud = null, dataLine = null, fpsText = null, curScene = null;
    const ensureHud = (sceneName) => {
      window.__veHud.ensure++;
      if (curScene === sceneName && hud) return;
      curScene = sceneName;
      if (hud) { try { hud.node.destroy(); } catch (e) {} }
      if (dataLine) { try { dataLine.node.destroy(); } catch (e) {} }
      if (fpsText) { try { fpsText.node.destroy(); } catch (e) {} }
      if (waveBanner) { try { waveBanner.node.destroy(); } catch (e) {} waveBanner = null; }
      const [hx, hy] = toWorld(window.innerWidth / 2, 10);
      hud = VE.Text('', 17, [255, 215, 122, 255], rootC());
      if (hud) { hud.x = hx; hud.y = hy; }
      const [dx, dy] = toWorld(window.innerWidth / 2, 34);
      dataLine = VE.Text('', 12, [159, 179, 209, 255], rootC());
      if (dataLine) { dataLine.x = dx; dataLine.y = dy; }
      const [fx, fy] = toWorld(window.innerWidth / 2, 56);
      fpsText = VE.Text('', 12, [111, 134, 168, 255], rootC());
      if (fpsText) { fpsText.x = fx; fpsText.y = fy; }
    };

    // ---------- state ----------
    let lastCoins = null, shownCoins = 0;
    let lastWave = -1, waveBanner = null, waveBannerUntil = 0;
    const unitSig = new Map();
    const unitSeen = new Set();
    
    let gameData = null;
    fetch('assets/data/monsters.json', { cache: 'no-store' })
      .then((r) => r.json()).then((d) => { gameData = d; }).catch(() => {});
    const isMonster = (c) => c && c.constructor && c.constructor.name === 'Monster';
    const EL_COLORS = { fire: [255, 106, 61, 255], water: [77, 184, 255, 255], earth: [138, 196, 77, 255], wind: [159, 227, 255, 255], enemy: [255, 85, 85, 255] };
    const col = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255];

    const scan = () => {
      window.__veHud.scans++;
      try {
        const v = V;
        const root = v.scene.root;
        if (!root) return;
        ensureHud(v.scene.name);

        // coins tween + popup
        if (v.store && typeof v.store.get_int === 'function') {
          const coins = v.store.get_int('coins', 0);
          if (lastCoins === null) { lastCoins = coins; shownCoins = coins; }
          else if (coins > lastCoins) {
            spawnFloat('+' + (coins - lastCoins), 80, 120, 20, [255, 224, 102, 255], 34);
            lastCoins = coins;
          } else lastCoins = coins;
          if (shownCoins < coins) shownCoins += Math.max(1, Math.round((coins - shownCoins) * 0.25));
          else if (shownCoins > coins) shownCoins = coins;
        }

        // walk tree
        const stack = [root];
        const seen = new Set();
        let bossNode = null;
        while (stack.length) {
          const n = stack.pop();
          if (!n || seen.has(n)) continue;
          seen.add(n);
          if (n.children) for (const ch of n.children) stack.push(ch);
          const m = n.components && n.components.find(isMonster);
          if (!m || !m.alive) continue;
          if (m.is_boss && n.name === 'Enemy') bossNode = n;
          if (m.side === 0 && n.name === 'Unit') {
            const c = EL_COLORS[m.element] || [255, 255, 255, 255];
            // spawn ring once
            if (!unitSeen.has(n)) {
              unitSeen.add(n);
              const ring = VE.Graphics(rootC());
              if (ring) {
                ring.rect(52, 52, [0, 0, 0, 0]);
                ring.x = n.position.x; ring.y = n.position.y;
                floaters.push({ node: ring.node, life: 0.45, ring: true, grow: true });
                const p = ring.node.components.find((x) => x.constructor.name === 'Panel');
                if (p) { p.radius = 26; p.border_width = 3; p.border_color = c; }
              }
            }
            // level up glow
            const prevLvl = unitSig.get(n);
            if (prevLvl !== undefined && m.level > prevLvl) {
              spawnFloat('LEVEL UP!', n.position.x, n.position.y - 30, 20, [159, 227, 255, 255], 46);
              const glow = VE.Graphics(rootC());
              if (glow) {
                glow.rect(68, 68, [255, 240, 160, 120]);
                glow.x = n.position.x; glow.y = n.position.y;
                floaters.push({ node: glow.node, life: 0.7, ring: true, grow: true });
                const p = glow.node.components.find((x) => x.constructor.name === 'Panel');
                if (p) p.radius = 34;
              }
            }
            unitSig.set(n, m.level);
          }
        }

        // wave banner
        const ctrl = root.component_by_type_name ? root.component_by_type_name('BattleController') : null;
        if (ctrl && ctrl.wave !== lastWave && ctrl.wave > 0) {
          lastWave = ctrl.wave;
          if (!waveBanner) { waveBanner = VE.Text('', 44, [255, 215, 122, 255], rootC()); }
          waveBanner.text = 'WAVE ' + ctrl.wave;
          const [bwx, bwy] = toWorld(window.innerWidth / 2, 120);
          waveBanner.x = bwx; waveBanner.y = bwy;
          waveBannerUntil = performance.now() + 1600;
        }

        // HUD text
        let coins = 0, level = 1, unlocked = 1, scene = '...';
        if (v.store && typeof v.store.get_int === 'function') {
          coins = v.store.get_int('coins', 0);
          level = v.store.get_int('current_level', 1);
          unlocked = v.store.get_int('unlocked', 1);
        }
        if (v.scene) scene = v.scene.name;
        hud.text = 'Coins ' + Math.round(shownCoins) + '   L' + level + '/' + unlocked + '   [' + scene + ']';
        if (gameData && gameData.elements) {
          const f = gameData.elements.fire;
          dataLine.text = 'json: fire DMG ' + (f ? f.dmg : '?') + ' HP ' + (f ? f.hp : '?') + ' | ' + (gameData.enemies ? Object.keys(gameData.enemies).length : '?') + ' enemies';
        } else dataLine.text = 'json: loading...';
        fpsText.text = Math.round(v.fps || 0) + ' fps';
      } catch (e) { /* never break the game */ }
    };
    setInterval(scan, 80);

    VE.Ticker.add((dt) => {
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life -= dt;
        if (f.ring) {
          const s = 1 + (1 - Math.max(0, f.life)) * 1.6;
          try { f.node.scale.x = s; f.node.scale.y = s; } catch (e) {}
          try {
            const p = f.node.components.find((x) => x.constructor.name === 'Panel');
            if (p && p.color) p.color[3] = Math.max(0, Math.min(1, f.life / 0.4)) * 255;
          } catch (e) {}
        } else {
          f.node.position.y -= f.vy * dt;
          try {
            const l = f.node.components.find((x) => x.constructor.name === 'Label');
            if (l && l.color) l.color[3] = Math.max(0, Math.min(1, f.life / 0.45)) * 255;
          } catch (e) {}
        }
        if (f.life <= 0) { try { f.node.destroy(); } catch (e) {} floaters.splice(i, 1); }
      }
    });

    console.log('[ve-hud] active — HUD/FX through the VELO pipeline (no Pixi, one canvas)');
    window.__veHud.state = 'init-ok';
    return true;
  };
  let tries = 0;
  const iv = setInterval(() => {
    try { if (init()) { window.__veHud.state = 'ok'; clearInterval(iv); } }
    catch (e) { window.__veHud.err = String(e && e.message || e).slice(0, 200); }
    if (++tries > 40) clearInterval(iv);
  }, 300);
})();
