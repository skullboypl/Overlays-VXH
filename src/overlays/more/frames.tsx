// Add-on webcam frames (proposals 21-40). The camera goes under the transparent window in the middle.
import { useEffect, useState } from 'react';
import type { Field, OverlayDef, Params } from '../schema';
import { isLang, translate } from '../../i18n';
import { fontOf, num, rangeF, str, useNow, type Renderer, type Vars } from './common';

const CAM = { w: 640, h: 360 };
const langOf = (p: Params) => (isLang(p._lang) ? p._lang : 'pl');
const pad = (v: number) => String(v).padStart(2, '0');
const base = (p: Params, extra: Vars = {}): Vars => ({
  '--inset': `${num(p.inset, 10)}px`,
  '--accent': str(p.accent, '#ff5900'),
  '--fg': str(p.textColor, '#ffffff'),
  '--font': fontOf(p, 'poppins'),
  ...extra,
});
const Root = ({ kind, p, style, className = '', children }: { kind: string; p: Params; style?: Vars; className?: string; children: React.ReactNode }) => (
  <div className={`ov-fill mf-root mf-${kind} ${className}`} style={{ ...base(p), ...style }}>{children}</div>
);
const useClockText = () => {
  const now = useNow(1000);
  const d = new Date(now);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const useElapsed = () => {
  const now = useNow(1000);
  const [start] = useState(() => Date.now());
  const s = Math.floor((now - start) / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/* ---------------- 21 / 22 shape window + marching ants ---------------- */
const SHAPES: Record<string, string> = {
  heart: 'M50 88 C20 66 4 50 4 32 C4 17 15 7 28 7 C38 7 45 13 50 21 C55 13 62 7 72 7 C85 7 96 17 96 32 C96 50 80 66 50 88 Z',
  hexagon: 'M27 5 L73 5 L96 50 L73 95 L27 95 L4 50 Z',
  star: 'M50 3 L62 36 L97 37 L69 58 L79 93 L50 72 L21 93 L31 58 L3 37 L38 36 Z',
  diamond: 'M50 3 L97 50 L50 97 L3 50 Z',
  circle: 'M50 4 A46 46 0 1 1 49.9 4 Z',
  blob: 'M52 5 C72 4 92 18 95 40 C98 63 86 88 60 94 C36 99 10 86 5 62 C0 38 14 14 34 8 C40 6 46 5 52 5 Z',
  shield: 'M50 4 L92 16 C92 56 76 82 50 96 C24 82 8 56 8 16 Z',
};
const ShapeFrame: Renderer = ({ params: p }) => {
  const shape = str(p.shape, 'heart');
  const isRect = shape === 'rect';
  const w = num(p.border, 3);
  return (
    <Root kind="shape" p={p} className={`${p.ants ? 'has-ants' : ''} ${p.pulse ? 'has-pulse' : ''}`} style={{ '--bg': str(p.bg, '#111114'), '--line': str(p.lineColor, '#ffffff'), '--speed': `${2 / num(p.speed, 1)}s` }}>
      {isRect ? (
        <div className="mf-shape-rect" style={{ borderRadius: `${num(p.radius, 24)}px`, '--bw': `${w}px` } as Vars} />
      ) : (
        <svg className="mf-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
          {p.fillOutside !== false && <path d={`M-2000 -2000 H2100 V2100 H-2000 Z ${SHAPES[shape] ?? SHAPES.heart}`} fillRule="evenodd" fill="var(--bg)" />}
          <path d={SHAPES[shape] ?? SHAPES.heart} fill="none" stroke="var(--accent)" strokeWidth={w * 0.6} vectorEffect="non-scaling-stroke" className="mf-shape-line" />
          {p.ants && <path d={SHAPES[shape] ?? SHAPES.heart} fill="none" stroke="var(--line)" strokeWidth={w * 0.6} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" className="mf-ants" />}
        </svg>
      )}
    </Root>
  );
};

/* ---------------- 23 film strip ---------------- */
const FilmFrame: Renderer = ({ params: p }) => {
  const tc = useElapsed();
  return (
    <Root kind="film" p={p} className={p.roll !== false ? 'is-rolling' : ''} style={{ '--film': str(p.film, '#141414'), '--hole': str(p.hole, '#f4efe3') }}>
      <div className="mf-film-strip t"><i /></div>
      <div className="mf-film-strip b"><i /></div>
      <div className="mf-film-win" />
      {p.showLabel !== false && <span className="mf-film-label">{str(p.label)} {p.timecode !== false && <b>{tc}</b>}</span>}
    </Root>
  );
};

/* ---------------- 24 postcard ---------------- */
const PostcardFrame: Renderer = ({ params: p }) => (
  <Root kind="post" p={p} style={{ '--paper': str(p.paper, '#f7f1e3'), '--ink': str(p.ink, '#24305e'), '--tilt': `${num(p.tilt, -1.5)}deg` }}>
    <div className="mf-post-card">
      <div className="mf-post-win" />
      {p.caption && <div className="mf-post-caption">{str(p.caption)}</div>}
      <div className="mf-post-stamp"><span>{str(p.stamp, '🎮')}</span><small>{str(p.stampText)}</small></div>
      {p.postmark !== false && <div className="mf-post-mark"><span>{str(p.city)}</span></div>}
    </div>
  </Root>
);

/* ---------------- 25 terminal ---------------- */
const Typing = ({ text, speed }: { text: string; speed: number }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => (v > text.length + 20 ? 0 : v + 1)), 1000 / Math.max(1, speed));
    return () => window.clearInterval(id);
  }, [text, speed]);
  return <>{text.slice(0, n)}</>;
};
const TermFrame: Renderer = ({ params: p }) => (
  <Root kind="term" p={p} className={`theme-${p.theme ?? 'green'} ${p.scan !== false ? 'has-scan' : ''}`} style={{ '--font': fontOf(p, 'dm') }}>
    <div className="mf-term-win">
      <div className="mf-term-bar"><i /><i /><i /><span>{str(p.title)}</span></div>
      <div className="mf-term-view" />
      {p.showPrompt !== false && (
        <div className="mf-term-line"><b>{str(p.user)}@stream:~$</b> <Typing text={str(p.command)} speed={num(p.typeSpeed, 12)} /><u /></div>
      )}
    </div>
  </Root>
);

