// Second set of webcam frames: glitch (cyberpunk), CRT / VHS tube, polaroid and 8-bit pixel.
// All of them are CSS: no images, so they stay crisp at any source size.
import { useEffect, useId, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { SCENE_FONTS } from './SceneScreen';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const n = (v: Params[string], d = 0) => (typeof v === 'number' ? v : d);
const c = (v: Params[string], d = '') => (typeof v === 'string' ? v : d);

/* ---------------- glitch / cyberpunk ---------------- */
export const GlitchFrame = ({ params: p }: { params: Params }) => {
  const style: Vars = {
    '--inset': `${n(p.inset, 14)}px`,
    '--thick': `${n(p.thickness, 3)}px`,
    '--radius': `${n(p.radius, 4)}px`,
    '--c1': c(p.color, '#e8f6ff'),
    '--c2': c(p.color2, '#00f0ff'),
    '--c3': c(p.color3, '#ff00a8'),
    '--rate': `${3.2 / Math.max(0.2, n(p.intensity, 1))}s`,
    '--shift': `${4 * n(p.intensity, 1)}px`,
    '--font': SCENE_FONTS[c(p.font, 'orbitron')] ?? SCENE_FONTS.orbitron,
  };
  const corners = p.corners !== false;
  return (
    <div className={`ov-fill gf ${p.scanlines !== false ? 'has-scan' : ''} ${p.noise !== false ? 'has-noise' : ''} ${p.shake ? 'has-shake' : ''}`} style={style}>
      <div className="gf-ring gf-ring-b" />
      <div className="gf-ring gf-ring-c" />
      <div className="gf-ring gf-ring-a" />
      {corners && ['tl', 'tr', 'bl', 'br'].map((k) => <span key={k} className={`gf-corner ${k}`} />)}
      {p.showLabel !== false && p.label && <div className={`gf-label at-${c(p.labelPos, 'tl')}`}><i /> {c(p.label)}</div>}
      {p.showCode !== false && <GlitchCode />}
    </div>
  );
};

/** Hex readout in the bottom right that changes a few times a second. */
const GlitchCode = () => {
  const [code, setCode] = useState('0x7F3A');
  useEffect(() => {
    const id = window.setInterval(() => setCode(`0x${Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')}`), 380);
    return () => window.clearInterval(id);
  }, []);
  return <div className="gf-code">SIG {code}</div>;
};

/* ---------------- CRT / VHS ---------------- */
const pad = (v: number) => String(v).padStart(2, '0');

/** Timecode that runs from the moment OBS loaded the source, like an old camcorder. */
const Timecode = ({ date }: { date: boolean }) => {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setMs(Date.now() - start), 200);
    return () => window.clearInterval(id);
  }, []);
  const sec = Math.floor(ms / 1000);
  const now = new Date();
  return (
    <span className="rf-tc">
      {pad(Math.floor(sec / 3600))}:{pad(Math.floor((sec % 3600) / 60))}:{pad(sec % 60)}
      {date && <small>{now.getFullYear()}.{pad(now.getMonth() + 1)}.{pad(now.getDate())}</small>}
    </span>
  );
};

export const RetroFrame = ({ params: p }: { params: Params }) => {
  const style: Vars = {
    '--inset': `${n(p.inset, 10)}px`,
    '--bezel': n(p.bezel, 14),
    '--curve': `${n(p.curve, 6)}%`,
    '--bezelColor': c(p.bezelColor, '#1d1d22'),
    '--accent': c(p.accent, '#ff5900'),
    '--tint': c(p.tint, '#8fd3ff'),
    '--fg': c(p.textColor, '#f2f2f2'),
    '--trackEvery': `${n(p.trackEvery, 7)}s`,
  };
  const look = c(p.look, 'tv');
  return (
    <div className={`ov-fill rf look-${look} ${p.scanlines !== false ? 'has-scan' : ''} ${p.vignette !== false ? 'has-vignette' : ''} ${p.tracking !== false ? 'has-tracking' : ''} ${p.tintOn ? 'has-tint' : ''}`} style={style}>
      <div className="rf-bezel" />
      <div className="rf-screen">
        {p.tracking !== false && <i className="rf-track" />}
        {p.showOsd !== false && (
          <div className="rf-osd">
            <span className="rf-play">{c(p.osd, 'PLAY')} <b>▶</b></span>
            {p.timecode !== false && <Timecode date={p.date === true} />}
          </div>
        )}
        {p.showRec && <div className="rf-rec"><i /> REC</div>}
        {p.showChannel !== false && <div className="rf-ch">{c(p.channel, 'CH 03')}</div>}
      </div>
      {look === 'tv' && (
        <div className="rf-knobs"><i /><i /><b /></div>
      )}
    </div>
  );
};

