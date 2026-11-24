module main

import velo.core

// ============================================================================
//  town.v — Thị Trấn Song Ma, the safe town.
//
//  Entering the town (HUD "Thị Trấn" button) makes the arena safe: the
//  WaveSpawner stops spawning (it returns early while gs().in_town is set —
//  see the one-line guard in enemies.v), the living beasts in the arena are
//  stood down (deactivated, no kill rewards — nobody farms XP in a safe
//  zone), and the "Khu An Toàn" banner shows. Leaving the town re-enables
//  the spawner, whose trickle repopulates the arena.
//
//  Three NPCs, each opening its real system (no dummy buttons):
//   * Trưởng Môn (town_npc 0) — the sect system: pick a sect (prev/next),
//     then Nhập Phái (join_sect) or Đổi Phái (change_sect, 500 gold).
//   * Chủ Sạp (town_npc 1) — the shop: pick an item (prev/next), Mua
//     (buy_item, real gold/silver payment).
//   * Thợ Rèn (town_npc 2) — the forge: opens the EnhancePanel, where the
//     slot cycles (prev/next) and Cường Hóa calls enhance_slot for real.
//
//  The TownPanelUI component drives both the TownPanel and the EnhancePanel
//  in main.scene; closing a panel (Đóng / Escape) only hides it, while Rời
//  Thị Trấn leaves the safe zone itself.
// ============================================================================

const town_safe_banner = 'Khu An Toàn - Thị Trấn Song Ma (không có yêu thú)'

// enter_town: step into the safe zone — spawns off, beasts stood down,
// town panel open. Safe to call twice.
fn enter_town() {
	mut s := gs()
	if s.in_town {
		s.show_town = true
		publish()
		return
	}
	s.in_town = true
	s.show_town = true
	s.town_npc = 0
	// stand down the living beasts: no fight, no kill rewards, no XP
	sc := live_scene() or {
		show_banner(town_safe_banner)
		publish()
		return
	}
	for h in enemies_of(sc) {
		mut n := h.node
		n.active = false
	}
	show_banner(town_safe_banner)
	battle_log_add('Vào Thị Trấn Song Ma — Khu An Toàn.')
	publish()
}

// exit_town: leave the safe zone — the spawner resumes (its trickle
// repopulates the arena) and both town panels close.
fn exit_town() {
	mut s := gs()
	if !s.in_town {
		return
	}
	s.in_town = false
	s.show_town = false
	s.show_enhance = false
	show_banner('Rời Thị Trấn Song Ma — Yêu thú lại xuất hiện!')
	publish()
}

// town_sect_text: the sect row for the town panel — the selected sect, its
// entry requirement and its bonus, or the current sect when already joined.
fn town_sect_text() string {
	s := gs()
	d := sect_def(s.town_sect_sel)
	joined := if s.sect_id >= 0 { ' (đang ở ${sect_def(s.sect_id).name})' } else { '' }
	return 'Môn phái: ${d.name}${joined} — Cần cấp ${d.req_level}, ${d.req_gold} vàng — Công +${d.atk_add}, HP +${d.hp_add}, Thủ +${d.def_add}.'
}

// town_shop_text: the shop row — the selected item and its price.
fn town_shop_text() string {
	s := gs()
	it := shop_item(s.town_shop_sel)
	price := if it.price_gold > 0 { '${it.price_gold} vàng' } else { '${it.price_silver} bạc' }
	return 'Chợ: ${it.name} — ${price} — ${it.desc}'
}

// town_enhance_text: the forge row — the selected slot, its item, level,
// next cost and success rate (or "Trống" for an empty slot).
fn town_enhance_text() string {
	s := gs()
	sel := s.enhance_slot_sel
	if sel < 0 || sel >= equip_slot_count {
		return 'Cường hóa: ô không hợp lệ.'
	}
	item_id := s.equip_slots[sel]
	if item_id < 0 {
		return 'Cường hóa: ${slot_names[sel]} (Trống) — hãy trang bị trước.'
	}
	it := item_def(item_id)
	return 'Cường hóa: ${slot_names[sel]} — ${it.name} +${s.equip_level[sel]} — phí ${enhance_cost(sel)} vàng — tỉ lệ ${enhance_rate(sel)}%.'
}

