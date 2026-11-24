module main

import velo.core

// ============================================================================
//  content.v — the game's data tables.
//
//  * 8 playable heroes (the team roster)
//  * 16 maps (Bát Hoang Địa Đồ) with their own palettes, rosters and bosses
//  * 16 enemy archetypes built from primitives (see enemies.v)
//
//  Colours are core.Color{r, g, b, a}; all tables are immutable constants so the
//  per-frame code only reads them.
// ============================================================================

pub struct HeroDef {
pub:
	name    string
	title   string
	tint    core.Color // SkinnedModel3D.color multiplier (near-white keeps the texture readable)
	blade   core.Color // sword blade + skill VFX colour
	hp_mult f32 = 1.0
	atk_mult f32 = 1.0
	spd_mult f32 = 1.0
	crit_add f32
}

pub const heroes = [
	HeroDef{
		name:     'Quỷ Cốc Tử'
		title:    'Bát Hoang Kiếm Chủ'
		tint:     core.Color{255, 244, 226, 255}
		blade:    core.Color{255, 214, 90, 255}
		hp_mult:  1.0
		atk_mult: 1.0
		spd_mult: 1.0
		crit_add: 0.0
	},
	HeroDef{
		name:     'Lãnh Nguyệt'
		title:    'Băng Tâm Kiếm Khách'
		tint:     core.Color{205, 232, 255, 255}
		blade:    core.Color{132, 224, 255, 255}
		hp_mult:  0.95
		atk_mult: 1.05
		spd_mult: 1.0
		crit_add: 0.03
	},
	HeroDef{
		name:     'Huyết Đao'
		title:    'Huyết Ma Đao Vương'
		tint:     core.Color{255, 198, 190, 255}
		blade:    core.Color{255, 96, 88, 255}
		hp_mult:  1.15
		atk_mult: 1.25
		spd_mult: 0.92
		crit_add: 0.02
	},
	HeroDef{
		name:     'Thanh Vũ'
		title:    'Lưu Vân Nhanh Kiếm'
		tint:     core.Color{206, 255, 222, 255}
		blade:    core.Color{120, 246, 170, 255}
		hp_mult:  0.9
		atk_mult: 1.0
		spd_mult: 1.15
		crit_add: 0.06
	},
	HeroDef{
		name:     'Hỏa Linh'
		title:    'Xích Diễm Pháp Sư'
		tint:     core.Color{255, 214, 176, 255}
		blade:    core.Color{255, 148, 64, 255}
		hp_mult:  0.85
		atk_mult: 1.2
		spd_mult: 1.0
		crit_add: 0.04
	},
	HeroDef{
		name:     'Kim Cương'
		title:    'Kim Cang Thiền Sư'
		tint:     core.Color{255, 238, 190, 255}
		blade:    core.Color{255, 196, 92, 255}
		hp_mult:  1.35
		atk_mult: 0.9
		spd_mult: 0.88
		crit_add: 0.0
	},
	HeroDef{
		name:     'Tử Yên'
		title:    'Ám Ảnh Sát Thủ'
		tint:     core.Color{232, 206, 255, 255}
		blade:    core.Color{196, 136, 255, 255}
		hp_mult:  0.8
		atk_mult: 1.1
		spd_mult: 1.2
		crit_add: 0.1
	},
	HeroDef{
		name:     'Bạch Hổ'
		title:    'Ngự Thú Sư'
		tint:     core.Color{246, 232, 208, 255}
		blade:    core.Color{158, 226, 150, 255}
		hp_mult:  1.1
		atk_mult: 1.05
		spd_mult: 1.05
		crit_add: 0.02
	},
]

// ---------------------------------------------------------------------------
//  Maps — the Bát Hoang travel book. `theme` selects the decor builder in
//  world.v; the palette drives the environment (sky/fog/ground), the arena
//  floor and the accent colour of props.
// ---------------------------------------------------------------------------

pub struct MapDef {
pub:
	name         string
	sub          string
	theme        string
	sky          core.Color
	ground       core.Color
	fog          core.Color
	ambient      f32
	fog_density  f32
	floor        core.Color
	rock         core.Color
	accent       core.Color
	particle     string
	boss         string
	goal         int
	roster       []string
}

