"""Holiday options for the full-screen camera and the camera scenes, missing toggles, layout fixes."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


# ---- a holiday layer component shared by both scenes ----
open(ROOT + 'overlays/HolidayLayer.tsx', 'w', encoding='utf-8').write("""import type { Params } from './schema';
import { HolidayFrame } from './HolidayFrame';

/** Maps the "holiday*" settings of a scene onto a HolidayFrame drawn over the camera area. */
export const holidayParams = (p: Params): Params => ({
  _lang: p._lang,
  theme: p.holiday,
  variant: p.holidayVariant ?? 'real',
  showLabel: p.holidayLabelOn !== false,
  label: p.holidayLabel ?? 'auto',
  labelSize: Number(p.holidayLabelSize ?? 22),
  labelPos: p.holidayLabelPos ?? 'top',
  decorations: p.holidayDeco !== false,
  decoSize: Number(p.holidayDecoSize ?? 64),
  garland: p.holidayGarland !== false,
  particles: p.holidayParticles !== false,
  amount: Number(p.holidayAmount ?? 1.4),
  shine: true,
  depth: 1,
  showBorder: false,
  thickness: 6, radius: 18, glow: 0, speed: 0.6, inset: 30,
});

export const HolidayLayer = ({ params }: { params: Params }) =>
  params.holiday && params.holiday !== 'none' ? <div className="ov-fill hl-layer"><HolidayFrame params={holidayParams(params)} /></div> : null;
