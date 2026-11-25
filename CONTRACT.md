# CONTRACT — Mộng Võ Lâm 3D (MVL3D)

Hợp đồng nội bộ cho các module game. **Ai viết module nào phải tuân thủ đúng 100% tên API / tên trường dữ liệu / DOM id dưới đây.**

---

## 0. Quy tắc chung (BẮT BUỘC)

1. **KHÔNG ES module**: cấm `import`/`export`/`<script type="module">`/top-level await. Mỗi file là IIFE gắn vào namespace:

   ```js
   window.MVL = window.MVL || {};
   (function (MVL) {
     'use strict';
     // ... code ...
     MVL.TenModule = ...;
   })(window.MVL);
   ```

2. **Thư viện**: THREE r147 (UMD, global `THREE`), PIXI 6 (UMD, global `PIXI`). three r147 dùng `renderer.outputEncoding = THREE.sRGBEncoding` (KHÔNG dùng `outputColorSpace`). Chỉ dùng BufferGeometry. `SkeletonUtils` có sẵn: `THREE.SkeletonUtils.clone(obj)`.
3. **Không gọi mạng ngoài. Không `alert/confirm/prompt`** (dùng MVL.UI.toast). Toàn bộ chuỗi UI **tiếng Việt có dấu**, chất wuxia.
4. **Dọn dẹp**: mọi object thêm vào phải nằm dưới `Engine.worldRoot` (địa hình/phong cảnh), `Engine.entityRoot` (nhân vật/quái), hoặc `Engine.fxRoot` (hiệu ứng). Khi hủy: gỡ khỏi parent, `MVL.Assets.untrack(group)` nếu có animation, `MVL.Utils.disposeDeep(obj)` cho geometry tự tạo.
5. Hiệu năng: **InstancedMesh** cho cây/đá/bamboo; không cấp phát object mới trong `update(dt)` mỗi frame; tái dùng geometry/material.
6. Cú pháp: kiểm bằng `node --check <file>` — phải PASS trước khi trả lời.

## 1. Sở hữu file

| Module | File |
|---|---|
| CSS | `css/style.css` |
| Thế giới | `js/world/World.js` |
| HUD + FX2D + Minimap (Pixi) | `js/ui/HUD.js` |
| Màn hình + panel + dialog + toast | `js/ui/Screens.js` |
| Thực thể | `js/entities/Entities.js` |
| FX 3D + Combat | `js/systems/Effects.js`, `js/systems/Combat.js` |
| Tiến trình + Túi + Nhiệm vụ + Thành tựu + Chat | `js/systems/Progression.js`, `js/systems/Inventory.js`, `js/systems/Quests.js`, `js/systems/Achievements.js`, `js/systems/Chat.js` |

## 2. Thứ tự nạp (index.html đã cố định)

three → GLTFLoader → DRACOLoader → SkeletonUtils → CopyShader → LuminosityHighPassShader → EffectComposer → RenderPass → MaskPass → ShaderPass → UnrealBloomPass → pixi → **Utils → Data → Save → Audio → Input → Engine → Camera → Assets → Effects → Combat → Progression → Inventory → Quests → Achievements → Chat → World → Entities → HUD → Screens → main**

Lưu ý: file nạp trước **được phép** gọi module nạp sau nhưng **chỉ lúc runtime** (trong hàm), không được gọi lúc khởi tạo top-level.

## 3. Core API (đã viết sẵn — dùng đúng như sau)

### MVL.Utils
`uid(p)`, `clamp(v,a,b)`, `lerp(a,b,t)`, `damp(a,b,lambda,dt)`, `rand(a,b)`, `randInt(a,b)`, `pick(arr)`, `dist2D(x1,z1,x2,z2)`, `angleDelta(a,b)`, `fmt(n)` (1.2K/3.4M), `pad2(n)`, `disposeDeep(obj)`, `makeTextSprite(text,{color,size,scale})` → THREE.Sprite.
`MVL.Bus`: `on(evt,fn)→unsub`, `once`, `off`, `emit(evt,data)`.
`MVL.Utils.RNG.create(seed)` → `{next(),range(a,b),int(a,b),pick(arr)}`.
`MVL.Utils.Noise.create(seed)` → `{n2(x,y): -1..1, fbm(x,y,oct): -1..1}`.

### MVL.Save
`load()→obj|null`, `save(state)`, `clear()`, `exists()`, `export()→base64`, `import(code)→obj|null`.

### MVL.Audio
`init()` (gọi sau gesture đầu), `setVolume('master'|'bgm'|'sfx', 0..1)`, `setMuted(b)`, `sfx(name)` với name ∈ swing,hit,crit,cast,aoe,heal,pickup,coin,levelup,ui,open,close,error,dash,roar,boss,quest,achieve,portal,death,revive,footstep,upgrade, `playBgm(mood)` mood ∈ village,forest,canyon,snow,boss,battle, `stopBgm()`.

### MVL.Input
`init(canvas)`, `axis()` → `{x,z}` chuẩn hóa (z=tiến), `sprinting()`, `isDown('KeyW')`, `isMouse0()`, `consumeAction(name)` — name ∈ jump,dash,interact,target,potion,mount,attack,skill0..3, `consumeJump()`, `triggerAction(name)` (dùng cho nút cảm ứng/tự động test), `onDrag(fn(dx,dy))`, `onWheel(fn(dy))`, `onTap(fn(x,y))`, `setEnabled(bool)`.