/* ---------------- 26 retro OS window ---------------- */
const WinFrame: Renderer = ({ params: p }) => (
  <Root kind="win" p={p} className={`look-${p.look ?? 'gray'}`} style={{ '--title1': str(p.titleColor, '#0a246a'), '--title2': str(p.titleColor2, '#3a6ea5') }}>
    <div className="mf-win-box">
      <div className="mf-win-title"><span>{str(p.icon, '📷')} {str(p.title)}</span><i>_</i><i>□</i><i>×</i></div>
      <div className="mf-win-view" />
      {p.status !== false && <div className="mf-win-status"><span>{str(p.statusText)}</span><span>{useClockText()}</span></div>}
    </div>
  </Root>
);

/* ---------------- 27 wanted poster ---------------- */
const WantedFrame: Renderer = ({ params: p }) => (
  <Root kind="wanted" p={p} style={{ '--paper': str(p.paper, '#e9d3a5'), '--ink': str(p.ink, '#3b2312') }}>
    <div className="mf-wanted-card">
      <b className="mf-wanted-top">{str(p.top)}</b>
      <div className="mf-wanted-win" />
      <b className="mf-wanted-name">{str(p.name)}</b>
      {p.reward && <span className="mf-wanted-reward">{str(p.reward)}</span>}
    </div>
  </Root>
);

/* ---------------- 28 anime speed lines ---------------- */
const SpeedFrame: Renderer = ({ params: p }) => {
  const count = Math.round(num(p.count, 70));
  const [seed, setSeed] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setSeed((s) => s + 1), 1000 / Math.max(1, num(p.fps, 8))); return () => window.clearInterval(id); }, [p.fps]);
  const rays = Array.from({ length: count }, (_, i) => {
    const r = Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1;
    return { a: (i / count) * 360 + r * 4, len: 18 + r * 22, w: 0.25 + r * 0.9 };
  });
  return (
    <Root kind="speed" p={p} style={{ '--line': str(p.lineColor, '#ffffff'), '--hole': `${num(p.hole, 62)}%` }}>
      <svg className="mf-speed-svg" viewBox="-100 -100 200 200" preserveAspectRatio="none" aria-hidden>
        {rays.map((r, i) => <polygon key={i} points={`0,-${150} ${r.w * 4},-${150 - r.len * 3} -${r.w * 4},-${150 - r.len * 3}`} transform={`rotate(${r.a})`} fill="var(--line)" />)}
      </svg>
      {p.text && <b className="mf-speed-text">{str(p.text)}</b>}
    </Root>
  );
};

