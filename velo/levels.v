module main

import velo.core

// ---------------------------------------------------------------------------
// Level definitions — generated from assets/data/game_data.json tuning.
// mtype: which monter art (1..5), level: how strong, count: how many,
// boss: a boss wave (big monter, high stats, reward x3).
// ---------------------------------------------------------------------------
struct EnemyWave {
	mtype int
	level int
	count int
	boss  bool
}

struct LevelDef {
	waves  []EnemyWave
	reward int
}

fn level_def(n int) LevelDef {
	mut lv := n
	if lv < 1 {
		lv = 1
	}
	ld := g_data.levels
	mut waves := ld.waves_min + (lv - 1) / 20
	if waves < 1 {
		waves = 1
	}
	if waves > ld.waves_max {
		waves = ld.waves_max
	}
	boss_m := is_boss_level(lv)
	mut ws := []EnemyWave{}
	for w in 0 .. waves {
		if boss_m && w == waves - 1 {
			// boss replaces the last wave
			ws << EnemyWave{
				mtype: 5
				level: 1 + (lv - 1) / ld.level_scale
				count: 1
				boss:  true
			}
			continue
		}
		mut mt := 1 + (lv-1)/ld.mtype_scale + w / 2
		if mt < 1 {
			mt = 1
		}
		if mt > 20 {
			mt = 20
		}
		lvl := 1 + (lv - 1) / ld.level_scale + w
		count := ld.count_base + (lv-1)/ld.count_step + w
		ws << EnemyWave{
			mtype: mt
			level: lvl
			count: count
		}
	}
	mut reward := ld.base_reward + (lv - 1) * ld.reward_step
	if boss_m {
		reward = int(f32(reward) * boss_for_level(lv).reward_mult)
	}
	return LevelDef{
		waves:  ws
		reward: reward
	}
}

// Enemy base stats by monter type — from data (fallback hardcoded).
fn enemy_base(mtype int) ElementStats {
	ed := enemy_data(mtype)
	return ElementStats{
		hp:  ed.hp
		dmg: ed.dmg
		spd: ed.spd
	}
}

fn enemy_tex(mtype int) string {
	return enemy_data(mtype).tex
}

fn enemy_size(mtype int) core.Vec2 {
	ed := enemy_data(mtype)
	mut base := core.vec2(ed.size[0], ed.size[1])
	if base.x <= 0 || base.y <= 0 {
		base = match mtype {
			1 { core.vec2(191, 221) }
			2 { core.vec2(283, 269) }
			3 { core.vec2(172, 167) }
			4 { core.vec2(236, 231) }
			else { core.vec2(263, 230) }
		}
	}
	k := f32(0.29)
	return core.vec2(base.x * k, base.y * k)
}

// ranged style per enemy monter type (3,4,5 cast from afar).
fn enemy_ranged(mtype int) bool {
	return enemy_data(mtype).ranged
}

fn enemy_range(mtype int) f32 {
	return enemy_data(mtype).range
}

// enemy_tint — per-type color (defaults to white = no tint).
fn enemy_tint(mtype int) core.Color {
	ed := enemy_data(mtype)
	return core.rgba(u8(ed.tint[0]), u8(ed.tint[1]), u8(ed.tint[2]), 255)
}
