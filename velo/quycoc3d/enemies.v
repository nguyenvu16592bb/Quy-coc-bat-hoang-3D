module main

import math
import rand
import velo.core
import velo.render3d

// ============================================================================
//  enemies.v — demon beasts of the eight wastes.
//
//  16 archetypes (content.v) rendered as 8 body plans from primitives:
//  biped, quad, serpent, float, bird, spider, turtle, dragon. Each map spawns its
//  own roster scaled by tier, and a named boss guards the map's last wave.
// ============================================================================

// ---------- Health ----------
// Hit points: flashes and is knocked back when hit, shows a bar over the node, and on
// death bursts, disappears and (enemies with respawn > 0) comes back after a while.

pub struct Health {
	core.Component
pub mut:
	max        int    = 3
	team       string = 'enemy' @[choices: 'hero|enemy']
	respawn    f32    = 6
	bar_height f32    = 1.5 // where the bar floats, in node units
	hp         int                 @[hide]
	invuln     f32                 @[hide] // seconds of immunity after a hit
	flash      f32                 @[hide]
	knock      core.Vec3           @[hide]
	home       core.Vec3           @[hide]
	base       map[voidptr]core.Color @[hide]
	bar        &core.Node = unsafe { nil } @[hide]
	fill       &core.Node = unsafe { nil } @[hide]
	boss       bool // counts as a map boss (boss bar, big burst, unlocks the next map)
	exp        int = 22
	tier       int = 1
}

pub fn (mut h Health) start() {
	h.hp = h.max
	h.home = render3d.transform3d(mut h.node).position
	h.make_bar()
}

pub fn (h &Health) alive() bool {
	return h.hp > 0 && h.node.active
}

pub fn (h &Health) position() core.Vec3 {
	return render3d.world_matrix(h.node).translation_part()
}

// damage takes `n` hit points from a hit coming from `from`, pushing the node away with
// `knock` m/s. false = no effect (dead, or still immune from the last hit).
pub fn (mut h Health) damage(n int, from core.Vec3, knock f32) bool {
	if h.hp <= 0 || h.invuln > 0 || !h.node.active {
		return false
	}
	h.hp -= n
	h.invuln = 0.15
	h.flash = 1
	mut d := h.position() - from
	d.y = 0
	if d.length() > 0.001 {
		h.knock = d.normalized().mul(knock)
	}
	if mut sk := h.node.get_component[render3d.SkinnedModel3D]() {
		sk.hit_flash()
	}
	if h.hp <= 0 {
		h.die()
	}
	return true
}

fn (mut h Health) die() {
	p := h.position()
	mut world := h.scene().find('World') or { return }
	if h.team == 'enemy' {
		c0 := if h.boss { core.rgba(255, 240, 170, 255) } else { core.rgba(220, 200, 255, 255) }
		c1 := if h.boss { core.rgba(255, 120, 40, 255) } else { core.rgba(150, 90, 255, 255) }
		burst_colored(mut world, p + core.vec3(0, 0.8, 0), c0, c1, if h.boss { 110 } else { 40 })
		on_enemy_killed(h.boss, h.exp)
		if h.boss {
			on_boss_killed()
		}
	}
	mut n := h.node
	if h.respawn > 0 {
		n.active = false
		mut sc := h.scene()
		sc.after(h.respawn, fn [mut n] () {
			mut hh := n.get_component[Health]() or { return }
			hh.revive()
		})
	} else {
		// dungeon mobs do not come back
		n.destroy()
	}
}

fn (mut h Health) revive() {
	mut tr := render3d.transform3d(mut h.node)
	tr.position = h.home
	h.hp = h.max
	h.knock = core.Vec3{}
	h.invuln = 1
	h.node.active = true
}

// make_bar builds a small 3D health bar (a dark back and a colored fill) over the node.
fn (mut h Health) make_bar() {
	boss := h.boss
	mut bar := core.Node.new('HpBar')
	bar.add_component(&render3d.Transform3D{
		position: core.vec3(0, h.bar_height, 0)
	})
	mut back := core.Node.new('Back')
	back.add_component(&render3d.Transform3D{
		scale: core.vec3(1.3, 0.16, 0.03)
	})
	back.add_component(&render3d.MeshRenderer3D{
		mesh:  'cube'
		color: core.rgba(17, 17, 17, 210)
		blend: 'alpha'
		unlit: true
	})
	mut fill := core.Node.new('Fill')
	fill.add_component(&render3d.Transform3D{
		position: core.vec3(0, 0, 0.02)
		scale:    core.vec3(1.24, 0.11, 0.03)
	})
	fill.add_component(&render3d.MeshRenderer3D{
		mesh:  'cube'
		color: if boss { core.rgba(255, 146, 43, 255) } else { core.rgba(224, 49, 49, 255) }
		unlit: true
	})
	bar.add_child(mut back)
	bar.add_child(mut fill)
	h.node.add_child(mut bar)
	bar.active = false
	h.bar = bar
	h.fill = fill
}

