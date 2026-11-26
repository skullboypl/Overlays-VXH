// Small extras: a logo / watermark in a corner and an animated headline.
import type { CSSProperties } from 'react';
import type { Params } from './schema';
import { SCENE_FONTS } from './SceneScreen';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Only http(s) images; anything else could break out of the attribute. */
const safeImage = (raw: unknown) => {
  const v = String(raw ?? '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : '';
};

/* ---------------- logo / watermark ---------------- */
export const LogoWidget = ({ params: p }: { params: Params }) => {
  const src = safeImage(p.image);
  const style: Vars = {
    '--size': `${num(p.size, 12)}%`,
    '--sz': num(p.size, 12),
    '--op': num(p.opacity, 0.85),
    '--m': `${num(p.margin, 3)}%`,
    '--speed': `${8 / Math.max(0.2, num(p.speed, 1))}s`,
    '--accent': String(p.accent ?? '#ff5900'),
    '--radius': `${num(p.radius, 0)}%`,
    '--font': SCENE_FONTS[String(p.font ?? 'poppins')] ?? SCENE_FONTS.poppins,
  };
  return (
    <div className={`ov-fill lg-root pos-${p.position ?? 'br'}`} style={style}>
      <div className={`lg anim-${p.anim ?? 'none'} ${p.glow ? 'has-glow' : ''} ${p.shadow !== false ? 'has-shadow' : ''}`}>
        {src ? <img src={src} alt="" /> : <span className="lg-text">{String(p.text || 'LOGO')}</span>}
      </div>
    </div>
  );
};

/* ---------------- animated headline ---------------- */
export const TextFxWidget = ({ params: p }: { params: Params }) => {
  const text = String(p.text ?? '');
  const effect = String(p.effect ?? 'wave');
  const style: Vars = {
    '--fs': `${num(p.fontSize, 96)}px`,
    '--c1': String(p.color ?? '#ffffff'),
    '--c2': String(p.color2 ?? '#ff5900'),
    '--c3': String(p.color3 ?? '#7a5cff'),
    '--speed': `${2 / Math.max(0.2, num(p.speed, 1))}s`,
    '--font': SCENE_FONTS[String(p.font ?? 'poppins')] ?? SCENE_FONTS.poppins,
    '--stroke': `${num(p.stroke, 0)}px`,
  };
  const letters = Array.from(text);
  return (
    <div className={`ov-fill tf-root align-${p.align ?? 'center'}`} style={style}>
      <div className={`tf fx-${effect} ${p.uppercase ? 'is-upper' : ''} ${p.shadow !== false ? 'has-shadow' : ''}`} data-text={text}>
        {['wave', 'bounce', 'rainbow', 'type', 'drop'].includes(effect)
          ? letters.map((ch, i) => <span key={i} style={{ '--i': i, '--n': letters.length } as Vars}>{ch === ' ' ? ' ' : ch}</span>)
          : text}
      </div>
    </div>
  );
};