/* ---------------- 29 neon sign ---------------- */
const NeonSignFrame: Renderer = ({ params: p }) => (
  <Root kind="neon" p={p} className={p.flicker !== false ? 'has-flicker' : ''} style={{ '--n1': str(p.accent, '#ff2d95'), '--n2': str(p.accent2, '#00e5ff'), '--font': fontOf(p, 'pacifico') }}>
    <div className="mf-neon-tube" />
    {p.text && <div className={`mf-neon-sign pos-${p.signPos ?? 'top'}`}>{str(p.text)}</div>}
  </Root>
);

/* ---------------- 30 frame with a live follower badge ---------------- */
const StatFrame: Renderer = ({ params: p }) => {
  const [count, setCount] = useState<number | null>(null);
  const platform = str(p.platform, 'kick'), channel = str(p.channel).trim();
  useEffect(() => {
    if (!channel) return undefined;
    let alive = true;
    const load = () => fetch(`/api/followers?platform=${platform}&channel=${encodeURIComponent(channel)}`).then((r) => r.json()).then((b) => { if (alive && typeof b.count === 'number') setCount(b.count); }).catch(() => {});
    load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [platform, channel]);
  return (
    <Root kind="stat" p={p} style={{ '--bg': str(p.bg, '#111114'), '--radius': `${num(p.radius, 18)}px` }}>
      <div className="mf-stat-win" />
      <div className={`mf-stat-badge pos-${p.badgePos ?? 'br'}`}>
        <span aria-hidden>❤</span><b>{count === null ? str(p.fallback, '—') : count.toLocaleString(langOf(p))}</b><small>{str(p.label)}</small>
      </div>
      {p.name && <div className="mf-stat-name">{str(p.name)}</div>}
    </Root>
  );
};

/* ---------------- 33 aquarium ---------------- */
const AquaFrame: Renderer = ({ params: p }) => {
  const n = Math.round(num(p.bubbles, 18));
  return (
    <Root kind="aqua" p={p} style={{ '--water': str(p.water, '#18a6d9'), '--weed': str(p.weed, '#22a35a') }}>
      <div className="mf-aqua-glass" />
      <div className="mf-aqua-bubbles">{Array.from({ length: n }, (_, i) => <i key={i} style={{ '--i': i, left: `${(i * 37) % 100}%`, animationDelay: `${-((i * 1.7) % 6)}s`, animationDuration: `${4 + ((i * 7) % 5)}s` } as Vars} />)}</div>
      {p.weedOn !== false && <><span className="mf-aqua-weed l" /><span className="mf-aqua-weed r" /></>}
      {p.fish !== false && <span className="mf-aqua-fish">🐠</span>}
    </Root>
  );
};

/* ---------------- 34 3D box ---------------- */
const BoxFrame: Renderer = ({ params: p }) => (
  <Root kind="box" p={p} className={p.spin ? 'has-spin' : ''} style={{ '--depth': `${num(p.depth, 18)}px`, '--c1': str(p.accent, '#ff5900'), '--c2': str(p.accent2, '#7a5cff') }}>
    <div className="mf-box-face" />
  </Root>
);

/* ---------------- 35 handheld console ---------------- */
const ConsoleFrame: Renderer = ({ params: p }) => (
  <Root kind="console" p={p} className={`look-${p.look ?? 'wide'}`} style={{ '--body': str(p.body, '#7a5cff'), '--btn': str(p.buttons, '#ff2d95') }}>
    <div className="mf-con-body">
      <div className="mf-con-pad" aria-hidden><i /><i /></div>
      <div className="mf-con-screen"><div className="mf-con-win" /><small>{str(p.brand)}</small></div>
      <div className="mf-con-btns" aria-hidden><i>B</i><i>A</i></div>
    </div>
  </Root>
);

/* ---------------- 36 EKG ---------------- */
const EkgFrame: Renderer = ({ params: p }) => {
  const [bpm, setBpm] = useState(num(p.bpm, 82));
  useEffect(() => {
    if (p.wander === false) { setBpm(num(p.bpm, 82)); return undefined; }
    const id = window.setInterval(() => setBpm(num(p.bpm, 82) + Math.round((Math.random() - 0.5) * 8)), 2000);
    return () => window.clearInterval(id);
  }, [p.bpm, p.wander]);
  const path = 'M0 50 L18 50 L22 44 L26 50 L32 50 L35 58 L39 12 L43 70 L47 50 L60 50 L66 40 L72 50 L100 50';
  return (
    <Root kind="ekg" p={p} style={{ '--beat': `${60 / Math.max(30, bpm)}s`, '--line': str(p.accent, '#22e07a') }}>
      <div className="mf-ekg-border" />
      <div className="mf-ekg-strip">
        <svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden>
          <path d={[0, 100, 200, 300].map((x) => path.replace(/(\d+(?:\.\d+)?) (\d+)/g, (_, a, b) => `${Number(a) + x} ${b}`)).join(' ')} />
        </svg>
      </div>
      <div className="mf-ekg-bpm"><span>♥</span><b>{bpm}</b><small>BPM</small></div>
    </Root>
  );
};

/* ---------------- 37 emoji sticker frame ---------------- */
const StickerFrame: Renderer = ({ params: p }) => {
  const set = Array.from(str(p.stickers, '⭐💖🎮🔥✨😎🍕👾').replace(/\s/g, '')).filter((ch) => !/[‍️]/.test(ch));
  const n = Math.round(num(p.count, 14));
  const spots = Array.from({ length: n }, (_, i) => {
    const t = i / n;
    // Walk around the border: top, right, bottom, left.
    const side = Math.floor(t * 4), f = (t * 4) % 1;
    const [x, y] = side === 0 ? [f * 100, 0] : side === 1 ? [100, f * 100] : side === 2 ? [100 - f * 100, 100] : [0, 100 - f * 100];
    return { x, y, ch: set[i % Math.max(1, set.length)] ?? '⭐', r: ((i * 47) % 40) - 20 };
  });
  return (
    <Root kind="stickers" p={p} style={{ '--sz': num(p.size, 1), '--line': str(p.lineColor, '#ffffff') }}>
      {p.outline !== false && <div className="mf-sticker-line" />}
      {spots.map((s, i) => <span key={i} className="mf-sticker" style={{ left: `calc(var(--inset) + (100% - 2 * var(--inset)) * ${s.x / 100})`, top: `calc(var(--inset) + (100% - 2 * var(--inset)) * ${s.y / 100})`, '--r': `${s.r}deg`, '--i': i } as Vars}>{s.ch}</span>)}
    </Root>
  );
};

/* ---------------- 38 aviation HUD ---------------- */
const AviaFrame: Renderer = ({ params: p }) => {
  const now = useNow(100);
  const t = now / 1000;
  const roll = Math.sin(t * 0.4) * 6, pitch = Math.sin(t * 0.27) * 6;
  const heading = Math.round(((t * 3) % 360 + 360) % 360);
  const alt = Math.round(num(p.alt, 12000) + Math.sin(t * 0.2) * 120);
  const spd = Math.round(num(p.speedKt, 280) + Math.sin(t * 0.33) * 6);
  return (
    <Root kind="avia" p={p} style={{ '--hud': str(p.accent, '#3cff8f') }}>
      <div className="mf-avia-ladder" style={{ transform: `translate(-50%, calc(-50% + ${pitch}cqh)) rotate(${roll}deg)` }}>
        {[-20, -10, 10, 20].map((d) => <div key={d} className="mf-avia-rung" style={{ top: `${50 - d * 1.8}%` }}><span>{d}</span><i /><span>{d}</span></div>)}
      </div>
      <div className="mf-avia-cross" />
      <div className="mf-avia-tape l"><b>{spd}</b><small>KT</small></div>
      <div className="mf-avia-tape r"><b>{alt.toLocaleString('en')}</b><small>FT</small></div>
      <div className="mf-avia-heading"><b>{String(heading).padStart(3, '0')}°</b></div>
      {p.callsign && <div className="mf-avia-call">{str(p.callsign)}</div>}
    </Root>
  );
};

/* ---------------- 40 art frames (watercolor, paper cut, chalk) ---------------- */
const ArtFrame: Renderer = ({ params: p }) => {
  const style = str(p.style, 'watercolor');
  const colors = Array.isArray(p.colors) && p.colors.length ? (p.colors as string[]) : ['#ff8fab', '#7ad7f0', '#ffd166', '#b8f2a0'];
  return (
    <Root kind="art" p={p} className={`style-${style}`} style={{ '--c1': colors[0], '--c2': colors[1 % colors.length], '--c3': colors[2 % colors.length], '--c4': colors[3 % colors.length] }}>
      <div className="mf-art-a" /><div className="mf-art-b" /><div className="mf-art-win" />
      {p.caption && <div className="mf-art-caption">{str(p.caption)}</div>}
    </Root>
  );
};

/* ---------------- 31 / 32 more holidays and seasons ---------------- */
const SEASONS: Record<string, { emoji: string; c1: string; c2: string; label: string }> = {
  mikolajki: { emoji: '🎅🎁🍬⭐🦌', c1: '#d62839', c2: '#ffffff', label: 'Wesołych Mikołajek!' },
  kids: { emoji: '🎈🧸🍭🪁🎨', c1: '#3bceac', c2: '#ffd23f', label: 'Dzień Dziecka' },
  women: { emoji: '🌷💐🌸💜🌹', c1: '#ff5d8f', c2: '#ffd6e0', label: 'Dzień Kobiet' },
  blackfriday: { emoji: '🛒💸🏷️🔥💥', c1: '#111111', c2: '#ffcc00', label: 'BLACK FRIDAY' },
  lunar: { emoji: '🏮🧧🐉🎆🍊', c1: '#c1121f', c2: '#ffd166', label: 'Szczęśliwego Nowego Roku' },
  autumn: { emoji: '🍁🍂🎃🍄🌰', c1: '#d9631e', c2: '#f4a259', label: 'Jesień' },
  spring: { emoji: '🌼🐝🌱🌸🦋', c1: '#7bc950', c2: '#fff275', label: 'Wiosna' },
  summer: { emoji: '☀️🏖️🍉🌴🕶️', c1: '#00b4d8', c2: '#ffd60a', label: 'Wakacje' },
};
const SeasonFrame: Renderer = ({ params: p }) => {
  const th = SEASONS[str(p.theme, 'mikolajki')] ?? SEASONS.mikolajki;
  const em = Array.from(th.emoji).filter((ch) => !/[‍️]/.test(ch));
  const label = p.showLabel === false ? '' : str(p.label) === 'auto' || !p.label ? translate(langOf(p), th.label) : str(p.label);
  return (
    <Root kind="season" p={p} style={{ '--c1': th.c1, '--c2': th.c2 }}>
      <div className="mf-season-border" />
      {em.map((ch, i) => <span key={`a${i}`} className="mf-season-deco t" style={{ left: `${8 + i * 21}%`, '--i': i } as Vars}>{ch}</span>)}
      {em.map((ch, i) => <span key={`b${i}`} className="mf-season-deco b" style={{ left: `${4 + i * 22}%`, '--i': i + 3 } as Vars}>{em[(i + 2) % em.length] ?? ch}</span>)}
      {label && <div className="mf-season-label">{label}</div>}
      {p.fall !== false && <div className="mf-season-fall">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: `${(i * 31) % 100}%`, animationDelay: `${-i * 0.9}s`, animationDuration: `${7 + (i % 4)}s` }}>{em[i % em.length]}</i>)}</div>}
    </Root>
  );
};

