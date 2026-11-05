import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { ParticleLayer, type EffectKind } from './ParticleLayer';
import { PHOTO_IDS, VIDEO_URLS } from './backgrounds';
import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export const SCENE_FONTS: Record<string, string> = {
  dm: "'DM Sans', sans-serif",
  poppins: "'Poppins', sans-serif",
  bebas: "'Bebas Neue', sans-serif",
  russo: "'Russo One', sans-serif",
  orbitron: "'Orbitron', sans-serif",
  pacifico: "'Pacifico', cursive",
};

const pad = (n: number) => String(n).padStart(2, '0');
const fmtLeft = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** Deadline for "countdown N minutes from when OBS opened the source" or "until HH:MM". */
const useDeadline = (mode: string, minutes: number, at: string) => {
  const opened = useRef(Date.now());
  if (mode === 'clock') {
    const [hh, mm] = at.split(':').map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    // A start time after midnight, set late in the evening, means tomorrow.
    if (d.getTime() < Date.now() - 6 * 3600_000) d.setDate(d.getDate() + 1);
    return { start: opened.current, end: d.getTime() };
  }
  return { start: opened.current, end: opened.current + minutes * 60_000 };
};

const useNow = (active: boolean) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
};

const Title = ({ text, anim }: { text: string; anim: string }) => {
  const chars = Array.from(text);
  return (
    <h1 className={`sc-title anim-${anim}`} data-text={text}>
      {chars.map((ch, i) => (
        <span key={i} style={{ '--i': i } as Vars} className={ch === ' ' ? 'sp' : undefined}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </h1>
  );
};


// Only http(s) images or our own /bg files; anything else could break out of the CSS url().
const safeImage = (raw: string) => {
  const v = raw.trim();
  return /^(https?:\/\/|\/)[^\s"'()\\]+$/i.test(v) ? v : '';
};

/** Looping video background: same dim/tint treatment as the photos, plus blur and speed. */
export const VideoBg = ({ src, poster, params }: { src: string; poster: string; params: Params }) => (
  <div className="sc-bg sc-photo sc-video">
    <video
      className="sc-video-el"
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      ref={(v) => { if (v) v.playbackRate = Number(params.bgSpeed ?? 1); }}
      style={{ filter: Number(params.bgBlur ?? 0) > 0 ? `blur(${params.bgBlur}px)` : undefined }}
    />
    {params.bgTint && <div className="sc-photo-tint" />}
    <div className="sc-photo-dim" style={{ opacity: (params.bgDim as number) ?? 0.35 }} />
  </div>
);

const Photo = ({ src, params }: { src: string; params: Params }) => (
  <div className={`sc-bg sc-photo motion-${params.bgMotion ?? 'zoom'}`}>
    {src && <div className="sc-photo-img" style={{ backgroundImage: `url("${src}")` }} />}
    {params.bgTint && <div className="sc-photo-tint" />}
    <div className="sc-photo-dim" style={{ opacity: (params.bgDim as number) ?? 0.35 }} />
  </div>
);

export const Background = ({ bg, colors, params }: { bg: string; colors: string[]; params: Params }) => {
  const [a, b = a, c = b] = colors;
  if (bg.startsWith('v-') && VIDEO_URLS[bg.slice(2)]) return <VideoBg src={VIDEO_URLS[bg.slice(2)]} poster={`/bg/${bg.slice(2)}.webp`} params={params} />;
  if (PHOTO_IDS.includes(bg)) return <Photo src={`/bg/${bg}.webp`} params={params} />;
  switch (bg) {
    case 'custom':
      return <Photo src={safeImage(String(params.bgImage ?? ''))} params={params} />;
    case 'mesh':
      return <div className="sc-bg sc-mesh" />;
    case 'rays':
      return (
        <div className="sc-bg sc-rays">
          <div className="sc-rays-spin" />
          <div className="sc-rays-core" />
        </div>
      );
    case 'dots':
      return (
        <div className="sc-bg sc-dots">
          <div className="sc-dots-layer l1" /><div className="sc-dots-layer l2" />
        </div>
      );
    case 'lava':
      return (
        <div className="sc-bg sc-lava">
          <div className="sc-lava-goo">
            {[a, b, c, a, b, c].map((col, i) => <i key={i} className={`k${i}`} style={{ background: col }} />)}
          </div>
        </div>
      );
    case 'synth':
      return (
        <div className="sc-bg sc-synth">
          <div className="sc-sun" />
          <div className="sc-grid-wrap"><div className="sc-grid" /></div>
          <div className="sc-horizon" />
        </div>
      );
    case 'waves':
      return (
        <div className="sc-bg sc-waves">
          {[c, b, a].map((col, i) => (
            <svg key={i} className={`sc-wave w${i}`} viewBox="0 0 2880 320" preserveAspectRatio="none" aria-hidden>
              <path
                fill={col}
                d="M0 160 C 240 60 480 60 720 160 S 1200 260 1440 160 S 1920 60 2160 160 S 2640 260 2880 160 V320 H0Z"
              />
            </svg>
          ))}
        </div>
      );
    case 'space':
      return (
        <div className="sc-bg sc-space">
          <div className="sc-nebula n1" /><div className="sc-nebula n2" />
          <ParticleLayer kind="stars" params={{ count: 380, size: 1, speed: 0.8, opacity: 1, color: '#ffffff', mode: 'twinkle', shooting: true }} />
        </div>
      );
    case 'minimal':
      return (
        <div className="sc-bg sc-minimal">
          <div className="sc-sweep" />
          <div className="sc-ring r1" /><div className="sc-ring r2" />
        </div>
      );
    default:
      return (
        <div className="sc-bg sc-aurora">
          {[a, b, c, a].map((col, i) => <div key={i} className={`sc-blob b${i}`} style={{ background: col }} />)}
        </div>
      );
  }
};

export const EFFECT_DEFAULTS: Record<string, Params> = {
  snow: { count: 160, speed: 0.9, size: 1.1, wind: 0.3, opacity: 0.85, color: '#ffffff', blur: true, flakes: 'mix', area: 'full' },
  stars: { count: 260, speed: 1, size: 1, opacity: 0.9, color: '#ffffff', mode: 'twinkle', shooting: true },
  warp: { count: 320, speed: 1, size: 1, opacity: 0.85, color: '#ffffff', mode: 'warp' },
  fireflies: { count: 70, speed: 0.7, size: 1.2, opacity: 0.9, glow: 1.6, area: 'full' },
  confetti: { count: 90, speed: 0.8, size: 1, wind: 0, opacity: 1, mode: 'rain' },
  petals: { count: 50, speed: 0.9, size: 1.1, wind: 0.5, opacity: 0.95, shape: 'petal', colors: ['#ffb7c9', '#ff9fb8', '#ffd1dc'] },
  emoji: { count: 30, speed: 0.8, size: 1.3, wind: 0, opacity: 0.9, emoji: '💜✨🎮', from: 'up', area: 'full' },
  fireworks: { count: 2, every: 2.2, size: 1, opacity: 1, shape: 'mixed', twinkle: true },
  embers: { count: 90, speed: 1, size: 1, wind: 0.2, opacity: 0.9, glow: 1, colors: ['#ff7a1a', '#ffb347', '#ff3d00'] },
  bubbles: { count: 26, speed: 0.8, size: 1, wind: 0, opacity: 0.9, colors: ['#bfe9ff', '#ffd1f5', '#d9ffe8'] },
  bokeh: { count: 22, speed: 0.6, size: 1, opacity: 0.55, colors: ['#ffcf7a', '#ff8fb1', '#8fb8ff'] },
  sparkles: { count: 40, speed: 1, size: 1, opacity: 1, area: 'full', colors: ['#fff3b0', '#ffffff', '#ffd23f'] },
  balloons: { count: 14, speed: 0.8, size: 1, wind: 0, opacity: 1, colors: ['#ff5900', '#ffd23f', '#3bceac', '#7aa2ff', '#f26b8a'] },
  meteors: { count: 4, speed: 1, size: 1, opacity: 1, every: 3, from: 'left', colors: ['#bfe3ff', '#ffffff'] },
  digital: { count: 60, speed: 1, size: 1, opacity: 0.8, colors: ['#3bff7a'] },
};

export const SceneScreen = ({ kind, params }: { kind: 'starting' | 'brb' | 'ending'; params: Params }) => {
  const colors = params.colors as string[];
  const timer = (params.timer as string) ?? 'off';
  const { start, end } = useDeadline(timer, params.minutes as number, (params.at as string) ?? '20:00');
  const now = useNow(timer !== 'off');
  const left = end - now;
  const done = left <= 0;
  const effect = params.effect as string;
  const socials = parseSocials((params.socials as string) ?? '');

  const style: Vars = {
    '--c1': colors[0],
    '--c2': colors[1] ?? colors[0],
    '--c3': colors[2] ?? colors[1] ?? colors[0],
    '--base': params.base as string,
    '--fg': params.textColor as string,
    '--ts': (params.titleSize as number) ?? 1,
    '--font': SCENE_FONTS[params.font as string] ?? SCENE_FONTS.dm,
    '--cw': (params.chatWidth as number) ?? 26,
  };
  const chat = Boolean(params.chat);
  const chatClass = chat ? `has-chat chat-${params.chatSide ?? 'right'} chat-${params.chatStyle ?? 'glass'}` : '';

  const effectParams: Params | null = effect && effect !== 'none'
    ? { ...EFFECT_DEFAULTS[effect], ...(effect === 'confetti' || effect === 'fireworks' ? { colors } : {}), ...(effect === 'fireflies' ? { color: colors[1] ?? colors[0] } : {}) }
    : null;
  const effectKind: EffectKind | null = effect === 'warp' ? 'stars' : (effect as EffectKind);

  return (
    <div className={`sc-root sc-${kind} ${chatClass}`} style={style}>
      <div className="sc-layers">
        <Background bg={params.bg as string} colors={colors} params={params} />
        {effectParams && <ParticleLayer key={effect} kind={effectKind!} params={effectParams} />}
        {params.vignette && <div className="sc-vignette" />}
      </div>

      {chat && (
        <div className="sc-chat">
          {params.showChatTitle !== false && params.chatTitle && <div className="sc-chat-head"><i />{params.chatTitle as string}</div>}
          {/* Only the studio preview shows these; in OBS the real chat source sits here. */}
          <div className="sc-chat-hint" aria-hidden>
            <p><b style={{ color: '#ff8a3d' }}>widz123:</b> siema!</p>
            <p><b style={{ color: '#7aa2ff' }}>kasia_gra:</b> czekam na start 🔥</p>
            <p><b style={{ color: '#3bceac' }}>noob_pl:</b> co dziś gramy?</p>
            <span>Tu połóż źródło czatu z OBS</span>
          </div>
        </div>
      )}

      <div className="sc-inner">
        <div className="sc-center">
          {params.showKicker !== false && params.kicker && (
            <div className="sc-kicker">
              <i className={kind === 'ending' ? 'off' : ''} />
              {params.kicker as string}
            </div>
          )}
          {params.showTitle !== false && <Title key={`${params.title}-${params.titleAnim}`} text={(params.title as string) || ' '} anim={params.titleAnim as string} />}
          {params.showSubtitle !== false && params.subtitle && <p className="sc-sub">{params.subtitle as string}</p>}

          {timer !== 'off' && (
            <div className="sc-timer">
              {done ? (
                <strong className="sc-done">{params.doneText as string}</strong>
              ) : (
                <>
                  {params.showTimerLabel !== false && params.timerLabel && <span>{params.timerLabel as string}</span>}
                  <strong key={Math.ceil(left / 1000)}>{fmtLeft(left)}</strong>
                </>
              )}
              {params.progress && (
                <div className="sc-progress">
                  <div style={{ width: `${Math.min(100, ((now - start) / Math.max(1, end - start)) * 100)}%` }} />
                </div>
              )}
            </div>
          )}

          {kind === 'ending' && params.showNext !== false && params.next && <p className="sc-next">{params.next as string}</p>}
        </div>

        {params.bars && (
          <div className="sc-bars" aria-hidden>
            {Array.from({ length: 32 }, (_, i) => (
              <span key={i} style={{ '--d': `${0.5 + ((i * 37) % 11) / 10}s`, '--dl': `${-((i * 53) % 17) / 10}s` } as Vars} />
            ))}
          </div>
        )}

        {params.showSocials !== false && socials.length > 0 && (
          <div className="sc-socials">
            {socials.map((s, i) => (
              <span key={i} className="sc-social" style={{ '--brand': BRAND_COLORS[s.brand], '--i': i } as Vars}>
                <BrandIcon brand={s.brand} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
