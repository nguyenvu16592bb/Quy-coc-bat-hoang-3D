module main

import math
import velo.core
import velo.render

// HUD — the wuxia interface from the design HTML: top-left character frame (avatar,
// realm, HP/MP/XP bars, buffs), minimap with live dots, quest & dungeon panels,
// the 7-slot skill bar with cooldowns, consumable pills, the system banner and the
// floating damage numbers. Static layout lives in assets/scenes/main.scene; this
// component feeds it every frame and wires the buttons. The map/team panels and the
// boss bar are built at runtime by WorldMapUI (ui_map.v).

const pill_names = ['Huyết Đan', 'Tụ Linh Đan', 'Bạo Linh Phù']

pub struct HUDSync {
	core.Component
pub mut:
	realm_label  &core.Node = unsafe { nil } @[hide]
	hp_text      &core.Node = unsafe { nil } @[hide]
	mp_text      &core.Node = unsafe { nil } @[hide]
	zoom_label   &core.Node = unsafe { nil } @[hide]
	quest_label  &core.Node = unsafe { nil } @[hide]
	map_title    &core.Node = unsafe { nil } @[hide]
	banner_label &core.Node = unsafe { nil } @[hide]
	buff_aura    &core.Node = unsafe { nil } @[hide]
	buff_rage    &core.Node = unsafe { nil } @[hide]
	map_panel    &core.Node = unsafe { nil } @[hide]
	// battle v2 panels (added in main.scene; BattlePanelUI/TownPanelUI also
	// find them themselves, HUDSync keeps a reference for the HUD layer).
	battle_panel &core.Node = unsafe { nil } @[hide]
	town_panel   &core.Node = unsafe { nil } @[hide]
	enhance_panel &core.Node = unsafe { nil } @[hide]
	pvp_panel    &core.Node = unsafe { nil } @[hide]
	dots         []&core.Node @[hide]
	player_dot   &core.Node = unsafe { nil } @[hide]
	cd_labels    []&core.Node @[hide]
	slots        []&core.Node @[hide]
	pill_labels  []&core.Node @[hide]
	// buttons
	btn_swarm   &core.Node = unsafe { nil } @[hide]
	btn_elite   &core.Node = unsafe { nil } @[hide]
	btn_boss    &core.Node = unsafe { nil } @[hide]
	btn_bosstop &core.Node = unsafe { nil } @[hide]
	btn_break   &core.Node = unsafe { nil } @[hide]
	btn_cam     &core.Node = unsafe { nil } @[hide]
	btn_pills   []&core.Node @[hide]
}

pub fn (mut h HUDSync) start() {
	gs().scene = h.scene()
	sc := h.scene()
	if n := sc.find('HUD/TopLeft/Realm') { h.realm_label = n }
	if n := sc.find('HUD/TopLeft/HpText') { h.hp_text = n }
	if n := sc.find('HUD/TopLeft/MpText') { h.mp_text = n }
	if n := sc.find('HUD/TopLeft/BuffAura') { h.buff_aura = n }
	if n := sc.find('HUD/TopLeft/BuffRage') { h.buff_rage = n }
	if n := sc.find('HUD/Minimap/Zoom') { h.zoom_label = n }
	if n := sc.find('HUD/Minimap/Map') { h.map_panel = n }
	if n := sc.find('HUD/Minimap/Title') { h.map_title = n }
	if n := sc.find('HUD/QuestPanel/QuestText') { h.quest_label = n }
	if n := sc.find('HUD/Banner') { h.banner_label = n }
	if n := sc.find('HUD/BattlePanel') { h.battle_panel = n }
	if n := sc.find('HUD/TownPanel') { h.town_panel = n }
	if n := sc.find('HUD/EnhancePanel') { h.enhance_panel = n }
	if n := sc.find('HUD/PvpPanel') { h.pvp_panel = n }
	for i in 0 .. 7 {
		if n := sc.find('HUD/Slots/Slot${i}') { h.slots << n }
		if n := sc.find('HUD/Slots/Slot${i}/Cd') { h.cd_labels << n }
	}
	if n := sc.find('HUD/Pills/PillHp') {
		h.pill_labels << n
		h.btn_pills << n
	}
	if n := sc.find('HUD/Pills/PillMp') {
		h.pill_labels << n
		h.btn_pills << n
	}
	if n := sc.find('HUD/Pills/PillRage') {
		h.pill_labels << n
		h.btn_pills << n
	}
	if n := sc.find('HUD/QuestPanel/BtnSwarm') { h.btn_swarm = n }
	if n := sc.find('HUD/QuestPanel/BtnElite') { h.btn_elite = n }
	if n := sc.find('HUD/QuestPanel/BtnBoss') { h.btn_boss = n }
	if n := sc.find('HUD/BtnBossTop') { h.btn_bosstop = n }
	if n := sc.find('HUD/BtnBreak') { h.btn_break = n }
	if n := sc.find('HUD/BtnCam') { h.btn_cam = n }
	// minimap dots: a pool of enemy dots + the player marker
	if h.map_panel != unsafe { nil } {
		mut map_node := h.map_panel
		for i in 0 .. 32 {
			mut d := make_dot('Dot${i}', core.rgba(255, 77, 79, 255), 8)
			map_node.add_child(mut d)
			d.active = false
			h.dots << d
		}
		mut pdot := make_dot('PlayerDot', core.rgba(81, 207, 102, 255), 10)
		map_node.add_child(mut pdot)
		h.player_dot = pdot
	}
}

