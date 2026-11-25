/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Camera.js
 * Camera vai thứ ba: bám theo người chơi, xoay/zoom bằng
 * chuột & cảm ứng, chống xuyên địa hình, rung màn hình.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var C = {
    yaw: 0, pitch: 0.46, dist: 7.5,
    minDist: 3.5, maxDist: 15,
    target: null,
    invertY: false,
    _shakeT: 0, _shakeAmp: 0,
    _pos: new THREE.Vector3(0, 8, 12),
    _lookAt: new THREE.Vector3(),
    offset: null
  };

  C.init = function (camera) {
    C.offset = new THREE.Vector3(0, 1.7, 0);
    MVL.Input.onDrag(function (dx, dy) {
      C.yaw -= dx * 0.0052;
      C.pitch += (C.invertY ? dy : -dy) * 0.0042;
      C.pitch = MVL.Utils.clamp(C.pitch, 0.05, 1.25);
    });
    MVL.Input.onWheel(function (dy) {
      C.dist = MVL.Utils.clamp(C.dist + dy * 0.01, C.minDist, C.maxDist);
    });
    window.addEventListener('keydown', function (e) {
      if (e.code === 'ArrowRight' && e.shiftKey) C.yaw -= 0.08;
      if (e.code === 'ArrowLeft' && e.shiftKey) C.yaw += 0.08;
    });
  };

  C.follow = function (obj3D) { C.target = obj3D; };

  C.rotateBy = function (dx, dy) {
    C.yaw -= dx * 0.0052;
    C.pitch = MVL.Utils.clamp(C.pitch + (C.invertY ? dy : -dy) * 0.0042, 0.05, 1.25);
  };
  C.zoomBy = function (dy) {
    C.dist = MVL.Utils.clamp(C.dist + dy * 0.01, C.minDist, C.maxDist);
  };

  C.shake = function (amp, dur) {
    C._shakeAmp = amp; C._shakeT = dur;
  };

  C.update = function (dt) {
    var cam = MVL.Engine.camera;
    if (!cam) return;
    if (C.target) {
      var tp = C.target.position;
      var lx = tp.x, ly = tp.y + C.offset.y, lz = tp.z;
      C._lookAt.x = MVL.Utils.damp(C._lookAt.x, lx, 10, dt);
      C._lookAt.y = MVL.Utils.damp(C._lookAt.y, ly, 10, dt);
      C._lookAt.z = MVL.Utils.damp(C._lookAt.z, lz, 10, dt);

      var cp = Math.cos(C.pitch), sp = Math.sin(C.pitch);
      var dx = Math.sin(C.yaw) * cp * C.dist;
      var dz = Math.cos(C.yaw) * cp * C.dist;
      var dy2 = sp * C.dist + 0.6;

      var wx = C._lookAt.x + dx, wy = C._lookAt.y + dy2, wz = C._lookAt.z + dz;

      /* không chui xuống đất */
      if (MVL.World && MVL.World.ready) {
        var gh = MVL.World.getHeight(wx, wz) + 0.45;
        if (wy < gh) wy = gh;
      }

      C._pos.x = MVL.Utils.damp(C._pos.x, wx, 12, dt);
      C._pos.y = MVL.Utils.damp(C._pos.y, wy, 12, dt);
      C._pos.z = MVL.Utils.damp(C._pos.z, wz, 12, dt);
    }

    cam.position.copy(C._pos);

    if (C._shakeT > 0) {
      C._shakeT -= dt;
      var a = C._shakeAmp * Math.max(0, C._shakeT) * 6;
      cam.position.x += (Math.random() - 0.5) * a;
      cam.position.y += (Math.random() - 0.5) * a;
      cam.position.z += (Math.random() - 0.5) * a;
    }

    if (C.target) cam.lookAt(C._lookAt);
  };

  MVL.Cam = C;
})(window.MVL);
