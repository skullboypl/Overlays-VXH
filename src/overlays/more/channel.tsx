// Widgets fed by a Twitch / Kick channel linked in the OBS panel: latest follow / sub / cheer..., an event feed,
// and Twitch's own predictions, Hype Train and creator goals. They need a link with ?panel=; the studio shows samples.
import { useEffect, useState } from 'react';
import type { OverlayDef, Params } from '../schema';
import { usePanel, type PanelAlert, type PanelState } from '../../panel/panel';
import { BRAND_COLORS, BRAND_INK, BrandIcon } from '../icons';
import { isLang, translate, tx } from '../../i18n';
import { Card, look, num, rangeF, str, useCycle, useNow, type Renderer, type Vars } from './common';

const langOf = (p: Params) => (isLang(p._lang) ? p._lang : 'pl');
type Lang = ReturnType<typeof langOf>;
const KIND_LABEL: Record<string, string> = {
  follow: tx('Ostatni follow'), sub: tx('Ostatni sub'), gift: tx('Ostatni gift'), bits: tx('Ostatni cheer'), raid: tx('Ostatni raid'), donate: tx('Ostatnia donacja'), reward: tx('Ostatnia nagroda'),
};
const KIND_ICON: Record<string, string> = { follow: '❤️', sub: '⭐', gift: '🎁', bits: '💎', raid: '🚀', donate: '💰', reward: '🎯' };
const amountText = (kind: string, amount: number, platform: string, lang: Lang) => {
  if (!amount) return '';
  if (kind === 'bits') return translate(lang, tx('{0} bitów'), [amount]);
  if (kind === 'gift') return translate(lang, tx('{0}× sub'), [amount]);
  if (kind === 'raid') return translate(lang, tx('{0} widzów'), [amount]);
  if (kind === 'donate' && platform === 'kick') return `${amount} Kicks`;
  return '';
};
const SAMPLE_LATEST: NonNullable<PanelState['latest']> = {
  follow: { text: 'widz123', platform: 'twitch', amount: 0, at: 0 }, sub: { text: 'kasia_gra', platform: 'kick', amount: 0, at: 0 },
  bits: { text: 'noob_pl', platform: 'twitch', amount: 500, at: 0 }, raid: { text: 'ziomek', platform: 'twitch', amount: 42, at: 0 },
  gift: { text: 'hojny', platform: 'kick', amount: 5, at: 0 },
};
const PlatformDot = ({ platform }: { platform: string }) => (platform === 'twitch' || platform === 'kick'
  ? <span className="mo-ch-pl" style={{ background: BRAND_COLORS[platform], color: BRAND_INK[platform] }}><BrandIcon brand={platform} size="0.75em" /></span>
  : null);

/* ---------------- latest follow / sub / ... ---------------- */
const Latest: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const latest = panel?.state.latest ?? (p._preview === true ? SAMPLE_LATEST : {});
  const lang = langOf(p);
  const kinds = str(p.show, 'all') === 'all' ? ['follow', 'sub', 'gift', 'bits', 'raid', 'donate'].filter((k) => latest[k]) : [str(p.show, 'follow')];
  const i = useCycle(kinds.length, num(p.every, 6) * 1000);
  const kind = kinds[i] ?? 'follow';
  const ev = latest[kind];
  if (!ev && p.showEmpty !== true) return null;
  return (
    <Card p={p} kind="latest" className={`layout-${p.layout ?? 'row'}`}>
      <div key={kind + (ev?.at ?? 0)} className="mo-latest mo-a-up">
        <span className="mo-latest-icon" aria-hidden>{KIND_ICON[kind]}</span>
        <div>
          <small>{translate(lang, KIND_LABEL[kind] ?? '')}</small>
          <b>{ev ? <>{p.showPlatform !== false && <PlatformDot platform={ev.platform} />}{ev.text}</> : '—'}</b>
          {ev && amountText(kind, ev.amount, ev.platform, lang) && <em>{amountText(kind, ev.amount, ev.platform, lang)}</em>}
        </div>
      </div>
    </Card>
  );
};

