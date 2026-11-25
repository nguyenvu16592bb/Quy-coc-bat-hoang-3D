/* =========================================================
 * Mộng Võ Lâm 3D — js/world/World.js (CONTRACT mục 6a)
 * Địa hình 128×128 vertex-color + núi viền chóp nón (bake vào lưới);
 * getHeight = bilinear trên chính lưới → khớp tuyệt đối mesh.
 * Nước gợn sóng, sky dome shader, ngày/đêm, thời tiết, phong cảnh
 * InstancedMesh, cổng dịch chuyển. KHÔNG spawn quái/NPC.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils, D = MVL.Data, E = MVL.Engine, A = MVL.Assets;

  var GRID = 129;                                  /* 128 segment → 129 đỉnh / chiều */
  var SKY_R = 400;                                 /* bán kính sky dome (camera far = 800) */
  var SHADOW_SIZE = { low: 512, medium: 1024, high: 2048 };
  var LIGHT_BUDGET = 7;                            /* PointLight cho props (cổng dành riêng 2) */
  var DAY_START = 0.32;                            /* vào bản đồ lúc buổi sáng */

  /* ---------- Palette riêng từng scene (màu đất / cây / nước / đèn) ---------- */
  var PAL = {
    mong_hanh_son: { low: '#67a94b', low2: '#55903e', shore: '#8a6f45', rock: '#8d8d92', peak: '#dfe6ee',
      treeA: '#3f8f3f', treeB: '#2c7434', trunk: '#6b4a2f', wall: '#d9c7a0', roof: '#4a3a30', wood: '#5c4128',
      stone: '#6f7076', water: '#3d7ab8', waterOp: 0.7, lantern: '#ffb050', firefly: true },
    van_truc_lam: { low: '#9d9a55', low2: '#87874a', shore: '#96703c', rock: '#7b786e', peak: '#b7b3a5',
      treeA: '#6e8a3a', treeB: '#55743a', trunk: '#5a4630', bamboo: '#c9b458', bamboo2: '#6f9355',
      wall: '#c8b28c', roof: '#3d3229', wood: '#54402c', stone: '#75726a', water: '#4a88a0', waterOp: 0.72,
      lantern: '#ffcf6a', firefly: true },
    hac_phong_coc: { low: '#4b4941', low2: '#3e3c35', shore: '#4e4238', rock: '#33333a', peak: '#52525c',
      treeA: '#3c4a34', treeB: '#2d3a29', trunk: '#392c22', wall: '#5a4a3c', roof: '#2e2620',
      wood: '#3a2c20', stone: '#3c3c44', water: '#2e4a5e', waterOp: 0.78, lantern: '#ffb050', firefly: true },
    tuyet_linh: { low: '#e7edf3', low2: '#d8e2ea', shore: '#9aa7b0', rock: '#5e6a77', peak: '#f6f9fc',
      treeA: '#2e4a3c', treeB: '#20402f', trunk: '#453526', wall: '#b8c4cc', roof: '#37424c',
      wood: '#4a3828', stone: '#8a95a0', water: '#7fa8c9', waterOp: 0.85, lantern: '#a8ccff', firefly: false },
    ma_canh: { low: '#5c2b22', low2: '#6d3524', shore: '#42201a', rock: '#31201c', peak: '#8a3a20',
      treeA: '#3c2a20', treeB: '#2e2018', trunk: '#2e2018', wall: '#3c2822', roof: '#241a16',
      wood: '#2e2018', stone: '#33241f', water: '#c4441c', waterOp: 0.96, lantern: '#7dff9f',
      firefly: false, lava: true }
  };
  var PAL_KEYS = ['low', 'low2', 'shore', 'rock', 'peak', 'treeA', 'treeB', 'trunk',
    'bamboo', 'bamboo2', 'wall', 'roof', 'wood', 'stone', 'water', 'lantern'];

  var _DUSK_SUN = null, _MOON_C = null, _DUSK_HOR = null, _WHITE = null;

  /* ---------- Trạng thái module ---------- */
  var W = {
    ready: false, currentId: null, timeOfDay: DAY_START, def: null,
    _timeMult: 1, _t: 0, _dayF: 0.8,
    noise: null, noiseF: null, _peaks: [], _hc: 0,
    _heights: null, _half: 0, _step: 1, _pal: null,
    _sun: null, _sunTarget: null, _amb: null, _hemi: null,
    _ambBase: 0.5, _hemiBase: 0.5, _sunBase: null,
    _fog: null, _fogBase: null, _fogNight: null,
    _sky: null, _uTop: null, _uHor: null,
    _topBase: null, _topNight: null, _horBase: null, _horNight: null,
    _stars: null, _sunSpr: null, _clouds: [],
    _water: null, _waterBase: null, _waterMat: null,
    _weather: null, _fireflies: null, _ffBase: null, _ffPhase: null, _ffCount: 0,
    _flickers: [], _flames: [], _spins: [],
    portals: [], _props: [], _minimap: null, _avoid: [], _lightBudget: LIGHT_BUDGET,
    _mats: {}
  };

  /* object tái dùng — cấm cấp phát trong update(dt) */
  var _v1, _v2, _c1, _cG, _m4, _q, _eu;

  function _c(hex) { return new THREE.Color(hex); }

  /* =========================================================
   * ĐỊA HÌNH — hàm cao độ giải tích (dùng chung khi set vertex)
   * ========================================================= */
  function _terrainHeight(x, z) {
    var T = W.def.terrain;
    var h = W.noise.fbm(x * 0.02, z * 0.02, 4) * T.amplitude;
    var pk = W._peaks, i, p, dx, dz;
    for (i = 0; i < pk.length; i++) {
      p = pk[i];
      dx = x - p.x; dz = z - p.z;
      if (dx > p.w || dx < -p.w || dz > p.w || dz < -p.w) continue;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < p.w) h += p.h * (1 - d / p.w);       /* chóp nón tuyến tính */
    }
    /* phẳng hoá khu trung tâm để làng/trấn + NPC đứng vững */
    var r2 = x * x + z * z;
    if (r2 < 1156) {                               /* r < 34 */
      var f = U.clamp((Math.sqrt(r2) - 15) / 20, 0, 1);
      f = f * f * (3 - 2 * f);
      h = W._hc + (h - W._hc) * f;
    }
    return h;
  }

  /* Nội suy bilinear trên lưới đã dựng — khớp chính xác mesh */
  function _heightAt(x, z) {
    var h = W._heights;
    if (!h) return 0;
    var u = U.clamp((x + W._half) / W._step, 0, GRID - 1);
    var v = U.clamp((z + W._half) / W._step, 0, GRID - 1);
    var j0 = Math.floor(u), i0 = Math.floor(v);
    var j1 = Math.min(j0 + 1, GRID - 1), i1 = Math.min(i0 + 1, GRID - 1);
    var tx = u - j0, tz = v - i0;
    var r0 = i0 * GRID, r1 = i1 * GRID;
    return U.lerp(
      U.lerp(h[r0 + j0], h[r0 + j1], tx),
      U.lerp(h[r1 + j0], h[r1 + j1], tx), tz);
  }

  function _slopeAt(x, z) {
    var d = 1.6;
    var hx = (_heightAt(x + d, z) - _heightAt(x - d, z)) / (2 * d);
    var hz = (_heightAt(x, z + d) - _heightAt(x, z - d)) / (2 * d);
    return Math.sqrt(hx * hx + hz * hz);
  }

  function _initNoise(def) {
    var T = def.terrain;
    W.noise = U.Noise.create(T.seed);
    W.noiseF = U.Noise.create(T.seed + 911);
    var rng = U.RNG.create((T.seed ^ 0x51ab) >>> 0);
    W._peaks = [];
    var n = U.clamp(Math.round(T.mountains * 0.55), 8, 16);
    for (var k = 0; k < n; k++) {
      var ang = (k + rng.range(-0.3, 0.3)) * Math.PI * 2 / n;
      var rad = T.size / 2 - rng.range(0, 10);     /* viền ngoài: size/2-10 .. size/2 */
      W._peaks.push({
        x: Math.cos(ang) * rad, z: Math.sin(ang) * rad,
        h: T.mountains * rng.range(0.55, 0.95), w: T.size * rng.range(0.07, 0.13)
      });
    }
    W._hc = Math.max(W.noise.fbm(0, 0, 4) * T.amplitude, T.waterLevel + 1.0);
  }

  function _initPalette(def) {
    var src = PAL[def.id] || PAL.mong_hanh_son;
    var P = {}, k;
    for (k in src) P[k] = src[k];
    for (var i = 0; i < PAL_KEYS.length; i++) {
      if (src[PAL_KEYS[i]]) P[PAL_KEYS[i]] = _c(src[PAL_KEYS[i]]);
    }
    W._pal = P;
  }

  /* Màu đất: palette chính + biến thể noise, pha đất ven bờ, đá theo dốc/cao độ */
  function _groundColor(out, h, slope, vn) {
    var P = W._pal, T = W.def.terrain;
    out.copy(P.low).lerp(P.low2, vn);
    var shore = T.waterLevel + 1.0;
    if (h < shore) out.lerp(P.shore, U.clamp((shore - h) / 1.6, 0, 1));
    var steep = U.clamp((slope - 0.45) / 0.8, 0, 1);
    var alt = U.clamp((h - T.amplitude * 0.4) / Math.max(3, T.mountains * 0.55), 0, 1);
    out.lerp(P.rock, Math.min(1, steep + alt * 0.8));
    if (alt > 0.45) out.lerp(P.peak, U.clamp((alt - 0.45) * 1.9, 0, 1));
  }

  function _buildTerrain() {
    var T = W.def.terrain;
    W._half = T.size / 2;
    W._step = T.size / 128;
    var geo = new THREE.PlaneGeometry(T.size, T.size, 128, 128);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var count = pos.count;
    W._heights = new Float32Array(count);
    var v, x, z, y;
    for (v = 0; v < count; v++) {
      x = pos.getX(v); z = pos.getZ(v);
      y = _terrainHeight(x, z);
      pos.setY(v, y);
      W._heights[v] = y;
    }
    /* vertex color theo cao độ / độ dốc */
    var col = new Float32Array(count * 3);
    for (var i = 0; i < GRID; i++) {
      for (var j = 0; j < GRID; j++) {
        v = i * GRID + j;
        var h = W._heights[v];
        var jl = j > 0 ? j - 1 : j, jr = j < 128 ? j + 1 : j;
        var il = i > 0 ? i - 1 : i, ir = i < 128 ? i + 1 : i;
        var hx = (W._heights[i * GRID + jr] - W._heights[i * GRID + jl]) / ((jr - jl) * W._step);
        var hz = (W._heights[ir * GRID + j] - W._heights[il * GRID + j]) / ((ir - il) * W._step);
        var vn = W.noiseF.fbm(pos.getX(v) * 0.09, pos.getZ(v) * 0.09, 2) * 0.5 + 0.5;
        _groundColor(_cG, h, Math.sqrt(hx * hx + hz * hz), vn);
        col[v * 3] = _cG.r; col[v * 3 + 1] = _cG.g; col[v * 3 + 2] = _cG.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }));
    mesh.receiveShadow = true;
    E.worldRoot.add(mesh);
  }

  /* ---------- Nước — plane trong suốt, gợn sóng (ma_canh = dung nham) ---------- */
  function _buildWater() {
    var T = W.def.terrain, P = W._pal;
    var geo = new THREE.PlaneGeometry(T.size, T.size, 32, 32);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshStandardMaterial({
      color: P.water, transparent: true, opacity: P.waterOp || 0.72,
      roughness: P.lava ? 0.55 : 0.18, metalness: 0.08, depthWrite: false
    });
    if (P.lava) { mat.emissive = P.water.clone(); mat.emissiveIntensity = 0.75; }
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = T.waterLevel; mesh.renderOrder = 1;
    W._water = mesh;
    W._waterMat = mat;
    W._waterBase = new Float32Array(geo.attributes.position.array);
    geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    E.worldRoot.add(mesh);
  }

  function _stepWater() {
    var w = W._water;
    if (!w) return;
    var attr = w.geometry.attributes.position;
    var arr = attr.array, base = W._waterBase, t = W._t, lava = W._pal.lava;
    var sp = lava ? 0.7 : 1.35, a1 = lava ? 0.1 : 0.07, a2 = lava ? 0.08 : 0.055;
    for (var i = 0; i < arr.length; i += 3) {
      arr[i + 1] = Math.sin(base[i] * 0.45 + t * sp) * a1 +
                   Math.cos(base[i + 2] * 0.38 + t * sp * 0.83) * a2;
    }
    attr.needsUpdate = true;
    if (lava) W._waterMat.emissiveIntensity = 0.68 + Math.sin(t * 0.9) * 0.12;
  }

  /* ---------- Bầu trời — dome shader, sao đêm, mặt trời, mây ---------- */
  function _buildSky() {
    var def = W.def;
    var uniforms = {
      uTop: { value: W._topBase.clone() },
      uHor: { value: W._horBase.clone() }
    };
    W._uTop = uniforms.uTop;
    W._uHor = uniforms.uHor;
    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: 'varying vec3 vP;\nvoid main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uTop;\nuniform vec3 uHor;\nvarying vec3 vP;\nvoid main(){ float h = normalize(vP).y; float t = pow(max(h, 0.0), 1.35); gl_FragColor = vec4(mix(uHor, uTop, t), 1.0); }',
      side: THREE.BackSide, depthWrite: false
    });
    W._sky = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 24, 14), mat);
    W._sky.frustumCulled = false;
    E.worldRoot.add(W._sky);

    /* sao đêm — Points nửa cầu trên */
    var sn = 550, sarr = new Float32Array(sn * 3);
    for (var k = 0; k < sn; k++) {
      var th = Math.random() * Math.PI * 2, yv = 0.12 + Math.random() * 0.88;
      var rr = Math.sqrt(Math.max(0, 1 - yv * yv));
      sarr[k * 3] = Math.cos(th) * rr * 372; sarr[k * 3 + 1] = yv * 372; sarr[k * 3 + 2] = Math.sin(th) * rr * 372;
    }
    var sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(sarr, 3));
    W._stars = new THREE.Points(sgeo, new THREE.PointsMaterial({
      map: A.tex('dot'), color: 0xcfe0ff, size: 2.2, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending
    }));
    W._stars.frustumCulled = false;
    W._stars.visible = false;
    E.worldRoot.add(W._stars);

    /* mặt trời — sprite glow pha màu sky.sun */
    W._sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: A.tex('glow'), color: def.sky.sun, transparent: true,
      opacity: 0.9, depthWrite: false, fog: false
    }));
    W._sunSpr.scale.set(85, 85, 1);
    E.worldRoot.add(W._sunSpr);

    /* mây billboard trôi theo gió */
    W._clouds = [];
    for (var ci = 0; ci < 11; ci++) {
      _c1.set(W._horBase).lerp(_WHITE, 0.72);
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: A.tex('glow'), color: _c1.getHex(), transparent: true,
        opacity: 0.34, depthWrite: false, fog: false
      }));
      var ang = Math.random() * Math.PI * 2, rad = 70 + Math.random() * 190;
      spr.position.set(Math.cos(ang) * rad, 95 + Math.random() * 55, Math.sin(ang) * rad);
      var cw = 45 + Math.random() * 55;
      spr.scale.set(cw, cw * 0.42, 1);
      W._clouds.push({ s: spr, spd: (def.weather.wind || 0.4) * (2 + Math.random() * 3) });
      E.worldRoot.add(spr);
    }
  }

  /* ---------- Ánh sáng — Hemi + Ambient + Directional castShadow ±60 ---------- */
  function _buildLights() {
    var def = W.def, P = W._pal;
    W._hemi = new THREE.HemisphereLight(def.sky.horizon, P.low.getHex(), def.sky.hemi);
    E.worldRoot.add(W._hemi);
    W._amb = new THREE.AmbientLight(0xffffff, def.sky.ambient);
    E.worldRoot.add(W._amb);
    W._sun = new THREE.DirectionalLight(def.sky.sun, 1.0);
    W._sun.castShadow = true;
    var sz = SHADOW_SIZE[E.quality] || 1024;
    W._sun.shadow.mapSize.set(sz, sz);
    W._sun.shadow.camera.near = 20;
    W._sun.shadow.camera.far = 280;
    W._sun.shadow.camera.left = -60; W._sun.shadow.camera.right = 60;
    W._sun.shadow.camera.top = 60; W._sun.shadow.camera.bottom = -60;
    W._sun.shadow.bias = -0.0004; W._sun.shadow.normalBias = 0.03;
    W._sun.position.set(60, 90, 30);
    W._sunTarget = new THREE.Object3D();
    E.worldRoot.add(W._sunTarget);
    W._sun.target = W._sunTarget;
    E.worldRoot.add(W._sun);
    W._ambBase = def.sky.ambient;
    W._hemiBase = def.sky.hemi;
  }

  /* Chu kỳ ngày/đêm: lerp fog/sky/light, đêm có sao + ambient floor 0.15 */
  function _stepDayNight(dt) {
    var t = W.timeOfDay;
    var ang = (t - 0.25) * Math.PI * 2;
    var elev = Math.sin(ang);
    var dayF = U.clamp((elev + 0.08) / 0.30, 0, 1);
    var duskF = U.clamp(1 - Math.abs(elev) / 0.30, 0, 1);
    var nightF = 1 - dayF;
    W._dayF = dayF;

    var sx = Math.cos(ang), sy = elev;
    if (elev >= 0) _v1.set(sx, sy, 0.35).normalize().multiplyScalar(110);
    else _v1.set(-sx, -sy, 0.35).normalize().multiplyScalar(110);   /* trăng */
    W._sun.position.copy(_v1);
    W._sun.intensity = elev >= 0 ? 0.25 + dayF * 0.95 : 0.13;
    _c1.copy(W._sunBase);
    if (duskF > 0) _c1.lerp(_DUSK_SUN, duskF * 0.75);
    if (elev < 0) _c1.lerp(_MOON_C, 0.7);
    W._sun.color.copy(_c1);

    W._amb.intensity = Math.max(0.15, W._ambBase * (0.3 + 0.7 * dayF)); W._hemi.intensity = W._hemiBase * (0.35 + 0.65 * dayF);

    W._fog.color.copy(W._fogBase).lerp(W._fogNight, nightF);
    W._uTop.value.copy(W._topBase).lerp(W._topNight, nightF);
    W._uHor.value.copy(W._horBase).lerp(W._horNight, nightF);
    if (duskF > 0) W._uHor.value.lerp(_DUSK_HOR, duskF * 0.35);

    W._stars.material.opacity = nightF * 0.9;
    W._stars.visible = nightF > 0.02;

    W._sunSpr.position.copy(_v2.set(sx, sy, 0.35).normalize().multiplyScalar(385));
    W._sunSpr.material.opacity = U.clamp((elev + 0.12) * 3, 0, 1) * 0.95;

    for (var i = 0; i < W._clouds.length; i++) {
      var cl = W._clouds[i];
      cl.s.material.opacity = 0.34 * (0.35 + 0.65 * dayF);
      cl.s.position.x += cl.spd * dt;
      if (cl.s.position.x > 330) cl.s.position.x = -330;
    }
  }

  /* ---------- Thời tiết — Points tái sử dụng quanh camera ---------- */
  function _buildWeather() {
    var wt = W.def.weather || {};
    var type = wt.type || 'clear';
    if (type === 'clear') return;
    var qi = E.quality === 'low' ? 0 : (E.quality === 'high' ? 2 : 1);
    var COUNTS = { rain: [260, 480, 760], snow: [200, 380, 600], ash: [140, 240, 380] };
    var n = (COUNTS[type] || COUNTS.rain)[qi];
    var arr = new Float32Array(n * 3), spd = new Float32Array(n), ph = new Float32Array(n);
    for (var k = 0; k < n; k++) {
      arr[k * 3] = U.rand(-45, 45);
      arr[k * 3 + 1] = U.rand(4, 30);
      arr[k * 3 + 2] = U.rand(-45, 45);
      if (type === 'rain') spd[k] = U.rand(20, 30);
      else if (type === 'snow') spd[k] = U.rand(1.3, 2.4);
      else spd[k] = U.rand(-0.3, 0.5);
      ph[k] = U.rand(0, 10);
    }
    var geo = new THREE.BufferGeometry();
    var attr = new THREE.BufferAttribute(arr, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    var opt = { transparent: true, depthWrite: false, fog: false };
    if (type === 'rain') {
      opt.map = A.tex('streak'); opt.color = 0xa8c0e8; opt.size = 1.35; opt.opacity = 0.5;
    } else if (type === 'snow') {
      opt.map = A.tex('snow'); opt.color = 0xffffff; opt.size = 0.72; opt.opacity = 0.85;
    } else {
      opt.map = A.tex('dot'); opt.color = 0xb06048; opt.size = 0.5; opt.opacity = 0.55;
    }
    var pts = new THREE.Points(geo, new THREE.PointsMaterial(opt));
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    E.worldRoot.add(pts);
    W._weather = { pts: pts, arr: arr, spd: spd, ph: ph, type: type, wind: wt.wind || 0.5, attr: attr, count: n };
  }

  function _respawn(arr, i3, camX, camY, camZ) {
    var ang = Math.random() * Math.PI * 2;
    var rr = 45 * Math.sqrt(Math.random());
    arr[i3] = camX + Math.cos(ang) * rr;
    arr[i3 + 2] = camZ + Math.sin(ang) * rr;
    arr[i3 + 1] = camY + U.rand(6, 26);
  }

  function _stepWeather(dt) {
    var w = W._weather;
    if (!w) return;
    var cam = E.camera.position;
    var camX = cam.x, camY = cam.y, camZ = cam.z;
    var arr = w.arr, n = w.count, wind = w.wind, t = W._t, i, i3;
    for (i = 0; i < n; i++) {
      i3 = i * 3;
      var x = arr[i3], y = arr[i3 + 1], z = arr[i3 + 2];
      var far = Math.abs(x - camX) > 48 || Math.abs(z - camZ) > 48;
      if (w.type === 'rain') {
        y -= w.spd[i] * dt;
        x += wind * 7 * dt;
        if (far || y < _heightAt(x, z) + 0.3) { _respawn(arr, i3, camX, camY, camZ); continue; }
      } else if (w.type === 'snow') {
        y -= w.spd[i] * dt;
        x += (wind * 1.6 + Math.sin(t * 0.9 + w.ph[i]) * 0.8) * dt;
        z += Math.cos(t * 0.7 + w.ph[i]) * 0.5 * dt;
        if (far || y < _heightAt(x, z) + 0.3) { _respawn(arr, i3, camX, camY, camZ); continue; }
      } else {                                    /* ash — tro bay lơ lửng */
        y += w.spd[i] * dt;
        x += Math.sin(t * 0.6 + w.ph[i]) * wind * 1.5 * dt;
        z += Math.cos(t * 0.5 + w.ph[i]) * 0.3 * dt;
        if (far || y < camY - 10 || y > camY + 24) { _respawn(arr, i3, camX, camY, camZ); continue; }
      }
      arr[i3] = x; arr[i3 + 1] = y; arr[i3 + 2] = z;
    }
    w.attr.needsUpdate = true;
  }

  /* ---------- Phong cảnh — helpers ---------- */
  function _std(hex, extra) {
    var o = { color: hex, roughness: 0.9, metalness: 0 };
    if (extra) for (var k in extra) o[k] = extra[k];
    return new THREE.MeshStandardMaterial(o);
  }

  function _regAvoid(x, z, r) { W._avoid.push({ x: x, z: z, r: r }); }

  function _initAvoid() {
    W._avoid = [];
    var def = W.def, i;
    var sp = def.spawn || [0, 0];
    _regAvoid(sp[0], sp[1], 8);
    var ps = def.portals || [];
    for (i = 0; i < ps.length; i++) _regAvoid(ps[i].x, ps[i].z, 6);
    var ns = def.npcSpawns || [];
    for (i = 0; i < ns.length; i++) _regAvoid(ns[i].x, ns[i].z, 2.5);
  }

  function _findSpot(rng, rMin, rMax, pad, slopeMax, myR, tries) {
    var T = W.def.terrain;
    tries = tries || 12;
    for (var k = 0; k < tries; k++) {
      var ang = rng.next() * Math.PI * 2;
      var rad = Math.sqrt(U.lerp(rMin * rMin, rMax * rMax, rng.next()));
      var x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      var h = _heightAt(x, z);
      if (h < T.waterLevel + pad) continue;
      if (slopeMax > 0 && _slopeAt(x, z) > slopeMax) continue;
      if (k < tries - 3) {                        /* vài lần cuối bỏ qua spacing */
        var ok = true;
        for (var i = 0; i < W._avoid.length; i++) {
          var a = W._avoid[i];
          if (U.dist2D(x, z, a.x, a.z) < a.r + myR) { ok = false; break; }
        }
        if (!ok) continue;
      }
      return { x: x, z: z, h: h };
    }
    return null;
  }

  function _finalizeIM(im, n) {
    if (n <= 0) {
      U.disposeDeep(im);
      return false;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    E.worldRoot.add(im);
    return true;
  }

  /* ---------- Cây: InstancedMesh thân trụ + 2 tán nón ---------- */
  function _buildTrees(rng, count) {
    if (count <= 0) return;
    var P = W._pal;
    var gT = new THREE.CylinderGeometry(0.16, 0.28, 1.7, 6); gT.translate(0, 0.85, 0);
    var gC1 = new THREE.ConeGeometry(1.3, 2.6, 7); gC1.translate(0, 2.7, 0);
    var gC2 = new THREE.ConeGeometry(0.9, 1.8, 7); gC2.translate(0, 4.0, 0);
    var mT = _std(P.trunk);
    var mL = _std(0xffffff);
    var iT = new THREE.InstancedMesh(gT, mT, count);
    var iA = new THREE.InstancedMesh(gC1, mL, count);
    var iB = new THREE.InstancedMesh(gC2, mL, count);
    iT.castShadow = iA.castShadow = iB.castShadow = true;
    iT.receiveShadow = iA.receiveShadow = iB.receiveShadow = true;
    iT.frustumCulled = iA.frustumCulled = iB.frustumCulled = false;
    var rMax = W.def.terrain.size / 2 - 26, n = 0;
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 7, rMax, 0.35, 1.0, 1.4);
      if (!s) continue;
      var sc = rng.range(0.75, 1.5);
      _m4.compose(_v1.set(s.x, s.h - 0.15, s.z), _q.setFromEuler(_eu.set(0, rng.next() * Math.PI * 2, 0)),
        _v2.set(sc, sc * rng.range(0.9, 1.15), sc));
      iT.setMatrixAt(n, _m4); iA.setMatrixAt(n, _m4); iB.setMatrixAt(n, _m4);
      _c1.set(rng.next() < 0.5 ? P.treeA : P.treeB).offsetHSL(0, 0, rng.range(-0.05, 0.06));
      iA.setColorAt(n, _c1); iB.setColorAt(n, _c1);
      _regAvoid(s.x, s.z, 1.5);
      n++;
    }
    if (!_finalizeIM(iT, n)) { U.disposeDeep(iA); U.disposeDeep(iB); return; }
    _finalizeIM(iA, n);
    _finalizeIM(iB, n);
  }

  /* ---------- Đá: InstancedMesh Icosahedron ---------- */
  function _buildRocks(rng, count) {
    if (count <= 0) return;
    var P = W._pal;
    var g = new THREE.IcosahedronGeometry(1, 0);
    var m = _std(0xffffff, { flatShading: true, roughness: 0.95 });
    var im = new THREE.InstancedMesh(g, m, count);
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
    var rMax = W.def.terrain.size / 2 - 20, n = 0;
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 6, rMax, 0.2, 1.4, 2.2);
      if (!s) continue;
      var sx = rng.range(0.5, 2.3), sy = sx * rng.range(0.55, 0.9), sz = sx * rng.range(0.7, 1.2);
      _m4.compose(_v1.set(s.x, s.h + sy * 0.3, s.z),
        _q.setFromEuler(_eu.set(rng.range(0, 3), rng.range(0, 6.28), rng.range(0, 3))), _v2.set(sx, sy, sz));
      im.setMatrixAt(n, _m4);
      _c1.set(P.rock).offsetHSL(rng.range(-0.02, 0.02), 0, rng.range(-0.06, 0.06));
      im.setColorAt(n, _c1);
      if (sx >= 1.7) W._props.push({ x: s.x, z: s.z, r: sx * 1.15 });
      _regAvoid(s.x, s.z, 1.8);
      n++;
    }
    _finalizeIM(im, n);
  }

  /* ---------- Trúc: trụ mảnh + chùm lá, mọc theo cụm ---------- */
  function _buildBamboo(rng, count) {
    if (count <= 0) return;
    var P = W._pal, T = W.def.terrain;
    var centers = [];
    for (var c = 0; c < 6; c++) {
      var cs = _findSpot(rng, 16, T.size / 2 - 30, 0.4, 0.9, 3);
      if (cs) { centers.push(cs); _regAvoid(cs.x, cs.z, 2); }
    }
    var gS = new THREE.CylinderGeometry(0.05, 0.09, 4.4, 5); gS.translate(0, 2.2, 0);
    var gL = new THREE.ConeGeometry(0.34, 1.2, 5); gL.translate(0, 4.7, 0);
    var mS = _std(0xffffff, { roughness: 0.7 });
    var mL = _std(0xffffff, { roughness: 0.85 });
    var iS = new THREE.InstancedMesh(gS, mS, count);
    var iL = new THREE.InstancedMesh(gL, mL, count);
    iS.castShadow = iL.castShadow = true;
    iS.frustumCulled = iL.frustumCulled = false;
    var n = 0;
    for (var k = 0; k < count; k++) {
      var x, z, h;
      if (centers.length) {
        var b = centers[k % centers.length];
        x = b.x + rng.range(-9, 9);
        z = b.z + rng.range(-9, 9);
        h = _heightAt(x, z);
        if (h < T.waterLevel + 0.25) continue;
        var hit = false;                        /* tránh cổng/spawn dù trong cụm */
        for (var ai = 0; ai < W._avoid.length; ai++) {
          if (W._avoid[ai].r >= 4 && U.dist2D(x, z, W._avoid[ai].x, W._avoid[ai].z) < W._avoid[ai].r) { hit = true; break; }
        }
        if (hit) continue;
      } else {
        var s = _findSpot(rng, 8, T.size / 2 - 30, 0.3, 1.0, 0.8);
        if (!s) continue;
        x = s.x; z = s.z; h = s.h;
      }
      var sc = rng.range(0.65, 1.35);
      _m4.compose(_v1.set(x, h - 0.1, z),
        _q.setFromEuler(_eu.set(rng.range(-0.09, 0.09), rng.next() * 6.28, rng.range(-0.09, 0.09))), _v2.set(sc, sc, sc));
      iS.setMatrixAt(n, _m4); iL.setMatrixAt(n, _m4);
      _c1.set(rng.next() < 0.6 ? P.bamboo : P.bamboo2).offsetHSL(0, 0, rng.range(-0.04, 0.04));
      iS.setColorAt(n, _c1); iL.setColorAt(n, _c1);
      n++;
    }
    if (!_finalizeIM(iS, n)) { U.disposeDeep(iL); return; }
    _finalizeIM(iL, n);
  }

  /* ---------- Nhà: hộp + mái nón + cửa ---------- */
  function _buildHouses(rng, count) {
    if (count <= 0) return;
    var P = W._pal;
    var gW = new THREE.BoxGeometry(3.4, 2.2, 2.6);
    var gR = new THREE.ConeGeometry(2.75, 1.5, 4);
    var gD = new THREE.BoxGeometry(0.8, 1.35, 0.12);
    var mW = _std(P.wall), mR = _std(P.roof, { roughness: 0.85 }), mD = _std('#241a12');
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 8, 46, 0.6, 0.42, 4.5, 16);
      if (!s) continue;
      var g = new THREE.Group();
      g.position.set(s.x, s.h - 0.1, s.z);
      g.rotation.y = rng.range(0, Math.PI * 2);
      var wall = new THREE.Mesh(gW, mW);
      wall.position.y = 1.1; wall.castShadow = wall.receiveShadow = true;
      var roof = new THREE.Mesh(gR, mR);
      roof.position.y = 2.9; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
      var door = new THREE.Mesh(gD, mD);
      door.position.set(0, 0.72, 1.32);
      g.add(wall); g.add(roof); g.add(door);
      E.worldRoot.add(g);
      _regAvoid(s.x, s.z, 3.4);
      W._props.push({ x: s.x, z: s.z, r: 2.6 });
    }
  }

  /* ---------- Chùa: 3 tầng thân + mái nón + Finial vàng ---------- */
  function _buildPagoda(rng, count) {
    if (count <= 0) return;
    var P = W._pal;
    var gB = new THREE.BoxGeometry(3.4, 0.4, 3.4);
    var mW = _std(P.wall), mR = _std(P.roof, { roughness: 0.85 });
    var mG = _std('#c9a227', { metalness: 0.6, roughness: 0.4, emissive: '#8a6a10', emissiveIntensity: 0.4 });
    var tiers = [{ w: 2.6, h: 1.2, r: 2.4, hr: 1.0 }, { w: 2.0, h: 1.0, r: 1.9, hr: 0.9 }, { w: 1.5, h: 0.9, r: 1.5, hr: 0.8 }];
    var bodyGeos = [], roofGeos = [], i;
    for (i = 0; i < tiers.length; i++) {
      bodyGeos.push(new THREE.BoxGeometry(tiers[i].w, tiers[i].h, tiers[i].w));
      roofGeos.push(new THREE.ConeGeometry(tiers[i].r, tiers[i].hr, 4));
    }
    var gFin = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 5);
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 10, 40, 0.8, 0.3, 5, 16);
      if (!s) continue;
      var g = new THREE.Group();
      g.position.set(s.x, s.h - 0.1, s.z);
      g.rotation.y = rng.range(0, Math.PI * 2);
      var base = new THREE.Mesh(gB, _std(P.stone, { flatShading: true }));
      base.position.y = 0.2;
      base.castShadow = base.receiveShadow = true;
      g.add(base);
      var y = 0.4;
      for (i = 0; i < tiers.length; i++) {
        var body = new THREE.Mesh(bodyGeos[i], mW);
        body.position.y = y + tiers[i].h / 2;
        body.castShadow = body.receiveShadow = true;
        g.add(body);
        y += tiers[i].h;
        var roof = new THREE.Mesh(roofGeos[i], mR);
        roof.position.y = y + tiers[i].hr / 2;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        g.add(roof);
        y += tiers[i].hr;
      }
      var fin = new THREE.Mesh(gFin, mG);
      fin.position.y = y + 0.28;
      g.add(fin);
      E.worldRoot.add(g);
      _regAvoid(s.x, s.z, 3.8);
      W._props.push({ x: s.x, z: s.z, r: 2.8 });
    }
  }

  /* ---------- Cầu vòm: 2 dãy vòm thấp + mặt deck arc + lan can ---------- */
  function _buildBridge(rng, count) {
    if (count <= 0) return;
    var T = W.def.terrain, P = W._pal;
    var spot = null;
    for (var a = 0; a < 260; a++) {
      var ang = rng.next() * Math.PI * 2, rad = 10 + rng.next() * 55;
      var x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      var h = _heightAt(x, z);
      if (h < T.waterLevel + 0.25 && h > T.waterLevel - 0.8) { spot = { x: x, z: z, h: h }; break; }
    }
    if (!spot) return;
    var mWood = _std(P.wood), mDark = _std('#2a1f16');
    var g = new THREE.Group();
    g.position.set(spot.x, Math.max(spot.h, T.waterLevel) + 0.15, spot.z);
    g.rotation.y = rng.range(0, Math.PI * 2);
    var gSlat = new THREE.BoxGeometry(0.78, 0.12, 2.5);
    var gPost = new THREE.BoxGeometry(0.12, 0.75, 0.12);
    var N = 13, i, prevY = 0;
    for (i = 0; i < N; i++) {
      var t = -1 + 2 * i / (N - 1);
      var px = t * 4.2, py = 0.4 + (1 - t * t) * 1.1;
      var slat = new THREE.Mesh(gSlat, mWood);
      slat.position.set(px, py, 0);
      if (i > 0) slat.rotation.z = Math.atan2(py - prevY, 8.4 / (N - 1));
      slat.castShadow = slat.receiveShadow = true; g.add(slat);
      prevY = py;
      if (i % 3 === 0 || i === N - 1) {
        var p1 = new THREE.Mesh(gPost, mDark);
        p1.position.set(px, py + 0.4, 1.15); p1.castShadow = true; g.add(p1);
        var p2 = new THREE.Mesh(gPost, mDark);
        p2.position.set(px, py + 0.4, -1.15); p2.castShadow = true; g.add(p2);
      }
    }
    var gArc = new THREE.TorusGeometry(2.3, 0.14, 6, 18, Math.PI);
    for (i = 0; i < 2; i++) {
      var arc = new THREE.Mesh(gArc, mDark);
      arc.scale.y = 0.5;
      arc.position.set(0, 0.2, i === 0 ? 1.1 : -1.1);
      arc.castShadow = true;
      g.add(arc);
    }
    E.worldRoot.add(g);
    _regAvoid(spot.x, spot.z, 6.5);
  }

  /* ---------- Gai núi lửa (ma_canh) + chóp phát sáng ---------- */
  function _buildSpikes(rng, count) {
    if (count <= 0) return;
    var g = new THREE.ConeGeometry(0.9, 4.8, 6); g.translate(0, 2.4, 0);
    var m = _std('#2a1c1a', { flatShading: true, roughness: 1 });
    var gt = new THREE.ConeGeometry(0.26, 0.85, 5); gt.translate(0, 0.42, 0);
    var mt = _std('#3a1a12', { emissive: '#c9351a', emissiveIntensity: 1.6, roughness: 0.6 });
    var im = new THREE.InstancedMesh(g, m, count);
    var it = new THREE.InstancedMesh(gt, mt, count);
    im.castShadow = im.receiveShadow = true;
    im.frustumCulled = it.frustumCulled = false;
    var rMax = W.def.terrain.size / 2 - 24, n = 0;
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 8, rMax, 0.3, 1.2, 2.2);
      if (!s) continue;
      var sc = rng.range(0.7, 1.7);
      _q.setFromEuler(_eu.set(rng.range(-0.16, 0.16), rng.next() * 6.28, rng.range(-0.16, 0.16)));
      _m4.compose(_v1.set(s.x, s.h - 0.25, s.z), _q, _v2.set(sc, sc, sc));
      im.setMatrixAt(n, _m4);
      _m4.compose(_v1.set(s.x, s.h - 0.25 + 4.8 * sc * 0.93, s.z), _q, _v2.set(sc * 0.9, sc * 0.9, sc * 0.9));
      it.setMatrixAt(n, _m4);
      if (sc > 1.25) W._props.push({ x: s.x, z: s.z, r: 1.05 });
      _regAvoid(s.x, s.z, 1.6);
      n++;
    }
    if (!_finalizeIM(im, n)) { U.disposeDeep(it); return; }
    _finalizeIM(it, n);
  }

  /* ---------- Lửa trại: đá + củi + ngọn lửa + PointLight nhấp nháy ---------- */
  function _buildCampfire(rng, count) {
    if (count <= 0) return;
    var P = W._pal;
    var gS = new THREE.IcosahedronGeometry(0.24, 0);
    var gL = new THREE.CylinderGeometry(0.09, 0.09, 1.15, 5);
    var gF1 = new THREE.ConeGeometry(0.4, 1.05, 6); gF1.translate(0, 0.5, 0);
    var gF2 = new THREE.ConeGeometry(0.22, 0.6, 5); gF2.translate(0, 0.32, 0);
    var mS = _std(P.stone, { flatShading: true });
    var mL = _std('#3e2c1c');
    var mF1 = _std('#ffb040', { emissive: '#ff7a1e', emissiveIntensity: 2.0, transparent: true, opacity: 0.92 });
    var mF2 = _std('#ffd24a', { emissive: '#ffb020', emissiveIntensity: 2.4, transparent: true, opacity: 0.95 });
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 7, 40, 0.5, 0.4, 1.6);
      if (!s) continue;
      var g = new THREE.Group();
      g.position.set(s.x, s.h + 0.05, s.z);
      var i;
      for (i = 0; i < 6; i++) {
        var st = new THREE.Mesh(gS, mS);
        var a2 = i * Math.PI / 3 + rng.range(-0.2, 0.2);
        st.position.set(Math.cos(a2) * 0.55, 0.12, Math.sin(a2) * 0.55);
        st.scale.setScalar(rng.range(0.8, 1.3)); g.add(st);
      }
      for (i = 0; i < 3; i++) {
        var lg = new THREE.Mesh(gL, mL);
        lg.rotation.set(0, i * 2.09, 1.25); lg.position.y = 0.18; g.add(lg);
      }
      var f1 = new THREE.Mesh(gF1, mF1);
      f1.position.y = 0.25;
      var f2 = new THREE.Mesh(gF2, mF2);
      f2.position.y = 0.3;
      g.add(f1); g.add(f2);
      if (W._lightBudget > 0) {
        var li = new THREE.PointLight('#ff9a3a', 1.3, 15, 2);
        li.position.y = 1.0; g.add(li);
        W._flickers.push({ light: li, base: 1.3, phase: rng.next() * 10, amp: 0.3 });
        W._lightBudget--;
      }
      W._flames.push({ m: f1, m2: f2, phase: rng.next() * 10 });
      E.worldRoot.add(g);
      _regAvoid(s.x, s.z, 1.6);
      W._props.push({ x: s.x, z: s.z, r: 0.9 });
    }
  }

  /* ---------- Đèn lồng: trụ + khối emissive, ≤6 PointLight ---------- */
  function _buildLanterns(rng, count) {
    if (count <= 0) return;
    var P = W._pal;
    var gP = new THREE.CylinderGeometry(0.09, 0.13, 2.5, 6); gP.translate(0, 1.25, 0);
    var gH = new THREE.BoxGeometry(0.46, 0.56, 0.46);
    var gC = new THREE.ConeGeometry(0.36, 0.24, 4);
    var mP = _std(P.wood);
    var mH = _std('#2a1c10', { emissive: P.lantern, emissiveIntensity: 1.35, roughness: 0.5 });
    var mC = _std(P.roof);
    var lightsLeft = Math.min(6, W._lightBudget);
    for (var k = 0; k < count; k++) {
      var s = _findSpot(rng, 6, 42, 0.5, 0.5, 1.2);
      if (!s) continue;
      var g = new THREE.Group();
      g.position.set(s.x, s.h, s.z);
      g.rotation.y = rng.range(0, Math.PI * 2);
      var pole = new THREE.Mesh(gP, mP);
      pole.castShadow = true;
      var head = new THREE.Mesh(gH, mH);
      head.position.y = 2.6;
      var cap = new THREE.Mesh(gC, mC);
      cap.position.y = 3.0;
      cap.rotation.y = Math.PI / 4;
      g.add(pole); g.add(head); g.add(cap);
      if (lightsLeft > 0) {
        var li = new THREE.PointLight(P.lantern, 0.95, 13, 2);
        li.position.y = 2.65; g.add(li);
        W._flickers.push({ light: li, base: 0.95, phase: rng.next() * 10, amp: 0.18 });
        lightsLeft--;
        W._lightBudget--;
      }
      E.worldRoot.add(g);
      _regAvoid(s.x, s.z, 1.0);
    }
  }

  /* ---------- Cổng dịch chuyển: torus đứng + emissive + nhãn + hạt xoay ---------- */
  function _buildPortals() {
    var list = W.def.portals || [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var h = _heightAt(p.x, p.z);
      var g = new THREE.Group();
      g.position.set(p.x, h, p.z);
      g.rotation.y = Math.atan2(-p.x, -p.z);      /* mặt cổng hướng về tâm map */
      var base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 0.4, 16),
        W._mats.stone || (W._mats.stone = _std(W._pal.stone, { flatShading: true })));
      base.position.y = 0.2;
      base.castShadow = base.receiveShadow = true;
      var spin = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 10, 40),
        _std('#16324a', { emissive: '#66d9ff', emissiveIntensity: 1.8, roughness: 0.35, metalness: 0.4 }));
      ring.position.y = 2.7;
      var disc = new THREE.Mesh(new THREE.CircleGeometry(1.36, 28),
        new THREE.MeshBasicMaterial({ color: '#59c2ef', transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, fog: false }));
      disc.position.y = 2.7;
      spin.add(ring); spin.add(disc);
      var pc = 36, parr = new Float32Array(pc * 3);
      for (var k = 0; k < pc; k++) {
        var ang = Math.random() * Math.PI * 2, rr = 0.45 + Math.random() * 0.95;
        parr[k * 3] = Math.cos(ang) * rr; parr[k * 3 + 1] = Math.sin(ang) * rr; parr[k * 3 + 2] = (Math.random() - 0.5) * 0.3;
      }
      var pgeo = new THREE.BufferGeometry();
      pgeo.setAttribute('position', new THREE.BufferAttribute(parr, 3));
      var pts = new THREE.Points(pgeo, new THREE.PointsMaterial({
        map: A.tex('glow'), color: 0x8fe0ff, size: 0.34, transparent: true,
        opacity: 0.9, depthWrite: false, fog: false, blending: THREE.AdditiveBlending
      }));
      pts.position.y = 2.7;
      pts.frustumCulled = false;
      spin.add(pts);
      var light = new THREE.PointLight('#66d9ff', 1.1, 12, 2);
      light.position.y = 2.7;
      g.add(base); g.add(spin); g.add(light);
      var label = U.makeTextSprite(p.label, { color: '#ffd700', size: 30, scale: 1.5 });
      label.position.y = 5.1; g.add(label);
      if (p.reqLevel) {
        var rl = U.makeTextSprite('(cấp ' + p.reqLevel + ')', { color: '#ff5a4a', size: 22, scale: 1.15 });
        rl.position.y = 4.35; g.add(rl);
      }
      g.userData.portal = { to: p.to, reqLevel: p.reqLevel || 0, label: p.label };
      E.worldRoot.add(g);
      W._spins.push({ g: spin, pts: pts });
      W.portals.push({ to: p.to, x: p.x, z: p.z, label: p.label, reqLevel: p.reqLevel || 0, group: g });
    }
  }

  /* ---------- Đom đóm đêm (scene rừng/trấn) ---------- */
  function _buildFireflies(rng) {
    var P = W._pal, T = W.def.terrain;
    if (!P.firefly) return;
    var max = 80, arr = new Float32Array(max * 3);
    W._ffBase = new Float32Array(max * 3);
    W._ffPhase = new Float32Array(max);
    var n = 0;
    for (var k = 0; k < max; k++) {
      var ang = rng.next() * Math.PI * 2;
      var rad = 8 + rng.next() * 50;
      var x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      var h = _heightAt(x, z);
      if (h < T.waterLevel + 0.3) continue;
      W._ffBase[n * 3] = x; W._ffBase[n * 3 + 1] = h + rng.range(0.5, 2.6); W._ffBase[n * 3 + 2] = z;
      W._ffPhase[n] = rng.range(0, 10);
      n++;
    }
    if (n === 0) return;
    W._ffCount = n;
    arr.set(W._ffBase.subarray(0, n * 3));
    var geo = new THREE.BufferGeometry();
    var attr = new THREE.BufferAttribute(arr, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr);
    W._fireflies = new THREE.Points(geo, new THREE.PointsMaterial({
      map: A.tex('dot'), color: 0xd8ff9a, size: 0.26, transparent: true, opacity: 0,
      depthWrite: false, fog: false, blending: THREE.AdditiveBlending
    }));
    W._fireflies.frustumCulled = false;
    W._fireflies.renderOrder = 3;
    W._fireflies.visible = false;
    E.worldRoot.add(W._fireflies);
  }

  function _stepFireflies() {
    var f = W._fireflies;
    if (!f) return;
    var op = (1 - W._dayF) * 0.85;
    f.material.opacity = op;
    f.visible = op > 0.03;
    if (!f.visible) return;
    var attr = f.geometry.attributes.position;
    var arr = attr.array, base = W._ffBase, ph = W._ffPhase, t = W._t;
    for (var i = 0; i < W._ffCount; i++) {
      var i3 = i * 3;
      arr[i3] = base[i3] + Math.sin(t * 0.7 + ph[i]) * 1.1;
      arr[i3 + 1] = base[i3 + 1] + Math.sin(t * 1.1 + ph[i] * 1.3) * 0.5;
      arr[i3 + 2] = base[i3 + 2] + Math.cos(t * 0.9 + ph[i]) * 1.1;
    }
    attr.needsUpdate = true;
  }

  /* ---------- Dựng / dọn scene ---------- */
  function _buildMinimap() {
    var ps = [], pr = [], i;
    for (i = 0; i < W.portals.length; i++) ps.push({ x: W.portals[i].x, z: W.portals[i].z });
    for (i = 0; i < W._props.length; i++) pr.push({ x: W._props[i].x, z: W._props[i].z, r: W._props[i].r });
    W._minimap = { radius: W.def.terrain.size / 2, portals: ps, props: pr };
  }

  function _buildScene(def) {
    _initPalette(def);
    _initNoise(def);
    /* màu nền trời / fog gốc + bản đêm (lerp trong update) */
    W._sunBase = _c(def.sky.sun);
    W._topBase = _c(def.sky.top);
    W._horBase = _c(def.sky.horizon);
    W._fogBase = _c(def.fog.color);
    W._topNight = W._topBase.clone().lerp(_c('#070b16'), 0.82);
    W._horNight = W._horBase.clone().lerp(_c('#0c1424'), 0.78);
    W._fogNight = W._fogBase.clone().lerp(_c('#0a0f1a'), 0.7);
    W._mats = {};
    W._props = [];
    W.portals = [];
    W._flickers = [];
    W._flames = [];
    W._spins = [];
    W._lightBudget = LIGHT_BUDGET;
    var rng = U.RNG.create((def.terrain.seed * 7 + 13) >>> 0);
    _initAvoid();
    _buildTerrain();
    _buildWater();
    _buildSky();
    _buildLights();
    _buildWeather();
    var pr = def.props || {};
    _buildHouses(rng, pr.houses || 0);
    _buildPagoda(rng, pr.pagoda || 0);
    _buildBridge(rng, pr.bridge || 0);
    _buildSpikes(rng, pr.spikes || 0);
    _buildTrees(rng, pr.trees || 0);
    _buildRocks(rng, pr.rocks || 0);
    _buildBamboo(rng, pr.bamboo || 0);
    _buildCampfire(rng, pr.campfire || 0);
    _buildLanterns(rng, pr.lanterns || 0);
    _buildPortals();
    _buildFireflies(rng);
    _buildMinimap();
    /* sương mù theo scene (gắn vào Engine.scene, dispose thì gỡ) */
    E.scene.fog = new THREE.FogExp2(def.fog.color, def.fog.density);
    W._fog = E.scene.fog;
  }

  function _disposeWorld() {
    if (E && E.worldRoot) {
      var root = E.worldRoot;
      for (var i = root.children.length - 1; i >= 0; i--) {
        var ch = root.children[i];
        root.remove(ch);
        if (A) A.untrack(ch);
        U.disposeDeep(ch);
      }
    }
    if (E && E.scene) E.scene.fog = null;
    W._heights = null;
    W._peaks = [];
    W._water = null; W._waterBase = null; W._waterMat = null; W._weather = null;
    W._fireflies = null; W._ffBase = null; W._ffPhase = null; W._ffCount = 0;
    W._stars = null; W._sunSpr = null; W._sky = null; W._clouds = [];
    W._sun = null; W._sunTarget = null; W._amb = null; W._hemi = null; W._fog = null;
    W._sunBase = null; W._topBase = null; W._horBase = null; W._fogBase = null;
    W._topNight = null; W._horNight = null; W._fogNight = null;
    W._flickers = []; W._flames = []; W._spins = [];
    W.portals = []; W._props = []; W._minimap = null; W._avoid = []; W._mats = {};
  }

  /* =========================================================
   * API CÔNG KHAI (CONTRACT 6a)
   * ========================================================= */
  W.build = function (sceneId) {
    return new Promise(function (resolve, reject) {
      var def = D ? D.scenes[sceneId] : null;
      if (!def) {
        reject(new Error('World: không rõ bản đồ "' + sceneId + '"'));
        return;
      }
      try {
        _disposeWorld();
        W.def = def;
        W.currentId = sceneId;
        W.ready = false;
        W.timeOfDay = DAY_START;
        W._t = 0;
        W._dayF = 0.8;
        W._timeMult = 1;
        _buildScene(def);
        W.ready = true;
        resolve();
      } catch (err) {
        W.ready = false;
        reject(err);
      }
    });
  };

  W.dispose = function () {
    _disposeWorld();
    W.ready = false;
    W.currentId = null;
    W.def = null;
    W.timeOfDay = DAY_START;
  };

  W.update = function (dt) {
    if (!W.ready || !W.def) return;
    W._t += dt;
    W.timeOfDay = (W.timeOfDay + dt * (W._timeMult || 1) / D.config.dayLength) % 1;
    _stepDayNight(dt);
    _stepWater();
    _stepWeather(dt);
    _stepFlicker(dt);
    _stepFireflies();
  };

  function _stepFlicker(dt) {
    var t = W._t, i, f;
    for (i = 0; i < W._flickers.length; i++) {
      f = W._flickers[i];
      f.light.intensity = f.base * (1 - f.amp + f.amp *
        (Math.sin(t * 9 + f.phase) * 0.6 + Math.sin(t * 23 + f.phase * 1.7) * 0.4));
    }
    for (i = 0; i < W._flames.length; i++) {
      f = W._flames[i];
      f.m.scale.y = 1 + Math.sin(t * 12 + f.phase) * 0.14;
      f.m2.scale.y = 1 + Math.sin(t * 15 + f.phase * 2) * 0.2;
    }
    for (i = 0; i < W._spins.length; i++) {
      f = W._spins[i];
      f.g.rotation.y += dt * 0.45;                /* cổng xoay chậm */
      f.pts.rotation.z -= dt * 0.8;               /* hạt xoay quanh vành */
    }
  }

  W.getHeight = function (x, z) {
    if (!W.ready || !W._heights) return 0;
    return _heightAt(x, z);
  };
  W.isWater = function (x, z) {
    if (!W.ready || !W.def) return false;
    return _heightAt(x, z) < W.def.terrain.waterLevel;
  };
  W.getPortals = function () { return W.portals; };
  W.getProps = function () { return W._props; };
  W.getMinimapData = function () {
    return W._minimap || { radius: 0, portals: [], props: [] };
  };
  W.setTimeSpeed = function (mult) { W._timeMult = mult || 1; };

  /* khởi tạo object tạm dùng chung (1 lần) */
  _v1 = new THREE.Vector3(); _v2 = new THREE.Vector3();
  _c1 = new THREE.Color(); _cG = new THREE.Color();
  _m4 = new THREE.Matrix4(); _q = new THREE.Quaternion(); _eu = new THREE.Euler();
  _DUSK_SUN = _c('#ff7038'); _MOON_C = _c('#9fb2e0');
  _DUSK_HOR = _c('#ff8a3c'); _WHITE = _c('#ffffff');

  MVL.World = W;
})(window.MVL);
