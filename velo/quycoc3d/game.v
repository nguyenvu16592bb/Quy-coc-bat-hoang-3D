module main

import math
import velo.core
import velo.render3d

// ---------- Shared game state ----------
// Mirrors `gameState` in qu_c_c_b_t_hoang_3d.html. A single heap struct referenced
// by a module const; every component reads/writes it (the game loop is single-threaded).

@[heap]
struct GState {
mut:
	// the live scene (set by WorldBuilder.start — used by helpers outside components)
	scene &core.Scene = unsafe { nil }
	// player progression
	level   int = 10
	realm   int
	hp      int = 180
	max_hp  int = 180
	mp      f32 = 426
	max_mp  f32 = 426
	exp     int
	max_exp int = 100
	atk     int = 68
	crit    f32 = 0.35
	dodge   f32 = 0.12
	kills   int
	quest   int = 15
	// buffs (seconds remaining)
	aura f32 // Cảnh Giới Đột Phá: +45% damage, faster
	rage f32 // Bạo Linh Phù: +35% crit
	// consumables: [hp, mp, rage]
	pills [3]int = [10, 8, 5]!
	// camera zoom 20..85 (percent, 35 = wide isometric like the design)
	zoom f32 = 35
	// banner
	banner   string
	banner_t f32
	// skill cooldowns (7 skills)
	cd [7]f32
	// hero status shared between components
	hero_moving bool
	// pending dungeon wave (set by HUD buttons, consumed by WaveSpawner)
	pending_wave string
	// ---- Bát Hoang Địa Đồ (map progression) ----
	map_index int
	map_kills int
	map_goal  int = 12
	cleared   [16]bool
	boss_up   bool
	boss_ref  &core.Node = unsafe { nil }
	stones    int // Linh Thạch: reward from clearing a map
	// ---- party (3 heroes on the field, 8 in the roster) ----
	party    []&core.Node
	leader   int
	hero_ids [3]int = [0, 1, 2]!
	// ---- UI panels ----
	show_map  bool
	show_team bool
	// ---- môn phái / kinh tế / trang bị / pet / bang / nhiệm vụ / PvP ----
	// (sects.v, economy.v, equipment.v, pets.v, guild.v, quests.v, pvp.v, save.v)
	sect_id             int = -1 // -1 = chưa nhập phái
	def                 int
	gold                int = 500
	silver              int = 2000
	inventory           []int
	equip_slots         [6]int = [-1, -1, -1, -1, -1, -1]!
	equip_level         [6]int
	gem_slots           [6]int = [-1, -1, -1, -1, -1, -1]!
	pet_id              int = -1 // -1 = chưa có thần thú theo cùng
	pet_level           int = 1
	pet_evo             int
	guild_id            int = -1 // -1 = chưa vào bang, 99 = bang tự lập
	guild_name          string
	guild_contrib       int
	guild_total_contrib int
	guild_log           []string
	quest_current       int
	quest_progress      [20]int
	quest_done          [20]bool
	daily_count         [7]int
	pvp_rank            int = 1000
	pvp_points          int
	pvp_wins            int
	pvp_losses          int
	world_boss_dmg      int
}

const g = &GState{}

const realms = ['Trúc Cơ Kỳ', 'Kim Đan Kỳ', 'Nguyên Anh Kỳ', 'Hóa Thần Kỳ', 'Đăng Tiên Cảnh']

// hero_def: the roster entry of a hero id (safe for any id).
fn hero_def(id int) HeroDef {
	if id < 0 || id >= heroes.len {
		return heroes[0]
	}
	return heroes[id]
}

// apply_hero_stats: recomputes the party's HP/ATK/CRIT from the level and the
// leader's hero multipliers (roster 0 = balanced, 5 = tank, 6 = assassin...).
fn apply_hero_stats() {
	mut s := gs()
	h := hero_def(s.hero_ids[s.leader])
	base_hp := 180 + (s.level - 10) * 35
	base_atk := 68 + (s.level - 10) * 14
	s.max_hp = int(f32(base_hp) * h.hp_mult)
	s.atk = int(f32(base_atk) * h.atk_mult)
	s.crit = f32(0.35) + h.crit_add
	if s.hp > s.max_hp {
		s.hp = s.max_hp
	}
	publish()
}

