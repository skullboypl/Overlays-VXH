// Add-on widgets driven live from the OBS panel (dock): counters, scoreboard, subathon, wheel, manual alerts,
// confetti / hearts on a button, plus Kick chat emote rain. Without ?panel= they show the values from the link.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OverlayDef, Params } from '../schema';
import { timerValue, usePanel } from '../../panel/panel';
import { isLang, translate } from '../../i18n';
import { Card, fontOf, lines, look, num, rangeF, str, useNow, type Renderer, type Vars } from './common';

const langOf = (p: Params) => (isLang(p._lang) ? p._lang : 'pl');
const pad = (v: number) => String(v).padStart(2, '0');
const hms = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(sec % 60)}` : `${pad(m)}:${pad(sec % 60)}`;
};
/** Same number on every OBS source for the same trigger time (wheel result). */
const hash = (n: number) => { let x = Math.floor(n) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };

/** Remembers the previous value so a change can play a "bump" animation. */
const useBump = (value: number) => {
  const prev = useRef(value);
  const [bump, setBump] = useState<{ d: number; k: number } | null>(null);
  useEffect(() => {
    if (value !== prev.current) setBump({ d: value - prev.current, k: Date.now() });
    prev.current = value;
  }, [value]);
  return bump;
};

/**
 * Last trigger from the dock among `names`. Triggers that happened before the overlay opened are ignored.
 * In the studio preview (or with the demo switch on) it fires by itself every `demoMs`.
 */
const useFire = (names: string[], demoMs: number) => {
  const panel = usePanel();
  const fire = panel?.state.fire;
  const seen = useRef<Record<string, number> | null>(null);
  const [shot, setShot] = useState<{ name: string; at: number } | null>(null);
  const key = names.join();
  useEffect(() => {
    if (!fire) return;
    if (seen.current) for (const n of names) if ((fire[n] ?? 0) > (seen.current[n] ?? 0)) setShot({ name: n, at: fire[n] });
    seen.current = { ...fire };
  }, [fire, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!demoMs || !names.length) return undefined;
    let k = 0;
    const go = () => setShot({ name: names[k++ % names.length], at: Date.now() });
    const first = window.setTimeout(go, 600);
    const id = window.setInterval(go, demoMs);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [demoMs, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return shot;
};
const demoOf = (p: Params, ms: number) => (p._preview === true || p.demo === true ? ms : 0);

/* ---------------- 41 / 42 counter ---------------- */
const counterKey = (p: Params) => (p.counter === 'custom' ? str(p.customKey, 'count').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16) || 'count' : str(p.counter, 'deaths'));
const Counter: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const value = panel?.state.counters?.[counterKey(p)] ?? num(p.value, 0);
  const bump = useBump(value);
  return (
    <Card p={p} kind="counter" className={`layout-${p.layout ?? 'row'}`}>
      <div className="mo-counter-row">
        {p.icon && <span className="mo-counter-icon" aria-hidden>{str(p.icon)}</span>}
        <b key={bump?.k} className={bump ? 'is-bump' : ''}>{value.toLocaleString(langOf(p))}</b>
        {p.label && <small>{str(p.label)}</small>}
        {bump && p.showDelta !== false && <em key={`d${bump.k}`} className="mo-counter-delta">{bump.d > 0 ? `+${bump.d}` : bump.d}</em>}
      </div>
    </Card>
  );
};

/* ---------------- 43 scoreboard ---------------- */
const Scoreboard: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const a = panel?.state.counters?.left ?? num(p.scoreA, 0);
  const b = panel?.state.counters?.right ?? num(p.scoreB, 0);
  const ba = useBump(a), bb = useBump(b);
  return (
    <div className={`ov-fill mo-score style-${p.style ?? 'esport'}`} style={{ '--ca': str(p.colorA, '#ff5900'), '--cb': str(p.colorB, '#3b82f6'), '--bg': str(p.bg, '#111114'), '--fg': str(p.textColor, '#ffffff'), '--font': fontOf(p, 'russo'), '--fs': `max(10px, calc(${num(p.fontSize, 40)} * 100cqh / 120))` } as Vars}>
      <div className="mo-score-team is-a"><span>{str(p.nameA)}</span><b key={ba?.k} className={ba ? 'is-bump' : ''}>{a}</b></div>
      <div className="mo-score-mid">{p.title ? <small>{str(p.title)}</small> : null}<i>:</i></div>
      <div className="mo-score-team is-b"><b key={bb?.k} className={bb ? 'is-bump' : ''}>{b}</b><span>{str(p.nameB)}</span></div>
    </div>
  );
};

/* ---------------- 44 subathon ---------------- */
const Subathon: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const now = useNow(250);
  const [opened] = useState(() => Date.now());
  const pt = panel?.state.timer ?? null;
  const left = pt ? timerValue(pt, panel!.serverNow()) : Math.max(0, opened + num(p.hours, 4) * 3_600_000 - now);
  const total = pt ? pt.left : 0;
  const bump = useBump(Math.round(total / 1000));
  const rules = lines(p.rules);
  return (
    <Card p={p} kind="subathon">
      {p.title && <div className="mo-title">{str(p.title)}</div>}
      <div className="mo-sub-time">
        <b>{hms(left)}</b>
        {bump && bump.d > 0 && <em key={bump.k}>+{hms(bump.d * 1000)}</em>}
      </div>
      {rules.length > 0 && p.showRules !== false && <div className="mo-sub-rules">{rules.map((r, i) => <span key={i}>{r}</span>)}</div>}
      {!pt && p._preview === true && <div className="mo-foot">{translate(langOf(p), 'Czas dodajesz przyciskami +1 / +5 min w Panelu OBS')}</div>}
    </Card>
  );
};

/* ---------------- 45 wheel of fortune ---------------- */
const WHEEL_COLORS = ['#ff5900', '#ff2d95', '#7a5cff', '#3b82f6', '#22c55e', '#facc15', '#14b8a6', '#ef4444'];
const Wheel: Renderer = ({ params: p }) => {
  const items = lines(p.items).slice(0, 16);
  const n = Math.max(1, items.length);
  const autoMs = num(p.auto, 0) * 1000;
  const shot = useFire(['wheel'], autoMs || demoOf(p, 12_000));
  const [turn, setTurn] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const spinS = num(p.spin, 5);
  useEffect(() => {
    if (!shot) return undefined;
    const pickIdx = hash(shot.at) % n;
    // Land the middle of the picked slice under the pointer at the top, after a few full turns.
    setTurn((t) => { const base = Math.ceil(t / 360) * 360 + 360 * 5; return base + (360 - (pickIdx + 0.5) * (360 / n)); });
    setResult(null);
    const id = window.setTimeout(() => setResult(pickIdx), spinS * 1000);
    return () => window.clearTimeout(id);
  }, [shot, n, spinS]);
  const grad = items.map((_, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`).join(', ');
  return (
    <div className="ov-fill mo-wheel" style={{ '--font': fontOf(p, 'poppins'), '--fg': str(p.textColor, '#ffffff'), '--accent': str(p.accent, '#ff5900'), '--spin': `${spinS}s` } as Vars}>
      {p.title && <div className="mo-wheel-title">{str(p.title)}</div>}
      <div className="mo-wheel-box">
        <i className="mo-wheel-pointer" />
        <div className="mo-wheel-disc" style={{ background: `conic-gradient(${grad})`, transform: `rotate(${turn}deg)` }}>
          {items.map((t, i) => <span key={i} style={{ transform: `rotate(${(i + 0.5) * (360 / n)}deg)` }}><b>{t}</b></span>)}
        </div>
        <i className="mo-wheel-hub" />
      </div>
      {result !== null && p.showResult !== false && <div key={result + turn} className="mo-wheel-result">{items[result]}</div>}
    </div>
  );
};

