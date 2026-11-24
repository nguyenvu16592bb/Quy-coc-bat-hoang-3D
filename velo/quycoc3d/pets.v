module main

// ============================================================================
//  pets.v — spirit pets (thần thú).
//
//  Six pets, each with its own element, base stats and signature skill. One
//  pet follows the hero at a time and adds its attack to every hit; evolving
//  a pet costs spirit stones and gold and raises its stats every evolution
//  level (+12% attack, +10% HP per level, up to the pet's evolution cap).
// ============================================================================

pub struct PetDef {
pub:
	id               int
	name             string
	kind             string
	base_atk         int
	base_hp          int
	skill_name       string
	skill_dmg        int
	skill_cd         f32
	evo_max          int
	evo_cost_stone   int
	evo_cost_gold    int
	desc             string
}

pub const pets = [
	PetDef{
		id:             0
		name:           'Thanh Long'
		kind:           'Mộc'
		base_atk:       30
		base_hp:        200
		skill_name:     'Long Ngâm Cửu Thiên'
		skill_dmg:      150
		skill_cd:       6.0
		evo_max:        5
		evo_cost_stone: 10
		evo_cost_gold:  300
		desc:           'Thần thú phương Đông, rồng xanh ngự phong lôi.'
	},
	PetDef{
		id:             1
		name:           'Bạch Hổ'
		kind:           'Kim'
		base_atk:       36
		base_hp:        160
		skill_name:     'Hổ Gầm Sơn Lâm'
		skill_dmg:      170
		skill_cd:       5.0
		evo_max:        5
		evo_cost_stone: 10
		evo_cost_gold:  300
		desc:           'Chúa tể phương Tây, móng vuốt xé toạc giáp sắt.'
	},
	PetDef{
		id:             2
		name:           'Chu Tước'
		kind:           'Hỏa'
		base_atk:       34
		base_hp:        150
		skill_name:     'Phượng Hoàng Lửa'
		skill_dmg:      180
		skill_cd:       5.5
		evo_max:        5
		evo_cost_stone: 12
		evo_cost_gold:  350
		desc:           'Chim lửa phương Nam, đốt cháy mọi yêu ma.'
	},
	PetDef{
		id:             3
		name:           'Huyền Vũ'
		kind:           'Thủy'
		base_atk:       22
		base_hp:        320
		skill_name:     'Huyền Vũ Hộ Thể'
		skill_dmg:      90
		skill_cd:       7.0
		evo_max:        5
		evo_cost_stone: 10
		evo_cost_gold:  300
		desc:           'Rùa rắn phương Bắc, mai cứng hơn huyền thiết.'
	},
	PetDef{
		id:             4
		name:           'Kỳ Lân'
		kind:           'Thổ'
		base_atk:       32
		base_hp:        240
		skill_name:     'Kỳ Lân Thụy Khí'
		skill_dmg:      160
		skill_cd:       6.0
		evo_max:        6
		evo_cost_stone: 15
		evo_cost_gold:  500
		desc:           'Thú lành ngàn năm có một, mang điềm lành cho chủ nhân.'
	},
	PetDef{
		id:             5
		name:           'Cửu Vĩ Hồ'
		kind:           'Hỏa'
		base_atk:       38
		base_hp:        170
		skill_name:     'Cửu Vĩ Hồ Hỏa'
		skill_dmg:      200
		skill_cd:       4.5
		evo_max:        6
		evo_cost_stone: 15
		evo_cost_gold:  500
		desc:           'Hồ ly chín đuôi, mị hoặc và lửa hồ thiêu rụi kẻ địch.'
	},
]

// pet_def: the pet entry of an id (safe for any id, falls back to pet 0).
fn pet_def(id int) PetDef {
	if id < 0 || id >= pets.len {
		return pets[0]
	}
	return pets[id]
}

// select_pet: choose the pet that follows the hero. A fresh pet starts at
// evolution level 0. Returns false for a bad id.
fn select_pet(id int) bool {
	if id < 0 || id >= pets.len {
		return false
	}
	mut s := gs()
	s.pet_id = id
	s.pet_evo = 0
	s.pet_level = 1
	d := pet_def(id)
	show_banner('Thần thú ${d.name} đã theo cùng!')
	return true
}

// pet_atk: the following pet's attack bonus (base +12% per evolution level).
fn pet_atk() int {
	if gs().pet_id < 0 {
		return 0
	}
	d := pet_def(gs().pet_id)
	return d.base_atk + d.base_atk * gs().pet_evo * 12 / 100
}

// pet_hp: the following pet's HP bonus (base +10% per evolution level).
fn pet_hp() int {
	if gs().pet_id < 0 {
		return 0
	}
	d := pet_def(gs().pet_id)
	return d.base_hp + d.base_hp * gs().pet_evo * 10 / 100
}

// pet_skill_damage: the following pet's signature skill damage, with the
// evolution attack growth folded in. Returns 0 with no pet.
fn pet_skill_damage() int {
	if gs().pet_id < 0 {
		return 0
	}
	d := pet_def(gs().pet_id)
	return d.skill_dmg + pet_atk() / 2
}

// pet_hit_damage: extra damage the pet adds to a normal hit (half its attack,
// at least 1 when a pet follows).
fn pet_hit_damage() int {
	if gs().pet_id < 0 {
		return 0
	}
	dmg := pet_atk() / 2
	if dmg < 1 {
		return 1
	}
	return dmg
}

// evolve_cost_stone / evolve_cost_gold: the cost of the next evolution level
// (base cost, +50% per level already evolved).
fn evolve_cost_stone() int {
	if gs().pet_id < 0 {
		return 0
	}
	d := pet_def(gs().pet_id)
	return d.evo_cost_stone + d.evo_cost_stone * gs().pet_evo / 2
}

fn evolve_cost_gold() int {
	if gs().pet_id < 0 {
		return 0
	}
	d := pet_def(gs().pet_id)
	return d.evo_cost_gold + d.evo_cost_gold * gs().pet_evo / 2
}

// evolve_pet: raise the following pet one evolution level. Costs spirit
// stones and gold; fails with no pet, at the evolution cap, or when the
// cost cannot be paid.
fn evolve_pet() bool {
	mut s := gs()
	if s.pet_id < 0 {
		return false
	}
	d := pet_def(s.pet_id)
	if s.pet_evo >= d.evo_max {
		return false
	}
	cost_stone := evolve_cost_stone()
	cost_gold := evolve_cost_gold()
	if s.stones < cost_stone || s.gold < cost_gold {
		return false
	}
	if !spend_stones(cost_stone) {
		return false
	}
	if !spend_gold(cost_gold) {
		add_stones(cost_stone)
		return false
	}
	s.pet_evo += 1
	s.pet_level += 1
	show_banner('${d.name} tiến hóa lên cấp ${s.pet_evo}! Công +${pet_atk()}, HP +${pet_hp()}.')
	return true
}

// feed_pet: feed the pet one pet food (shop id 7), raising pet_level by 1.
// Returns false with no pet or no food in the bag.
fn feed_pet() bool {
	mut s := gs()
	if s.pet_id < 0 {
		return false
	}
	if !inventory_remove(7) {
		return false
	}
	s.pet_level += 1
	return true
}
