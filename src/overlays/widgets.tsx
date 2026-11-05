import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';
import { SCENE_FONTS } from './SceneScreen';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const Clock = ({ h12 }: { h12: boolean }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(id); }, []);
  return <>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: h12 })}</>;
};

/** Index that moves to the next item every `ms` (stays at 0 when there is only one item). */
const useRotation = (count: number, ms: number) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => clearInterval(id);
  }, [count, ms]);
  return count ? index % count : 0;
};

export const TickerWidget = ({ params }: { params: Params }) => {
  const items = String(params.text ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(20);
  const speed = Number(params.speed ?? 110);
  const mode = String(params.mode ?? 'scroll');
  const index = useRotation(mode === 'rotate' ? items.length : 0, Number(params.every ?? 6) * 1000);

  // One copy of the text scrolls by at a fixed px/s, whatever its length.
  useLayoutEffect(() => {
    const half = (trackRef.current?.scrollWidth ?? 0) / 2;
    if (half > 0) setDuration(half / Math.max(10, speed));
  }, [params.text, params.fontSize, params.font, params.uppercase, speed, mode]);

  const style: Vars = {
    '--bg': String(params.bg ?? '#111114'),
    '--fg': String(params.textColor ?? '#ffffff'),
    '--accent': String(params.accent ?? '#ff5900'),
    '--fs': `${params.fontSize ?? 28}px`,
    '--dur': `${duration}s`,
    '--radius': `${params.radius ?? 14}px`,
    '--font': SCENE_FONTS[String(params.font ?? 'dm')] ?? SCENE_FONTS.dm,
  };
  const sep = params.showSeparator !== false && <i>{String(params.separator ?? '◆')}</i>;
  const run = items.map((t, i) => <span key={i} className="wd-tick-item">{t}{sep}</span>);
  const cls = [
    'ov-fill wd-ticker', `style-${params.style ?? 'solid'}`, `label-${params.labelStyle ?? 'angled'}`, `border-${params.borderPos ?? 'top'}`,
    params.uppercase ? 'is-upper' : '', params.fadeEdges !== false ? 'has-fade' : '', params.direction === 'right' ? 'dir-right' : '',
  ].join(' ');
  return (
    <div className={cls} style={style}>
      {params.showLabel !== false && params.label && (
        <div className="wd-tick-label">{params.liveDot && <i className="wd-live" />}{String(params.label)}</div>
      )}
      <div className="wd-tick-viewport">
        {mode === 'rotate' ? (
          <div key={index} className={`wd-tick-one anim-${params.rotateAnim ?? 'up'}`}>{items[index]}</div>
        ) : (
          <div className="wd-tick-track" ref={trackRef}>{run}{run}</div>
        )}
      </div>
      {params.showClock && <div className="wd-tick-clock"><Clock h12={params.clock12 === true} /></div>}
    </div>
  );
};

/** "twitch.tv/skullboypl" → "skullboypl"; addresses without a path stay whole. */
const handleOf = (label: string) => {
  const clean = label.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  const i = clean.lastIndexOf('/');
  return i >= 0 ? clean.slice(i + 1) : clean;
};

export const SocialsWidget = ({ params }: { params: Params }) => {
  const parsed = parseSocials(String(params.items ?? ''));
  const shuffleKey = params.shuffle ? String(params.items) : '';
  // Shuffled once per list, so the order does not jump on every render.
  const list = useMemo(() => (shuffleKey ? [...parsed].sort(() => Math.random() - 0.5) : parsed), [shuffleKey, String(params.items)]); // eslint-disable-line react-hooks/exhaustive-deps
  const every = Number(params.every ?? 5) * 1000;
  const index = useRotation(list.length, every);
  const layout = String(params.layout ?? 'one');
  if (!list.length) return null;

  const colorOf = (brand: keyof typeof BRAND_COLORS) => (params.brandColors !== false ? BRAND_COLORS[brand] : String(params.accent ?? '#ff5900'));
  const textOf = (label: string) => (params.textMode === 'handle' ? handleOf(label) : label);
  const style: Vars = {
    '--bg': String(params.bg ?? '#111114'),
    '--fg': String(params.textColor ?? '#ffffff'),
    '--fs': `${params.fontSize ?? 26}px`,
    '--radius': `${params.radius ?? 999}px`,
    '--gap': `${params.gap ?? 14}px`,
    '--font': SCENE_FONTS[String(params.font ?? 'dm')] ?? SCENE_FONTS.dm,
  };
  const cls = `ov-fill wd-socials layout-${layout} align-${params.align ?? 'left'} icon-${params.iconShape ?? 'circle'} ${params.uppercase ? 'is-upper' : ''} ${params.shadow === false ? 'no-shadow' : ''}`;
  const chip = (item: (typeof list)[number], active: boolean, key: string | number) => (
    <div key={key} className={`wd-soc style-${params.style ?? 'pill'} ${layout === 'one' ? `anim-${params.anim ?? 'slide'}` : ''} ${active ? 'is-active' : ''}`}
      style={{ '--accent': colorOf(item.brand) } as Vars}>
      {params.showIcon !== false && <span className="wd-soc-icon"><BrandIcon brand={item.brand} size="1.3em" /></span>}
      <span className="wd-soc-text">{textOf(item.label)}</span>
      {params.progress !== false && active && list.length > 1 && <span className="wd-soc-bar" style={{ animationDuration: `${every}ms` }} />}
    </div>
  );
  return (
    <div className={cls} style={style}>
      {params.showPrefix && params.prefix && <span className="wd-soc-prefix">{String(params.prefix)}</span>}
      {layout === 'one' ? chip(list[index], true, index) : list.map((item, i) => chip(item, i === index, i))}
    </div>
  );
};
