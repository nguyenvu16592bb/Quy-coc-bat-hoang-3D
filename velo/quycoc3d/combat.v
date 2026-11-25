module main

import math
import rand
import velo.core
import velo.render3d

// PlayerCombat — the 7 wuxia skills of Quỷ Cốc, matching the design HTML exactly:
//   0 Chém Thường          melee arc + small whirlwind            (Space / click / slot 0)
//   1 Kiếm Khí Trảm        three golden sword beams               mp 15 cd 2.2
//   2 Vạn Kiếm Quy Tông    sky sword rain over the nearest pack   mp 30 cd 5.5
//   3 Bát Hoang Toàn Phong signature golden whirlwind AoE        mp 25 cd 3.5
//   4 Kim Cang Hộ Thể      heal + knockback shockwave             mp 35 cd 7.0
//   5 Thiên Lôi Kiếm Trận  giant celestial greatsword slam        mp 50 cd 9.0
//   6 Cảnh Giới Đột Phá    aura mode (+45% damage)                mp 80 cd 15
// All VFX take the leader's blade colour (fx_color), so each hero fights in their
// own element. Only the party leader casts; companions have their own auto-attack.

const skill_mp = [0, 15, 30, 25, 35, 50, 80]

const skill_cd = [f32(0.45), 2.2, 5.5, 3.5, 7.0, 9.0, 15.0]

pub const skill_names = ['Chém Thường', 'Kiếm Khí Trảm', 'Vạn Kiếm Quy Tông', 'Bát Hoang Toàn Phong',
	'Kim Cang Hộ Thể', 'Thiên Lôi Kiếm Trận', 'Cảnh Giới Đột Phá']

pub struct PlayerCombat {
	core.Component
pub mut:
	auto_cd    f32 @[hide]
	swing_t    f32 = -1 @[hide] // 0..0.4 while the basic slash plays
	spin_t     f32 = -1 @[hide] // 0..0.65 while the whirlwind spin plays
	sword      &core.Node = unsafe { nil } @[hide]
	sword_base core.Vec3 @[hide]
}

pub fn (mut c PlayerCombat) start() {
	gs().scene = c.scene()
	if sw := c.node.find('Sword') {
		c.sword = sw
		if t := sw.get_component[render3d.Transform3D]() {
			c.sword_base = t.rotation
		}
	}
}

// is_leader: the combat component of a companion stays idle.
fn (c &PlayerCombat) is_leader() bool {
	m := c.node.get_component[HeroMember]() or { return true }
	return gs().leader == m.slot
}

pub fn (mut c PlayerCombat) update(dt f32) {
	if !c.is_leader() {
		return
	}
	mut s := gs()
	// cooldowns, buffs and mana regeneration (design: +0.14 MP per frame)
	for i in 0 .. 7 {
		if s.cd[i] > 0 {
			s.cd[i] = math.max(f32(0), s.cd[i] - dt)
		}
	}
	if s.aura > 0 {
		s.aura -= dt
	}
	if s.rage > 0 {
		s.rage -= dt
	}
	s.mp = f32(math.min(s.max_mp, s.mp + 8.4 * dt))

	// UI panels own the keyboard while they are open (vòng 3: mọi panel MVL)
	if any_panel_open() {
		c.animate(dt)
		return
	}

	inp := c.input()
	if inp.was_pressed(.space) {
		c.cast(0)
	}
	if inp.was_pressed(core.Key._1) { c.cast(1) }
	if inp.was_pressed(core.Key._2) { c.cast(2) }
	if inp.was_pressed(core.Key._3) { c.cast(3) }
	if inp.was_pressed(core.Key._4) { c.cast(4) }
	if inp.was_pressed(core.Key._5) { c.cast(5) }
	if inp.was_pressed(core.Key._6) { c.cast(6) }
	if inp.was_pressed(.r) {
		use_pill(0)
	}

	// auto-attack: standing near an enemy slashes by itself (design: 0.85s cadence)
	c.auto_cd -= dt
	if !s.hero_moving && c.swing_t < 0 && c.spin_t < 0 && c.auto_cd <= 0 {
		if e := nearest_enemy(c.scene(), 3.2) {
			ep := e.position()
			mut tr := render3d.transform3d(mut c.node)
			if ep.distance(tr.position) <= 3.2 {
				c.cast(0)
				c.auto_cd = 0.85
			}
		}
	}

	c.animate(dt)
}

