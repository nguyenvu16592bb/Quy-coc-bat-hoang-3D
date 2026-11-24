module main

import math
import rand
import velo.core
import velo.render3d

// ============================================================================
//  world.v — the Bát Hoang Địa Đồ arenas.
//
//  Every map is a floating peak re-dressed from primitives: environment palette,
//  arena floor, perimeter props, a landmark (pagoda / temple / tomb / market /
//  palace / stupa forest...) and ambient particles. `load_map` swaps the whole
//  decor at runtime, so the 16 maps share one scene and one hero party.
//
//  Theme builders live at the bottom; the prop library above them is shared.
// ============================================================================

pub struct WorldBuilder {
	core.Component
}

pub fn (mut w WorldBuilder) start() {
	gs().scene = w.scene()
	mut world := w.scene().find('World') or { return }
	// the monster container (WaveSpawner + map travel fill/empty it)
	if _ := world.find('Enemies') {
	} else {
		mut en := core.Node.new('Enemies')
		world.add_child(mut en)
	}
	build_party(mut world)
	build_arena(mut world)
}

// Spin3D — turns the node at `speed` degrees per second around each axis (the same
// helper the demo3d example defines; needed by the scene DSL and runtime spawns).
pub struct Spin3D {
	core.Component
pub mut:
	speed core.Vec3 = core.Vec3{0, 90, 0}
}

pub fn (mut s Spin3D) update(dt f32) {
	mut t := render3d.transform3d(mut s.node)
	t.rotation = t.rotation + s.speed.mul(dt)
}

// add_mesh: a MeshRenderer3D node under `parent`; returns it for further tweaks.
fn add_mesh(mut parent core.Node, name string, pos core.Vec3, rot core.Vec3, scale core.Vec3, mesh string, col core.Color) &core.Node {
	mut n := core.Node.new(name)
	n.add_component(&render3d.Transform3D{
		position: pos
		rotation: rot
		scale:    scale
	})
	n.add_component(&render3d.MeshRenderer3D{
		mesh:  mesh
		color: col
	})
	parent.add_child(mut n)
	return n
}

// add_glow: an unlit additive mesh (magic light, lantern core, runes).
fn add_glow(mut parent core.Node, name string, pos core.Vec3, scale core.Vec3, mesh string, col core.Color) &core.Node {
	n := add_mesh(mut parent, name, pos, core.Vec3{}, scale, mesh, col)
	if mut m := n.get_component[render3d.MeshRenderer3D]() {
		m.emissive = col
		m.unlit = true
		m.blend = 'additive'
	}
	return n
}

fn add_light(mut parent core.Node, pos core.Vec3, col core.Color, intensity f32, range f32) {
	mut n := core.Node.new('Light')
	n.add_component(&render3d.Transform3D{
		position: pos
	})
	n.add_component(&render3d.PointLight3D{
		color:     col
		intensity: intensity
		range:     range
	})
	parent.add_child(mut n)
}

// ---------------------------------------------------------------------------
//  build_arena — (re)build everything map-dependent: environment, floor, decor,
//  ambient particles. Safe to call on every map travel.
// ---------------------------------------------------------------------------
fn build_arena(mut world core.Node) {
	s := gs()
	m := maps[s.map_index]
	// arena colours
	if n := world.find('Platform') {
		if mut mr := n.get_component[render3d.MeshRenderer3D]() {
			mr.color = m.floor
		}
	}
	if n := world.find('UnderRock') {
		if mut mr := n.get_component[render3d.MeshRenderer3D]() {
			mr.color = m.rock
		}
	}
	if n := world.find('Plaza') {
		if mut mr := n.get_component[render3d.MeshRenderer3D]() {
			mr.color = m.floor.lerp(m.accent, 0.12)
		}
	}
	// environment (sky/ground ambient + fog)
	if world.scene != unsafe { nil } {
		root := world.scene.root
		if mut e := root.get_component[render3d.Environment3D]() {
			e.sky = m.sky
			e.ground = m.ground
			e.ambient = m.ambient
			e.fog_color = m.fog
			e.fog_density = m.fog_density
		}
	}
	// decor
	if d := world.find('Decor') {
		mut old := d
		old.destroy()
	}
	mut decor := core.Node.new('Decor')
	world.add_child(mut decor)
	build_decor(mut decor, m)
	// ambient particles
	if a := world.find('Ambient') {
		mut old := a
		old.destroy()
	}
	build_ambient(mut world, m)
}

fn build_ambient(mut world core.Node, m MapDef) {
	mut n := core.Node.new('Ambient')
	n.add_component(&render3d.Transform3D{
		position: core.vec3(0, 8, 0)
	})
	mut p := render3d.Particles3D{
		preset: m.particle
		box:    core.vec3(44, 11, 44)
		rate:   26
	}
	match m.theme {
		'peach', 'villa' {
			p.color_start = core.rgba(255, 196, 218, 255)
			p.color_alt = core.rgba(255, 150, 186, 255)
			p.color_end = core.rgba(255, 140, 180, 0)
		}
		'tomb', 'palace' {
			p.color_start = core.rgba(150, 240, 255, 220)
			p.color_alt = core.rgba(90, 200, 230, 200)
			p.color_end = core.rgba(70, 160, 200, 0)
		}
		'icefire' {
			p.color_start = core.rgba(255, 150, 80, 255)
			p.color_alt = core.rgba(255, 90, 50, 255)
			p.color_end = core.rgba(255, 60, 20, 0)
		}
		'snow', 'mountain' {
			p.color_start = core.rgba(235, 248, 255, 255)
			p.color_alt = core.rgba(200, 228, 250, 255)
			p.color_end = core.rgba(200, 228, 250, 0)
		}
		else {}
	}
	n.add_component(&render3d.Particles3D{
		preset: p.preset
		box: p.box
		rate: p.rate
		color_start: p.color_start
		color_alt: p.color_alt
		color_end: p.color_end
		max_particles: p.max_particles
		local: p.local
	}) // literal: a local struct address would dangle
	world.add_child(mut n)
}

fn build_decor(mut d core.Node, m MapDef) {
	add_boulders(mut d, m)
	match m.theme {
		'peach' { build_peach(mut d, m) }
		'sect' { build_sect(mut d, m) }
		'tomb' { build_tomb(mut d, m) }
		'camp' { build_camp(mut d, m) }
		'garden' { build_garden(mut d, m) }
		'temple' { build_temple(mut d, m) }
		'mountain' { build_mountain(mut d, m) }
		'palace' { build_palace(mut d, m) }
		'cliff' { build_cliff(mut d, m) }
		'snow' { build_snow(mut d, m) }
		'villa' { build_villa(mut d, m) }
		'market' { build_market(mut d, m) }
		'manor' { build_manor(mut d, m) }
		'dock' { build_dock(mut d, m) }
		'icefire' { build_icefire(mut d, m) }
		'stupa' { build_stupa(mut d, m) }
		else {}
	}
}

// ---------------------------------------------------------------------------
//  Landmarks
// ---------------------------------------------------------------------------

fn build_peach(mut d core.Node, m MapDef) {
	bark := core.rgba(78, 54, 46, 255)
	blossom := core.rgba(255, 176, 200, 255)
	// peach grove around the rim
	for i in 0 .. 16 {
		a := f32(i) / 16 * 6.28318 + rand.f32() * 0.12
		r := f32(15.5 + rand.f32() * 7.5)
		add_tree(mut d, 'Peach${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'peach', bark, blossom,
			f32(0.85 + rand.f32() * 0.45))
	}
	// lotus pond with a wooden bridge
	add_pond(mut d, 'Pond', -9, -5, 5.2, core.rgba(96, 176, 208, 190))
	for i in 0 .. 7 {
		a := f32(i) / 7 * 6.28318
		add_glow(mut d, 'Lotus${i}', core.vec3(-9 + f32(math.cos(a)) * 3.1, 0.16, -5 + f32(math.sin(a)) * 3.1),
			core.vec3(0.45, 0.3, 0.45), 'sphere', core.rgba(255, 170, 210, 255))
	}
	add_bridge(mut d, 'Bridge', -9, -0.5, 4.2, core.rgba(120, 86, 62, 255))
	// pavilion + lanterns
	add_pavilion(mut d, 'Pavilion', 11, -9, 1.0, core.rgba(126, 52, 46, 255),
		core.rgba(58, 42, 46, 255), core.rgba(255, 206, 120, 255))
	for cfg in [[f32(4), f32(2)], [f32(-4), f32(3)], [f32(14), f32(4)], [f32(-14), f32(-2)]] {
		add_lantern(mut d, 'Lantern', cfg[0], cfg[1], core.rgba(255, 196, 120, 255))
	}
	add_portal(mut d, 12, 6, 2.4, core.rgba(226, 150, 240, 255))
	add_distant(mut d, m, 3, true)
}

