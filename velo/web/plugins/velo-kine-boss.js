// ============================================================
// velo-kine-boss.js v5 — renders the RAW .kine boss through the
// VELO ENGINE (window.VE — same WebGL pipeline as the game).
//   • ONLY runs in the battle scene (never covers the map screen)
//   • Auto-fit size: boss scaled to fit the view (does not cover screen)
//   • Build once per boss; positions/rotations updated every frame
//   • Clip follows state: Move / Attack / Death / Idle
// ============================================================
(() => {
  'use strict';
  try {
    if (!window.JSZip) { console.warn('[kine-boss] needs jszip'); return; }
    const KINE_URL = 'assets/Kine/pixelforge-soi-auto-rig-CU2.kine';
    let rig = null;
    let curBoss = null;
    let veCont = null;
    let sprites = [];
    let attackUntil = 0;
    let prevCooldown = 0;
    let prevPos = null;
    let curClip = 'Idle';
    window.__kineBoss = { rigReady: false, err: null, lastErr: null, clip: 'Idle', ve: false, builds: 0, parts: 0, active: false, fitK: 1 };
    const isMonster = (c) => c && c.constructor && c.constructor.name === 'Monster';

    // battle-scene gate: the wolf must NEVER appear on the map select screen
    const inBattle = () => {
      try {
        const n = window.velo.scene.name;
        return n === 'BattleRoot' || n.indexOf('Battle') === 0 || n.indexOf('battle') === 0;
      } catch (e) { return false; }
    };

    async function loadRig() {
      const r = await fetch(KINE_URL, { cache: 'no-store' });
      const buf = await r.arrayBuffer();
      const zip = await window.JSZip.loadAsync(buf);
      const pix = JSON.parse(await zip.file('pixelforge.json').async('string'));
      const proj = JSON.parse(await zip.file('animforge.project.json').async('string'));
      const offsets = {};
      for (const s of proj.state.armature.slots) {
        const a = s.attachments && s.attachments[s.displayIndex || 0];
        if (a) offsets[s.name] = { x: a.x || 0, y: a.y || 0, sx: a.scaleX || 1, sy: a.scaleY || 1 };
      }
      let cw = 960, ch = 600;
      if (pix.workspace) { cw = pix.workspace.width || 960; ch = pix.workspace.height || 600; }
      rig = { bones: pix.bones, parts: pix.parts, clips: pix.clips || {}, offsets, cw, ch };
      window.__kineBoss.rigReady = true;
      console.log('[kine-boss] rig ready (VE pipeline):', rig.bones.length, 'bones,', rig.parts.length, 'parts');
    }

    function bonePose(rig, name, frame, clip, cache) {
      if (cache[name]) return cache[name];
      const b = rig.bones.find((x) => x.name === name);
      if (!b) return (cache[name] = { x: 0, y: 0, rot: 0 });
      let dx = 0, dy = 0, drot = 0;
      if (frame !== null && rig.clips[clip] && rig.clips[clip].keys) {
        const kf = (rig.clips[clip].keys[String(Math.round(frame))] || {})[name] || {};
        dx = kf.dx || 0; dy = kf.dy || 0; drot = kf.rot || 0;
      }
      const bx = b.x + dx;
      const by = b.y + dy;
      const br = ((b.rotation || 0) + drot) * Math.PI / 180;
      if (!b.parent) return (cache[name] = { x: bx, y: by, rot: br });
      const p = bonePose(rig, b.parent, frame, clip, cache);
      const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
      return (cache[name] = { x: p.x + bx * cos - by * sin, y: p.y + bx * sin + by * cos, rot: p.rot + br });
    }

    function frameNow(rig, clip) {
      const c = rig.clips[clip];
      if (!c) return 0;
      return (performance.now() / 1000 * (c.fps || 30)) % (c.length || 60);
    }

    function pickClip(rig, boss, m, now) {
      if (!m.alive || m.hp <= 0) return 'Death';
      if (now < attackUntil) return 'Attack';
      const p = boss.position;
      if (prevPos) {
        if (Math.abs(p.x - prevPos.x) + Math.abs(p.y - prevPos.y) > 1.2) { prevPos = p; return 'Move'; }
      }
      prevPos = p;
      if (prevCooldown > 0 && m.cooldown < prevCooldown - 0.25) {
        attackUntil = now + 420;
        prevCooldown = m.cooldown;
        return 'Attack';
      }
      prevCooldown = m.cooldown;
      return rig.clips['Idle'] ? 'Idle' : 'Move';
    }

    // auto-fit scale so the wolf fits the view and never covers the screen
    function fitK(VE) {
      try {
        const vw = (VE.Stage && VE.Stage.width) || 540;
        const vh = (VE.Stage && VE.Stage.height) || 960;
        const k = Math.min(vw / rig.cw, vh / rig.ch) * 0.85;
        return Math.max(0.2, Math.min(1.2, k));
      } catch (e) { return 0.5; }
    }

    function buildVE(VE, boss, rig) {
      const m = boss.components.find(isMonster);
      curClip = pickClip(rig, boss, m, performance.now());
      window.__kineBoss.clip = curClip;
      const frame = frameNow(rig, curClip);
      const cacheRest = {};
      const cachePose = {};
      const k = fitK(VE);
      window.__kineBoss.fitK = Math.round(k * 100) / 100;
      const cx0 = rig.cw / 2, cy0 = rig.ch / 2;
      const cont = VE.Container('KineBoss', VE.scene.root);
      cont.x = boss.position.x; cont.y = boss.position.y;
      cont.scaleX = k; cont.scaleY = k;
      const spr = [];
      for (const part of rig.parts) {
        const rest = bonePose(rig, part.bone, null, curClip, cacheRest);
        const pose = bonePose(rig, part.bone, frame, curClip, cachePose);
        const offX = part.x - rest.x;
        const offY = part.y - rest.y;
        const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot);
        const sx = pose.x + offX * cos - offY * sin - cx0;
        const sy = pose.y + offX * sin + offY * cos - cy0;
        const sp = VE.Sprite('Kine/parts/' + part.name + '.png', 0, 0, cont);
        if (!sp) continue;
        sp.auto_size();
        sp.x = sx; sp.y = sy; sp.rotation = pose.rot;
        spr.push({ sp, part });
      }
      window.__kineBoss.builds++;
      window.__kineBoss.parts = spr.length;
      return { cont, spr, clip: curClip };
    }

    function updateVE(VE, boss, rig, built) {
      const m = boss.components.find(isMonster);
      const clip = pickClip(rig, boss, m, performance.now());
      if (clip !== built.clip) { built.clip = clip; built.frame = 0; window.__kineBoss.clip = clip; }
      const frame = frameNow(rig, built.clip);
      built.frame = frame;
      const cacheRest = {};
      const cachePose = {};
      const cx0 = rig.cw / 2, cy0 = rig.ch / 2;
      built.cont.x = boss.position.x;
      built.cont.y = boss.position.y;
      for (const { sp, part } of built.spr) {
        const rest = bonePose(rig, part.bone, null, built.clip, cacheRest);
        const pose = bonePose(rig, part.bone, frame, built.clip, cachePose);
        const offX = part.x - rest.x;
        const offY = part.y - rest.y;
        const cos = Math.cos(pose.rot), sin = Math.sin(pose.rot);
        sp.x = pose.x + offX * cos - offY * sin - cx0;
        sp.y = pose.y + offX * sin + offY * cos - cy0;
        sp.rotation = pose.rot;
      }
    }

    function findBoss(root) {
      const stack = [root];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (n.children) for (const ch of n.children) stack.push(ch);
        const m = n.components && n.components.find(isMonster);
        if (m && m.is_boss) return n;
      }
      return null;
    }

    function clearBoss() {
      if (veCont) { try { veCont.destroy(); } catch (e) {} }
      veCont = null; sprites = []; curBoss = null;
      window.__kineBoss.active = false;
    }

    async function boot() {
      const VE = window.VE;
      if (!VE) return false;
      await loadRig();
      VE.Ticker.add((dt) => {
        try {
          const v = window.velo;
          const root = v && v.scene ? v.scene.root : null;
          if (!root || !rig || !VE) return;
          // battle-only gate: on any other scene the wolf must not exist
          if (!inBattle()) {
            if (veCont || curBoss) clearBoss();
            return;
          }
          const boss = findBoss(root);
          if (!boss) {
            if (veCont || curBoss) clearBoss();
            return;
          }
          window.__kineBoss.active = true;
          if (curBoss !== boss) {
            clearBoss();
            const built = buildVE(VE, boss, rig);
            veCont = built.cont;
            sprites = built.spr;
            curBoss = boss;
          }
          if (veCont) updateVE(VE, boss, rig, { cont: veCont, spr: sprites, clip: curClip, frame: 0 });
        } catch (e) {
          window.__kineBoss.lastErr = String(e && e.message || e).slice(0, 200);
        }
      });
      window.__kineBoss.ve = true;
      console.log('[kine-boss] v5 active — battle-only, auto-fit, VELO pipeline (no Spine for in-game)');
      return true;
    }

    let tries = 0;
    const iv = setInterval(async () => {
      try { if (await boot()) clearInterval(iv); }
      catch (e) { window.__kineBoss.err = e.message; }
      if (++tries > 40) clearInterval(iv);
    }, 300);
  } catch (e) {
    console.warn('[kine-boss] plugin error (game unaffected):', e);
  }
})();
