SRC = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/'


def edit(name, pairs):
    p = SRC + name
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (name, a[:90])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


edit('registry.ts', [
    ("    { value: 'dashed', label: 'Przerywane' }, { value: 'glass', label: 'Szkło' },\n  ] },",
     "    { value: 'dashed', label: 'Przerywane' }, { value: 'glass', label: 'Szkło' }, { value: 'none', label: 'Brak' },\n  ] },"),
    ("  { group: 'Obramowanie', key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: d.colors },",
     "  { group: 'Obramowanie', key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: d.colors, when: { key: 'border', is: ['gradient', 'solid', 'double', 'dashed'] } },"),
    ("  { group: 'Obramowanie', key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 30, step: 1, default: 6, unit: 'px' },",
     "  { group: 'Obramowanie', key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 30, step: 1, default: 6, unit: 'px', when: { key: 'border', is: ['gradient', 'solid', 'double', 'dashed', 'glass'] } },"),
    ("      { group: 'Ramka', key: 'thickness', label: 'Grubość ramki',",
     "      { group: 'Ramka', key: 'showBorder', label: 'Pokaż ramkę', type: 'toggle', default: true, when: { key: 'variant', is: ['anim'] } },\n      { group: 'Ramka', key: 'thickness', label: 'Grubość ramki',"),
])
# holiday anim ring only when shown; dependent sliders hidden too
p = SRC + 'registry.ts'
s = open(p, encoding='utf-8').read()
for k in ['thickness', 'radius', 'glow', 'speed']:
    old = "key: '%s', label:" % k
    # only inside the holiday block: those lines carry when: { key: 'variant', is: ['anim'] }
s = s.replace("unit: 'px', when: { key: 'variant', is: ['anim'] } },\n      { key: 'radius'", "unit: 'px', when: [{ key: 'variant', is: ['anim'] }, { key: 'showBorder', is: [true] }] },\n      { key: 'radius'", 1)
open(p, 'w', encoding='utf-8').write(s)

edit('HolidayFrame.tsx', [
    ("      {(params.glow as number) > 0 && <div className=\"ov-neon-ring ov-neon-glow\" />}\n      <div className=\"ov-neon-ring\" />",
     "      {params.showBorder !== false && (params.glow as number) > 0 && <div className=\"ov-neon-ring ov-neon-glow\" />}\n      {params.showBorder !== false && <div className=\"ov-neon-ring\" />}"),
])
print('ok')
