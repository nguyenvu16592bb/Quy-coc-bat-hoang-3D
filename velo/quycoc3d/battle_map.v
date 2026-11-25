module main

import math
import time
import velo.assets
import velo.core
import velo.render3d

// ============================================================================
//  battle_map.v — the 5-hero battle formation (trận hình), auto-battle,
//  3-phase raid boss, combo / rage / threat / healer AI and the damage log.
//
//  The base game fields 3 heroes (team.v: build_party) from an 8-hero roster.
//  This file expands the field to 5 WITHOUT touching team.v: the two extra
//  members (slots 3-4) are spawned at runtime by expand_party_to_five() and
//  driven by BattleCompanionAI. The original 3 keep CompanionAI.
//
//  Roles come from the roster itself (content.v): Kim Cương (id 5, hp_mult
//  1.35 — the highest — tanks), Bạch Hổ (id 7, Ngự Thú Sư — supports and
//  heals), everyone else deals damage. The default 5-formation is therefore
//  ids [0, 1, 2] + extra [5, 7]: three damage dealers, one tank, one healer.
//
//  Limits the reader should know (engine behaviour, not bugs here):
//  * HP is ONE shared pool (GState.hp) for the whole party, so "heal the
//    lowest-HP ally" means healing the party pool when it drops low.
//  * EnemyAI (enemies.v) always chases the leader node (World/Hero). Threat
//    is therefore tracked as a real ranking (damage dealt + tank taunt) and
//    the tank is steered to the front; the director can only hand the
//    leader's Hero name to a tank that sits in slots 0-2 (switch_leader
//    indexes hero_ids[3]). A tank in slot 3-4 cannot take the Hero name
//    without a team.v change — flagged, not faked.
//  * apply_hit() rolls crit/variance internally and returns nothing, so the
//    damage log records the raw damage handed to it (pre-variance), and
//    director-triggered skill casts log the skill name, not a damage number.
//
//  CHUẨN CHUNG VÒNG 3 (1 chuẩn duy nhất, khớp HTML js/03-battle.js — nhóm 2):
//  1. Nộ khí: đầy 100 nộ → bấm Nộ Trảm TAY (phím T / battle_rage_slash):
//     dmg = Công x4 + Combo x10, AoE 6m, sau đó nộ về 0, combo về 0.
//     KHÔNG tự bùng +45% 6s nữa (khối auto-burst cũ + hằng battle_rage_burst_s
//     đã gỡ; aura vẫn tồn tại cho skill Kim Cang Hộ Thể ở combat.v).
//  2. Boss raid: Kim Thiềm Vương 20000 HP / 120s / 3 phase (66%/33%,
//     mỗi phase gọi 3 quái con) — start_raid_boss dùng boss này cho raid,
//     boss theo map vẫn giữ cho map thường.
//  3. AoE raid: 90 dmg cố định (raid_aoe_dmg), cả đội (HP chung).
//  4. Thưởng boss thế giới (mốc >=20000 dmg): +5000 vàng + 50 linh thạch
//     + 5 Đá Cường Hóa — xem world_boss_fight ở pvp.v.
//  5. Tank aggro thật: tank khiêu khích (battle_taunt, 6s) → EnemyAI đuổi
//     theo slot tank (taunt_target_pos); threat cao nhất = mục tiêu.
//     Không có taunt đang chạy → quái vẫn đuổi theo leader như cũ.
// ============================================================================

// ---- tuning constants (no unexplained magic numbers) ----
const battle_party_max = 5 // field members in a full formation (roster stays 8)
const battle_roster_max = 8
const battle_combo_window = f32(3.0) // seconds: a hit inside the window keeps the combo (chuẩn chung vòng 2, khớp HTML comboTimer=3)
const battle_rage_max = 100 // rage (nộ khí) caps here, then waits for a manual Nộ Trảm (chuẩn chung vòng 3)
const battle_rage_per_hit = 6 // rage gained per landed hit
const battle_rage_per_kill = 15 // rage gained per kill
const battle_rage_slash_mult = 4 // Nộ Trảm: Công x4 (chuẩn chung vòng 3, khớp HTML castRageSkill)
const battle_rage_slash_combo = 10 // Nộ Trảm: +10 mỗi combo (chuẩn chung vòng 3)
const battle_rage_slash_range = f32(6.0) // Nộ Trảm: AoE 6m quanh leader
const battle_taunt_duration_s = f32(6.0) // khiêu khích giữ aggro 6 giây
const battle_taunt_threat = 200 // threat cộng thêm khi khiêu khích
const battle_taunt_cd_s = f32(8.0) // tank tự khiêu khích lại sau 8 giây
const raid_boss_max_hp = 20000 // Kim Thiềm Vương: 20000 HP (chuẩn chung vòng 3)
const raid_time_limit_s = f32(120.0) // raid giới hạn 120 giây (chuẩn chung vòng 3)
const raid_aoe_dmg = 90 // AoE raid: 90 dmg cố định (chuẩn chung vòng 3)
const battle_log_max = 50 // damage-log lines kept in memory (newest last; chuẩn chung vòng 2, khớp HTML)
const battle_heal_threshold = f32(0.5) // healer acts when party HP is below 50%
const battle_heal_cost_mp = 20 // MP the healer spends per heal
const battle_heal_cd = f32(6.0) // seconds between healer heals
const battle_taunt_per_sec = 10 // threat the tank generates per second in combat
const raid_phase_2_pct = 66 // boss HP % where phase 2 starts
const raid_phase_3_pct = 33 // boss HP % where phase 3 starts
const raid_minion_count = 3 // minions summoned on every phase change
const raid_aoe_warn_s = f32(1.2) // seconds of AoE warning before the blast lands

