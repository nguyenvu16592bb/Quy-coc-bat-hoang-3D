module main

import rand
import velo.assets
import velo.audio
import velo.core
import velo.kine2d
import velo.render

// ===========================================================================
// MergeBoard â€” the battlefield grid: player units, buy cards, drag & merge.
// Units live on a 5x3 grid of cells in the lower part of the map.
// ===========================================================================
pub struct MergeBoard {
	core.Component
pub mut:
	cells     [15]core.Vec2
	cell_ghosts [15]&core.Node
	units     []&core.Node
	dragging  bool
	drag_idx  int = -1
	card_cost int = 100
	battle    &BattleController = unsafe { nil }
	field     &core.Node        = unsafe { nil }
	glow      &core.Node        = unsafe { nil }
	ready     bool @[hide]
	// long-press unit info
	press_idx   int = -1
	press_t     f32
	press_fired bool
	press_start core.Vec2
	info        &core.Node = unsafe { nil }
	// drag hint state
	drag_merge_ok bool
	drag_cell_ok  bool
}

fn (mut b MergeBoard) start() {
	b.field = b.scene().root
	if mut c := b.scene().root.get_component[BattleController]() {
		b.battle = c
	}
	b.init_cells()
	b.build_cell_ghosts()
	b.build_cards()
	b.build_glow()
	b.start_army()
	b.refresh_coin_label()
	b.ready = true
}

// build_glow â€” the placement gizmo: a soft glow that follows the dragged unit.
fn (mut b MergeBoard) build_glow() {
	mut g := core.Node.new('Glow')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/glow.png')
			size:    core.vec2(96, 96)
		})
	g.position = core.vec2(-200, -200)
	g.z_index = 8
	g.active = false
	b.field.add_child(mut g)
	b.glow = g

	// DragHint — "MERGE! / DROP" label that follows the dragged unit
	mut h := core.Node.new('DragHint')
		.with(&render.Label{
			text:  ''
			size:  18
			align: 'center'
			color: core.rgba(255, 215, 90, 255)
		})
	h.position = core.vec2(-200, -200)
	h.z_index = 31
	h.active = false
	b.field.add_child(mut h)
}

fn (mut b MergeBoard) init_cells() {
	xs := [f32(94), 188, 282, 376, 470]
	ys := [f32(560), 660, 760]
	mut i := 0
	for y in ys {
		for x in xs {
			b.cells[i] = core.vec2(x, y)
			i++
		}
	}
}

// build_cell_ghosts — faint square outlines on the 15 board cells so players
// see where their team stands / where a drop will land (like the reference
// game). block_input MUST be false or the ghosts eat every click.
fn (mut b MergeBoard) build_cell_ghosts() {
	for i in 0 .. 15 {
		mut g := core.Node.new('CellGhost${i}')
			.with(&render.UITransform{ size: core.vec2(72, 72), anchor: core.vec2(0.5, 0.5) })
			.with(&render.Panel{ color: core.rgba(255, 255, 255, 32), radius: 10, border_width: 2, border_color: core.rgba(255, 255, 255, 100), block_input: false })
		g.position = b.cells[i]
		g.z_index = 6 // ABOVE units/enemies (z4/5) so the squares stay visible during battle
		b.field.add_child(mut g)
		b.cell_ghosts[i] = g
	}
}

// set_ghosts — show/hide the cell squares (idle: visible, fighting: hidden).
fn (mut b MergeBoard) set_ghosts(vis bool) {
	for i in 0 .. 15 {
		if b.cell_ghosts[i] != unsafe { nil } {
			b.cell_ghosts[i].active = vis
		}
	}
}

// highlight_ghost — brightens the ghost under a drag / dims the others.
fn (mut b MergeBoard) highlight_ghost(cell int) {
	for i in 0 .. 15 {
		if b.cell_ghosts[i] == unsafe { nil } {
			continue
		}
		if mut p := b.cell_ghosts[i].get_component[render.Panel]() {
			if i == cell {
				p.border_color = core.rgba(255, 215, 90, 235)
				p.color = core.rgba(255, 215, 90, 55)
			} else {
				p.border_color = core.rgba(255, 255, 255, 95)
				p.color = core.rgba(255, 255, 255, 30)
			}
		}
	}
}

fn (mut b MergeBoard) build_cards() {
	// 4 buy cards along the bottom (fire/water/earth/wind), centered.
	mut root := b.scene().root
	els := ['fire', 'water', 'earth', 'wind']
	cx := [f32(159), 233, 307, 381] // 4 cards, symmetric around x=270
	for i in 0 .. 4 {
		pos := core.vec2(cx[i], 880)
		mut card := core.Node.new('Card${i}')
			.with(&render.UITransform{ size: core.vec2(64, 96), anchor: core.vec2(0.5, 0.5) })
			.with(&render.Panel{ color: core.rgba(90, 60, 30, 235), radius: 10, border_width: 2, border_color: core.rgba(220, 180, 90, 255) })
			.with(&render.Button{})
		card.position = pos
		card.z_index = 18
		root.add_child(mut card)

		mut icon := core.Node.new('Icon')
			.with(&render.Sprite{
				texture: monster_tex(els[i], 1)
				size:    monster_size(els[i], 1)
			})
		icon.position = core.vec2(0, -12)
		icon.z_index = 19
		card.add_child(mut icon)

		mut price := core.Node.new('Price')
			.with(&render.Label{
				text:  '${b.card_cost}'
				size:  17
				align: 'center'
				color: core.rgba(255, 220, 90, 255)
			})
		price.position = core.vec2(14, 38)
		price.z_index = 19
		card.add_child(mut price)

		mut coin := core.Node.new('Coin')
			.with(&render.Sprite{
				texture: assets.ref[assets.Texture]('ui/coin.png')
				size:    core.vec2(22, 13)
			})
		coin.position = core.vec2(-26, 38)
		coin.z_index = 19
		card.add_child(mut coin)
	}
}

fn (mut b MergeBoard) start_army() {
	team := team_from_save(b.scene().store)
	if team.len > 0 {
		mut i := 0
		for ts in team {
			if ts.element == '' {
				continue
			}
			b.spawn_unit(ts.element, ts.level, 7 + i)
			i++
		}
		return
	}
	// default team from team.json
	mut i := 0
	for ts in g_data.team {
		if ts.element == '' {
			continue
		}
		b.spawn_unit(ts.element, ts.level, 7 + i)
		i++
	}
}

// spawn_unit creates a player unit on grid cell `cell` and adds it to the board.
fn (mut b MergeBoard) spawn_unit(element string, level int, cell int) &core.Node {
	stats := element_stats(element)
	mult := level_mult(level)
	at := if cell >= 0 && cell < 15 { b.cells[cell] } else { core.vec2(270, 560) }
	mut n := core.Node.new('Unit')
		.with(&render.Sprite{
			texture: monster_tex(element, level)
			size:    monster_size(element, level)
		})
	n.position = at
	n.z_index = 5
	b.field.add_child(mut n)
	n.add_component(&Monster{
		element:   element
		level:     level
		side:      0
		max_hp:    stats.hp * mult
		damage:    stats.dmg * mult
		atk_speed: stats.spd
		cooldown:  stats.spd
		speed:     58
		ranged:    element_ranged(element)
		range:     element_range(element)
		home:      at
		cell:      cell
	})
	if mut mm := n.get_component[Monster]() {
		if mm.side == 0 {
			b.apply_attrs(mut mm) // gem attributes apply to player units
		}
	}
	make_hp_bar(mut n, 38, -30)
	make_level_tag(mut n, -38)
	make_status_icons(mut n, -50)
	set_level_tag(n, level)
	n.scale = core.vec2(0.4, 0.4)
	n.tween().scale_to(core.vec2(1, 1), 0.25, .elastic_out)
	b.units << n
	particle_burst_tag(mut b.field, at, 'spawn')
	return n
}

// place_new â€” buy a unit into the first free cell.
fn (mut b MergeBoard) place_new(element string) {
	mut cell := -1
	for i in 0 .. 15 {
		if b.cell_free(i) {
			cell = i
			break
		}
	}
	if cell < 0 {
		b.toast('Board full!')
		return
	}
	b.spawn_unit(element, 1, cell)
}

fn (b &MergeBoard) cell_free(cell int) bool {
	for u in b.units {
		if mut m := u.get_component[Monster]() {
			if m.alive && m.cell == cell {
				return false
			}
		}
	}
	return true
}

fn (b &MergeBoard) cell_of(n &core.Node) int {
	if mut m := n.get_component[Monster]() {
		return m.cell
	}
	return -1
}

// nearest_free_cell â€” the closest cell without a unit.
fn (b &MergeBoard) nearest_free_cell(at core.Vec2) int {
	mut best := -1
	mut bd := 999999.0
	for i in 0 .. 15 {
		if b.cell_free(i) {
			d := b.cells[i].distance(at)
			if d < bd {
				bd = d
				best = i
			}
		}
	}
	return best
}