fn build_sect(mut d core.Node, m MapDef) {
	stone := core.rgba(112, 118, 110, 255)
	green := core.rgba(56, 96, 70, 255)
	// the sect gate behind the spawn
	add_gate(mut d, 'SectGate', 0, -18, 0, stone, core.rgba(52, 62, 60, 255), 1.25)
	// pine forest
	for i in 0 .. 18 {
		a := f32(i) / 18 * 6.28318 + 0.2
		r := f32(16 + rand.f32() * 7)
		add_tree(mut d, 'Pine${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'pine',
			core.rgba(72, 52, 40, 255), green, f32(0.9 + rand.f32() * 0.5))
	}
	// training dummies + sword racks
	for i in 0 .. 5 {
		x := f32(-10 + i * 5)
		add_dummy(mut d, 'Dummy${i}', x, -8, core.rgba(120, 92, 62, 255))
	}
	for i in 0 .. 4 {
		add_banner(mut d, 'Flag${i}', f32(-13 + i * 9), f32(10 + rand.f32() * 2), core.rgba(150, 60, 52, 255))
	}
	add_pagoda(mut d, 'SectHall', 15, -8, 0.9, stone, core.rgba(60, 48, 42, 255),
		core.rgba(126, 50, 44, 255), core.rgba(48, 62, 66, 255), core.rgba(212, 175, 106, 255))
	add_statue(mut d, 'Patriarch', -14, 4, stone, core.rgba(200, 210, 190, 255))
	for cfg in [[f32(5), f32(-11)], [f32(-5), f32(-11)]] {
		add_brazier(mut d, 'Brazier', cfg[0], cfg[1])
	}
	add_distant(mut d, m, 3, false)
}

fn build_tomb(mut d core.Node, m MapDef) {
	stone := core.rgba(96, 100, 108, 255)
	dark := core.rgba(30, 34, 42, 255)
	// the tomb entrance
	add_gate(mut d, 'TombGate', 0, -17, 0, stone, dark, 1.4)
	if mut tg := d.find('TombGate') {
		add_glow(mut tg, 'Seal', core.vec3(0, 3.0, 0.2), core.vec3(2.2, 3.6, 0.2), 'plane',
			core.rgba(90, 220, 220, 190))
	}
	// burial mounds
	for i in 0 .. 7 {
		a := f32(i) / 7 * 6.28318 + 0.4
		r := f32(14 + rand.f32() * 6)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		add_mesh(mut d, 'Mound${i}', core.vec3(x, 0.5, z), core.Vec3{},
			core.vec3(3.6, 1.2, 2.4), 'sphere', core.rgba(58, 62, 70, 255))
		add_mesh(mut d, 'Stele${i}', core.vec3(x, 1.2, z + 1.6), core.vec3(0, rand.f32() * 30, 0),
			core.vec3(0.9, 1.8, 0.24), 'cube', stone)
	}
	// dead trees + broken pillars
	for i in 0 .. 9 {
		a := f32(i) / 9 * 6.28318
		r := f32(17 + rand.f32() * 5)
		add_tree(mut d, 'Dead${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'dead',
			core.rgba(62, 56, 50, 255), core.rgba(70, 78, 74, 255), f32(1.0 + rand.f32() * 0.4))
	}
	for i in 0 .. 6 {
		x := f32(-16 + i * 6.2)
		z := f32(-6 + rand.f32() * 4)
		add_mesh(mut d, 'Pillar${i}', core.vec3(x, 1.1, z), core.vec3(rand.f32() * 12, 0, rand.f32() * 10),
			core.vec3(0.8, 2.2 + rand.f32(), 0.8), 'cylinder', stone)
	}
	// ghost lanterns
	for cfg in [[f32(-8), f32(6)], [f32(8), f32(6)], [f32(-16), f32(-8)], [f32(16), f32(-8)]] {
		add_glow(mut d, 'GhostLantern', core.vec3(cfg[0], 1.6, cfg[1]), core.vec3(0.34, 0.34, 0.34),
			'sphere', core.rgba(120, 240, 232, 255))
		add_mesh(mut d, 'Post', core.vec3(cfg[0], 0.8, cfg[1]), core.Vec3{}, core.vec3(0.16, 1.6, 0.16),
			'cylinder', core.rgba(48, 54, 60, 255))
	}
	add_portal(mut d, -13, -6, 2.6, core.rgba(120, 230, 220, 255))
	add_distant(mut d, m, 3, false)
}

fn build_camp(mut d core.Node, m MapDef) {
	// palisade ring segment
	for i in 0 .. 26 {
		a := f32(i) / 26 * 6.28318
		r := f32(22.5)
		add_mesh(mut d, 'Log${i}', core.vec3(f32(math.cos(a)) * r, 1.1, f32(math.sin(a)) * r),
			core.vec3(0, rand.f32() * 8, 6), core.vec3(0.5, 2.2, 0.5), 'cylinder',
			core.rgba(104, 78, 52, 255))
	}
	// tents
	acc := core.rgba(196, 128, 66, 255)
	for i in 0 .. 8 {
		a := f32(i) / 8 * 6.28318 + 0.3
		r := f32(14 + rand.f32() * 6)
		add_tent(mut d, 'Tent${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r,
			f32(1.3 + rand.f32() * 0.5), core.rgba(156, 120, 82, 255), acc)
	}
	// campfires
	for cfg in [[f32(-8), f32(-6)], [f32(9), f32(-4)], [f32(0), f32(11)]] {
		add_campfire(mut d, cfg[0], cfg[1])
	}
	// banners + crates
	for i in 0 .. 5 {
		add_banner(mut d, 'Banner${i}', f32(-15 + i * 7.5), f32(-13), core.rgba(198, 146, 58, 255))
	}
	for i in 0 .. 8 {
		x := f32(-5 + rand.f32() * 10)
		z := f32(-16 + rand.f32() * 4)
		add_mesh(mut d, 'Crate${i}', core.vec3(x, 0.45, z), core.vec3(0, rand.f32() * 30, 0),
			core.vec3(0.9, 0.9, 0.9), 'cube', core.rgba(124, 92, 58, 255))
	}
	add_weapon_rack(mut d, 'Rack', 12, 8, core.rgba(120, 88, 56, 255), core.rgba(190, 200, 210, 255))
	add_distant(mut d, m, 3, false)
}

fn build_garden(mut d core.Node, m MapDef) {
	water := core.rgba(104, 190, 176, 190)
	add_pond(mut d, 'LotusPond', 0, -7, 6.4, water)
	for i in 0 .. 9 {
		a := f32(i) / 9 * 6.28318
		add_glow(mut d, 'Lotus${i}', core.vec3(f32(math.cos(a)) * 4.2, 0.18, -7 + f32(math.sin(a)) * 4.2),
			core.vec3(0.4, 0.4, 0.4), 'sphere', core.rgba(255, 180, 210, 255))
	}
	add_pavilion(mut d, 'Pavilion', 0, -16, 1.3, core.rgba(140, 62, 52, 255),
		core.rgba(52, 70, 58, 255), core.rgba(255, 214, 130, 255))
	// flower beds + willows
	cols := [core.rgba(255, 150, 190, 255), core.rgba(255, 226, 130, 255), core.rgba(240, 240, 250, 255),
		core.rgba(190, 150, 255, 255)]
	for i in 0 .. 20 {
		a := f32(i) / 20 * 6.28318 + rand.f32() * 0.2
		r := f32(11 + rand.f32() * 10)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		add_mesh(mut d, 'Bush${i}', core.vec3(x, 0.34, z), core.Vec3{}, core.vec3(0.8, 0.55, 0.8),
			'sphere', core.rgba(58, 100, 60, 255))
		add_glow(mut d, 'Bloom${i}', core.vec3(x, 0.72, z), core.vec3(0.26, 0.26, 0.26), 'sphere',
			cols[i % cols.len])
	}
	for i in 0 .. 6 {
		a := f32(i) / 6 * 6.28318
		r := f32(19)
		add_tree(mut d, 'Willow${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'willow',
			core.rgba(92, 70, 46, 255), core.rgba(96, 168, 96, 255), f32(1.0 + rand.f32() * 0.3))
	}
	// stone path from the entrance to the pavilion
	for i in 0 .. 7 {
		add_mesh(mut d, 'Step${i}', core.vec3(0, 0.08, 6 - f32(i) * 2.6), core.Vec3{},
			core.vec3(2.6, 0.14, 1.6), 'cube', core.rgba(122, 126, 112, 255))
	}
	add_distant(mut d, m, 3, true)
}

fn build_temple(mut d core.Node, m MapDef) {
	stone := core.rgba(128, 116, 96, 255)
	// main hall
	add_house(mut d, 'MainHall', 0, -17, 0, 2.2, core.rgba(92, 62, 46, 255),
		core.rgba(56, 50, 48, 255), core.rgba(255, 186, 96, 255))
	// gate behind the spawn
	add_gate(mut d, 'TempleGate', 0, 15, 180, stone, core.rgba(54, 46, 42, 255), 1.3)
	// stupa row
	for i in 0 .. 8 {
		x := f32(-17 + i * 4.8)
		add_stupa(mut d, 'Stupa${i}', x, -10, f32(0.8 + (i % 3) * 0.18), core.rgba(222, 216, 198, 255),
			core.rgba(212, 175, 106, 255))
	}
	// ginkgo trees
	for i in 0 .. 10 {
		a := f32(i) / 10 * 6.28318
		r := f32(18 + rand.f32() * 5)
		add_tree(mut d, 'Ginkgo${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'ginkgo',
			core.rgba(82, 60, 44, 255), core.rgba(232, 190, 70, 255), f32(0.95 + rand.f32() * 0.4))
	}
	// incense burner
	add_mesh(mut d, 'Censer', core.vec3(0, 0.7, -6), core.Vec3{}, core.vec3(1.5, 1.4, 1.5),
		'cylinder', core.rgba(112, 92, 66, 255))
	add_glow(mut d, 'CenserFire', core.vec3(0, 1.45, -6), core.vec3(0.4, 0.5, 0.4), 'sphere',
		core.rgba(255, 160, 70, 255))
	mut smoke := core.Node.new('Incense')
	smoke.add_component(&render3d.Transform3D{
		position: core.vec3(0, 2.0, -6)
	})
	smoke.add_component(&render3d.Particles3D{
		preset: 'smoke'
		rate:   12
	})
	d.add_child(mut smoke)
	add_light(mut d, core.vec3(0, 2.4, -6), core.rgba(255, 170, 80, 255), 2.2, 10)
	for cfg in [[f32(-5), f32(-8)], [f32(5), f32(-8)]] {
		add_brazier(mut d, 'Brazier', cfg[0], cfg[1])
	}
	add_distant(mut d, m, 3, false)
}

