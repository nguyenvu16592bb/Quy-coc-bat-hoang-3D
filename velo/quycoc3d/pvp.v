module main

// ============================================================================
//  pvp.v — arena PvP and the scheduled world boss.
//
//  Arena: the player fights a simulated opponent matched to their rank.
//  Winning adds 25 PvP points, losing removes 15 (never below 0); the rank
//  number falls as points grow (rank 1000 at 0 points, rank 1 at 9990+
//  points). The world boss opens in fixed hour windows; the reward scales
//  with the damage dealt in that attempt.
// ============================================================================

pub struct PvpOpponent {
pub:
	rank        int
	name        string
	title       string
	power       int
	reward_pts  int
}

pub const pvp_opponents = [
	PvpOpponent{
		rank:       1000
		name:       'Tân Thủ Luyện Kiếm'
		title:      'Mới vào giang hồ'
		power:      80
		reward_pts: 25
	},
	PvpOpponent{
		rank:       800
		name:       'Đệ Tử Ngoại Môn'
		title:      'Luyện khí sơ kỳ'
		power:      150
		reward_pts: 25
	},
	PvpOpponent{
		rank:       600
		name:       'Đệ Tử Nội Môn'
		title:      'Trúc Cơ sơ kỳ'
		power:      260
		reward_pts: 25
	},
	PvpOpponent{
		rank:       400
		name:       'Chân Truyền Đệ Tử'
		title:      'Kim Đan sơ kỳ'
		power:      420
		reward_pts: 25
	},
	PvpOpponent{
		rank:       200
		name:       'Trưởng Lão Ngoại Môn'
		title:      'Nguyên Anh sơ kỳ'
		power:      650
		reward_pts: 25
	},
	PvpOpponent{
		rank:       100
		name:       'Trưởng Lão Nội Môn'
		title:      'Hóa Thần sơ kỳ'
		power:      900
		reward_pts: 25
	},
	PvpOpponent{
		rank:       50
		name:       'Chưởng Môn Kế Vị'
		title:      'Hóa Thần hậu kỳ'
		power:      1200
		reward_pts: 25
	},
	PvpOpponent{
		rank:       10
		name:       'Võ Lâm Minh Chủ'
		title:      'Đăng Tiên Cảnh'
		power:      1600
		reward_pts: 25
	},
]

pub struct WorldBossDef {
pub:
	name           string
	open_hour      int
	close_hour     int
	max_hp         int
	reward_gold    int
	reward_stone   int
}

pub const world_boss = WorldBossDef{
	name:         'Thiên Ma Tôn Chủ'
	open_hour:    20
	close_hour:   21
	max_hp:       200000
	reward_gold:  5000
	reward_stone: 50
}

// pvp_power: the player's arena power — attack + level growth + equipment,
// pet and sect bonuses.
fn pvp_power() int {
	return gs().atk + gs().level * 5 + equip_total_atk() + pet_atk() + sect_atk_bonus()
}

// pvp_opponent_for_rank: the simulated opponent matched to a rank number
// (the closest tier at or above that rank).
fn pvp_opponent_for_rank(rank int) PvpOpponent {
	for opp in pvp_opponents {
		if rank >= opp.rank {
			return opp
		}
	}
	return pvp_opponents[pvp_opponents.len - 1]
}

// pvp_rank_from_points: the rank number for a point total — rank 1000 at
// 0 points, improving 1 rank per 10 points, best rank 1.
fn pvp_rank_from_points(points int) int {
	r := 1000 - points / 10
	if r < 1 {
		return 1
	}
	return r
}

// pvp_fight: fight the opponent matched to the current rank. The player
// wins when their power reaches the opponent's power. A win adds 25
// points, a loss removes 15 (never below 0); the rank is recomputed and
// the win/loss counters move. Returns true on a win.
fn pvp_fight() bool {
	mut s := gs()
	opp := pvp_opponent_for_rank(s.pvp_rank)
	power := pvp_power()
	win := power >= opp.power
	if win {
		s.pvp_points += opp.reward_pts
		s.pvp_wins += 1
		show_banner('Đấu trường: thắng ${opp.name}! +${opp.reward_pts} điểm PvP.')
	} else {
		s.pvp_points -= 15
		if s.pvp_points < 0 {
			s.pvp_points = 0
		}
		s.pvp_losses += 1
		show_banner('Đấu trường: thua ${opp.name}. -15 điểm PvP.')
	}
	s.pvp_rank = pvp_rank_from_points(s.pvp_points)
	publish()
	return win
}

// pvp_add_points: add (or remove, with a negative n) PvP points directly,
// clamped at 0, with the rank recomputed.
fn pvp_add_points(n int) {
	mut s := gs()
	s.pvp_points += n
	if s.pvp_points < 0 {
		s.pvp_points = 0
	}
	s.pvp_rank = pvp_rank_from_points(s.pvp_points)
	publish()
}

// world_boss_is_open: true when the hour (0..23) falls in the boss window.
fn world_boss_is_open(hour int) bool {
	if hour < 0 || hour > 23 {
		return false
	}
	return hour >= world_boss.open_hour && hour < world_boss.close_hour
}

// world_boss_reward: gold for one world boss attempt by damage dealt —
// full reward at 20000+ damage, half at 10000+, a share at 2000+,
// nothing below that.
fn world_boss_reward(damage int) int {
	if damage >= 20000 {
		return world_boss.reward_gold
	}
	if damage >= 10000 {
		return world_boss.reward_gold / 2
	}
	if damage >= 2000 {
		return world_boss.reward_gold / 5
	}
	return 0
}

// world_boss_fight: record one world boss attempt during its open window.
// Damage accumulates in GState and the reward is paid at once. Returns the
// gold earned, or 0 when the boss is closed or the damage is too low.
fn world_boss_fight(damage int, hour int) int {
	if !world_boss_is_open(hour) {
		return 0
	}
	if damage <= 0 {
		return 0
	}
	mut s := gs()
	s.world_boss_dmg += damage
	reward := world_boss_reward(damage)
	if reward > 0 {
		add_gold(reward)
		if damage >= 20000 {
			add_stones(world_boss.reward_stone)
		}
		show_banner('Boss thế giới: gây ${damage} sát thương, +${reward} vàng!')
	}
	return reward
}
