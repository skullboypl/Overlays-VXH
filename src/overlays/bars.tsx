// Bars and callouts: lower third, schedule bar, single social and a QR rotator.
// Each one is drawn at a size that fits the OBS source (FitBox), so nothing gets cut off.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Params } from './schema';
import { BRAND_COLORS, BRAND_INK, BrandIcon, detectBrand } from './icons';
import { SCENE_FONTS } from './SceneScreen';
import { QrSvg } from './tools';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const lines = (v: unknown) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean);

/** Index that moves on every `ms`; `pause` freezes it. */
const useCycle = (count: number, ms: number, pause = false) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2 || pause) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms, pause]);
  return count ? i % count : 0;
};

/**
 * Scales its content down (never up) so the whole block fits the source. The content is laid out at its
 * natural size; only a transform changes, so fonts stay crisp and animations keep working.
 */
const FitBox = ({ children, className = '', deps = [] }: { children: ReactNode; className?: string; deps?: unknown[] }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const root = rootRef.current, inner = innerRef.current;
    if (!root || !inner) return;
    const measure = () => {
      const iw = inner.offsetWidth, ih = inner.offsetHeight;
      if (!iw || !ih) return;
      const next = Math.max(0.2, Math.min(1, (root.clientWidth - 16) / iw, (root.clientHeight - 12) / ih));
      setFit((f) => (Math.abs(f - next) > 0.004 ? next : f));
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(inner);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={rootRef} className={`ov-fill br-fit ${className}`} style={{ '--fit': fit } as Vars}>
      <div ref={innerRef} className="br-fit-inner">{children}</div>
    </div>
  );
};

/**
 * Text size: the px the streamer picked is what a source of `ref` px height shows; a taller or shorter
 * source scales it along (unless "scale with source height" is off). FitBox still caps it by width.
 */
const fontSize = (p: Params, def: number, ref: number) =>
  p.fitHeight === false ? `${num(p.fontSize, def)}px` : `max(9px, calc(${num(p.fontSize, def)} * 100cqh / ${ref}))`;

const lookVars = (p: Params, extra: Vars = {}): Vars => ({
  '--accent': String(p.accent ?? '#ff5900'),
  '--accent2': String(p.accent2 ?? '#ff2d95'),
  '--bg': String(p.bg ?? '#111114'),
  '--fg': String(p.textColor ?? '#ffffff'),
  '--radius': `${num(p.radius, 10)}px`,
  '--font': SCENE_FONTS[String(p.font ?? 'poppins')] ?? SCENE_FONTS.poppins,
  ...extra,
});

/* ---------------- lower third ---------------- */
/** Visible from `delay` for `duration`, then again every `every` seconds; in the studio it comes back after 1.5 s. */
const useLoopVisible = (p: Params) => {
  const always = p.show !== 'loop';
  const preview = p._preview === true;
  const showMs = num(p.duration, 8) * 1000;
  const gapMs = preview ? 1500 : Math.max(1000, num(p.every, 60) * 1000 - showMs);
  const delayMs = preview ? 300 : num(p.delay, 1) * 1000;
  const [state, setState] = useState<{ on: boolean; n: number }>({ on: always, n: 0 });
  useEffect(() => {
    if (always) { setState({ on: true, n: 0 }); return undefined; }
    let t2: number | undefined;
    let alive = true;
    const cycle = (first: boolean) => {
      t2 = window.setTimeout(() => {
        if (!alive) return;
        setState((s) => ({ on: true, n: s.n + 1 }));
        t2 = window.setTimeout(() => {
          if (!alive) return;
          setState((s) => ({ ...s, on: false }));
          cycle(false);
        }, showMs);
      }, first ? delayMs : gapMs);
    };
    cycle(true);
    return () => { alive = false; window.clearTimeout(t2); };
  }, [always, showMs, gapMs, delayMs]);
  return state;
};

