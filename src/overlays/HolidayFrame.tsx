import { useEffect, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { ParticleLayer, type EffectKind } from './ParticleLayer';
import { isLang, translate } from '../i18n';
import { FRAME_URLS } from './backgrounds';
import { resolveHolidayTheme } from './holidayCalendar';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Corner = 'tl' | 'tr' | 'bl' | 'br';

type Theme = {
  colors: string[];
  deco: Partial<Record<Corner, string>>;
  motion: 'bob' | 'swing' | 'pulse' | 'spin';
  garland?: 'lights' | 'bunting' | 'snowcap';
  extras?: ('web' | 'spider' | 'bats' | 'ribbon' | 'grass')[];
  particles?: { kind: EffectKind; params: Params };
  label: string;
};

export const HOLIDAY_THEMES: Record<string, Theme> = {
  xmas: {
    colors: ['#c8102e', '#ffffff', '#1e7b34', '#ffd23f'],
    deco: { tl: '⭐', tr: '🔔', bl: '🎄', br: '🎁' },
    motion: 'swing',
    garland: 'lights',
    particles: { kind: 'snow', params: { count: 70, speed: 0.7, size: 1, wind: 0.2, opacity: 0.9, color: '#ffffff', blur: false, flakes: 'mix', area: 'full' } },
    label: 'Wesołych Świąt!',
  },
  winter: {
    colors: ['#9ad8ff', '#ffffff', '#4f8cff'],
    deco: { tl: '❄️', tr: '❄️', bl: '⛄', br: '❄️' },
    motion: 'spin',
    garland: 'snowcap',
    particles: { kind: 'snow', params: { count: 90, speed: 0.8, size: 1, wind: 0.4, opacity: 0.9, color: '#ffffff', blur: true, flakes: 'dots', area: 'full' } },
    label: 'Zimowy stream',
  },
  newyear: {
    colors: ['#ffd23f', '#fff3b0', '#c9a227', '#ffffff'],
    deco: { tl: '🥂', tr: '🎉', bl: '✨', br: '🎆' },
    motion: 'pulse',
    garland: 'lights',
    particles: { kind: 'confetti', params: { count: 50, speed: 0.6, size: 0.8, wind: 0, opacity: 1, mode: 'rain', colors: ['#ffd23f', '#ffffff', '#c9a227', '#fff3b0'] } },
    label: 'Szczęśliwego Nowego Roku!',
  },
  valentine: {
    colors: ['#ff2d6f', '#ff8fb1', '#ffffff', '#ff2d6f'],
    deco: { tl: '💘', tr: '💖', bl: '💝', br: '💕' },
    motion: 'pulse',
    particles: { kind: 'emoji', params: { count: 14, speed: 0.7, size: 0.9, wind: 0, opacity: 0.9, emoji: '❤️💖💕', from: 'up', area: 'full' } },
    label: 'Walentynkowy stream',
  },
  easter: {
    colors: ['#ffb3c7', '#b8f0c8', '#fff2a8', '#bcd8ff'],
    deco: { tl: '🌷', tr: '🐰', bl: '🐣', br: '🥚' },
    motion: 'bob',
    extras: ['grass'],
    particles: { kind: 'petals', params: { count: 20, speed: 0.7, size: 0.8, wind: 0.4, opacity: 0.95, shape: 'petal', colors: ['#ffd1dc', '#fff2a8', '#bcd8ff'] } },
    label: 'Wesołych Świąt Wielkanocnych!',
  },
  halloween: {
    colors: ['#ff7a00', '#7b2cbf', '#ff7a00', '#2b0a3d'],
    deco: { bl: '🎃', br: '🕯️', tr: '💀' },
    motion: 'swing',
    extras: ['web', 'spider', 'bats'],
    particles: { kind: 'fireflies', params: { count: 18, speed: 0.6, size: 1, opacity: 0.85, color: '#7dff6a', glow: 1.6, area: 'full' } },
    label: 'Happy Halloween',
  },
  independence: {
    colors: ['#ffffff', '#dc143c', '#ffffff', '#dc143c'],
    deco: { br: '🇵🇱' },
    motion: 'bob',
    extras: ['ribbon'],
    label: 'Święto Niepodległości',
  },
  birthday: {
    colors: ['#ff5ea8', '#ffd23f', '#3bceac', '#7aa2ff'],
    deco: { tl: '🎈', tr: '🎈', bl: '🎂', br: '🎁' },
    motion: 'bob',
    garland: 'bunting',
    particles: { kind: 'confetti', params: { count: 45, speed: 0.6, size: 0.8, wind: 0, opacity: 1, mode: 'rain', colors: ['#ff5ea8', '#ffd23f', '#3bceac', '#7aa2ff'] } },
    label: 'Urodzinowy stream!',
  },
};

const BULBS = 16;

const Lights = ({ colors }: { colors: string[] }) => {
  const pts = Array.from({ length: BULBS }, (_, i) => ((i + 0.5) / BULBS) * 1000);
  let d = 'M0 6';
  pts.forEach((x, i) => {
    const prev = i === 0 ? 0 : pts[i - 1];
    d += ` Q ${(prev + x) / 2} 26 ${x} 10`;
  });
  d += ` Q ${(pts[BULBS - 1] + 1000) / 2} 26 1000 6`;
  return (
    <div className="hf-lights">
      <svg viewBox="0 0 1000 30" preserveAspectRatio="none" aria-hidden>
        <path d={d} fill="none" stroke="#2a2a2a" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      {pts.map((x, i) => (
        <i key={i} style={{ left: `${x / 10}%`, '--bulb': colors[i % colors.length], '--dl': `${(i % 4) * 0.35}s` } as Vars} />
      ))}
    </div>
  );
};

const Bunting = ({ colors }: { colors: string[] }) => (
  <div className="hf-bunting" aria-hidden>
    {Array.from({ length: 13 }, (_, i) => {
      const x = (i + 0.5) / 13;
      return <i key={i} style={{ left: `${x * 100}%`, top: `${Math.sin(Math.PI * x) * 14}px`, background: colors[i % colors.length], '--dl': `${i * 0.12}s` } as Vars} />;
    })}
  </div>
);

const SnowCap = () => (
  <svg className="hf-snowcap" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
    <path
      fill="#fff"
      d="M0 0 H1000 V14 C 970 30 950 18 930 26 C 900 38 880 16 850 22 C 820 30 800 40 770 24 C 740 12 720 30 690 30 C 660 30 650 14 620 18 C 590 22 580 38 550 34 C 520 30 510 16 480 20 C 450 24 440 36 410 32 C 380 28 370 14 340 20 C 310 26 300 38 270 34 C 240 30 230 18 200 22 C 170 26 160 36 130 30 C 100 24 90 14 60 22 C 40 28 20 30 0 18 Z"
    />
  </svg>
);

const Web = () => (
  <svg className="hf-web" viewBox="0 0 100 100" aria-hidden>
    <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8">
      {[0, 15, 30, 45, 60, 75, 90].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1="0" y1="0" x2={Math.cos(r) * 100} y2={Math.sin(r) * 100} />;
      })}
      {[22, 40, 58, 76].map((rad) => {
        const pts = [0, 15, 30, 45, 60, 75, 90].map((a) => {
          const r = (a * Math.PI) / 180;
          return `${Math.cos(r) * rad},${Math.sin(r) * rad}`;
        });
        return <polyline key={rad} points={pts.join(' ')} />;
      })}
    </g>
  </svg>
);

