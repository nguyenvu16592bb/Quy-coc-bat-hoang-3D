module main

// ============================================================================
//  equipment.v — gear: 6 slots, enhance, gems and drops.
//
//  Slots: 0 weapon (vũ khí), 1 armor (áo), 2 hat (mũ), 3 boots (giày),
//  4 ring (nhẫn), 5 necklace (dây chuyền). Equipped item ids live in
//  GState.equip_slots (-1 = empty) and their enhance levels in
//  GState.equip_level; socketed gem ids live in GState.gem_slots.
//  Each enhance level adds 8% of the item's base stats; the success rate
//  falls every level and the roll is deterministic from the game state, so
//  the same state always gives the same result.
// ============================================================================

pub const slot_weapon = 0
pub const slot_armor = 1
pub const slot_hat = 2
pub const slot_boots = 3
pub const slot_ring = 4
pub const slot_necklace = 5
pub const equip_slot_count = 6
pub const enhance_max = 10

pub const slot_names = ['Vũ Khí', 'Áo', 'Mũ', 'Giày', 'Nhẫn', 'Dây Chuyền']

pub struct ItemDef {
pub:
	id         int
	name       string
	slot       int
	atk        int
	hp         int
	def        int
	crit_add   f32
	rarity     string
	price_gold int
}

pub const equip_items = [
	ItemDef{
		id:         100
		name:       'Bát Hoang Kiếm'
		slot:       0
		atk:        45
		hp:         0
		def:        0
		crit_add:   0.05
		rarity:     'Sử Thi'
		price_gold: 1200
	},
	ItemDef{
		id:         101
		name:       'Thanh Đồng Kiếm'
		slot:       0
		atk:        15
		hp:         0
		def:        0
		crit_add:   0.01
		rarity:     'Thường'
		price_gold: 300
	},
	ItemDef{
		id:         102
		name:       'Huyền Thiết Giáp'
		slot:       1
		atk:        0
		hp:         80
		def:        8
		crit_add:   0.0
		rarity:     'Hiếm'
		price_gold: 350
	},
	ItemDef{
		id:         103
		name:       'Kim Cang Bảo Y'
		slot:       1
		atk:        5
		hp:         180
		def:        18
		crit_add:   0.0
		rarity:     'Sử Thi'
		price_gold: 1500
	},
	ItemDef{
		id:         104
		name:       'Mũ Lưu Vân'
		slot:       2
		atk:        0
		hp:         50
		def:        6
		crit_add:   0.02
		rarity:     'Hiếm'
		price_gold: 400
	},
	ItemDef{
		id:         105
		name:       'Mũ Thiên Tằm'
		slot:       2
		atk:        3
		hp:         90
		def:        10
		crit_add:   0.03
		rarity:     'Sử Thi'
		price_gold: 900
	},
	ItemDef{
		id:         106
		name:       'Giày Đạp Tuyết'
		slot:       3
		atk:        4
		hp:         40
		def:        5
		crit_add:   0.02
		rarity:     'Hiếm'
		price_gold: 380
	},
	ItemDef{
		id:         107
		name:       'Giày Phong Hành'
		slot:       3
		atk:        8
		hp:         60
		def:        7
		crit_add:   0.04
		rarity:     'Sử Thi'
		price_gold: 950
	},
	ItemDef{
		id:         108
		name:       'Nhẫn Huyết Ngọc'
		slot:       4
		atk:        12
		hp:         0
		def:        0
		crit_add:   0.06
		rarity:     'Hiếm'
		price_gold: 600
	},
	ItemDef{
		id:         109
		name:       'Nhẫn Long Hồn'
		slot:       4
		atk:        22
		hp:         30
		def:        0
		crit_add:   0.08
		rarity:     'Sử Thi'
		price_gold: 1400
	},
	ItemDef{
		id:         110
		name:       'Dây Chuyền Linh Lung'
		slot:       5
		atk:        6
		hp:         60
		def:        4
		crit_add:   0.03
		rarity:     'Hiếm'
		price_gold: 500
	},
	ItemDef{
		id:         111
		name:       'Dây Chuyền Phượng Hoàng'
		slot:       5
		atk:        14
		hp:         100
		def:        6
		crit_add:   0.05
		rarity:     'Truyền Thuyết'
		price_gold: 2200
	},
	ItemDef{
		id:         112
		name:       'Dây Chuyền Bát Hoang'
		slot:       5
		atk:        18
		hp:         120
		def:        8
		crit_add:   0.06
		rarity:     'Truyền Thuyết'
		price_gold: 2600
	},
]

pub struct GemDef {
pub:
	id       int
	name     string
	kind     string
	atk      int
	hp       int
	def      int
	crit_add f32
}

