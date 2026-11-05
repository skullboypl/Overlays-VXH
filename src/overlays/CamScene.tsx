import { useEffect, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { Background, EFFECT_DEFAULTS, SCENE_FONTS } from './SceneScreen';
import { ParticleLayer, type EffectKind } from './ParticleLayer';
import { FaceitStats } from './FaceitStats';
import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';
import { isLang, translate, tx } from '../i18n';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Rect = { x: number; y: number; w: number; h: number };
type Slot = 'cam' | 'cam2' | 'cam3' | 'cam4' | 'screen' | 'chat';

const W = 1920, H = 1080;

/**
 * Layouts in a 1920×1080 grid. `g` is the gap; `chat` decides whether a chat column is reserved.
 * Every slot is a transparent hole in the scene: OBS sources placed under the overlay show through.
 */
export const camLayout = (layout: string, g: number, chat: boolean, camSize: number, corner = 'bl'): Partial<Record<Slot, Rect>> => {
  const top = 70 + g; // room for the title bar
  const bottom = 90 + g; // room for name and socials
  const fullH = H - top - bottom;
  switch (layout) {
    case 'cam-full':
      return { cam: { x: g, y: top, w: W - 2 * g - (chat ? 460 + g : 0), h: fullH }, ...(chat ? { chat: { x: W - 460 - g, y: top, w: 460, h: fullH } } : {}) };
    case 'cam-screen': {
      const camW = Math.round((W - 3 * g) * 0.42 * camSize);
      const screenW = W - 3 * g - camW - (chat ? 400 + g : 0);
      return {
        cam: { x: g, y: top, w: camW, h: fullH },
        screen: { x: 2 * g + camW, y: top, w: screenW, h: Math.round(screenW * 9 / 16) },
        ...(chat ? { chat: { x: W - 400 - g, y: top, w: 400, h: fullH } } : {}),
      };
    }
    case 'cam-center': {
      const camW = Math.round(1180 * camSize);
      const camH = Math.round(camW * 9 / 16);
      return {
        cam: { x: Math.round((W - camW) / 2) - (chat ? 220 : 0), y: top + Math.max(0, Math.round((fullH - camH) / 2)), w: camW, h: Math.min(camH, fullH) },
        ...(chat ? { chat: { x: W - 400 - g, y: top, w: 400, h: fullH } } : {}),
      };
    }
    case 'screen-corner': {
      const camW = Math.round(520 * camSize);
      const camH = Math.round(camW * 9 / 16);
      return { screen: { x: 0, y: 0, w: W, h: H }, cam: cornerRect(corner, camW, camH, g, 70, 80) };
    }
    case 'duo': {
      const cols = chat ? W - 400 - 4 * g : W - 3 * g;
      const each = Math.round(cols / 2);
      const h = Math.min(fullH, Math.round(each * 9 / 16) + 120);
      const y = top + Math.round((fullH - h) / 2);
      return {
        cam: { x: g, y, w: each, h }, cam2: { x: 2 * g + each, y, w: each, h },
        ...(chat ? { chat: { x: W - 400 - g, y: top, w: 400, h: fullH } } : {}),
      };
    }
    case 'squad': {
      const cols = chat ? W - 400 - 4 * g : W - 3 * g;
      const each = Math.round(cols / 2);
      const h = Math.round((fullH - g) / 2);
      return {
        cam: { x: g, y: top, w: each, h }, cam2: { x: 2 * g + each, y: top, w: each, h },
        cam3: { x: g, y: top + h + g, w: each, h }, cam4: { x: 2 * g + each, y: top + h + g, w: each, h },
        ...(chat ? { chat: { x: W - 400 - g, y: top, w: 400, h: fullH } } : {}),
      };
    }
    case 'game-duo': {
      const side = Math.round(500 * camSize);
      const screenW = W - 3 * g - side;
      const camH = Math.round((fullH - g) / 2);
      return {
        screen: { x: g, y: top, w: screenW, h: Math.min(Math.round(screenW * 9 / 16), fullH) },
        cam: { x: 2 * g + screenW, y: top, w: side, h: camH },
        cam2: { x: 2 * g + screenW, y: top + camH + g, w: side, h: camH },
      };
    }
    case 'vertical': {
      const camH = fullH;
      const camW = Math.round(camH * 9 / 16 * camSize);
      const screenW = W - 3 * g - camW - (chat ? 380 + g : 0);
      return {
        cam: { x: g, y: top, w: camW, h: camH },
        screen: { x: 2 * g + camW, y: top, w: screenW, h: Math.min(Math.round(screenW * 9 / 16), fullH) },
        ...(chat ? { chat: { x: W - 380 - g, y: top, w: 380, h: fullH } } : {}),
      };
    }
    case 'theater': {
      const screenW = 1560;
      const screenH = Math.round(screenW * 9 / 16);
      const camW = Math.round(440 * camSize);
      const camH = Math.round(camW * 9 / 16);
      return { screen: { x: Math.round((W - screenW) / 2), y: Math.round((H - screenH) / 2), w: screenW, h: screenH }, cam: cornerRect(corner, camW, camH, g, 70, 80) };
    }
    case 'screen-top': {
      const stripH = Math.round(300 * camSize);
      const screenH = H - top - stripH - 2 * g - 20;
      const screenW = Math.round(screenH * 16 / 9);
      const camW = Math.round(stripH * 16 / 9);
      return {
        screen: { x: Math.round((W - screenW) / 2), y: top, w: screenW, h: screenH },
        cam: { x: g, y: H - stripH - g - 20, w: camW, h: stripH },
        ...(chat ? { chat: { x: camW + 2 * g, y: H - stripH - g - 20, w: W - camW - 3 * g, h: stripH } } : {}),
      };
    }
    case 'split': {
      const each = Math.round((W - 3 * g) / 2);
      return { cam: { x: g, y: top, w: each, h: fullH }, screen: { x: 2 * g + each, y: top, w: each, h: fullH } };
    }
    default: { // screen-cam: game big, camera and chat in a side column
      const side = Math.round(560 * camSize);
      const screenW = W - 3 * g - side;
      const camH = Math.round(side * 9 / 16);
      return {
        screen: { x: g, y: top, w: screenW, h: Math.min(Math.round(screenW * 9 / 16), fullH) },
        cam: { x: 2 * g + screenW, y: top, w: side, h: camH },
        ...(chat ? { chat: { x: 2 * g + screenW, y: top + camH + g, w: side, h: fullH - camH - g } } : {}),
      };
    }
  }
};

const mirrorRect = (r: Rect): Rect => ({ ...r, x: W - r.x - r.w });

/** A small camera pinned to one corner, clear of the title bar on top and the socials at the bottom. */
const cornerRect = (corner: string, w: number, h: number, g: number, topPad: number, bottomPad: number): Rect => ({
  x: corner.endsWith('r') ? W - w - g : g,
  y: corner.startsWith('t') ? topPad + g : H - h - g - bottomPad,
  w, h,
});

/** A path with the whole canvas filled and every slot cut out (even-odd), as an SVG mask image. */
const holesMask = (rects: Rect[], radius: number, circle: Rect | null) => {
  const rr = (r: Rect) => {
    const k = Math.min(radius, r.w / 2, r.h / 2);
    return `M${r.x + k} ${r.y}H${r.x + r.w - k}Q${r.x + r.w} ${r.y} ${r.x + r.w} ${r.y + k}V${r.y + r.h - k}Q${r.x + r.w} ${r.y + r.h} ${r.x + r.w - k} ${r.y + r.h}H${r.x + k}Q${r.x} ${r.y + r.h} ${r.x} ${r.y + r.h - k}V${r.y + k}Q${r.x} ${r.y} ${r.x + k} ${r.y}Z`;
  };
  const circlePath = (r: Rect) => {
    const rad = Math.min(r.w, r.h) / 2, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    return `M${cx - rad} ${cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`;
  };
  const d = `M0 0H${W}V${H}H0Z` + rects.map(rr).join('') + (circle ? circlePath(circle) : '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path fill-rule="evenodd" fill="#fff" d="${d}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const pct = (r: Rect): CSSProperties => ({ left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.w / W) * 100}%`, height: `${(r.h / H) * 100}%` });

const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(id); }, []);
  return <span className="cs-clock">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
};