pub const maps = [
	MapDef{
		name: 'Đào Hoa Đảo', sub: 'Đào Hoa Phá Đặc'
		theme: 'peach'
		sky: core.Color{150, 112, 126, 255}, ground: core.Color{72, 54, 62, 255}
		fog: core.Color{168, 124, 140, 255}, ambient: 0.66, fog_density: 0.018
		floor: core.Color{96, 74, 80, 255}, rock: core.Color{66, 48, 58, 255}
		accent: core.Color{255, 168, 200, 255}
		particle: 'sparkle'
		boss: 'wolf', goal: 12, roster: ['ghoul', 'demon', 'wolf']
	},
	MapDef{
		name: 'Toàn Chân Giáo', sub: 'Toàn Chân Kiếm Trận'
		theme: 'sect'
		sky: core.Color{118, 126, 112, 255}, ground: core.Color{66, 66, 56, 255}
		fog: core.Color{128, 138, 126, 255}, ambient: 0.62, fog_density: 0.016
		floor: core.Color{82, 84, 76, 255}, rock: core.Color{58, 62, 58, 255}
		accent: core.Color{126, 200, 132, 255}
		particle: 'dust'
		boss: 'swordsman', goal: 13, roster: ['demon', 'swordsman', 'monk']
	},
	MapDef{
		name: 'Cổ Mộ', sub: 'Cổ Mộ U Linh'
		theme: 'tomb'
		sky: core.Color{64, 82, 104, 255}, ground: core.Color{42, 48, 56, 255}
		fog: core.Color{66, 86, 104, 255}, ambient: 0.5, fog_density: 0.032
		floor: core.Color{54, 58, 66, 255}, rock: core.Color{40, 44, 52, 255}
		accent: core.Color{126, 232, 222, 255}
		particle: 'smoke'
		boss: 'ghost', goal: 14, roster: ['ghoul', 'ghost', 'spider']
	},
	MapDef{
		name: 'Cái Bang Tổng Đàn', sub: 'Cái Bang Đại Chiến'
		theme: 'camp'
		sky: core.Color{138, 114, 88, 255}, ground: core.Color{102, 82, 58, 255}
		fog: core.Color{150, 126, 98, 255}, ambient: 0.64, fog_density: 0.02
		floor: core.Color{98, 78, 54, 255}, rock: core.Color{76, 62, 46, 255}
		accent: core.Color{255, 176, 84, 255}
		particle: 'embers'
		boss: 'tiger', goal: 15, roster: ['demon', 'archer', 'wolf']
	},
	MapDef{
		name: 'Đại Lý Vương Uyển', sub: 'Vương Uyển Kỳ Hoa'
		theme: 'garden'
		sky: core.Color{124, 164, 126, 255}, ground: core.Color{58, 82, 58, 255}
		fog: core.Color{136, 176, 144, 255}, ambient: 0.7, fog_density: 0.015
		floor: core.Color{74, 100, 70, 255}, rock: core.Color{58, 76, 56, 255}
		accent: core.Color{255, 214, 128, 255}
		particle: 'fireflies'
		boss: 'snake', goal: 16, roster: ['snake', 'demon', 'archer']
	},
	MapDef{
		name: 'Thiếu Lâm Tự', sub: 'Thiếu Lâm Phật Quang'
		theme: 'temple'
		sky: core.Color{158, 126, 98, 255}, ground: core.Color{94, 74, 52, 255}
		fog: core.Color{158, 138, 116, 255}, ambient: 0.66, fog_density: 0.017
		floor: core.Color{100, 90, 74, 255}, rock: core.Color{72, 64, 52, 255}
		accent: core.Color{255, 176, 96, 255}
		particle: 'dust'
		boss: 'monk', goal: 17, roster: ['monk', 'swordsman', 'elite']
	},
	MapDef{
		name: 'Hoa Sơn', sub: 'Hoa Sơn Luận Kiếm'
		theme: 'mountain'
		sky: core.Color{136, 156, 180, 255}, ground: core.Color{72, 78, 84, 255}
		fog: core.Color{156, 176, 196, 255}, ambient: 0.68, fog_density: 0.022
		floor: core.Color{96, 100, 106, 255}, rock: core.Color{66, 72, 78, 255}
		accent: core.Color{206, 232, 255, 255}
		particle: 'sparkle'
		boss: 'tiger', goal: 18, roster: ['wolf', 'swordsman', 'tiger']
	},
	MapDef{
		name: 'Linh Thứu Cung', sub: 'Linh Thứu Băng Cung'
		theme: 'palace'
		sky: core.Color{100, 146, 156, 255}, ground: core.Color{58, 78, 82, 255}
		fog: core.Color{116, 166, 176, 255}, ambient: 0.6, fog_density: 0.02
		floor: core.Color{80, 104, 104, 255}, rock: core.Color{62, 82, 86, 255}
		accent: core.Color{154, 244, 234, 255}
		particle: 'sparkle'
		boss: 'elite', goal: 19, roster: ['ghost', 'elite', 'swordsman']
	},
	MapDef{
		name: 'Hắc Mộc Nhai', sub: 'Hắc Mộc Ma Nhai'
		theme: 'cliff'
		sky: core.Color{76, 62, 74, 255}, ground: core.Color{48, 42, 48, 255}
		fog: core.Color{88, 70, 86, 255}, ambient: 0.48, fog_density: 0.028
		floor: core.Color{62, 54, 62, 255}, rock: core.Color{42, 36, 44, 255}
		accent: core.Color{255, 96, 72, 255}
		particle: 'embers'
		boss: 'imp', goal: 20, roster: ['imp', 'ghost', 'spider']
	},
	MapDef{
		name: 'Thiên Sơn', sub: 'Thiên Sơn Tuyết Vực'
		theme: 'snow'
		sky: core.Color{176, 200, 224, 255}, ground: core.Color{124, 138, 158, 255}
		fog: core.Color{198, 216, 234, 255}, ambient: 0.78, fog_density: 0.026
		floor: core.Color{154, 164, 178, 255}, rock: core.Color{112, 122, 138, 255}
		accent: core.Color{176, 228, 255, 255}
		particle: 'snow'
		boss: 'turtle', goal: 21, roster: ['wolf', 'ghost', 'turtle']
	},
	MapDef{
		name: 'Mai Hoa Sơn Trang', sub: 'Mai Hoa Huyết Trang'
		theme: 'villa'
		sky: core.Color{156, 100, 116, 255}, ground: core.Color{88, 62, 66, 255}
		fog: core.Color{148, 106, 118, 255}, ambient: 0.62, fog_density: 0.019
		floor: core.Color{90, 70, 72, 255}, rock: core.Color{68, 52, 56, 255}
		accent: core.Color{255, 136, 156, 255}
		particle: 'sparkle'
		boss: 'swordsman', goal: 22, roster: ['swordsman', 'archer', 'snake']
	},
	MapDef{
		name: 'Dương Châu Thị', sub: 'Dương Châu Huyết Thị'
		theme: 'market'
		sky: core.Color{148, 120, 94, 255}, ground: core.Color{98, 88, 72, 255}
		fog: core.Color{158, 136, 114, 255}, ambient: 0.64, fog_density: 0.018
		floor: core.Color{92, 84, 74, 255}, rock: core.Color{72, 66, 58, 255}
		accent: core.Color{255, 196, 96, 255}
		particle: 'dust'
		boss: 'demon', goal: 23, roster: ['demon', 'archer', 'imp']
	},
	MapDef{
		name: 'Bạch Mã Sơn Trang', sub: 'Bạch Mã Quyết Chiến'
		theme: 'manor'
		sky: core.Color{124, 156, 144, 255}, ground: core.Color{74, 98, 72, 255}
		fog: core.Color{136, 166, 150, 255}, ambient: 0.72, fog_density: 0.016
		floor: core.Color{88, 100, 78, 255}, rock: core.Color{66, 76, 62, 255}
		accent: core.Color{244, 244, 224, 255}
		particle: 'fireflies'
		boss: 'tiger', goal: 24, roster: ['wolf', 'tiger', 'swordsman']
	},
	MapDef{
		name: 'Yến Tử Ổ', sub: 'Yến Tử Thác Nước'
		theme: 'dock'
		sky: core.Color{100, 136, 162, 255}, ground: core.Color{62, 84, 94, 255}
		fog: core.Color{116, 156, 176, 255}, ambient: 0.66, fog_density: 0.022
		floor: core.Color{74, 92, 96, 255}, rock: core.Color{56, 72, 80, 255}
		accent: core.Color{146, 226, 255, 255}
		particle: 'rain'
		boss: 'phoenix', goal: 25, roster: ['snake', 'archer', 'phoenix']
	},
	MapDef{
		name: 'Băng Hỏa Đảo', sub: 'Băng Hỏa Lưỡng Cực'
		theme: 'icefire'
		sky: core.Color{116, 104, 126, 255}, ground: core.Color{74, 68, 74, 255}
		fog: core.Color{126, 116, 132, 255}, ambient: 0.6, fog_density: 0.02
		floor: core.Color{84, 82, 88, 255}, rock: core.Color{62, 60, 66, 255}
		accent: core.Color{255, 124, 84, 255}
		particle: 'embers'
		boss: 'phoenix', goal: 26, roster: ['imp', 'phoenix', 'turtle']
	},
	MapDef{
		name: 'Thiếu Lâm Tháp Lâm', sub: 'Tháp Lâm Ma Ảnh'
		theme: 'stupa'
		sky: core.Color{168, 150, 124, 255}, ground: core.Color{114, 98, 78, 255}
		fog: core.Color{178, 162, 142, 255}, ambient: 0.7, fog_density: 0.02
		floor: core.Color{114, 104, 88, 255}, rock: core.Color{88, 80, 68, 255}
		accent: core.Color{255, 230, 154, 255}
		particle: 'dust'
		boss: 'dragon', goal: 28, roster: ['monk', 'elite', 'dragon']
	},
]

