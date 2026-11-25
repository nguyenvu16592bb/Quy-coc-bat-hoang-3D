/* =========================================================
 * Mộng Võ Lâm 3D — js/main.js
 * Bộ điều phối: boot, đăng nhập, tạo nhân vật, vào thế giới,
 * quản lý scene/cổng, chọn mục tiêu, chết/hồi sinh, tự lưu,
 * chế độ tự kiểm thử (?autotest=1).
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var U = MVL.Utils, Bus = MVL.Bus, D = MVL.Data;
  var G = {
    state: 'boot',           /* boot → login → play */
    player: null,
    sceneId: null,
    save: null,
    _autosaveT: 0,
    _playT: 0,
    _interactTarget: null,
    _bootAssetsDone: false,
    _tutStep: 0
  };
  MVL.Game = G;
  MVL.Game.currentPlayer = null;

  /* ---------------- BOOT ---------------- */
  G.boot = function () {
    MVL.Engine.init();
    MVL.Assets.init();
    MVL.Input.init(MVL.Engine.renderer.domElement);
    MVL.Cam.init(MVL.Engine.camera);
    MVL.FX.init();
    MVL.Combat.init();
    MVL.Chat.init();
    MVL.UI.init();
    MVL.Achievements.init();

    /* âm thanh cần gesture đầu tiên */
    var audioOn = function () {
      MVL.Audio.init();
      window.removeEventListener('pointerdown', audioOn);
      window.removeEventListener('keydown', audioOn);
    };
    window.addEventListener('pointerdown', audioOn);
    window.addEventListener('keydown', audioOn);

    /* tải model nền trong khi login hiển thị */
    MVL.UI.showLogin();
    MVL.Assets.loadManifest(D.config.assetManifest, function (frac, label) {
      MVL.UI.loadProgress(frac, label);
      if (frac >= 1) G._bootAssetsDone = true;
    }).then(function () {
      G._bootAssetsDone = true;
      MVL.UI.loadProgress(1, 'Hoàn tất');
    });

    MVL.Engine.start();
    /* vòng lặp chính của game */
    MVL.Engine.addUpdate(function (dt) { G.update(dt); });
    G.state = 'login';
  };

  G._hideScreens = function () {
    var scr = document.querySelectorAll('.screen');
    for (var i = 0; i < scr.length; i++) scr[i].classList.add('hidden');
  };

  /* ---------------- TẠO / TIẾP NHÂN VẬT ---------------- */
  G.newGame = function (name, classId, heroModel) {
    G._hideScreens();
    MVL.Progression.newState(name, classId, heroModel);
    MVL.Inventory.reset();
    MVL.Quests.reset();
    MVL.Achievements.reset();
    G.save = { discovered: ['mong_hanh_son'], settings: { master: 0.8, bgm: 0.55, sfx: 0.7, quality: 'medium', invertY: false, autosave: true }, playtime: 0 };
    G.spawnPlayer();
    G.enterScene('mong_hanh_son', { fresh: true });
    /* nhiệm vụ mở màn + pet thân chủ */
    setTimeout(function () {
      if (MVL.Quests.accept('q1')) MVL.UI.toast('Nhận nhiệm vụ: Sơ Nhập Giang Hồ', 'quest', '📜');
      MVL.UI.toast('Thánh thú Coco đã theo chủ — tự nhặt đồ giùm bạn!', 'good', '🐱');
    }, 1400);
    G.state = 'play';
  };

  G.continueGame = function () {
    G._hideScreens();
    var s = MVL.Save.load();
    if (!s) { MVL.UI.toast('Không có dữ liệu lưu!', 'bad'); return; }
    MVL.Progression.fromSave(s.player);
    MVL.Inventory.fromSave(s.inventory, s.equipment);
    MVL.Quests.fromSave(s.quests);
    MVL.Achievements.fromSave(s.ach);
    G.save = s;
    if (!G.save.discovered) G.save.discovered = ['mong_hanh_son'];
    if (!G.save.settings) G.save.settings = { master: 0.8, bgm: 0.55, sfx: 0.7, quality: 'medium', invertY: false, autosave: true };
    G.spawnPlayer();
    G.enterScene(s.player.scene || 'mong_hanh_son', { restorePos: s.player.pos, restoreHp: true });
    G.state = 'play';
  };

  G.spawnPlayer = function () {
    if (!G.player) {
      G.player = new MVL.Player();
      G.player.init({
        name: MVL.Progression.state.name,
        classId: MVL.Progression.state.classId,
        heroModel: MVL.Progression.state.heroModel,
        level: MVL.Progression.state.level
      });
      MVL.Game.currentPlayer = G.player;
    } else {
      G.player.rebuildModel(MVL.Progression.state.heroModel);
    }
    G.player.alive = true;
    G.player.hp = MVL.Progression.state.hp || G.player.maxHp;
    G.player.mp = MVL.Progression.state.mp || G.player.maxMp;
  };

  /* ---------------- SCENE MANAGER ---------------- */
  G.enterScene = function (sceneId, opts) {
    opts = opts || {};
    var def = D.scenes[sceneId];
    if (!def) { console.error('Không có scene', sceneId); return; }
    G._fade(function () {
      MVL.Mobs.clear();
      MVL.NPCs.clear();
      MVL.Loot.clear();
      MVL.FX.clearAll();
      MVL.Combat.setCurrentTarget(null);
      G.sceneId = sceneId;
      MVL.World.build(sceneId);
      MVL.NPCs.spawnScene(def);
      MVL.Mobs.spawnScene(def, G.player);
      G.player.group.position.set(def.spawn[0], MVL.World.getHeight(def.spawn[0], def.spawn[1]), def.spawn[1]);
      if (opts.restorePos && opts.restorePos.length === 3) {
        var p = opts.restorePos;
        G.player.group.position.set(p[0], Math.max(MVL.World.getHeight(p[0], p[2]), p[1]), p[2]);
      }
      MVL.Cam.follow(G.player.group);
      MVL.HUD.buildSkillBar();
      var mz = document.getElementById('minimap-zone');
      if (mz) mz.textContent = def.name;
      if (MVL.Audio.ctx) MVL.Audio.playBgm(def.bgm);
      if (!G.save.discovered) G.save.discovered = [];
      if (G.save.discovered.indexOf(sceneId) < 0) {
        G.save.discovered.push(sceneId);
        MVL.Achievements.notify('scenes', { count: G.save.discovered.length });
        MVL.UI.toast('Khám phá vùng đất mới: ' + def.name, 'good', '🗺️');
      }
      Bus.emit('scene:entered', { id: sceneId, def: def });
      var hudEl = document.getElementById('hud');
      if (hudEl) hudEl.classList.remove('hidden');
      G.saveNow();
    });
  };

  G.travelTo = function (sceneId) {
    var def = D.scenes[sceneId];
    if (!def) return;
    var lv = MVL.Progression.state.level;
    var scene = D.scenes[G.sceneId];
    var req = 1;
    if (scene) {
      for (var i = 0; i < scene.portals.length; i++) {
        if (scene.portals[i].to === sceneId && scene.portals[i].reqLevel) req = scene.portals[i].reqLevel;
      }
    }
    if (lv < req) {
      MVL.UI.toast('Cần cấp ' + req + ' để vào ' + def.name, 'bad', '🔒');
      MVL.Audio.sfx('error');
      return;
    }
    G.enterScene(sceneId);
  };

  G._fade = function (mid) {
    var el = document.getElementById('fade-layer');
    if (!el) { mid(); return; }
    el.style.opacity = '1';
    setTimeout(function () {
      mid();
      setTimeout(function () { el.style.opacity = '0'; }, 120);
    }, 380);
  };

  /* ---------------- LƯU GAME ---------------- */
  G.collectSave = function () {
    var ps = MVL.Progression.getSaveState();
    if (G.player) {
      ps.hp = Math.max(1, Math.floor(G.player.hp));
      ps.mp = Math.floor(G.player.mp);
      ps.scene = G.sceneId;
      ps.pos = [G.player.group.position.x, G.player.group.position.y, G.player.group.position.z];
    }
    G.save.player = ps;
    G.save.inventory = MVL.Inventory.exportState().items;
    G.save.equipment = MVL.Inventory.exportState().equipment;
    G.save.quests = MVL.Quests.exportState();
    G.save.ach = MVL.Achievements.exportState();
    G.save.playtime = (G.save.playtime || 0) + G._playT;
    G._playT = 0;
    return G.save;
  };

  G.saveNow = function () {
    if (G.state !== 'play') return;
    MVL.Save.save(G.collectSave());
  };

  /* ---------------- CHẾT / HỒI SINH ---------------- */
  G.onDeath = function () {
    G.state = 'dead';
    MVL.Audio.sfx('death');
    MVL.Cam.shake(0.5, 0.4);
    document.getElementById('death-cost').textContent = U.fmt(D.config.reviveGoldCost);
    MVL.UI.showDeath();
  };

  G.revive = function (mode) {
    if (G.state !== 'dead') return;
    if (mode === 'here') {
      if (MVL.Inventory.hasReviveItem()) {
        MVL.Inventory.consumeReviveItem();
        MVL.UI.toast('Dùng Hồi Sinh Đan — sống lại!', 'good', '💠');
      } else if (!MVL.Progression.spendGold(D.config.reviveGoldCost)) {
        MVL.UI.toast('Không đủ ' + U.fmt(D.config.reviveGoldCost) + ' vàng! Hãy hồi sinh ở trấn.', 'bad');
        return;
      }
      G.player.revive(null, 0.5);
    } else {
      G.player.revive(null, 1.0);
      G.player.hp = G.player.maxHp;
      G.player.mp = G.player.maxMp;
      G.enterScene('mong_hanh_son');
    }
    G.state = 'play';
    MVL.UI.hideDeath();
    MVL.Audio.sfx('revive');
  };

  /* ---------------- TƯƠNG TÁC ---------------- */
  G.doInteract = function () {
    var t = G._interactTarget;
    if (!t) return;
    if (t.type === 'npc') {
      Bus.emit('npc:interact', { npc: t.ref });
    } else if (t.type === 'portal') {
      MVL.Audio.sfx('portal');
      G.travelTo(t.ref.to);
    }
  };

  /* ---------------- CHỌN MỤC TIÊU ---------------- */
  G.pickTargetAt = function (x, y) {
    var ray = MVL.Engine.getWorld(x, y);
    var best = null, bestD = 1.8;
    var all = MVL.Mobs.all;
    for (var i = 0; i < all.length; i++) {
      var m = all[i];
      if (!m.alive) continue;
      var d = ray.distanceToPoint(m.group.position);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (best) {
      MVL.Combat.setCurrentTarget(best);
      MVL.Audio.sfx('ui');
    }
  };

  /* ---------------- VÒNG LẶP CHÍNH ---------------- */
  G.update = function (dt) {
    if (G.state !== 'play' || !G.player) return;
    G._playT += dt;
    G._autosaveT += dt;
    if (G._autosaveT >= D.config.autosaveSec && G.save.settings.autosave !== false) {
      G._autosaveT = 0;
      G.saveNow();
    }

    /* hành động từ bàn phím/cảm ứng */
    if (MVL.Input.consumeAction('interact')) G.doInteract();
    if (MVL.Input.consumeAction('mount')) G.player.mountUp();
    if (MVL.Input.consumeAction('potion')) {
      if (!MVL.Inventory.useBestPotion()) MVL.UI.toast('Hết đan dược! Ghé Tiểu Nhi mua thêm.', 'bad', '🧪');
    }
    if (MVL.Input.consumeAction('target')) MVL.Combat.cycleTarget();
    if (MVL.Input.consumeAction('dash')) {
      if (G.player.mp >= 12) {
        G.player.mp -= 12;
        MVL.Audio.sfx('dash');
        G.player.execDash(6.5);
      } else MVL.UI.toast('Không đủ nội lực cho Thân Pháp!', 'bad');
    }
    for (var i = 0; i < 4; i++) {
      if (MVL.Input.consumeAction('skill' + i)) G.player.castSkill(i);
    }
    /* đánh thường: chạm nhanh hoặc giữ chuột */
    if (MVL.Input.consumeAction('attack')) G.player.basicAttack();
    else if (MVL.Input.isMouse0()) {
      G._atkHold = (G._atkHold || 0) + dt;
      if (G._atkHold >= 0.46) { G._atkHold = 0; G.player.basicAttack(); }
    } else G._atkHold = 0.2;

    /* cập nhật hệ thống */
    G.player.update(dt);
    MVL.Mobs.update(dt);
    MVL.NPCs.update(dt);
    MVL.Loot.update(dt);
    MVL.Combat.update(dt);
    MVL.World.update(dt);
    MVL.FX.update(dt);
    MVL.HUD.update(dt);
    MVL.Cam.update(dt);
    MVL.Assets.update(dt);

    /* thống kê kills cho Progression/Achievements */
    G._deathFlush = G._deathFlush || 0;
  };

  G.bindEvents = function () {
    /* fallback cho UI phát Bus (Screens phát khi không gọi được Game trực tiếp) */
    Bus.on('ui:newGame', function (d) { G.newGame(d.name, d.classId, d.heroModel); });
    Bus.on('ui:continue', function () { G.continueGame(); });
    Bus.on('ui:revive', function (d) { G.revive(d && d.mode || 'town'); });
    Bus.on('ui:travel', function (d) { G.travelTo(d && d.id); });
    Bus.on('ui:save', function () { G.saveNow(); MVL.UI.toast('Đã lưu game!', 'good', '💾'); });
    Bus.on('npc:interact', function (d) {
      if (d && d.npc && MVL.UI.dialogForNPC) MVL.UI.dialogForNPC(d.npc);
    });

    Bus.on('player:death', function () { G.onDeath(); });
    Bus.on('monster:death', function (d) {
      MVL.Progression.state.kills = (MVL.Progression.state.kills || 0) + 1;
      if (d && d.def) {
        var xpGain = Math.round(d.def.xp * (d.elite ? 1.6 : 1));
        MVL.Progression.addXp(xpGain);
      }
    });
    Bus.on('boss:death', function (d) {
      MVL.Progression.state.bossesKilled = (MVL.Progression.state.bossesKilled || 0) + 1;
      MVL.UI.toast('Hạ gục ' + (d && d.name ? d.name : 'Ma Đầu') + '!', 'good', '👑');
    });
    Bus.on('interact:target', function (d) {
      G._interactTarget = d && d.type !== 'none' ? d : null;
    });
    Bus.on('player:levelup', function (d) {
      MVL.UI.toast('Đột phá! Đạt cấp ' + d.level + ' — ' + MVL.Progression.realm(), 'good', '🌟');
    });
    Bus.on('mount:unlock', function () {
      MVL.Progression.state.mountOwned = true;
      MVL.UI.toast('Đã thu phục Hắc Tuấn Mã! Nhấn Z để cưỡi.', 'good', '🐴');
    });
    Bus.on('item:upgraded', function (d) {
      MVL.Progression.state.upgrades = (MVL.Progression.state.upgrades || 0) + 1;
    });
    Bus.on('achieve:unlock', function (d) {
      MVL.UI.toast('Thành tựu: ' + d.def.name, 'ach', d.def.icon);
    });

    /* phím UI */
    window.addEventListener('keydown', function (e) {
      if (G.state !== 'play') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var map = { KeyI: 'inventory', KeyC: 'character', KeyK: 'skills', KeyJ: 'quests', KeyM: 'map', KeyH: 'help', Escape: 'esc' };
      var p = map[e.code];
      if (!p) return;
      if (p === 'esc') {
        var anyOpen = document.querySelector('.panel:not(.hidden), #screen-map:not(.hidden), #dialog-box:not(.hidden)');
        if (anyOpen) MVL.UI.closeAll();
        else MVL.UI.togglePanel('settings');
        return;
      }
      MVL.UI.togglePanel(p);
    });

    /* chat */
    var ci = document.getElementById('chat-input');
    var cs = document.getElementById('chat-send');
    if (ci && cs) {
      var send = function () {
        var v = ci.value.trim();
        if (v) { MVL.Chat.sendUser(v); ci.value = ''; }
      };
      cs.addEventListener('click', send);
      ci.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { send(); ci.blur(); }
      });
    }

    /* chọn mục tiêu bằng tap/click */
    MVL.Input.onTap(function (x, y) { G.pickTargetAt(x, y); });

    /* mất trang → lưu */
    window.addEventListener('beforeunload', function () { G.saveNow(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) G.saveNow();
    });
  };

  /* ---------------- TỰ KIỂM THỬ ---------------- */
  G.autotest = function () {
    var steps = [];
    function step(name, fn) {
      try { fn(); steps.push(name + ':ok'); }
      catch (e) { steps.push(name + ':FAIL ' + (e && e.message)); }
    }
    var results = { ok: false, steps: steps };
    window.__TEST_RESULT = results;

    setTimeout(function () {
      step('newGame', function () {
        G.newGame('AutoThử', 'vodang', 'tamphong');
        G.state = 'play';
        if (!G.player || !G.player.group) throw new Error('no player');
      });
      setTimeout(function () {
        step('worldBuilt', function () {
          if (!MVL.World.ready) throw new Error('world not ready');
        });
        step('mobsSpawned', function () {
          if (MVL.Mobs.all.length < 3) throw new Error('mobs=' + MVL.Mobs.all.length);
        });
        step('questAccepted', function () {
          if (!MVL.Quests.isActive('q1')) throw new Error('q1 not active');
        });
        /* dịch tới gần quái rồi đánh */
        var mob = null;
        for (var i = 0; i < MVL.Mobs.all.length; i++) {
          if (MVL.Mobs.all[i].alive && MVL.Mobs.all[i].group.position.distanceTo(G.player.group.position) < 60) { mob = MVL.Mobs.all[i]; break; }
        }
        step('teleportToMob', function () {
          if (!mob) throw new Error('no mob');
          G.player.group.position.set(mob.group.position.x + 2, mob.group.position.y, mob.group.position.z);
        });
        var n = 0;
        var iv = setInterval(function () {
          try {
            G.player.basicAttack();
            if (n === 3) G.player.castSkill(0);
            if (n === 6) G.player.castSkill(1);
            if (n === 9) G.player.castSkill(3);
            n++;
            if (n > 12) {
              clearInterval(iv);
              step('combatRan', function () {});
              step('save', function () { G.saveNow(); });
              results.ok = true;
              results.mobsAlive = MVL.Mobs.aliveCount();
              results.playerHp = G.player.hp;
              results.errs = (window.__ERRS || []).length;
            }
          } catch (e) {
            clearInterval(iv);
            steps.push('combat:FAIL ' + (e && e.message));
          }
        }, 400);
      }, 2500);
    }, 1800);
  };

  /* ---------------- KHỞI ĐỘNG ---------------- */
  window.addEventListener('DOMContentLoaded', function () {
    G.boot();
    G.bindEvents();
    var params = new URLSearchParams(window.location.search);
    if (params.get('autotest') === '1') G.autotest();
  });

})(window.MVL);