// ---------- TownPanelUI: town + enhance panels and their HUD buttons ----------

pub struct TownPanelUI {
	core.Component
pub mut:
	panel        &core.Node = unsafe { nil } @[hide]
	enh_panel    &core.Node = unsafe { nil } @[hide]
	btn_town     &core.Node = unsafe { nil } @[hide]
	btn_enhance  &core.Node = unsafe { nil } @[hide]
	npc_sect     &core.Node = unsafe { nil } @[hide]
	npc_shop     &core.Node = unsafe { nil } @[hide]
	npc_forge    &core.Node = unsafe { nil } @[hide]
	desc_lbl     &core.Node = unsafe { nil } @[hide]
	sect_lbl     &core.Node = unsafe { nil } @[hide]
	shop_lbl     &core.Node = unsafe { nil } @[hide]
	enh_lbl      &core.Node = unsafe { nil } @[hide]
	btn_sect_prev &core.Node = unsafe { nil } @[hide]
	btn_sect_next &core.Node = unsafe { nil } @[hide]
	btn_sect_join &core.Node = unsafe { nil } @[hide]
	btn_shop_prev &core.Node = unsafe { nil } @[hide]
	btn_shop_next &core.Node = unsafe { nil } @[hide]
	btn_buy      &core.Node = unsafe { nil } @[hide]
	btn_slot_prev &core.Node = unsafe { nil } @[hide]
	btn_slot_next &core.Node = unsafe { nil } @[hide]
	btn_do_enh   &core.Node = unsafe { nil } @[hide]
	btn_close    &core.Node = unsafe { nil } @[hide]
	btn_close_enh &core.Node = unsafe { nil } @[hide]
	btn_leave    &core.Node = unsafe { nil } @[hide]
	tick         f32 @[hide]
}

pub fn (mut u TownPanelUI) start() {
	sc := u.scene()
	if n := sc.find('HUD/TownPanel') { u.panel = n }
	if n := sc.find('HUD/EnhancePanel') { u.enh_panel = n }
	if n := sc.find('HUD/BtnTown') { u.btn_town = n }
	if n := sc.find('HUD/BtnEnhance') { u.btn_enhance = n }
	if n := sc.find('HUD/TownPanel/NpcSect') { u.npc_sect = n }
	if n := sc.find('HUD/TownPanel/NpcShop') { u.npc_shop = n }
	if n := sc.find('HUD/TownPanel/NpcForge') { u.npc_forge = n }
	if n := sc.find('HUD/TownPanel/NpcDesc') { u.desc_lbl = n }
	if n := sc.find('HUD/TownPanel/SectValue') { u.sect_lbl = n }
	if n := sc.find('HUD/TownPanel/ShopValue') { u.shop_lbl = n }
	if n := sc.find('HUD/TownPanel/BtnSectPrev') { u.btn_sect_prev = n }
	if n := sc.find('HUD/TownPanel/BtnSectNext') { u.btn_sect_next = n }
	if n := sc.find('HUD/TownPanel/BtnSectJoin') { u.btn_sect_join = n }
	if n := sc.find('HUD/TownPanel/BtnShopPrev') { u.btn_shop_prev = n }
	if n := sc.find('HUD/TownPanel/BtnShopNext') { u.btn_shop_next = n }
	if n := sc.find('HUD/TownPanel/BtnBuy') { u.btn_buy = n }
	if n := sc.find('HUD/TownPanel/BtnLeave') { u.btn_leave = n }
	if n := sc.find('HUD/TownPanel/BtnClose') { u.btn_close = n }
	if n := sc.find('HUD/EnhancePanel/EnhanceValue') { u.enh_lbl = n }
	if n := sc.find('HUD/EnhancePanel/BtnSlotPrev') { u.btn_slot_prev = n }
	if n := sc.find('HUD/EnhancePanel/BtnSlotNext') { u.btn_slot_next = n }
	if n := sc.find('HUD/EnhancePanel/BtnEnhance') { u.btn_do_enh = n }
	if n := sc.find('HUD/EnhancePanel/BtnClose') { u.btn_close_enh = n }
}