// boss_title: the name shown in the boss bar / warning banner.
pub fn boss_title(kind string) string {
	return match kind {
		'wolf' { 'Sói Yêu Vương' }
		'swordsman' { 'Hắc Kiếm Tôn' }
		'ghost' { 'Âm Hồn Tướng Quân' }
		'tiger' { 'Hắc Hổ Yêu Tôn' }
		'snake' { 'Xà Cốt Yêu Bà' }
		'monk' { 'Phản Tăng Kim Cang' }
		'elite' { 'Ma Giáo Hộ Pháp' }
		'imp' { 'Xích Diễm Yêu Đồng' }
		'turtle' { 'Huyền Vũ Lão Yêu' }
		'phoenix' { 'Chu Tước Ma Điểu' }
		'demon' { 'Huyết Ma Tướng' }
		'dragon' { 'Bát Hoang Long Đế' }
		else { 'Quỷ Cốc Ma Tôn' }
	}
}

// ---------------------------------------------------------------------------
//  Enemies — an archetype table; enemies.v turns each `shape` into primitives.
// ---------------------------------------------------------------------------

pub struct EnemySpec {
pub:
	hp     int
	speed  f32
	dmg    int
	scale  f32 = 1.0
	body   core.Color
	accent core.Color
	shape  string
	weapon string
	exp    int
	boss   bool
}

