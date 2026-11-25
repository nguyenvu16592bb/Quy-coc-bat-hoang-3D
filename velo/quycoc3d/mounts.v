module main

// ===========================================================================
//  mounts.v — tọa kỵ (vòng 3, nhóm 2).
//
//  6 tọa kỵ, mỗi con +tốc độ di chuyển và +chỉ số (HP/Công). Mua bằng vàng,
//  cưỡi được trên map (tốc độ thật qua HeroController.speed — mount_speed_mult
//  được cộng vào tốc độ gốc trong team.v switch_leader và game.v, xem
//  mount_apply_speed), nâng cấp bằng linh thạch (GState.stones).
//  Chỉ số cộng vào max_hp/atk qua mount_bonus_hp()/mount_bonus_atk(), được
//  apply_hero_stats() và gain_exp() cộng thêm (game.v) nên không bị mất khi
//  lên cấp hay đổi đội trưởng. Không có component mới — không cần đăng ký
//  trong main.v.
//
//  Chuẩn chung vòng 3: xem battle_map.v (nộ khí / raid / AoE / boss thế giới).
// ===========================================================================

pub struct MountDef {
pub:
	id         int
	name       string
	icon       string
	speed_mult f32
	hp_bonus   int
	atk_bonus  int
	cost_gold  int
	desc       string
	winged     bool
}

pub const mounts = [
	MountDef{
		id:         0
		name:       'Ngựa Bạch'
		icon:       '🐴'
		speed_mult: f32(1.25)
		hp_bonus:   40
		atk_bonus:  4
		cost_gold:  500
		desc:       'Ngựa trắng thuần chủng. +25% tốc độ di chuyển.'
	},
	MountDef{
		id:         1
		name:       'Hắc Mã'
		icon:       '🐎'
		speed_mult: f32(1.35)
		hp_bonus:   60
		atk_bonus:  6
		cost_gold:  1500
		desc:       'Ngựa đen phi như gió. +35% tốc độ di chuyển.'
	},
	MountDef{
		id:         2
		name:       'Kỳ Lân'
		icon:       '🦄'
		speed_mult: f32(1.5)
		hp_bonus:   100
		atk_bonus:  10
		cost_gold:  5000
		desc:       'Thú cưỡi của tiên nhân. +50% tốc độ di chuyển.'
	},
	MountDef{
		id:         3
		name:       'Phượng Hoàng'
		icon:       '🔥'
		speed_mult: f32(1.6)
		hp_bonus:   150
		atk_bonus:  15
		cost_gold:  12000
		desc:       'Chim lửa bay lượn. +60% tốc độ di chuyển.'
		winged:     true
	},
	MountDef{
		id:         4
		name:       'Thanh Long'
		icon:       '🐉'
		speed_mult: f32(1.75)
		hp_bonus:   250
		atk_bonus:  25
		cost_gold:  30000
		desc:       'Thần thú phương Đông. +75% tốc độ di chuyển.'
	},
	MountDef{
		id:         5
		name:       'Thần Điêu'
		icon:       '🦅'
		speed_mult: f32(2.0)
		hp_bonus:   400
		atk_bonus:  40
		cost_gold:  80000
		desc:       'Thần điêu oai phong. +100% tốc độ di chuyển.'
		winged:     true
	},
]

pub const mount_max_lv = 5 // mỗi cấp +20 HP +2 Công
pub const mount_upgrade_base_stones = 5 // nâng cấp tốn 5*(cấp+1) linh thạch

// mount_def: tọa kỵ theo id (an toàn với id lạ, trả về Ngựa Bạch).
fn mount_def(id int) MountDef {
	if id < 0 || id >= mounts.len {
		return mounts[0]
	}
	return mounts[id]
}

// mount_bonus_hp / mount_bonus_atk: chỉ số cộng thêm của tọa kỵ đang cưỡi
// (gốc + 20 HP / +2 Công mỗi cấp nâng). Không cưỡi thì bằng 0.
fn mount_bonus_hp() int {
	s := gs()
	if !s.mount_riding || s.mount_id < 0 || s.mount_id >= mounts.len {
		return 0
	}
	m := mounts[s.mount_id]
	return m.hp_bonus + s.mount_level[s.mount_id] * 20
}