pub fn (mut h Health) update(dt f32) {
	h.invuln -= dt
	// knockback for nodes that have no controller of their own
	if h.knock.length() > 0.01 {
		mut tr := render3d.transform3d(mut h.node)
		tr.position = tr.position + h.knock.mul(dt)
		tr.position = clamp_to_arena(tr.position)
		h.knock = h.knock.mul(math.max(f32(0), 1 - dt * 7))
	}
	h.update_flash(dt)
	h.update_bar()
}

// update_flash whitens every mesh of the node for a moment after a hit.
fn (mut h Health) update_flash(dt f32) {
	if h.flash <= 0 && h.base.len == 0 {
		return
	}
	h.flash = math.max(f32(0), h.flash - dt * 5)
	mut stack := [h.node]
	for stack.len > 0 {
		n := stack.pop()
		for ch in n.children {
			if voidptr(ch) != voidptr(h.bar) {
				stack << ch
			}
		}
		mut m := n.get_component[render3d.MeshRenderer3D]() or { continue }
		key := voidptr(m)
		if key !in h.base {
			h.base[key] = m.emissive
		}
		b := h.base[key] or { m.emissive }
		k := h.flash
		m.emissive = core.rgba(u8(f32(b.r) + (255 - f32(b.r)) * k), u8(f32(b.g) +
			(255 - f32(b.g)) * k), u8(f32(b.b) + (255 - f32(b.b)) * k), 255)
	}
	if h.flash <= 0 {
		h.base.clear()
	}
}

fn (mut h Health) update_bar() {
	if h.bar == unsafe { nil } {
		return
	}
	mut bar := h.bar
	bar.active = h.hp < h.max && h.hp > 0
	if !bar.active {
		return
	}
	f := f32(h.hp) / f32(h.max)
	mut ft := h.fill.get_component[render3d.Transform3D]() or { return }
	ft.scale.x = 1.24 * f
	ft.position.x = -0.62 * (1 - f)
	if mut m := h.fill.get_component[render3d.MeshRenderer3D]() {
		m.color = if f > 0.5 {
			if h.boss { core.rgba(255, 146, 43, 255) } else { core.rgba(224, 49, 49, 255) }
		} else if f > 0.25 {
			core.rgba(240, 200, 60, 255)
		} else {
			core.rgba(240, 70, 60, 255)
		}
	}
	// face the camera: undo the node's own yaw, then turn like the camera
	own := render3d.transform3d(mut h.node).rotation.y
	mut bt := bar.get_component[render3d.Transform3D]() or { return }
	bt.rotation.y = f32(camera_yaw(h.scene()) * 180 / math.pi) - own
}

// ---------- Monster factory ----------

// spawn_monster builds one beast (shape from content.v) under `world`.
fn spawn_monster(mut world core.Node, kind string, pos core.Vec3, tier int, boss bool) &core.Node {
	sp := enemy_spec(kind)
	hp_f := 1 + f32(tier - 1) * 0.30
	dmg_f := 1 + f32(tier - 1) * 0.22
	scale := sp.scale * (if boss { f32(1.75) } else { f32(1.0) })
	max_hp := int(f32(sp.hp) * hp_f * (if boss { f32(8.0) } else { f32(1.0) }))
	speed := sp.speed * (if boss { f32(0.85) } else { f32(1.0) })
	dmg := int(f32(sp.dmg) * dmg_f * (if boss { f32(2.0) } else { f32(1.0) }))
	exp := int(f32(sp.exp) * (1 + f32(tier - 1) * 0.25) * (if boss { f32(7.0) } else { f32(1.0) }))

	mut mn := core.Node.new(if boss { 'Boss' } else { 'Monster' })
	mn.add_component(&render3d.Transform3D{
		position: pos
		rotation: core.vec3(0, rand.f32() * 360, 0)
		scale:    core.vec3(scale, scale, scale)
	})
	mn.add_component(&Health{
		max:        max_hp
		bar_height: if sp.shape in ['dragon'] { f32(4.2) } else { f32(2.6) }
		respawn:    0
		boss:       boss
		exp:        exp
		tier:       tier
	})
	mn.add_component(&EnemyAI{
		kind:    kind
		speed:   speed
		damage:  dmg
		flying:  sp.shape in ['bird']
		float_h: if sp.shape == 'bird' { f32(2.3) } else { f32(0) }
		boss:    boss
	})
	build_body(mut mn, sp, kind)
	if boss {
		// a glowing ring marks the boss
		ring := add_mesh(mut mn, 'BossRing', core.vec3(0, 0.06, 0), core.vec3(90, 0, 0),
			core.vec3(3.6, 3.6, 3.6), 'torus', sp.accent)
		if mut mr := ring.get_component[render3d.MeshRenderer3D]() {
			mr.emissive = sp.accent
			mr.unlit = true
			mr.blend = 'additive'
		}
	}
	world.add_child(mut mn)
	return mn
}