/* ---------------- polaroid ---------------- */
export const PolaroidFrame = ({ params: p }: { params: Params }) => {
  const style: Vars = {
    '--inset': `${n(p.inset, 14)}px`,
    '--paper': c(p.paper, '#fbfaf6'),
    '--border': n(p.border, 12),
    '--bottom': n(p.bottom, 54),
    '--tilt': `${n(p.tilt, -2)}deg`,
    '--ink': c(p.ink, '#2b2b33'),
    '--tape': c(p.tapeColor, '#ffd57a'),
    '--font': SCENE_FONTS[c(p.font, 'pacifico')] ?? SCENE_FONTS.pacifico,
    '--fs': n(p.captionSize, 22),
  };
  const tape = c(p.tape, 'top');
  return (
    <div className={`ov-fill pl ${p.sway ? 'has-sway' : ''} ${p.shadow !== false ? 'has-shadow' : ''}`} style={style}>
      <div className="pl-card">
        <div className="pl-window" />
        {p.showCaption !== false && p.caption && <div className="pl-caption">{c(p.caption)}</div>}
        {tape === 'top' && <span className="pl-tape t" />}
        {tape === 'corners' && <><span className="pl-tape tl" /><span className="pl-tape br" /></>}
        {tape === 'sides' && <><span className="pl-tape l" /><span className="pl-tape r" /></>}
        {p.pin && <span className="pl-pin" />}
        {p.stickers && <div className="pl-stickers">{c(p.stickerSet, '✨💖⭐').split('').filter((ch) => ch.trim()).slice(0, 3).map((ch, i) => <span key={i} style={{ '--i': i } as Vars}>{ch}</span>)}</div>}
      </div>
    </div>
  );
};

/* ---------------- 8-bit pixel ---------------- */
export const PixelFrame = ({ params: p }: { params: Params }) => {
  const px = Math.max(2, n(p.pixel, 6));
  const style: Vars = {
    '--inset': `${n(p.inset, 12)}px`,
    '--px0': px,
    '--c1': c(p.color, '#ffffff'),
    '--c2': c(p.color2, '#ff5900'),
    '--c3': c(p.color3, '#1b1b24'),
    '--fg': c(p.textColor, '#ffffff'),
    '--fs0': n(p.fontSize, 12),
  };
  const hearts = Math.max(1, Math.min(10, Math.round(n(p.hearts, 5))));
  const full = Math.max(0, Math.min(hearts, Math.round(n(p.hp, 3))));
  const pos = c(p.hudPos, 'tl');
  return (
    <div className={`ov-fill px ${p.blink !== false ? 'has-blink' : ''} ${p.pulse ? 'has-pulse' : ''}`} style={style}>
      <div className="px-border" />
      <div className="px-border px-border-in" />
      {p.showHud !== false && (
        <div className={`px-hud at-${pos}`}>
          {p.showLabel !== false && p.label && <b className="px-label">{c(p.label)}</b>}
          {p.showHearts !== false && (
            <span className="px-hearts">{Array.from({ length: hearts }, (_, i) => <i key={i} className={i < full ? 'on' : ''}>{i < full ? '♥' : '♡'}</i>)}</span>
          )}
          {p.showScore && <span className="px-score">{c(p.score, 'SCORE 001337')}</span>}
        </div>
      )}
      {p.showCoin && <div className="px-coin"><i /> ×{Math.round(n(p.coins, 99))}</div>}
      {p.showPress && <div className="px-press">{c(p.press, 'PRESS START')}</div>}
    </div>
  );
};