fn (mut b MergeBoard) update(dt f32) {
	if b.battle != unsafe { nil } && b.battle.over() {
		return
	}
	in_ := b.input()
	if b.battle != unsafe { nil } && b.battle.fighting() {
		b.close_info()
		b.press_idx = -1
		b.set_ghosts(false) // squares hide during the fight
	} else {
		b.set_ghosts(true) // and reappear in the waiting state
	}
	// long-press (hold a unit -> info) / drag (press + move) — idle only
	if !b.dragging && !b.battle.fighting() {
		if in_.mouse_pressed {
			mut hit := -1
			for i, mut u in b.units {
				if u == unsafe { nil } {
					continue
				}
				if mut m := u.get_component[Monster]() {
					if !m.alive {
						continue
					}
					if u.position.distance(in_.mouse) < 48 {
						hit = i
						break
					}
				}
			}
			if hit >= 0 {
				b.press_idx = hit
				b.press_t = 0
				b.press_fired = false
				b.press_start = in_.mouse
			} else {
				b.close_info()
			}
		}
		if b.press_idx >= 0 && in_.mouse_down {
			b.press_t += dt
			mut pu := b.units[b.press_idx]
			if !b.press_fired && b.press_t > 0.45 {
				b.show_unit_info(b.press_idx)
				b.press_fired = true
			} else if !b.press_fired && in_.mouse.distance(b.press_start) > 14 {
				// picked the unit up to drag
				b.dragging = true
				b.drag_idx = b.press_idx
				b.press_idx = -1
				pu.z_index = 30
				pu.scale = pu.scale.mul(1.15)
				if mut hint := b.field.find('DragHint') {
					hint.active = true
				}
			}
		}
		if in_.mouse_released && b.press_idx >= 0 {
			if b.press_fired {
				b.close_info()
			}
			b.press_idx = -1
		}
	}
	if b.dragging {
		mut u := b.units[b.drag_idx]
		if b.glow != unsafe { nil } {
			b.glow.active = true
			b.glow.position = in_.mouse
			if mut gs := b.glow.get_component[render.Sprite]() {
				mut merge_ok := false
				if b.drag_idx >= 0 && b.drag_idx < b.units.len {
					if mut sm := b.units[b.drag_idx].get_component[Monster]() {
						for o in b.units {
							if o == b.units[b.drag_idx] || o == unsafe { nil } {
								continue
							}
							if mut om := o.get_component[Monster]() {
								if om.alive && o.position.distance(in_.mouse) < 48
									&& sm.element == om.element && sm.level == om.level {
									merge_ok = true
									break
								}
							}
						}
					}
				}
				if merge_ok {
					gs.color = core.rgba(255, 190, 60, 255) // gold: merge possible
					b.drag_merge_ok = true
					b.drag_cell_ok = false
				} else {
					b.drag_merge_ok = false
					cell := b.nearest_free_cell(in_.mouse)
					if cell >= 0 && b.cells[cell].distance(in_.mouse) < 95 {
						gs.color = core.rgba(120, 255, 120, 255) // green: drop will place here
						b.drag_cell_ok = true
					} else {
						gs.color = core.rgba(255, 255, 255, 190)
						b.drag_cell_ok = false
					}
				}
			}
		}
		// drop / merge hint label follows the drag (reference-game touch)
		if mut hint := b.field.find('DragHint') {
			hint.position = in_.mouse + core.vec2(0, -52)
			if mut hl := hint.get_component[render.Label]() {
				hl.text = if b.drag_merge_ok {
					'MERGE!'
				} else if b.drag_cell_ok {
					'DROP'
				} else {
					''
				}
			}
		}
		// highlight the cell the drag hovers over (drop target / merge spot)
		mut hl := -1
		for i in 0 .. 15 {
			if b.cells[i].distance(in_.mouse) < 66 {
				hl = i
				break
			}
		}
		b.highlight_ghost(hl)
		if in_.mouse_down {
			u.position = in_.mouse
		}
		if in_.mouse_released {
			b.drop(mut u, in_.mouse)
		}
	} else {
		b.highlight_ghost(-1)
		b.drag_merge_ok = false
		b.drag_cell_ok = false
		if mut hint := b.field.find('DragHint') {
			hint.active = false
		}
		if b.glow != unsafe { nil } {
			b.glow.active = false
		}
	}
	// buy cards (4 elements)
	for i in 0 .. 4 {
		if mut card := b.field.find('Card${i}') {
			if mut bt := card.get_component[render.Button]() {
				if bt.clicked {
					els := ['fire', 'water', 'earth', 'wind']
					b.buy(els[i])
				}
			}
		}
	}
}

fn (mut b MergeBoard) buy(element string) {
	mut st := b.scene().store
	coins := st.get_int('coins', 200)
	if coins < b.card_cost {
		b.toast('Not enough coins!')
		return
	}
	st.set_int('coins', coins - b.card_cost)
	b.refresh_coin_label()
	sfx_play_scene(b.scene(), 'audio/buy.wav')
	b.place_new(element)
	auto_save_team(mut st, b.units)
}

fn (mut b MergeBoard) drop(mut u &core.Node, mouse core.Vec2) {
	b.dragging = false
	b.drag_idx = -1
	if b.glow != unsafe { nil } {
		b.glow.active = false
	}
	u.z_index = 5
	u.scale = u.scale.mul(1.0 / 1.15)
	mut sm := u.get_component[Monster]() or { return }
	// dropped on another player unit? (iterate a SNAPSHOT: the merge branch
	// mutates b.units via remove_unit, which would desync the live loop and
	// leave the target unit in its cell)
	for mut o in b.units.clone() {
		if o == u || o == unsafe { nil } {
			continue
		}
		if mut om := o.get_component[Monster]() {
			if !om.alive {
				continue
			}
			if o.position.distance(mouse) < 48 {
				if sm.element == om.element && sm.level == om.level {
					// same-element merge (level + 1)
					el := sm.element
					lvl := if sm.level >= 10 { 10 } else { sm.level + 1 }
					if sm.level >= 10 {
						bonus := sm.level * 12
						b.add_coins(bonus)
						b.remove_unit(mut u)
						b.remove_unit(mut o)
						b.toast('+${bonus} coins')
						return
					}
					b.remove_unit(mut u)
					b.remove_unit(mut o)
					sfx_play_scene(b.scene(), 'audio/merge.wav')
					particle_burst_tag(mut b.field, o.position, 'merge')
					mut st := b.scene().store
				auto_save_team(mut st, b.units)
					mut n := b.spawn_unit(el, lvl, -1)
					cell := b.nearest_free_cell(o.position)
					n.position = b.cells[cell]
					if mut m := n.get_component[Monster]() {
						m.cell = cell
						m.home = b.cells[cell]
					}
					if lvl >= 5 {
						b.add_coins(lvl * 5)
						b.toast('${el} L${lvl}! +${lvl * 5} coins')
					} else {
						b.toast('${el} L${lvl}!')
					}
					return
				}
				// cross-element fusion: same level, different elements -> unique hybrid
				if sm.level == om.level {
					hb := hybrid_of(sm.element, om.element)
					if hb != '' {
						b.remove_unit(mut u)
						b.remove_unit(mut o)
						sfx_play_scene(b.scene(), 'audio/merge.wav')
						particle_burst_tag(mut b.field, o.position, 'merge')
						mut st := b.scene().store
					auto_save_team(mut st, b.units)
						mut n := b.spawn_unit(hb, sm.level, -1)
						cell := b.nearest_free_cell(o.position)
						n.position = b.cells[cell]
						if mut m := n.get_component[Monster]() {
							m.cell = cell
							m.home = b.cells[cell]
						}
						b.toast('${hb} L${sm.level}! (fusion)')
						return
					}
				}
				// different units: swap cells
				uc := sm.cell
				mut u_home := sm.home
				mut o_home := om.home
				sm.cell = om.cell
				sm.home = om.home
				om.cell = uc
				om.home = u_home
				u.position = o_home
				o.position = u_home
				_ = o_home
				_ = u_home
				return
			}
		}
	}
	// dropped on empty space: snap to the nearest free cell
	cell := b.nearest_free_cell(mouse)
	if cell >= 0 {
		if mut m := u.get_component[Monster]() {
			m.cell = cell
			m.home = b.cells[cell]
		}
		u.position = b.cells[cell]
	} else {
		u.position = sm.home
	}
}

// build_info_panel — one shared popup (built lazily) showing a unit's stats
// and its next merge level. Looks like a proper info card (icon + gold border).
fn (mut b MergeBoard) build_info_panel() &core.Node {
	mut root := b.scene().root
	mut panel := core.Node.new('UnitInfo')
		.with(&render.UITransform{ size: core.vec2(256, 144), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(16, 14, 26, 250), radius: 12, border_width: 3, border_color: core.rgba(255, 210, 90, 255) })
	panel.position = core.vec2(270, 300)
	panel.z_index = 60
	panel.active = false
	root.add_child(mut panel)

	mut ic := core.Node.new('InfoIcon')
		.with(&render.Sprite{
			texture: monster_tex('fire', 1)
			size:    core.vec2(52, 68)
		})
	ic.position = core.vec2(-96, -4)
	ic.z_index = 61
	panel.add_child(mut ic)

	mut t := core.Node.new('InfoTitle')
		.with(&render.Label{ text: '', size: 20, align: 'left', color: core.rgba(255, 220, 110, 255) })
	t.position = core.vec2(-14, -46)
	t.z_index = 61
	panel.add_child(mut t)

	mut s := core.Node.new('InfoStats')
		.with(&render.Label{ text: '', size: 15, align: 'left', color: core.rgba(230, 235, 255, 255) })
	s.position = core.vec2(-14, -10)
	s.z_index = 61
	panel.add_child(mut s)

	mut nx := core.Node.new('InfoNext')
		.with(&render.Label{ text: '', size: 15, align: 'left', color: core.rgba(140, 255, 170, 255) })
	nx.position = core.vec2(-14, 24)
	nx.z_index = 61
	panel.add_child(mut nx)

	mut h := core.Node.new('InfoHint')
		.with(&render.Label{ text: 'release or tap elsewhere to close', size: 11, align: 'center', color: core.rgba(150, 150, 185, 255) })
	h.position = core.vec2(0, 56)
	h.z_index = 61
	panel.add_child(mut h)
	return panel
}

// show_unit_info — fills and opens the popup for the unit at `idx`.
fn (mut b MergeBoard) show_unit_info(idx int) {
	if idx < 0 || idx >= b.units.len {
		return
	}
	mut u := b.units[idx]
	mut m := u.get_component[Monster]() or { return }
	if b.info == unsafe { nil } {
		b.info = b.build_info_panel()
	}
	if b.info == unsafe { nil } {
		return
	}
	b.info.active = true
	mut pos := u.position + core.vec2(0, -130)
	if pos.y < 130 {
		pos.y = 130
	}
	if pos.x < 100 {
		pos.x = 100
	}
	if pos.x > 440 {
		pos.x = 440
	}
	b.info.position = pos
	if mut ic := b.info.find('InfoIcon') {
		if mut sp := ic.get_component[render.Sprite]() {
			sp.texture = monster_tex(m.element, m.level)
		}
	}
	if mut l := b.info.find('InfoTitle') {
		if mut ll := l.get_component[render.Label]() {
			ll.text = '${m.element} L${m.level}'
		}
	}
	if mut l := b.info.find('InfoStats') {
		if mut ll := l.get_component[render.Label]() {
			ll.text = 'HP ${int(m.max_hp)}   DMG ${int(m.damage)}   SPD ${m.atk_speed:.1f}'
		}
	}
	if mut l := b.info.find('InfoNext') {
		if mut ll := l.get_component[render.Label]() {
			if m.level >= 10 {
				ll.text = 'MAX LEVEL - merge for bonus coins'
			} else {
				ed := element_data(m.element)
				mult := level_mult(m.level + 1)
				ll.text = 'NEXT L${m.level + 1}: HP ${int(ed.hp * mult)}  DMG ${int(ed.dmg * mult)}'
			}
		}
	}
}

fn (mut b MergeBoard) close_info() {
	if b.info != unsafe { nil } {
		b.info.active = false
	}
}

// ---------------------------------------------------------------------------
// Gems — premium currency (boss kills +5, wins +3) and global attribute
// upgrades bought with gems. Attributes apply to ALL player units.
// ---------------------------------------------------------------------------
fn (mut b MergeBoard) add_gems(n int) {
	mut st := b.scene().store
	st.set_int('gems', st.get_int('gems', 0) + n)
}

fn (mut b MergeBoard) spend_gems(n int) bool {
	mut st := b.scene().store
	g := st.get_int('gems', 0)
	if g < n {
		return false
	}
	st.set_int('gems', g - n)
	return true
}

fn (b &MergeBoard) attr_lv(key string) int {
	return b.scene().store.get_int(key, 0)
}

fn coin_mult(st &core.Store) f32 {
	return 1.0 + 0.1 * f32(st.get_int('attr_coin', 0))
}

