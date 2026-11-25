module main

// ===========================================================================
//  vip.v — VIP + thư + chat + bảng xếp hạng (vòng 3, nhóm 2).
//
//  VIP 6 cấp (VIP0-VIP5): quyền lợi THẬT — cộng %EXP (áp dụng trong
//  gain_exp qua vip_exp_pct), cộng %rơi đồ (áp dụng trong on_enemy_killed
//  qua vip_drop_pct), thêm lượt hoạt động/ngày (vip_activity_extra) và
//  thêm ô túi (vip_bag_cap, túi cơ bản 30 ô). Lên VIP bằng tích lũy nạp
//  vàng trong game (vip_nap — mô phỏng, không tiền thật).
//  Thư: hộp thư nhận thư hệ thống/thưởng, đọc/xóa/nhận đính kèm thật
//  (vàng/bạc/linh thạch/Đá Cường Hóa). Chat: kênh Thế Giới/Bang, log thật
//  trong game, NPC trả lời theo mẫu có sẵn (không mạng).
//  Bảng xếp hạng: lực chiến / cấp độ / PvP / bang — tính từ dữ liệu người
//  chơi + 20 NPC mẫu có sẵn.
//  Không có component mới — không cần đăng ký trong main.v.
//
//  Chuẩn chung vòng 3: xem battle_map.v (nộ khí / raid / AoE / boss thế giới).
// ===========================================================================

// ---------- VIP ----------

pub struct VipLevelDef {
pub:
	level          int
	nap            int // vàng tích lũy để đạt cấp này
	exp_pct        int // cộng % EXP
	drop_pct       int // cộng % rơi đồ
	activity_extra int // thêm lượt hoạt động / ngày
	bag_extra      int // thêm ô túi
}

pub const vip_levels = [
	VipLevelDef{
		level:          0
		nap:            0
		exp_pct:        0
		drop_pct:       0
		activity_extra: 0
		bag_extra:      0
	},
	VipLevelDef{
		level:          1
		nap:            500
		exp_pct:        5
		drop_pct:       5
		activity_extra: 1
		bag_extra:      5
	},
	VipLevelDef{
		level:          2
		nap:            1500
		exp_pct:        10
		drop_pct:       10
		activity_extra: 1
		bag_extra:      10
	},
	VipLevelDef{
		level:          3
		nap:            4000
		exp_pct:        15
		drop_pct:       15
		activity_extra: 2
		bag_extra:      15
	},
	VipLevelDef{
		level:          4
		nap:            9000
		exp_pct:        20
		drop_pct:       20
		activity_extra: 2
		bag_extra:      20
	},
	VipLevelDef{
		level:          5
		nap:            20000
		exp_pct:        30
		drop_pct:       30
		activity_extra: 3
		bag_extra:      30
	},
]

pub const vip_bag_base = 30 // túi cơ bản 30 ô đồ khác loại

// vip_level_for: cấp VIP theo tổng vàng đã nạp (cao nhất mà total đạt tới).
fn vip_level_for(total int) int {
	mut lv := 0
	for v in vip_levels {
		if total >= v.nap {
			lv = v.level
		}
	}
	return lv
}

// vip_info: định nghĩa cấp VIP hiện tại của người chơi.
fn vip_info() VipLevelDef {
	s := gs()
	if s.vip_level < 0 || s.vip_level >= vip_levels.len {
		return vip_levels[0]
	}
	return vip_levels[s.vip_level]
}

// vip_exp_pct / vip_drop_pct: % cộng thêm hiện tại (dùng trong gain_exp /
// on_enemy_killed — xem ghi chú ở game.v và enemies.v).
fn vip_exp_pct() int {
	return vip_info().exp_pct
}

fn vip_drop_pct() int {
	return vip_info().drop_pct
}

// vip_activity_extra: lượt hoạt động thêm mỗi ngày.
fn vip_activity_extra() int {
	return vip_info().activity_extra
}

