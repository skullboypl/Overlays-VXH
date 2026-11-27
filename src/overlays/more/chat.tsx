// Twitch + Kick chat in one overlay. Read-only and without any login: Twitch through its anonymous IRC WebSocket,
// Kick through the public Pusher channel of the chatroom. Optional 7TV / BTTV / FFZ emotes.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OverlayDef, Params } from '../schema';
import { BRAND_COLORS, BRAND_INK, BrandIcon } from '../icons';
import { isLang, translate } from '../../i18n';
import { fontOf, lines, num, rangeF, str, type Renderer, type Vars } from './common';

type Part = { t: 'text'; v: string } | { t: 'emote'; url: string; name: string } | { t: 'mention'; v: string };
export type Msg = { id: string; platform: 'twitch' | 'kick'; user: string; login: string; color: string; badges: string[]; parts: Part[]; text: string; at: number; action?: boolean };
export type Sink = { add: (m: Msg) => void; remove: (id: string) => void; clearUser: (login: string) => void; clearAll: () => void; room?: (id: string) => void };

const langOf = (p: Params) => (isLang(p._lang) ? p._lang : 'pl');
const cleanId = (v: unknown) => String(v ?? '').replace(/[^A-Za-z0-9_-]/g, '');
const EMOTE_HOST = /^https:\/\/(static-cdn\.jtvnw\.net|files\.kick\.com|cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com)\//;

/* ---------------- Twitch IRC ---------------- */
const unescapeTag = (v: string) => v.replace(/\\(s|:|\\|r|n)/g, (_, c) => ({ s: ' ', ':': ';', '\\': '\\', r: '\r', n: '\n' } as Record<string, string>)[c]);
export const parseIrc = (line: string) => {
  let rest = line;
  const tags: Record<string, string> = {};
  if (rest.startsWith('@')) {
    const sp = rest.indexOf(' ');
    for (const kv of rest.slice(1, sp).split(';')) { const i = kv.indexOf('='); tags[kv.slice(0, i)] = unescapeTag(kv.slice(i + 1)); }
    rest = rest.slice(sp + 1);
  }
  let prefix = '';
  if (rest.startsWith(':')) { const sp = rest.indexOf(' '); prefix = rest.slice(1, sp); rest = rest.slice(sp + 1); }
  const ti = rest.indexOf(' :');
  const head = ti >= 0 ? rest.slice(0, ti) : rest;
  const trailing = ti >= 0 ? rest.slice(ti + 2) : '';
  const [command, ...params] = head.split(' ');
  return { tags, prefix, command, params, trailing };
};
/** "25:0-4,12-16/1902:6-10" on the message text -> text and emote parts (positions count Unicode code points). */
export const twitchParts = (text: string, emotes: string): Part[] => {
  const chars = Array.from(text);
  const spots: { s: number; e: number; id: string }[] = [];
  for (const group of emotes.split('/').filter(Boolean)) {
    const [id, ranges] = group.split(':');
    for (const r of (ranges ?? '').split(',')) { const [s, e] = r.split('-').map(Number); if (Number.isFinite(s) && Number.isFinite(e)) spots.push({ s, e, id: cleanId(id) }); }
  }
  spots.sort((a, b) => a.s - b.s);
  const out: Part[] = [];
  let at = 0;
  for (const sp of spots) {
    if (sp.s > at) out.push({ t: 'text', v: chars.slice(at, sp.s).join('') });
    out.push({ t: 'emote', url: `https://static-cdn.jtvnw.net/emoticons/v2/${sp.id}/default/dark/2.0`, name: chars.slice(sp.s, sp.e + 1).join('') });
    at = sp.e + 1;
  }
  if (at < chars.length) out.push({ t: 'text', v: chars.slice(at).join('') });
  return out;
};

