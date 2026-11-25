module main

import rand
import time

// ===========================================================================
//  guildwar.v — bang chiến + môn phái chiến (vòng 3, nhóm 2).
//
//  Bang chiến: 2 bang đánh nhau theo giờ, mở 19h-20h hằng ngày (giờ máy).
//  Điểm bang chiến, thắng/thua đều có thưởng thật (vàng/EXP/cống hiến) và
//  log trận (tối đa 20 dòng). Mỗi ngày 1 trận (chống cày vàng).
//  Môn phái chiến: đấu theo phái (8 phái trong sects.v), bảng điểm phái
//  (điểm gốc cố định theo phái + điểm người chơi ghi được cho phái mình),
//  thắng/thua đều có thưởng thật. Mỗi ngày 1 trận.
//  Không có component mới — không cần đăng ký trong main.v.
//
//  Chuẩn chung vòng 3: xem battle_map.v (nộ khí / raid / AoE / boss thế giới).
// ===========================================================================

pub const guildwar_open_hour = 19
pub const guildwar_close_hour = 20
pub const guildwar_max_log = 20
pub const guildwar_win_gold = 600
pub const guildwar_win_exp = 200
pub const guildwar_win_contrib = 30
pub const guildwar_win_score = 100
pub const guildwar_lose_gold = 100
pub const guildwar_lose_exp = 50
pub const guildwar_lose_score = 10
pub const sectwar_win_gold = 400
pub const sectwar_win_exp = 150
pub const sectwar_win_score = 100
pub const sectwar_lose_gold = 50
pub const sectwar_lose_exp = 20
pub const sectwar_lose_score = 10

// guildwar_is_open: bang chiến mở 19h-20h.
fn guildwar_is_open(hour int) bool {
	if hour < 0 || hour > 23 {
		return false
	}
	return hour >= guildwar_open_hour && hour < guildwar_close_hour
}

// guildwar_date: hôm nay dạng dd/mm/yyyy (giới hạn 1 trận/ngày).
fn guildwar_date() string {
	t := time.now()
	return '${t.day}/${t.month}/${t.year}'
}

// guildwar_power: lực bang mình = lực chiến PvP + tổng cống hiến / 10.
fn guildwar_power() int {
	s := gs()
	return pvp_power() + s.guild_total_contrib / 10
}

// guildwar_duel: mô phỏng 5 hiệp (tối đa 30 hiệp) giữa 2 bang.
// Trả về true khi bang mình thắng (đối thủ hết HP trước).
fn guildwar_duel(my_pow int, foe_pow int) bool {
	mut my_hp := my_pow * 10
	mut foe_hp := foe_pow * 10
	mut round := 0
	for my_hp > 0 && foe_hp > 0 && round < 30 {
		round++
		md := int(f32(my_pow) * (f32(0.9) + rand.f32() * f32(0.25)))
		fd := int(f32(foe_pow) * (f32(0.9) + rand.f32() * f32(0.25)))
		foe_hp -= md
		my_hp -= fd
	}
	return foe_hp <= 0 && my_hp > 0
}