// gs: a mutable view of the shared state (game loop is single threaded).
fn gs() &GState {
	unsafe {
		return g
	}
}

// init_state: seed the saved-data keys the HUD binds to.
fn init_state() {
	publish()
}

// live_scene: the loaded scene (none before WorldBuilder starts).
fn live_scene() ?&core.Scene {
	sc := gs().scene
	if sc == unsafe { nil } {
		return none
	}
	return sc
}

// publish: copy the HUD-relevant numbers into scene.store (ProgressBar/Label binds).
fn publish() {
	sc := live_scene() or { return }
	mut st := sc.store
	s := gs()
	st.set_int('hp', s.hp)
	st.set_int('max_hp', s.max_hp)
	st.set_int('mp', int(s.mp))
	st.set_int('max_mp', int(s.max_mp))
	st.set_int('level', s.level)
	st.set_int('exp', s.exp)
	st.set_int('max_exp', s.max_exp)
	st.set_int('kills', s.kills)
	st.set_int('gold', s.gold)
	st.set_int('silver', s.silver)
	st.set_int('stones', s.stones)
	st.set_int('sect_id', s.sect_id)
	st.set_int('pet_id', s.pet_id)
	st.set_int('pvp_points', s.pvp_points)
	st.set_int('pvp_rank', s.pvp_rank)
}

// show_banner: the center-top system message (fades via HUDSync).
fn show_banner(msg string) {
	mut s := gs()
	s.banner = msg
	s.banner_t = 2.4
}

// ---------- helpers ----------

fn hero(s &core.Scene) ?&core.Node {
	return s.find('World/Hero')
}

fn hero_pos(s &core.Scene) ?core.Vec3 {
	h := hero(s)?
	if !h.active {
		return none
	}
	t := h.get_component[render3d.Transform3D]()?
	return t.position
}

fn camera_yaw(s &core.Scene) f32 {
	n := s.find('Camera') or { return 0 }
	c := n.get_component[FollowIsoCamera]() or { return 0 }
	return f32(c.yaw * math.pi / 180)
}

// active_cam: the scene's live 3D camera.
fn active_cam(s &core.Scene) ?&render3d.Camera3D {
	n := s.find('Camera')?
	return n.get_component[render3d.Camera3D]()
}

// living enemies of the scene.
fn enemies_of(s &core.Scene) []&Health {
	mut out := []&Health{}
	root := s.find('World') or { return out }
	mut stack := [root]
	for stack.len > 0 {
		n := stack.pop()
		if !n.active {
			continue
		}
		for h in n.get_components[Health]() {
			if h.team == 'enemy' && h.hp > 0 {
				out << h
			}
		}
		for ch in n.children {
			stack << ch
		}
	}
	return out
}

// clamp_to_arena keeps a ground position inside the floating peak (radius 25, margin 1.6).
fn clamp_to_arena(p core.Vec3) core.Vec3 {
	flat := core.vec3(p.x, 0, p.z)
	max_r := f32(23.4)
	if flat.length() > max_r {
		f := flat.normalized().mul(max_r)
		return core.vec3(f.x, p.y, f.z)
	}
	return p
}

// fx_color: the leader's blade colour, used by every skill VFX so each hero
// fights with their own colour (gold, ice, blood, emerald, fire, violet...).
fn fx_color() core.Color {
	s := gs()
	return hero_def(s.hero_ids[s.leader]).blade
}

// ---------- Isometric orbit camera ----------
// The camera sits at yaw/pitch around the hero; zoom 20..85% maps to the design's
// `camDistance = 16 + ((100 - zoom) / 65) * 26` (35% ≈ 42 units, wide panoramic).