### MVL.Engine
`init()`, `renderer`, `scene`, `camera`, `worldRoot`, `entityRoot`, `fxRoot`, `start()`, `addUpdate(fn(dt,elapsed))`, `projectToScreen(v3)` → `{x,y,visible}` (px CSS), `getWorld(x,y)` → THREE.Ray (chọn mục tiêu bằng click), `applyQuality('low'|'medium'|'high')` (pixelRatio, shadowSize 512/1024/2048, bloom on/off), `setBloom(b)`, `quality` (string hiện tại), `stats.fps`.

### MVL.Cam
`init(camera)`, `follow(obj3D)`, `update(dt)`, `yaw` (rad — hướng nhìn; dùng để tính hướng di chuyển camera-relative), `rotateBy(dx,dy)`, `zoomBy(dy)`, `shake(amp,dur)`, `invertY`, `dist`, `minDist`, `maxDist`.
Camera-relative movement: hướng tiến = `(-sin(yaw), 0, -cos(yaw))`... **chuẩn**: hướng nhìn từ camera tới target nằm trên mặt phẳng XZ là `(−sin(yaw), −cos(yaw))`; đi "tiến" = theo hướng đó, "trái" = xoay +90°.

### MVL.Assets
`init()`, `loadManifest(list, onProgress(frac,label))` → Promise, `get(key)→gltf|null`, `instantiate(key, {height=1.75, scale=1, shadows=true, castAll})` → `{group, obj, mixer, anims: [tên clip], playAnim(name,{loop,fade}), stopAnim(), setTint(hex)}` — group đã chuẩn hóa chân chạm đất y=0, giữa trục x/z; `playAnim` tự khớp tên clip (exact → includes → clip đầu); `update(dt)` (bắt buộc gọi mỗi frame); `untrack(group)`; `flash(group, hex, dur)` (nháy đỏ khi trúng đòn); `tex('glow'|'dot'|'streak'|'snow'|'star')` → CanvasTexture.

## 4. Lược đồ dữ liệu (MVL.Data — đã viết, CHỈ ĐỌC)

- `Data.config`: gravity, playerSpeed, sprintMult, jumpVel, dayLength, autosaveSec, reviveGoldCost, bagSize, nameParts, realms (cảnh giới theo cấp: chỉ số `realms[min(floor(level/3), 6)]`), rarities (6 mức `{name,color}`), assetManifest (18 GLB).
- `Data.classes` (4 phái): `{id,name,icon,color,desc,heroModels:[2 model],weapon,base:{hp,mp,atk,def,crit,spd},growth:{hp,mp,atk,def,crit},skills:[4 id]}`.
- `Data.skills`: id → `{id,name,class,icon,type:'melee'|'ranged'|'aoe'|'buff'|'heal'|'dash',mp,cd,castTime,range,radius,dmg:[mult],dot:{dmg,dur},buff:{stat,mult,dur},healMult,dashDist,projectile:{speed,color,size},fx:{color},desc}`. Kỹ năng dùng chung: `cung_ban` (đánh thường), `than_hanh` (dash).
- `Data.items`: id → `{id,name,icon,type:'potion'|'food'|'material'|'weapon'|'helmet'|'armor'|'gloves'|'boots'|'ring'|'amulet'|'mount'|'revive'|'box',weaponClass?,rarity,price(bạc),tier?,stats:{atk,def,hp,mp,crit,spd},heal:{hp,mp},buff?,stack,shop?,desc}`. Vũ khí có `weaponClass` ('thieulam'|'vodang'|'duongmon'|'ngamy') và `tier` 1/2.
- `Data.shopStock.tran_thuong` / `.tieu_nhi` (danh sách item id), `.weaponsByClass[classId]` → [vũ khí t1, t2].
- `Data.affixes`: `{id,name,stat,add}`.
- `Data.monsters` (10): `{id,name,model,height,fly?(độ cao lượn),tint?,level,hp,atk,def,xp,silver:[a,b],gold?(boss),aggro,speed,attackRange,attackCd,wander,leash,animMap:{idle,walk,run,attack,death},elite:{chance,hpMult,atkMult},drops:[{id,chance,qty:[a,b]}],flee?}`. Level thực tế = `def.level + rand 0..2`. `aggro: 0` = quái thụ động (chỉ phản công khi bị đánh).
- `Data.bosses` (5): thêm `phases:[{at (0..1 máu), msg, adds?:{id,count}, skills?}]`, `skills:[{name,type:'aoe'|'charge'|'summon'|'roar',mult,radius,cd,id?(summon),count?(summon),buff?}]`.
- `Data.scenes` (5): `{id,name,desc,bgm,safe,terrain:{seed,size,waterLevel,amplitude,mountains},sky:{top,horizon,sun,ambient,hemi},fog:{color,density},weather:{type:'clear'|'rain'|'snow'|'ash',wind},props:{trees,rocks,bamboo,houses,pagoda,bridge,lanterns,spikes,campfire},spawn:[x,z],npcSpawns:[{npc,x,z}],monsterSpawns:[{monster,count,center:[x,z],radius}],bossSpawn:{boss,x,z},bossSpawn2?,portals:[{to,x,z,label,reqLevel?}]}`.
- `Data.npcs`: `{id,name,icon,model,tint?,height,role:'quest'|'shop'|'smith'|'warp'|'food',greeting,wander}`.
- `Data.quests` (mảng 19): `{id,name,giver,type:'kill'|'collect'|'talk'|'reach'|'boss',target,count,minLevel,desc,story,rewards:{xp,silver,gold,items:[{id,qty}]},next,auto}`.
- `Data.achievements` (12): `{id,name,desc,icon,cond:{k:'kills'|'bosses'|'level'|'silver'|'quests'|'upgrades'|'scenes'|'gold',v},reward:{silver?,gold?}}`.
- `Data.tips`, `Data.story`, `D.chatLines` ([author,text]), `D.chatBot`, `D.helpText` (HTML string).