/**
 * "Realistyczna" and "3D" variants: a frame painted by Flux1-dev and cut out with RMBG-2.0
 * (public/frames/<theme>-<real|3d>.webp), brought to life with glow, a light sweep and, for 3D,
 * a slow perspective tilt with decorations floating on their own depth layer.
 */
export type ArtVariant = 'real' | 'real2' | 'real3' | 'real4' | 'real5' | '3d' | 'cartoon' | 'neon' | 'neon2' | 'neon3' | 'neon4' | 'neon5';
export const ART_VARIANTS: ArtVariant[] = ['real', 'real2', 'real3', 'real4', 'real5', '3d', 'cartoon', 'neon', 'neon2', 'neon3', 'neon4', 'neon5'];

const ImageFrame = ({ theme, params, variant, label, src }: { theme: Theme; params: Params; variant: ArtVariant; label: string; src: string }) => {
  const style: Vars = {
    '--art': `url("${src}")`,
    '--depth': (params.depth as number) ?? 1,
    '--c1': theme.colors[0],
    '--c2': theme.colors[1],
    '--deco': `${params.decoSize}px`,
    '--grad': `linear-gradient(90deg, ${theme.colors.join(', ')})`,
  };
  return (
    <div className={`ov-fill hf-img variant-${variant} ${variant.startsWith('neon') && variant !== 'neon' ? 'variant-neon' : ''}`} style={style}>
      {params.particles && theme.particles && (
        <ParticleLayer
          key={`${params.theme}-${variant}`}
          kind={theme.particles.kind}
          params={{ ...theme.particles.params, count: Math.round((theme.particles.params.count as number) * (params.amount as number)), _ref: 520 }}
        />
      )}
      <div className="hf-img-stage">
        <div className="hf-img-glow" />
        <div className="hf-img-art" />
        {params.shine && <div className="hf-img-shine" />}
        {(variant === '3d' || variant === 'cartoon') && params.decorations &&
          (Object.entries(theme.deco) as [Corner, string][]).map(([corner, emoji], i) => (
            <span key={corner} className={`hf-deco hf-deco-3d ${corner}`} style={{ '--dl': `${i * -1.1}s` } as Vars}>{emoji}</span>
          ))}
      </div>
      {label && <div className={`hf-label at-${params.labelPos ?? 'bottom'}`} style={{ '--label-size': `${params.labelSize ?? 15}px` } as Vars}><span>{label}</span></div>}
    </div>
  );
};

