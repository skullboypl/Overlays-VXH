// OBS panel: a dock in OBS controls the overlays of one streamer, live.
//
// The key is made in the streamer's browser (32 random bytes) and never leaves it except in POST bodies over HTTPS.
// The server keeps only room = sha256(key)[0..32]. Overlays get the room id: it lets them READ the state, nothing
// else, so a leaked overlay link cannot be used to change anything. Only whoever holds the key can write.
//
// POST /api/panel/claim   {"key", "fresh": true}  reserve a new room (409 if that room already exists → make a new key)
// POST /api/panel/claim   {"key"}                 reopen (dock reload, or after a server restart)
// POST /api/panel/update  {"key", "patch"}        change the state
// POST /api/panel/drop    {"key"}                 delete the room (new key in the setup page)
// GET  /api/panel/<room>          current state (fallback for overlays that cannot use EventSource)
// GET  /api/panel/<room>/events   Server-Sent Events: the state on connect and after every change
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';

const KEY = /^[A-Za-z0-9_-]{43}$/;
const ROOM = /^[a-f0-9]{32}$/;
const MAX_ROOMS = 20_000;
const MAX_LISTENERS_PER_ROOM = 60;
const MAX_LISTENERS = 8_000;
const IDLE_MS = 30 * 86_400_000;
const PING_MS = 25_000;
const SAVE_FILE = process.env.PANEL_FILE ?? '';

export const roomOf = (key) => createHash('sha256').update(key).digest('hex').slice(0, 32);

/** room → { state, version, touched, listeners: Set<res> } */
const rooms = new Map();
let listeners = 0;
let dirty = false;

const fresh = () => ({ hidden: {}, timer: null, goal: { current: null, target: null }, reminder: { fire: 0, paused: false } });

// ---------- state validation: only known fields with sane values get in ----------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clampNum = (v, lo, hi) => (isNum(v) ? Math.min(hi, Math.max(lo, v)) : null);
const OVERLAY_ID = /^[a-z0-9-]{2,24}$/;

/** Applies a patch from the dock. Timer times come from the server clock, so OBS and the dock never disagree. */
export const applyPatch = (state, patch, now = Date.now()) => {
  let s = structuredClone(state);
  // The dock keeps the whole state in its own localStorage and sends it back after a server restart.
  if (patch && typeof patch === 'object' && patch.restore && typeof patch.restore === 'object') {
    const r = patch.restore;
    s = applyPatch(fresh(), { hidden: r.hidden, goal: { current: r.goal?.current ?? null, target: r.goal?.target ?? null }, reminder: { paused: r.reminder?.paused === true } }, now);
    const t = r.timer;
    if (t && typeof t === 'object' && (t.mode === 'countdown' || t.mode === 'stopwatch')) {
      const total = clampNum(t.total, 0, 24 * 3_600_000) ?? 300_000;
      const left = clampNum(t.left, 0, 24 * 3_600_000) ?? total;
      const at = clampNum(t.at, now - 7 * 86_400_000, now) ?? now;
      s.timer = { mode: t.mode, total, left, running: t.running === true, at };
    }
    return s;
  }
  if (patch && typeof patch === 'object') {
    if (patch.hidden && typeof patch.hidden === 'object') {
      for (const [id, v] of Object.entries(patch.hidden).slice(0, 80)) if (OVERLAY_ID.test(id) && typeof v === 'boolean') s.hidden[id] = v;
    }
    if (patch.timer && typeof patch.timer === 'object') {
      const t = s.timer ?? { mode: 'countdown', total: 300_000, left: 300_000, running: false, at: now };
      // Freeze the running clock at "now" before changing anything.
      const elapsed = t.running ? now - t.at : 0;
      t.left = t.mode === 'countdown' ? Math.max(0, t.left - elapsed) : t.left + elapsed;
      t.at = now;
      const a = patch.timer.action;
      if (a === 'mode' && (patch.timer.mode === 'countdown' || patch.timer.mode === 'stopwatch')) {
        t.mode = patch.timer.mode; t.running = false; t.left = t.mode === 'countdown' ? t.total : 0;
      }
      if (a === 'set') { const ms = clampNum(patch.timer.ms, 0, 24 * 3_600_000); if (ms !== null) { t.total = ms; t.left = t.mode === 'countdown' ? ms : 0; t.running = false; } }
      if (a === 'start') t.running = true;
      if (a === 'pause') t.running = false;
      if (a === 'reset') { t.running = false; t.left = t.mode === 'countdown' ? t.total : 0; }
      if (a === 'add') { const ms = clampNum(patch.timer.ms, -24 * 3_600_000, 24 * 3_600_000); if (ms !== null) t.left = Math.max(0, t.left + ms); }
      if (a === 'off') { s.timer = null; return s; }
      s.timer = t;
    }
    if (patch.goal && typeof patch.goal === 'object') {
      if ('current' in patch.goal) s.goal.current = patch.goal.current === null ? null : clampNum(patch.goal.current, -1e12, 1e12);
      if ('add' in patch.goal && isNum(patch.goal.add)) s.goal.current = clampNum((s.goal.current ?? 0) + patch.goal.add, -1e12, 1e12);
      if ('target' in patch.goal) s.goal.target = patch.goal.target === null ? null : clampNum(patch.goal.target, 0, 1e12);
    }
    if (patch.reminder && typeof patch.reminder === 'object') {
      if (patch.reminder.fire === true) s.reminder.fire = now;
      if (typeof patch.reminder.paused === 'boolean') s.reminder.paused = patch.reminder.paused;
    }
  }
  return s;
};

