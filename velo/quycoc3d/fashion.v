module main

import velo.core
import velo.render3d

// ===========================================================================
//  fashion.v — thời trang (vòng 3, nhóm 2).
//
//  8 bộ thời trang, mỗi bộ đổi màu áo nhân vật 3D thật (màu nhuộm của
//  SkinnedModel3D trên cả đội hình — cùng cơ chế equip_hero trong team.v)
//  và +chỉ số nhỏ. Mua bằng vàng, mặc/tháo thật, lưu cùng save.
//  Chỉ số cộng vào max_hp/atk qua fashion_bonus_hp()/fashion_bonus_atk(),
//  được apply_hero_stats() và gain_exp() cộng thêm (game.v).
//  Không có component mới — không cần đăng ký trong main.v.
//
//  Chuẩn chung vòng 3: xem battle_map.v (nộ khí / raid / AoE / boss thế giới).
// ===========================================================================

pub struct FashionDef {
pub:
	id        int
	name      string
	icon      string
	tint      core.Color
	hp_bonus  int
	atk_bonus int
	cost_gold int
	desc      string
}

pub const fashions = [
	FashionDef{
		id:        0
		name:      'Bạch Y'
		icon:      '🤍'
		tint:      core.rgba(241, 243, 245, 255)
		hp_bonus:  20
		atk_bonus: 2
		cost_gold: 800
		desc:      'Áo trắng tinh khôi.'
	},
	FashionDef{
		id:        1
		name:      'Hắc Y'
		icon:      '🖤'
		tint:      core.rgba(43, 43, 48, 255)
		hp_bonus:  20
		atk_bonus: 2
		cost_gold: 800
		desc:      'Áo đen bí ẩn.'
	},
	FashionDef{
		id:        2
		name:      'Hồng Y'
		icon:      '❤️'
		tint:      core.rgba(224, 49, 49, 255)
		hp_bonus:  30
		atk_bonus: 3
		cost_gold: 1500
		desc:      'Áo đỏ rực lửa.'
	},
	FashionDef{
		id:        3
		name:      'Kim Giáp'
		icon:      '👑'
		tint:      core.rgba(255, 212, 59, 255)
		hp_bonus:  60
		atk_bonus: 6
		cost_gold: 5000
		desc:      'Giáp vàng chói lọi.'
	},
	FashionDef{
		id:        4
		name:      'Thanh Sam'
		icon:      '🌿'
		tint:      core.rgba(47, 158, 68, 255)
		hp_bonus:  30
		atk_bonus: 3
		cost_gold: 1500
		desc:      'Áo xanh lá thanh thoát.'
	},
	FashionDef{
		id:        5
		name:      'Tử Y'
		icon:      '💜'
		tint:      core.rgba(112, 72, 232, 255)
		hp_bonus:  40
		atk_bonus: 4
		cost_gold: 3000
		desc:      'Áo tím quý phái.'
	},
	FashionDef{
		id:        6
		name:      'Tuyết Y'
		icon:      '❄️'
		tint:      core.rgba(202, 232, 255, 255)
		hp_bonus:  40
		atk_bonus: 4
		cost_gold: 3000
		desc:      'Áo trắng tuyết lạnh.'
	},
	FashionDef{
		id:        7
		name:      'Ma Tôn'
		icon:      '😈'
		tint:      core.rgba(134, 46, 156, 255)
		hp_bonus:  80
		atk_bonus: 8
		cost_gold: 10000
		desc:      'Áo ma tôn uy nghiêm.'
	},
]

// fashion_def: bộ thời trang theo id (an toàn với id lạ, trả về Bạch Y).
fn fashion_def(id int) FashionDef {
	if id < 0 || id >= fashions.len {
		return fashions[0]
	}
	return fashions[id]
}

// fashion_bonus_hp / fashion_bonus_atk: chỉ số cộng thêm của bộ đang mặc.
fn fashion_bonus_hp() int {
	s := gs()
	if s.fashion_id < 0 || s.fashion_id >= fashions.len {
		return 0
	}
	return fashions[s.fashion_id].hp_bonus
}

fn fashion_bonus_atk() int {
	s := gs()
	if s.fashion_id < 0 || s.fashion_id >= fashions.len {
		return 0
	}
	return fashions[s.fashion_id].atk_bonus
}

// fashion_buy: mua bộ thời trang bằng vàng. False khi đã sở hữu/thiếu vàng.
fn fashion_buy(id int) bool {
	if id < 0 || id >= fashions.len {
		return false
	}
	mut s := gs()
	if s.fashion_owned[id] {
		return false
	}
	if !spend_gold(fashions[id].cost_gold) {
		return false
	}
	s.fashion_owned[id] = true
	show_banner('Đã mua ${fashions[id].name}! Bấm Mặc để thay đồ.')
	publish()
	return true
}

// fashion_wear: mặc bộ đã sở hữu — nhuộm màu áo cả đội hình + cộng chỉ số.
// Mặc lại bộ đang mặc thì cởi ra (về màu áo đội trưởng).
fn fashion_wear(id int) bool {
	if id < 0 || id >= fashions.len {
		return false
	}
	mut s := gs()
	if !s.fashion_owned[id] {
		return false
	}
	if s.fashion_id == id {
		return fashion_remove()
	}
	s.fashion_id = id
	fashion_apply_tint()
	apply_hero_stats()
	show_banner('Đã mặc ${fashions[id].name}! Áo nhân vật đổi màu thật.')
	publish()
	return true
}

// fashion_remove: cởi thời trang, trả màu áo về theo từng hero (equip_hero).
fn fashion_remove() bool {
	mut s := gs()
	if s.fashion_id < 0 {
		return false
	}
	s.fashion_id = -1
	for i in 0 .. s.party.len {
		equip_hero(s.party[i], party_hero_id(i))
	}
	apply_hero_stats()
	show_banner('Đã cởi thời trang, trở về màu áo đội trưởng.')
	publish()
	return true
}

// fashion_apply_tint: nhuộm màu áo của cả đội hình theo bộ đang mặc.
// Không mặc gì thì không làm gì (màu áo vẫn là màu hero).
fn fashion_apply_tint() {
	s := gs()
	if s.fashion_id < 0 || s.fashion_id >= fashions.len {
		return
	}
	tint := fashions[s.fashion_id].tint
	for i in 0 .. s.party.len {
		mut n := s.party[i]
		if mut sk := n.get_component[render3d.SkinnedModel3D]() {
			sk.color = tint
		}
	}
}
