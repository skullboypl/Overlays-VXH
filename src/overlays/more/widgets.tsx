// Add-on widgets that run on their own (no OBS panel): proposals 16, 46-48, 50, 51, 54, 56, 58-63, 65, 67-70.
import { useEffect, useMemo, useState } from 'react';
import type { OverlayDef, Params } from '../schema';
import { BRAND_COLORS, BRAND_INK, BrandIcon, detectBrand } from '../icons';
import { isLang, translate } from '../../i18n';
import { Card, fontOf, lines, look, num, rangeF, safeUrl, str, useCycle, useNow, type Renderer, type Vars } from './common';

const langOf = (p: Params) => (isLang(p._lang) ? p._lang : 'pl');
const pad = (v: number) => String(v).padStart(2, '0');
const hms = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(sec % 60)}` : `${pad(m)}:${pad(sec % 60)}`;
};
/** "Nick 150 zł" -> { label: "Nick", value: 150, rest: "zł" }: the last number in the line is the value. */
const splitNumber = (line: string) => {
  const m = /^(.*?)[\s:=-]+(-?\d+(?:[.,]\d+)?)\s*(\D*)$/.exec(line.trim());
  return m ? { label: m[1].trim(), value: Number(m[2].replace(',', '.')), rest: m[3].trim() } : { label: line.trim(), value: 0, rest: '' };
};
/** Next "HH:MM" (today or tomorrow) or a "YYYY-MM-DD HH:MM" date. */
const endOf = (raw: string, from: number) => {
  const d = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2})[:.](\d{2}))?$/.exec(raw.trim());
  if (d) return new Date(+d[1], +d[2] - 1, +d[3], +(d[4] ?? 0), +(d[5] ?? 0)).getTime();
  const t = /^(\d{1,2})[:.](\d{2})$/.exec(raw.trim());
  if (!t) return null;
  const x = new Date(from); x.setHours(+t[1], +t[2], 0, 0);
  if (x.getTime() <= from) x.setDate(x.getDate() + 1);
  return x.getTime();
};

/* ---------------- 47 poll ---------------- */
const Poll: Renderer = ({ params: p }) => {
  const opts = lines(p.options).map(splitNumber);
  const total = opts.reduce((a, o) => a + Math.max(0, o.value), 0) || 1;
  const top = Math.max(...opts.map((o) => o.value));
  return (
    <Card p={p} kind="poll">
      {p.question && <div className="mo-title">{str(p.question)}</div>}
      <div className="mo-poll-list">
        {opts.map((o, i) => (
          <div key={i} className={`mo-poll-row ${p.highlight !== false && o.value === top && top > 0 ? 'is-top' : ''}`} style={{ '--i': i } as Vars}>
            <i style={{ width: `${(Math.max(0, o.value) / total) * 100}%` }} />
            <b>{p.numbered !== false && <em>{i + 1}</em>}{o.label}</b>
            {p.showPercent !== false && <span>{Math.round((Math.max(0, o.value) / total) * 100)}%</span>}
          </div>
        ))}
      </div>
      {p.footer && <div className="mo-foot">{str(p.footer)}</div>}
    </Card>
  );
};

/* ---------------- 48 giveaway ---------------- */
const Giveaway: Renderer = ({ params: p }) => {
  const now = useNow(1000);
  const [start] = useState(() => Date.now());
  const end = endOf(str(p.at), start);
  const left = end === null ? null : end - now;
  return (
    <Card p={p} kind="giveaway">
      <div className="mo-gift" aria-hidden>🎁</div>
      <div className="mo-gw-text">
        <small>{str(p.label)}</small>
        <b>{str(p.prize)}</b>
        {lines(p.rules).length > 0 && <ul>{lines(p.rules).map((r, i) => <li key={i}>{r}</li>)}</ul>}
        {p.keyword && <span className="mo-kw">{translate(langOf(p), 'Wpisz')} <code>{str(p.keyword)}</code></span>}
      </div>
      {left !== null && p.showTimer !== false && (
        <div className="mo-gw-timer"><small>{translate(langOf(p), 'Losowanie za')}</small><b>{left > 0 ? hms(left) : str(p.doneText)}</b></div>
      )}
    </Card>
  );
};

/* ---------------- 50 chat commands / 63 facts / 51 sponsors (rotators) ---------------- */
const Commands: Renderer = ({ params: p }) => {
  const items = lines(p.items).map((l) => { const [cmd, ...rest] = l.split(/\s+/); return { cmd, text: rest.join(' ') }; });
  const i = useCycle(items.length, num(p.every, 6) * 1000);
  if (!items.length) return null;
  if (p.layout === 'list')
    return (
      <Card p={p} kind="commands" className="is-list">
        {p.title && <div className="mo-title">{str(p.title)}</div>}
        {items.map((it, k) => <div key={k} className={`mo-cmd ${k === i ? 'is-on' : ''}`}><code>{it.cmd}</code><span>{it.text}</span></div>)}
      </Card>
    );
  return (
    <Card p={p} kind="commands">
      <div key={i} className={`mo-cmd is-one mo-a-${p.anim ?? 'up'}`}><code>{items[i].cmd}</code><span>{items[i].text}</span></div>
    </Card>
  );
};
const Facts: Renderer = ({ params: p }) => {
  const items = lines(p.items);
  const order = useMemo(() => (p.shuffle ? [...items].sort(() => Math.random() - 0.5) : items), [String(p.items), p.shuffle]); // eslint-disable-line react-hooks/exhaustive-deps
  const i = useCycle(order.length, num(p.every, 12) * 1000);
  if (!order.length) return null;
  return (
    <Card p={p} kind="facts">
      {p.title && <div className="mo-title"><span><span aria-hidden>{str(p.icon, '💡')}</span> {str(p.title)}</span></div>}
      <p key={i} className={`mo-fact mo-a-${p.anim ?? 'fade'}`}>{order[i]}</p>
      {order.length > 1 && <i key={`b${i}`} className="mo-bar" style={{ animationDuration: `${num(p.every, 12)}s` }} />}
    </Card>
  );
};
const Sponsors: Renderer = ({ params: p }) => {
  const items = lines(p.items).map((l) => { const [first, ...rest] = l.split(/\s+/); const url = safeUrl(first); return url ? { url, name: rest.join(' ') } : { url: '', name: l }; });
  const i = useCycle(items.length, num(p.every, 8) * 1000);
  if (!items.length) return null;
  const it = items[i];
  return (
    <Card p={p} kind="sponsors">
      {p.title && <div className="mo-title">{str(p.title)}</div>}
      <div key={i} className={`mo-sponsor mo-a-${p.anim ?? 'fade'}`}>
        {it.url ? <img src={it.url} alt={it.name} /> : <b>{it.name}</b>}
        {it.url && it.name && p.showNames !== false && <span>{it.name}</span>}
      </div>
    </Card>
  );
};

/* ---------------- 54 world clock ---------------- */
const WorldClock: Renderer = ({ params: p }) => {
  const now = useNow(1000);
  const zones = lines(p.zones).map((l) => { const parts = l.split(/\s+/); const tz = parts.pop() ?? 'UTC'; return { label: parts.join(' ') || tz, tz }; });
  const lang = langOf(p);
  const fmt = (tz: string) => {
    try { return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: p.clock12 === true, timeZone: tz }).format(now); } catch { return '--:--'; }
  };
  const day = (tz: string) => {
    try { return new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: tz }).format(now); } catch { return ''; }
  };
  return (
    <Card p={p} kind="world" className={`layout-${p.layout ?? 'row'}`}>
      <div className="mo-world-row">
        {zones.map((z, i) => (
          <div key={i} className="mo-zone"><small>{z.label}</small><b>{fmt(z.tz)}</b>{p.showDay !== false && <em>{day(z.tz)}</em>}</div>
        ))}
      </div>
    </Card>
  );
};

/* ---------------- 56 stream goal (time) ---------------- */
const StreamGoal: Renderer = ({ params: p }) => {
  const now = useNow(1000);
  const [opened] = useState(() => Date.now());
  const since = str(p.since);
  const startAt = (() => {
    const t = /^(\d{1,2})[:.](\d{2})$/.exec(since.trim());
    if (!t) return opened;
    const d = new Date(opened); d.setHours(+t[1], +t[2], 0, 0);
    if (d.getTime() > opened) d.setDate(d.getDate() - 1);
    return d.getTime();
  })();
  const target = num(p.hours, 6) * 3_600_000;
  const done = now - startAt;
  const pct = Math.max(0, Math.min(1, done / target));
  return (
    <Card p={p} kind="streamgoal">
      <div className="mo-sg-head"><span>{str(p.title)}</span><b>{hms(done)} / {num(p.hours, 6)} h</b></div>
      <div className="tl-goal-bar has-shimmer"><i style={{ width: `${pct * 100}%` }} /></div>
      {p.showMarks !== false && <div className="mo-sg-marks">{Array.from({ length: Math.max(1, Math.round(num(p.hours, 6))) + 1 }, (_, i) => <span key={i}>{i}h</span>)}</div>}
    </Card>
  );
};

/* ---------------- 58 BRB badge ---------------- */
const BrbBadge: Renderer = ({ params: p }) => {
  const now = useNow(1000);
  const [start] = useState(() => Date.now());
  const left = num(p.minutes, 0) > 0 ? start + num(p.minutes, 0) * 60_000 - now : null;
  return (
    <div className={`ov-fill mo-brb pos-${p.position ?? 'tr'}`} style={{ '--accent': str(p.accent, '#ff5900'), '--bg': str(p.bg, '#111114'), '--fg': str(p.textColor, '#ffffff'), '--font': fontOf(p, 'dm') } as Vars}>
      <div className={`mo-brb-pill style-${p.style ?? 'pill'}`}>
        <i className="mo-brb-dot" />
        <span>{str(p.text)}</span>
        {left !== null && <b>{left > 0 ? hms(left) : '00:00'}</b>}
      </div>
    </div>
  );
};

/* ---------------- 59 top donors / 69 leaderboard ---------------- */
const MEDALS = ['🥇', '🥈', '🥉'];
const Ranking = ({ p, kind }: { p: Params; kind: string }) => {
  const rows = lines(p.items).map(splitNumber);
  const sorted = p.sort === 'none' ? rows : [...rows].sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, Math.max(1, num(p.top, 5)));
  return (
    <Card p={p} kind={kind}>
      {p.title && <div className="mo-title">{str(p.title)}</div>}
      <ol className="mo-rank">
        {shown.map((r, i) => (
          <li key={i} style={{ '--i': i } as Vars} className={i === 0 ? 'is-first' : ''}>
            <em>{p.medals !== false && i < 3 ? MEDALS[i] : i + 1}</em>
            <span>{r.label}</span>
            <b>{r.value.toLocaleString(langOf(p))}{r.rest && ` ${r.rest}`}</b>
          </li>
        ))}
      </ol>
    </Card>
  );
};

/* ---------------- 60 checklist ---------------- */
const Checklist: Renderer = ({ params: p }) => {
  const rows = lines(p.items).map((l) => ({ done: /^[✓✔x]\s*/i.test(l), text: l.replace(/^[✓✔x]\s*/i, '') }));
  const done = rows.filter((r) => r.done).length;
  return (
    <Card p={p} kind="checklist">
      {p.title && <div className="mo-title">{str(p.title)}<em>{done}/{rows.length}</em></div>}
      <ul className="mo-check">{rows.map((r, i) => <li key={i} className={r.done ? 'is-done' : ''} style={{ '--i': i } as Vars}><i>{r.done ? '✓' : ''}</i>{r.text}</li>)}</ul>
      {p.bar !== false && rows.length > 0 && <div className="tl-goal-bar"><i style={{ width: `${(done / rows.length) * 100}%` }} /></div>}
    </Card>
  );
};

/* ---------------- 65 now playing ---------------- */
const NowPlaying: Renderer = ({ params: p }) => {
  const cover = safeUrl(p.cover);
  return (
    <Card p={p} kind="nowplaying" className={`layout-${p.layout ?? 'card'}`}>
      <div className="mo-np">
        <div className={`mo-np-cover ${p.spin ? 'is-vinyl' : ''}`}>{cover ? <img src={cover} alt="" /> : <span aria-hidden>♫</span>}</div>
        <div className="mo-np-text">
          <small>{str(p.label)}</small>
          <b>{str(p.title)}</b>
          {p.artist && <span>{str(p.artist)}</span>}
        </div>
        {p.eq !== false && <div className="mo-eq" aria-hidden>{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ '--i': i } as Vars} />)}</div>}
      </div>
      {p.progress !== false && <div className="mo-np-bar"><i style={{ animationDuration: `${num(p.length, 180)}s` }} /></div>}
    </Card>
  );
};

/* ---------------- 67 discount code ---------------- */
const Discount: Renderer = ({ params: p }) => (
  <Card p={p} kind="discount">
    {p.sponsor && <small className="mo-dc-sponsor">{str(p.sponsor)}</small>}
    <div className="mo-dc">
      {p.amount && <b className="mo-dc-amount">{str(p.amount)}</b>}
      <div className="mo-dc-code"><span>{str(p.label)}</span><code>{str(p.code)}</code></div>
    </div>
    {p.note && <div className="mo-foot">{str(p.note)}</div>}
  </Card>
);

/* ---------------- 68 two-person lower third ---------------- */
const Duo: Renderer = ({ params: p }) => {
  const person = (name: unknown, sub: unknown, k: number) => {
    const brand = detectBrand(String(sub ?? ''));
    return (
      <div className="mo-duo-card" style={{ '--i': k } as Vars}>
        {brand !== 'link' && <span className="mo-duo-icon" style={{ background: BRAND_COLORS[brand], color: BRAND_INK[brand] }}><BrandIcon brand={brand} size="1em" /></span>}
        <div><b>{String(name ?? '')}</b>{sub ? <small>{String(sub)}</small> : null}</div>
      </div>
    );
  };
  return (
    <div className={`ov-fill mo-duo style-${p.style ?? 'classic'}`} style={{ '--accent': str(p.accent, '#ff5900'), '--accent2': str(p.accent2, '#7a5cff'), '--bg': str(p.bg, '#111114'), '--fg': str(p.textColor, '#ffffff'), '--font': fontOf(p, 'poppins'), '--fs': `max(9px, calc(${num(p.fontSize, 34)} * 100cqh / 160))` } as Vars}>
      {person(p.name1, p.sub1, 0)}
      {p.showVs !== false && <span className="mo-duo-vs">{str(p.vs, '&')}</span>}
      {person(p.name2, p.sub2, 1)}
    </div>
  );
};

/* ---------------- 70 streak / 46 dice ---------------- */
const Streak: Renderer = ({ params: p }) => {
  const now = useNow(60_000);
  const since = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str(p.since).trim());
  const days = since ? Math.max(0, Math.floor((now - new Date(+since[1], +since[2] - 1, +since[3]).getTime()) / 86_400_000) + 1) : num(p.days, 30);
  return (
    <Card p={p} kind="streak">
      <div className="mo-streak-row"><span className="mo-flame" aria-hidden>{str(p.icon, '🔥')}</span><b>{days}</b><small>{str(p.label)}</small></div>
    </Card>
  );
};
const Dice: Renderer = ({ params: p }) => {
  const count = Math.max(1, Math.min(4, num(p.dice, 2)));
  const sides = Math.max(2, num(p.sides, 6));
  const [roll, setRoll] = useState(() => Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)));
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => { setRoll(Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides))); setN((v) => v + 1); }, Math.max(2, num(p.every, 10)) * 1000);
    return () => window.clearInterval(id);
  }, [count, sides, p.every]);
  const sum = roll.reduce((a, b) => a + b, 0);
  return (
    <Card p={p} kind="dice">
      {p.title && <div className="mo-title">{str(p.title)}</div>}
      <div className="mo-dice-row">{roll.map((v, i) => <span key={`${n}-${i}`} className="mo-die" style={{ '--i': i } as Vars}>{v}</span>)}</div>
      {count > 1 && p.showSum !== false && <div className="mo-foot">= {sum}</div>}
    </Card>
  );
};

/* ---------------- 16 weather (open-meteo, no key) ---------------- */
const WMO: Record<number, [string, string]> = {
  0: ['☀️', 'Bezchmurnie'], 1: ['🌤️', 'Prawie bezchmurnie'], 2: ['⛅', 'Częściowe zachmurzenie'], 3: ['☁️', 'Pochmurno'], 45: ['🌫️', 'Mgła'], 48: ['🌫️', 'Mgła'],
  51: ['🌦️', 'Mżawka'], 53: ['🌦️', 'Mżawka'], 55: ['🌧️', 'Mżawka'], 61: ['🌧️', 'Deszcz'], 63: ['🌧️', 'Deszcz'], 65: ['🌧️', 'Ulewa'],
  71: ['🌨️', 'Śnieg'], 73: ['🌨️', 'Śnieg'], 75: ['❄️', 'Śnieżyca'], 80: ['🌦️', 'Przelotny deszcz'], 81: ['🌧️', 'Przelotny deszcz'], 82: ['⛈️', 'Ulewa'],
  85: ['🌨️', 'Przelotny śnieg'], 86: ['❄️', 'Przelotny śnieg'], 95: ['⛈️', 'Burza'], 96: ['⛈️', 'Burza z gradem'], 99: ['⛈️', 'Burza z gradem'],
};
const Weather: Renderer = ({ params: p }) => {
  const city = str(p.city).trim();
  const unit = p.unit === 'f' ? 'fahrenheit' : 'celsius';
  const [w, setW] = useState<{ t: number; code: number; name: string } | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!city) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=${langOf(p)}&name=${encodeURIComponent(city)}`)).json();
        const g = geo?.results?.[0];
        if (!g) { if (alive) setErr('Nie ma takiego miasta'); return; }
        const fc = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,weather_code&temperature_unit=${unit}`)).json();
        if (alive) { setW({ t: Math.round(fc.current.temperature_2m), code: fc.current.weather_code, name: g.name }); setErr(''); }
      } catch { if (alive) setErr('Brak połączenia z serwisem pogody'); }
    };
    void load();
    const id = window.setInterval(load, 15 * 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [city, unit]); // eslint-disable-line react-hooks/exhaustive-deps
  const lang = langOf(p);
  const [icon, desc] = WMO[w?.code ?? 0] ?? ['🌡️', ''];
  return (
    <Card p={p} kind="weather">
      {w ? (
        <div className="mo-weather-row">
          <span className="mo-wicon" aria-hidden>{icon}</span>
          <div><b>{w.t}°{unit === 'celsius' ? 'C' : 'F'}</b>{p.showCity !== false && <small>{str(p.label) || w.name}</small>}{p.showDesc !== false && <em>{translate(lang, desc)}</em>}</div>
        </div>
      ) : <div className="mo-foot">{translate(lang, err || 'Wpisz miasto')}</div>}
    </Card>
  );
};

/* ---------------- 61 / 62 live channel numbers (Kick: followers, viewers) ---------------- */
type Live = { count: number; viewers?: number; live?: boolean; name: string; avatar: string };
const useLive = (platform: string, channel: string) => {
  const [data, setData] = useState<Live | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!channel.trim()) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/followers?platform=${platform}&channel=${encodeURIComponent(channel.trim())}`);
        const b = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && typeof b.count === 'number') { setData(b); setError(''); } else setError(b.error ?? 'upstream');
      } catch { if (alive) setError('upstream'); }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [platform, channel]);
  return { data, error };
};
const LiveCount: Renderer = ({ params: p }) => {
  const what = str(p.what, 'followers');
  const platform = what === 'viewers' ? 'kick' : str(p.platform, 'kick');
  const { data, error } = useLive(platform, str(p.channel));
  const lang = langOf(p);
  const value = data ? (what === 'viewers' ? data.viewers ?? 0 : data.count) : null;
  const [bump, setBump] = useState<{ n: number; k: number } | null>(null);
  const [prev, setPrev] = useState<number | null>(null);
  useEffect(() => {
    if (value === null) return;
    if (prev !== null && value > prev && what === 'followers') setBump({ n: value - prev, k: Date.now() });
    setPrev(value);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const offline = what === 'viewers' && data && !data.live;
  return (
    <Card p={p} kind="livecount">
      <div className="mo-live">
        <span className="mo-live-icon" aria-hidden>{what === 'viewers' ? '👁' : '❤'}</span>
        <div>
          <b>{value === null ? '—' : offline ? str(p.offlineText) : value.toLocaleString(lang)}</b>
          <small>{str(p.label)}{what === 'viewers' && data?.live && <i className="mo-live-dot" />}</small>
        </div>
        {bump && <em key={bump.k} className="mo-live-bump">+{bump.n}</em>}
      </div>
      {error && p._preview === true && <div className="mo-foot">{translate(lang, error === 'channel_not_found' ? 'Nie ma takiego kanału' : error === 'bad_channel' ? 'Wpisz nazwę kanału' : 'Nie udało się pobrać liczby')}</div>}
    </Card>
  );
};

// ---------------- definitions ----------------
const W = (id: string, name: string, icon: string, size: { w: number; h: number }, description: string, fields: OverlayDef['fields']): OverlayDef =>
  ({ id, name, icon, category: 'widget', size, description, fields });
const ANIMS = [{ value: 'up', label: 'Wjazd z dołu' }, { value: 'fade', label: 'Zanik' }, { value: 'slide', label: 'Wjazd z boku' }, { value: 'flip', label: 'Obrót' }];

export const WIDGET_DEFS: OverlayDef[] = [
  W('poll', 'Ankieta na ekranie', '📊', { w: 640, h: 360 }, 'Pytanie do widzów i paski odpowiedzi z procentami; wyniki wpisujesz albo zmieniasz w trakcie.', [
    { group: 'Ankieta', key: 'question', i18n: true, label: 'Pytanie', type: 'text', default: 'W co gramy jutro?', maxLength: 80 },
    { group: 'Ankieta', key: 'options', i18n: true, label: 'Odpowiedzi i głosy', type: 'text', list: 'lines', default: 'Minecraft 12 | CS2 8 | Valorant 5', maxLength: 300, placeholder: 'Odpowiedź 0', hint: 'Liczba na końcu wiersza to liczba głosów' },
    { group: 'Ankieta', key: 'footer', i18n: true, label: 'Dopisek', type: 'text', default: 'Głosuj na czacie: !1 !2 !3', maxLength: 60 },
    { group: 'Ankieta', key: 'showPercent', label: 'Procenty', type: 'toggle', default: true },
    { group: 'Ankieta', key: 'numbered', label: 'Numery odpowiedzi', type: 'toggle', default: true },
    { group: 'Ankieta', key: 'highlight', label: 'Wyróżnij prowadzącą', type: 'toggle', default: true },
    ...look('glass'),
  ]),
  W('giveaway', 'Giveaway', '🎁', { w: 720, h: 260 }, 'Nagroda, warunki udziału, komenda na czacie i odliczanie do losowania.', [
    { group: 'Giveaway', key: 'label', i18n: true, label: 'Nagłówek', type: 'text', default: 'GIVEAWAY', maxLength: 24 },
    { group: 'Giveaway', key: 'prize', i18n: true, label: 'Nagroda', type: 'text', default: 'Klucz Steam do gry', maxLength: 60 },
    { group: 'Giveaway', key: 'rules', i18n: true, label: 'Warunki', type: 'text', list: 'lines', default: 'Follow kanału | Bądź na czacie', maxLength: 200, placeholder: 'Warunek' },
    { group: 'Giveaway', key: 'keyword', label: 'Komenda', type: 'text', default: '!join', maxLength: 20 },
    { group: 'Giveaway', key: 'showTimer', label: 'Odliczanie', type: 'toggle', default: true },
    { group: 'Giveaway', key: 'at', label: 'Losowanie o', type: 'text', default: '22:00', maxLength: 16, placeholder: 'GG:MM albo RRRR-MM-DD GG:MM', when: { key: 'showTimer', is: [true] } },
    { group: 'Giveaway', key: 'doneText', i18n: true, label: 'Po odliczeniu', type: 'text', default: 'Losujemy!', maxLength: 24, when: { key: 'showTimer', is: [true] } },
    ...look('gradient'),
  ]),
  W('commands', 'Komendy czatu', '⌨️', { w: 720, h: 120 }, 'Komendy czatu z opisem, po jednej albo listą: !discord, !sens, !setup.', [
    { group: 'Komendy', key: 'items', i18n: true, label: 'Komendy', type: 'text', list: 'lines', default: '!discord Link do serwera | !sens Moje ustawienia | !setup Sprzęt | !socials Gdzie mnie znaleźć', maxLength: 500, placeholder: '!komenda Opis' },
    { group: 'Komendy', key: 'layout', label: 'Układ', type: 'select', default: 'one', options: [{ value: 'one', label: 'Po jednej' }, { value: 'list', label: 'Lista z podświetleniem' }] },
    { group: 'Komendy', key: 'title', i18n: true, label: 'Nagłówek listy', type: 'text', default: 'Komendy', maxLength: 30, when: { key: 'layout', is: ['list'] } },
    rangeF('every', 'Zmiana co', 2, 30, 1, 6, 's', 'Komendy'),
    { group: 'Komendy', key: 'anim', label: 'Animacja zmiany', type: 'select', default: 'up', options: ANIMS, when: { key: 'layout', is: ['one'] } },
    ...look('glass', 'left'),
  ]),
  W('facts', 'Ciekawostki', '💡', { w: 760, h: 200 }, 'Rotujące ciekawostki, cytaty albo porady, z paskiem czasu.', [
    { group: 'Teksty', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Ciekawostka', maxLength: 30 },
    { group: 'Teksty', key: 'icon', label: 'Ikona', type: 'text', default: '💡', maxLength: 4 },
    { group: 'Teksty', key: 'items', i18n: true, label: 'Ciekawostki', type: 'text', list: 'lines', default: 'Ośmiornice mają trzy serca. | Miód nigdy się nie psuje. | Pierwsza gra wideo powstała w 1958 roku.', maxLength: 1000, placeholder: 'Ciekawostka' },
    rangeF('every', 'Zmiana co', 4, 60, 1, 12, 's', 'Teksty'),
    { group: 'Teksty', key: 'shuffle', label: 'Losowa kolejność', type: 'toggle', default: false },
    { group: 'Teksty', key: 'anim', label: 'Animacja zmiany', type: 'select', default: 'fade', options: ANIMS },
    ...look('glass', 'left'),
  ]),
  W('sponsors', 'Rotator sponsorów', '🤝', { w: 520, h: 220 }, 'Logo sponsorów i partnerów na zmianę, z nazwami.', [
    { group: 'Sponsorzy', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Partnerzy streama', maxLength: 30 },
    { group: 'Sponsorzy', key: 'items', label: 'Logo i nazwy', type: 'text', list: 'lines', default: 'Twój sponsor | Drugi partner', maxLength: 1000, placeholder: 'https://logo.png Nazwa', hint: 'Każdy wiersz: link do logo i nazwa. Bez linku pokazuje się sama nazwa' },
    rangeF('every', 'Zmiana co', 3, 60, 1, 8, 's', 'Sponsorzy'),
    { group: 'Sponsorzy', key: 'showNames', label: 'Nazwy pod logo', type: 'toggle', default: true },
    { group: 'Sponsorzy', key: 'anim', label: 'Animacja zmiany', type: 'select', default: 'fade', options: ANIMS },
    ...look('glass'),
  ]),
  W('worldclock', 'Zegar świata', '🌍', { w: 960, h: 160 }, 'Godzina w kilku miastach naraz: dla widzów z różnych stref.', [
    { group: 'Strefy', key: 'zones', label: 'Miasta i strefy', type: 'text', list: 'lines', default: 'Warszawa Europe/Warsaw | Londyn Europe/London | Nowy Jork America/New_York | Tokio Asia/Tokyo', maxLength: 400, placeholder: 'Miasto Europe/Warsaw', hint: 'Na końcu wiersza strefa w formacie Kontynent/Miasto (IANA)' },
    { group: 'Strefy', key: 'layout', label: 'Układ', type: 'select', default: 'row', options: [{ value: 'row', label: 'W rzędzie' }, { value: 'column', label: 'W kolumnie' }] },
    { group: 'Strefy', key: 'showDay', label: 'Dzień tygodnia', type: 'toggle', default: true },
    { group: 'Strefy', key: 'clock12', label: 'Zegar 12-godzinny', type: 'toggle', default: false },
    ...look('glass'),
  ]),
  W('streamgoal', 'Cel długości streama', '⏳', { w: 900, h: 140 }, 'Pasek postępu do zaplanowanej długości streama, np. 6 albo 12 godzin.', [
    { group: 'Cel', key: 'title', i18n: true, label: 'Napis', type: 'text', default: 'Maraton', maxLength: 30 },
    rangeF('hours', 'Ile godzin', 1, 48, 1, 6, ' h', 'Cel'),
    { group: 'Cel', key: 'since', label: 'Start streama o', type: 'text', default: '', maxLength: 5, placeholder: 'GG:MM', hint: 'Puste: od chwili, gdy OBS wczyta źródło' },
    { group: 'Cel', key: 'showMarks', label: 'Podziałka godzin', type: 'toggle', default: true },
    ...look('glass'),
  ]),
  W('brbbadge', 'Plakietka „Zaraz wracam”', '🟠', { w: 1920, h: 1080 }, 'Mała pulsująca plakietka na scenie z grą, gdy na chwilę odchodzisz; opcjonalnie z odliczaniem.', [
    { group: 'Plakietka', key: 'text', i18n: true, label: 'Tekst', type: 'text', default: 'Zaraz wracam', maxLength: 30 },
    rangeF('minutes', 'Odliczanie', 0, 60, 1, 0, ' min', 'Plakietka', '0 wyłącza odliczanie'),
    { group: 'Plakietka', key: 'position', label: 'Miejsce', type: 'select', default: 'tr', options: [...[{ value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' }], { value: 'c', label: 'Środek' }] },
    { group: 'Plakietka', key: 'style', label: 'Styl', type: 'select', default: 'pill', options: [{ value: 'pill', label: 'Pigułka' }, { value: 'neon', label: 'Neon' }, { value: 'tape', label: 'Taśma ostrzegawcza' }] },
    { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
    { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
    { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
  ]),
  W('topdonors', 'Top donatorzy', '💰', { w: 480, h: 360 }, 'Lista największych wpłat albo subów, z medalami dla podium.', [
    { group: 'Lista', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Top donatorzy', maxLength: 30 },
    { group: 'Lista', key: 'items', label: 'Nicki i kwoty', type: 'text', list: 'lines', default: 'widz123 150 zł | kasia_gra 100 zł | noob_pl 50 zł | ziomek 20 zł', maxLength: 600, placeholder: 'Nick 100 zł' },
    rangeF('top', 'Ile pozycji', 1, 10, 1, 5, '', 'Lista'),
    { group: 'Lista', key: 'medals', label: 'Medale dla podium', type: 'toggle', default: true },
    { group: 'Lista', key: 'sort', label: 'Kolejność', type: 'select', default: 'value', options: [{ value: 'value', label: 'Od największej' }, { value: 'none', label: 'Jak wpisano' }] },
    ...look('glass'),
  ]),
  W('leaderboard', 'Tabela rankingu', '🏆', { w: 480, h: 400 }, 'Ranking graczy albo widzów z punktami: ELO, kille, wygrane.', [
    { group: 'Ranking', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Ranking', maxLength: 30 },
    { group: 'Ranking', key: 'items', label: 'Gracze i punkty', type: 'text', list: 'lines', default: 'skullboypl 2450 | widz123 2210 | kasia_gra 1980 | noob_pl 1500 | ziomek 1320', maxLength: 600, placeholder: 'Nick 1000' },
    rangeF('top', 'Ile pozycji', 1, 10, 1, 5, '', 'Ranking'),
    { group: 'Ranking', key: 'medals', label: 'Medale dla podium', type: 'toggle', default: true },
    { group: 'Ranking', key: 'sort', label: 'Kolejność', type: 'select', default: 'value', options: [{ value: 'value', label: 'Od największej' }, { value: 'none', label: 'Jak wpisano' }] },
    ...look('solid'),
  ]),
  W('checklist', 'Lista celów dnia', '✅', { w: 480, h: 320 }, 'Checklista na dziś z odhaczonymi punktami i paskiem postępu.', [
    { group: 'Lista', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Cele na dziś', maxLength: 30 },
    { group: 'Lista', key: 'items', i18n: true, label: 'Cele', type: 'text', list: 'lines', default: '✓ Przejść rozdział 3 | Pokonać bossa | 100 followów | Zagrać z widzami', maxLength: 600, placeholder: 'Cel', hint: 'Zacznij wiersz od ✓, gdy cel jest zrobiony' },
    { group: 'Lista', key: 'bar', label: 'Pasek postępu', type: 'toggle', default: true },
    ...look('glass'),
  ]),
  W('nowplaying', 'Teraz gra', '🎵', { w: 640, h: 140 }, 'Tytuł utworu, wykonawca i okładka, z animowanym equalizerem.', [
    { group: 'Utwór', key: 'label', i18n: true, label: 'Nagłówek', type: 'text', default: 'Teraz gra', maxLength: 20 },
    { group: 'Utwór', key: 'title', label: 'Tytuł', type: 'text', default: 'Lofi beats to stream to', maxLength: 60 },
    { group: 'Utwór', key: 'artist', label: 'Wykonawca', type: 'text', default: 'Chill Radio', maxLength: 60 },
    { group: 'Utwór', key: 'cover', label: 'Okładka (link)', type: 'text', default: '', maxLength: 300, placeholder: 'https://...jpg' },
    { group: 'Utwór', key: 'spin', label: 'Okładka jak winyl', type: 'toggle', default: false },
    { group: 'Utwór', key: 'eq', label: 'Equalizer', type: 'toggle', default: true },
    { group: 'Utwór', key: 'progress', label: 'Pasek utworu', type: 'toggle', default: true },
    rangeF('length', 'Długość paska', 30, 600, 10, 180, 's', 'Utwór'),
    ...look('glass', 'left'),
  ]),
  W('discount', 'Kod rabatowy', '🏷️', { w: 560, h: 200 }, 'Kod rabatowy sponsora z wysokością zniżki i dopiskiem.', [
    { group: 'Kod', key: 'sponsor', label: 'Sponsor', type: 'text', default: 'Sklep partnera', maxLength: 40 },
    { group: 'Kod', key: 'amount', label: 'Zniżka', type: 'text', default: '-20%', maxLength: 10 },
    { group: 'Kod', key: 'label', i18n: true, label: 'Napis przy kodzie', type: 'text', default: 'Kod', maxLength: 20 },
    { group: 'Kod', key: 'code', label: 'Kod', type: 'text', default: 'SKULL20', maxLength: 24 },
    { group: 'Kod', key: 'note', i18n: true, label: 'Dopisek', type: 'text', default: 'Link w opisie streama', maxLength: 60 },
    ...look('gradient'),
  ]),
  W('duo', 'Belka dla dwóch osób', '👥', { w: 1280, h: 160 }, 'Dwa podpisy obok siebie: gość, współprowadzący albo mecz 1 na 1.', [
    { group: 'Osoby', key: 'name1', label: 'Pierwsza osoba', type: 'text', default: 'skullboypl', maxLength: 30 },
    { group: 'Osoby', key: 'sub1', label: 'Podpis', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 50 },
    { group: 'Osoby', key: 'name2', label: 'Druga osoba', type: 'text', default: 'gość', maxLength: 30 },
    { group: 'Osoby', key: 'sub2', label: 'Podpis', type: 'text', default: 'kick.com/gosc', maxLength: 50 },
    { group: 'Osoby', key: 'showVs', label: 'Znak pośrodku', type: 'toggle', default: true },
    { group: 'Osoby', key: 'vs', label: 'Znak', type: 'text', default: '&', maxLength: 4, when: { key: 'showVs', is: [true] } },
    { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'classic', options: [{ value: 'classic', label: 'Klasyczna' }, { value: 'versus', label: 'Versus (esport)' }, { value: 'glass', label: 'Szkło' }] },
    rangeF('fontSize', 'Wielkość', 14, 60, 1, 34, 'px', 'Wygląd'),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [{ value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'dm', label: 'DM Sans' }] },
    { group: 'Kolory', key: 'accent', label: 'Kolor pierwszej osoby', type: 'color', default: '#ff5900' },
    { group: 'Kolory', key: 'accent2', label: 'Kolor drugiej osoby', type: 'color', default: '#7a5cff' },
    { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
    { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
  ]),
  W('streak', 'Seria dni streamowania', '🔥', { w: 360, h: 160 }, 'Ile dni z rzędu streamujesz: wpisana liczba albo liczona od daty startu serii.', [
    { group: 'Seria', key: 'days', label: 'Liczba dni', type: 'range', min: 0, max: 3650, step: 1, default: 30 },
    { group: 'Seria', key: 'since', label: 'Albo licz od daty', type: 'text', default: '', maxLength: 10, placeholder: 'RRRR-MM-DD', hint: 'Gdy wpiszesz datę, liczba dni rośnie sama' },
    { group: 'Seria', key: 'label', i18n: true, label: 'Napis', type: 'text', default: 'dni z rzędu', maxLength: 24 },
    { group: 'Seria', key: 'icon', label: 'Ikona', type: 'text', default: '🔥', maxLength: 4 },
    ...look('glass'),
  ]),
  W('dice', 'Rzut kośćmi', '🎲', { w: 420, h: 220 }, 'Kości rzucane co kilka sekund: do losowania, wyzwań albo gier z widzami.', [
    { group: 'Kości', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Rzut', maxLength: 30 },
    rangeF('dice', 'Ile kości', 1, 4, 1, 2, '', 'Kości'),
    rangeF('sides', 'Ile ścianek', 2, 100, 1, 6, '', 'Kości'),
    rangeF('every', 'Rzut co', 2, 120, 1, 10, 's', 'Kości'),
    { group: 'Kości', key: 'showSum', label: 'Suma', type: 'toggle', default: true },
    ...look('solid'),
  ]),
  W('weather', 'Pogoda', '🌦️', { w: 420, h: 160 }, 'Aktualna temperatura i pogoda w Twoim mieście, odświeżana co 15 minut.', [
    { group: 'Pogoda', key: 'city', label: 'Miasto', type: 'text', default: 'Warszawa', maxLength: 60 },
    { group: 'Pogoda', key: 'label', label: 'Własna nazwa miejsca', type: 'text', default: '', maxLength: 30, placeholder: 'Puste: nazwa miasta' },
    { group: 'Pogoda', key: 'unit', label: 'Jednostka', type: 'select', default: 'c', options: [{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }] },
    { group: 'Pogoda', key: 'showCity', label: 'Nazwa miasta', type: 'toggle', default: true },
    { group: 'Pogoda', key: 'showDesc', label: 'Opis pogody', type: 'toggle', default: true },
    ...look('glass'),
  ]),
  W('livecount', 'Licznik followów / widzów', '❤️', { w: 420, h: 160 }, 'Liczba followów (Kick, Twitch, YouTube) albo widzów na żywo na Kicku, z „+1” przy nowym followie.', [
    { group: 'Kanał', key: 'what', label: 'Co liczyć', type: 'select', default: 'followers', options: [{ value: 'followers', label: 'Followy / suby' }, { value: 'viewers', label: 'Widzowie na żywo (Kick)' }] },
    { group: 'Kanał', key: 'platform', label: 'Serwis', type: 'select', default: 'kick', options: [{ value: 'kick', label: 'Kick' }, { value: 'twitch', label: 'Twitch' }, { value: 'youtube', label: 'YouTube' }], when: { key: 'what', is: ['followers'] } },
    { group: 'Kanał', key: 'channel', label: 'Kanał', type: 'text', default: 'skullboypl', maxLength: 60 },
    { group: 'Kanał', key: 'label', i18n: true, label: 'Napis', type: 'text', default: 'followów', maxLength: 24 },
    { group: 'Kanał', key: 'offlineText', i18n: true, label: 'Gdy offline', type: 'text', default: 'offline', maxLength: 20, when: { key: 'what', is: ['viewers'] } },
    ...look('glass'),
  ]),
];

export const WIDGET_RENDERERS: Record<string, Renderer> = {
  poll: Poll, giveaway: Giveaway, commands: Commands, facts: Facts, sponsors: Sponsors, worldclock: WorldClock, streamgoal: StreamGoal,
  brbbadge: BrbBadge, topdonors: ({ params }) => <Ranking p={params} kind="topdonors" />, leaderboard: ({ params }) => <Ranking p={params} kind="leaderboard" />,
  checklist: Checklist, nowplaying: NowPlaying, discount: Discount, duo: Duo, streak: Streak, dice: Dice, weather: Weather, livecount: LiveCount,
};
