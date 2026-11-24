module main

import velo.assets
import velo.core
import velo.render

// ---------------------------------------------------------------------------
// Monster — one fighting creature (player or enemy).
// Player creatures use elements (fire/water/earth/wind); enemies use monter art.
// ---------------------------------------------------------------------------
pub struct Monster {
	core.Component
pub mut:
	element  string // 'fire' 'water' 'earth' 'wind' — or 'enemy'
	level    int    = 1
	side     int // 0 = player, 1 = enemy
	max_hp   f32
	hp       f32
	damage   f32
	atk_speed f32 // seconds between attacks
	cooldown f32
	speed    f32 = 55 // px/s when walking to the fight
	ranged   bool // ranged units stop at `range` and shoot projectiles
	range    f32 // shoot distance (0 = melee)
	crit     f32 // critical hit chance (0..1), doubles the damage
	kill_coins int = 6 // coins each kill grants the player
	alive    bool = true
	is_boss  bool // enemy boss: big stats, multi-shot skill, extra reward
	skill    string // skill key from game data (e.g. 'boss_rain')
	dot_dps  f32 // damage over time per second (burn/poison)
	dot_left f32 // seconds of DoT remaining
	stun_left f32 // seconds the unit is stunned (no move / no attack)
	// --- status effects (per-character) ---
	burn_dps   f32 // burn: damage over time (fire)
	burn_left  f32
	poison_dps f32 // poison: stronger DoT (venom)
	poison_left f32
	freeze_left f32 // freeze: cannot act + slower (ice)
	slow_left  f32 // slow: half speed only
	weak_left  f32 // weak: deals less damage
	atk_left   f32 // atk_up buff: deals more damage
	shield     f32 // absorbs damage before HP
	regen_per_s f32 // heals per second
	regen_left f32
	boss_id    int = -1 // which boss def spawned this (enemy bosses)
	bar      string @[hide]
	home     core.Vec2 @[hide] // the grid cell a player unit stands on when idle
	cell     int = -1 @[hide] // player grid cell index (-1 = not on the board / enemy)
}

pub fn (mut m Monster) start() {
	m.hp = m.max_hp
}

// tick_status — advance every status timer on a unit (called each frame).
// Returns true when the unit died from DoT/regen effects.
pub fn (mut m Monster) tick_status(dt f32) bool {
	if m.burn_left > 0 {
		m.burn_left -= dt
		m.hp -= m.burn_dps * dt
	}
	if m.poison_left > 0 {
		m.poison_left -= dt
		m.hp -= m.poison_dps * dt
	}
	if m.freeze_left > 0 {
		m.freeze_left -= dt
	}
	if m.slow_left > 0 {
		m.slow_left -= dt
	}
	if m.stun_left > 0 {
		m.stun_left -= dt
	}
	if m.weak_left > 0 {
		m.weak_left -= dt
	}
	if m.atk_left > 0 {
		m.atk_left -= dt
	}
	if m.regen_left > 0 {
		m.regen_left -= dt
		m.hp += m.regen_per_s * dt
		if m.hp > m.max_hp {
			m.hp = m.max_hp
		}
	}
	if m.shield < 0 {
		m.shield = 0
	}
	if m.burn_left < 0 {
		m.burn_left = 0
	}
	if m.poison_left < 0 {
		m.poison_left = 0
	}
	if m.freeze_left < 0 {
		m.freeze_left = 0
	}
	if m.slow_left < 0 {
		m.slow_left = 0
	}
	if m.stun_left < 0 {
		m.stun_left = 0
	}
	if m.weak_left < 0 {
		m.weak_left = 0
	}
	if m.atk_left < 0 {
		m.atk_left = 0
	}
	if m.regen_left < 0 {
		m.regen_left = 0
	}
	return m.hp <= 0
}

// m_stunned — stun or freeze block the unit's turn entirely.
pub fn (m &Monster) m_stunned() bool {
	return m.stun_left > 0 || m.freeze_left > 0
}

// m_speed — effective move speed (slow & freeze halve it).
pub fn (m &Monster) m_speed(base f32) f32 {
	mut s := base
	if m.slow_left > 0 || m.freeze_left > 0 {
		s *= 0.5
	}
	return s
}

// m_damage_mult — buffs/debuffs that scale outgoing damage.
pub fn (m &Monster) m_damage_mult() f32 {
	mut k := f32(1.0)
	if m.atk_left > 0 {
		k *= f32(1.5)
	}
	if m.weak_left > 0 {
		k *= f32(0.6)
	}
	return k
}

// absorb_shield — subtracts from the shield first; returns remaining damage.
pub fn (mut m Monster) absorb_shield(hit f32) f32 {
	if m.shield <= 0 {
		return hit
	}
	if m.shield >= hit {
		m.shield -= hit
		return 0.0
	}
	mut rem := hit - m.shield
	m.shield = 0
	return rem
}

// Element base stats (level 1). Higher levels multiply by 1.5^(level-1).
struct ElementStats {
	hp  f32
	dmg f32
	spd f32
}

fn element_stats(e string) ElementStats {
	ed := element_data(e)
	return ElementStats{
		hp:  ed.hp
		dmg: ed.dmg
		spd: ed.spd
	}
}

fn level_mult(level int) f32 {
	mut m := g_data.level_mult
	if m <= 0 {
		m = 1.5
	}
	for _ in 1 .. level {
		m *= g_data.level_mult
	}
	return f32(m)
}