// cast: shared entry (keyboard + HUD buttons + auto-attack).
pub fn (mut c PlayerCombat) cast(i int) {
	if i < 0 || i > 6 {
		return
	}
	mut s := gs()
	if s.cd[i] > 0 {
		return
	}
	if s.mp < f32(skill_mp[i]) {
		show_banner('Linh lực (MP) không đủ!')
		return
	}
	s.mp -= f32(skill_mp[i])
	s.cd[i] = skill_cd[i]

	sc := c.scene()
	mut world := sc.find('World') or { return }
	mut tr := render3d.transform3d(mut c.node)
	hp := tr.position
	fwd := c.face_target()

	match i {
		0 {
			// Chém Thường — melee arc
			c.swing_t = 0
			spawn_whirlwind(mut world, hp, 2.7, 0.32, true)
			for mut e in enemies_of(sc) {
				if e.position().distance(hp) <= 3.3 {
					apply_hit(mut e, f32(s.atk), false, 4.5)
				}
			}
		}
		1 {
			// Kiếm Khí Trảm — three flying sword beams
			c.swing_t = 0
			from := hp + fwd.mul(0.8) + core.vec3(0, 1.05, 0)
			offs := [f32(-0.22), f32(0), f32(0.22)]
			for off in offs {
				dir := rot_y(fwd, off)
				spawn_beam(mut world, from, dir, int(f32(s.atk) * 1.45))
			}
		}
		2 {
			// Vạn Kiếm Quy Tông — sword rain over the nearest pack
			c.swing_t = 0
			mut center := hp + fwd.mul(5)
			if e := nearest_enemy(sc, 15) {
				center = e.position()
			}
			for _ in 0 .. 12 {
				spawn_rain_sword(mut world, center)
			}
			for mut e in enemies_of(sc) {
				if center.distance(core.vec3(e.position().x, 0, e.position().z)) <= 4.8 {
					apply_hit(mut e, f32(s.atk) * 1.9, true, 5)
				}
			}
		}
		3 {
			// Bát Hoang Toàn Phong — signature whirlwind AoE
			c.spin_t = 0
			spawn_whirlwind(mut world, hp, 4.6, 0.65, true)
			for mut e in enemies_of(sc) {
				if e.position().distance(hp) <= 4.9 {
					apply_hit(mut e, f32(s.atk) * 1.75, true, 8.5)
				}
			}
		}
		4 {
			// Kim Cang Hộ Thể — heal + knockback shockwave
			heal := int(f32(s.max_hp) * 0.35)
			s.hp = int(math.min(f32(s.max_hp), f32(s.hp + heal)))
			if sc2 := live_scene() {
				if hpp := hero_pos(sc2) {
					float_text(sc2, hpp + core.vec3(0, 1.8, 0), '+${heal} HP', 'heal')
				}
			}
			spawn_whirlwind(mut world, hp, 5.2, 0.55, true)
			for mut e in enemies_of(sc) {
				if e.position().distance(hp) <= 5.5 {
					apply_hit(mut e, f32(s.atk) * 1.1, true, 14)
				}
			}
			publish()
		}
		5 {
			// Thiên Lôi Kiếm Trận — giant celestial greatsword slam
			mut target := hp + fwd.mul(5)
			if e := nearest_enemy(sc, 16) {
				target = e.position()
			}
			spawn_giant_sword(mut world, target)
		}
		6 {
			// Cảnh Giới Đột Phá — aura mode
			s.aura = 10.0
			show_banner('Bát Hoang Kim Thân Kích Hoạt! (+45% Sát Thương)')
			spawn_whirlwind(mut world, hp, 5.5, 0.8, true)
		}
		else {}
	}
}

