/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Input.js
 * Bàn phím + chuột + cảm ứng (joystick ảo, nút hành động).
 * Mọi hành động đều qua "edge trigger" (consumeAction).
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var I = {
    _keys: {},
    _actions: {},
    _joy: { x: 0, y: 0 },
    _mouse0: false,
    _enabled: true,
    _dragFns: [], _wheelFns: [], _tapFns: [],
    _downPos: null, _downTime: 0, _moved: 0, _dragging: false,
    _canvas: null
  };

  var KEY_ACTIONS = {
    'Space': 'jump', 'KeyQ': 'dash', 'KeyE': 'interact', 'Tab': 'target',
    'KeyR': 'potion', 'KeyZ': 'mount', 'Digit1': 'skill0', 'Digit2': 'skill1',
    'Digit3': 'skill2', 'Digit4': 'skill3'
  };

  I.init = function (canvas) {
    I._canvas = canvas;

    window.addEventListener('keydown', function (e) {
      if (!I._enabled) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      I._keys[e.code] = true;
      var act = KEY_ACTIONS[e.code];
      if (act) {
        e.preventDefault();
        if (!e.repeat) I._actions[act] = true;
      }
      if (e.code === 'Tab') e.preventDefault();
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      I._keys[e.code] = false;
    });
    window.addEventListener('blur', function () {
      I._keys = {}; I._mouse0 = false; I._joy.x = 0; I._joy.y = 0;
    });

    /* ---- chuột: kéo xoay camera, lăn zoom, tap chọn mục tiêu / đánh ---- */
    canvas.addEventListener('mousedown', function (e) {
      if (!I._enabled) return;
      if (e.button === 0) I._mouse0 = true;
      I._downPos = { x: e.clientX, y: e.clientY };
      I._downTime = Date.now();
      I._moved = 0;
      I._dragging = true;
    });
    window.addEventListener('mousemove', function (e) {
      if (!I._enabled || !I._dragging) return;
      var dx = e.movementX || 0, dy = e.movementY || 0;
      if (I._downPos) {
        I._moved += Math.abs(dx) + Math.abs(dy);
        if (I._moved > 6) {
          for (var i = 0; i < I._dragFns.length; i++) I._dragFns[i](dx, dy);
        }
      }
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) I._mouse0 = false;
      if (!I._enabled) { I._dragging = false; return; }
      if (I._dragging && I._downPos && Date.now() - I._downTime < 260 && I._moved <= 6) {
        var fns = I._tapFns.slice();
        for (var i = 0; i < fns.length; i++) fns[i](e.clientX, e.clientY);
      }
      I._dragging = false; I._downPos = null;
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('wheel', function (e) {
      if (!I._enabled) return;
      e.preventDefault();
      for (var i = 0; i < I._wheelFns.length; i++) I._wheelFns[i](e.deltaY);
    }, { passive: false });

    /* ---- cảm ứng: joystick trong vùng riêng, kéo ở canvas = xoay camera ---- */
    var zone = document.getElementById('joystick-zone');
    var base = document.getElementById('joystick-base');
    var stick = document.getElementById('joystick-stick');
    if (zone && base && stick) {
      var joyId = null, joyCx = 0, joyCy = 0;
      var R = 56;
      var setJoy = function (dx, dy) {
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len > R) { dx = dx / len * R; dy = dy / len * R; }
        I._joy.x = dx / R; I._joy.y = -dy / R;
        stick.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      };
      zone.addEventListener('touchstart', function (e) {
        if (joyId !== null) return;
        var t = e.changedTouches[0];
        joyId = t.identifier;
        var r = base.getBoundingClientRect();
        joyCx = r.left + r.width / 2; joyCy = r.top + r.height / 2;
        setJoy(t.clientX - joyCx, t.clientY - joyCy);
        e.preventDefault();
      }, { passive: false });
      zone.addEventListener('touchmove', function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          var t = e.changedTouches[i];
          if (t.identifier === joyId) setJoy(t.clientX - joyCx, t.clientY - joyCy);
        }
        e.preventDefault();
      }, { passive: false });
      var endJoy = function (e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyId) {
            joyId = null; I._joy.x = 0; I._joy.y = 0;
            stick.style.transform = 'translate(0,0)';
          }
        }
      };
      zone.addEventListener('touchend', endJoy);
      zone.addEventListener('touchcancel', endJoy);
    }

    var tStart = null;
    canvas.addEventListener('touchstart', function (e) {
      if (!I._enabled) return;
      if (tStart === null) {
        var t = e.changedTouches[0];
        tStart = { id: t.identifier, x: t.clientX, y: t.clientY, time: Date.now(), moved: 0 };
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (!I._enabled || !tStart) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === tStart.id) {
          var dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
          tStart.moved += Math.abs(dx) + Math.abs(dy);
          for (var j = 0; j < I._dragFns.length; j++) I._dragFns[j](dx * 1.6, dy * 1.6);
          tStart.x = t.clientX; tStart.y = t.clientY;
        }
      }
    }, { passive: true });
    canvas.addEventListener('touchend', function (e) {
      if (!tStart) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === tStart.id) {
          if (Date.now() - tStart.time < 260 && tStart.moved <= 10) {
            var fns = I._tapFns.slice();
            for (var j = 0; j < fns.length; j++) fns[j](t.clientX, t.clientY);
          }
          tStart = null;
        }
      }
    });

    /* ---- nút cảm ứng HUD ---- */
    var btns = document.querySelectorAll('#touch-actions .tbtn');
    for (var b = 0; b < btns.length; b++) {
      (function (btn) {
        var act = btn.getAttribute('data-act');
        btn.addEventListener('touchstart', function (e) {
          e.preventDefault(); e.stopPropagation();
          if (act === 'attack') I._mouse0 = true;
          else I._actions[act] = true;
        }, { passive: false });
        btn.addEventListener('touchend', function (e) {
          if (act === 'attack') I._mouse0 = false;
        });
        btn.addEventListener('click', function (e) { /* fallback chuột */
          if (act === 'attack') { I._actions['attack'] = true; }
        });
      })(btns[b]);
    }
  };

  I.onDrag = function (fn) { I._dragFns.push(fn); return function () { var i = I._dragFns.indexOf(fn); if (i >= 0) I._dragFns.splice(i, 1); }; };
  I.onWheel = function (fn) { I._wheelFns.push(fn); return function () { var i = I._wheelFns.indexOf(fn); if (i >= 0) I._wheelFns.splice(i, 1); }; };
  I.onTap = function (fn) { I._tapFns.push(fn); return function () { var i = I._tapFns.indexOf(fn); if (i >= 0) I._tapFns.splice(i, 1); }; };

  I.isDown = function (code) { return !!I._keys[code]; };
  I.isMouse0 = function () { return I._enabled && I._mouse0; };

  I.consumeAction = function (name) {
    if (I._actions[name]) { I._actions[name] = false; return true; }
    return false;
  };
  I.consumeJump = function () { return I.consumeAction('jump'); };
  I.triggerAction = function (name) { I._actions[name] = true; };

  I.axis = function () {
    if (!I._enabled) return { x: 0, z: 0 };
    var x = 0, z = 0;
    if (I.isDown('KeyW') || I.isDown('ArrowUp')) z += 1;
    if (I.isDown('KeyS') || I.isDown('ArrowDown')) z -= 1;
    if (I.isDown('KeyA') || I.isDown('ArrowLeft')) x -= 1;
    if (I.isDown('KeyD') || I.isDown('ArrowRight')) x += 1;
    x += I._joy.x; z += I._joy.y;
    var len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }
    return { x: x, z: z };
  };

  I.sprinting = function () {
    return I._enabled && (I.isDown('ShiftLeft') || I.isDown('ShiftRight'));
  };

  I.setEnabled = function (b) {
    I._enabled = b;
    if (!b) { I._keys = {}; I._mouse0 = false; I._joy.x = 0; I._joy.y = 0; I._actions = {}; }
  };

  MVL.Input = I;
})(window.MVL);
