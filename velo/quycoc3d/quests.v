module main

// ============================================================================
//  quests.v — main quest chain, daily activities and hourly events.
//
//  20 main quests in one chain (kill / collect / map goals), 7 daily
//  activities with a once-per-day limit, and 5 timed events that open in
//  fixed hour windows. Progress lives in GState.quest_progress (per quest)
//  and GState.quest_done; a quest pays its reward exactly once, when its
//  progress first reaches the target.
// ============================================================================

pub struct QuestDef {
pub:
	id            int
	name          string
	desc          string
	kind          string
	target        int
	target_count  int
	map_index     int
	reward_gold   int
	reward_exp    int
	reward_item   int
}

pub const main_quests = [
	QuestDef{
		id:           0
		name:         'Sơ Nhập Giang Hồ'
		desc:         'Tiêu diệt 5 yêu thú quanh Trường Bạch Sơn.'
		kind:         'kill'
		target:       0
		target_count: 5
		map_index:    0
		reward_gold:  100
		reward_exp:   50
		reward_item:  -1
	},
	QuestDef{
		id:           1
		name:         'Linh Chi Đầu Tiên'
		desc:         'Thu thập 3 Linh Chi Thảo trong rừng.'
		kind:         'collect'
		target:       5
		target_count: 3
		map_index:    0
		reward_gold:  120
		reward_exp:   60
		reward_item:  5
	},
	QuestDef{
		id:           2
		name:         'Ác Sói Hoành Hành'
		desc:         'Tiêu diệt 8 ác sói đang quấy phá thôn làng.'
		kind:         'kill'
		target:       1
		target_count: 8
		map_index:    1
		reward_gold:  180
		reward_exp:   90
		reward_item:  -1
	},
	QuestDef{
		id:           3
		name:         'Mở Đường Hoa Đào'
		desc:         'Đi tới map Hoa Đào Cốc và dọn sạch 10 quái.'
		kind:         'map'
		target:       0
		target_count: 10
		map_index:    2
		reward_gold:  200
		reward_exp:   100
		reward_item:  -1
	},
	QuestDef{
		id:           4
		name:         'Tinh Anh Đầu Tiên'
		desc:         'Đánh bại 3 quái tinh anh.'
		kind:         'kill'
		target:       2
		target_count: 3
		map_index:    2
		reward_gold:  250
		reward_exp:   130
		reward_item:  8
	},
	QuestDef{
		id:           5
		name:         'Bí Cảnh Mở Ra'
		desc:         'Hoàn thành phó bản Bí Cảnh, tiêu diệt 12 quái.'
		kind:         'map'
		target:       0
		target_count: 12
		map_index:    3
		reward_gold:  300
		reward_exp:   150
		reward_item:  -1
	},
	QuestDef{
		id:           6
		name:         'Huyền Thiết Rèn Kiếm'
		desc:         'Thu thập 5 Huyền Thiết để rèn kiếm mới.'
		kind:         'collect'
		target:       8
		target_count: 5
		map_index:    3
		reward_gold:  320
		reward_exp:   160
		reward_item:  101
	},
	QuestDef{
		id:           7
		name:         'Ma Tôn Xuất Hiện'
		desc:         'Đánh bại 1 Ma Tôn trong phó bản.'
		kind:         'kill'
		target:       3
		target_count: 1
		map_index:    4
		reward_gold:  500
		reward_exp:   250
		reward_item:  -1
	},
	QuestDef{
		id:           8
		name:         'Cảnh Giới Kim Đan'
		desc:         'Đạt cấp 13, đột phá lên Kim Đan Kỳ.'
		kind:         'map'
		target:       0
		target_count: 1
		map_index:    5
		reward_gold:  400
		reward_exp:   200
		reward_item:  -1
	},
	QuestDef{
		id:           9
		name:         'Độc Cốc Thí Luyện'
		desc:         'Tiêu diệt 15 quái trong Độc Cốc.'
		kind:         'kill'
		target:       0
		target_count: 15
		map_index:    6
		reward_gold:  450
		reward_exp:   220
		reward_item:  200
	},
	QuestDef{
		id:           10
		name:         'Ngọc Bội Linh Lung'
		desc:         'Thu thập 4 Ngọc Bội Linh Lung rơi từ quái tinh anh.'
		kind:         'collect'
		target:       6
		target_count: 4
		map_index:    7
		reward_gold:  480
		reward_exp:   240
		reward_item:  6
	},
	QuestDef{
		id:           11
		name:         'Thiên Lôi Kiếm Trận'
		desc:         'Dùng Thiên Lôi Kiếm Trận đánh bại 10 quái.'
		kind:         'kill'
		target:       0
		target_count: 10
		map_index:    8
		reward_gold:  520
		reward_exp:   260
		reward_item:  -1
	},
	QuestDef{
		id:           12
		name:         'Bát Hoang Toàn Phong'
		desc:         'Hoàn thành map 9, tiêu diệt 18 quái.'
		kind:         'map'
		target:       0
		target_count: 18
		map_index:    9
		reward_gold:  600
		reward_exp:   300
		reward_item:  201
	},
	QuestDef{
		id:           13
		name:         'Ma Tôn Thứ Hai'
		desc:         'Đánh bại 2 Ma Tôn trong phó bản Ma Tôn.'
		kind:         'kill'
		target:       3
		target_count: 2
		map_index:    10
		reward_gold:  800
		reward_exp:   400
		reward_item:  -1
	},
	QuestDef{
		id:           14
		name:         'Nguyên Anh Xuất Thế'
		desc:         'Đạt cấp 16, đột phá lên Nguyên Anh Kỳ.'
		kind:         'map'
		target:       0
		target_count: 1
		map_index:    11
		reward_gold:  700
		reward_exp:   350
		reward_item:  -1
	},
	QuestDef{
		id:           15
		name:         'Vạn Kiếm Quy Tông'
		desc:         'Tiêu diệt 20 quái bằng tuyệt kỹ Vạn Kiếm Quy Tông.'
		kind:         'kill'
		target:       0
		target_count: 20
		map_index:    12
		reward_gold:  750
		reward_exp:   380
		reward_item:  202
	},
	QuestDef{
		id:           16
		name:         'Cổ Mộ Bí Ẩn'
		desc:         'Khám phá Cổ Mộ, thu thập 6 bảo vật cổ.'
		kind:         'collect'
		target:       6
		target_count: 6
		map_index:    13
		reward_gold:  850
		reward_exp:   420
		reward_item:  110
	},
	QuestDef{
		id:           17
		name:         'Hóa Thần Kiếp Nạn'
		desc:         'Đánh bại 3 quái tinh anh và 1 Ma Tôn trong một ngày.'
		kind:         'kill'
		target:       3
		target_count: 1
		map_index:    14
		reward_gold:  1000
		reward_exp:   500
		reward_item:  109
	},
	QuestDef{
		id:           18
		name:         'Bát Hoang Nhất Thống'
		desc:         'Hoàn thành map 15, tiêu diệt 25 quái.'
		kind:         'map'
		target:       0
		target_count: 25
		map_index:    15
		reward_gold:  1200
		reward_exp:   600
		reward_item:  111
	},
	QuestDef{
		id:           19
		name:         'Đăng Tiên Cảnh'
		desc:         'Đạt cấp 19, đột phá lên Đăng Tiên Cảnh, hoàn thành chuỗi nhiệm vụ chính.'
		kind:         'map'
		target:       0
		target_count: 1
		map_index:    15
		reward_gold:  2000
		reward_exp:   1000
		reward_item:  100
	},
]