// face_target: turns toward the nearest enemy in 14 m (design: faceNearestOrForward)
// and returns the hero's forward direction.
fn (mut c PlayerCombat) face_target() core.Vec3 {
	mut tr := render3d.transform3d(mut c.node)
	if e := nearest_enemy(c.scene(), 14) {
		mut d := e.position() - tr.position
		d.y = 0
		if d.length() > 0.05 {
			tr.face(d)
		}
	}
	return tr.forward()
}

fn (mut c PlayerCombat) animate(dt f32) {
	// spin: whirl the hero around while Bát Hoang Toàn Phong plays
	if c.spin_t >= 0 {
		c.spin_t += dt
		mut tr := render3d.transform3d(mut c.node)
		tr.rotation.y += 1375 * dt
		if c.spin_t >= 0.65 {
			c.spin_t = -1
			if v := c.velocity_dir() {
				tr.face(v)
			}
		}
	} else if c.swing_t >= 0 {
		// slash: sweep the greatsword through an arc
		c.swing_t += dt
		if c.sword != unsafe { nil } {
			mut st := c.sword.get_component[render3d.Transform3D]() or {
				c.swing_t = -1
				return
			}
			k := math.min(f32(1), c.swing_t / f32(0.38))
			smooth := k * k * (3 - 2 * k)
			st.rotation.y = c.sword_base.y + (-75 + 150 * smooth)
			st.rotation.z = c.sword_base.z + 18 * smooth
		}
		if c.swing_t >= 0.4 {
			c.swing_t = -1
			if c.sword != unsafe { nil } {
				mut st := c.sword.get_component[render3d.Transform3D]() or { return }
				st.rotation = c.sword_base
			}
		}
	}
}

fn (c &PlayerCombat) velocity_dir() ?core.Vec3 {
	h := c.node.get_component[HeroController]()?
	v := h.velocity
	if v.length() < 0.1 {
		return none
	}
	return v
}

// cast_skill_idx: entry for the HUD skill buttons.
fn cast_skill_idx(sc &core.Scene, i int) {
	h := hero(sc) or { return }
	if mut pc := h.get_component[PlayerCombat]() {
		pc.cast(i)
	}
}

// use_pill: 0 = Hồi Huyết Đan, 1 = Tụ Linh Đan, 2 = Bạo Linh Phù (design values).
fn use_pill(t int) {
	mut s := gs()
	if t < 0 || t > 2 || s.pills[t] <= 0 {
		return
	}
	s.pills[t]--
	msc := live_scene()
	match t {
		0 {
			s.hp = int(math.min(f32(s.max_hp), f32(s.hp + 85)))
			if sc := msc {
				if hp := hero_pos(sc) {
					float_text(sc, hp + core.vec3(0, 1.8, 0), '+85 HP', 'heal')
					if mut world := sc.find('World') {
						burst_colored(mut world, hp + core.vec3(0, 0.8, 0), core.rgba(81, 207, 102, 255),
							core.rgba(40, 160, 70, 255), 10)
					}
				}
			}
		}
		1 {
			s.mp = math.min(s.max_mp, s.mp + f32(160))
			if sc := msc {
				if hp := hero_pos(sc) {
					float_text(sc, hp + core.vec3(0, 1.8, 0), '+160 MP', 'dodge')
				}
			}
		}
		2 {
			s.rage = 12.0
			show_banner('Bạo Linh Phù: Tỉ lệ Bạo Kích tăng mạnh!')
			if sc := msc {
				if hp := hero_pos(sc) {
					if mut world := sc.find('World') {
						burst_colored(mut world, hp + core.vec3(0, 0.8, 0), core.rgba(255, 146, 43, 255),
							core.rgba(255, 120, 30, 255), 12)
					}
				}
			}
		}
		else {}
	}
	publish()
}

// ---------- shared combat helpers ----------

// nearest_enemy: the closest living enemy within `max_range` of the hero.
fn nearest_enemy(s &core.Scene, max_range f32) ?&Health {
	hp := hero_pos(s)?
	return nearest_enemy_from(s, hp, max_range)
}

// nearest_enemy_from: the closest living enemy to an arbitrary point (companions).
fn nearest_enemy_from(s &core.Scene, p core.Vec3, max_range f32) ?&Health {
	es := enemies_of(s)
	mut best_i := -1
	mut best_d := max_range
	for i, e in es {
		d := e.position().distance(p)
		if d < best_d {
			best_d = d
			best_i = i
		}
	}
	if best_i < 0 {
		return none
	}
	return es[best_i]
}

