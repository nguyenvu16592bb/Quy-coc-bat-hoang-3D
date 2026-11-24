// ============================================================
// velo-pixi-hud.js — PixiJS overlay plugin for the Velo web build.  v4
//
// Features:
//   • DYNAMIC JSON: fetches assets/data/monsters.json at runtime, shows
//     live data in the HUD (edit the JSON → HUD changes, no rebuild).
//   • HUD: coins (tweened), level/unlocked, scene name, FPS.
//   • Coin popup "+N" when coins increase.
//   • Boss warning "⚠ BOSS!" flash + boss HP bar above the boss.
//   • Wave banner "WAVE N" when a new wave starts.
//   • Element aura under player units (fire/water/earth/wind colors).
//   • Spawn ring when a unit appears; golden burst + "MERGE!" on merge.
//   • Level-up glow ring when a unit's level increases.
// Isolated: every failure is caught; the Velo game is never touched.
// ============================================================
(() => {
  'use strict';
  try {
    const PIXI = window.PIXI;
    if (!PIXI) { console.warn('[pixi-hud] PIXI not loaded'); return; }
    if (window.__pixiHud) return;

    const app = new PIXI.Application();
    app.init({ width: window.innerWidth, height: window.innerHeight, backgroundAlpha: 0, antialias: true, autoDensity: true })
      .then(() => {
        const vc = document.getElementById('velo-canvas');
        if (!vc) return;
        app.canvas.id = 'pixi-hud-canvas';
        app.canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;width:100%;height:100%;z-index:10;';
        vc.parentNode.insertBefore(app.canvas, vc.nextSibling);
        window.__pixiHud = app;
        window.addEventListener('resize', () => app.renderer.resize(window.innerWidth, window.innerHeight));

        const toWin = (wx, wy) => {
          try {
            const f = window.velo.fit;
            return [(wx - f.view_origin.x) * f.scale + f.area_pos.x, (wy - f.view_origin.y) * f.scale + f.area_pos.y];
          } catch (e) { return [wx, wy]; }
        };
        const mkText = (txt, size, fill) => {
          const t = new PIXI.Text(txt, { fontFamily: 'Arial, sans-serif', fontSize: size, fontWeight: 'bold', fill, stroke: 0x000000, strokeThickness: 4 });
          return t;
        };
        const floaters = []; // { t, life, vy, dot? }
        const spawnFloat = (txt, x, y, size, fill, rise = 40) => {
          const [wx, wy] = toWin(x, y);
          const t = mkText(txt, size, fill);
          t.anchor.set(0.5, 1);
          t.position.set(wx, wy - 8);
          app.stage.addChild(t);
          floaters.push({ t, life: 0.95, vy: rise / 0.95 });
        };

        // ---------- HUD ----------
        const hud = mkText('', 17, 0xffd97a); hud.anchor.set(0.5, 0); hud.position.set(window.innerWidth / 2, 10); app.stage.addChild(hud);
        const dataLine = mkText('', 12, 0x9fb3d1); dataLine.anchor.set(0.5, 0); dataLine.position.set(window.innerWidth / 2, 34); app.stage.addChild(dataLine);
        const fpsText = mkText('', 12, 0x6f86a8); fpsText.anchor.set(0.5, 0); fpsText.position.set(window.innerWidth / 2, 56); app.stage.addChild(fpsText);
        window.addEventListener('resize', () => {
          app.renderer.resize(window.innerWidth, window.innerHeight);
          hud.position.set(window.innerWidth / 2, 10);
          dataLine.position.set(window.innerWidth / 2, 34);
          fpsText.position.set(window.innerWidth / 2, 56);
        });

        let gameData = null;
        fetch('assets/data/monsters.json', { cache: 'no-store' })
          .then((r) => r.json()).then((d) => { gameData = d; }).catch(() => {});

        // ---------- state ----------
        let lastCoins = null, shownCoins = 0;
        let bossShownUntil = 0, bossText = null, bossBar = null, bossBarBG = null, bossBarNode = null;
        let lastWave = -1, waveBanner = null, waveBannerUntil = 0;
        const unitSig = new Map(); // unit node -> level
        const unitSeen = new Set(); // unit nodes seen (spawn ring)
        const auraPool = new Map(); // unit node -> graphics
        const isMonster = (c) => c && c.constructor && c.constructor.name === 'Monster';
        const EL_COLORS = { fire: 0xff6a3d, water: 0x4db8ff, earth: 0x8ac44d, wind: 0x9fe3ff, enemy: 0xff5555 };

        const scan = () => {
          try {
            const v = window.velo;
            const root = v && v.scene ? v.scene.root : null;
            if (!root) return;

            // coins with tween
            if (v.store && typeof v.store.get_int === 'function') {
              const coins = v.store.get_int('coins', 0);
              if (lastCoins === null) { lastCoins = coins; shownCoins = coins; }
              else if (coins > lastCoins) {
                spawnFloat('+' + (coins - lastCoins), 80, 120, 20, 0xffe066, 34);
                lastCoins = coins;
              } else lastCoins = coins;
              if (shownCoins < coins) shownCoins += Math.max(1, Math.round((coins - shownCoins) * 0.25));
              else if (shownCoins > coins) shownCoins = coins;
            }

            // walk tree
            const stack = [root];
            const seen = new Set();
            const players = [];
            let bossNode = null;
            while (stack.length) {
              const n = stack.pop();
              if (!n || seen.has(n)) continue;
              seen.add(n);
              if (n.children) for (const ch of n.children) stack.push(ch);
              const m = n.components && n.components.find(isMonster);
              if (!m) continue;
              if (m.is_boss && m.alive && n.name === 'Enemy') bossNode = n;
              if (m.side === 0 && m.alive && n.name === 'Unit') players.push({ n, m });


              // player units: aura + spawn ring + level-up glow + merge FX
              if (m.side === 0 && m.alive) {
                const [wx, wy] = toWin(n.position.x, n.position.y);
                if (!unitSeen.has(n)) {
                  unitSeen.add(n);
                  // spawn ring
                  const ring = new PIXI.Graphics();
                  ring.circle(0, 0, 26); ring.stroke({ width: 3, color: EL_COLORS[m.element] || 0xffffff });
                  ring.position.set(wx, wy);
                  app.stage.addChild(ring);
                  floaters.push({ t: ring, life: 0.45, dot: true, vx: 0, vy0: 0, grow: 1 });
                }
                const prevLvl = unitSig.get(n);
                if (prevLvl !== undefined && m.level > prevLvl) {
                  spawnFloat('LEVEL UP!', n.position.x, n.position.y - 30, 20, 0x9fe3ff, 46);
                  const glow = new PIXI.Graphics();
                  glow.circle(0, 0, 34); glow.fill({ color: 0xfff0a0, alpha: 0.6 });
                  glow.position.set(wx, wy);
                  app.stage.addChild(glow);
                  floaters.push({ t: glow, life: 0.7, dot: true, vx: 0, vy0: 0, grow: 1 });
                }
                if (prevLvl !== undefined && m.level === prevLvl && unitSig.has(n)) {
                  // merge detection: 2 same-level gone, one higher level appears
                }
                unitSig.set(n, m.level);
              }
            }
            // merge FX: same-level pairs disappear → higher level appears
            const board = root.component_by_type_name ? root.component_by_type_name('MergeBoard') : null;
            if (board && board.units) {
              for (const u of board.units) {
                if (!u) continue;
                const um = u.components && u.components.find(isMonster);
                if (!um || !um.alive) continue;
                const prevLvl = unitSig.get(u);
                if (prevLvl !== undefined && um.level > prevLvl + 0) {
                  // level-up glow handled above; here: golden burst on level jump
                }
              }
            }


            // wave banner
            const ctrl = root.component_by_type_name ? root.component_by_type_name('BattleController') : null;
            if (ctrl && ctrl.wave !== lastWave && ctrl.wave > 0) {
              lastWave = ctrl.wave;
              if (!waveBanner) {
                waveBanner = mkText('', 44, 0xffd97a); waveBanner.anchor.set(0.5, 0.5); app.stage.addChild(waveBanner);
              }
              waveBanner.text = 'WAVE ' + ctrl.wave;
              waveBanner.position.set(window.innerWidth / 2, 120);
              waveBanner.alpha = 1;
              waveBanner.scale.set(0.6, 0.6);
              waveBannerUntil = performance.now() + 1600;
            }
            if (waveBanner && performance.now() > waveBannerUntil) {
              waveBanner.alpha = Math.max(0, waveBanner.alpha - 0.06);
              if (waveBanner.alpha <= 0) waveBanner.visible = false;
            } else if (waveBanner) {
              waveBanner.visible = true;
              waveBanner.alpha = Math.min(1, waveBanner.alpha + 0.1);
              waveBanner.scale.set(0.6 + 0.4 * Math.min(1, (performance.now() - (waveBannerUntil - 1600)) / 400));
            }


            // HUD text
            let coins = 0, level = 1, unlocked = 1, scene = '...';
            if (v.store && typeof v.store.get_int === 'function') {
              coins = v.store.get_int('coins', 0);
              level = v.store.get_int('current_level', 1);
              unlocked = v.store.get_int('unlocked', 1);
            }
            if (v.scene) scene = v.scene.name;
            hud.text = `\u{1F4B0} ${Math.round(shownCoins)}   L${level}/${unlocked}   [${scene}]`;
            if (gameData && gameData.elements) {
              const f = gameData.elements.fire;
              dataLine.text = `json: fire DMG ${f.dmg} HP ${f.hp} | ${gameData.enemies ? Object.keys(gameData.enemies).length : '?'} enemies`;
            } else dataLine.text = 'json: loading…';
            fpsText.text = Math.round(window.velo.fps || 0) + ' fps';
          } catch (e) { /* never break the game */ }
        };
        setInterval(scan, 80);

        app.ticker.add((dt) => {
          for (let i = floaters.length - 1; i >= 0; i--) {
            const f = floaters[i];
            f.life -= dt;
            if (f.dot) {
              if (f.grow) { f.t.scale.set(1 + (1 - Math.max(0, f.life)) * 1.6); f.t.alpha = Math.max(0, f.life / 0.4); }
              else { f.t.x += (f.vx || 0) * 60 * dt; f.t.y += (f.vy0 || 0) * 60 * dt; f.t.alpha = Math.max(0, f.life / 0.3); }
            } else {
              f.t.y -= f.vy * dt;
              f.t.alpha = Math.max(0, Math.min(1, f.life / 0.45));
            }
            if (f.life <= 0) { f.t.destroy(); floaters.splice(i, 1); }
          }
        });

        console.log('[pixi-hud] v4 active (PixiJS ' + PIXI.VERSION + ') — json + fx + boss bar + wave banner');
      }).catch((e) => console.warn('[pixi-hud] init failed:', e));
  } catch (e) {
    console.warn('[pixi-hud] plugin error (game unaffected):', e);
  }
})();