// apply_attrs — re-derives a player unit's stats from element + level + gem
// attributes (keeps the current HP fraction).
fn (mut b MergeBoard) apply_attrs(mut m &Monster) {
	ed := element_data(m.element)
	mult := level_mult(m.level)
	ratio := if m.max_hp > 0 { m.hp / m.max_hp } else { f32(1) }
	hp := ed.hp * mult * (1.0 + 0.1 * f32(b.attr_lv('attr_hp')))
	dmg := ed.dmg * mult * (1.0 + 0.1 * f32(b.attr_lv('attr_dmg')))
	mut spd := ed.spd * (1.0 - 0.04 * f32(b.attr_lv('attr_spd')))
	if spd < 0.4 {
		spd = 0.4
	}
	m.max_hp = hp
	m.damage = dmg
	m.atk_speed = spd
	m.crit = 0.05 + 0.05 * f32(b.attr_lv('attr_crit'))
	if m.crit > 0.6 {
		m.crit = 0.6
	}
	m.hp = m.max_hp * ratio
}

// level_up_unit — gem upgrade: +1 level, re-stats, new art, tag update.
fn (mut b MergeBoard) level_up_unit(mut u &core.Node) bool {
	mut m := u.get_component[Monster]() or { return false }
	if m.level >= 10 {
		return false
	}
	m.level++
	b.apply_attrs(mut m)
	if mut sp := u.get_component[render.Sprite]() {
		sp.texture = monster_tex(m.element, m.level)
	}
	set_level_tag(u, m.level)
	return true
}

// upgrade_attr — gem upgrade of a global attribute; refreshes all player units.
fn (mut b MergeBoard) upgrade_attr(key string, cost int) bool {
	if !b.spend_gems(cost) {
		return false
	}
	mut st := b.scene().store
	lv := st.get_int(key, 0)
	if lv < 10 {
		st.set_int(key, lv + 1)
	}
	for mut u in b.units {
		if u == unsafe { nil } {
			continue
		}
		if mut m := u.get_component[Monster]() {
			if m.side == 0 && m.alive {
				b.apply_attrs(mut m)
			}
		}
	}
	return true
}

// sell_unit — sell a player unit back for coins (refund grows with level).
fn (mut b MergeBoard) sell_unit(mut u &core.Node) int {
	mut m := u.get_component[Monster]() or { return 0 }
	if m.side != 0 || !m.alive {
		return 0
	}
	refund := 50 + m.level * 10
	b.remove_unit(mut u)
	mut st := b.scene().store
	st.set_int('coins', st.get_int('coins', 200) + refund)
	auto_save_team(mut st, b.units)
	b.refresh_coin_label()
	return refund
}

// hybrid_of — cross-element fusion: two DIFFERENT elements of the SAME level
// fuse into a unique warrior (like the reference game). '' = no combo.
fn hybrid_of(e1 string, e2 string) string {
	a := if e1 < e2 { e1 } else { e2 }
	b := if e1 < e2 { e2 } else { e1 }
	return match '${a}_${b}' {
		'fire_water' { 'steam' }
		'earth_fire' { 'lava' }
		'fire_wind' { 'ember' }
		'earth_water' { 'mud' }
		'water_wind' { 'mist' }
		'earth_wind' { 'dust' }
		else { '' }
	}
}

fn (mut b MergeBoard) remove_unit(mut u &core.Node) {
	if mut m := u.get_component[Monster]() {
		m.alive = false
		m.cell = -1
	}
	mut idx := -1
	for i, x in b.units {
		if x == u {
			idx = i
			break
		}
	}
	if idx >= 0 {
		b.units.delete(idx)
	}
	render.fade_to(mut u, 0, 0.2, .quad_in)
	u.tween().scale_to(core.vec2(0.1, 0.1), 0.2, .quad_in).call(fn [u] () {
		mut nn := unsafe { u }
		nn.destroy()
	})
}

fn (b &MergeBoard) player_units() []&core.Node {
	mut out := []&core.Node{}
	for u in b.units {
		if u == unsafe { nil } {
			continue
		}
		if mut m := u.get_component[Monster]() {
			if m.alive {
				out << u
			}
		}
	}
	return out
}

fn (mut b MergeBoard) add_coins(v int) {
	mut st := b.scene().store
	st.set_int('coins', st.get_int('coins', 200) + v)
	b.refresh_coin_label()
}

fn (mut b MergeBoard) refresh_coin_label() {
	if mut c := b.scene().root.find('CoinLabel') {
		if mut l := c.get_component[render.Label]() {
			l.text = 'Coins: ${b.scene().store.get_int('coins', 200)}'
		}
	}
	b.refresh_power_label()
}

// refresh_power_label — total team strength (HP + DMG summed), like the
// reference game's army power readout.
fn (mut b MergeBoard) refresh_power_label() {
	mut hp := 0
	mut dmg := 0
	for u in b.units {
		if u == unsafe { nil } {
			continue
		}
		if mut m := u.get_component[Monster]() {
			if m.side == 0 && m.alive {
				hp += int(m.max_hp)
				dmg += int(m.damage)
			}
		}
	}
	if mut c := b.scene().root.find('PowerLabel') {
		if mut l := c.get_component[render.Label]() {
			l.text = 'Power: ${hp + dmg}'
		}
	}
}

fn (mut b MergeBoard) toast(text string) {
	mut t := b.scene().root.find('Toast') or { return }
	if mut l := t.get_component[render.Label]() {
		l.text = text
		l.color = core.rgba(255, 235, 140, 255)
	}
	t.active = true
	t.scale = core.vec2(0.8, 0.8)
	t.kill_tweens()
	t.tween().scale_to(core.vec2(1, 1), 0.15, .back_out).wait(0.7).call(fn [t] () {
		mut tt := unsafe { t }
		tt.active = false
	})
}

// ===========================================================================
// BattleController â€” waves, unit movement, melee combat, win/lose.
// ===========================================================================
pub struct BattleController {
	core.Component
pub mut:
	level   int
	enemies []&core.Node
	wave    int
	state   string = 'idle' // idle | fighting | won | lost
	battle_on bool // the battle banner was tapped
	board   &MergeBoard = unsafe { nil }
	banner_timer f32 @[hide]
}

pub fn (mut c BattleController) start() {
	init_game_data()
	mut sroot := c.scene().root
	setup_sfx(mut sroot)
	ensure_music(mut sroot)
	c.level = c.scene().store.get_int('current_level', 1)
	if mut b := c.scene().root.get_component[MergeBoard]() {
		c.board = b
	}
	if mut ui := c.scene().root.get_component[BattleUI]() {
		ui.level = c.level
	}
	c.build_hud()
	c.refresh_wave_label()
}

fn (mut c BattleController) build_hud() {
	mut root := c.scene().root
	// the stone arena map, like the reference game (6x12 grid board)
	mut bg := core.Node.new('BoardBG')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('back/board.png')
			size:    core.vec2(540, 1086)
		})
	bg.position = core.vec2(270, 470)
	bg.z_index = 0
	root.add_child(mut bg)
	mut lvl := core.Node.new('LevelLabel')
		.with(&render.Label{
			text:  'Level ${c.level}'
			size:  28
			align: 'center'
			color: core.rgba(255, 230, 140, 255)
		})
	lvl.position = core.vec2(270, 50)
	lvl.z_index = 20
	root.add_child(mut lvl)
	mut coin := core.Node.new('CoinLabel')
		.with(&render.Label{
			text:  'Coins: ${c.scene().store.get_int('coins', 200)}'
			size:  21
			align: 'center'
			color: core.rgba(255, 220, 90, 255)
		})
	coin.position = core.vec2(270, 90)
	coin.z_index = 20
	root.add_child(mut coin)
	mut gem := core.Node.new('GemLabel')
		.with(&render.Label{
			text:  'Gems: ${c.scene().store.get_int('gems', 0)}'
			size:  19
			align: 'center'
			color: core.rgba(120, 220, 255, 255)
		})
	gem.position = core.vec2(270, 118)
	gem.z_index = 20
	root.add_child(mut gem)
	mut pwr := core.Node.new('PowerLabel')
		.with(&render.Label{
			text:  'Power: 0'
			size:  17
			align: 'center'
			color: core.rgba(255, 190, 90, 255)
		})
	pwr.position = core.vec2(270, 146)
	pwr.z_index = 20
	root.add_child(mut pwr)
	// gems start at 20 on first ever load
	if c.scene().store.get_int('gems', -1) < 0 {
		mut st0 := c.scene().store
		st0.set_int('gems', 20)
	}
	mut toast := core.Node.new('Toast')
		.with(&render.Label{
			text:  ''
			size:  23
			align: 'center'
			color: core.rgba(255, 235, 140, 255)
		})
	toast.position = core.vec2(270, 470)
	toast.z_index = 26
	toast.active = false
	root.add_child(mut toast)
}

fn (mut c BattleController) over() bool {
	return c.state == 'won' || c.state == 'lost'
}

fn (mut c BattleController) fighting() bool {
	return c.state == 'fighting'
}

