// ============================================================
// Quỷ Cốc Bát Hoang 3D — 02-combat.js
// 02-combat: §6 Monsters/Boss Factory + §7 Combat VFX & Skills (dong goc 1403-1968).
// Noi dung goc giu byte-identical; chi them dong window.QC o dau
// va dong Object.assign(window.QC, ...) o cuoi (khong doi ten bien/ham,
// khong doi thu tu cau lenh goc). Nap bang <script src> thuong, KHONG
// dung ES module (tranh loi CORS tren GitHub Pages / file://).
// ============================================================
window.QC = window.QC || {}; // Nhom 1 vong 3: namespace chung giua cac module (script thuong chia se global scope).
    // ==========================================
    // 6. 3D MONSTERS & BOSS FACTORY
    // ==========================================
    function create3DMonster(type = 'demon') {
      const group = new THREE.Group();

      const isBoss = type === 'boss';
      const isElite = type === 'elite';
      const scale = isBoss ? 1.85 : isElite ? 1.3 : 1.0;
      group.scale.setScalar(scale);

      const bodyColor = isBoss ? 0x4a1525 : type === 'ghoul' ? 0x4b3b63 : 0x594236;
      const armorColor = isBoss ? 0xd9480f : isElite ? 0x7048e8 : 0x868e96;

      const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75 });
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5 });
      const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, metalness: 0.5, roughness: 0.4 });

      // Legs
      const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 8), bodyMat);
      lLeg.position.set(-0.22, 0.28, 0);
      lLeg.castShadow = true;
      const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.55, 8), bodyMat);
      rLeg.position.set(0.22, 0.28, 0);
      rLeg.castShadow = true;
      group.add(lLeg, rLeg);

      // Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.75, 10), armorMat);
      torso.position.y = 0.9;
      torso.castShadow = true;
      group.add(torso);

      // Spiky Shoulder Pads
      [-0.45, 0.45].forEach(sx => {
        const pad = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 5), boneMat);
        pad.position.set(sx, 1.25, 0);
        pad.rotation.z = sx < 0 ? 0.6 : -0.6;
        group.add(pad);
      });

      // Head & Horned Bone Mask
      const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), bodyMat);
      head.position.y = 1.52;
      head.castShadow = true;
      group.add(head);

      // Curved Demon Horns
      [-0.26, 0.26].forEach(hx => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.52, 6), boneMat);
        horn.position.set(hx, 1.85, 0.05);
        horn.rotation.z = hx < 0 ? 0.45 : -0.45;
        horn.rotation.x = 0.25;
        group.add(horn);
      });

      // Glowing Red Eyes
      [-0.12, 0.12].forEach(ex => {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff2a2a })
        );
        eye.position.set(ex, 1.54, 0.31);
        group.add(eye);
      });

      // Demon Cleaver / Club Weapon
      const weapon = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.1, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x343a40, metalness: 0.7, roughness: 0.3 })
      );
      weapon.position.set(0.55, 0.95, 0.35);
      weapon.rotation.x = 0.8;
      group.add(weapon);

      // 3D Overhead Health Bar (Billboards toward camera)
      const hpBarGroup = new THREE.Group();
      hpBarGroup.position.y = 2.35;

      const bgPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
      );
      hpBarGroup.add(bgPlane);

      const fillPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.24, 0.11),
        new THREE.MeshBasicMaterial({ color: isBoss ? 0xff922b : 0xe03131, side: THREE.DoubleSide })
      );
      fillPlane.position.z = 0.01;
      hpBarGroup.add(fillPlane);
      group.add(hpBarGroup);

      // Spawn position near magic portals or outer ring
      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnRadius = 10 + Math.random() * 11;
      group.position.set(Math.cos(spawnAngle) * spawnRadius, 0, Math.sin(spawnAngle) * spawnRadius);
      scene.add(group);

      const maxHp = isBoss ? 1400 : isElite ? 420 : 190;
      const enemyObj = {
        mesh: group,
        hpBarGroup,
        fillPlane,
        bodyMat,
        origColor: bodyColor,
        type,
        isBoss,
        hp: maxHp,
        maxHp,
        speed: isBoss ? 2.4 : type === 'ghoul' ? 4.1 : 3.2,
        damage: isBoss ? 24 : isElite ? 12 : 7,
        attackCd: 0,
        hitFlash: 0,
        knockbackVel: new THREE.Vector3(),
        animPhase: Math.random() * Math.PI * 2
      };

      enemies.push(enemyObj);
      return enemyObj;
    }

    // Initial wave of 3D monsters
    for (let i = 0; i < 8; i++) {
      create3DMonster(i % 3 === 0 ? 'ghoul' : 'demon');
    }

    // ==========================================
    // 7. 3D COMBAT VFX & SKILL IMPLEMENTATIONS
    // ==========================================
    function showSystemBanner(msg) {
      const banner = document.getElementById('system-banner');
      const text = document.getElementById('system-banner-text');
      text.textContent = msg;
      banner.style.opacity = '1';
      clearTimeout(banner._timer);
      banner._timer = setTimeout(() => {
        banner.style.opacity = '0';
      }, 2400);
    }

    function spawnFloatingText(worldPos, text, cssClass) {
      const vec = worldPos.clone();
      vec.y += 2.2;
      vec.project(camera);

      const rect = frameEl.getBoundingClientRect();
      const x = (vec.x * 0.5 + 0.5) * rect.width;
      const y = (-(vec.y * 0.5) + 0.5) * rect.height;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      const el = document.createElement('div');
      el.className = `floating-dmg ${cssClass}`;
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      floatingLayer.appendChild(el);

      setTimeout(() => el.remove(), 1050);
    }

    function damageEnemy(enemy, rawDamage, knockForce = 4, isSkill = false) {
      // Dodge check
      if (!isSkill && Math.random() < 0.08) {
        spawnFloatingText(enemy.mesh.position, 'Né tránh', 'dmg-dodge');
        return;
      }

      const critBonus = gameState.rageTimer > 0 ? 0.35 : 0;
      const isCrit = Math.random() < (gameState.critChance + critBonus);
      const auraMult = gameState.auraTimer > 0 ? 1.45 : 1.0;
      const finalDmg = Math.round(rawDamage * auraMult * (isCrit ? 1.85 : 0.9 + Math.random() * 0.25));

      enemy.hp -= finalDmg;
      enemy.hitFlash = 0.14;
      enemy.bodyMat.emissive.setHex(0xffaa33);

      // Knockback physics away from player
      const pushDir = new THREE.Vector3().subVectors(enemy.mesh.position, player.root.position);
      pushDir.y = 0;
      if (pushDir.lengthSq() > 0.001) pushDir.normalize();
      enemy.knockbackVel.addScaledVector(pushDir, enemy.isBoss ? knockForce * 0.25 : knockForce);

      // Floating combat text matching screenshot ("130", "Bạo kích 529")
      if (isCrit) {
        spawnFloatingText(enemy.mesh.position, `Bạo kích ${finalDmg}`, 'dmg-crit');
      } else {
        spawnFloatingText(enemy.mesh.position, `${finalDmg}`, 'dmg-normal');
      }

      // Update 3D HP bar
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      enemy.fillPlane.scale.x = Math.max(0.001, ratio);
      enemy.fillPlane.position.x = -(1 - ratio) * 0.62;

      if (enemy.hp <= 0) {
        killEnemy(enemy);
      }
    }

    function killEnemy(enemy) {
      const idx = enemies.indexOf(enemy);
      if (idx !== -1) enemies.splice(idx, 1);

      // Death burst 3D particles
      createBurstVFX(enemy.mesh.position, enemy.isBoss ? 0xff922b : 0xb197fc, 12);
      scene.remove(enemy.mesh);

      gameState.kills++;
      gameState.exp += enemy.isBoss ? 120 : 22;
      onEnemyKilledLoot(enemy);
      document.getElementById('quest-kill-count').textContent = Math.min(gameState.kills, gameState.questTarget);
      if (gameState.kills >= gameState.questTarget) {
        document.getElementById('quest-check-1').textContent = '✔';
        document.getElementById('quest-check-1').className = 'text-[#51cf66]';
      }

      if (gameState.exp >= gameState.maxExp) {
        levelUp();
      }
    }

    function levelUp() {
      gameState.exp -= gameState.maxExp;
      gameState.maxExp = Math.round(gameState.maxExp * 1.35);
      gameState.level++;
      if (gameState._baseMaxHp === undefined) { gameState._baseMaxHp = gameState.maxHp; gameState._baseAtk = gameState.attackPower; gameState._baseDef = gameState.defense || 12; }
      gameState._baseMaxHp += 35;
      gameState._baseAtk += 14;
      recalcStats();
      gameState.hp = gameState.maxHp;
      gameState.maxMp += 40;
      gameState.mp = gameState.maxMp;

      if (gameState.level % 3 === 0 && gameState.realmIndex < gameState.realms.length - 1) {
        gameState.realmIndex++;
      }

      document.getElementById('hud-level').textContent = gameState.level;
      document.getElementById('hud-realm').textContent = gameState.realms[gameState.realmIndex];
      showSystemBanner(`Đột Phá Cảnh Giới! Đạt Cấp ${gameState.level} - ${gameState.realms[gameState.realmIndex]}`);
      createGoldenWhirlwindVFX(player.root.position, 4.5, 0.9);
    }

    // --- 3D VFX BUILDERS ---
    function createGoldenWhirlwindVFX(origin, maxRadius = 4.2, duration = 0.55) {
      // Multi-layered glowing golden crescent rings matching the signature screenshot vortex!
      const group = new THREE.Group();
      group.position.copy(origin);
      group.position.y = 0.75;

      const ringMat1 = new THREE.MeshBasicMaterial({
        color: 0xffd43b,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xfff3bf,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });

      const disc1 = new THREE.Mesh(new THREE.RingGeometry(maxRadius * 0.35, maxRadius, 36, 1, 0, Math.PI * 1.65), ringMat1);
      disc1.rotation.x = -Math.PI / 2;
      group.add(disc1);

      const disc2 = new THREE.Mesh(new THREE.RingGeometry(maxRadius * 0.15, maxRadius * 0.75, 32, 1, Math.PI * 0.4, Math.PI * 1.5), ringMat2);
      disc2.rotation.x = -Math.PI / 2;
      disc2.position.y = 0.12;
      group.add(disc2);

      // 3D Outer Energy Rim
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(maxRadius * 0.88, 0.08, 8, 36),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85 })
      );
      torus.rotation.x = Math.PI / 2;
      group.add(torus);

      scene.add(group);
      vfxList.push({
        type: 'whirlwind',
        mesh: group,
        age: 0,
        duration,
        update(dt) {
          this.age += dt;
          const t = this.age / this.duration;
          group.position.copy(player.root.position);
          group.position.y = 0.75;
          group.rotation.y += dt * 18;
          const s = 0.55 + Math.sin(t * Math.PI) * 0.55;
          group.scale.set(s, 1, s);
          ringMat1.opacity = 1 - t;
          ringMat2.opacity = 1 - t;
          torus.material.opacity = 1 - t;
        }
      });
    }

    function createBurstVFX(pos, colorHex, count = 10) {
      const geo = new THREE.OctahedronGeometry(0.16);
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.position.y += 0.8;
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          2 + Math.random() * 6,
          (Math.random() - 0.5) * 8
        );
        scene.add(m);
        vfxList.push({
          mesh: m,
          age: 0,
          duration: 0.65,
          update(dt) {
            this.age += dt;
            vel.y -= 14 * dt;
            m.position.addScaledVector(vel, dt);
            m.rotation.x += dt * 8;
            mat.opacity = 1 - this.age / this.duration;
          }
        });
      }
    }

    function spawnFlyingSwordProjectile(origin, dir, isSpiritBlue = false) {
      const swordProj = new THREE.Group();
      const color = isSpiritBlue ? 0x4dabf7 : 0xffd43b;

      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 1.45, 4),
        new THREE.MeshBasicMaterial({ color })
      );
      blade.rotation.x = Math.PI / 2;
      swordProj.add(blade);

      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.04, 1.7, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
      );
      glow.rotation.x = Math.PI / 2;
      swordProj.add(glow);

      swordProj.position.copy(origin);
      swordProj.position.y = 1.05;
      swordProj.lookAt(origin.clone().add(dir).setY(1.05));
      scene.add(swordProj);

      projectiles.push({
        mesh: swordProj,
        vel: dir.clone().normalize().multiplyScalar(24),
        age: 0,
        maxAge: 1.1,
        damage: gameState.attackPower * 1.45,
        hitSet: new Set()
      });
    }

    function findNearestEnemy(maxRange = 14) {
      let best = null;
      let bestDist = maxRange;
      for (const e of enemies) {
        const d = player.root.position.distanceTo(e.mesh.position);
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
      return best;
    }

    function faceNearestOrForward() {
      const target = findNearestEnemy(14);
      if (target) {
        const dx = target.mesh.position.x - player.root.position.x;
        const dz = target.mesh.position.z - player.root.position.z;
        player.root.rotation.y = Math.atan2(dx, dz);
      }
      return new THREE.Vector3(Math.sin(player.root.rotation.y), 0, Math.cos(player.root.rotation.y));
    }

    // Cast Skills 0..6
    function castSkill(skillIndex) {
      const sk = skills[skillIndex];
      if (!sk || sk.currentCd > 0) return;
      if (gameState.mp < sk.mp) {
        showSystemBanner('Linh lực (MP) không đủ!');
        return;
      }

      gameState.mp -= sk.mp;
      sk.currentCd = sk.cd;
      const forward = faceNearestOrForward();

      if (skillIndex === 0) {
        // Basic Slash
        gameState.attackAnimTimer = 0.38;
        player.drawSword();
        createGoldenWhirlwindVFX(player.root.position, 2.7, 0.32);
        enemies.slice().forEach(e => {
          if (player.root.position.distanceTo(e.mesh.position) <= 3.3) {
            damageEnemy(e, gameState.attackPower, 4.5, false);
          }
        });
      } else if (skillIndex === 1) {
        // Skill 1: Kiếm Khí Trảm (3 Golden Flying Sword Beams)
        gameState.attackAnimTimer = 0.42;
        player.drawSword();
        [-0.22, 0, 0.22].forEach(angleOffset => {
          const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
          spawnFlyingSwordProjectile(player.root.position, dir, false);
        });
      } else if (skillIndex === 2) {
        // Skill 2: Vạn Kiếm Quy Tông (Sky Sword Rain on enemies)
        gameState.attackAnimTimer = 0.45;
        player.drawSword();
        const center = findNearestEnemy(15)?.mesh.position.clone() || player.root.position.clone().addScaledVector(forward, 5);
        for (let i = 0; i < 12; i++) {
          const dropSword = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 1.8, 4),
            new THREE.MeshBasicMaterial({ color: 0x3bc9db })
          );
          dropSword.rotation.x = Math.PI;
          const ox = center.x + (Math.random() - 0.5) * 6.5;
          const oz = center.z + (Math.random() - 0.5) * 6.5;
          dropSword.position.set(ox, 9 + i * 0.45, oz);
          scene.add(dropSword);

          vfxList.push({
            mesh: dropSword,
            age: 0,
            duration: 0.48,
            struck: false,
            update(dt) {
              this.age += dt;
              dropSword.position.y -= 22 * dt;
              if (dropSword.position.y <= 0.6 && !this.struck) {
                this.struck = true;
                createBurstVFX(new THREE.Vector3(ox, 0.2, oz), 0x4dabf7, 3);
              }
            }
          });
        }
        enemies.slice().forEach(e => {
          if (center.distanceTo(e.mesh.position) <= 4.8) {
            damageEnemy(e, gameState.attackPower * 1.9, 5, true);
          }
        });
      } else if (skillIndex === 3) {
        // Skill 3: Bát Hoang Toàn Phong (Signature Golden Whirlwind AoE)
        gameState.spinAnimTimer = 0.65;
        player.drawSword();
        createGoldenWhirlwindVFX(player.root.position, 4.6, 0.65);
        enemies.slice().forEach(e => {
          if (player.root.position.distanceTo(e.mesh.position) <= 4.9) {
            damageEnemy(e, gameState.attackPower * 1.75, 8.5, true);
          }
        });
      } else if (skillIndex === 4) {
        // Skill 4: Kim Cang Hộ Thể (Heal + Knockback Shockwave)
        const healAmt = Math.round(gameState.maxHp * 0.35);
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + healAmt);
        spawnFloatingText(player.root.position, `+${healAmt} HP`, 'dmg-heal');
        createGoldenWhirlwindVFX(player.root.position, 5.2, 0.55);
        enemies.slice().forEach(e => {
          if (player.root.position.distanceTo(e.mesh.position) <= 5.5) {
            damageEnemy(e, gameState.attackPower * 1.1, 14, true);
          }
        });
      } else if (skillIndex === 5) {
        // Skill 5: Thiên Lôi Kiếm Trận (Giant Celestial Greatsword Slam)
        const targetPos = findNearestEnemy(16)?.mesh.position.clone() || player.root.position.clone().addScaledVector(forward, 5);
        const giantSword = new THREE.Mesh(
          new THREE.ConeGeometry(0.95, 6.5, 4),
          new THREE.MeshBasicMaterial({ color: 0xffec99 })
        );
        giantSword.rotation.x = Math.PI;
        giantSword.position.set(targetPos.x, 12, targetPos.z);
        scene.add(giantSword);

        vfxList.push({
          mesh: giantSword,
          age: 0,
          duration: 0.65,
          impacted: false,
          update(dt) {
            this.age += dt;
            if (giantSword.position.y > 2.2) {
              giantSword.position.y -= 34 * dt;
            } else if (!this.impacted) {
              this.impacted = true;
              createBurstVFX(targetPos, 0xffd43b, 18);
              createGoldenWhirlwindVFX(targetPos, 5.5, 0.55);
              enemies.slice().forEach(e => {
                if (targetPos.distanceTo(e.mesh.position) <= 5.8) {
                  damageEnemy(e, gameState.attackPower * 2.8, 12, true);
                }
              });
            }
          }
        });
      } else if (skillIndex === 6) {
        // Skill 6: Cảnh Giới Đột Phá (Golden Aura Mode)
        gameState.auraTimer = 10.0;
        document.getElementById('buff-aura-icon').classList.remove('hidden');
        showSystemBanner('Bát Hoang Kim Thân Kích Hoạt! (+45% Sát Thương)');
        createGoldenWhirlwindVFX(player.root.position, 5.5, 0.8);
      }
    }

    function useConsumable(type) {
      if (type === 'hp' && gameState.pills.hp > 0) {
        gameState.pills.hp--;
        removeItem('hp_pill', 1);
        document.getElementById('pill-hp-count').textContent = gameState.pills.hp;
        const heal = 85;
        gameState.hp = Math.min(gameState.maxHp, gameState.hp + heal);
        spawnFloatingText(player.root.position, `+${heal} HP`, 'dmg-heal');
        createBurstVFX(player.root.position, 0x51cf66, 8);
      } else if (type === 'mp' && gameState.pills.mp > 0) {
        gameState.pills.mp--;
        removeItem('mp_pill', 1);
        document.getElementById('pill-mp-count').textContent = gameState.pills.mp;
        const mpGain = 160;
        gameState.mp = Math.min(gameState.maxMp, gameState.mp + mpGain);
        spawnFloatingText(player.root.position, `+${mpGain} MP`, 'dmg-dodge');
        createBurstVFX(player.root.position, 0x339af0, 8);
      } else if (type === 'rage' && gameState.pills.rage > 0) {
        gameState.pills.rage--;
        removeItem('rage_pill', 1);
        document.getElementById('pill-rage-count').textContent = gameState.pills.rage;
        gameState.rageTimer = 12.0;
        showSystemBanner('Bạo Linh Phù: Tỉ lệ Bạo Kích tăng mạnh!');
        createBurstVFX(player.root.position, 0xff922b, 10);
      }
    }

    function spawnDungeonWave(mode) {
      if (mode === 'swarm') {
        showSystemBanner('Phó Bản: Hoa Đào Phá Đặc - Yêu Thú Tràn Vào!');
        for (let i = 0; i < 6; i++) create3DMonster('ghoul');
      } else if (mode === 'elite') {
        showSystemBanner('Phó Bản: Bát Hoang Bí Cảnh - Yêu Tướng Xuất Hiện!');
        for (let i = 0; i < 4; i++) create3DMonster('elite');
      } else if (mode === 'boss') {
        showSystemBanner('Cảnh Báo: Quỷ Cốc Ma Tôn Giáng Lâm!');
        create3DMonster('boss');
        for (let i = 0; i < 3; i++) create3DMonster('demon');
      }
    }

    function triggerBreakthrough() {
      castSkill(6);
    }

    function toggleCameraPreset() {
      gameState.cameraYaw += Math.PI / 2;
      showSystemBanner('Xoay Góc Nhìn Toàn Cảnh 3D');
    }

Object.assign(window.QC, { create3DMonster, showSystemBanner, spawnFloatingText, damageEnemy, killEnemy, levelUp, createGoldenWhirlwindVFX, createBurstVFX, spawnFlyingSwordProjectile, findNearestEnemy, faceNearestOrForward, castSkill, useConsumable, spawnDungeonWave, triggerBreakthrough, toggleCameraPreset });
