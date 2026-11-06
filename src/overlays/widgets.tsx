import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { BRAND_COLORS, BRAND_INK, BrandIcon, parseSocials } from './icons';
import { SCENE_FONTS } from './SceneScreen';
import { useRotation } from './useRotation';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const Clock = ({ h12 }: { h12: boolean }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(id); }, []);
  return <>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: h12 })}</>;
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

/**
 * Socials rotator. Layouts: one at a time, row, column, 2-column grid, icons (only the active one shows its text)
 * and a continuous marquee. Everything is drawn at a size that fits the OBS source, so nothing gets cut.
 */
export const SocialsWidget = ({ params }: { params: Params }) => {
  const parsed = parseSocials(String(params.items ?? ''));
  const shuffleKey = params.shuffle ? String(params.items) : '';
  // Shuffled once per list, so the order does not jump on every render.
  const list = useMemo(() => (shuffleKey ? [...parsed].sort(() => Math.random() - 0.5) : parsed), [shuffleKey, String(params.items)]); // eslint-disable-line react-hooks/exhaustive-deps
  const every = Number(params.every ?? 5) * 1000;
  const layout = String(params.layout ?? 'one');
  const index = useRotation(layout === 'marquee' ? 0 : list.length, every);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  // Hidden copies of the layout (one per active item) give the largest size it ever takes; the font scales to fit the source.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const cs = getComputedStyle(root);
      const current = parseFloat(cs.getPropertyValue('--fit')) || 1;
      const roomW = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const roomH = root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let w = 0, h = 0;
      root.querySelectorAll<HTMLElement>('.wd-soc-ghost').forEach((g) => { w = Math.max(w, g.offsetWidth); h = Math.max(h, g.offsetHeight); });
      if (!w || !h) return;
      const byW = layout === 'marquee' ? Infinity : roomW / (w / current);
      const next = Math.max(0.25, Math.min(1, Math.min(byW, roomH / (h / current)) * 0.98));
      setFit((f) => (Math.abs(f - next) > 0.004 ? next : f));
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [layout, list.length, params.items, params.fontSize, params.font, params.style, params.textMode, params.uppercase, params.showIcon, params.showPrefix, params.prefix, params.gap]);

  if (!list.length) return null;

  const colorOf = (brand: keyof typeof BRAND_COLORS) => (params.brandColors !== false ? BRAND_COLORS[brand] : String(params.accent ?? '#ff5900'));
  // Without brand colours the accent is the user's own pick, which is assumed dark enough for white.
  const inkOf = (brand: keyof typeof BRAND_INK) => (params.brandColors !== false ? BRAND_INK[brand] : '#fff');
  const textOf = (label: string) => (params.textMode === 'handle' ? handleOf(label) : label);
  const style: Vars = {
    '--bg': String(params.bg ?? '#111114'),
    '--fg': String(params.textColor ?? '#ffffff'),
    '--fs': `${params.fontSize ?? 26}px`,
    '--fit': fit,
    '--radius': `${params.radius ?? 999}px`,
    '--gap': `${params.gap ?? 14}px`,
    '--font': SCENE_FONTS[String(params.font ?? 'dm')] ?? SCENE_FONTS.dm,
    '--loop': `${Math.max(6, (every / 1000) * list.length)}s`,
  };
  const cls = [
    'ov-fill wd-socials', `layout-${layout}`, `align-${params.align ?? 'left'}`, `icon-${params.iconShape ?? 'circle'}`,
    params.uppercase ? 'is-upper' : '', params.shadow === false ? 'no-shadow' : '', params.dimOthers === false ? 'no-dim' : '',
  ].join(' ');
  const styleName = String(params.style ?? 'pill');
  const chip = (item: (typeof list)[number], active: boolean, key: string | number, animated = true) => (
    <div key={key} className={`wd-soc style-${styleName} ${layout === 'one' && animated ? `anim-${params.anim ?? 'slide'}` : ''} ${active ? 'is-active' : ''} ${inkOf(item.brand) !== '#fff' ? 'on-light' : ''}`}
      style={{ '--accent': colorOf(item.brand), '--ink': inkOf(item.brand) } as Vars}>
      {params.showIcon !== false && <span className="wd-soc-icon"><BrandIcon brand={item.brand} size="1.3em" /></span>}
      <span className="wd-soc-text"><span>{textOf(item.label)}</span></span>
      {animated && params.progress !== false && active && list.length > 1 && layout !== 'marquee' && <span className="wd-soc-bar" style={{ animationDuration: `${every}ms` }} />}
    </div>
  );
  const prefix = params.showPrefix && params.prefix ? <span className="wd-soc-prefix">{String(params.prefix)}</span> : null;
  const content = (active: number, animated: boolean) => {
    if (layout === 'one') return chip(list[active], true, animated ? active : 0, animated);
    if (layout === 'marquee') return <div className="wd-soc-run">{list.map((item, i) => chip(item, true, i, animated))}</div>;
    return list.map((item, i) => chip(item, i === active, i, animated));
  };
  const ghosts = layout === 'one' || layout === 'icons' ? list.map((_, a) => a) : [0];
  return (
    <div ref={rootRef} className={cls} style={style}>
      <div className="wd-soc-wrap">
        {prefix}
        {layout === 'marquee' ? (
          <div className="wd-soc-marquee"><div className="wd-soc-track">{content(0, true)}{content(0, true)}</div></div>
        ) : layout === 'one' || layout === 'icons' ? content(index, true) : <div className="wd-soc-group">{content(index, true)}</div>}
      </div>
      <div className="wd-soc-ghosts" aria-hidden>
        {ghosts.map((a) => (
          <div key={a} className="wd-soc-wrap wd-soc-ghost">
            {prefix}
            {layout === 'one' || layout === 'icons' || layout === 'marquee' ? content(a, false) : <div className="wd-soc-group">{content(a, false)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