/* ---------------- 49 manual alerts ---------------- */
const ALERT_ICONS: Record<string, string> = { follow: '❤️', sub: '⭐', donate: '💰', raid: '🚀', bits: '💎', host: '📺', custom: '📣' };
const ALERT_TITLES: Record<string, string> = { follow: 'Nowy follow!', sub: 'Nowy sub!', donate: 'Donacja!', raid: 'Raid!', bits: 'Bitsy!', host: 'Host!', custom: '' };
const AlertBox: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const live = panel?.state.alert ?? null;
  const [shown, setShown] = useState<{ text: string; kind: string; at: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    // Skip an alert that was already on the server when OBS opened the source.
    if (first.current) { first.current = false; if (live && Date.now() - live.at > 3000) return; }
    if (live) setShown(live);
  }, [live?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const demo = demoOf(p, 7000);
  useEffect(() => {
    if (!demo) return undefined;
    const kinds = ['follow', 'sub', 'donate', 'raid'];
    let k = 0;
    const go = () => { const kind = kinds[k++ % kinds.length]; setShown({ text: kind === 'donate' ? 'widz123 · 20 zł' : 'widz123', kind, at: Date.now() }); };
    const t0 = window.setTimeout(go, 500);
    const id = window.setInterval(go, demo);
    return () => { window.clearTimeout(t0); window.clearInterval(id); };
  }, [demo]);
  const dur = num(p.duration, 6) * 1000;
  useEffect(() => {
    if (!shown) return undefined;
    const id = window.setTimeout(() => setShown(null), dur);
    return () => window.clearTimeout(id);
  }, [shown, dur]);
  if (!shown) return null;
  const lang = langOf(p);
  const title = shown.kind === 'custom' ? '' : translate(lang, ALERT_TITLES[shown.kind] ?? '');
  return (
    <div className={`ov-fill mo-alert style-${p.style ?? 'pop'} pos-${p.position ?? 'c'}`} style={{ '--accent': str(p.accent, '#ff5900'), '--accent2': str(p.accent2, '#ff2d95'), '--bg': str(p.bg, '#111114'), '--fg': str(p.textColor, '#ffffff'), '--font': fontOf(p, 'poppins'), '--dur': `${dur}ms` } as Vars}>
      <div key={shown.at} className="mo-alert-card">
        <span className="mo-alert-icon" aria-hidden>{ALERT_ICONS[shown.kind] ?? '📣'}</span>
        <div>{title && <small>{title}</small>}<b>{shown.text}</b></div>
        <i className="mo-alert-bar" />
      </div>
    </div>
  );
};