pub fn enemy_spec(kind string) EnemySpec {
	return match kind {
		'ghoul' {
			EnemySpec{
				hp: 150
				speed: 4.1
				dmg: 5
				scale: 0.95
				body: core.Color{78, 60, 102, 255}
				accent: core.Color{186, 166, 226, 255}
				shape: 'biped'
				weapon: 'claw'
				exp: 22
			}
		}
		'elite' {
			EnemySpec{
				hp: 420
				speed: 2.9
				dmg: 12
				scale: 1.3
				body: core.Color{62, 42, 92, 255}
				accent: core.Color{126, 84, 244, 255}
				shape: 'biped'
				weapon: 'sword'
				exp: 60
			}
		}
		'wolf' {
			EnemySpec{
				hp: 170
				speed: 5.2
				dmg: 8
				body: core.Color{112, 106, 100, 255}
				accent: core.Color{206, 204, 194, 255}
				shape: 'quad'
				weapon: 'claw'
				exp: 24
			}
		}
		'snake' {
			EnemySpec{
				hp: 210
				speed: 3.0
				dmg: 9
				scale: 1.05
				body: core.Color{62, 124, 72, 255}
				accent: core.Color{226, 226, 120, 255}
				shape: 'serpent'
				weapon: 'none'
				exp: 28
			}
		}
		'ghost' {
			EnemySpec{
				hp: 160
				speed: 3.4
				dmg: 8
				body: core.Color{172, 212, 228, 255}
				accent: core.Color{126, 206, 255, 255}
				shape: 'float'
				weapon: 'claw'
				exp: 26
			}
		}
		'monk' {
			EnemySpec{
				hp: 260
				speed: 2.8
				dmg: 10
				scale: 1.05
				body: core.Color{204, 124, 54, 255}
				accent: core.Color{246, 206, 126, 255}
				shape: 'biped'
				weapon: 'staff'
				exp: 34
			}
		}
		'swordsman' {
			EnemySpec{
				hp: 240
				speed: 3.6
				dmg: 11
				body: core.Color{74, 112, 164, 255}
				accent: core.Color{206, 224, 255, 255}
				shape: 'biped'
				weapon: 'sword'
				exp: 34
			}
		}
		'archer' {
			EnemySpec{
				hp: 180
				speed: 3.4
				dmg: 12
				scale: 0.98
				body: core.Color{74, 142, 92, 255}
				accent: core.Color{206, 255, 182, 255}
				shape: 'biped'
				weapon: 'bow'
				exp: 32
			}
		}
		'spider' {
			EnemySpec{
				hp: 230
				speed: 3.8
				dmg: 10
				scale: 1.1
				body: core.Color{54, 42, 64, 255}
				accent: core.Color{206, 84, 226, 255}
				shape: 'spider'
				weapon: 'none'
				exp: 30
			}
		}
		'turtle' {
			EnemySpec{
				hp: 520
				speed: 1.8
				dmg: 9
				scale: 1.2
				body: core.Color{74, 114, 94, 255}
				accent: core.Color{186, 154, 94, 255}
				shape: 'turtle'
				weapon: 'none'
				exp: 40
			}
		}
		'imp' {
			EnemySpec{
				hp: 150
				speed: 4.2
				dmg: 7
				scale: 0.82
				body: core.Color{224, 92, 52, 255}
				accent: core.Color{255, 202, 86, 255}
				shape: 'bird'
				weapon: 'claw'
				exp: 26
			}
		}
		'phoenix' {
			EnemySpec{
				hp: 380
				speed: 4.6
				dmg: 14
				scale: 1.15
				body: core.Color{242, 124, 44, 255}
				accent: core.Color{255, 226, 128, 255}
				shape: 'bird'
				weapon: 'claw'
				exp: 70
			}
		}
		'tiger' {
			EnemySpec{
				hp: 600
				speed: 4.4
				dmg: 16
				scale: 1.35
				body: core.Color{232, 142, 52, 255}
				accent: core.Color{64, 44, 32, 255}
				shape: 'quad'
				weapon: 'claw'
				exp: 90
			}
		}
		'dragon' {
			EnemySpec{
				hp: 1500
				speed: 3.0
				dmg: 26
				scale: 1.7
				body: core.Color{204, 174, 94, 255}
				accent: core.Color{255, 234, 146, 255}
				shape: 'dragon'
				weapon: 'claw'
				exp: 150
				boss: true
			}
		}
		else {
			EnemySpec{
				hp: 190
				speed: 3.2
				dmg: 7
				body: core.Color{92, 66, 54, 255}
				accent: core.Color{138, 146, 154, 255}
				shape: 'biped'
				weapon: 'cleaver'
				exp: 22
			}
		}
	}
}