// ---------- rooms ----------
const payload = (room, r, now = Date.now()) => JSON.stringify({ room, version: r.version, now, sources: r.listeners.size, state: r.state });
const everyone = (r) => [...r.listeners, ...r.watchers];

const broadcast = (room, r) => {
  const data = `data: ${payload(room, r)}\n\n`;
  for (const res of everyone(r)) res.write(data);
};

const prune = (now = Date.now()) => {
  for (const [room, r] of rooms) if (!r.listeners.size && !r.watchers.size && now - r.touched > IDLE_MS) { rooms.delete(room); dirty = true; }
};

const open = (room, create) => {
  let r = rooms.get(room);
  if (!r && create) {
    if (rooms.size >= MAX_ROOMS) prune();
    if (rooms.size >= MAX_ROOMS) return null;
    r = { state: fresh(), version: 0, touched: Date.now(), listeners: new Set(), watchers: new Set() };
    rooms.set(room, r);
    dirty = true;
  }
  return r ?? null;
};

/** Every POST: { status, body }. */
export const panelPost = (action, body) => {
  const key = String(body?.key ?? '');
  if (!KEY.test(key)) return { status: 400, body: { error: 'bad_key' } };
  const room = roomOf(key);
  if (action === 'claim') {
    if (body.fresh === true && rooms.has(room)) return { status: 409, body: { error: 'taken' } };
    const r = open(room, true);
    if (!r) return { status: 503, body: { error: 'full' } };
    r.touched = Date.now();
    return { status: 200, body: JSON.parse(payload(room, r)) };
  }
  if (action === 'update') {
    const r = open(room, true);
    if (!r) return { status: 503, body: { error: 'full' } };
    if (JSON.stringify(body.patch ?? {}).length > 4096) return { status: 413, body: { error: 'too_big' } };
    r.state = applyPatch(r.state, body.patch);
    r.version += 1;
    r.touched = Date.now();
    dirty = true;
    broadcast(room, r);
    return { status: 200, body: JSON.parse(payload(room, r)) };
  }
  if (action === 'drop') {
    const r = rooms.get(room);
    if (r) { for (const res of everyone(r)) res.end(); rooms.delete(room); dirty = true; }
    return { status: 200, body: { ok: true } };
  }
  return { status: 404, body: { error: 'not_found' } };
};

/** GET /api/panel/<room> and /api/panel/<room>/events. Returns false when the path is not ours. */
export const panelGet = (path, req, res, watch = false) => {
  const m = /^\/api\/panel\/([a-f0-9]{32})(\/events)?$/.exec(path);
  if (!m || !ROOM.test(m[1])) return false;
  const room = m[1];
  if (!m[2]) {
    const r = rooms.get(room);
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(r ? payload(room, r) : JSON.stringify({ room, version: 0, now: Date.now(), sources: 0, state: fresh() }));
    return true;
  }
  // An overlay may connect before the dock ever opened (or after a restart): it waits on an empty room.
  const r = open(room, true);
  if (!r || r.listeners.size + r.watchers.size >= MAX_LISTENERS_PER_ROOM || listeners >= MAX_LISTENERS) {
    res.writeHead(503, { 'content-type': 'text/plain' });
    res.end('busy');
    return true;
  }
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  // The dock and the setup page watch; only overlays count as connected sources.
  const set = watch ? r.watchers : r.listeners;
  set.add(res);
  listeners += 1;
  // Everyone (the dock too) hears that the number of sources changed.
  broadcast(room, r);
  const ping = setInterval(() => res.write(': ping\n\n'), PING_MS);
  req.on('close', () => {
    clearInterval(ping);
    if (set.delete(res)) listeners -= 1;
    r.touched = Date.now();
    broadcast(room, r);
  });
  return true;
};

// ---------- optional persistence (PANEL_FILE on a CapRover persistent directory) ----------
export const loadRooms = () => {
  if (!SAVE_FILE) return;
  try {
    const saved = JSON.parse(readFileSync(SAVE_FILE, 'utf8'));
    for (const [room, v] of Object.entries(saved)) if (ROOM.test(room)) rooms.set(room, { state: { ...fresh(), ...v.state }, version: v.version ?? 0, touched: v.touched ?? Date.now(), listeners: new Set(), watchers: new Set() });
  } catch { /* first start */ }
};
export const saveRooms = () => {
  if (!SAVE_FILE || !dirty) return;
  dirty = false;
  const out = {};
  for (const [room, r] of rooms) out[room] = { state: r.state, version: r.version, touched: r.touched };
  try { writeFileSync(`${SAVE_FILE}.tmp`, JSON.stringify(out)); renameSync(`${SAVE_FILE}.tmp`, SAVE_FILE); } catch { dirty = true; }
};
export const panelMaintenance = () => { prune(); saveRooms(); };