/* ---------------- 78 / 85 bursts on a dock button ---------------- */
type Bit = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; c: string; g: string; life: number };
const BURST_KINDS = ['confetti', 'hearts', 'stars', 'money'];
const GLYPH: Record<string, string[]> = { hearts: ['❤️', '💖', '💗', '💜'], stars: ['⭐', '🌟', '✨'], money: ['💸', '💰', '💵', '🪙'] };
const Burst: Renderer = ({ params: p }) => {
  const only = str(p.only, 'all');
  const names = only === 'all' ? BURST_KINDS : [only];
  const shot = useFire(names, demoOf(p, 4500));
  const ref = useRef<HTMLCanvasElement>(null);
  const bits = useRef<Bit[]>([]);
  const pRef = useRef(p);
  pRef.current = p;
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0, last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const w = (c.width = c.clientWidth), h = (c.height = c.clientHeight);
      ctx.clearRect(0, 0, w, h);
      const list = bits.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        b.vy += 900 * dt * (h / 1080); b.vx *= 0.99; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.life -= dt;
        if (b.life <= 0 || b.y > h + 60) { list.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = Math.min(1, b.life * 2); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        if (b.g) { ctx.font = `${b.r * 2}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.g, 0, 0); }
        else { ctx.fillStyle = b.c; ctx.fillRect(-b.r, -b.r * 0.45, b.r * 2, b.r * 0.9); }
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!shot) return;
    const c = ref.current!;
    const w = c.clientWidth || 1920, h = c.clientHeight || 1080, k = h / 1080;
    const pp = pRef.current;
    const count = Math.round(num(pp.count, 120));
    const colors = Array.isArray(pp.colors) && pp.colors.length ? (pp.colors as string[]) : ['#ff5900', '#ff2d95', '#7a5cff', '#facc15', '#22c55e', '#3b82f6'];
    const from = str(pp.from, 'bottom');
    for (let i = 0; i < count; i++) {
      const side = from === 'sides' ? (i % 2 ? 1 : -1) : 0;
      const x = from === 'sides' ? (side > 0 ? 0 : w) : from === 'center' ? w / 2 : w * (0.15 + Math.random() * 0.7);
      const y = from === 'center' ? h / 2 : h + 20;
      const ang = from === 'sides' ? (side > 0 ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.7 : from === 'center' ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const sp = (from === 'center' ? 500 + Math.random() * 700 : 900 + Math.random() * 700) * k;
      const glyphs = GLYPH[shot.name];
      bits.current.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: (glyphs ? 16 + Math.random() * 14 : 6 + Math.random() * 6) * k * num(pp.size, 1),
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * (glyphs ? 3 : 14), c: colors[i % colors.length], g: glyphs ? glyphs[i % glyphs.length] : '', life: 3 + Math.random() * 1.5,
      });
    }
    if (bits.current.length > 1500) bits.current.splice(0, bits.current.length - 1500);
  }, [shot]);
  return <canvas ref={ref} className="ov-fill" />;
};

/* ---------------- 90 Kick chat emote rain ---------------- */
type Drop = { id: number; src: string; glyph: string; x: number; dur: number; size: number; drift: number };
const EMOTE = /\[emote:(\d+):[^\]]*\]/g;
const EMOJI = /\p{Extended_Pictographic}/gu;
const KickRain: Renderer = ({ params: p }) => {
  const channel = str(p.channel).trim().toLowerCase();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [status, setStatus] = useState('');
  const nextId = useRef(0);
  const pRef = useRef(p);
  pRef.current = p;
  const add = useMemo(() => (items: { src: string; glyph: string }[]) => {
    const pp = pRef.current;
    const max = num(pp.max, 40);
    setDrops((list) => {
      const out = [...list];
      for (const it of items.slice(0, num(pp.perMessage, 3))) {
        out.push({ id: nextId.current++, ...it, x: Math.random() * 100, dur: (5 + Math.random() * 3) / num(pp.speed, 1), size: num(pp.size, 1) * (0.8 + Math.random() * 0.5), drift: (Math.random() - 0.5) * 20 });
      }
      return out.slice(-max);
    });
  }, []);
  // Preview: a few emojis so the studio shows something without a live chat.
  useEffect(() => {
    if (p._preview !== true) return undefined;
    const set = ['😂', '🔥', '❤️', '😎', '👏', '💜', 'GG'];
    const id = window.setInterval(() => add([{ src: '', glyph: set[Math.floor(Math.random() * set.length)] }]), 450);
    return () => window.clearInterval(id);
  }, [p._preview, add]);
  useEffect(() => {
    if (!channel) return undefined;
    let ws: WebSocket | null = null;
    let alive = true;
    let retry: number | undefined;
    const connect = async () => {
      try {
        const r = await fetch(`/api/followers?platform=kick&channel=${encodeURIComponent(channel)}`);
        const b = await r.json().catch(() => ({}));
        const room = Number(b.chatroom ?? 0);
        if (!alive) return;
        if (!room) { setStatus(b.error === 'channel_not_found' ? 'Nie ma takiego kanału' : 'Nie udało się połączyć z czatem'); retry = window.setTimeout(connect, 60_000); return; }
        ws = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false');
        ws.onopen = () => ws?.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${room}.v2` } }));
        ws.onmessage = (e) => {
          try {
            const m = JSON.parse(String(e.data));
            if (m.event === 'pusher:ping') { ws?.send(JSON.stringify({ event: 'pusher:pong', data: {} })); return; }
            if (m.event === 'pusher_internal:subscription_succeeded') { setStatus(''); return; }
            if (!String(m.event).includes('ChatMessageEvent')) return;
            const content = String(JSON.parse(m.data)?.content ?? '');
            const pp = pRef.current;
            const items: { src: string; glyph: string }[] = [];
            if (pp.emotes !== false) for (const x of content.matchAll(EMOTE)) items.push({ src: `https://files.kick.com/emotes/${x[1]}/fullsize`, glyph: '' });
            if (pp.emojis !== false) for (const x of content.replace(EMOTE, '').matchAll(EMOJI)) items.push({ src: '', glyph: x[0] });
            if (items.length) add(items);
          } catch { /* not ours */ }
        };
        ws.onclose = () => { if (alive) retry = window.setTimeout(connect, 5000); };
      } catch { if (alive) retry = window.setTimeout(connect, 15_000); }
    };
    void connect();
    return () => { alive = false; window.clearTimeout(retry); if (ws) { ws.onclose = null; ws.close(); } };
  }, [channel, add]);
  const done = (id: number) => setDrops((l) => l.filter((d) => d.id !== id));
  return (
    <div className="ov-fill mo-rain">
      {drops.map((d) => (
        <span key={d.id} className="mo-drop" style={{ left: `${d.x}%`, animationDuration: `${d.dur}s`, '--sz': d.size, '--dx': `${d.drift}cqw` } as Vars} onAnimationEnd={() => done(d.id)}>
          {d.src ? <img src={d.src} alt="" /> : d.glyph}
        </span>
      ))}
      {status && p._preview === true && <div className="mo-rain-status">{translate(langOf(p), status)}</div>}
    </div>
  );
};

