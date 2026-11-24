module main

import velo.core
import velo.render

// ============================================================================
//  ui_map.v — two runtime-built panels:
//
//   * BÁT HOANG ĐỊA ĐỒ (M): the 16 maps, lock state, tier, current location;
//     click a row to travel, [ / ] cycles unlocked maps.
//   * ĐỘI HÌNH (T): the three field heroes (F1/F2/F3) and the 8-hero roster
//     (click a hero to put them in the leader slot).
//
//  Plus the top bar (map + objective + Linh Thạch) and the boss health bar.
//  Built in code so the scene file stays the static design layout.
// ============================================================================

pub struct WorldMapUI {
	core.Component
mut:
	// top bar
	map_label   &core.Node = unsafe { nil }
	sub_label   &core.Node = unsafe { nil }
	// boss bar
	boss_root   &core.Node = unsafe { nil }
	boss_name   &core.Node = unsafe { nil }
	boss_fill   &core.Node = unsafe { nil }
	boss_text   &core.Node = unsafe { nil }
	boss_fill_w f32 = 436
	// buttons
	btn_map  &core.Node = unsafe { nil }
	btn_team &core.Node = unsafe { nil }
	// map panel
	map_panel  &core.Node = unsafe { nil }
	map_rows   []&core.Node
	map_names  []&core.Node
	map_states []&core.Node
	map_stones &core.Node = unsafe { nil }
	// team panel
	team_panel   &core.Node = unsafe { nil }
	party_cards  []&core.Node
	party_names  []&core.Node
	party_titles []&core.Node
	roster_cards []&core.Node
	roster_names []&core.Node
	roster_roles []&core.Node
	// refresh throttle
	tick f32
}

pub fn (mut u WorldMapUI) start() {
	mut hud := u.node
	u.build_topbar(mut hud)
	u.build_bossbar(mut hud)
	u.build_buttons(mut hud)
	u.build_map_panel(mut hud)
	u.build_team_panel(mut hud)
	u.refresh()
}

// ---------- small builders ----------

fn pad2(n int) string {
	return if n < 10 { '0${n}' } else { '${n}' }
}

fn ui_node(mut parent core.Node, name string, w f32, h f32) &core.Node {
	mut n := core.Node.new(name)
	n.add_component(&render.UITransform{
		size: core.vec2(w, h)
	})
	parent.add_child(mut n)
	return n
}

fn ui_label(mut parent core.Node, name string, text string, size int, col core.Color, w f32, h f32) &core.Node {
	mut n := ui_node(mut parent, name, w, h)
	n.add_component(&render.Label{
		text:         text
		size:         size
		color:        col
		shadow_color: core.rgba(0, 0, 0, 170)
		shadow_offset: core.Vec2{
			1, 1
		}
	})
	return n
}

fn ui_button(mut parent core.Node, name string, text string, w f32, h f32, col core.Color, accent core.Color) &core.Node {
	mut n := ui_node(mut parent, name, w, h)
	n.add_component(&render.Panel{
		color:        col
		radius:       5
		border_color: accent
		border_width: 1
	})
	mut l := core.Node.new('Text')
	l.add_component(&render.UITransform{
		size: core.vec2(w, h)
	})
	l.add_component(&render.Widget{
		align_center_x: true
		align_center_y: true
	})
	l.add_component(&render.Label{
		text:         text
		size:         11
		color:        core.rgba(245, 216, 150, 255)
		align:        'center'
		valign:       'middle'
		shadow_color: core.rgba(0, 0, 0, 170)
		shadow_offset: core.Vec2{
			1, 1
		}
	})
	n.add_child(mut l)
	n.add_component(&render.Button{})
	return n
}

// ---------- top bar / boss bar / buttons ----------

