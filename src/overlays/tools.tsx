// Streamer tools: clock, countdown / stopwatch, goal bar, follow reminder and a QR code card.
// Every one scales with its OBS source (container units), so resizing the source is all it takes.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import type { Params } from './schema';
import { BRAND_COLORS, BRAND_INK, BrandIcon, detectBrand } from './icons';
import { SCENE_FONTS } from './SceneScreen';
import { isLang, translate } from '../i18n';
import { timerValue, usePanel } from '../panel/panel';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const langOf = (p: Params) => (isLang(p._lang) ? p._lang : 'pl');
const num = (v: unknown, d = 0) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : d;
};

/** Current time, re-rendered every `ms`. */
const useNow = (ms = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
};

/** Shared look: colours, font, card style and size, all as CSS variables on the root. */
const lookVars = (p: Params, extra: Vars = {}): Vars => ({
  '--accent': String(p.accent ?? '#ff5900'),
  '--accent2': String(p.accent2 ?? p.accent ?? '#ff2d95'),
  '--bg': String(p.bg ?? '#111114'),
  '--fg': String(p.textColor ?? '#ffffff'),
  '--radius': `${p.radius ?? 18}px`,
  '--s': num(p.scale, 100) / 100,
  '--font': SCENE_FONTS[String(p.font ?? 'dm')] ?? SCENE_FONTS.dm,
  ...extra,
});

const Shell = ({ p, kind, children, className = '' }: { p: Params; kind: string; children: ReactNode; className?: string }) => (
  <div className={`ov-fill tl-root tl-${kind} align-${p.align ?? 'center'} ${className}`} style={lookVars(p)}>
    <div className={`tl-card style-${p.style ?? 'glass'} ${p.shadow === false ? 'no-shadow' : ''}`}>{children}</div>
  </div>
);

const pad = (n: number) => String(n).padStart(2, '0');
const hms = (ms: number, alwaysHours = false) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h || alwaysHours ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

/* ---------------- clock ---------------- */
export const ClockWidget = ({ params: p }: { params: Params }) => {
  const now = useNow(1000);
  const lang = langOf(p);
  const tz = p.tz && p.tz !== 'local' ? String(p.tz) : undefined;
  const h12 = p.clock12 === true;
  const parts = new Intl.DateTimeFormat(lang, {
    hour: '2-digit', minute: '2-digit', second: p.seconds ? '2-digit' : undefined, hour12: h12, timeZone: tz,
  }).formatToParts(now);
  const date = new Intl.DateTimeFormat(lang, {
    weekday: p.dateFormat === 'short' ? 'short' : 'long', day: 'numeric', month: p.dateFormat === 'numeric' ? '2-digit' : 'long',
    year: p.dateFormat === 'numeric' ? 'numeric' : undefined, timeZone: tz,
  }).format(now);
  return (
    <Shell p={p} kind="clock" className={`layout-${p.layout ?? 'stack'}`}>
      {p.showLabel && p.label && <div className="tl-label">{String(p.label)}</div>}
      <div className="tl-clock-body">
        <div className="tl-big">
          {parts.map((part, i) => part.type === 'literal' && part.value.includes(':')
            ? <span key={i} className={p.blink !== false ? 'tl-colon' : ''}>:</span>
            : part.type === 'dayPeriod' ? <small key={i} className="tl-ampm">{part.value}</small> : <span key={i}>{part.value}</span>)}
        </div>
        {p.showDate !== false && <div className="tl-sub">{date}</div>}
      </div>
    </Shell>
  );
};

/* ---------------- countdown / stopwatch ---------------- */
/** Next occurrence of "HH:MM" (today, or tomorrow if it already passed). */
const nextAt = (hhmm: string, from: number) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date(from);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (d.getTime() <= from) d.setDate(d.getDate() + 1);
  return d.getTime();
};
/** Last occurrence of "HH:MM" (today, or yesterday if it is still ahead). */
const lastAt = (hhmm: string, from: number) => {
  const next = nextAt(hhmm, from);
  return next === null ? null : next - 86_400_000;
};

