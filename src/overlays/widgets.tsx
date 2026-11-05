import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';
import { SCENE_FONTS } from './SceneScreen';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export const TickerWidget = ({ params }: { params: Params }) => {
  const items = String(params.text ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(20);
  const speed = params.speed as number;

  // One copy of the text scrolls by at a fixed px/s, whatever its length.
  useLayoutEffect(() => {
    const half = (trackRef.current?.scrollWidth ?? 0) / 2;
    if (half > 0) setDuration(half / Math.max(10, speed));
  }, [params.text, params.fontSize, params.font, speed]);

  const style: Vars = {
    '--bg': params.bg as string,
    '--fg': params.textColor as string,
    '--accent': params.accent as string,
    '--fs': `${params.fontSize}px`,
    '--dur': `${duration}s`,
    '--font': SCENE_FONTS[params.font as string] ?? SCENE_FONTS.dm,
  };
  const run = items.map((t, i) => (
    <span key={i} className="wd-tick-item">
      {t}
      {params.showSeparator !== false && <i>{params.separator as string}</i>}
    </span>
  ));
  return (
    <div className={`ov-fill wd-ticker style-${params.style}`} style={style}>
      {params.showLabel !== false && params.label && <div className="wd-tick-label">{params.label as string}</div>}
      <div className="wd-tick-viewport">
        <div className="wd-tick-track" ref={trackRef}>
          {run}
          {run}
        </div>
      </div>
    </div>
  );
};

export const SocialsWidget = ({ params }: { params: Params }) => {
  const list = parseSocials(String(params.items ?? ''));
  const [index, setIndex] = useState(0);
  const every = (params.every as number) * 1000;

  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), every);
    return () => clearInterval(id);
  }, [list.length, every]);

  if (!list.length) return null;
  const item = list[index % list.length];
  const brandColor = params.brandColors ? BRAND_COLORS[item.brand] : (params.accent as string);
  const style: Vars = {
    '--bg': params.bg as string,
    '--fg': params.textColor as string,
    '--accent': brandColor,
    '--fs': `${params.fontSize}px`,
  };
  return (
    <div className={`ov-fill wd-socials align-${params.align}`} style={style}>
      <div key={index} className={`wd-soc style-${params.style} anim-${params.anim}`}>
        {params.showIcon !== false && <span className="wd-soc-icon"><BrandIcon brand={item.brand} size="1.3em" /></span>}
        <span className="wd-soc-text">{item.label}</span>
        {params.progress && list.length > 1 && (
          <span className="wd-soc-bar" style={{ animationDuration: `${every}ms` }} />
        )}
      </div>
    </div>
  );
};