// ---------- roles ----------

// hero_role: the battle role of a roster hero id.
fn hero_role(id int) string {
	if id == 5 {
		return 'tank' // Kim Cương: hp_mult 1.35, the sturdiest hero
	}
	if id == 7 {
		return 'healer' // Bạch Hổ: Ngự Thú Sư, the support hero
	}
	return 'dps'
}

// party_hero_id: the roster hero id of a field slot (0-2 from hero_ids,
// 3-4 from hero_ids_extra). Safe for any slot, falls back to slot 0.
fn party_hero_id(slot int) int {
	s := gs()
	if slot < 0 {
		return s.hero_ids[0]
	}
	if slot < 3 {
		return s.hero_ids[slot]
	}
	if slot - 3 < 2 {
		return s.hero_ids_extra[slot - 3]
	}
	return s.hero_ids[0]
}

// party_role: the battle role of a field slot.
fn party_role(slot int) string {
	return hero_role(party_hero_id(slot))
}

// party_hero_name: the display name of a field slot's hero.
fn party_hero_name(slot int) string {
	return hero_def(party_hero_id(slot)).name
}

// ---------- shared battle accounting (GState-backed) ----------

// battle_log_add: appends one line to the in-memory damage log, keeping only
// the newest battle_log_max lines.
fn battle_log_add(msg string) {
	mut s := gs()
	s.battle_log << msg
	for s.battle_log.len > battle_log_max {
		s.battle_log.delete(0)
	}
	s.battle_log_count = s.battle_log.len
	publish()
}

// battle_add_threat: adds threat to a field slot and refreshes the top slot.
fn battle_add_threat(slot int, n int) {
	mut s := gs()
	if slot < 0 || slot >= battle_party_max {
		return
	}
	s.battle_threat[slot] += n
	if s.battle_threat[slot] > s.battle_threat[s.battle_top_threat] {
		s.battle_top_threat = slot
	}
	publish()
}

// battle_register_hit: one landed hit from a field slot — combo +1 (window
// refreshed), rage +6, threat += raw damage, one damage-log line.
fn battle_register_hit(slot int, dmg int) {
	mut s := gs()
	s.battle_combo += 1
	s.battle_combo_t = battle_combo_window
	s.battle_rage += battle_rage_per_hit
	if s.battle_rage > battle_rage_max {
		s.battle_rage = battle_rage_max
	}
	s.battle_threat[slot] += dmg
	if s.battle_threat[slot] > s.battle_threat[s.battle_top_threat] {
		s.battle_top_threat = slot
	}
	battle_log_add('${party_hero_name(slot)} gây ${dmg} sát thương.')
	publish()
}

// battle_register_cast: a skill the auto-battle director cast for the leader
// (the real damage is rolled inside PlayerCombat.cast, so the log records
// the skill name, not an invented number).
fn battle_register_cast(slot int, skill_idx int) {
	mut s := gs()
	s.battle_combo += 1
	s.battle_combo_t = battle_combo_window
	s.battle_rage += battle_rage_per_hit
	if s.battle_rage > battle_rage_max {
		s.battle_rage = battle_rage_max
	}
	s.battle_threat[slot] += s.atk
	if s.battle_threat[slot] > s.battle_threat[s.battle_top_threat] {
		s.battle_top_threat = slot
	}
	battle_log_add('Tự đánh: ${skill_names[skill_idx]}.')
	publish()
}

// battle_top_threat_name: who currently holds aggro, for the battle panel.
fn battle_top_threat_name() string {
	s := gs()
	slot := s.battle_top_threat
	return '${party_hero_name(slot)} (${party_role(slot)})'
}

