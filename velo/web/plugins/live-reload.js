// ============================================================
// live-reload.js — auto-reloads the page after `watch_web.ps1`
// rebuilds the game (it touches build\webgl\watch.txt after every
// successful build). Without watch_web.ps1 running this script is
// a no-op: watch.txt never changes, the page never reloads.
// ============================================================
(() => {
  'use strict';
  let last = null;
  const check = async () => {
    try {
      const r = await fetch('watch.txt?x=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const t = await r.text();
      if (last === null) { last = t; return; } // first read: remember, don't reload
      if (t !== last) {
        console.log('[live-reload] new build detected → reloading');
        last = t;
        location.reload();
      }
    } catch (e) {
      // server down or file missing — stay quiet
    }
  };
  setInterval(check, 1200);
  console.log('[live-reload] watching build/webgl/watch.txt');
})();
