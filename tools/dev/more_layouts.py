"""Six more Kamerka fullscreen layouts, extra camera slots and a corner choice for corner cams."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


edit('overlays/CamScene.tsx', [
    ("type Slot = 'cam' | 'screen' | 'chat';", "type Slot = 'cam' | 'cam2' | 'cam3' | 'cam4' | 'screen' | 'chat';"),
    ("export const camLayout = (layout: string, g: number, chat: boolean, camSize: number): Partial<Record<Slot, Rect>> => {",
     "export const camLayout = (layout: string, g: number, chat: boolean, camSize: number, corner = 'bl'): Partial<Record<Slot, Rect>> => {"),
    ("""    case 'screen-corner': {
      const camW = Math.round(520 * camSize);
      const camH = Math.round(camW * 9 / 16);
      return { screen: { x: 0, y: 0, w: W, h: H }, cam: { x: g, y: H - camH - g - 60, w: camW, h: camH } };
    }""", """    case 'screen-corner': {
      const camW = Math.round(520 * camSize);
      const camH = Math.round(camW * 9 / 16);
      return { screen: { x: 0, y: 0, w: W, h: H }, cam: cornerRect(corner, camW, camH, g, 70, 80) };
    }
    case 'duo': {
      const cols = chat ? W - 400 - 4 * g : W - 3 * g;
      const each = Math.round(cols / 2);
      const h = Math.min(fullH, Math.round(each * 9 / 16) + 120);
      const y = top + Math.round((fullH - h) / 2);
      return {
        cam: { x: g, y, w: each, h }, cam2: { x: 2 * g + each, y, w: each, h },
        ...(chat ? { chat: { x: W - 400 - g, y: top, w: 400, h: fullH } } : {}),
      };
    }
    case 'squad': {
      const cols = chat ? W - 400 - 4 * g : W - 3 * g;
      const each = Math.round(cols / 2);
      const h = Math.round((fullH - g) / 2);
      return {
        cam: { x: g, y: top, w: each, h }, cam2: { x: 2 * g + each, y: top, w: each, h },
        cam3: { x: g, y: top + h + g, w: each, h }, cam4: { x: 2 * g + each, y: top + h + g, w: each, h },
        ...(chat ? { chat: { x: W - 400 - g, y: top, w: 400, h: fullH } } : {}),
      };
    }
    case 'game-duo': {
      const side = Math.round(500 * camSize);
      const screenW = W - 3 * g - side;
      const camH = Math.round((fullH - g) / 2);
      return {
        screen: { x: g, y: top, w: screenW, h: Math.min(Math.round(screenW * 9 / 16), fullH) },
        cam: { x: 2 * g + screenW, y: top, w: side, h: camH },
        cam2: { x: 2 * g + screenW, y: top + camH + g, w: side, h: camH },
      };
    }
    case 'vertical': {
      const camH = fullH;
      const camW = Math.round(camH * 9 / 16 * camSize);
      const screenW = W - 3 * g - camW - (chat ? 380 + g : 0);
      return {
        cam: { x: g, y: top, w: camW, h: camH },
        screen: { x: 2 * g + camW, y: top, w: screenW, h: Math.min(Math.round(screenW * 9 / 16), fullH) },
        ...(chat ? { chat: { x: W - 380 - g, y: top, w: 380, h: fullH } } : {}),
      };
    }
    case 'theater': {
      const screenW = 1560;
      const screenH = Math.round(screenW * 9 / 16);
      const camW = Math.round(440 * camSize);
      const camH = Math.round(camW * 9 / 16);
      return { screen: { x: Math.round((W - screenW) / 2), y: Math.round((H - screenH) / 2), w: screenW, h: screenH }, cam: cornerRect(corner, camW, camH, g, 70, 80) };
    }
    case 'screen-top': {
      const stripH = Math.round(300 * camSize);
      const screenH = H - top - stripH - 2 * g - 20;
      const screenW = Math.round(screenH * 16 / 9);
      const camW = Math.round(stripH * 16 / 9);
      return {
        screen: { x: Math.round((W - screenW) / 2), y: top, w: screenW, h: screenH },
        cam: { x: g, y: H - stripH - g - 20, w: camW, h: stripH },
        ...(chat ? { chat: { x: camW + 2 * g, y: H - stripH - g - 20, w: W - camW - 3 * g, h: stripH } } : {}),
      };
    }"""),
    ("const mirrorRect = (r: Rect): Rect => ({ ...r, x: W - r.x - r.w });",
     """const mirrorRect = (r: Rect): Rect => ({ ...r, x: W - r.x - r.w });

