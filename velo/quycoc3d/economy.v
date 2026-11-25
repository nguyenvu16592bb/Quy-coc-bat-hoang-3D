module main

// ============================================================================
//  economy.v — money, shop and market.
//
//  Three currencies: vàng (gold, the main currency), bạc (silver, the common
//  currency) and linh thạch (spirit stones, kept in GState.stones from map
//  clears). Every spend goes through spend_gold / spend_silver, which refuse
//  negative amounts and never let a balance go below zero.
// ============================================================================

pub struct ShopItem {
pub:
	id           int
	name         string
	price_gold   int
	price_silver int
	kind         string
	hp_add       int
	atk_add      int
	desc         string
}

pub const shop_items = [
	ShopItem{
		id:           0
		name:         'Hồi Huyết Đan'
		price_gold:   50
		price_silver: 0
		kind:         'pill'
		hp_add:       85
		atk_add:      0
		desc:         'Uống vào hồi 85 HP ngay lập tức.'
	},
	ShopItem{
		id:           1
		name:         'Hồi Khí Đan'
		price_gold:   40
		price_silver: 0
		kind:         'pill'
		hp_add:       0
		atk_add:      0
		desc:         'Uống vào hồi 120 MP ngay lập tức.'
	},
	ShopItem{
		id:           2
		name:         'Bạo Linh Phù'
		price_gold:   120
		price_silver: 0
		kind:         'pill'
		hp_add:       0
		atk_add:      0
		desc:         'Tăng 35% tỉ lệ bạo kích trong 10 giây.'
	},
	ShopItem{
		id:           3
		name:         'Thanh Đồng Kiếm'
		price_gold:   300
		price_silver: 0
		kind:         'weapon'
		hp_add:       0
		atk_add:      15
		desc:         'Kiếm đồng rèn tay, công +15.'
	},
	ShopItem{
		id:           4
		name:         'Huyền Thiết Giáp'
		price_gold:   350
		price_silver: 0
		kind:         'armor'
		hp_add:       80
		atk_add:      0
		desc:         'Giáp huyền thiết, HP +80, thủ +8.'
	},
	ShopItem{
		id:           5
		name:         'Linh Chi Thảo'
		price_gold:   80
		price_silver: 0
		kind:         'material'
		hp_add:       0
		atk_add:      0
		desc:         'Dược liệu luyện đan, dùng trong nhiệm vụ hằng ngày.'
	},
	ShopItem{
		id:           6
		name:         'Ngọc Bội Linh Lung'
		price_gold:   200
		price_silver: 0
		kind:         'charm'
		hp_add:       30
		atk_add:      5
		desc:         'Ngọc bội hộ thân, HP +30, công +5.'
	},
	ShopItem{
		id:           7
		name:         'Thức Ăn Thần Thú'
		price_gold:   60
		price_silver: 0
		kind:         'pet_food'
		hp_add:       0
		atk_add:      0
		desc:         'Cho thần thú ăn để tăng 20 kinh nghiệm pet.'
	},
	ShopItem{
		id:           8
		name:         'Đá Cường Hóa'
		price_gold:   150
		price_silver: 0
		kind:         'material'
		hp_add:       0
		atk_add:      0
		desc:         'Dùng để cường hóa trang bị, mỗi lần +1 cấp.'
	},
	ShopItem{
		id:           9
		name:         'Túi Linh Thạch Nhỏ'
		price_gold:   0
		price_silver: 500
		kind:         'material'
		hp_add:       0
		atk_add:      0
		desc:         'Mở ra nhận 10 linh thạch.'
	},
	ShopItem{
		id:           10
		name:         'Hồi Sinh Đan'
		price_gold:   250
		price_silver: 0
		kind:         'pill'
		hp_add:       200
		atk_add:      0
		desc:         'Uống vào hồi 200 HP ngay lập tức.'
	},
	ShopItem{
		id:           11
		name:         'Linh Thạch Thượng Phẩm'
		price_gold:   0
		price_silver: 1200
		kind:         'material'
		hp_add:       0
		atk_add:      0
		desc:         'Mở ra nhận 30 linh thạch.'
	},
]

pub const market_fee_pct = 5

// shop_item: the shop entry of an id (safe for any id, falls back to item 0).
fn shop_item(id int) ShopItem {
	if id < 0 || id >= shop_items.len {
		return shop_items[0]
	}
	return shop_items[id]
}

// add_gold / add_silver / add_stones: add currency, ignoring negative amounts.
fn add_gold(n int) {
	if n <= 0 {
		return
	}
	mut s := gs()
	s.gold += n
	publish()
}