const ThemedFrame = ({ params }: { params: Params }) => {
  const theme = HOLIDAY_THEMES[params.theme as string] ?? HOLIDAY_THEMES.xmas;
  const variant = params.variant as string;
  const art = FRAME_URLS[`${params.theme}-${variant}`];
  // A variant whose picture is not generated yet falls back to the animated vector frame.
  if (art && (ART_VARIANTS as string[]).includes(variant)) {
    const label = params.showLabel === false ? '' : (params.label as string) === 'auto' ? translate(isLang(params._lang) ? params._lang : 'pl', theme.label) : (params.label as string);
    return <ImageFrame theme={theme} params={params} variant={variant as ArtVariant} label={label} src={art} />;
  }
  const colors = theme.colors;
  const label = params.showLabel === false ? '' : (params.label as string) === 'auto' ? translate(isLang(params._lang) ? params._lang : 'pl', theme.label) : (params.label as string);
  const speed = params.speed as number;
  const style: Vars = {
    '--inset': `${params.inset}px`,
    '--thick': `${params.thickness}px`,
    '--radius': `${params.radius}px`,
    '--glow': `${params.glow}px`,
    '--deco': `${params.decoSize}px`,
    '--grad': `conic-gradient(from var(--neon-angle), ${[...colors, colors[0]].join(', ')})`,
    '--spin': speed > 0 ? `${6 / speed}s` : '0s',
    '--c1': colors[0],
    '--c2': colors[1],
  };

  return (
    <div className={`ov-fill ov-neon hf-root theme-${params.theme} ${speed > 0 ? 'is-spinning' : ''}`} style={style}>
      {params.particles && theme.particles && (
        <div className="hf-inside">
          <ParticleLayer
            key={params.theme as string}
            kind={theme.particles.kind}
            params={{ ...theme.particles.params, count: Math.round((theme.particles.params.count as number) * (params.amount as number)), _ref: 520 }}
          />
        </div>
      )}
      {params.showBorder !== false && (params.glow as number) > 0 && <div className="ov-neon-ring ov-neon-glow" />}
      {params.showBorder !== false && <div className="ov-neon-ring" />}

      {params.garland && theme.garland === 'lights' && <Lights colors={colors} />}
      {params.garland && theme.garland === 'bunting' && <Bunting colors={colors} />}
      {params.garland && theme.garland === 'snowcap' && <SnowCap />}
      {theme.extras?.includes('web') && <Web />}
      {theme.extras?.includes('spider') && <div className="hf-spider"><i /><span>🕷️</span></div>}
      {theme.extras?.includes('bats') && ['b1', 'b2', 'b3'].map((b) => <span key={b} className={`hf-bat ${b}`}>🦇</span>)}
      {theme.extras?.includes('ribbon') && <div className="hf-ribbon"><span /></div>}
      {theme.extras?.includes('grass') && <div className="hf-grass" />}

      {params.decorations &&
        (Object.entries(theme.deco) as [Corner, string][]).map(([corner, emoji], i) => (
          <span key={corner} className={`hf-deco ${corner} m-${theme.motion}`} style={{ '--dl': `${i * -0.7}s` } as Vars}>
            {emoji}
          </span>
        ))}

      {label && <div className={`hf-label at-${params.labelPos ?? 'bottom'}`} style={{ '--label-size': `${params.labelSize ?? 15}px` } as Vars}><span>{label}</span></div>}
    </div>
  );
};

/** Today's date, refreshed every 10 minutes so an "auto" frame left running in OBS changes with the season. */
const useToday = (enabled: boolean) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 600_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
};

export const HolidayFrame = ({ params }: { params: Params }) => {
  const now = useToday(params.theme === 'auto');
  const theme = resolveHolidayTheme(params.theme, now);
  return theme ? <ThemedFrame params={{ ...params, theme }} /> : null;
};