pub fn (mut u TownPanelUI) update(dt f32) {
	mut s := gs()
	inp := u.input()
	if inp.was_pressed(.escape) {
		s.show_town = false
		s.show_enhance = false
	}
	// HUD buttons: Thị Trấn enters the safe zone, Cường Hóa opens the forge
	if poll_btn(u.btn_town) { enter_town() }
	if poll_btn(u.btn_enhance) {
		s.show_enhance = !s.show_enhance
		s.show_map = false
		s.show_team = false
	}
	// NPCs: each one selects its system (forge also opens the EnhancePanel)
	if poll_btn(u.npc_sect) { s.town_npc = 0 }
	if poll_btn(u.npc_shop) { s.town_npc = 1 }
	if poll_btn(u.npc_forge) {
		s.town_npc = 2
		s.show_enhance = true
	}
	// sect system: cycle the sect, then join (or change sect when joined)
	if poll_btn(u.btn_sect_prev) {
		s.town_sect_sel = (s.town_sect_sel + sects.len - 1) % sects.len
		publish()
	}
	if poll_btn(u.btn_sect_next) {
		s.town_sect_sel = (s.town_sect_sel + 1) % sects.len
		publish()
	}
	if poll_btn(u.btn_sect_join) {
		if s.sect_id < 0 {
			if !join_sect(s.town_sect_sel) {
				show_banner('Chưa nhập phái được: cần cấp ${sect_def(s.town_sect_sel).req_level} và ${sect_def(s.town_sect_sel).req_gold} vàng.')
			}
		} else if !change_sect(s.town_sect_sel) {
			show_banner('Chưa đổi phái được: cần cấp ${sect_def(s.town_sect_sel).req_level} và 500 vàng.')
		}
	}
	// shop system: cycle the item, then buy it for real
	if poll_btn(u.btn_shop_prev) {
		s.town_shop_sel = (s.town_shop_sel + shop_items.len - 1) % shop_items.len
		publish()
	}
	if poll_btn(u.btn_shop_next) {
		s.town_shop_sel = (s.town_shop_sel + 1) % shop_items.len
		publish()
	}
	if poll_btn(u.btn_buy) {
		if !buy_item(s.town_shop_sel) {
			show_banner('Không đủ tiền mua ${shop_item(s.town_shop_sel).name}.')
		}
	}
	// forge system (EnhancePanel): cycle the slot, then enhance it for real
	if poll_btn(u.btn_slot_prev) {
		s.enhance_slot_sel = (s.enhance_slot_sel + equip_slot_count - 1) % equip_slot_count
		publish()
	}
	if poll_btn(u.btn_slot_next) {
		s.enhance_slot_sel = (s.enhance_slot_sel + 1) % equip_slot_count
		publish()
	}
	if poll_btn(u.btn_do_enh) {
		if !enhance_slot(s.enhance_slot_sel) {
			show_banner('Chưa cường hóa được: ô trống, đã +10, hoặc thiếu vàng.')
		}
	}
	if poll_btn(u.btn_leave) { exit_town() }
	if poll_btn(u.btn_close) { s.show_town = false }
	if poll_btn(u.btn_close_enh) { s.show_enhance = false }
	if u.panel != unsafe { nil } {
		mut p := u.panel
		p.active = s.show_town
	}
	if u.enh_panel != unsafe { nil } {
		mut p := u.enh_panel
		p.active = s.show_enhance
	}
	// throttled label refresh
	u.tick += dt
	if u.tick < 0.15 {
		return
	}
	u.tick = 0
	set_label(u.desc_lbl, town_npc_desc(s.town_npc))
	set_label(u.sect_lbl, town_sect_text())
	set_label(u.shop_lbl, town_shop_text())
	set_label(u.enh_lbl, town_enhance_text())
}

// town_npc_desc: the one-line introduction of the selected NPC.
fn town_npc_desc(id int) string {
	if id == 1 {
		return 'Chủ Sạp: "Hàng tốt giá thật — đan dược, trang bị, linh thạch đều có."'
	}
	if id == 2 {
		return 'Thợ Rèn: "Đưa trang bị đây, ta rèn lên +10 cho — có phí, có rủi ro."'
	}
	return 'Trưởng Môn: "Muốn nhập phái thì chọn một phái, đủ cấp và vàng hương hỏa là được."'
}