// texture of a player monster by element + level — every level has its own
// art (monsters/<elem><level>.png; higher levels are tinted evolutions).
fn monster_tex(e string, level int) assets.AssetRef[assets.Texture] {
	mut lv := level
	if lv < 1 {
		lv = 1
	}
	if lv > 8 {
		lv = 8
	}
	return assets.ref[assets.Texture]('monsters/${e}${lv}.png')
}

// base art size for a player monster, grown a bit per level.
fn monster_size(e string, level int) core.Vec2 {
	base := match e {
		'fire'  { core.vec2(108, 171) }
		'water' { core.vec2(139, 172) }
		'earth' { core.vec2(116, 137) }
		else    { core.vec2(97, 126) }
	}
	// cap the level growth so high-level units still fit their grid cell
	mut lv := level
	if lv > 6 {
		lv = 6
	}
	k := 0.42 * (1 + 0.16 * f32(lv - 1)) // 50% zoom: units small, like the reference arena
	return core.vec2(base.x * k, base.y * k)
}

// ranged style per player element (wind & water shoot from afar).
fn element_ranged(e string) bool {
	return element_data(e).ranged
}

fn element_range(e string) f32 {
	return element_data(e).range
}

fn projectile_tex(e string) assets.AssetRef[assets.Texture] {
	img := if e == 'enemy' || e == '' {
		'fx/proj_magic.png'
	} else {
		element_data(e).proj
	}
	if img == '' {
		return assets.ref[assets.Texture]('fx/proj_magic.png')
	}
	return assets.ref[assets.Texture](img)
}

// ---------------------------------------------------------------------------
// HP bar — a ProgressBar child that follows its monster.
// ---------------------------------------------------------------------------
pub fn make_hp_bar(mut monster_node &core.Node, w f32, offy f32) &core.Node {
	mut bar := core.Node.new('HpBar')
		.with(&render.UITransform{ size: core.vec2(w, 7), anchor: core.vec2(0.5, 0.5) })
		.with(&render.ProgressBar{
			progress:   1.0
			back_color: core.rgba(10, 10, 20, 220)
			fill_color: core.rgba(80, 220, 90, 255)
		})
	bar.position = core.vec2(0, offy)
	bar.z_index = 5
	monster_node.add_child(mut bar)
	return bar
}

// refresh_hp_bar keeps the bar in step with the monster's hp.
pub fn refresh_hp_bar(m &Monster) {
	n := m.node.find('HpBar') or { return }
	mut b := n.get_component[render.ProgressBar]() or { return }
	b.progress = if m.max_hp > 0 { m.hp / m.max_hp } else { 0 }
	b.fill_color = if b.progress > 0.5 {
		core.rgba(80, 220, 90, 255)
	} else if b.progress > 0.25 {
		core.rgba(240, 200, 60, 255)
	} else {
		core.rgba(230, 60, 50, 255)
	}
}

// level label — a small "L2" tag above an enemy.
pub fn make_level_tag(mut monster_node &core.Node, offy f32) {
	if monster_node.find('LvTag') != none {
		return
	}
	mut tag := core.Node.new('LvTag')
		.with(&render.Label{
			text:  ''
			size:  15
			align: 'center'
			color: core.rgba(255, 240, 160, 255)
		})
	tag.position = core.vec2(0, offy)
	tag.z_index = 6
	monster_node.add_child(mut tag)
}

pub fn set_level_tag(monster_node &core.Node, level int) {
	if mut tag := monster_node.find('LvTag') {
		if mut l := tag.get_component[render.Label]() {
			l.text = 'L${level}'
		}
	}
}

// ---------------------------------------------------------------------------
// Status icons — small colored dots above each unit, one per active status.
// Order: burn, poison, freeze, stun, atk_up, shield, regen, weak, slow.
// ---------------------------------------------------------------------------
pub fn make_status_icons(mut monster_node &core.Node, offy f32) {
	if monster_node.find('St0') != none {
		return
	}
	colors := [core.rgba(255, 90, 70, 255), core.rgba(120, 230, 90, 255),
		core.rgba(110, 190, 255, 255), core.rgba(255, 220, 80, 255), core.rgba(255, 150, 40, 255),
		core.rgba(80, 140, 255, 255), core.rgba(80, 255, 180, 255), core.rgba(180, 160, 220, 255),
		core.rgba(200, 120, 255, 255)]
	for i in 0 .. 9 {
		mut d := core.Node.new('St${i}')
			.with(&render.UITransform{ size: core.vec2(12, 12), anchor: core.vec2(0.5, 0.5) })
			.with(&render.Panel{ color: colors[i], radius: 6 })
		d.position = core.vec2(f32(-48 + i * 12), offy)
		d.z_index = 7
		d.active = false
		monster_node.add_child(mut d)
	}
}

// refresh_status_icons — shows the dots for active statuses.
pub fn refresh_status_icons(m &Monster) {
	mut n := m.node
	mut on := [m.burn_left > 0, m.poison_left > 0, m.freeze_left > 0, m.stun_left > 0,
		m.atk_left > 0, m.shield > 0, m.regen_left > 0, m.weak_left > 0, m.slow_left > 0]
	for i in 0 .. 9 {
		if mut d := n.find('St${i}') {
			d.active = on[i]
		}
	}
}
