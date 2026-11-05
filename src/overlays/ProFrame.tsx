import type { CSSProperties } from 'react';
import type { Params } from './schema';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Only banners made on our own generators may be embedded. */
export const safeBannerUrl = (raw: unknown) => {
  try {
    const url = new URL(String(raw ?? '').trim());
    if (url.protocol !== 'https:') return '';
    if (!['faceitbanner.vxh.pl', 'lolbanner.vxh.pl'].includes(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
};

const ACCENTS = ['tl', 'tr', 'bl', 'br'] as const;

/**
 * A webcam frame with many knobs: shape, border style, animation, accents and an optional colour mask
 * around the shape (so a round frame hides the corners of a rectangular camera).
 */
export const ProFrame = ({ params, children }: { params: Params; children?: React.ReactNode }) => {
  const colors = (params.colors as string[]) ?? ['#ff5900', '#7a5cff'];
  const shape = String(params.shape ?? 'rounded');
  const style: Vars = {
    '--inset': `${params.inset ?? 16}px`,
    '--thick': `${params.thickness ?? 6}px`,
    '--radius': shape === 'rect' ? '0px' : shape === 'pill' ? '999px' : `${params.radius ?? 20}px`,
    '--c1': colors[0],
    '--c2': colors[1] ?? colors[0],
    '--grad': `conic-gradient(from var(--neon-angle), ${[...colors, colors[0]].join(', ')})`,
    '--lin': `linear-gradient(135deg, ${colors.join(', ')})`,
    '--glow': `${params.glow ?? 14}px`,
    '--outside': String(params.outsideColor ?? '#0b0b0c'),
    '--speed': `${4 / Math.max(0.1, Number(params.speed ?? 1))}s`,
    '--accent': `${params.accentSize ?? 28}px`,
  };
  const anim = String(params.anim ?? 'none');
  const border = String(params.border ?? 'gradient');
  return (
    <div
      className={`ov-fill pf shape-${shape} border-${border} anim-${anim} ${anim === 'spin' ? 'ov-neon is-spinning' : 'ov-neon'}`}
      style={{ ...style, '--spin': 'var(--speed)' } as Vars}
    >
      <div className={`pf-box ${params.mask ? 'has-mask' : ''} ${params.shadow ? 'has-shadow' : ''}`}>
        {(border === 'gradient') && <div className="pf-ring" />}
        {(border === 'gradient') && Number(params.glow) > 0 && <div className="pf-ring pf-ring-glow" />}
      </div>
      {params.accent !== 'none' && ACCENTS.map((c) => <span key={c} className={`pf-accent a-${params.accent} ${c}`} />)}
      {children}
    </div>
  );
};

/** ProFrame plus a banner from faceitbanner.vxh.pl (ELO, level, stats) embedded at a chosen spot. */
export const FaceitCam = ({ params }: { params: Params }) => {
  const src = safeBannerUrl(params.banner);
  const w = Number(params.bannerW ?? 420);
  const h = Number(params.bannerH ?? 120);
  const scale = Number(params.bannerScale ?? 1);
  const pos = String(params.bannerPos ?? 'bl');
  const below = pos === 'below';
  const box = { width: w * scale, height: h * scale };
  const banner = src ? (
    <div className={`fc-banner pos-${pos}`} style={box}>
      <iframe title="FACEIT" src={src} width={w} height={h} style={{ transform: `scale(${scale})` }}
        scrolling="no" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" />
    </div>
  ) : (
    <div className={`fc-banner fc-empty pos-${pos}`} style={box}><span>FACEIT · ELO · K/D</span></div>
  );
  return (
    <div className="ov-fill">
      {/* "Below" keeps the camera frame above and gives the banner its own strip under it. */}
      <div className="ov-fill" style={below ? { height: `calc(100% - ${h * scale + 8}px)` } : undefined}>
        <ProFrame params={params}>{!below && banner}</ProFrame>
      </div>
      {below && banner}
    </div>
  );
};