// build_body: the 8 body plans.
fn build_body(mut mn core.Node, sp EnemySpec, kind string) {
	match sp.shape {
		'quad' { build_quad(mut mn, sp, kind) }
		'serpent' { build_serpent(mut mn, sp) }
		'float' { build_float(mut mn, sp) }
		'bird' { build_bird(mut mn, sp, kind) }
		'spider' { build_spider(mut mn, sp) }
		'turtle' { build_turtle(mut mn, sp) }
		'dragon' { build_dragon(mut mn, sp) }
		else { build_biped(mut mn, sp) }
	}
}

fn eye_color(sp EnemySpec) core.Color {
	if sp.shape == 'float' {
		return core.rgba(150, 240, 255, 255)
	}
	return core.rgba(255, 72, 48, 255)
}

fn build_biped(mut mn core.Node, sp EnemySpec) {
	bone := core.rgba(233, 236, 239, 255)
	body := sp.body
	armor := sp.accent
	// legs
	add_mesh(mut mn, 'LegL', core.vec3(-0.22, 0.28, 0), core.Vec3{}, core.vec3(0.28, 0.55, 0.28), 'cylinder', body)
	add_mesh(mut mn, 'LegR', core.vec3(0.22, 0.28, 0), core.Vec3{}, core.vec3(0.28, 0.55, 0.28), 'cylinder', body)
	// torso
	torso := add_mesh(mut mn, 'Torso', core.vec3(0, 0.9, 0), core.Vec3{}, core.vec3(0.76, 0.75, 0.6),
		'cylinder', armor)
	if mut m := torso.get_component[render3d.MeshRenderer3D]() {
		m.pattern = 'noise'
		m.shadow = true
		m.shadow_size = 0.9
	}
	// shoulder spikes
	add_mesh(mut mn, 'PadL', core.vec3(-0.45, 1.25, 0), core.vec3(0, 0, 34), core.vec3(0.48, 0.45, 0.48),
		'cone', bone)
	add_mesh(mut mn, 'PadR', core.vec3(0.45, 1.25, 0), core.vec3(0, 0, -34), core.vec3(0.48, 0.45, 0.48),
		'cone', bone)
	// head + horns
	head := add_mesh(mut mn, 'Head', core.vec3(0, 1.52, 0), core.Vec3{}, core.vec3(0.72, 0.72, 0.72), 'sphere', body)
	if mut m := head.get_component[render3d.MeshRenderer3D]() {
		m.pattern = 'noise'
	}
	add_mesh(mut mn, 'HornL', core.vec3(-0.26, 1.85, 0.05), core.vec3(14, 0, 26), core.vec3(0.16, 0.52, 0.16),
		'cone', bone)
	add_mesh(mut mn, 'HornR', core.vec3(0.26, 1.85, 0.05), core.vec3(14, 0, -26), core.vec3(0.16, 0.52, 0.16),
		'cone', bone)
	// eyes
	eye := eye_color(sp)
	for i in 0 .. 2 {
		x := f32(-0.12 + f32(i) * 0.24)
		mut e := add_glow(mut mn, 'Eye${i}', core.vec3(x, 1.54, 0.31), core.vec3(0.12, 0.12, 0.12), 'sphere', eye)
		e.active = true
	}
	// weapon
	steel := core.rgba(70, 78, 84, 255)
	match sp.weapon {
		'cleaver' {
			add_mesh(mut mn, 'Cleaver', core.vec3(0.55, 0.95, 0.35), core.vec3(46, 0, 0),
				core.vec3(0.25, 1.1, 0.12), 'cube', steel)
		}
		'staff' {
			add_mesh(mut mn, 'Staff', core.vec3(0.62, 1.0, 0.2), core.vec3(0, 0, -14),
				core.vec3(0.12, 2.5, 0.12), 'cylinder', core.rgba(120, 86, 56, 255))
			add_glow(mut mn, 'StaffTip', core.vec3(0.82, 2.25, 0.2), core.vec3(0.3, 0.3, 0.3), 'sphere',
				sp.accent)
		}
		'sword' {
			add_mesh(mut mn, 'Blade', core.vec3(0.56, 1.05, 0.3), core.vec3(52, 0, -12),
				core.vec3(0.11, 1.6, 0.06), 'cube', core.rgba(206, 216, 224, 255))
			add_mesh(mut mn, 'Hilt', core.vec3(0.6, 0.55, 0.2), core.vec3(52, 0, -12),
				core.vec3(0.16, 0.3, 0.16), 'cylinder', core.rgba(96, 72, 48, 255))
		}
		'bow' {
			add_mesh(mut mn, 'Bow', core.vec3(0.6, 1.0, 0.25), core.vec3(0, 0, 18),
				core.vec3(0.9, 1.5, 0.08), 'torus', core.rgba(120, 88, 54, 255))
			add_mesh(mut mn, 'String', core.vec3(0.6, 1.0, 0.25), core.vec3(0, 0, 18),
				core.vec3(0.03, 1.4, 0.03), 'cylinder', core.rgba(220, 220, 210, 255))
		}
		'claw' {
			for i in 0 .. 3 {
				add_mesh(mut mn, 'Claw${i}', core.vec3(0.52 + f32(i) * 0.09, 0.95, 0.34),
					core.vec3(60, 0, f32(-18 + i * 18)), core.vec3(0.07, 0.42, 0.07), 'cone', bone)
			}
		}
		else {}
	}
}

