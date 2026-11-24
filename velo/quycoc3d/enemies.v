module main

import math
import rand
import velo.core
import velo.render3d

// Enemies — the demon beasts of Quỷ Cốc Sơn, built from primitives like the design's
// create3DMonster(): demon / ghoul / elite / boss, each with a 3D HP bar billboarded
// to the camera, chase-and-attack AI, hit flash and knockback physics.

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
	hp         int                @[hide]
	invuln     f32                @[hide] // seconds of immunity after a hit
	flash      f32                @[hide]
	knock      core.Vec3          @[hide]
	home       core.Vec3          @[hide]
	base       map[voidptr]core.Color @[hide]
	bar        &core.Node = unsafe { nil } @[hide]
	fill       &core.Node = unsafe { nil } @[hide]
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
		c0 := if h.max >= 1000 { core.rgba(255, 240, 170, 255) } else { core.rgba(220, 200, 255, 255) }
		c1 := if h.max >= 1000 { core.rgba(255, 120, 40, 255) } else { core.rgba(150, 90, 255, 255) }
		burst_colored(mut world, p + core.vec3(0, 0.8, 0), c0, c1, if h.max >= 1000 { 90 } else { 40 })
		on_enemy_killed(h.max)
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
	boss := h.max >= 1000
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
			if h.max >= 1000 { core.rgba(255, 146, 43, 255) } else { core.rgba(224, 49, 49, 255) }
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

// spawn_monster builds a demon-beast node (primitive parts like the design) and puts
// it under World. kind: 'demon' | 'ghoul' | 'elite' | 'boss'.
fn spawn_monster(mut world core.Node, kind string, pos core.Vec3) &core.Node {
	boss := kind == 'boss'
	elite := kind == 'elite'
	scale := if boss { f32(1.85) } else if elite { f32(1.3) } else { f32(1.0) }
	max_hp := if boss { 1400 } else if elite { 420 } else if kind == 'ghoul' { 150 } else { 190 }
	speed := if boss { f32(2.4) } else if kind == 'ghoul' { f32(4.1) } else { f32(3.2) }
	dmg := if boss { 24 } else if elite { 12 } else if kind == 'ghoul' { 5 } else { 7 }

	body_col := if boss { core.rgba(74, 21, 37, 255) } else if kind == 'ghoul' {
		core.rgba(75, 59, 99, 255)
	} else { core.rgba(89, 66, 54, 255) }
	armor_col := if boss { core.rgba(217, 72, 15, 255) } else if elite {
		core.rgba(112, 72, 232, 255)
	} else { core.rgba(134, 142, 150, 255) }
	bone := core.rgba(233, 236, 239, 255)

	mut mn := core.Node.new('Monster')
	mn.add_component(&render3d.Transform3D{
		position: pos
		scale:    core.vec3(scale, scale, scale)
	})
	mn.add_component(&Health{
		max:        max_hp
		bar_height: 2.5
		respawn:    0
	})
	mn.add_component(&EnemyAI{
		kind:   kind
		speed:  speed
		damage: dmg
	})

	// legs
	add_mesh(mut mn, 'LegL', core.vec3(-0.22, 0.28, 0), core.vec3(0, 0, 0),
		core.vec3(0.28, 0.55, 0.28), 'cylinder', body_col)
	add_mesh(mut mn, 'LegR', core.vec3(0.22, 0.28, 0), core.vec3(0, 0, 0),
		core.vec3(0.28, 0.55, 0.28), 'cylinder', body_col)
	// torso (armor)
	torso := add_mesh(mut mn, 'Torso', core.vec3(0, 0.9, 0), core.vec3(0, 0, 0),
		core.vec3(0.76, 0.75, 0.6), 'cylinder', armor_col)
	if mut m := torso.get_component[render3d.MeshRenderer3D]() {
		m.pattern = 'noise'
		m.shadow = true
		m.shadow_size = 0.9
	}
	// spiky shoulder pads
	add_mesh(mut mn, 'PadL', core.vec3(-0.45, 1.25, 0), core.vec3(0, 0, 34),
		core.vec3(0.48, 0.45, 0.48), 'cone', bone)
	add_mesh(mut mn, 'PadR', core.vec3(0.45, 1.25, 0), core.vec3(0, 0, -34),
		core.vec3(0.48, 0.45, 0.48), 'cone', bone)
	// head + curved horns + glowing red eyes
	head := add_mesh(mut mn, 'Head', core.vec3(0, 1.52, 0), core.vec3(0, 0, 0),
		core.vec3(0.72, 0.72, 0.72), 'sphere', body_col)
	if mut m := head.get_component[render3d.MeshRenderer3D]() {
		m.pattern = 'noise'
	}
	add_mesh(mut mn, 'HornL', core.vec3(-0.26, 1.85, 0.05), core.vec3(14, 0, 26),
		core.vec3(0.16, 0.52, 0.16), 'cone', bone)
	add_mesh(mut mn, 'HornR', core.vec3(0.26, 1.85, 0.05), core.vec3(14, 0, -26),
		core.vec3(0.16, 0.52, 0.16), 'cone', bone)
	eye := core.rgba(255, 42, 42, 255)
	el := add_mesh(mut mn, 'EyeL', core.vec3(-0.12, 1.54, 0.31), core.vec3(0, 0, 0),
		core.vec3(0.1, 0.1, 0.1), 'sphere', eye)
	er := add_mesh(mut mn, 'EyeR', core.vec3(0.12, 1.54, 0.31), core.vec3(0, 0, 0),
		core.vec3(0.1, 0.1, 0.1), 'sphere', eye)
	if mut m := el.get_component[render3d.MeshRenderer3D]() {
		m.emissive = eye
		m.unlit = true
	}
	if mut m := er.get_component[render3d.MeshRenderer3D]() {
		m.emissive = eye
		m.unlit = true
	}
	// demon cleaver
	add_mesh(mut mn, 'Cleaver', core.vec3(0.55, 0.95, 0.35), core.vec3(46, 0, 0),
		core.vec3(0.25, 1.1, 0.12), 'cube', core.rgba(52, 58, 64, 255))

	world.add_child(mut mn)
	return mn
}

