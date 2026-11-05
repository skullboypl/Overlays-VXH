// Saved setups live only in this browser's localStorage. Share codes are how a setup moves
// to another PC: a code is just the overlay id and its link query, base64url-encoded.

import { findOverlay } from '../overlays/registry';

export type Preset = { id: string; overlay: string; name: string; query: string; savedAt: number };

const KEY = 'vxh-overlays:presets';
const PREFIX = 'VXH1-';

export const listPresets = (): Preset[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((p) => p && findOverlay(p.overlay)) : [];
  } catch {
    return [];
  }
};

const write = (list: Preset[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
};

export const savePreset = (overlay: string, name: string, query: string): Preset[] => {
  const list = listPresets();
  const same = list.find((p) => p.overlay === overlay && p.name.toLowerCase() === name.toLowerCase());
  if (same) Object.assign(same, { query, savedAt: Date.now() });
  else list.unshift({ id: Math.random().toString(36).slice(2, 10), overlay, name, query, savedAt: Date.now() });
  write(list);
  return list;
};

export const deletePreset = (id: string): Preset[] => {
  const list = listPresets().filter((p) => p.id !== id);
  write(list);
  return list;
};

export const storageWorks = () => {
  try {
    localStorage.setItem('vxh-overlays:probe', '1');
    localStorage.removeItem('vxh-overlays:probe');
    return true;
  } catch {
    return false;
  }
};

// ---------- share codes ----------

type Entry = { o: string; q: string; n?: string };

const toB64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (code: string) => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export const encodeShare = (overlay: string, query: string, name?: string) =>
  PREFIX + toB64(JSON.stringify(name ? { o: overlay, q: query, n: name } : { o: overlay, q: query }));

export const encodeBundle = (presets: Preset[]) =>
  PREFIX + toB64(JSON.stringify({ p: presets.map((p) => ({ o: p.overlay, q: p.query, n: p.name })) }));

export type Imported = { entries: Entry[] };

/** Accepts a share code, a bundle code, an OBS link (/o/snow?...) or a studio link (/snow?...). */
export const parseImport = (raw: string): Imported | null => {
  const text = raw.trim();
  if (!text) return null;
  if (text.startsWith(PREFIX)) {
    try {
      const data = JSON.parse(fromB64(text.slice(PREFIX.length)));
      const entries: Entry[] = Array.isArray(data.p) ? data.p : [data];
      const valid = entries.filter((e) => e && typeof e.o === 'string' && findOverlay(e.o) && typeof e.q === 'string');
      return valid.length ? { entries: valid } : null;
    } catch {
      return null;
    }
  }
  try {
    const url = new URL(text, window.location.origin);
    const id = url.pathname.replace(/^\/(o\/)?/, '').replace(/\/$/, '');
    if (findOverlay(id)) return { entries: [{ o: id, q: url.search.replace(/^\?/, '') }] };
  } catch {
    /* not a link */
  }
  return null;
};
