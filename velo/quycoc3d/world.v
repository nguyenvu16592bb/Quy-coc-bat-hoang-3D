module main

import math
import rand
import velo.core
import velo.render3d

// WorldBuilder — constructs the Quỷ Cốc Sơn floating-peak arena from primitives,
// mirroring buildWorldEnvironment() in the design HTML: rim boulders, the ancient
// spirit tree, two pagodas, two summoning portals, stone lanterns, spirit flowers,
// floating peaks with waterfalls and rising fireflies. (The platform itself and the
// lighting live in assets/scenes/main.scene.)

pub struct WorldBuilder {
	core.Component
}

pub fn (mut w WorldBuilder) start() {
	gs().scene = w.scene()
	mut world := w.scene().find('World') or { return }
	build_decor(mut world)
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

fn build_decor(mut world core.Node) {
	rock := core.rgba(59, 74, 77, 255)
	moss := core.rgba(46, 78, 68, 255)

	// ---- perimeter craggy boulders (42, like the design) ----
	for i in 0 .. 42 {
		a := f32(i) / 42 * 6.28318 + rand.f32() * 0.08
		dist := f32(24.4 + rand.f32() * 1.6)
		x := f32(math.cos(a)) * dist
		z := f32(math.sin(a)) * dist
		s := f32(1.1 + rand.f32() * 2.2)
		col := if i % 3 == 0 { moss } else { rock }
		add_mesh(mut world, 'Boulder${i}', core.vec3(x, (rand.f32() - 0.3) * 1.2, z),
			core.vec3(rand.f32() * 170, rand.f32() * 170, rand.f32() * 170),
			core.vec3(s * 1.2, s * (0.75 + rand.f32() * 0.6), s * 1.1), 'sphere', col)
	}

	// ---- the massive ancient gnarled spirit tree (left side, like the design) ----
	build_spirit_tree(mut world, -14, 0, -9)

	// ---- pagodas: one on the upper-right cliff, one on its own floating islet ----
	build_pagoda(mut world, 12, 0, -13, 1.15)
	build_islet_pagoda(mut world, -24, -24)

	// ---- glowing purple summoning portals (trận pháp) ----
	build_portal(mut world, 11, -5, 2.8)
	build_portal(mut world, 16, 11, 2.2)

	// ---- stone lanterns ----
	lx := [f32(-7.0), f32(8.0), f32(-10.0), f32(6.0), f32(-3.0), f32(14.0)]
	lz := [f32(10.0), f32(9.0), f32(-2.0), f32(-11.0), f32(-14.0), f32(3.0)]
	for i in 0 .. 6 {
		build_lantern(mut world, lx[i], lz[i])
	}

	// ---- glowing spirit herbs ----
	for h in 0 .. 22 {
		a := rand.f32() * 6.28318
		r := f32(6 + rand.f32() * 17)
		x := f32(math.cos(a)) * r
		z := f32(math.sin(a)) * r
		col := if h % 2 == 0 { core.rgba(177, 151, 252, 255) } else { core.rgba(255, 212, 59, 255) }
		gn := add_mesh(mut world, 'Herb${h}', core.vec3(x, 0.16, z), core.vec3(0, 0, 0),
			core.vec3(0.3, 0.3, 0.3), 'sphere', col)
		if mut m := gn.get_component[render3d.MeshRenderer3D]() {
			m.emissive = col
			m.unlit = true
			m.blend = 'additive'
		}
		add_mesh(mut world, 'HerbPetal${h}', core.vec3(x, 0.22, z), core.vec3(0, rand.f32() * 360, -30),
			core.vec3(0.26, 0.45, 0.26), 'cone', col)
	}

	// ---- distant floating mountains + animated waterfalls ----
	build_peak(mut world, -36, 12, -32, 9, true)
	build_peak(mut world, 4, 18, -44, 11, true)
	build_peak(mut world, 35, 10, -28, 8.5, false)
	build_peak(mut world, -38, -2, 16, 7.5, false)

	// ---- ambient rising fireflies ----
	mut flies := core.Node.new('Fireflies')
	flies.add_component(&render3d.Transform3D{
		position: core.vec3(0, 5, 0)
	})
	flies.add_component(&render3d.Particles3D{
		preset: 'fireflies'
		box:    core.vec3(44, 10, 44)
	})
	world.add_child(mut flies)
}

fn build_spirit_tree(mut world core.Node, x f32, y f32, z f32) {
	bark := core.rgba(60, 46, 36, 255)
	leaf := core.rgba(38, 89, 73, 255)
	mut tree := core.Node.new('SpiritTree')
	tree.add_component(&render3d.Transform3D{
		position: core.vec3(x, y, z)
	})
	world.add_child(mut tree)

	add_mesh(mut tree, 'Trunk1', core.vec3(0, 4.2, 0), core.vec3(0, 0, -10),
		core.vec3(3.4, 9, 3.4), 'cylinder', bark)
	add_mesh(mut tree, 'Trunk2', core.vec3(3, 12, 1), core.vec3(0, 0, -20),
		core.vec3(2.4, 8, 2.4), 'cylinder', bark)
	// gnarled spreading roots
	for r in 0 .. 6 {
		ra := f32(r) / 6 * 6.28318
		rx := f32(math.cos(ra)) * 2.2
		rz := f32(math.sin(ra)) * 2.2
		add_mesh(mut tree, 'Root${r}', core.vec3(rx, 0.7, rz),
			core.vec3(f32(-math.sin(ra)) * 66, 0, f32(math.cos(ra)) * 66),
			core.vec3(0.8, 4.5, 0.8), 'cylinder', bark)
	}
	// lush spirit canopy clusters
	canopy := [core.vec3(2.5, 14, 0.5), core.vec3(-1.5, 12.5, 2.2), core.vec3(5.5, 13, -1.5),
		core.vec3(1.2, 16, -1.2)]
	crs := [f32(4.2), f32(3.4), f32(3.6), f32(3.2)]
	for i, c in canopy {
		cr := crs[i]
		f := add_mesh(mut tree, 'Canopy${i}', c, core.vec3(0, 0, 0),
			core.vec3(cr * 2.6, cr * 1.4, cr * 2.6), 'sphere', leaf)
		if mut m := f.get_component[render3d.MeshRenderer3D]() {
			m.emissive = core.rgba(10, 38, 31, 255)
			m.pattern = 'noise'
		}
	}
}

fn build_pagoda(mut world core.Node, x f32, y f32, z f32, s f32) {
	base := core.rgba(69, 82, 84, 255)
	wall := core.rgba(44, 34, 32, 255)
	pillar := core.rgba(124, 45, 38, 255)
	roof := core.rgba(30, 45, 51, 255)
	gold := core.rgba(212, 175, 106, 255)

	mut p := core.Node.new('Pagoda')
	p.add_component(&render3d.Transform3D{
		position: core.vec3(x, y, z)
		scale:    core.vec3(s, s, s)
	})
	world.add_child(mut p)

	add_mesh(mut p, 'Base', core.vec3(0, 0.4, 0), core.vec3(0, 0, 0), core.vec3(5.2, 0.8, 5.2), 'cube', base)
	add_mesh(mut p, 'Wall', core.vec3(0, 2.4, 0), core.vec3(0, 0, 0), core.vec3(3.8, 3.2, 3.8), 'cube', wall)
	px := [f32(-1.9), f32(1.9), f32(-1.9), f32(1.9)]
	pz := [f32(-1.9), f32(-1.9), f32(1.9), f32(1.9)]
	for i in 0 .. 4 {
		add_mesh(mut p, 'Pillar${i}', core.vec3(px[i], 2.4, pz[i]), core.vec3(0, 0, 0),
			core.vec3(0.4, 3.3, 0.4), 'cylinder', pillar)
	}
	door := add_mesh(mut p, 'Door', core.vec3(0, 1.9, 1.92), core.vec3(0, 0, 0),
		core.vec3(1.3, 2.1, 1), 'plane', core.rgba(255, 183, 77, 255))
	if mut m := door.get_component[render3d.MeshRenderer3D]() {
		m.emissive = core.rgba(255, 150, 40, 255)
		m.unlit = true
	}
	add_mesh(mut p, 'Roof1', core.vec3(0, 4.7, 0), core.vec3(0, 45, 0), core.vec3(8.6, 1.8, 8.6), 'cone', roof)
	add_mesh(mut p, 'Roof2', core.vec3(0, 6.1, 0), core.vec3(0, 45, 0), core.vec3(5.6, 1.6, 5.6), 'cone', roof)
	fin := add_mesh(mut p, 'Finial', core.vec3(0, 7.1, 0), core.vec3(0, 0, 0),
		core.vec3(0.7, 0.7, 0.7), 'sphere', gold)
	if mut m := fin.get_component[render3d.MeshRenderer3D]() {
		m.emissive = core.rgba(160, 120, 50, 255)
	}
}

// build_islet_pagoda: the distant cliff shrine floats on its own small peak.
fn build_islet_pagoda(mut world core.Node, x f32, z f32) {
	rock := core.rgba(38, 53, 56, 255)
	isle := core.rgba(45, 84, 76, 255)
	add_mesh(mut world, 'IsletTop', core.vec3(x, -1, z), core.vec3(0, 0, 0),
		core.vec3(16, 2, 16), 'cylinder', isle)
	add_mesh(mut world, 'IsletRock', core.vec3(x, -8, z), core.vec3(180, 0, 0),
		core.vec3(14, 12, 14), 'cone', rock)
	build_pagoda(mut world, x, 0, z, 0.9)
}

fn build_portal(mut world core.Node, x f32, z f32, r f32) {
	purple := core.rgba(177, 151, 252, 255)
	lavender := core.rgba(229, 153, 247, 255)

	mut p := core.Node.new('Portal')
	p.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	world.add_child(mut p)

mut ring := add_mesh(mut p, 'Ring', core.vec3(0, 0.06, 0), core.vec3(90, 0, 0),
		core.vec3(r * 2, r * 2, r * 2), 'torus', purple)
	if mut m := ring.get_component[render3d.MeshRenderer3D]() {
		m.emissive = core.rgba(90, 55, 190, 220)
		m.blend = 'alpha'
		m.unlit = true
	}
mut inner := add_mesh(mut p, 'RingInner', core.vec3(0, 0.08, 0), core.vec3(90, 0, 0),
		core.vec3(r * 1.1, r * 1.1, r * 1.1), 'torus', lavender)
	if mut m := inner.get_component[render3d.MeshRenderer3D]() {
		m.emissive = core.rgba(150, 90, 230, 200)
		m.blend = 'alpha'
		m.unlit = true
	}
	// a spin around world-y turns the flat rings in place
	ring.add_component(&Spin3D{
		speed: core.Vec3{
			0, 50, 0
		}
	})
	inner.add_component(&Spin3D{
		speed: core.Vec3{
			0, -80, 0
		}
	})

mut swirl := add_mesh(mut p, 'Swirl', core.vec3(0, 0.1, 0), core.vec3(90, 0, 0),
		core.vec3(r * 1.7, r * 1.7, 1), 'disc', core.rgba(200, 110, 255, 140))
	if mut m := swirl.get_component[render3d.MeshRenderer3D]() {
		m.blend = 'additive'
		m.unlit = true
		m.pattern = 'stripes'
		m.uv_scale = core.vec2(2, 2)
		m.uv_scroll = core.vec2(0.5, 0)
	}
	swirl.add_component(&Spin3D{
		speed: core.Vec3{
			0, 120, 0
		}
	})

	pillar := add_mesh(mut p, 'Pillar', core.vec3(0, r + 0.9, 0), core.vec3(0, 0, 0),
		core.vec3(r * 1.2, r * 1.8, r * 1.2), 'cylinder', core.rgba(151, 117, 250, 38))
	if mut m := pillar.get_component[render3d.MeshRenderer3D]() {
		m.blend = 'alpha'
		m.unlit = true
		m.double_sided = true
	}

	add_mesh(mut p, 'Base', core.vec3(0, 0.05, 0), core.vec3(0, 0, 0),
		core.vec3(r * 2.5, 0.1, r * 2.5), 'cylinder', core.rgba(60, 50, 90, 255))

	mut spark := core.Node.new('Sparks')
	spark.add_component(&render3d.Transform3D{
		position: core.vec3(0, r * 0.6, 0)
	})
	spark.add_component(&render3d.Particles3D{
		preset: 'portal'
	})
	p.add_child(mut spark)
	p.add_component(&render3d.PointLight3D{
		color:     purple
		intensity: 2
		range:     9
	})
}

fn build_lantern(mut world core.Node, x f32, z f32) {
	stone := core.rgba(86, 101, 104, 255)
	glow := core.rgba(255, 212, 59, 255)
	mut l := core.Node.new('Lantern')
	l.add_component(&render3d.Transform3D{
		position: core.vec3(x, 0, z)
	})
	world.add_child(mut l)
	add_mesh(mut l, 'Post', core.vec3(0, 0.75, 0), core.vec3(0, 0, 0),
		core.vec3(0.44, 1.5, 0.44), 'cylinder', stone)
	core_n := add_mesh(mut l, 'Core', core.vec3(0, 1.7, 0), core.vec3(0, 0, 0),
		core.vec3(0.45, 0.45, 0.45), 'cube', glow)
	if mut m := core_n.get_component[render3d.MeshRenderer3D]() {
		m.emissive = core.rgba(255, 170, 30, 255)
		m.unlit = true
	}
	add_mesh(mut l, 'Cap', core.vec3(0, 2.12, 0), core.vec3(0, 45, 0),
		core.vec3(1.3, 0.45, 1.3), 'cone', stone)
}

fn build_peak(mut world core.Node, x f32, y f32, z f32, size f32, waterfall bool) {
	peak := core.rgba(38, 67, 72, 255)
	cap := core.rgba(45, 84, 76, 255)
	mut gp := core.Node.new('Peak')
	gp.add_component(&render3d.Transform3D{
		position: core.vec3(x, y, z)
	})
	world.add_child(mut gp)
	add_mesh(mut gp, 'Cone', core.vec3(0, 0, 0), core.vec3(180, 0, 0),
		core.vec3(size * 2, size * 2.4, size * 2), 'cone', peak)
	add_mesh(mut gp, 'Cap', core.vec3(0, 0.7, 0), core.vec3(0, 0, 0),
		core.vec3(size * 1.9, 1.5, size * 1.9), 'cylinder', cap)
	if waterfall {
		wf := add_mesh(mut gp, 'Waterfall', core.vec3(0, -size * 1.4, size * 0.75), core.vec3(0, 0, 0),
			core.vec3(size * 0.42, size * 3.5, 1), 'plane', core.rgba(165, 243, 252, 120))
		if mut m := wf.get_component[render3d.MeshRenderer3D]() {
			m.blend = 'alpha'
			m.unlit = true
			m.uv_scroll = core.vec2(0, 0.4)
		}
	}
}