fn build_mountain(mut d core.Node, m MapDef) {
	rock := core.rgba(84, 90, 96, 255)
	snowcap := core.rgba(226, 236, 246, 255)
	// jagged granite spires
	for i in 0 .. 13 {
		a := f32(i) / 13 * 6.28318 + 0.15
		r := f32(17 + rand.f32() * 5.5)
		h := f32(5 + rand.f32() * 8)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		add_mesh(mut d, 'Spire${i}', core.vec3(x, h * 0.5, z), core.vec3(rand.f32() * 20, rand.f32() * 180, 0),
			core.vec3(2.0 + rand.f32() * 1.6, h, 2.0 + rand.f32() * 1.4), 'cone', rock)
		add_mesh(mut d, 'Cap${i}', core.vec3(x, h * 0.92, z), core.vec3(0, 0, 0),
			core.vec3(1.1, 1.1, 1.1), 'sphere', snowcap)
	}
	// pines clinging to the rim
	for i in 0 .. 12 {
		a := f32(i) / 12 * 6.28318
		r := f32(14 + rand.f32() * 5)
		add_tree(mut d, 'Pine${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'pine',
			core.rgba(70, 54, 42, 255), core.rgba(54, 88, 74, 255), f32(0.8 + rand.f32() * 0.4))
	}
	// waterfall into a pool
	add_pond(mut d, 'Pool', 13, -11, 4.4, core.rgba(140, 200, 224, 180))
	add_mesh(mut d, 'Cliff', core.vec3(18, 5, -15), core.Vec3{}, core.vec3(10, 12, 9), 'cone', rock)
	wf := add_mesh(mut d, 'Waterfall', core.vec3(15.5, 3.2, -9.5), core.Vec3{},
		core.vec3(2.4, 8.5, 1), 'plane', core.rgba(200, 240, 255, 120))
	if mut mr := wf.get_component[render3d.MeshRenderer3D]() {
		mr.blend = 'alpha'
		mr.unlit = true
		mr.uv_scroll = core.vec2(0, 0.5)
	}
	// rope bridge to a small islet
	for i in 0 .. 8 {
		add_mesh(mut d, 'Plank${i}', core.vec3(-18 + f32(i) * 1.1, 1.2, 9), core.vec3(0, 0, 0),
			core.vec3(1.0, 0.12, 1.8), 'cube', core.rgba(122, 92, 60, 255))
	}
	add_distant(mut d, m, 4, true)
}

fn build_palace(mut d core.Node, m MapDef) {
	jade := core.rgba(120, 176, 170, 255)
	ice := core.rgba(150, 240, 236, 255)
	add_pagoda(mut d, 'Palace', 0, -18, 1.5, core.rgba(110, 150, 148, 255), core.rgba(72, 96, 96, 255),
		core.rgba(198, 132, 84, 255), core.rgba(56, 84, 90, 255), core.rgba(236, 226, 190, 255))
	// jade pillars with glowing tips
	for i in 0 .. 8 {
		a := f32(i) / 8 * 6.28318 + 0.2
		r := f32(13.5)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		add_mesh(mut d, 'Pillar${i}', core.vec3(x, 2.1, z), core.Vec3{}, core.vec3(0.7, 4.2, 0.7),
			'cylinder', jade)
		add_glow(mut d, 'Tip${i}', core.vec3(x, 4.5, z), core.vec3(0.55, 0.55, 0.55), 'sphere', ice)
	}
	// ice crystals + islets
	for i in 0 .. 14 {
		a := f32(i) / 14 * 6.28318
		r := f32(16 + rand.f32() * 5)
		add_crystal(mut d, 'Crystal${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r,
			f32(0.9 + rand.f32() * 0.9), ice)
	}
	for i in 0 .. 3 {
		a := f32(i) / 3 * 6.28318 + 1.0
		x := f32(math.cos(a)) * 30
		z := f32(math.sin(a)) * 30
		add_mesh(mut d, 'Islet${i}', core.vec3(x, -3 - f32(i), z), core.Vec3{}, core.vec3(7, 1.2, 7),
			'cylinder', core.rgba(66, 96, 100, 255))
		add_crystal(mut d, 'IsletCrystal${i}', x, z, 1.6, ice)
	}
	add_portal(mut d, -12, 4, 2.6, core.rgba(150, 240, 236, 255))
	add_distant(mut d, m, 4, true)
}

fn build_cliff(mut d core.Node, m MapDef) {
	black := core.rgba(48, 42, 50, 255)
	red := core.rgba(180, 44, 38, 255)
	// the black wooden cliff towers
	for i in 0 .. 11 {
		a := f32(i) / 11 * 6.28318 + 0.1
		r := f32(17 + rand.f32() * 5)
		h := f32(6 + rand.f32() * 9)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		add_mesh(mut d, 'Tower${i}', core.vec3(x, h * 0.5 - 1, z), core.vec3(0, rand.f32() * 180, 0),
			core.vec3(2.4, h, 2.4), 'cylinder', black)
		add_mesh(mut d, 'Roof${i}', core.vec3(x, h - 1, z), core.vec3(0, 45, 0),
			core.vec3(4.6, 1.1, 4.6), 'cone', core.rgba(34, 32, 40, 255))
	}
	// blood banners + torches
	for i in 0 .. 6 {
		x := f32(-15 + i * 6)
		add_banner(mut d, 'BloodBanner${i}', x, f32(-15), red)
		add_brazier(mut d, 'Torch', x, f32(-12.6))
	}
	// lava cracks on the ground
	for i in 0 .. 10 {
		a := rand.f32() * 6.28318
		r := f32(6 + rand.f32() * 14)
		n := add_mesh(mut d, 'Crack${i}', core.vec3(f32(math.cos(a)) * r, 0.05, f32(math.sin(a)) * r),
			core.vec3(0, rand.f32() * 180, 0), core.vec3(2.6 + rand.f32() * 2, 0.04, 0.28), 'cube',
			core.rgba(255, 110, 50, 255))
		if mut mr := n.get_component[render3d.MeshRenderer3D]() {
			mr.emissive = core.rgba(200, 60, 20, 255)
			mr.unlit = true
		}
	}
	// skull trophies
	for i in 0 .. 5 {
		x := f32(-10 + i * 5)
		add_mesh(mut d, 'Skull${i}', core.vec3(x, 1.35, -17), core.Vec3{}, core.vec3(0.42, 0.42, 0.42),
			'sphere', core.rgba(226, 222, 206, 255))
		add_mesh(mut d, 'SkullPole${i}', core.vec3(x, 0.7, -17), core.Vec3{}, core.vec3(0.14, 1.4, 0.14),
			'cylinder', black)
	}
	add_portal(mut d, 13, 2, 2.8, core.rgba(255, 96, 72, 255))
	add_distant(mut d, m, 4, false)
}

fn build_snow(mut d core.Node, m MapDef) {
	ice := core.rgba(190, 234, 252, 255)
	snow := core.rgba(240, 248, 255, 255)
	// ice spikes
	for i in 0 .. 16 {
		a := f32(i) / 16 * 6.28318
		r := f32(15 + rand.f32() * 7)
		add_crystal(mut d, 'Ice${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r,
			f32(1.0 + rand.f32() * 1.2), ice)
	}
	// frozen pines
	for i in 0 .. 10 {
		a := f32(i) / 10 * 6.28318 + 0.3
		r := f32(18 + rand.f32() * 5)
		add_tree(mut d, 'FrozenPine${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'pine',
			core.rgba(90, 76, 66, 255), core.rgba(146, 176, 168, 255), f32(0.9 + rand.f32() * 0.4))
	}
	// snow drifts
	for i in 0 .. 12 {
		a := rand.f32() * 6.28318
		r := f32(9 + rand.f32() * 13)
		add_mesh(mut d, 'Drift${i}', core.vec3(f32(math.cos(a)) * r, 0.12, f32(math.sin(a)) * r),
			core.Vec3{}, core.vec3(2.2 + rand.f32() * 2.4, 0.3, 2.0 + rand.f32() * 2), 'sphere', snow)
	}
	// ice arch
	for i in 0 .. 2 {
		x := f32(-3.4 + i * 6.8)
		add_mesh(mut d, 'ArchLeg${i}', core.vec3(x, 3.2, -15), core.Vec3{}, core.vec3(1.5, 6.4, 1.5),
			'cylinder', ice)
	}
	add_mesh(mut d, 'ArchTop', core.vec3(0, 6.5, -15), core.vec3(0, 0, 0), core.vec3(8.6, 1.4, 1.6),
		'cube', ice)
	add_glow(mut d, 'ArchSeal', core.vec3(0, 5.1, -15), core.vec3(2.0, 2.0, 0.2), 'ring',
		core.rgba(150, 226, 255, 220))
	add_distant(mut d, m, 4, true)
}

