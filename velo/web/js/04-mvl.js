// ============================================================
// Quỷ Cốc Bát Hoang 3D — 04-mvl.js
// 04-mvl: §11 Mong Vo Lam (dong goc 2431-2440 + 2524-3126; data tables 2441-2523 da chuyen sang 00-state) + §12 enhance/gem (dong goc 3536-3642).
// Noi dung goc giu byte-identical; chi them dong window.QC o dau
// va dong Object.assign(window.QC, ...) o cuoi (khong doi ten bien/ham,
// khong doi thu tu cau lenh goc). Nap bang <script src> thuong, KHONG
// dung ES module (tranh loi CORS tren GitHub Pages / file://).
// ============================================================
window.QC = window.QC || {}; // Nhom 1 vong 3: namespace chung giua cac module (script thuong chia se global scope).
/* [04-mvl] Chu thich: khoi catalog 2441-2523 (ITEMS/SHOP_STOCK/SECTS/PETS/...) da chuyen sang 00-state.js theo spec module; cho nay giu lai ghi chu thay the de khong mat dau vet. Thu tu thuc thi cua cac khoi con lai giu nguyen (§11 truoc enhance/gem). */
    // ==========================================
    // 11. MONG VO LAM SYSTEMS (Tui / Mon Phai / Cho / Hoat Dong /
    //     Su Kien / Bang Hoi / Thi Tran Song Ma / Pet / Trang Bi / Luu game)
    //     Tat ca chay that: tien, chi so, vat pham deu thay doi that.
    // ==========================================
    const SAVE_KEY = 'quycoc_bat_hoang_3d_v1';
    function todayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function fmt(n) { return Math.floor(n).toLocaleString('vi-VN'); }
    function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    // --- Catalog vat pham (ITEMS/SLOT_NAMES/SHOP_STOCK/SECTS/ACTIVITIES/EVENTS/PETS/GUILD_PRESETS/GUILD_MEMBERS) ---
    // (Nhom 1 vong 3: khoi nay von o dong goc 2441-2523, da chuyen nguyen ven sang js/00-state.js.)
    // --- Mo rong gameState (giu nguyen cac truong cu) ---
    gameState.gold = 455;
    gameState.silver = 40932;
    gameState.defense = 12;
    gameState.sectId = null;
    gameState.petId = null;
    gameState.petLevel = 1;
    gameState.guild = null; // {name, contrib}
    gameState.townMode = false;
    gameState.activitiesDone = {};
    gameState.activityDate = todayStr();
    gameState.eventsClaimed = {};
    gameState.eventDate = todayStr();
    gameState.guildBossHp = 800;
    gameState.guildBossMaxHp = 800;
    gameState.guildBossCd = 0;
    gameState.inventory = [
      { id: 'hp_pill', qty: 10 }, { id: 'mp_pill', qty: 8 }, { id: 'rage_pill', qty: 5 },
      { id: 'wood_sword', qty: 1 }, { id: 'cloth_armor', qty: 1 }, { id: 'cloth_hat', qty: 1 },
      { id: 'cloth_boots', qty: 1 }, { id: 'copper_ring', qty: 1 }, { id: 'wood_neck', qty: 1 },
      { id: 'linh_thao', qty: 3 }, { id: 'da_cuong_hoa', qty: 2 }, { id: 'ngoc_linh', qty: 1 },
      { id: 'hong_ngoc', qty: 1 }, { id: 'luc_ngoc', qty: 1 }
    ];
    gameState.equipment = { weapon: null, armor: null, hat: null, boots: null, ring: null, necklace: null };
    gameState._baseMaxHp = gameState.maxHp;
    gameState._baseAtk = gameState.attackPower;
    gameState._baseDef = gameState.defense;
    gameState._baseCrit = gameState.critChance;

    // --- Tien te (khong bao gio am) ---
    function addGold(n) { gameState.gold = Math.max(0, gameState.gold + n); refreshCurrencyHUD(); return gameState.gold; }
    function addSilver(n) { gameState.silver = Math.max(0, gameState.silver + n); refreshCurrencyHUD(); return gameState.silver; }
    function spendGold(n) { if (gameState.gold < n) { showSystemBanner('Không đủ vàng! Cần ' + fmt(n) + ' vàng, bạn có ' + fmt(gameState.gold) + '.'); return false; } gameState.gold -= n; refreshCurrencyHUD(); return true; }
    function spendSilver(n) { if (gameState.silver < n) { showSystemBanner('Không đủ bạc! Cần ' + fmt(n) + ' bạc, bạn có ' + fmt(gameState.silver) + '.'); return false; } gameState.silver -= n; refreshCurrencyHUD(); return true; }
    function refreshCurrencyHUD() {
      var g = document.getElementById('hud-gold'); if (g) g.textContent = fmt(gameState.gold);
      var s = document.getElementById('hud-silver'); if (s) s.textContent = fmt(gameState.silver);
      var w = document.getElementById('shop-wallet'); if (w) w.textContent = 'Ví của bạn: 🪙 ' + fmt(gameState.gold) + ' vàng  •  ⚪ ' + fmt(gameState.silver) + ' bạc';
    }

    // --- Vat pham / tui ---
    function countItem(id) { var it = gameState.inventory.find(function (x) { return x.id === id; }); return it ? it.qty : 0; }
    function addItem(id, qty) {
      qty = qty || 1;
      var def = ITEMS[id]; if (!def) return false;
      var it = gameState.inventory.find(function (x) { return x.id === id; });
      if (it) it.qty += qty; else gameState.inventory.push({ id: id, qty: qty });
      return true;
    }
    function removeItem(id, qty) {
      qty = qty || 1;
      var it = gameState.inventory.find(function (x) { return x.id === id; });
      if (!it || it.qty < qty) return false;
      it.qty -= qty;
      if (it.qty <= 0) gameState.inventory = gameState.inventory.filter(function (x) { return x.id !== id; });
      return true;
    }
    function itemStatText(def) {
      var parts = [];
      if (def.atk) parts.push('+' + def.atk + ' Công');
      if (def.hp) parts.push('+' + def.hp + ' HP');
      if (def.def) parts.push('+' + def.def + ' Thủ');
      if (def.mp) parts.push('+' + def.mp + ' MP');
      return parts.join(' · ');
    }

    // --- Tinh lai chi so tu mon phai + trang bi + bang + pet ---
    function sectDef() { return SECTS.find(function (x) { return x.id === gameState.sectId; }) || null; }
    function petDef() { return PETS.find(function (x) { return x.id === gameState.petId; }) || null; }
    function guildBuffAtk() { return gameState.guild ? Math.floor(gameState.guild.contrib / 100) * 2 : 0; }
    function guildBuffHp() { return gameState.guild ? Math.floor(gameState.guild.contrib / 100) * 15 : 0; }
    function recalcStats() {
      if (gameState._baseMaxHp === undefined) { gameState._baseMaxHp = gameState.maxHp; gameState._baseAtk = gameState.attackPower; gameState._baseDef = gameState.defense || 12; }
      var sec = sectDef();
      var eqAtk = 0, eqHp = 0, eqDef = 0, eqMp = 0, eqCrit = 0;
      Object.keys(gameState.equipment).forEach(function (slot) {
        var id = gameState.equipment[slot];
        if (id && ITEMS[id]) {
          // NHOM 1: cuong hoa +8% chi so goc moi cap (equipment.v) + ngoc kham
          var lv = (gameState.enhanceLevels && gameState.enhanceLevels[slot]) || 0;
          eqAtk += (ITEMS[id].atk || 0) + Math.floor((ITEMS[id].atk || 0) * lv * 8 / 100);
          eqHp += (ITEMS[id].hp || 0) + Math.floor((ITEMS[id].hp || 0) * lv * 8 / 100);
          eqDef += (ITEMS[id].def || 0) + Math.floor((ITEMS[id].def || 0) * lv * 8 / 100);
          eqMp += ITEMS[id].mp || 0;
          var gm = gameState.gemSlots && gameState.gemSlots[slot];
          if (gm && ITEMS[gm]) { eqAtk += ITEMS[gm].atk || 0; eqHp += ITEMS[gm].hp || 0; eqDef += ITEMS[gm].def || 0; eqCrit += ITEMS[gm].crit || 0; }
        }
      });
      gameState.maxHp = Math.max(1, gameState._baseMaxHp + (sec ? sec.hp : 0) + eqHp + guildBuffHp());
      gameState.attackPower = Math.max(1, gameState._baseAtk + (sec ? sec.atk : 0) + eqAtk + guildBuffAtk());
      gameState.defense = Math.max(0, gameState._baseDef + (sec ? sec.def : 0) + eqDef);
      gameState.critChance = Math.min(0.9, (gameState._baseCrit || 0.35) + eqCrit);
      gameState.hp = Math.min(gameState.hp, gameState.maxHp);
      var st = document.getElementById('hud-stats');
      if (st) st.textContent = 'Công ' + gameState.attackPower + ' · Thủ ' + gameState.defense + ' · ' + (sec ? sec.name : 'Chưa nhập phái') + (gameState.guild ? ' · Bang: ' + gameState.guild.name : '');
    }

    // --- Roi do khi giet quai / boss ---
    function onEnemyKilledLoot(enemy) {
      var g = enemy.isBoss ? 150 : 8 + Math.floor(Math.random() * 12);
      var s = enemy.isBoss ? 500 : 20 + Math.floor(Math.random() * 40);
      addGold(g); addSilver(s);
      var drops = ['linh_thao', 'hp_pill', 'mp_pill', 'da_cuong_hoa'];
      if (enemy.isBoss) {
        addItem('ngoc_linh', 1);
        addItem(Math.random() > 0.5 ? 'iron_sword' : 'jade_ring', 1);
        showSystemBanner('Boss rơi: +150 vàng, +500 bạc, Ngọc Linh Thạch + trang bị!');
      } else if (Math.random() < 0.35) {
        var d = drops[Math.floor(Math.random() * drops.length)];
        addItem(d, 1);
        showSystemBanner('Nhặt được ' + ITEMS[d].name + ' (+' + g + ' vàng, +' + s + ' bạc)');
      }
      renderBag();
    }

    // --- Panel chung ---
    var currentPanel = null;
    function openPanel(name) {
      ['bag', 'sect', 'activity', 'event', 'shop', 'guild', 'team', 'pvp'].forEach(function (n) {
        var el = document.getElementById('panel-' + n);
        if (el) el.classList.add('hidden');
      });
      var el = document.getElementById('panel-' + name);
      if (!el) return;
      el.classList.remove('hidden');
      currentPanel = name;
      if (name === 'bag') { renderBag(); renderEnhance(); }
      if (name === 'sect') renderSect();
      if (name === 'activity') renderActivities();
      if (name === 'event') renderEvents();
      if (name === 'shop') renderShop();
      if (name === 'guild') renderGuild();
      if (name === 'team') renderTeam();
      if (name === 'pvp') renderPvp();
    }
    function closePanels() {
      ['bag', 'sect', 'activity', 'event', 'shop', 'guild', 'team', 'pvp'].forEach(function (n) {
        var el = document.getElementById('panel-' + n);
        if (el) el.classList.add('hidden');
      });
      currentPanel = null;
    }

    // --- 2. TUI + TRANG BI 6 SLOT + PET (trong panel Tui) ---
    function renderBag() {
      var body = document.getElementById('bag-body'); if (!body) return;
      var eq = document.getElementById('bag-equip'); if (eq) {
        var html = '<h3 style="font-size:13px;margin:6px 0">🛡️ Trang bị đang mặc (6 slot)</h3><div class="mvl-grid">';
        Object.keys(SLOT_NAMES).forEach(function (slot) {
          var id = gameState.equipment[slot];
          var def = id ? ITEMS[id] : null;
          html += '<div class="mvl-item"><span class="ic">' + (def ? def.icon : '⬜') + '</span><span class="nm">' + SLOT_NAMES[slot] + '</span><div style="font-size:11px">' + (def ? escHtml(def.name) + '<br>' + itemStatText(def) : '— trống —') + '</div>' +
            (def ? '<button class="mvl-btn" style="min-height:36px;margin-top:4px;font-size:12px" onclick="unequipItem(\'' + slot + '\')">Tháo</button>' : '') + '</div>';
        });
        html += '</div>';
        eq.innerHTML = html;
      }
      var petEl = document.getElementById('bag-pet'); if (petEl) {
        var pd = petDef();
        var h = '<h3 style="font-size:13px;margin:8px 0 4px">🐾 Thần thú đồng hành</h3><div class="mvl-grid">';
        PETS.forEach(function (pt) {
          var active = gameState.petId === pt.id;
          h += '<div class="mvl-item" style="' + (active ? 'border-color:#ffe082;background:rgba(255,213,79,.12)' : '') + '"><span class="ic">' + pt.icon + '</span><span class="nm">' + pt.name + ' Lv' + (active ? gameState.petLevel : 1) + '</span><div style="font-size:11px">' + pt.desc + '</div>' +
            '<button class="mvl-btn" style="min-height:36px;margin-top:4px;font-size:12px" onclick="selectPet(\'' + pt.id + '\')">' + (active ? '✓ Đang theo' : 'Chọn pet') + '</button>' +
            (active ? '<button class="mvl-btn" style="min-height:36px;margin-top:4px;font-size:12px" onclick="upgradePet()">Nâng cấp (' + fmt(100 * gameState.petLevel) + ' vàng)</button>' : '') + '</div>';
        });
        h += '</div>';
        petEl.innerHTML = h;
      }
      if (!gameState.inventory.length) { body.innerHTML = '<p class="text-[12px] text-[#b4c8c9]">Túi đang trống. Đánh quái hoặc mua ở Chợ để có đồ.</p>'; }
      else {
        var h2 = '<h3 style="font-size:13px;margin:8px 0 4px">📦 Vật phẩm (' + gameState.inventory.length + ' loại)</h3><div class="mvl-grid">';
        gameState.inventory.forEach(function (it) {
          var def = ITEMS[it.id]; if (!def) return;
          h2 += '<div class="mvl-item"><span class="ic">' + def.icon + '</span><span class="nm">' + escHtml(def.name) + '</span><div class="qt">x' + it.qty + '</div><div style="font-size:11px;color:#b4c8c9">' + escHtml(def.desc) + '</div>' +
            '<div style="display:flex;gap:4px;justify-content:center;margin-top:4px;flex-wrap:wrap">' +
            (def.type === 'potion' || def.type === 'material' ? '<button class="mvl-btn" style="min-height:36px;font-size:12px" onclick="useBagItem(\'' + it.id + '\')">Dùng</button>' : '') +
            (def.type === 'equip' ? '<button class="mvl-btn green" style="min-height:36px;font-size:12px" onclick="equipItem(\'' + it.id + '\')">Trang bị</button>' : '') +
            '<button class="mvl-btn" style="min-height:36px;font-size:12px" onclick="sellItem(\'' + it.id + '\')">Bán</button></div></div>';
        });
        h2 += '</div>';
        body.innerHTML = h2;
      }
      var chip = document.getElementById('pet-chip-text');
      if (chip) chip.textContent = petDef() ? petDef().icon + ' ' + petDef().name + ' Lv' + gameState.petLevel + ' — theo bạn chiến đấu' : 'Chưa có pet — mở Túi để chọn';
      refreshCurrencyHUD();
    }
    function useBagItem(id) {
      var def = ITEMS[id]; if (!def || countItem(id) <= 0) { showSystemBanner('Không còn vật phẩm này trong túi!'); return; }
      if (def.healHp) { removeItem(id, 1); gameState.hp = Math.min(gameState.maxHp, gameState.hp + def.healHp); spawnFloatingText(player.root.position, '+' + def.healHp + ' HP', 'dmg-heal'); showSystemBanner('Đã dùng ' + def.name + ': +' + def.healHp + ' HP'); }
      else if (def.healMp) { removeItem(id, 1); gameState.mp = Math.min(gameState.maxMp, gameState.mp + def.healMp); showSystemBanner('Đã dùng ' + def.name + ': +' + def.healMp + ' MP'); }
      else if (def.rage) { removeItem(id, 1); gameState.rageTimer = 12; showSystemBanner('Bạo Linh Phù: tỉ lệ bạo kích tăng 12 giây!'); }
      else { showSystemBanner(def.name + ' là nguyên liệu, không dùng trực tiếp được.'); return; }
      syncPillsFromBag(); renderBag(); saveGame(false);
    }
    function syncPillsFromBag() {
      gameState.pills.hp = countItem('hp_pill'); gameState.pills.mp = countItem('mp_pill'); gameState.pills.rage = countItem('rage_pill');
      var a = document.getElementById('pill-hp-count'); if (a) a.textContent = gameState.pills.hp;
      var b = document.getElementById('pill-mp-count'); if (b) b.textContent = gameState.pills.mp;
      var c = document.getElementById('pill-rage-count'); if (c) c.textContent = gameState.pills.rage;
    }
    function equipItem(id) {
      var def = ITEMS[id]; if (!def || def.type !== 'equip') return;
      if (!removeItem(id, 1)) { showSystemBanner('Không có ' + def.name + ' trong túi!'); return; }
      var old = gameState.equipment[def.slot];
      if (old) addItem(old, 1);
      gameState.equipment[def.slot] = id;
      recalcStats();
      showSystemBanner('Đã trang bị ' + def.name + ' (' + SLOT_NAMES[def.slot] + '): ' + itemStatText(def));
      renderBag(); saveGame(false);
    }
    function unequipItem(slot) {
      var id = gameState.equipment[slot]; if (!id) return;
      gameState.equipment[slot] = null;
      addItem(id, 1);
      recalcStats();
      showSystemBanner('Đã tháo ' + ITEMS[id].name + ' về Túi.');
      renderBag(); saveGame(false);
    }
    function sellItem(id) {
      var def = ITEMS[id]; if (!def || countItem(id) <= 0) return;
      if (!removeItem(id, 1)) return;
      if (def.sellGold) addGold(def.sellGold);
      if (def.sellSilver) addSilver(def.sellSilver);
      showSystemBanner('Đã bán ' + def.name + ' được ' + (def.sellGold ? fmt(def.sellGold) + ' vàng' : fmt(def.sellSilver) + ' bạc') + '.');
      renderBag(); saveGame(false);
    }

    // --- 3. MON PHAI ---
    function renderSect() {
      var body = document.getElementById('sect-body'); if (!body) return;
      var cur = sectDef();
      var h = '<p class="text-[12px] mb-2">Hiện tại: <b class="text-[#ffe082]">' + (cur ? cur.name : 'Chưa nhập phái') + '</b> — Nhập phái lần đầu <b>miễn phí</b>, đổi phái tốn <b>200 vàng</b>. Buff áp ngay vào Công / HP / Thủ, xem ở HUD trên cùng.</p>';
      SECTS.forEach(function (sec) {
        var active = gameState.sectId === sec.id;
        h += '<div class="mvl-row"><div class="t"><b>' + sec.icon + ' ' + sec.name + '</b><div class="sub">' + sec.desc + '</div></div>' +
          '<button class="mvl-btn' + (active ? ' green' : '') + '" onclick="selectSect(\'' + sec.id + '\')">' + (active ? '✓ Đang theo' : (gameState.sectId ? 'Đổi phái (200 vàng)' : 'Nhập phái')) + '</button></div>';
      });
      body.innerHTML = h;
    }
    function selectSect(id) {
      var sec = SECTS.find(function (x) { return x.id === id; }); if (!sec) return;
      if (gameState.sectId === id) { showSystemBanner('Bạn đã ở phái ' + sec.name + ' rồi!'); return; }
      if (gameState.sectId && !spendGold(200)) return;
      gameState.sectId = id;
      recalcStats();
      showSystemBanner('Đã nhập phái ' + sec.name + '! ' + sec.desc);
      renderSect(); saveGame(false);
    }

    // --- 4. CHO ---
    function renderShop() {
      var body = document.getElementById('shop-body'); if (!body) return;
      refreshCurrencyHUD();
      var h = '';
      SHOP_STOCK.forEach(function (id) {
        var def = ITEMS[id];
        var price = def.priceGold ? '🪙 ' + fmt(def.priceGold) + ' vàng' : '⚪ ' + fmt(def.priceSilver) + ' bạc';
        h += '<div class="mvl-row"><div class="t"><b>' + def.icon + ' ' + escHtml(def.name) + '</b><div class="sub">' + escHtml(def.desc) + (def.type === 'equip' ? ' <b>(' + itemStatText(def) + ')</b>' : '') + '<br>Đang có trong túi: x' + countItem(id) + '</div></div>' +
          '<div style="text-align:right"><div style="font-size:12px;font-weight:700;color:#ffe082">' + price + '</div><button class="mvl-btn green" style="margin-top:4px" onclick="buyItem(\'' + id + '\')">Mua</button></div></div>';
      });
      body.innerHTML = h;
    }
    function buyItem(id) {
      var def = ITEMS[id]; if (!def) return;
      if (def.priceGold) { if (!spendGold(def.priceGold)) { renderShop(); return; } }
      else if (def.priceSilver) { if (!spendSilver(def.priceSilver)) { renderShop(); return; } }
      addItem(id, 1);
      syncPillsFromBag();
      showSystemBanner('Đã mua ' + def.name + ' — vào Túi để dùng / trang bị.');
      renderShop(); renderBag(); saveGame(false);
    }

    // --- 5. HOAT DONG ---
    function resetDailyIfNeeded() {
      if (gameState.activityDate !== todayStr()) { gameState.activitiesDone = {}; gameState.activityDate = todayStr(); }
      if (gameState.eventDate !== todayStr()) { gameState.eventsClaimed = {}; gameState.eventDate = todayStr(); }
    }
    function renderActivities() {
      resetDailyIfNeeded();
      var body = document.getElementById('activity-body'); if (!body) return;
      var h = '';
      ACTIVITIES.forEach(function (a) {
        var done = gameState.activitiesDone[a.id] || 0;
        var locked = gameState.level < a.reqLevel;
        var full = done >= a.limit;
        h += '<div class="mvl-row"><div class="t"><b>' + a.name + '</b> <span class="sub">(' + done + '/' + a.limit + ' lượt hôm nay)</span><div class="sub">' + a.desc + '<br>Thưởng: +' + fmt(a.gold) + ' vàng, +' + fmt(a.silver) + ' bạc, +' + a.exp + ' EXP' + (a.item ? ', +' + ITEMS[a.item].name : '') + (locked ? '<br><b style="color:#ff8787">Yêu cầu cấp ' + a.reqLevel + ' (bạn cấp ' + gameState.level + ')</b>' : '') + '</div></div>' +
          '<button class="mvl-btn" ' + ((locked || full) ? 'disabled' : '') + ' onclick="doActivity(\'' + a.id + '\')">' + (full ? 'Đã hết lượt' : (locked ? 'Khóa' : 'Đi / Nhận')) + '</button></div>';
      });
      body.innerHTML = h;
    }
    function doActivity(id) {
      resetDailyIfNeeded();
      var a = ACTIVITIES.find(function (x) { return x.id === id; }); if (!a) return;
      var done = gameState.activitiesDone[id] || 0;
      if (gameState.level < a.reqLevel) { showSystemBanner('Cần cấp ' + a.reqLevel + ' mới làm được hoạt động này!'); return; }
      if (done >= a.limit) { showSystemBanner('Hôm nay đã hết lượt ' + a.name + '!'); return; }
      if (a.needsItem && countItem(a.needsItem) <= 0) { showSystemBanner('Cần 1 ' + ITEMS[a.needsItem].name + ' trong túi để luyện đan!'); return; }
      if (a.needsItem) removeItem(a.needsItem, 1);
      gameState.activitiesDone[id] = done + 1;
      addGold(a.gold); addSilver(a.silver);
      gameState.exp += a.exp;
      if (a.item) addItem(a.item, a.id === 'luyendan' ? 2 : 1);
      if (a.id === 'kill10') { for (var i = 0; i < 5; i++) create3DMonster('ghoul'); showSystemBanner('5 yêu thú đã xuất hiện! Đánh bại chúng để xong nhiệm vụ.'); }
      else if (a.id === 'dungeon') { for (var j = 0; j < 4; j++) create3DMonster('elite'); }
      else if (a.id === 'boss') { create3DMonster('boss'); }
      if (gameState.exp >= gameState.maxExp) levelUp();
      syncPillsFromBag();
      showSystemBanner('Hoàn thành ' + a.name + ': +' + fmt(a.gold) + ' vàng, +' + a.exp + ' EXP' + (a.item ? ', +' + ITEMS[a.item].name : ''));
      renderActivities(); renderBag(); saveGame(false);
    }

    // --- 6. SU KIEN THEO GIO THAT ---
    function eventStatus(ev) {
      var now = new Date();
      var h = now.getHours() + now.getMinutes() / 60;
      if (h >= ev.startHour && h < ev.startHour + ev.durationH) return 'Mở';
      if (h < ev.startHour && ev.startHour - h <= 2) return 'Sắp mở';
      if (h < ev.startHour) return 'Sắp mở';
      return 'Đã hết';
    }
    function renderEvents() {
      resetDailyIfNeeded();
      var body = document.getElementById('event-body'); if (!body) return;
      var now = new Date();
      var h = '<p class="text-[12px] mb-2">Giờ hiện tại trên máy: <b class="text-[#ffe082]">' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + '</b></p>';
      EVENTS.forEach(function (ev) {
        var st = eventStatus(ev);
        var claimed = !!gameState.eventsClaimed[ev.id];
        var canJoin = st === 'Mở' && !claimed;
        h += '<div class="mvl-row"><div class="t"><b>🎉 ' + ev.name + '</b> <span class="sub">— ' + ev.startHour + ':00–' + (ev.startHour + ev.durationH) + ':00</span><div class="sub">' + ev.desc + '<br>Thưởng: +' + fmt(ev.gold) + ' vàng, +' + ev.exp + ' EXP, +' + ITEMS[ev.item].name + '<br>Trạng thái: <b style="color:' + (st === 'Mở' ? '#51cf66' : st === 'Sắp mở' ? '#ffe082' : '#ff8787') + '">' + st + '</b>' + (claimed ? ' • Đã nhận hôm nay' : '') + '</div></div>' +
          '<button class="mvl-btn" ' + (canJoin ? '' : 'disabled') + ' onclick="joinEvent(\'' + ev.id + '\')">' + (claimed ? 'Đã nhận' : (st === 'Mở' ? 'Tham gia' : st)) + '</button></div>';
      });
      body.innerHTML = h;
    }
    function joinEvent(id) {
      resetDailyIfNeeded();
      var ev = EVENTS.find(function (x) { return x.id === id; }); if (!ev) return;
      if (eventStatus(ev) !== 'Mở') { showSystemBanner('Sự kiện ' + ev.name + ' chưa mở (mở ' + ev.startHour + ':00–' + (ev.startHour + ev.durationH) + ':00).'); return; }
      if (gameState.eventsClaimed[id]) { showSystemBanner('Hôm nay đã nhận thưởng sự kiện này rồi!'); return; }
      gameState.eventsClaimed[id] = true;
      addGold(ev.gold); gameState.exp += ev.exp; addItem(ev.item, 1);
      if (id === 'boss_world') create3DMonster('boss');
      if (gameState.exp >= gameState.maxExp) levelUp();
      showSystemBanner('Tham gia ' + ev.name + ': +' + fmt(ev.gold) + ' vàng, +' + ev.exp + ' EXP, +' + ITEMS[ev.item].name + '!');
      renderEvents(); renderBag(); saveGame(false);
    }

    // --- 7. BANG HOI ---
    function renderGuild() {
      var body = document.getElementById('guild-body'); if (!body) return;
      var h = '';
      if (!gameState.guild) {
        h += '<p class="text-[12px] mb-2">Bạn chưa có bang. Tạo bang mới (tên tự đặt) hoặc gia nhập 1 trong các bang có sẵn.</p>' +
          '<input id="guild-name-input" class="mvl-input" maxlength="24" placeholder="Nhập tên bang, ví dụ: Song Ma Quyền Phái" value="Song Ma Quyền Phái">' +
          '<div style="display:flex;gap:8px;margin:8px 0"><button class="mvl-btn green" style="flex:1" onclick="createGuild()">➕ Tạo bang (500 bạc)</button></div>' +
          '<h3 style="font-size:13px">Bang đang tuyển:</h3>';
        GUILD_PRESETS.forEach(function (g) {
          h += '<div class="mvl-row"><div class="t"><b>🏰 ' + escHtml(g.name) + '</b><div class="sub">Cấp bang ' + g.level + ' • ' + g.members + ' thành viên</div></div><button class="mvl-btn" onclick="joinGuild(\'' + escHtml(g.name) + '\')">Gia nhập</button></div>';
        });
      } else {
        var g = gameState.guild;
        var nextBuff = Math.floor(g.contrib / 100);
        h += '<div class="mvl-row"><div class="t"><b>🏰 ' + escHtml(g.name) + '</b><div class="sub">Điểm cống hiến: <b class="text-[#ffe082]">' + fmt(g.contrib) + '</b><br>Buff bang hiện tại: +' + guildBuffAtk() + ' Công, +' + guildBuffHp() + ' HP (mỗi 100 cống hiến = +2 Công, +15 HP)</div></div><button class="mvl-btn red" onclick="leaveGuild()">Rời bang</button></div>' +
          '<h3 style="font-size:13px">🙏 Cống hiến</h3>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="mvl-btn" onclick="contribute(100, 10)">100 bạc → +10 điểm</button><button class="mvl-btn" onclick="contribute(0, 50, 50)">50 vàng → +50 điểm</button><button class="mvl-btn" onclick="contribute(500, 60)">500 bạc → +60 điểm</button></div>' +
          '<h3 style="font-size:13px">👥 Thành viên (' + GUILD_MEMBERS.length + ')</h3>';
        GUILD_MEMBERS.forEach(function (m) {
          h += '<div class="mvl-row"><div class="t"><b>' + escHtml(m.name) + '</b><div class="sub">Cấp ' + m.level + ' • ' + escHtml(m.role) + '</div></div><span class="text-[11px] text-[#8ce99a]">● Online</span></div>';
        });
        h += '<h3 style="font-size:13px;margin-top:8px">🐸 Boss Bang — Kim Thiềm Vương</h3>' +
          '<div class="text-[12px]">HP: <b id="guild-boss-hp-text">' + fmt(gameState.guildBossHp) + '/' + fmt(gameState.guildBossMaxHp) + '</b></div>' +
          '<div class="mvl-bar"><i id="guild-boss-hp-bar" style="width:' + Math.max(0, gameState.guildBossHp / gameState.guildBossMaxHp * 100) + '%"></i></div>' +
          '<button class="mvl-btn green" style="width:100%" onclick="guildBossAttack()">⚔️ Đánh Boss Bang (sát thương = Công của bạn + pet)</button>' +
          '<p class="text-[11px] text-[#b4c8c9]">Thắng boss: +300 vàng, +100 EXP, +1 Ngọc Linh Thạch. Boss hồi đầy HP sau khi bị hạ.</p>';
      }
      body.innerHTML = h;
    }
    function createGuild() {
      var inp = document.getElementById('guild-name-input');
      var name = inp ? inp.value.trim() : '';
      if (!name) { showSystemBanner('Hãy nhập tên bang trước!'); return; }
      if (!spendSilver(500)) return;
      gameState.guild = { name: name, contrib: 0 };
      recalcStats();
      showSystemBanner('Đã lập bang ' + name + '! (-500 bạc)');
      renderGuild(); saveGame(false);
    }
    function joinGuild(name) {
      gameState.guild = { name: name, contrib: 0 };
      recalcStats();
      showSystemBanner('Đã gia nhập bang ' + name + '!');
      renderGuild(); saveGame(false);
    }
    function leaveGuild() {
      if (!confirm('Rời bang ' + gameState.guild.name + '? Điểm cống hiến và buff bang sẽ mất.')) return;
      gameState.guild = null;
      recalcStats();
      showSystemBanner('Bạn đã rời bang.');
      renderGuild(); saveGame(false);
    }
    function contribute(silver, points, gold) {
      gold = gold || 0;
      if (silver && !spendSilver(silver)) return;
      if (gold && !spendGold(gold)) return;
      gameState.guild.contrib += points;
      recalcStats();
      showSystemBanner('Cống hiến +' + points + ' điểm! Tổng: ' + fmt(gameState.guild.contrib) + ' (buff bang tăng).');
      renderGuild(); saveGame(false);
    }
    function guildBossAttack() {
      if (!gameState.guild) return;
      var now = Date.now();
      if (now - gameState.guildBossCd < 1000) { showSystemBanner('Đánh chậm lại 1 giây!'); return; }
      gameState.guildBossCd = now;
      var pd = petDef();
      var petDmg = pd ? pd.dmg + (gameState.petLevel - 1) * 8 : 0;
      var dmg = gameState.attackPower + petDmg;
      gameState.guildBossHp = Math.max(0, gameState.guildBossHp - dmg);
      showSystemBanner('Bạn chém Boss Bang -' + dmg + ' HP' + (petDmg ? ' (pet +' + petDmg + ')' : '') + '! Còn ' + fmt(gameState.guildBossHp) + ' HP.');
      if (gameState.guildBossHp <= 0) {
        addGold(300); gameState.exp += 100; addItem('ngoc_linh', 1);
        if (gameState.exp >= gameState.maxExp) levelUp();
        showSystemBanner('HẠ BOSS BANG! +300 vàng, +100 EXP, +1 Ngọc Linh Thạch!');
        gameState.guildBossHp = gameState.guildBossMaxHp;
      }
      renderGuild(); renderBag(); saveGame(false);
    }

    // --- 8. THI TRAN SONG MA ---
    var npcMeshes = [];
    function createTownNPCs() {
      if (typeof THREE === 'undefined') return;
      var defs = [
        { id: 'truongmon', x: -6, z: 7, color: 0x7c2d26, label: 'Truong Mon' },
        { id: 'chusap', x: 7, z: 6, color: 0x2f6f4f, label: 'Chu Sap' },
        { id: 'thoren', x: 0, z: 9, color: 0x3b4d59, label: 'Tho Ren' }
      ];
      defs.forEach(function (d) {
        var g = new THREE.Group();
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.1, 10), new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.7 }));
        body.position.y = 0.85; body.castShadow = true; g.add(body);
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf7cfb4, roughness: 0.6 }));
        head.position.y = 1.75; g.add(head);
        var hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xd4af6a, roughness: 0.6 }));
        hat.position.y = 2.1; g.add(hat);
        g.position.set(d.x, 0, d.z);
        g.userData.npcId = d.id;
        scene.add(g);
        npcMeshes.push(g);
      });
    }
    function toggleTownMode() { setTownMode(!gameState.townMode); }
    function setTownMode(on) {
      gameState.townMode = !!on;
      var banner = document.getElementById('town-banner'); if (banner) banner.classList.toggle('hidden', !on);
      var bar = document.getElementById('npc-bar'); if (bar) bar.style.display = on ? 'flex' : 'none';
      var btn = document.getElementById('btn-town-toggle'); if (btn) btn.textContent = on ? '⚔️ Chiến Đấu' : '🏯 Thị Trấn';
      var mapName = document.getElementById('map-name'); if (mapName) mapName.textContent = on ? 'Song Ma Quyền Phái' : 'Quỷ Cốc Sơn';
      if (on) { gameState.targetPos = null; showSystemBanner('Đã vào Thị Trấn Song Ma Quyền Phái — khu an toàn, quái không tấn công. Bấm NPC để nói chuyện!'); }
      else showSystemBanner('Đã ra khỏi thị trấn — quái lại tấn công!');
      saveGame(false);
    }
    function talkToNpc(id) {
      if (id === 'truongmon') { showSystemBanner('Trưởng Môn: "Đạo hữu muốn nhập phái nào? Vào Môn Phái mà chọn!"'); setTimeout(function () { openPanel('sect'); }, 500); }
      else if (id === 'chusap') { showSystemBanner('Chủ Sạp: "Hàng mới về đây! Vào Chợ xem đi, giá hữu nghị!"'); setTimeout(function () { openPanel('shop'); }, 500); }
      else if (id === 'thoren') { showSystemBanner('Thợ Rèn: "Đồ trong Túi mang ra đây, ta xem giúp ngươi trang bị!"'); setTimeout(function () { openPanel('bag'); }, 500); }
    }

    // --- 9. PET / THAN THU ---
    var petMesh = null;
    var petAttackCd = 0;
    function createPetMesh() {
      if (typeof THREE === 'undefined' || petMesh) return;
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), new THREE.MeshStandardMaterial({ color: 0xd9480f, roughness: 0.6 }));
      body.position.y = 0.55; body.castShadow = true; g.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffd43b, roughness: 0.6 }));
      head.position.set(0, 1.0, 0.28); g.add(head);
      g.visible = false;
      scene.add(g);
      petMesh = g;
    }
    function selectPet(id) {
      var pd = PETS.find(function (x) { return x.id === id; }); if (!pd) return;
      gameState.petId = id;
      if (petMesh) { petMesh.visible = true; petMesh.children[0].material.color.setHex(pd.color); }
      showSystemBanner(pd.icon + ' ' + pd.name + ' Lv' + gameState.petLevel + ' đã đi theo bạn! Pet gây ' + petDamage() + ' sát thương mỗi đòn.');
      renderBag(); saveGame(false);
    }
    function petDamage() { var pd = petDef(); return pd ? pd.dmg + (gameState.petLevel - 1) * 8 : 0; }
    function upgradePet() {
      if (!gameState.petId) { showSystemBanner('Hãy chọn 1 pet trước!'); return; }
      var cost = 100 * gameState.petLevel;
      if (!spendGold(cost)) return;
      gameState.petLevel++;
      showSystemBanner(petDef().name + ' lên Lv' + gameState.petLevel + '! Sát thương pet: ' + petDamage() + '.');
      renderBag(); saveGame(false);
    }
    function updatePet(dt, elapsed) {
      if (!petMesh) createPetMesh();
      if (!petMesh) return;
      var pd = petDef();
      petMesh.visible = !!pd;
      if (!pd) return;
      // Pet bay theo sau nhan vat
      var tx = player.root.position.x - Math.sin(player.root.rotation.y) * 1.4;
      var tz = player.root.position.z - Math.cos(player.root.rotation.y) * 1.4;
      petMesh.position.x += (tx - petMesh.position.x) * Math.min(1, dt * 6);
      petMesh.position.z += (tz - petMesh.position.z) * Math.min(1, dt * 6);
      petMesh.position.y = 0.15 + Math.abs(Math.sin(elapsed * 4)) * 0.25;
      petMesh.rotation.y = player.root.rotation.y;
      // Pet tan cong quai gan nhat
      if (gameState.townMode) return;
      petAttackCd -= dt;
      if (petAttackCd > 0) return;
      var target = findNearestEnemy(9);
      if (!target) return;
      petAttackCd = 1.2;
      var dmg = petDamage();
      target.hp -= dmg;
      spawnFloatingText(target.mesh.position, '🐾 -' + dmg, 'dmg-heal');
      var ratio = Math.max(0, target.hp / target.maxHp);
      target.fillPlane.scale.x = Math.max(0.001, ratio);
      target.fillPlane.position.x = -(1 - ratio) * 0.62;
      if (target.hp <= 0) killEnemy(target);
    }

    // --- 10. LUU GAME localStorage ---
    function saveGame(showMsg) {
      try {
        var data = {
          level: gameState.level, realmIndex: gameState.realmIndex, exp: gameState.exp, maxExp: gameState.maxExp,
          hp: gameState.hp, mp: gameState.mp, gold: gameState.gold, silver: gameState.silver,
          kills: gameState.kills, sectId: gameState.sectId, petId: gameState.petId, petLevel: gameState.petLevel,
          guild: gameState.guild, townMode: gameState.townMode,
          inventory: gameState.inventory, equipment: gameState.equipment,
          pills: gameState.pills, activitiesDone: gameState.activitiesDone, activityDate: gameState.activityDate,
          eventsClaimed: gameState.eventsClaimed, eventDate: gameState.eventDate,
          guildBossHp: gameState.guildBossHp,
          enhanceLevels: gameState.enhanceLevels, gemSlots: gameState.gemSlots, enhanceAttempts: gameState.enhanceAttempts,
          partyHeroes: gameState.partyHeroes,
          pvpPoints: gameState.pvpPoints, pvpWins: gameState.pvpWins, pvpLosses: gameState.pvpLosses, pvpDailyDate: gameState.pvpDailyDate,
          raidWins: gameState.raidWins, raidLosses: gameState.raidLosses,
          baseMaxHp: gameState._baseMaxHp, baseAtk: gameState._baseAtk, baseDef: gameState._baseDef
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        if (showMsg) showSystemBanner('Đã lưu game! (tự lưu mỗi 15 giây)');
      } catch (e) { /* bo qua khi trinh duyet chan localStorage */ }
    }
    function loadGame() {
      var raw = null;
      try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
      if (!raw) return false;
      var d = null;
      try { d = JSON.parse(raw); } catch (e) { return false; }
      if (!d || typeof d !== 'object') return false;
      gameState.level = d.level || gameState.level;
      gameState.realmIndex = d.realmIndex || 0;
      gameState.exp = d.exp || 0; gameState.maxExp = d.maxExp || 100;
      gameState.gold = Math.max(0, d.gold || 0); gameState.silver = Math.max(0, d.silver || 0);
      gameState.kills = d.kills || 0;
      gameState.sectId = d.sectId || null; gameState.petId = d.petId || null; gameState.petLevel = d.petLevel || 1;
      gameState.guild = d.guild || null; gameState.townMode = !!d.townMode;
      if (Array.isArray(d.inventory) && d.inventory.length) gameState.inventory = d.inventory.filter(function (x) { return x && ITEMS[x.id]; });
      if (d.equipment && typeof d.equipment === 'object') gameState.equipment = d.equipment;
      if (d.pills) gameState.pills = d.pills;
      gameState.activitiesDone = d.activitiesDone || {}; gameState.activityDate = d.activityDate || todayStr();
      gameState.eventsClaimed = d.eventsClaimed || {}; gameState.eventDate = d.eventDate || todayStr();
      gameState.guildBossHp = d.guildBossHp || 800;
      // NHOM 1: khoi phuc he thong moi; save cu (khong co cac truong nay) giu mac dinh, khong crash
      if (d.enhanceLevels && typeof d.enhanceLevels === 'object') { Object.keys(gameState.enhanceLevels).forEach(function (sl) { var v = d.enhanceLevels[sl]; if (typeof v === 'number' && v >= 0 && v <= 10) gameState.enhanceLevels[sl] = Math.floor(v); }); }
      if (d.gemSlots && typeof d.gemSlots === 'object') { Object.keys(gameState.gemSlots).forEach(function (sl) { var g = d.gemSlots[sl]; gameState.gemSlots[sl] = (g && ITEMS[g] && ITEMS[g].type === 'gem') ? g : null; }); }
      gameState.enhanceAttempts = (typeof d.enhanceAttempts === 'number' && d.enhanceAttempts >= 0) ? Math.floor(d.enhanceAttempts) : 0;
      if (Array.isArray(d.partyHeroes) && d.partyHeroes.length === 5 && d.partyHeroes.every(function (id) { return HEROES.some(function (hh) { return hh.id === id; }); }) && new Set(d.partyHeroes).size === 5) gameState.partyHeroes = d.partyHeroes.slice();
      gameState.pvpPoints = Math.max(0, d.pvpPoints || 0); gameState.pvpWins = d.pvpWins || 0; gameState.pvpLosses = d.pvpLosses || 0;
      gameState.pvpDailyDate = d.pvpDailyDate || '';
      gameState.raidWins = d.raidWins || 0; gameState.raidLosses = d.raidLosses || 0;
      buildAllies();
      if (d.baseMaxHp) gameState._baseMaxHp = d.baseMaxHp;
      if (d.baseAtk) gameState._baseAtk = d.baseAtk;
      if (d.baseDef) gameState._baseDef = d.baseDef;
      gameState.hp = Math.min(d.hp || gameState.maxHp, 99999);
      gameState.mp = d.mp || gameState.mp;
      recalcStats();
      gameState.hp = Math.min(gameState.hp, gameState.maxHp);
      document.getElementById('hud-level').textContent = gameState.level;
      document.getElementById('hud-realm').textContent = gameState.realms[gameState.realmIndex];
      document.getElementById('quest-kill-count').textContent = Math.min(gameState.kills, gameState.questTarget);
      syncPillsFromBag();
      refreshCurrencyHUD();
      if (gameState.townMode) setTownMode(true);
      if (gameState.petId && petMesh) petMesh.visible = true;
      return true;
    }
    function resetGame() {
      if (!confirm('Xóa toàn bộ tiến trình (cấp, vàng, túi, môn phái, bang, pet) và chơi lại từ đầu?')) return;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      location.reload();
    }
    setInterval(function () { saveGame(false); }, 15000);
    window.addEventListener('beforeunload', function () { saveGame(false); });

    // --- Cuong hoa / Kham ngoc: port equipment.v ---
    // cost = 100*(lv+1) vang; rate = max(10, 100-lv*10)%; max +10; moi cap +8% chi so goc.
    // That bai: equipment.v giu nguyen cap (khong rot) — thoa "that bai toi da -1 cap".
    var SLOT_ORDER = ['weapon', 'armor', 'hat', 'boots', 'ring', 'necklace'];
    var GEM_IDS = ['hong_ngoc', 'luc_ngoc', 'lam_ngoc', 'tu_ngoc', 'kim_ngoc', 'huyet_ngoc'];
    function enhanceLevel(slot) { return (gameState.enhanceLevels && gameState.enhanceLevels[slot]) || 0; }
    function enhanceCost(slot) { return 100 * (enhanceLevel(slot) + 1); }
    function enhanceRate(slot) { return Math.max(10, 100 - enhanceLevel(slot) * 10); }
    function enhanceRoll(slot) {
      var idx = SLOT_ORDER.indexOf(slot);
      return (gameState.kills * 37 + idx * 13 + enhanceLevel(slot) * 7 + gameState.level * 11 + (gameState.enhanceAttempts || 0) * 29) % 100;
    }
    function enhanceSlot(slot) {
      var id = gameState.equipment[slot];
      if (!id) { showSystemBanner('Ô ' + SLOT_NAMES[slot] + ' đang trống — hãy trang bị đồ trước!'); return; }
      var lv = enhanceLevel(slot);
      if (lv >= 10) { showSystemBanner(ITEMS[id].name + ' đã cường hóa tối đa +10!'); return; }
      var cost = enhanceCost(slot);
      if (!spendGold(cost)) return;
      gameState.enhanceAttempts = (gameState.enhanceAttempts || 0) + 1;
      var roll = enhanceRoll(slot);
      if (roll < enhanceRate(slot)) {
        gameState.enhanceLevels[slot] = lv + 1;
        recalcStats();
        showSystemBanner('✨ Cường hóa ' + SLOT_NAMES[slot] + ' lên +' + (lv + 1) + ' thành công! (' + ITEMS[id].name + ', mỗi cấp +8% chỉ số gốc)');
      } else {
        showSystemBanner('💥 Cường hóa ' + SLOT_NAMES[slot] + ' thất bại! Giữ nguyên +' + lv + ' (không rớt cấp, theo equipment.v).');
      }
      renderEnhance(); renderBag(); saveGame(false);
    }
    function socketGem(slot, gemId) {
      var id = gameState.equipment[slot];
      if (!id) { showSystemBanner('Ô ' + SLOT_NAMES[slot] + ' đang trống — hãy trang bị đồ trước!'); return; }
      var gm = ITEMS[gemId];
      if (!gm || gm.type !== 'gem') { showSystemBanner('Hãy chọn 1 loại ngọc!'); return; }
      if (countItem(gemId) <= 0) { showSystemBanner('Bạn không có ' + gm.name + ' trong túi! Mua ngọc ở dưới.'); return; }
      removeItem(gemId, 1);
      var old = gameState.gemSlots[slot];
      if (old) addItem(old, 1);
      gameState.gemSlots[slot] = gemId;
      recalcStats();
      showSystemBanner('💎 Đã khảm ' + gm.name + ' vào ' + SLOT_NAMES[slot] + ' (' + ITEMS[id].name + ')' + (old ? ' — ' + ITEMS[old].name + ' cũ đã trả về Túi.' : ''));
      renderEnhance(); renderBag(); saveGame(false);
    }
    function unsocketGem(slot) {
      var gm = gameState.gemSlots[slot];
      if (!gm) return;
      gameState.gemSlots[slot] = null;
      addItem(gm, 1); recalcStats();
      showSystemBanner('Đã gỡ ' + ITEMS[gm].name + ' khỏi ' + SLOT_NAMES[slot] + ' về Túi.');
      renderEnhance(); renderBag(); saveGame(false);
    }
    function buyGem(gemId) {
      var gm = ITEMS[gemId]; if (!gm) return;
      if (!spendGold(gm.priceGold)) return;
      addItem(gemId, 1);
      showSystemBanner('Đã mua ' + gm.name + ' (-' + fmt(gm.priceGold) + ' vàng). Vào ô trang bị để khảm.');
      renderEnhance(); renderBag(); saveGame(false);
    }
    function renderEnhance() {
      var el = document.getElementById('bag-enhance'); if (!el) return;
      var t = equipBonus();
      var h = '<h3 style="font-size:13px;margin:8px 0 4px">⚒️ Cường Hóa &amp; Khảm Ngọc <span style="color:#b4c8c9;font-weight:400">(tối đa +10, mỗi cấp +8% chỉ số gốc; thất bại không rớt cấp)</span></h3>';
      h += '<div class="text-[12px] mb-2">Cộng thêm từ cường hóa + ngọc: <b class="text-[#ffe082]">+' + t.atk + ' Công, +' + t.hp + ' HP, +' + t.def + ' Thủ, +' + Math.round(t.crit * 100) + '% Bạo</b> (đã áp vào Công/Thủ/HUD).</div>';
      SLOT_ORDER.forEach(function (slot) {
        var id = gameState.equipment[slot];
        var def = id ? ITEMS[id] : null;
        var lv = enhanceLevel(slot);
        var gm = gameState.gemSlots[slot];
        h += '<div class="mvl-row"><div class="t"><b>' + SLOT_NAMES[slot] + ' ' + (def ? '— ' + escHtml(def.name) + ' <span style="color:#ffe082">+' + lv + '</span>' : '(trống)') + '</b><div class="sub">' +
          (def ? itemStatText(def) + ' • Cấp sau: <b>' + fmt(enhanceCost(slot)) + ' vàng, tỉ lệ ' + enhanceRate(slot) + '%</b>' + (gm ? '<br>💎 Đang khảm: ' + ITEMS[gm].name : '<br>💎 Chưa khảm ngọc') : 'Trang bị đồ vào ô này để cường hóa / khảm ngọc.') +
          '</div></div><div style="display:flex;flex-direction:column;gap:4px;min-width:132px">' +
          '<button class="mvl-btn" style="min-height:44px" ' + (def && lv < 10 ? '' : 'disabled') + ' onclick="enhanceSlot(\'' + slot + '\')">⚒️ Cường hóa (' + (def ? fmt(enhanceCost(slot)) + ' vàng' : '—') + ')</button>' +
          (gm ? '<button class="mvl-btn" style="min-height:44px" onclick="unsocketGem(\'' + slot + '\')">💎 Gỡ ' + escHtml(ITEMS[gm].name) + '</button>' : '') +
          '</div></div>';
      });
      h += '<h3 style="font-size:13px;margin:8px 0 4px">💎 Khảm ngọc (6 loại, theo equipment.v)</h3><div class="mvl-row"><div class="t"><div class="sub">Chọn ô trang bị rồi chọn ngọc trong túi để khảm. Ngọc cũ trả về Túi.</div></div><div style="display:flex;gap:4px;flex-wrap:wrap">' +
        '<select id="gem-slot-sel" class="mvl-input" style="width:130px">' + SLOT_ORDER.map(function (s) { return '<option value="' + s + '">' + SLOT_NAMES[s] + '</option>'; }).join('') + '</select>' +
        '<select id="gem-id-sel" class="mvl-input" style="width:150px">' + GEM_IDS.map(function (g) { return '<option value="' + g + '">' + ITEMS[g].name + ' (x' + countItem(g) + ')</option>'; }).join('') + '</select>' +
        '<button class="mvl-btn green" onclick="socketGem(document.getElementById(\'gem-slot-sel\').value, document.getElementById(\'gem-id-sel\').value)">Khảm ngọc</button></div></div>';
      h += '<h3 style="font-size:13px;margin:8px 0 4px">🛒 Mua ngọc (vàng)</h3><div style="display:flex;gap:6px;flex-wrap:wrap">';
      GEM_IDS.forEach(function (g) {
        h += '<button class="mvl-btn" style="min-height:44px" onclick="buyGem(\'' + g + '\')">' + ITEMS[g].icon + ' ' + ITEMS[g].name + ' — ' + fmt(ITEMS[g].priceGold) + ' vàng (có x' + countItem(g) + ')</button>';
      });
      h += '</div>';
      el.innerHTML = h;
    }
    // Boc equip/unequip goc: theo equipment.v, do moi vao slot reset cuong hoa ve +0;
    // thao do reset +0 va go ngoc (ban HTML tra ngoc ve Tui thay vi lam mat ngoc nhu V).
    var _g1EquipItemOrig = equipItem;
    equipItem = function (id) {
      var def = ITEMS[id]; if (!def || def.type !== 'equip') return _g1EquipItemOrig(id);
      var r = _g1EquipItemOrig(id);
      if (gameState.equipment[def.slot] === id) { gameState.enhanceLevels[def.slot] = 0; recalcStats(); renderEnhance(); }
      return r;
    };
    var _g1UnequipItemOrig = unequipItem;
    unequipItem = function (slot) {
      var gm = gameState.gemSlots && gameState.gemSlots[slot];
      _g1UnequipItemOrig(slot);
      if (gameState.equipment[slot] == null) {
        gameState.enhanceLevels[slot] = 0;
        if (gm) { gameState.gemSlots[slot] = null; addItem(gm, 1); }
        recalcStats(); renderEnhance();
      }
    };

Object.assign(window.QC, { SAVE_KEY, addGold, addSilver, spendGold, spendSilver, recalcStats, openPanel, closePanels, renderBag, equipItem, unequipItem, renderShop, renderSect, renderActivities, renderEvents, renderGuild, toggleTownMode, createTownNPCs, createPetMesh, selectPet, saveGame, loadGame, resetGame, enhanceSlot, socketGem, unsocketGem, buyGem, renderEnhance });
