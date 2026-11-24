module main

import velo.assets
import velo.core
import velo.render

// ===========================================================================
// SettingsUI — the settings button (top-right) and its panel:
// sound toggle, reset progress, close.
// ===========================================================================
pub struct SettingsUI {
	core.Component
pub mut:
	panel   &core.Node = unsafe { nil }
	open    bool @[hide]
	sound_n &core.Node = unsafe { nil }
}

fn (mut s SettingsUI) start() {
	s.build_button()
	s.build_panel()
}

fn (mut s SettingsUI) build_button() {
	mut root := s.scene().root
	mut btn := core.Node.new('SettingsBtn')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/setting.png')
			size:    core.vec2(56, 61)
		})
		.with(&render.Button{})
	btn.position = core.vec2(502, 55) // mirrored with BackBtn (38,55) around x=270
	btn.z_index = 25
	root.add_child(mut btn)
}

fn (mut s SettingsUI) build_panel() {
	mut root := s.scene().root
	mut panel := core.Node.new('SettingsPanel')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/panel_settings.png')
			size:    core.vec2(390, 300)
		})
	panel.position = core.vec2(270, 450)
	panel.z_index = 60
	panel.active = false
	root.add_child(mut panel)
	s.panel = panel

	mut title := core.Node.new('SettingsTitle')
		.with(&render.Label{
			text:  'SETTINGS'
			size:  26
			align: 'center'
			color: core.rgba(255, 235, 150, 255)
		})
	title.position = core.vec2(270, 360)
	title.z_index = 61
	title.active = false
	root.add_child(mut title)

	mut sound := core.Node.new('SoundBtn')
		.with(&render.UITransform{ size: core.vec2(260, 44), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(60, 110, 170, 255), radius: 8 })
		.with(&render.Button{})
	sound.position = core.vec2(270, 430)
	sound.z_index = 61
	sound.active = false
	root.add_child(mut sound)
	mut slabel := core.Node.new('SoundLabel')
		.with(&render.Label{
			text:  ''
			size:  18
			align: 'center'
			color: core.rgba(255, 255, 255, 255)
		})
	slabel.position = core.vec2(0, 0)
	slabel.z_index = 62
	sound.add_child(mut slabel)
	s.sound_n = slabel

	mut reset := core.Node.new('ResetBtn')
		.with(&render.UITransform{ size: core.vec2(260, 44), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(170, 60, 50, 255), radius: 8 })
		.with(&render.Button{})
	reset.position = core.vec2(270, 470)
	reset.z_index = 61
	reset.active = false
	root.add_child(mut reset)
	mut rlabel := core.Node.new('ResetLabel')
		.with(&render.Label{
			text:  'Reset progress'
			size:  18
			align: 'center'
			color: core.rgba(255, 255, 255, 255)
		})
	rlabel.position = core.vec2(0, 0)
	rlabel.z_index = 62
	reset.add_child(mut rlabel)

	// save slot (single slot) + load
	mut saveb := core.Node.new('SaveBtn')
		.with(&render.UITransform{ size: core.vec2(120, 40), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(60, 170, 100, 255), radius: 8 })
		.with(&render.Button{})
	saveb.position = core.vec2(175, 530)
	saveb.z_index = 61
	saveb.active = false
	root.add_child(mut saveb)
	mut sal := core.Node.new('SaveLabel')
		.with(&render.Label{ text: 'SAVE', size: 17, align: 'center', color: core.rgba(255, 255, 255, 255) })
	sal.position = core.vec2(0, 0)
	sal.z_index = 62
	saveb.add_child(mut sal)

	mut loadb := core.Node.new('LoadBtn')
		.with(&render.UITransform{ size: core.vec2(120, 40), anchor: core.vec2(0.5, 0.5) })
		.with(&render.Panel{ color: core.rgba(60, 110, 200, 255), radius: 8 })
		.with(&render.Button{})
	loadb.position = core.vec2(365, 530)
	loadb.z_index = 61
	loadb.active = false
	root.add_child(mut loadb)
	mut lal := core.Node.new('LoadLabel')
		.with(&render.Label{ text: 'LOAD', size: 17, align: 'center', color: core.rgba(255, 255, 255, 255) })
	lal.position = core.vec2(0, 0)
	lal.z_index = 62
	loadb.add_child(mut lal)

	mut auto := core.Node.new('AutoSaveLabel')
		.with(&render.Label{
			text:  'Auto-save: ON'
			size:  14
			align: 'center'
			color: core.rgba(160, 220, 170, 255)
		})
	auto.position = core.vec2(270, 578)
	auto.z_index = 61
	auto.active = false
	root.add_child(mut auto)

	mut close := core.Node.new('SettingsClose')
		.with(&render.Sprite{
			texture: assets.ref[assets.Texture]('ui/close.png')
			size:    core.vec2(36, 39)
		})
		.with(&render.Button{})
	close.position = core.vec2(410, 350)
	close.z_index = 61
	close.active = false
	root.add_child(mut close)
}