// battle_rage_slash: Nộ Trảm tay (chuẩn chung vòng 3) — đầy 100 nộ thì bấm:
// dmg = Công x4 + Combo x10 lên mọi quái trong 6m quanh leader, sau đó nộ
// về 0, combo về 0. Trả về false khi nộ chưa đầy hoặc không có quái gần
// (không trừ nộ trong 2 trường hợp đó).
fn battle_rage_slash(sc &core.Scene) bool {
	mut s := gs()
	if s.battle_rage < battle_rage_max {
		show_banner('Nộ khí chưa đầy! Đánh trúng để tích nộ (đang ${s.battle_rage}/100).')
		return false
	}
	hp := hero_pos(sc) or { return false }
	raw := f32(s.atk * battle_rage_slash_mult + s.battle_combo * battle_rage_slash_combo)
	mut hits := 0
	for mut e in enemies_of(sc) {
		if e.position().distance(hp) <= battle_rage_slash_range {
			apply_hit(mut e, raw, true, 10)
			hits++
		}
	}
	if hits == 0 {
		show_banner('Không có quái trong vòng 6m để dùng Nộ Trảm!')
		return false
	}
	s.battle_rage = 0
	s.battle_combo = 0
	s.battle_combo_t = 0
	if mut world := sc.find('World') {
		spawn_whirlwind(mut world, hp, 6, 0.7, false)
	}
	battle_log_add('Nộ Trảm! Công x4 + 10/Combo lên ${hits} quái trong 6m.')
	show_banner('Nộ Trảm! Công x4 + 10/Combo!')
	publish()
	return true
}

// battle_taunt: tank ở field slot khiêu khích — quái ưu tiên đuổi theo tank
// trong battle_taunt_duration_s giây (chuẩn chung vòng 3). Cộng ngay
// battle_taunt_threat threat để tank thành mục tiêu cao nhất. Chỉ tank mới
// khiêu khích được; slot sai hoặc đã có taunt mạnh hơn thì không làm gì.
fn battle_taunt(slot int) {
	mut s := gs()
	if slot < 0 || slot >= battle_party_max {
		return
	}
	if party_role(slot) != 'tank' {
		return
	}
	s.taunt_slot = slot
	s.taunt_active = true
	s.taunt_t = battle_taunt_duration_s
	battle_add_threat(slot, battle_taunt_threat)
	battle_log_add('${party_hero_name(slot)} khiêu khích! Quái dồn vào tank (6 giây).')
	show_banner('${party_hero_name(slot)} KHIÊU KHÍCH! Quái đang dồn vào tank!')
	publish()
}

// taunt_target_pos: vị trí quái phải đuổi theo khi có taunt đang chạy —
// vị trí của node tank. Trả về none khi không có taunt / tank không hợp lệ
// (khi đó EnemyAI vẫn đuổi theo leader như cũ).
fn taunt_target_pos(sc &core.Scene) ?core.Vec3 {
	s := gs()
	if !s.taunt_active || s.taunt_t <= 0 {
		return none
	}
	if s.taunt_slot < 0 || s.taunt_slot >= s.party.len {
		return none
	}
	mut n := s.party[s.taunt_slot]
	if n == unsafe { nil } || !n.active {
		return none
	}
	_ = sc
	tr := render3d.transform3d(mut n)
	return tr.position
}

// toggle_auto_battle: flips auto-battle on/off (BattlePanel button / B key).
fn toggle_auto_battle() {
	mut s := gs()
	s.auto_battle = !s.auto_battle
	if s.auto_battle {
		show_banner('Tự Đánh: BẬT — đội tự đánh, dùng skill, uống đan.')
		battle_log_add('Tự đánh đã bật.')
	} else {
		show_banner('Tự Đánh: TẮT.')
		battle_log_add('Tự đánh đã tắt.')
	}
	publish()
}

// toggle_battle_speed: battle speed x1 ↔ x2 (mirrors HTML toggleSpeed).
// BattleDirector.update multiplies its dt by GState.battle_speed.
fn toggle_battle_speed() {
	mut s := gs()
	s.battle_speed = if s.battle_speed == f32(1) { f32(2) } else { f32(1) }
	show_banner('Tốc độ trận đấu: x${int(s.battle_speed)}.')
	battle_log_add('Tốc độ trận đấu x${int(s.battle_speed)}.')
	publish()
}

// toggle_battle_pause: freeze / resume the battle loop (mirrors HTML
// togglePause). BattleDirector.update returns early while paused; the panel
// UI is a separate component, so its buttons still work while paused.
fn toggle_battle_pause() {
	mut s := gs()
	s.battle_paused = !s.battle_paused
	show_banner(if s.battle_paused { 'Tạm dừng trận đấu.' } else { 'Tiếp tục trận đấu.' })
	battle_log_add(if s.battle_paused { 'Tạm dừng trận đấu.' } else { 'Tiếp tục trận đấu.' })
	publish()
}

// skip_battle: request a battle skip (mirrors HTML skipBattle). The director
// consumes the flag on its next update and clears normal enemies at once.
fn skip_battle() {
	mut s := gs()
	s.battle_skip = true
	publish()
}

// skip_battle_clear: kill every living non-boss enemy through apply_hit, so
// death rewards (EXP/drops) are paid exactly like a real kill — bosses are
// excluded, like HTML skipBattle. Called once per skip request.
fn skip_battle_clear(sc &core.Scene) {
	mut cleared := 0
	for mut e in enemies_of(sc) {
		if e.boss {
			continue
		}
		apply_hit(mut e, f32(99999), true, 0)
		cleared++
	}
	battle_log_add('Bỏ qua trận: hạ ${cleared} quái thường (boss không tính).')
	show_banner('Bỏ qua trận: đã hạ ${cleared} quái thường.')
	publish()
}