// ---------------- definitions ----------------
const inset = (d = 10): Field => rangeF('inset', 'Margines', 0, 60, 1, d, 'px', 'Wygląd');
const color = (key: string, label: string, def: string, group = 'Kolory'): Field => ({ group, key, label, type: 'color', default: def });
const text = (key: string, label: string, def: string, maxLength = 30, group = 'Napisy', i18n = false): Field => ({ group, key, label, type: 'text', default: def, maxLength, ...(i18n ? { i18n: true } : {}) });
const toggle = (key: string, label: string, def: boolean, group = 'Wygląd'): Field => ({ group, key, label, type: 'toggle', default: def });
const F = (id: string, name: string, icon: string, description: string, fields: Field[]): OverlayDef => ({ id, name, icon, category: 'camera', size: CAM, description, fields });

export const FRAME_DEFS: OverlayDef[] = [
  F('shapeframe', 'Kamerka w kształcie', '💗', 'Okno kamerki w kształcie serca, sześciokąta, gwiazdy, rombu, koła albo tarczy; opcjonalnie z „maszerującymi mrówkami”.', [
    { group: 'Kształt', key: 'shape', label: 'Kształt', type: 'select', default: 'heart', options: [
      { value: 'heart', label: 'Serce' }, { value: 'hexagon', label: 'Sześciokąt' }, { value: 'star', label: 'Gwiazda' }, { value: 'diamond', label: 'Romb' },
      { value: 'circle', label: 'Koło' }, { value: 'blob', label: 'Plama' }, { value: 'shield', label: 'Tarcza' }, { value: 'rect', label: 'Prostokąt' },
    ] },
    { group: 'Kształt', key: 'fillOutside', label: 'Zamaluj tło poza kształtem', type: 'toggle', default: true, when: { key: 'shape', is: ['heart', 'hexagon', 'star', 'diamond', 'circle', 'blob', 'shield'] } },
    rangeF('radius', 'Zaokrąglenie', 0, 120, 2, 24, 'px', 'Kształt'),
    rangeF('border', 'Grubość linii', 1, 12, 0.5, 3, 'px', 'Kształt'),
    toggle('ants', 'Maszerujące mrówki', false, 'Kształt'),
    rangeF('speed', 'Tempo mrówek', 0.2, 4, 0.1, 1, '×', 'Kształt'),
    toggle('pulse', 'Pulsowanie', false, 'Kształt'),
    inset(10),
    color('accent', 'Linia', '#ff5900'), color('lineColor', 'Mrówki', '#ffffff'), color('bg', 'Tło poza kształtem', '#111114'),
  ]),
  F('filmframe', 'Taśma filmowa', '🎞️', 'Kamerka jak klatka taśmy filmowej z perforacją, która przesuwa się w pętli.', [
    toggle('roll', 'Przesuwanie perforacji', true), inset(0),
    toggle('showLabel', 'Napis', true, 'Napisy'), text('label', 'Napis', 'FILM 400', 24), toggle('timecode', 'Licznik czasu', true, 'Napisy'),
    color('film', 'Taśma', '#141414'), color('hole', 'Otwory', '#f4efe3'), color('textColor', 'Napisy', '#ffb000'),
  ]),
  F('postcardframe', 'Pocztówka', '💌', 'Kamerka na pocztówce ze znaczkiem, stemplem i odręcznym podpisem.', [
    rangeF('tilt', 'Przechylenie', -8, 8, 0.5, -1.5, '°', 'Wygląd'), inset(12),
    text('caption', 'Podpis', 'Pozdrowienia ze streama!', 40, 'Napisy', true), text('stamp', 'Znaczek (emoji)', '🎮', 4), text('stampText', 'Napis na znaczku', 'VXH', 8),
    toggle('postmark', 'Stempel', true, 'Napisy'), text('city', 'Miasto na stemplu', 'STREAM CITY', 16),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'pacifico', options: [{ value: 'pacifico', label: 'Pacifico' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }] },
    color('paper', 'Papier', '#f7f1e3'), color('ink', 'Atrament', '#24305e'), color('accent', 'Znaczek', '#ff5900'),
  ]),
  F('termframe', 'Okno terminala', '🖥️', 'Kamerka w oknie konsoli z kropkami okna, promptem i wpisywaną komendą.', [
    { group: 'Wygląd', key: 'theme', label: 'Motyw', type: 'select', default: 'green', options: [{ value: 'green', label: 'Zielony fosfor' }, { value: 'amber', label: 'Bursztyn' }, { value: 'dark', label: 'Ciemny nowoczesny' }, { value: 'light', label: 'Jasny' }] },
    toggle('scan', 'Linie skanowania', true), inset(10),
    text('title', 'Tytuł okna', 'webcam.exe', 24), toggle('showPrompt', 'Prompt na dole', true, 'Napisy'),
    text('user', 'Użytkownik', 'skullboypl', 16), text('command', 'Komenda', 'sudo ./stream --hype', 40), rangeF('typeSpeed', 'Tempo pisania', 3, 40, 1, 12, ' zn/s', 'Napisy'),
  ]),
  F('winframe', 'Okno retro systemu', '🪟', 'Kamerka w oknie w stylu starego systemu: belka tytułu, przyciski i pasek stanu z zegarem.', [
    { group: 'Wygląd', key: 'look', label: 'Wersja', type: 'select', default: 'gray', options: [{ value: 'gray', label: 'Szare lata 90.' }, { value: 'mono', label: 'Czarno-biały' }, { value: 'candy', label: 'Kolorowy 2000' }] },
    inset(10), text('icon', 'Ikona', '📷', 4), text('title', 'Tytuł okna', 'Kamerka.exe', 30), toggle('status', 'Pasek stanu', true, 'Napisy'), text('statusText', 'Tekst paska', 'Gotowy', 30, 'Napisy', true),
    color('titleColor', 'Belka', '#0a246a'), color('titleColor2', 'Belka (drugi kolor)', '#3a6ea5'),
  ]),
  F('wantedframe', 'List gończy', '🤠', 'Kamerka na liście gończym z Dzikiego Zachodu: WANTED, nick i nagroda.', [
    inset(8), text('top', 'Nagłówek', 'WANTED', 16, 'Napisy', true), text('name', 'Nick', 'skullboypl', 24), text('reward', 'Nagroda', 'REWARD: 1000 subów', 30, 'Napisy', true),
    color('paper', 'Papier', '#e9d3a5'), color('ink', 'Druk', '#3b2312'),
  ]),
  F('speedframe', 'Linie prędkości (anime)', '💨', 'Mangowe linie prędkości dookoła kamerki, migające jak w anime; z napisem.', [
    rangeF('count', 'Ilość linii', 20, 160, 2, 70, '', 'Wygląd'), rangeF('hole', 'Wolny środek', 30, 90, 1, 62, '%', 'Wygląd'), rangeF('fps', 'Miganie', 1, 24, 1, 8, ' /s', 'Wygląd'),
    text('text', 'Napis', '', 20), { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'bebas', options: [{ value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'poppins', label: 'Poppins' }] },
    color('lineColor', 'Linie', '#ffffff'), color('textColor', 'Napis', '#ffffff'), color('accent', 'Obrys napisu', '#ff2d95'),
  ]),
  F('neonsign', 'Neonowy szyld', '💡', 'Dwukolorowa neonowa rurka dookoła kamerki i świecący napis jak szyld baru.', [
    toggle('flicker', 'Migotanie', true), inset(12), text('text', 'Napis', 'On Air', 20),
    { group: 'Napisy', key: 'signPos', label: 'Miejsce napisu', type: 'select', default: 'top', options: [{ value: 'top', label: 'Góra' }, { value: 'bottom', label: 'Dół' }] },
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'pacifico', options: [{ value: 'pacifico', label: 'Pacifico' }, { value: 'bebas', label: 'Bebas' }, { value: 'poppins', label: 'Poppins' }] },
    color('accent', 'Rurka', '#ff2d95'), color('accent2', 'Napis', '#00e5ff'),
  ]),
  F('statframe', 'Ramka z licznikiem followów', '📈', 'Ramka kamerki z plakietką liczby followów na żywo (Kick, Twitch, YouTube) i nickiem.', [
    { group: 'Kanał', key: 'platform', label: 'Serwis', type: 'select', default: 'kick', options: [{ value: 'kick', label: 'Kick' }, { value: 'twitch', label: 'Twitch' }, { value: 'youtube', label: 'YouTube' }] },
    text('channel', 'Kanał', 'skullboypl', 60, 'Kanał'), text('label', 'Napis', 'followów', 20, 'Kanał', true), text('fallback', 'Gdy brak danych', '—', 10, 'Kanał'),
    { group: 'Kanał', key: 'badgePos', label: 'Miejsce plakietki', type: 'select', default: 'br', options: [{ value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' }] },
    text('name', 'Nick na ramce', 'skullboypl', 24, 'Kanał'),
    rangeF('radius', 'Zaokrąglenie', 0, 60, 1, 18, 'px', 'Wygląd'), inset(10), color('accent', 'Akcent', '#ff5900'), color('bg', 'Plakietka', '#111114'),
  ]),
  F('aquaframe', 'Akwarium', '🐠', 'Szyba akwarium z bąbelkami, wodorostami w rogach i rybką pływającą po krawędzi.', [
    rangeF('bubbles', 'Bąbelki', 0, 40, 1, 18, '', 'Wygląd'), toggle('weedOn', 'Wodorosty', true), toggle('fish', 'Rybka', true), inset(8),
    color('water', 'Woda', '#18a6d9'), color('weed', 'Wodorosty', '#22a35a'),
  ]),
  F('boxframe', 'Ramka 3D', '🧊', 'Kamerka jak wnętrze świecącego pudełka 3D z głębią i gradientem.', [
    rangeF('depth', 'Głębokość', 4, 60, 1, 18, 'px', 'Wygląd'), toggle('spin', 'Przelewający się kolor', true), inset(14),
    color('accent', 'Kolor 1', '#ff5900'), color('accent2', 'Kolor 2', '#7a5cff'),
  ]),
  F('consoleframe', 'Konsola przenośna', '🎮', 'Kamerka jako ekran przenośnej konsoli z krzyżakiem i przyciskami A/B.', [
    { group: 'Wygląd', key: 'look', label: 'Układ', type: 'select', default: 'wide', options: [{ value: 'wide', label: 'Poziomy' }, { value: 'retro', label: 'Klasyczny kanciasty' }] },
    text('brand', 'Napis pod ekranem', 'VXH BOY', 16), inset(6), color('body', 'Obudowa', '#7a5cff'), color('buttons', 'Przyciski', '#ff2d95'),
  ]),
  F('ekgframe', 'EKG z tętnem', '💓', 'Ramka z linią EKG biegnącą w rytm serca i licznikiem BPM; idealne do horrorów.', [
    rangeF('bpm', 'Tętno', 40, 200, 1, 82, ' BPM', 'Wygląd'), toggle('wander', 'Lekko się zmienia', true), inset(10), color('accent', 'Linia', '#22e07a'),
  ]),
  F('stickerframe', 'Ramka z naklejkami', '🌟', 'Emoji-naklejki rozsiane dookoła kamerki, delikatnie się kołyszą.', [
    text('stickers', 'Naklejki (emoji)', '⭐💖🎮🔥✨😎🍕👾', 40, 'Wygląd'), rangeF('count', 'Ilość', 4, 32, 1, 14, '', 'Wygląd'), rangeF('size', 'Rozmiar', 0.5, 2.5, 0.1, 1, '×', 'Wygląd'),
    toggle('outline', 'Biała ramka', true), inset(18), color('lineColor', 'Ramka', '#ffffff'),
  ]),
  F('aviaframe', 'HUD pilota', '✈️', 'Wyświetlacz pilota: sztuczny horyzont, prędkość, wysokość i kurs, z przezroczystym środkiem.', [
    text('callsign', 'Znak wywoławczy', 'VXH-01', 12), rangeF('alt', 'Wysokość', 0, 40000, 100, 12000, ' ft', 'Wygląd'), rangeF('speedKt', 'Prędkość', 60, 900, 5, 280, ' kt', 'Wygląd'),
    inset(10), color('accent', 'Kolor HUD', '#3cff8f'),
  ]),
  F('artframe', 'Ramka artystyczna', '🎨', 'Ręcznie robiony wygląd: akwarela, wycinanka z papieru albo kreda na tablicy.', [
    { group: 'Wygląd', key: 'style', label: 'Technika', type: 'select', default: 'watercolor', options: [{ value: 'watercolor', label: 'Akwarela' }, { value: 'paper', label: 'Wycinanka' }, { value: 'chalk', label: 'Kreda' }] },
    { group: 'Kolory', key: 'colors', label: 'Kolory', type: 'colors', max: 4, default: ['#ff8fab', '#7ad7f0', '#ffd166', '#b8f2a0'] },
    text('caption', 'Podpis', '', 30), inset(12),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'pacifico', options: [{ value: 'pacifico', label: 'Pacifico' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }] },
  ]),
  F('seasonframe', 'Ramka na okazje', '🎉', 'Mikołajki, Dzień Dziecka, Dzień Kobiet, Black Friday, Nowy Rok Księżycowy i pory roku: dekoracje, napis i spadające ozdoby.', [
    { group: 'Okazja', key: 'theme', label: 'Okazja', type: 'select', default: 'mikolajki', options: [
      { value: 'mikolajki', label: 'Mikołajki' }, { value: 'kids', label: 'Dzień Dziecka' }, { value: 'women', label: 'Dzień Kobiet' }, { value: 'blackfriday', label: 'Black Friday' },
      { value: 'lunar', label: 'Nowy Rok Księżycowy' }, { value: 'autumn', label: 'Jesień' }, { value: 'spring', label: 'Wiosna' }, { value: 'summer', label: 'Wakacje' },
    ] },
    toggle('showLabel', 'Napis', true, 'Okazja'), text('label', 'Własny napis', 'auto', 30, 'Okazja'), toggle('fall', 'Spadające ozdoby', true, 'Okazja'), inset(14),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [{ value: 'poppins', label: 'Poppins' }, { value: 'pacifico', label: 'Pacifico' }, { value: 'bebas', label: 'Bebas' }] },
  ]),
];

export const FRAME_RENDERERS: Record<string, Renderer> = {
  shapeframe: ShapeFrame, filmframe: FilmFrame, postcardframe: PostcardFrame, termframe: TermFrame, winframe: WinFrame, wantedframe: WantedFrame,
  speedframe: SpeedFrame, neonsign: NeonSignFrame, statframe: StatFrame, aquaframe: AquaFrame, boxframe: BoxFrame, consoleframe: ConsoleFrame,
  ekgframe: EkgFrame, stickerframe: StickerFrame, aviaframe: AviaFrame, artframe: ArtFrame, seasonframe: SeasonFrame,
};