// rot_y: rotates a ground vector around the y axis by `a` radians.
fn rot_y(v core.Vec3, a f32) core.Vec3 {
	c := f32(math.cos(a))
	si := f32(math.sin(a))
	return core.vec3(v.x * c + v.z * si, v.y, -v.x * si + v.z * c)
}

// apply_hit: crit/aura/variariance roll (design damageEnemy), then Health.damage.
fn apply_hit(mut e &Health, raw f32, is_skill bool, knock f32) {
	s := gs()
	pos := e.position()
	sc := e.scene()
	if !is_skill && rand.f32() < 0.08 {
		float_text(sc, pos + core.vec3(0, 1.8, 0), 'Né tránh', 'dodge')
		return
	}
	crit_bonus := if s.rage > 0 { f32(0.35) } else { f32(0) }
	is_crit := rand.f32() < (s.crit + crit_bonus)
	aura := if s.aura > 0 { f32(1.45) } else { f32(1.0) }
	variance := if is_crit { f32(1.85) } else { f32(0.9 + rand.f32() * 0.25) }
	final := int(raw * aura * variance)
	from := hero_pos(sc) or { pos }
	applied := e.damage(final, from, knock)
	if applied {
		text := if is_crit { 'Bạo kích ${final}' } else { '${final}' }
		kind := if is_crit { 'crit' } else { 'normal' }
		float_text(sc, pos + core.vec3(0, 1.8, 0), text, kind)
	}
}

// burst_colored: a one-shot spark explosion at `p` that removes itself.
fn burst_colored(mut parent core.Node, p core.Vec3, c0 core.Color, c1 core.Color, count int) {
	mut n := core.Node.new('Burst')
	n.add_component(&render3d.Transform3D{
		position: p
	})
	n.add_component(&render3d.Particles3D{
		preset:      'explosion'
		speed:       4.5
		size_start:  0.4
		color_start: c0
		color_alt:   c1
		color_end:   core.rgba(c1.r / 2, c1.g / 2, c1.b / 2, 0)
		gravity:     core.vec3(0, -3, 0)
		burst:       count
	})
	n.add_component(&render3d.PointLight3D{
		color:     c1
		intensity: 3
		range:     6
	})
	parent.add_child(mut n)
	n.after(0.15, fn [mut n] () {
		if mut l := n.get_component[render3d.PointLight3D]() {
			l.enabled = false
		}
	})
	n.after(1.2, fn [mut n] () {
		n.destroy()
	})
}

// ---------- VFX components ----------

// WhirlwindFX — the golden crescent-ring vortex; follows the hero while it
// plays, spins fast and fades out.
pub struct WhirlwindFX {
	core.Component
pub mut:
	max_radius f32 = 4
	duration   f32  = 0.55
	follow     bool = true
	age        f32 @[hide]
}

pub fn (mut w WhirlwindFX) update(dt f32) {
	w.age += dt
	k := math.min(f32(1), w.age / w.duration)
	mut tr := render3d.transform3d(mut w.node)
	if w.follow {
		if hp := hero_pos(w.scene()) {
			tr.position = hp + core.vec3(0, 0.75, 0)
		}
	}
	s := 0.55 + f32(math.sin(k * math.pi)) * 0.55
	tr.scale = core.vec3(s, 1, s)
	tr.rotation.y += 1030 * dt
	fade_mesh(w.node, 'Ring1', 1 - k)
	fade_mesh(w.node, 'Ring2', 1 - k)
	fade_mesh(w.node, 'Rim', 1 - k)
	if w.age >= w.duration {
		w.node.destroy()
	}
}

// fade_mesh: dims a child mesh's color toward transparent.
fn fade_mesh(n &core.Node, name string, k f32) {
	ch := n.find(name) or { return }
	if mut m := ch.get_component[render3d.MeshRenderer3D]() {
		m.color = core.rgba(m.color.r, m.color.g, m.color.b, u8(f32(255) * k))
	}
}