// ---------- 5-hero formation ----------

// expand_party_to_five: spawns field slots 3-4 (tank + healer) beside the
// existing party, exactly like build_party dresses its companions. Safe to
// call twice (no-op once the field is full) and safe before the party exists.
fn expand_party_to_five() {
	mut s := gs()
	if s.party.len >= battle_party_max || s.party.len == 0 {
		return
	}
	sc := live_scene() or { return }
	mut world := sc.find('World') or { return }
	base := hero_pos(sc) or { return }
	for i in s.party.len .. battle_party_max {
		hid := party_hero_id(i)
		mut n := core.Node.new('Ally${i}')
		n.add_component(&render3d.Transform3D{
			position: core.vec3(base.x - f32(i) * 1.8, 0, base.z + f32(i) * 1.4)
		})
		n.add_component(&render3d.SkinnedModel3D{
			model: assets.ref[assets.Model](hero_model_id)
			rim:   0.25
		})
		n.add_component(&HeroController{})
		n.add_component(&PlayerCombat{})
		n.add_component(&HeroMember{
			slot:    i
			hero_id: hid
		})
		n.add_component(&BattleCompanionAI{
			slot: i
		})
		world.add_child(mut n)
		s.party << n
		equip_hero(n, hid)
	}
	s.party_size = s.party.len
	apply_hero_stats()
	show_banner('Trận hình 5 người đã lập! Tank + Healer nhập đội.')
	battle_log_add('Trận hình 5 người: ${party_hero_name(3)} (tank) + ${party_hero_name(4)} (healer).')
	publish()
}

// ---------- BattleCompanionAI: the AI of field slots 3-4 ----------
// Pentagon formation around the leader (2*pi/5 per slot); the tank pushes
// toward the nearest enemy, the healer holds back and heals the party pool
// when it drops below half. Attacks reuse apply_hit like CompanionAI.

pub struct BattleCompanionAI {
	core.Component
pub mut:
	slot    int
	speed   f32 = 6.6
	cd      f32 @[hide]
	heal_cd f32 @[hide]
	taunt_t f32 @[hide]
	taunt_cd f32 @[hide]
}

pub fn (mut c BattleCompanionAI) start() {
	c.cd = 0.4 + f32(c.slot) * 0.35
}

pub fn (mut c BattleCompanionAI) update(dt f32) {
	s := gs()
	if s.leader == c.slot {
		return
	}
	sc := c.scene()
	lp := hero_pos(sc) or { return }
	mut tr := render3d.transform3d(mut c.node)
	role := party_role(c.slot)
	// pentagon slot around the leader (2*pi/5 = 1.2566 rad per slot)
	ang := f32(c.slot) * 1.2566 + 0.7
	mut want := lp + core.vec3(f32(math.cos(ang)) * 2.6, 0, f32(math.sin(ang)) * 2.6)
	// the tank steps 1.2 units toward the nearest enemy, in front of the party
	if role == 'tank' {
		if e0 := nearest_enemy_from(sc, tr.position, 12) {
			mut to_e := e0.position() - tr.position
			to_e.y = 0
			if to_e.length() > 0.05 {
				want = want + to_e.normalized().mul(1.2)
			}
			// taunt: the tank generates threat every second while in combat
			c.taunt_t -= dt
			if c.taunt_t <= 0 {
				c.taunt_t = 1.0
				battle_add_threat(c.slot, battle_taunt_per_sec)
			}
			// chuẩn chung vòng 3: tank tự khiêu khích mỗi 8s (chỉ khi chưa có
			// taunt nào đang chạy) để quái thật sự dồn vào tank
			c.taunt_cd -= dt
			if c.taunt_cd <= 0 {
				c.taunt_cd = battle_taunt_cd_s
				if !s.taunt_active {
					battle_taunt(c.slot)
				}
			}
		}
	}
	mut d := want - tr.position
	d.y = 0
	dist := d.length()
	mut moving := false
	if dist > 0.5 {
		step := math.min(c.speed, dist * 3.2)
		tr.position = tr.position + d.normalized().mul(step * dt)
		tr.position = clamp_to_arena(tr.position)
		tr.face(d)
		moving = true
	}
	// healer: heal the party pool (shared HP) when it is below half, 20 MP a cast
	c.heal_cd -= dt
	if role == 'healer' && c.heal_cd <= 0 && f32(s.hp) < f32(s.max_hp) * battle_heal_threshold {
		if s.mp >= f32(battle_heal_cost_mp) {
			mut ms := gs()
			ms.mp -= f32(battle_heal_cost_mp)
			amount := 60 + ms.level * 2
			ms.hp = int(math.min(f32(ms.max_hp), f32(ms.hp + amount)))
			c.heal_cd = battle_heal_cd
			float_text(sc, tr.position + core.vec3(0, 1.8, 0), '+${amount} HP', 'heal')
			battle_log_add('${party_hero_name(c.slot)} hồi ${amount} HP cho đội.')
			publish()
		}
	}
	// attack the closest beast around this companion
	c.cd -= dt
	if e0 := nearest_enemy_from(sc, tr.position, 3.6) {
		mut e := e0
		mut et := e.position() - tr.position
		et.y = 0
		if et.length() > 0.05 {
			tr.face(et)
		}
		if c.cd <= 0 {
			c.cd = 1.15
			raw := f32(s.atk) * 0.55
			apply_hit(mut e, raw, true, 3)
			battle_register_hit(c.slot, int(raw))
			if mut world := sc.find('World') {
				spawn_whirlwind(mut world, tr.position, 1.7, 0.24, false)
			}
		}
	}
	// animation: run cycle while moving, standing pose otherwise
	if mut sk := c.node.get_component[render3d.SkinnedModel3D]() {
		if moving {
			sk.speed = 1.55
			sk.playing = true
		} else {
			sk.speed = 0
		}
	}
}