export const useTwitchChat = (channel: string, sink: React.MutableRefObject<Sink>) => {
  useEffect(() => {
    const ch = channel.trim().toLowerCase().replace(/^#/, '');
    if (!/^[a-z0-9_]{2,25}$/.test(ch)) return undefined;
    let ws: WebSocket | null = null;
    let alive = true;
    let retry: number | undefined;
    let tries = 0;
    const connect = () => {
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      ws.onopen = () => {
        tries = 0;
        ws?.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws?.send('PASS SCHMOOPIIE');
        ws?.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`);
        ws?.send(`JOIN #${ch}`);
      };
      ws.onmessage = (ev) => {
        for (const line of String(ev.data).split('\r\n').filter(Boolean)) {
          if (line.startsWith('PING')) { ws?.send(line.replace('PING', 'PONG')); continue; }
          const m = parseIrc(line);
          if (m.command === 'ROOMSTATE' && m.tags['room-id']) sink.current.room?.(m.tags['room-id']);
          else if (m.command === 'CLEARMSG' && m.tags['target-msg-id']) sink.current.remove(`t:${m.tags['target-msg-id']}`);
          else if (m.command === 'CLEARCHAT') { if (m.trailing) sink.current.clearUser(m.trailing.toLowerCase()); else sink.current.clearAll(); }
          else if (m.command === 'PRIVMSG') {
            let text = m.trailing;
            let action = false;
            if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) { text = text.slice(8, -1); action = true; }
            const login = m.prefix.split('!')[0] ?? '';
            sink.current.add({
              id: `t:${m.tags.id || Math.random().toString(36).slice(2)}`, platform: 'twitch', user: m.tags['display-name'] || login, login: login.toLowerCase(),
              color: /^#[0-9a-f]{6}$/i.test(m.tags.color ?? '') ? m.tags.color : '', badges: (m.tags.badges ?? '').split(',').map((b) => b.split('/')[0]).filter(Boolean),
              parts: twitchParts(text, m.tags.emotes ?? ''), text, at: Date.now(), action,
            });
          }
        }
      };
      ws.onclose = () => { if (alive) retry = window.setTimeout(connect, Math.min(30_000, 2000 * ++tries)); };
    };
    connect();
    return () => { alive = false; window.clearTimeout(retry); if (ws) { ws.onclose = null; ws.close(); } };
  }, [channel, sink]);
};