fn (mut u WorldMapUI) build_topbar(mut hud core.Node) {
	u.map_label = ui_label(mut hud, 'MapTop', '', 15, core.rgba(255, 224, 130, 255), 640, 20)
	u.map_label.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            104
	})
	if mut l := u.map_label.get_component[render.Label]() {
		l.align = 'center'
	}
	u.sub_label = ui_label(mut hud, 'MapSub', '', 11, core.rgba(190, 210, 200, 255), 640, 18)
	u.sub_label.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            124
	})
	if mut l := u.sub_label.get_component[render.Label]() {
		l.align = 'center'
	}
}

fn (mut u WorldMapUI) build_bossbar(mut hud core.Node) {
	mut root := ui_node(mut hud, 'BossBar', 460, 46)
	root.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            146
	})
	root.active = false
	u.boss_root = root
	// boss name
	mut nm := ui_node(mut root, 'BossName', 460, 18)
	nm.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            0
	})
	nm.add_component(&render.Label{
		text:         ''
		size:         13
		color:        core.rgba(255, 150, 90, 255)
		align:        'center'
		shadow_color: core.rgba(0, 0, 0, 190)
		shadow_offset: core.Vec2{
			1, 1
		}
	})
	u.boss_name = nm
	// bar background
	mut bar := ui_node(mut root, 'Bar', 440, 16)
	bar.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            20
	})
	bar.add_component(&render.Panel{
		color:        core.rgba(12, 10, 12, 235)
		radius:       3
		border_color: core.rgba(200, 120, 60, 220)
		border_width: 1
		block_input:  false
	})
	// fill
	mut fill := ui_node(mut bar, 'Fill', u.boss_fill_w, 12)
	fill.add_component(&render.Widget{
		align_left:     true
		left:           2
		align_center_y: true
		center_y:       0
	})
	fill.add_component(&render.Panel{
		color:       core.rgba(230, 90, 40, 255)
		radius:      2
		block_input: false
	})
	u.boss_fill = fill
	// text
	mut txt := ui_node(mut bar, 'Txt', 440, 16)
	txt.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_center_y: true
		center_y:       0
	})
	txt.add_component(&render.Label{
		text:         ''
		size:         10
		color:        core.rgba(255, 240, 220, 255)
		align:        'center'
		valign:       'middle'
		shadow_color: core.rgba(0, 0, 0, 200)
		shadow_offset: core.Vec2{
			1, 1
		}
	})
	u.boss_text = txt
}

fn (mut u WorldMapUI) build_buttons(mut hud core.Node) {
	u.btn_map = ui_button(mut hud, 'BtnMap', 'Địa Đồ M', 78, 28, core.rgba(30, 40, 44, 235),
		core.rgba(140, 109, 63, 220))
	u.btn_map.add_component(&render.Widget{
		align_right: true
		right:       12
		align_top:   true
		top:         58
	})
	u.btn_team = ui_button(mut hud, 'BtnTeam', 'Đội Hình T', 82, 28, core.rgba(30, 40, 44, 235),
		core.rgba(140, 109, 63, 220))
	u.btn_team.add_component(&render.Widget{
		align_right: true
		right:       96
		align_top:   true
		top:         58
	})
}

// ---------- map panel ----------