// ---------- raid boss: 3 phases ----------

// start_raid_boss: mở raid Kim Thiềm Vương (chuẩn chung vòng 3: 20000 HP /
// 120 giây / 3 giai đoạn) — dùng lại hình dạng boss của map hiện tại nhưng
// máu tối đa được ép về 20000 và tên hiển thị là Kim Thiềm Vương; boss theo
// map vẫn giữ nguyên cho map thường (WaveSpawner.spawn_boss không đổi).
// Thêm 3 quái con lúc mở raid, như mỗi lần đổi phase.
fn start_raid_boss() {
	mut s := gs()
	if s.raid_active {
		show_banner('Raid Boss đang diễn ra!')
		return
	}
	if s.boss_up {
		show_banner('Đã có Boss đang xuất hiện!')
		return
	}
	expand_party_to_five()
	sc := live_scene() or { return }
	mut world := sc.find('World/Enemies') or { return }
	m := maps[s.map_index]
	n := spawn_monster(mut world, m.boss, random_portal_pos(), s.map_index + 1, true)
	s.boss_up = true
	s.boss_ref = n
	for _ in 0 .. 3 {
		spawn_monster(mut world, m.roster[0], random_spawn_pos(), s.map_index + 1, false)
	}
	s.raid_active = true
	s.battle_phase = 1
	s.raid_time_left = raid_time_limit_s
	if mut hb := n.get_component[Health]() {
		hb.hp = raid_boss_max_hp
		hb.max = raid_boss_max_hp
		s.battle_boss_hp = hb.hp
		s.battle_boss_max = hb.max
	}
	show_banner('Raid Boss: Kim Thiềm Vương Giáng Lâm! (20000 HP / 120 giây / 3 giai đoạn)')
	battle_log_add('Raid Boss bắt đầu: Kim Thiềm Vương, 20000 HP, 120 giây.')
	publish()
}

// ---------- BattleDirector: combo/rage/auto-battle/raid driver ----------
// Attached to the HUD node in main.scene; ticks every frame.

pub struct BattleDirector {
	core.Component
pub mut:
	last_kills  int  @[hide]
	auto_t      f32  @[hide]
	tick        f32  @[hide]
	raid_boss   &core.Node = unsafe { nil } @[hide]
	raid_phase  int  @[hide]
	aoe_warned  bool @[hide]
	aoe_t       f32  @[hide]
}

pub fn (mut d BattleDirector) start() {
	d.last_kills = gs().kills
}

pub fn (mut d BattleDirector) update(dt f32) {
	mut s := gs()
	sc := d.scene()
	// paused: freeze the whole battle loop (panel UI is a separate component,
	// so its buttons still work while paused — mirrors HTML togglePause).
	if s.battle_paused {
		return
	}
	// battle speed x1/x2: the effective dt doubles at x2 (mirrors HTML dt * battleSpeed).
	mut eff_dt := dt * s.battle_speed
	// skip: clear normal enemies once, with full kill rewards (bosses excluded).
	if s.battle_skip {
		s.battle_skip = false
		skip_battle_clear(sc)
	}
	// combo window: no hit inside it drops the combo
	if s.battle_combo_t > 0 {
		s.battle_combo_t -= eff_dt
		if s.battle_combo_t <= 0 {
			s.battle_combo = 0
			publish()
		}
	}
	// Nộ khí đầy KHÔNG tự bùng nữa (chuẩn chung vòng 3): nộ chờ người chơi
	// bấm T để Nộ Trảm tay (battle_rage_slash). Nộ giữ nguyên 100 cho tới
	// khi dùng, combo vẫn rớt theo cửa sổ 3s như cũ.
	// taunt countdown: hết 6s thì quái quay lại đuổi theo leader
	if s.taunt_active {
		s.taunt_t -= eff_dt
		if s.taunt_t <= 0 {
			s.taunt_t = 0
			s.taunt_active = false
			s.taunt_slot = 0
			publish()
		}
	}
	// raid countdown: hết 120s mà boss chưa chết thì raid thất bại
	if s.raid_active {
		s.raid_time_left -= eff_dt
		if s.raid_time_left <= 0 {
			s.raid_time_left = 0
			d.end_raid(false)
			return
		}
	}
	// kills since last frame feed combo + rage + the log
	if s.kills > d.last_kills {
		diff := s.kills - d.last_kills
		d.last_kills = s.kills
		s.battle_combo += diff
		s.battle_combo_t = battle_combo_window
		s.battle_rage += battle_rage_per_kill * diff
		if s.battle_rage > battle_rage_max {
			s.battle_rage = battle_rage_max
		}
		battle_log_add('Hạ gục ${diff} yêu thú (+${battle_rage_per_kill * diff} nộ).')
		publish()
	}
	// auto-battle: the leader casts on his own + drinks a pill when critical
	if s.auto_battle {
		d.auto_battle_tick(sc, eff_dt)
	}
	// raid boss tracking (throttled): phase changes + AoE + end of raid
	if s.raid_active {
		d.tick += eff_dt
		if d.tick > 0.15 {
			d.tick = 0
			d.raid_tick(sc)
		}
	}
	// AoE warning countdown: the blast lands when it reaches zero
	if d.aoe_warned {
		d.aoe_t -= eff_dt
		if d.aoe_t <= 0 {
			d.aoe_warned = false
			d.raid_aoe_hit(sc)
		}
	}
}

