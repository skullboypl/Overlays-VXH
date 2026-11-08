// Second set of webcam frames: glitch (cyberpunk), CRT / VHS tube, polaroid and 8-bit pixel.
// All of them are CSS: no images, so they stay crisp at any source size.
import { useEffect, useState, type CSSProperties } from 'react';
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
    '--bezel': `${n(p.bezel, 14)}px`,
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
    '--border': `${n(p.border, 12)}px`,
    '--bottom': `${n(p.bottom, 54)}px`,
    '--tilt': `${n(p.tilt, -2)}deg`,
    '--ink': c(p.ink, '#2b2b33'),
    '--tape': c(p.tapeColor, '#ffd57a'),
    '--font': SCENE_FONTS[c(p.font, 'pacifico')] ?? SCENE_FONTS.pacifico,
    '--fs': `${n(p.captionSize, 22)}px`,
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
    '--px': `${px}px`,
    '--c1': c(p.color, '#ffffff'),
    '--c2': c(p.color2, '#ff5900'),
    '--c3': c(p.color3, '#1b1b24'),
    '--fg': c(p.textColor, '#ffffff'),
    '--fs': `${n(p.fontSize, 12)}px`,
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