fn (mut c BattleController) update(dt f32) {
	if c.board == unsafe { nil } || !c.board.ready {
		return // the board and its start units must exist first
	}
	if c.state != 'fighting' {
		// idle: units walk back to their cells, and the banner reappears (with a short delay)
		if c.state == 'idle' && c.board != unsafe { nil } {
			mut ps := c.board.player_units()
			for mut u in ps {
				if mut m := u.get_component[Monster]() {
					if u.position.distance(m.home) > 3 {
						dir := (m.home - u.position).normalized()
						u.position = u.position + dir.mul(m.m_speed(m.speed) * dt)
					} else {
						u.position = m.home
					}
				}
			}
			if c.banner_timer > 0 {
				c.banner_timer -= dt
				if c.banner_timer <= 0 {
					if mut ui := c.scene().root.get_component[BattleUI]() {
						ui.show_banner()
					}
				}
			}
		}
		return
	}
	// --- enemies walk down and attack player units (melee or ranged) ---
	for mut e in c.enemies {
		if e == unsafe { nil } {
			continue
		}
		if mut m := e.get_component[Monster]() {
			if !m.alive {
				continue
			}
			// status ticks (burn/poison/regen) + stun/freeze timers
			if m.tick_status(dt) {
				kill_unit(c, mut e, mut m)
				continue
			}
			refresh_status_icons(m)
			// stunned or frozen: skip the whole turn
			if m.m_stunned() {
				continue
			}
			players := c.board.player_units()
			if players.len == 0 {
				break
			}
			mut target := nearest_of(players, e.position)
			if target == unsafe { nil } {
				continue
			}
			stop_at := if m.ranged { m.range } else { f32(68) }
			dist := e.position.distance(target.position)
			if m.is_boss {
				if mut k2d := e.get_component[kine2d.Kine2D]() {
					mut clip := 'Idle'
					if dist > stop_at {
						clip = 'Move'
					} else if m.cooldown <= 0.25 {
						clip = 'Attack'
					}
					if !m.alive {
						clip = 'Death'
					}
					if k2d.animation != clip {
						k2d.animation = clip
						k2d.time = 0
					}
				}
			}
			if dist > stop_at {
				dir := (target.position - e.position).normalized()
				e.position = e.position + dir.mul(m.m_speed(m.speed) * dt)
			} else {
				m.cooldown -= dt
				if m.cooldown <= 0 {
					m.cooldown = m.atk_speed
					dmgt := m.damage * m.m_damage_mult()
					if m.is_boss {
						mut ts := nearest_three(players, e.position)
						for mut t in ts {
							c.fire_projectile(e.position, t.position, projectile_tex('enemy'), dmgt,
								mut t, m.crit, m.skill)
						}
					} else if m.ranged {
						c.fire_projectile(e.position, target.position, projectile_tex('enemy'), dmgt,
							mut target, m.crit, if m.skill != '' { m.skill } else { '' })
					} else {
						damage_unit(c, mut target, dmgt, m.crit, if m.skill != '' { m.skill } else { '' })
						impact_fx(c, projectile_tex('enemy'), target.position)
					}
				}
			}
		}
	}
	c.enemies = c.enemies.filter(fn [c] (e &core.Node) bool {
		if e == unsafe { nil } {
			return false
		}
		if mut m := e.get_component[Monster]() {
			return m.alive
		}
		return true
	})
	// --- player units walk up and attack enemies (melee or ranged) ---
	mut players := c.board.player_units()
	for mut u in players {
		if mut m := u.get_component[Monster]() {
			if m.tick_status(dt) {
				kill_unit(c, mut u, mut m)
				continue
			}
			refresh_status_icons(m)
			if m.m_stunned() {
				continue
			}
			mut target := nearest_enemy(c)
			if target == unsafe { nil } {
				continue
			}
			stop_at := if m.ranged { m.range } else { f32(68) }
			dist := u.position.distance(target.position)
			if dist > stop_at {
				dir := (target.position - u.position).normalized()
				u.position = u.position + dir.mul(m.m_speed(m.speed) * dt)
			} else {
				m.cooldown -= dt
				if m.cooldown <= 0 {
					m.cooldown = m.atk_speed
					dmgt := m.damage * m.m_damage_mult()
					if m.ranged {
						c.fire_projectile(u.position, target.position, projectile_tex(m.element), dmgt,
							mut target, m.crit, element_data(m.element).skill)
					} else {
						damage_unit(c, mut target, dmgt, m.crit, element_data(m.element).skill)
						impact_fx(c, projectile_tex(m.element), target.position)
					}
				}
			}
		}
	}
	// wave cleared: idle again; the battle banner reappears after a short delay
	def := level_def(c.level)
	if c.enemies.len == 0 && c.wave < def.waves.len && c.state == 'fighting' {
		c.state = 'idle'
		c.banner_timer = 1.2
	}
	// win / lose
	if c.board.player_units().len == 0 {
		c.lose()
		return
	}
	if c.enemies.len == 0 && c.wave >= def.waves.len {
		c.win()
	}
}

fn (mut u BattleUI) show_banner() {
	if u.banner != unsafe { nil } {
		u.banner.active = true
	}
	if mut ub := u.scene().root.find('UpgradeBtn') {
		ub.active = true // upgrade is only visible between waves
	}
	if mut tb := u.scene().root.find('TeamBtn') {
		tb.active = true
	}
	if mut cb := u.scene().root.find('ChestBtn') {
		cb.active = true // a free chest every wave
	}
}

fn nearest_three(nodes []&core.Node, from core.Vec2) []&core.Node {
	mut ts := []&core.Node{}
	mut chosen := []int{}
	for _ in 0 .. 3 {
		mut best := -1
		mut bd := 999999.0
		for i, n in nodes {
			if n == unsafe { nil } {
				continue
			}
			if chosen.contains(i) {
				continue
			}
			d := n.position.distance(from)
			if d < bd {
				bd = d
				best = i
			}
		}
		if best >= 0 {
			chosen << best
			ts << nodes[best]
		}
	}
	return ts
}

fn nearest_of(nodes []&core.Node, from core.Vec2) &core.Node {
	mut best := unsafe { nil }
	mut bd := 999999.0
	for n in nodes {
		if n == unsafe { nil } {
			continue
		}
		d := n.position.distance(from)
		if d < bd {
			bd = d
			best = n
		}
	}
	return best
}

fn nearest_enemy(c &BattleController) &core.Node {
	mut best := unsafe { nil }
	mut bd := 999999.0
	center := core.vec2(270, 600)
	for e in c.enemies {
		if e == unsafe { nil } {
			continue
		}
		if mut m := e.get_component[Monster]() {
			if !m.alive {
				continue
			}
			d := e.position.distance(center)
			if d < bd {
				bd = d
				best = e
			}
		}
	}
	return best
}

fn damage_unit(c &BattleController, mut target &core.Node, dmg f32, crit f32, skill string) {
	if mut m := target.get_component[Monster]() {
		if !m.alive {
			return
		}
		mut hit := if rand.f32() < crit { dmg * 2 } else { dmg }
		hit = m.absorb_shield(hit)
		if hit <= 0 {
			damage_popup(c, target.position, 0, false)
			if skill != '' {
				apply_skill_effect(mut m, skill)
			}
			return
		}
		m.hp -= hit
		refresh_hp_bar(m)
		damage_popup(c, target.position, int(hit), m.side == 1)
		if skill != '' {
			apply_skill_effect(mut m, skill)
		}
		if m.hp <= 0 {
			kill_unit(c, mut target, mut m)
		}
	}
}

// apply_skill_effect — burn/poison = damage over time, stun/freeze = cannot act,
// weak/slow = debuffs, atk_up = buff, shield = absorb, regen = heal over time.
fn apply_skill_effect(mut m Monster, skill string) {
	sd := skill_data(skill)
	if sd.effect == '' || sd.effect == 'none' {
		return
	}
	ed := effect_data(sd.effect)
	match ed.effect_type {
		'burn' {
			m.burn_dps = ed.value
			m.burn_left = if ed.duration > 0 { ed.duration } else { 3 }
		}
		'poison' {
			m.poison_dps = ed.value
			m.poison_left = if ed.duration > 0 { ed.duration } else { 4 }
		}
		'stun' {
			m.stun_left = if ed.value > 0 { ed.value } else { 1 }
		}
		'freeze' {
			m.freeze_left = if ed.value > 0 { ed.value } else { 1.5 }
		}
		'slow' {
			m.slow_left = if ed.duration > 0 { ed.duration } else { 2.5 }
		}
		'weak' {
			m.weak_left = if ed.duration > 0 { ed.duration } else { 3 }
		}
		'atk_up' {
			m.atk_left = if ed.duration > 0 { ed.duration } else { 5 }
		}
		'shield' {
			m.shield += if ed.value > 0 { ed.value } else { 50 }
		}
		'regen' {
			m.regen_per_s = ed.value
			m.regen_left = if ed.duration > 0 { ed.duration } else { 4 }
		}
		else {}
	}
}

// fire_projectile â€” a ranged attack: a projectile flies to the target, then the damage lands.
fn (mut c BattleController) fire_projectile(from core.Vec2, to core.Vec2, tex assets.AssetRef[assets.Texture], dmg f32, mut target &core.Node, crit f32, skill string) {
	if target == unsafe { nil } {
		return
	}
	mut root := c.scene().root
	mut proj := core.Node.new('Proj')
		.with(&render.Sprite{ texture: tex, size: core.vec2(24, 24) })
	proj.position = from
	proj.z_index = 9
	root.add_child(mut proj)
	dist := from.distance(to)
	mut dur := f32(0.2 + 0.5 * (dist / 500.0))
	if dur > 0.7 {
		dur = 0.7
	}
	proj.tween().move_to(to, dur, .linear).call(fn [proj, target, dmg, crit, c, skill] () {
		mut p := unsafe { proj }
		p.destroy()
		mut t := unsafe { target }
		if mut m := t.get_component[Monster]() {
			if !m.alive {
				return
			}
			mut hit := if rand.f32() < crit { dmg * 2 } else { dmg }
			hit = m.absorb_shield(hit)
			if hit <= 0 {
				damage_popup(c, t.position, 0, false)
				if skill != '' {
					apply_skill_effect(mut m, skill)
				}
				return
			}
			m.hp -= hit
			refresh_hp_bar(m)
			damage_popup(c, t.position, int(hit), m.side == 1)
			if skill != '' {
				apply_skill_effect(mut m, skill)
			}
			if m.hp <= 0 {
				kill_unit(c, mut t, mut m)
			}
		}
	})
}

// kill_unit â€” a unit died: coin reward for enemy kills, particles, and removal from the right list.
fn kill_unit(c &BattleController, mut target &core.Node, mut m &Monster) {
	m.alive = false
	m.cell = -1
	if m.side == 1 {
		mut cc := unsafe { c }
		mut st := cc.scene().store
		st.set_int('coins', st.get_int('coins', 200) + int(f32(m.kill_coins) * coin_mult(st)))
		if m.is_boss {
			st.set_int('gems', st.get_int('gems', 0) + 5) // boss kill: +5 gems
		}
		if cc.board != unsafe { nil } {
			mut b := cc.board
			b.refresh_coin_label()
		}
		mut root := cc.scene().root
		particle_burst_tag(mut root, target.position, 'kill')
		sfx_play_scene(cc.scene(), 'audio/coin.wav')
		if m.is_boss {
			particle_burst_tag(mut root, target.position, 'boss_death')
			sfx_play_scene(cc.scene(), 'audio/boss_hit.wav')
		}
	} else {
		mut cc := unsafe { c }
		if cc.board != unsafe { nil } {
			mut b := cc.board
			b.remove_unit(mut target)
			return // remove_unit fades + destroys
		}
	}
	render.fade_to(mut target, 0, 0.25, .quad_in)
	target.tween().scale_to(core.vec2(0.1, 0.1), 0.25, .quad_in).call(fn [target] () {
		mut tt := unsafe { target }
		tt.destroy()
	})
	mut cc := unsafe { c }
	cc.enemies = cc.enemies.filter(it != target)
}

// particle_burst â€” a one-shot particle effect (spawn / merge / level-up / confetti).
fn particle_burst(mut root &core.Node, at core.Vec2, tex assets.AssetRef[assets.Texture], count int, size f32, spd f32, lifetime f32) {
	mut fx := core.Node.new('FX')
		.with(&render.ParticleSystem{
			texture:      tex
			rate:         0
			burst:        count
			looping:      false
			lifetime:     lifetime
			lifetime_var: 0.18
			speed:        spd
			speed_var:    spd * 0.4
			spread:       360
			damping:      2
			start_size:   size
			end_size:     size * 0.3
			spin:         240
			random_angle: true
			additive:     true
			auto_destroy: true
		})
	fx.position = at
	fx.z_index = 10
	root.add_child(mut fx)
}

