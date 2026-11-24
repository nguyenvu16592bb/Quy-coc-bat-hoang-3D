// ============================================================
// velo-kine2d.js — Kine2D plugin for the Velo web build.
//
// Kine2D (skeletal animations from the Kine2D editor / Animforge
// .kine files) is part of the Velo engine web runtime. This plugin:
//   1. Confirms the Kine2D component is registered in this build.
//   2. Exposes a tiny bridge so game code / scenes can log which
//      skeleton is playing.
//
// Using Kine2D in your game (in .scene or code):
//   - ship the editor export next to your scene:
//       assets/anim/<name>.skel.json + <name>.atlas.json + <name>.png
//   - attach the component:
//       .with(&kine2d.Kine2D{ data: assets.ref[assets.TextAsset]('anim/<name>.skel.json'), atlas: assets.ref[assets.TextAsset]('anim/<name>.atlas.json') })
//   - the web runtime (webgl/runtime/kine2d.ts) plays it, exactly
//     like the desktop build.
//
// .kine files are ZIPs (Animforge project). Use vendor/jszip.min.js
// to unpack them, or the Kine2D editor's BUILD output (skel+atlas+png).
// ============================================================
(() => {
  'use strict';
  try {
    window.__kine2d = {
      registered: false,
      playing: [],
      log: (msg) => console.log('[kine2d] ' + msg),
    };
    const check = () => {
      try {
        const v = window.velo;
        if (!v || !v.registry || !v.registry.types) return false;
        const t = v.registry.types.get('Kine2D');
        window.__kine2d.registered = !!t;
        if (t) console.log('[kine2d] Kine2D component registered — skeletal animations ready');
        else console.warn('[kine2d] Kine2D component not registered in this build');
        return window.__kine2d.registered;
      } catch (e) { return false; }
    };
    // retry until the game runtime is up
    let tries = 0;
    const iv = setInterval(() => {
      if (check() || ++tries > 30) clearInterval(iv);
    }, 200);
  } catch (e) {
    console.warn('[kine2d] plugin error (game unaffected):', e);
  }
})();