fn mount_bonus_atk() int {
	s := gs()
	if !s.mount_riding || s.mount_id < 0 || s.mount_id >= mounts.len {
		return 0
	}
	m := mounts[s.mount_id]
	return m.atk_bonus + s.mount_level[s.mount_id] * 2
}

// mount_speed_mult: hệ số tốc độ của tọa kỵ đang cưỡi (1.0 khi không cưỡi).
fn mount_speed_mult() f32 {
	s := gs()
	if !s.mount_riding || s.mount_id < 0 || s.mount_id >= mounts.len {
		return f32(1.0)
	}
	return mounts[s.mount_id].speed_mult
}

// mount_buy: mua tọa kỵ bằng vàng. Trả về false khi đã sở hữu hoặc thiếu vàng.
fn mount_buy(id int) bool {
	if id < 0 || id >= mounts.len {
		return false
	}
	mut s := gs()
	if s.mount_owned[id] {
		return false
	}
	if !spend_gold(m.cost_gold) {
		return false
	}
	s.mount_owned[id] = true
	show_banner('Đã mua ${m.name}! Bấm cưỡi để lên ngựa.')
	publish()
	return true
}

// mount_ride: cưỡi tọa kỵ đã sở hữu (đổi tốc độ + chỉ số thật qua
// apply_hero_stats). Cưỡi lại con đang cưỡi thì xuống ngựa.
fn mount_ride(id int) bool {
	if id < 0 || id >= mounts.len {
		return false
	}
	mut s := gs()
	if !s.mount_owned[id] {
		return false
	}
	if s.mount_riding && s.mount_id == id {
		return mount_leave()
	}
	s.mount_id = id
	s.mount_riding = true
	apply_hero_stats()
	mount_apply_speed()
	show_banner('Đã cưỡi ${mounts[id].name}! Tốc độ x${mounts[id].speed_mult}.')
	publish()
	return true
}

// mount_leave: xuống ngựa (tốc độ + chỉ số trở về như cũ).
fn mount_leave() bool {
	mut s := gs()
	if !s.mount_riding {
		return false
	}
	s.mount_riding = false
	apply_hero_stats()
	mount_apply_speed()
	show_banner('Đã xuống ngựa.')
	publish()
	return true
}

// mount_upgrade: nâng cấp tọa kỵ đã sở hữu bằng linh thạch (5*(cấp+1) viên),
// tối đa mount_max_lv. Trả về false khi chưa sở hữu, đã tối đa hoặc thiếu đá.
fn mount_upgrade(id int) bool {
	if id < 0 || id >= mounts.len {
		return false
	}
	mut s := gs()
	if !s.mount_owned[id] {
		return false
	}
	if s.mount_level[id] >= mount_max_lv {
		return false
	}
	cost := mount_upgrade_base_stones * (s.mount_level[id] + 1)
	if !spend_stones(cost) {
		return false
	}
	s.mount_level[id]++
	if s.mount_riding && s.mount_id == id {
		apply_hero_stats()
	}
	show_banner('${mounts[id].name} lên cấp ${s.mount_level[id]}! (+20 HP, +2 Công mỗi cấp).')
	publish()
	return true
}

// mount_apply_speed: nhân tốc độ HeroController của leader với hệ số tọa kỵ.
// Gọi sau khi cưỡi/xuống ngựa và sau khi đổi đội trưởng (team.v).
fn mount_apply_speed() {
	s := gs()
	if s.party.len == 0 || s.leader < 0 || s.leader >= s.party.len {
		return
	}
	mult := mount_speed_mult()
	h := hero_def(s.hero_ids[s.leader])
	mut leader_node := s.party[s.leader]
	if mut hc := leader_node.get_component[HeroController]() {
		hc.speed = 7 * h.spd_mult * mult
		hc.aura_speed = 8.8 * h.spd_mult * mult
	}
}
