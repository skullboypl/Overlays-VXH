import { useEffect, useState } from 'react';

/** Live counter of overlays open in OBS (server: deploy/stats-server.mjs). */
export type LiveStats = { live: number; byType: Record<string, number>; peakToday: number };

const PING_MS = 60_000;
const REFRESH_MS = 30_000;

/** Heartbeat from an OBS source: a random id made up for this page load and the overlay type, nothing else. */
export const startPresence = (overlay: string) => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const ping = () => {
    fetch('/api/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, o: overlay }),
      keepalive: true,
    }).catch(() => { /* counter is optional */ });
  };
  ping();
  const timer = window.setInterval(ping, PING_MS);
  return () => window.clearInterval(timer);
};

// One shared poll for every component that shows the numbers.
let current: LiveStats | null = null;
let failed = false;
const listeners = new Set<() => void>();
let timer: number | undefined;

const load = async () => {
  if (document.hidden) return;
  try {
    const res = await fetch('/api/presence', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    current = { live: Number(data.live) || 0, byType: data.byType ?? {}, peakToday: Number(data.peakToday) || 0 };
    failed = false;
  } catch {
    failed = true;
  }
  listeners.forEach((l) => l());
};

/** Latest numbers, or null while loading / when the counter is not reachable (local preview, outage). */
export const useLiveStats = (): LiveStats | null => {
  const [, render] = useState(0);
  useEffect(() => {
    const listener = () => render((n) => n + 1);
    listeners.add(listener);
    if (listeners.size === 1) {
      void load();
      timer = window.setInterval(load, REFRESH_MS);
      document.addEventListener('visibilitychange', load);
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', load);
      }
    };
  }, []);
  return failed ? null : current;
};