export const LowerThirdWidget = ({ params: p }: { params: Params }) => {
  const { on, n } = useLoopVisible(p);
  const style = lookVars(p, { '--show': `${num(p.duration, 8)}s`, '--fs': fontSize(p, 34, 160) });
  const brand = p.icon === 'brand' ? detectBrand(String(p.sub ?? '')) : 'link';
  const iconNode = p.icon === 'none' ? null
    : p.icon === 'brand' ? <span className="lt-icon" style={{ background: BRAND_COLORS[brand], color: BRAND_INK[brand] }}><BrandIcon brand={brand} size="1.1em" /></span>
    : <span className="lt-icon lt-emoji">{String(p.emoji ?? '🎮')}</span>;
  return (
    <FitBox className={`lt-root align-${p.align ?? 'left'}`} deps={[p.title, p.sub, p.kicker, p.fontSize, p.font, p.style, p.icon, p.uppercase]}>
      <div key={n} className={`lt style-${p.style ?? 'classic'} anim-${p.anim ?? 'slide'} ${on ? 'is-in' : 'is-out'} ${p.uppercase ? 'is-upper' : ''} ${p.shadow === false ? 'no-shadow' : ''}`} style={style}>
        {iconNode}
        <div className="lt-text">
          {p.showKicker && p.kicker && <small className="lt-kicker">{String(p.kicker)}</small>}
          <b className="lt-title" data-text={String(p.title ?? '')}>{String(p.title ?? '')}</b>
          {p.showSub !== false && p.sub && <span className="lt-sub">{String(p.sub)}</span>}
        </div>
        {p.show === 'loop' && p.progress !== false && on && <i className="lt-bar" />}
      </div>
    </FitBox>
  );
};

/* ---------------- schedule ---------------- */
/** Weekday names the streamer may type, Monday first. The studio language is checked first ("so" is Saturday in Czech, Sunday in German). */
const DAY_WORDS: Record<string, Record<string, number>> = {
  pl: { pon: 0, poniedzialek: 0, poniedziałek: 0, wt: 1, wtorek: 1, sr: 2, śr: 2, sroda: 2, środa: 2, czw: 3, czwartek: 3, pt: 4, piatek: 4, piątek: 4, sob: 5, sobota: 5, nd: 6, ndz: 6, niedz: 6, niedziela: 6 },
  en: { mon: 0, monday: 0, tue: 1, tues: 1, tuesday: 1, wed: 2, wednesday: 2, thu: 3, thur: 3, thursday: 3, fri: 4, friday: 4, sat: 5, saturday: 5, sun: 6, sunday: 6 },
  de: { mo: 0, montag: 0, di: 1, dienstag: 1, mi: 2, mittwoch: 2, do: 3, donnerstag: 3, fr: 4, freitag: 4, sa: 5, samstag: 5, so: 6, sonntag: 6 },
  cs: { po: 0, pondeli: 0, pondělí: 0, ut: 1, út: 1, utery: 1, úterý: 1, st: 2, streda: 2, středa: 2, ct: 3, čt: 3, ctvrtek: 3, čtvrtek: 3, pa: 4, pá: 4, patek: 4, pátek: 4, so: 5, sobota: 5, ne: 6, nedele: 6, neděle: 6 },
  es: { lun: 0, lunes: 0, mar: 1, martes: 1, mie: 2, mié: 2, miercoles: 2, miércoles: 2, jue: 3, jueves: 3, vie: 4, viernes: 4, sab: 5, sáb: 5, sabado: 5, sábado: 5, dom: 6, domingo: 6 },
  fr: { lun: 0, lundi: 0, mar: 1, mardi: 1, mer: 2, mercredi: 2, jeu: 3, jeudi: 3, ven: 4, vendredi: 4, sam: 5, samedi: 5, dim: 6, dimanche: 6 },
  pt: { seg: 0, segunda: 0, ter: 1, terca: 1, terça: 1, qua: 2, quarta: 2, qui: 3, quinta: 3, sex: 4, sexta: 4, sab: 5, sáb: 5, sabado: 5, sábado: 5, dom: 6, domingo: 6 },
  ru: { пн: 0, понедельник: 0, вт: 1, вторник: 1, ср: 2, среда: 2, чт: 3, четверг: 3, пт: 4, пятница: 4, сб: 5, суббота: 5, вс: 6, воскресенье: 6 },
  uk: { пн: 0, понеділок: 0, вт: 1, вівторок: 1, ср: 2, середа: 2, чт: 3, четвер: 3, пт: 4, пʼятниця: 4, "п'ятниця": 4, сб: 5, субота: 5, нд: 6, неділя: 6 },
  tr: { pzt: 0, pazartesi: 0, sal: 1, salı: 1, sali: 1, çar: 2, car: 2, çarşamba: 2, per: 3, perşembe: 3, cum: 4, cuma: 4, cmt: 5, cumartesi: 5, paz: 6, pazar: 6 },
};
const dayOf = (word: string, lang: string) => {
  const w = word.toLowerCase().replace(/[.,:]/g, '');
  const own = DAY_WORDS[lang]?.[w];
  if (own !== undefined) return own;
  for (const table of Object.values(DAY_WORDS)) if (table[w] !== undefined) return table[w];
  return undefined;
};
const todayIndex = () => (new Date().getDay() + 6) % 7;