pub struct FollowIsoCamera {
	core.Component
pub mut:
	target string = 'World/Hero'
	yaw    f32    = 45 // degrees, 45 = the design's true isometric angle
	pitch  f32    = 41 // degrees elevation (0.72 rad in the design)
	look_h f32    = 0.9
	smooth f32    = 9
	last   core.Vec2 @[hide]
	ready  bool      @[hide]
}

pub fn (mut c FollowIsoCamera) update(dt f32) {
	inp := c.input()
	// Q / E orbit (design: Q-E rotate)
	c.yaw += inp.axis(.e, .q) * 105 * dt
	// drag to orbit (design: right-drag; the engine reports any-button drag)
	if inp.mouse_down {
		if c.ready {
			c.yaw -= (inp.mouse.x - c.last.x) * 0.28
			c.pitch += (inp.mouse.y - c.last.y) * 0.22
			c.pitch = math.max(f32(20), math.min(f32(70), c.pitch))
		}
		c.last = inp.mouse
		c.ready = true
	} else {
		c.ready = false
	}
	// mouse wheel zoom (design: 20%..85%, default 35%)
	if inp.scroll.y != 0 {
		mut s := gs()
		s.zoom = math.max(f32(20), math.min(f32(85), s.zoom + inp.scroll.y * 1.4))
	}

	n := c.scene().find(c.target) or { return }
	tp := render3d.world_matrix(n).translation_part()
	s := gs()
	dist := 16 + (100 - s.zoom) / 65 * 26
	y := f32(c.yaw * math.pi / 180)
	p := f32(c.pitch * math.pi / 180)
	horiz := dist * f32(math.cos(p))
	vert := dist * f32(math.sin(p))
	want := tp + core.vec3(f32(math.sin(y)) * horiz, vert, f32(math.cos(y)) * horiz)
	mut tr := render3d.transform3d(mut c.node)
	k := math.min(f32(1), dt * c.smooth)
	tr.position = tr.position.lerp(want, k)
	look := tp + core.vec3(0, c.look_h, 0)
	d := look - tr.position
	tr.rotation.y = f32(math.atan2(-d.x, -d.z) * 180 / math.pi)
	tr.rotation.x = f32(math.atan2(d.y, f32(math.sqrt(d.x * d.x + d.z * d.z))) * 180 / math.pi)
	tr.rotation.z = 0
}

// ---------- Hero controller ----------
// WASD relative to the camera + click-to-move (with the green ground marker like the design),
// chibi run/idle from the single FBX clip, arena clamp. Only the leader is driven here;
// the two companions are moved by CompanionAI (team.v).

pub struct HeroController {
	core.Component
pub mut:
	speed        f32 = 7
	aura_speed   f32 = 8.8
	turn_speed   f32 = 720 // degrees per second
	clip_speed   f32 = 3.6 // meters/second of the FBX run clip at speed 1
	marker       &core.Node = unsafe { nil } @[hide]
	target_pos   ?core.Vec3  @[hide]
	target_enemy &core.Node = unsafe { nil } @[hide]
	press_at     core.Vec2   @[hide]
	idle_time    f32 = -1 @[hide]
	velocity     core.Vec3 @[hide]
}

pub fn (mut h HeroController) start() {
	// remember the scene for the module-level helpers
	gs().scene = h.scene()
	// the click-to-move ground marker (a pulsing green ring, hidden until a click)
	mut m := core.Node.new('MoveMarker')
	m.add_component(&render3d.Transform3D{
		position: core.vec3(0, 0.06, 0)
		scale:    core.vec3(1.1, 1.1, 1.1)
	})
	m.add_component(&render3d.MeshRenderer3D{
		mesh:  'ring'
		color: core.rgba(81, 207, 102, 200)
		blend: 'additive'
		unlit: true
	})
	mut world := h.scene().find('World') or { return }
	world.add_child(mut m)
	m.active = false
	h.marker = m
}

// member_slot: the party slot of this hero node (-1 = not a party member).
fn (h &HeroController) member_slot() int {
	m := h.node.get_component[HeroMember]() or { return -1 }
	return m.slot
}