fn build_villa(mut d core.Node, m MapDef) {
	wall := core.rgba(196, 188, 172, 255)
	roof := core.rgba(120, 52, 50, 255)
	bark := core.rgba(78, 52, 48, 255)
	blossom := core.rgba(240, 108, 128, 255)
	// courtyard walls with a gap at the entrance
	for i in 0 .. 8 {
		x := f32(-20 + i * 5.4)
		if x > -6 && x < 6 {
			continue
		}
		add_mesh(mut d, 'Wall${i}', core.vec3(x, 1.4, 16), core.Vec3{}, core.vec3(5.2, 2.8, 0.8), 'cube', wall)
		add_mesh(mut d, 'WallCap${i}', core.vec3(x, 2.9, 16), core.Vec3{}, core.vec3(5.6, 0.4, 1.2), 'cube', roof)
	}
	add_house(mut d, 'Manor', 0, -18, 0, 1.9, core.rgba(84, 62, 52, 255), roof, core.rgba(255, 196, 120, 255))
	// plum trees
	for i in 0 .. 14 {
		a := f32(i) / 14 * 6.28318 + rand.f32() * 0.2
		r := f32(13 + rand.f32() * 7)
		add_tree(mut d, 'Plum${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'plum', bark, blossom,
			f32(0.85 + rand.f32() * 0.35))
	}
	// red lanterns along the path
	for i in 0 .. 6 {
		add_lantern(mut d, 'RedLantern', f32(-5 + i * 2), f32(9 - i * 2.2), core.rgba(255, 96, 96, 255))
	}
	add_well(mut d, 'Well', 11, 6)
	add_distant(mut d, m, 3, false)
}

fn build_market(mut d core.Node, m MapDef) {
	wood := core.rgba(124, 92, 60, 255)
	// two rows of stalls
	cloths := [core.rgba(198, 72, 64, 255), core.rgba(72, 118, 176, 255), core.rgba(206, 168, 66, 255),
		core.rgba(96, 148, 96, 255)]
	for i in 0 .. 5 {
		x := f32(-16 + i * 8)
		add_stall(mut d, 'StallL${i}', x, -6, 0, cloths[i % cloths.len], wood)
		add_stall(mut d, 'StallR${i}', x, 9, 180, cloths[(i + 1) % cloths.len], wood)
	}
	// houses behind the stalls
	for i in 0 .. 5 {
		x := f32(-18 + i * 9)
		add_house(mut d, 'House${i}', x, -17, 0, f32(1.0 + (i % 2) * 0.2),
			core.rgba(96, 74, 58, 255), core.rgba(62, 52, 50, 255), core.rgba(255, 186, 96, 255))
	}
	// lantern strings
	for i in 0 .. 7 {
		x := f32(-18 + i * 6)
		add_glow(mut d, 'Lamp${i}', core.vec3(x, 3.4, 1.5), core.vec3(0.42, 0.5, 0.42), 'sphere',
			core.rgba(255, 190, 90, 255))
		add_mesh(mut d, 'LampPost${i}', core.vec3(x, 1.7, 1.5), core.Vec3{}, core.vec3(0.16, 3.4, 0.16),
			'cylinder', wood)
	}
	add_well(mut d, 'Well', -9, 2)
	for i in 0 .. 8 {
		x := f32(-12 + rand.f32() * 24)
		z := f32(2 + rand.f32() * 4)
		add_mesh(mut d, 'Crate${i}', core.vec3(x, 0.4, z), core.vec3(0, rand.f32() * 30, 0),
			core.vec3(0.75, 0.75, 0.75), 'cube', core.rgba(136, 100, 64, 255))
	}
	add_distant(mut d, m, 3, false)
}

fn build_manor(mut d core.Node, m MapDef) {
	green := core.rgba(96, 168, 104, 255)
	add_house(mut d, 'Manor', -9, -15, 25, 1.7, core.rgba(96, 78, 62, 255),
		core.rgba(66, 58, 52, 255), core.rgba(255, 190, 110, 255))
	// the white horse statue
	add_horse(mut d, 'WhiteHorse', 4, -3, core.rgba(238, 238, 230, 255))
	// fences
	for i in 0 .. 12 {
		x := f32(-18 + i * 3.2)
		if x > -7 && x < 8 {
			continue
		}
		add_mesh(mut d, 'Fence${i}', core.vec3(x, 0.6, 12), core.Vec3{}, core.vec3(0.16, 1.2, 0.16),
			'cylinder', core.rgba(124, 96, 64, 255))
		add_mesh(mut d, 'Rail${i}', core.vec3(x + 1.6, 0.95, 12), core.Vec3{}, core.vec3(3.2, 0.14, 0.14),
			'cube', core.rgba(124, 96, 64, 255))
	}
	// willows + grass tufts
	for i in 0 .. 8 {
		a := f32(i) / 8 * 6.28318 + 0.4
		r := f32(16 + rand.f32() * 5)
		add_tree(mut d, 'Willow${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'willow',
			core.rgba(92, 70, 46, 255), green, f32(1.0 + rand.f32() * 0.35))
	}
	for i in 0 .. 18 {
		a := rand.f32() * 6.28318
		r := f32(8 + rand.f32() * 14)
		add_mesh(mut d, 'Tuft${i}', core.vec3(f32(math.cos(a)) * r, 0.2, f32(math.sin(a)) * r),
			core.vec3(0, rand.f32() * 40, 8), core.vec3(0.3, 0.5, 0.3), 'cone', green)
	}
	add_pond(mut d, 'Pond', 13, -8, 4.0, core.rgba(110, 190, 190, 190))
	add_distant(mut d, m, 3, true)
}

fn build_dock(mut d core.Node, m MapDef) {
	wood := core.rgba(120, 88, 58, 255)
	water := core.rgba(90, 170, 196, 190)
	// the bay + pier
	add_pond(mut d, 'Bay', 0, -9, 11, water)
	for i in 0 .. 9 {
		add_mesh(mut d, 'Pier${i}', core.vec3(0, 0.42, 2 - f32(i) * 1.5), core.Vec3{},
			core.vec3(3.4, 0.24, 1.4), 'cube', wood)
	}
	for i in 0 .. 3 {
		add_mesh(mut d, 'Pile${i}', core.vec3(f32(-1.5 + i * 1.5), 0.1, -9), core.Vec3{},
			core.vec3(0.24, 1.6, 0.24), 'cylinder', wood)
	}
	// boats
	add_boat(mut d, 'Boat1', -7, -7, 30)
	add_boat(mut d, 'Boat2', 8, -8, -20)
	add_boat(mut d, 'Boat3', 3, -13, 8)
	// waterfalls pouring off the peak edge
	for cfg in [[f32(-18), f32(-16)], [f32(18), f32(-16)]] {
		add_mesh(mut d, 'Cliff', core.vec3(cfg[0], 5, cfg[1]), core.Vec3{}, core.vec3(9, 12, 8), 'cone',
			core.rgba(62, 78, 82, 255))
		wf := add_mesh(mut d, 'Fall', core.vec3(cfg[0], 2.4, cfg[1] + 4.2), core.Vec3{},
			core.vec3(2.6, 10, 1), 'plane', core.rgba(200, 240, 255, 120))
		if mut mr := wf.get_component[render3d.MeshRenderer3D]() {
			mr.blend = 'alpha'
			mr.unlit = true
			mr.uv_scroll = core.vec2(0, 0.6)
		}
	}
	// reeds
	for i in 0 .. 16 {
		a := rand.f32() * 6.28318
		r := f32(12 + rand.f32() * 8)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		add_mesh(mut d, 'Reed${i}', core.vec3(x, 0.8, z), core.vec3(0, 0, rand.f32() * 10),
			core.vec3(0.12, 1.6, 0.12), 'cylinder', core.rgba(126, 150, 96, 255))
	}
	add_distant(mut d, m, 4, true)
}

