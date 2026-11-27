// TikTok LIVE chat for the chat overlay (beta).
//
// GET /api/tiktok/<user>/events   Server-Sent Events: {type:'chat'|'gift'|'follow'|'share'|'status', ...}
//
// TikTok has no official API for live chat, so this uses the unofficial tiktok-live-connector library, which
// signs its requests through Euler Stream (TIKTOK_SIGN_API_KEY optional; without it the free tier limits apply).
// One TikTok connection per user, shared by every OBS source; closed 30 s after the last source leaves.
// TikTok changes things now and then: when it breaks, the overlay shows a status line instead of crashing.

const USER = /^[A-Za-z0-9._]{2,24}$/;
const MAX_USERS = 80;
const MAX_LISTENERS = 2000;
const IDLE_MS = 30_000;
const RETRY_MS = 60_000;

/** user -> { conn, listeners: Set<res>, status, idle, retry } */
const rooms = new Map();
let lib = null;
let listeners = 0;

const loadLib = async () => {
  if (lib) return lib;
  lib = await import('tiktok-live-connector');
  const key = String(process.env.TIKTOK_SIGN_API_KEY ?? '').trim();
  if (key && lib.SignConfig) lib.SignConfig.apiKey = key;
  return lib;
};

const send = (r, msg) => { const data = `data: ${JSON.stringify(msg)}\n\n`; for (const res of r.listeners) res.write(data); };
const name = (u) => String(u?.nickname || u?.uniqueId || '').slice(0, 40);
const login = (u) => String(u?.uniqueId || '').toLowerCase().slice(0, 40);

const connect = async (user, r) => {
  clearTimeout(r.retry);
  let L;
  try { L = await loadLib(); } catch { r.status = { type: 'status', state: 'unavailable' }; send(r, r.status); return; }
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = L;
  const conn = new TikTokLiveConnection(user, { processInitialData: false, enableExtendedGiftInfo: false, fetchRoomInfoOnConnect: true });
  r.conn = conn;
  conn.on(WebcastEvent.CHAT, (d) => send(r, { type: 'chat', id: String(d.common?.msgId ?? Math.random()), user: name(d.user), login: login(d.user), text: String(d.comment ?? '').slice(0, 300) }));
  conn.on(WebcastEvent.GIFT, (d) => {
    // Streakable gifts arrive many times while the combo runs: report the finished combo only.
    const streak = d.giftDetails?.giftType === 1 || d.giftDetails?.type === 1;
    if (streak && !d.repeatEnd) return;
    send(r, { type: 'gift', id: String(d.common?.msgId ?? Math.random()), user: name(d.user), login: login(d.user),
      gift: String(d.giftDetails?.giftName ?? d.giftDetails?.name ?? '').slice(0, 40), count: Number(d.repeatCount ?? 1) || 1, diamonds: Number(d.giftDetails?.diamondCount ?? 0) || 0 });
  });
  conn.on(WebcastEvent.FOLLOW, (d) => send(r, { type: 'follow', user: name(d.user), login: login(d.user) }));
  conn.on(WebcastEvent.SHARE, (d) => send(r, { type: 'share', user: name(d.user), login: login(d.user) }));
  conn.on(WebcastEvent.STREAM_END, () => { r.status = { type: 'status', state: 'ended' }; send(r, r.status); });
  conn.on(ControlEvent?.DISCONNECTED ?? 'disconnected', () => {
    if (r.listeners.size && rooms.get(user) === r) r.retry = setTimeout(() => void connect(user, r), RETRY_MS);
  });
  try {
    await conn.connect();
    r.status = { type: 'status', state: 'live' };
  } catch (err) {
    const msg = String(err?.message ?? err);
    r.status = { type: 'status', state: /offline|not live|UserOffline/i.test(msg) ? 'offline' : 'error' };
    if (r.listeners.size) r.retry = setTimeout(() => void connect(user, r), RETRY_MS);
  }
  send(r, r.status);
};

const close = (user, r) => {
  clearTimeout(r.retry);
  try { r.conn?.disconnect(); } catch { /* already closed */ }
  rooms.delete(user);
};

/** GET /api/tiktok/<user>/events. Returns false when the path is not ours. */
export const tiktokGet = (path, req, res) => {
  const m = /^\/api\/tiktok\/([^/]+)\/events$/.exec(path);
  if (!m) return false;
  const user = decodeURIComponent(m[1]).replace(/^@/, '').toLowerCase();
  if (!USER.test(user)) { res.writeHead(400, { 'content-type': 'text/plain' }); res.end('bad user'); return true; }
  let r = rooms.get(user);
  if (!r) {
    if (rooms.size >= MAX_USERS || listeners >= MAX_LISTENERS) { res.writeHead(503, { 'content-type': 'text/plain' }); res.end('busy'); return true; }
    r = { conn: null, listeners: new Set(), status: { type: 'status', state: 'connecting' }, idle: null, retry: null };
    rooms.set(user, r);
    void connect(user, r);
  }
  clearTimeout(r.idle);
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 5000\n\n');
  res.write(`data: ${JSON.stringify(r.status)}\n\n`);
  r.listeners.add(res);
  listeners += 1;
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(ping);
    if (r.listeners.delete(res)) listeners -= 1;
    if (!r.listeners.size) r.idle = setTimeout(() => close(user, r), IDLE_MS);
  });
  return true;
};