## 5. BUS EVENTS (tên sự kiện cố định)

Phát: `'interact:target' {type:'npc'|'portal'|'none', label, ref}`, `'npc:interact' {npc}`, `'monster:death' {def, elite, pos}`, `'boss:engage' {name, maxHp}`, `'boss:phase' {msg}`, `'boss:death' {name}`, `'player:hurt'`, `'player:death'`, `'player:levelup' {level}`, `'player:xp'`, `'gold:change'`, `'item:upgraded' {name, plus}`, `'mount:unlock'`, `'quest:accept' {def}`, `'quest:complete' {def}`, `'quest:update'`, `'achieve:unlock' {def}`, `'scene:entered' {id, def}`, `'cast:start' {dur, label}`, `'cast:end'`, `'chat:new' {type, author, text}`, `'save:done'`, `'engine:resize'`, `'engine:quality'`.
Nhận: HUD lắng nghe boss/hurt/cast/chat/interact; Quests lắng nghe npc:interact + scene:entered + monster:death; Achievements lắng nghe nhiều sự kiện thống kê; Game lắng nghe player:death + npc:interact.

## 6. MODULE PHẢI VIẾT (API BẮT BUỘC)

### 6a. MVL.World (js/world/World.js)
```
ready (bool), currentId, timeOfDay (0..1), def (scene def hiện tại)
build(sceneId) → Promise          // dọn worldRoot cũ, dựng mới theo def
dispose()
update(dt)
getHeight(x,z) → float            // PHẢI khớp chính xác lưới địa hình
isWater(x,z) → bool
getPortals() → [{to,x,z,label,reqLevel,group}]   // x,z từ def
getProps() → [{x,z,r}]            // vật cản (nhà, chùa, đá lớn)
getMinimapData() → {radius, portals:[{x,z}], props:[{x,z,r}]}
setTimeSpeed(mult)?  — không bắt buộc
```
Yêu cầu dựng cảnh:
- Địa hình `PlaneGeometry(size,size,128,128)` xoay -PI/2, cao độ = `fbm(x,z)` theo `terrain.amplitude` (amplitude = biên độ tổng), đỉnh núi thêm `mountains` chóp nón viền ngoài bán kính `size/2-10..size/2`. Vertex color theo cao độ/độ dốc: cỏ (màu từ `sky.hemi` pha đất), đất, đá; tuyết trắng ở Tuyết Lĩnh (tự chọn palette đẹp theo từng scene).
- Mặt nước plane tại `waterLevel`, trong suốt, gợn sóng (thay đổi vertex hoặc shader nhẹ), màu theo scene.
- Bầu trời: dome sphere lớn ShaderMaterial gradient (`sky.top`→`sky.horizon`), mặt trời sprite (`Assets.tex('glow')` pha màu `sky.sun`), sao (Points, opacity theo đêm), mây billboard.
- Ánh sáng: HemisphereLight + AmbientLight + DirectionalLight (sun) `castShadow`, shadow camera phủ ~±60, mapSize theo `Engine.quality`; chu kỳ ngày/đêm `timeOfDay += dt / (config.dayLength)`: vị trí mặt trời, cường độ light, màu fog + sky lerp ngày→chạng vạng→đêm (đêm có sao + tối hơn, ambient floor 0.15).
- Thời tiết: `rain` = Points giọt mưa (tex 'streak') rơi trong bán kính ~45 quanh camera, reset lên đỉnh; `snow` = tex 'snow' rơi chậm trôi theo gió; `ash` = tex 'dot' màu xám đỏ bay lơ lửng; `clear` = không spawn.
- Phong cảnh theo `props`: cây InstancedMesh (thân trụ + 2 tán nón), đá Icosahedron, bamboo (trụ mảnh xanh, chỉ scene có `bamboo`), nhà (hộp + mái nón/lăng trụ), chùa nhiều tầng (3 tầng + mái cong đơn giản), cầu vòm, đèn lồng (trụ + khối phát sáng emissive, tối đa 6 PointLight nhỏ nhấp nháy), gai núi lửa (scene ma_canh), lửa trại (hình nón + PointLight nhấp nháy).
- Cổng dịch chuyển: TorusGeometry dựng đứng + vòng sáng emissive + sprite nhãn (Utils.makeTextSprite, màu vàng, reqLevel hiển thị đỏ nếu chưa đủ) + particles; xoay chậm.
- KHÔNG spawn quái/NPC trong World (do Game gọi Mobs/NPCs spawn).
- Đêm nên có đom đóm (Points nhỏ xanh vàng) cho scene rừng/trấn.

