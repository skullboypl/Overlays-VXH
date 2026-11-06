// OBS panel, browser side: the secret key, the read-only room id, and the live state for overlays and the dock.
import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type TimerState = { mode: 'countdown' | 'stopwatch'; total: number; left: number; running: boolean; at: number };
export type PanelState = {
  hidden: Record<string, boolean>;
  timer: TimerState | null;
  goal: { current: number | null; target: number | null };
  reminder: { fire: number; paused: boolean };
};
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
export type PanelLink = { state: PanelState; serverNow: () => number } | null;
export const PanelContext = createContext<PanelLink>(null);
export const usePanel = () => useContext(PanelContext);