pub struct DailyDef {
pub:
	id            int
	name          string
	desc          string
	max_per_day   int
	reward_gold   int
	reward_exp    int
	reward_stone  int
}

pub const daily_activities = [
	DailyDef{
		id:           0
		name:         'Vận Tiêu'
		desc:         'Hộ tống tiêu xa qua Trường Bạch Sơn.'
		max_per_day:  3
		reward_gold:  150
		reward_exp:   80
		reward_stone: 0
	},
	DailyDef{
		id:           1
		name:         'Nhiệm Vụ Sư Môn'
		desc:         'Làm việc cho môn phái, tăng danh vọng sư môn.'
		max_per_day:  5
		reward_gold:  100
		reward_exp:   120
		reward_stone:  0
	},
	DailyDef{
		id:           2
		name:         'Phó Bản Hằng Ngày'
		desc:         'Vào phó bản, dọn sạch quái trong ngày.'
		max_per_day:  2
		reward_gold:  250
		reward_exp:   150
		reward_stone:  2
	},
	DailyDef{
		id:           3
		name:         'Đấu Trường'
		desc:         'Thắng 1 trận đấu trường PvP.'
		max_per_day:  5
		reward_gold:  120
		reward_exp:   60
		reward_stone:  0
	},
	DailyDef{
		id:           4
		name:         'Hái Thuốc'
		desc:         'Thu thập 5 dược liệu trong rừng.'
		max_per_day:  3
		reward_gold:  80
		reward_exp:   90
		reward_stone:  1
	},
	DailyDef{
		id:           5
		name:         'Luyện Đan'
		desc:         'Luyện 3 viên đan dược từ dược liệu.'
		max_per_day:  3
		reward_gold:  90
		reward_exp:   100
		reward_stone:  1
	},
	DailyDef{
		id:           6
		name:         'Tu Luyện'
		desc:         'Ngồi thiền tu luyện 10 phút, tăng kinh nghiệm.'
		max_per_day:  1
		reward_gold:  50
		reward_exp:   200
		reward_stone:  0
	},
]

pub struct TimedEvent {
pub:
	name        string
	desc        string
	open_hour   int
	close_hour  int
	reward_gold int
	reward_exp  int
}

