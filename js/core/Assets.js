/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Assets.js
 * Quản lý tài sản: GLB (GLTFLoader + Draco + SkeletonUtils),
 * texture canvas procedural, chuẩn hoá kích thước, animation,
 * tô màu / nháy khi trúng đòn, vật phẩm thay thế khi thiếu.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var A = {
    _gltfs: {}, _textures: {},
    loader: null, texLoader: null, draco: null,
    _mixers: new Map(), _flashList: []
  };

  A.init = function () {
    A.draco = new THREE.DRACOLoader();
    A.draco.setDecoderPath('js/lib/draco/');
    A.loader = new THREE.GLTFLoader();
    A.loader.setDRACOLoader(A.draco);
    A.texLoader = new THREE.TextureLoader();
  };

  A.loadManifest = function (list, onProgress) {
    return new Promise(function (resolve) {
      var total = list.length, done = 0;
      function tick(label) {
        done++;
        if (onProgress) onProgress(done / total, label);
        if (done >= total) resolve();
      }
      if (total === 0) { resolve(); return; }
      list.forEach(function (item) {
        if (item.type === 'glb') {
          A.loader.load(item.url, function (gltf) {
            A._gltfs[item.key] = gltf;
            tick(item.key);
          }, undefined, function (err) {
            console.warn('[Assets] tải lỗi:', item.key, err && err.message || err);
            A._gltfs[item.key] = null;
            tick(item.key);
          });
        } else {
          A.texLoader.load(item.url, function (tex) {
            A._textures[item.key] = tex;
            tick(item.key);
          }, undefined, function () { tick(item.key); });
        }
      });
    });
  };

  A.get = function (key) { return A._gltfs[key] || null; };
  A.getTexture = function (key) { return A._textures[key] || null; };

  /* Texture canvas dùng chung (glow, hạt, mưa, tuyết, sao) */
  A.tex = function (type) {
    if (A._textures['c_' + type]) return A._textures['c_' + type];
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var size = 64; cv.width = size; cv.height = size;
    if (type === 'glow' || type === 'dot' || type === 'snow') {
      var g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(type === 'dot' ? 0.5 : 0.35, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    } else if (type === 'streak') {
      var g2 = ctx.createLinearGradient(0, 0, 0, size);
      g2.addColorStop(0, 'rgba(255,255,255,0)');
      g2.addColorStop(0.5, 'rgba(255,255,255,0.9)');
      g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g2; ctx.fillRect(28, 0, 6, size);
    } else if (type === 'star') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        var a2 = a + Math.PI / 5;
        ctx.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26);
        ctx.lineTo(32 + Math.cos(a2) * 11, 32 + Math.sin(a2) * 11);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    }
    var t = new THREE.CanvasTexture(cv);
    A._textures['c_' + type] = t;
    return t;
  };

  function makeFallback(opts) {
    var group = new THREE.Group();
    var geo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.35, 0.9, 4, 8)
                                         : new THREE.CylinderGeometry(0.35, 0.35, 1.6, 8);
    var mat = new THREE.MeshStandardMaterial({ color: 0xff4dd2, emissive: 0x330022, roughness: 0.6 });
    var m = new THREE.Mesh(geo, mat);
    m.position.y = 0.85; m.castShadow = true;
    group.add(m);
    return { group: group, mixer: null, anims: [], playAnim: function () {}, stopAnim: function () {}, setTint: function () {} };
  }

  /* Tạo bản thể từ GLB đã nạp: nhân bản (skin an toàn), chuẩn hoá
     chiều cao, chân chạm đất, bật shadow, gắn mixer + API animation */
  A.instantiate = function (key, opts) {
    opts = opts || {};
    var src = A._gltfs[key];
    if (!src) {
      console.warn('[Assets] thiếu model:', key, '— dùng vật thay thế');
      return makeFallback(opts);
    }
    var obj;
    try {
      obj = (THREE.SkeletonUtils && THREE.SkeletonUtils.clone)
        ? THREE.SkeletonUtils.clone(src.scene)
        : src.scene.clone(true);
    } catch (e) {
      obj = src.scene.clone(true);
    }

    var box = new THREE.Box3().setFromObject(obj);
    var size = box.getSize(new THREE.Vector3());
    var targetH = opts.height || 1.75;
    var s = size.y > 0.0001 ? targetH / size.y : 1;
    s *= (opts.scale || 1);
    obj.scale.setScalar(s);

    var box2 = new THREE.Box3().setFromObject(obj);
    var c = box2.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -box2.min.y, -c.z);

    obj.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = opts.shadows !== false;
        o.receiveShadow = true;
        o.frustumCulled = true;
      }
    });

    var group = new THREE.Group();
    group.add(obj);

    var clips = (src.animations && src.animations.length) ? src.animations : [];
    var mixer = null;
    if (clips.length) {
      mixer = new THREE.AnimationMixer(obj);
      A._mixers.set(group, mixer);
    }

    group.userData = {
      key: key, height: targetH, mixer: mixer,
      anims: clips.map(function (c2) { return c2.name; }),
      cur: null, tinted: false
    };

    return {
      group: group,
      obj: obj,
      mixer: mixer,
      anims: group.userData.anims,
      playAnim: function (name, o) { return A.playAnim(group, name, o); },
      stopAnim: function () {
        if (mixer) mixer.stopAllAction();
        group.userData.cur = null;
      },
      setTint: function (hex) { A.setTint(group, hex); }
    };
  };

  A.playAnim = function (group, name, opts) {
    opts = opts || {};
    var ud = group.userData;
    if (!ud || !ud.mixer) return null;
    var lc = String(name || '').toLowerCase();
    var clip = null;
    var anims = ud.anims;
    for (var i = 0; i < anims.length; i++) {
      if (anims[i].toLowerCase() === lc) { clip = anims[i]; break; }
    }
    if (!clip) {
      for (var j = 0; j < anims.length; j++) {
        if (anims[j].toLowerCase().indexOf(lc) >= 0) { clip = anims[j]; break; }
      }
    }
    if (!clip && anims.length) clip = anims[0];
    if (!clip) return null;
    var gltf = A._gltfs[ud.key];
    var clipObj = null;
    if (gltf && gltf.animations) {
      for (var k = 0; k < gltf.animations.length; k++) {
        if (gltf.animations[k].name === clip) { clipObj = gltf.animations[k]; break; }
      }
      if (!clipObj) clipObj = gltf.animations[0];
    }
    if (!clipObj) return null;
    var action = ud.mixer.clipAction(clipObj);
    action.setLoop(opts.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, opts.loop === false ? 1 : Infinity);
    if (opts.loop === false) action.clampWhenFinished = true;
    var prev = ud.cur;
    action.reset();
    var fade = opts.fade !== undefined ? opts.fade : 0.22;
    if (prev && prev !== action && prev.isRunning()) action.crossFadeFrom(prev, fade, false);
    action.play();
    ud.cur = action;
    return action;
  };

  A.update = function (dt) {
    A._mixers.forEach(function (mixer) {
      try { mixer.update(dt); } catch (e) {}
    });
    /* hiệu ứng nháy đỏ khi trúng đòn */
    for (var i = A._flashList.length - 1; i >= 0; i--) {
      var f = A._flashList[i];
      f.t -= dt;
      var k = f.t / f.dur;
      if (k <= 0 || !f.group.parent) {
        A._applyEmissive(f.group, f.orig);
        A._flashList.splice(i, 1);
      } else {
        var on = (Math.sin(f.t * 30) > 0);
        A._setEmissiveAll(f.group, on ? 0x991111 : 0x000000);
      }
    }
  };

  A.untrack = function (group) { A._mixers.delete(group); };

  A._eachMat = function (group, fn) {
    group.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      for (var i = 0; i < mats.length; i++) fn(o, mats[i]);
    });
  };

  A._setEmissiveAll = function (group, hex) {
    A._eachMat(group, function (o, m) {
      if (m.emissive) m.emissive.setHex(hex);
    });
  };

  A._applyEmissive = function (group, origMap) {
    A._eachMat(group, function (o, m) {
      if (origMap && origMap.has(m)) m.emissive.setHex(origMap.get(m));
      else if (m.emissive) m.emissive.setHex(0x000000);
    });
  };

  A.flash = function (group, hex, dur) {
    if (!group) return;
    hex = hex === undefined ? 0x991111 : hex;
    dur = dur || 0.18;
    var orig = new Map();
    A._eachMat(group, function (o, m) {
      if (!m.userData._cloned) { m = m.clone(); m.userData._cloned = true; o.material = m; }
      if (m.emissive) orig.set(m, m.emissive.getHex());
    });
    A._flashList.push({ group: group, t: dur, dur: dur, orig: orig });
    A._setEmissiveAll(group, hex);
  };

  A.setTint = function (group, hex) {
    if (!group || !hex) return;
    A._eachMat(group, function (o, m) {
      if (!m.userData._cloned) { m = m.clone(); m.userData._cloned = true; o.material = m; }
      if (m.color) m.color.lerp(new THREE.Color(hex), 0.55);
    });
  };

  MVL.Assets = A;
})(window.MVL);
