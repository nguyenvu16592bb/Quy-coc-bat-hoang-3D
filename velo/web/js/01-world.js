// ============================================================
// Quỷ Cốc Bát Hoang 3D — 01-world.js
// 01-world: §3 Textures + §4 World Environment + §5 Character + player/moveMarker (dong goc 658-1402).
// Noi dung goc giu byte-identical; chi them dong window.QC o dau
// va dong Object.assign(window.QC, ...) o cuoi (khong doi ten bien/ham,
// khong doi thu tu cau lenh goc). Nap bang <script src> thuong, KHONG
// dung ES module (tranh loi CORS tren GitHub Pages / file://).
// ============================================================
window.QC = window.QC || {}; // Nhom 1 vong 3: namespace chung giua cac module (script thuong chia se global scope).
    // ==========================================
    // 3. PROCEDURAL TEXTURES FOR STONE & GRASS
    // ==========================================
    function createTerrainTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      // Mossy dark slate base
      ctx.fillStyle = '#253834';
      ctx.fillRect(0, 0, 512, 512);

      // Organic moss & stone patches
      for (let i = 0; i < 650; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = 6 + Math.random() * 24;
        ctx.fillStyle = Math.random() > 0.45 ? 'rgba(42, 74, 62, 0.35)' : 'rgba(56, 68, 70, 0.35)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cobblestone diagonal paths
      ctx.fillStyle = '#4c595b';
      for (let i = -512; i < 1024; i += 26) {
        for (let w = -45; w <= 45; w += 22) {
          const sx = i + (Math.random() - 0.5) * 6;
          const sy = i * 0.7 + w + 120 + (Math.random() - 0.5) * 6;
          ctx.fillStyle = Math.random() > 0.5 ? '#546365' : '#435052';
          ctx.beginPath();
          ctx.roundRect(sx, sy, 18, 14, 4);
          ctx.fill();
          ctx.strokeStyle = '#243030';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      return tex;
    }

    // ==========================================
    // 4. TRUE 3D WORLD & WUXIA ENVIRONMENT
    // ==========================================
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const ARENA_RADIUS = 25;

    function buildWorldEnvironment() {
      const terrainTex = createTerrainTexture();

      // Main Floating Peak Arena Platform (Multi-tiered 3D rock cylinder)
      const topPlatformGeo = new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS - 1.5, 2.2, 32);
      const topPlatformMat = new THREE.MeshStandardMaterial({
        map: terrainTex,
        roughness: 0.85,
        metalness: 0.08
      });
      const topPlatform = new THREE.Mesh(topPlatformGeo, topPlatformMat);
      topPlatform.position.y = -1.1;
      topPlatform.receiveShadow = true;
      worldGroup.add(topPlatform);

      // Tapered rocky mountain underside
      const underRockGeo = new THREE.ConeGeometry(ARENA_RADIUS - 1.2, 24, 18);
      const underRockMat = new THREE.MeshStandardMaterial({
        color: 0x263538,
        roughness: 0.92,
        flatShading: true
      });
      const underRock = new THREE.Mesh(underRockGeo, underRockMat);
      underRock.rotation.x = Math.PI;
      underRock.position.y = -14;
      worldGroup.add(underRock);

      // Perimeter Craggy Cliff Rocks & Mossy Boulders
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x3b4a4d,
        roughness: 0.88,
        flatShading: true
      });
      const mossRockMat = new THREE.MeshStandardMaterial({
        color: 0x2e4e44,
        roughness: 0.85,
        flatShading: true
      });

      for (let i = 0; i < 42; i++) {
        const angle = (i / 42) * Math.PI * 2;
        const dist = ARENA_RADIUS - 0.5 + (Math.random() - 0.5) * 1.8;
        const rx = Math.cos(angle) * dist;
        const rz = Math.sin(angle) * dist;
        const scale = 1.1 + Math.random() * 2.2;

        const boulder = new THREE.Mesh(
          new THREE.DodecahedronGeometry(scale, 1),
          i % 3 === 0 ? mossRockMat : rockMat
        );
        boulder.position.set(rx, (Math.random() - 0.3) * 1.2, rz);
        boulder.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        boulder.scale.set(1.2, 0.75 + Math.random() * 0.6, 1.1);
        boulder.castShadow = true;
        boulder.receiveShadow = true;
        worldGroup.add(boulder);
      }

      // Massive Ancient Gnarled 3D Spirit Tree (Left side like in reference image)
      const treeGroup = new THREE.Group();
      treeGroup.position.set(-14, 0, -9);

      const barkMat = new THREE.MeshStandardMaterial({
        color: 0x3c2e24,
        roughness: 0.9,
        flatShading: true
      });

      // Twisted trunk segments
      const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.5, 9, 10), barkMat);
      trunk1.position.set(0, 4.2, 0);
      trunk1.rotation.z = -0.18;
      trunk1.castShadow = true;
      treeGroup.add(trunk1);

      const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 8, 9), barkMat);
      trunk2.position.set(1.5, 10.5, 0.5);
      trunk2.rotation.z = -0.35;
      trunk2.castShadow = true;
      treeGroup.add(trunk2);

      // Gnarled spreading roots
      for (let r = 0; r < 6; r++) {
        const ra = (r / 6) * Math.PI * 2;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.75, 4.5, 7), barkMat);
        root.position.set(Math.cos(ra) * 2.2, 0.7, Math.sin(ra) * 2.2);
        root.rotation.z = Math.cos(ra) * 1.15;
        root.rotation.x = -Math.sin(ra) * 1.15;
        root.castShadow = true;
        treeGroup.add(root);
      }

      // Lush Spirit Canopy Foliage Clusters
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x265949,
        emissive: 0x0a261f,
        roughness: 0.75,
        flatShading: true
      });
      const canopyOffsets = [
        [2.5, 14, 0.5, 4.2],
        [-1.5, 12.5, 2.2, 3.4],
        [5.5, 13, -1.5, 3.6],
        [1.2, 16, -1.2, 3.2]
      ];
      canopyOffsets.forEach(([cx, cy, cz, cr]) => {
        const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 1), leafMat);
        foliage.position.set(cx, cy, cz);
        foliage.scale.set(1.3, 0.7, 1.3);
        foliage.castShadow = true;
        treeGroup.add(foliage);
      });

      // Glowing Ethereal Silk/Spirit Ribbons draping from the ancient tree
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: 0x8ef6e4,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide
      });
      for (let s = 0; s < 2; s++) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(2, 11 - s * 1.5, 1),
          new THREE.Vector3(-4, 7.5 - s * 1.2, -4),
          new THREE.Vector3(-12, 8.5 - s, -8),
          new THREE.Vector3(-18, 12 - s, -12)
        ]);
        const ribbonGeo = new THREE.TubeGeometry(curve, 24, 0.14, 6, false);
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        treeGroup.add(ribbon);
      }

      worldGroup.add(treeGroup);

      // Traditional East Asian 3D Pagoda / Shrine (Upper Right Cliff)
      createWuxiaPagoda(12, 0.2, -13, 1.15);
      // Distant Cliff Shrine (Left Background)
      createWuxiaPagoda(-24, 5, -24, 0.9);

      // Glowing Purple Teleportation / Summoning Magic Circles (Trận Pháp)
      createMagicPortal(11, 0.06, -5, 2.8);
      createMagicPortal(16, 0.06, 11, 2.2);

      // Stone Lanterns & Glowing Spirit Herbs around the arena
      const lanternCoords = [
        [-7, 10], [8, 9], [-10, -2], [6, -11], [-3, -14], [14, 3]
      ];
      lanternCoords.forEach(([lx, lz]) => createStoneLantern(lx, 0, lz));

      for (let h = 0; h < 22; h++) {
        const a = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * (ARENA_RADIUS - 8);
        createSpiritFlower(Math.cos(a) * r, 0, Math.sin(a) * r, h % 2 === 0 ? 0xb197fc : 0xffd43b);
      }

      // Distant Floating Mountains & 3D Animated Waterfalls
      createFloatingPeak(-36, 12, -32, 9, true);
      createFloatingPeak(4, 18, -44, 11, true);
      createFloatingPeak(35, 10, -28, 8.5, false);
      createFloatingPeak(-38, -2, 16, 7.5, false);

      // Ambient Rising Spirit Fireflies
      const sparkGeo = new THREE.SphereGeometry(0.09, 6, 6);
      for (let i = 0; i < 65; i++) {
        const sparkMat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x7ef9e5 : 0xffe066,
          transparent: true,
          opacity: 0.75
        });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.set(
          (Math.random() - 0.5) * 44,
          0.5 + Math.random() * 10,
          (Math.random() - 0.5) * 44
        );
        spark.userData = {
          baseY: spark.position.y,
          speed: 0.6 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2
        };
        worldGroup.add(spark);
        floatingParticles.push(spark);
      }
    }

    function createWuxiaPagoda(x, y, z, scale = 1) {
      const pagoda = new THREE.Group();
      pagoda.position.set(x, y, z);
      pagoda.scale.setScalar(scale);

      // Stone foundation
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.8, 5.2),
        new THREE.MeshStandardMaterial({ color: 0x455254, roughness: 0.85 })
      );
      base.position.y = 0.4;
      base.castShadow = true;
      base.receiveShadow = true;
      pagoda.add(base);

      // Red/Dark Wood Pillars & Walls
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 3.2, 3.8),
        new THREE.MeshStandardMaterial({ color: 0x2c2220, roughness: 0.75 })
      );
      wall.position.y = 2.4;
      wall.castShadow = true;
      pagoda.add(wall);

      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x7c2d26, roughness: 0.6 });
      [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].forEach(([px, pz]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.3, 8), pillarMat);
        p.position.set(px, 2.4, pz);
        pagoda.add(p);
      });

      // Glowing warm lantern doorway
      const doorGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 2.1),
        new THREE.MeshBasicMaterial({ color: 0xffb74d })
      );
      doorGlow.position.set(0, 1.9, 1.92);
      pagoda.add(doorGlow);

      // Curved East Asian Tiled Roofs (2 tiers)
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x1e2d33,
        roughness: 0.55,
        metalness: 0.2,
        flatShading: true
      });
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xd4af6a,
        metalness: 0.7,
        roughness: 0.3
      });

      const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.3, 1.8, 4), roofMat);
      roof1.rotation.y = Math.PI / 4;
      roof1.position.y = 4.7;
      roof1.castShadow = true;
      pagoda.add(roof1);

      const roof2 = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.6, 4), roofMat);
      roof2.rotation.y = Math.PI / 4;
      roof2.position.y = 6.1;
      pagoda.add(roof2);

      const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), goldTrimMat);
      finial.position.y = 7.1;
      pagoda.add(finial);

      worldGroup.add(pagoda);
    }

    function createMagicPortal(x, y, z, radius) {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      // Outer rune ring
      const ring1 = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.78, radius, 32),
        new THREE.MeshBasicMaterial({ color: 0xb197fc, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      ring1.rotation.x = -Math.PI / 2;
      group.add(ring1);

      // Inner rune ring
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.35, radius * 0.52, 24),
        new THREE.MeshBasicMaterial({ color: 0xe599f7, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      ring2.rotation.x = -Math.PI / 2;
      ring2.position.y = 0.02;
      group.add(ring2);

      // Rising translucent light cylinder
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.75, radius * 0.85, 4.5, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x9775fa,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      pillar.position.y = 2.25;
      group.add(pillar);

      const pLight = new THREE.PointLight(0xb197fc, 1.5, 10);
      pLight.position.y = 1.5;
      group.add(pLight);

      worldGroup.add(group);
      portals.push({ group, ring1, ring2, pillar });
    }

    function createStoneLantern(x, y, z) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const sMat = new THREE.MeshStandardMaterial({ color: 0x566568, roughness: 0.9 });

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.5, 6), sMat);
      post.position.y = 0.75;
      post.castShadow = true;
      g.add(post);

      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xffd43b })
      );
      core.position.y = 1.7;
      g.add(core);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.45, 4), sMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 2.12;
      g.add(cap);

      worldGroup.add(g);
    }

    function createSpiritFlower(x, y, z, hexColor) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const petalMat = new THREE.MeshBasicMaterial({ color: hexColor });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 4), petalMat);
        petal.position.set(Math.cos(a) * 0.16, 0.22, Math.sin(a) * 0.16);
        petal.rotation.z = -Math.cos(a) * 0.55;
        petal.rotation.x = Math.sin(a) * 0.55;
        g.add(petal);
      }
      worldGroup.add(g);
    }

    function createFloatingPeak(x, y, z, size, hasWaterfall) {
      const g = new THREE.Group();
      g.position.set(x, y, z);

      const peakMat = new THREE.MeshStandardMaterial({
        color: 0x264348,
        roughness: 0.9,
        flatShading: true
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(size, size * 2.4, 7), peakMat);
      cone.rotation.x = Math.PI;
      g.add(cone);

      const topCap = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.95, size, 1.5, 7),
        new THREE.MeshStandardMaterial({ color: 0x2d544c, roughness: 0.85, flatShading: true })
      );
      topCap.position.y = 0.7;
      g.add(topCap);

      if (hasWaterfall) {
        const wfMat = new THREE.MeshBasicMaterial({
          color: 0xa5f3fc,
          transparent: true,
          opacity: 0.48
        });
        const wf = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.42, size * 3.5), wfMat);
        wf.position.set(0, -size * 1.4, size * 0.75);
        g.add(wf);
        waterfalls.push(wf);
      }

      worldGroup.add(g);
    }

    buildWorldEnvironment();

    // ==========================================
    // 5. ARTICULATED 3D CHIBI PROTAGONIST ("QUỶ CỐC")
    //    Faithful to render_1080.jpg & than dieu.png
    // ==========================================
    function createQuycocCharacter() {
      const root = new THREE.Group();

      // Glowing Purple/Cyan 3D Magic Aura Ring under feet (from render_1080.jpg)
      const auraGroup = new THREE.Group();
      auraGroup.position.y = 0.04;
      const outerDisc = new THREE.Mesh(
        new THREE.CircleGeometry(1.45, 32),
        new THREE.MeshBasicMaterial({ color: 0x6741d9, transparent: true, opacity: 0.35 })
      );
      outerDisc.rotation.x = -Math.PI / 2;
      auraGroup.add(outerDisc);

      const midRing = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.08, 32),
        new THREE.MeshBasicMaterial({ color: 0xb197fc, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
      );
      midRing.rotation.x = -Math.PI / 2;
      midRing.position.y = 0.01;
      auraGroup.add(midRing);

      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.62, 32),
        new THREE.MeshBasicMaterial({ color: 0xd0bfff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.02;
      auraGroup.add(innerRing);
      root.add(auraGroup);

      // Materials
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cfb4, roughness: 0.55 });
      const hairDarkMat = new THREE.MeshStandardMaterial({ color: 0x36241c, roughness: 0.65 });
      const hairWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.5 });
      const tunicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xdce2e6, roughness: 0.7 });
      const tunicNavyMat = new THREE.MeshStandardMaterial({ color: 0x3b4d59, roughness: 0.7 });
      const sashBrownMat = new THREE.MeshStandardMaterial({ color: 0x824930, roughness: 0.65 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x46484d, roughness: 0.8 });
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x423026, roughness: 0.75 });

      const bodyPivot = new THREE.Group();
      root.add(bodyPivot);

      // --- LEGS & BOOTS ---
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.24, 0.62, 0);
      const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.36, 10), pantsMat);
      lThigh.position.y = -0.18;
      lThigh.castShadow = true;
      const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.34), bootMat);
      lBoot.position.set(0, -0.46, 0.04);
      lBoot.castShadow = true;
      leftLeg.add(lThigh, lBoot);
      bodyPivot.add(leftLeg);

      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.24, 0.62, 0);
      const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.36, 10), pantsMat);
      rThigh.position.y = -0.18;
      rThigh.castShadow = true;
      const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.34), bootMat);
      rBoot.position.set(0, -0.46, 0.04);
      rBoot.castShadow = true;
      rightLeg.add(rThigh, rBoot);
      bodyPivot.add(rightLeg);

      // --- TORSO (Cross-Collar Martial Arts Tunic & Brown Sash) ---
      const torsoGroup = new THREE.Group();
      torsoGroup.position.y = 0.98;
      bodyPivot.add(torsoGroup);

      // Main tunic body (split grey-white & navy)
      const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.72, 14), tunicWhiteMat);
      chest.castShadow = true;
      torsoGroup.add(chest);

      const navyVest = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.43, 0.71, 14, 1, false, 0, Math.PI), tunicNavyMat);
      navyVest.rotation.y = Math.PI * 0.15;
      torsoGroup.add(navyVest);

      // Diagonal Brown Chest Strap
      const chestStrap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.68), sashBrownMat);
      chestStrap.rotation.z = -0.52;
      chestStrap.position.y = 0.04;
      torsoGroup.add(chestStrap);

      // Layered Brown Waist Sash/Belt
      const waistBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.22, 14), sashBrownMat);
      waistBelt.position.y = -0.22;
      torsoGroup.add(waistBelt);

      // Hanging belt tie
      const beltTail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.08), sashBrownMat);
      beltTail.position.set(0.16, -0.36, 0.38);
      beltTail.rotation.z = -0.12;
      torsoGroup.add(beltTail);

      // --- ARMS & WRIST WRAPS ---
      function buildArm(isLeft) {
        const armPivot = new THREE.Group();
        armPivot.position.set(isLeft ? -0.46 : 0.46, 0.24, 0);

        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.24, 10), isLeft ? tunicWhiteMat : tunicNavyMat);
        sleeve.position.y = -0.1;
        sleeve.castShadow = true;
        armPivot.add(sleeve);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.26, 10), skinMat);
        forearm.position.y = -0.32;
        forearm.castShadow = true;
        armPivot.add(forearm);

        const wristWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.12, 10), pantsMat);
        wristWrap.position.y = -0.36;
        armPivot.add(wristWrap);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMat);
        hand.position.y = -0.48;
        armPivot.add(hand);

        return armPivot;
      }

      const leftArm = buildArm(true);
      const rightArm = buildArm(false);
      torsoGroup.add(leftArm, rightArm);

      // --- CHIBI HEAD, EYES & ICONIC WHITE-STREAKED PONYTAIL ---
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.78, 0.02);
      torsoGroup.add(headGroup);

      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.54, 20, 20), skinMat);
      headMesh.scale.set(1.04, 0.98, 0.98);
      headMesh.castShadow = true;
      headGroup.add(headMesh);

      // Ears
      [-0.53, 0.53].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), skinMat);
        ear.position.set(ex, -0.04, 0);
        headGroup.add(ear);
      });

      // Determined Eyebrows & Expressive Eyes
      const browMat = new THREE.MeshBasicMaterial({ color: 0x241610 });
      const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.05), browMat);
      leftBrow.position.set(-0.21, 0.11, 0.5);
      leftBrow.rotation.z = -0.22;
      const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.05), browMat);
      rightBrow.position.set(0.21, 0.11, 0.5);
      rightBrow.rotation.z = 0.22;
      headGroup.add(leftBrow, rightBrow);

      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x2b1912 });
      [-0.2, 0.2].forEach(ex => {
        const eyeBg = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), eyeWhiteMat);
        eyeBg.scale.set(0.9, 1.15, 0.5);
        eyeBg.position.set(ex, -0.02, 0.49);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), pupilMat);
        pupil.scale.set(0.9, 1.15, 0.5);
        pupil.position.set(ex, -0.02, 0.525);
        headGroup.add(eyeBg, pupil);
      });

      // Hair Cap & Sideburns
      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.575, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
        hairDarkMat
      );
      hairCap.rotation.x = -0.25;
      hairCap.castShadow = true;
      headGroup.add(hairCap);

      // Spiky front bangs + Signature White Hair Streak!
      const bangGeo = new THREE.ConeGeometry(0.12, 0.34, 6);
      const whiteBang = new THREE.Mesh(bangGeo, hairWhiteMat);
      whiteBang.position.set(-0.1, 0.36, 0.46);
      whiteBang.rotation.set(0.45, 0, 0.22);
      headGroup.add(whiteBang);

      const whiteSideStreak = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.18), hairWhiteMat);
      whiteSideStreak.position.set(-0.48, 0.26, 0.16);
      whiteSideStreak.rotation.z = 0.28;
      headGroup.add(whiteSideStreak);

      [-0.36, 0.16, 0.36].forEach((bx, idx) => {
        const b = new THREE.Mesh(bangGeo, hairDarkMat);
        b.position.set(bx, 0.34, 0.44 - Math.abs(bx) * 0.2);
        b.rotation.set(0.42, 0, -bx * 0.5);
        headGroup.add(b);
      });

      // Tied-up High Ponytail
      const ponytailGroup = new THREE.Group();
      ponytailGroup.position.set(0, 0.48, -0.38);
      const hairTie = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 16), hairWhiteMat);
      hairTie.rotation.x = Math.PI / 3;
      ponytailGroup.add(hairTie);

      for (let p = 0; p < 5; p++) {
        const tailSpike = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 0.72, 7),
          p === 1 ? hairWhiteMat : hairDarkMat
        );
        tailSpike.position.set((p - 2) * 0.08, 0.22 - Math.abs(p - 2) * 0.06, -0.22);
        tailSpike.rotation.x = -0.85 - p * 0.08;
        tailSpike.rotation.z = (p - 2) * 0.22;
        tailSpike.castShadow = true;
        ponytailGroup.add(tailSpike);
      }
      headGroup.add(ponytailGroup);

      // --- BROAD IRON GREATSWORD (Strapped diagonally on back) ---
      const swordGroup = new THREE.Group();
      const steelMat = new THREE.MeshStandardMaterial({
        color: 0x768287,
        metalness: 0.78,
        roughness: 0.28
      });
      const bladeEdgeMat = new THREE.MeshStandardMaterial({
        color: 0xbac4c9,
        metalness: 0.85,
        roughness: 0.2
      });
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x5c3629, roughness: 0.8 });

      // Broad Blade
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.65, 0.06), steelMat);
      blade.position.y = -0.35;
      blade.castShadow = true;
      swordGroup.add(blade);

      // Fuller / Center ridge
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.08), bladeEdgeMat);
      ridge.position.y = -0.32;
      swordGroup.add(ridge);

      // Pointed Tip
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.225, 0.42, 4), bladeEdgeMat);
      tip.rotation.y = Math.PI / 4;
      tip.rotation.x = Math.PI;
      tip.scale.set(1, 1, 0.22);
      tip.position.y = -1.38;
      swordGroup.add(tip);

      // Crossguard
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.16), steelMat);
      guard.position.y = 0.5;
      swordGroup.add(guard);

      // Hilt & Pommel
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.52, 8), gripMat);
      handle.position.y = 0.82;
      swordGroup.add(handle);

      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), steelMat);
      pommel.position.y = 1.1;
      swordGroup.add(pommel);

      // Default Back-holstered transform
      function holsterSword() {
        torsoGroup.add(swordGroup);
        swordGroup.position.set(0.05, 0.15, -0.44);
        swordGroup.rotation.set(0.15, 0, -0.78);
        swordGroup.scale.setScalar(1);
      }

      // Wielded in Right Hand transform
      function drawSword() {
        rightArm.add(swordGroup);
        swordGroup.position.set(0, -0.48, 0.45);
        swordGroup.rotation.set(-Math.PI / 2, 0, 0);
        swordGroup.scale.setScalar(1.12);
      }

      holsterSword();

      return {
        root,
        bodyPivot,
        torsoGroup,
        headGroup,
        ponytailGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        swordGroup,
        auraGroup,
        midRing,
        innerRing,
        holsterSword,
        drawSword
      };
    }

    const player = createQuycocCharacter();
    scene.add(player.root);

    // Click-to-Move Ground Target Indicator Ring
    const moveMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 24),
      new THREE.MeshBasicMaterial({ color: 0x51cf66, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    moveMarker.rotation.x = -Math.PI / 2;
    moveMarker.position.y = 0.05;
    moveMarker.visible = false;
    scene.add(moveMarker);

Object.assign(window.QC, { worldGroup, ARENA_RADIUS, createTerrainTexture, buildWorldEnvironment, createWuxiaPagoda, createMagicPortal, createStoneLantern, createSpiritFlower, createFloatingPeak, createQuycocCharacter, player, moveMarker });