/* ---------------- Kick (Pusher) ---------------- */
const KICK_EMOTE = /\[emote:(\d+):([^\]]*)\]/g;
export const kickParts = (content: string): Part[] => {
  const out: Part[] = [];
  let at = 0;
  for (const m of content.matchAll(KICK_EMOTE)) {
    if ((m.index ?? 0) > at) out.push({ t: 'text', v: content.slice(at, m.index) });
    out.push({ t: 'emote', url: `https://files.kick.com/emotes/${cleanId(m[1])}/fullsize`, name: m[2] });
    at = (m.index ?? 0) + m[0].length;
  }
  if (at < content.length) out.push({ t: 'text', v: content.slice(at) });
  return out;
};
export const useKickChat = (channel: string, sink: React.MutableRefObject<Sink>, onUser: (id: number) => void) => {
  useEffect(() => {
    const ch = channel.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(ch)) return undefined;
    let ws: WebSocket | null = null;
    let alive = true;
    let retry: number | undefined;
    const connect = async () => {
      try {
        const b = await (await fetch(`/api/followers?platform=kick&channel=${encodeURIComponent(ch)}`)).json().catch(() => ({}));
        const room = Number(b.chatroom ?? 0);
        if (!alive) return;
        if (!room) { retry = window.setTimeout(connect, 60_000); return; }
        if (b.userId) onUser(Number(b.userId));
        ws = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false');
        ws.onopen = () => ws?.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${room}.v2` } }));
        ws.onmessage = (e) => {
          try {
            const m = JSON.parse(String(e.data));
            if (m.event === 'pusher:ping') { ws?.send(JSON.stringify({ event: 'pusher:pong', data: {} })); return; }
            const ev = String(m.event ?? '');
            const d = typeof m.data === 'string' ? JSON.parse(m.data) : m.data ?? {};
            if (ev.endsWith('ChatMessageEvent')) {
              const content = String(d.content ?? '');
              const sender = d.sender ?? {};
              sink.current.add({
                id: `k:${d.id ?? Math.random().toString(36).slice(2)}`, platform: 'kick', user: String(sender.username ?? ''), login: String(sender.slug ?? sender.username ?? '').toLowerCase(),
                color: /^#[0-9a-f]{6}$/i.test(sender.identity?.color ?? '') ? sender.identity.color : '',
                badges: Array.isArray(sender.identity?.badges) ? sender.identity.badges.map((x: { type?: string }) => String(x.type ?? '')) : [],
                parts: kickParts(content), text: content.replace(KICK_EMOTE, '$2'), at: Date.now(),
              });
            } else if (ev.endsWith('MessageDeletedEvent')) sink.current.remove(`k:${d.message?.id ?? ''}`);
            else if (ev.endsWith('UserBannedEvent')) sink.current.clearUser(String(d.user?.slug ?? d.user?.username ?? '').toLowerCase());
            else if (ev.endsWith('ChatroomClearEvent')) sink.current.clearAll();
          } catch { /* not ours */ }
        };
        ws.onclose = () => { if (alive) retry = window.setTimeout(connect, 5000); };
      } catch { if (alive) retry = window.setTimeout(connect, 15_000); }
    };
    void connect();
    return () => { alive = false; window.clearTimeout(retry); if (ws) { ws.onclose = null; ws.close(); } };
  }, [channel, sink]); // eslint-disable-line react-hooks/exhaustive-deps
};

/* ---------------- 7TV / BTTV / FFZ ---------------- */
const getJson = async (url: string) => { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } };
const sevenTv = (set: { emotes?: { name: string; data?: { host?: { url?: string } } }[] } | null | undefined, out: Map<string, string>) => {
  for (const e of set?.emotes ?? []) { const u = e.data?.host?.url; if (u) out.set(e.name, `https:${u}/2x.webp`); }
};
const useExtraEmotes = (on: boolean, twitchId: string, kickId: number) => {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!on) { setMap(new Map()); return undefined; }
    let alive = true;
    void (async () => {
      const out = new Map<string, string>();
      const [g7, gb, gf] = await Promise.all([getJson('https://7tv.io/v3/emote-sets/global'), getJson('https://api.betterttv.net/3/cached/emotes/global'), getJson('https://api.betterttv.net/3/cached/frankerfacez/emotes/global')]);
      sevenTv(g7, out);
      for (const e of Array.isArray(gb) ? gb : []) out.set(e.code, `https://cdn.betterttv.net/emote/${cleanId(e.id)}/2x`);
      for (const e of Array.isArray(gf) ? gf : []) if (e.images?.['2x'] || e.images?.['1x']) out.set(e.code, String(e.images['2x'] ?? e.images['1x']));
      if (twitchId) {
        const [u7, ub, uf] = await Promise.all([getJson(`https://7tv.io/v3/users/twitch/${cleanId(twitchId)}`), getJson(`https://api.betterttv.net/3/cached/users/twitch/${cleanId(twitchId)}`), getJson(`https://api.betterttv.net/3/cached/frankerfacez/users/twitch/${cleanId(twitchId)}`)]);
        sevenTv(u7?.emote_set, out);
        for (const e of [...(ub?.channelEmotes ?? []), ...(ub?.sharedEmotes ?? [])]) out.set(e.code, `https://cdn.betterttv.net/emote/${cleanId(e.id)}/2x`);
        for (const e of Array.isArray(uf) ? uf : []) if (e.images?.['2x'] || e.images?.['1x']) out.set(e.code, String(e.images['2x'] ?? e.images['1x']));
      }
      if (kickId) sevenTv((await getJson(`https://7tv.io/v3/users/kick/${kickId}`))?.emote_set, out);
      for (const [k, v] of out) if (!EMOTE_HOST.test(v)) out.delete(k);
      if (alive) setMap(out);
    })();
    return () => { alive = false; };
  }, [on, twitchId, kickId]);
  return map;
};

/** Words that are 7TV / BTTV / FFZ emotes become pictures; @nick becomes a mention. */
const enrich = (parts: Part[], extra: Map<string, string>): Part[] => parts.flatMap((p): Part[] => {
  if (p.t !== 'text') return [p];
  const out: Part[] = [];
  for (const w of p.v.split(/(\s+)/)) {
    if (!w) continue;
    const url = extra.get(w);
    if (url) out.push({ t: 'emote', url, name: w });
    else if (/^@[A-Za-z0-9_]{2,25}[,.!?]?$/.test(w)) out.push({ t: 'mention', v: w });
    else out.push({ t: 'text', v: w });
  }
  return out;
});