const LABELS: Record<Slot, string> = { cam: tx('KAMERA'), cam2: tx('KAMERA 2'), cam3: tx('KAMERA 3'), cam4: tx('KAMERA 4'), screen: tx('GRA / EKRAN'), chat: tx('CZAT') };

export const CamScene = ({ params }: { params: Params }) => {
  const colors = (params.colors as string[]) ?? ['#ff5900', '#ff2d6f', '#7a5cff'];
  const g = Number(params.gap ?? 24);
  const radius = Number(params.radius ?? 18);
  let slots = camLayout(String(params.layout ?? 'screen-cam'), g, Boolean(params.chat), Number(params.camSize ?? 1), String(params.camCorner ?? 'bl'));
  if (params.mirror) slots = Object.fromEntries(Object.entries(slots).map(([k, r]) => [k, mirrorRect(r!)])) as typeof slots;
  const round = params.camShape === 'circle' && slots.cam;
  const holes = (Object.entries(slots) as [Slot, Rect][]).filter(([k]) => !(round && k === 'cam')).map(([, r]) => r);
  const fullScreen = slots.screen && slots.screen.w === W && slots.screen.h === H;
  const mask = holesMask(fullScreen ? holes.filter((r) => r !== slots.screen) : holes, radius, round ? slots.cam! : null);
  const effect = String(params.effect ?? 'none');
  const socials = parseSocials(String(params.socials ?? ''));
  const preview = Boolean(params._preview);
  const style: Vars = {
    '--c1': colors[0], '--c2': colors[1] ?? colors[0], '--c3': colors[2] ?? colors[1] ?? colors[0],
    '--base': String(params.base ?? '#07070c'), '--fg': String(params.textColor ?? '#ffffff'),
    '--font': SCENE_FONTS[String(params.font ?? 'poppins')] ?? SCENE_FONTS.dm,
    '--thick': `${params.thickness ?? 4}px`, '--radius': `${radius}px`, '--glow': `${params.glow ?? 14}px`,
    '--grad': `conic-gradient(from var(--neon-angle), ${[...colors, colors[0]].join(', ')})`,
    '--spin': `${4 / Math.max(0.1, Number(params.speed ?? 1))}s`,
  };
  const cam = slots.cam!;
  const border = String(params.border ?? 'gradient');

  return (
    <div className={`sc-root cs-root ov-neon ${params.anim === 'spin' ? 'is-spinning' : ''}`} style={style}>
      {/* Preview only: stand-ins for the OBS sources that will sit under the holes. */}
      {preview && (Object.entries(slots) as [Slot, Rect][]).map(([k, r]) => (
        <div key={k} className={`cs-ph ph-${k} ${round && k === 'cam' ? 'is-round' : ''}`} style={pct(r)}>
          {k.startsWith('cam') && <div className="st-cam" aria-hidden><span /></div>}
          <b>{translate(isLang(params._lang) ? params._lang : 'pl', LABELS[k])}</b>
        </div>
      ))}

      {!fullScreen && (
        <div className="sc-layers" style={{ WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}>
          <Background bg={String(params.bg ?? 'aurora')} colors={colors} params={params} />
          {effect !== 'none' && EFFECT_DEFAULTS[effect] && (
            <ParticleLayer key={effect} kind={(effect === 'warp' ? 'stars' : effect) as EffectKind} params={{ ...EFFECT_DEFAULTS[effect], ...(effect === 'confetti' ? { colors } : {}) }} />
          )}
          {params.vignette && <div className="sc-vignette" />}
        </div>
      )}

      {border !== 'none' && (Object.entries(slots) as [Slot, Rect][]).filter(([k]) => !(fullScreen && k === 'screen')).filter(([k]) => k !== 'chat' || params.frameChat !== false).map(([k, r]) => (
        <div key={k} className={`cs-frame border-${border} ${round && k === 'cam' ? 'is-round' : ''}`} style={pct(round && k === 'cam' ? { x: r.x + (r.w - Math.min(r.w, r.h)) / 2, y: r.y + (r.h - Math.min(r.w, r.h)) / 2, w: Math.min(r.w, r.h), h: Math.min(r.w, r.h) } : r)}>
          {border === 'gradient' && <><div className="pf-ring" />{Number(params.glow) > 0 && <div className="pf-ring pf-ring-glow" />}</>}
          {k === 'chat' && params.chatTitle && params.showChatTitle !== false && <div className="cs-chat-head">{String(params.chatTitle)}</div>}
        </div>
      ))}

      <div className="sc-inner cs-inner">
        {params.showTitle !== false && params.title && (
          <div className="cs-topbar">
            {params.live !== false && <i className="cs-live" />}
            <b>{String(params.title)}</b>
            {params.showClock && <Clock />}
          </div>
        )}
        {params.showName !== false && params.name && (
          <div className="cs-name" style={pct({ x: cam.x, y: Math.min(H - 80, cam.y + cam.h + 10), w: Math.max(cam.w, 360), h: 70 })}>
            <b>{String(params.name)}</b>
            {params.showSub !== false && params.sub && <small>{String(params.sub)}</small>}
          </div>
        )}
        {params.showSocials !== false && socials.length > 0 && (
          <div className="sc-socials cs-socials">
            {socials.map((s, i) => (
              <span key={i} className="sc-social" style={{ '--brand': BRAND_COLORS[s.brand], '--i': i } as Vars}>
                <BrandIcon brand={s.brand} />{s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {params.showFaceit && (
        <div className="cs-faceit" style={{ ...pct(cam), '--inset': '0px' } as Vars}>
          <FaceitStats params={{ ...params, source: 'api', statsScale: Number(params.statsScale ?? 1.4) }} />
        </div>
      )}
    </div>
  );
};