### 6b. MVL.Entities (js/entities/Entities.js)
```
class Entity: {name, level, group (đã add vào Engine.entityRoot), pos (group.position), hp, maxHp, alive, team}
  takeDamage(amount, {crit, source, color})  // trừ máu, Assets.flash, FX2D text (Engine.projectToScreen + MVL.FX2D.damageText), nameplate update; chết → die()
  heal(n), distanceTo(other), die(), update(dt)
  nameplate: THREE.Sprite canvas 256×64 (tên + Lv + thanh máu), depthTest false, redraw khi hp đổi (throttle 0.2s)

class Player extends Entity:
  init({name, classId, heroModel, level, hp, mp, pos})  // model = Assets.instantiate(heroModel, {height:1.75}); anim nếu có clip (map idle/walk/run theo tên) else bob thủ công theo tốc độ
  update(dt): đọc Input.axis → di chuyển camera-relative (yaw = MVL.Cam.yaw, tiến = (-sin yaw, -cos yaw)), tốc độ = stats.spd * (sprint? sprintMult:1) * (mounted?2:1); trọng lực + nhảy (World.getHeight; dưới nước đi chậm); dash state (execDash(dist)); quét interactable mỗi 0.15s: NPC gần nhất 2.4m / cổng 2.8m → Bus 'interact:target'; regen 1%/2s; mounted state: model đặt trên lưng ngựa
  stats → Progression.computeStats(); applyStats() đồng bộ maxHp/maxMp
  basicAttack() → MVL.Combat.playerBasicAttack()
  castSkill(i) → MVL.Combat.castPlayerSkill(i)
  execDash(dist) — dịch chuyển nhanh + FX
  takeDamage → Bus 'player:hurt'; hp=0 → Bus 'player:death'
  revive(pos) — phục hồi 50% máu, hiện model
  mountUp()/dismount() — cưỡi ngựa (MVL.Mounts.createHorse())
  pet — MVL.Pet tự tạo theo player

class Monster extends Entity: constructor(def, {x,z,level,elite})
  FSM: idle→(aggro>0: chọn player nếu trong aggro bán kính hoặc bị đánh)→chase→attack (đúng attackRange & cd → MVL.Combat.monsterAttack(this, player))→flee (hp<20% nếu def.flee)→return (xa home quá leash: về nhà + hồi máu đầy)
  fly: lượn ở độ cao def.fly + bob sin
  elite: scale 1.35, tên "✦" + vàng, chỉ số theo elite.hpMult/atkMult
  die(): FX.dissolve, Bus 'monster:death' {def, elite, pos}, Loot.drop(pos, def, elite), respawn do Mobs quản lý
  quái thụ động (aggro===0) chỉ phản công khi bị đánh

class Boss extends Monster:
  khi player vào 14m → Bus 'boss:engage' {name, maxHp}; phase theo def.phases (at = % máu): Bus 'boss:phase' {msg}, spawn adds qua MVL.Mobs.spawnAdd
  dùng def.skills theo cd: 'aoe' = FX.ring đỏ telegraph tại vị trí player 1.1s → MVL.Combat.areaAttack({pos, radius, team:'monster', dmg}); 'charge' = lao về player (dịch chuyển mượt trong 0.5s) + đòn đơn; 'summon' = MVL.Mobs.spawnAdd(id, count quanh boss); 'roar' = buff atk (Audio.sfx('roar') + FX)
  máu <10%: cuồng hóa 1 lần (speed+50%, atk+30%, msg)
  die(): Bus 'boss:death', loot lớn

class NPC extends Entity: đứng yên (wander>0 đi lượn nhẹ), nameplate vàng, khi player gần → Bus 'interact:target' do Player xử lý; interact → Bus 'npc:interact' {npc}

class Pet extends Entity: theo sau player (offset sau lưng 1.8m, spring), xa >10m teleport; hỗ trợ: nếu Combat.currentTarget còn sống & <7m, mỗi 4s cắn nhẹ (Combat.petAttack)

MVL.Mounts.createHorse() → instance horse model (height 1.5, anim run khi chạy)

Quản lý:
MVL.Mobs: {all[], spawnScene(sceneDef), spawnAdd(monsterId, pos, opts), update(dt), nearest(pos, maxDist, filterFn), clear(), aliveCount(), getBoss()}
  spawnScene: theo sceneDef.monsterSpawns (level = def.level + randInt(0,2), elite theo chance), bossSpawn & bossSpawn2 (nếu player level đủ reqLevel? — luôn spawn, gate ở cổng)
  update: gọi update mọi quái; respawn: chết 22s sau hồi sinh tại vị trí cũ (boss không respawn)
MVL.NPCs: {all[], spawnScene(sceneDef), get(id), update(dt), clear()}
MVL.Loot: {spawn(pos, drops), drop(pos, monsterDef, elite), update(dt), clear(), orbs[]}
  drop: rút Inventory.rollDrops(def, elite) → tạo orb (vật phẩm: khối nhỏ màu rarity bob+xoay; bạc: orb vàng; vàng: orb vàng sáng hơn); tự bay về player khi <3.2m (pet aura 6m), chạm <1.0m → Inventory.addItem / Progression.addSilver/addGold + Audio.sfx('pickup'|'coin') + toast nhỏ nếu rarity>=2; despawn 60s
```

