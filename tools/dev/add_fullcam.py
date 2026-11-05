ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


open(ROOT + 'overlays/scene.css', 'a', encoding='utf-8').write("""
/* ---------- Pełnoekranowa kamera (FullCam) ---------- */
.fc-root { background: transparent; }
.fc-preview-cam { position: absolute; inset: 0; }
.fc-root .sc-vignette { z-index: 1; }
.fc-topbar { left: calc(var(--inset, 24px) + 2cqh); top: calc(var(--inset, 24px) + 1.6cqh); }
.fc-name { position: absolute; inset: calc(var(--inset, 24px) + 1cqh); padding: 2cqh; }
.fc-socials { left: var(--inset, 24px); right: var(--inset, 24px); bottom: calc(var(--inset, 24px) + 2.4cqh); padding: 0 3cqh; }
.fc-socials.align-right { justify-content: flex-end; }
.fc-socials.align-left { justify-content: flex-start; }
.fc-socials.align-center { justify-content: center; }
""")
# The frame's inset/radius vars live on .pf; expose inset on the root for text placement.
edit('overlays/FullCam.tsx', [
    ("    '--font': SCENE_FONTS[String(params.font ?? 'poppins')] ?? SCENE_FONTS.dm,\n  };",
     "    '--font': SCENE_FONTS[String(params.font ?? 'poppins')] ?? SCENE_FONTS.dm,\n    '--inset': `${params.inset ?? 24}px`,\n  };"),
])

p = ROOT + 'overlays/registry.ts'
s = open(p, encoding='utf-8').read()
entry = """  {
    id: 'fullcam', name: 'Pełnoekranowa kamera', icon: '📹', category: 'camscene', size: FULL_HD,
    description: 'Kamera na cały ekran, a nad nią tylko warstwa: ramka, tytuł z zegarem, nick, sociale, staty FACEIT i efekty.',
    fields: [
      ...proFields({ colors: ['#ff5900', '#ff2d6f', '#7a5cff'] }).map((f) => (f.key === 'inset' ? { ...f, default: 24 } : f.key === 'thickness' ? { ...f, default: 8 } : f.key === 'radius' ? { ...f, default: 28 } : f)),
      { group: 'Teksty', key: 'showTitle', label: 'Pokaż tytuł', type: 'toggle', default: true },
      { group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: 'NA ŻYWO', maxLength: 50, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'live', label: 'Kropka LIVE', type: 'toggle', default: true, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'showClock', label: 'Pokaż zegar', type: 'toggle', default: true, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [
        { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' }, { value: 'dm', label: 'DM Sans' },
      ] },
      { group: 'Teksty', key: 'showName', label: 'Pokaż podpis na kamerce', type: 'toggle', default: true },
      { group: 'Teksty', key: 'name', label: 'Nick', type: 'text', default: 'skullboypl', maxLength: 40, when: { key: 'showName', is: [true] } },
      { group: 'Teksty', key: 'namePos', label: 'Róg podpisu na kamerce', type: 'select', default: 'bl', when: { key: 'showName', is: [true] }, options: [
        { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' }, { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' },
      ] },
      { group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: { key: 'showName', is: [true] } },
      { group: 'Teksty', key: 'sub', label: 'Podpis pod spodem', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 60, when: [{ key: 'showName', is: [true] }, { key: 'showSub', is: [true] }] },
      { group: 'Teksty', key: 'textColor', label: 'Kolor tekstu', type: 'color', default: '#ffffff' },
      { group: 'Sociale', key: 'showSocials', label: 'Pokaż sociale', type: 'toggle', default: true },
      { group: 'Sociale', when: { key: 'showSocials', is: [true] }, key: 'socials', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.gg/skullmedia', maxLength: 300 },
      { group: 'Sociale', key: 'socialsAlign', label: 'Wyrównanie', type: 'select', default: 'right', when: { key: 'showSocials', is: [true] }, optionFilter: (p) => (v) => p.showName === false || !(v === 'left' && (p.namePos ?? 'bl') === 'bl') && !(v === 'right' && p.namePos === 'br'), options: [
        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
      ] },
      { group: 'FACEIT', key: 'showFaceit', label: 'Pokaż staty FACEIT na kamerce', type: 'toggle', default: false },
      { group: 'FACEIT', key: 'player', label: 'Nick albo player_id', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'showFaceit', is: [true] } },
      { group: 'FACEIT', key: 'look', label: 'Wygląd', type: 'select', default: 'card', when: { key: 'showFaceit', is: [true] }, options: [
        { value: 'card', label: 'Karta' }, { value: 'pill', label: 'Pigułka' }, { value: 'bar', label: 'Pasek' },
        { value: 'minimal', label: 'Minimal' }, { value: 'neon', label: 'Neon' }, { value: 'hud', label: 'HUD' },
      ] },
      { group: 'FACEIT', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'tr', when: { key: 'showFaceit', is: [true] }, optionFilter: (p) => (v) => (p.showName === false || v !== (p.namePos ?? 'bl')) && (p.showTitle === false || v !== 'tl'), options: [
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' },
      ] },
      { group: 'FACEIT', key: 'statsScale', label: 'Wielkość', type: 'range', min: 0.6, max: 3, step: 0.05, default: 1.6, unit: '×', when: { key: 'showFaceit', is: [true] } },
      { group: 'Efekty', key: 'effect', label: 'Efekt nad kamerą', type: 'select', default: 'none', options: [
        { value: 'none', label: 'Brak' }, { value: 'snow', label: 'Śnieg' }, { value: 'stars', label: 'Gwiazdy' }, { value: 'fireflies', label: 'Świetliki' },
        { value: 'confetti', label: 'Konfetti' }, { value: 'petals', label: 'Płatki' }, { value: 'fireworks', label: 'Fajerwerki' },
      ] },
      { group: 'Efekty', key: 'vignette', label: 'Winieta przy krawędziach', type: 'toggle', default: false },
      { group: 'Efekty', key: 'vignetteStrength', label: 'Siła winiety', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.6, when: { key: 'vignette', is: [true] } },
    ],
  },
"""
a = "  {\n    id: 'camscene',"
assert a in s
s = s.replace(a, entry + a, 1)
open(p, 'w', encoding='utf-8').write(s)

edit('overlays/Overlay.tsx', [
    ("import { VideoScene } from './VideoScene';", "import { VideoScene } from './VideoScene';\nimport { FullCam } from './FullCam';"),
    ("    case 'videobg': return <VideoScene params={params} />;", "    case 'videobg': return <VideoScene params={params} />;\n    case 'fullcam': return <FullCam params={params} />;"),
])
print('ok')