fn build_quad(mut mn core.Node, sp EnemySpec, kind string) {
	body := sp.body
	// torso
	t := add_mesh(mut mn, 'Body', core.vec3(0, 0.95, 0), core.Vec3{}, core.vec3(1.05, 0.85, 1.95), 'sphere', body)
	if mut m := t.get_component[render3d.MeshRenderer3D]() {
		m.pattern = if kind == 'tiger' { 'stripes' } else { 'noise' }
		m.shadow = true
		m.shadow_size = 1.2
	}
	// four legs
	lx := [f32(-0.4), f32(0.4), f32(-0.4), f32(0.4)]
	lz := [f32(-0.6), f32(-0.6), f32(0.65), f32(0.65)]
	for i in 0 .. 4 {
		add_mesh(mut mn, 'Leg${i}', core.vec3(lx[i], 0.32, lz[i]), core.Vec3{}, core.vec3(0.24, 0.65, 0.24),
			'cylinder', body)
	}
	// head, snout, ears
	add_mesh(mut mn, 'Head', core.vec3(0, 1.1, 1.0), core.Vec3{}, core.vec3(0.62, 0.55, 0.6), 'sphere', body)
	add_mesh(mut mn, 'Snout', core.vec3(0, 1.02, 1.42), core.vec3(90, 0, 0), core.vec3(0.32, 0.42, 0.32),
		'cone', sp.accent)
	for i in 0 .. 2 {
		add_mesh(mut mn, 'Ear${i}', core.vec3(f32(-0.24 + f32(i) * 0.48), 1.42, 0.95),
			core.vec3(0, 0, f32(-16 + f32(i) * 32)), core.vec3(0.18, 0.4, 0.18), 'cone', sp.accent)
	}
	// tail
	add_mesh(mut mn, 'Tail', core.vec3(0, 1.12, -1.1), core.vec3(-52, 0, 0), core.vec3(0.18, 1.3, 0.18),
		'cone', body)
	// eyes
	for i in 0 .. 2 {
		add_glow(mut mn, 'Eye${i}', core.vec3(f32(-0.17 + f32(i) * 0.34), 1.22, 1.32),
			core.vec3(0.1, 0.1, 0.1), 'sphere', eye_color(sp))
	}
}

fn build_serpent(mut mn core.Node, sp EnemySpec) {
	body := sp.body
	// coils
	for i in 0 .. 5 {
		k := f32(i)
		add_mesh(mut mn, 'Coil${i}', core.vec3(f32(math.sin(k * 1.1)) * 0.3, 0.32 + k * 0.3, -k * 0.12),
			core.Vec3{}, core.vec3(1.15 - k * 0.08, 0.55, 1.15 - k * 0.08), 'sphere', body)
	}
	// neck + head
	add_mesh(mut mn, 'Neck', core.vec3(0, 1.75, 0.2), core.vec3(20, 0, 0), core.vec3(0.36, 0.9, 0.36),
		'cylinder', body)
	add_mesh(mut mn, 'Head', core.vec3(0, 2.2, 0.45), core.vec3(80, 0, 0), core.vec3(0.42, 0.7, 0.42), 'cone', body)
	for i in 0 .. 2 {
		add_mesh(mut mn, 'Fang${i}', core.vec3(f32(-0.1 + f32(i) * 0.2), 2.1, 0.72), core.vec3(180, 0, 0),
			core.vec3(0.05, 0.28, 0.05), 'cone', core.rgba(240, 240, 230, 255))
		add_glow(mut mn, 'Eye${i}', core.vec3(f32(-0.14 + f32(i) * 0.28), 2.28, 0.62),
			core.vec3(0.09, 0.09, 0.09), 'sphere', sp.accent)
	}
	// tail tip
	add_mesh(mut mn, 'TailTip', core.vec3(0, 1.65, -0.75), core.vec3(-70, 0, 0), core.vec3(0.16, 0.8, 0.16),
		'cone', sp.accent)
}

