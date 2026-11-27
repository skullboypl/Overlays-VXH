// Where the OBS panel keeps its rooms and linked Twitch / Kick channels.
//
// DATABASE_URL set  -> PostgreSQL (tables are created on start).
// otherwise         -> JSON files next to PANEL_FILE (or nothing at all when PANEL_FILE is empty), as before.
// REDIS_URL set     -> room changes are published to the other app instances, and OAuth "state" values live in Redis,
//                      so more than one instance can run behind CapRover. Without it everything stays in this process.
//
// Both drivers are optional dependencies (deploy/package.json): without the env variables they are never loaded.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const PANEL_FILE = process.env.PANEL_FILE ?? '';
const LINKS_FILE = process.env.LINKS_FILE ?? (PANEL_FILE ? `${PANEL_FILE.replace(/\.json$/, '')}-links.json` : '');
const DATABASE_URL = process.env.DATABASE_URL ?? '';
const REDIS_URL = process.env.REDIS_URL ?? '';
export const INSTANCE = randomBytes(6).toString('hex');

let pg = null;
let redis = null;
let redisSub = null;

const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; } };
const writeJson = (file, value) => { writeFileSync(`${file}.tmp`, JSON.stringify(value)); renameSync(`${file}.tmp`, file); };

/** "user@host:port/db" without the password, for log lines; or why the URL cannot be read. */
const describeUrl = (raw) => {
  try {
    const u = new URL(raw);
    return `${decodeURIComponent(u.username) || '(no user)'}@${u.hostname}:${u.port || '(default port)'}${u.pathname}${u.password ? ' (with password)' : ' (no password)'}`;
  } catch {
    return 'not a valid URL: special characters in the password (@ # / : ? %) must be URL-encoded, e.g. @ as %40';
  }
};