// make_dot: a small round panel used as a minimap dot.
fn make_dot(name string, col core.Color, size f32) &core.Node {
	mut n := core.Node.new(name)
	n.add_component(&render.UITransform{
		size: core.vec2(size, size)
	})
	n.add_component(&render.Panel{
		color:  col
		radius: size / 2
		block_input: false
	})
	n.add_component(&render.Widget{
		align_center_x: true
		align_center_y: true
	})
	return n
}

pub fn (mut h HUDSync) update(dt f32) {
	mut s := gs()
	sc := h.scene()

	// ---- texts ----
	set_label(h.realm_label, realms[s.realm])
	set_label(h.hp_text, '${s.hp}/${s.max_hp}')
	set_label(h.mp_text, '${int(s.mp)}/${int(s.max_mp)}')
	set_label(h.zoom_label, '${int(s.zoom)}%')
	m := maps[s.map_index]
	set_label(h.map_title, '${m.name}')
	if s.map_kills >= s.map_goal {
		if s.boss_up {
			set_label(h.quest_label, 'Hạ ${boss_title(m.boss)}! (Boss)')
		} else {
			set_label(h.quest_label, 'Hoàn thành ${m.name}! (${s.map_kills}/${s.map_goal})')
		}
	} else {
		set_label(h.quest_label, 'Tiêu diệt Yêu Thú (${s.map_kills}/${s.map_goal})')
	}

	// ---- banner (fades like the design) ----
	if h.banner_label != unsafe { nil } {
		if s.banner_t > 0 {
			s.banner_t -= dt
			set_label(h.banner_label, s.banner)
			if mut l := h.banner_label.get_component[render.Label]() {
				a := math.min(f32(1), s.banner_t * 2.5)
				l.color = core.rgba(255, 224, 130, u8(255 * a))
			}
		} else {
			set_label(h.banner_label, '')
		}
	}

	// ---- buff icons ----
	if h.buff_aura != unsafe { nil } {
		mut n := h.buff_aura
		n.active = s.aura > 0
	}
	if h.buff_rage != unsafe { nil } {
		mut n := h.buff_rage
		n.active = s.rage > 0
	}

	// ---- skill slots: cooldown text + darkened panel ----
	for i in 0 .. 7 {
		if i < h.cd_labels.len {
			if s.cd[i] > 0 {
				set_label(h.cd_labels[i], '${int(math.ceil(s.cd[i]))}')
			} else {
				set_label(h.cd_labels[i], '')
			}
		}
		if i < h.slots.len {
			if mut p := h.slots[i].get_component[render.Panel]() {
				p.color = if s.cd[i] > 0 {
					core.rgba(10, 14, 16, 200)
				} else {
					core.rgba(24, 32, 36, 235)
				}
			}
		}
	}

	// ---- pill counts ----
	for i, n in h.pill_labels {
		set_label(n, '${pill_names[i]} x${s.pills[i]}')
	}

	// ---- minimap dots ----
	es := enemies_of(sc)
	for i in 0 .. h.dots.len {
		mut d := h.dots[i]
		if i < es.len && es[i].alive() {
			ep := es[i].position()
			if mut w := d.get_component[render.Widget]() {
				w.center_x = ep.x / 25 * 56
				w.center_y = ep.z / 25 * 56
			}
			if mut p := d.get_component[render.Panel]() {
				p.color = if es[i].boss {
					core.rgba(255, 146, 43, 255)
				} else {
					core.rgba(255, 77, 79, 255)
				}
			}
			if mut t := d.get_component[render.UITransform]() {
				sz := if es[i].boss { f32(15) } else { f32(7) }
				t.size = core.vec2(sz, sz)
			}
			d.active = true
		} else {
			d.active = false
		}
	}
	if h.player_dot != unsafe { nil } {
		if hp := hero_pos(sc) {
			if mut w := h.player_dot.get_component[render.Widget]() {
				w.center_x = hp.x / 25 * 56
				w.center_y = hp.z / 25 * 56
			}
			h.player_dot.active = true
		} else {
			h.player_dot.active = false
		}
	}

	// ---- buttons (consume the click exactly once) ----
	if poll_btn(h.btn_swarm) { gs().pending_wave = 'swarm' }
	if poll_btn(h.btn_elite) { gs().pending_wave = 'elite' }
	if poll_btn(h.btn_boss) { gs().pending_wave = 'boss' }
	if poll_btn(h.btn_bosstop) { gs().pending_wave = 'boss' }
	if poll_btn(h.btn_break) { cast_skill_idx(sc, 6) }
	if poll_btn(h.btn_cam) {
		cam_node := sc.find('Camera') or { return }
		if mut cam := cam_node.get_component[FollowIsoCamera]() {
			cam.yaw += 90
			show_banner('Xoay Góc Nhìn Toàn Cảnh 3D')
		}
	}
	for i, n in h.btn_pills {
		if poll_btn(n) { use_pill(i) }
	}
	for i, n in h.slots {
		if poll_btn(n) { cast_skill_idx(sc, i) }
	}
}

