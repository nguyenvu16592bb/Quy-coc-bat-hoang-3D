// ============================================================
// Quỷ Cốc Bát Hoang 3D — 05-ui.js
// 05-ui: §8 Input + §9 Minimap/HUD + §10 Animate loop (dong goc 1969-2430) + §12 PvP render/fight + masterTick/initG1 + window.onload (dong goc 3643-3739).
// Noi dung goc giu byte-identical; chi them dong window.QC o dau
// va dong Object.assign(window.QC, ...) o cuoi (khong doi ten bien/ham,
// khong doi thu tu cau lenh goc). Nap bang <script src> thuong, KHONG
// dung ES module (tranh loi CORS tren GitHub Pages / file://).
// ============================================================
window.QC = window.QC || {}; // Nhom 1 vong 3: namespace chung giua cac module (script thuong chia se global scope).
/* [05-ui] Chu thich: §8-§10 von chay truoc §11/§12 trong file goc, nay nap sau cung (05) — an toan tai load: §8-§10 chi dang ky listener + khai bao ham, khong goi ham §11/§12 o top-level; animate() chi chay tu window.onload sau khi tat ca module da nap. Ham PvP render (3643-3711) dat o day vi trong file goc no nam giua enhance/gem va boot code — giu dung thu tu thuc thi goc. */
    // ==========================================
    // 8. INPUT HANDLING (WASD, CLICK-TO-MOVE, 3D ORBIT & ZOOM)
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      keysPressed[k] = true;

      if (k === ' ') {
        e.preventDefault();
        castSkill(0);
      } else if (k >= '1' && k <= '6') {
        castSkill(parseInt(k, 10));
      } else if (k === 'r') {
        useConsumable('hp');
      }
    });

    window.addEventListener('keyup', (e) => {
      keysPressed[e.key.toLowerCase()] = false;
    });

    // Mouse Click-to-Move / Attack & Right-Click 3D Camera Orbit
    let isOrbiting = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

    canvasEl.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1) {
        isOrbiting = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
      }

      if (e.button === 0) {
        // Vong 3 (guard): panel MVL nao dang mo thi click thuoc ve panel, khong di chuyen.
        if (typeof currentPanel !== 'undefined' && currentPanel) return;
        const rect = canvasEl.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);

        // Check if clicked on a town NPC first
        if (typeof npcMeshes !== 'undefined' && npcMeshes.length) {
          const npcHits = raycaster.intersectObjects(npcMeshes, true);
          if (npcHits.length > 0) {
            let o = npcHits[0].object;
            while (o.parent && !npcMeshes.includes(o)) o = o.parent;
            const npc = npcMeshes.find(n => n === o);
            if (npc && npc.userData && npc.userData.npcId) { talkToNpc(npc.userData.npcId); return; }
          }
        }
        // Check if clicked on an enemy first
        const enemyMeshes = enemies.map(en => en.mesh);
        const hits = raycaster.intersectObjects(enemyMeshes, true);
        if (hits.length > 0) {
          let hitObj = hits[0].object;
          while (hitObj.parent && !enemyMeshes.includes(hitObj)) {
            hitObj = hitObj.parent;
          }
          const clickedEnemy = enemies.find(en => en.mesh === hitObj);
          if (clickedEnemy) {
            const dist = player.root.position.distanceTo(clickedEnemy.mesh.position);
            if (dist <= 3.6) {
              castSkill(0);
            } else {
              gameState.targetPos = clickedEnemy.mesh.position.clone();
              moveMarker.position.set(gameState.targetPos.x, 0.05, gameState.targetPos.z);
              moveMarker.visible = true;
            }
            return;
          }
        }

        // Otherwise move to 3D ground coordinate
        const hitPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          const maxR = ARENA_RADIUS - 1.8;
          if (hitPoint.length() > maxR) {
            hitPoint.normalize().multiplyScalar(maxR);
          }
          gameState.targetPos = hitPoint.clone();
          moveMarker.position.set(hitPoint.x, 0.05, hitPoint.z);
          moveMarker.visible = true;
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isOrbiting) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      gameState.cameraYaw -= dx * 0.0075;
      gameState.cameraPitch = Math.max(0.35, Math.min(1.22, gameState.cameraPitch + dy * 0.0055));
    });

    window.addEventListener('mouseup', () => {
      isOrbiting = false;
    });

    // Mouse Wheel Zoom (20% - 85%, default 35%)
    canvasEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -3 : 3;
      gameState.zoomPercent = Math.max(20, Math.min(85, gameState.zoomPercent + delta));
      document.getElementById('hud-zoom-val').textContent = `${gameState.zoomPercent}%`;
    }, { passive: false });

    // Touch support for mobile devices
    canvasEl.addEventListener('touchstart', (e) => {
      // Vong 3 (guard): panel MVL nao dang mo thi cham thuoc ve panel, khong di chuyen.
      if (typeof currentPanel !== 'undefined' && currentPanel) return;
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvasEl.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((touch.clientX - rect.left) / rect.width) * 2 - 1,
          -((touch.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(ndc, camera);
        const hitPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          const maxR = ARENA_RADIUS - 1.8;
          if (hitPoint.length() > maxR) hitPoint.normalize().multiplyScalar(maxR);
          gameState.targetPos = hitPoint.clone();
          moveMarker.position.set(hitPoint.x, 0.05, hitPoint.z);
          moveMarker.visible = true;
        }
      }
    }, { passive: true });

    // ==========================================
    // 9. MINIMAP RENDERING & HUD SYNC
    // ==========================================
    function renderMinimap() {
      const w = minimapCanvas.width;
      const h = minimapCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = (w * 0.44) / ARENA_RADIUS;

      minimapCtx.clearRect(0, 0, w, h);

      // Arena terrain circle
      minimapCtx.fillStyle = '#1b3838';
      minimapCtx.beginPath();
      minimapCtx.arc(cx, cy, ARENA_RADIUS * scale, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = '#6c8c89';
      minimapCtx.lineWidth = 2;
      minimapCtx.stroke();

      // Magic Portals (Purple dots)
      portals.forEach(p => {
        minimapCtx.fillStyle = '#c084fc';
        minimapCtx.beginPath();
        minimapCtx.arc(cx + p.group.position.x * scale, cy + p.group.position.z * scale, 3.5, 0, Math.PI * 2);
        minimapCtx.fill();
      });

      // Enemies (Red dots, larger for Boss)
      enemies.forEach(e => {
        minimapCtx.fillStyle = e.isBoss ? '#ff922b' : '#ff4d4f';
        minimapCtx.beginPath();
        minimapCtx.arc(
          cx + e.mesh.position.x * scale,
          cy + e.mesh.position.z * scale,
          e.isBoss ? 4.5 : 2.5,
          0,
          Math.PI * 2
        );
        minimapCtx.fill();
      });

      // Player Triangle Arrow
      const px = cx + player.root.position.x * scale;
      const pz = cy + player.root.position.z * scale;
      minimapCtx.save();
      minimapCtx.translate(px, pz);
      minimapCtx.rotate(-player.root.rotation.y + Math.PI);
      minimapCtx.fillStyle = '#51cf66';
      minimapCtx.beginPath();
      minimapCtx.moveTo(0, -5);
      minimapCtx.lineTo(4, 4);
      minimapCtx.lineTo(-4, 4);
      minimapCtx.closePath();
      minimapCtx.fill();
      minimapCtx.restore();
    }

    function updateHUD() {
      // Regenerate MP passively
      gameState.mp = Math.min(gameState.maxMp, gameState.mp + 0.14);

      const hpPct = Math.max(0, (gameState.hp / gameState.maxHp) * 100);
      const mpPct = Math.max(0, (gameState.mp / gameState.maxMp) * 100);

      document.getElementById('hud-hp-bar').style.width = `${hpPct}%`;
      document.getElementById('hud-hp-text').textContent = `${Math.ceil(gameState.hp)}/${gameState.maxHp}`;
      document.getElementById('hud-mp-bar').style.width = `${mpPct}%`;
      document.getElementById('hud-mp-text').textContent = `${Math.floor(gameState.mp)}/${gameState.maxMp}`;

      // Skill Cooldown Overlays
      skills.forEach((sk, idx) => {
        const cdEl = document.getElementById(`cd-${idx}`);
        if (!cdEl) return;
        if (sk.currentCd > 0) {
          cdEl.classList.remove('hidden');
          cdEl.textContent = sk.currentCd.toFixed(1);
        } else {
          cdEl.classList.add('hidden');
        }
      });
    }

    // ==========================================
    // 10. MAIN 3D ANIMATION & GAME LOOP
    // ==========================================
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      if (gameState.battlePaused) { renderer.render(scene, camera); return; }
      const dt = Math.min(clock.getDelta(), 0.05) * (gameState.battleSpeed || 1);
      const elapsed = clock.getElapsedTime();

      // Update skill cooldowns & buffs
      skills.forEach(sk => {
        if (sk.currentCd > 0) sk.currentCd = Math.max(0, sk.currentCd - dt);
      });
      if (gameState.auraTimer > 0) {
        gameState.auraTimer -= dt;
        if (gameState.auraTimer <= 0) {
          document.getElementById('buff-aura-icon').classList.add('hidden');
        }
      }
      if (gameState.rageTimer > 0) gameState.rageTimer -= dt;

      // Camera Q/E keyboard rotation
      if (keysPressed['q']) gameState.cameraYaw += dt * 1.8;
      if (keysPressed['e']) gameState.cameraYaw -= dt * 1.8;

      // Player Movement (WASD / Arrows relative to Isometric Camera Yaw)
      const moveInput = new THREE.Vector3();
      if (keysPressed['w'] || keysPressed['arrowup']) moveInput.z -= 1;
      if (keysPressed['s'] || keysPressed['arrowdown']) moveInput.z += 1;
      if (keysPressed['a'] || keysPressed['arrowleft']) moveInput.x -= 1;
      if (keysPressed['d'] || keysPressed['arrowright']) moveInput.x += 1;

      let isMoving = false;
      // Vong 3: toc do that cua toa ky (gameState.mountSpeedMult, js/06-expand.js); mac dinh 1.
      const moveSpeed = (gameState.auraTimer > 0 ? 8.8 : 7.0) * (gameState.mountSpeedMult || 1);

      if (moveInput.lengthSq() > 0) {
        gameState.targetPos = null;
        moveMarker.visible = false;
        moveInput.normalize();

        // Rotate input vector by camera yaw
        const camForward = new THREE.Vector3(-Math.sin(gameState.cameraYaw), 0, -Math.cos(gameState.cameraYaw));
        const camRight = new THREE.Vector3(Math.cos(gameState.cameraYaw), 0, -Math.sin(gameState.cameraYaw));
        const worldDir = new THREE.Vector3()
          .addScaledVector(camForward, -moveInput.z)
          .addScaledVector(camRight, moveInput.x)
          .normalize();

        player.root.position.addScaledVector(worldDir, moveSpeed * dt);
        player.root.rotation.y = Math.atan2(worldDir.x, worldDir.z);
        isMoving = true;
      } else if (gameState.targetPos) {
        const toTarget = new THREE.Vector3().subVectors(gameState.targetPos, player.root.position);
        toTarget.y = 0;
        const dist = toTarget.length();
        if (dist > 0.25) {
          toTarget.normalize();
          player.root.position.addScaledVector(toTarget, moveSpeed * dt);
          player.root.rotation.y = Math.atan2(toTarget.x, toTarget.z);
          isMoving = true;
        } else {
          gameState.targetPos = null;
          moveMarker.visible = false;
        }
      }

      // Clamp player inside floating mountain arena
      const maxArenaR = ARENA_RADIUS - 1.6;
      if (player.root.position.length() > maxArenaR) {
        player.root.position.normalize().multiplyScalar(maxArenaR);
      }

      // Auto-attack nearest enemy in melee range if idle
      gameState.autoAttackCooldown -= dt;
      if (!gameState.townMode && !isMoving && gameState.attackAnimTimer <= 0 && gameState.spinAnimTimer <= 0 && gameState.autoAttackCooldown <= 0) {
        const nearEnemy = findNearestEnemy(3.2);
        if (nearEnemy) {
          castSkill(0);
          gameState.autoAttackCooldown = 0.85;
        }
      }

      // --- ARTICULATED CHARACTER ANIMATIONS ---
      player.midRing.rotation.z = elapsed * 1.4;
      player.innerRing.rotation.z = -elapsed * 2.1;
      player.ponytailGroup.rotation.x = Math.sin(elapsed * 5) * 0.08;

      if (gameState.spinAnimTimer > 0) {
        gameState.spinAnimTimer -= dt;
        player.bodyPivot.rotation.y += dt * 24;
        player.rightArm.rotation.x = -Math.PI / 2;
        if (gameState.spinAnimTimer <= 0) {
          player.bodyPivot.rotation.y = 0;
          player.holsterSword();
        }
      } else if (gameState.attackAnimTimer > 0) {
        gameState.attackAnimTimer -= dt;
        const swing = Math.sin((1 - gameState.attackAnimTimer / 0.4) * Math.PI);
        player.rightArm.rotation.x = -Math.PI * 0.75 + swing * 1.6;
        player.torsoGroup.rotation.y = (0.5 - swing) * 0.9;
        if (gameState.attackAnimTimer <= 0) {
          player.rightArm.rotation.x = 0;
          player.torsoGroup.rotation.y = 0;
          player.holsterSword();
        }
      } else if (isMoving) {
        const runCycle = elapsed * 13;
        player.leftLeg.rotation.x = Math.sin(runCycle) * 0.7;
        player.rightLeg.rotation.x = -Math.sin(runCycle) * 0.7;
        player.leftArm.rotation.x = -Math.sin(runCycle) * 0.55;
        player.rightArm.rotation.x = Math.sin(runCycle) * 0.55;
        player.bodyPivot.position.y = Math.abs(Math.cos(runCycle)) * 0.12;
      } else {
        // Breathing idle
        player.leftLeg.rotation.x = 0;
        player.rightLeg.rotation.x = 0;
        player.leftArm.rotation.x = 0;
        player.rightArm.rotation.x = 0;
        player.bodyPivot.position.y = Math.sin(elapsed * 3) * 0.035;
      }

      // --- UPDATE 3D MONSTERS AI & PHYSICS ---
      if (!gameState.townMode && enemies.length < 6 && Math.random() < 0.025) {
        create3DMonster(Math.random() > 0.4 ? 'demon' : 'ghoul');
      }

      for (const e of enemies) {
        // Hit flash decay
        if (e.hitFlash > 0) {
          e.hitFlash -= dt;
          if (e.hitFlash <= 0) e.bodyMat.emissive.setHex(0x000000);
        }

        // Knockback damping
        if (e.knockbackVel.lengthSq() > 0.01) {
          e.mesh.position.addScaledVector(e.knockbackVel, dt);
          e.knockbackVel.multiplyScalar(Math.pow(0.08, dt));
        }

        // Thi tran Song Ma: quai khong tan cong, dung yen
        if (gameState.townMode) { e.hpBarGroup.quaternion.copy(camera.quaternion); continue; }
        // Chase & Attack Player — Vong 3 (taunt): tank dang khieu khich thi quai
        // duoi theo tank (getTauntTargetPos, js/06-expand.js); khong co taunt thi
        // van duoi theo nguoi choi nhu cu.
        const chaseTarget = (typeof getTauntTargetPos === 'function' && getTauntTargetPos()) || player.root.position;
        const toPlayer = new THREE.Vector3().subVectors(chaseTarget, e.mesh.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        if (dist > (e.isBoss ? 2.5 : 1.75)) {
          toPlayer.normalize();
          e.mesh.position.addScaledVector(toPlayer, e.speed * dt);
          e.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
          e.mesh.position.y = Math.abs(Math.sin(elapsed * 8 + e.animPhase)) * 0.12;
        } else {
          e.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
          e.attackCd -= dt;
          if (e.attackCd <= 0) {
            e.attackCd = 1.6;
            // Vong 3 (taunt): don danh tay cua quai trung tank dang khieu khich.
            const tauntAlly = (typeof tauntTargetAlly === 'function') ? tauntTargetAlly() : null;
            if (tauntAlly) {
              applyAllyDamage(tauntAlly, e.damage);
            } else if (Math.random() < gameState.dodgeChance) {
              spawnFloatingText(player.root.position, 'Né tránh', 'dmg-dodge');
            } else {
              gameState.hp = Math.max(15, gameState.hp - e.damage);
              spawnFloatingText(player.root.position, `-${e.damage}`, 'dmg-normal');
            }
          }
        }

        // Keep enemies inside arena
        if (e.mesh.position.length() > maxArenaR) {
          e.mesh.position.normalize().multiplyScalar(maxArenaR);
        }

        // Billboard 3D HP bar toward camera
        e.hpBarGroup.quaternion.copy(camera.quaternion);
      }

      // --- UPDATE 3D PROJECTILES & VFX ---
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.age += dt;
        p.mesh.position.addScaledVector(p.vel, dt);

        for (const e of enemies) {
          if (!p.hitSet.has(e) && p.mesh.position.distanceTo(e.mesh.position) < (e.isBoss ? 2.0 : 1.35)) {
            p.hitSet.add(e);
            damageEnemy(e, p.damage, 5, true);
          }
        }

        if (p.age >= p.maxAge) {
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
        }
      }

      for (let i = vfxList.length - 1; i >= 0; i--) {
        const v = vfxList[i];
        v.update(dt);
        if (v.age >= v.duration) {
          scene.remove(v.mesh);
          vfxList.splice(i, 1);
        }
      }

      // --- ANIMATE ENVIRONMENT (Portals, Waterfalls, Fireflies) ---
      portals.forEach(p => {
        p.ring1.rotation.z += dt * 0.9;
        p.ring2.rotation.z -= dt * 1.4;
      });
      floatingParticles.forEach(sp => {
        sp.position.y = sp.userData.baseY + Math.sin(elapsed * sp.userData.speed + sp.userData.phase) * 0.8;
      });
      if (moveMarker.visible) {
        moveMarker.scale.setScalar(0.85 + Math.sin(elapsed * 8) * 0.15);
      }

      // --- TRUE 3D ISOMETRIC CAMERA POSITIONING (Zoom 35% = Wide Panoramic View) ---
      // At 35% zoom, camera distance is ~42 units so the entire floating peak & battle are visible
      const camDistance = 16 + ((100 - gameState.zoomPercent) / 65) * 26;
      const horizDist = camDistance * Math.cos(gameState.cameraPitch);
      const vertDist = camDistance * Math.sin(gameState.cameraPitch);

      const targetCamPos = new THREE.Vector3(
        player.root.position.x + Math.sin(gameState.cameraYaw) * horizDist,
        player.root.position.y + vertDist,
        player.root.position.z + Math.cos(gameState.cameraYaw) * horizDist
      );
      camera.position.lerp(targetCamPos, 0.14);
      camera.lookAt(
        player.root.position.x,
        player.root.position.y + 0.9,
        player.root.position.z
      );

      updatePet(dt, elapsed);
      renderMinimap();
      updateHUD();
      renderer.render(scene, camera);
    }


    // --- PvP: dau mo phong theo luot + thuong ngay + boss the gioi (pvp.v) ---
    function renderPvp() {
      var body = document.getElementById('pvp-body'); if (!body) return;
      var rank = pvpRankFromPoints(gameState.pvpPoints);
      var power = pvpPower();
      var now = new Date(); var hour = now.getHours();
      var wbOpen = worldBossIsOpen(hour);
      var dailyClaimed = gameState.pvpDailyDate === todayStr();
      var h = '<p class="text-[12px] mb-2">Lực chiến của bạn: <b class="text-[#ffe082]">' + fmt(power) + '</b> (Công + cấp x5 + trang bị + pet + môn phái, theo pvp.v). Thắng <b>+25</b> điểm, thua <b>-15</b> điểm (không dưới 0).</p>';
      h += '<div class="mvl-row"><div class="t"><b>🏆 Hạng của bạn: #' + rank + '</b><div class="sub">' + fmt(gameState.pvpPoints) + ' điểm PvP • Thắng ' + gameState.pvpWins + ' • Thua ' + gameState.pvpLosses + ' • Raid thắng ' + gameState.raidWins + '</div></div>' +
        '<button class="mvl-btn green" ' + (dailyClaimed ? 'disabled' : '') + ' onclick="claimPvpDaily()">' + (dailyClaimed ? 'Đã nhận hôm nay' : '🎁 Nhận thưởng ngày') + '</button></div>';
      h += '<p class="text-[11px] text-[#b4c8c9]">Thưởng ngày: +150 vàng, +300 bạc, +50 EXP — nhận 1 lần/ngày.</p>';
      h += '<h3 style="font-size:13px;margin:8px 0 4px">👹 Boss Thế Giới — ' + WORLD_BOSS.name + '</h3>' +
        '<div class="mvl-row"><div class="t"><b>HP ' + fmt(WORLD_BOSS.maxHp) + '</b><div class="sub">Mở cửa <b>20:00–21:00</b> hằng ngày (giờ máy: ' + hour + ':' + String(now.getMinutes()).padStart(2, '0') + ') — ' + (wbOpen ? '<b style="color:#51cf66">ĐANG MỞ</b>' : '<b style="color:#ff8787">Đang đóng</b>') + '<br>Thưởng theo sát thương (chuẩn chung vòng 3): ≥20000 → 5000 vàng + 50 Ngọc Linh Thạch + 5 Đá Cường Hóa; ≥10000 → 2500 vàng; ≥2000 → 1000 vàng.</div></div>' +
        '<button class="mvl-btn" ' + (wbOpen ? '' : 'disabled') + ' onclick="worldBossAttack()">⚔️ Đánh Boss</button></div>';
      h += '<h3 style="font-size:13px;margin:8px 0 4px">⚔️ Đối thủ đấu trường (8 người, theo pvp.v)</h3>';
      PVP_OPPONENTS.forEach(function (opp, i) {
        h += '<div class="mvl-row"><div class="t"><b>#' + opp.rank + ' ' + opp.name + '</b><div class="sub">' + opp.title + ' • Lực chiến ' + fmt(opp.power) + ' • ' + (power >= opp.power ? '<b style="color:#51cf66">Bạn mạnh hơn</b>' : '<b style="color:#ff8787">Đối thủ mạnh hơn</b>') + '</div></div>' +
          '<button class="mvl-btn" onclick="pvpFight(' + i + ')">Đấu</button></div>';
      });
      h += '<div id="pvp-result" class="text-[12px] mt-2" style="white-space:pre-wrap"></div>';
      body.innerHTML = h;
    }
    function claimPvpDaily() {
      if (gameState.pvpDailyDate === todayStr()) { showSystemBanner('Hôm nay đã nhận thưởng PvP rồi!'); return; }
      gameState.pvpDailyDate = todayStr();
      addGold(150); addSilver(300); gameState.exp += 50;
      if (gameState.exp >= gameState.maxExp) levelUp();
      showSystemBanner('🎁 Thưởng ngày PvP: +150 vàng, +300 bạc, +50 EXP!');
      renderPvp(); saveGame(false);
    }
    function worldBossAttack() {
      var hour = new Date().getHours();
      if (!worldBossIsOpen(hour)) { showSystemBanner('Boss Thế Giới chỉ mở 20:00–21:00!'); return; }
      var damage = Math.round(pvpPower() * 12 + Math.random() * 500);
      var reward = worldBossReward(damage);
      if (reward > 0) {
        addGold(reward);
        // Chuan chung vong 3: moc >=20000 them +50 linh thach (Ngoc Linh Thach) + 5 Da Cuong Hoa.
        if (damage >= 20000) { addItem('ngoc_linh', 50); addItem('da_cuong_hoa', 5); }
        showSystemBanner('👹 Boss Thế Giới: bạn gây ' + fmt(damage) + ' sát thương, +' + fmt(reward) + ' vàng!' + (damage >= 20000 ? ' +50 Ngọc Linh Thạch! +5 Đá Cường Hóa!' : ''));
      } else { showSystemBanner('👹 Boss Thế Giới: bạn gây ' + fmt(damage) + ' sát thương — chưa đủ 2000 để nhận thưởng!'); }
      addDmgLog('👹 Boss Thế Giới: gây ' + fmt(damage) + ' sát thương, +' + fmt(reward) + ' vàng.');
      renderPvp(); saveGame(false);
    }
    function pvpFight(idx) {
      var opp = PVP_OPPONENTS[idx]; if (!opp) return;
      var power = pvpPower();
      var php = power * 10, ohp = opp.power * 10;
      var log = ['⚔️ Đấu với ' + opp.name + ' (lực chiến ' + opp.power + ', hạng #' + opp.rank + ') — bạn ' + power + '.'];
      var round = 0;
      while (php > 0 && ohp > 0 && round < 30) {
        round++;
        var pd = Math.round(power * (0.9 + Math.random() * 0.25));
        var od = Math.round(opp.power * (0.9 + Math.random() * 0.25));
        ohp -= pd; php -= od;
        log.push('Hiệp ' + round + ': bạn -' + pd + ' → đối thủ còn ' + Math.max(0, ohp) + ' HP; đối thủ -' + od + ' → bạn còn ' + Math.max(0, php) + ' HP.');
      }
      var win = ohp <= 0 && php > 0;
      if (win) { gameState.pvpPoints += 25; gameState.pvpWins++; }
      else { gameState.pvpPoints = Math.max(0, gameState.pvpPoints - 15); gameState.pvpLosses++; }
      var rank = pvpRankFromPoints(gameState.pvpPoints);
      log.push((win ? '🏆 THẮNG! +25 điểm PvP.' : '💔 THUA! -15 điểm PvP.') + ' Điểm hiện tại: ' + gameState.pvpPoints + ' (hạng #' + rank + ').');
      log.forEach(function (l) { addDmgLog(l); });
      showSystemBanner(win ? '🏆 Thắng ' + opp.name + '! +25 điểm PvP (hạng #' + rank + ').' : '💔 Thua ' + opp.name + '. -15 điểm PvP (hạng #' + rank + ').');
      renderPvp(); saveGame(false);
      var res2 = document.getElementById('pvp-result'); if (res2) res2.textContent = log.join('\n');
    }

    // --- Vong lap chinh cua nhom 1 (100ms): combo, dong doi, auto, raid ---
    var _g1TickCount = 0;
    function masterTick() {
      if (gameState.battlePaused) return;
      _g1TickCount++;
      var dt = 0.1;
      if (gameState.comboTimer > 0) { gameState.comboTimer -= dt; if (gameState.comboTimer <= 0 && gameState.combo !== 0) { gameState.combo = 0; updateComboUI(); } }
      alliesTick(dt);
      raidTick(dt);
      if (_g1TickCount % 6 === 0) autoBattleTick();
    }
    function initG1() {
      buildAllies();
      updateComboUI();
      setInterval(masterTick, 100);
    }

    window.onload = function () {
      createTownNPCs();
      createPetMesh();
      var hadSave = loadGame();
      recalcStats();
      renderBag();
      showSystemBanner(hadSave ? 'Chào Mừng Đạo Hữu Trở Lại Quỷ Cốc Bát Hoang 3D! (đã tải save cũ)' : 'Chào Mừng Đạo Hữu Đến Với Quỷ Cốc Bát Hoang 3D!');
      animate();
    };
    // NHOM 1: khoi dong he thong moi sau khi game load xong (khong sua window.onload goc).
    var _g1OrigOnload = window.onload;
    window.onload = function () { _g1OrigOnload(); initG1(); };
Object.assign(window.QC, { raycaster, groundPlane, renderMinimap, updateHUD, clock, animate, renderPvp, claimPvpDaily, worldBossAttack, pvpFight, masterTick, initG1 });
