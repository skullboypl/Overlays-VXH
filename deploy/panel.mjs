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
import { randomBytes } from 'node:crypto';
import { loadAllRooms, onRemoteRoom, publishRoom, saveRooms as storeRooms } from './store.mjs';

const KEY = /^[A-Za-z0-9_-]{43}$/;
const ROOM = /^[a-f0-9]{32}$/;
const MAX_ROOMS = 20_000;
const MAX_LISTENERS_PER_ROOM = 60;
const MAX_LISTENERS = 8_000;
const IDLE_MS = 30 * 86_400_000;
const PING_MS = 25_000;

export const roomOf = (key) => createHash('sha256').update(key).digest('hex').slice(0, 32);

/** room → { state, version, touched, listeners: Set<res> } */
const rooms = new Map();
let listeners = 0;
/** Rooms to write on the next save, and rooms to forget. */
const changed = new Set();
const deleted = new Set();

const fresh = () => ({ hidden: {}, timer: null, goal: { current: null, target: null }, reminder: { fire: 0, paused: false }, counters: {}, fire: {}, alert: null, alerts: [], links: {}, rewardFx: {} });
const MAX_ALERTS = 12;
/** Every alert (manual or from Twitch / Kick) also goes on a short list, so overlays can play bursts one by one. */
const pushAlert = (s, a) => {
  s.alert = a;
  s.alerts = [...(Array.isArray(s.alerts) ? s.alerts : []), a].slice(-MAX_ALERTS);
};

// ---------- state validation: only known fields with sane values get in ----------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clampNum = (v, lo, hi) => (isNum(v) ? Math.min(hi, Math.max(lo, v)) : null);
const OVERLAY_ID = /^[a-z0-9-]{2,24}$/;
// Added later, all optional: named counters (deaths, wins, score...), one-shot triggers (confetti, wheel...) and a manual alert.
const COUNTER = /^[a-z0-9_-]{1,16}$/;
const MAX_COUNTERS = 24;
const FIRE = /^[a-z]{2,16}$/;
const ALERT_KIND = /^[a-z]{2,12}$/;
const applyCounters = (s, patch) => {
  if (!patch || typeof patch !== 'object') return;
  for (const [name, op] of Object.entries(patch).slice(0, MAX_COUNTERS)) {
    if (!COUNTER.test(name)) continue;
    if (op === null) { delete s.counters[name]; continue; }
    if (!op || typeof op !== 'object') continue;
    if (!(name in s.counters) && Object.keys(s.counters).length >= MAX_COUNTERS) continue;
    const base = s.counters[name] ?? (isNum(op.from) ? op.from : 0);
    if (isNum(op.set)) s.counters[name] = clampNum(op.set, -1e9, 1e9);
    else if (isNum(op.add)) s.counters[name] = clampNum(base + op.add, -1e9, 1e9);
  }
};

