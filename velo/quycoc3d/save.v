module main

import json

// ============================================================================
//  save.v — save / load as JSON.
//
//  SaveData is a plain data struct (no pointers, no scene handles) holding
//  everything the new systems track: level, currencies, bag, equipment,
//  sect, pet, guild, quests and dailies. save_game returns the JSON text
//  and load_game restores it; both only work in memory. Writing the text
//  to real disk needs the Velo bridge / file API — this file deliberately
//  makes no file call, so the game side decides where the JSON goes
//  (bridge message, local storage through the engine, or a native file
//  call in the launcher).
// ============================================================================

pub struct SaveData {
pub mut:
	level               int
	realm               int
	hp                  int
	max_hp              int
	exp                 int
	max_exp             int
	gold                int
	silver              int
	spirit_stones       int
	kills               int
	map_index           int
	sect_id             int
	pet_id              int
	pet_level           int
	pet_evo             int
	guild_id            int
	guild_name          string
	guild_contrib       int
	guild_total_contrib int
	pvp_points          int
	pvp_rank            int
	pvp_wins            int
	pvp_losses          int
	pvp_daily_date      string // ngày nhận thưởng ngày PvP (dd/mm/yyyy)
	quest_current       int
	inventory           []int
	equip_slots         []int
	equip_level         []int
	gem_slots           []int
	quest_progress      []int
	quest_done          []bool
	daily_count         []int
	// ---- vòng 3: tọa kỵ / thời trang / bang chiến / môn phái chiến / VIP / thư-chat ----
	mount_id            int
	mount_owned         []bool
	mount_level         []int
	mount_riding        bool
	fashion_id          int
	fashion_owned       []bool
	vip_level           int
	vip_total_nap       int
	guildwar_score      int
	guildwar_wins       int
	guildwar_losses     int
	guildwar_date       string
	sectwar_score       int
	sectwar_wins        int
	sectwar_losses      int
	sectwar_date        string
	mail                []MailEntry
	mail_unread         int
	chat_log            []string
	chat_guild_log      []string
}

// collect_save: snapshot the current game state into a SaveData.
fn collect_save() SaveData {
	s := gs()
	mut d := SaveData{
		level:               s.level
		realm:               s.realm
		hp:                  s.hp
		max_hp:              s.max_hp
		exp:                 s.exp
		max_exp:             s.max_exp
		gold:                s.gold
		silver:              s.silver
		spirit_stones:       s.stones
		kills:               s.kills
		map_index:           s.map_index
		sect_id:             s.sect_id
		pet_id:              s.pet_id
		pet_level:           s.pet_level
		pet_evo:             s.pet_evo
		guild_id:            s.guild_id
		guild_name:          s.guild_name
		guild_contrib:       s.guild_contrib
		guild_total_contrib: s.guild_total_contrib
		pvp_points:          s.pvp_points
		pvp_rank:            s.pvp_rank
		pvp_wins:            s.pvp_wins
		pvp_losses:          s.pvp_losses
		pvp_daily_date:      s.pvp_daily_date
		quest_current:       s.quest_current
	}
	for id in s.inventory {
		d.inventory << id
	}
	for i in 0 .. equip_slot_count {
		d.equip_slots << s.equip_slots[i]
		d.equip_level << s.equip_level[i]
		d.gem_slots << s.gem_slots[i]
	}
	for i in 0 .. main_quests.len {
		d.quest_progress << s.quest_progress[i]
		d.quest_done << s.quest_done[i]
	}
	for i in 0 .. daily_activities.len {
		d.daily_count << s.daily_count[i]
	}
	// vòng 3: tọa kỵ / thời trang / bang chiến / môn phái chiến / VIP / thư-chat
	d.mount_id = s.mount_id
	for i in 0 .. mounts.len {
		d.mount_owned << s.mount_owned[i]
		d.mount_level << s.mount_level[i]
	}
	d.mount_riding = s.mount_riding
	d.fashion_id = s.fashion_id
	for i in 0 .. fashions.len {
		d.fashion_owned << s.fashion_owned[i]
	}
	d.vip_level = s.vip_level
	d.vip_total_nap = s.vip_total_nap
	d.guildwar_score = s.guildwar_score
	d.guildwar_wins = s.guildwar_wins
	d.guildwar_losses = s.guildwar_losses
	d.guildwar_date = s.guildwar_date
	d.sectwar_score = s.sectwar_score
	d.sectwar_wins = s.sectwar_wins
	d.sectwar_losses = s.sectwar_losses
	d.sectwar_date = s.sectwar_date
	for m in s.mail {
		d.mail << m
	}
	d.mail_unread = s.mail_unread
	for l in s.chat_log {
		d.chat_log << l
	}
	for l in s.chat_guild_log {
		d.chat_guild_log << l
	}
	return d
}