export const TimerWidget = ({ params: p }: { params: Params }) => {
  const now = useNow(250);
  const start = useRef(Date.now()).current;
  const panel = usePanel();
  const pt = panel?.state.timer ?? null;
  const mode = pt ? pt.mode : String(p.mode ?? 'countdown');
  const total = (num(p.minutes, 5) * 60 + num(p.secs, 0)) * 1000;

  let left = 0, up = 0, frac = 0, counting = true;
  if (pt) {
    // Driven from the OBS panel: start / pause / reset / +1 min come from the dock.
    const v = timerValue(pt, panel!.serverNow());
    if (pt.mode === 'countdown') { left = v; frac = pt.total ? Math.min(1, 1 - v / pt.total) : 1; }
    else { counting = false; up = v; }
  } else if (mode === 'countdown') {
    const passed = now - start;
    const cycle = p.loop && total > 0 ? passed % total : passed;
    left = total - cycle;
    frac = total ? Math.min(1, cycle / total) : 1;
  } else if (mode === 'until') {
    const end = nextAt(String(p.at ?? '20:00'), start) ?? start;
    left = end - now;
    frac = Math.min(1, (now - start) / Math.max(1, end - start));
  } else {
    counting = false;
    const from = mode === 'uptime' ? lastAt(String(p.since ?? '20:00'), start) ?? start : start;
    up = now - from;
  }
  const done = counting && left <= 0;
  if (done && p.onDone === 'hide') return null;
  const value = counting ? hms(left, p.alwaysHours === true) : hms(up, p.alwaysHours === true);
  const urgent = counting && !done && p.urgent !== false && left <= 10_000;

  return (
    <Shell p={p} kind="timer" className={`${urgent ? 'is-urgent' : ''} ${done ? 'is-done' : ''}`}>
      {p.showLabel !== false && p.label && <div className="tl-label">{String(p.label)}</div>}
      <div className="tl-big tl-digits">{done && p.onDone !== 'zero' ? String(p.doneText ?? '') : value}</div>
      {counting && p.progress !== false && <div className="tl-progress"><i style={{ width: `${frac * 100}%` }} /></div>}
    </Shell>
  );
};

/* ---------------- goal bar ---------------- */
const fmtNum = (n: number, lang: string) => n.toLocaleString(lang, { maximumFractionDigits: 2 });

type Channel = { name: string; avatar: string; count: number };
const ERRORS: Record<string, string> = {
  channel_not_found: 'Nie ma takiego kanału',
  bad_channel: 'Wpisz nazwę kanału',
  count_hidden: 'Ten kanał ukrywa liczbę subskrypcji',
};