// auto_battle_tick: one auto-battle decision every 0.9s — heal skill when the
// party is hurt, AoE whirlwind into a pack, single-target sword beam, and a
// pill when HP is critical. Only casts skills whose cooldown is ready and
// whose MP cost the party can pay.
fn (mut d BattleDirector) auto_battle_tick(sc &core.Scene, dt f32) {
	d.auto_t -= dt
	mut s := gs()
	// critical HP: drink a Hồi Huyết Đan (pill 0) at once
	if s.hp < s.max_hp / 4 && s.pills[0] > 0 {
		use_pill(0)
		battle_log_add('Tự đánh: uống Hồi Huyết Đan.')
		return
	}
	if d.auto_t > 0 {
		return
	}
	d.auto_t = 0.9
	es := enemies_of(sc)
	if es.len == 0 {
		return
	}
	hp := hero_pos(sc) or { return }
	mut near := 0
	for e in es {
		if e.position().distance(hp) <= 6 {
			near++
		}
	}
	// skill 4 (Kim Cang Hộ Thể) heals: use it when the party is below half HP
	if f32(s.hp) < f32(s.max_hp) * battle_heal_threshold && s.cd[4] <= 0 && s.mp >= f32(skill_mp[4]) {
		cast_skill_idx(sc, 4)
		battle_register_cast(s.leader, 4)
		return
	}
	// skill 3 (Bát Hoang Toàn Phong) AoE into a pack of 3+
	if near >= 3 && s.cd[3] <= 0 && s.mp >= f32(skill_mp[3]) {
		cast_skill_idx(sc, 3)
		battle_register_cast(s.leader, 3)
		return
	}
	// skill 1 (Kiếm Khí Trảm) single target
	if s.cd[1] <= 0 && s.mp >= f32(skill_mp[1]) {
		cast_skill_idx(sc, 1)
		battle_register_cast(s.leader, 1)
		return
	}
	// the tank takes the lead when it holds the most threat — but only a tank
	// in slots 0-2 can take the Hero name (switch_leader indexes hero_ids[3])
	if tank := d.tank_slot_in_core() {
		if tank != s.leader && s.battle_threat[tank] > s.battle_threat[s.leader] {
			switch_leader(tank)
			battle_log_add('${party_hero_name(tank)} lên dẫn đầu, quái đuổi theo tank.')
		}
	}
}

// tank_slot_in_core: the field slot (0-2 only) whose hero is a tank, if any.
fn (mut d BattleDirector) tank_slot_in_core() ?int {
	s := gs()
	_ = d
	for slot in 0 .. 3 {
		if slot >= s.party.len {
			break
		}
		if party_role(slot) == 'tank' {
			return slot
		}
	}
	return none
}

// raid_tick: refresh the raid boss bar; cross a phase line (66% / 33%) and
// the boss summons minions and warns its AoE; a dead boss ends the raid.
fn (mut d BattleDirector) raid_tick(sc &core.Scene) {
	mut s := gs()
	if !s.boss_up {
		d.end_raid(true)
		return
	}
	if d.raid_boss == unsafe { nil } {
		d.raid_boss = s.boss_ref
		d.raid_phase = 1
	}
	if d.raid_boss == unsafe { nil } || !d.raid_boss.active {
		return
	}
	hb := d.raid_boss.get_component[Health]() or { return }
	s.battle_boss_hp = hb.hp
	s.battle_boss_max = hb.max
	pct := if hb.max > 0 { hb.hp * 100 / hb.max } else { 100 }
	if d.raid_phase == 1 && pct <= raid_phase_2_pct {
		d.raid_set_phase(sc, 2)
	} else if d.raid_phase == 2 && pct <= raid_phase_3_pct {
		d.raid_set_phase(sc, 3)
	}
	publish()
}

