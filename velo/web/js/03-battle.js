// ============================================================
// Quỷ Cốc Bát Hoang 3D — 03-battle.js
// 03-battle: §12 phan 1 — formation 5 / auto-battle / raid boss / combo+no / dmg log / PvP data (dong goc 3127-3535).
//
// CHUẨN CHUNG VÒNG 3 (khớp V: battle_map.v — 1 chuẩn duy nhất, 2 phía):
//  1. Nộ khí: đầy 100 nộ → bấm Nộ Trảm tay (castRageSkill): dmg = Công x4 +
//     Combo x10, AoE 6m, sau đó nộ về 0, combo về 0. KHÔNG tự bùng +45% 6s.
//  2. Boss raid: Kim Thiềm Vương 20000 HP / 120s / 3 phase (66%/33%,
//     mỗi phase gọi 3 quái con).
//  3. AoE raid: 90 dmg cố định (cả hero lẫn đồng đội).
//  4. Thưởng boss thế giới (mốc >=20000 dmg): +5000 vàng + 50 linh thạch
//     (Ngọc Linh Thạch) + 5 Đá Cường Hóa (xem worldBossAttack ở 05-ui.js).
//  5. Tank aggro thật: tank khiêu khích 6s (js/06-expand.js: castTaunt /
//     getTauntTargetPos) → quái đuổi theo tank, đòn đánh trúng tank;
//     threat cao nhất = mục tiêu. Không taunt = như cũ.
// Noi dung goc giu byte-identical; chi them dong window.QC o dau
// va dong Object.assign(window.QC, ...) o cuoi (khong doi ten bien/ham,
// khong doi thu tu cau lenh goc). Nap bang <script src> thuong, KHONG
// dung ES module (tranh loi CORS tren GitHub Pages / file://).
// ============================================================
window.QC = window.QC || {}; // Nhom 1 vong 3: namespace chung giua cac module (script thuong chia se global scope).
/* [03-battle] Chu thich: §12 chay truoc §11 trong thu tu nap file (03 truoc 04) — dao thu tu goc (§11 truoc §12) nhung an toan tai load: §12 chi khai bao + gan gameState.* (khong trung truong §11), khong goi ham §11 o top-level; §11 cung khong goi ham §12 o top-level. Xem bao cao nhom 1. */
    // ==========================================
    // 12. NHOM 1 — DOI HINH 5 NGUOI / AUTO-BATTLE / BOSS RAID /
    //     COMBO + NO KHI / NHAT KY SAT THUONG / CUONG HOA + KHAM NGOC /
    //     PVP + BOSS THE GIOI (chi them moi, khong sua ham combat cu)
    //     Cong thuc goc: velo/quycoc3d/equipment.v, pvp.v, pets.v,
    //     team.v, guild.v, content.v.
    // ==========================================
    var HEROES = [
      { id: 0, name: 'Quỷ Cốc Tử', title: 'Bát Hoang Kiếm Chủ', role: 'dps', tint: 0xfff4e2, blade: 0xffd65a, hpMult: 1.0, atkMult: 1.0 },
      { id: 1, name: 'Lãnh Nguyệt', title: 'Băng Tâm Kiếm Khách', role: 'support', tint: 0xcde8ff, blade: 0x84e0ff, hpMult: 0.95, atkMult: 1.05 },
      { id: 2, name: 'Huyết Đao', title: 'Huyết Ma Đao Vương', role: 'tank', tint: 0xffc6be, blade: 0xff6058, hpMult: 1.15, atkMult: 1.25 },
      { id: 3, name: 'Thanh Vũ', title: 'Lưu Vân Nhanh Kiếm', role: 'dps', tint: 0xceffde, blade: 0x78f6aa, hpMult: 0.9, atkMult: 1.0 },
      { id: 4, name: 'Hỏa Linh', title: 'Xích Diễm Pháp Sư', role: 'dps', tint: 0xffd6b0, blade: 0xff9440, hpMult: 0.85, atkMult: 1.2 },
      { id: 5, name: 'Kim Cương', title: 'Kim Cang Thiền Sư', role: 'tank', tint: 0xffedbe, blade: 0xffc45c, hpMult: 1.35, atkMult: 0.9 },
      { id: 6, name: 'Tử Yên', title: 'Ám Ảnh Sát Thủ', role: 'dps', tint: 0xe8ceff, blade: 0xc488ff, hpMult: 0.8, atkMult: 1.1 },
      { id: 7, name: 'Bạch Hổ', title: 'Ngự Thú Sư', role: 'healer', tint: 0xf6e8d0, blade: 0x9ee296, hpMult: 1.1, atkMult: 1.05 }
    ];
    var ROLE_NAMES = { tank: 'Tank', dps: 'DPS', healer: 'Hồi máu', support: 'Hỗ trợ' };
    var ROW_NAMES = { front: 'Hàng trước', mid: 'Hàng giữa', back: 'Hàng sau' };
    function heroDefG1(id) { return HEROES.find(function (h) { return h.id === id; }) || HEROES[0]; }
    function heroRow(h) { return h.role === 'tank' ? 'front' : (h.role === 'healer' || h.role === 'support') ? 'back' : 'mid'; }

    // --- Trang thai moi (mac dinh; save/load mo rong o ham goc) ---
    gameState.enhanceLevels = { weapon: 0, armor: 0, hat: 0, boots: 0, ring: 0, necklace: 0 };
    gameState.gemSlots = { weapon: null, armor: null, hat: null, boots: null, ring: null, necklace: null };
    gameState.enhanceAttempts = 0;
    gameState.partyHeroes = [0, 1, 2, 5, 7]; // chuẩn chung vòng 2: khớp V hero_ids [0,1,2] + extra [5,7]
    gameState.combo = 0; gameState.comboTimer = 0; gameState.rage = 0;
    gameState.autoBattle = false; gameState.battleSpeed = 1; gameState.battlePaused = false;
    gameState.pvpPoints = 0; gameState.pvpWins = 0; gameState.pvpLosses = 0; gameState.pvpDailyDate = '';
    gameState.raidWins = 0; gameState.raidLosses = 0;

    // --- PvP: 8 doi thu goc tu pvp.v (ten / title / power / rank) ---
    var PVP_OPPONENTS = [
      { rank: 1000, name: 'Tân Thủ Luyện Kiếm', title: 'Mới vào giang hồ', power: 80 },
      { rank: 800, name: 'Đệ Tử Ngoại Môn', title: 'Luyện khí sơ kỳ', power: 150 },
      { rank: 600, name: 'Đệ Tử Nội Môn', title: 'Trúc Cơ sơ kỳ', power: 260 },
      { rank: 400, name: 'Chân Truyền Đệ Tử', title: 'Kim Đan sơ kỳ', power: 420 },
      { rank: 200, name: 'Trưởng Lão Ngoại Môn', title: 'Nguyên Anh sơ kỳ', power: 650 },
      { rank: 100, name: 'Trưởng Lão Nội Môn', title: 'Hóa Thần sơ kỳ', power: 900 },
      { rank: 50, name: 'Chưởng Môn Kế Vị', title: 'Hóa Thần hậu kỳ', power: 1200 },
      { rank: 10, name: 'Võ Lâm Minh Chủ', title: 'Đăng Tiên Cảnh', power: 1600 }
    ];
    var WORLD_BOSS = { name: 'Thiên Ma Tôn Chủ', openHour: 20, closeHour: 21, maxHp: 200000, rewardGold: 5000, rewardStone: 50 };
    function pvpRankFromPoints(pts) { return Math.max(1, 1000 - Math.floor(pts / 10)); }
    function worldBossIsOpen(hour) { return hour >= 0 && hour <= 23 && hour >= WORLD_BOSS.openHour && hour < WORLD_BOSS.closeHour; }
    function worldBossReward(damage) {
      if (damage >= 20000) return WORLD_BOSS.rewardGold;
      if (damage >= 10000) return WORLD_BOSS.rewardGold / 2;
      if (damage >= 2000) return WORLD_BOSS.rewardGold / 5;
      return 0;
    }

    // --- Tong chi so trang bi: goc + cuong hoa (+8%/cap, equipment.v) + ngoc ---
    function equipBonus() {
      var t = { atk: 0, hp: 0, def: 0, crit: 0 };
      Object.keys(gameState.equipment).forEach(function (slot) {
        var id = gameState.equipment[slot]; if (!id || !ITEMS[id]) return;
        var lv = (gameState.enhanceLevels && gameState.enhanceLevels[slot]) || 0;
        var d = ITEMS[id];
        t.atk += Math.floor((d.atk || 0) * lv * 8 / 100);
        t.hp += Math.floor((d.hp || 0) * lv * 8 / 100);
        t.def += Math.floor((d.def || 0) * lv * 8 / 100);
        var gm = gameState.gemSlots && gameState.gemSlots[slot];
        if (gm && ITEMS[gm]) { t.atk += ITEMS[gm].atk || 0; t.hp += ITEMS[gm].hp || 0; t.def += ITEMS[gm].def || 0; t.crit += ITEMS[gm].crit || 0; }
      });
      return t;
    }
    function equipTotals() {
      var t = equipBonus();
      Object.keys(gameState.equipment).forEach(function (slot) {
        var id = gameState.equipment[slot]; if (!id || !ITEMS[id]) return;
        t.atk += ITEMS[id].atk || 0; t.hp += ITEMS[id].hp || 0; t.def += ITEMS[id].def || 0;
      });
      return t;
    }
    function pvpPower() {
      var sec = sectDef();
      return gameState.attackPower + gameState.level * 5 + equipTotals().atk + petDamage() + (sec ? sec.atk : 0);
    }

    // --- Nhat ky sat thuong (gi nhat 50 dong, cuon duoc) ---
    var dmgLogLines = [];
    function addDmgLog(text) {
      var now = new Date();
      var ts = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
      dmgLogLines.push(ts + ' ' + text);
      if (dmgLogLines.length > 50) dmgLogLines.shift();
      var el = document.getElementById('dmg-log-body');
      if (el) { el.innerHTML = dmgLogLines.map(function (l) { return '<div class="g1-log-line">' + escHtml(l) + '</div>'; }).join(''); el.scrollTop = el.scrollHeight; }
    }
    function toggleDmgLog() { var el = document.getElementById('dmg-log'); if (el) el.classList.toggle('hidden'); }

    // --- Combo + No khi: boc damageEnemy goc (khong sua than ham cu) ---
    var _g1LastAttacker = 'Bạn';
    var _g1DamageEnemyOrig = damageEnemy;
    damageEnemy = function (enemy, rawDamage, knockForce, isSkill) {
      var before = enemy ? enemy.hp : 0;
      _g1DamageEnemyOrig(enemy, rawDamage, knockForce, isSkill);
      var dealt = Math.max(0, before - (enemy ? enemy.hp : 0));
      if (dealt > 0) {
        gameState.combo = (gameState.combo || 0) + 1;
        gameState.comboTimer = 3;
        gameState.rage = Math.min(100, (gameState.rage || 0) + (isSkill ? 12 : 8));
        addDmgLog(_g1LastAttacker + ' -' + dealt + ' ' + (enemy && enemy.isBoss ? 'Boss' : 'quái'));
        updateComboUI();
      }
    };
    function updateComboUI() {
      var c = document.getElementById('combo-text'); if (c) c.textContent = 'Combo x' + (gameState.combo || 0);
      var r = document.getElementById('rage-fill'); if (r) r.style.width = (gameState.rage || 0) + '%';
      var rt = document.getElementById('rage-text'); if (rt) rt.textContent = 'Nộ ' + (gameState.rage || 0) + '/100';
      var b = document.getElementById('btn-rage');
      if (b) { b.disabled = (gameState.rage || 0) < 100; b.textContent = (gameState.rage || 0) >= 100 ? '🔥 Nộ Trảm — SẴN SÀNG!' : '🔥 Nộ Trảm (' + (gameState.rage || 0) + '/100)'; }
    }
    function castRageSkill() {
      if ((gameState.rage || 0) < 100) { showSystemBanner('Nộ khí chưa đầy! Đánh trúng để tích nộ (đang ' + (gameState.rage || 0) + '/100).'); return; }
      var target = findNearestEnemy(16); if (!target) { showSystemBanner('Không có quái gần đây để dùng Nộ Trảm!'); return; }
      var dmg = gameState.attackPower * 4 + (gameState.combo || 0) * 10;
      createGoldenWhirlwindVFX(player.root.position, 6, 0.7);
      _g1LastAttacker = 'Bạn (Nộ Trảm)';
      enemies.slice().forEach(function (e) { if (player.root.position.distanceTo(e.mesh.position) <= 6) damageEnemy(e, dmg, 10, true); });
      _g1LastAttacker = 'Bạn';
      // Tieu het no SAU khi gay sat thuong (don No Tram tu no lai cong no neu reset truoc).
      gameState.rage = 0; gameState.combo = 0; gameState.comboTimer = 0;
      addDmgLog('💥 Nộ Trảm! Công cơ bản ' + dmg + ' (x4 Công + 10/Combo) lên quái trong 6m.');
      updateComboUI(); saveGame(false);
    }

    // --- Auto-battle / Tam dung / Toc do / Bo qua ---
    function toggleAutoBattle() {
      gameState.autoBattle = !gameState.autoBattle;
      var b = document.getElementById('btn-auto');
      if (b) { b.textContent = gameState.autoBattle ? '🤖 Tự đánh: BẬT' : '🤖 Tự đánh: Tắt'; b.classList.toggle('green', gameState.autoBattle); }
      showSystemBanner(gameState.autoBattle ? 'Tự đánh BẬT: đội tự tìm quái, dùng skill, uống đan khi HP thấp.' : 'Tự đánh TẮT: bạn điều khiển tay hoàn toàn.');
      saveGame(false);
    }
    function togglePause() {
      gameState.battlePaused = !gameState.battlePaused;
      var b = document.getElementById('btn-pause');
      if (b) { b.textContent = gameState.battlePaused ? '▶ Tiếp tục' : '⏸ Tạm dừng'; b.classList.toggle('green', gameState.battlePaused); }
      showSystemBanner(gameState.battlePaused ? 'Đã tạm dừng trận đấu.' : 'Tiếp tục trận đấu.');
    }
    function toggleSpeed() {
      gameState.battleSpeed = (gameState.battleSpeed === 1) ? 2 : 1;
      var b = document.getElementById('btn-speed'); if (b) b.textContent = '⚡ Tốc độ x' + gameState.battleSpeed;
      showSystemBanner('Tốc độ battle: x' + gameState.battleSpeed + '.');
    }
    function skipBattle() {
      if (raid.active) { resolveRaidSkip(); return; }
      var normals = enemies.filter(function (e) { return !e.isBoss; });
      if (!normals.length) { showSystemBanner('Không có quái thường để bỏ qua (Boss phải đánh tay)!'); return; }
      var n = normals.length;
      normals.slice().forEach(function (e) { killEnemy(e); });
      addDmgLog('⏭ Bỏ qua trận: hạ ' + n + ' quái thường.');
      showSystemBanner('Đã bỏ qua trận: hạ ' + n + ' quái thường (nhận đủ EXP/vàng/rơi đồ như đánh tay).');
      saveGame(false);
    }
    function autoBattleTick() {
      if (!gameState.autoBattle || gameState.battlePaused || gameState.townMode) return;
      if (gameState.hp < gameState.maxHp * 0.25 && countItem('hp_pill') > 0) useConsumable('hp'); // chuẩn chung vòng 2: ngưỡng 25% như V (s.hp < s.max_hp / 4)
      if (gameState.mp < gameState.maxMp * 0.25 && countItem('mp_pill') > 0) useConsumable('mp');
      if (gameState.hp < gameState.maxHp * 0.4 && gameState.mp >= 35 && skills[4].currentCd <= 0) { castSkill(4); return; }
      var target = findNearestEnemy(20);
      if (!target) return;
      var d = player.root.position.distanceTo(target.mesh.position);
      if (d > 3.2) { gameState.targetPos = target.mesh.position.clone(); return; }
      if (gameState.mp >= 50 && skills[5].currentCd <= 0) castSkill(5);
      else if (gameState.mp >= 30 && skills[2].currentCd <= 0) castSkill(2);
      else if (gameState.mp >= 25 && skills[3].currentCd <= 0) castSkill(3);
      else if (gameState.mp >= 15 && skills[1].currentCd <= 0) castSkill(1);
      else castSkill(0);
    }

    // --- Doi hinh 5 nguoi: dong doi tren map + tran hinh 3 hang ---
    var allies = [];
    var selectedPartySlot = 1;
    function partyHeroAt(slot) { return heroDefG1(gameState.partyHeroes[slot]); }
    function allyMaxHp(hero) { return Math.round(120 * hero.hpMult + gameState.level * 10); }
    function createAllyMesh(hero) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.85, 10), new THREE.MeshStandardMaterial({ color: hero.tint, roughness: 0.7 }));
      body.position.y = 0.75; body.castShadow = true; g.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf7cfb4, roughness: 0.6 }));
      head.position.y = 1.45; g.add(head);
      var sword = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.22), new THREE.MeshStandardMaterial({ color: hero.blade, metalness: 0.6, roughness: 0.35, emissive: hero.blade, emissiveIntensity: 0.25 }));
      sword.position.set(0.5, 0.9, 0.15); sword.rotation.x = 0.5; g.add(sword);
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 24), new THREE.MeshBasicMaterial({ color: hero.blade, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      g.scale.setScalar(0.92);
      return g;
    }
    function buildAllies() {
      allies.forEach(function (a) { if (a.mesh) scene.remove(a.mesh); });
      allies = [];
      for (var slot = 1; slot <= 4; slot++) {
        var hero = partyHeroAt(slot);
        var mesh = createAllyMesh(hero);
        mesh.position.copy(player.root.position).add(new THREE.Vector3(slot * 1.5 - 3, 0, 2));
        scene.add(mesh);
        allies.push({ slot: slot, hero: hero, mesh: mesh, hp: allyMaxHp(hero), maxHp: allyMaxHp(hero), cd: 0.4 + slot * 0.3, healCd: 0, down: false });
      }
    }
    function formationOffset(slot) {
      if (slot === 1) return { f: 2.4, r: 0 };
      if (slot === 2) return { f: 0.6, r: -1.9 };
      if (slot === 3) return { f: 0.6, r: 1.9 };
      return { f: -2.2, r: 0 };
    }
    function findNearestEnemyFrom(pos, maxRange) {
      var best = null, bestD = maxRange;
      enemies.forEach(function (e) { var d = pos.distanceTo(e.mesh.position); if (d < bestD) { bestD = d; best = e; } });
      return best;
    }
    function lowestHpAllyOrHero() {
      var worst = null, worstRatio = 0.55;
      if (gameState.hp / gameState.maxHp < worstRatio) { worst = { isHero: true }; worstRatio = gameState.hp / gameState.maxHp; }
      allies.forEach(function (a) {
        var ratio = a.hp / a.maxHp;
        if (ratio < worstRatio) { worst = { isHero: false, ally: a }; worstRatio = ratio; }
      });
      return worst;
    }
    function applyAllyDamage(a, dmg) {
      a.hp = Math.max(0, a.hp - dmg);
      spawnFloatingText(a.mesh.position, '-' + dmg, 'dmg-normal');
      if (a.hp <= 0 && !a.down) { a.down = true; a.mesh.visible = false; addDmgLog('💔 ' + a.hero.name + ' đã ngã! Healer sẽ hồi sinh.'); }
    }
    function alliesTick(dt) {
      if (!allies.length || gameState.battlePaused) return;
      var ry = player.root.rotation.y;
      var fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
      allies.forEach(function (a) {
        if (!a.mesh) return;
        var off = formationOffset(a.slot);
        var tx = player.root.position.x + fx * off.f + rx * off.r;
        var tz = player.root.position.z + fz * off.f + rz * off.r;
        a.mesh.position.x += (tx - a.mesh.position.x) * Math.min(1, dt * 5);
        a.mesh.position.z += (tz - a.mesh.position.z) * Math.min(1, dt * 5);
        a.cd -= dt; a.healCd -= dt;
        if (a.down) return;
        if (a.hero.role === 'healer' && a.healCd <= 0) {
          var target = lowestHpAllyOrHero();
          if (target) {
            a.healCd = 3;
            var amt = 25 + gameState.level * 3;
            if (target.isHero) { gameState.hp = Math.min(gameState.maxHp, gameState.hp + amt); spawnFloatingText(player.root.position, '+' + amt + ' HP', 'dmg-heal'); }
            else { target.ally.hp = Math.min(target.ally.maxHp, target.ally.hp + amt); if (target.ally.down) { target.ally.down = false; target.ally.mesh.visible = true; } spawnFloatingText(target.ally.mesh.position, '+' + amt + ' HP', 'dmg-heal'); }
            addDmgLog('💚 ' + a.hero.name + ' hồi ' + amt + ' HP cho ' + (target.isHero ? 'Quỷ Cốc' : target.ally.hero.name) + '.');
          }
        }
        if (gameState.townMode) return;
        var foe = findNearestEnemyFrom(a.mesh.position, 3.6);
        if (foe && a.cd <= 0) {
          a.cd = 1.15;
          var dmg = Math.max(1, Math.round(gameState.attackPower * a.hero.atkMult * 0.55));
          _g1LastAttacker = a.hero.name;
          damageEnemy(foe, dmg, 4, false);
          _g1LastAttacker = 'Bạn';
        }
      });
    }
    function renderTeam() {
      var body = document.getElementById('team-body'); if (!body) return;
      var h = '<p class="text-[12px] mb-2">Đội hình <b>5 người</b> (đội trưởng Quỷ Cốc + 4 đồng đội). Bấm 1 ô rồi bấm ô khác để <b>đổi chỗ</b>; bấm <b>Vào đội</b> trong danh sách để đổi thành viên vào ô đang chọn. Tank đứng hàng trước, DPS hàng giữa, Hồi máu/Hỗ trợ hàng sau. Đồng đội tự đánh cùng bạn trên map (sát thương = Công x hệ số x 0.55, theo team.v).</p>';
      h += '<h3 style="font-size:13px">Đội hình ra trận</h3><div class="mvl-grid">';
      for (var slot = 0; slot <= 4; slot++) {
        var hero = partyHeroAt(slot);
        h += '<div class="mvl-item" style="' + (selectedPartySlot === slot ? 'border-color:#ffe082;background:rgba(255,213,79,.12)' : '') + '"><span class="ic">' + (slot === 0 ? '👑' : '🧑') + '</span><span class="nm">' + hero.name + '</span><div style="font-size:11px">' + ROLE_NAMES[hero.role] + ' • ' + ROW_NAMES[heroRow(hero)] + '<br>' + hero.title + (slot === 0 ? '<br><b>Đội trưởng</b>' : '') + '</div>' +
          '<button class="mvl-btn" style="min-height:44px;margin-top:4px;font-size:12px" onclick="selectPartySlot(' + slot + ')">' + (selectedPartySlot === slot ? '✓ Đang chọn' : 'Chọn ô này') + '</button></div>';
      }
      h += '</div><h3 style="font-size:13px;margin-top:8px">Danh sách 8 anh hùng (content.v)</h3>';
      HEROES.forEach(function (hero) {
        var inParty = gameState.partyHeroes.indexOf(hero.id) >= 0;
        h += '<div class="mvl-row"><div class="t"><b>' + hero.name + '</b><div class="sub">' + hero.title + ' • ' + ROLE_NAMES[hero.role] + ' • Công x' + hero.atkMult + ', HP x' + hero.hpMult + (inParty ? ' • <b style="color:#8ce99a">Đang trong đội</b>' : '') + '</div></div>' +
          '<button class="mvl-btn" onclick="assignHeroToSlot(' + hero.id + ')">Vào đội</button></div>';
      });
      body.innerHTML = h;
    }
    function selectPartySlot(slot) {
      if (selectedPartySlot === slot || slot === 0 || selectedPartySlot === 0) { selectedPartySlot = slot; renderTeam(); return; }
      var a = gameState.partyHeroes[selectedPartySlot], b = gameState.partyHeroes[slot];
      gameState.partyHeroes[selectedPartySlot] = b; gameState.partyHeroes[slot] = a;
      selectedPartySlot = slot;
      buildAllies(); renderTeam(); saveGame(false);
      showSystemBanner('Đã đổi chỗ: ' + heroDefG1(b).name + ' ↔ ' + heroDefG1(a).name + '.');
    }
    function assignHeroToSlot(heroId) {
      var slot = selectedPartySlot;
      if (slot === 0) { showSystemBanner('Đội trưởng luôn là Quỷ Cốc — hãy chọn ô 2-5 để đổi thành viên!'); return; }
      var cur = gameState.partyHeroes[slot];
      if (cur === heroId) { showSystemBanner(heroDefG1(heroId).name + ' đã ở ô này rồi!'); return; }
      var other = gameState.partyHeroes.indexOf(heroId);
      if (other >= 0) gameState.partyHeroes[other] = cur;
      gameState.partyHeroes[slot] = heroId;
      buildAllies(); renderTeam(); saveGame(false);
      showSystemBanner(heroDefG1(heroId).name + ' đã vào đội hình (' + ROW_NAMES[heroRow(heroDefG1(heroId))] + ')!');
    }

    // --- Boss Raid: Kim Thiem Vuong 3 phase (kieu anh boss Coc Xanh) ---
    var raid = { active: false, boss: null, phase: 1, timeLeft: 120, aoeTimer: 3, aoePending: null };
    var raidAoeMesh = null;
    function startRaid() {
      if (raid.active) { showSystemBanner('Raid Kim Thiềm Vương đang diễn ra!'); return; }
      if (gameState.townMode) { showSystemBanner('Hãy ra khỏi thị trấn trước khi đánh Raid!'); return; }
      closePanels();
      var boss = create3DMonster('boss');
      boss.mesh.scale.setScalar(3.2);
      boss.hp = boss.maxHp = 20000;
      boss.damage = 30; boss.speed = 2.0;
      raid = { active: true, boss: boss, phase: 1, timeLeft: 120, aoeTimer: 3, aoePending: null };
      var bar = document.getElementById('raid-bar'); if (bar) bar.classList.remove('hidden');
      showSystemBanner('🐸 RAID: Kim Thiềm Vương khổng lồ xuất hiện! Hạ trong 120 giây!');
      addDmgLog('🐸 Raid bắt đầu: Kim Thiềm Vương HP 20000 (3 phase, đổi ở 66% / 33%).');
      updateRaidBar(); saveGame(false);
    }
    function updateRaidBar() {
      if (!raid.active || !raid.boss) return;
      var pct = Math.max(0, raid.boss.hp / raid.boss.maxHp * 100);
      var bar = document.getElementById('raid-hp-bar'); if (bar) bar.style.width = pct + '%';
      var t = document.getElementById('raid-hp-text'); if (t) t.textContent = fmt(Math.max(0, raid.boss.hp)) + ' / ' + fmt(raid.boss.maxHp) + ' HP';
      var p = document.getElementById('raid-phase'); if (p) p.textContent = 'Phase ' + raid.phase + '/3';
      var tm = document.getElementById('raid-timer'); if (tm) tm.textContent = '⏱ ' + Math.max(0, Math.ceil(raid.timeLeft)) + 's';
    }
    function raidSpawnMinions(n) {
      for (var i = 0; i < n; i++) { var m = create3DMonster('ghoul'); m.hp = m.maxHp = 300; }
      showSystemBanner('🐸 Kim Thiềm Vương gọi ' + n + ' cóc con! (Phase ' + raid.phase + ')');
      addDmgLog('🐸 Boss gọi ' + n + ' cóc con (Phase ' + raid.phase + ').');
    }
    function raidStartAoe() {
      if (!raid.boss || !raid.boss.mesh) return;
      var mat = new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
      var mesh = new THREE.Mesh(new THREE.RingGeometry(0.5, 5.5, 40), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(raid.boss.mesh.position.x, 0.12, raid.boss.mesh.position.z);
      scene.add(mesh); raidAoeMesh = mesh;
      raid.aoePending = { x: mesh.position.x, z: mesh.position.z, t: 1.2 };
      showSystemBanner('⚠️ Vòng đỏ AoE! Chạy ra ngoài vòng đỏ trong 1,2 giây!');
    }
    function raidDetonateAoe() {
      var p = raid.aoePending; raid.aoePending = null;
      if (raidAoeMesh) { scene.remove(raidAoeMesh); raidAoeMesh = null; }
      raid.aoeTimer = raid.phase >= 3 ? 2.5 : 4;
      var dx = player.root.position.x - p.x, dz = player.root.position.z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < 5.5) {
        var dmg = 90;
        gameState.hp = Math.max(15, gameState.hp - dmg);
        spawnFloatingText(player.root.position, '-' + dmg + ' (AoE)', 'dmg-normal');
        addDmgLog('🔴 Bạn trúng AoE của Boss -' + dmg + ' HP (đứng trong vòng đỏ).');
      } else { addDmgLog('🔴 Bạn né được AoE của Boss (đứng ngoài vòng đỏ).'); }
      allies.forEach(function (a) {
        if (a.down || !a.mesh) return;
        var ax = a.mesh.position.x - p.x, az = a.mesh.position.z - p.z;
        if (Math.sqrt(ax * ax + az * az) < 5.5) applyAllyDamage(a, 90); // chuẩn chung vòng 3: AoE 90 dmg cố định, như hero
      });
    }
    function raidTick(dt) {
      if (!raid.active || !raid.boss) return;
      if (gameState.battlePaused) return;
      raid.timeLeft -= dt;
      var ratio = raid.boss.hp / raid.boss.maxHp;
      if (raid.phase === 1 && ratio <= 0.66) { raid.phase = 2; raidSpawnMinions(3); } // chuẩn chung vòng 2: mỗi lần đổi phase gọi 3 con, như V
      else if (raid.phase === 2 && ratio <= 0.33) { raid.phase = 3; raidSpawnMinions(3); }
      if (raid.aoePending) {
        raid.aoePending.t -= dt;
        if (raid.aoePending.t <= 0) raidDetonateAoe();
      } else {
        raid.aoeTimer -= dt;
        if (raid.aoeTimer <= 0) raidStartAoe();
      }
      updateRaidBar();
      if (enemies.indexOf(raid.boss) < 0) { endRaid(true); return; }
      if (raid.timeLeft <= 0) endRaid(false);
    }
    function endRaid(won) {
      var boss = raid.boss;
      if (boss) { var idx = enemies.indexOf(boss); if (idx >= 0) enemies.splice(idx, 1); if (boss.mesh) scene.remove(boss.mesh); }
      if (raidAoeMesh) { scene.remove(raidAoeMesh); raidAoeMesh = null; }
      raid.active = false; raid.boss = null; raid.aoePending = null;
      var bar = document.getElementById('raid-bar'); if (bar) bar.classList.add('hidden');
      if (won) {
        gameState.raidWins++;
        addGold(800); gameState.exp += 300;
        var equips = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].type === 'equip'; });
        var drop = equips[Math.floor(Math.random() * equips.length)];
        addItem(drop, 1);
        var gems = ['hong_ngoc', 'luc_ngoc', 'lam_ngoc', 'tu_ngoc', 'kim_ngoc', 'huyet_ngoc'];
        var gem = gems[Math.floor(Math.random() * gems.length)];
        addItem(gem, 1);
        if (gameState.exp >= gameState.maxExp) levelUp();
        addDmgLog('🏆 Thắng Raid! +800 vàng, +300 EXP, rơi ' + ITEMS[drop].name + ' + ' + ITEMS[gem].name + '.');
        showSystemBanner('🏆 HẠ KIM THIỀM VƯƠNG! +800 vàng, +300 EXP, rơi ' + ITEMS[drop].name + ' + ' + ITEMS[gem].name + '!');
      } else {
        gameState.raidLosses++;
        addDmgLog('💀 Raid thất bại (hết giờ / rời trận).');
        showSystemBanner('Raid thất bại! Kim Thiềm Vương vẫn còn đó — đánh lại nào!');
      }
      renderBag(); saveGame(false);
    }
    function leaveRaid() { if (!raid.active) return; endRaid(false); }
    function resolveRaidSkip() {
      if (!raid.active || !raid.boss) return;
      var power = gameState.attackPower + petDamage() + allies.filter(function (a) { return !a.down; }).length * 30;
      var est = power * 60;
      var bossHp = raid.boss.hp;
      showSystemBanner(est >= bossHp ? 'Bỏ qua trận: đội đủ mạnh, tự động thắng Raid!' : 'Bỏ qua trận: đội chưa đủ mạnh, Raid thất bại!');
      endRaid(est >= bossHp);
    }

Object.assign(window.QC, { HEROES, ROLE_NAMES, ROW_NAMES, PVP_OPPONENTS, WORLD_BOSS, pvpRankFromPoints, worldBossIsOpen, worldBossReward, equipBonus, equipTotals, pvpPower, addDmgLog, toggleDmgLog, updateComboUI, castRageSkill, toggleAutoBattle, togglePause, toggleSpeed, skipBattle, autoBattleTick, buildAllies, alliesTick, renderTeam, raid, startRaid, raidTick, endRaid, damageEnemy });
