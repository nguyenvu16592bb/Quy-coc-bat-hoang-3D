# Converts an Animforge/Pixelforge .kine into Spine 4.x files:
#   <name>.json (Spine skeleton) + <name>.atlas (Spine text atlas) + <name>.png
# One bone per part at part.x/y (canvas centre, flipped to Spine y-up).
# Usage: python spine4.py <file.kine> <outdir>
import zipfile
import json
import os
import sys
import io
import base64
import math
from PIL import Image

def main():
    kine = sys.argv[1] if len(sys.argv) > 1 else r'C:\New folder\Hangrong\merge-game\assets\Kine\pixelforge-soi-auto-rig-CU2.kine'
    out = sys.argv[2] if len(sys.argv) > 2 else r'C:\New folder\Hangrong\merge-game\assets\kine'
    base = 'boss_soi_spine'

    z = zipfile.ZipFile(kine)
    pix = json.loads(z.read('pixelforge.json'))
    parts = pix['parts']
    clips = pix['clips']
    cw = (pix.get('workspace') or {}).get('width') or 960
    ch = (pix.get('workspace') or {}).get('height') or 600

    # images
    images = []
    for p in parts:
        src = p.get('src', '')
        if src.startswith('data:image/png;base64,'):
            images.append((p['name'], Image.open(io.BytesIO(base64.b64decode(src.split(',', 1)[1]))).convert('RGBA')))
        else:
            images.append((p['name'], Image.open(io.BytesIO(z.read('assets/' + p['name'] + '.png'))).convert('RGBA')))

    # sheet
    cell_w = max(im.width for _, im in images) or 1
    cell_h = max(im.height for _, im in images) or 1
    cols = 8
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new('RGBA', (cell_w * cols, cell_h * rows), (0, 0, 0, 0))
    regions = []
    for i, (name, im) in enumerate(images):
        x = (i % cols) * cell_w
        y = (i // cols) * cell_h
        sheet.paste(im, (x, y), im)
        regions.append({'name': name, 'x': x, 'y': y, 'w': im.width, 'h': im.height})
    sheet.save(os.path.join(out, base + '.png'))

    # ---- Spine .atlas (text) ----
    atlas_lines = [base + '.png', 'size: %d,%d' % (sheet.width, sheet.height), 'format: RGBA8888', 'filter: Linear,Linear', 'repeat: none']
    # NOTE: spine text-atlas parser treats a BLANK line as the start of a NEW
    # PAGE. Regions must follow the page block directly, no blank lines.
    for r in regions:
        atlas_lines.append(r['name'])
        atlas_lines.append('  rotate: 0')
        atlas_lines.append('  xy: %d, %d' % (r['x'], r['y']))
        atlas_lines.append('  size: %d, %d' % (r['w'], r['h']))
        atlas_lines.append('  orig: %d, %d' % (r['w'], r['h']))
        atlas_lines.append('  offset: 0, 0')
        atlas_lines.append('  index: -1')
    with open(os.path.join(out, base + '.atlas'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(atlas_lines))

    # ---- Spine .json ----
    bones = []
    slots = []
    skin_attachments = {}
    for p in parts:
        bones.append({'name': p['name'], 'x': round(p['x'] - cw / 2.0, 3), 'y': round(ch - p['y'] - ch / 2.0, 3)})
        slots.append({'name': p['name'], 'bone': p['name'], 'attachment': p['name']})
        w = p.get('w') or [im for n, im in images if n == p['name']][0].width
        h = p.get('h') or [im for n, im in images if n == p['name']][0].height
        skin_attachments[p['name']] = {p['name']: {'width': w, 'height': h, 'x': 0, 'y': 0}}

    animations = {}
    for clip_name in ['Idle', 'Move', 'Attack', 'Death']:
        c = clips.get(clip_name)
        if not c:
            continue
        fps = c.get('fps') or 30
        bone_anim = {}
        for part in parts:
            src_bone = part.get('bone')
            tracks = []
            for fkey, bone_keys in (c.get('keys') or {}).items():
                kv = (bone_keys or {}).get(src_bone)
                if not kv:
                    continue
                t = float(fkey) / fps
                tracks.append({
                    'time': round(t, 4),
                    'x': round(part['x'] - cw / 2.0 + (kv.get('dx') or 0), 3),
                    'y': round(ch - part['y'] - ch / 2.0 + (kv.get('dy') or 0), 3),
                })
            if tracks:
                bone_anim[part['name']] = {'translate': tracks}
        animations[clip_name] = {'bones': bone_anim}

    sk = {
        'skeleton': {'spine': '4.2.0', 'images': '', 'fps': 30},
        'bones': bones,
        'slots': slots,
        'skins': [{'name': 'default', 'attachments': skin_attachments}],
        'animations': animations,
    }
    with open(os.path.join(out, base + '.json'), 'w', encoding='utf-8') as f:
        json.dump(sk, f)
    print('OK -> Spine 4.x:', base + '.json / .atlas / .png')
    print('  bones', len(bones), 'slots', len(slots), 'clips', list(animations.keys()))

main()