// raid_set_phase: phase change — banner + log, 3 minions, AoE warning (the
// telegraph ring spins at the boss for raid_aoe_warn_s before the blast).
fn (mut d BattleDirector) raid_set_phase(sc &core.Scene, p int) {
	mut s := gs()
	d.raid_phase = p
	s.battle_phase = p
	show_banner('Raid Boss chuyển giai đoạn ${p}/3! Cẩn thận AoE!')
	battle_log_add('Raid Boss vào giai đoạn ${p}/3, gọi quái con!')
	mut world := sc.find('World/Enemies') or { return }
	m := maps[s.map_index]
	for _ in 0 .. raid_minion_count {
		spawn_monster(mut world, m.roster[0], random_spawn_pos(), s.map_index + 1, false)
	}
	if d.raid_boss != unsafe { nil } {
		if hb := d.raid_boss.get_component[Health]() {
			if mut w2 := sc.find('World') {
				spawn_whirlwind(mut w2, hb.position(), 4.5, raid_aoe_warn_s, false)
			}
		}
	}
	d.aoe_warned = true
	d.aoe_t = raid_aoe_warn_s
	publish()
}

// raid_aoe_hit: the warned AoE lands on the whole party (shared HP pool).
// Chuẩn chung vòng 3: 90 dmg cố định, không tăng theo phase.
// HP never drops below 15 (same floor as enemy_attack).
fn (mut d BattleDirector) raid_aoe_hit(sc &core.Scene) {
	mut s := gs()
	dmg := raid_aoe_dmg
	s.hp -= dmg
	if s.hp < 15 {
		s.hp = 15
	}
	if hp := hero_pos(sc) {
		float_text(sc, hp + core.vec3(0, 1.6, 0), '-${dmg} (AoE)', 'normal')
		if mut world := sc.find('World') {
			burst_colored(mut world, hp + core.vec3(0, 1, 0), core.rgba(255, 90, 70, 255),
				core.rgba(255, 30, 30, 255), 12)
		}
	}
	battle_log_add('Raid Boss AoE gây ${dmg} sát thương cả đội.')
	publish()
}

// end_raid: closes the raid state (won = the boss died; the map-boss reward
// itself is already paid by on_boss_killed).
fn (mut d BattleDirector) end_raid(won bool) {
	mut s := gs()
	if !s.raid_active {
		return
	}
	s.raid_active = false
	s.battle_phase = 1
	s.battle_boss_hp = 0
	d.raid_active_reset()
	if won {
		show_banner('Raid Boss đã bị hạ! Trận hình 5 người chiến thắng!')
		battle_log_add('Raid Boss đã bị hạ!')
	}
	publish()
}

// raid_active_reset: clears the director-side raid tracking.
fn (mut d BattleDirector) raid_active_reset() {
	d.raid_boss = unsafe { nil }
	d.raid_phase = 1
	d.aoe_warned = false
	d.aoe_t = 0
}

// ---------- BattlePanelUI: the battle panel + its HUD button ----------
// Static layout lives in assets/scenes/main.scene (HUD/BattlePanel); this
// component polls its buttons and refreshes the threat + damage-log labels
// (the numeric labels update themselves through store binds).

pub struct BattlePanelUI {
	core.Component
pub mut:
	panel       &core.Node = unsafe { nil } @[hide]
	btn_battle  &core.Node = unsafe { nil } @[hide]
	btn_auto    &core.Node = unsafe { nil } @[hide]
	btn_raid    &core.Node = unsafe { nil } @[hide]
	btn_expand  &core.Node = unsafe { nil } @[hide]
	btn_close   &core.Node = unsafe { nil } @[hide]
	btn_speed   &core.Node = unsafe { nil } @[hide]
	btn_pause   &core.Node = unsafe { nil } @[hide]
	btn_skip    &core.Node = unsafe { nil } @[hide]
	threat_lbl  &core.Node = unsafe { nil } @[hide]
	log_labels  []&core.Node @[hide]
	tick        f32 @[hide]
}

pub fn (mut u BattlePanelUI) start() {
	sc := u.scene()
	if n := sc.find('HUD/BattlePanel') { u.panel = n }
	if n := sc.find('HUD/BtnBattle') { u.btn_battle = n }
	if n := sc.find('HUD/BattlePanel/BtnAuto') { u.btn_auto = n }
	if n := sc.find('HUD/BattlePanel/BtnRaid') { u.btn_raid = n }
	if n := sc.find('HUD/BattlePanel/BtnExpand') { u.btn_expand = n }
	if n := sc.find('HUD/BattlePanel/BtnClose') { u.btn_close = n }
	if n := sc.find('HUD/BattlePanel/BtnSpeed') { u.btn_speed = n }
	if n := sc.find('HUD/BattlePanel/BtnPause') { u.btn_pause = n }
	if n := sc.find('HUD/BattlePanel/BtnSkip') { u.btn_skip = n }
	if n := sc.find('HUD/BattlePanel/ThreatValue') { u.threat_lbl = n }
	for i in 0 .. 4 {
		if n := sc.find('HUD/BattlePanel/Log${i}') { u.log_labels << n }
	}
}

