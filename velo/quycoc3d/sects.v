module main

// ============================================================================
//  sects.v — the eight martial sects (môn phái), Mộng Võ Lâm style.
//
//  Each sect grants fixed stat bonuses and two signature skills, and joining
//  one requires finishing its entry quest (level + gold). Switching sects
//  costs gold and replaces the old bonus — bonuses are always recomputed
//  from the base level formula, so they can never stack twice.
// ============================================================================

pub struct SectSkill {
pub:
	name string
	dmg  int
	cd   f32
}

pub struct SectDef {
pub:
	name               string
	desc               string
	atk_add            int
	hp_add             int
	def_add            int
	crit_add           f32
	skill1             SectSkill
	skill2             SectSkill
	quest_name         string
	quest_req          string
	quest_reward_gold  int
	quest_reward_exp   int
	req_level          int
	req_gold           int
}

pub const sects = [
	SectDef{
		name:      'Thiếu Lâm'
		desc:      'Thiên hạ võ công xuất Thiếu Lâm. Nội công thâm hậu, phòng thủ vững như bàn thạch.'
		atk_add:   12
		hp_add:    120
		def_add:   15
		crit_add:  0.02
		skill1:    SectSkill{
			name: 'La Hán Quyền'
			dmg:  120
			cd:   3.0
		}
		skill2:    SectSkill{
			name: 'Kim Cang Chưởng'
			dmg:  200
			cd:   6.0
		}
		quest_name:        'Nhập Môn Thiếu Lâm'
		quest_req:         'Đạt cấp 5, dâng 100 vàng hương hỏa'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Võ Đang'
		desc:      'Thái Cực sinh lưỡng nghi. Kiếm pháp nhu thắng cương, lấy chậm đánh nhanh.'
		atk_add:   10
		hp_add:    80
		def_add:   10
		crit_add:  0.04
		skill1:    SectSkill{
			name: 'Thái Cực Kiếm'
			dmg:  150
			cd:   4.0
		}
		skill2:    SectSkill{
			name: 'Thuần Dương Công'
			dmg:  180
			cd:   5.0
		}
		quest_name:        'Lên Núi Võ Đang'
		quest_req:         'Đạt cấp 5, dâng 100 vàng hương hỏa'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Nga Mi'
		desc:      'Kiếm pháp Nga Mi thanh lệ mà hiểm độc, Diệt Tuyệt thần kiếm danh chấn giang hồ.'
		atk_add:   8
		hp_add:    100
		def_add:   8
		crit_add:  0.05
		skill1:    SectSkill{
			name: 'Diệt Tuyệt Kiếm'
			dmg:  140
			cd:   3.5
		}
		skill2:    SectSkill{
			name: 'Cửu Âm Chân Kinh'
			dmg:  220
			cd:   7.0
		}
		quest_name:        'Bái Sư Nga Mi'
		quest_req:         'Đạt cấp 5, dâng 100 vàng hương hỏa'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Cái Bang'
		desc:      'Thiên hạ đệ nhất đại bang. Hàng Long Thập Bát Chưởng cương mãnh vô song.'
		atk_add:   14
		hp_add:    60
		def_add:   6
		crit_add:  0.03
		skill1:    SectSkill{
			name: 'Hàng Long Thập Bát Chưởng'
			dmg:  260
			cd:   8.0
		}
		skill2:    SectSkill{
			name: 'Đả Cẩu Bổng Pháp'
			dmg:  130
			cd:   3.0
		}
		quest_name:        'Nhập Bang Cái Bang'
		quest_req:         'Đạt cấp 5, dâng 100 vàng nghĩa khí'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Đường Môn'
		desc:      'Ám khí thiên hạ đệ nhất. Ra tay không thấy bóng, giết người trong chớp mắt.'
		atk_add:   16
		hp_add:    40
		def_add:   4
		crit_add:  0.08
		skill1:    SectSkill{
			name: 'Bạo Vũ Lê Hoa Châm'
			dmg:  180
			cd:   5.0
		}
		skill2:    SectSkill{
			name: 'Đường Môn Ám Khí'
			dmg:  110
			cd:   2.5
		}
		quest_name:        'Vào Đường Môn'
		quest_req:         'Đạt cấp 5, dâng 100 vàng lễ vật'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Minh Giáo'
		desc:      'Thánh hỏa chiếu sáng giang hồ. Càn Khôn Đại Na Di mượn lực đánh lực.'
		atk_add:   15
		hp_add:    70
		def_add:   8
		crit_add:  0.05
		skill1:    SectSkill{
			name: 'Càn Khôn Đại Na Di'
			dmg:  190
			cd:   6.0
		}
		skill2:    SectSkill{
			name: 'Thánh Hỏa Lệnh'
			dmg:  240
			cd:   7.5
		}
		quest_name:        'Thánh Hỏa Nhập Giáo'
		quest_req:         'Đạt cấp 5, dâng 100 vàng hương hỏa'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Toàn Chân'
		desc:      'Đạo gia chính tông, nội công Tiên Thiên thuần chính, công thủ toàn diện.'
		atk_add:   9
		hp_add:    110
		def_add:   12
		crit_add:  0.03
		skill1:    SectSkill{
			name: 'Tiên Thiên Công'
			dmg:  160
			cd:   4.5
		}
		skill2:    SectSkill{
			name: 'Toàn Chân Kiếm Pháp'
			dmg:  150
			cd:   4.0
		}
		quest_name:        'Lên Trùng Dương Cung'
		quest_req:         'Đạt cấp 5, dâng 100 vàng hương hỏa'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
	SectDef{
		name:      'Cổ Mộ'
		desc:      'Ẩn cư trong cổ mộ, Ngọc Nữ Tâm Kinh lạnh lùng mà sâu không lường được.'
		atk_add:   11
		hp_add:    90
		def_add:   9
		crit_add:  0.06
		skill1:    SectSkill{
			name: 'Ngọc Nữ Tâm Kinh'
			dmg:  170
			cd:   5.0
		}
		skill2:    SectSkill{
			name: 'Ngọc Nữ Kiếm Pháp'
			dmg:  155
			cd:   4.0
		}
		quest_name:        'Vào Cổ Mộ'
		quest_req:         'Đạt cấp 5, dâng 100 vàng lễ vật'
		quest_reward_gold: 300
		quest_reward_exp:  200
		req_level:         5
		req_gold:          100
	},
]

pub const sect_change_cost = 500

// sect_def: the sect entry of an id (safe for any id, falls back to sect 0).
fn sect_def(id int) SectDef {
	if id < 0 || id >= sects.len {
		return sects[0]
	}
	return sects[id]
}

// sect_joined: true once the player belongs to any sect.
fn sect_joined() bool {
	return gs().sect_id >= 0
}

// sect_buff: the current sect bonus as one value (all zero when the player
// has not joined any sect).
pub struct SectBuff {
pub:
	atk      int
	hp       int
	def      int
	crit_add f32
}

fn sect_buff() SectBuff {
	if gs().sect_id < 0 {
		return SectBuff{}
	}
	d := sect_def(gs().sect_id)
	return SectBuff{
		atk:      d.atk_add
		hp:       d.hp_add
		def:      d.def_add
		crit_add: d.crit_add
	}
}

// apply_sect_buff: recompute base stats from the level formula, then add the
// current sect bonus on top. Idempotent: calling it twice gives the same result.
fn apply_sect_buff() {
	mut s := gs()
	h := hero_def(s.hero_ids[s.leader])
	s.max_hp = int(f32(180 + (s.level - 10) * 35) * h.hp_mult)
	s.atk = int(f32(68 + (s.level - 10) * 14) * h.atk_mult)
	s.crit = f32(0.35) + h.crit_add
	s.def = 0
	if s.sect_id < 0 {
		if s.hp > s.max_hp {
			s.hp = s.max_hp
		}
		publish()
		return
	}
	d := sect_def(s.sect_id)
	s.atk += d.atk_add
	s.max_hp += d.hp_add
	s.def += d.def_add
	s.crit += d.crit_add
	if s.hp > s.max_hp {
		s.hp = s.max_hp
	}
	publish()
}

// sect_atk_bonus / sect_hp_bonus / sect_def_bonus / sect_crit_bonus: the
// current sect bonus (0 when the player has not joined any sect).
fn sect_atk_bonus() int {
	if gs().sect_id < 0 {
		return 0
	}
	return sect_def(gs().sect_id).atk_add
}

fn sect_hp_bonus() int {
	if gs().sect_id < 0 {
		return 0
	}
	return sect_def(gs().sect_id).hp_add
}

fn sect_def_bonus() int {
	if gs().sect_id < 0 {
		return 0
	}
	return sect_def(gs().sect_id).def_add
}

fn sect_crit_bonus() f32 {
	if gs().sect_id < 0 {
		return f32(0)
	}
	return sect_def(gs().sect_id).crit_add
}

// join_sect: finish the entry quest and join a sect. Fails when already in a
// sect (use change_sect), when the level is too low, or when gold is short.
fn join_sect(id int) bool {
	if id < 0 || id >= sects.len {
		return false
	}
	mut s := gs()
	if s.sect_id >= 0 {
		return false
	}
	d := sect_def(id)
	if s.level < d.req_level {
		return false
	}
	if !spend_gold(d.req_gold) {
		return false
	}
	s.sect_id = id
	s.gold += d.quest_reward_gold
	apply_sect_buff()
	show_banner('Đã gia nhập ${d.name}! ${d.quest_name} hoàn thành.')
	gain_exp(d.quest_reward_exp)
	return true
}

// change_sect: leave the current sect and join another one. Costs a flat
// 500 gold and requires the new sect's level requirement.
fn change_sect(id int) bool {
	if id < 0 || id >= sects.len {
		return false
	}
	mut s := gs()
	if s.sect_id < 0 {
		return join_sect(id)
	}
	if s.sect_id == id {
		return false
	}
	d := sect_def(id)
	if s.level < d.req_level {
		return false
	}
	if !spend_gold(sect_change_cost) {
		return false
	}
	s.sect_id = id
	apply_sect_buff()
	show_banner('Đã đổi sang môn phái ${d.name} (-${sect_change_cost} vàng).')
	return true
}

// sect_skill_damage: the damage of a sect skill (index 0 or 1), with the
// sect attack bonus folded in. Returns 0 when there is no sect or bad index.
fn sect_skill_damage(skill_idx int) int {
	if gs().sect_id < 0 {
		return 0
	}
	d := sect_def(gs().sect_id)
	if skill_idx == 0 {
		return d.skill1.dmg + d.atk_add
	}
	if skill_idx == 1 {
		return d.skill2.dmg + d.atk_add
	}
	return 0
}
