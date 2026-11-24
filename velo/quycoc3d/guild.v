module main

// ============================================================================
//  guild.v — guilds (bang hội).
//
//  The player can found a guild (1000 gold), join one of the four famous
//  guilds, contribute gold for contribution points, and fight the guild
//  boss together. The guild buff grows with total contribution: +1 attack
//  per 100 total contribution, capped at +30. Guild chat is a local log
//  only — guild_add_log appends a fixed line for an event and never touches
//  the network.
// ============================================================================

pub const guild_create_cost = 1000
pub const guild_custom_id = 99
pub const guild_boss_max_hp = 50000

pub struct GuildDef {
pub:
	id          int
	name        string
	desc        string
	member_count int
	buff_desc   string
}

pub const guilds = [
	GuildDef{
		id:           0
		name:         'Thiên Hạ Hội'
		desc:         'Bang hội lớn nhất giang hồ, huynh đệ khắp thiên hạ.'
		member_count: 128
		buff_desc:    'Cống hiến tăng công theo tổng điểm bang.'
	},
	GuildDef{
		id:           1
		name:         'Võ Lâm Minh'
		desc:         'Minh chủ võ lâm hiệu triệu, chính đạo cùng chung một lòng.'
		member_count: 96
		buff_desc:    'Cống hiến tăng công theo tổng điểm bang.'
	},
	GuildDef{
		id:           2
		name:         'Ma Giáo'
		desc:         'Giáo chúng ẩn mình trong bóng tối, ra tay tàn nhẫn vô tình.'
		member_count: 87
		buff_desc:    'Cống hiến tăng công theo tổng điểm bang.'
	},
	GuildDef{
		id:           3
		name:         'Tiêu Dao Các'
		desc:         'Tiêu dao tự tại, không màng danh lợi, chỉ cầu võ đạo đỉnh cao.'
		member_count: 64
		buff_desc:    'Cống hiến tăng công theo tổng điểm bang.'
	},
]

pub struct GuildBossDef {
pub:
	name            string
	max_hp          int
	reward_gold     int
	reward_stone    int
	min_dmg_reward  int
}

pub const guild_boss = GuildBossDef{
	name:           'Ma Tôn Hộ Pháp'
	max_hp:         50000
	reward_gold:    2000
	reward_stone:   20
	min_dmg_reward: 1000
}

// guild_def: the guild entry of an id (safe for any id, falls back to guild 0).
fn guild_def(id int) GuildDef {
	if id < 0 || id >= guilds.len {
		return guilds[0]
	}
	return guilds[id]
}

// in_guild: true once the player belongs to any guild.
fn in_guild() bool {
	return gs().guild_id >= 0
}

// create_guild: found a guild with the given name. Costs 1000 gold, fails
// when already in a guild, when the name is empty, or when gold is short.
fn create_guild(name string) bool {
	if name.len == 0 {
		return false
	}
	mut s := gs()
	if s.guild_id >= 0 {
		return false
	}
	if !spend_gold(guild_create_cost) {
		return false
	}
	s.guild_id = guild_custom_id
	s.guild_name = name
	s.guild_contrib = 0
	s.guild_total_contrib = 0
	guild_add_log('found')
	show_banner('Đã sáng lập bang hội ${name}!')
	return true
}

// join_guild: join one of the four famous guilds. Fails when already in a
// guild or for a bad id.
fn join_guild(id int) bool {
	if id < 0 || id >= guilds.len {
		return false
	}
	mut s := gs()
	if s.guild_id >= 0 {
		return false
	}
	s.guild_id = id
	s.guild_name = guild_def(id).name
	s.guild_contrib = 0
	s.guild_total_contrib = 0
	guild_add_log('join')
	show_banner('Đã gia nhập bang ${s.guild_name}!')
	return true
}

// leave_guild: leave the current guild, keeping nothing of the contribution.
fn leave_guild() bool {
	mut s := gs()
	if s.guild_id < 0 {
		return false
	}
	guild_add_log('leave')
	s.guild_id = -1
	s.guild_name = ''
	s.guild_contrib = 0
	return true
}

// guild_contribute: donate gold to the guild. Every 100 gold gives 10
// contribution points (personal and guild total). Returns false with no
// guild, for an amount below 100, or when gold is short.
fn guild_contribute(amount_gold int) bool {
	if amount_gold < 100 {
		return false
	}
	mut s := gs()
	if s.guild_id < 0 {
		return false
	}
	if !spend_gold(amount_gold) {
		return false
	}
	points := amount_gold / 100 * 10
	s.guild_contrib += points
	s.guild_total_contrib += points
	guild_add_log('contrib')
	return true
}

// guild_buff_atk: the guild attack buff — +1 per 100 total contribution,
// capped at +30.
fn guild_buff_atk() int {
	b := gs().guild_total_contrib / 100
	if b > 30 {
		return 30
	}
	return b
}

// guild_buff_hp: the guild HP buff — +10 per 100 total contribution,
// capped at +300.
fn guild_buff_hp() int {
	b := gs().guild_total_contrib / 100 * 10
	if b > 300 {
		return 300
	}
	return b
}

// guild_boss_reward: gold for damage dealt to the guild boss — full reward
// at 10000+ damage, half at 5000+, a share at 1000+, nothing below that.
fn guild_boss_reward(damage int) int {
	if damage >= 10000 {
		return guild_boss.reward_gold
	}
	if damage >= 5000 {
		return guild_boss.reward_gold / 2
	}
	if damage >= guild_boss.min_dmg_reward {
		return guild_boss.reward_gold / 5
	}
	return 0
}

// guild_boss_fight: record one guild boss attempt. Damage is accumulated in
// GState and the reward is paid at once. Returns the gold earned (0 when
// the damage is below the reward threshold).
fn guild_boss_fight(damage int) int {
	if gs().guild_id < 0 {
		return 0
	}
	if damage <= 0 {
		return 0
	}
	mut s := gs()
	s.world_boss_dmg += damage
	reward := guild_boss_reward(damage)
	if reward > 0 {
		add_gold(reward)
		if damage >= 10000 {
			add_stones(guild_boss.reward_stone)
		}
		guild_add_log('boss')
	}
	return reward
}

// guild_add_log: append one fixed chat line for an event to the local guild
// log (latest 20 lines kept). No network is involved — the lines are local
// text only. Known events: found, join, leave, contrib, boss, win.
fn guild_add_log(event string) {
	mut s := gs()
	line := ''
	if event == 'found' {
		line = '[Bang Chủ] Bang hội đã được sáng lập, huynh đệ cùng nhau xưng bá giang hồ!'
	} else if event == 'join' {
		line = '[Hệ Thống] Một huynh đệ mới đã gia nhập bang.'
	} else if event == 'leave' {
		line = '[Hệ Thống] Một huynh đệ đã rời bang.'
	} else if event == 'contrib' {
		line = '[Bang Chủ] Đa tạ huynh đệ cống hiến, bang hội ngày càng lớn mạnh!'
	} else if event == 'boss' {
		line = '[Hệ Thống] Boss bang đã bị đánh bại, phần thưởng đã phát cho huynh đệ!'
	} else if event == 'win' {
		line = '[Bang Chủ] Huynh đệ đánh hay lắm, bang ta uy danh vang xa!'
	} else {
		line = '[Hệ Thống] Bang hội có tin mới.'
	}
	s.guild_log << line
	for s.guild_log.len > 20 {
		s.guild_log.delete(0)
	}
}