// ---------------- definitions ----------------
const W = (id: string, name: string, icon: string, size: { w: number; h: number }, description: string, fields: OverlayDef['fields'], category: OverlayDef['category'] = 'widget'): OverlayDef =>
  ({ id, name, icon, category, size, description, fields });
const COUNTER_OPTIONS = [
  { value: 'deaths', label: 'Śmierci' }, { value: 'wins', label: 'Wygrane' }, { value: 'losses', label: 'Przegrane' },
  { value: 'kills', label: 'Kille' }, { value: 'count', label: 'Licznik ogólny' }, { value: 'custom', label: 'Własna nazwa' },
];
const PANEL_HINT = 'Z Panelu OBS zmieniasz liczbę przyciskami +1 / −1; bez panelu pokazuje liczbę z linku';
const DEMO = { group: 'Test', key: 'demo', label: 'Pokaz w pętli (test)', type: 'toggle', default: false, hint: 'Odpala się samo co kilka sekund, żeby sprawdzić wygląd w OBS. Na stream wyłącz.' } as const;

export const LIVE_DEFS: OverlayDef[] = [
  W('counter', 'Licznik śmierci / wygranych', '💀', { w: 420, h: 160 }, 'Liczba śmierci, wygranych, killi albo czegokolwiek, zmieniana na żywo z Panelu OBS.', [
    { group: 'Licznik', key: 'counter', label: 'Co liczy', type: 'select', default: 'deaths', options: COUNTER_OPTIONS, hint: PANEL_HINT },
    { group: 'Licznik', key: 'customKey', label: 'Nazwa licznika w panelu', type: 'text', default: 'count2', maxLength: 16, when: { key: 'counter', is: ['custom'] }, hint: 'Ta sama nazwa w docku i w linku' },
    { group: 'Licznik', key: 'label', i18n: true, label: 'Napis', type: 'text', default: 'śmierci', maxLength: 24 },
    { group: 'Licznik', key: 'icon', label: 'Ikona', type: 'text', default: '💀', maxLength: 4 },
    { group: 'Licznik', key: 'value', label: 'Liczba (bez panelu)', type: 'range', min: 0, max: 9999, step: 1, default: 0 },
    { group: 'Licznik', key: 'showDelta', label: 'Animacja +1 przy zmianie', type: 'toggle', default: true },
    ...look('glass'),
  ]),
  W('scoreboard', 'Tablica wyników', '🆚', { w: 900, h: 120 }, 'Wynik meczu dwóch drużyn albo graczy, zmieniany z Panelu OBS.', [
    { group: 'Drużyny', key: 'nameA', label: 'Lewa strona', type: 'text', default: 'Team A', maxLength: 24 },
    { group: 'Drużyny', key: 'nameB', label: 'Prawa strona', type: 'text', default: 'Team B', maxLength: 24 },
    { group: 'Drużyny', key: 'scoreA', label: 'Wynik lewej (bez panelu)', type: 'range', min: 0, max: 99, step: 1, default: 0 },
    { group: 'Drużyny', key: 'scoreB', label: 'Wynik prawej (bez panelu)', type: 'range', min: 0, max: 99, step: 1, default: 0 },
    { group: 'Drużyny', key: 'title', label: 'Napis pośrodku', type: 'text', default: 'BO3', maxLength: 16 },
    { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'esport', options: [{ value: 'esport', label: 'Esport (ścięty)' }, { value: 'flat', label: 'Płaski' }, { value: 'glass', label: 'Szkło' }] },
    rangeF('fontSize', 'Wielkość', 16, 90, 1, 40, 'px', 'Wygląd'),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'russo', options: [{ value: 'russo', label: 'Russo' }, { value: 'bebas', label: 'Bebas' }, { value: 'poppins', label: 'Poppins' }, { value: 'orbitron', label: 'Orbitron' }] },
    { group: 'Kolory', key: 'colorA', label: 'Kolor lewej', type: 'color', default: '#ff5900' },
    { group: 'Kolory', key: 'colorB', label: 'Kolor prawej', type: 'color', default: '#3b82f6' },
    { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
    { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
  ]),
  W('subathon', 'Subathon', '⏳', { w: 720, h: 260 }, 'Licznik subathonu: czas dodajesz z Panelu OBS za suby, donacje i bitsy; obok cennik.', [
    { group: 'Subathon', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'SUBATHON', maxLength: 30 },
    rangeF('hours', 'Start (bez panelu)', 1, 72, 1, 4, ' h', 'Subathon'),
    { group: 'Subathon', key: 'showRules', label: 'Cennik', type: 'toggle', default: true },
    { group: 'Subathon', key: 'rules', i18n: true, label: 'Cennik', type: 'text', list: 'lines', default: 'Sub = +5 min | 10 zł = +2 min | 100 bits = +1 min', maxLength: 300, placeholder: 'Sub = +5 min', when: { key: 'showRules', is: [true] } },
    ...look('neon'),
  ]),
  W('wheel', 'Koło fortuny', '🎡', { w: 600, h: 700 }, 'Koło z nagrodami albo wyzwaniami; kręci się z przycisku w Panelu OBS, każde źródło wylosuje to samo.', [
    { group: 'Koło', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Koło wyzwań', maxLength: 30 },
    { group: 'Koło', key: 'items', i18n: true, label: 'Pola', type: 'text', list: 'lines', default: 'Bez celownika | Tylko nóż | Pompki x10 | Wybór widza | Nic | Śpiewam | Gra od nowa | Bonus', maxLength: 400, placeholder: 'Pole' },
    rangeF('spin', 'Czas kręcenia', 2, 12, 0.5, 5, 's', 'Koło'),
    rangeF('auto', 'Samo co', 0, 600, 10, 0, 's', 'Koło', '0: tylko z przycisku w panelu'),
    { group: 'Koło', key: 'showResult', label: 'Pokaż wynik', type: 'toggle', default: true },
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [{ value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'dm', label: 'DM Sans' }] },
    { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
    { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
  ]),
  W('alertbox', 'Alerty z panelu', '🔔', { w: 1920, h: 1080 }, 'Własne alerty (follow, sub, donacja, raid albo dowolny tekst) wysyłane ręcznie z Panelu OBS.', [
    { group: 'Alert', key: 'style', label: 'Styl', type: 'select', default: 'pop', options: [{ value: 'pop', label: 'Wyskok' }, { value: 'slide', label: 'Wjazd z boku' }, { value: 'banner', label: 'Baner u góry' }, { value: 'neon', label: 'Neon' }] },
    { group: 'Alert', key: 'position', label: 'Miejsce', type: 'select', default: 'c', options: [{ value: 'c', label: 'Środek' }, { value: 't', label: 'Góra' }, { value: 'b', label: 'Dół' }] },
    rangeF('duration', 'Czas na ekranie', 2, 20, 1, 6, 's', 'Alert'),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [{ value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'dm', label: 'DM Sans' }] },
    { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
    { group: 'Kolory', key: 'accent2', label: 'Drugi kolor', type: 'color', default: '#ff2d95' },
    { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
    { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
    DEMO,
  ]),
  W('burst', 'Konfetti i serca z przycisku', '🎉', { w: 1920, h: 1080 }, 'Wybuch konfetti, serc, gwiazdek albo kasy po kliknięciu w Panelu OBS.', [
    { group: 'Wybuch', key: 'only', label: 'Reaguje na', type: 'select', default: 'all', options: [{ value: 'all', label: 'Każdy przycisk' }, { value: 'confetti', label: 'Konfetti' }, { value: 'hearts', label: 'Serca' }, { value: 'stars', label: 'Gwiazdki' }, { value: 'money', label: 'Kasa' }] },
    { group: 'Wybuch', key: 'from', label: 'Skąd', type: 'select', default: 'bottom', options: [{ value: 'bottom', label: 'Z dołu' }, { value: 'sides', label: 'Z boków' }, { value: 'center', label: 'Ze środka' }] },
    rangeF('count', 'Ilość', 20, 400, 10, 120, '', 'Wybuch'),
    rangeF('size', 'Rozmiar', 0.5, 3, 0.1, 1, '×', 'Wybuch'),
    { group: 'Wybuch', key: 'colors', label: 'Kolory konfetti', type: 'colors', max: 6, default: ['#ff5900', '#ff2d95', '#7a5cff', '#facc15', '#22c55e', '#3b82f6'] },
    DEMO,
  ], 'screen'),
  W('kickrain', 'Deszcz emotek z czatu Kick', '🌧️', { w: 1920, h: 1080 }, 'Emotki i emoji z czatu na Kicku spadają po ekranie na żywo.', [
    { group: 'Kanał', key: 'channel', label: 'Kanał na Kicku', type: 'text', default: 'skullboypl', maxLength: 40 },
    { group: 'Kanał', key: 'emotes', label: 'Emotki Kick', type: 'toggle', default: true },
    { group: 'Kanał', key: 'emojis', label: 'Emoji', type: 'toggle', default: true },
    rangeF('perMessage', 'Najwięcej z jednej wiadomości', 1, 10, 1, 3, '', 'Kanał'),
    rangeF('max', 'Najwięcej naraz', 5, 150, 5, 40, '', 'Kanał'),
    rangeF('size', 'Rozmiar', 0.4, 3, 0.1, 1, '×', 'Kanał'),
    rangeF('speed', 'Prędkość', 0.3, 3, 0.1, 1, '×', 'Kanał'),
  ], 'screen'),
];

export const LIVE_RENDERERS: Record<string, Renderer> = {
  counter: Counter, scoreboard: Scoreboard, subathon: Subathon, wheel: Wheel, alertbox: AlertBox, burst: Burst, kickrain: KickRain,
};