type Slot = { day: string; time: string; title: string; dayIndex?: number; off: boolean; starred: boolean };
/** "Pon 20:00 CS2" → day / time / title. A line starting with * is forced active; "Sob -" means a day off. */
const parseSlot = (line: string, lang: string): Slot => {
  const starred = line.startsWith('*');
  const parts = line.replace(/^\*\s*/, '').split(/\s+/);
  const day = parts[0] ?? '';
  const rest = parts.slice(1);
  const timeAt = rest.findIndex((w) => /^\d{1,2}[:.]\d{2}$/.test(w) || w === '-' || w === '–');
  const time = timeAt >= 0 ? rest[timeAt] : '';
  const title = rest.filter((_, i) => i !== timeAt).join(' ');
  return { day, time: time === '–' ? '-' : time, title, dayIndex: dayOf(day, lang), off: time === '-' || time === '–', starred };
};

export const ScheduleWidget = ({ params: p }: { params: Params }) => {
  const lang = String(p._lang ?? 'pl');
  const slots = lines(p.items).map((l) => parseSlot(l, lang));
  const [today, setToday] = useState(todayIndex);
  useEffect(() => { const id = window.setInterval(() => setToday(todayIndex()), 60_000); return () => window.clearInterval(id); }, []);
  const highlight = String(p.highlight ?? 'today');
  const isActive = (s: Slot) => highlight === 'star' ? s.starred : highlight === 'today' ? (s.starred || s.dayIndex === today) : false;
  const style = lookVars(p, { '--fs': fontSize(p, 26, 120) });
  if (!slots.length) return null;
  const layout = String(p.layout ?? 'row');
  return (
    <FitBox className={`sch-root align-${p.align ?? 'center'}`} deps={[p.items, p.fontSize, p.font, p.style, p.layout, p.showTitle, p.title, p.showTime, p.showDay, p.showName]}>
      <div className={`sch layout-${layout} style-${p.style ?? 'pill'} ${p.uppercase ? 'is-upper' : ''} ${p.shadow === false ? 'no-shadow' : ''} ${p.stagger !== false ? 'has-stagger' : ''}`} style={style}>
        {p.showTitle !== false && p.title && <div className="sch-title">{String(p.title)}</div>}
        <div className="sch-list">
          {slots.map((s, i) => (
            <div key={i} className={`sch-slot ${isActive(s) ? 'is-active' : ''} ${s.off ? 'is-off' : ''}`} style={{ '--i': i } as Vars}>
              {p.showDay !== false && <b className="sch-day">{s.day}</b>}
              {p.showTime !== false && <span className="sch-time">{s.off ? String(p.offText ?? '—') : s.time}</span>}
              {p.showName !== false && s.title && <small className="sch-name">{s.title}</small>}
              {isActive(s) && p.livePulse !== false && <i className="sch-dot" />}
            </div>
          ))}
        </div>
      </div>
    </FitBox>
  );
};

/* ---------------- single social ---------------- */
/** "twitch.tv/skullboypl" → "skullboypl". */
const handleOf = (label: string) => {
  const clean = label.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  const i = clean.lastIndexOf('/');
  return i >= 0 ? clean.slice(i + 1) : clean;
};