// vip_bag_cap: tổng số ô túi (cơ bản + VIP).
fn vip_bag_cap() int {
	return vip_bag_base + vip_info().bag_extra
}

// vip_nap: nạp vàng (mô phỏng) để tích lũy lên VIP. Trừ vàng thật, cộng
// tổng nạp thật, lên cấp thì gửi thư chúc mừng kèm thưởng. False khi thiếu vàng.
fn vip_nap(amount int) bool {
	if amount <= 0 {
		return false
	}
	if !spend_gold(amount) {
		return false
	}
	mut s := gs()
	old := s.vip_level
	s.vip_total_nap += amount
	s.vip_level = vip_level_for(s.vip_total_nap)
	if s.vip_level > old {
		lv := s.vip_level
		mail_send('Hệ thống VIP', 'Chúc mừng lên VIP${lv}!',
			'Đạo hữu đã tích lũy nạp ${s.vip_total_nap} vàng, đạt VIP${lv}.', 200 * lv, 500 * lv, 0, lv)
		show_banner('CHÚC MỪNG LÊN VIP${lv}! +${vip_exp_pct()}% EXP, +${vip_drop_pct()}% rơi đồ.')
	}
	publish()
	return true
}

// ---------- Thư ----------

pub struct MailEntry {
pub mut:
	from       string
	title      string
	body       string
	gold       int
	silver     int
	stones     int // linh thạch đính kèm
	enh_stone  int // Đá Cường Hóa đính kèm (số viên, shop id 8)
	read       bool
	claimed    bool
}

pub const mail_max = 30

// mail_send: gửi 1 thư hệ thống vào hộp thư (mới nhất lên đầu).
fn mail_send(from string, title string, body string, gold int, silver int, stones int, enh_stone int) {
	mut s := gs()
	s.mail.insert(0, MailEntry{
		from:      from
		title:     title
		body:      body
		gold:      if gold > 0 { gold } else { 0 }
		silver:    if silver > 0 { silver } else { 0 }
		stones:    if stones > 0 { stones } else { 0 }
		enh_stone: if enh_stone > 0 { enh_stone } else { 0 }
	})
	for s.mail.len > mail_max {
		s.mail.delete(s.mail.len - 1)
	}
	s.mail_unread = mail_unread_count()
	publish()
}

// mail_unread_count: số thư chưa đọc.
fn mail_unread_count() int {
	s := gs()
	mut n := 0
	for m in s.mail {
		if !m.read {
			n++
		}
	}
	return n
}

// mail_read: đánh dấu thư đã đọc. False khi chỉ số sai.
fn mail_read(idx int) bool {
	mut s := gs()
	if idx < 0 || idx >= s.mail.len {
		return false
	}
	s.mail[idx].read = true
	s.mail_unread = mail_unread_count()
	publish()
	return true
}

// mail_claim: nhận đính kèm của 1 thư (vàng/bạc/linh thạch/Đá Cường Hóa thật).
// Chỉ nhận được 1 lần; thư đã nhận rồi hoặc không có đính kèm thì false.
fn mail_claim(idx int) bool {
	mut s := gs()
	if idx < 0 || idx >= s.mail.len {
		return false
	}
	if s.mail[idx].claimed {
		return false
	}
	has_attach := s.mail[idx].gold > 0 || s.mail[idx].silver > 0 || s.mail[idx].stones > 0
		|| s.mail[idx].enh_stone > 0
	if !has_attach {
		return false
	}
	add_gold(s.mail[idx].gold)
	add_silver(s.mail[idx].silver)
	add_stones(s.mail[idx].stones)
	for _ in 0 .. s.mail[idx].enh_stone {
		inventory_add(8) // Đá Cường Hóa (shop id 8)
	}
	s.mail[idx].claimed = true
	s.mail[idx].read = true
	s.mail_unread = mail_unread_count()
	show_banner('Đã nhận đính kèm thư: +${s.mail[idx].gold} vàng, +${s.mail[idx].stones} linh thạch, +${s.mail[idx].enh_stone} Đá Cường Hóa.')
	publish()
	return true
}