pub fn (mut u BattlePanelUI) update(dt f32) {
	mut s := gs()
	inp := u.input()
	// B opens/closes the battle panel, Escape closes it, N casts Nộ Trảm tay
	// (chuẩn chung vòng 3: đầy 100 nộ mới dùng được, xem battle_rage_slash;
	// phím T đã dùng cho panel Đội ở ui_map.v nên Nộ Trảm dùng phím N)
	if inp.was_pressed(.b) {
		s.show_battle = !s.show_battle
		s.show_map = false
		s.show_team = false
	}
	if inp.was_pressed(.n) {
		battle_rage_slash(u.scene())
	}
	if inp.was_pressed(.escape) {
		s.show_battle = false
	}
	if poll_btn(u.btn_battle) {
		s.show_battle = !s.show_battle
		s.show_map = false
		s.show_team = false
	}
	if poll_btn(u.btn_auto) { toggle_auto_battle() }
	if poll_btn(u.btn_raid) { start_raid_boss() }
	if poll_btn(u.btn_expand) { expand_party_to_five() }
	if poll_btn(u.btn_speed) { toggle_battle_speed() }
	if poll_btn(u.btn_pause) { toggle_battle_pause() }
	if poll_btn(u.btn_skip) { skip_battle() }
	if poll_btn(u.btn_close) { s.show_battle = false }
	if u.panel != unsafe { nil } {
		mut p := u.panel
		p.active = s.show_battle
	}
	// throttled label refresh (threat holder, auto button state, damage log)
	u.tick += dt
	if u.tick < 0.15 {
		return
	}
	u.tick = 0
	set_label(u.threat_lbl, 'Giữ aggro: ${battle_top_threat_name()}')
	set_label(u.btn_auto, if s.auto_battle { 'Tự Đánh: ĐANG BẬT' } else { 'Tự Đánh: Tắt' })
	set_label(u.btn_speed, 'Tốc Độ: x${int(s.battle_speed)}')
	set_label(u.btn_pause, if s.battle_paused { 'Tiếp Tục' } else { 'Tạm Dừng' })
	lines := s.battle_log
	mut start := 0
	if lines.len > 4 {
		start = lines.len - 4
	}
	for i in 0 .. 4 {
		if i >= u.log_labels.len {
			break
		}
		idx := start + i
		txt := if idx < lines.len { lines[idx] } else { '' }
		set_label(u.log_labels[i], txt)
	}
}

// ---------- PvpPanelUI: the arena panel + its HUD button ----------

pub struct PvpPanelUI {
	core.Component
pub mut:
	panel       &core.Node = unsafe { nil } @[hide]
	btn_pvp     &core.Node = unsafe { nil } @[hide]
	btn_fight   &core.Node = unsafe { nil } @[hide]
	btn_boss    &core.Node = unsafe { nil } @[hide]
	btn_close   &core.Node = unsafe { nil } @[hide]
	btn_daily   &core.Node = unsafe { nil } @[hide]
}

pub fn (mut u PvpPanelUI) start() {
	sc := u.scene()
	if n := sc.find('HUD/PvpPanel') { u.panel = n }
	if n := sc.find('HUD/BtnPvp') { u.btn_pvp = n }
	if n := sc.find('HUD/PvpPanel/BtnFight') { u.btn_fight = n }
	if n := sc.find('HUD/PvpPanel/BtnWorldBoss') { u.btn_boss = n }
	if n := sc.find('HUD/PvpPanel/BtnClose') { u.btn_close = n }
	if n := sc.find('HUD/PvpPanel/BtnDaily') { u.btn_daily = n }
}

pub fn (mut u PvpPanelUI) update(dt f32) {
	mut s := gs()
	_ = dt
	inp := u.input()
	if inp.was_pressed(.escape) {
		s.show_pvp = false
	}
	if poll_btn(u.btn_pvp) {
		s.show_pvp = !s.show_pvp
		s.show_map = false
		s.show_team = false
	}
	if poll_btn(u.btn_fight) {
		pvp_fight()
	}
	if poll_btn(u.btn_boss) {
		hour := time.now().hour
		if !world_boss_is_open(hour) {
			show_banner('Boss thế giới mở cửa 20h-21h (hiện tại ${hour}h).')
		} else {
			dmg := pvp_power()
			reward := world_boss_fight(dmg, hour)
			if reward == 0 {
				show_banner('Boss thế giới: gây ${dmg} sát thương, chưa đủ 2000 để nhận thưởng.')
			}
		}
	}
	if poll_btn(u.btn_daily) {
		claim_pvp_daily()
	}
	if poll_btn(u.btn_close) {
		s.show_pvp = false
	}
	if u.panel != unsafe { nil } {
		mut p := u.panel
		p.active = s.show_pvp
	}
}