/** A small camera pinned to one corner, clear of the title bar on top and the socials at the bottom. */
const cornerRect = (corner: string, w: number, h: number, g: number, topPad: number, bottomPad: number): Rect => ({
  x: corner.endsWith('r') ? W - w - g : g,
  y: corner.startsWith('t') ? topPad + g : H - h - g - bottomPad,
  w, h,
});"""),
    ("let slots = camLayout(String(params.layout ?? 'screen-cam'), g, Boolean(params.chat), Number(params.camSize ?? 1));",
     "let slots = camLayout(String(params.layout ?? 'screen-cam'), g, Boolean(params.chat), Number(params.camSize ?? 1), String(params.camCorner ?? 'bl'));"),
    ("const LABELS: Record<Slot, string> = { cam: tx('KAMERA'), screen: tx('GRA / EKRAN'), chat: tx('CZAT') };",
     "const LABELS: Record<Slot, string> = { cam: tx('KAMERA'), cam2: tx('KAMERA 2'), cam3: tx('KAMERA 3'), cam4: tx('KAMERA 4'), screen: tx('GRA / EKRAN'), chat: tx('CZAT') };"),
    ("{k === 'cam' && <div className=\"st-cam\" aria-hidden><span /></div>}", "{k.startsWith('cam') && <div className=\"st-cam\" aria-hidden><span /></div>}"),
])

# ---- registry: options, thumbs, conditions ----
p = ROOT + 'overlays/registry.ts'
s = open(p, encoding='utf-8').read()

def thumb(parts):
    return "'" + ', '.join(f'linear-gradient({c}, {c}) {x}% {y}% / {w}% {h}% no-repeat' for c, x, y, w, h in parts) + ", #15151a'"

CAM, SCR, CHT = '#ff5900', '#4f7cff', '#5b5b66'
NEW = {
    'duo': ('Duet: 2 kamerki', thumb([(CAM, 4, 50, 45, 60), (CAM, 96, 50, 45, 60)])),
    'squad': ('Ekipa: 4 kamerki', thumb([(CAM, 4, 18, 45, 40), (CAM, 96, 18, 45, 40), (CAM, 4, 86, 45, 40), (CAM, 96, 86, 45, 40)])),
    'game-duo': ('Gra + 2 kamerki', thumb([(SCR, 4, 25, 68, 62), (CAM, 96, 18, 25, 40), (CAM, 96, 86, 25, 40)])),
    'vertical': ('Pionowa kamerka + gra', thumb([(CAM, 4, 50, 22, 80), (SCR, 70, 25, 60, 55), (CHT, 96, 50, 14, 80)])),
    'theater': ('Kino: gra w centrum', thumb([(SCR, 50, 50, 82, 82), (CAM, 4, 92, 24, 24)])),
    'screen-top': ('Gra na górze, kamerka na dole', thumb([(SCR, 50, 12, 62, 64), (CAM, 4, 94, 28, 26), (CHT, 96, 94, 66, 26)])),
}
anchor = "        { value: 'screen-corner', label: 'Gra z kamerką w rogu' }, { value: 'split', label: 'Pół na pół' },\n      ] },"
assert anchor in s
s = s.replace(anchor, anchor[:-len("\n      ] },")] + "\n        " + ', '.join(f"{{ value: '{k}', label: '{v[0]}' }}" for k, v in NEW.items()) + ",\n      ] },", 1)
# thumbnails: insert into the swatches object of the layout field
sw_anchor = "'split': "
i = s.index(sw_anchor, s.index("id: 'camscene'"))
j = s.index(" }, options: [", i)
s = s[:j] + ', ' + ', '.join(f"'{k}': {v[1]}" for k, v in NEW.items()) + s[j:]
# conditions
s = s.replace("{ group: 'Układ', key: 'chat', label: 'Miejsce na czat', type: 'toggle', default: true, when: { key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center'] } },",
              "{ group: 'Układ', key: 'chat', label: 'Miejsce na czat', type: 'toggle', default: true, when: { key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center', 'duo', 'squad', 'vertical', 'screen-top'] } },\n"
              "      { group: 'Układ', key: 'camCorner', label: 'Róg kamerki', type: 'select', default: 'bl', when: { key: 'layout', is: ['screen-corner', 'theater'] }, options: [\n"
              "        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' },\n      ] },", 1)
s = s.replace("{ group: 'Układ', key: 'camSize', label: 'Wielkość kamerki', type: 'range', min: 0.6, max: 1.5, step: 0.05, default: 1, unit: '×', when: { key: 'layout', is: ['screen-cam', 'cam-screen', 'cam-center', 'screen-corner'] } },",
              "{ group: 'Układ', key: 'camSize', label: 'Wielkość kamerki', type: 'range', min: 0.6, max: 1.5, step: 0.05, default: 1, unit: '×', when: { key: 'layout', is: ['screen-cam', 'cam-screen', 'cam-center', 'screen-corner', 'game-duo', 'vertical', 'theater', 'screen-top'] } },", 1)
s = s.replace("{ group: 'Tło', key: 'bg', label: 'Wybierz tło', type: 'select', default: 'aurora', options: BG_OPTIONS, swatches: BG_SWATCHES, when: { key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center', 'split'] } },",
              "{ group: 'Tło', key: 'bg', label: 'Wybierz tło', type: 'select', default: 'aurora', options: BG_OPTIONS, swatches: BG_SWATCHES, when: { key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center', 'split', 'duo', 'squad', 'game-duo', 'vertical', 'theater', 'screen-top'] } },", 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
