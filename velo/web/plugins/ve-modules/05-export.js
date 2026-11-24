      const VE = {
        version: 'velo-webgl-9.1-V3D',
        runtime: 'WebGL â€” ONE pipeline, same scene graph as the game (no Pixi, no second canvas)',
        core: { get Node() { return V.scene.root.constructor; } },
        render: {
          get Sprite() { return Comp('Sprite'); }, get Label() { return Comp('Label'); },
          get Panel() { return Comp('Panel'); }, get UITransform() { return Comp('UITransform'); },
          get ParticleSystem() { return Comp('ParticleSystem'); },
        },
        get db() { return V.db; },
        get scene() { return V.scene; },
        get store() { return V.store; },
        get fit() { return V.fit; },
        get registry() { return V.registry; },
        get gfx() { return V.gfx; },
        Texture, Sprite, AnimatedSprite, Text, Container, Graphics,
        Ticker, Tween, Sequence, Coroutine, Loader, Store, Scene, Input, Audio,
        Particles, Events, StateMachine, Pool, Color, Math2D: { Vec2, Rect, Circle, collide },
        Path, SpriteSheet, Layout, Dom, Debug, Fps, Stage, Time, RNG, Grid, Behaviors, Camera, Save, Data, Noise,
        Matrix2D, QuadTree, Flock, Json, Observable, UndoStack, Async, Hash, Spline, Input2, Profiler, SaveSlots, Physics, Timer, NineSlice, Viewport,
        Gamepad, AStar, Geom, Bezier, Tween2, Color2, Strings, Arrays, EventBus, ParticlesFX, Audio2, SaveIO, Perf, ScreenFx, Utils2,
        Gesture, Polygon, TweenPath, Serialize, Vec3, Matrix3, Text2, SceneFlow, Grid2, Anim, Utils3, V3D,
        Rig, Rig2,
        utils,
        extras: utilExtra,
      };
      window.VE = VE;
      // auto-advance AnimatedSprites
      Ticker.add((dt) => {
        try {
          const root = V.scene.root;
          const st = [root];
          while (st.length) {
            const n = st.pop();
            for (const ch of n.children) st.push(ch);
            for (const c of n.components) {
              if (c._veAnim && c._veAnim.playing) {
                c._veAnim.t += dt;
                const f = Math.floor(c._veAnim.t * c._veAnim.fps) % Math.max(1, c._veAnim.frames);
                if (!c._veAnim.loop && f === 0 && c._veAnim.t > 0.01) {
                  c._veAnim.playing = false;
                  c.frame = Math.max(1, c._veAnim.frames) - 1;
                  if (c._veAnim.onEnd) { try { c._veAnim.onEnd(); } catch (e) {} }
                } else c.frame = f;
              }
            }
          }
        } catch (e) {}
      });
      console.log('[ve-api] Velo engine exposed as window.VE v9.1 V3D â€” one shared WebGL pipeline');
      return true;
    } catch (e) {
      console.warn('[ve-api] init failed (game unaffected):', e);
      return false;
    }
  };
  let tries = 0;
  const iv = setInterval(() => { if (init() || ++tries > 40) clearInterval(iv); }, 300);
})();
