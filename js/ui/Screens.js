/* =========================================================
 * Mộng Võ Lâm 3D — js/ui/Screens.js
 * MVL.UI: màn hình (login/create/loading/death/map), panel (túi/nhân vật/kỹ năng/
 * nhiệm vụ/chợ/cài đặt/hướng dẫn), hộp thoại NPC, ctx-menu vật phẩm, toast.
 * Theo CONTRACT.md mục 6k + 7 + 8. KHÔNG ES module.
 * Interop: UI gọi MVL.Game.* nếu có (travelTo/saveNow/startNew|newGame/
 * continueGame|loadGame/reviveTown/reviveHere|revive); nếu không có thì phát
 * Bus: 'ui:newGame'{name,classId,heroModel} | 'ui:continue' | 'ui:revive'{mode} |
 * 'ui:save' | 'ui:travel'{id}.
 * ========================================================= */
window.MVL = window.MVL || {};
(function (MVL) {
  'use strict';

  var D = MVL.Data;
  var U = MVL.Utils;

  /* ===================== HẰNG HIỂN THỊ ===================== */
  var EQUIP_SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
  var EQUIP_NAMES = { weapon: 'Vũ Khí', helmet: 'Đầu Khôi', armor: 'Bảo Giáp', gloves: 'Hộ Uyển', boots: 'Giày Lư', ring: 'Giới Chỉ', amulet: 'Ngọc Phù' };
  var EQUIP_ICON = { weapon: '⚔️', helmet: '🪖', armor: '🥼', gloves: '🧤', boots: '👟', ring: '💠', amulet: '🧿' };
  var TYPE_NAMES = { potion: 'Đan Dược', food: 'Lương Thực', material: 'Nguyên Liệu', weapon: 'Vũ Khí', helmet: 'Đầu Khôi', armor: 'Bảo Giáp', gloves: 'Hộ Uyển', boots: 'Giày Lư', ring: 'Giới Chỉ', amulet: 'Ngọc Phù', mount: 'Tọa Kỵ', revive: 'Cứu Mệnh', box: 'Bảo Hạp' };
  var USEABLE_TYPES = ['potion', 'food', 'revive', 'mount', 'box'];
  var STAT_NAMES = { atk: 'Công Kích', def: 'Phòng Ngự', hp: 'Sinh Lực', mp: 'Nội Lực', crit: 'Bạo Kích', spd: 'Thân Pháp' };
  var ALLOC_META = { luc: { name: 'Lực', eff: '+2.5 Công Kích' }, the: { name: 'Thể', eff: '+35 Sinh Lực tối đa' }, nhanh: { name: 'Nhanh', eff: '+0.06 Thân Pháp, +0.4% Bạo Kích' }, noi: { name: 'Nội', eff: '+25 Nội Lực tối đa' }, hoi: { name: 'Hội', eff: '+0.8% Bạo Kích' } };
  var QUEST_ICON = { kill: '⚔️', collect: '📦', talk: '💬', reach: '🧭', boss: '👹' };
  var SKILL_TYPE = { melee: 'Cận chiến', ranged: 'Viễn trình', aoe: 'Vùng ảnh hưởng', buff: 'Phụ trợ', heal: 'Trị liệu', dash: 'Thân pháp' };
  var HERO_NAMES = { tamphong: 'Tam Phong', lenhhosung: 'Lệnh Hồ Sung' };
  var TOAST_ICON = { info: '📜', good: '✅', bad: '⚠️', quest: '📖', ach: '🏆' };
  /* Vị trí 5 địa giới trên worldmap (cố định, theo hướng cổng của Mộng Hoành Sơn: đông/tây) */
  var NODE_POS = { mong_hanh_son: [450, 330], van_truc_lam: [680, 300], hac_phong_coc: [220, 300], tuyet_linh: [840, 150], ma_canh: [430, 120] };
  var PANELS = ['panel-inventory', 'panel-character', 'panel-skills', 'panel-quests', 'panel-shop', 'panel-settings', 'panel-help'];
  var SCREENS = ['screen-login', 'screen-create', 'screen-loading', 'screen-death', 'screen-map'];

  /* Style nền cho DOM động (CSS ngoài có thể ghi đè bằng class) */
  var S_ROW = 'display:flex;align-items:center;gap:10px;';
  var S_CELL = 'position:relative;display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:8px;background:rgba(16,22,32,.85);border:1px solid #2c3547;cursor:pointer;font-size:26px;user-select:none;';
  var S_CARD = 'position:relative;border:1px solid rgba(201,162,39,.35);border-radius:12px;background:rgba(12,16,24,.92);padding:12px 14px;cursor:pointer;transition:border-color .15s, box-shadow .15s;';
  var S_QITEM = 'border:1px solid rgba(201,162,39,.28);border-radius:10px;background:rgba(14,19,28,.85);padding:10px 12px;margin-bottom:10px;';
  var S_SKILL = 'display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(201,162,39,.3);border-radius:12px;background:rgba(14,19,28,.9);padding:12px;margin-bottom:10px;';
  var S_SHOPROW = S_ROW + 'border:1px solid rgba(201,162,39,.25);border-radius:10px;background:rgba(14,19,28,.9);padding:9px 12px;margin-bottom:8px;cursor:pointer;';
  var S_BTN = 'display:block;width:100%;margin:6px 0;padding:9px 12px;cursor:pointer;';

  /* ===================== TRẠNG THÁI UI ===================== */
  var _openPanel = null, _selClass = null, _selHero = 0, _cardsBuilt = false;
  var _shopNPC = null, _shopTab = 'buy', _ctxUid = null, _autosave = true, _inited = false;

  /* ===================== TIỆN ÍCH NỘI ===================== */
  function $(id) { return document.getElementById(id); }
  function sfx(name) { try { if (MVL.Audio && MVL.Audio.sfx) MVL.Audio.sfx(name); } catch (e) { /* im lặng */ } }
  function elIn(parent, tag, cls, css, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function hide(el) { if (el) el.classList.add('hidden'); }
  function show(el) { if (el) el.classList.remove('hidden'); }
  function hideScreens() { for (var i = 0; i < SCREENS.length; i++) hide($(SCREENS[i])); }
  function showScreen(id) { hideScreens(); show($(id)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function fmtNum(n) { try { return U.fmt(n); } catch (e) { return String(n); } }
  function rarityOf(item) { var def = D.items[item.id] || {}; return item.rarity != null ? item.rarity : (def.rarity || 0); }
  function rarityColor(r) { var a = D.config.rarities || []; return a[r] ? a[r].color : '#c9c9c9'; }
  function rarityName(r) { var a = D.config.rarities || []; return a[r] ? a[r].name : 'Phổ Thông'; }
  function itemName(it) { var def = D.items[it.id] || {}; return (def.name || it.id) + (it.plus ? ' +' + it.plus : ''); }
  function questById(id) { var q = D.quests || []; for (var i = 0; i < q.length; i++) if (q[i].id === id) return q[i]; return null; }
  function npcName(id) { return (D.npcs[id] && D.npcs[id].name) || id; }
  function randomName() {
    var P = D.config.nameParts || ['Vô', 'Danh'];
    var n = 2 + Math.floor(Math.random() * 2); /* 2-3 âm tiết */
    var s = '';
    for (var i = 0; i < n; i++) s += P[Math.floor(Math.random() * P.length)];
    return s;
  }
  /* Gọi MVL.Game.<tên đầu tiên tồn tại>; trả false nếu không gọi được */
  function callGame(names, args) {
    var G = MVL.Game;
    if (!G) return false;
    for (var i = 0; i < names.length; i++) {
      if (typeof G[names[i]] === 'function') { try { G[names[i]].apply(G, args || []); return true; } catch (e) { return false; } }
    }
    return false;
  }
  function busEmit(evt, data) { try { if (MVL.Bus && MVL.Bus.emit) MVL.Bus.emit(evt, data); } catch (e) { /* im lặng */ } }
  function currentSceneId() { try { if (MVL.World && MVL.World.currentId) return MVL.World.currentId; } catch (e) { /* bỏ qua */ } return 'mong_hanh_son'; }
  function discoveredSet() {
    var disc = {};
    try {
      var sv = (MVL.Save && MVL.Save.load) ? MVL.Save.load() : null;
      if (sv && sv.discovered) for (var i = 0; i < sv.discovered.length; i++) disc[sv.discovered[i]] = true;
      var G = MVL.Game;
      if (G && G.state && G.state.discovered) for (var j = 0; j < G.state.discovered.length; j++) disc[G.state.discovered[j]] = true;
    } catch (e) { /* bỏ qua */ }
    disc[currentSceneId()] = true;
    return disc;
  }
  function setLoadBar(frac) {
    var f = $('load-bar-fill');
    if (f) f.style.width = (Math.max(0, Math.min(1, frac || 0)) * 100).toFixed(1) + '%';
  }

  /* ===================== MÀN HÌNH CHÍNH ===================== */
  var UI = {};

  UI.showLogin = function () { showScreen('screen-login'); };

  UI.showCreate = function () {
    showScreen('screen-create');
    if (!_cardsBuilt) UI.createCards();
    else refreshCardSelection();
  };

  UI.showLoading = function (frac, label) {
    showScreen('screen-loading');
    if (label && $('load-label')) $('load-label').textContent = label;
    setLoadBar(frac);
    var tip = $('load-tip');
    if (tip && D.tips && D.tips.length) tip.textContent = 'Mẹo võ lâm: ' + U.pick(D.tips);
  };

  UI.hideLoading = function () { hide($('screen-loading')); };

  UI.showDeath = function () {
    showScreen('screen-death');
    UI.closeAll();
    var cost = $('death-cost');
    if (cost) cost.textContent = fmtNum(D.config.reviveGoldCost);
  };

  UI.hideDeath = function () { hide($('screen-death')); };

  /* Cập nhật thanh tải + badge % tải model nền trên màn login */
  UI.loadProgress = function (frac, label) {
    if (label && $('load-label')) $('load-label').textContent = label;
    setLoadBar(frac);
    var badge = $('login-load-badge');
    if (badge) {
      var p = Math.round(Math.max(0, Math.min(1, frac || 0)) * 100);
      badge.textContent = p >= 100 ? '✅ Mô hình võ lâm đã sẵn sàng' : '⏳ Đang tải mô hình nền… ' + p + '%';
    }
  };

  /* ===================== TẠO NHÂN VẬT ===================== */
  function refreshCardSelection() {
    var wrap = $('class-cards');
    if (wrap) {
      for (var i = 0; i < wrap.children.length; i++) {
        var cid = wrap.children[i].getAttribute('data-class');
        var cls = D.classes[cid];
        var on = cid === _selClass;
        wrap.children[i].style.borderColor = on ? (cls ? cls.color : '#c9a227') : 'rgba(201,162,39,.3)';
        wrap.children[i].style.boxShadow = on ? ('0 0 14px ' + (cls ? cls.color : '#c9a227') + '55') : 'none';
      }
    }
    var hw = $('hero-cards');
    if (hw) {
      for (var k = 0; k < hw.children.length; k++) {
        var on2 = k === _selHero;
        hw.children[k].style.borderColor = on2 ? '#c9a227' : 'rgba(201,162,39,.3)';
        hw.children[k].style.boxShadow = on2 ? '0 0 14px rgba(201,162,39,.35)' : 'none';
      }
    }
  }

  UI.createCards = function () {
    var wrap = $('class-cards'), hw = $('hero-cards');
    if (!wrap || !hw) return;
    wrap.innerHTML = '';
    hw.innerHTML = '';
    /* 4 thẻ môn phái */
    var keys = Object.keys(D.classes);
    for (var i = 0; i < keys.length; i++) {
      (function (cid) {
        var c = D.classes[cid], st = c.base || {};
        var card = elIn(wrap, 'div', 'class-card', S_CARD + 'min-width:200px;flex:1;',
          '<div style="font-size:34px;">' + c.icon + '</div>' +
          '<div style="font-family:\'Noto Serif SC\',Georgia,serif;font-size:19px;color:' + c.color + ';margin:4px 0;">' + c.name + '</div>' +
          '<div style="font-size:12px;color:#aeb8c9;line-height:1.5;min-height:52px;">' + c.desc + '</div>' +
          '<div style="font-size:11.5px;color:#cfd6dd;border-top:1px dashed rgba(201,162,39,.3);padding-top:6px;margin-top:6px;">❤️ ' + st.hp + ' · 💧 ' + st.mp + ' · ⚔️ ' + st.atk + ' · 🛡️ ' + st.def + ' · 🎯 ' + st.crit + '% · 👟 ' + st.spd + '</div>');
        card.setAttribute('data-class', cid);
        card.addEventListener('click', function () { _selClass = cid; refreshCardSelection(); sfx('ui'); });
      })(keys[i]);
    }
    _selClass = _selClass || keys[0];
    /* 2 thẻ thân pháp (model GLB của người chơi) */
    var heroes = ['tamphong', 'lenhhosung'];
    for (var h = 0; h < heroes.length; h++) {
      (function (idx, hkey) {
        var card2 = elIn(hw, 'div', 'hero-card', S_CARD + 'min-width:180px;flex:1;text-align:center;',
          '<div style="font-size:30px;">' + (hkey === 'tamphong' ? '🧙' : '🍶') + '</div>' +
          '<div style="font-family:\'Noto Serif SC\',Georgia,serif;font-size:17px;color:#e9c766;margin:4px 0;">' + (HERO_NAMES[hkey] || hkey) + '</div>' +
          '<div style="font-size:11.5px;color:#8fa0b8;">Thân pháp hiển thị · model: ' + hkey + '.glb</div>');
        card2.addEventListener('click', function () { _selHero = idx; refreshCardSelection(); sfx('ui'); });
      })(h, heroes[h]);
    }
    /* Tên ngẫu nhiên + nút đổi tên */
    var inp = $('input-name');
    if (inp && !inp.value) inp.value = randomName();
    var btns = document.querySelector('.create-btns');
    if (btns && !$('btn-reroll-name')) {
      var dice = elIn(btns, 'button', 'btn-ghost', 'margin-right:auto;', '🎲 Tên khác');
      dice.id = 'btn-reroll-name';
      dice.addEventListener('click', function () { if (inp) inp.value = randomName(); sfx('ui'); });
    }
    refreshCardSelection();
    _cardsBuilt = true;
  };

  /* ===================== TOAST ===================== */
  UI.toast = function (text, kind, icon) {
    var area = $('toast-area');
    if (!area) return;
    kind = kind || 'info';
    var t = elIn(area, 'div', 'toast t-' + kind,
      'display:flex;align-items:flex-start;gap:8px;max-width:360px;padding:10px 14px;margin-top:8px;border:1px solid #c9a227;border-radius:10px;background:rgba(12,16,24,.94);color:#e8dfc0;font-size:13.5px;line-height:1.45;box-shadow:0 4px 18px rgba(0,0,0,.55);',
      '<span style="font-size:16px;">' + (icon || TOAST_ICON[kind] || '📜') + '</span><span>' + text + '</span>');
    while (area.children.length > 5) area.removeChild(area.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3500);
  };

  /* ===================== PANEL: MỞ / ĐÓNG ===================== */
  function closeCtx() { hide($('ctx-menu')); }
  function openOnly(panelId) {
    for (var i = 0; i < PANELS.length; i++) hide($(PANELS[i]));
    hide($('screen-map'));
    show($(panelId));
    _openPanel = panelId.replace('panel-', '');
  }

  UI.closeAll = function () {
    for (var i = 0; i < PANELS.length; i++) hide($(PANELS[i]));
    hide($('screen-map'));
    _openPanel = null;
    closeCtx();
  };

  UI.togglePanel = function (name) {
    closeCtx();
    if (name === 'map') {
      var m = $('screen-map');
      if (m && !m.classList.contains('hidden')) { UI.closeAll(); sfx('close'); return; }
      for (var i = 0; i < PANELS.length; i++) hide($(PANELS[i]));
      _openPanel = null;
      show(m);
      UI.renderWorldMap();
      sfx('open');
      return;
    }
    if (_openPanel === name) { UI.closeAll(); sfx('close'); return; }
    if (name === 'shop') {
      if (_shopNPC) { openOnly('panel-shop'); renderShopLists(); sfx('open'); }
      else UI.toast('Chưa có thương nhân nào để giao dịch.', 'info', '🏪');
      return;
    }
    var renderMap = { inventory: 'renderInventory', character: 'renderCharacter', skills: 'renderSkills', quests: 'renderQuests', settings: 'renderSettings', help: 'renderHelp' };
    if (!renderMap[name]) return;
    openOnly('panel-' + name);
    UI[renderMap[name]]();
    sfx('open');
  };

  /* ===================== TÚI ĐỒ ===================== */
  function statRowHtml(label, val) {
    return '<div style="' + S_ROW + 'justify-content:space-between;padding:3px 0;border-bottom:1px dashed rgba(201,162,39,.15);"><span style="color:#aeb8c9;">' + label + '</span><b style="color:#e9c766;">' + val + '</b></div>';
  }
  function equipBonusParts(I) {
    if (!I || typeof I.statBonus !== 'function') return [];
    var b = I.statBonus() || {}, parts = [];
    if (b.atk) parts.push('Công +' + r1(b.atk));
    if (b.def) parts.push('Phòng +' + r1(b.def));
    if (b.hp) parts.push('HP +' + fmtNum(b.hp));
    if (b.mp) parts.push('NL +' + fmtNum(b.mp));
    if (b.crit) parts.push('Bạo +' + r1(b.crit) + '%');
    if (b.spd) parts.push('Tốc +' + r1(b.spd));
    return parts;
  }

  UI.renderInventory = function () {
    var I = MVL.Inventory, P = MVL.Progression, html, i;
    /* 7 ô trang bị — nhấp để gỡ */
    var es = $('equip-slots');
    if (es) {
      html = '';
      for (i = 0; i < EQUIP_SLOTS.length; i++) {
        var slot = EQUIP_SLOTS[i];
        var it = (I && I.equipment) ? I.equipment[slot] : null;
        if (it) {
          var def = D.items[it.id] || {}, r = rarityOf(it);
          html += '<div class="equip-slot filled r' + r + '" data-slot="' + slot + '" title="Nhấp để gỡ ' + itemName(it) + '" style="' + S_CELL + 'border-color:' + rarityColor(r) + ';flex-direction:column;font-size:22px;"><span>' + (def.icon || EQUIP_ICON[slot]) + '</span><span style="font-size:9.5px;color:' + rarityColor(r) + ';white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;">' + EQUIP_NAMES[slot] + (it.plus ? ' +' + it.plus : '') + '</span></div>';
        } else {
          html += '<div class="equip-slot empty" data-slot="' + slot + '" style="' + S_CELL + 'flex-direction:column;opacity:.55;cursor:pointer;"><span style="font-size:20px;">' + EQUIP_ICON[slot] + '</span><span style="font-size:9.5px;color:#8fa0b8;">' + EQUIP_NAMES[slot] + '</span></div>';
        }
      }
      es.innerHTML = html;
    }
    /* Lưới túi — nhấp mở ctx-menu */
    var grid = $('inv-grid');
    if (grid) {
      var items = (I && I.items) ? I.items : [];
      html = '';
      for (i = 0; i < items.length; i++) {
        var itm = items[i], d2 = D.items[itm.id] || {}, rr = rarityOf(itm);
        html += '<div class="inv-cell r' + rr + '" data-uid="' + itm.uid + '" title="' + itemName(itm) + '" style="' + S_CELL + 'border-color:' + rarityColor(rr) + ';margin:4px;"><span>' + (d2.icon || '📦') + '</span>' + (itm.qty > 1 ? '<span style="position:absolute;right:2px;bottom:1px;font-size:10px;color:#ffd76a;">×' + itm.qty + '</span>' : '') + (itm.plus ? '<span style="position:absolute;left:2px;top:1px;font-size:10px;color:#7ce07c;">+' + itm.plus + '</span>' : '') + '</div>';
      }
      var empties = Math.max(0, (D.config.bagSize || 48) - items.length);
      for (var e2 = 0; e2 < empties; e2++) html += '<div class="inv-cell empty" style="' + S_CELL + 'opacity:.28;cursor:default;margin:4px;"></div>';
      grid.innerHTML = html || '<div style="color:#8fa0b8;padding:10px;">Túi trống không một xu…</div>';
    }
    /* Tổng chỉ số */
    var st = $('inv-stats');
    if (st) {
      if (P && typeof P.computeStats === 'function') {
        var s = P.computeStats();
        html = '<div style="font-size:12.5px;color:#c9a227;margin-bottom:4px;">⚔️ Tổng chỉ số hiện tại</div>' +
          statRowHtml('Sinh Lực', fmtNum(s.hpMax || 0)) + statRowHtml('Nội Lực', fmtNum(s.mpMax || 0)) +
          statRowHtml('Công Kích', r1(s.atk || 0)) + statRowHtml('Phòng Ngự', r1(s.def || 0)) +
          statRowHtml('Bạo Kích', r1(s.crit || 0) + '%') + statRowHtml('Thân Pháp', r1(s.spd || 0));
        var parts = equipBonusParts(I);
        if (parts.length) html += '<div style="font-size:11.5px;color:#8fa0b8;margin-top:6px;">Tổng từ trang bị: ' + parts.join(' · ') + '</div>';
        st.innerHTML = html;
      } else st.innerHTML = '<div style="color:#8fa0b8;">—</div>';
    }
    /* Vàng / bạc */
    var gd = $('inv-gold');
    if (gd) {
      var ps = (P && P.state) ? P.state : null;
      gd.innerHTML = ps ? '<span style="color:#ffd76a;">🪙 ' + fmtNum(ps.gold) + '</span><span style="color:#c9c9c9;margin-left:16px;">🥈 ' + fmtNum(ps.silver) + '</span>' : '';
    }
  };

  /* ===================== CTX MENU VẬT PHẨM ===================== */
  function upgradeCosts(plus) {
    return { gold: Math.round(200 * Math.pow(plus + 1, 1.35)), stones: plus + 1, chance: Math.round(Math.max(0.2, 0.95 - 0.12 * plus) * 100) };
  }

  UI.ctxMenu = function (x, y, item) {
    var menu = $('ctx-menu');
    if (!menu || !item) return;
    var def = D.items[item.id] || {};
    var isEquip = EQUIP_SLOTS.indexOf(def.type) >= 0;
    var acts = [];
    if (isEquip) acts.push({ k: 'equip', l: '⚔️ Trang bị' });
    if (USEABLE_TYPES.indexOf(def.type) >= 0) acts.push({ k: 'use', l: '🫖 Dùng' });
    if ((def.price || 0) > 0) acts.push({ k: 'sell', l: '🥈 Bán — được ' + fmtNum(Math.floor(def.price * 0.4)) + ' bạc' });
    if (isEquip) {
      var c = upgradeCosts(item.plus || 0);
      acts.push({ k: 'up', l: '🔨 Cường hóa +' + (item.plus || 0) + ' → +' + ((item.plus || 0) + 1) + ' (🪙' + c.gold + ' · 💎' + c.stones + ' · ' + c.chance + '%)' });
    }
    acts.push({ k: 'info', l: '👁️ Thông tin' });
    menu.innerHTML = '';
    for (var i = 0; i < acts.length; i++) {
      (function (act) {
        var b = elIn(menu, 'div', 'ctx-item', 'padding:8px 14px;cursor:pointer;font-size:13px;color:#e8dfc0;white-space:nowrap;', act.l);
        b.setAttribute('data-act', act.k);
        b.addEventListener('mouseenter', function () { b.style.background = 'rgba(201,162,39,.18)'; });
        b.addEventListener('mouseleave', function () { b.style.background = 'transparent'; });
      })(acts[i]);
    }
    menu.style.cssText = 'position:fixed;z-index:3600;display:flex;flex-direction:column;min-width:180px;padding:6px;border:1px solid #c9a227;border-radius:10px;background:rgba(10,14,21,.97);box-shadow:0 8px 26px rgba(0,0,0,.6);';
    show(menu);
    _ctxUid = item.uid;
    /* kẹp menu trong khung nhìn */
    var mw = menu.offsetWidth || 200, mh = menu.offsetHeight || 120;
    menu.style.left = Math.max(6, Math.min(x, window.innerWidth - mw - 6)) + 'px';
    menu.style.top = Math.max(6, Math.min(y, window.innerHeight - mh - 6)) + 'px';
  };

  function runCtxAction(act, item) {
    var I = MVL.Inventory;
    if (!I || !item) return;
    var name = itemName(item);
    if (act === 'equip') {
      var eq = I.equip(item.uid);
      if (eq === false) UI.toast('Không thể trang bị — binh khí không hợp môn phái!', 'bad', '⚠️');
      else { UI.toast('Đã trang bị ' + name, 'good', '⚔️'); sfx('upgrade'); }
    } else if (act === 'use') {
      if (I.use(item.uid) === false) UI.toast('Dùng lúc này chẳng có tác dụng gì…', 'info', '🫖');
    } else if (act === 'sell') {
      I.sell(item.uid);
      UI.toast('Bán ' + name + ' — thu ' + fmtNum(Math.floor(((D.items[item.id] || {}).price || 0) * 0.4)) + ' bạc.', 'info', '🥈');
      sfx('coin');
    } else if (act === 'up') {
      var c = upgradeCosts(item.plus || 0);
      var res = I.upgrade(item.uid);
      if (res === 'ok') UI.toast('🔨 ' + name + ' cường hóa thành công — +' + ((item.plus || 0) + 1) + '!', 'good', '🔨');
      else if (res === 'fail') { UI.toast('Cường hóa thất bại… Linh Thạch tan theo gió.', 'bad', '⚠️'); sfx('error'); }
      else { UI.toast('Thiếu nguyên liệu — cần 🪙' + c.gold + ' vàng và 💎' + c.stones + ' Linh Thạch.', 'bad', '💎'); sfx('error'); }
    } else if (act === 'info') {
      itemInfoDialog(item);
    }
  }

  function itemInfoDialog(item) {
    var def = D.items[item.id] || {};
    var r = rarityOf(item);
    var h = '<div style="color:' + rarityColor(r) + ';font-size:15px;margin-bottom:6px;">' + itemName(item) + ' — ' + rarityName(r) + '</div>' +
      '<div style="color:#8fa0b8;font-size:12px;margin-bottom:8px;">Loại: ' + (TYPE_NAMES[def.type] || def.type || '?') + (def.weaponClass ? ' · Môn phái: ' + npcName(def.weaponClass) : '') + '</div>';
    var stats = item.stats || def.stats;
    if (stats) {
      var keys = Object.keys(stats);
      for (var i = 0; i < keys.length; i++) h += '<div style="font-size:13px;color:#cfd6dd;">' + (STAT_NAMES[keys[i]] || keys[i]) + ': <b style="color:#e9c766;">+' + r1(stats[keys[i]]) + '</b></div>';
    }
    if (def.heal) {
      if (def.heal.hp) h += '<div style="font-size:13px;color:#7ce07c;">Hồi ' + def.heal.hp + ' sinh lực</div>';
      if (def.heal.mp) h += '<div style="font-size:13px;color:#8fc7ff;">Hồi ' + def.heal.mp + ' nội lực</div>';
    }
    if (def.buff) h += '<div style="font-size:13px;color:#c26bff;">Phụ trợ: +' + Math.round(def.buff.mult * 100) + '% ' + (STAT_NAMES[def.buff.stat] || def.buff.stat) + ' trong ' + def.buff.dur + 's</div>';
    if (item.affixes && item.affixes.length) {
      for (var a = 0; a < item.affixes.length; a++) {
        var af = item.affixes[a];
        h += '<div style="font-size:12.5px;color:#c26bff;">✦ ' + (af.name || af.id || 'Phụ thuộc') + ' (' + (STAT_NAMES[af.stat] || af.stat || '') + ' +' + r1(af.add || 0) + ')</div>';
      }
    }
    if ((def.price || 0) > 0) h += '<div style="font-size:12px;color:#c9c9c9;margin-top:6px;">Giá trị: 🥈 ' + fmtNum(def.price) + ' (bán được ' + fmtNum(Math.floor(def.price * 0.4)) + ')</div>';
    if (def.desc) h += '<div style="font-size:12.5px;color:#aeb8c9;margin-top:8px;font-style:italic;">' + def.desc + '</div>';
    UI.openDialog({ name: 'Bảo Vật', icon: def.icon || '📦', text: h, options: [{ label: 'Đóng', fn: null }] });
  }

  /* ===================== NHÂN VẬT ===================== */
  UI.renderCharacter = function () {
    var P = MVL.Progression, I = MVL.Inventory;
    var box = $('char-stats');
    if (!box) return;
    var ps = (P && P.state) ? P.state : null;
    if (!ps) { box.innerHTML = '<div style="color:#8fa0b8;">Chưa có nhân vật — hãy nhập giang hồ trước đã!</div>'; return; }
    var cls = D.classes[ps.classId] || {};
    var realm = (P && typeof P.realm === 'function') ? P.realm() : (D.config.realms[Math.min(Math.floor((ps.level || 1) / 3), D.config.realms.length - 1)] || 'Phàm Nhân');
    var xpNext = Math.floor(80 * Math.pow(ps.level || 1, 1.5));
    var xpPct = Math.min(100, Math.round((ps.xp || 0) / Math.max(1, xpNext) * 100));
    var h = '<div style="' + S_ROW + 'gap:12px;margin-bottom:10px;"><span style="font-size:38px;">' + (cls.icon || '🧝') + '</span><div>' +
      '<div style="font-family:\'Noto Serif SC\',Georgia,serif;font-size:20px;color:#e9c766;">' + (ps.name || 'Vô Danh') + ' <span style="font-size:13px;color:#8fa0b8;">Cấp ' + (ps.level || 1) + '</span></div>' +
      '<div style="font-size:13px;color:' + (cls.color || '#c9a227') + ';">' + (cls.name || '?') + ' · <span style="color:#c26bff;">' + realm + '</span></div></div></div>' +
      '<div style="font-size:12px;color:#aeb8c9;margin-bottom:2px;">Kinh nghiệm: ' + fmtNum(ps.xp || 0) + ' / ' + fmtNum(xpNext) + ' (' + xpPct + '%)</div>' +
      '<div style="height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:10px;"><div style="height:100%;width:' + xpPct + '%;background:linear-gradient(90deg,#c9a227,#ffd76a);"></div></div>' +
      '<div style="font-size:13px;margin-bottom:10px;"><span style="color:#ffd76a;">🪙 ' + fmtNum(ps.gold || 0) + '</span><span style="color:#c9c9c9;margin-left:14px;">🥈 ' + fmtNum(ps.silver || 0) + '</span></div>';
    var pts = ps.statPoints || 0;
    h += '<div style="font-size:13px;color:' + (pts > 0 ? '#7ce07c' : '#8fa0b8') + ';margin-bottom:6px;">Điểm chưa phân phối: <b>' + pts + '</b></div>';
    var keys = ['luc', 'the', 'nhanh', 'noi', 'hoi'];
    for (var i = 0; i < keys.length; i++) {
      var meta = ALLOC_META[keys[i]];
      var val = (ps.alloc && ps.alloc[keys[i]]) || 0;
      h += '<div style="' + S_ROW + 'justify-content:space-between;padding:6px 8px;border:1px solid rgba(201,162,39,.2);border-radius:8px;margin-bottom:6px;background:rgba(14,19,28,.8);">' +
        '<span style="min-width:52px;color:#e8dfc0;"><b>' + meta.name + '</b></span>' +
        '<span style="min-width:40px;text-align:right;color:#e9c766;">' + r1(val) + '</span>' +
        '<span style="flex:1;font-size:11.5px;color:#8fa0b8;">' + meta.eff + '</span>' +
        (pts > 0 ? '<button class="alloc-add" data-alloc="' + keys[i] + '" style="padding:2px 10px;cursor:pointer;background:rgba(201,162,39,.2);border:1px solid #c9a227;border-radius:6px;color:#ffd76a;font-weight:700;">+</button>' : '') +
        '</div>';
    }
    var parts = equipBonusParts(I);
    h += '<div style="font-size:12px;color:#8fa0b8;margin-top:8px;">Tổng cộng từ trang bị: ' + (parts.length ? parts.join(' · ') : 'chưa mang gì cả') + '</div>';
    if (P && typeof P.computeStats === 'function') {
      var s = P.computeStats();
      h += '<div style="margin-top:10px;border-top:1px dashed rgba(201,162,39,.3);padding-top:8px;font-size:12.5px;color:#cfd6dd;">❤️ ' + fmtNum(s.hpMax || 0) + ' · 💧 ' + fmtNum(s.mpMax || 0) + ' · ⚔️ ' + r1(s.atk || 0) + ' · 🛡️ ' + r1(s.def || 0) + ' · 🎯 ' + r1(s.crit || 0) + '% · 👟 ' + r1(s.spd || 0) + '</div>';
    }
    box.innerHTML = h;
  };

  /* ===================== KỸ NĂNG ===================== */
  UI.renderSkills = function () {
    var P = MVL.Progression;
    var box = $('skill-cards');
    if (!box) return;
    var ps = (P && P.state) ? P.state : null;
    if (!ps) { box.innerHTML = '<div style="color:#8fa0b8;">Chưa có nhân vật.</div>'; return; }
    var cls = D.classes[ps.classId] || {};
    var ids = (cls.skills || []).slice();
    if (ids.indexOf('than_hanh') < 0) ids.push('than_hanh');
    var pts = ps.skillPoints || 0;
    var h = '<div style="font-size:13px;color:' + (pts > 0 ? '#7ce07c' : '#8fa0b8') + ';margin-bottom:8px;">Điểm Tu Luyện: <b>' + pts + '</b></div>';
    for (var i = 0; i < ids.length; i++) {
      var def = D.skills[ids[i]] || { id: ids[i], name: ids[i], icon: '❓', desc: '' };
      var lv = (P && typeof P.getSkillLevel === 'function') ? (P.getSkillLevel(ids[i]) || 1) : 1;
      var maxed = lv >= 5;
      h += '<div class="skill-card" style="' + S_SKILL + '"><div style="font-size:30px;width:44px;text-align:center;">' + (def.icon || '✴️') + '</div><div style="flex:1;">' +
        '<div style="' + S_ROW + 'gap:8px;"><b style="color:#e9c766;font-size:15px;">' + def.name + '</b><span style="font-size:12px;color:' + (maxed ? '#ffd700' : '#c9a227') + ';border:1px solid rgba(201,162,39,.4);border-radius:8px;padding:1px 8px;">Lv ' + lv + '/5</span></div>' +
        '<div style="font-size:12px;color:#8fa0b8;margin:4px 0;">💡 ' + (def.mp || 0) + ' nội lực · ⏱ ' + r1(def.cd || 0) + 's · ' + (SKILL_TYPE[def.type] || def.type || '?') + '</div>' +
        '<div style="font-size:12.5px;color:#aeb8c9;line-height:1.5;">' + (def.desc || '') + '</div></div>' +
        '<div style="align-self:center;">' + (maxed ? '<span style="font-size:12px;color:#ffd700;">Viên mãn</span>'
          : (pts > 0 ? '<button class="skill-up" data-up="' + def.id + '" style="padding:7px 14px;cursor:pointer;background:rgba(201,162,39,.2);border:1px solid #c9a227;border-radius:8px;color:#ffd76a;">Tu luyện</button>'
            : '<span style="font-size:11.5px;color:#5b6679;">Cần điểm</span>')) + '</div></div>';
    }
    box.innerHTML = h;
  };

  /* ===================== NHIỆM VỤ ===================== */
  UI.renderQuests = function () {
    var Q = MVL.Quests;
    var act = $('quest-active'), done = $('quest-done');
    if (act) {
      var list = (Q && Q.active) ? Q.active : [];
      var h = '<h4 style="color:#c9a227;margin:0 0 8px;">⚔️ Đang thực hiện (' + list.length + ')</h4>';
      if (!list.length) h += '<div style="color:#8fa0b8;font-size:12.5px;">Chưa nhận nhiệm vụ nào — hãy tìm kiếm các tiền bối có lời muốn nói…</div>';
      for (var i = 0; i < list.length; i++) {
        var def = questById(list[i].id);
        if (!def) continue;
        var prog = list[i].prog || 0;
        var pct = Math.min(100, Math.round(prog / Math.max(1, def.count) * 100));
        h += '<div class="quest-item" style="' + S_QITEM + '"><div style="' + S_ROW + 'justify-content:space-between;"><b style="color:#e9c766;">' + (QUEST_ICON[def.type] || '📜') + ' ' + def.name + '</b><span style="font-size:12px;color:' + (pct >= 100 ? '#7ce07c' : '#8fa0b8') + ';">' + prog + '/' + def.count + '</span></div>' +
          '<div style="font-size:12.5px;color:#aeb8c9;margin:5px 0;">' + def.desc + '</div>' +
          '<div style="height:6px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#c9a227,#ffd76a);"></div></div>' +
          '<div style="font-size:11.5px;color:#7f8ba0;margin-top:5px;">Người giao: ' + npcName(def.giver) + '</div></div>';
      }
      act.innerHTML = h;
    }
    if (done) {
      var dl = (Q && Q.done) ? Q.done : [];
      var hd = '<h4 style="color:#7f8ba0;margin:14px 0 8px;">✅ Đã hoàn thành (' + dl.length + ')</h4>';
      if (!dl.length) hd += '<div style="color:#5b6679;font-size:12px;">Sổ nhiệm vụ còn trắng tinh…</div>';
      for (var k = 0; k < dl.length; k++) {
        var d2 = questById(dl[k]);
        hd += '<div class="quest-item done" style="opacity:.45;padding:6px 12px;border-left:2px solid #7ce07c;margin-bottom:6px;font-size:12.5px;color:#aeb8c9;">✅ ' + (d2 ? d2.name : dl[k]) + '</div>';
      }
      done.innerHTML = hd;
    }
  };

  /* ===================== CHỢ ===================== */
  function syncShopTabs() {
    var tb = $('tab-buy'), ts = $('tab-sell'), buy = $('shop-buy'), sell = $('shop-sell');
    if (tb) tb.classList.toggle('active', _shopTab === 'buy');
    if (ts) ts.classList.toggle('active', _shopTab === 'sell');
    if (buy) buy.classList.toggle('hidden', _shopTab !== 'buy');
    if (sell) sell.classList.toggle('hidden', _shopTab !== 'sell');
  }

  function renderShopLists() {
    var npc = _shopNPC;
    if (!npc) return;
    var P = MVL.Progression, I = MVL.Inventory;
    var ps = (P && P.state) ? P.state : { silver: 0, gold: 0, classId: 'thieulam' };
    var buy = $('shop-buy');
    if (buy) {
      var ids = (D.shopStock[npc.id] || []).slice();
      if (npc.role === 'shop' && D.shopStock.weaponsByClass) {
        var w = D.shopStock.weaponsByClass[ps.classId] || [];
        for (var i = 0; i < w.length; i++) if (ids.indexOf(w[i]) < 0) ids.push(w[i]);
      }
      var hb = '';
      for (var k = 0; k < ids.length; k++) {
        var def = D.items[ids[k]];
        if (!def) continue;
        hb += '<div class="shop-row" data-id="' + def.id + '" title="' + (def.desc || '') + '" style="' + S_SHOPROW + '"><span style="font-size:22px;">' + (def.icon || '📦') + '</span><span style="flex:1;"><b style="color:' + rarityColor(def.rarity || 0) + ';font-size:13.5px;">' + def.name + '</b><span style="display:block;font-size:11.5px;color:#8fa0b8;">' + (TYPE_NAMES[def.type] || '') + ' · ' + (def.desc || '') + '</span></span><span style="color:#c9c9c9;font-size:13px;white-space:nowrap;">🥈 ' + fmtNum(def.price || 0) + '</span></div>';
      }
      buy.innerHTML = hb || '<div style="color:#8fa0b8;padding:8px;">Cửa hàng tạm thời hết hàng…</div>';
    }
    var sell = $('shop-sell');
    if (sell) {
      var items = (I && I.items) ? I.items : [];
      var hs = '';
      for (var m = 0; m < items.length; m++) {
        var it = items[m], d2 = D.items[it.id] || {};
        if ((d2.price || 0) <= 0) continue; /* vô giá trị → không bán được */
        var val = Math.floor((d2.price || 0) * 0.4);
        hs += '<div class="shop-row" data-uid="' + it.uid + '" style="' + S_SHOPROW + '"><span style="font-size:22px;">' + (d2.icon || '📦') + '</span><span style="flex:1;"><b style="color:' + rarityColor(rarityOf(it)) + ';font-size:13.5px;">' + itemName(it) + '</b>' + (it.qty > 1 ? ' <span style="color:#8fa0b8;font-size:12px;">×' + it.qty + '</span>' : '') + '</span><span style="color:#7ce07c;font-size:13px;white-space:nowrap;">+🥈 ' + fmtNum(val) + '</span></div>';
      }
      sell.innerHTML = hs || '<div style="color:#8fa0b8;padding:8px;">Trong túi không có món nào bán được…</div>';
    }
    var gold = $('shop-gold');
    if (gold) gold.innerHTML = '<span style="color:#ffd76a;">🪙 ' + fmtNum(ps.gold || 0) + '</span><span style="color:#c9c9c9;margin-left:14px;">🥈 ' + fmtNum(ps.silver || 0) + '</span>';
    syncShopTabs();
  }

  UI.openShop = function (npc) {
    if (!npc) return;
    _shopNPC = npc;
    _shopTab = 'buy';
    var t = $('shop-title');
    if (t) t.textContent = '🏪 ' + npc.name;
    openOnly('panel-shop');
    renderShopLists();
    sfx('open');
  };

  function afterTrade() {
    renderShopLists();
    if (_openPanel === 'inventory') UI.renderInventory();
    if (_openPanel === 'character') UI.renderCharacter();
  }

  /* ===================== HỘP THOẠI ===================== */
  UI.openDialog = function (o) {
    o = o || {};
    var icon = $('dialog-icon'), name = $('dialog-name'), text = $('dialog-text'), opts = $('dialog-options');
    if (icon) icon.textContent = o.icon || '🧙';
    if (name) name.textContent = o.name || '???';
    if (text) text.innerHTML = o.text || '';
    if (opts) {
      opts.innerHTML = '';
      var list = o.options || [];
      for (var i = 0; i < list.length; i++) {
        (function (op) {
          var b = elIn(opts, 'button', 'dlg-btn ' + (op.primary ? 'btn-gold' : 'btn'), S_BTN, op.label || '…');
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            sfx('ui');
            if (typeof op.fn === 'function') op.fn();
            UI.closeDialog();
          });
        })(list[i]);
      }
    }
    show($('dialog-box'));
    sfx('open');
  };

  UI.closeDialog = function () { hide($('dialog-box')); };

  UI.dialogForNPC = function (npc) {
    if (!npc) return;
    var Q = MVL.Quests;
    var opts = [];
    /* Nhiệm vụ talk đang làm, trả tại chính NPC này */
    if (Q && Q.active) {
      for (var i = 0; i < Q.active.length; i++) {
        var def = questById(Q.active[i].id);
        if (def && def.type === 'talk' && def.target === npc.id) {
          (function (qd) {
            opts.push({ label: '✅ Trả nhiệm vụ: ' + qd.name, primary: true, fn: function () { if (typeof Q.notify === 'function') Q.notify('talk', { npc: npc.id }); } });
          })(def);
        }
      }
    }
    /* Nhiệm vụ có thể nhận */
    if (Q && typeof Q.getAvailableFor === 'function') {
      var avail = Q.getAvailableFor(npc.id) || [];
      for (var a = 0; a < avail.length && a < 3; a++) {
        (function (qd) {
          opts.push({ label: '📜 Nhận nhiệm vụ: ' + qd.name, fn: function () { if (typeof Q.accept === 'function') Q.accept(qd.id); UI.toast('Nhận nhiệm vụ: ' + qd.name, 'quest', '📖'); } });
        })(avail[a]);
      }
    }
    if (npc.role === 'shop' || npc.role === 'food') opts.push({ label: '🏪 Mua sắm', primary: opts.length === 0, fn: function () { UI.openShop(npc); } });
    if (npc.role === 'smith') opts.push({ label: '🔨 Cường hóa trang bị', primary: opts.length === 0, fn: function () { UI.togglePanel('inventory'); UI.toast('Chọn trang bị trong Túi → «Cường hóa». Cần Linh Thạch và vàng — Lý Thiết Tương đứng sẵn lò lửa.', 'info', '💎'); } });
    if (npc.role === 'warp') opts.push({ label: '🗺️ Mở bản đồ võ lâm', primary: opts.length === 0, fn: function () { UI.togglePanel('map'); } });
    opts.push({ label: '🚪 Chào tạm biệt', fn: null });
    UI.openDialog({ name: npc.name, icon: npc.icon || '🧙', text: npc.greeting || '…', options: opts });
  };

  /* ===================== BẢN ĐỒ THẾ GIỚI ===================== */
  function edgeSet() {
    var seen = {}, out = [], sceneIds = Object.keys(D.scenes);
    for (var i = 0; i < sceneIds.length; i++) {
      var sid = sceneIds[i], portals = D.scenes[sid].portals || [];
      for (var p = 0; p < portals.length; p++) {
        var to = portals[p].to;
        if (!NODE_POS[sid] || !NODE_POS[to]) continue;
        var key = sid < to ? sid + '|' + to : to + '|' + sid;
        if (!seen[key]) { seen[key] = true; out.push([sid, to]); }
      }
    }
    return out;
  }
  function drawMountain(ctx, x, base, w, h, color) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + w / 2, base);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  UI.renderWorldMap = function () {
    var c = $('worldmap-canvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    var W = c.width, H = c.height, i;
    var disc = discoveredSet(), cur = currentSceneId();
    /* nền */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#10161f');
    g.addColorStop(1, '#0a0e16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    /* hoa văn: chấm sao mờ + núi trang trí (deterministic) */
    var seed = 20261;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (i = 0; i < 110; i++) {
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,162,39,' + (0.03 + rnd() * 0.08).toFixed(3) + ')';
      ctx.fill();
    }
    for (var m = 0; m < 6; m++) drawMountain(ctx, 90 + m * 150 + rnd() * 40, H - 26, 90 + rnd() * 60, 26 + rnd() * 26, 'rgba(70,84,108,0.16)');
    /* khung viền kép + hoa văn góc */
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.strokeStyle = 'rgba(201,162,39,.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, W - 44, H - 44);
    var corners = [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]];
    for (i = 0; i < corners.length; i++) {
      ctx.save();
      ctx.translate(corners[i][0], corners[i][1]);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
    /* tiêu đề + la bàn */
    ctx.textAlign = 'center';
    ctx.font = '900 30px "Noto Serif SC", Georgia, serif';
    ctx.fillStyle = '#e9c766';
    ctx.fillText('BẢN ĐỒ VÕ LÂM', W / 2, 62);
    ctx.font = '12px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.fillStyle = '#8fa0b8';
    ctx.fillText('Ngũ địa giới — từ Mộng Hoành Sơn tới Long Môn Mật Cảnh', W / 2, 86);
    ctx.save();
    ctx.translate(W - 58, 60);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, -16);
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.font = '700 12px "Be Vietnam Pro", system-ui';
    ctx.fillText('N', 0, -28);
    ctx.restore();
    /* đường nối giữa các địa giới */
    var edges = edgeSet();
    for (i = 0; i < edges.length; i++) {
      var a = NODE_POS[edges[i][0]], b = NODE_POS[edges[i][1]];
      if (!a || !b) continue;
      var open = disc[edges[i][0]] && disc[edges[i][1]];
      ctx.save();
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = open ? 'rgba(201,162,39,.75)' : 'rgba(90,104,128,.35)';
      ctx.lineWidth = open ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.restore();
    }
    /* các node địa giới */
    var ids = Object.keys(NODE_POS);
    for (i = 0; i < ids.length; i++) {
      var sid2 = ids[i], sdef = D.scenes[sid2];
      if (!sdef) continue;
      var x = NODE_POS[sid2][0], y = NODE_POS[sid2][1];
      var isDisc = !!disc[sid2], isCur = sid2 === cur;
      if (isDisc) {
        ctx.beginPath();
        ctx.arc(x, y, 36, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201,162,39,.08)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fillStyle = isDisc ? '#141b28' : '#0c1018';
      ctx.fill();
      ctx.strokeStyle = isDisc ? '#c9a227' : '#39445a';
      ctx.lineWidth = isDisc ? 3 : 1.5;
      ctx.stroke();
      if (isDisc) {
        ctx.beginPath();
        ctx.arc(x, y, 21, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(201,162,39,.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (isCur) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd76a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd76a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.font = (isCur ? '800 ' : '700 ') + '15px "Noto Serif SC", Georgia, serif';
      ctx.fillStyle = isDisc ? '#ffd76a' : '#79839a';
      ctx.fillText(isDisc ? sdef.name : '???', x, y + 48);
      if (isCur) {
        ctx.font = '11px "Be Vietnam Pro", system-ui';
        ctx.fillStyle = '#e8dfc0';
        ctx.fillText('● đang ở đây', x, y + 64);
      }
      if (sdef.safe && isDisc) {
        ctx.font = '11px "Be Vietnam Pro", system-ui';
        ctx.fillStyle = '#7ce07c';
        ctx.fillText('Safe', x - 12, y - 32);
      }
    }
    /* chú giải */
    var lx = 30, ly = H - 116;
    ctx.fillStyle = 'rgba(8,11,18,.88)';
    ctx.strokeStyle = 'rgba(201,162,39,.5)';
    ctx.lineWidth = 1;
    ctx.fillRect(lx, ly, 330, 92);
    ctx.strokeRect(lx, ly, 330, 92);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(201,162,39,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx + 14, ly + 22);
    ctx.lineTo(lx + 52, ly + 22);
    ctx.stroke();
    ctx.font = '12px "Be Vietnam Pro", system-ui';
    ctx.fillStyle = '#cfd6dd';
    ctx.fillText('Tuyến đường đã mở — nhấp để dịch chuyển', lx + 62, ly + 26);
    ctx.strokeStyle = 'rgba(90,104,128,.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(lx + 14, ly + 46);
    ctx.lineTo(lx + 52, ly + 46);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#cfd6dd';
    ctx.fillText('??? — vùng chưa khám phá', lx + 62, ly + 50);
    ctx.beginPath();
    ctx.arc(lx + 33, ly + 70, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76a';
    ctx.fill();
    ctx.fillText('Vị trí hiện tại', lx + 62, ly + 74);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7f8ba0';
    ctx.fillText('Nhấp vào địa giới đã khám phá để dịch chuyển · đi qua cổng dịch chuyển (E) để mở vùng mới', W / 2, H - 30);
    ctx.textAlign = 'left';
  };

  /* ===================== CÀI ĐẶT ===================== */
  UI.renderSettings = function () {
    var vol = (MVL.Audio && MVL.Audio._vol) || { master: 0.8, bgm: 0.55, sfx: 0.7 };
    var map = { 'set-master': vol.master, 'set-bgm': vol.bgm, 'set-sfx': vol.sfx };
    var ids = Object.keys(map);
    for (var i = 0; i < ids.length; i++) {
      var e = $(ids[i]);
      if (e) e.value = Math.round(map[ids[i]] * 100);
    }
    var q = $('set-quality');
    if (q && MVL.Engine) q.value = MVL.Engine.quality || 'medium';
    var inv = $('set-inverty');
    if (inv && MVL.Cam) inv.checked = !!MVL.Cam.invertY;
    var au = $('set-autosave');
    if (au) au.checked = _autosave;
  };

  function resetAllData() {
    try { if (MVL.Save && MVL.Save.clear) MVL.Save.clear(); } catch (e) { /* bỏ qua */ }
    UI.toast('Đã xóa toàn bộ dữ liệu — võ lâm sẽ tải lại từ đầu…', 'bad', '🗑️');
    setTimeout(function () { try { window.location.reload(); } catch (e) { /* bỏ qua */ } }, 1000);
  }

  /* ===================== HƯỚNG DẪN ===================== */
  UI.renderHelp = function () {
    var box = $('help-content');
    if (box) box.innerHTML = D.helpText || '<p>Chưa có cuốn bí kíp nào…</p>';
  };

  /* ===================== OPENING STORY (tùy chọn) ===================== */
  UI.showStory = function (lines) {
    if (!lines || !lines.length) return;
    var old = $('story-overlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var ov = elIn(document.body, 'div', '', '', '');
    ov.id = 'story-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:rgba(5,7,11,.93);opacity:1;transition:opacity .7s;cursor:pointer;';
    var p = elIn(ov, 'div', '', 'max-width:640px;padding:24px;text-align:center;font-family:\'Noto Serif SC\',Georgia,serif;font-size:21px;line-height:1.9;color:#e9c766;text-shadow:0 0 18px rgba(201,162,39,.35);', '');
    var idx = 0, timer = null;
    function next() {
      if (idx >= lines.length) {
        ov.style.opacity = '0';
        setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 750);
        return;
      }
      p.textContent = lines[idx++];
      timer = setTimeout(next, 3000);
    }
    ov.addEventListener('click', function () { if (timer) clearTimeout(timer); idx = lines.length; next(); });
    next();
  };

  /* ===================== LIÊN QUAN GAME ===================== */
  function travelTo(id) {
    var sdef = D.scenes[id] || {};
    var ok = callGame(['travelTo'], [id]);
    if (!ok) busEmit('ui:travel', { id: id });
    UI.toast('Thân pháp như gió — đang dịch chuyển tới ' + (sdef.name || id) + '…', 'info', '🌀');
    sfx('portal');
    UI.closeAll();
  }
  function continueGame() {
    sfx('open');
    var has = (MVL.Save && MVL.Save.exists) ? MVL.Save.exists() : false;
    if (!has) { UI.toast('Chưa có dấu ấn lưu nào — hãy bắt đầu một hành trình mới.', 'info', '📜'); return; }
    if (!callGame(['continueGame', 'loadGame', 'continue'])) busEmit('ui:continue');
  }
  function enterWorld() {
    var inp = $('input-name');
    var name = (inp && inp.value) ? inp.value.trim() : '';
    if (!name) { name = randomName(); if (inp) inp.value = name; }
    if (!_selClass || !D.classes[_selClass]) _selClass = Object.keys(D.classes)[0];
    var cls = D.classes[_selClass];
    var heroModel = (cls.heroModels && cls.heroModels[_selHero]) ? cls.heroModels[_selHero] : 'tamphong';
    sfx('open');
    if (!callGame(['startNew', 'newGame', 'createCharacter', 'enterWorld'], [name, _selClass, heroModel])) busEmit('ui:newGame', { name: name, classId: _selClass, heroModel: heroModel });
  }
  function revive(mode) {
    sfx('ui');
    var ok = (mode === 'town') ? callGame(['reviveTown', 'reviveInTown']) : (callGame(['reviveHere', 'reviveInPlace']) || callGame(['revive'], ['here']));
    if (!ok) busEmit('ui:revive', { mode: mode });
    UI.hideDeath();
  }

  /* ===================== GÁN SỰ KIỆN DOM ===================== */
  function bind(id, fn) { var e = $(id); if (e) e.addEventListener('click', fn); }
  function findItemByUid(uid) {
    var items = (MVL.Inventory && MVL.Inventory.items) ? MVL.Inventory.items : [];
    for (var i = 0; i < items.length; i++) if (items[i].uid === uid) return items[i];
    return null;
  }

  function bindStaticButtons() {
    var i, mb = document.querySelectorAll('.mbtn[data-panel]');
    for (i = 0; i < mb.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); UI.togglePanel(btn.getAttribute('data-panel')); });
      })(mb[i]);
    }
    var pc = document.querySelectorAll('.panel-close');
    for (i = 0; i < pc.length; i++) {
      pc[i].addEventListener('click', function (e) { e.stopPropagation(); UI.closeAll(); sfx('close'); });
    }
    bind('btn-new', function () { sfx('ui'); UI.showCreate(); });
    bind('btn-continue', continueGame);
    bind('btn-help-login', function () { sfx('ui'); UI.togglePanel('help'); });
    bind('btn-back-login', function () { sfx('close'); UI.showLogin(); });
    bind('btn-enter-world', enterWorld);
    bind('btn-revive-town', function () { revive('town'); });
    bind('btn-revive-here', function () { revive('here'); });
    bind('map-close', function () { UI.closeAll(); sfx('close'); });
  }

  function bindDelegates() {
    var es = $('equip-slots');
    if (es) es.addEventListener('click', function (e) {
      var slotEl = e.target.closest ? e.target.closest('[data-slot]') : null;
      if (!slotEl) return;
      if (MVL.Inventory && typeof MVL.Inventory.unequip === 'function') MVL.Inventory.unequip(slotEl.getAttribute('data-slot'));
      sfx('ui');
      UI.renderInventory();
      if (_openPanel === 'character') UI.renderCharacter();
    });
    var grid = $('inv-grid');
    if (grid) grid.addEventListener('click', function (e) {
      var cell = e.target.closest ? e.target.closest('.inv-cell[data-uid]') : null;
      if (!cell) return;
      e.stopPropagation();
      var item = findItemByUid(cell.getAttribute('data-uid'));
      if (item) UI.ctxMenu(e.clientX, e.clientY, item);
    });
    var ctx = $('ctx-menu');
    if (ctx) ctx.addEventListener('click', function (e) {
      e.stopPropagation();
      var it = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!it) return;
      var item = findItemByUid(_ctxUid);
      if (item) runCtxAction(it.getAttribute('data-act'), item);
      closeCtx();
      UI.renderInventory();
      if (_openPanel === 'character') UI.renderCharacter();
    });
    bind('tab-buy', function () { _shopTab = 'buy'; syncShopTabs(); sfx('ui'); });
    bind('tab-sell', function () { _shopTab = 'sell'; syncShopTabs(); sfx('ui'); });
    var buy = $('shop-buy');
    if (buy) buy.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('.shop-row[data-id]') : null;
      if (!row || !MVL.Inventory) return;
      var def = D.items[row.getAttribute('data-id')] || {};
      if (MVL.Inventory.buy(def.id)) { UI.toast('Đã mua ' + def.name + ' — dùng nên trò, nên điều.', 'good', '🛒'); sfx('coin'); }
      else { UI.toast('Không đủ bạc, hoặc túi đã đầy!', 'bad', '⚠️'); sfx('error'); }
      afterTrade();
    });
    var sell = $('shop-sell');
    if (sell) sell.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('.shop-row[data-uid]') : null;
      if (!row || !MVL.Inventory) return;
      var item = findItemByUid(row.getAttribute('data-uid'));
      if (!item) return;
      MVL.Inventory.sell(item.uid);
      UI.toast('Bán ' + itemName(item) + ' — thu ' + fmtNum(Math.floor(((D.items[item.id] || {}).price || 0) * 0.4)) + ' bạc.', 'info', '🥈');
      sfx('coin');
      afterTrade();
    });
    var sk = $('skill-cards');
    if (sk) sk.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-up]') : null;
      if (!b || !MVL.Progression) return;
      MVL.Progression.upgradeSkill(b.getAttribute('data-up'));
      sfx('ui');
      UI.renderSkills();
    });
    var cs = $('char-stats');
    if (cs) cs.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-alloc]') : null;
      if (!b || !MVL.Progression) return;
      MVL.Progression.allocate(b.getAttribute('data-alloc'));
      sfx('ui');
      UI.renderCharacter();
      if (_openPanel === 'inventory') UI.renderInventory();
    });
    var wm = $('worldmap-canvas');
    if (wm) wm.addEventListener('click', function (e) {
      var r = wm.getBoundingClientRect();
      var mx = (e.clientX - r.left) * (wm.width / Math.max(1, r.width));
      var my = (e.clientY - r.top) * (wm.height / Math.max(1, r.height));
      var disc = discoveredSet(), cur = currentSceneId();
      var ids = Object.keys(NODE_POS);
      for (var i = 0; i < ids.length; i++) {
        var dx = mx - NODE_POS[ids[i]][0], dy = my - NODE_POS[ids[i]][1];
        if (Math.sqrt(dx * dx + dy * dy) <= 40) {
          if (ids[i] === cur) UI.toast('Chính là nơi ngươi đang đứng.', 'info', '📍');
          else if (disc[ids[i]]) travelTo(ids[i]);
          else UI.toast('Vùng ấy còn là ẩn mật — hãy đi qua cổng dịch chuyển để khám phá.', 'info', '❓');
          return;
        }
      }
    });
    document.addEventListener('click', function (e) {
      var m = $('ctx-menu');
      if (m && !m.classList.contains('hidden') && !(e.target && m.contains(e.target))) closeCtx();
    });
  }

  function bindSettings() {
    var volMap = [['set-master', 'master'], ['set-bgm', 'bgm'], ['set-sfx', 'sfx']];
    for (var i = 0; i < volMap.length; i++) {
      (function (pair) {
        var e = $(pair[0]);
        if (e) e.addEventListener('input', function () { if (MVL.Audio && MVL.Audio.setVolume) MVL.Audio.setVolume(pair[1], e.value / 100); });
      })(volMap[i]);
    }
    var q = $('set-quality');
    if (q) q.addEventListener('change', function () {
      if (MVL.Engine && MVL.Engine.applyQuality) MVL.Engine.applyQuality(q.value);
      sfx('ui');
      UI.toast('Chất lượng đồ họa: ' + q.value, 'info', '⚙️');
    });
    var inv = $('set-inverty');
    if (inv) inv.addEventListener('change', function () { if (MVL.Cam) MVL.Cam.invertY = inv.checked; sfx('ui'); });
    var au = $('set-autosave');
    if (au) au.addEventListener('change', function () {
      _autosave = !!au.checked;
      try { localStorage.setItem('mvl3d_autosave', _autosave ? '1' : '0'); } catch (e) { /* bỏ qua */ }
      if (MVL.Game) MVL.Game.autosave = _autosave;
    });
    bind('btn-save-now', function () {
      var ok = callGame(['saveNow']);
      if (!ok) busEmit('ui:save');
      UI.toast('💾 Đã lưu tiến trình — dấu ấn được khắc vào đá.', 'good', '💾');
    });
    bind('btn-export', function () {
      var area = $('import-area');
      var code = (MVL.Save && MVL.Save.export) ? MVL.Save.export() : '';
      if (area) {
        area.value = code;
        try { area.focus(); area.select(); } catch (e) { /* bỏ qua */ }
      }
      UI.toast(code ? 'Mã lưu đã xuất — hãy sao chép cất vào đâu đó cho chắc.' : 'Chưa có dữ liệu để xuất.', code ? 'good' : 'bad', '📤');
    });
    bind('btn-import', function () {
      var area = $('import-area');
      var code = area && area.value ? area.value.trim() : '';
      if (!code) { UI.toast('Dán mã lưu vào khung trước đã!', 'bad', '📥'); return; }
      var obj = (MVL.Save && MVL.Save.import) ? MVL.Save.import(code) : null;
      if (obj) {
        UI.toast('Nhập mã thành công! Đang tải lại võ lâm với dấu ấn mới…', 'good', '📥');
        setTimeout(function () { try { window.location.reload(); } catch (e) { /* bỏ qua */ } }, 1100);
      } else UI.toast('Mã lưu không hợp lệ — kiểm tra lại chữ đã sao chép!', 'bad', '⚠️');
    });
    bind('btn-reset', function () {
      UI.openDialog({
        name: 'Phong Ấn Dữ Liệu', icon: '⚠️',
        text: 'Xóa TOÀN BỘ dữ liệu lưu? Nhân vật, trang bị, nhiệm vụ và thành tựu sẽ tan thành mây khói — không thể hoàn tác!',
        options: [
          { label: '🗑️ Xóa ngay, không hối hận', primary: true, fn: resetAllData },
          { label: '↩ Để ta suy nghĩ thêm', fn: null }
        ]
      });
    });
  }

  /* ===================== INIT ===================== */
  UI.init = function () {
    if (_inited) return;
    _inited = true;
    try { _autosave = localStorage.getItem('mvl3d_autosave') !== '0'; } catch (e) { _autosave = true; }
    bindStaticButtons();
    bindDelegates();
    bindSettings();
    /* toast khi có thành tựu mới (mặt diện hiển thị của Achievements) */
    if (MVL.Bus && MVL.Bus.on) {
      MVL.Bus.on('achieve:unlock', function (data) {
        var def = (data && data.def) || {};
        UI.toast(def.name || 'Thành tựu mới!', 'ach', def.icon || '🏆');
      });
    }
    UI.renderHelp();
    UI.renderSettings();
    UI.showLogin();
  };

  MVL.UI = UI;
})(window.MVL);
