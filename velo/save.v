module main

import strings
import velo.core

// ===========================================================================
// Save / Load as JSON — the save is a single JSON string kept in the store
// key 'save_json' (persisted by the engine). Tiny hand-rolled JSON readers
// (no json2) so it works on desktop AND web.
// Format: {"coins":N,"unlocked":N,"current_level":N,"sound":true,"team":"fire:2,wind:1"}
// ===========================================================================

fn json_get_int(s string, key string, default int) int {
	needle := '"${key}":'
	i := s.index(needle) or { -1 }
	if i < 0 {
		return default
	}
	start := i + needle.len
	mut j := start
	for j < s.len && s[j].is_digit() {
		j++
	}
	if j > start {
		return s[start..j].int()
	}
	return default
}

fn json_get_bool(s string, key string, default bool) bool {
	needle := '"${key}":'
	i := s.index(needle) or { -1 }
	if i < 0 {
		return default
	}
	rest := s[i + needle.len..]
	if rest.starts_with('true') {
		return true
	}
	if rest.starts_with('false') {
		return false
	}
	return default
}

fn json_get_str(s string, key string) string {
	needle := '"${key}":"'
	i := s.index(needle) or { -1 }
	if i < 0 {
		return ''
	}
	start := i + needle.len
	end := s.index_after('"', start) or { -1 }
	if end < 0 {
		return ''
	}
	return s[start..end]
}

fn build_save_json(st &core.Store, units []&core.Node) string {
	mut sb := strings.new_builder(180)
	sb.write_string('{"coins":')
	sb.write_string(st.get_int('coins', 200).str())
	sb.write_string(',"unlocked":')
	sb.write_string(st.get_int('unlocked', 1).str())
	sb.write_string(',"current_level":')
	sb.write_string(st.get_int('current_level', 1).str())
	sb.write_string(',"sound":')
	sb.write_string(if st.get_bool('sound', true) { 'true' } else { 'false' })
	sb.write_string(',"team":"')
	for u in units {
		if mut m := u.get_component[Monster]() {
			sb.write_string('${m.element}:${m.level},')
		}
	}
	sb.write_string('"}')
	return sb.str()
}

fn parse_team(s string) []TeamSlot {
	mut out := []TeamSlot{}
	raw := json_get_str(s, 'team')
	if raw == '' {
		return out
	}
	parts := raw.split(',')
	for p in parts {
		if p == '' {
			continue
		}
		cols := p.split(':')
		if cols.len == 2 {
			out << TeamSlot{
				element: cols[0]
				level:   cols[1].int()
			}
		}
	}
	return out
}

fn team_from_save(st &core.Store) []TeamSlot {
	return parse_team(st.get_string('save_json', ''))
}

// auto_save_team — keep the save JSON in sync with the current army so the
// team survives map → battle round trips (no manual SAVE needed).
fn auto_save_team(mut st core.Store, units []&core.Node) {
	st.set_string('save_json', build_save_json(st, units))
}

fn save_json_exists(st &core.Store) bool {
	return st.get_string('save_json', '').len > 0
}

fn apply_save(mut st core.Store, s string) bool {
	if s.len < 10 {
		return false
	}
	st.set_int('coins', json_get_int(s, 'coins', 200))
	st.set_int('unlocked', json_get_int(s, 'unlocked', 1))
	st.set_int('current_level', json_get_int(s, 'current_level', 1))
	st.set_bool('sound', json_get_bool(s, 'sound', true))
	return true
}
