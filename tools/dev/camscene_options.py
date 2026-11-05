"""More Kamerka fullscreen options: title position, stream uptime, caption style, cam corners, screen frame,
slot shadows, moving background, socials alignment."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/'

# ---------------- registry ----------------
p = ROOT + 'registry.ts'
s = open(p, encoding='utf-8').read()
start = s.index("id: 'camscene'")
end = s.index("\n  },\n", start)
block = s[start:end]


def after_line(block, prefix, add):
    i = block.index(prefix)
    j = block.index('\n', i)
    # a field may span several lines; stop at the line that closes it
    while not block[i:j].rstrip().endswith('},') and not block[i:j].rstrip().endswith('] },'):
        j = block.index('\n', j + 1)
    return block[:j + 1] + add + block[j + 1:]


block = after_line(block, "      { group: 'Ramki slotów', key: 'frameChat',",
    "      { group: 'Ramki slotów', key: 'frameScreen', label: 'Ramka wokół ekranu gry', type: 'toggle', default: true, when: { key: 'border', is: ['gradient', 'solid', 'glow', 'glass'] } },\n"
    "      { group: 'Ramki slotów', key: 'camCorners', label: 'Narożniki na kamerce', type: 'toggle', default: false, hint: 'Akcenty w rogach kamerki w pierwszym kolorze' },\n"
    "      { group: 'Ramki slotów', key: 'slotShadow', label: 'Cień pod slotami', type: 'toggle', default: true },\n")
block = after_line(block, "      { group: 'Tło', key: 'vignette',",
    "      { group: 'Tło', key: 'bgMotion', label: 'Powolny ruch tła', type: 'toggle', default: false, hint: 'Delikatne przybliżanie i przesuwanie tła' },\n")
block = after_line(block, "      { group: 'Teksty', key: 'showClock',",
    "      { group: 'Teksty', key: 'showUptime', label: 'Pokaż czas streamu', type: 'toggle', default: false, when: { key: 'showTitle', is: [true] }, hint: 'Liczy od włączenia źródła w OBS' },\n"
    "      { group: 'Teksty', key: 'titlePos', label: 'Położenie tytułu', type: 'select', default: 'left', when: { key: 'showTitle', is: [true] }, options: [\n"
    "        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },\n"
    "      ] },\n")
block = after_line(block, "      { group: 'Teksty', key: 'namePos',",
    "      { group: 'Teksty', key: 'nameStyle', label: 'Styl podpisu', type: 'select', default: 'bar', when: { key: 'showName', is: [true] }, options: [\n"
    "        { value: 'bar', label: 'Belka' }, { value: 'pill', label: 'Pigułka' }, { value: 'tag', label: 'Etykieta w kolorze' }, { value: 'plain', label: 'Sam tekst' },\n"
    "      ] },\n")
block = after_line(block, "      { group: 'Sociale', when: { key: 'showSocials', is: [true] }, key: 'socials',",
    "      { group: 'Sociale', key: 'socialsAlign', label: 'Wyrównanie', type: 'select', default: 'center', when: { key: 'showSocials', is: [true] }, options: [\n"
    "        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },\n"
    "      ] },\n")
s = s[:start] + block + s[end:]
open(p, 'w', encoding='utf-8').write(s)

# ---------------- component ----------------
p = ROOT + 'CamScene.tsx'
s = open(p, encoding='utf-8').read()
pairs = [
    ("""const Clock = () => {""",
     """/** Time since the source was loaded (OBS loads it when the scene goes live). */
const Uptime = () => {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const t = Math.floor((now - start) / 1000);
  const hh = Math.floor(t / 3600), mm = Math.floor((t % 3600) / 60), ss = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return <span className="cs-clock cs-uptime">{hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`}</span>;
};

const Clock = () => {"""),
    ("""    <div className={`sc-root cs-root ov-neon ${params.anim === 'spin' ? 'is-spinning' : ''}`} style={style}>""",
     """    <div className={`sc-root cs-root ov-neon ${params.anim === 'spin' ? 'is-spinning' : ''} ${params.bgMotion ? 'bg-motion' : ''}`} style={style}>"""),
    # shadows under the slots, drawn outside each hole only
    ("""      {border !== 'none' && (Object.entries(slots) as [Slot, Rect][]).filter(([k]) => !(fullScreen && k === 'screen')).filter(([k]) => k !== 'chat' || params.frameChat !== false).map(([k, r]) => (""",
     """      {params.slotShadow !== false && (Object.entries(slots) as [Slot, Rect][]).filter(([k]) => !(fullScreen && k === 'screen')).map(([k, r]) => (
        <div key={`sh-${k}`} className={`cs-shadow ${round && k === 'cam' ? 'is-round' : ''}`} style={pct(round && k === 'cam' ? { x: r.x + (r.w - Math.min(r.w, r.h)) / 2, y: r.y + (r.h - Math.min(r.w, r.h)) / 2, w: Math.min(r.w, r.h), h: Math.min(r.w, r.h) } : r)} />
      ))}

      {border !== 'none' && (Object.entries(slots) as [Slot, Rect][]).filter(([k]) => !(fullScreen && k === 'screen')).filter(([k]) => k !== 'chat' || params.frameChat !== false).filter(([k]) => k !== 'screen' || params.frameScreen !== false).map(([k, r]) => ("""),
    ("""      {params.holiday && params.holiday !== 'none' && (""",
     """      {params.camCorners && !round && (
        <div className="cs-corners" style={pct(cam)}>{['tl', 'tr', 'bl', 'br'].map((c) => <span key={c} className={c} />)}</div>
      )}

      {params.holiday && params.holiday !== 'none' && ("""),
    ("""          <div className="cs-topbar">""", """          <div className={`cs-topbar at-${params.titlePos ?? 'left'}`}>"""),
    ("""            {params.showClock && <Clock />}
          </div>""", """            {params.showClock && <Clock />}
            {params.showUptime && <Uptime />}
          </div>"""),
    ("""          <div className={`cs-name at-${params.namePos ?? 'bl'}`}""", """          <div className={`cs-name at-${params.namePos ?? 'bl'} name-${params.nameStyle ?? 'bar'}`}"""),
    ("""          <div className="sc-socials cs-socials">""", """          <div className={`sc-socials cs-socials align-${params.socialsAlign ?? 'center'}`}>"""),
]
for a, b in pairs:
    assert a in s, a[:90]
    s = s.replace(a, b, 1)
open(p, 'w', encoding='utf-8').write(s)

open(ROOT + 'scene.css', 'a', encoding='utf-8').write("""
/* ---------- Kamerka fullscreen: extra options ---------- */
.cs-topbar.at-center { left: 50%; transform: translateX(-50%); }
.cs-topbar.at-right { left: auto; right: 2.2cqh; }
.cs-uptime { font-variant-numeric: tabular-nums; }
.cs-shadow { position: absolute; border-radius: var(--radius); box-shadow: 0 1.4cqh 4cqh rgba(0, 0, 0, 0.55); pointer-events: none; z-index: 1; }
.cs-shadow.is-round { border-radius: 50%; }
.cs-corners { position: absolute; z-index: 3; pointer-events: none; }
.cs-corners span { position: absolute; width: 4cqh; height: 4cqh; border: 0.55cqh solid var(--c1); filter: drop-shadow(0 0 0.8cqh var(--c1)); }
.cs-corners .tl { left: -1.2cqh; top: -1.2cqh; border-right: 0; border-bottom: 0; border-top-left-radius: 1cqh; }
.cs-corners .tr { right: -1.2cqh; top: -1.2cqh; border-left: 0; border-bottom: 0; border-top-right-radius: 1cqh; }
.cs-corners .bl { left: -1.2cqh; bottom: -1.2cqh; border-right: 0; border-top: 0; border-bottom-left-radius: 1cqh; }
.cs-corners .br { right: -1.2cqh; bottom: -1.2cqh; border-left: 0; border-top: 0; border-bottom-right-radius: 1cqh; }
.cs-name.name-pill b { border-left: 0; border-radius: 999px; padding: 0.6cqh 2cqh; }
.cs-name.name-pill small { border-radius: 999px; margin-top: 0.5cqh; }
.cs-name.name-tag b { background: var(--c1); border-left: 0; border-radius: 0.6cqh; }
.cs-name.name-tag small { background: rgba(10, 10, 14, 0.78); border-radius: 0 0 0.6cqh 0.6cqh; }
.cs-name.name-plain b, .cs-name.name-plain small { background: none; border: 0; padding-left: 0; padding-right: 0; text-shadow: 0 0.3cqh 1cqh rgba(0, 0, 0, 0.9); }
.cs-name.name-plain small { color: var(--c1); }
.cs-socials.align-left { justify-content: flex-start; }
.cs-socials.align-right { justify-content: flex-end; }
.cs-root.bg-motion .sc-layers > :first-child { animation: cs-drift 40s ease-in-out infinite alternate; transform-origin: 40% 50%; }
@keyframes cs-drift { from { transform: scale(1.04) translate(0, 0); } to { transform: scale(1.12) translate(-2%, -1.5%); } }
""")
print('ok')
