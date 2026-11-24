module main

import velo.assets
import velo.core
import velo.render

// ===========================================================================
// MapScreen — the level-select map: scrollable islands, level points, progression.
// 100 levels, boss levels every 10 — all driven by assets/data/game_data.json.
// ===========================================================================
pub struct MapScreen {
	core.Component
pub mut:
	buttons  []&core.Node
	unlocked int = 1
	built    bool
}

fn (mut m MapScreen) start() {
	init_game_data()
	mut mroot := m.scene().root
	ensure_music(mut mroot)
	m.unlocked = m.scene().store.get_int('unlocked', 1)
	if m.scene().store.get_int('coins', -1) < 0 {
		mut st := m.scene().store
		st.set_int('coins', 200)
	}
	m.build_bg()
	m.build_hud()
	m.build_map_view()
	m.refresh_coins()
	m.built = true
}

fn (mut m MapScreen) build_bg() {
	mut root := m.scene().root
	mut bg := core.Node.new('BG')
		.with(&render.UITransform{ size: core.vec2(540, 960), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(16, 40, 78, 255) })
	bg.position = core.vec2(270, 480)
	bg.z_index = 0
	root.add_child(mut bg)
}

fn (mut m MapScreen) build_hud() {
	mut root := m.scene().root
	mut title := core.Node.new('Title')
		.with(&render.Label{
			text:  'Elemental Monsters'
			size:  34
			align: 'center'
			color: core.rgba(255, 235, 150, 255)
		})
	title.position = core.vec2(270, 48)
	title.z_index = 10
	root.add_child(mut title)

	mut sub := core.Node.new('Subtitle')
		.with(&render.Label{
			text:  'Select a level (scroll)'
			size:  19
			align: 'center'
			color: core.rgba(210, 225, 245, 255)
		})
	sub.position = core.vec2(270, 92)
	sub.z_index = 10
	root.add_child(mut sub)

	mut coins := core.Node.new('CoinLabel')
		.with(&render.Label{
			text:  'Coins: ${m.scene().store.get_int('coins', 200)}'
			size:  22
			align: 'center'
			color: core.rgba(255, 220, 90, 255)
		})
	coins.position = core.vec2(270, 128)
	coins.z_index = 10
	root.add_child(mut coins)
}

// Scrollable map: a full-screen ScrollView whose content holds islands + level points.
fn (mut m MapScreen) build_map_view() {
	mut root := m.scene().root

	mut view := core.Node.new('MapView')
		.with(&render.UITransform{ size: core.vec2(540, 960), anchor: core.vec2(0, 0) })
		.with(&render.ScrollView{ content: 'ScrollContent', vertical: true, wheel_speed: 55 })
	view.position = core.vec2(0, 0)
	view.z_index = 1
	root.add_child(mut view)

	total := level_count()
	content_h := 150 + f32(total) * 66 + 260
	mut content := core.Node.new('ScrollContent')
		.with(&render.UITransform{ size: core.vec2(540, content_h), anchor: core.vec2(0, 0) })
	content.position = core.vec2(0, 0)
	content.z_index = 1
	view.add_child(mut content)

	// islands — one per 3 levels
	islands := (total + 2) / 3
	for k in 0 .. islands {
		mut isl := core.Node.new('Island${k + 1}')
			.with(&render.Sprite{
				texture: assets.ref[assets.Texture]('back/beachland.png')
				size:    core.vec2(420, 263)
			})
		isl.position = core.vec2(270, 320 + f32(k) * 198)
		isl.z_index = 1
		content.add_child(mut isl)
	}

	// level points: zigzag down the islands, 1..total (boss levels use a red point)
	for i in 1 .. total + 1 {
		unlocked := i <= m.unlocked
		completed := i < m.unlocked
		boss := is_boss_level(i)
		mut x := f32(0)
		if i % 3 == 0 {
			x = 350
		} else if i % 3 == 1 {
			x = 190
		} else {
			x = 270
		}
		y := 150 + f32(i-1) * 66
		mut point := core.Node.new('Lv${i}')
		point.position = core.vec2(x, y)
		point.z_index = 2
		if unlocked {
			point = point.with(&render.Sprite{
				texture: assets.ref[assets.Texture]('ui/point_active.png')
				size:    core.vec2(86, 66)
			})
			point = point.with(&render.Button{})
			m.buttons << point
		} else {
			point = point.with(&render.Sprite{
				texture: assets.ref[assets.Texture]('ui/point_inactive.png')
				size:    core.vec2(84, 59)
			})
		}
		content.add_child(mut point)

		mut num := core.Node.new('Num${i}')
			.with(&render.Label{
				text:  '${i}'
				size:  if boss { 20 } else { 22 }
				align: 'center'
				color: if unlocked {
					if boss {
						core.rgba(255, 240, 160, 255)
					} else {
						core.rgba(60, 30, 10, 255)
					}
				} else {
					core.rgba(255, 255, 255, 160)
				}
			})
		num.position = core.vec2(x, y)
		num.z_index = 3
		content.add_child(mut num)

		if completed {
			mut chest := core.Node.new('Chest${i}')
				.with(&render.Sprite{
					texture: assets.ref[assets.Texture]('ui/chest.png')
					size:    core.vec2(34, 68)
				})
			chest.position = core.vec2(x + 56, y + 6)
			chest.z_index = 3
			content.add_child(mut chest)
		}
	}
}

fn (mut m MapScreen) refresh_coins() {
	if mut c := m.scene().root.find('CoinLabel') {
		if mut l := c.get_component[render.Label]() {
			l.text = 'Coins: ${m.scene().store.get_int('coins', 200)}'
		}
	}
}

fn (mut m MapScreen) update(dt f32) {
	for n in m.buttons {
		if mut b := n.get_component[render.Button]() {
			if b.clicked {
				level := n.name.all_after('Lv').int()
				mut sc := m.scene()
				mut st := sc.store
				st.set_int('current_level', level)
				sc.change_scene('scenes/battle.scene', fade: 0.3)
				return
			}
		}
	}
}