fn build_icefire(mut d core.Node, m MapDef) {
	ice := core.rgba(160, 234, 252, 255)
	lava := core.rgba(255, 110, 54, 255)
	// ice half (x < 0)
	for i in 0 .. 9 {
		x := f32(-19 + rand.f32() * 9)
		z := f32(-16 + rand.f32() * 26)
		add_crystal(mut d, 'Ice${i}', x, z, f32(0.9 + rand.f32() * 1.2), ice)
	}
	// fire half (x > 0)
	for i in 0 .. 9 {
		x := f32(10 + rand.f32() * 9)
		z := f32(-16 + rand.f32() * 26)
		n := add_mesh(mut d, 'LavaRock${i}', core.vec3(x, 0.6, z), core.vec3(rand.f32() * 20, 0, 0),
			core.vec3(1.4 + rand.f32(), 1.4 + rand.f32() * 2, 1.4 + rand.f32()), 'cone',
			core.rgba(56, 40, 40, 255))
		if mut mr := n.get_component[render3d.MeshRenderer3D]() {
			mr.emissive = core.rgba(140, 40, 20, 255)
		}
		add_brazier(mut d, 'Fire', x + 2.2, z)
	}
	// the split ridge of crystals down the middle
	for i in 0 .. 9 {
		z := f32(-16 + i * 4)
		add_crystal(mut d, 'RidgeIce${i}', -1.6, z, 1.1, ice)
		c := add_mesh(mut d, 'RidgeFire${i}', core.vec3(1.6, 0.8, z), core.Vec3{}, core.vec3(0.7, 1.6, 0.7),
			'cone', lava)
		if mut mr := c.get_component[render3d.MeshRenderer3D]() {
			mr.emissive = lava
			mr.unlit = true
		}
	}
	// extra snowfall over the ice half (the ambient embers cover the fire half)
	mut snow := core.Node.new('IceSnow')
	snow.add_component(&render3d.Transform3D{
		position: core.vec3(-9, 7, -3)
	})
	snow.add_component(&render3d.Particles3D{
		preset: 'snow'
		box:    core.vec3(14, 8, 22)
		rate:   18
	})
	d.add_child(mut snow)
	add_distant(mut d, m, 4, false)
}

fn build_stupa(mut d core.Node, m MapDef) {
	white := core.rgba(226, 220, 202, 255)
	gold := core.rgba(234, 196, 118, 255)
	// forest of stupas
	for i in 0 .. 18 {
		a := f32(i) / 18 * 6.28318 + rand.f32() * 0.1
		r := f32(12 + rand.f32() * 9)
		add_stupa(mut d, 'Stupa${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r,
			f32(0.7 + rand.f32() * 0.6), white, gold)
	}
	// the great stupa
	add_stupa(mut d, 'GreatStupa', 0, -18, 2.6, white, gold)
	// prayer flag lines
	for i in 0 .. 5 {
		x := f32(-16 + i * 8)
		add_banner(mut d, 'Prayer${i}', x, f32(13), core.rgba(210, 90, 78, 255))
		for j in 0 .. 4 {
			add_glow(mut d, 'Flag${i}_${j}', core.vec3(x + f32(j) * 1.2, 3.4 - f32(j) * 0.2, 13),
				core.vec3(0.5, 0.34, 0.04), 'plane', core.rgba(240, 210, 150, 230))
		}
	}
	for i in 0 .. 8 {
		a := f32(i) / 8 * 6.28318
		r := f32(17)
		add_tree(mut d, 'Pine${i}', f32(math.cos(a)) * r, f32(math.sin(a)) * r, 'pine',
			core.rgba(86, 66, 48, 255), core.rgba(76, 104, 74, 255), f32(0.8 + rand.f32() * 0.4))
	}
	add_brazier(mut d, 'Brazier', -6, -12)
	add_brazier(mut d, 'Brazier', 6, -12)
	add_distant(mut d, m, 3, false)
}

// ---------------------------------------------------------------------------
//  Prop library
// ---------------------------------------------------------------------------

fn add_boulders(mut d core.Node, m MapDef) {
	for i in 0 .. 34 {
		a := f32(i) / 34 * 6.28318 + rand.f32() * 0.08
		dist := f32(23.6 + rand.f32() * 1.8)
		s := f32(1.0 + rand.f32() * 2.2)
		col := if i % 4 == 0 { m.rock.lerp(core.rgba(60, 90, 70, 255), 0.35) } else { m.rock }
		add_mesh(mut d, 'Boulder${i}', core.vec3(f32(math.cos(a)) * dist, (rand.f32() - 0.3) * 1.2,
			f32(math.sin(a)) * dist), core.vec3(rand.f32() * 170, rand.f32() * 170, rand.f32() * 170),
			core.vec3(s * 1.2, s * (0.75 + rand.f32() * 0.6), s * 1.1), 'sphere', col)
	}
}

fn add_pavilion(mut d core.Node, name string, x f32, z f32, s f32, wood core.Color, roof core.Color, glow core.Color) {
	mut p := core.Node.new(name)
	p.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut p)
	add_mesh(mut p, 'Base', core.vec3(0, 0.25, 0), core.Vec3{}, core.vec3(5.4, 0.5, 5.4), 'cylinder',
		core.rgba(104, 98, 88, 255))
	for i in 0 .. 4 {
		px := f32(-1.7 + (i % 2) * 3.4)
		pz := f32(-1.7 + (i / 2) * 3.4)
		add_mesh(mut p, 'Pillar${i}', core.vec3(px, 1.9, pz), core.Vec3{}, core.vec3(0.34, 3.4, 0.34),
			'cylinder', wood)
	}
	add_mesh(mut p, 'Roof1', core.vec3(0, 4.1, 0), core.vec3(0, 45, 0), core.vec3(6.8, 1.1, 6.8), 'cone', roof)
	add_mesh(mut p, 'Roof2', core.vec3(0, 4.9, 0), core.vec3(0, 45, 0), core.vec3(4.4, 0.8, 4.4), 'cone', roof)
	mut fin := add_glow(mut p, 'Finial', core.vec3(0, 5.4, 0), core.vec3(0.4, 0.4, 0.4), 'sphere', glow)
	fin.active = true
	add_light(mut p, core.vec3(0, 3.0, 0), glow, 1.8, 8)
}

fn add_tree(mut d core.Node, name string, x f32, z f32, kind string, trunk core.Color, leaf core.Color, s f32) {
	mut t := core.Node.new(name)
	t.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, rand.f32() * 360, 0)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut t)
	match kind {
		'pine' {
			add_mesh(mut t, 'Trunk', core.vec3(0, 1.2, 0), core.Vec3{}, core.vec3(0.55, 2.4, 0.55), 'cylinder', trunk)
			for i in 0 .. 3 {
				k := f32(i)
				add_mesh(mut t, 'Cone${i}', core.vec3(0, 2.3 + k * 1.1, 0), core.Vec3{},
					core.vec3(3.0 - k * 0.66, 1.9, 3.0 - k * 0.66), 'cone', leaf)
			}
		}
		'peach' {
			add_mesh(mut t, 'Trunk', core.vec3(0, 1.5, 0), core.vec3(0, 0, 6), core.vec3(0.62, 3.0, 0.62),
				'cylinder', trunk)
			add_mesh(mut t, 'Branch', core.vec3(0.5, 2.8, 0), core.vec3(0, 0, -38), core.vec3(0.36, 1.6, 0.36),
				'cylinder', trunk)
			canopy := [core.vec3(0.4, 3.8, 0), core.vec3(-1.0, 3.3, 0.5), core.vec3(1.5, 3.2, -0.4),
				core.vec3(0.2, 4.5, -0.3)]
			for i, c in canopy {
				add_mesh(mut t, 'Bloom${i}', c, core.Vec3{}, core.vec3(1.8, 1.4, 1.8), 'sphere', leaf)
			}
		}
		'plum' {
			add_mesh(mut t, 'Trunk', core.vec3(0, 1.0, 0), core.vec3(0, 0, 12), core.vec3(0.5, 2.0, 0.5),
				'cylinder', trunk)
			for i in 0 .. 4 {
				a := f32(i) / 4 * 6.28318
				add_mesh(mut t, 'Bloom${i}', core.vec3(f32(math.cos(a)) * 0.9, 2.2 + f32(i) * 0.25,
					f32(math.sin(a)) * 0.9), core.Vec3{}, core.vec3(0.85, 0.7, 0.85), 'sphere', leaf)
			}
		}
		'bamboo' {
			for i in 0 .. 5 {
				a := f32(i) / 5 * 6.28318
				h := f32(4.5 + rand.f32() * 2.5)
				add_mesh(mut t, 'Stalk${i}', core.vec3(f32(math.cos(a)) * 0.55, h * 0.5, f32(math.sin(a)) * 0.55),
					core.vec3(2, 0, 0), core.vec3(0.18, h, 0.18), 'cylinder', trunk)
			}
		}
		'dead' {
			add_mesh(mut t, 'Trunk', core.vec3(0, 1.8, 0), core.vec3(0, 0, 8), core.vec3(0.5, 3.6, 0.5),
				'cylinder', trunk)
			for i in 0 .. 3 {
				a := f32(i) / 3 * 6.28318
				add_mesh(mut t, 'Branch${i}', core.vec3(f32(math.cos(a)) * 0.9, 2.8 + f32(i) * 0.3,
					f32(math.sin(a)) * 0.9), core.vec3(0, 0, f32(math.sin(a)) * 50 + 30),
					core.vec3(0.2, 2.0, 0.2), 'cylinder', trunk)
			}
		}
		'willow' {
			add_mesh(mut t, 'Trunk', core.vec3(0, 1.6, 0), core.vec3(0, 0, 5), core.vec3(0.7, 3.2, 0.7),
				'cylinder', trunk)
			add_mesh(mut t, 'Canopy', core.vec3(0, 4.0, 0), core.Vec3{}, core.vec3(4.4, 1.6, 4.4), 'sphere', leaf)
			for i in 0 .. 7 {
				a := f32(i) / 7 * 6.28318
				add_mesh(mut t, 'Drop${i}', core.vec3(f32(math.cos(a)) * 1.9, 2.6, f32(math.sin(a)) * 1.9),
					core.vec3(0, 0, 0), core.vec3(0.35, 2.6, 0.35), 'cone', leaf)
			}
		}
		'ginkgo' {
			add_mesh(mut t, 'Trunk', core.vec3(0, 1.8, 0), core.Vec3{}, core.vec3(0.6, 3.6, 0.6), 'cylinder', trunk)
			for i in 0 .. 3 {
				a := f32(i) / 3 * 6.28318
				add_mesh(mut t, 'Bloom${i}', core.vec3(f32(math.cos(a)) * 1.1, 3.8 + f32(i) * 0.4,
					f32(math.sin(a)) * 1.1), core.Vec3{}, core.vec3(2.2, 1.8, 2.2), 'sphere', leaf)
			}
		}
		else {}
	}
}

