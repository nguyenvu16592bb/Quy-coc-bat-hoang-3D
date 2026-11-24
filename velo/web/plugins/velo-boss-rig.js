// ============================================================
// velo-boss-rig.js — applies VE.Rig (Spine-style rig animation)
// to the in-game boss:
//   • Foot planting: feet slots stay on their rest ground level
//     during Idle/Attack (no sliding or floating).
//   • Arm IK: during the Attack clip the leading arm rotates around
//     its shoulder so the hand reaches toward the nearest enemy.
//   • Exposes window.__bossRig for diagnostics.
// ============================================================
(() => {
  'use strict';
  const init = () => {
    const VE = window.VE;
    const V = window.velo;
    if (!VE || !VE.Rig || !V || !V.scene || !V.scene.root) return false;
    // boss tints (r,g,b) by boss_id — mirrors assets/data/boss.json list order
    if (!window.__bossTints) {
      window.__bossTints = [[255,120,60],[120,200,255],[170,130,95],[140,255,120],[190,140,255],[255,90,30],[70,80,130],[200,240,255],[110,50,160],[255,200,60]];
    }
    let rig = null;
    let wrapped = null;
    const isMonster = (c) => c && c.constructor && c.constructor.name === 'Monster';
    const inBattle = () => { const n = V.scene.name; return n === 'BattleRoot' || n.indexOf('Battle') === 0 || n.indexOf('battle') === 0; };

    const findBoss = () => {
      const stack = [V.scene.root];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (n.children) for (const ch of n.children) stack.push(ch);
        const m = n.components && n.components.find(isMonster);
        if (m && m.is_boss) {
          const k2 = n.components.find((x) => x.constructor.name === 'Kine2D');
          if (k2) return { node: n, k2 };
        }
      }
      return null;
    };
    const findEnemy = (bossNode) => {
      let best = null, bd = 1e9;
      const stack = [V.scene.root];
      while (stack.length) {
        const n = stack.pop();
        if (!n) continue;
        if (n.children) for (const ch of n.children) stack.push(ch);
        const m = n.components && n.components.find(isMonster);
        if (m && m.alive && !m.is_boss && m.side === 1) {
          const d = Math.hypot(n.position.x - bossNode.position.x, n.position.y - bossNode.position.y);
          if (d < bd) { bd = d; best = n; }
        }
      }
      return best;
    };

    VE.Ticker.add(() => {
      try {
        if (!inBattle()) { if (rig) { rig = null; wrapped = null; } return; }
        const boss = findBoss();
        if (!boss) { if (rig) { rig = null; wrapped = null; } return; }
        if (wrapped !== boss.k2) {
          // (re)wrap the boss with the rig toolkit
          rig = VE.Rig.humanoid(boss.k2, {});
          wrapped = boss.k2;
          if (rig) {
            // feet: plant on their rest level (bottom of the feet slots)
            const parts = rig.parts();
            // ONLY the shoe slots are planted (leg_1-2 / leg_2-2 = the lower/shoe
            // parts hung on the same bones as the upper legs). Planting the upper
            // legs too would drag them into the shoes; and the plant must pin the
            // shoe BOTTOM (maxY), not the top — pinning the top flips the feet.
            const feet = parts.filter((p) => /^(leg_\d)-\d$/.test(p));
            let ground = -1e9;
            if (feet.length) {
              // measure the rest shoe bottoms on the IDLE clip @ t=0 — measuring on
              // whatever clip is playing (e.g. Move mid-step) gives a lifted shoe
              // bottom, so groundY comes out wrong and the plant pushes the shoes
              // down over the legs/body (the recurring "reversed shoes" bug).
              const prevAnim = boss.k2.animation;
              const prevTime = boss.k2.time;
              boss.k2.animation = 'Idle';
              boss.k2.time = 0;
              const raw = boss.k2.meshes();
              const slotNames = (boss.k2.skeleton.slots || []).map((s) => s.name);
              for (const fn of feet) {
                const idx = slotNames.indexOf(fn);
                if (idx >= 0 && raw[idx]) {
                  const p = raw[idx].positions;
                  let maxY = -Infinity;
                  for (let i = 1; i < p.length; i += 2) if (p[i] > maxY) maxY = p[i];
                  if (maxY > ground) ground = maxY;
                }
              }
              boss.k2.animation = prevAnim;
              boss.k2.time = prevTime;
            }
            // resolve slot names to mesh indices (web meshes have no .slot field)
            const slotNames = (boss.k2.skeleton.slots || []).map((s) => s.name);
            const feetIdx = feet.map((fn) => slotNames.indexOf(fn)).filter((i) => i >= 0);
            const armIdx = slotNames.indexOf('arm_1');
            rig.addFootPlant(feetIdx, ground);
            // attack arm IK: the leading arm reaches the nearest enemy
            rig.addIK(armIdx, () => {
              const e = findEnemy(boss.node);
              if (!e) return null;
              return { x: e.position.x - boss.node.position.x, y: e.position.y - boss.node.position.y };
            }, 'bone_arm_right');
            // NOTE: the leg connect-shift was REMOVED on request ("bỏ giá trị làm chân
            // với giầy") — pushing the upper legs up put them inside the shoe parts and
            // the boots visually reversed vs the body. The rig now keeps the raw v4
            // leg positions; only the shoes are foot-planted.
            // BOSS TINT: per-boss color from its data (boss_id = index into the list)
            const bossMon = boss.node.components && boss.node.components.find((x) => x.constructor.name === 'Monster');
            const bid = bossMon ? bossMon.boss_id : -1;
            if (bid >= 0 && window.__bossTints && window.__bossTints[bid]) {
              const tc = window.__bossTints[bid];
              rig.setTint(tc[0], tc[1], tc[2]);
            }
            window.__bossRig = { active: true, parts: parts.length, feet, feetIdx, armIdx, groundY: Math.round(ground), bossId: bid, shifts: [] };
          }
        }
        if (rig) rig.meshes();
      } catch (e) {
        window.__bossRig = window.__bossRig || {};
        window.__bossRig.err = String(e && e.message || e).slice(0, 160);
      }
    });
    console.log('[boss-rig] VE.Rig applied — foot plant + arm IK (Spine-style)');
    return true;
  };
  let tries = 0;
  const iv = setInterval(() => { if (init() || ++tries > 40) clearInterval(iv); }, 300);
})();
