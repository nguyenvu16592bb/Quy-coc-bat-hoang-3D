import io

p = r'C:\New folder\Hangrong\merge-game\battle.v'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:80].replace('\n', '\\n')
    s = s.replace(old, new)

# boss: back to a plain node (Monster + HP bar); Pixi plugin draws the rig
# over the exact node position (fit mode → aligned, projectiles match)
rep("""		mut n := core.Node.new('Enemy')
		if boss {
			// boss uses Velo's Kine2D component (rig converted from the .kine)
			n = n.with(&kine2d.Kine2D{
				data:        assets.ref[assets.TextAsset]('Kine/boss_soi.skel.json')
				atlas:       assets.ref[assets.TextAsset]('Kine/boss_soi.atlas.json')
				animation:   'Move'
				looping:     true
				playing:     true
				canvas_size: core.vec2(960, 600)
			})
			n.scale = core.vec2(0.5, 0.5) // zoom 100%
		} else {
			n = n.with(&render.Sprite{
				texture: assets.ref[assets.Texture](tex)
				size:    sz
			})
		}""", """		mut n := core.Node.new('Enemy')
		if boss {
			// boss art is drawn by the Pixi plugin (velo-kine-boss.js) over the
			// node position — same rendering style as the game (WebGL textures)
			n.z_index = 4
		} else {
			n = n.with(&render.Sprite{
				texture: assets.ref[assets.Texture](tex)
				size:    sz
			})
		}""")

# remove the Kine2D clip-state block from the enemy loop (no longer a Kine2D node)
rep("""			if m.is_boss {
				if mut k2d := e.get_component[kine2d.Kine2D]() {
					mut clip := 'Idle'
					if dist > stop_at {
						clip = 'Move'
					} else if m.cooldown <= 0.25 {
						clip = 'Attack'
					}
					if !m.alive {
						clip = 'Death'
					}
					if k2d.animation != clip {
						k2d.animation = clip
						k2d.time = 0
					}
				}
			}
""", "")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('OK boss back to pixi plugin')