fn build_float(mut mn core.Node, sp EnemySpec) {
	body := sp.body
	// robe / ghost body
	robe := add_mesh(mut mn, 'Robe', core.vec3(0, 1.25, 0), core.vec3(180, 0, 0), core.vec3(1.2, 2.1, 1.2),
		'cone', body)
	if mut m := robe.get_component[render3d.MeshRenderer3D]() {
		m.blend = 'alpha'
		m.double_sided = true
	}
	// hood + head
	add_mesh(mut mn, 'Hood', core.vec3(0, 2.15, 0), core.Vec3{}, core.vec3(0.8, 0.85, 0.8), 'sphere', sp.accent)
	add_mesh(mut mn, 'Face', core.vec3(0, 2.08, 0.28), core.Vec3{}, core.vec3(0.5, 0.55, 0.2), 'sphere',
		core.rgba(24, 30, 40, 255))
	// sleeves
	for i in 0 .. 2 {
		add_mesh(mut mn, 'Sleeve${i}', core.vec3(f32(-0.7 + f32(i) * 1.4), 1.55, 0.15),
			core.vec3(0, 0, f32(-32 + f32(i) * 64)), core.vec3(0.36, 1.1, 0.36), 'cone', body)
	}
	for i in 0 .. 2 {
		add_glow(mut mn, 'Eye${i}', core.vec3(f32(-0.13 + f32(i) * 0.26), 2.12, 0.42),
			core.vec3(0.1, 0.1, 0.1), 'sphere', core.rgba(140, 240, 255, 255))
	}
	mut mist := core.Node.new('Mist')
	mist.add_component(&render3d.Transform3D{
		position: core.vec3(0, 0.7, 0)
	})
	mist.add_component(&render3d.Particles3D{
		preset: 'smoke'
		rate:   7
		size_start: 0.5
	})
	mn.add_child(mut mist)
}

fn build_bird(mut mn core.Node, sp EnemySpec, kind string) {
	body := sp.body
	add_mesh(mut mn, 'Body', core.vec3(0, 1.6, 0), core.Vec3{}, core.vec3(0.72, 0.62, 1.15), 'sphere', body)
	add_mesh(mut mn, 'Head', core.vec3(0, 2.0, 0.72), core.Vec3{}, core.vec3(0.46, 0.46, 0.46), 'sphere', body)
	add_mesh(mut mn, 'Beak', core.vec3(0, 1.97, 1.12), core.vec3(90, 0, 0), core.vec3(0.22, 0.5, 0.22),
		'cone', core.rgba(240, 176, 60, 255))
	// wings (double-sided planes)
	for i in 0 .. 2 {
		sgn := f32(-1 + i * 2)
		w := add_mesh(mut mn, 'Wing${i}', core.vec3(sgn * 0.85, 1.78, -0.1),
			core.vec3(0, 0, sgn * -28), core.vec3(1.9, 0.12, 1.15), 'plane', sp.accent)
		if mut m := w.get_component[render3d.MeshRenderer3D]() {
			m.double_sided = true
			m.blend = 'alpha'
		}
	}
	// tail feathers
	for i in 0 .. 3 {
		add_mesh(mut mn, 'Tail${i}', core.vec3(f32(-0.24 + f32(i) * 0.24), 1.55, -1.1),
			core.vec3(-28, 0, f32(-18 + f32(i) * 18)), core.vec3(0.16, 1.0, 0.16), 'cone', sp.accent)
	}
	// legs
	for i in 0 .. 2 {
		add_mesh(mut mn, 'Leg${i}', core.vec3(f32(-0.2 + f32(i) * 0.4), 1.1, 0.1), core.Vec3{},
			core.vec3(0.1, 0.6, 0.1), 'cylinder', core.rgba(200, 150, 60, 255))
	}
	for i in 0 .. 2 {
		add_glow(mut mn, 'Eye${i}', core.vec3(f32(-0.16 + f32(i) * 0.32), 2.06, 0.98),
			core.vec3(0.08, 0.08, 0.08), 'sphere', core.rgba(255, 220, 120, 255))
	}
	if kind == 'phoenix' {
		mut trail := core.Node.new('Embers')
		trail.add_component(&render3d.Transform3D{
			position: core.vec3(0, 1.5, -0.6)
		})
		trail.add_component(&render3d.Particles3D{
			preset: 'embers'
			rate:   18
		})
		mn.add_child(mut trail)
	}
}