// particle_burst_tag — one-shot burst using a named preset from game data.
fn particle_burst_tag(mut root &core.Node, at core.Vec2, tag string) {
	pd := particle_data(tag)
	tex := assets.ref[assets.Texture](pd.texture)
	particle_burst(mut root, at, tex, pd.count, pd.size, pd.speed, pd.lifetime)
}

// impact_fx â€” a quick hit flash on the target.
fn impact_fx(c &BattleController, tex assets.AssetRef[assets.Texture], at core.Vec2) {
	mut root := c.scene().root
	mut fx := core.Node.new('Impact')
		.with(&render.Sprite{ texture: tex, size: core.vec2(36, 36) })
	fx.position = at
	fx.z_index = 9
	root.add_child(mut fx)
	fx.scale = core.vec2(0.6, 0.6)
	fx.tween().scale_to(core.vec2(1.5, 1.5), 0.18, .quad_out).call(fn [fx] () {
		mut f := unsafe { fx }
		f.destroy()
	})
}

// damage_popup — floating damage number rendered by the game itself.
fn damage_popup(c &BattleController, at core.Vec2, amount int, enemy_hit bool) {
	mut root := c.scene().root
	big := amount >= 25
	mut l := core.Node.new('Dmg')
		.with(&render.Label{
			text:  if big { 'CRIT -${amount}' } else { '-${amount}' }
			size:  if big { 26 } else { 17 }
			align: 'center'
			color: if enemy_hit { core.rgba(255, 224, 102, 255) } else { core.rgba(255, 106, 90, 255) }
		})
	l.position = at
	l.z_index = 45
	root.add_child(mut l)
	l.tween().move_to(at + core.vec2(0, if big { -56 } else { -40 }), 0.6, .quad_out).call(fn [l] () {
		mut ll := unsafe { l }
		ll.destroy()
	})
}

fn (mut c BattleController) spawn_wave() {
	if c.over() {
		return
	}
	def := level_def(c.level)
	if c.wave >= def.waves.len {
		return
	}
	w := def.waves[c.wave]
	c.wave++
	c.state = 'fighting'
	cols := [f32(94), 188, 282, 376, 470]
	mut idx := 0
	for _ in 0 .. w.count {
		row := (idx / 5) % 4
		col := idx % 5
		mut pos := core.vec2(cols[col], f32(180 + row * 85))
		if w.boss {
			pos = core.vec2(270, 320) // boss centered, pulled down (body sits lower)
		}
		mut root := c.scene().root
		boss := w.boss
		bdef := if boss { boss_for_level(c.level) } else { BossData{} }
		tex := if boss { bdef.tex } else { enemy_tex(w.mtype) }
		sz := if boss {
			es := enemy_size(5)
			core.vec2(es.x * bdef.size_scale, es.y * bdef.size_scale)
		} else {
			enemy_size(w.mtype)
		}
		mut n := core.Node.new('Enemy')
		if boss {
			// boss uses Velo's Kine2D component (rig converted from the .kine)
			n = n.with(&kine2d.Kine2D{
				data:        assets.ref[assets.TextAsset]('Kine/pixelforge-nhan-vat-1-auto-rig_v4.skel.json')
				atlas:       assets.ref[assets.TextAsset]('Kine/pixelforge-nhan-vat-1-auto-rig_v4.atlas.json')
				animation:   'Move'
				looping:     true
				playing:     true
				canvas_size: core.vec2(960, 600)
			})
			n.scale = core.vec2(1.0, 1.0) // 0.45 is baked in the skel — node scale 1
		} else {
			n = n.with(&render.Sprite{
				texture: assets.ref[assets.Texture](tex)
				size:    sz
				color:   enemy_tint(w.mtype)
			})
		}
		n.position = pos
		n.z_index = 4
		root.add_child(mut n)
		particle_burst_tag(mut root, pos, 'spawn')
		if boss {
			sfx_play_scene(c.scene(), 'audio/boss.wav')
		}
		base := enemy_base(w.mtype)
		mult := level_mult(w.level)
		mut mhp := base.hp * mult
		mut mdmg := base.dmg * mult
		mut mspd := base.spd
		mut mrng := enemy_range(w.mtype)
		mut bid := -1
		if boss {
			bid = boss_index(c.level)
			mhp *= bdef.hp_mult
			mdmg *= bdef.dmg_mult
			mspd = bdef.spd
			mrng = 320
		}
		n.add_component(&Monster{
			element:   'enemy'
			level:     w.level
			side:      1
			max_hp:    mhp
			damage:    mdmg
			atk_speed: mspd
			cooldown:  mspd
			speed:     if boss { f32(30) } else { f32(44) }
			ranged:    boss || enemy_ranged(w.mtype)
			range:     mrng
			is_boss:   boss
			boss_id:   bid
			skill:     if boss { bdef.skill } else { '' }
		})
		make_hp_bar(mut n, if boss { f32(90) } else { f32(30) }, if boss { f32(-170) } else { f32(-30) })
		make_level_tag(mut n, if boss { f32(-186) } else { f32(-38) })
		make_status_icons(mut n, if boss { f32(-200) } else { f32(-50) })
		if boss {
			if mut tag := n.find('LvTag') {
				if mut l := tag.get_component[render.Label]() {
					l.text = bdef.name
					l.color = core.rgba(255, 80, 80, 255)
					l.size = 22
				}
			}
		} else {
			set_level_tag(n, w.level)
		}
		n.scale = core.vec2(0.7, 0.7)
		if boss {
			n.tween().scale_to(core.vec2(1.0, 1.0), 0.3, .elastic_out) // full size
		} else {
			n.tween().scale_to(core.vec2(1, 1), 0.3, .elastic_out)
		}
		c.enemies << n
		particle_burst_tag(mut root, pos, 'spawn')
		idx++
	}
	c.refresh_wave_label()
}

fn (mut c BattleController) refresh_wave_label() {
	def := level_def(c.level)
	mut wl := c.scene().root.find('WaveLabel')
	if wl == none {
		mut root := c.scene().root
		mut nn := core.Node.new('WaveLabel')
			.with(&render.Label{
				text:  ''
				size:  19
				align: 'center'
				color: core.rgba(255, 255, 255, 230)
			})
		nn.position = core.vec2(270, 175)
		nn.z_index = 20
		root.add_child(mut nn)
		wl = root.find('WaveLabel')
	}
	if mut l := (wl or { return }).get_component[render.Label]() {
		l.text = if c.state == 'idle' {
			if c.wave < def.waves.len {
				w := def.waves[c.wave]
				boss := if w.boss { ' - BOSS!' } else { '' }
				'Wave ${c.wave + 1}/${def.waves.len} - ${w.count} enemies${boss} - tap the banner'
			} else {
				'Wave ${c.wave}/${def.waves.len} - tap the banner'
			}
		} else {
			'Wave ${c.wave}/${def.waves.len} - fight!'
		}
	}
}

fn (mut c BattleController) start_battle() {
	if c.over() {
		return
	}
	c.battle_on = true
	c.spawn_wave()
	c.refresh_wave_label()
}

fn (mut c BattleController) win() {
	if c.state == 'won' {
		return
	}
	c.state = 'won'
	sfx_play_scene(c.scene(), 'audio/win.wav')
	def := level_def(c.level)
	reward := def.reward
	mut st := c.scene().store
	st.set_int('coins', st.get_int('coins', 200) + reward)
	if c.level >= st.get_int('unlocked', 1) {
		st.set_int('unlocked', c.level + 1)
	}
	if c.board != unsafe { nil } {
		c.board.refresh_coin_label()
	}
	mut root := c.scene().root
	particle_burst_tag(mut root, core.vec2(270, 400), 'win')
	if mut ui := c.scene().root.get_component[BattleUI]() {
		ui.show_victory(reward)
	}
}

fn (mut c BattleController) lose() {
	if c.state == 'lost' {
		return
	}
	c.state = 'lost'
	sfx_play_scene(c.scene(), 'audio/lose.wav')
	if mut ui := c.scene().root.get_component[BattleUI]() {
		ui.show_fail()
	}
}

// ===========================================================================
// BattleUI â€” back, battle banner (disappears on tap), upgrade panel, overlays.
// ===========================================================================
pub struct BattleUI {
	core.Component
pub mut:
	level      int
	banner     &core.Node = unsafe { nil }
	panel      &core.Node = unsafe { nil }
	panel_rows []&core.Node
	overlays   &core.Node = unsafe { nil }
	victory_n  &core.Node = unsafe { nil }
	fail_n     &core.Node = unsafe { nil }
	panel_open bool @[hide]
	// team & attributes panel (gems)
	team_tab    int = 0 // 0 = team table, 1 = attributes table
	team_panel  &core.Node = unsafe { nil }
	team_rows   []&core.Node
}

fn (mut u BattleUI) start() {
	u.build_back()
	u.build_banner()
	u.build_upgrade_panel()
	u.build_team_panel()
	u.build_overlays()
}

fn (mut u BattleUI) build_back() {
	mut root := u.scene().root
	mut back := core.Node.new('BackBtn')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/close.png')
			size:    core.vec2(56, 61)
		})
		.with(&render.Button{})
	back.position = core.vec2(38, 55)
	back.z_index = 25
	root.add_child(mut back)
}

fn (mut u BattleUI) build_banner() {
	mut root := u.scene().root
	mut banner := core.Node.new('BattleBanner')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/battlebtn.png')
			size:    core.vec2(200, 101)
		})
		.with(&render.Button{})
	banner.position = core.vec2(270, 470)
	banner.z_index = 24
	root.add_child(mut banner)
	u.banner = banner
}

// ---------------------------------------------------------------------------
// Upgrade panel: opens when the battle banner is tapped (the banner hides).
// One row per player unit with level/damage/hp upgrade buttons.
// ---------------------------------------------------------------------------
fn (mut u BattleUI) build_upgrade_panel() {
	mut root := u.scene().root
	mut panel := core.Node.new('UpgradePanel')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/panel_upgrade.png')
			size:    core.vec2(390, 470)
		})
	panel.position = core.vec2(270, 490)
	panel.z_index = 40
	panel.active = false
	root.add_child(mut panel)
	u.panel = panel

	mut title := core.Node.new('PanelTitle')
		.with(&render.Label{
			text:  'UPGRADE'
			size:  26
			align: 'center'
			color: core.rgba(255, 235, 150, 255)
		})
	title.position = core.vec2(270, 470 - 190)
	title.z_index = 41
	title.active = false
	root.add_child(mut title)

	mut upbtn := core.Node.new('UpgradeBtn')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/button0.png')
			size:    core.vec2(170, 38)
		})
		.with(&render.Button{})
	upbtn.position = core.vec2(365, 105)
	upbtn.z_index = 23
	upbtn.active = false
	root.add_child(mut upbtn)
	mut uplabel := core.Node.new('UpgradeLabel')
		.with(&render.Label{
			text:  'UPGRADE'
			size:  17
			align: 'center'
			color: core.rgba(255, 255, 255, 255)
		})
	uplabel.position = core.vec2(0, 0)
	uplabel.z_index = 24
	upbtn.add_child(mut uplabel)

	mut close := core.Node.new('PanelClose')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/close.png')
			size:    core.vec2(34, 37)
		})
		.with(&render.Button{})
	close.position = core.vec2(270 + 160, 470 - 190)
	close.z_index = 41
	close.active = false
	root.add_child(mut close)
}

