import zipfile, json
z = zipfile.ZipFile(r'C:\New folder\Hangrong\merge-game\assets\Kine\pixelforge-nhan-vat-1-auto-rig.kine')
pix = json.loads(z.read('pixelforge.json'))
print('=== pixelforge.json ===')
print('bones (%d):' % len(pix['bones']))
for b in pix['bones'][:13]:
    print('  ', json.dumps(b))
print('parts (%d):' % len(pix['parts']))
for p in pix['parts']:
    keep = {k: p[k] for k in p if k in ('name', 'bone', 'x', 'y', 'w', 'h', 'pivotX', 'pivotY', 'pivot', 'anchor', 'flipX', 'flipY', 'zIndex', 'z', 'scaleX', 'scaleY')}
    print('  ', json.dumps(keep))
print('clip Idle keys frame 0 sample:')
c = pix['clips'].get('Idle', {})
f0 = c.get('keys', {}).get('0', {})
for k, v in list(f0.items())[:6]:
    print('   ', k, json.dumps(v)[:120])
