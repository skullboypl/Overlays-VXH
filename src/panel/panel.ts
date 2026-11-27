// OBS panel, browser side: the secret key, the read-only room id, and the live state for overlays and the dock.
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type TimerState = { mode: 'countdown' | 'stopwatch'; total: number; left: number; running: boolean; at: number };
export type PanelState = {
  hidden: Record<string, boolean>;
  timer: TimerState | null;
  goal: { current: number | null; target: number | null };
  reminder: { fire: number; paused: boolean };
  /** Added later; a server or dock from before sends none of these. */
  counters?: Record<string, number>;
  fire?: Record<string, number>;
  alert?: PanelAlert | null;
  /** Last alerts, newest last (manual and from Twitch / Kick). */
  alerts?: PanelAlert[];
  /** Linked channels: platform -> channel name. */
  links?: Partial<Record<'twitch' | 'kick', string>>;
  /** Channel point reward title (lower case) -> effect trigger name. */
  rewardFx?: Record<string, string>;
  /** From linked channels: the latest event of each kind, per-person totals, and live Twitch poll / prediction / Hype Train / goal. */
  latest?: Record<string, { text: string; platform: string; amount: number; at: number }>;
  givers?: Record<string, { name: string; platform: string; bits: number; gifts: number; kicks: number }>;
  poll?: { title: string; status: string; at: number; ends: number; choices: { title: string; votes: number }[] };
  prediction?: { title: string; status: string; at: number; locks: number; winner: string; outcomes: { id: string; title: string; color: string; points: number; users: number }[] };
  hype?: { status: string; at: number; level: number; total: number; progress: number; goal: number; ends: number; top: { name: string; type: string; total: number }[] };
  twGoal?: { status: string; at: number; kind: string; description: string; current: number; target: number };
  /** Now playing from the PC app; `cover` is the version of the picture at /api/panel/<room>/cover (0 = none). */
  music?: { title: string; artist: string; album: string; app: string; playing: boolean; position: number; duration: number; at: number; cover: number } | null;
};
export type PanelAlert = { id?: string; text: string; kind: string; at: number; amount?: number; months?: number; reward?: string; note?: string; platform?: string };
export type PanelSnapshot = { room: string; version: number; now: number; sources: number; state: PanelState };

const KEY_STORE = 'vxh-overlays:panel-key';
const STATE_STORE = 'vxh-overlays:panel-state';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** 32 random bytes from the browser's cryptographic generator: 43 characters, never made or kept by the server. */
export const newKey = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
export const isKey = (k: unknown): k is string => typeof k === 'string' && /^[A-Za-z0-9_-]{43}$/.test(k);