pub fn (mut h HeroController) update(dt f32) {
	mut s := gs()
	if h.member_slot() >= 0 && h.member_slot() != s.leader {
		return
	}
	mut tr := render3d.transform3d(mut h.node)
	mut sk := h.node.get_component[render3d.SkinnedModel3D]() or { return }
	if h.idle_time < 0 && sk.data != unsafe { nil } {
		h.idle_time = idle_frame(sk)
	}
	inp := h.input()
	yaw := camera_yaw(h.scene())

	// click-to-move: press + release close together (not a camera drag).
	// While a full-screen panel is open the click belongs to the panel.
	if s.show_map || s.show_team {
		h.target_pos = none
		h.target_enemy = unsafe { nil }
		h.hide_marker()
	} else {
		if inp.mouse_pressed {
			h.press_at = inp.mouse
		}
		if inp.mouse_released {
			if inp.mouse.distance(h.press_at) < 7 {
				h.pick_target(inp.mouse)
			} else {
				// drag = camera orbit: cancel the walk target
				h.target_pos = none
				h.target_enemy = unsafe { nil }
				h.hide_marker()
			}
		}
	}

	// keyboard move (camera relative, like the design)
	mut want := core.vec3(0, 0, 0)
	fwd := core.vec3(f32(math.sin(yaw)), 0, f32(math.cos(yaw)))
	right := core.vec3(-fwd.z, 0, fwd.x)
	want = fwd.mul(-inp.axis_y()) + right.mul(inp.axis_x())
	if want.length() > 1 {
		want = want.normalized()
	}
	if want.length() > 0.01 {
		h.target_pos = none
		h.target_enemy = unsafe { nil }
		h.hide_marker()
	} else if t := h.target_pos {
		mut d := t - tr.position
		d.y = 0
		if d.length() > 0.3 {
			want = d.normalized()
		} else {
			h.target_pos = none
			h.hide_marker()
		}
	} else if h.target_enemy != unsafe { nil } {
		if !h.target_enemy.active {
			h.target_enemy = unsafe { nil }
		} else {
			et := h.target_enemy.get_component[render3d.Transform3D]() or {
				h.target_enemy = unsafe { nil }
				return
			}
			mut d := et.position - tr.position
			d.y = 0
			if d.length() > 1.5 {
				want = d.normalized()
			} else {
				// in range: hold position (PlayerCombat auto-attacks)
				want = core.vec3(0, 0, 0)
			}
		}
	}

	spd := if s.aura > 0 { h.aura_speed } else { h.speed }
	target := want.mul(spd)
	k := math.min(f32(1), dt * 10)
	h.velocity = h.velocity.lerp(target, k)
	tr.position = tr.position + h.velocity.mul(dt)
	tr.position = clamp_to_arena(tr.position)
	moving := h.velocity.length()
	s.hero_moving = moving > 0.6

	if moving > 0.3 {
		tr.turn_toward(h.velocity, h.turn_speed * dt)
		sk.speed = moving / h.clip_speed
		sk.playing = true
	} else {
		// ease into the standing frame of the run cycle
		sk.speed = 0
		c := sk.data
		if c != unsafe { nil } && c.clips.len > 0 && h.idle_time >= 0 {
			dur := c.clips[0].duration
			mut d := h.idle_time - (sk.time - dur * f32(int(sk.time / dur)))
			if d > dur / 2 {
				d -= dur
			} else if d < -dur / 2 {
				d += dur
			}
			sk.time += d * math.min(f32(1), dt * 8)
		}
		tr.scale.y = 1 + f32(math.sin(h.scene().time * 2.4)) * 0.008
	}

	// pulse the move marker
	if h.marker != unsafe { nil } && h.marker.active {
		mut mt := h.marker.get_component[render3d.Transform3D]() or { return }
		p := 0.85 + f32(math.sin(h.scene().time * 8)) * 0.15
		mt.scale = core.vec3(1.1 * p, 1.1 * p, 1.1 * p)
	}
}

