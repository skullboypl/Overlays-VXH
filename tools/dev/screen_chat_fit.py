"""Screens: the title shrinks to fit its column, and the chat slot gets seven places."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:90])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


edit('SceneScreen.tsx', [
    ("""const Title = ({ text, anim }: { text: string; anim: string }) => {
  const chars = Array.from(text);
  return (
    <h1 className={`sc-title anim-${anim}`} data-text={text}>""",
     """/** Big title that shrinks (never grows) to the width its layout gives it, so it cannot run into the timer or chat. */
const Title = ({ text, anim }: { text: string; anim: string }) => {
  const chars = Array.from(text);
  const ref = useRef<HTMLHeadingElement>(null);
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const current = parseFloat(getComputedStyle(el).getPropertyValue('--fit')) || 1;
      const natural = el.scrollWidth / current;
      const next = Math.min(1, el.clientWidth / Math.max(1, natural));
      setFit((f) => (Math.abs(f - next) > 0.01 ? next : f));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [text]);
  return (
    <h1 ref={ref} className={`sc-title anim-${anim}`} data-text={text} style={{ '--fit': fit } as Vars}>"""),
    ("""  const chatClass = chat ? `has-chat chat-${params.chatSide ?? 'right'} chat-${params.chatStyle ?? 'glass'}` : '';""",
     """  // chatSide: right / left (full height), right-top, right-bottom, left-top, left-bottom, or a strip at the bottom.
  const side = String(params.chatSide ?? 'right');
  const chatBase = side === 'bottom' ? 'bottom' : side.startsWith('left') ? 'left' : 'right';
  const chatV = side.endsWith('-top') ? 'v-top' : side.endsWith('-bottom') ? 'v-bottom' : 'v-full';
  const chatClass = chat ? `has-chat chat-${chatBase} chat-${chatV} chat-${params.chatStyle ?? 'glass'}` : '';"""),
])
s = open(ROOT + 'SceneScreen.tsx', encoding='utf-8').read()
first = s.split('\n', 1)[0]
if 'useLayoutEffect' not in first or 'useRef' not in first:
    import re
    m = re.match(r"import \{([^}]*)\} from 'react';", first)
    assert m, first
    names = {n.strip() for n in m.group(1).split(',') if n.strip()}
    names |= {'useLayoutEffect', 'useRef', 'useState'}
    typed = sorted(n for n in names if n.startswith('type '))
    plain = sorted(n for n in names if not n.startswith('type '))
    s = s.replace(first, "import { " + ', '.join(plain + typed) + " } from 'react';", 1)
    open(ROOT + 'SceneScreen.tsx', 'w', encoding='utf-8').write(s)

edit('registry.ts', [
    ("""  { group: 'Czat', key: 'chatSide', label: 'Strona', type: 'select', default: 'right', when: { key: 'chat', is: [true] }, options: [
    { value: 'left', label: 'Lewa' }, { value: 'right', label: 'Prawa' },
  ] },""",
     """  { group: 'Czat', key: 'chatSide', label: 'Miejsce czatu', type: 'select', default: 'right', when: { key: 'chat', is: [true] }, options: [
    { value: 'right', label: 'Prawa, cała wysokość' }, { value: 'left', label: 'Lewa, cała wysokość' },
    { value: 'right-top', label: 'Prawa, góra' }, { value: 'right-bottom', label: 'Prawa, dół' },
    { value: 'left-top', label: 'Lewa, góra' }, { value: 'left-bottom', label: 'Lewa, dół' },
    { value: 'bottom', label: 'Pas na dole' },
  ] },"""),
    ("""  { group: 'Czat', key: 'chatWidth', label: 'Szerokość', type: 'range', min: 18, max: 45, step: 1, default: 26, unit: '%', when: { key: 'chat', is: [true] } },""",
     """  { group: 'Czat', key: 'chatWidth', label: 'Szerokość', type: 'range', min: 18, max: 45, step: 1, default: 26, unit: '%', when: [{ key: 'chat', is: [true] }, { key: 'chatSide', is: ['right', 'left', 'right-top', 'right-bottom', 'left-top', 'left-bottom'] }] },"""),
])

open(ROOT + 'scene.css', 'a', encoding='utf-8').write("""
/* ---------- title fit + chat places ---------- */
.sc-title { font-size: calc(9.5em * var(--ts, 1) * var(--lt, 1) * var(--fit, 1)); max-width: 100%; }
.has-chat .sc-title { font-size: calc(7.5em * var(--ts, 1) * var(--lt, 1) * var(--fit, 1)); }
.lay-split .sc-center > .sc-title, .lay-banner .sc-center > .sc-title { width: 100%; }

.has-chat { --chat-t: 6cqh; --chat-h: 88cqh; }
.has-chat.chat-v-top { --chat-h: 46cqh; }
.has-chat.chat-v-bottom { --chat-t: 40cqh; --chat-h: 54cqh; }
.has-chat .sc-chat { top: var(--chat-t); bottom: auto; height: var(--chat-h); }
.chat-cutout .sc-layers { -webkit-mask-size: calc(var(--cw) * 1cqw) var(--chat-h), auto; mask-size: calc(var(--cw) * 1cqw) var(--chat-h), auto; }
.chat-cutout.chat-right .sc-layers { -webkit-mask-position: calc(97cqw - var(--cw) * 1cqw) var(--chat-t), 0 0; mask-position: calc(97cqw - var(--cw) * 1cqw) var(--chat-t), 0 0; }
.chat-cutout.chat-left .sc-layers { -webkit-mask-position: 3cqw var(--chat-t), 0 0; mask-position: 3cqw var(--chat-t), 0 0; }

/* Strip at the bottom: content sits above it, the equalizer moves to the top. */
.has-chat.chat-bottom { --chat-t: 62cqh; --chat-h: 24cqh; }
.chat-bottom .sc-chat { left: 3cqw; right: 3cqw; width: auto; }
.chat-cutout.chat-bottom .sc-layers { -webkit-mask-size: 94cqw var(--chat-h), auto; mask-size: 94cqw var(--chat-h), auto; -webkit-mask-position: 3cqw var(--chat-t), 0 0; mask-position: 3cqw var(--chat-t), 0 0; }
.sc-root.has-chat.chat-bottom .sc-inner { padding-top: 13cqh; padding-bottom: calc(100cqh - var(--chat-t) + 3cqh); justify-content: center; }
.sc-root.has-chat.chat-bottom.lay-top .sc-inner { justify-content: flex-start; }
.sc-root.has-chat.chat-bottom.lay-lower .sc-inner, .sc-root.has-chat.chat-bottom.lay-corner .sc-inner { justify-content: flex-end; }
.chat-bottom .sc-bars { bottom: auto; top: 4cqh; height: 6cqh; }
.chat-bottom .sc-chat-head { font-size: 1.8cqh; }
""")
print('ok')