/** Live follower / subscriber count from /api/followers, refreshed every minute. */
const useChannel = (platform: string, channel: string) => {
  const [state, setState] = useState<{ data: Channel | null; error: string }>({ data: null, error: '' });
  useEffect(() => {
    if (platform === 'manual') { setState({ data: null, error: '' }); return; }
    if (!channel.trim()) { setState({ data: null, error: 'bad_channel' }); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/followers?platform=${platform}&channel=${encodeURIComponent(channel.trim())}`);
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && typeof body.count === 'number') setState({ data: { name: body.name, avatar: body.avatar, count: body.count }, error: '' });
        else setState((s) => ({ data: s.data, error: body.error ?? 'upstream' }));
      } catch {
        if (alive) setState((s) => ({ data: s.data, error: 'upstream' }));
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [platform, channel]);
  return state;
};

export const GoalWidget = ({ params: p }: { params: Params }) => {
  const lang = langOf(p);
  const platform = String(p.source ?? 'manual');
  const live = useChannel(platform, String(p.channel ?? ''));
  const panel = usePanel();
  // Without a working API answer the bar falls back to the number typed in the studio (or set in the OBS panel).
  const panelCurrent = panel?.state.goal.current;
  const current = live.data ? live.data.count : panelCurrent ?? num(p.current, 0);
  const prev = useRef<number | null>(null);
  const [bump, setBump] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    if (!live.data) return undefined;
    const before = prev.current;
    prev.current = live.data.count;
    if (before === null || live.data.count <= before || p.bump === false) return undefined;
    setBump({ n: live.data.count - before, key: Date.now() });
    const id = window.setTimeout(() => setBump(null), 4500);
    return () => window.clearTimeout(id);
  }, [live.data?.count]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = Math.max(1e-9, panel?.state.goal.target ?? num(p.target, 100));
  const pct = Math.max(0, Math.min(1, current / target));
  const reached = current >= target;
  const unit = String(p.unit ?? '');
  const numbers = `${fmtNum(current, lang)} / ${fmtNum(target, lang)}${unit ? ` ${unit}` : ''}`;
  const look = String(p.look ?? 'stacked');
  const [shown, setShown] = useState(p.animate === false ? pct : 0);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(pct), 120);
    return () => window.clearTimeout(id);
  }, [pct]);
  const title = reached && p.celebrate !== false && p.reachedText ? String(p.reachedText) : String(p.title ?? '');

  const bar = (
    <div className={`tl-goal-bar ${p.shimmer !== false ? 'has-shimmer' : ''}`}>
      <i style={{ width: `${shown * 100}%` }} />
      {look === 'bar' && <span className="tl-goal-inbar"><b>{title}</b><span>{p.showNumbers !== false && numbers}{p.showPercent !== false && ` · ${Math.round(pct * 100)}%`}</span></span>}
    </div>
  );
  // The server has no Twitch / YouTube keys yet: an honest "coming soon" card instead of made-up numbers.
  if (platform !== 'manual' && (live.error === 'not_configured' || live.error === 'unavailable')) {
    return (
      <Shell p={p} kind="goal" className="is-soon">
        <div className="tl-goal-head">
          <span className="tl-label">{String(p.title ?? '')}</span>
          <span className="tl-soon">{translate(lang, 'Wkrótce')}</span>
        </div>
        <div className="tl-goal-bar"><i style={{ width: '0%' }} /></div>
        <div className="tl-goal-error">{translate(lang, platform === 'twitch' ? 'Licznik followów z Twitcha pojawi się wkrótce' : platform === 'kick' ? 'Licznik followów z Kicka pojawi się wkrótce' : 'Licznik subskrypcji z YouTube pojawi się wkrótce')}</div>
      </Shell>
    );
  }
  const who = live.data && p.showChannel !== false && (
    <span className="tl-goal-who">{live.data.avatar && <img src={live.data.avatar} alt="" />}<span>{live.data.name}</span></span>
  );
  const problem = platform !== 'manual' && live.error && p._preview === true && (
    <div className="tl-goal-error">{translate(lang, ERRORS[live.error] ?? 'Nie udało się pobrać liczby, pokazuję wpisaną')}</div>
  );
  return (
    <Shell p={p} kind="goal" className={`look-${look} ${reached && p.celebrate !== false ? 'is-reached' : ''}`}>
      {who}
      {bump && <span key={bump.key} className="tl-goal-bump">+{bump.n}</span>}
      {look === 'ring' ? (
        <div className="tl-goal-ring">
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" className="tl-ring-bg" />
            <circle cx="50" cy="50" r="42" className="tl-ring-fg" style={{ strokeDashoffset: 264 - 264 * shown }} />
          </svg>
          <b className="tl-ring-pct">{Math.round(pct * 100)}%</b>
          <div className="tl-goal-text">
            <div className="tl-label">{title}</div>
            {p.showNumbers !== false && <div className="tl-sub">{numbers}</div>}
          </div>
        </div>
      ) : look === 'bar' ? bar : (
        <>
          <div className="tl-goal-head">
            <span className="tl-label">{title}</span>
            <span className="tl-sub">{p.showNumbers !== false && numbers}{p.showPercent !== false && <b> {Math.round(pct * 100)}%</b>}</span>
          </div>
          {bar}
        </>
      )}
      {problem}
      {reached && p.celebrate !== false && <div className="tl-confetti" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i } as Vars} />)}</div>}
    </Shell>
  );
};

/* ---------------- follow reminder ---------------- */
export const ReminderWidget = ({ params: p }: { params: Params }) => {
  const lines = String(p.messages ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  const preview = p._preview === true;
  const showMs = num(p.duration, 10) * 1000;
  // In the studio it comes back after 2 s, so the look can be set without waiting minutes.
  const everyMs = preview ? showMs + 2000 : Math.max(showMs + 1000, num(p.every, 5) * 60_000);
  const delayMs = preview ? 400 : num(p.delay, 20) * 1000;
  const [state, setState] = useState<{ index: number; shown: boolean; n: number }>({ index: 0, shown: false, n: 0 });
  const panel = usePanel();
  const paused = panel?.state.reminder.paused === true;
  const fired = panel?.state.reminder.fire ?? 0;
  const firstFire = useRef(fired);
  const countRef = useRef(0);
  const hideRef = useRef<number | undefined>(undefined);
  /** One appearance of the next (or a random) message. */
  const showNext = () => {
    if (!lines.length) return;
    const index = p.order === 'random' ? Math.floor(Math.random() * lines.length) : countRef.current % lines.length;
    countRef.current += 1;
    setState({ index, shown: true, n: countRef.current });
    window.clearTimeout(hideRef.current);
    hideRef.current = window.setTimeout(() => setState((s) => ({ ...s, shown: false })), showMs);
  };
  // "Show now" in the dock (ignores the value that was there before this source loaded).
  useEffect(() => {
    if (fired && fired !== firstFire.current) showNext();
  }, [fired]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lines.length || paused) return undefined;
    let loop: number | undefined;
    const first = window.setTimeout(() => {
      showNext();
      loop = window.setInterval(showNext, everyMs);
    }, delayMs);
    return () => { window.clearTimeout(first); window.clearInterval(loop); };
  }, [lines.length, everyMs, delayMs, showMs, p.order, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(hideRef.current), []);

  if (!lines.length) return null;
  const text = lines[state.index % lines.length];
  const brand = detectBrand(text);
  const accent = p.brandColors !== false && brand !== 'link' ? BRAND_COLORS[brand] : String(p.accent ?? '#ff5900');
  return (
    <div className={`ov-fill tl-root tl-reminder align-${p.align ?? 'left'}`} style={lookVars(p, { '--accent': accent, '--ink': p.brandColors !== false ? BRAND_INK[brand] : '#fff', '--show': `${showMs}ms` })}>
      <div key={state.n} className={`tl-card style-${p.style ?? 'glass'} anim-${p.anim ?? 'slide'} ${state.shown ? 'is-in' : 'is-out'} ${p.shadow === false ? 'no-shadow' : ''}`}>
        {p.showIcon !== false && (
          <span className="tl-rem-icon">{brand !== 'link' ? <BrandIcon brand={brand} size="1.25em" /> : String(p.icon ?? '❤️')}</span>
        )}
        <span className="tl-rem-text">
          {p.showTitle !== false && p.title && <b>{String(p.title)}</b>}
          <span>{text}</span>
        </span>
        {p.progress !== false && state.shown && <i className="tl-rem-bar" />}
      </div>
    </div>
  );
};

/* ---------------- QR code ---------------- */
export const QrWidget = ({ params: p }: { params: Params }) => {
  const url = String(p.url ?? '').trim() || 'https://overlays.vxh.pl';
  const brand = detectBrand(url);
  const logo = p.logo !== false && brand !== 'link';
  const path = useMemo(() => {
    const qr = qrcode(0, logo ? 'H' : 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [url, logo]);
  const caption = p.caption === 'url' ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : p.caption === 'text' ? String(p.captionText ?? '') : '';
  const q = 2; // quiet zone in modules
  return (
    <Shell p={p} kind="qr" className={`anim-${p.anim ?? 'none'}`}>
      {p.showTitle !== false && p.title && <div className="tl-label">{String(p.title)}</div>}
      <div className="tl-qr-box" style={{ '--qr-fg': String(p.qrColor ?? '#111114'), '--qr-bg': String(p.qrBg ?? '#ffffff') } as Vars}>
        <svg viewBox={`${-q} ${-q} ${path.n + q * 2} ${path.n + q * 2}`} shapeRendering="crispEdges" aria-label={url}>
          <rect x={-q} y={-q} width={path.n + q * 2} height={path.n + q * 2} fill="var(--qr-bg)" />
          <path d={path.d} fill="var(--qr-fg)" />
        </svg>
        {logo && <span className="tl-qr-logo" style={{ background: BRAND_COLORS[brand], color: BRAND_INK[brand] } as Vars}><BrandIcon brand={brand} size="70%" /></span>}
        {p.anim === 'scan' && <i className="tl-qr-scan" />}
      </div>
      {caption && <div className="tl-sub">{caption}</div>}
    </Shell>
  );
};