// pick_target: ray-cast the click onto the ground plane; an enemy under the click
// becomes the walk target (the design walks to it, then auto-attacks).
fn (mut h HeroController) pick_target(mouse core.Vec2) {
	sc := h.scene()
	cam := active_cam(sc) or { return }
	vs := sc.view_size
	vo := sc.view_origin
	sx := (mouse.x - vo.x) / vs.x
	sy := (mouse.y - vo.y) / vs.y
	if sx < 0 || sx > 1 || sy < 0 || sy > 1 {
		return
	}
	eye, dir := cam.screen_ray(core.vec2(f32(sx), f32(sy)))
	if dir.y > -0.02 {
		return
	}
	t := -eye.y / dir.y
	mut p := eye + dir.mul(t)
	p = clamp_to_arena(p)
	// an enemy near the click point?
	es := enemies_of(sc)
	mut best_i := -1
	mut best_d := f32(1.7)
	for i, e in es {
		ep := e.position()
		flat := core.vec3(ep.x - p.x, 0, ep.z - p.z)
		if flat.length() < best_d {
			best_d = flat.length()
			best_i = i
		}
	}
	if best_i >= 0 {
		e := es[best_i]
		h.target_enemy = e.node
		h.target_pos = none
		if et := e.node.get_component[render3d.Transform3D]() {
			h.show_marker(et.position)
		}
	} else {
		h.target_enemy = unsafe { nil }
		h.target_pos = p
		h.show_marker(p)
	}
}

fn (mut h HeroController) show_marker(p core.Vec3) {
	if h.marker == unsafe { nil } {
		return
	}
	mut m := h.marker
	mut t := m.get_component[render3d.Transform3D]() or { return }
	t.position = core.vec3(p.x, 0.06, p.z)
	m.active = true
}

fn (mut h HeroController) hide_marker() {
	if h.marker == unsafe { nil } {
		return
	}
	mut m := h.marker
	m.active = false
}

// idle_frame: the moment of the run cycle where the feet are closest together
// (a standing pose for idling, since the model has a single clip).
fn idle_frame(sk &render3d.SkinnedModel3D) f32 {
	m := sk.data
	if m == unsafe { nil } || m.clips.len == 0 {
		return 0
	}
	lf, rf := m.bone_index('LeftFoot'), m.bone_index('RightFoot')
	if lf < 0 || rf < 0 {
		return 0
	}
	mut pose := m.rest_pose()
	mut gl := []core.Mat4{}
	mut best, mut best_t := f32(1e9), f32(0)
	c := m.clips[0]
	for f in 0 .. c.frame_count() {
		t := f32(f) / c.fps
		m.sample(0, t, true, mut pose)
		m.globals(pose, mut gl)
		d := gl[lf].translation_part().distance(gl[rf].translation_part())
		if d < best {
			best, best_t = d, t
		}
	}
	return best_t
}

// ---------- progression ----------

// gain_exp: XP from a kill; levels up (with a realm step every 3 levels).
fn gain_exp(n int) {
	mut s := gs()
	s.exp += n
	for s.exp >= s.max_exp {
		s.exp -= s.max_exp
		s.max_exp = int(f32(s.max_exp) * 1.35)
		s.level++
		s.max_mp += 40
		s.mp = s.max_mp
		// HP/ATK come from the level through the leader's hero multipliers
		h := hero_def(s.hero_ids[s.leader])
		s.max_hp = int(f32(180 + (s.level - 10) * 35) * h.hp_mult)
		s.atk = int(f32(68 + (s.level - 10) * 14) * h.atk_mult)
		s.hp = s.max_hp
		if s.level % 3 == 0 && s.realm < realms.len - 1 {
			s.realm++
		}
		show_banner('Đột Phá Cảnh Giới! Đạt Cấp ${s.level} - ${realms[s.realm]}')
		sc := live_scene() or { break }
		mut world := sc.find('World') or { break }
		hp := hero_pos(sc) or { break }
		spawn_whirlwind(mut world, hp, 4.5, 0.9, true)
	}
	publish()
}