fn (mut u WorldMapUI) build_map_panel(mut hud core.Node) {
	mut p := ui_node(mut hud, 'MapPanel', 730, 574)
	p.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_center_y: true
		center_y:       0
	})
	p.add_component(&render.Panel{
		color:        core.rgba(9, 14, 18, 246)
		radius:       12
		border_color: core.rgba(212, 175, 106, 210)
		border_width: 2
	})
	p.active = false
	u.map_panel = p
	// title
	mut t := ui_node(mut p, 'Title', 700, 30)
	t.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            14
	})
	t.add_component(&render.Label{
		text:         'BÁT HOANG ĐỊA ĐỒ'
		size:         22
		color:        core.rgba(255, 224, 130, 255)
		align:        'center'
		shadow_color: core.rgba(0, 0, 0, 190)
		shadow_offset: core.Vec2{
			1, 2
		}
	})
	mut sub := ui_node(mut p, 'Sub', 700, 18)
	sub.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            46
	})
	sub.add_component(&render.Label{
		text:  'Hạ Boss để mở khóa vùng kế tiếp · [ ] di chuyển nhanh'
		size:  11
		color: core.rgba(170, 190, 180, 255)
		align: 'center'
	})
	// stones
	mut st := ui_node(mut p, 'Stones', 220, 20)
	st.add_component(&render.Widget{
		align_right: true
		right:       22
		align_top:   true
		top:         20
	})
	st.add_component(&render.Label{
		text:  ''
		size:  12
		color: core.rgba(150, 230, 220, 255)
		align: 'right'
	})
	u.map_stones = st
	// close
	mut cl := ui_button(mut p, 'Close', 'X', 34, 28, core.rgba(52, 26, 26, 240), core.rgba(220, 120, 110, 220))
	cl.add_component(&render.Widget{
		align_right: true
		right:       14
		align_top:   true
		top:         12
	})
	// 16 rows: 2 columns x 8
	for i in 0 .. maps.len {
		col := i / 8
		row := i % 8
		mut rn := ui_node(mut p, 'Row${i}', 344, 50)
		rn.add_component(&render.Panel{
			color:        core.rgba(24, 32, 36, 235)
			radius:       6
			border_color: core.rgba(140, 109, 63, 160)
			border_width: 1
		})
		rn.add_component(&render.Button{})
		rn.add_component(&render.Widget{
			align_left: true
			left:       18 + f32(col) * 352
			align_top:  true
			top:        72 + f32(row) * 55
		})
		// name
		mut nm := ui_node(mut rn, 'Name', 300, 24)
		nm.add_component(&render.Widget{
			align_left:     true
			left:           14
			align_center_y: true
			center_y:       -8
		})
		nm.add_component(&render.Label{
			text:         ''
			size:         14
			color:        core.rgba(232, 222, 200, 255)
			shadow_color: core.rgba(0, 0, 0, 170)
			shadow_offset: core.Vec2{
				1, 1
			}
		})
		// state
		mut sn := ui_node(mut rn, 'State', 160, 18)
		sn.add_component(&render.Widget{
			align_left:     true
			left:           14
			align_center_y: true
			center_y:       10
		})
		sn.add_component(&render.Label{
			text:  ''
			size:  10
			color: core.rgba(170, 190, 180, 255)
		})
		u.map_rows << rn
		u.map_names << nm
		u.map_states << sn
	}
}

// ---------- team panel ----------

