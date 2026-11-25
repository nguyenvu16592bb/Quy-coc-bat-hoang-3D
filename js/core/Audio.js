/* =========================================================
 * Mộng Võ Lâm 3D — js/core/Audio.js
 * Engine âm thanh 100% WebAudio tổng hợp (không cần file):
 *  - SFX: kiếm chém, trúng đòn, bạo kích, thi pháp, nhặt đồ,
 *    lên cấp, nhiệm vụ, cổng dịch chuyển, quái gầm...
 *  - BGM: vòng lặp ngũ cung theo mood từng bản đồ (procedural).
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var A = {
    ctx: null, master: null, bgmGain: null, sfxGain: null,
    _bgmTimer: null, _bgmBar: 0, _mood: null, _muted: false,
    _vol: { master: 0.8, bgm: 0.55, sfx: 0.7 }
  };

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  A.init = function () {
    if (A.ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      var comp = A.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 20; comp.ratio.value = 6;
      comp.connect(A.ctx.destination);
      A.master = A.ctx.createGain(); A.master.gain.value = A._vol.master;
      A.master.connect(comp);
      A.bgmGain = A.ctx.createGain(); A.bgmGain.gain.value = A._vol.bgm;
      A.bgmGain.connect(A.master);
      A.sfxGain = A.ctx.createGain(); A.sfxGain.gain.value = A._vol.sfx;
      A.sfxGain.connect(A.master);
    } catch (e) { console.warn('[Audio] init lỗi:', e && e.message); }
  };

  A.setVolume = function (kind, v) {
    v = Math.max(0, Math.min(1, v));
    A._vol[kind] = v;
    if (kind === 'master' && A.master) A.master.gain.value = v;
    if (kind === 'bgm' && A.bgmGain) A.bgmGain.gain.value = v;
    if (kind === 'sfx' && A.sfxGain) A.sfxGain.gain.value = v;
  };
  A.setMuted = function (b) {
    A._muted = b;
    if (A.master) A.master.gain.value = b ? 0 : A._vol.master;
  };

  /* ---------- helpers tổng hợp ---------- */
  function tone(freq, type, dur, vol, slideTo, dest, delay) {
    if (!A.ctx) return;
    var t0 = A.ctx.currentTime + (delay || 0);
    var o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || A.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterType, freq, freqTo, delay) {
    if (!A.ctx) return;
    var t0 = A.ctx.currentTime + (delay || 0);
    var len = Math.max(1, Math.floor(A.ctx.sampleRate * dur));
    var buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = A.ctx.createBufferSource(); src.buffer = buf;
    var f = A.ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.setValueAtTime(freq || 1000, t0);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + dur);
    var g = A.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(A.sfxGain);
    src.start(t0);
  }

  /* ---------- SFX ---------- */
  A.sfx = function (name) {
    if (!A.ctx || A._muted) return;
    switch (name) {
      case 'swing': noise(0.13, 0.22, 'bandpass', 1600, 400); break;
      case 'hit': tone(150, 'triangle', 0.1, 0.3, 55); noise(0.07, 0.18, 'lowpass', 700); break;
      case 'crit': tone(400, 'square', 0.12, 0.22, 110); tone(160, 'triangle', 0.15, 0.3, 50); noise(0.1, 0.2, 'bandpass', 2000, 500); break;
      case 'cast': tone(300, 'sawtooth', 0.3, 0.12, 900); tone(1200, 'sine', 0.25, 0.08, 2400, A.sfxGain, 0.05); break;
      case 'aoe': tone(70, 'sine', 0.4, 0.4, 38); noise(0.3, 0.25, 'lowpass', 400, 120); break;
      case 'heal': [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 'triangle', 0.35, 0.12, null, A.sfxGain, i * 0.09); }); break;
      case 'pickup': tone(880, 'sine', 0.1, 0.15, 1320); tone(1320, 'sine', 0.1, 0.12, 1760, A.sfxGain, 0.07); break;
      case 'coin': tone(1300, 'square', 0.06, 0.1); tone(1700, 'square', 0.08, 0.08, null, A.sfxGain, 0.05); break;
      case 'levelup': [392, 523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, 'triangle', 0.4, 0.14, null, A.sfxGain, i * 0.11); }); break;
      case 'ui': tone(700, 'sine', 0.05, 0.1); break;
      case 'open': tone(500, 'sine', 0.08, 0.1, 800); break;
      case 'close': tone(800, 'sine', 0.08, 0.1, 500); break;
      case 'error': tone(220, 'square', 0.15, 0.12, 180); break;
      case 'dash': noise(0.22, 0.2, 'highpass', 500, 3000); break;
      case 'roar': tone(65, 'sawtooth', 0.7, 0.3, 48); noise(0.6, 0.25, 'lowpass', 300, 90); break;
      case 'boss': tone(110, 'sawtooth', 0.9, 0.28, 55); tone(55, 'sine', 1.1, 0.35, 30); noise(0.9, 0.2, 'lowpass', 500, 100); break;
      case 'quest': tone(660, 'sine', 0.3, 0.15); tone(880, 'sine', 0.45, 0.15, null, A.sfxGain, 0.18); break;
      case 'achieve': [523, 659, 880, 1046].forEach(function (f, i) { tone(f, 'triangle', 0.3, 0.13, null, A.sfxGain, i * 0.1); }); break;
      case 'portal': tone(400, 'sine', 0.8, 0.12, 1600); tone(800, 'sine', 0.8, 0.08, 2400, A.sfxGain, 0.1); break;
      case 'death': tone(300, 'triangle', 0.8, 0.25, 70); break;
      case 'revive': [330, 440, 550].forEach(function (f, i) { tone(f, 'sine', 0.4, 0.13, null, A.sfxGain, i * 0.12); }); break;
      case 'footstep': noise(0.05, 0.05, 'lowpass', 500); break;
      case 'upgrade': [440, 550, 660, 880].forEach(function (f, i) { tone(f, 'square', 0.15, 0.1, null, A.sfxGain, i * 0.08); }); break;
      default: tone(600, 'sine', 0.08, 0.1);
    }
  };

  /* ---------- BGM ngũ cung theo mood ---------- */
  var MOODS = {
    village: { bpm: 72, root: 57, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 12], [-3, 4, 9], [2, 9, 14], [-1, 7, 11]], arp: 3, drums: false, padWave: 'triangle' },
    forest: { bpm: 84, root: 55, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12], [-2, 5, 10], [3, 10, 15], [-2, 5, 10]], arp: 4, drums: false, padWave: 'triangle' },
    canyon: { bpm: 66, root: 50, scale: [0, 3, 5, 6, 10], chords: [[0, 6, 12], [-4, 3, 8], [0, 7, 12], [-5, 2, 7]], arp: 2, drums: false, padWave: 'sawtooth' },
    snow: { bpm: 60, root: 59, scale: [0, 2, 3, 7, 8], chords: [[0, 7, 12], [-3, 4, 11], [2, 9, 14], [0, 7, 12]], arp: 2, drums: false, padWave: 'sine' },
    boss: { bpm: 112, root: 45, scale: [0, 2, 3, 5, 7, 10], chords: [[0, 3, 7], [0, 3, 7], [-2, 1, 5], [1, 5, 8]], arp: 4, drums: true, padWave: 'sawtooth' },
    battle: { bpm: 128, root: 50, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12], [3, 10, 15], [5, 12, 17], [3, 10, 15]], arp: 5, drums: true, padWave: 'square' }
  };

  function bgmBar(cfg) {
    if (!A.ctx || A._muted) return;
    var barDur = 60 / cfg.bpm * 4;
    var beat = 60 / cfg.bpm;
    var chord = cfg.chords[A._bgmBar % cfg.chords.length];
    /* pad nền */
    for (var ci = 0; ci < chord.length; ci++) {
      var f = midi(cfg.root + chord[ci]);
      var t0 = A.ctx.currentTime;
      var o = A.ctx.createOscillator(), g = A.ctx.createGain(), fl = A.ctx.createBiquadFilter();
      o.type = cfg.padWave; o.frequency.value = f;
      o.detune.value = (ci - 1) * 6;
      fl.type = 'lowpass'; fl.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t0 + barDur);
      o.connect(fl); fl.connect(g); g.connect(A.bgmGain);
      o.start(t0); o.stop(t0 + barDur + 0.1);
    }
    /* arp pluck ngũ cung */
    var steps = cfg.arp * 4;
    for (var s = 0; s < steps; s++) {
      if (Math.random() > 0.62) continue;
      var deg = cfg.scale[Math.floor(Math.random() * cfg.scale.length)] + (Math.random() > 0.7 ? 12 : 0);
      var nf = midi(cfg.root + 12 + chord[s % chord.length] * 0 + deg);
      var tt = A.ctx.currentTime + s * (barDur / steps);
      var oo = A.ctx.createOscillator(), gg = A.ctx.createGain();
      oo.type = 'triangle'; oo.frequency.value = nf;
      gg.gain.setValueAtTime(0.0001, tt);
      gg.gain.exponentialRampToValueAtTime(0.09, tt + 0.01);
      gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.32);
      oo.connect(gg); gg.connect(A.bgmGain);
      oo.start(tt); oo.stop(tt + 0.4);
    }
    /* trống cho boss/battle */
    if (cfg.drums) {
      for (var b = 0; b < 4; b++) {
        var tb = A.ctx.currentTime + b * beat;
        var ob = A.ctx.createOscillator(), gb = A.ctx.createGain();
        ob.type = 'sine'; ob.frequency.setValueAtTime(150, tb);
        ob.frequency.exponentialRampToValueAtTime(45, tb + 0.12);
        gb.gain.setValueAtTime(0.28, tb);
        gb.gain.exponentialRampToValueAtTime(0.0001, tb + 0.16);
        ob.connect(gb); gb.connect(A.bgmGain);
        ob.start(tb); ob.stop(tb + 0.2);
        if (b % 2 === 1) {
          var hn = A.ctx.createBufferSource();
          var len = Math.floor(A.ctx.sampleRate * 0.05);
          var hb = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
          var hd = hb.getChannelData(0);
          for (var i2 = 0; i2 < len; i2++) hd[i2] = (Math.random() * 2 - 1) * (1 - i2 / len);
          hn.buffer = hb;
          var hg = A.ctx.createGain(); hg.gain.value = 0.07;
          var hf = A.ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 6000;
          hn.connect(hf); hf.connect(hg); hg.connect(A.bgmGain);
          hn.start(tb);
        }
      }
    }
  }

  A.playBgm = function (mood) {
    if (!A.ctx || A._mood === mood) return;
    A._mood = mood;
    A._bgmBar = 0;
    if (A._bgmTimer) clearInterval(A._bgmTimer);
    var cfg = MOODS[mood] || MOODS.village;
    var barDur = 60 / cfg.bpm * 4;
    bgmBar(cfg);
    A._bgmTimer = setInterval(function () {
      A._bgmBar++;
      bgmBar(cfg);
    }, barDur * 1000);
  };

  A.stopBgm = function () {
    if (A._bgmTimer) { clearInterval(A._bgmTimer); A._bgmTimer = null; }
    A._mood = null;
  };

  MVL.Audio = A;
})(window.MVL);