/* ---------------- badges ---------------- */
const BADGES: Record<string, [string, string]> = {
  broadcaster: ['#e91916', '🎥'], moderator: ['#00ad03', '⚔'], vip: ['#e005b9', '◆'], subscriber: ['#8205b4', '★'], founder: ['#d4a017', '★'],
  og: ['#3ea6ff', 'OG'], verified: ['#53fc18', '✓'], partner: ['#9146ff', '✓'], sub_gifter: ['#ff7a00', '🎁'], 'sub-gifter': ['#ff7a00', '🎁'], staff: ['#000000', '⚙'],
};

/* ---------------- demo ---------------- */
const DEMO: Omit<Msg, 'id' | 'at' | 'parts'>[] = [
  { platform: 'twitch', user: 'widz123', login: 'widz123', color: '#ff7f50', badges: ['subscriber'], text: 'siema! co dziś gramy?' },
  { platform: 'kick', user: 'kasia_gra', login: 'kasia_gra', color: '#53fc18', badges: ['vip'], text: 'hej hej 👋 pierwsza na kicku' },
  { platform: 'twitch', user: 'Nightbot', login: 'nightbot', color: '#7c7cff', badges: ['moderator'], text: 'Discord: discord.gg/xyz' },
  { platform: 'twitch', user: 'noob_pl', login: 'noob_pl', color: '#1e90ff', badges: [], text: '!sens' },
  { platform: 'kick', user: 'ziomek', login: 'ziomek', color: '#ffd23f', badges: ['og', 'subscriber'], text: '@skullboypl GG WP, ale clutch 🔥' },
  { platform: 'twitch', user: 'skullboypl', login: 'skullboypl', color: '#ff5900', badges: ['broadcaster'], text: 'dzięki za follow, wbijajcie na discorda' },
];