fn (mut s SettingsUI) refresh_sound_label() {
	on := s.scene().store.get_bool('sound', true)
	if mut l := s.sound_n.get_component[render.Label]() {
		l.text = if on { 'Sound: ON' } else { 'Sound: OFF' }
	}
}

fn (mut s SettingsUI) update(dt f32) {
	mut sc := s.scene()
	root := sc.root
	if !s.open {
		if mut btn := root.find('SettingsBtn') {
			if mut bt := btn.get_component[render.Button]() {
				if bt.clicked {
					s.open = true
					s.panel.active = true
					if mut t := root.find('SettingsTitle') {
						t.active = true
					}
					if mut b := root.find('SoundBtn') {
						b.active = true
					}
					if mut b := root.find('ResetBtn') {
						b.active = true
					}
					if mut b := root.find('SaveBtn') {
						b.active = true
					}
					if mut b := root.find('LoadBtn') {
						b.active = true
					}
					if mut a := root.find('AutoSaveLabel') {
						a.active = true
					}
					if mut c := root.find('SettingsClose') {
						c.active = true
					}
					s.refresh_sound_label()
				}
			}
		}
		return
	}
	// panel open
	if mut c := root.find('SettingsClose') {
		if mut bt := c.get_component[render.Button]() {
			if bt.clicked {
				s.close()
				return
			}
		}
	}
	if mut b := root.find('SoundBtn') {
		if mut bt := b.get_component[render.Button]() {
			if bt.clicked {
				mut st := sc.store
				on := !st.get_bool('sound', true)
				st.set_bool('sound', on)
				music_set_paused(sc, !on)
				s.refresh_sound_label()
				return
			}
		}
	}
	if mut b := root.find('ResetBtn') {
		if mut bt := b.get_component[render.Button]() {
			if bt.clicked {
				mut st := sc.store
				st.delete('coins')
				st.delete('unlocked')
				st.delete('current_level')
				st.delete('save_json')
				s.close()
				sc.change_scene('scenes/map.scene', fade: 0.3)
				return
			}
		}
	}
	if mut b := root.find('SaveBtn') {
		if mut bt := b.get_component[render.Button]() {
			if bt.clicked {
				mut st := sc.store
				board := sc.root.get_component[MergeBoard]() or { unsafe { nil } }
				mut units := []&core.Node{}
				if board != unsafe { nil } {
					units = board.player_units()
				}
				st.set_string('save_json', build_save_json(st, units))
				if mut t := root.find('Toast') {
					if mut l := t.get_component[render.Label]() {
						l.text = 'Game saved! (JSON)'
						l.color = core.rgba(140, 255, 170, 255)
					}
					t.active = true
				}
				return
			}
		}
	}
	if mut b := root.find('LoadBtn') {
		if mut bt := b.get_component[render.Button]() {
			if bt.clicked {
				mut st := sc.store
				if !save_json_exists(st) {
					if mut t := root.find('Toast') {
						if mut l := t.get_component[render.Label]() {
							l.text = 'No save found - press SAVE first'
							l.color = core.rgba(255, 190, 90, 255)
						}
						t.active = true
					}
					return
				}
				apply_save(mut st, st.get_string('save_json', ''))
				s.close()
				sc.change_scene('scenes/map.scene', fade: 0.3)
				return
			}
		}
	}
}

fn (mut s SettingsUI) close() {
	s.open = false
	s.panel.active = false
	mut root := s.scene().root
	if mut t := root.find('SettingsTitle') {
		t.active = false
	}
	if mut b := root.find('SoundBtn') {
		b.active = false
	}
	if mut b := root.find('ResetBtn') {
		b.active = false
	}
	if mut c := root.find('SettingsClose') {
		c.active = false
	}
	if mut b := root.find('SaveBtn') {
		b.active = false
	}
	if mut b := root.find('LoadBtn') {
		b.active = false
	}
	if mut a := root.find('AutoSaveLabel') {
		a.active = false
	}
}