fn build_spider(mut mn core.Node, sp EnemySpec) {
	body := sp.body
	add_mesh(mut mn, 'Abdomen', core.vec3(0, 0.95, -0.2), core.Vec3{}, core.vec3(1.05, 0.8, 1.25), 'sphere', body)
	add_mesh(mut mn, 'Head', core.vec3(0, 0.82, 0.62), core.Vec3{}, core.vec3(0.52, 0.45, 0.5), 'sphere', body)
	// eight legs
	for i in 0 .. 8 {
		side := if i < 4 { f32(-1) } else { f32(1) }
		j := i % 4
		ang := f32(-38 + j * 26)
		add_mesh(mut mn, 'Leg${i}', core.vec3(side * 0.55, 0.72, -0.5 + f32(j) * 0.36),
			core.vec3(0, 0, side * (52 + f32(j) * 6)), core.vec3(0.09, 1.25, 0.09), 'cylinder', body)
		_ = ang
	}
	// eyes
	for i in 0 .. 4 {
		x := f32(-0.18 + f32(i % 2) * 0.36)
		y := f32(0.9 + f32(i / 2) * 0.12)
		add_glow(mut mn, 'Eye${i}', core.vec3(x, y, 0.92), core.vec3(0.09, 0.09, 0.09), 'sphere', sp.accent)
	}
	add_mesh(mut mn, 'FangL', core.vec3(-0.14, 0.55, 0.88), core.vec3(180, 0, 0), core.vec3(0.06, 0.28, 0.06),
		'cone', core.rgba(240, 240, 230, 255))
	add_mesh(mut mn, 'FangR', core.vec3(0.14, 0.55, 0.88), core.vec3(180, 0, 0), core.vec3(0.06, 0.28, 0.06),
		'cone', core.rgba(240, 240, 230, 255))
}

fn build_turtle(mut mn core.Node, sp EnemySpec) {
	body := sp.body
	shell := add_mesh(mut mn, 'Shell', core.vec3(0, 0.95, 0), core.Vec3{}, core.vec3(1.45, 0.9, 1.55), 'sphere', body)
	if mut m := shell.get_component[render3d.MeshRenderer3D]() {
		m.pattern = 'tiles'
		m.shadow = true
		m.shadow_size = 1.3
	}
	add_mesh(mut mn, 'Head', core.vec3(0, 0.82, 1.12), core.Vec3{}, core.vec3(0.5, 0.42, 0.5), 'sphere', sp.accent)
	for i in 0 .. 4 {
		add_mesh(mut mn, 'Foot${i}', core.vec3(f32(-0.7 + f32(i % 2) * 1.4), 0.22,
			f32(-0.62 + f32(i / 2) * 1.24)), core.Vec3{}, core.vec3(0.3, 0.4, 0.3), 'cylinder', body)
	}
	add_mesh(mut mn, 'Tail', core.vec3(0, 0.6, -1.1), core.vec3(-70, 0, 0), core.vec3(0.15, 0.5, 0.15),
		'cone', sp.accent)
	for i in 0 .. 2 {
		add_glow(mut mn, 'Eye${i}', core.vec3(f32(-0.16 + f32(i) * 0.32), 0.94, 1.42),
			core.vec3(0.08, 0.08, 0.08), 'sphere', core.rgba(255, 210, 90, 255))
	}
}

fn build_dragon(mut mn core.Node, sp EnemySpec) {
	body := sp.body
	// long serpentine body
	for i in 0 .. 6 {
		k := f32(i)
		add_mesh(mut mn, 'Segment${i}', core.vec3(f32(math.sin(k * 0.9)) * 0.45, 1.05 + f32(math.sin(k)) * 0.15,
			-2.0 + k * 0.55), core.Vec3{}, core.vec3(0.85 - k * 0.07, 0.8 - k * 0.05, 0.85 - k * 0.06),
			'sphere', body)
		// back spikes
		add_mesh(mut mn, 'Spike${i}', core.vec3(f32(math.sin(k * 0.9)) * 0.45, 1.55,
			-2.0 + k * 0.55), core.vec3(-18, 0, 0), core.vec3(0.12, 0.42, 0.12), 'cone', sp.accent)
	}
	// neck + head
	add_mesh(mut mn, 'Neck', core.vec3(0.2, 1.5, 1.5), core.vec3(-32, 0, 0), core.vec3(0.55, 1.2, 0.55),
		'cylinder', body)
	add_mesh(mut mn, 'Head', core.vec3(0.2, 2.05, 2.0), core.vec3(-8, 0, 0), core.vec3(0.55, 0.5, 0.85),
		'sphere', body)
	add_mesh(mut mn, 'Snout', core.vec3(0.2, 1.98, 2.6), core.vec3(90, 0, 0), core.vec3(0.34, 0.5, 0.34),
		'cone', body)
	for i in 0 .. 2 {
		add_mesh(mut mn, 'Horn${i}', core.vec3(0.2 + f32(-0.22 + f32(i) * 0.44), 2.4, 1.9),
			core.vec3(18, 0, f32(-18 + f32(i) * 36)), core.vec3(0.12, 0.6, 0.12), 'cone', sp.accent)
		// whiskers
		add_mesh(mut mn, 'Whisker${i}', core.vec3(0.2 + f32(-0.28 + f32(i) * 0.56), 2.0, 2.55),
			core.vec3(0, 0, f32(-30 + f32(i) * 60)), core.vec3(0.05, 0.8, 0.05), 'cylinder', sp.accent)
		add_glow(mut mn, 'Eye${i}', core.vec3(0.2 + f32(-0.2 + f32(i) * 0.4), 2.16, 2.5),
			core.vec3(0.11, 0.11, 0.11), 'sphere', core.rgba(255, 230, 120, 255))
	}
	// wings
	for i in 0 .. 2 {
		sgn := f32(-1 + i * 2)
		w := add_mesh(mut mn, 'Wing${i}', core.vec3(sgn * 0.9, 1.5, 0.2), core.vec3(0, 0, sgn * -34),
			core.vec3(2.4, 0.12, 1.4), 'plane', sp.accent)
		if mut m := w.get_component[render3d.MeshRenderer3D]() {
			m.double_sided = true
			m.blend = 'alpha'
		}
	}
	// tail
	add_mesh(mut mn, 'Tail', core.vec3(0, 0.85, -2.6), core.vec3(-62, 0, 0), core.vec3(0.3, 1.8, 0.3),
		'cone', body)
}