/* ---------------- HUD sci-fi ---------------- */
/** Fake telemetry that ticks a few times a second, like a game HUD. */
const useTelemetry = () => {
  const [v, setV] = useState({ fps: 60, ms: 12, sig: 98 });
  useEffect(() => {
    const id = window.setInterval(() => setV({ fps: 58 + Math.floor(Math.random() * 5), ms: 9 + Math.floor(Math.random() * 9), sig: 94 + Math.floor(Math.random() * 6) }), 700);
    return () => window.clearInterval(id);
  }, []);
  return v;
};

export const HudFrame = ({ params: p }: { params: Params }) => {
  const tele = useTelemetry();
  const style: Vars = {
    '--inset': `${n(p.inset, 14)}px`,
    '--thick': `${n(p.thickness, 2)}px`,
    '--c1': c(p.color, '#7af0ff'),
    '--c2': c(p.color2, '#ff5900'),
    '--spd': `${6 / Math.max(0.2, n(p.speed, 1))}s`,
    '--font': SCENE_FONTS[c(p.font, 'orbitron')] ?? SCENE_FONTS.orbitron,
  };
  return (
    <div className={`ov-fill hd ${p.rulers !== false ? 'has-rulers' : ''} ${p.scan !== false ? 'has-scan' : ''} ${p.grid ? 'has-grid' : ''}`} style={style}>
      <div className="hd-frame" />
      {['tl', 'tr', 'bl', 'br'].map((k) => <span key={k} className={`hd-corner ${k}`} />)}
      {p.rulers !== false && <><i className="hd-ruler t" /><i className="hd-ruler b" /></>}
      {p.bars !== false && <><i className="hd-bar l" /><i className="hd-bar r" /></>}
      {p.reticle !== false && (
        <svg className={`hd-reticle at-${c(p.reticlePos, 'tr')}`} viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" className="hd-r1" />
          <circle cx="50" cy="50" r="34" className="hd-r2" />
          <circle cx="50" cy="50" r="22" className="hd-r3" />
          <path d="M50 2v14M50 84v14M2 50h14M84 50h14" className="hd-cross" />
        </svg>
      )}
      {p.showLabel !== false && p.label && <div className="hd-label">{c(p.label)}</div>}
      {p.readouts !== false && (
        <>
          <div className="hd-read tl">FPS <b>{tele.fps}</b> · <b>{tele.ms}</b> MS</div>
          <div className="hd-read br">SIG <b>{tele.sig}%</b> <i /></div>
        </>
      )}
    </div>
  );
};

/* ---------------- comic ---------------- */
export const ComicFrame = ({ params: p }: { params: Params }) => {
  const style: Vars = {
    '--inset': `${n(p.inset, 16)}px`,
    '--thick': `${n(p.thickness, 7)}px`,
    '--ink': c(p.ink, '#111111'),
    '--fill': c(p.fill, '#ffd23f'),
    '--paper': c(p.paper, '#ffffff'),
    '--tilt': `${n(p.tilt, -1.5)}deg`,
    '--fs': n(p.fontSize, 20),
    '--font': SCENE_FONTS[c(p.font, 'bebas')] ?? SCENE_FONTS.bebas,
  };
  return (
    <div className={`ov-fill cf ${p.halftone !== false ? 'has-halftone' : ''} ${p.speedLines ? 'has-lines' : ''}`} style={style}>
      <div className="cf-panel" />
      {p.showBubble !== false && p.bubble && (
        <div className={`cf-bubble pos-${c(p.bubblePos, 'tl')} ${p.bubbleAnim !== false ? 'is-bobbing' : ''}`}>{c(p.bubble)}</div>
      )}
      {p.showBurst && <div className={`cf-burst pos-${c(p.burstPos, 'br')}`}><span>{c(p.burst, 'POW!')}</span></div>}
      {p.caption && <div className="cf-caption">{c(p.caption)}</div>}
    </div>
  );
};

