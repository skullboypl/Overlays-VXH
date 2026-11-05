"""Ten layouts for the start, break and end screens (CSS only; the markup stays the same)."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:90])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


edit('SceneScreen.tsx', [
    ("    <div className={`sc-root sc-${kind} ${chatClass}`} style={style}>",
     "    <div className={`sc-root sc-${kind} ${chatClass} lay-${params.layout ?? 'center'}`} style={style}>"),
])

edit('registry.ts', [
    ("const sceneFields = (d: SceneDefaults, ending = false): Field[] => [\n",
     """// Thumbnail of a screen layout: blocks as [x, y, w, h, colour] in % of the frame.
const layoutThumb = (blocks: [number, number, number, number, string][]) =>
  blocks.map(([x, y, w, h, c]) => `linear-gradient(${c}, ${c}) ${w >= 100 ? 0 : +(x / (100 - w) * 100).toFixed(1)}% ${h >= 100 ? 0 : +(y / (100 - h) * 100).toFixed(1)}% / ${w}% ${h}% no-repeat`).join(', ') + ', #15151a';
const T = '#e8e8ee', K = '#ff5900', S = '#5b5b66', P = 'rgba(255, 255, 255, 0.16)';
const SCREEN_LAYOUTS: Record<string, { label: string; thumb: string }> = {
  center: { label: 'Środek', thumb: layoutThumb([[25, 32, 50, 10, T], [38, 50, 24, 9, K], [30, 88, 40, 5, S]]) },
  left: { label: 'Do lewej', thumb: layoutThumb([[8, 34, 40, 10, T], [8, 50, 20, 9, K], [30, 88, 40, 5, S]]) },
  right: { label: 'Do prawej', thumb: layoutThumb([[52, 34, 40, 10, T], [72, 50, 20, 9, K], [30, 88, 40, 5, S]]) },
  lower: { label: 'Pasek dolny', thumb: layoutThumb([[6, 58, 44, 10, T], [6, 72, 18, 8, K], [30, 90, 40, 5, S]]) },
  top: { label: 'Na górze', thumb: layoutThumb([[25, 10, 50, 10, T], [38, 26, 24, 9, K], [30, 88, 40, 5, S]]) },
  split: { label: 'Tytuł i licznik obok', thumb: layoutThumb([[8, 38, 44, 12, T], [60, 32, 30, 24, K], [30, 88, 40, 5, S]]) },
  card: { label: 'Karta', thumb: layoutThumb([[20, 20, 60, 58, P], [28, 32, 44, 10, T], [38, 50, 24, 9, K], [30, 88, 40, 5, S]]) },
  banner: { label: 'Baner przez ekran', thumb: layoutThumb([[0, 38, 100, 24, P], [6, 44, 46, 12, T], [68, 44, 24, 12, K], [30, 88, 40, 5, S]]) },
  timer: { label: 'Wielki licznik', thumb: layoutThumb([[34, 20, 32, 7, T], [22, 36, 56, 26, K], [30, 88, 40, 5, S]]) },
  corner: { label: 'Róg ekranu', thumb: layoutThumb([[56, 64, 38, 8, T], [74, 76, 20, 7, K], [30, 90, 40, 5, S]]) },
};

const sceneFields = (d: SceneDefaults, ending = false): Field[] => [
  // ---- layout ----
  { group: 'Układ', key: 'layout', label: 'Układ ekranu', type: 'select', default: 'center',
    options: Object.entries(SCREEN_LAYOUTS).map(([value, l]) => ({ value, label: l.label })),
    swatches: Object.fromEntries(Object.entries(SCREEN_LAYOUTS).map(([value, l]) => [value, l.thumb])) },
"""),
])

open(ROOT + 'scene.css', 'a', encoding='utf-8').write("""
/* ---------- screen layouts (lay-*) ---------- */
/* --lt scales the title for layouts with less room; --ts is the user's own size. */
.sc-title { font-size: calc(9.5em * var(--ts, 1) * var(--lt, 1)); }
.has-chat .sc-title { font-size: calc(7.5em * var(--ts, 1) * var(--lt, 1)); }
.lay-left, .lay-right, .lay-lower, .lay-split, .lay-banner { --lt: 0.66; }
.lay-card { --lt: 0.8; }
.lay-timer { --lt: 0.55; }
.lay-corner { --lt: 0.46; }

.lay-left .sc-inner { align-items: flex-start; }
.lay-left .sc-center { align-items: flex-start; text-align: left; max-width: 58%; }
.lay-right .sc-inner { align-items: flex-end; }
.lay-right .sc-center { align-items: flex-end; text-align: right; max-width: 58%; }

.lay-lower .sc-inner { align-items: flex-start; justify-content: flex-end; padding-bottom: 10em; }
.lay-lower .sc-center { align-items: flex-start; text-align: left; max-width: 58%; gap: 1em; }

.lay-top .sc-inner { justify-content: flex-start; padding-top: 7em; }

.lay-corner .sc-inner { align-items: flex-end; justify-content: flex-end; padding-bottom: 10em; }
.lay-corner .sc-center { align-items: flex-end; text-align: right; max-width: 46%; gap: 0.8em; }
.lay-corner .sc-timer strong { font-size: 4.2em; }
.lay-corner .sc-sub { font-size: 1.8em; }

/* The equalizer moves to the free side so it never sits under the texts. */
.lay-left .sc-bars, .lay-lower .sc-bars { left: auto; right: 6em; translate: none; }
.lay-right .sc-bars, .lay-corner .sc-bars { left: 6em; translate: none; }
.has-chat.chat-right.lay-left .sc-bars, .has-chat.chat-right.lay-lower .sc-bars { right: calc(var(--cw) * 1cqw + 6cqw); left: auto; }
.has-chat.chat-left.lay-right .sc-bars, .has-chat.chat-left.lay-corner .sc-bars { left: calc(var(--cw) * 1cqw + 6cqw); }

.lay-card .sc-center {
  padding: 3.5em 5.5em;
  border-radius: 2em;
  background: rgba(10, 10, 16, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(16px);
  box-shadow: 0 3em 8em rgba(0, 0, 0, 0.5);
}

/* Two columns: texts left, countdown right. Banner adds a band across the screen. */
.lay-split .sc-center, .lay-banner .sc-center {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 5em;
  row-gap: 1em;
  align-items: center;
  justify-items: start;
  text-align: left;
  width: 100%;
}
.lay-split .sc-center > *, .lay-banner .sc-center > * { grid-column: 1; }
.lay-split .sc-center > .sc-timer, .lay-banner .sc-center > .sc-timer { grid-column: 2; grid-row: 1 / span 5; margin: 0; }
.lay-split .sc-timer strong { font-size: 10em; }
.lay-banner .sc-inner { padding-left: 0; padding-right: 0; }
.lay-banner.has-chat.chat-right .sc-inner { padding-right: calc(var(--cw) * 1cqw + 6cqw); }
.lay-banner.has-chat.chat-left .sc-inner { padding-left: calc(var(--cw) * 1cqw + 6cqw); }
.lay-banner .sc-center {
  padding: 3em 7em;
  background: linear-gradient(90deg, rgba(8, 8, 14, 0.78), rgba(8, 8, 14, 0.5));
  border-top: 0.25em solid var(--c1);
  border-bottom: 0.25em solid var(--c1);
  backdrop-filter: blur(10px);
}
.lay-banner .sc-timer { align-items: flex-end; }

.lay-timer .sc-center { gap: 0.8em; }
.lay-timer .sc-timer strong { font-size: 15em; }
.lay-timer .sc-progress { width: 60em; }
""")
print('ok')