// ---------- Enemy AI ----------
// Chases the hero, bobs while running, attacks in range (the hero's dodge chance
// applies, like the design).

pub struct EnemyAI {
	core.Component
pub mut:
	kind      string = 'demon' @[choices: 'demon|ghoul|elite|boss']
	speed     f32    = 3.2
	damage    int    = 7
	atk_range f32    = 1.75
	atk_cd    f32    = 1.6
	cd        f32 @[hide]
	phase     f32 @[hide]
}

pub fn (mut e EnemyAI) start() {
	e.cd = rand.f32() * e.atk_cd
	e.phase = rand.f32() * 6.28318
}

pub fn (mut e EnemyAI) update(dt f32) {
	hp := hero_pos(e.scene()) or { return }
	hn := hero(e.scene()) or { return }
	if !hn.active {
		return
	}
	mut tr := render3d.transform3d(mut e.node)
	mut to := hp - tr.position
	to.y = 0
	dist := to.length()
	boss := e.kind == 'boss'
	reach := if boss { f32(2.5) } else { e.atk_range }

	if dist > reach {
		mut d := to.normalized()
		tr.position = tr.position + d.mul(e.speed * dt)
		tr.position = clamp_to_arena(tr.position)
		tr.face(d)
		// run bob (the design hops slightly while chasing)
		tr.position.y = f32(math.abs(math.sin(e.scene().time * 8 + e.phase))) * 0.12
	} else {
		tr.position.y = 0
		tr.face(to)
		e.cd -= dt
		if e.cd <= 0 {
			e.cd = e.atk_cd
			enemy_attack(e.damage, tr.position)
		}
	}
}

// enemy_attack: the hero's dodge chance rolls first (design: 12%), then damage.
fn enemy_attack(dmg int, from core.Vec3) {
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

// on_enemy_killed: kill count, quest progress, XP (design: boss 120, elite 60, mob 22).
fn on_enemy_killed(max_hp int) {
	mut s := gs()
	s.kills++
	exp := if max_hp >= 1000 { 120 } else if max_hp >= 400 { 60 } else { 22 }
	gain_exp(exp)
	publish()
}

// ---------- Wave spawner ----------
// Seeds the arena with monsters, trickles new ones while the fight is quiet, and runs
// the dungeon waves the HUD buttons request (Hoa Đào / Bí Cảnh / Ma Tôn).

pub struct WaveSpawner {
	core.Component
pub mut:
	trickle f32 = 3 @[hide]
}

pub fn (mut w WaveSpawner) start() {
	gs().scene = w.scene()
	mut world := w.scene().find('World') or { return }
	// initial wave: 8 mixed mobs, like the design
	for i in 0 .. 8 {
		kind := if i % 3 == 0 { 'ghoul' } else { 'demon' }
		spawn_monster(mut world, kind, random_spawn_pos())
	}
}

pub fn (mut w WaveSpawner) update(dt f32) {
	mut world := w.scene().find('World') or { return }
	// run a requested dungeon wave
	wave := gs().pending_wave
	if wave != '' {
		gs().pending_wave = ''
		match wave {
			'swarm' {
				show_banner('Phó Bản: Hoa Đào Phá Đặc - Yêu Thú Tràn Vào!')
				for _ in 0 .. 6 {
					spawn_monster(mut world, 'ghoul', random_spawn_pos())
				}
			}
			'elite' {
				show_banner('Phó Bản: Bát Hoang Bí Cảnh - Yêu Tướng Xuất Hiện!')
				for _ in 0 .. 4 {
					spawn_monster(mut world, 'elite', random_spawn_pos())
				}
			}
			'boss' {
				show_banner('Cảnh Báo: Quỷ Cốc Ma Tôn Giáng Lâm!')
				spawn_monster(mut world, 'boss', random_spawn_pos())
				for _ in 0 .. 3 {
					spawn_monster(mut world, 'demon', random_spawn_pos())
				}
			}
			else {}
		}
	}
	// trickle ambient mobs while the arena is quiet (design: < 6 enemies, random)
	w.trickle -= dt
	if w.trickle <= 0 {
		w.trickle = 2.5
		if enemies_of(w.scene()).len < 6 && rand.f32() < 0.6 {
			kind := if rand.f32() > 0.4 { 'demon' } else { 'ghoul' }
			spawn_monster(mut world, kind, random_spawn_pos())
		}
	}
}

// random_spawn_pos: near the portals / outer ring, like the design.
fn random_spawn_pos() core.Vec3 {
	a := rand.f32() * 6.28318
	r := f32(10 + rand.f32() * 11)
	return core.vec3(f32(math.cos(a)) * r, 0, f32(math.sin(a)) * r)
}
