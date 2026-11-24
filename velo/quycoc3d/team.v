module main

import math
import velo.assets
import velo.core
import velo.render3d

// ============================================================================
//  team.v — the party system.
//
//  Three heroes stand on the field at once: the leader (driven by HeroController
//  + PlayerCombat) and two companions (CompanionAI: they flank the leader, chase
//  and slash nearby beasts on their own). Every hero is the same FBX dressed with
//  a different tint/blade colour and stat multipliers from content.v.
//
//  The roster has 8 heroes; the team panel swaps who leads, and F1/F2/F3 switch
//  control between the three field members.
// ============================================================================

const hero_model_id = 'a3d0f8b1'

// HeroMember — which roster hero this node currently shows, and its party slot.
pub struct HeroMember {
	core.Component
pub mut:
	slot    int
	hero_id int
}

// CompanionAI — follows the leader in a loose triangle and auto-attacks the
// nearest beast. Companions are not targeted by enemies (the leader tanks).
pub struct CompanionAI {
	core.Component
pub mut:
	slot     int
	speed    f32 = 6.6
	atk_mult f32 = 0.55
	cd       f32 @[hide]
}

pub fn (mut c CompanionAI) start() {
	c.cd = 0.4 + f32(c.slot) * 0.35
}

pub fn (mut c CompanionAI) update(dt f32) {
	s := gs()
	if s.leader == c.slot {
		return
	}
	sc := c.scene()
	lp := hero_pos(sc) or { return }
	mut tr := render3d.transform3d(mut c.node)
	// flank the leader: each companion keeps its own bearing
	ang := f32(c.slot) * 2.0944 + 0.7
	want := lp + core.vec3(f32(math.cos(ang)) * 2.6, 0, f32(math.sin(ang)) * 2.6)
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
			apply_hit(mut e, f32(s.atk) * c.atk_mult, true, 3)
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

// build_party: dresses the scene hero and spawns the two companions.
fn build_party(mut world core.Node) {
	mut s := gs()
	mut main := world.find('Hero') or { return }
	main.add_component(&HeroMember{
		slot:    0
		hero_id: s.hero_ids[0]
	})
	s.party = [main]
	base := render3d.transform3d(mut main).position
	for i in 1 .. 3 {
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
			hero_id: s.hero_ids[i]
		})
		n.add_component(&CompanionAI{
			slot: i
		})
		world.add_child(mut n)
		s.party << n
	}
	for i in 0 .. s.party.len {
		equip_hero(s.party[i], s.hero_ids[i])
	}
	apply_hero_stats()
}

// equip_hero: applies a roster hero's tint, blade colour and halo to a node.
fn equip_hero(n &core.Node, id int) {
	h := hero_def(id)
	if mut m := n.get_component[HeroMember]() {
		m.hero_id = id
	}
	if mut sk := n.get_component[render3d.SkinnedModel3D]() {
		sk.color = h.tint
	}
	// the greatsword: blade / edge / tip /guard / pommel take the hero colour
	parts := ['Sword/Blade', 'Sword/Edge', 'Sword/Tip', 'Sword/Guard', 'Sword/Pommel']
	for i, p in parts {
		if part := n.find(p) {
			if mut mr := part.get_component[render3d.MeshRenderer3D]() {
				mr.color = if i < 3 {
					h.blade
				} else {
					core.rgba(u8(f32(h.blade.r) * 0.62), u8(f32(h.blade.g) * 0.62), u8(f32(h.blade.b) * 0.62), 255)
				}
				if i < 3 {
					mr.rim = 0.45
				}
			}
		}
	}
	// the three spirit rings under the hero
	halos := ['Halo', 'Halo2', 'Halo3']
	alphas := [u8(140), u8(170), u8(200)]
	for i, p in halos {
		if part := n.find(p) {
			if mut mr := part.get_component[render3d.MeshRenderer3D]() {
				mr.color = core.rgba(h.blade.r, h.blade.g, h.blade.b, alphas[i])
			}
		}
	}
}

// switch_leader: moves control to party slot i (F1/F2/F3 or the team panel).
fn switch_leader(i int) {
	mut s := gs()
	if i < 0 || i >= s.party.len || i == s.leader {
		return
	}
	mut cur := s.party[s.leader]
	mut nxt := s.party[i]
	if cur == unsafe { nil } || nxt == unsafe { nil } {
		return
	}
	// keep the path 'World/Hero' on whoever leads (the camera + helpers look it up)
	cur.name = nxt.name
	nxt.name = 'Hero'
	s.leader = i
	h := hero_def(s.hero_ids[i])
	if mut hc := nxt.get_component[HeroController]() {
		hc.speed = 7 * h.spd_mult
		hc.aura_speed = 8.8 * h.spd_mult
	}
	apply_hero_stats()
	show_banner('Dẫn đầu: ${h.name} - ${h.title}')
}

// set_leader_hero: swaps the leader's roster hero (team panel roster click).
fn set_leader_hero(id int) {
	mut s := gs()
	if id < 0 || id >= heroes.len {
		return
	}
	if s.party.len == 0 {
		return
	}
	// no duplicates: a hero already in another slot swaps places
	for i in 0 .. s.party.len {
		if i != s.leader && s.hero_ids[i] == id {
			s.hero_ids[i] = s.hero_ids[s.leader]
			equip_hero(s.party[i], s.hero_ids[i])
		}
	}
	s.hero_ids[s.leader] = id
	equip_hero(s.party[s.leader], id)
	apply_hero_stats()
	h := hero_def(id)
	show_banner('Nhập đội: ${h.name} - ${h.title}')
}

// reset_party_pos: gathers the party at the map entrance (after travelling).
fn reset_party_pos() {
	s := gs()
	if s.party.len == 0 {
		return
	}
	for i, pn in s.party {
		if pn == unsafe { nil } {
			continue
		}
		mut n := pn
		mut tr := render3d.transform3d(mut n)
		tr.position = core.vec3(f32(i - 1) * 1.9, 0, 6 + f32(i) * 1.3)
		tr.rotation = core.Vec3{}
	}
}
