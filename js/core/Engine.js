/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Engine.js
 * Renderer WebGL + post-processing (UnrealBloom), vòng lặp
 * chính, các "root" phân lớp (world/entity/fx), chiếu điểm
 * 3D → màn hình cho PixiJS overlay.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var E = {
    renderer: null, scene: null, camera: null, composer: null, bloomPass: null,
    worldRoot: null, entityRoot: null, fxRoot: null,
    _updates: [], _running: false, _elapsed: 0,
    quality: 'medium',
    stats: { fps: 60, frames: 0, _t: 0 }
  };

  var QUALITY = {
    low:    { pixelRatio: 0.75, shadows: false, bloom: false, shadowSize: 512 },
    medium: { pixelRatio: 1.0,  shadows: true,  bloom: true,  shadowSize: 1024 },
    high:   { pixelRatio: 2.0,  shadows: true,  bloom: true,  shadowSize: 2048 }
  };

  E.init = function () {
    var canvas = document.getElementById('game-canvas');
    E.renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: false,
      preserveDrawingBuffer: true, powerPreference: 'high-performance'
    });
    E.renderer.outputEncoding = THREE.sRGBEncoding;
    E.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    E.renderer.toneMappingExposure = 1.06;
    E.renderer.shadowMap.enabled = true;
    E.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    E.scene = new THREE.Scene();
    E.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    E.camera.position.set(0, 8, 12);

    E.worldRoot = new THREE.Group();
    E.entityRoot = new THREE.Group();
    E.fxRoot = new THREE.Group();
    E.scene.add(E.worldRoot);
    E.scene.add(E.entityRoot);
    E.scene.add(E.fxRoot);

    /* Post-processing */
    E.composer = new THREE.EffectComposer(E.renderer);
    E.composer.addPass(new THREE.RenderPass(E.scene, E.camera));
    E.bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.5, 0.82);
    E.composer.addPass(E.bloomPass);

    window.addEventListener('resize', E._onResize);
    E._onResize();
    E.applyQuality(E.quality);
  };

  E._onResize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    E.camera.aspect = w / h;
    E.camera.updateProjectionMatrix();
    E.renderer.setSize(w, h);
    E.composer.setSize(w, h);
    MVL.Bus.emit('engine:resize', { w: w, h: h });
  };

  E.applyQuality = function (level) {
    E.quality = level in QUALITY ? level : 'medium';
    var q = QUALITY[E.quality];
    var pr = Math.min(q.pixelRatio, window.devicePixelRatio || 1);
    E.renderer.setPixelRatio(pr);
    E.renderer.shadowMap.enabled = q.shadows;
    E.bloomPass.enabled = q.bloom;
    /* cập nhật kích thước shadow map của mọi light có shadow */
    E.scene.traverse(function (o) {
      if (o.isDirectionalLight && o.shadow) {
        o.shadow.mapSize.set(q.shadowSize, q.shadowSize);
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
      }
    });
    MVL.Bus.emit('engine:quality', { level: E.quality });
  };

  E.setBloom = function (b) { E.bloomPass.enabled = !!b; };

  E.addUpdate = function (fn) {
    E._updates.push(fn);
    return function () {
      var i = E._updates.indexOf(fn);
      if (i >= 0) E._updates.splice(i, 1);
    };
  };

  E.start = function () {
    if (E._running) return;
    E._running = true;
    var clock = new THREE.Clock();
    function loop() {
      if (!E._running) return;
      requestAnimationFrame(loop);
      var dt = Math.min(clock.getDelta(), 0.05);
      E._elapsed += dt;
      for (var i = 0; i < E._updates.length; i++) {
        try { E._updates[i](dt, E._elapsed); }
        catch (err) { console.error('[Engine] update lỗi:', err && err.message || err); }
      }
      E.composer.render();
      E.stats.frames++;
      E.stats._t += dt;
      if (E.stats._t >= 0.5) {
        E.stats.fps = Math.round(E.stats.frames / E.stats._t);
        E.stats.frames = 0; E.stats._t = 0;
      }
    }
    requestAnimationFrame(loop);
  };

  E.stop = function () { E._running = false; };

  /* Chiếu điểm thế giới → toạ độ màn hình (px CSS) cho FX2D/minimap */
  E.projectToScreen = function (v3) {
    var v = v3.clone ? v3.clone() : new THREE.Vector3(v3.x, v3.y, v3.z);
    v.project(E.camera);
    var w = window.innerWidth, h = window.innerHeight;
    var x = (v.x * 0.5 + 0.5) * w;
    var y = (-v.y * 0.5 + 0.5) * h;
    var visible = v.z < 1 && v.z > -1 && x > -100 && x < w + 100 && y > -100 && y < h + 100;
    return { x: x, y: y, visible: visible };
  };

  E.getWorld = function (x, y) {
    /* ray từ toạ độ màn hình — dùng cho chọn mục tiêu bằng chạm/click */
    var ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    var ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, E.camera);
    return ray.ray;
  };

  MVL.Engine = E;
})(window.MVL);
