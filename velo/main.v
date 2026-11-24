module main

import os
import velo.app
import velo.editor
import velo.serialize

//   velo run      run the game
//   velo editor   open the scene/prefab editor
fn main() {
	assets_dir := os.join_path(os.dir(@FILE), 'assets')
	if '--editor' in os.args {
		mut ed := editor.new(
			title:      'Elemental Monsters — Velo Editor'
			assets_dir: assets_dir
			scene:      'scenes/map.scene'
		) or {
			eprintln(err)
			exit(1)
		}
		register_components(mut ed.registry)
		ed.run()
		return
	}
	mut game := app.new(
		title:        'Elemental Monsters: Merge'
		assets_dir:   assets_dir
		scene:        'scenes/map.scene'
		width:        540 // portrait design resolution (the PSDs are portrait)
		height:       960
		scale_mode:   'fit'
		window_width: 405
		window_height: 720
	) or {
		eprintln(err)
		exit(1)
	}
	register_components(mut game.registry)
	game.run()
}

// Every game component needs one registration line to be usable in .scene files and the editor.
fn register_components(mut r serialize.Registry) {
	r.register[Monster]()
	r.register[MapScreen]()
	r.register[BattleController]()
	r.register[MergeBoard]()
	r.register[BattleUI]()
	r.register[SettingsUI]()
}