### 6c. MVL.FX (js/systems/Effects.js)
```
init(), update(dt), clearAll(), dispose()
hit(pos, {color, size, count})         — vụ nổ hạt
slash(pos, angleY, {radius, color, arc}) — vệt chém hình quạt (mesh + fade nhanh)
ring(pos, {radius, color, duration, thick, telegraph}) — vòng đất; telegraph=true: nhấp đỏ dần rồi chớp trắng (dùng cho boss AOE)
beam(a, b, {color, width, dur})
pillar(pos, {color})                   — trụ sáng (lên cấp, hồi sinh)
healFx(pos), dust(pos), step(pos), trail(pos, color) — nhẹ nhàng
dissolve(group, dur)                   — co nhỏ + chìm + gỡ khỏi scene (dùng khi quái chết)
muzzle(pos, color)                     — tia phát chiêu (ranged)
```
Dùng `Engine.fxRoot`; hạt dùng chung 1-2 hệ Points (buffer ~2000, thuộc tính life/vel tự quản); material additive, texture `Assets.tex('dot'|'glow')`.

### 6d. MVL.Combat (js/systems/Combat.js)
```
init(), update(dt)
currentTarget (Monster|Boss|null)      — Game đặt qua setCurrentTarget()
setCurrentTarget(e), cycleTarget()     — chọn quái gần player nhất còn sống trong 25m
playerBasicAttack()                    — chuỗi 3 đòn (mult 1.0/1.12/1.4, cửa sổ combo 1.1s), mục tiêu: currentTarget nếu trong 2.7m & góc trước <75°, else quái gần nhất, else đánh gió; FX.slash + Audio.sfx('swing'/'hit'/'crit')
castPlayerSkill(slotIndex)             — slot 0..3 theo Data.classes.skills; kiểm cd/mp/castTime (Bus cast:start {dur,label} → cast:end); theo type:
  melee: hình nón trước (range, góc 75°)
  ranged: spawnProjectile về currentTarget hoặc hướng player
  aoe: tại currentTarget.pos hoặc trước player nếu không có mục tiêu (radius) — FX.ring + areaAttack
  buff: addBuff(player, skill.buff)
  heal: hồi healMult × stats.atk (không vượt maxHp) + FX.healFx + sfx('heal')
  dash: player.execDash(dashDist) rồi 1 đòn phạm vi 3m
monsterAttack(monster, target, skill?) — compute + target.takeDamage
petAttack(pet, target)                 — nhẹ (0.4×atk quái ~ cố định 8)
areaAttack({pos, radius, team, dmg(mult×atk nguồn), source, color}) — team 'player' quét Mobs.all; team 'monster' quét player + pet
compute(atkStat, defStat, mult) → {dmg, crit}  — dmg = mult×atk×100/(100+def)×rand(0.9,1.1); crit nếu rand<crit% → ×1.65
dealDamage(entity, amount, opts)       — wrapper gọi entity.takeDamage
spawnProjectile({from, dir, speed, color, size, dmg, source, team, onHit}) — bay, trúng địa hình/quái thì nổ (FX.hit)
applyDot(entity, {dmg(mỗi tick), interval=1s, dur, color})
addBuff(entity, {stat, mult, dur, icon}) → buffStat(entity, stat) hệ số hiện tại (1 = không buff); getPlayerBuffs() → [{stat, mult, remain, icon}]
getCD(skillId) → giây còn lại; isReady(skillId)
aggro(monster, source) —monster chuyển trạng thái
```
Lấy chỉ số: `Progression.computeStats()` (có cache nội bộ). Quái attack: dmg = compute(def.atk, player stats.def, 1.0).

### 6e. MVL.Progression (js/systems/Progression.js)
```
state: {name, classId, heroModel, level, xp, silver, gold, statPoints, skillPoints, alloc:{luc,the,nhanh,noi,hoi}, skills:{skillId:lvl}, hp, mp, playtime, kills, bossesKilled, questsDone, silverEarned, goldEarned, upgrades, mountOwned}
newState(name, classId, heroModel)     — level 1, skills: kỹ năng phái + cung_ban + than_hanh = lvl 1
fromSave(ps) / getSaveState()
addXp(n)                               — next = floor(80 * level^1.5); lên cấp: +5 statPoints, +1 skillPoints, hồi full, Bus 'player:levelup', Audio.sfx('levelup'), FX.pillar (nếu Player có model)
addSilver(n) / spendSilver(n) / addGold(n) / spendGold(n) / canAfford — Bus 'gold:change'
allocate(statId)                       — luc:+2.5 atk; the:+35 hpMax; nhanh:+0.06 spd & +0.4 crit; noi:+25 mpMax; hoi:+0.8 crit
computeStats() → {hpMax, mpMax, atk, def, crit, spd}  — base theo class level + growth + alloc + Inventory.statBonus() + Combat.buffStat('player', stat); CACHE 0.5s
getSkillLevel(id), upgradeSkill(id)    — tốn 1 skillPoints, tối đa 5, Bus toast
realm() → tên cảnh giới theo level
```