fn (mut u WorldMapUI) build_team_panel(mut hud core.Node) {
	mut p := ui_node(mut hud, 'TeamPanel', 690, 420)
	p.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_center_y: true
		center_y:       0
	})
	p.add_component(&render.Panel{
		color:        core.rgba(9, 14, 18, 246)
		radius:       12
		border_color: core.rgba(212, 175, 106, 210)
		border_width: 2
	})
	p.active = false
	u.team_panel = p
	mut t := ui_node(mut p, 'Title', 660, 30)
	t.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            14
	})
	t.add_component(&render.Label{
		text:         'ĐỘI HÌNH BÁT HOANG'
		size:         20
		color:        core.rgba(255, 224, 130, 255)
		align:        'center'
		shadow_color: core.rgba(0, 0, 0, 190)
		shadow_offset: core.Vec2{
			1, 2
		}
	})
	mut sub := ui_node(mut p, 'Sub', 660, 18)
	sub.add_component(&render.Widget{
		align_center_x: true
		center_x:       0
		align_top:      true
		top:            44
	})
	sub.add_component(&render.Label{
		text:  'F1 / F2 / F3 đổi người dẫn đầu · click một nhân vật để đưa vào vị trí dẫn đầu'
		size:  10
		color: core.rgba(170, 190, 180, 255)
		align: 'center'
	})
	mut cl := ui_button(mut p, 'Close', 'X', 34, 28, core.rgba(52, 26, 26, 240), core.rgba(220, 120, 110, 220))
	cl.add_component(&render.Widget{
		align_right: true
		right:       14
		align_top:   true
		top:         12
	})
	// active party cards
	for i in 0 .. 3 {
		mut c := ui_node(mut p, 'Party${i}', 196, 76)
		c.add_component(&render.Panel{
			color:        core.rgba(24, 32, 36, 235)
			radius:       7
			border_color: core.rgba(140, 109, 63, 180)
			border_width: 1
		})
		c.add_component(&render.Button{})
		c.add_component(&render.Widget{
			align_center_x: true
			center_x:       f32(i - 1) * 216
			align_top:      true
			top:            74
		})
		mut nm := ui_node(mut c, 'Name', 180, 22)
		nm.add_component(&render.Widget{
			align_center_x: true
			center_x:       0
			align_top:      true
			top:            8
		})
		nm.add_component(&render.Label{
			text:  ''
			size:  15
			color: core.rgba(255, 232, 170, 255)
			align: 'center'
		})
		mut ti := ui_node(mut c, 'Title', 180, 18)
		ti.add_component(&render.Widget{
			align_center_x: true
			center_x:       0
			align_top:      true
			top:            32
		})
		ti.add_component(&render.Label{
			text:  ''
			size:  9
			color: core.rgba(170, 210, 200, 255)
			align: 'center'
		})
		mut hk := ui_node(mut c, 'Hint', 180, 16)
		hk.add_component(&render.Widget{
			align_center_x: true
			center_x:       0
			align_top:      true
			top:            52
		})
		hk.add_component(&render.Label{
			text:  'F${i + 1}'
			size:  9
			color: core.rgba(212, 175, 106, 255)
			align: 'center'
		})
		u.party_cards << c
		u.party_names << nm
		u.party_titles << ti
	}
	// roster: 8 heroes, 2 rows x 4
	for i in 0 .. heroes.len {
		col := i % 4
		row := i / 4
		mut c := ui_node(mut p, 'Hero${i}', 154, 66)
		c.add_component(&render.Panel{
			color:        core.rgba(20, 28, 32, 235)
			radius:       6
			border_color: core.rgba(120, 96, 60, 170)
			border_width: 1
		})
		c.add_component(&render.Button{})
		c.add_component(&render.Widget{
			align_center_x: true
			center_x:       f32(col) * 160 - 240
			align_top:      true
			top:            176 + f32(row) * 78
		})
		mut nm := ui_node(mut c, 'Name', 146, 20)
		nm.add_component(&render.Widget{
			align_center_x: true
			center_x:       0
			align_top:      true
			top:            8
		})
		nm.add_component(&render.Label{
			text:  ''
			size:  13
			color: core.rgba(236, 226, 204, 255)
			align: 'center'
		})
		mut ro := ui_node(mut c, 'Role', 146, 18)
		ro.add_component(&render.Widget{
			align_center_x: true
			center_x:       0
			align_top:      true
			top:            30
		})
		ro.add_component(&render.Label{
			text:  ''
			size:  9
			color: core.rgba(150, 200, 190, 255)
			align: 'center'
		})
		mut stt := ui_node(mut c, 'Stat', 146, 16)
		stt.add_component(&render.Widget{
			align_center_x: true
			center_x:       0
			align_top:      true
			top:            46
		})
		stt.add_component(&render.Label{
			text:  ''
			size:  8
			color: core.rgba(212, 175, 106, 255)
			align: 'center'
		})
		u.roster_cards << c
		u.roster_names << nm
		u.roster_roles << ro
	}
}

// ---------- update ----------