/* ---------------- doodle (hand drawn, boiling line) ---------------- */
export const DoodleFrame = ({ params: p }: { params: Params }) => {
  const id = useId().replace(/:/g, '');
  const [seed, setSeed] = useState(1);
  const boil = p.boil !== false;
  useEffect(() => {
    if (!boil) return;
    // A new noise seed a few times a second: the line "boils" like in a hand-drawn cartoon.
    const ms = Math.max(60, 400 / Math.max(0.2, n(p.boilSpeed, 1)));
    const t = window.setInterval(() => setSeed((v) => (v % 50) + 1), ms);
    return () => window.clearInterval(t);
  }, [boil, p.boilSpeed]);
  const passes = Math.max(1, Math.min(3, Math.round(n(p.passes, 2))));
  const style: Vars = {
    '--inset': `${n(p.inset, 16)}px`,
    '--thick': `${n(p.thickness, 4)}px`,
    '--color': c(p.color, '#ffffff'),
    '--radius': `${n(p.radius, 14)}px`,
    '--fs': `${n(p.captionSize, 24)}px`,
    '--font': SCENE_FONTS[c(p.font, 'pacifico')] ?? SCENE_FONTS.pacifico,
  };
  const doodles = Array.from(c(p.doodles, '★♥✦')).filter((ch) => ch.trim()).slice(0, 4);
  return (
    <div className={`ov-fill df ${p.draw !== false ? 'has-draw' : ''}`} style={style}>
      <svg className="df-svg" aria-hidden>
        <defs>
          <filter id={`wob-${id}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed={seed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={n(p.wobble, 5)} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter={`url(#wob-${id})`}>
          {Array.from({ length: passes }, (_, i) => <rect key={i} className={`df-pass p${i}`} pathLength={1} rx="var(--radius)" />)}
        </g>
      </svg>
      {p.showDoodles !== false && doodles.map((ch, i) => <span key={i} className={`df-doodle d${i}`} style={{ '--i': i } as Vars}>{ch}</span>)}
      {p.showCaption !== false && p.caption && <div className="df-caption">{c(p.caption)}<svg viewBox="0 0 120 10" preserveAspectRatio="none"><path d="M2 6 Q 15 1 30 6 T 60 6 T 90 6 T 118 6" /></svg></div>}
    </div>
  );
};

/* ---------------- ornate (gold / silver / rose) ---------------- */
const METALS: Record<string, [string, string, string]> = {
  gold: ['#fff2b0', '#e2b63a', '#8a5f10'],
  silver: ['#ffffff', '#c9ccd6', '#6f737f'],
  rose: ['#ffe3dc', '#e0a094', '#8f5048'],
  copper: ['#ffd9b8', '#c97a3c', '#6f3a16'],
};
const FLOURISH = 'M4 96C4 62 22 46 50 46c18 0 30-10 30-26 0-9-6-14-13-14-9 0-13 8-8 14M4 96c34 0 50-18 50-46 0-18 10-30 26-30M50 46c-6-14 2-28 16-30';

export const OrnateFrame = ({ params: p }: { params: Params }) => {
  const metal = c(p.metal, 'gold');
  const [hi, mid, lo] = metal === 'custom' ? [c(p.color, '#ffd700'), c(p.color, '#ffd700'), c(p.color2, '#5a4300')] : METALS[metal] ?? METALS.gold;
  const style: Vars = {
    '--inset': `${n(p.inset, 22)}px`,
    '--thick': `${n(p.thickness, 5)}px`,
    '--corner': `${n(p.cornerSize, 72)}px`,
    '--hi': hi, '--mid': mid, '--lo': lo,
    '--radius': `${n(p.radius, 6)}px`,
  };
  return (
    <div className={`ov-fill of ${p.shimmer !== false ? 'has-shimmer' : ''} ${p.innerLine !== false ? 'has-inner' : ''} ${p.shadow !== false ? 'has-shadow' : ''}`} style={style}>
      <div className="of-ring" />
      <div className="of-ring of-shine" />
      <div className="of-inner" />
      {['tl', 'tr', 'bl', 'br'].map((k) => (
        <svg key={k} className={`of-corner ${k}`} viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id={`of-g-${k}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={hi} /><stop offset="0.5" stopColor={mid} /><stop offset="1" stopColor={lo} />
            </linearGradient>
          </defs>
          <path d={FLOURISH} stroke={`url(#of-g-${k})`} />
          {p.gems !== false && <circle cx="68" cy="18" r="5" className="of-gem" />}
        </svg>
      ))}
    </div>
  );
};