// apply_save: restore a SaveData into the live state. Out-of-range values
// are clamped to safe defaults instead of being applied blindly.
fn apply_save(d SaveData) {
	mut s := gs()
	if d.level >= 1 && d.level <= 99 {
		s.level = d.level
	}
	if d.realm >= 0 && d.realm < realms.len {
		s.realm = d.realm
	}
	if d.max_hp > 0 {
		s.max_hp = d.max_hp
	}
	if d.hp >= 0 && d.hp <= s.max_hp {
		s.hp = d.hp
	}
	if d.exp >= 0 {
		s.exp = d.exp
	}
	if d.max_exp > 0 {
		s.max_exp = d.max_exp
	}
	if d.gold >= 0 {
		s.gold = d.gold
	}
	if d.silver >= 0 {
		s.silver = d.silver
	}
	if d.spirit_stones >= 0 {
		s.stones = d.spirit_stones
	}
	if d.kills >= 0 {
		s.kills = d.kills
	}
	if d.map_index >= 0 && d.map_index < 16 {
		s.map_index = d.map_index
	}
	if d.sect_id >= -1 && d.sect_id < sects.len {
		s.sect_id = d.sect_id
	}
	if d.pet_id >= -1 && d.pet_id < pets.len {
		s.pet_id = d.pet_id
	}
	if d.pet_level >= 1 {
		s.pet_level = d.pet_level
	}
	if d.pet_evo >= 0 {
		s.pet_evo = d.pet_evo
	}
	if d.guild_id >= -1 && (d.guild_id < guilds.len || d.guild_id == guild_custom_id) {
		s.guild_id = d.guild_id
	}
	s.guild_name = d.guild_name
	if d.guild_contrib >= 0 {
		s.guild_contrib = d.guild_contrib
	}
	if d.guild_total_contrib >= 0 {
		s.guild_total_contrib = d.guild_total_contrib
	}
	if d.pvp_points >= 0 {
		s.pvp_points = d.pvp_points
	}
	if d.pvp_rank >= 1 && d.pvp_rank <= 1000 {
		s.pvp_rank = d.pvp_rank
	}
	if d.pvp_wins >= 0 {
		s.pvp_wins = d.pvp_wins
	}
	if d.pvp_losses >= 0 {
		s.pvp_losses = d.pvp_losses
	}
	s.pvp_daily_date = d.pvp_daily_date
	if d.quest_current >= 0 && d.quest_current < main_quests.len {
		s.quest_current = d.quest_current
	}
	s.inventory = []int{}
	for id in d.inventory {
		s.inventory << id
	}
	for i in 0 .. equip_slot_count {
		if i < d.equip_slots.len {
			s.equip_slots[i] = d.equip_slots[i]
		}
		if i < d.equip_level.len {
			s.equip_level[i] = d.equip_level[i]
		}
		if i < d.gem_slots.len {
			s.gem_slots[i] = d.gem_slots[i]
		}
	}
	for i in 0 .. main_quests.len {
		if i < d.quest_progress.len {
			s.quest_progress[i] = d.quest_progress[i]
		}
		if i < d.quest_done.len {
			s.quest_done[i] = d.quest_done[i]
		}
	}
	for i in 0 .. daily_activities.len {
		if i < d.daily_count.len {
			s.daily_count[i] = d.daily_count[i]
		}
	}
	// vòng 3: tọa kỵ / thời trang / bang chiến / môn phái chiến / VIP / thư-chat
	if d.mount_id >= -1 && d.mount_id < mounts.len {
		s.mount_id = d.mount_id
	}
	for i in 0 .. mounts.len {
		if i < d.mount_owned.len {
			s.mount_owned[i] = d.mount_owned[i]
		}
		if i < d.mount_level.len && d.mount_level[i] >= 0 && d.mount_level[i] <= mount_max_lv {
			s.mount_level[i] = d.mount_level[i]
		}
	}
	s.mount_riding = d.mount_riding && s.mount_id >= 0 && s.mount_owned[s.mount_id]
	if d.fashion_id >= -1 && d.fashion_id < fashions.len {
		s.fashion_id = d.fashion_id
	}
	for i in 0 .. fashions.len {
		if i < d.fashion_owned.len {
			s.fashion_owned[i] = d.fashion_owned[i]
		}
	}
	if d.vip_level >= 0 && d.vip_level < vip_levels.len {
		s.vip_level = d.vip_level
	}
	if d.vip_total_nap >= 0 {
		s.vip_total_nap = d.vip_total_nap
	}
	if d.guildwar_score >= 0 {
		s.guildwar_score = d.guildwar_score
	}
	if d.guildwar_wins >= 0 {
		s.guildwar_wins = d.guildwar_wins
	}
	if d.guildwar_losses >= 0 {
		s.guildwar_losses = d.guildwar_losses
	}
	s.guildwar_date = d.guildwar_date
	if d.sectwar_score >= 0 {
		s.sectwar_score = d.sectwar_score
	}
	if d.sectwar_wins >= 0 {
		s.sectwar_wins = d.sectwar_wins
	}
	if d.sectwar_losses >= 0 {
		s.sectwar_losses = d.sectwar_losses
	}
	s.sectwar_date = d.sectwar_date
	s.mail = []MailEntry{}
	for m in d.mail {
		s.mail << m
	}
	s.mail_unread = mail_unread_count()
	s.chat_log = []string{}
	for l in d.chat_log {
		s.chat_log << l
	}
	s.chat_guild_log = []string{}
	for l in d.chat_guild_log {
		s.chat_guild_log << l
	}
	apply_sect_buff()
	apply_equip_stats()
	publish()
}

// serialize_save: encode the current state as a JSON string (in memory only).
fn serialize_save() string {
	return json.encode(collect_save())
}

// save_game: the save entry point — returns the JSON text of the current
// state. The caller decides where the text goes (see the file header).
fn save_game() string {
	return serialize_save()
}

// load_game: decode a JSON string produced by save_game and restore it.
// Returns false when the text is not valid save JSON.
fn load_game(data string) bool {
	if data.len == 0 {
		return false
	}
	d := json.decode(SaveData, data) or { return false }
	apply_save(d)
	return true
}