fn add_pagoda(mut d core.Node, name string, x f32, z f32, s f32, base core.Color, wall core.Color, pillar core.Color, roof core.Color, gold core.Color) {
	mut p := core.Node.new(name)
	p.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut p)
	add_mesh(mut p, 'Base', core.vec3(0, 0.4, 0), core.Vec3{}, core.vec3(5.2, 0.8, 5.2), 'cube', base)
	add_mesh(mut p, 'Wall', core.vec3(0, 2.4, 0), core.Vec3{}, core.vec3(3.8, 3.2, 3.8), 'cube', wall)
	px := [f32(-1.9), f32(1.9), f32(-1.9), f32(1.9)]
	pz := [f32(-1.9), f32(-1.9), f32(1.9), f32(1.9)]
	for i in 0 .. 4 {
		add_mesh(mut p, 'Pillar${i}', core.vec3(px[i], 2.4, pz[i]), core.Vec3{}, core.vec3(0.4, 3.3, 0.4),
			'cylinder', pillar)
	}
	door := add_mesh(mut p, 'Door', core.vec3(0, 1.9, 1.92), core.Vec3{}, core.vec3(1.3, 2.1, 1), 'plane',
		core.rgba(255, 190, 90, 255))
	if mut mr := door.get_component[render3d.MeshRenderer3D]() {
		mr.emissive = core.rgba(255, 150, 40, 255)
		mr.unlit = true
	}
	add_mesh(mut p, 'Roof1', core.vec3(0, 4.7, 0), core.vec3(0, 45, 0), core.vec3(8.6, 1.8, 8.6), 'cone', roof)
	add_mesh(mut p, 'Roof2', core.vec3(0, 6.1, 0), core.vec3(0, 45, 0), core.vec3(5.6, 1.6, 5.6), 'cone', roof)
	fin := add_mesh(mut p, 'Finial', core.vec3(0, 7.1, 0), core.Vec3{}, core.vec3(0.7, 0.7, 0.7), 'sphere', gold)
	if mut mr := fin.get_component[render3d.MeshRenderer3D]() {
		mr.emissive = core.rgba(160, 120, 50, 255)
	}
}

fn add_gate(mut d core.Node, name string, x f32, z f32, rot f32, col core.Color, roof core.Color, s f32) {
	mut gate := core.Node.new(name)
	gate.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, rot, 0)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut gate)
	add_mesh(mut gate, 'PillarL', core.vec3(-2.6, 2.6, 0), core.Vec3{}, core.vec3(0.7, 5.2, 0.7), 'cylinder', col)
	add_mesh(mut gate, 'PillarR', core.vec3(2.6, 2.6, 0), core.Vec3{}, core.vec3(0.7, 5.2, 0.7), 'cylinder', col)
	add_mesh(mut gate, 'Beam', core.vec3(0, 5.1, 0), core.Vec3{}, core.vec3(6.6, 0.55, 0.9), 'cube', col)
	add_mesh(mut gate, 'Roof', core.vec3(0, 5.9, 0), core.vec3(0, 45, 0), core.vec3(8.4, 1.2, 4.2), 'cone', roof)
	plaque := add_mesh(mut gate, 'Plaque', core.vec3(0, 4.2, 0.25), core.Vec3{}, core.vec3(2.3, 0.9, 0.18), 'cube',
		core.rgba(212, 175, 106, 255))
	if mut mr := plaque.get_component[render3d.MeshRenderer3D]() {
		mr.emissive = core.rgba(120, 90, 40, 255)
	}
}

fn add_stupa(mut d core.Node, name string, x f32, z f32, s f32, col core.Color, gold core.Color) {
	mut t := core.Node.new(name)
	t.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut t)
	add_mesh(mut t, 'Base', core.vec3(0, 0.25, 0), core.Vec3{}, core.vec3(2.2, 0.5, 2.2), 'cylinder', col)
	add_mesh(mut t, 'Body', core.vec3(0, 1.1, 0), core.Vec3{}, core.vec3(1.5, 1.7, 1.5), 'cylinder', col)
	add_mesh(mut t, 'Dome', core.vec3(0, 2.1, 0), core.Vec3{}, core.vec3(1.5, 0.9, 1.5), 'sphere', col)
	add_mesh(mut t, 'Spire', core.vec3(0, 3.0, 0), core.Vec3{}, core.vec3(0.5, 1.4, 0.5), 'cone', gold)
	mut gl := add_glow(mut t, 'Tip', core.vec3(0, 3.75, 0), core.vec3(0.28, 0.28, 0.28), 'sphere', gold)
	gl.active = true
}

fn add_tent(mut d core.Node, name string, x f32, z f32, s f32, cloth core.Color, accent core.Color) {
	mut t := core.Node.new(name)
	t.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, rand.f32() * 360, 0)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut t)
	add_mesh(mut t, 'Canvas', core.vec3(0, 1.35, 0), core.Vec3{}, core.vec3(3.4, 2.7, 3.4), 'cone', cloth)
	add_mesh(mut t, 'Door', core.vec3(0, 0.85, 1.35), core.Vec3{}, core.vec3(1.0, 1.6, 0.12), 'cube', accent)
	add_mesh(mut t, 'Pole', core.vec3(0, 3.0, 0), core.Vec3{}, core.vec3(0.12, 1.0, 0.12), 'cylinder',
		core.rgba(90, 70, 50, 255))
}

fn add_stall(mut d core.Node, name string, x f32, z f32, rot f32, cloth core.Color, wood core.Color) {
	mut s := core.Node.new(name)
	s.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, rot, 0)
	})
	d.add_child(mut s)
	add_mesh(mut s, 'Counter', core.vec3(0, 0.55, 0), core.Vec3{}, core.vec3(3.0, 0.5, 1.3), 'cube', wood)
	for i in 0 .. 4 {
		add_mesh(mut s, 'Post${i}', core.vec3(f32(-1.4 + (i % 2) * 2.8), 1.1, f32(-0.6 + (i / 2) * 1.2)),
			core.Vec3{}, core.vec3(0.14, 2.2, 0.14), 'cylinder', wood)
	}
	add_mesh(mut s, 'Awning', core.vec3(0, 2.3, 0), core.vec3(0, 0, 4), core.vec3(3.4, 0.16, 2.0), 'cube', cloth)
	// goods
	for i in 0 .. 4 {
		add_mesh(mut s, 'Good${i}', core.vec3(f32(-1.0 + i * 0.7), 0.9, 0), core.Vec3{},
			core.vec3(0.4, 0.4, 0.4), 'sphere', if i % 2 == 0 { cloth } else { core.rgba(236, 210, 140, 255) })
	}
}

fn add_lantern(mut d core.Node, name string, x f32, z f32, col core.Color) {
	mut l := core.Node.new(name)
	l.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut l)
	add_mesh(mut l, 'Post', core.vec3(0, 0.9, 0), core.Vec3{}, core.vec3(0.18, 1.8, 0.18), 'cylinder',
		core.rgba(76, 60, 48, 255))
	add_mesh(mut l, 'Cap', core.vec3(0, 2.05, 0), core.vec3(0, 45, 0), core.vec3(0.8, 0.3, 0.8), 'cone',
		core.rgba(60, 48, 40, 255))
	add_glow(mut l, 'Core', core.vec3(0, 1.78, 0), core.vec3(0.44, 0.44, 0.44), 'sphere', col)
	add_light(mut l, core.vec3(0, 2.0, 0), col, 1.6, 6)
}

fn add_brazier(mut d core.Node, name string, x f32, z f32) {
	mut b := core.Node.new(name)
	b.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut b)
	add_mesh(mut b, 'Bowl', core.vec3(0, 0.6, 0), core.Vec3{}, core.vec3(1.0, 0.5, 1.0), 'cylinder',
		core.rgba(66, 58, 52, 255))
	add_mesh(mut b, 'Leg', core.vec3(0, 0.3, 0), core.Vec3{}, core.vec3(0.3, 0.6, 0.3), 'cylinder',
		core.rgba(56, 48, 44, 255))
	add_glow(mut b, 'Coal', core.vec3(0, 0.95, 0), core.vec3(0.7, 0.4, 0.7), 'sphere', core.rgba(255, 140, 50, 255))
	mut f := core.Node.new('Flame')
	f.add_component(&render3d.Transform3D{
		position: core.vec3(0, 1.0, 0)
	})
	f.add_component(&render3d.Particles3D{
		preset: 'fire'
		rate:   16
	})
	b.add_child(mut f)
	add_light(mut b, core.vec3(0, 1.6, 0), core.rgba(255, 150, 70, 255), 2.2, 8)
}