fn (mut u BattleUI) open_panel() {
	board := u.scene().root.get_component[MergeBoard]() or { return }
	u.panel_open = true
	u.panel.active = true
	if mut t := u.scene().root.find('PanelTitle') {
		t.active = true
	}
	if mut c := u.scene().root.find('PanelClose') {
		c.active = true
	}
	// rebuild rows from the current units
	for mut r in u.panel_rows {
		if r != unsafe { nil } {
			r.destroy()
		}
	}
	u.panel_rows.clear()
	units := board.player_units()
	top := 470 - 130
	for i, uu in units {
		if i >= 5 {
			break
		}
		row := u.build_row(uu, top + i * 74)
		u.panel_rows << row
	}
}

fn (mut u BattleUI) build_row(uu &core.Node, y f32) &core.Node {
	mut root := u.scene().root
	m := uu.get_component[Monster]() or {
		mut dummy := core.Node.new('Row')
		dummy.position = core.vec2(0, 0)
		dummy.active = false
		return dummy
	}
	mut row := core.Node.new('Row')
	row.position = core.vec2(0, 0)
	row.z_index = 41
	root.add_child(mut row)

	mut icon := core.Node.new('RIcon')
		.with(&render.Sprite{
			texture: monster_tex(m.element, m.level)
			size:    monster_size(m.element, m.level)
		})
	icon.position = core.vec2(55, y)
	icon.z_index = 42
	row.add_child(mut icon)

	mut info := core.Node.new('RInfo')
		.with(&render.Label{
			text:  '${m.element} L${m.level}  HP ${int(m.hp)}/${int(m.max_hp)}  DMG ${int(m.damage)}  AS ${int(m.atk_speed * 10) / 10}'
			size:  15
			align: 'left'
			color: core.rgba(230, 235, 255, 255)
		})
	info.position = core.vec2(100, y - 24)
	info.z_index = 42
	row.add_child(mut info)

	// three small buttons: level up, damage, hp
	mut blv := core.Node.new('BLv')
		.with(&render.UITransform{ size: core.vec2(74, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(150, 60, 40, 255), radius: 6 })
		.with(&render.Button{})
	blv.position = core.vec2(105, y + 14)
	blv.z_index = 42
	row.add_child(mut blv)
	mut llv := core.Node.new('LLv')
		.with(&render.Label{ text: 'LV ${80 * m.level}', size: 14, align: 'center', color: core.rgba(255, 255, 255, 255) })
	llv.position = core.vec2(0, 0)
	llv.z_index = 43
	blv.add_child(mut llv)

	mut bd := core.Node.new('BDmg')
		.with(&render.UITransform{ size: core.vec2(74, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(60, 110, 170, 255), radius: 6 })
		.with(&render.Button{})
	bd.position = core.vec2(167, y + 14)
	bd.z_index = 42
	row.add_child(mut bd)
	mut ld := core.Node.new('LDmg')
		.with(&render.Label{ text: 'DMG 60', size: 14, align: 'center', color: core.rgba(255, 255, 255, 255) })
	ld.position = core.vec2(0, 0)
	ld.z_index = 43
	bd.add_child(mut ld)

	mut bh := core.Node.new('BHp')
		.with(&render.UITransform{ size: core.vec2(74, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(50, 140, 80, 255), radius: 6 })
		.with(&render.Button{})
	bh.position = core.vec2(229, y + 14)
	bh.z_index = 42
	row.add_child(mut bh)
	mut lh := core.Node.new('LHp')
		.with(&render.Label{ text: 'HP 60', size: 13, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lh.position = core.vec2(0, 0)
	lh.z_index = 43
	bh.add_child(mut lh)

	mut bs := core.Node.new('BSpd')
		.with(&render.UITransform{ size: core.vec2(60, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(180, 130, 50, 255), radius: 6 })
		.with(&render.Button{})
	bs.position = core.vec2(291, y + 14)
	bs.z_index = 42
	row.add_child(mut bs)
	mut ls := core.Node.new('LSpd')
		.with(&render.Label{ text: 'SPD 50', size: 12, align: 'center', color: core.rgba(255, 255, 255, 255) })
	ls.position = core.vec2(0, 0)
	ls.z_index = 43
	bs.add_child(mut ls)

	mut bc := core.Node.new('BCrit')
		.with(&render.UITransform{ size: core.vec2(60, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(150, 40, 120, 255), radius: 6 })
		.with(&render.Button{})
	bc.position = core.vec2(353, y + 14)
	bc.z_index = 42
	row.add_child(mut bc)
	mut lc := core.Node.new('LCrit')
		.with(&render.Label{ text: 'CRT 70', size: 12, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lc.position = core.vec2(0, 0)
	lc.z_index = 43
	bc.add_child(mut lc)

	mut ba := core.Node.new('BAtk')
		.with(&render.UITransform{ size: core.vec2(54, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(40, 130, 150, 255), radius: 6 })
		.with(&render.Button{})
	ba.position = core.vec2(415, y + 14)
	ba.z_index = 42
	row.add_child(mut ba)
	mut la := core.Node.new('LAtk')
		.with(&render.Label{ text: 'AS 60', size: 11, align: 'center', color: core.rgba(255, 255, 255, 255) })
	la.position = core.vec2(0, 0)
	la.z_index = 43
	ba.add_child(mut la)
	return row
}

fn (mut u BattleUI) update(dt f32) {
	mut sc := u.scene()
	mut root := sc.root
	if mut back := root.find('BackBtn') {
		if mut bt := back.get_component[render.Button]() {
			if bt.clicked {
				sc.change_scene('scenes/map.scene', fade: 0.3)
				return
			}
		}
	}
	// battle banner: tap -> hide banner, start the fight, open the upgrade panel
	if u.banner != unsafe { nil } && u.banner.active && !u.panel_open {
		if mut bt := u.banner.get_component[render.Button]() {
			if bt.clicked {
				sfx_play_scene(sc, 'audio/click.wav')
				u.banner.active = false
				if mut ub := root.find('UpgradeBtn') {
					ub.active = false // no upgrade visible while fighting
				}
				if mut tb := root.find('TeamBtn') {
					tb.active = false
				}
				if mut cb := root.find('ChestBtn') {
					cb.active = false
				}
				if mut c := root.get_component[BattleController]() {
					c.start_battle()
				}
				u.close_panel()
				u.close_team_panel()
				particle_burst_tag(mut root, core.vec2(270, 500), 'banner')
				particle_burst_tag(mut root, core.vec2(270, 420), 'banner')
				return
			}
		}
	}
	// UPGRADE reopen button (appears after the battle starts)
	if u.panel_open == false && u.banner != unsafe { nil } {
		if mut ub := root.find('UpgradeBtn') {
			if mut bt := ub.get_component[render.Button]() {
				if bt.clicked {
					u.open_panel()
					return
				}
			}
		}
	}
	// CHEST button: free reward between waves (coins + occasional gems)
	if u.banner != unsafe { nil } && u.banner.active {
		if mut cb := root.find('ChestBtn') {
			if mut bt := cb.get_component[render.Button]() {
				if bt.clicked {
					cb.active = false
					mut st := u.scene().store
					coins := 15 + u.level * 3
					st.set_int('coins', st.get_int('coins', 200) + coins)
					gems := if rand.f32() < 0.25 { 2 } else { 0 }
					if gems > 0 {
						st.set_int('gems', st.get_int('gems', 0) + gems)
					}
					if mut b := root.get_component[MergeBoard]() {
						b.refresh_coin_label()
						if gems > 0 {
							b.toast('+${coins} coins  +${gems} gems!')
						} else {
							b.toast('+${coins} coins')
						}
					}
					u.refresh_team_gems()
					return
				}
			}
		}
	}
	// TEAM button (opens the team & attributes panel)
	if u.team_panel != unsafe { nil } && u.team_panel.active == false && u.banner != unsafe { nil } {
		if mut tb := root.find('TeamBtn') {
			if mut bt := tb.get_component[render.Button]() {
				if bt.clicked {
					u.open_team_panel()
					return
				}
			}
		}
	}
	// team panel interactions (close / tabs / row buttons)
	if u.team_panel != unsafe { nil } && u.team_panel.active {
		if mut c := root.find('TeamClose') {
			if mut bt := c.get_component[render.Button]() {
				if bt.clicked {
					u.close_team_panel()
					return
				}
			}
		}
		if mut tb := root.find('TabTeam') {
			if mut bt := tb.get_component[render.Button]() {
				if bt.clicked && u.team_tab != 0 {
					u.team_tab = 0
					u.refresh_team_rows()
					return
				}
			}
		}
		if mut tb := root.find('TabAttr') {
			if mut bt := tb.get_component[render.Button]() {
				if bt.clicked && u.team_tab != 1 {
					u.team_tab = 1
					u.refresh_team_rows()
					return
				}
			}
		}
		u.poll_team_buttons()
	}
	// upgrade panel buttons
	if u.panel_open {
		if mut c := root.find('PanelClose') {
			if mut bt := c.get_component[render.Button]() {
				if bt.clicked {
					u.close_panel()
					return
				}
			}
		}
		u.poll_panel_buttons()
	}
	if u.overlays != unsafe { nil } && u.overlays.active {
		if mut c := root.find('ContinueBtn') {
			if mut bt := c.get_component[render.Button]() {
				if bt.clicked {
					sc.change_scene('scenes/map.scene', fade: 0.3)
					return
				}
			}
		}
		if mut c := root.find('RetryBtn') {
			if mut bt := c.get_component[render.Button]() {
				if bt.clicked {
					sc.change_scene('scenes/battle.scene', fade: 0.3)
					return
				}
			}
		}
		if mut c := root.find('MapBtn') {
			if mut bt := c.get_component[render.Button]() {
				if bt.clicked {
					sc.change_scene('scenes/map.scene', fade: 0.3)
					return
				}
			}
		}
	}
}

fn (mut u BattleUI) poll_panel_buttons() {
	board := u.scene().root.get_component[MergeBoard]() or { return }
	units := board.player_units()
	// each row has BLv / BDmg / BHp buttons; apply the matching upgrade
	for i, r in u.panel_rows {
		if i >= units.len {
			break
		}
		uu := units[i]
		if mut m := uu.get_component[Monster]() {
			if mut b := r.find('BLv') {
				if mut bt := b.get_component[render.Button]() {
					if bt.clicked {
						if m.level >= 10 {
							return // max level reached; keep upgrading DMG/HP/SPD/CRIT instead
						}
						cost := 80 * m.level
						if u.spend(cost) {
							m.level++
							stats := element_stats(m.element)
							mult := level_mult(m.level)
							m.max_hp = stats.hp * mult
							m.hp = m.max_hp
							m.damage = stats.dmg * mult
							if mut bb := u.scene().root.get_component[MergeBoard]() {
								mut st2 := u.scene().store
							auto_save_team(mut st2, bb.units)
							}
							if mut s := uu.get_component[render.Sprite]() {
								s.texture = monster_tex(m.element, m.level)
								s.size = monster_size(m.element, m.level)
							}
							set_level_tag(uu, m.level)
							mut root := u.scene().root
							particle_burst_tag(mut root, uu.position, 'levelup')
			sfx_play_scene(u.scene(), 'audio/levelup.wav')
							u.open_panel() // refresh rows + coins
						}
						return
					}
				}
			}
			if mut b := r.find('BDmg') {
				if mut bt := b.get_component[render.Button]() {
					if bt.clicked {
						if u.spend(60) {
							m.damage += 6
							u.open_panel()
						}
						return
					}
				}
			}
			if mut b := r.find('BHp') {
				if mut bt := b.get_component[render.Button]() {
					if bt.clicked {
						if u.spend(60) {
							m.max_hp += 25
							m.hp += 25
							u.open_panel()
						}
						return
					}
				}
			}
			if mut b := r.find('BSpd') {
				if mut bt := b.get_component[render.Button]() {
					if bt.clicked {
						if u.spend(50) {
							m.speed += 10
							u.open_panel()
						}
						return
					}
				}
			}
			if mut b := r.find('BCrit') {
				if mut bt := b.get_component[render.Button]() {
					if bt.clicked {
						if u.spend(70) {
							m.crit = if m.crit + 0.05 > 1.0 { 1.0 } else { m.crit + 0.05 }
							u.open_panel()
						}
						return
					}
				}
			}
			if mut b := r.find('BAtk') {
				if mut bt := b.get_component[render.Button]() {
					if bt.clicked {
						if u.spend(60) {
							m.atk_speed = if m.atk_speed * 0.88 < 0.4 { 0.4 } else { m.atk_speed * 0.88 }
							if m.cooldown > m.atk_speed {
								m.cooldown = m.atk_speed
							}
							u.open_panel()
						}
						return
					}
				}
			}
		}
	}
}

fn (mut u BattleUI) spend(cost int) bool {
	mut st := u.scene().store
	coins := st.get_int('coins', 200)
	if coins < cost {
		if mut b := u.scene().root.get_component[MergeBoard]() {
			b.toast('Not enough coins!')
		}
		return false
	}
	st.set_int('coins', coins - cost)
	if mut b := u.scene().root.get_component[MergeBoard]() {
		b.refresh_coin_label()
	}
	return true
}

fn (mut u BattleUI) close_panel() {
	u.panel_open = false
	u.panel.active = false
	if mut t := u.scene().root.find('PanelTitle') {
		t.active = false
	}
	if mut c := u.scene().root.find('PanelClose') {
		c.active = false
	}
	for mut r in u.panel_rows {
		if r != unsafe { nil } {
			r.destroy()
		}
	}
	u.panel_rows.clear()
}

// ===========================================================================
// Team & Attributes panel — 2 switchable tables, upgrades cost GEMS.
// Tab 0 = TEAM (per-unit level up), Tab 1 = ATTRIBUTES (global stats).
// ===========================================================================
fn (mut u BattleUI) build_team_panel() {
	mut root := u.scene().root
	mut panel := core.Node.new('TeamPanel')
		.with(&render.UITransform{ size: core.vec2(430, 540), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(18, 14, 28, 245), radius: 14, border_width: 3, border_color: core.rgba(120, 220, 255, 255) })
	panel.position = core.vec2(270, 480)
	panel.z_index = 46
	panel.active = false
	root.add_child(mut panel)
	u.team_panel = panel

	mut t := core.Node.new('TeamTitle')
		.with(&render.Label{ text: 'TEAM & UPGRADES', size: 22, align: 'center', color: core.rgba(255, 235, 140, 255) })
	t.position = core.vec2(0, -232)
	t.z_index = 47
	panel.add_child(mut t)

	mut g := core.Node.new('TeamGems')
		.with(&render.Label{ text: 'Gems: 0', size: 18, align: 'center', color: core.rgba(120, 220, 255, 255) })
	g.position = core.vec2(0, 208)
	g.z_index = 47
	panel.add_child(mut g)

	// two tabs — as DIRECT ROOT children (nested buttons don't register clicks in
	// the web runtime; only root-level buttons like cards/banner work)
	mut tb1 := core.Node.new('TabTeam')
		.with(&render.UITransform{ size: core.vec2(160, 36), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(60, 110, 170, 255), radius: 8 })
		.with(&render.Button{})
	tb1.position = core.vec2(180, 295)
	tb1.z_index = 48
	tb1.active = false
	root.add_child(mut tb1)
	mut lb1 := core.Node.new('TabTeamLabel')
		.with(&render.Label{ text: 'TEAM', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lb1.position = core.vec2(0, 0)
	lb1.z_index = 49
	tb1.add_child(mut lb1)

	mut tb2 := core.Node.new('TabAttr')
		.with(&render.UITransform{ size: core.vec2(160, 36), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(120, 80, 40, 255), radius: 8 })
		.with(&render.Button{})
	tb2.position = core.vec2(360, 295)
	tb2.z_index = 48
	tb2.active = false
	root.add_child(mut tb2)
	mut lb2 := core.Node.new('TabAttrLabel')
		.with(&render.Label{ text: 'ATTRIBUTES', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lb2.position = core.vec2(0, 0)
	lb2.z_index = 49
	tb2.add_child(mut lb2)

	// close button — also a direct root child
	mut cl := core.Node.new('TeamClose')
		.with(&render.Sprite{ texture: assets.ref[assets.Texture]('ui/button0.png'), size: core.vec2(140, 36) })
		.with(&render.Button{})
	cl.position = core.vec2(270, 730)
	cl.z_index = 48
	cl.active = false
	root.add_child(mut cl)
	mut cll := core.Node.new('TeamCloseLabel')
		.with(&render.Label{ text: 'CLOSE', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	cll.position = core.vec2(0, 0)
	cll.z_index = 49
	cl.add_child(mut cll)

	// TEAM button (top bar, next to UPGRADE)
	mut tbtn := core.Node.new('TeamBtn')
		.with(&render.Sprite{ texture: assets.ref[assets.Texture]('ui/button0.png'), size: core.vec2(170, 38) })
		.with(&render.Button{})
	tbtn.position = core.vec2(430, 105) // top-right (next to UPGRADE), per reference layout
	tbtn.z_index = 23
	root.add_child(mut tbtn)
	mut tlbl := core.Node.new('TeamBtnLabel')
		.with(&render.Label{ text: 'TEAM', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	tlbl.position = core.vec2(0, 0)
	tlbl.z_index = 24
	tbtn.add_child(mut tlbl)

	// CHEST button — free reward between waves (coins, sometimes gems)
	mut cbtn := core.Node.new('ChestBtn')
		.with(&render.Sprite{ texture: assets.ref[assets.Texture]('ui/button0.png'), size: core.vec2(120, 38) })
		.with(&render.Button{})
	cbtn.position = core.vec2(90, 105)
	cbtn.z_index = 23
	cbtn.active = false
	root.add_child(mut cbtn)
	mut clbl2 := core.Node.new('ChestBtnLabel')
		.with(&render.Label{ text: 'CHEST', size: 15, align: 'center', color: core.rgba(255, 230, 140, 255) })
	clbl2.position = core.vec2(0, 0)
	clbl2.z_index = 24
	cbtn.add_child(mut clbl2)
}

fn (mut u BattleUI) open_team_panel() {
	if u.panel_open {
		u.close_panel()
	}
	if u.team_panel == unsafe { nil } {
		return
	}
	u.team_panel.active = true
	if mut t := u.scene().root.find('TabTeam') {
		t.active = true
	}
	if mut t := u.scene().root.find('TabAttr') {
		t.active = true
	}
	if mut t := u.scene().root.find('TeamClose') {
		t.active = true
	}
	u.refresh_team_rows()
	u.refresh_team_gems()
}

fn (mut u BattleUI) close_team_panel() {
	if u.team_panel != unsafe { nil } {
		u.team_panel.active = false
	}
	if mut t := u.scene().root.find('TabTeam') {
		t.active = false
	}
	if mut t := u.scene().root.find('TabAttr') {
		t.active = false
	}
	if mut t := u.scene().root.find('TeamClose') {
		t.active = false
	}
	// destroy EVERYTHING the panel built (buttons, rows, icons, labels) —
	// otherwise the text/icons stay on screen after closing (reported bug)
	for mut r in u.team_rows {
		if r != unsafe { nil } {
			r.destroy()
		}
	}
	u.team_rows.clear()
	mut root := u.scene().root
	for i in 0 .. 8 {
		if mut r := root.find('TRow${i}') {
			r.destroy()
		}
		if mut r := root.find('ARow${i}') {
			r.destroy()
		}
		if mut r := root.find('TInfo${i}') {
			r.destroy()
		}
		if mut r := root.find('AInfo${i}') {
			r.destroy()
		}
		if mut r := root.find('TSell${i}') {
			r.destroy()
		}
		if mut r := root.find('TSellLbl${i}') {
			r.destroy()
		}
		if mut r := root.find('TUpLbl${i}') {
			r.destroy()
		}
		if mut r := root.find('AUpLbl${i}') {
			r.destroy()
		}
	}
}

fn (mut u BattleUI) refresh_team_gems() {
	mut st := u.scene().store
	g := st.get_int('gems', 0)
	if u.team_panel != unsafe { nil } {
		if mut n := u.team_panel.find('TeamGems') {
			if mut l := n.get_component[render.Label]() {
				l.text = 'Gems: ${g}'
			}
		}
	}
	if mut n := u.scene().root.find('GemLabel') {
		if mut l := n.get_component[render.Label]() {
			l.text = 'Gems: ${g}'
		}
	}
}

fn (mut u BattleUI) refresh_team_rows() {
	// destroy previous buttons + their rows/labels (all are root children now)
	for mut r in u.team_rows {
		if r != unsafe { nil } {
			r.destroy()
		}
	}
	u.team_rows.clear()
	mut root := u.scene().root
	for i in 0 .. 8 {
		if mut r := root.find('TRow${i}') {
			r.destroy()
		}
		if mut r := root.find('ARow${i}') {
			r.destroy()
		}
		if mut r := root.find('TInfo${i}') {
			r.destroy()
		}
		if mut r := root.find('AInfo${i}') {
			r.destroy()
		}
		if mut r := root.find('TSell${i}') {
			r.destroy()
		}
		if mut r := root.find('TSellLbl${i}') {
			r.destroy()
		}
	}
	board := u.scene().root.get_component[MergeBoard]() or { return }
	if u.team_tab == 0 {
		units := board.player_units()
		for i, uu in units {
			if i >= 6 {
				break
			}
			u.team_rows << u.build_team_row(uu, i)
		}
	} else {
		keys := ['attr_hp', 'attr_dmg', 'attr_spd', 'attr_crit', 'attr_coin']
		names := ['HP +10% / level', 'DMG +10% / level', 'SPD +4% / level', 'CRIT +5% / level', 'COIN +10% / level']
		for i in 0 .. keys.len {
			u.team_rows << u.build_attr_row(keys[i], names[i], i)
		}
	}
}

fn (mut u BattleUI) build_team_row(uu &core.Node, i int) &core.Node {
	mut root := u.scene().root
	m := uu.get_component[Monster]() or {
		mut dummy := core.Node.new('Row')
		dummy.active = false
		return dummy
	}
	mut row := core.Node.new('TRow${i}')
	row.position = core.vec2(0, 0)
	row.z_index = 47
	root.add_child(mut row)
	y := f32(480 - 118 + i * 72)
	mut icon := core.Node.new('TIcon')
		.with(&render.Sprite{
			texture: monster_tex(m.element, m.level)
			size:    monster_size(m.element, m.level)
		})
	icon.position = core.vec2(140, y)
	icon.z_index = 48
	row.add_child(mut icon)
	mut info := core.Node.new('TInfo${i}')
		.with(&render.Label{
			text:  '${m.element} L${m.level}   HP ${int(m.max_hp)}  DMG ${int(m.damage)}  SPD ${m.atk_speed:.1f}'
			size:  14
			align: 'left'
			color: core.rgba(230, 235, 255, 255)
		})
	info.position = core.vec2(205, y - 16)
	info.z_index = 48
	root.add_child(mut info)
	cost := 5 + m.level * 2
	// upgrade button as a DIRECT ROOT child (nested buttons don't click in web)
	mut btn := core.Node.new('TUp${i}')
		.with(&render.UITransform{ size: core.vec2(150, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(40, 130, 180, 255), radius: 7 })
		.with(&render.Button{})
	btn.position = core.vec2(205, y + 18)
	btn.z_index = 48
	root.add_child(mut btn)
	mut lbl := core.Node.new('TUpLbl${i}')
		.with(&render.Label{ text: 'LV+  GEM ${cost}', size: 14, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lbl.position = core.vec2(0, 0)
	lbl.z_index = 49
	btn.add_child(mut lbl)
	// SELL button (buy & sell units, like the reference game)
	mut sbtn := core.Node.new('TSell${i}')
		.with(&render.UITransform{ size: core.vec2(110, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(140, 60, 50, 255), radius: 7 })
		.with(&render.Button{})
	sbtn.position = core.vec2(322, y + 18)
	sbtn.z_index = 48
	root.add_child(mut sbtn)
	mut slbl := core.Node.new('TSellLbl${i}')
		.with(&render.Label{ text: 'SELL +${50 + m.level * 10}', size: 13, align: 'center', color: core.rgba(255, 255, 255, 255) })
	slbl.position = core.vec2(0, 0)
	slbl.z_index = 49
	sbtn.add_child(mut slbl)
	return btn
}

fn (mut u BattleUI) build_attr_row(key string, name string, i int) &core.Node {
	mut root := u.scene().root
	lv := u.scene().store.get_int(key, 0)
	mut row := core.Node.new('ARow${i}')
	row.position = core.vec2(0, 0)
	row.z_index = 47
	root.add_child(mut row)
	y := f32(480 - 118 + i * 68)
	mut info := core.Node.new('AInfo${i}')
		.with(&render.Label{
			text:  '${name}   Lv ${lv}/10'
			size:  15
			align: 'left'
			color: core.rgba(230, 235, 255, 255)
		})
	info.position = core.vec2(205, y - 14)
	info.z_index = 48
	root.add_child(mut info)
	cost := 10 + lv * 5
	// upgrade button as a DIRECT ROOT child
	mut btn := core.Node.new('AUp${i}')
		.with(&render.UITransform{ size: core.vec2(140, 30), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(140, 90, 40, 255), radius: 7 })
		.with(&render.Button{})
	btn.position = core.vec2(205, y + 16)
	btn.z_index = 48
	root.add_child(mut btn)
	mut lbl := core.Node.new('AUpLbl${i}')
		.with(&render.Label{ text: 'UPGRADE  GEM ${cost}', size: 13, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lbl.position = core.vec2(0, 0)
	lbl.z_index = 49
	btn.add_child(mut lbl)
	return btn
}

fn (mut u BattleUI) poll_team_buttons() {
	mut board := u.scene().root.get_component[MergeBoard]() or { return }
	if u.team_tab == 0 {
		units := board.player_units()
		for i, r in u.team_rows {
			if r == unsafe { nil } {
				continue
			}
			if i >= units.len {
				break
			}
			if mut bt := r.get_component[render.Button]() {
				if bt.clicked {
					mut uu := units[i]
					if mut m := uu.get_component[Monster]() {
						cost := 5 + m.level * 2
						if board.spend_gems(cost) {
							board.level_up_unit(mut uu)
							sfx_play_scene(u.scene(), 'audio/buy.wav')
						}
					}
					u.refresh_team_rows()
					u.refresh_team_gems()
					return
				}
			}
			// SELL button for this row
			if mut sb := u.scene().root.find('TSell${i}') {
				if mut sbt := sb.get_component[render.Button]() {
					if sbt.clicked {
						mut uu := units[i]
						refund := board.sell_unit(mut uu)
						if refund > 0 {
							sfx_play_scene(u.scene(), 'audio/buy.wav')
							if mut b2 := u.scene().root.get_component[MergeBoard]() {
								b2.toast('Sold +${refund} coins')
							}
						}
						u.refresh_team_rows()
						return
					}
				}
			}
		}
	} else {
		keys := ['attr_hp', 'attr_dmg', 'attr_spd', 'attr_crit', 'attr_coin']
		for i, r in u.team_rows {
			if r == unsafe { nil } {
				continue
			}
			if i >= keys.len {
				break
			}
			if mut bt := r.get_component[render.Button]() {
				if bt.clicked {
					lv := u.scene().store.get_int(keys[i], 0)
					cost := 10 + lv * 5
					if board.upgrade_attr(keys[i], cost) {
						sfx_play_scene(u.scene(), 'audio/buy.wav')
						u.refresh_team_rows()
						u.refresh_team_gems()
					}
					return
				}
			}
		}
	}
}

fn (mut u BattleUI) build_overlays() {
	mut root := u.scene().root
	mut ov := core.Node.new('Overlays')
		.with(&render.UITransform{ size: core.vec2(540, 960), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(0, 0, 0, 170) })
	ov.position = core.vec2(270, 480)
	ov.z_index = 50
	ov.active = false
	root.add_child(mut ov)
	u.overlays = ov

	mut v := core.Node.new('VictoryPanel')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/victory.png')
			size:    core.vec2(420, 187)
		})
	v.position = core.vec2(270, 360)
	v.z_index = 51
	v.active = false
	root.add_child(mut v)
	u.victory_n = v

	mut vlabel := core.Node.new('VictoryCoins')
		.with(&render.Label{
			text:  ''
			size:  24
			align: 'center'
			color: core.rgba(255, 230, 120, 255)
		})
	vlabel.position = core.vec2(270, 405)
	vlabel.z_index = 52
	vlabel.active = false
	root.add_child(mut vlabel)

	mut vtext := core.Node.new('VictoryText')
		.with(&render.Label{
			text:  'YOU WIN'
			size:  46
			align: 'center'
			color: core.rgba(120, 255, 160, 255)
		})
	vtext.position = core.vec2(270, 248)
	vtext.z_index = 53
	vtext.active = false
	root.add_child(mut vtext)

	mut cont := core.Node.new('ContinueBtn')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/button0.png')
			size:    core.vec2(188, 40)
		})
		.with(&render.Button{})
	cont.position = core.vec2(270, 480)
	cont.z_index = 52
	cont.active = false
	root.add_child(mut cont)
	mut ctl := core.Node.new('ContinueLabel')
		.with(&render.Label{ text: 'CONTINUE', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	ctl.position = core.vec2(0, 0)
	ctl.z_index = 53
	cont.add_child(mut ctl)

	mut f := core.Node.new('FailPanel')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/fail.png')
			size:    core.vec2(335, 149)
		})
	f.position = core.vec2(270, 360)
	f.z_index = 51
	f.active = false
	root.add_child(mut f)
	u.fail_n = f

	mut ft := core.Node.new('FailText')
		.with(&render.Label{
			text:  'YOU LOSE'
			size:  46
			align: 'center'
			color: core.rgba(255, 90, 90, 255)
		})
	ft.position = core.vec2(270, 248)
	ft.z_index = 53
	ft.active = false
	root.add_child(mut ft)

	mut retry := core.Node.new('RetryBtn')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/button0.png')
			size:    core.vec2(150, 32)
		})
		.with(&render.Button{})
	retry.position = core.vec2(205, 450)
	retry.z_index = 52
	retry.active = false
	root.add_child(mut retry)
	mut rtl := core.Node.new('RetryLabel')
		.with(&render.Label{ text: 'RETRY', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	rtl.position = core.vec2(0, 0)
	rtl.z_index = 53
	retry.add_child(mut rtl)

	mut mapb := core.Node.new('MapBtn')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/button0.png')
			size:    core.vec2(150, 32)
		})
		.with(&render.Button{})
	mapb.position = core.vec2(345, 450)
	mapb.z_index = 52
	mapb.active = false
	root.add_child(mut mapb)
	mut mtl := core.Node.new('MapLabel')
		.with(&render.Label{ text: 'MAP', size: 16, align: 'center', color: core.rgba(255, 255, 255, 255) })
	mtl.position = core.vec2(0, 0)
	mtl.z_index = 53
	mapb.add_child(mut mtl)
}

fn (mut u BattleUI) show_victory(reward int) {
	if u.overlays == unsafe { nil } || u.victory_n == unsafe { nil } {
		return
	}
	u.close_panel()
	u.overlays.active = true
	u.victory_n.active = true
	if mut c := u.scene().root.find('VictoryText') {
		c.active = true
	}
	if mut c := u.scene().root.find('VictoryCoins') {
		if mut l := c.get_component[render.Label]() {
			mut st := u.scene().store
			l.text = '+${reward} coins  +3 gems'
			// +3 gems for the win (coin attr boosts the coin part only)
			st.set_int('gems', st.get_int('gems', 0) + 3)
		}
		c.active = true
	}
	if mut g := u.scene().root.find('GemLabel') {
		if mut l := g.get_component[render.Label]() {
			l.text = 'Gems: ${u.scene().store.get_int('gems', 0)}'
		}
	}
	if mut c := u.scene().root.find('ContinueBtn') {
		c.active = true
	}
}

fn (mut u BattleUI) show_fail() {
	if u.overlays == unsafe { nil } || u.fail_n == unsafe { nil } {
		return
	}
	u.close_panel()
	u.overlays.active = true
	u.fail_n.active = true
	if mut c := u.scene().root.find('FailText') {
		c.active = true
	}
	if mut c := u.scene().root.find('RetryBtn') {
		c.active = true
	}
	if mut c := u.scene().root.find('MapBtn') {
		c.active = true
	}
}