// ---------- Enemy AI ----------
// Chases the hero, bobs while running, attacks in range (the hero's dodge chance
// applies, like the design). Flying beasts hover; bosses hit harder and farther.

pub struct EnemyAI {
	core.Component
pub mut:
	kind      string = 'demon'
	speed     f32    = 3.2
	damage    int    = 7
	atk_range f32    = 1.75
	atk_cd    f32    = 1.6
	cd        f32 @[hide]
	phase     f32 @[hide]
	flying    bool
	float_h   f32
	boss      bool
}

pub fn (mut e EnemyAI) start() {
	e.cd = rand.f32() * e.atk_cd
	e.phase = rand.f32() * 6.28318
}

pub fn (mut e EnemyAI) update(dt f32) {
	// chuẩn chung vòng 3 (tank aggro thật): tank đang khiêu khích thì quái
	// đuổi theo vị trí của tank (taunt_target_pos, battle_map.v); không có
	// taunt thì vẫn đuổi theo leader như cũ. Đòn đánh vẫn trừ HP chung của
	// đội (enemy_attack) — aggro đổi MỤC TIÊU DI CHUYỂN, không đổi bể HP.
	hp := taunt_target_pos(e.scene()) or { hero_pos(e.scene()) or { return } }
	hn := hero(e.scene()) or { return }
	if !hn.active {
		return
	}
	mut tr := render3d.transform3d(mut e.node)
	mut to := hp - tr.position
	to.y = 0
	dist := to.length()
	reach := if e.boss { f32(2.9) } else { e.atk_range }

	if dist > reach {
		mut d := to.normalized()
		tr.position = tr.position + d.mul(e.speed * dt)
		tr.position = clamp_to_arena(tr.position)
		tr.face(d)
		if e.flying {
			tr.position.y = e.float_h + f32(math.sin(e.scene().time * 3 + e.phase)) * 0.3
		} else {
			// run bob (the design hops slightly while chasing)
			tr.position.y = f32(math.abs(math.sin(e.scene().time * 8 + e.phase))) * 0.12
		}
	} else {
		tr.face(to)
		tr.position.y = if e.flying { e.float_h } else { 0 }
		e.cd -= dt
		if e.cd <= 0 {
			e.cd = e.atk_cd
			enemy_attack(e.damage, tr.position)
		}
	}
}

// enemy_attack: the hero's dodge chance rolls first (design: 12%), then damage.
fn enemy_attack(dmg int, from core.Vec3) {
	_ = from
	mut s := gs()
	if rand.f32() < s.dodge {
		if sc := live_scene() {
			if hp := hero_pos(sc) {
				float_text(sc, hp + core.vec3(0, 1.6, 0), 'Né tránh', 'dodge')
			}
		}
		return
	}
	s.hp -= dmg
	if s.hp < 15 {
		s.hp = 15
	}
	if sc := live_scene() {
		if hp := hero_pos(sc) {
			float_text(sc, hp + core.vec3(0, 1.6, 0), '-${dmg}', 'normal')
			if mut world := sc.find('World') {
				burst_colored(mut world, hp + core.vec3(0, 1, 0), core.rgba(255, 90, 70, 255),
					core.rgba(255, 30, 30, 255), 8)
			}
		}
	}
	publish()
}

// on_enemy_killed: kill count, map progress, XP (tier scaled).
// Vòng 3: rơi đồ khi giết quái — tỉ lệ gốc 35% + % rơi đồ của VIP
// (vip_drop_pct, vip.v); rơi Linh Chi Thảo (shop id 5) hoặc Đá Cường Hóa
// (shop id 8). Túi đầy loại mới thì inventory_add từ chối, không crash.
fn on_enemy_killed(boss bool, exp int) {
	mut s := gs()
	s.kills++
	if !boss {
		s.map_kills++
	}
	gain_exp(exp)
	drop_chance := f32(0.35) + f32(vip_drop_pct()) / f32(100)
	if rand.f32() < drop_chance {
		drop_id := if rand.f32() < 0.5 { 5 } else { 8 }
		inventory_add(drop_id)
	}
	publish()
}

