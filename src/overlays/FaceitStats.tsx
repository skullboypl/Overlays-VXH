import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { isLang, translate } from '../i18n';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Public summary served by FACEIT Banner (server/public-stats.mjs). */
export const FACEIT_API = 'https://faceitbanner.vxh.pl/api/faceit/public/';

export type FaceitSummary = {
  nickname: string;
  avatar: string;
  country: string;
  level: number;
  elo: number;
  recent: { matches: number; kd: number; avgKills: number; winRate: number; hs: number; adr: number; wins: number; losses: number; streak: number; form: string[] };
  lifetime: { matches: number; winRate: number; kd: number };
};

const SAMPLE: FaceitSummary = {
  nickname: 'skullboypl', avatar: '', country: 'pl', level: 8, elo: 1874,
  recent: { matches: 20, kd: 1.24, avgKills: 19.6, winRate: 60, hs: 48, adr: 84.2, wins: 12, losses: 8, streak: 2, form: ['W', 'W', 'L', 'W', 'L'] },
  lifetime: { matches: 1320, winRate: 54, kd: 1.12 },
};

/** "nick", a player_id, or a pasted faceitbanner link with ?player_id=... */
export const playerFrom = (raw: unknown): string => {
  const v = String(raw ?? '').trim();
  const m = v.match(/[?&](?:player_id|playerId)=([0-9a-f-]{36})/i);
  if (m) return m[1];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return v;
  return /^[A-Za-z0-9_.-]{2,32}$/.test(v) ? v : '';
};

const LEVEL_COLOR = (l: number) => (l >= 10 ? '#fe1f00' : l >= 8 ? '#ff6309' : l >= 4 ? '#ffc800' : l >= 2 ? '#1ce400' : '#eeeeee');

const LevelBadge = ({ level }: { level: number }) => {
  const c = LEVEL_COLOR(level);
  const frac = Math.min(1, Math.max(0.1, level / 10));
  const r = 16, len = 2 * Math.PI * r;
  return (
    <svg className="fs-level" viewBox="0 0 40 40" aria-label={`Level ${level}`}>
      <circle cx="20" cy="20" r="18" fill="#121214" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3.5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={`${len * frac * 0.8} ${len}`} transform="rotate(126 20 20)" />
      <text x="20" y="25.5" textAnchor="middle" fontSize="15" fontWeight="800" fill={c} fontFamily="DM Sans, sans-serif">{level || '-'}</text>
    </svg>
  );
};

const STAT_DEFS: { key: string; label: string; value: (s: FaceitSummary) => string }[] = [
  { key: 'kd', label: 'K/D', value: (s) => s.recent.kd.toFixed(2) },
  { key: 'wr', label: 'WR', value: (s) => `${Math.round(s.recent.winRate)}%` },
  { key: 'hs', label: 'HS', value: (s) => `${Math.round(s.recent.hs)}%` },
  { key: 'adr', label: 'ADR', value: (s) => s.recent.adr.toFixed(0) },
  { key: 'kills', label: 'AVG', value: (s) => s.recent.avgKills.toFixed(1) },
  { key: 'matches', label: 'M', value: (s) => String(s.lifetime.matches) },
];

/** Fetches and keeps fresh; the first answer is remembered as the session start for the ELO change. */
const useFaceit = (player: string, matches: number, refreshS: number) => {
  const [data, setData] = useState<FaceitSummary | null>(null);
  const [error, setError] = useState('');
  const start = useRef<{ who: string; elo: number } | null>(null);
  useEffect(() => {
    if (!player) { setData(null); setError(''); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${FACEIT_API}${encodeURIComponent(player)}?matches=${matches}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : `http_${res.status}`);
        const json = (await res.json()) as FaceitSummary;
        if (!alive) return;
        if (!start.current || start.current.who !== player) start.current = { who: player, elo: json.elo };
        setData(json);
        setError('');
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'error');
      }
    };
    load();
    const id = setInterval(load, Math.max(30, refreshS) * 1000);
    return () => { alive = false; clearInterval(id); };
  }, [player, matches, refreshS]);
  return { data, error, startElo: start.current?.elo ?? null };
};

/** ELO, level and chosen stats drawn natively in one of several looks. */
export const FaceitStats = ({ params }: { params: Params }) => {
  const lang = isLang(params._lang) ? params._lang : 'pl';
  const tr = (s: string) => translate(lang, s);
  const player = playerFrom(params.player);
  const { data, error, startElo } = useFaceit(player, Number(params.matches ?? 20), Number(params.refresh ?? 60));
  // Studio preview shows sample numbers until a real player answers; OBS shows nothing then.
  const preview = Boolean(params._preview);
  const s = data ?? (preview ? SAMPLE : null);
  if (!s) return null;

  const look = String(params.look ?? 'card');
  const wanted = String(params.stats ?? 'kd,wr,hs').split(',');
  const picked = STAT_DEFS.filter((d) => wanted.includes(d.key));
  const diff = params.session && startElo !== null && data ? data.elo - startElo : null;
  const style: Vars = {
    '--fs-accent': String(params.statsAccent ?? '#ff5500'),
    '--fs-bg': String(params.panel ?? '#111114'),
    '--fs-fg': String(params.textColor ?? '#ffffff'),
    '--fs-scale': Number(params.statsScale ?? 1),
    '--fs-lv': LEVEL_COLOR(s.level),
  };
  const form = params.form ? s.recent.form.slice(0, 5) : [];

  return (
    <div className={`fs fs-${look} pos-${params.statsPos ?? 'bl'}`} style={style}>
      {look !== 'minimal' && params.showLevel !== false && <LevelBadge level={s.level} />}
      {look === 'card' && params.avatar && s.avatar && <img className="fs-avatar" src={s.avatar.startsWith('/') ? `https://faceitbanner.vxh.pl${s.avatar}` : s.avatar} alt="" />}
      <div className="fs-main">
        {(look === 'card' || look === 'hud') && params.showNick !== false && <div className="fs-nick">{s.nickname}</div>}
        {params.showElo !== false && <div className="fs-elo">
          <b>{s.elo}</b><small>ELO</small>
          {diff !== null && diff !== 0 && <em className={diff > 0 ? 'up' : 'down'}>{diff > 0 ? `+${diff}` : diff}</em>}
        </div>}
      </div>
      {look !== 'pill' && look !== 'minimal' && picked.length > 0 && (
        <div className="fs-stats">
          {picked.map((d) => (
            <span key={d.key} className="fs-stat"><small>{d.label}</small><b>{d.value(s)}</b></span>
          ))}
        </div>
      )}
      {form.length > 0 && look !== 'minimal' && (
        <div className="fs-form">{form.map((f, i) => <i key={i} className={f === 'W' ? 'w' : 'l'}>{f}</i>)}</div>
      )}
      {preview && !data && <div className="fs-note">{player ? (error === 'not_found' ? tr('Nie znaleziono gracza') : tr('Łączenie z FACEIT…')) : tr('Przykładowe dane')}</div>}
    </div>
  );
};