fn add_campfire(mut d core.Node, x f32, z f32) {
	mut c := core.Node.new('Campfire')
	c.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut c)
	for i in 0 .. 4 {
		a := f32(i) / 4 * 6.28318
		add_mesh(mut c, 'Log${i}', core.vec3(f32(math.cos(a)) * 0.5, 0.2, f32(math.sin(a)) * 0.5),
			core.vec3(0, a * 57.3, 76), core.vec3(0.22, 1.5, 0.22), 'cylinder', core.rgba(86, 62, 44, 255))
	}
	add_glow(mut c, 'Coals', core.vec3(0, 0.16, 0), core.vec3(1.2, 0.3, 1.2), 'cylinder', core.rgba(255, 120, 40, 255))
	mut f := core.Node.new('Flame')
	f.add_component(&render3d.Transform3D{
		position: core.vec3(0, 0.6, 0)
	})
	f.add_component(&render3d.Particles3D{
		preset: 'fire'
		rate:   20
	})
	c.add_child(mut f)
	add_light(mut c, core.vec3(0, 1.4, 0), core.rgba(255, 150, 70, 255), 2.6, 9)
}

fn add_banner(mut d core.Node, name string, x f32, z f32, col core.Color) {
	mut b := core.Node.new(name)
	b.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut b)
	add_mesh(mut b, 'Pole', core.vec3(0, 2.4, 0), core.Vec3{}, core.vec3(0.16, 4.8, 0.16), 'cylinder',
		core.rgba(92, 72, 52, 255))
	cl := add_mesh(mut b, 'Cloth', core.vec3(0.55, 3.1, 0), core.Vec3{}, core.vec3(1.1, 2.6, 0.06), 'plane', col)
	if mut mr := cl.get_component[render3d.MeshRenderer3D]() {
		mr.double_sided = true
	}
}

fn add_pond(mut d core.Node, name string, x f32, z f32, r f32, water core.Color) {
	mut p := core.Node.new(name)
	p.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0.05, z)
	})
	d.add_child(mut p)
	w := add_mesh(mut p, 'Water', core.Vec3{}, core.vec3(90, 0, 0), core.vec3(r * 2, r * 2, 1), 'disc', water)
	if mut mr := w.get_component[render3d.MeshRenderer3D]() {
		mr.blend = 'alpha'
		mr.unlit = true
		mr.uv_scroll = core.vec2(0.02, 0.05)
	}
	for i in 0 .. 14 {
		a := f32(i) / 14 * 6.28318
		add_mesh(mut p, 'Edge${i}', core.vec3(f32(math.cos(a)) * r, 0.16, f32(math.sin(a)) * r),
			core.vec3(rand.f32() * 40, rand.f32() * 180, 0), core.vec3(0.9, 0.5, 0.7), 'sphere',
			core.rgba(86, 90, 88, 255))
	}
}

fn add_bridge(mut d core.Node, name string, x f32, z f32, len f32, wood core.Color) {
	mut b := core.Node.new(name)
	b.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut b)
	for i in 0 .. 9 {
		add_mesh(mut b, 'Plank${i}', core.vec3(0, 0.32 + f32(math.sin(f32(i) / 8 * 3.14)) * 0.35,
			-len / 2 + f32(i) / 8 * len), core.vec3(0, 0, 0), core.vec3(1.8, 0.14, 0.6), 'cube', wood)
	}
	for i in 0 .. 2 {
		add_mesh(mut b, 'Rail${i}', core.vec3(f32(-0.85 + i * 1.7), 0.75, 0), core.Vec3{},
			core.vec3(0.1, 0.1, len), 'cube', wood)
	}
}

fn add_crystal(mut d core.Node, name string, x f32, z f32, s f32, col core.Color) {
	mut c := core.Node.new(name)
	c.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, rand.f32() * 360, 0)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut c)
	for i in 0 .. 3 {
		a := f32(i) / 3 * 6.28318
		n := add_mesh(mut c, 'Shard${i}', core.vec3(f32(math.cos(a)) * 0.28, 0.9 + f32(i) * 0.35,
			f32(math.sin(a)) * 0.28), core.vec3(f32(rand.f32() - 0.5) * 22, 0, f32(rand.f32() - 0.5) * 22),
			core.vec3(0.42, 1.9 + f32(i) * 0.4, 0.42), 'cone', col)
		if mut mr := n.get_component[render3d.MeshRenderer3D]() {
			mr.emissive = core.rgba(u8(f32(col.r) * 0.55), u8(f32(col.g) * 0.55), u8(f32(col.b) * 0.55), 255)
			mr.rim = 0.5
		}
	}
}

fn add_portal(mut d core.Node, x f32, z f32, r f32, col core.Color) {
	mut p := core.Node.new('Portal')
	p.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut p)
	mut ring := add_mesh(mut p, 'Ring', core.vec3(0, 0.06, 0), core.vec3(90, 0, 0),
		core.vec3(r * 2, r * 2, r * 2), 'torus', col)
	if mut mr := ring.get_component[render3d.MeshRenderer3D]() {
		mr.emissive = col
		mr.blend = 'alpha'
		mr.unlit = true
	}
	ring.add_component(&Spin3D{
		speed: core.Vec3{0, 50, 0}
	})
	mut inner := add_mesh(mut p, 'Inner', core.vec3(0, 0.08, 0), core.vec3(90, 0, 0),
		core.vec3(r * 1.1, r * 1.1, r * 1.1), 'torus', col)
	if mut mr := inner.get_component[render3d.MeshRenderer3D]() {
		mr.blend = 'alpha'
		mr.unlit = true
	}
	inner.add_component(&Spin3D{
		speed: core.Vec3{0, -80, 0}
	})
	mut swirl := add_mesh(mut p, 'Swirl', core.vec3(0, 0.1, 0), core.vec3(90, 0, 0),
		core.vec3(r * 1.7, r * 1.7, 1), 'disc', core.rgba(col.r, col.g, col.b, 140))
	if mut mr := swirl.get_component[render3d.MeshRenderer3D]() {
		mr.blend = 'additive'
		mr.unlit = true
		mr.pattern = 'stripes'
		mr.uv_scale = core.vec2(2, 2)
		mr.uv_scroll = core.vec2(0.5, 0)
	}
	swirl.add_component(&Spin3D{
		speed: core.Vec3{0, 120, 0}
	})
	mut spark := core.Node.new('Sparks')
	spark.add_component(&render3d.Transform3D{
		position: core.vec3(0, r * 0.6, 0)
	})
	spark.add_component(&render3d.Particles3D{
		preset: 'portal'
	})
	p.add_child(mut spark)
	add_light(mut p, core.vec3(0, 1.6, 0), col, 2.0, 9)
}

fn add_house(mut d core.Node, name string, x f32, z f32, rot f32, s f32, wall core.Color, roof core.Color, glow core.Color) {
	mut h := core.Node.new(name)
	h.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, rot, 0)
		scale:    core.vec3(s, s, s)
	})
	d.add_child(mut h)
	add_mesh(mut h, 'Base', core.vec3(0, 0.3, 0), core.Vec3{}, core.vec3(7.4, 0.6, 6.0), 'cube',
		core.rgba(96, 90, 80, 255))
	add_mesh(mut h, 'Wall', core.vec3(0, 1.8, 0), core.Vec3{}, core.vec3(6.6, 2.8, 5.2), 'cube', wall)
	add_mesh(mut h, 'Roof', core.vec3(0, 3.6, 0), core.vec3(0, 45, 0), core.vec3(9.4, 1.7, 9.4), 'cone', roof)
	add_mesh(mut h, 'Roof2', core.vec3(0, 4.6, 0), core.vec3(0, 45, 0), core.vec3(6.4, 1.3, 6.4), 'cone', roof)
	dr := add_mesh(mut h, 'Door', core.vec3(0, 1.2, 2.62), core.Vec3{}, core.vec3(1.4, 2.2, 0.12), 'cube', glow)
	if mut mr := dr.get_component[render3d.MeshRenderer3D]() {
		mr.emissive = glow
		mr.unlit = true
	}
	for i in 0 .. 2 {
		add_glow(mut h, 'Window${i}', core.vec3(f32(-2.1 + i * 4.2), 2.0, 2.6), core.vec3(0.8, 0.9, 0.1),
			'plane', glow)
	}
}

fn add_well(mut d core.Node, name string, x f32, z f32) {
	mut w := core.Node.new(name)
	w.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut w)
	add_mesh(mut w, 'Ring', core.vec3(0, 0.55, 0), core.Vec3{}, core.vec3(2.0, 1.1, 2.0), 'cylinder',
		core.rgba(104, 100, 92, 255))
	add_glow(mut w, 'Water', core.vec3(0, 0.96, 0), core.vec3(1.5, 0.2, 1.5), 'disc', core.rgba(90, 170, 200, 200))
	add_mesh(mut w, 'PostL', core.vec3(-0.95, 1.9, 0), core.Vec3{}, core.vec3(0.14, 2.8, 0.14), 'cylinder',
		core.rgba(92, 72, 50, 255))
	add_mesh(mut w, 'PostR', core.vec3(0.95, 1.9, 0), core.Vec3{}, core.vec3(0.14, 2.8, 0.14), 'cylinder',
		core.rgba(92, 72, 50, 255))
	add_mesh(mut w, 'Roof', core.vec3(0, 3.3, 0), core.vec3(0, 45, 0), core.vec3(2.8, 0.8, 2.8), 'cone',
		core.rgba(66, 58, 52, 255))
}

