ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


# Name caption sits inside the camera slot (lower third), so it never meets the socials bar.
edit('overlays/CamScene.tsx', [
    ("          <div className=\"cs-name\" style={pct({ x: cam.x, y: Math.min(H - 80, cam.y + cam.h + 10), w: Math.max(cam.w, 360), h: 70 })}>",
     "          <div className={`cs-name at-${params.namePos ?? 'bl'}`} style={pct(round ? { x: cam.x + (cam.w - Math.min(cam.w, cam.h)) / 2, y: cam.y, w: Math.min(cam.w, cam.h), h: cam.h } : cam)}>"),
])
p = ROOT + 'overlays/scene.css'
s = open(p, encoding='utf-8').read()
old_start = s.index('.cs-name {')
old_end = s.index('.cs-name small {')
old_end = s.index('}', old_end) + 1
s = s[:old_start] + """.cs-name {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  font-family: 'DM Sans', sans-serif;
}
.cs-name b, .cs-name small { display: block; }
.cs-name > * { position: relative; }
.cs-name::before { content: ''; }
.cs-name b, .cs-name small {
  width: fit-content;
  max-width: calc(100% - 4cqh);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-name { display: flex; flex-direction: column; justify-content: flex-end; padding: 2cqh; }
.cs-name.at-tl, .cs-name.at-tr { justify-content: flex-start; }
.cs-name.at-br, .cs-name.at-tr { align-items: flex-end; }
.cs-name b {
  font-family: var(--font);
  font-size: 3cqh;
  font-weight: 800;
  line-height: 1.1;
  padding: 0.6cqh 1.6cqh;
  background: rgba(10, 10, 14, 0.78);
  border-left: 0.5cqh solid var(--c1);
  border-radius: 0.6cqh 0.6cqh 0.6cqh 0;
}
.cs-name small {
  font-size: 1.8cqh;
  padding: 0.4cqh 1.6cqh;
  background: var(--c1);
  color: #fff;
  border-radius: 0 0 0.6cqh 0.6cqh;
}
""" + s[old_end:]
open(p, 'w', encoding='utf-8').write(s)

p = ROOT + 'overlays/registry.ts'
s = open(p, encoding='utf-8').read()
a = "      { group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: { key: 'showName', is: [true] } },"
assert a in s
s = s.replace(a, "      { group: 'Teksty', key: 'namePos', label: 'Róg podpisu na kamerce', type: 'select', default: 'bl', when: { key: 'showName', is: [true] }, options: [\n"
              "        { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' }, { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' },\n      ] },\n" + a, 1)
s = s.replace("{ group: 'Teksty', key: 'showName', label: 'Pokaż podpis pod kamerką', type: 'toggle', default: true },",
              "{ group: 'Teksty', key: 'showName', label: 'Pokaż podpis na kamerce', type: 'toggle', default: true },", 1)
# FACEIT stats on the camera may not share the caption's corner.
a = "      { group: 'FACEIT', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'tr', when: { key: 'showFaceit', is: [true] }, options: ["
assert a in s
s = s.replace(a, "      { group: 'FACEIT', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'tr', when: { key: 'showFaceit', is: [true] }, optionFilter: (p) => (v) => p.showName === false || v !== (p.namePos ?? 'bl'), options: [", 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