/* ---------------- overlay ---------------- */
const Chat: Renderer = ({ params: p }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [twitchId, setTwitchId] = useState('');
  const [kickId, setKickId] = useState(0);
  const max = Math.round(num(p.max, 12));
  useEffect(() => { setMsgs((list) => list.slice(-Math.max(1, max))); }, [max]);
  const fadeS = num(p.fade, 0);
  const pRef = useRef(p);
  pRef.current = p;
  const bots = useMemo(() => new Set(lines(p.bots).map((b) => b.toLowerCase())), [p.bots]);
  const blocked = useMemo(() => lines(p.blocked).map((b) => b.toLowerCase()), [p.blocked]);
  const sink = useRef<Sink>({ add: () => {}, remove: () => {}, clearUser: () => {}, clearAll: () => {} });
  sink.current = {
    add: (m) => {
      const pp = pRef.current;
      if (pp.hideCommands !== false && m.text.trim().startsWith('!')) return;
      if (pp.hideBots !== false && bots.has(m.login)) return;
      const low = m.text.toLowerCase();
      if (blocked.some((w) => w && low.includes(w))) return;
      if (pp.hideLinks === true && /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|pl|gg|tv|net|org|io|xyz)\b)/i.test(m.text)) return;
      setMsgs((list) => [...list.filter((x) => x.id !== m.id), m].slice(-Math.max(1, Math.round(num(pp.max, 12)))));
    },
    remove: (id) => setMsgs((list) => list.filter((m) => m.id !== id)),
    clearUser: (login) => setMsgs((list) => list.filter((m) => m.login !== login)),
    clearAll: () => setMsgs([]),
    room: (id) => setTwitchId(id),
  };
  useTwitchChat(str(p.twitch), sink);
  useKickChat(str(p.kick), sink, setKickId);
  const extra = useExtraEmotes(p.thirdParty !== false, twitchId, kickId);

  // Studio preview (or "test" switch): sample messages from both services.
  const demo = p._preview === true || p.demo === true;
  useEffect(() => {
    if (!demo) return undefined;
    let k = 0;
    const go = () => { const d = DEMO[k++ % DEMO.length]; sink.current.add({ ...d, id: `d:${k}:${Date.now()}`, at: Date.now(), parts: [{ t: 'text', v: d.text }] }); };
    for (let i = 0; i < 4; i++) go();
    const id = window.setInterval(go, 1800);
    return () => window.clearInterval(id);
  }, [demo]);

  // Messages leave after `fade` seconds (0 = they stay until pushed out by newer ones).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!fadeS) return undefined;
    const id = window.setInterval(() => { const t = Date.now(); setNow(t); setMsgs((list) => list.filter((m) => t - m.at < fadeS * 1000 + 600)); }, 400);
    return () => window.clearInterval(id);
  }, [fadeS]);

  const lang = langOf(p);
  const me = [str(p.twitch), str(p.kick)].map((s) => s.trim().toLowerCase()).filter(Boolean);
  const shown = p.direction === 'top' ? [...msgs].reverse() : msgs;
  const style: Vars = {
    // The px picked in the studio is the size on a 420 × 720 source; a bigger source scales it up.
    '--fs': `max(9px, calc(min(100cqw / 420, 100cqh / 720) * ${num(p.fontSize, 18)}))`,
    '--font': fontOf(p, 'dm'), '--accent': str(p.accent, '#ff5900'), '--bg': str(p.bg, '#111114'), '--fg': str(p.textColor, '#ffffff'),
    '--alpha': num(p.opacity, 0.75), '--emote': num(p.emoteSize, 1.6), '--radius': `${num(p.radius, 14)}px`,
  };
  return (
    <div className={`ov-fill mo-chat style-${p.style ?? 'bubble'} dir-${p.direction ?? 'bottom'} align-${p.align ?? 'left'} anim-${p.anim ?? 'slide'} names-${p.nameColor ?? 'user'}`} style={style}>
      <div className="mo-chat-list" aria-live="polite">
        {shown.map((m) => {
          const mention = p.highlightMentions !== false && me.some((n) => m.text.toLowerCase().includes(`@${n}`));
          const mod = p.highlightMods === true && m.badges.some((b) => b === 'moderator' || b === 'broadcaster');
          const leaving = fadeS > 0 && now - m.at > fadeS * 1000;
          return (
            <div key={m.id} className={`mo-chat-msg is-${m.platform} ${mention ? 'is-mention' : ''} ${mod ? 'is-mod' : ''} ${m.action ? 'is-action' : ''} ${leaving ? 'is-out' : ''}`}
              style={{ '--uc': m.color || (m.platform === 'kick' ? '#53fc18' : '#a970ff') } as Vars}>
              <span className="mo-chat-head">
                {p.showPlatform !== false && (
                  <span className="mo-chat-pl" style={{ background: BRAND_COLORS[m.platform], color: BRAND_INK[m.platform] }} title={m.platform === 'kick' ? 'Kick' : 'Twitch'}>
                    <BrandIcon brand={m.platform} size="0.8em" />
                  </span>
                )}
                {p.showBadges !== false && m.badges.slice(0, 3).map((b) => BADGES[b] && <span key={b} className="mo-chat-badge" style={{ background: BADGES[b][0] }}>{BADGES[b][1]}</span>)}
                <b className="mo-chat-name">{m.user}</b>
                {p.style !== 'card' && !m.action && <span className="mo-chat-colon">:</span>}
              </span>
              <span className="mo-chat-text">
                {enrich(m.parts, extra).map((part, i) => part.t === 'emote'
                  ? <img key={i} className="mo-chat-emote" src={part.url} alt={part.name} title={part.name} />
                  : part.t === 'mention' ? <b key={i} className="mo-chat-at">{part.v}</b> : <span key={i}>{part.v}</span>)}
              </span>
            </div>
          );
        })}
      </div>
      {!msgs.length && !str(p.twitch).trim() && !str(p.kick).trim() && p._preview === true && <div className="mo-chat-empty">{translate(lang, 'Wpisz kanał Twitch albo Kick')}</div>}
    </div>
  );
};