// set_label: updates a Label's text through its node.
fn set_label(n &core.Node, text string) {
	if n == unsafe { nil } {
		return
	}
	if mut l := n.get_component[render.Label]() {
		l.text = text
	}
}

// poll_btn: true exactly once per click (merge-game rule: consume the click).
fn poll_btn(n &core.Node) bool {
	if n == unsafe { nil } {
		return false
	}
	mut b := n.get_component[render.Button]() or { return false }
	if b.clicked {
		b.clicked = false
		return true
	}
	return false
}

// ---------- floating combat text ----------

// FloatText — a HUD number that rises and fades over ~1s, positioned by projecting
// a world point through the 3D camera (design: spawnFloatingText).
pub struct FloatText {
	core.Component
pub mut:
	text  string
	kind  string = 'normal' @[choices: 'normal|crit|dodge|heal']
	world core.Vec3
	age   f32 @[hide]
}

pub fn (mut f FloatText) start() {
	mut size := 20
	mut col := core.rgba(255, 107, 53, 255)
	match f.kind {
		'crit' {
			size = 26
			col = core.rgba(255, 158, 27, 255)
		}
		'dodge' {
			col = core.rgba(56, 217, 255, 255)
		}
		'heal' {
			col = core.rgba(81, 207, 102, 255)
		}
		else {}
	}
	f.node.add_component(&render.UITransform{
		size: core.vec2(240, 30)
	})
	f.node.add_component(&render.Label{
		text:         f.text
		size:         size
		color:        col
		align:        'center'
		valign:       'middle'
		shadow_color: core.rgba(0, 0, 0, 190)
		shadow_offset: core.Vec2{
			1, 2
		}
	})
	f.node.add_component(&render.Widget{
		align_left: true
		align_top:  true
	})
}

pub fn (mut f FloatText) update(dt f32) {
	f.age += dt
	k := f.age / 1.05
	if k >= 1 {
		f.node.destroy()
		return
	}
	cam := active_cam(f.scene()) or { return }
	sx, front := cam.world_to_screen(f.world + core.vec3(0, f32(2.2 + k * 1.6), 0))
	if !front {
		f.node.active = false
		return
	}
	f.node.active = true
	if mut w := f.node.get_component[render.Widget]() {
		sc := f.scene()
		w.left = sc.view_origin.x + sx.x * sc.view_size.x
		w.top = sc.view_origin.y + sx.y * sc.view_size.y
	}
	if mut l := f.node.get_component[render.Label]() {
		a := if k < 0.18 { k / 0.18 } else { 1 - (k - 0.18) / 0.82 }
		l.color = core.rgba(l.color.r, l.color.g, l.color.b, u8(255 * a))
	}
}

// float_text: spawns a floating combat number under HUD/Floats.
fn float_text(sc &core.Scene, pos core.Vec3, text string, kind string) {
	mut layer := sc.find('HUD/Floats') or { return }
	mut n := core.Node.new('Float')
	n.add_component(&FloatText{
		text:  text
		kind:  kind
		world: pos
	})
	layer.add_child(mut n)
}