pub fn (mut u WorldMapUI) update(dt f32) {
	mut s := gs()
	inp := u.input()
	// hotkeys
	if inp.was_pressed(.m) {
		s.show_map = !s.show_map
		s.show_team = false
	}
	if inp.was_pressed(.t) {
		s.show_team = !s.show_team
		s.show_map = false
	}
	if inp.was_pressed(.escape) {
		s.show_map = false
		s.show_team = false
	}
	if inp.was_pressed(.f1) { switch_leader(0) }
	if inp.was_pressed(.f2) { switch_leader(1) }
	if inp.was_pressed(.f3) { switch_leader(2) }
	if !s.show_map && !s.show_team {
		if inp.was_pressed(.left_bracket) { travel_map(-1) }
		if inp.was_pressed(.right_bracket) { travel_map(1) }
	}
	// buttons
	if poll_btn(u.btn_map) {
		s.show_map = !s.show_map
		s.show_team = false
	}
	if poll_btn(u.btn_team) {
		s.show_team = !s.show_team
		s.show_map = false
	}
	// panel rows
	if s.show_map {
		if cl := u.map_panel.find('Close') {
			if poll_btn(cl) {
				s.show_map = false
			}
		}
		for i, r in u.map_rows {
			if poll_btn(r) {
				if i == 0 || s.cleared[i - 1] {
					load_map(i)
				}
			}
		}
	}
	if s.show_team {
		if cl := u.team_panel.find('Close') {
			if poll_btn(cl) {
				s.show_team = false
			}
		}
		for i, c in u.party_cards {
			if poll_btn(c) {
				switch_leader(i)
			}
		}
		for i, c in u.roster_cards {
			if poll_btn(c) {
				set_leader_hero(i)
			}
		}
	}
	u.map_panel.active = s.show_map
	u.team_panel.active = s.show_team
	// throttled text refresh
	u.tick += dt
	if u.tick > 0.15 {
		u.tick = 0
		u.refresh()
	}
	u.update_boss()
}