pub const gems = [
	GemDef{
		id:       200
		name:     'Hồng Ngọc'
		kind:     'atk'
		atk:      10
		hp:       0
		def:      0
		crit_add: 0.0
	},
	GemDef{
		id:       201
		name:     'Lục Ngọc'
		kind:     'hp'
		atk:      0
		hp:       60
		def:      0
		crit_add: 0.0
	},
	GemDef{
		id:       202
		name:     'Lam Ngọc'
		kind:     'def'
		atk:      0
		hp:       0
		def:      8
		crit_add: 0.0
	},
	GemDef{
		id:       203
		name:     'Tử Ngọc'
		kind:     'crit'
		atk:      0
		hp:       0
		def:      0
		crit_add: 0.04
	},
	GemDef{
		id:       204
		name:     'Kim Ngọc'
		kind:     'atk'
		atk:      20
		hp:       0
		def:      3
		crit_add: 0.02
	},
	GemDef{
		id:       205
		name:     'Huyết Ngọc'
		kind:     'hp'
		atk:      8
		hp:       100
		def:      0
		crit_add: 0.0
	},
]

pub struct DropEntry {
pub:
	enemy_kind string
	item_id    int
	rate_pct   int
}

pub const drop_table = [
	DropEntry{
		enemy_kind: 'yêu thú'
		item_id:    101
		rate_pct:   8
	},
	DropEntry{
		enemy_kind: 'yêu thú'
		item_id:    200
		rate_pct:   12
	},
	DropEntry{
		enemy_kind: 'ác só'
		item_id:    104
		rate_pct:   10
	},
	DropEntry{
		enemy_kind: 'ác só'
		item_id:    106
		rate_pct:   10
	},
	DropEntry{
		enemy_kind: 'tinh anh'
		item_id:    102
		rate_pct:   15
	},
	DropEntry{
		enemy_kind: 'tinh anh'
		item_id:    108
		rate_pct:   12
	},
	DropEntry{
		enemy_kind: 'tinh anh'
		item_id:    110
		rate_pct:   10
	},
	DropEntry{
		enemy_kind: 'Ma Tôn'
		item_id:    100
		rate_pct:   25
	},
	DropEntry{
		enemy_kind: 'Ma Tôn'
		item_id:    103
		rate_pct:   20
	},
	DropEntry{
		enemy_kind: 'Ma Tôn'
		item_id:    109
		rate_pct:   18
	},
	DropEntry{
		enemy_kind: 'boss bang'
		item_id:    111
		rate_pct:   30
	},
	DropEntry{
		enemy_kind: 'boss bang'
		item_id:    105
		rate_pct:   22
	},
	DropEntry{
		enemy_kind: 'boss bang'
		item_id:    112
		rate_pct:   15
	},
]

// item_def: the equipment entry of an id (safe for any id, falls back to item 100).
fn item_def(id int) ItemDef {
	for it in equip_items {
		if it.id == id {
			return it
		}
	}
	return equip_items[0]
}

// gem_def: the gem entry of an id (safe for any id, falls back to gem 200).
fn gem_def(id int) GemDef {
	for gm in gems {
		if gm.id == id {
			return gm
		}
	}
	return gems[0]
}

// equip_item: move an item from the bag into its slot. The old item in that
// slot (if any) goes back to the bag. Returns false when not in the bag.
fn equip_item(item_id int) bool {
	it := item_def(item_id)
	if it.id != item_id {
		return false
	}
	if !inventory_remove(item_id) {
		return false
	}
	mut s := gs()
	old := s.equip_slots[it.slot]
	if old >= 0 {
		inventory_add(old)
	}
	s.equip_slots[it.slot] = item_id
	s.equip_level[it.slot] = 0
	apply_equip_stats()
	return true
}

// unequip_slot: move the item in a slot back to the bag. Returns false when
// the slot is empty or the slot index is bad.
fn unequip_slot(slot int) bool {
	if slot < 0 || slot >= equip_slot_count {
		return false
	}
	mut s := gs()
	old := s.equip_slots[slot]
	if old < 0 {
		return false
	}
	s.equip_slots[slot] = -1
	s.equip_level[slot] = 0
	s.gem_slots[slot] = -1
	inventory_add(old)
	apply_equip_stats()
	return true
}

// enhance_cost: gold for the next enhance level of a slot.
fn enhance_cost(slot int) int {
	lv := gs().equip_level[slot]
	return 100 * (lv + 1)
}

// enhance_rate: success chance (percent) for the next enhance level.
fn enhance_rate(slot int) int {
	lv := gs().equip_level[slot]
	r := 100 - lv * 10
	if r < 10 {
		return 10
	}
	return r
}

// enhance_roll: deterministic roll 0..99 from the game state. The attempts
// term (+29 per try, mirrors HTML enhanceAttempts * 29) reseeds the roll on
// every try, so a failed attempt does not repeat the exact same result
// forever while the rest of the state stays unchanged.
fn enhance_roll(slot int) int {
	s := gs()
	return (s.kills * 37 + slot * 13 + s.equip_level[slot] * 7 + s.level * 11 + s.enhance_attempts * 29) % 100
}