/* ---------------- event feed ---------------- */
const SAMPLE_FEED: PanelAlert[] = [
  { id: 'a', kind: 'follow', text: 'widz123', at: 0, platform: 'twitch' }, { id: 'b', kind: 'sub', text: 'kasia_gra', at: 0, platform: 'kick', months: 3 },
  { id: 'c', kind: 'bits', text: 'noob_pl', at: 0, platform: 'twitch', amount: 500 }, { id: 'd', kind: 'raid', text: 'ziomek', at: 0, platform: 'twitch', amount: 42 },
  { id: 'e', kind: 'reward', text: 'widz123', at: 0, platform: 'twitch', reward: 'Nawodnij się' },
];
const EventList: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const lang = langOf(p);
  const all = panel?.state.alerts ?? (p._preview === true ? SAMPLE_FEED : []);
  const want = str(p.kinds, 'all');
  const list = all.filter((a) => want === 'all' || (want === 'money' ? ['bits', 'donate', 'gift', 'sub'].includes(a.kind) : a.kind === want)).slice(-Math.max(1, num(p.max, 6))).reverse();
  if (!list.length && p._preview !== true) return null;
  return (
    <Card p={p} kind="events">
      {p.title && <div className="mo-title">{str(p.title)}</div>}
      <ul className="mo-events">
        {list.map((a, i) => (
          <li key={a.id ?? `${a.at}${i}`} style={{ '--i': i } as Vars}>
            <span aria-hidden>{KIND_ICON[a.kind] ?? '📣'}</span>
            {p.showPlatform !== false && a.platform && <PlatformDot platform={a.platform} />}
            <b>{a.text}</b>
            <em>{a.kind === 'reward' ? a.reward : amountText(a.kind, Number(a.amount) || 0, a.platform ?? '', lang) || (a.kind === 'sub' && (a.months ?? 0) > 1 ? translate(lang, tx('{0} mies.'), [a.months ?? 0]) : '')}</em>
          </li>
        ))}
      </ul>
    </Card>
  );
};