/** Room id = first 32 hex chars of sha256(key), the same as the server computes. Overlays only ever see this. */
export const roomOf = async (key: string) => {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  return Array.from(hash.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
};

export const savedKey = () => { const k = store.get(KEY_STORE); return isKey(k) ? k : null; };
export const saveKey = (k: string) => store.set(KEY_STORE, k);
export const forgetKey = () => { store.del(KEY_STORE); store.del(STATE_STORE); };
export const savedState = (): PanelState | null => { try { return JSON.parse(store.get(STATE_STORE) ?? 'null'); } catch { return null; } };
export const saveState = (s: PanelState) => store.set(STATE_STORE, JSON.stringify(s));

const post = async (action: string, body: object) => {
  const res = await fetch(`/api/panel/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

/** A fresh key whose room nobody has: the server refuses a room that already exists, then we draw again. */
export const createKey = async () => {
  for (let i = 0; i < 5; i += 1) {
    const key = newKey();
    const r = await post('claim', { key, fresh: true });
    if (r.ok) { saveKey(key); store.del(STATE_STORE); return key; }
    if (r.status !== 409) throw new Error(r.data?.error ?? String(r.status));
  }
  throw new Error('no_free_room');
};
export const claim = (key: string) => post('claim', { key });

/**
 * The room a key opens. Normally the hash of the key; after "new key" (owner logged in) the room keeps its old id,
 * so the server says which one it is. Cached per key in this browser.
 */
const ROOM_STORE = 'vxh-overlays:panel-room';
export const rememberRoom = async (key: string, room: string) => store.set(ROOM_STORE, `${await roomOf(key)}:${room}`);
export const roomFor = async (key: string) => {
  const h = await roomOf(key);
  const cached = store.get(ROOM_STORE);
  if (cached?.startsWith(`${h}:`)) return cached.slice(h.length + 1);
  try {
    const r = await claim(key);
    if (r.ok && typeof r.data?.room === 'string') { store.set(ROOM_STORE, `${h}:${r.data.room}`); return r.data.room as string; }
  } catch { /* offline: the hash is right for every key that was never replaced */ }
  return h;
};

/* ---------- login with Twitch / Kick ---------- */
export type Account = { platform: 'twitch' | 'kick'; login: string };
export type Me = { twitch: boolean; kick: boolean; accounts: Account[]; panels: { room: string; links: Partial<Record<'twitch' | 'kick', string>> }[] };
const account = async (action: string, body: object) => {
  const res = await fetch(`/api/account/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
};
export const fetchMe = async (): Promise<Me | null> => {
  try { const r = await fetch('/api/account/me', { credentials: 'same-origin', cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; }
};
export const loginWith = async (platform: 'twitch' | 'kick', key: string | null) => {
  const r = await account('login', { platform, key: key ?? undefined });
  if (r.ok && r.data.url) { window.location.href = r.data.url; return null; }
  return String(r.data.error ?? 'failed');
};
export const claimPanel = (key: string) => account('claim', { key });
export const unlinkChannel = (room: string, platform: 'twitch' | 'kick') => account('unlink', { room, platform });
export const logout = () => account('logout', {});
/** Owner only: a fresh key for the same room; overlay links keep working, the old dock link stops. */
export const rotateKey = async (room: string) => {
  const key = newKey();
  const r = await account('rotate', { room, newKey: key });
  if (!r.ok) return null;
  saveKey(key);
  store.del(STATE_STORE);
  await rememberRoom(key, room);
  return key;
};
export const update = (key: string, patch: object) => post('update', { key, patch });
export const drop = (key: string) => post('drop', { key });

/** Live state of a room (Server-Sent Events, with polling as a fallback). `offset` maps the server clock onto ours. */
export const useRoom = (room: string | null, watch = false) => {
  const [snap, setSnap] = useState<PanelSnapshot | null>(null);
  const offset = useRef(0);
  useEffect(() => {
    if (!room || !/^[a-f0-9]{32}$/.test(room)) return undefined;
    let poll: number | undefined;
    let alive = true;
    const take = (raw: string) => {
      try {
        const s = JSON.parse(raw) as PanelSnapshot;
        offset.current = s.now - Date.now();
        if (alive) setSnap(s);
      } catch { /* ignore */ }
    };
    const startPolling = () => {
      if (poll) return;
      const tick = () => fetch(`/api/panel/${room}`, { cache: 'no-store' }).then((r) => r.text()).then(take).catch(() => {});
      tick();
      poll = window.setInterval(tick, 3000);
    };
    let es: EventSource | null = null;
    if ('EventSource' in window) {
      es = new EventSource(`/api/panel/${room}/events${watch ? '?watch=1' : ''}`);
      es.onmessage = (e) => take(e.data);
      // EventSource reconnects by itself; polling covers proxies that never let it through.
      es.onerror = () => { if (es && es.readyState === EventSource.CLOSED) startPolling(); };
    } else startPolling();
    return () => { alive = false; es?.close(); window.clearInterval(poll); };
  }, [room, watch]);
  return { snap, offset };
};

/** Milliseconds shown by a panel-controlled timer right now. */
export const timerValue = (t: TimerState, serverNow: number) => {
  const elapsed = t.running ? Math.max(0, serverNow - t.at) : 0;
  return t.mode === 'countdown' ? Math.max(0, t.left - elapsed) : t.left + elapsed;
};

/** What an overlay opened with ?panel=<room> gets from the dock. */
export type PanelLink = { state: PanelState; serverNow: () => number; room?: string } | null;
export const PanelContext = createContext<PanelLink>(null);
export const usePanel = () => useContext(PanelContext);