// mail_delete: xóa 1 thư. False khi chỉ số sai.
fn mail_delete(idx int) bool {
	mut s := gs()
	if idx < 0 || idx >= s.mail.len {
		return false
	}
	s.mail.delete(idx)
	s.mail_unread = mail_unread_count()
	publish()
	return true
}

// mail_seed: 2 thư chào mừng mặc định (chỉ gửi 1 lần khi hộp thư còn trống).
fn mail_seed() {
	s := gs()
	if s.mail.len > 0 {
		return
	}
	mail_send('Hệ thống', 'Chào mừng đến Quỷ Cốc Bát Hoang 3D!',
		'Đạo hữu mới vào giang hồ, hệ thống tặng chút lộ phí.', 100, 0, 0, 0)
	mail_send('Trưởng Môn Song Ma', 'Nhiệm vụ tân thủ',
		'Đi diệt 5 yêu thú Quỷ Cốc rồi quay lại gặp ta.', 0, 0, 1, 0)
}

// ---------- Chat ----------

pub const chat_max = 30

pub const chat_world_replies = [
	'Đạo hữu nói chí phải!',
	'Quỷ Cốc Bát Hoang, ai dám tranh phong?',
	'Vừa hạ boss, rơi toàn đồ ngon!',
	'Ai đi phó bản Hoa Đào cùng không?',
	'Bang chiến tối nay 19h, nhớ vào!',
]

pub const chat_guild_replies = [
	'Huynh đệ nói đúng, tối nay tập hợp!',
	'Cống hiến bang càng cao, buff càng mạnh.',
	'Vừa cường hóa lên +7, sướng quá!',
]

// chat_send_world / chat_send_guild: gửi 1 tin + NPC trả lời ngay theo mẫu
// (chọn theo độ dài tin — cố định, không mạng). Tin rỗng thì false.
// Kênh Bang yêu cầu đã vào bang.
fn chat_send_world(msg string) bool {
	if msg.trim_space().len == 0 {
		return false
	}
	mut s := gs()
	s.chat_log << 'Bạn: ${msg.trim_space()}'
	reply := chat_world_replies[msg.len % chat_world_replies.len]
	s.chat_log << 'Kiếm Khách Vô Danh: ${reply}'
	for s.chat_log.len > chat_max {
		s.chat_log.delete(0)
	}
	publish()
	return true
}

fn chat_send_guild(msg string) bool {
	if msg.trim_space().len == 0 {
		return false
	}
	mut s := gs()
	if s.guild_id < 0 {
		show_banner('Hãy vào bang trước mới chat kênh Bang được!')
		return false
	}
	s.chat_guild_log << 'Bạn: ${msg.trim_space()}'
	reply := chat_guild_replies[msg.len % chat_guild_replies.len]
	s.chat_guild_log << 'Phó Bang: ${reply}'
	for s.chat_guild_log.len > chat_max {
		s.chat_guild_log.delete(0)
	}
	publish()
	return true
}

// ---------- Bảng xếp hạng ----------

pub struct RankNpc {
pub:
	name  string
	level int
	pvp   int
	guild string
}