// enhance_slot: try to raise a slot's enhance level by 1. Costs gold; on
// failure the gold is still spent and the level stays. Returns false when
// the slot is empty, already at max, or gold is short.
fn enhance_slot(slot int) bool {
	if slot < 0 || slot >= equip_slot_count {
		return false
	}
	mut s := gs()
	if s.equip_slots[slot] < 0 {
		return false
	}
	if s.equip_level[slot] >= enhance_max {
		return false
	}
	cost := enhance_cost(slot)
	if !spend_gold(cost) {
		return false
	}
	// every paid try reseeds the roll (see enhance_roll)
	s.enhance_attempts += 1
	if enhance_roll(slot) < enhance_rate(slot) {
		s.equip_level[slot] += 1
		apply_equip_stats()
		show_banner('Cường hóa ${slot_names[slot]} lên +${s.equip_level[slot]} thành công!')
		return true
	}
	show_banner('Cường hóa ${slot_names[slot]} thất bại.')
	return true
}

// socket_gem: put a gem from the bag into a slot's gem socket. The old gem
// (if any) goes back to the bag. Returns false when the slot is empty or
// the gem is not in the bag.
fn socket_gem(slot int, gem_id int) bool {
	if slot < 0 || slot >= equip_slot_count {
		return false
	}
	gm := gem_def(gem_id)
	if gm.id != gem_id {
		return false
	}
	mut s := gs()
	if s.equip_slots[slot] < 0 {
		return false
	}
	if !inventory_remove(gem_id) {
		return false
	}
	old := s.gem_slots[slot]
	if old >= 0 {
		inventory_add(old)
	}
	s.gem_slots[slot] = gem_id
	apply_equip_stats()
	return true
}

// equip_total_atk / equip_total_hp / equip_total_def / equip_total_crit:
// the summed bonus of all equipped items (each +8% per enhance level) plus
// all socketed gems.
fn equip_total_atk() int {
	mut total := 0
	s := gs()
	for slot in 0 .. equip_slot_count {
		if s.equip_slots[slot] < 0 {
			continue
		}
		it := item_def(s.equip_slots[slot])
		total += it.atk + it.atk * s.equip_level[slot] * 8 / 100
		if s.gem_slots[slot] >= 0 {
			total += gem_def(s.gem_slots[slot]).atk
		}
	}
	return total
}

fn equip_total_hp() int {
	mut total := 0
	s := gs()
	for slot in 0 .. equip_slot_count {
		if s.equip_slots[slot] < 0 {
			continue
		}
		it := item_def(s.equip_slots[slot])
		total += it.hp + it.hp * s.equip_level[slot] * 8 / 100
		if s.gem_slots[slot] >= 0 {
			total += gem_def(s.gem_slots[slot]).hp
		}
	}
	return total
}

fn equip_total_def() int {
	mut total := 0
	s := gs()
	for slot in 0 .. equip_slot_count {
		if s.equip_slots[slot] < 0 {
			continue
		}
		it := item_def(s.equip_slots[slot])
		total += it.def + it.def * s.equip_level[slot] * 8 / 100
		if s.gem_slots[slot] >= 0 {
			total += gem_def(s.gem_slots[slot]).def
		}
	}
	return total
}

fn equip_total_crit() f32 {
	mut total := f32(0)
	s := gs()
	for slot in 0 .. equip_slot_count {
		if s.equip_slots[slot] < 0 {
			continue
		}
		it := item_def(s.equip_slots[slot])
		total += it.crit_add
		if s.gem_slots[slot] >= 0 {
			total += gem_def(s.gem_slots[slot]).crit_add
		}
	}
	return total
}

// apply_equip_stats: fold the equipment totals into the hero stats, on top
// of the level base and the sect bonus (recomputed first, so nothing stacks).
fn apply_equip_stats() {
	apply_sect_buff()
	mut s := gs()
	s.atk += equip_total_atk()
	s.max_hp += equip_total_hp()
	s.def += equip_total_def()
	s.crit += equip_total_crit()
	if s.hp > s.max_hp {
		s.hp = s.max_hp
	}
	publish()
}

// roll_drop: pick the drop for a killed enemy kind from a seed (0..99 roll
// derived from the seed). Returns the dropped item id, or -1 when nothing drops.
fn roll_drop(enemy_kind string, seed int) int {
	roll := seed % 100
	if roll < 0 {
		return -1
	}
	for d in drop_table {
		if d.enemy_kind == enemy_kind && roll < d.rate_pct {
			return d.item_id
		}
	}
	return -1
}

// drop_rate: the drop chance (percent) of one item from one enemy kind, or 0.
fn drop_rate(enemy_kind string, item_id int) int {
	for d in drop_table {
		if d.enemy_kind == enemy_kind && d.item_id == item_id {
			return d.rate_pct
		}
	}
	return 0
}