/* ---------------- Twitch prediction ---------------- */
const SAMPLE_PRED: NonNullable<PanelState['prediction']> = { title: 'Wygram tę rundę?', status: 'active', at: 0, locks: 0, winner: '', outcomes: [
  { id: '1', title: 'Tak', color: 'BLUE', points: 12500, users: 23 }, { id: '2', title: 'Nie', color: 'PINK', points: 8400, users: 17 },
] };
const Prediction: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const now = useNow(1000);
  const lang = langOf(p);
  const live = panel?.state.prediction;
  const pr = live && (live.status !== 'ended' || panel!.serverNow() - live.at < num(p.keep, 30) * 1000) ? live : p._preview === true ? SAMPLE_PRED : null;
  if (!pr) return null;
  const total = pr.outcomes.reduce((a, o) => a + o.points, 0) || 1;
  const left = pr.locks ? Math.max(0, Math.round((pr.locks - (panel ? panel.serverNow() : now)) / 1000)) : 0;
  return (
    <Card p={p} kind="prediction">
      <div className="mo-title">🔮 {pr.title}{pr.status === 'active' && left > 0 && <em>{left}s</em>}{pr.status === 'locked' && <em>🔒</em>}</div>
      <div className="mo-pred">
        {pr.outcomes.map((o, i) => (
          <div key={o.id} className={`mo-pred-row c${i % 2} ${pr.winner === o.id ? 'is-win' : ''} ${pr.status === 'ended' && pr.winner && pr.winner !== o.id ? 'is-lose' : ''}`}>
            <i style={{ width: `${(o.points / total) * 100}%` }} />
            <b>{pr.winner === o.id ? '🏆 ' : ''}{o.title}</b>
            <span>{Math.round((o.points / total) * 100)}% · {o.points.toLocaleString(lang)} {translate(lang, tx('pkt'))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

/* ---------------- Twitch Hype Train ---------------- */
const SAMPLE_HYPE: NonNullable<PanelState['hype']> = { status: 'active', at: 0, level: 2, total: 2400, progress: 700, goal: 1800, ends: 0, top: [{ name: 'hojny', type: 'bits', total: 1000 }] };
const HypeTrain: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const now = useNow(1000);
  const lang = langOf(p);
  const live = panel?.state.hype;
  const h = live && (live.status !== 'ended' || panel!.serverNow() - live.at < 15_000) ? live : p._preview === true ? SAMPLE_HYPE : null;
  const [prevLevel, setPrevLevel] = useState(h?.level ?? 0);
  useEffect(() => { if (h && h.level !== prevLevel) setPrevLevel(h.level); }, [h?.level]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!h) return null;
  const left = h.ends ? Math.max(0, Math.round((h.ends - (panel ? panel.serverNow() : now)) / 1000)) : 0;
  return (
    <Card p={p} kind="hype">
      <div className="mo-hype-head"><span className="mo-hype-train" aria-hidden>🚂</span><b>Hype Train</b><em key={h.level}>{translate(lang, tx('Poziom'))} {h.level}</em>{left > 0 && <small>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</small>}</div>
      <div className="tl-goal-bar has-shimmer"><i style={{ width: `${h.goal ? Math.min(100, (h.progress / h.goal) * 100) : 100}%` }} /></div>
      {h.status === 'ended' && <div className="mo-foot">{translate(lang, tx('Koniec! Dzięki wszystkim'))} 🎉</div>}
    </Card>
  );
};

/* ---------------- Twitch creator goal ---------------- */
const TwGoal: Renderer = ({ params: p }) => {
  const panel = usePanel();
  const lang = langOf(p);
  const live = panel?.state.twGoal;
  const g = live && live.status !== 'ended' ? live : p._preview === true ? { kind: 'follower', description: 'Cel followów', current: 640, target: 1000, status: 'active', at: 0 } : null;
  if (!g) return null;
  const pct = g.target ? Math.min(100, (g.current / g.target) * 100) : 0;
  return (
    <Card p={p} kind="twgoal">
      <div className="mo-sg-head"><span>{g.description || translate(lang, tx('Cel kanału'))}</span><b>{g.current.toLocaleString(lang)} / {g.target.toLocaleString(lang)}</b></div>
      <div className="tl-goal-bar has-shimmer"><i style={{ width: `${pct}%` }} /></div>
    </Card>
  );
};

const W = (id: string, name: string, icon: string, size: { w: number; h: number }, description: string, fields: OverlayDef['fields']): OverlayDef =>
  ({ id, name, icon, category: 'widget', size, description, fields });
const NEEDS = 'Działa z kanałem zalogowanym w Panelu OBS i linkiem z „Steruj z Panelu OBS”';
export const CHANNEL_DEFS: OverlayDef[] = [
  W('latest', 'Ostatni follow / sub', '🆕', { w: 520, h: 140 }, 'Nick ostatniej osoby, która dała follow, suba, gifta, bitsy, raid albo donację; sam się podmienia.', [
    { group: 'Widżet', key: 'show', label: 'Co pokazać', type: 'select', default: 'all', options: [
      { value: 'all', label: 'Wszystko na zmianę' }, { value: 'follow', label: 'Ostatni follow' }, { value: 'sub', label: 'Ostatni sub' }, { value: 'gift', label: 'Ostatni gift' },
      { value: 'bits', label: 'Ostatni cheer' }, { value: 'raid', label: 'Ostatni raid' }, { value: 'donate', label: 'Ostatnia donacja (Kicks)' },
    ], hint: NEEDS },
    rangeF('every', 'Zmiana co', 3, 30, 1, 6, 's', 'Widżet'),
    { group: 'Widżet', key: 'showPlatform', label: 'Ikona Twitch / Kick', type: 'toggle', default: true },
    { group: 'Widżet', key: 'showEmpty', label: 'Pokazuj, zanim coś przyjdzie', type: 'toggle', default: false },
    ...look('glass', 'left'),
  ]),
  W('events', 'Ostatnie zdarzenia', '📜', { w: 480, h: 420 }, 'Lista ostatnich followów, subów, bitsów, raidów i nagród z Twitcha i Kicka.', [
    { group: 'Lista', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Ostatnie zdarzenia', maxLength: 30, hint: NEEDS },
    { group: 'Lista', key: 'kinds', label: 'Co pokazywać', type: 'select', default: 'all', options: [
      { value: 'all', label: 'Wszystko' }, { value: 'money', label: 'Suby, gifty, bitsy, donacje' }, { value: 'follow', label: 'Tylko followy' }, { value: 'reward', label: 'Tylko nagrody kanału' },
    ] },
    rangeF('max', 'Ile pozycji', 1, 12, 1, 6, '', 'Lista'),
    { group: 'Lista', key: 'showPlatform', label: 'Ikona Twitch / Kick', type: 'toggle', default: true },
    ...look('glass', 'left'),
  ]),
  W('prediction', 'Predykcja Twitch', '🔮', { w: 640, h: 220 }, 'Trwająca predykcja z Twitcha: punkty na każdą odpowiedź, czas do zamknięcia i zwycięzca.', [
    rangeF('keep', 'Po zakończeniu widać przez', 5, 120, 5, 30, 's', 'Predykcja', NEEDS),
    ...look('glass'),
  ]),
  W('hypetrain', 'Hype Train Twitch', '🚂', { w: 640, h: 140 }, 'Pasek Hype Traina z poziomem i czasem; pojawia się sam, gdy pociąg rusza.', [
    ...look('neon'),
  ]),
  W('twgoal', 'Cel kanału Twitch', '🎯', { w: 900, h: 140 }, 'Cel ustawiony na Twitchu (followy, suby, bitsy) z paskiem postępu na żywo.', [
    ...look('glass'),
  ]),
];
export const CHANNEL_RENDERERS: Record<string, Renderer> = { latest: Latest, events: EventList, prediction: Prediction, hypetrain: HypeTrain, twgoal: TwGoal };
