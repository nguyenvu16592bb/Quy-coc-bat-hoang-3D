module main

import os
import velo.app
import velo.core
import velo.render3d

// Quỷ Cốc Bát Hoang 3D — Wuxia isometric action RPG built on the Velo 3D engine.
// Design reference: qu_c_c_b_t_hoang_3d.html (Three.js prototype in the project root).
//
//   run_game.ps1   → sync this folder into the engine clone and `v run examples/quycoc3d`
//   build_game.ps1 → build a native exe

fn main() {
	mut game := app.new(
		title:      'Quỷ Cốc Bát Hoang 3D'
		assets_dir: assets_dir()
		scene:      'scenes/main.scene'
		width:      1280
		height:     720
		scale_mode: 'fit'
		app_id:     'quycoc-bat-hoang-3d'
		background: core.rgba(9, 19, 22, 255)
	) or {
		os.write_file(os.join_path(os.temp_dir(), 'qc_err.txt'), '${err}') or {}
		eprintln(err)
		exit(1)
	}
	// the 3D pass (render3d components + renderer)
	render3d.install(mut game)

	game.registry.register[FollowIsoCamera]()
	game.registry.register[HeroController]()
	game.registry.register[PlayerCombat]()
	game.registry.register[EnemyAI]()
	game.registry.register[WaveSpawner]()
	game.registry.register[WorldBuilder]()
	game.registry.register[Spin3D]()
	game.registry.register[WhirlwindFX]()
	game.registry.register[SwordBeam]()
	game.registry.register[RainSword]()
	game.registry.register[GiantSword]()
	game.registry.register[FloatText]()
	game.registry.register[HUDSync]()
	game.registry.register[WorldMapUI]()
	game.registry.register[HeroMember]()
	game.registry.register[CompanionAI]()
	game.registry.register[BattleDirector]()
	game.registry.register[BattleCompanionAI]()
	game.registry.register[BattlePanelUI]()
	game.registry.register[PvpPanelUI]()
	game.registry.register[TownPanelUI]()

	init_state()
	game.run()
}

// assets_dir: prefer the folder next to this source file (dev runs), fall back to
// the folder next to the built exe (portable builds ship `assets/` beside them).
fn assets_dir() string {
	d := os.join_path(os.dir(@FILE), 'assets')
	if os.is_dir(d) {
		return d
	}
	return os.join_path(os.dir(os.executable()), 'assets')
}