// spawn_whirlwind: builds the 3-ring vortex under World, in the leader's colour.
fn spawn_whirlwind(mut world core.Node, origin core.Vec3, max_radius f32, duration f32, follow bool) {
	col := fx_color()
	white := core.rgba(255, 246, 220, 255)
	mut wn := core.Node.new('Whirlwind')
	wn.add_component(&render3d.Transform3D{
		position: origin + core.vec3(0, 0.75, 0)
	})
	wn.add_component(&WhirlwindFX{
		max_radius: max_radius
		duration:   duration
		follow:     follow
	})
	r1 := add_mesh(mut wn, 'Ring1', core.vec3(0, 0, 0), core.vec3(90, 0, 0),
		core.vec3(max_radius * 2, max_radius * 2, 1), 'ring', core.rgba(col.r, col.g, col.b, 230))
	r2 := add_mesh(mut wn, 'Ring2', core.vec3(0, 0.12, 0), core.vec3(90, 0, 0),
		core.vec3(max_radius * 1.5, max_radius * 1.5, 1), 'ring', core.rgba(white.r, white.g, white.b, 220))
	rim := add_mesh(mut wn, 'Rim', core.vec3(0, 0, 0), core.vec3(90, 0, 0),
		core.vec3(max_radius * 1.76, max_radius * 1.76, max_radius * 1.76), 'torus',
		core.rgba(col.r, col.g, col.b, 220))
	if r1 == unsafe { nil } || r2 == unsafe { nil } || rim == unsafe { nil } {
		return
	}
	for ch in wn.children {
		if mut m := ch.get_component[render3d.MeshRenderer3D]() {
			m.blend = 'additive'
			m.unlit = true
		}
	}
	world.add_child(mut wn)
}

// SwordBeam — a glowing sword that flies straight and pierces enemies
// (the design keeps a hit-set, one hit per enemy).
pub struct SwordBeam {
	core.Component
pub mut:
	velocity core.Vec3
	damage   int = 90
	life     f32 = 1.1
	age      f32 @[hide]
	hits     []voidptr @[hide]
}

pub fn (mut b SwordBeam) update(dt f32) {
	mut tr := render3d.transform3d(mut b.node)
	tr.position = tr.position + b.velocity.mul(dt)
	b.age += dt
	for mut e in enemies_of(b.scene()) {
		key := voidptr(e.node)
		if key in b.hits {
			continue
		}
		ep := e.position() + core.vec3(0, 0.9, 0)
		if ep.distance(tr.position) < (if e.boss { f32(2.2) } else { f32(1.35) }) {
			b.hits << key
			apply_hit(mut e, f32(b.damage), true, 5)
		}
	}
	if b.age >= b.life {
		mut parent := b.node.parent
		if parent != unsafe { nil } {
			burst_colored(mut parent, tr.position, core.rgba(255, 244, 200, 255), fx_color(), 12)
		}
		b.node.destroy()
	}
}

// spawn_beam: the flying sword qi (cone + glow + trail + light).
fn spawn_beam(mut world core.Node, from core.Vec3, dir core.Vec3, dmg int) {
	col := fx_color()
	mut n := core.Node.new('Beam')
	n.add_component(&render3d.Transform3D{
		position: from
	})
	n.add_component(&SwordBeam{
		velocity: dir.normalized().mul(24)
		damage:   dmg
	})
	mut tip := core.Node.new('Blade')
	tip.add_component(&render3d.Transform3D{
		rotation: core.vec3(90, 0, 0)
		scale:    core.vec3(0.36, 1.45, 0.36)
	})
	tip.add_component(&render3d.MeshRenderer3D{
		mesh:     'cone'
		color:    col
		emissive: col
		unlit:    true
	})
	n.add_child(mut tip)
	mut glow := core.Node.new('Glow')
	glow.add_component(&render3d.Transform3D{
		rotation: core.vec3(90, 0, 0)
		scale:    core.vec3(0.48, 1.7, 0.48)
	})
	glow.add_component(&render3d.MeshRenderer3D{
		mesh:     'cylinder'
		color:    core.rgba(255, 255, 255, 110)
		emissive: col
		blend:    'additive'
		unlit:    true
	})
	n.add_child(mut glow)
	n.add_component(&render3d.PointLight3D{
		color:     col
		intensity: 1.6
		range:     4
	})
	n.add_component(&render3d.Trail3D{
		width:     0.3
		duration:  0.2
		color:     core.rgba(col.r, col.g, col.b, 220)
		color_end: core.rgba(col.r, col.g, col.b, 0)
	})
	world.add_child(mut n)
	mut tr := render3d.transform3d(mut n)
	tr.face(dir)
}