### 6f. MVL.Inventory (js/systems/Inventory.js)
```
items[] (mỗi mục {uid, id, qty, rarity?, affixes?:[], plus?, stats?}), equipment {weapon,helmet,armor,gloves,boots,ring,amulet}
reset() / fromSave(list, equip) / exportState()
addItem(id, qty=1) → item|null          — stack theo def.stack; trang bị → tạo instance: rarity = rollRarity(baseRarity) (weights [55,25,12,6,1.8,0.2] offset theo base), affixes: rarity>=2 → (rarity-1) cái random, stats scale = 1 + (rarity-base)*0.15; đầy túi → toast + trả null
removeUid(uid), count(id), hasItem(id, n)
equip(uid) / unequip(slot)              — vũ khí kiểm weaponClass khớp phái
statBonus() → {atk,def,hp,mp,crit,spd}  — cộng stats × (1 + plus*0.12) + affixes
use(uid)                                — potion/food (heal/buff qua Combat.addBuff)/revive (đánh dấu có Hồi Sinh Đan — Game kiểm khi chết)/mount (Bus 'mount:unlock')/box: thien_nga_bao_hap → vũ khí tier1 theo phái; than_binh_bao_hap → vũ khí tier2 + 5 linh_thach
sell(uid)                               — +bạc = price×0.4
buy(itemId) → bool                      — trừ bạc, addItem
upgrade(uid) → 'ok'|'fail'|'no_res'     — cost vàng 200×(plus+1)^1.35, cần Linh Thạch (plus+1) cái; chance = max(0.2, 0.95-0.12×plus); thành công plus+1 (Bus 'item:upgraded', Audio 'upgrade'); thất bại mất nguyên liệu; trả string
rollDrops(def, elite) → [{gold?:n, silver?:n, item?:id, qty?:n}]  — silver trong def.silver, gold nếu def.gold, drops theo chance (elite ×1.8 qty)
useBestPotion()                         — cho phím R: uống đan máu tốt nhất (thêm MP nếu thiếu)
hasReviveItem() / consumeReviveItem()
firstEmptySlot() — phục vụ UI
```

### 6g. MVL.Quests (js/systems/Quests.js)
```
active: [{id, prog}], done: []
reset() / fromSave(q) / exportState()
accept(id)                              — kiểm minLevel; Bus 'quest:accept'
notify(type, payload)                   — type 'kill' {id, elite} / 'boss' {id} / 'talk' {npc} / 'reach' {scene}
  kill đếm theo def.id; collect: prog = min(count, Inventory.count(target)) (kiểm mỗi notify + khi addItem); talk/reach ngay khi khớp
  đủ count → hoàn thành: nhận thưởng (Progression.addXp/addSilver/addGold, Inventory.addItem), Bus 'quest:complete', Audio.sfx('quest'), achievements đếm; tự nhận chain def.next (auto) sau 1.2s (toast "Nhiệm vụ mới")
getAvailableFor(npcId) → quest defs     — giver === npcId, chưa nhận, đủ minLevel
isActive(id), trackerList() → [{text, prog, count}]
currentTargetPos() → {x, z, sceneId}|null — mục tiêu hiện tại cho minimap (center spawn của quái mục tiêu / vị trí NPC talk / tọa độ cổng reach) — dùng Data.scenes tra
```

### 6h. MVL.Achievements (js/systems/Achievements.js)
```
counters: {kills, bosses, level, silver, quests, upgrades, scenes, gold}
reset()/fromSave()/exportState()
notify(type, payload) — gọi từ Progression (level/gold), Quests (quests), Combat hoặc Entities qua Bus monster:death/boss:death (kills/bosses), Game (scenes)
unlock → Bus 'achieve:unlock' {def} + thưởng + Audio.sfx('achieve'); list() → [{def, unlocked}]
```

### 6i. MVL.Chat (js/systems/Chat.js)
```
push(type, author, text) → Bus 'chat:new'   — type: 'system'|'world'|'npc'
ambient timer 22-40s: random Data.chatLines (type 'world')
lắng nghe Bus: player:levelup / quest:complete / achieve:unlock / scene:entered → push system
sendUser(text) → push('world', playerName, text) + 60%概率 bot reply sau 1.5-3s từ Data.chatBot (author 'Thủy Tinh Linh' hoặc ngẫu nhiên)
```

