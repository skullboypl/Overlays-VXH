// Live counter of overlays open in OBS. No dependencies, runs next to nginx in the same container.
//
// POST /api/presence  {"id": "<random per page load>", "o": "<overlay id>"}  heartbeat, every minute from /o/<id>
// GET  /api/presence  {"live": n, "byType": {"snow": 3, ...}, "peakToday": n, "updated": <ms>}
//
// Nothing personal is kept: a random id the page makes up on load, the overlay type and the time of the last ping.
// The client address only lives in memory, to stop one address from inflating the counter.
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.STATS_PORT ?? 3001);
const HOST = process.env.STATS_HOST ?? '127.0.0.1';
/** A source counts as live this long after its last ping (pings come every 60 s). */
export const WINDOW_MS = 3 * 60_000;
const MAX_SESSIONS = 50_000;
/** More open sources than this from one address is not a streamer, it is somebody inflating the counter. */
const MAX_PER_IP = 40;
const RATE = { max: 90, windowMs: 60_000 };
const SNAPSHOT_MS = 10_000;
const ID = /^[A-Za-z0-9_-]{16,64}$/;
const OVERLAY = /^[a-z0-9-]{2,24}$/;

/** id → { o, ip, seen } */
const sessions = new Map();
const hits = new Map();
let peak = { day: '', value: 0 };
let snapshot = null;

const today = (now) => new Date(now).toISOString().slice(0, 10);

/** The last X-Forwarded-For entry is the address CapRover's proxy saw; earlier ones are whatever the client sent. */
export const clientIp = (req) => {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return fwd.at(-1) || req.socket.remoteAddress || '?';
};

const limited = (ip, now) => {
  const h = hits.get(ip);
  if (!h || now - h.start > RATE.windowMs) { hits.set(ip, { start: now, n: 1 }); return false; }
  h.n += 1;
  return h.n > RATE.max;
};

const prune = (now) => {
  for (const [id, s] of sessions) if (now - s.seen > WINDOW_MS) sessions.delete(id);
  for (const [ip, h] of hits) if (now - h.start > RATE.windowMs) hits.delete(ip);
};

export const touch = (id, o, ip, now = Date.now()) => {
  if (!ID.test(id) || !OVERLAY.test(o)) return 400;
  const known = sessions.get(id);
  if (!known) {
    if (sessions.size >= MAX_SESSIONS) prune(now);
    if (sessions.size >= MAX_SESSIONS) return 503;
    let fromIp = 0;
    for (const s of sessions.values()) if (s.ip === ip && now - s.seen <= WINDOW_MS) fromIp += 1;
    if (fromIp >= MAX_PER_IP) return 429;
  }
  sessions.set(id, { o, ip, seen: now });
  snapshot = null;
  return 204;
};

export const summary = (now = Date.now()) => {
  if (snapshot && now - snapshot.updated < SNAPSHOT_MS) return snapshot;
  prune(now);
  const byType = {};
  for (const s of sessions.values()) byType[s.o] = (byType[s.o] ?? 0) + 1;
  const live = sessions.size;
  const day = today(now);
  if (peak.day !== day) peak = { day, value: 0 };
  peak.value = Math.max(peak.value, live);
  snapshot = { live, byType, peakToday: peak.value, updated: now };
  return snapshot;
};

const send = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=10' : 'no-store',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

export const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname !== '/api/presence') return send(res, 404, { error: 'not_found' });
  if (req.method === 'GET') return send(res, 200, summary());
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const ip = clientIp(req);
  const now = Date.now();
  if (limited(ip, now)) return send(res, 429);
  let raw = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 512) req.destroy();
  });
  req.on('end', () => {
    let body;
    try { body = JSON.parse(raw); } catch { return send(res, 400); }
    send(res, touch(String(body?.id ?? ''), String(body?.o ?? ''), ip, now));
  });
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => console.log(`stats on ${HOST}:${PORT}`));
  setInterval(() => prune(Date.now()), 60_000).unref();
}
