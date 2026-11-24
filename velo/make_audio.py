# Generates retro arcade SFX (like Merge Elements) into assets/audio/ as WAV.
# Pure Python (wave + math) — no extra libraries. Run:  python make_audio.py
import wave
import math
import struct
import os
import random

OUT = r'C:\New folder\Hangrong\merge-game\assets\audio'
RATE = 22050

random.seed(7)

def write_wav(name, samples):
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(s * 32767)))) for s in samples))
    print('  wrote %s (%.2fs)' % (name, len(samples) / RATE))

def env(i, n, a=0.005, r=0.08):
    """attack/decay envelope"""
    if i < a * RATE:
        return i / (a * RATE)
    t = (i - a * RATE) / (n * RATE)
    return max(0.0, 1.0 - t / r)

def tone(freq_start, freq_end, dur, vol=0.5, wave='square', decay=1.0):
    n = int(dur * RATE)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / n
        f = freq_start + (freq_end - freq_start) * t
        phase += 2 * math.pi * f / RATE
        if wave == 'square':
            s = 1.0 if math.sin(phase) >= 0 else -1.0
        elif wave == 'sine':
            s = math.sin(phase)
        elif wave == 'saw':
            s = 2 * ((phase / (2 * math.pi)) % 1.0) - 1.0
        else:  # triangle
            s = 2 / math.pi * math.asin(math.sin(phase))
        e = env(i, n) * math.exp(-decay * t)
        out.append(s * e * vol)
    return out

def noise(dur, vol=0.4, lp=0.2, decay=1.2):
    n = int(dur * RATE)
    out = []
    acc = 0.0
    for i in range(n):
        acc = acc * (1 - lp) + (random.uniform(-1, 1)) * lp
        e = env(i, n) * math.exp(-decay * i / n)
        out.append(acc * e * vol)
    return out

def mix(*tracks):
    n = max(len(t) for t in tracks) if tracks else 0
    out = [0.0] * n
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    return out

os.makedirs(OUT, exist_ok=True)
print('Generating audio into', OUT)

# UI click — short blip
write_wav('click.wav', tone(880, 660, 0.07, 0.35, 'square', 6))
# Buy — coin-ish ding up
write_wav('buy.wav', mix(tone(523, 523, 0.09, 0.4, 'sine', 3), tone(784, 784, 0.12, 0.3, 'sine', 3)))
# Merge — rising pop + sparkle
write_wav('merge.wav', mix(tone(440, 880, 0.12, 0.5, 'square', 3), tone(880, 1760, 0.15, 0.25, 'sine', 4), noise(0.08, 0.25, 0.3, 6)))
# Attack (fire projectile) — pew
write_wav('attack.wav', mix(tone(600, 240, 0.12, 0.4, 'saw', 4), noise(0.08, 0.15, 0.4, 8)))
# Hit — thud
write_wav('hit.wav', mix(tone(200, 120, 0.09, 0.5, 'square', 6), noise(0.05, 0.25, 0.5, 8)))
# Coin (kill) — bright ding
write_wav('coin.wav', mix(tone(988, 988, 0.07, 0.35, 'sine', 4), tone(1319, 1319, 0.12, 0.28, 'sine', 4)))
# Level up — quick arpeggio
write_wav('levelup.wav', mix(tone(523, 523, 0.08, 0.35, 'square', 3),
                             tone(659, 659, 0.08, 0.35, 'square', 3),
                             tone(784, 784, 0.08, 0.35, 'square', 3),
                             tone(1047, 1047, 0.16, 0.35, 'square', 3)))
# Win — little fanfare
write_wav('win.wav', mix(tone(523, 523, 0.12, 0.4, 'square', 2),
                         tone(659, 659, 0.12, 0.4, 'square', 2),
                         tone(784, 784, 0.12, 0.4, 'square', 2),
                         tone(1047, 1047, 0.35, 0.45, 'square', 1.5)))
# Lose — descending sad tones
write_wav('lose.wav', mix(tone(392, 392, 0.18, 0.4, 'square', 2),
                          tone(330, 330, 0.18, 0.4, 'square', 2),
                          tone(262, 262, 0.4, 0.45, 'square', 1.5)))
# Boss roar — low growl
write_wav('boss.wav', mix(tone(110, 70, 0.6, 0.55, 'saw', 1.6), noise(0.5, 0.3, 0.15, 2)))
# Boss hit (big thud)
write_wav('boss_hit.wav', mix(tone(90, 55, 0.2, 0.6, 'square', 3), noise(0.12, 0.3, 0.4, 5)))

print('Done —', len([f for f in os.listdir(OUT) if f.endswith('.wav')]), 'sfx files')