// 20 NPC mẫu có sẵn (cùng tên với bản HTML js/06-expand.js, lực chiến NPC
// = cấp*40 + thứ tự*13 — cố định, tính được, khớp 2 phía).
pub const rank_npcs = [
	RankNpc{name: 'Đông Phương Bất Bại', level: 48, pvp: 1200, guild: 'Thiên Hạ Hội'},
	RankNpc{name: 'Phong Thanh Dương', level: 46, pvp: 1145, guild: 'Võ Lâm Minh'},
	RankNpc{name: 'Độc Cô Cầu Bại', level: 45, pvp: 1090, guild: 'Ma Giáo'},
	RankNpc{name: 'Tiêu Phong', level: 44, pvp: 1035, guild: 'Tiêu Dao Các'},
	RankNpc{name: 'Quách Tĩnh', level: 44, pvp: 980, guild: 'Thiên Hạ Hội'},
	RankNpc{name: 'Trương Vô Kỵ', level: 43, pvp: 925, guild: 'Võ Lâm Minh'},
	RankNpc{name: 'Tiểu Long Nữ', level: 42, pvp: 870, guild: 'Ma Giáo'},
	RankNpc{name: 'Dương Quá', level: 41, pvp: 815, guild: 'Tiêu Dao Các'},
	RankNpc{name: 'Hoàng Dung', level: 40, pvp: 760, guild: 'Thiên Hạ Hội'},
	RankNpc{name: 'Đoàn Dự', level: 39, pvp: 705, guild: 'Võ Lâm Minh'},
	RankNpc{name: 'Lệnh Hồ Xung', level: 38, pvp: 650, guild: 'Ma Giáo'},
	RankNpc{name: 'Hư Trúc', level: 37, pvp: 595, guild: 'Tiêu Dao Các'},
	RankNpc{name: 'Nhậm Doanh Doanh', level: 36, pvp: 540, guild: 'Thiên Hạ Hội'},
	RankNpc{name: 'Tả Lãnh Thiền', level: 36, pvp: 485, guild: 'Võ Lâm Minh'},
	RankNpc{name: 'Triệu Mẫn', level: 35, pvp: 430, guild: 'Ma Giáo'},
	RankNpc{name: 'Nhạc Bất Quần', level: 34, pvp: 375, guild: 'Tiêu Dao Các'},
	RankNpc{name: 'Chu Chỉ Nhược', level: 33, pvp: 320, guild: 'Thiên Hạ Hội'},
	RankNpc{name: 'A Châu', level: 30, pvp: 265, guild: 'Võ Lâm Minh'},
	RankNpc{name: 'Vương Ngữ Yên', level: 28, pvp: 210, guild: 'Ma Giáo'},
	RankNpc{name: 'Lâm Bình Chi', level: 25, pvp: 155, guild: 'Tiêu Dao Các'},
]

// rank_npc_power: lực chiến của 1 NPC mẫu (cấp*40 + thứ tự*13).
fn rank_npc_power(idx int) int {
	if idx < 0 || idx >= rank_npcs.len {
		return 0
	}
	return rank_npcs[idx].level * 40 + idx * 13
}

// rank_of_power / rank_of_level / rank_of_pvp: hạng của người chơi (1 = cao
// nhất) trong 21 người (20 NPC + người chơi). Hạng bang tính theo điểm bang:
// bang mình = điểm bang chiến + cống hiến, bang khác = thành viên*20 + cấp*50.
fn rank_of_power() int {
	mut rank := 1
	for i in 0 .. rank_npcs.len {
		if rank_npc_power(i) > pvp_power() {
			rank++
		}
	}
	return rank
}

fn rank_of_level() int {
	s := gs()
	mut rank := 1
	for n in rank_npcs {
		if n.level > s.level {
			rank++
		}
	}
	return rank
}

fn rank_of_pvp() int {
	s := gs()
	mut rank := 1
	for n in rank_npcs {
		if n.pvp > s.pvp_points {
			rank++
		}
	}
	return rank
}

fn rank_guild_score(name string) int {
	s := gs()
	if s.guild_id >= 0 && name == s.guild_name {
		return s.guildwar_score + s.guild_total_contrib
	}
	for g in guilds {
		if g.name == name {
			// V GuildDef không có cấp bang như HTML GUILD_PRESETS (level 3-5),
			// dùng mức cố định 250 (= cấp 5 x 50) cho mọi bang mẫu.
			return g.member_count * 20 + 250
		}
	}
	return 0
}

fn rank_of_guild() int {
	s := gs()
	if s.guild_id < 0 {
		return 0 // chưa vào bang thì không có hạng bang
	}
	mut rank := 1
	mine := rank_guild_score(s.guild_name)
	for g in guilds {
		if g.name != s.guild_name && rank_guild_score(g.name) > mine {
			rank++
		}
	}
	return rank
}