""")

edit('overlays/FullCam.tsx', [
    ("import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';", "import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';\nimport { HolidayLayer } from './HolidayLayer';"),
    ("      <ProFrame params={{ ...params, mask: false }}>", "      <HolidayLayer params={params} />\n      <ProFrame params={{ ...params, mask: false }}>"),
])
edit('overlays/CamScene.tsx', [
    ("import { isLang, translate, tx } from '../i18n';", "import { isLang, translate, tx } from '../i18n';\nimport { HolidayLayer } from './HolidayLayer';"),
    ("      <div className=\"sc-inner cs-inner\">", "      {params.holiday && params.holiday !== 'none' && (\n        <div className=\"cs-holiday\" style={pct(cam)}><HolidayLayer params={params} /></div>\n      )}\n\n      <div className=\"sc-inner cs-inner\">"),
    # screen-top: keep the bottom strip above the socials bar
    ("        cam: { x: g, y: H - stripH - g - 20, w: camW, h: stripH },\n        ...(chat ? { chat: { x: camW + 2 * g, y: H - stripH - g - 20, w: W - camW - 3 * g, h: stripH } } : {}),",
     "        cam: { x: g, y: H - stripH - g - 80, w: camW, h: stripH },\n        ...(chat ? { chat: { x: camW + 2 * g, y: H - stripH - g - 80, w: W - camW - 3 * g, h: stripH } } : {}),"),
    ("      const screenH = H - top - stripH - 2 * g - 20;", "      const screenH = H - top - stripH - 2 * g - 80;"),
])
open(ROOT + 'overlays/scene.css', 'a', encoding='utf-8').write("""
/* Holiday frame drawn over the camera slot of a scene. */
.cs-holiday { position: absolute; z-index: 2; pointer-events: none; }
.hl-layer { z-index: 2; }
""")

# ---- missing toggles on older frames ----
edit('overlays/frames.tsx', [
    ("      {['tl', 'tr', 'bl', 'br'].map((pos) => <span key={pos} className={`ov-corner ${pos}`} />)}",
     "      {params.showCorners !== false && ['tl', 'tr', 'bl', 'br'].map((pos) => <span key={pos} className={`ov-corner ${pos}`} />)}"),
    ("      <div className=\"ov-nametag-border\" />", "      {params.showBorder !== false && <div className=\"ov-nametag-border\" />}"),
])

# ---- registry ----
p = ROOT + 'overlays/registry.ts'
s = open(p, encoding='utf-8').read()

holiday = """
// Holiday layer for the camera scenes (HolidayLayer): same art as "Ramki świąteczne".
const holidayFields = (): Field[] => [
  { group: 'Święta', key: 'holiday', label: 'Świąteczna oprawa', type: 'select', default: 'none', options: [{ value: 'none', label: 'Brak' }, ...HOLIDAY_OPTIONS] },
  { group: 'Święta', key: 'holidayVariant', label: 'Wersja ramki', type: 'select', default: 'real', when: { key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) },
    optionFilter: (p) => (v) => v === 'anim' || Boolean(FRAME_URLS[`${p.holiday}-${v}`]), options: [
    { value: 'anim', label: 'Animowana' }, { value: 'real', label: 'Realistyczna' }, { value: '3d', label: '3D' },
    { value: 'cartoon', label: 'Kreskówka' }, { value: 'neon', label: 'Neon' },
  ] },
  { group: 'Święta', key: 'holidayLabelOn', label: 'Pokaż napis', type: 'toggle', default: true, when: { key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) } },
  { group: 'Święta', key: 'holidayLabel', label: 'Napis', type: 'text', default: 'auto', maxLength: 40, hint: '"auto" wstawia napis pasujący do okazji', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayLabelOn', is: [true] }] },
  { group: 'Święta', key: 'holidayLabelSize', label: 'Wielkość napisu', type: 'range', min: 12, max: 60, step: 1, default: 22, unit: 'px', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayLabelOn', is: [true] }] },
  { group: 'Święta', key: 'holidayLabelPos', label: 'Pozycja napisu', type: 'select', default: 'top', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayLabelOn', is: [true] }], options: [
    { value: 'bottom', label: 'Na dole' }, { value: 'top', label: 'Na górze' },
  ] },
  { group: 'Święta', key: 'holidayDeco', label: 'Dekoracje w rogach', type: 'toggle', default: true, when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayVariant', is: ['anim', '3d', 'cartoon'] }] },
  { group: 'Święta', key: 'holidayDecoSize', label: 'Wielkość dekoracji', type: 'range', min: 20, max: 140, step: 2, default: 64, unit: 'px', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayDeco', is: [true] }, { key: 'holidayVariant', is: ['anim', '3d', 'cartoon'] }] },
  { group: 'Święta', key: 'holidayGarland', label: 'Girlanda / lampki', type: 'toggle', default: true, when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayVariant', is: ['anim'] }] },
  { group: 'Święta', key: 'holidayParticles', label: 'Efekt (śnieg, serca...)', type: 'toggle', default: true, when: { key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) } },
  { group: 'Święta', key: 'holidayAmount', label: 'Ilość efektu', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1.4, unit: '×', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayParticles', is: [true] }] },
];
"""
s = s.replace("\ntype SceneDefaults = {", holiday + "\ntype SceneDefaults = {", 1)

# add to fullcam + camscene, right before their FACEIT group
for oid in ['fullcam', 'camscene']:
    i = s.index(f"id: '{oid}'")
    j = s.index("      { group: 'FACEIT', key: 'showFaceit'", i)
    s = s[:j] + "      ...holidayFields(),\n" + s[j:]

# nick hints where ELO is shown
s = s.replace("{ group: 'FACEIT', key: 'showFaceit', label: 'Pokaż staty FACEIT na kamerce', type: 'toggle', default: false },",
              "{ group: 'FACEIT', key: 'showFaceit', label: 'Pokaż staty FACEIT na kamerce', type: 'toggle', default: false, hint: 'Po włączeniu wpisz swój nick FACEIT poniżej' },")
s = s.replace("{ group: 'FACEIT', key: 'player', label: 'Nick albo player_id', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'showFaceit', is: [true] } },",
              "{ group: 'FACEIT', key: 'player', label: 'Nick FACEIT', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'showFaceit', is: [true] }, hint: 'Nick z faceit.com, player_id albo link z faceitbanner.vxh.pl' },")
s = s.replace("{ group: 'FACEIT', key: 'player', label: 'Nick albo player_id', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'source', is: ['api'] }, hint: 'Możesz też wkleić link z faceitbanner.vxh.pl, wyciągniemy z niego gracza' },",
              "{ group: 'FACEIT', key: 'player', label: 'Nick FACEIT', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'source', is: ['api'] }, hint: 'Nick z faceit.com, player_id albo link z faceitbanner.vxh.pl' },")

# toggles for the older frames
s = s.replace("      { group: 'Wygląd', key: 'color', label: 'Kolor ramki', type: 'color', default: '#ff5900' },",
              "      { group: 'Wygląd', key: 'showBorder', label: 'Pokaż ramkę', type: 'toggle', default: true },\n      { group: 'Wygląd', key: 'color', label: 'Kolor ramki', type: 'color', default: '#ff5900' },", 1)
i = s.index("id: 'corners'")
j = s.index("fields: [", i) + len("fields: [")
s = s[:j] + "\n      { key: 'showCorners', label: 'Pokaż narożniki', type: 'toggle', default: true }," + s[j:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