const F = (key: string, label: string, def: boolean, group = 'Wiadomości'): OverlayDef['fields'][number] => ({ group, key, label, type: 'toggle', default: def });
export const CHAT_DEFS: OverlayDef[] = [{
  id: 'chat', name: 'Czat Twitch + Kick', icon: '💬', category: 'widget', size: { w: 420, h: 720 },
  description: 'Czat z Twitcha i Kicka w jednym oknie: emotki (także 7TV, BTTV, FFZ), odznaki, kolory nicków, znikanie wiadomości i filtry. Bez logowania.',
  fields: [
    { group: 'Kanały', key: 'twitch', label: 'Kanał Twitch', type: 'text', default: 'skullboypl', maxLength: 25, placeholder: 'nick na Twitchu', hint: 'Puste: bez czatu z Twitcha' },
    { group: 'Kanały', key: 'kick', label: 'Kanał Kick', type: 'text', default: 'skullboypl', maxLength: 40, placeholder: 'nick na Kicku', hint: 'Puste: bez czatu z Kicka' },
    F('thirdParty', 'Emotki 7TV, BTTV i FFZ', true, 'Kanały'),
    { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'bubble', options: [
      { value: 'bubble', label: 'Dymki' }, { value: 'plain', label: 'Sam tekst z cieniem' }, { value: 'boxed', label: 'Jedno tło pod całym czatem' },
      { value: 'card', label: 'Karty (nick nad wiadomością)' }, { value: 'neon', label: 'Neon' },
    ] },
    { group: 'Wygląd', key: 'direction', label: 'Nowe wiadomości', type: 'select', default: 'bottom', options: [{ value: 'bottom', label: 'Na dole' }, { value: 'top', label: 'Na górze' }] },
    { group: 'Wygląd', key: 'align', label: 'Wyrównanie', type: 'select', default: 'left', options: [{ value: 'left', label: 'Lewo' }, { value: 'right', label: 'Prawo' }] },
    { group: 'Wygląd', key: 'anim', label: 'Wejście wiadomości', type: 'select', default: 'slide', options: [{ value: 'slide', label: 'Wjazd z boku' }, { value: 'fade', label: 'Zanik' }, { value: 'pop', label: 'Wyskok' }, { value: 'none', label: 'Bez animacji' }] },
    rangeF('fontSize', 'Wielkość tekstu', 10, 40, 1, 18, 'px', 'Wygląd', 'Rośnie razem ze źródłem w OBS'),
    { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'dm', options: [{ value: 'dm', label: 'DM Sans' }, { value: 'poppins', label: 'Poppins' }, { value: 'russo', label: 'Russo' }, { value: 'bebas', label: 'Bebas' }, { value: 'pacifico', label: 'Pacifico' }] },
    rangeF('emoteSize', 'Wielkość emotek', 1, 3, 0.1, 1.6, '×', 'Wygląd'),
    rangeF('opacity', 'Krycie tła', 0, 1, 0.05, 0.75, '', 'Wygląd'),
    rangeF('radius', 'Zaokrąglenie', 0, 30, 1, 14, 'px', 'Wygląd'),
    { group: 'Wygląd', key: 'nameColor', label: 'Kolor nicków', type: 'select', default: 'user', options: [{ value: 'user', label: 'Jak na czacie' }, { value: 'platform', label: 'Kolor serwisu' }, { value: 'accent', label: 'Akcent' }] },
    F('showPlatform', 'Ikona Twitch / Kick', true, 'Wygląd'), F('showBadges', 'Odznaki (mod, sub, VIP)', true, 'Wygląd'),
    rangeF('max', 'Najwięcej wiadomości', 3, 50, 1, 12, '', 'Wiadomości'),
    rangeF('fade', 'Znikają po', 0, 300, 5, 0, ' s', 'Wiadomości', '0: zostają, aż wypchną je nowsze'),
    F('hideCommands', 'Ukryj komendy (!...)', true), F('hideBots', 'Ukryj boty', true),
    { group: 'Wiadomości', key: 'bots', label: 'Boty', type: 'text', list: 'lines', default: 'Nightbot | StreamElements | Streamlabs | Moobot | Fossabot | Sery_Bot | BotRixOficial | KickBot', maxLength: 400, placeholder: 'nick bota', when: { key: 'hideBots', is: [true] } },
    F('hideLinks', 'Ukryj wiadomości z linkami', false),
    { group: 'Wiadomości', key: 'blocked', label: 'Zablokowane słowa', type: 'text', list: 'lines', default: '', maxLength: 400, placeholder: 'słowo', hint: 'Wiadomość z takim słowem się nie pokaże' },
    F('highlightMentions', 'Wyróżnij @wzmianki kanału', true), F('highlightMods', 'Wyróżnij moderatorów', false),
    { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
    { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
    { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
    F('demo', 'Wiadomości testowe', false, 'Test'),
  ],
}];
export const CHAT_RENDERERS: Record<string, Renderer> = { chat: Chat };