### 6j. MVL.FX2D + MVL.Minimap + MVL.HUD (js/ui/HUD.js)
```
MVL.FX2D: init() (canvas #fx2d-canvas, PIXI.Application {view, resizeTo: window, backgroundAlpha: 0, antialias: true, resolution: devicePixelRatio, autoDensity: true}), damageText(x, y, text, {color='#fff', size=18, crit}), update(dt) — chữ bay lên 40px fade 0.9s (crit to hơn màu #ffd700 có "!")
MVL.Minimap: init() (canvas #minimap-canvas 184×184, PIXI; khung tròn, nền rgba(8,12,18,.85)), update(data) — data = {player:{x,z,yaw}, camYaw, radius, entities:[{x,z,type}]} type ∈ monster,elite,boss,npc,portal,quest,pet,loot; xoay theo camYaw (phía camera = hướng lên); N compass trên rìa (#minimap-compass DOM tự set transform rotate); #minimap-zone DOM hiển thị tên scene
MVL.HUD: init(), update(dt)
  thanh hp/mp/xp (#hp-fill/#mp-fill/#xp-fill + text; XP = % hiện tại), level-badge, player-name, class-badge (icon + màu phái), gold/silver text
  buildSkillBar() — gọi khi vào world & khi upgrade skill: slot [🗡 cơ bản][1-4 kỹ năng][Q dash][R potion] hiển thị icon, key, level, .cd-mask (conic-gradient % hồi chiêu qua Combat.getCD/skill.cd), .no-mp khi thiếu MP; click slot → Input.triggerAction('skill0'+i hoặc 'attack'/'dash'/'potion')
  target-frame (Combat.currentTarget; ẩn khi null), boss-bar (Bus boss:engage/phase/death), cast-bar (Bus cast:start/end)
  buff-row (Combat.getPlayerBuffs: icon + giây)
  quest-tracker (Quests.trackerList, mục quest đang làm hiện ★)
  system-log (Bus chat:new type system; tối đa 30 dòng, fade dần)
  interact-hint (Bus interact:target; ẩn khi 'none')
  minimap update mỗi 0.15s: entities = Mobs.all (alive: monster/elite/boss) + NPCs.all + World.getPortals + Loot.orbs + pet + quest target (Quests.currentTargetPos nếu cùng scene)
  fps-badge, clock-badge (☀️/🌙 + HH:MM theo World.timeOfDay), hurt vignette (Bus player:hurt → #hurt-fx opacity 250ms)
```

### 6k. MVL.UI (js/ui/Screens.js)
```
init()                          — bấm tất cả DOM; hiển thị #screen-login
showLogin(), showCreate(), showLoading(frac, label), hideLoading(), showDeath(), hideDeath()
loadProgress(frac, label)       — cập nhật #load-bar-fill + #load-label (login badge #login-load-badge hiển thị % tải model nền)
createCards()                   — dựng #class-cards (4 thẻ từ Data.classes: icon, tên, mô tả, chỉ số; click chọn — viền màu phái) + #hero-cards (2 thẻ: 'Tam Phong'/'Lệnh Hồ Sung' với ghi chú model GLB của người chơi) + random tên vào #input-name từ Data.config.nameParts (2-3 âm tiết)
toast(text, kind='info', icon)  — kind: info|good|bad|quest|ach → thẻ trong #toast-area, tự biến mất 3.5s (CSS animation)
togglePanel(name) / closeAll()  — name: inventory|character|skills|quests|settings|help|shop|map; chỉ mở 1 panel; map là screen riêng (#screen-map)
renderInventory()               — #equip-slots (7 slot từ Inventory.equipment, click → unequip), #inv-grid (grid cell: icon, qty, badge +N, viền màu rarity r0..r5, click → ctxMenu), #inv-stats (tổng stats từ Progression.computeStats), #inv-gold
ctxMenu(x, y, item)             — menu #ctx-menu: Trang bị / Dùng / Bán / Cường hóa (trang bị, hiện cost + chance) / Thông tin; actions gọi Inventory + renderInventory + toast; click chỗ khác → đóng
renderCharacter()               — #char-stats: tên/phái/cảnh giới (Progression.realm)/cấp/xp; bảng chỉ số + nút [+]\ cho từng stat khi statPoints>0 (luc/the/nhanh/noi/hoi); tổng cộng từ trang bị
renderSkills()                  — #skill-cards: từng skill phái + than_hanh: icon, tên, Lv/max5, mp/cd, desc; nút [Tu luyện] khi skillPoints>0
renderQuests()                  — #quest-active (tên, desc, tiến độ x/y, giver) / #quest-done (đục mờ)
openShop(npc)                   — #shop-title tên NPC; tab Mua (Data.shopStock[npc.id] + nếu role 'shop' thêm vũ khí theo phái từ shopStock.weaponsByClass) tab Bán (items bán được trong túi); click mua/bán → Inventory + renderShop + toast; #shop-gold
openDialog({name, icon, text, options:[{label, fn, primary}]}) — #dialog-box; closeDialog()
dialogForNPC(npc)               — build options: nhiệm vụ có sẵn (Quests.getAvailableFor) → [Nhận nhiệm vụ: tên]; nhiệm vụ talk đang làm → [Trả nhiệm vụ] (gọi Quests.notify('talk')); role shop/food → [Mua sắm] openShop; role smith → [Cường hóa] mở inventory + toast chỉ dẫn; role warp → [Mở bản đồ] togglePanel('map'); [Chào tạm biệt]
renderWorldMap()                — canvas #worldmap-canvas: 5 node tại vị trí cố định (từ tọa độ portals của mong_hanh_son: đông/ tây...), đường nối; đã khám phá (save.discovered) = tên vàng + click → Game.travelTo(id); chưa = '???'; hiện tại = đánh dấu ●; có legend + hướng dẫn
renderSettings()                — sliders giá trị từ Audio._vol, quality select (Engine.quality), checkbox Cam.invertY / autosave; #btn-save-now → Game.saveNow(); export/import qua Save.export/import + #import-area; #btn-reset → xác nhận qua dialog 2 nút (KHÔNG confirm())
renderHelp()                    — #help-content = Data.helpText
showStory(lines)                — bảng chữ mờ intro khi tạo nhân vật mới (3s/ dòng) — tùy chọn
```
UI KHÔNG tự gọi Audio/Input thẳng trừ khi cần: dùng Bus/MVL.Audio.sfx('ui'/'open'/'close').

