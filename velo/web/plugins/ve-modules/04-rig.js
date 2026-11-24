      // ================= Rig (Spine-style rig animation toolkit) =================
      // Wraps a Kine2D component with post-processed mesh rigging:
      //   â€¢ footPlant â€” lock feet slots to a ground level (no sliding/lifting)
      //   â€¢ ikArm â€” 2-bone-style IK: rotate an arm slot around its shoulder so
      //     the hand reaches a target point (classic Spine IK)
      //   â€¢ constraints â€” clamp a bone's rotation to [min, max] (editor limits)
      //   â€¢ skin / crossfade / speed / paused / time â€” playback control
      //   â€¢ pose() â€” world transform of any bone (for targeting/debug)
      const Rig = {
        wrap(k2, opts) {
          if (!k2) return null;
          const rig = {
            k2,
            opts: opts || {},
            speed: 1,
            paused: false,
            skin: null,
            _orig: k2.meshes.bind(k2),
            footPlant: [],
            ik: [],
            constraints: [],
            shifts: [],
            tint: null,
            onEvent: null,
            _lastFrame: -1,
            // ---------- controls ----------
            play(clip, loop) { if (k2.play) k2.play(clip, loop !== false); else { k2.animation = clip; k2.time = 0; } rig.paused = false; },
            pause() { rig.paused = true; },
            resume() { rig.paused = false; },
            goto(t) { k2.time = t; },
            setSkin(name) { k2.skin = name || ''; rig.skin = name || null; },
            get clip() { return k2.animation; },
            get time() { return k2.time; },
            get duration() { try { const a = k2.current_animation(); return a ? a.duration() : 0; } catch (e) { return 0; } },
            // ---------- rig features ----------
            addFootPlant(indices, groundY) {
              rig.footPlant.push({ indices: indices || [], groundY: groundY });
            },
            addIK(index, targetFn, shoulderBone) {
              rig.ik.push({ index, target: targetFn, shoulder: shoulderBone || null });
            },
            addConstraint(bone, minDeg, maxDeg) {
              rig.constraints.push({ bone, min: minDeg, max: maxDeg });
            },
            // shift a mesh by a fixed dy every frame (attach/offset helper)
            addShift(index, dy) {
              rig.shifts.push({ index, dy });
            },
            setTint(r, g, b) {
              rig.tint = { r: r / 255, g: g / 255, b: b / 255 };
            },
            // bone world pose (skel units -> world px via canvas scaling)
            pose(name) {
              try {
                const sk = k2.skeleton;
                const cw = sk.canvas_width || 960, ch = sk.canvas_height || 600;
                const b = sk.bones.find((x) => x.name === name);
                if (!b) return null;
                const rec = (nm) => {
                  const bb = sk.bones.find((x) => x.name === nm);
                  if (!bb) return { x: 0, y: 0, rot: 0 };
                  const rot = bb.rotation * Math.PI / 180;
                  const par = bb.parent ? rec(bb.parent) : null;
                  const wx = par ? par.x + bb.x * Math.cos(par.rot) - bb.y * Math.sin(par.rot) : bb.x;
                  const wy = par ? par.y + bb.x * Math.sin(par.rot) + bb.y * Math.cos(par.rot) : bb.y;
                  return { x: wx, y: wy, rot: par ? par.rot + rot : rot };
                };
                const p = rec(name);
                return { x: p.x * cw / 100, y: p.y * ch / 180, rot: p.rot };
              } catch (e) { return null; }
            },
            parts() {
              try { return (k2.skeleton.slots || []).map((s) => s.name); } catch (e) { return []; }
            },
            // ---------- post-processed meshes ----------
            meshes() {
              const ms = rig._orig();
              if (rig.paused) return ms;
              // foot planting: keep the foot slot's BOTTOM (lowest vertex) on the ground
              for (const fp of rig.footPlant) {
                for (let mi = 0; mi < ms.length; mi++) {
                  if (fp.indices.indexOf(mi) === -1) continue;
                  const m = ms[mi];
                  let maxY = -Infinity;
                  for (let i = 1; i < m.positions.length; i += 2) if (m.positions[i] > maxY) maxY = m.positions[i];
                  const dy = fp.groundY - maxY;
                  if (Math.abs(dy) > 0.01) for (let i = 1; i < m.positions.length; i += 2) m.positions[i] += dy;
                }
              }
              // arm IK: rotate the slot around its shoulder so the hand aims at the target
              for (const ik of rig.ik) {
                const m = ms[ik.index];
                if (!m) continue;
                const t = ik.target ? ik.target() : null;
                if (!t) continue;
                  const n = m.positions.length / 2;
                  let cx = 0, cy = 0;
                  for (let j = 0; j < n; j++) { cx += m.positions[j * 2]; cy += m.positions[j * 2 + 1]; }
                  cx /= n; cy /= n;
                  // shoulder point: top-edge center of the slot (min y) or explicit bone pose
                  let sx = cx, sy = cy;
                  if (ik.shoulder) { const p = rig.pose(ik.shoulder); if (p) { sx = p.x; sy = p.y; } }
                  else {
                    let minY = Infinity;
                    for (let i = 1; i < m.positions.length; i += 2) if (m.positions[i] < minY) minY = m.positions[i];
                    let sumX = 0, cnt = 0;
                    for (let i = 0; i < m.positions.length; i += 2) if (Math.abs(m.positions[i + 1] - minY) < 0.5) { sumX += m.positions[i]; cnt++; }
                    sx = sumX / Math.max(1, cnt); sy = minY;
                  }
                  // hand: the vertex farthest from the shoulder
                  let hx = cx, hy = cy, hd = 0;
                  for (let j = 0; j < n; j++) {
                    const d = Math.hypot(m.positions[j * 2] - sx, m.positions[j * 2 + 1] - sy);
                    if (d > hd) { hd = d; hx = m.positions[j * 2]; hy = m.positions[j * 2 + 1]; }
                  }
                  // rotate the slot by the angle delta around the shoulder
                  const cur = Math.atan2(hy - sy, hx - sx);
                  const want = Math.atan2(t.y - sy, t.x - sx);
                  const da = utils.clampAngle(want - cur);
                  if (Math.abs(da) > 0.02) {
                    const cos = Math.cos(da), sin = Math.sin(da);
                    for (let j = 0; j < n; j++) {
                      const vx = m.positions[j * 2] - sx, vy = m.positions[j * 2 + 1] - sy;
                      m.positions[j * 2] = sx + vx * cos - vy * sin;
                      m.positions[j * 2 + 1] = sy + vx * sin + vy * cos;
                    }
                  }
              }
              // fixed mesh shifts (e.g. attach the upper legs to the torso)
              for (const sh of rig.shifts) {
                const m = ms[sh.index];
                if (!m || Math.abs(sh.dy) < 0.01) continue;
                for (let i = 1; i < m.positions.length; i += 2) m.positions[i] += sh.dy;
              }
              // boss tint: multiply every mesh color
              if (rig.tint) {
                for (const m of ms) {
                  if (!m.color) continue;
                  m.color.r = Math.min(255, Math.round(m.color.r * rig.tint.r));
                  m.color.g = Math.min(255, Math.round(m.color.g * rig.tint.g));
                  m.color.b = Math.min(255, Math.round(m.color.b * rig.tint.b));
                }
              }
              // constraints: clamp bone rotations (post-process bone list)
              if (rig.constraints.length && k2.skeleton) {
                for (const c of rig.constraints) {
                  const b = k2.skeleton.bones.find((x) => x.name === c.bone);
                  if (b) b.rotation = utils.clamp(b.rotation, c.min, c.max);
                }
              }
              // playback
              if (rig.speed !== 1 && k2.speed !== undefined) k2.speed = rig.speed;
              return ms;
            },
          };
          try { k2.meshes = rig.meshes; } catch (e) {}
          return rig;
        },
        // helper: build a rig with sensible defaults for a humanoid boss
        humanoid(k2, opts) {
          const rig = Rig.wrap(k2, opts);
          if (!rig) return null;
          const parts = rig.parts();
          const feet = parts.filter((p) => /leg_\d$/.test(p));
          if (feet.length) rig.addFootPlant(feet, opts.groundY);
          return rig;
        },
      };

      // ================= Rig2 (constraint / playback extras) =================
      const Rig2 = {
        crossfade(k2, clipA, clipB, dur, onDone) {
          // quick fade-out/in of the whole node through its color alpha
          const n = k2.node;
          if (!n) return;
          const t0 = performance.now();
          const step = () => {
            const t = Math.min(1, (performance.now() - t0) / (dur || 300));
            const a = Math.abs(2 * t - 1); // 1 -> 0 -> 1
            if (n.components[0] && n.components[0].color) n.components[0].color[3] = a * 255;
            if (t >= 1) { k2.play(clipB, true); if (onDone) onDone(); return; }
            if (t >= 0.5 && !Rig2._switched) { Rig2._switched = true; k2.play(clipB, true); }
            requestAnimationFrame(step);
          };
          Rig2._switched = false;
          step();
        },
      };