// RainSword — one sword of Vạn Kiếm Quy Tông falling from the sky.
pub struct RainSword {
	core.Component
pub mut:
	struck bool @[hide]
}

pub fn (mut r RainSword) update(dt f32) {
	mut tr := render3d.transform3d(mut r.node)
	tr.position.y -= 22 * dt
	if tr.position.y <= 0.6 && !r.struck {
		r.struck = true
		mut parent := r.node.parent
		if parent != unsafe { nil } {
			burst_colored(mut parent, core.vec3(tr.position.x, 0.2, tr.position.z),
				core.rgba(220, 245, 255, 255), fx_color(), 6)
		}
	}
	if tr.position.y < -1 {
		r.node.destroy()
	}
}

fn spawn_rain_sword(mut world core.Node, center core.Vec3) {
	col := fx_color().lerp(core.rgba(220, 250, 255, 255), 0.55)
	ox := center.x + (rand.f32() - 0.5) * 6.5
	oz := center.z + (rand.f32() - 0.5) * 6.5
	mut n := core.Node.new('RainSword')
	n.add_component(&render3d.Transform3D{
		position: core.vec3(f32(ox), f32(9 + rand.f32() * 5), f32(oz))
		rotation: core.vec3(180, rand.f32() * 360, 0)
		scale:    core.vec3(0.32, 1.8, 0.32)
	})
	n.add_component(&RainSword{})
	n.add_component(&render3d.MeshRenderer3D{
		mesh:     'cone'
		color:    col
		emissive: col
		unlit:    true
	})
	world.add_child(mut n)
}

// GiantSword — the celestial greatsword of Thiên Lôi Kiếm Trận slamming down.
pub struct GiantSword {
	core.Component
pub mut:
	target   core.Vec3
	impacted bool @[hide]
}

pub fn (mut gw GiantSword) update(dt f32) {
	mut tr := render3d.transform3d(mut gw.node)
	if tr.position.y > 2.2 {
		tr.position.y -= 34 * dt
		return
	}
	if gw.impacted {
		return
	}
	gw.impacted = true
	mut world := gw.scene().find('World') or { return }
	burst_colored(mut world, gw.target + core.vec3(0, 0.4, 0), core.rgba(255, 244, 200, 255),
		fx_color(), 30)
	spawn_whirlwind(mut world, gw.target, 5.5, 0.55, false)
	s := gs()
	for mut e in enemies_of(gw.scene()) {
		if core.vec3(e.position().x, 0, e.position().z).distance(core.vec3(gw.target.x, 0, gw.target.z)) <= 5.8 {
			apply_hit(mut e, f32(s.atk) * 2.8, true, 12)
		}
	}
	gw.node.after(0.4, fn [gw] () {
		mut nd := gw.node
		nd.destroy()
	})
}

fn spawn_giant_sword(mut world core.Node, target core.Vec3) {
	col := fx_color().lerp(core.rgba(255, 250, 230, 255), 0.4)
	mut n := core.Node.new('GiantSword')
	n.add_component(&render3d.Transform3D{
		position: core.vec3(target.x, 12, target.z)
		rotation: core.vec3(180, 0, 0)
		scale:    core.vec3(1.9, 6.5, 1.9)
	})
	n.add_component(&GiantSword{
		target: target
	})
	n.add_component(&render3d.MeshRenderer3D{
		mesh:     'cone'
		color:    col
		emissive: col
		unlit:    true
	})
	n.add_component(&render3d.PointLight3D{
		color:     col
		intensity: 3
		range:     10
	})
	world.add_child(mut n)
}