fn (mut u WorldMapUI) refresh() {
	s := gs()
	m := maps[s.map_index]
	if mut l := u.map_label.get_component[render.Label]() {
		l.text = '${m.name}  ·  Tầng ${s.map_index + 1}/${maps.len}'
	}
	if mut l := u.sub_label.get_component[render.Label]() {
		l.text = '${m.sub}  ·  Linh Thạch ${s.stones}  ·  Cấp ${s.level} ${realms[s.realm]}'
	}
	if mut l := u.map_stones.get_component[render.Label]() {
		l.text = 'Linh Thạch: ${s.stones}'
	}
	// map rows
	for i, n in u.map_names {
		locked := i > 0 && !s.cleared[i - 1]
		cur := i == s.map_index
		if mut l := n.get_component[render.Label]() {
			l.text = '${pad2(i + 1)}  ${maps[i].name}'
			l.color = if locked {
				core.rgba(110, 112, 116, 255)
			} else if cur {
				core.rgba(255, 224, 130, 255)
			} else if s.cleared[i] {
				core.rgba(176, 232, 190, 255)
			} else {
				core.rgba(232, 222, 200, 255)
			}
		}
		if mut l := u.map_states[i].get_component[render.Label]() {
			l.text = if locked {
				'KHOÁ'
			} else if cur {
				'ĐANG Ở'
			} else if s.cleared[i] {
				'✓ ĐÃ PHÁ · Tầng ${i + 1}'
			} else {
				'Tầng ${i + 1} · ${maps[i].goal} hạ'
			}
			l.color = if locked {
				core.rgba(170, 90, 90, 255)
			} else if cur {
				core.rgba(255, 210, 110, 255)
			} else if s.cleared[i] {
				core.rgba(140, 220, 170, 255)
			} else {
				core.rgba(170, 190, 180, 255)
			}
		}
		if mut p := u.map_rows[i].get_component[render.Panel]() {
			p.color = if locked {
				core.rgba(12, 14, 16, 220)
			} else if cur {
				core.rgba(46, 38, 20, 245)
			} else if s.cleared[i] {
				core.rgba(16, 32, 26, 235)
			} else {
				core.rgba(24, 32, 36, 235)
			}
			p.border_color = if cur {
				core.rgba(255, 212, 59, 230)
			} else if locked {
				core.rgba(70, 50, 50, 160)
			} else {
				core.rgba(140, 109, 63, 160)
			}
		}
		if mut b := u.map_rows[i].get_component[render.Button]() {
			b.interactable = !locked
		}
	}
	// team
	for i, n in u.party_names {
		id := s.hero_ids[i]
		if mut l := n.get_component[render.Label]() {
			l.text = heroes[id].name
		}
		if mut l := u.party_titles[i].get_component[render.Label]() {
			l.text = heroes[id].title
			l.color = if i == s.leader {
				core.rgba(255, 226, 150, 255)
			} else {
				core.rgba(170, 210, 200, 255)
			}
		}
		if mut p := u.party_cards[i].get_component[render.Panel]() {
			p.color = if i == s.leader {
				core.rgba(46, 38, 20, 245)
			} else {
				core.rgba(24, 32, 36, 235)
			}
			p.border_color = if i == s.leader {
				core.rgba(255, 212, 59, 230)
			} else {
				core.rgba(140, 109, 63, 180)
			}
		}
	}
	for i, n in u.roster_names {
		h := heroes[i]
		in_team := i in s.hero_ids
		if mut l := n.get_component[render.Label]() {
			l.text = h.name
			l.color = if in_team {
				core.rgba(255, 232, 170, 255)
			} else {
				core.rgba(236, 226, 204, 255)
			}
		}
		if mut l := u.roster_roles[i].get_component[render.Label]() {
			l.text = h.title
		}
		if mut p := u.roster_cards[i].get_component[render.Panel]() {
			lead := s.hero_ids[s.leader] == i
			p.color = if lead {
				core.rgba(46, 38, 20, 245)
			} else if in_team {
				core.rgba(20, 34, 34, 240)
			} else {
				core.rgba(20, 28, 32, 235)
			}
			p.border_color = if lead {
				core.rgba(255, 212, 59, 230)
			} else if in_team {
				core.rgba(120, 200, 180, 200)
			} else {
				core.rgba(120, 96, 60, 170)
			}
		}
	}
}

fn (mut u WorldMapUI) update_boss() {
	s := gs()
	mut alive := false
	mut frac := f32(0)
	mut txt := ''
	if s.boss_ref != unsafe { nil } {
		if h := s.boss_ref.get_component[Health]() {
			if h.hp > 0 {
				alive = true
				frac = f32(h.hp) / f32(h.max)
				txt = '${h.hp} / ${h.max}'
			}
		}
	}
	u.boss_root.active = alive
	if !alive {
		return
	}
	if mut l := u.boss_name.get_component[render.Label]() {
		l.text = boss_title(maps[s.map_index].boss)
	}
	if mut l := u.boss_text.get_component[render.Label]() {
		l.text = txt
	}
	if mut t := u.boss_fill.get_component[render.UITransform]() {
		t.size.x = u.boss_fill_w * frac
	}
	if mut p := u.boss_fill.get_component[render.Panel]() {
		p.color = if frac > 0.5 {
			core.rgba(230, 90, 40, 255)
		} else if frac > 0.25 {
			core.rgba(240, 170, 60, 255)
		} else {
			core.rgba(240, 70, 60, 255)
		}
	}
}

// travel_map: [ / ] — the next unlocked map in `dir`, wrapping around.
fn travel_map(dir int) {
	s := gs()
	for step in 1 .. maps.len + 1 {
		idx := (s.map_index + dir * step + maps.len * 4) % maps.len
		if idx == 0 || s.cleared[idx - 1] {
			load_map(idx)
			return
		}
	}
}