// on_boss_killed: clears the map, unlocks the next one, pays the reward.
fn on_boss_killed() {
	mut s := gs()
	s.boss_up = false
	s.boss_ref = unsafe { nil }
	m := s.map_index
	first := !s.cleared[m]
	s.cleared[m] = true
	s.stones += 15 + m * 8
	// reward: full restore + pills
	s.hp = s.max_hp
	s.mp = s.max_mp
	s.pills[0] += 2
	s.pills[1] += 2
	s.pills[2] += 1
	if first {
		if m + 1 < maps.len {
			show_banner('Chinh phục ${maps[m].name}! Mở khóa ${maps[m + 1].name}')
		} else {
			show_banner('Bát Hoang Địa Đồ đã hoàn toàn chinh phục!')
		}
	} else {
		show_banner('Tái chiến thắng lợi: ${maps[m].name}')
	}
	publish()
}

// ---------- Wave spawner ----------
// Seeds the arena from the map roster, trickles beasts while the fight is quiet,
// then sends the map boss once the kill goal is met.

pub struct WaveSpawner {
	core.Component
pub mut:
	trickle f32 = 3 @[hide]
}

pub fn (mut w WaveSpawner) start() {
	gs().scene = w.scene()
	if mut en := w.scene().find('World/Enemies') {
		spawn_map_wave(mut en)
	}
}

pub fn (mut w WaveSpawner) update(dt f32) {
	mut s := gs()
	// Thị Trấn Song Ma là khu an toàn (town.v): vào thị trấn thì tắt spawn
	// quái, ra khỏi thị trấn bật lại — guard này là điểm duy nhất làm được
	// việc đó, vì WaveSpawner không có cờ bật/tắt riêng.
	if s.in_town {
		return
	}
	sc := w.scene()
	mut world := sc.find('World/Enemies') or { return }
	// HUD dungeon button: an extra wave from the current roster
	wave := s.pending_wave
	if wave != '' {
		s.pending_wave = ''
		match wave {
			'swarm' {
				show_banner('Yêu Thú Tràn Vào!')
				for _ in 0 .. 6 {
					spawn_monster(mut world, random_roster_kind(), random_spawn_pos(), s.map_index + 1, false)
				}
			}
			'elite' {
				show_banner('Yêu Tướng Xuất Hiện!')
				for _ in 0 .. 4 {
					spawn_monster(mut world, 'elite', random_spawn_pos(), s.map_index + 1, false)
				}
			}
			'boss' {
				if !s.boss_up {
					w.spawn_boss(mut world)
				}
			}
			else {}
		}
	}
	// boss encounter when the kill goal is met
	if !s.boss_up && s.map_kills >= s.map_goal {
		w.spawn_boss(mut world)
	}
	// trickle ambient beasts while the arena is quiet
	w.trickle -= dt
	if w.trickle <= 0 {
		w.trickle = 2.6
		if enemies_of(sc).len < 9 && s.map_kills < s.map_goal && rand.f32() < 0.65 {
			spawn_monster(mut world, random_roster_kind(), random_spawn_pos(), s.map_index + 1, false)
		}
	}
}

fn (mut w WaveSpawner) spawn_boss(mut world core.Node) {
	mut s := gs()
	s.boss_up = true
	m := maps[s.map_index]
	show_banner('Cảnh Báo: ${boss_title(m.boss)} Giáng Lâm!')
	n := spawn_monster(mut world, m.boss, random_portal_pos(), s.map_index + 1, true)
	s.boss_ref = n
	for _ in 0 .. 3 {
		spawn_monster(mut world, m.roster[0], random_spawn_pos(), s.map_index + 1, false)
	}
	_ = w
}

// spawn_map_wave: the opening pack of a map.
fn spawn_map_wave(mut world core.Node) {
	s := gs()
	if s.map_index < 0 || s.map_index >= maps.len {
		return
	}
	m := maps[s.map_index]
	for i in 0 .. 8 {
		kind := m.roster[i % m.roster.len]
		spawn_monster(mut world, kind, random_spawn_pos(), s.map_index + 1, false)
	}
}

fn random_roster_kind() string {
	s := gs()
	m := maps[s.map_index]
	return m.roster[int(rand.f32() * f32(m.roster.len)) % m.roster.len]
}

// random_spawn_pos: near the outer ring, like the design.
fn random_spawn_pos() core.Vec3 {
	a := rand.f32() * 6.28318
	r := f32(10 + rand.f32() * 11)
	return core.vec3(f32(math.cos(a)) * r, 0, f32(math.sin(a)) * r)
}

// random_portal_pos: bosses arrive from the far side of the arena.
fn random_portal_pos() core.Vec3 {
	a := rand.f32() * 6.28318
	r := f32(13)
	return core.vec3(f32(math.cos(a)) * r, 0, f32(math.sin(a)) * r)
}
