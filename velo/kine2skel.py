# Converts an Animforge/Pixelforge .kine into Velo Kine2D files.
# v4: reads the .kine's OWN exported format — animforge.project.json — which is
# EXACTLY what kine2d.vinazon.vn / rig-auto consume:
#   • bones: world rest, skel units (x/9.6, y/3.333), rotation DEGREES, 0.45 baked
#   • slots: bone + attachment {path,size,x,y,rotation,scaleX,scaleY} (local)
#   • animations: keyframes per bone per frame, WORLD absolute, degrees
# We only build the atlas sheet + region names and emit the 4 game clips.
import zipfile
import json
import os
import sys
import io
import base64
from PIL import Image

CLIPS = ['Idle', 'Move', 'Attack', 'Death']


def main():
    kine = sys.argv[1] if len(sys.argv) > 1 else r'C:\New folder\Hangrong\merge-game\assets\Kine\pixelforge-soi-auto-rig-CU2.kine'
    out = sys.argv[2] if len(sys.argv) > 2 else r'C:\New folder\Hangrong\merge-game\assets\kine'
    base = os.path.splitext(os.path.basename(kine))[0]

    z = zipfile.ZipFile(kine)
    pix = json.loads(z.read('pixelforge.json'))
    proj = json.loads(z.read('animforge.project.json'))
    arm = proj['state']['armature']
    all_anims = proj['state']['animation']['animations']
    cw = (pix.get('workspace') or {}).get('width') or 960
    ch = (pix.get('workspace') or {}).get('height') or 600

    # ---------- atlas sheet from the pixelforge parts ----------
    parts = pix['parts']
    images = []
    for p in parts:
        src = p.get('src', '')
        if src.startswith('data:image/png;base64,'):
            images.append((p['name'], Image.open(io.BytesIO(base64.b64decode(src.split(',', 1)[1]))).convert('RGBA')))
        else:
            images.append((p['name'], Image.open(io.BytesIO(z.read('assets/' + p['name'] + '.png'))).convert('RGBA')))
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
        regions.append({'path': name, 'x': x, 'y': y, 'width': im.width, 'height': im.height})
    sheet.save(os.path.join(out, base + '.png'))
    atlas = {'image': base + '.png', 'regions': regions}

    # ---------- bones / slots straight from the .kine's own export ----------
    bones = arm['bones']
    slots = []
    for s in arm['slots']:
        atts = s.get('attachments') or []
        if not atts:
            continue
        att = atts[0]
        # the .kine stores attachment path as 'folder/name.png' — the atlas
        # regions are keyed by the plain part name, so strip the folder part
        raw_path = att.get('path') or s.get('name') or ''
        att_path = raw_path.split('/')[-1]
        if att_path.endswith('.png'):
            att_path = att_path[:-4]
        slots.append({
            'name': s.get('name') or att_path,
            'bone': s.get('bone') or 'root',
            'attachments': [{
                'path': att_path,
                'size': att.get('size'),
                'x': att.get('x', 0),
                'y': att.get('y', 0),
                'rotation': att.get('rotation', 0),
                'scaleX': att.get('scaleX', 1),
                'scaleY': att.get('scaleY', 1),
            }],
            'displayIndex': 0,
        })

    # ---------- animations: keep the .kine's own keyframes (world absolute) ----------
    animations = {}
    names = []
    for cn in CLIPS:
        a = all_anims.get(cn)
        if not a:
            continue
        animations[cn] = {
            'length': a.get('length', 60),
            'fps': a.get('fps', 30),
            'keyframes': a.get('keyframes', {}),
        }
        names.append(cn)

    sk = {
        'canvasSize': {'width': cw, 'height': ch},
        'bones': bones,
        'slots': slots,
        'skins': [{
            'id': 'default', 'name': 'default',
            'attachments': {
                (s.get('name') or 'x'): {'path': att_path, 'width': 1, 'height': 1, 'x': 0, 'y': 0}
                for s in arm['slots'] for att in (s.get('attachments') or [])[:1]
            },
        }],
        'activeSkinId': 'default',
        'animations': animations,
        'names': names,
    }
    with open(os.path.join(out, base + '.skel.json'), 'w', encoding='utf-8') as f:
        json.dump(sk, f)
    with open(os.path.join(out, base + '.atlas.json'), 'w', encoding='utf-8') as f:
        json.dump(atlas, f)
    print('OK ->', base + '.skel.json / .atlas.json / .png')
    print('  bones', len(bones), 'slots', len(slots), 'anims', names)


main()
