module main

import velo.assets
import velo.audio
import velo.core

// ===========================================================================
// SFX — one reusable AudioSource node plays one-shot sounds from assets/audio/.
// Every sound respects the store 'sound' toggle (Settings).
// ===========================================================================

fn setup_sfx(mut root &core.Node) {
	mut n := core.Node.new('SfxPlayer')
		.with(&audio.AudioSource{
			clip:   assets.ref[assets.AudioClip]('audio/click.wav')
			volume: 0.7
		})
	root.add_child(mut n)
}

fn ensure_music(mut root &core.Node) {
	if root.find('MusicPlayer') != none {
		return
	}
	mut n := core.Node.new('MusicPlayer')
		.with(&audio.AudioSource{
			clip:           assets.ref[assets.AudioClip]('audio/Secrets_of_the_Bamboo_Grove.mp3')
			volume:         0.45
			looping:        true
			play_on_start:  true
			bus:            'music'
		})
	n.persistent = true
	root.add_child(mut n)
}

fn music_set_paused(sc &core.Scene, paused bool) {
	mut n := sc.root.find('MusicPlayer') or { return }
	if mut a := n.get_component[audio.AudioSource]() {
		if paused {
			a.stop()
		} else {
			a.play()
		}
	}
}

fn sfx_play_scene(sc &core.Scene, clip string) {
	if !sc.store.get_bool('sound', true) {
		return
	}
	mut n := sc.root.find('SfxPlayer') or { return }
	if mut a := n.get_component[audio.AudioSource]() {
		a.set_clip(assets.ref[assets.AudioClip](clip))
		a.play()
	}
}