/** Gives up on a promise after `ms`, so a database that does not answer can never keep the server from starting. */
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${what} timeout`)), ms))]);

/** Connects to whatever is configured. Never throws: a missing database means "work like before" plus a log line. */
export const openStore = async () => {
  if (DATABASE_URL) {
    try {
      const { default: pgLib } = await import('pg');
      pg = new pgLib.Pool({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, ssl: /sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined });
      await withTimeout(pg.query('SELECT 1'), 8000, 'postgres');
      await pg.query(`CREATE TABLE IF NOT EXISTS panel_rooms (
        room text PRIMARY KEY, state jsonb NOT NULL, version integer NOT NULL, touched bigint NOT NULL)`);
      await pg.query(`CREATE TABLE IF NOT EXISTS platform_links (
        room text NOT NULL, platform text NOT NULL, user_id text NOT NULL, login text NOT NULL, created bigint NOT NULL,
        PRIMARY KEY (room, platform))`);
      await pg.query('CREATE INDEX IF NOT EXISTS platform_links_user ON platform_links (platform, user_id)');
      await pg.query('ALTER TABLE panel_rooms ADD COLUMN IF NOT EXISTS key_hash text');
      await pg.query(`CREATE TABLE IF NOT EXISTS panel_owners (
        room text NOT NULL, platform text NOT NULL, user_id text NOT NULL, login text NOT NULL, created bigint NOT NULL,
        PRIMARY KEY (room, platform, user_id))`);
      await pg.query('CREATE INDEX IF NOT EXISTS panel_owners_user ON panel_owners (platform, user_id)');
      console.log(`store: postgres (${describeUrl(DATABASE_URL)})`);
    } catch (err) {
      console.error(`store: postgres unavailable (${describeUrl(DATABASE_URL)}), falling back to files:`, err?.message ?? err);
      pg?.end().catch(() => {});
      pg = null;
    }
  }
  if (REDIS_URL) {
    try {
      const { createClient } = await import('redis');
      // Retries stop after ~30 s instead of forever, and every step has a time limit.
      redis = createClient({ url: REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: (n) => (n > 10 ? new Error('redis gave up') : Math.min(500 * n, 3000)) } });
      let logged = 0;
      redis.on('error', (e) => { if (logged++ < 5) console.error('redis:', e?.message ?? e); });
      await withTimeout(redis.connect(), 8000, 'redis');
      redisSub = redis.duplicate();
      redisSub.on('error', () => {});
      await withTimeout(redisSub.connect(), 8000, 'redis');
      console.log(`store: redis (${describeUrl(REDIS_URL)})`);
    } catch (err) {
      console.error(`store: redis unavailable (${describeUrl(REDIS_URL)}), single instance mode:`, err?.message ?? err);
      redis?.disconnect().catch(() => {}); redisSub?.disconnect().catch(() => {});
      redis = null; redisSub = null;
    }
  }
};

export const storeKind = () => ({ db: pg ? 'postgres' : PANEL_FILE ? 'file' : 'memory', pubsub: redis ? 'redis' : 'none' });

// ---------- rooms ----------
/** room → { state, version, touched } */
export const loadAllRooms = async () => {
  if (pg) {
    const { rows } = await pg.query('SELECT room, state, version, touched, key_hash FROM panel_rooms');
    return rows.map((r) => ({ room: r.room, state: r.state, version: r.version, touched: Number(r.touched), keyHash: r.key_hash ?? '' }));
  }
  if (!PANEL_FILE) return [];
  return Object.entries(readJson(PANEL_FILE, {})).map(([room, v]) => ({ room, state: v.state, version: v.version ?? 0, touched: v.touched ?? Date.now(), keyHash: v.keyHash ?? '' }));
};

/** Writes the changed rooms (and forgets deleted ones). `all` is the full map, used by the file driver. */
export const saveRooms = async (changed, deleted, all) => {
  if (pg) {
    for (const [room, r] of changed) {
      await pg.query(
        `INSERT INTO panel_rooms (room, state, version, touched, key_hash) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (room) DO UPDATE SET state = EXCLUDED.state, version = EXCLUDED.version, touched = EXCLUDED.touched, key_hash = EXCLUDED.key_hash`,
        [room, JSON.stringify(r.state), r.version, r.touched, r.keyHash || null],
      );
    }
    if (deleted.length) {
      await pg.query('DELETE FROM panel_rooms WHERE room = ANY($1)', [deleted]);
      await pg.query('DELETE FROM platform_links WHERE room = ANY($1)', [deleted]);
      await pg.query('DELETE FROM panel_owners WHERE room = ANY($1)', [deleted]);
    }
    return;
  }
  if (!PANEL_FILE) return;
  const out = {};
  for (const [room, r] of all) out[room] = { state: r.state, version: r.version, touched: r.touched, ...(r.keyHash ? { keyHash: r.keyHash } : {}) };
  writeJson(PANEL_FILE, out);
};

// ---------- linked channels ----------
let fileLinks = null;
const linksFromFile = () => (fileLinks ??= LINKS_FILE ? readJson(LINKS_FILE, []) : []);
const saveLinksFile = () => { if (LINKS_FILE) writeJson(LINKS_FILE, fileLinks ?? []); };

/** All rooms that listen to this Twitch / Kick channel. */
export const roomsForChannel = async (platform, userId) => {
  if (pg) {
    const { rows } = await pg.query('SELECT room FROM platform_links WHERE platform = $1 AND user_id = $2', [platform, String(userId)]);
    return rows.map((r) => r.room);
  }
  return linksFromFile().filter((l) => l.platform === platform && l.userId === String(userId)).map((l) => l.room);
};

export const linkChannel = async (room, platform, userId, login) => {
  if (pg) {
    await pg.query(
      `INSERT INTO platform_links (room, platform, user_id, login, created) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (room, platform) DO UPDATE SET user_id = EXCLUDED.user_id, login = EXCLUDED.login, created = EXCLUDED.created`,
      [room, platform, String(userId), login, Date.now()],
    );
    return;
  }
  fileLinks = linksFromFile().filter((l) => !(l.room === room && l.platform === platform));
  fileLinks.push({ room, platform, userId: String(userId), login, created: Date.now() });
  saveLinksFile();
};

/** Removes the link; returns the channel id it had, and whether any other room still listens to that channel. */
export const unlinkChannel = async (room, platform) => {
  if (pg) {
    const { rows } = await pg.query('DELETE FROM platform_links WHERE room = $1 AND platform = $2 RETURNING user_id', [room, platform]);
    const userId = rows[0]?.user_id ?? '';
    if (!userId) return { userId: '', stillUsed: false };
    const left = await pg.query('SELECT 1 FROM platform_links WHERE platform = $1 AND user_id = $2 LIMIT 1', [platform, userId]);
    return { userId, stillUsed: left.rowCount > 0 };
  }
  const all = linksFromFile();
  const gone = all.find((l) => l.room === room && l.platform === platform);
  fileLinks = all.filter((l) => l !== gone);
  saveLinksFile();
  return { userId: gone?.userId ?? '', stillUsed: Boolean(gone && fileLinks.some((l) => l.platform === platform && l.userId === gone.userId)) };
};

// ---------- panel owners (accounts that logged in with Twitch / Kick) ----------
const OWNERS_FILE = PANEL_FILE ? `${PANEL_FILE.replace(/\.json$/, '')}-owners.json` : '';
let fileOwners = null;
const ownersFromFile = () => (fileOwners ??= OWNERS_FILE ? readJson(OWNERS_FILE, []) : []);
const saveOwnersFile = () => { if (OWNERS_FILE) writeJson(OWNERS_FILE, fileOwners ?? []); };

export const ownersOf = async (room) => {
  if (pg) {
    const { rows } = await pg.query('SELECT platform, user_id, login FROM panel_owners WHERE room = $1', [room]);
    return rows.map((r) => ({ platform: r.platform, userId: r.user_id, login: r.login }));
  }
  return ownersFromFile().filter((o) => o.room === room).map(({ platform, userId, login }) => ({ platform, userId, login }));
};
export const addOwner = async (room, id) => {
  if (pg) {
    await pg.query(
      `INSERT INTO panel_owners (room, platform, user_id, login, created) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (room, platform, user_id) DO UPDATE SET login = EXCLUDED.login`,
      [room, id.platform, String(id.userId), id.login, Date.now()],
    );
    return;
  }
  fileOwners = ownersFromFile().filter((o) => !(o.room === room && o.platform === id.platform && o.userId === String(id.userId)));
  fileOwners.push({ room, platform: id.platform, userId: String(id.userId), login: id.login, created: Date.now() });
  saveOwnersFile();
};
/** Rooms any of these accounts own. */
export const roomsOwnedBy = async (ids) => {
  if (!ids.length) return [];
  if (pg) {
    const out = new Set();
    for (const id of ids) {
      const { rows } = await pg.query('SELECT room FROM panel_owners WHERE platform = $1 AND user_id = $2', [id.platform, String(id.userId)]);
      rows.forEach((r) => out.add(r.room));
    }
    return [...out];
  }
  return [...new Set(ownersFromFile().filter((o) => ids.some((id) => id.platform === o.platform && String(id.userId) === o.userId)).map((o) => o.room))];
};

// ---------- short-lived OAuth state ----------
const memState = new Map();
export const putOAuthState = async (id, value, ttlS = 600) => {
  if (redis) { await redis.set(`vxh:oauth:${id}`, JSON.stringify(value), { EX: ttlS }); return; }
  const now = Date.now();
  for (const [k, v] of memState) if (v.exp < now) memState.delete(k);
  if (memState.size > 5000) return;
  memState.set(id, { value, exp: now + ttlS * 1000 });
};
export const takeOAuthState = async (id) => {
  if (redis) {
    const raw = await redis.getDel(`vxh:oauth:${id}`);
    return raw ? JSON.parse(raw) : null;
  }
  const v = memState.get(id);
  memState.delete(id);
  return v && v.exp > Date.now() ? v.value : null;
};

// ---------- fan-out between instances ----------
const CHANNEL = 'vxh:panel';
export const publishRoom = (room, version, state, keyHash) => {
  if (!redis) return;
  redis.publish(CHANNEL, JSON.stringify({ from: INSTANCE, room, version, state, keyHash })).catch(() => {});
};
// TikTok chat posted by the PC app reaches the instance that holds the overlay's connection.
const TT_CHANNEL = 'vxh:panel:tiktok';
export const publishTikTok = (room, msg) => {
  if (!redis) return;
  redis.publish(TT_CHANNEL, JSON.stringify({ from: INSTANCE, room, msg })).catch(() => {});
};
export const onRemoteTikTok = async (handler) => {
  if (!redisSub) return;
  await redisSub.subscribe(TT_CHANNEL, (raw) => {
    try {
      const m = JSON.parse(raw);
      if (m.from !== INSTANCE) handler(m.room, m.msg);
    } catch { /* ignore */ }
  });
};
export const onRemoteRoom = async (handler) => {
  if (!redisSub) return;
  await redisSub.subscribe(CHANNEL, (raw) => {
    try {
      const m = JSON.parse(raw);
      if (m.from !== INSTANCE) handler(m.room, m.version, m.state, m.keyHash);
    } catch { /* ignore */ }
  });
};