## 7. DOM ID (index.html đã có — dùng đúng)

HUD: `#hud` `#hp-fill #hp-text #mp-fill #mp-text #xp-fill #xp-text #gold-text #silver-text #level-badge #class-badge #player-name #buff-row` `#target-frame #target-name #target-level #target-hp-fill #target-hp-text` `#boss-bar #boss-name #boss-fill #boss-phase` `#cast-bar #cast-fill #cast-label` `#gold-box #clock-badge #fps-badge #menu-buttons` (nút .mbtn[data-panel]) `#minimap-wrap #minimap-canvas #minimap-compass #minimap-zone` `#quest-tracker #tracker-list` `#system-log #log-list` `#interact-hint #interact-label` `#skill-bar` `#chat-box #chat-list #chat-input #chat-send #chat-row` `#joystick-zone #joystick-base #joystick-stick` `#touch-actions` (nút .tbtn[data-act]) `#xp-bar`
Screens: `#screen-login #btn-new #btn-continue #btn-help-login #login-load-badge` `#screen-create #class-cards #hero-cards #input-name #btn-back-login #btn-enter-world` `#screen-loading #load-label #load-bar-fill #load-tip` `#screen-death #btn-revive-town #btn-revive-here #death-cost` `#screen-map #worldmap-canvas #map-close`
Panels: `#panel-inventory #equip-slots #inv-grid #inv-stats #inv-gold` `#panel-character #char-stats` `#panel-skills #skill-cards` `#panel-quests #quest-active #quest-done` `#panel-shop #shop-title #shop-tabs #tab-buy #tab-sell #shop-buy #shop-sell #shop-gold` `#panel-settings #set-master #set-bgm #set-sfx #set-quality #set-inverty #set-autosave #btn-save-now #btn-export #btn-import #import-area #btn-reset` `#panel-help #help-content`
Khác: `#dialog-box #dialog-icon #dialog-name #dialog-text #dialog-options` `#ctx-menu #toast-area #fade-layer #hurt-fx` + canvases `#game-canvas #fx2d-canvas`

## 8. CSS quy ước (css/style.css)

- Theme "hắc ánh kim": nền tối mực tàu `#0b0e14`, panel `rgba(12,16,24,.93)` viền 1px `#c9a227` (vàng đồng), glow nhẹ; font tiêu đề `"Noto Serif SC", Georgia, serif`, thân `"Be Vietnam Pro", system-ui`.
- `.hidden {display:none !important}`; `.panel {position:fixed; ...}` hiển thị khi bỏ `.hidden`; panel-head có nút `.panel-close`.
- Rarity: `.r0..r5` viền/màu theo Data.config.rarities.
- Skill slot `.skill-slot` (vuông 56px): `.cd-mask` (conic-gradient overlay), `.no-mp`, `.lv` góc, phím `.key`.
- HUD chiếm `#hud {pointer-events:none}` — CHỈ element tương tác có `pointer-events:auto` (buttons, input, panel, dialog, chat, ctx-menu, minimap-wrap? KHÔNG — minimap none).
- Màn hình fullscreen `.screen` (login/create/loading/death/map) có nền riêng (login: gradient + hoa đào `.petal` rơi CSS keyframes).
- Toast `.toast .t-info .t-good .t-bad .t-quest .t-ach`; dialog wuxia cuộn giấy tối; hurt vignette `#hurt-fx` (inset box-shadow đỏ, opacity 0 mặc định, class `.active`).
- `body.touch` → hiện `#joystick-zone`, `#touch-actions`; desktop ẩn (display:none mặc định, `.touch` mới hiện).
- Responsive tối thiểu 360px; scrollbar mảnh tối.

## 9. main.js đảm nhận (THAM KHẢO — không ai viết file này)

Boot → login → tạo nhân vật → `Game.enterScene(id)`: Mobs.clear/NPCs.clear/Loot.clear → World.build → NPCs.spawnScene → Mobs.spawnScene → đặt player → Bus 'scene:entered'. Vòng update: Player → Mobs → NPCs → Loot → Combat → World → FX → HUD → Cam → Assets. Phím UI toggle (I/C/K/J/M/H/Esc) qua Input.consumeAction riêng + keydown trực tiếp. Cổng: interact portal → travelTo (fade, kiểm reqLevel, thêm discovered). Chết: Bus 'player:death' → screen-death → revive town (enterScene('mong_hanh_son')) hoặc tại chỗ (tốn config.reviveGoldCost vàng hoặc Hồi Sinh Đan). Tự lưu 30s. Chọn mục tiêu: Tab (Combat.cycleTarget) + tap → Engine.getWorld(x,y) chọn quái gần tia nhất <1.6m. Chat input → Chat.sendUser. `?autotest=1` tự chạy kịch bản kiểm thử.

## 10. Giữ mạch nội dung

Tên phái/NPC/bản đồ/boss/nhiệm vụ/vật phẩm đọc từ `Data.js` — KHÔNG hardcode chữ trong module (trừ nhãn tĩnh như 'Nhiệm vụ', 'Mua', 'Bán').