/** Applies a patch from the dock. Timer times come from the server clock, so OBS and the dock never disagree. */
export const applyPatch = (state, patch, now = Date.now()) => {
  let s = structuredClone(state);
  // The dock keeps the whole state in its own localStorage and sends it back after a server restart.
  if (patch && typeof patch === 'object' && patch.restore && typeof patch.restore === 'object') {
    const r = patch.restore;
    s = applyPatch(fresh(), {
      hidden: r.hidden, goal: { current: r.goal?.current ?? null, target: r.goal?.target ?? null, auto: r.goal?.auto ?? '' }, reminder: { paused: r.reminder?.paused === true },
      autoTime: r.autoTime ?? {}, rewardFx: r.rewardFx ?? {},
    }, now);
    if (r.counters && typeof r.counters === 'object') applyCounters(s, Object.fromEntries(Object.entries(r.counters).map(([k, v]) => [k, { set: v }])));
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
    if (patch.goal && typeof patch.goal === 'object' && 'auto' in patch.goal) {
      // The goal bar counts by itself from linked channels: follows, subs, bits or Kicks ('' = off).
      const v = String(patch.goal.auto ?? '');
      s.goal.auto = ['follows', 'subs', 'bits', 'kicks'].includes(v) ? v : null;
    }
    // Subathon: minutes added per follow / sub / gifted sub / 100 bits / 100 Kicks.
    if (patch.autoTime && typeof patch.autoTime === 'object') {
      s.autoTime ??= {};
      for (const k of ['follow', 'sub', 'gift', 'bits100', 'kicks100']) {
        if (!(k in patch.autoTime)) continue;
        const v = clampNum(Number(patch.autoTime[k]), 0, 120);
        if (v === null || v === 0) delete s.autoTime[k]; else s.autoTime[k] = v;
      }
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
    s.counters ??= {}; s.fire ??= {}; s.alert ??= null;
    applyCounters(s, patch.counters);
    if (typeof patch.fire === 'string' && FIRE.test(patch.fire) && (patch.fire in s.fire || Object.keys(s.fire).length < 16)) s.fire[patch.fire] = now;
    if (patch.alert && typeof patch.alert === 'object') {
      const text = String(patch.alert.text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 140);
      const kind = ALERT_KIND.test(String(patch.alert.kind)) ? String(patch.alert.kind) : 'custom';
      if (text) pushAlert(s, { id: randomBytes(6).toString('hex'), text, kind, at: now }); else s.alert = null;
    }
    // New stream: forget per-person totals and the latest events (dock button).
    if (patch.resetStream === true) { s.givers = {}; s.latest = {}; s.alerts = []; }
    // Music control for the PC app: !skip for moderators / the streamer, !voteskip for everyone (off by default).
    if (patch.musicCtl && typeof patch.musicCtl === 'object') {
      const c = { ...(s.musicCtl ?? {}) };
      const m = patch.musicCtl;
      if (typeof m.skip === 'boolean') c.skip = m.skip;
      if (typeof m.vote === 'boolean') c.vote = m.vote;
      if (isNum(m.needed)) c.needed = clampNum(Math.round(m.needed), 2, 100);
      if (isNum(m.cooldown)) c.cooldown = clampNum(Math.round(m.cooldown), 0, 600);
      for (const k of ['skipCmd', 'voteCmd']) if (typeof m[k] === 'string' && /^!?[a-z0-9_]{2,20}$/i.test(m[k].trim())) c[k] = `!${m[k].trim().replace(/^!/, '').toLowerCase()}`;
      s.musicCtl = c;
    }
    // Channel point reward (exact title, any case) -> effect button; set from the setup page.
    if (patch.rewardFx && typeof patch.rewardFx === 'object') {
      s.rewardFx ??= {};
      for (const [title, fx] of Object.entries(patch.rewardFx).slice(0, 30)) {
        const t = String(title).trim().toLowerCase().slice(0, 60);
        if (!t) continue;
        if (fx === null || fx === '') delete s.rewardFx[t];
        else if (FIRE.test(String(fx)) && (t in s.rewardFx || Object.keys(s.rewardFx).length < 30)) s.rewardFx[t] = String(fx);
      }
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
  for (const [room, r] of rooms) if (!r.listeners.size && !r.watchers.size && now - r.touched > IDLE_MS) { if (r.keyHash) aliases.delete(r.keyHash); rooms.delete(room); changed.delete(room); deleted.add(room); }
};

const open = (room, create) => {
  let r = rooms.get(room);
  if (!r && create) {
    if (rooms.size >= MAX_ROOMS) prune();
    if (rooms.size >= MAX_ROOMS) return null;
    r = { state: fresh(), version: 0, touched: Date.now(), listeners: new Set(), watchers: new Set() };
    rooms.set(room, r);
    changed.add(room);
  }
  return r ?? null;
};

// ---------- keys ----------
// A room's id is the hash of the key it was made with. After "new key" (owner logged in) the room keeps its id, so
// overlay links in OBS keep working, and only the new key's hash opens it: hash -> room in `aliases`.
const aliases = new Map();
/** The room a dock key opens, or '' when that key was replaced by a newer one. */
export const resolveRoom = (key) => {
  if (!KEY.test(String(key ?? ''))) return '';
  const h = roomOf(key);
  const room = aliases.get(h) ?? h;
  const r = rooms.get(room);
  if (r?.keyHash && r.keyHash !== h) return '';
  return room;
};
/** Owner only (checked by the caller): from now on `newKey` opens `room` and the old key does nothing. */
export const rotateKey = (room, newKey) => {
  const r = rooms.get(room);
  if (!r || !KEY.test(String(newKey ?? ''))) return { ok: false, error: 'bad_request' };
  const h = roomOf(newKey);
  if (rooms.has(h) || aliases.has(h)) return { ok: false, error: 'taken' };
  if (r.keyHash && r.keyHash !== room) aliases.delete(r.keyHash);
  r.keyHash = h;
  aliases.set(h, room);
  r.touched = Date.now();
  changed.add(room);
  return { ok: true };
};
export const roomExists = (room) => rooms.has(room);

/** Every POST: { status, body }. `allowDrop` says whether the caller may delete the room (no owner, or owner logged in). */
export const panelPost = (action, body, allowDrop = () => true) => {
  const key = String(body?.key ?? '');
  if (!KEY.test(key)) return { status: 400, body: { error: 'bad_key' } };
  const room = resolveRoom(key);
  if (!room) return { status: 403, body: { error: 'revoked' } };
  if (action === 'claim') {
    if (body.fresh === true && (rooms.has(room) || aliases.has(roomOf(key)))) return { status: 409, body: { error: 'taken' } };
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
    changed.add(room);
    broadcast(room, r);
    publishRoom(room, r.version, r.state, r.keyHash);
    return { status: 200, body: JSON.parse(payload(room, r)) };
  }
  // "Now playing" from the PC app (VXH Now Playing) or anything else that holds the dock key. The cover picture
  // stays in memory only (it changes with every song) and is served at /api/panel/<room>/cover.
  if (action === 'music') {
    const r = open(room, true);
    if (!r) return { status: 503, body: { error: 'full' } };
    const m = body.music && typeof body.music === 'object' ? body.music : null;
    const txt = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
    if (typeof body.cover === 'string' && body.cover.length <= 90_000) {
      const mm = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.cover);
      r.cover = mm ? { type: mm[1], data: Buffer.from(mm[2], 'base64'), v: Date.now() } : null;
    } else if (body.cover === null) r.cover = null;
    const s = structuredClone(r.state);
    s.music = m ? {
      title: txt(m.title, 120), artist: txt(m.artist, 120), album: txt(m.album, 120), app: txt(m.app, 40),
      playing: m.playing === true, position: clampNum(Number(m.position), 0, 86_400) ?? 0, duration: clampNum(Number(m.duration), 0, 86_400) ?? 0,
      at: Date.now(), cover: r.cover ? r.cover.v : 0,
      // Vote-skip progress and the last skip, counted by the app from chat.
      votes: clampNum(Number(m.votes), 0, 1000) ?? 0, needed: clampNum(Number(m.needed), 0, 1000) ?? 0,
      skippedBy: txt(m.skippedBy, 40), skippedAt: m.skippedBy ? Date.now() : (s.music?.skippedAt ?? 0),
    } : null;
    r.state = s;
    r.version += 1;
    r.touched = Date.now();
    changed.add(room);
    broadcast(room, r);
    publishRoom(room, r.version, r.state, r.keyHash);
    return { status: 200, body: { ok: true } };
  }
  if (action === 'drop') {
    if (!allowDrop(room)) return { status: 403, body: { error: 'owner_login_required' } };
    const r = rooms.get(room);
    if (r) {
      for (const res of everyone(r)) res.end();
      if (r.keyHash) aliases.delete(r.keyHash);
      rooms.delete(room); changed.delete(room); deleted.add(room);
    }
    return { status: 200, body: { ok: true } };
  }
  return { status: 404, body: { error: 'not_found' } };
};

/** GET /api/panel/<room> and /api/panel/<room>/events. Returns false when the path is not ours. */
export const panelGet = (path, req, res, watch = false) => {
  const cm = /^\/api\/panel\/([a-f0-9]{32})\/cover$/.exec(path);
  if (cm) {
    const c = rooms.get(cm[1])?.cover;
    if (!c) { res.writeHead(404, { 'cache-control': 'no-store' }); res.end(); return true; }
    res.writeHead(200, { 'content-type': c.type, 'cache-control': 'public, max-age=300' });
    res.end(c.data);
    return true;
  }
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

// ---------- persistence (store.mjs: PostgreSQL, or a JSON file in PANEL_FILE) ----------
export const loadRooms = async () => {
  try {
    for (const v of await loadAllRooms()) {
      if (!ROOM.test(v.room)) continue;
      rooms.set(v.room, { state: { ...fresh(), ...v.state }, version: v.version ?? 0, touched: v.touched ?? Date.now(), keyHash: v.keyHash || undefined, listeners: new Set(), watchers: new Set() });
      if (v.keyHash && v.keyHash !== v.room) aliases.set(v.keyHash, v.room);
    }
  } catch (err) { console.error('panel: load failed', err?.message ?? err); }
  // Another instance changed a room (Redis): take its newer state and tell our own listeners.
  await onRemoteRoom((room, version, state, keyHash) => {
    const r = open(room, true);
    if (!r) return;
    if (keyHash && keyHash !== r.keyHash) { if (r.keyHash) aliases.delete(r.keyHash); r.keyHash = keyHash; if (keyHash !== room) aliases.set(keyHash, room); }
    if (version <= r.version) return;
    r.state = { ...fresh(), ...state };
    r.version = version;
    r.touched = Date.now();
    broadcast(room, r);
  });
};
let saving = false;
export const saveRooms = async () => {
  if (saving || (!changed.size && !deleted.size)) return;
  saving = true;
  const ch = [...changed].map((room) => [room, rooms.get(room)]).filter(([, r]) => r);
  const del = [...deleted];
  changed.clear(); deleted.clear();
  try { await storeRooms(ch, del, rooms); } catch (err) {
    console.error('panel: save failed', err?.message ?? err);
    for (const [room] of ch) changed.add(room);
    for (const room of del) deleted.add(room);
  }
  saving = false;
};
export const panelMaintenance = () => { prune(); void saveRooms(); };

/**
 * A change that comes from the server, not the dock: an alert from Twitch / Kick, an effect for a channel point
 * reward, or the list of linked channels. Same path as a dock update: new version, live push, saved later.
 */
const LIVE_KEYS = ['poll', 'prediction', 'hype', 'twGoal'];
export const pushEvent = (room, { alert, fire, links, tally, set } = {}, now = Date.now()) => {
  const r = rooms.get(room) ?? open(room, true);
  if (!r) return false;
  let s = structuredClone(r.state);
  if (set) for (const k of LIVE_KEYS) if (k in set) s[k] = set[k];
  if (alert && alert.platform) {
    // "Latest follow / sub / cheer..." and per-person totals for the top-donor list, from linked channels only.
    s.latest ??= {};
    s.latest[alert.kind] = { text: String(alert.text ?? '').slice(0, 40), platform: alert.platform, amount: Number(alert.amount) || 0, at: now };
    const add = alert.kind === 'bits' ? 'bits' : alert.kind === 'gift' ? 'gifts' : alert.kind === 'donate' && alert.platform === 'kick' ? 'kicks' : '';
    if (add && alert.text && alert.text !== 'Anonim') {
      s.givers ??= {};
      const k = `${alert.platform}:${String(alert.text).toLowerCase()}`.slice(0, 60);
      const g = s.givers[k] ?? { name: String(alert.text).slice(0, 30), platform: alert.platform, bits: 0, gifts: 0, kicks: 0 };
      g[add] += Number(alert.amount) || (add === 'gifts' ? 1 : 0);
      s.givers[k] = g;
      const keys = Object.keys(s.givers);
      if (keys.length > 60) {
        const score = (x) => x.bits + x.kicks + x.gifts * 500;
        for (const drop of keys.sort((a, b2) => score(s.givers[a]) - score(s.givers[b2])).slice(0, keys.length - 60)) delete s.givers[drop];
      }
    }
  }
  if (tally && Object.keys(tally).length) {
    // Automatic counters (follows, subs, bits, gifts, kicks, raids), the goal bar when it follows one of them,
    // and subathon time per event, as set in the panel.
    s.counters ??= {};
    for (const [k, v] of Object.entries(tally)) if (v) s.counters[k] = clampNum((s.counters[k] ?? 0) + v, -1e9, 1e9);
    const auto = s.goal?.auto;
    if (auto && tally[auto]) s.goal.current = clampNum((s.goal.current ?? 0) + tally[auto], -1e12, 1e12);
    const t = s.autoTime ?? {};
    const min = (tally.follows ?? 0) * (t.follow ?? 0) + ((tally.subs ?? 0) - (tally.gifts ?? 0)) * (t.sub ?? 0) + (tally.gifts ?? 0) * (t.gift ?? t.sub ?? 0)
      + ((tally.bits ?? 0) / 100) * (t.bits100 ?? 0) + ((tally.kicks ?? 0) / 100) * (t.kicks100 ?? 0);
    if (min > 0 && s.timer?.mode === 'countdown') s = applyPatch(s, { timer: { action: 'add', ms: Math.round(min * 60_000) } }, now);
  }
  s.alerts ??= []; s.fire ??= {}; s.links ??= {};
  if (alert) pushAlert(s, { id: randomBytes(6).toString('hex'), at: now, ...alert, text: String(alert.text ?? '').slice(0, 140) });
  if (fire && FIRE.test(fire)) s.fire[fire] = now;
  if (links) s.links = links;
  r.state = s;
  r.version += 1;
  r.touched = now;
  changed.add(room);
  broadcast(room, r);
  publishRoom(room, r.version, r.state, r.keyHash);
  return true;
};
export const roomState = (room) => rooms.get(room)?.state ?? null;