fn add_dummy(mut d core.Node, name string, x f32, z f32, wood core.Color) {
	mut m := core.Node.new(name)
	m.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut m)
	add_mesh(mut m, 'Post', core.vec3(0, 1.1, 0), core.Vec3{}, core.vec3(0.24, 2.2, 0.24), 'cylinder', wood)
	add_mesh(mut m, 'Arms', core.vec3(0, 1.55, 0), core.Vec3{}, core.vec3(2.2, 0.2, 0.2), 'cube', wood)
	add_mesh(mut m, 'Head', core.vec3(0, 2.25, 0), core.Vec3{}, core.vec3(0.5, 0.5, 0.5), 'sphere',
		core.rgba(180, 156, 110, 255))
}

fn add_weapon_rack(mut d core.Node, name string, x f32, z f32, wood core.Color, steel core.Color) {
	mut r := core.Node.new(name)
	r.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	d.add_child(mut r)
	add_mesh(mut r, 'Bar', core.vec3(0, 1.2, 0), core.Vec3{}, core.vec3(4.2, 0.16, 0.16), 'cube', wood)
	for i in 0 .. 4 {
		add_mesh(mut r, 'Leg${i}', core.vec3(f32(-1.8 + i * 1.2), 0.6, 0), core.Vec3{},
			core.vec3(0.12, 1.2, 0.12), 'cylinder', wood)
		add_mesh(mut r, 'Blade${i}', core.vec3(f32(-1.8 + i * 1.2), 1.95, 0), core.vec3(0, 0, 8),
			core.vec3(0.1, 1.5, 0.1), 'cube', steel)
	}
}

fn add_statue(mut d core.Node, name string, x f32, z f32, col core.Color, glow core.Color) {
	mut s := core.Node.new(name)
	s.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, 25, 0)
	})
	d.add_child(mut s)
	add_mesh(mut s, 'Base', core.vec3(0, 0.4, 0), core.Vec3{}, core.vec3(2.2, 0.8, 2.2), 'cube', col)
	add_mesh(mut s, 'Body', core.vec3(0, 1.8, 0), core.Vec3{}, core.vec3(0.9, 2.2, 0.7), 'cylinder', col)
	add_mesh(mut s, 'Head', core.vec3(0, 3.1, 0), core.Vec3{}, core.vec3(0.55, 0.55, 0.55), 'sphere', col)
	add_mesh(mut s, 'ArmL', core.vec3(-0.7, 2.2, 0.1), core.vec3(0, 0, 38), core.vec3(0.3, 1.2, 0.3),
		'cylinder', col)
	mut all := add_glow(mut s, 'Halo', core.vec3(0, 3.55, 0), core.vec3(1.1, 1.1, 0.1), 'ring', glow)
	all.active = true
}

fn add_horse(mut d core.Node, name string, x f32, z f32, col core.Color) {
	mut h := core.Node.new(name)
	h.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
		rotation: core.vec3(0, -30, 0)
	})
	d.add_child(mut h)
	add_mesh(mut h, 'Plinth', core.vec3(0, 0.35, 0), core.Vec3{}, core.vec3(3.6, 0.7, 2.2), 'cube',
		core.rgba(104, 100, 92, 255))
	add_mesh(mut h, 'Body', core.vec3(0, 1.6, 0), core.Vec3{}, core.vec3(1.0, 0.95, 2.0), 'capsule', col)
	add_mesh(mut h, 'Neck', core.vec3(0, 2.25, 0.75), core.vec3(-32, 0, 0), core.vec3(0.55, 1.2, 0.55),
		'cylinder', col)
	add_mesh(mut h, 'Head', core.vec3(0, 2.85, 1.15), core.vec3(-12, 0, 0), core.vec3(0.5, 0.55, 0.95),
		'sphere', col)
	add_mesh(mut h, 'Mane', core.vec3(0, 2.5, 0.62), core.Vec3{}, core.vec3(0.28, 0.9, 0.6), 'cube', col)
	add_mesh(mut h, 'Tail', core.vec3(0, 2.0, -1.05), core.vec3(28, 0, 0), core.vec3(0.28, 1.3, 0.28),
		'cone', col)
	for i in 0 .. 4 {
		add_mesh(mut h, 'Leg${i}', core.vec3(f32(-0.33 + (i % 2) * 0.66), 0.95,
			f32(-0.72 + (i / 2) * 1.44)), core.Vec3{}, core.vec3(0.22, 1.3, 0.22), 'cylinder', col)
	}
}

fn add_boat(mut d core.Node, name string, x f32, z f32, rot f32) {
	mut b := core.Node.new(name)
	b.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0.18, z)
		rotation: core.vec3(0, rot, 0)
	})
	d.add_child(mut b)
	add_mesh(mut b, 'Hull', core.Vec3{}, core.Vec3{}, core.vec3(1.3, 0.5, 3.0), 'sphere',
		core.rgba(112, 78, 50, 255))
	add_mesh(mut b, 'Deck', core.vec3(0, 0.22, 0), core.Vec3{}, core.vec3(1.6, 0.12, 2.2), 'cube',
		core.rgba(140, 104, 66, 255))
	add_mesh(mut b, 'Mast', core.vec3(0, 1.5, 0), core.Vec3{}, core.vec3(0.12, 2.6, 0.12), 'cylinder',
		core.rgba(96, 70, 46, 255))
	sail := add_mesh(mut b, 'Sail', core.vec3(0, 1.7, -0.1), core.Vec3{}, core.vec3(1.9, 1.8, 0.06), 'plane',
		core.rgba(232, 224, 198, 235))
	if mut mr := sail.get_component[render3d.MeshRenderer3D]() {
		mr.double_sided = true
	}
}

fn add_distant(mut d core.Node, m MapDef, count int, waterfall bool) {
	angles := [f32(-2.4), f32(-0.7), f32(0.9), f32(2.5)]
	dist := [f32(36), f32(42), f32(38), f32(44)]
	for i in 0 .. count {
		a := angles[i % angles.len]
		x := f32(math.cos(a)) * dist[i % dist.len]
		z := f32(math.sin(a)) * dist[i % dist.len]
		size := f32(7 + f32(i) * 1.6)
		mut gp := core.Node.new('DistantPeak')
		gp.add_component(&render3d.Transform3D{
			position: core.vec3(x, 4 + f32(i), z)
		})
		d.add_child(mut gp)
		add_mesh(mut gp, 'Cone', core.Vec3{}, core.vec3(180, 0, 0), core.vec3(size * 2, size * 2.4, size * 2),
			'cone', m.rock)
		add_mesh(mut gp, 'Cap', core.vec3(0, 0.6, 0), core.Vec3{}, core.vec3(size * 1.9, 1.4, size * 1.9),
			'cylinder', m.accent.lerp(m.rock, 0.45))
		if waterfall && i % 2 == 0 {
			wf := add_mesh(mut gp, 'Fall', core.vec3(0, -size * 1.2, size * 0.7), core.Vec3{},
				core.vec3(size * 0.4, size * 3.2, 1), 'plane', core.rgba(200, 240, 255, 110))
			if mut mr := wf.get_component[render3d.MeshRenderer3D]() {
				mr.blend = 'alpha'
				mr.unlit = true
				mr.uv_scroll = core.vec2(0, 0.4)
			}
		}
	}
	add_mesh(mut d, 'Cloud', core.vec3(-26, 16, -20), core.Vec3{}, core.vec3(12, 2.2, 8), 'sphere',
		core.rgba(220, 230, 236, 90))
	add_mesh(mut d, 'Cloud2', core.vec3(24, 19, -26), core.Vec3{}, core.vec3(15, 2.6, 9), 'sphere',
		core.rgba(220, 230, 236, 80))
}

// ---------------------------------------------------------------------------
//  Map travel
// ---------------------------------------------------------------------------
fn load_map(i int) {
	mut s := gs()
	if i < 0 || i >= maps.len {
		return
	}
	if i > 0 && !s.cleared[i - 1] {
		show_banner('Cần hạ Boss của ${maps[i - 1].name} để mở khóa!')
		return
	}
	sc := live_scene() or { return }
	s.map_index = i
	s.map_kills = 0
	s.map_goal = maps[i].goal
	s.boss_up = false
	s.boss_ref = unsafe { nil }
	mut world := sc.find('World') or { return }
	if mut en := world.find('Enemies') {
		for ch in en.children {
			mut c := ch
			c.destroy()
		}
	}
	reset_party_pos()
	build_arena(mut world)
	if mut en := world.find('Enemies') {
		spawn_map_wave(mut en)
	}
	s.show_map = false
	show_banner('${maps[i].name} - ${maps[i].sub}')
}