fn add_silver(n int) {
	if n <= 0 {
		return
	}
	mut s := gs()
	s.silver += n
	publish()
}

fn add_stones(n int) {
	if n <= 0 {
		return
	}
	mut s := gs()
	s.stones += n
	publish()
}

// spend_gold / spend_silver / spend_stones: deduct currency. Returns false
// (and deducts nothing) for a negative amount or an insufficient balance,
// so a balance can never go below zero through these helpers.
fn spend_gold(n int) bool {
	if n <= 0 {
		return false
	}
	mut s := gs()
	if s.gold < n {
		return false
	}
	s.gold -= n
	publish()
	return true
}

fn spend_silver(n int) bool {
	if n <= 0 {
		return false
	}
	mut s := gs()
	if s.silver < n {
		return false
	}
	s.silver -= n
	publish()
	return true
}

fn spend_stones(n int) bool {
	if n <= 0 {
		return false
	}
	mut s := gs()
	if s.stones < n {
		return false
	}
	s.stones -= n
	publish()
	return true
}

// inventory_add / inventory_has / inventory_remove: the bag holds item ids
// (shop ids and equipment ids share the same bag).
// Vòng 3: túi có giới hạn ô thật = số loại đồ khác nhau tối đa (vip_bag_cap,
// cơ bản 30 ô + VIP). Loại đã có thì luôn nhận thêm được; loại mới khi túi
// đầy thì bị từ chối (trả về false) để VIP thêm ô có ý nghĩa thật.
fn inventory_add(id int) bool {
	mut s := gs()
	if s.inventory.index(id) < 0 {
		mut seen := map[int]bool{}
		for other in s.inventory {
			seen[other] = true
		}
		if seen.len >= vip_bag_cap() {
			return false
		}
	}
	s.inventory << id
	return true
}

fn inventory_has(id int) bool {
	return gs().inventory.index(id) >= 0
}

fn inventory_remove(id int) bool {
	mut s := gs()
	i := s.inventory.index(id)
	if i < 0 {
		return false
	}
	s.inventory.delete(i)
	return true
}

// buy_item: pay the shop price (gold when price_gold > 0, otherwise silver)
// and put the item in the bag. Returns false when the price cannot be paid.
fn buy_item(id int) bool {
	if id < 0 || id >= shop_items.len {
		return false
	}
	it := shop_item(id)
	if it.price_gold > 0 {
		if !spend_gold(it.price_gold) {
			return false
		}
	} else if it.price_silver > 0 {
		if !spend_silver(it.price_silver) {
			return false
		}
	} else {
		return false
	}
	inventory_add(id)
	show_banner('Đã mua ${it.name}.')
	return true
}

// sell_price: what the shop pays back for an item (60% of its price).
fn sell_price(id int) int {
	it := shop_item(id)
	if it.price_gold > 0 {
		return it.price_gold * 60 / 100
	}
	return it.price_silver * 60 / 100
}

// sell_item: remove one copy from the bag and pay the sell price back in the
// same currency the item was bought with. Returns false when not in the bag.
fn sell_item(id int) bool {
	if id < 0 || id >= shop_items.len {
		return false
	}
	if !inventory_remove(id) {
		return false
	}
	it := shop_item(id)
	if it.price_gold > 0 {
		add_gold(sell_price(id))
	} else {
		add_silver(sell_price(id))
	}
	show_banner('Đã bán ${it.name} (+${sell_price(id)}).')
	return true
}

// market_fee: the market takes 5% of the listed price on every trade.
fn market_fee(price int) int {
	if price <= 0 {
		return 0
	}
	return price * market_fee_pct / 100
}

// market_buy: buy from another player through the market — price plus fee,
// paid in gold. Returns false when gold is short.
fn market_buy(id int, price int) bool {
	if id < 0 || id >= shop_items.len {
		return false
	}
	if price <= 0 {
		return false
	}
	total := price + market_fee(price)
	if !spend_gold(total) {
		return false
	}
	inventory_add(id)
	return true
}

// market_sell: list an item on the market — the seller keeps price minus fee.
// Returns the gold actually received, or -1 when the item is not in the bag.
fn market_sell(id int, price int) int {
	if id < 0 || id >= shop_items.len {
		return -1
	}
	if price <= 0 {
		return -1
	}
	if !inventory_remove(id) {
		return -1
	}
	got := price - market_fee(price)
	add_gold(got)
	return got
}