export const SingleSocialWidget = ({ params: p }: { params: Params }) => {
  const label = String(p.item ?? '').trim();
  const brand = detectBrand(label);
  const every = num(p.every, 6) * 1000;
  const loop = String(p.loop ?? 'none');
  // Re-mounting the chip replays its enter animation; the loop animations run on their own.
  const [n, setN] = useState(0);
  useEffect(() => {
    if (loop !== 'reenter') return;
    const id = window.setInterval(() => setN((v) => v + 1), every);
    return () => window.clearInterval(id);
  }, [loop, every]);
  if (!label) return null;
  const brandOn = p.brandColors !== false;
  const style: Vars = {
    '--bg': String(p.bg ?? '#111114'),
    '--fg': String(p.textColor ?? '#ffffff'),
    '--fs': fontSize(p, 34, 110),
    '--fit': 1,
    '--radius': `${num(p.radius, 999)}px`,
    '--gap': '14px',
    '--font': SCENE_FONTS[String(p.font ?? 'dm')] ?? SCENE_FONTS.dm,
    '--accent': brandOn ? BRAND_COLORS[brand] : String(p.accent ?? '#ff5900'),
    '--ink': brandOn ? BRAND_INK[brand] : '#fff',
    '--every': `${every}ms`,
  };
  const text = p.textMode === 'handle' ? handleOf(label) : label;
  const cta = p.showCta !== false && p.cta ? <span className="ss-cta">{String(p.cta)}</span> : null;
  const layout = String(p.layout ?? 'row');
  return (
    <FitBox className={`wd-socials layout-one ss-root ss-layout-${layout} align-${p.align ?? 'center'} icon-${p.iconShape ?? 'circle'} ${p.uppercase ? 'is-upper' : ''} ${p.shadow === false ? 'no-shadow' : ''}`} deps={[label, p.fontSize, p.font, p.style, p.layout, p.cta, p.showCta, p.showIcon, p.textMode]}>
      <div className="ss-wrap" style={style}>
        {layout === 'cta-top' && cta}
        <div key={n} className={`wd-soc ss-chip style-${p.style ?? 'pill'} anim-${p.anim ?? 'slide'} loop-${loop} ${BRAND_INK[brand] !== '#fff' && brandOn ? 'on-light' : ''}`}>
          {p.showIcon !== false && <span className="wd-soc-icon"><BrandIcon brand={brand} size="1.3em" /></span>}
          {layout !== 'icon' && <span className="wd-soc-text"><span>{text}</span></span>}
          {layout === 'row' && cta && <span className="ss-cta-inline">{cta}</span>}
          {loop === 'reenter' && p.progress && <span className="wd-soc-bar" style={{ animationDuration: `${every}ms` }} />}
        </div>
        {layout === 'cta-bottom' && cta}
        {p.arrow && <span className="ss-arrow">➜</span>}
      </div>
    </FitBox>
  );
};

/* ---------------- QR rotator ---------------- */
type QrItem = { url: string; title: string };
/** Each line: a link, optionally followed by a title ("https://discord.gg/x Discord"). */
const parseQr = (line: string): QrItem => {
  const m = /^(\S+)\s*(.*)$/.exec(line);
  return { url: m?.[1] ?? line, title: m?.[2]?.trim() ?? '' };
};

export const QrRotatorWidget = ({ params: p }: { params: Params }) => {
  const items = lines(p.items).map(parseQr);
  const every = num(p.every, 8) * 1000;
  const index = useCycle(items.length, every);
  const [shown, setShown] = useState<{ cur: number; prev: number | null; key: number }>({ cur: 0, prev: null, key: 0 });
  useEffect(() => {
    setShown((s) => (s.cur === index ? s : { cur: index, prev: s.cur, key: s.key + 1 }));
  }, [index]);
  if (!items.length) return null;
  const cur = items[shown.cur % items.length];
  const prev = shown.prev === null ? null : items[shown.prev % items.length];
  const transition = String(p.transition ?? 'glitch');
  const captionOf = (it: QrItem) => p.caption === 'title' ? (it.title || it.url.replace(/^https?:\/\//, '')) : p.caption === 'url' ? it.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  const style: Vars = {
    '--accent': String(p.accent ?? '#ff5900'),
    '--accent2': String(p.accent2 ?? '#ff2d95'),
    '--bg': String(p.bg ?? '#111114'),
    '--fg': String(p.textColor ?? '#ffffff'),
    '--radius': `${num(p.radius, 18)}px`,
    '--s': num(p.scale, 100) / 100,
    '--font': SCENE_FONTS[String(p.font ?? 'dm')] ?? SCENE_FONTS.dm,
    '--every': `${every}ms`,
  };
  const card = (it: QrItem, role: 'in' | 'out', key: number) => (
    <div key={`${role}-${key}`} className={`qrr-card tl-card style-${p.style ?? 'glass'} ${p.shadow === false ? 'no-shadow' : ''} tr-${transition} is-${role}`}>
      {p.showTitle !== false && (it.title || p.title) && <div className="tl-label">{it.title || String(p.title ?? '')}</div>}
      <QrSvg url={it.url} p={{ ...p, anim: 'none' }} />
      {captionOf(it) && <div className="tl-sub">{captionOf(it)}</div>}
    </div>
  );
  return (
    <div className={`ov-fill tl-root tl-qr qrr-root align-${p.align ?? 'center'}`} style={style}>
      <div className="qrr-stage">
        <div className="qrr-cards">
          {prev && transition !== 'none' && card(prev, 'out', shown.key)}
          {card(cur, 'in', shown.key)}
        </div>
        {items.length > 1 && (p.dots !== false || p.progress !== false) && (
          <div className="qrr-foot">
            {p.dots !== false && <div className="qrr-dots">{items.map((_, i) => <i key={i} className={i === shown.cur % items.length ? 'on' : ''} />)}</div>}
            {p.progress !== false && <i key={shown.key} className="qrr-bar" />}
          </div>
        )}
      </div>
    </div>
  );
};