pub const timed_events = [
	TimedEvent{
		name:        'Bí Cảnh Mở'
		desc:        'Bí cảnh mở cửa, quái rơi gấp đôi linh thạch.'
		open_hour:   9
		close_hour:  10
		reward_gold: 300
		reward_exp:  150
	},
	TimedEvent{
		name:        'Ma Tôn Giáng Lâm'
		desc:        'Ma Tôn giáng lâm Trường Bạch Sơn, đánh bại nhận thưởng lớn.'
		open_hour:   12
		close_hour:  13
		reward_gold: 800
		reward_exp:  400
	},
	TimedEvent{
		name:        'Boss Thế Giới'
		desc:        'Boss thế giới xuất hiện, cả server cùng đánh.'
		open_hour:   20
		close_hour:  21
		reward_gold: 1500
		reward_exp:  700
	},
	TimedEvent{
		name:        'Công Thành Chiến'
		desc:        'Bang hội công thành, chiếm thành nhận vàng bang.'
		open_hour:   21
		close_hour:  22
		reward_gold: 1000
		reward_exp:  500
	},
	TimedEvent{
		name:        'Đêm Săn Yêu'
		desc:        'Đêm khuya yêu thú hoành hành, săn yêu nhận thưởng gấp đôi.'
		open_hour:   23
		close_hour:  0
		reward_gold: 600
		reward_exp:  300
	},
]

// quest_def: the main quest entry of an id (safe for any id, falls back to quest 0).
fn quest_def(id int) QuestDef {
	if id < 0 || id >= main_quests.len {
		return main_quests[0]
	}
	return main_quests[id]
}

// daily_def: the daily activity entry of an id (safe for any id).
fn daily_def(id int) DailyDef {
	if id < 0 || id >= daily_activities.len {
		return daily_activities[0]
	}
	return daily_activities[id]
}

// timed_event_def: the timed event entry of an id (safe for any id).
fn timed_event_def(id int) TimedEvent {
	if id < 0 || id >= timed_events.len {
		return timed_events[0]
	}
	return timed_events[id]
}

// quest_add_progress: add progress to a quest. When the progress first
// reaches the target, the quest completes: the reward is paid once, the
// quest is marked done and the chain advances. Returns true only when
// this call completes the quest.
fn quest_add_progress(id int, n int) bool {
	if id < 0 || id >= main_quests.len {
		return false
	}
	if n <= 0 {
		return false
	}
	mut s := gs()
	if s.quest_done[id] {
		return false
	}
	s.quest_progress[id] += n
	q := quest_def(id)
	if s.quest_progress[id] < q.target_count {
		return false
	}
	s.quest_done[id] = true
	add_gold(q.reward_gold)
	if q.reward_item >= 0 {
		inventory_add(q.reward_item)
	}
	show_banner('Hoàn thành nhiệm vụ: ${q.name} (+${q.reward_gold} vàng).')
	if s.quest_current == id && s.quest_current < main_quests.len - 1 {
		s.quest_current += 1
	}
	gain_exp(q.reward_exp)
	return true
}

// quest_is_done: true when a quest has been completed.
fn quest_is_done(id int) bool {
	if id < 0 || id >= main_quests.len {
		return false
	}
	return gs().quest_done[id]
}

// daily_do: finish one daily activity run and take its reward. Each activity
// can only be done up to max_per_day times per day (tracked in
// GState.daily_count); further attempts return false. daily_reset clears the
// counts for a new day.
fn daily_do(id int) bool {
	if id < 0 || id >= daily_activities.len {
		return false
	}
	mut s := gs()
	d := daily_def(id)
	if s.daily_count[id] >= d.max_per_day {
		return false
	}
	s.daily_count[id] += 1
	add_gold(d.reward_gold)
	if d.reward_stone > 0 {
		add_stones(d.reward_stone)
	}
	show_banner('Hoàn thành hoạt động: ${d.name} (+${d.reward_gold} vàng).')
	gain_exp(d.reward_exp)
	return true
}

// daily_reset: clear all daily counts for a new day.
fn daily_reset() {
	mut s := gs()
	for i in 0 .. daily_activities.len {
		s.daily_count[i] = 0
	}
}

// event_is_open: true when the hour (0..23) falls inside the event window.
// A close_hour of 0 means the event runs until midnight (23:00-24:00).
fn event_is_open(ev TimedEvent, hour int) bool {
	if hour < 0 || hour > 23 {
		return false
	}
	if ev.close_hour == 0 {
		return hour >= ev.open_hour
	}
	return hour >= ev.open_hour && hour < ev.close_hour
}

// event_status: the status line of an event at a given hour.
fn event_status(id int, hour int) string {
	ev := timed_event_def(id)
	if event_is_open(ev, hour) {
		return '${ev.name}: đang mở (thưởng ${ev.reward_gold} vàng).'
	}
	return '${ev.name}: mở lúc ${ev.open_hour}h.'
}

// open_events: the ids of all timed events open at a given hour.
fn open_events(hour int) []int {
	mut out := []int{}
	for i, ev in timed_events {
		if event_is_open(ev, hour) {
			out << i
		}
	}
	return out
}