// guildwar_fight: đánh 1 trận bang chiến. Yêu cầu: đã vào bang, đang trong
// giờ mở (19h-20h), chưa đánh hôm nay. Trả về true khi thắng, false khi thua
// hoặc không đủ điều kiện (banner đã nói lý do).
fn guildwar_fight() bool {
	mut s := gs()
	if s.guild_id < 0 {
		show_banner('Hãy vào bang trước rồi mới đánh bang chiến!')
		return false
	}
	hour := time.now().hour
	if !guildwar_is_open(hour) {
		show_banner('Bang chiến chỉ mở 19h-20h (hiện tại ${hour}h).')
		return false
	}
	if s.guildwar_date == guildwar_date() {
		show_banner('Hôm nay bang đã đánh bang chiến rồi! Mai quay lại.')
		return false
	}
	foe_id := (s.guild_id + 1) % guilds.len
	foe := guilds[foe_id]
	my_pow := guildwar_power()
	foe_pow := 300 + foe_id * 150 + s.kills % 120
	s.guildwar_date = guildwar_date()
	win := guildwar_duel(my_pow, foe_pow)
	if win {
		s.guildwar_wins++
		s.guildwar_score += guildwar_win_score
		s.guild_contrib += guildwar_win_contrib
		s.guild_total_contrib += guildwar_win_contrib
		add_gold(guildwar_win_gold)
		gain_exp(guildwar_win_exp)
		guildwar_log_add('Thắng ${foe.name} (+${guildwar_win_score} điểm, +${guildwar_win_gold} vàng, +${guildwar_win_exp} EXP, +${guildwar_win_contrib} cống hiến).')
		show_banner('BANG CHIẾN THẮNG! Thắng ${foe.name}! +${guildwar_win_gold} vàng, +${guildwar_win_exp} EXP, +${guildwar_win_contrib} cống hiến.')
	} else {
		s.guildwar_losses++
		s.guildwar_score += guildwar_lose_score
		add_gold(guildwar_lose_gold)
		gain_exp(guildwar_lose_exp)
		guildwar_log_add('Thua ${foe.name} (+${guildwar_lose_score} điểm, +${guildwar_lose_gold} vàng an ủi).')
		show_banner('Bang chiến thua ${foe.name}. +${guildwar_lose_gold} vàng an ủi, +${guildwar_lose_score} điểm tham gia.')
	}
	publish()
	return win
}

// guildwar_log_add: thêm 1 dòng log bang chiến (giữ tối đa guildwar_max_log).
fn guildwar_log_add(msg string) {
	mut s := gs()
	s.guildwar_log << '${guildwar_date()}: ${msg}'
	for s.guildwar_log.len > guildwar_max_log {
		s.guildwar_log.delete(0)
	}
	publish()
}

// sectwar_score_of: điểm của 1 phái = điểm gốc cố định (500 + id*137 % 400)
// + điểm người chơi ghi được nếu đó là phái của mình.
fn sectwar_score_of(id int) int {
	s := gs()
	base := 500 + (id * 137) % 400
	if id == s.sect_id {
		return base + s.sectwar_score
	}
	return base
}

// sectwar_fight: đánh 1 trận môn phái chiến. Yêu cầu: đã nhập phái, chưa
// đánh hôm nay. Đấu với phái kế tiếp trong danh sách 8 phái.
fn sectwar_fight() bool {
	mut s := gs()
	if s.sect_id < 0 {
		show_banner('Hãy nhập môn phái trước rồi mới đánh môn phái chiến!')
		return false
	}
	if s.sectwar_date == guildwar_date() {
		show_banner('Hôm nay đã đánh môn phái chiến rồi! Mai quay lại.')
		return false
	}
	foe_id := (s.sect_id + 1) % sects.len
	foe := sects[foe_id]
	my_pow := pvp_power() + sect_atk_bonus()
	foe_pow := 250 + foe_id * 120 + s.kills % 100
	s.sectwar_date = guildwar_date()
	win := guildwar_duel(my_pow, foe_pow)
	if win {
		s.sectwar_wins++
		s.sectwar_score += sectwar_win_score
		add_gold(sectwar_win_gold)
		gain_exp(sectwar_win_exp)
		show_banner('MÔN PHÁI CHIẾN THẮNG! Thắng ${foe.name}! +${sectwar_win_gold} vàng, +${sectwar_win_exp} EXP, +${sectwar_win_score} điểm phái.')
	} else {
		s.sectwar_losses++
		s.sectwar_score += sectwar_lose_score
		add_gold(sectwar_lose_gold)
		gain_exp(sectwar_lose_exp)
		show_banner('Môn phái chiến thua ${foe.name}. +${sectwar_lose_gold} vàng an ủi, +${sectwar_lose_score} điểm phái.')
	}
	publish()
	return win
}
