// Logging in with Twitch / Kick on the OBS panel page, linking that channel to the panel, and turning platform events
// into alerts, counters, the goal bar and subathon time.
//
// GET  /api/account/me                         who is logged in (cookie), which panels they own, what is set up on the server
// POST /api/account/login     {"platform", "key"?}  -> {"url"}  Twitch / Kick login (and, with this device's dock key, link)
// GET  /api/connect/twitch/callback, /api/connect/kick/callback   OAuth return, sets the login cookie, back to /panel
// POST /api/account/claim     {"key"}            make the logged-in accounts owners of that panel and link their channels
// POST /api/account/unlink    {"room", "platform"}            owner only
// POST /api/account/rotate    {"room", "newKey"}              owner only: new dock key, overlay links stay the same
// POST /api/account/logout
// POST /api/eventsub/twitch   Twitch EventSub webhooks (HMAC-SHA256 with TWITCH_EVENTSUB_SECRET)
// POST /api/webhooks/kick     Kick webhooks (RSA-SHA256, Kick's public key)
//
// The dock key alone only drives the dock (counters, effects, manual alerts). Linking or unlinking a channel, a new
// key and deleting the panel need the owner logged in, so a leaked dock link cannot take the panel over.
// Twitch: subscriptions run on the APP token, the user token is revoked right after login. Kick: the user token is
// used once to subscribe and dropped. Overlays only ever see alert text, never a token, a cookie or the dock key.
import { createHash, createHmac, createVerify, randomBytes, timingSafeEqual } from 'node:crypto';
import { addOwner, linkChannel, ownersOf, putOAuthState, roomsForChannel, roomsOwnedBy, takeOAuthState, unlinkChannel } from './store.mjs';
import { pushEvent, resolveRoom, roomExists, roomState, rotateKey } from './panel.mjs';

const KEY = /^[A-Za-z0-9_-]{43}$/;
const env = (k) => String(process.env[k] ?? '').trim();
const origin = () => env('PUBLIC_ORIGIN') || 'https://overlays.vxh.pl';

const TWITCH_SCOPES = ['moderator:read:followers', 'channel:read:subscriptions', 'bits:read', 'channel:read:redemptions'];
const KICK_SCOPES = ['user:read', 'channel:read', 'events:subscribe', 'channel:rewards:read'];
const KICK_EVENTS = [
  { name: 'channel.followed', version: 1 },
  { name: 'channel.subscription.new', version: 1 },
  { name: 'channel.subscription.renewal', version: 1 },
  { name: 'channel.subscription.gifts', version: 1 },
  { name: 'kicks.gifted', version: 1 },
  { name: 'channel.reward.redemption.updated', version: 1 },
];

export const configured = () => ({
  twitch: Boolean(env('TWITCH_CLIENT_ID') && env('TWITCH_CLIENT_SECRET') && env('TWITCH_EVENTSUB_SECRET')),
  kick: Boolean(env('KICK_CLIENT_ID') && env('KICK_CLIENT_SECRET')),
});

const json = async (res) => res.json().catch(() => ({}));
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// ---------- login cookie ----------
const SESSION_DAYS = 30;
const sessionSecret = () => env('SESSION_SECRET') || createHmac('sha256', env('TWITCH_EVENTSUB_SECRET') || env('KICK_CLIENT_SECRET') || 'vxh-dev').update('vxh-session-v1').digest('hex');
const sign = (body) => b64url(createHmac('sha256', sessionSecret()).update(body).digest());
/** Accounts in the login cookie: [{ platform, userId, login }]. */
export const readSession = (cookieHeader) => {
  const m = /(?:^|;\s*)vxh_sess=([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/.exec(String(cookieHeader ?? ''));
  if (!m) return [];
  const expected = sign(m[1]);
  if (expected.length !== m[2].length || !timingSafeEqual(Buffer.from(expected), Buffer.from(m[2]))) return [];
  try {
    const v = JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return v.exp > Date.now() && Array.isArray(v.ids) ? v.ids.slice(0, 4) : [];
  } catch { return []; }
};
const sessionCookie = (ids) => {
  const body = b64url(Buffer.from(JSON.stringify({ ids, exp: Date.now() + SESSION_DAYS * 86_400_000 })));
  const secure = origin().startsWith('https:') ? '; Secure' : '';
  return `vxh_sess=${body}.${sign(body)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure}`;
};
const clearCookie = () => `vxh_sess=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${origin().startsWith('https:') ? '; Secure' : ''}`;
const sameId = (a, b) => a.platform === b.platform && String(a.userId) === String(b.userId);
const isOwner = async (room, ids) => (await ownersOf(room)).some((o) => ids.some((id) => sameId(o, id)));
/** Panels without an owner (made before logging in existed) can still be deleted with the key alone. */
export const mayDrop = async (room, cookieHeader) => {
  const owners = await ownersOf(room);
  return !owners.length || owners.some((o) => readSession(cookieHeader).some((id) => sameId(o, id)));
};

// ---------- login / link ----------
export const accountLogin = async (body) => {
  const platform = String(body?.platform ?? '');
  if (platform !== 'twitch' && platform !== 'kick') return { status: 400, body: { error: 'bad_platform' } };
  if (!configured()[platform]) return { status: 503, body: { error: 'not_configured' } };
  const room = body?.key ? resolveRoom(String(body.key)) : '';
  const id = b64url(randomBytes(24));
  if (platform === 'twitch') {
    await putOAuthState(id, { room, platform });
    const q = new URLSearchParams({
      client_id: env('TWITCH_CLIENT_ID'), redirect_uri: `${origin()}/api/connect/twitch/callback`, response_type: 'code',
      scope: TWITCH_SCOPES.join(' '), state: id, force_verify: 'true',
    });
    return { status: 200, body: { url: `https://id.twitch.tv/oauth2/authorize?${q}` } };
  }
  const verifier = b64url(randomBytes(48));
  await putOAuthState(id, { room, platform, verifier });
  const q = new URLSearchParams({
    response_type: 'code', client_id: env('KICK_CLIENT_ID'), redirect_uri: `${origin()}/api/connect/kick/callback`,
    scope: KICK_SCOPES.join(' '), code_challenge: b64url(createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256', state: id,
  });
  return { status: 200, body: { url: `https://id.kick.com/oauth/authorize?${q}` } };
};

/** Makes the logged-in accounts owners of an unowned panel (or adds them when one of them already owns it) and links their channels. */
const claimRoom = async (room, ids) => {
  if (!room || !roomExists(room) || !ids.length) return 'no_room';
  const owners = await ownersOf(room);
  if (owners.length && !owners.some((o) => ids.some((id) => sameId(o, id)))) return 'not_owner';
  const links = { ...(roomState(room)?.links ?? {}) };
  for (const id of ids) {
    await addOwner(room, id);
    await linkChannel(room, id.platform, id.userId, id.login);
    links[id.platform] = id.login;
  }
  pushEvent(room, { links });
  return 'ok';
};

/** OAuth return: { location, cookie }. */
export const connectCallback = async (platform, params, cookieHeader) => {
  const back = (q) => `${origin()}/panel?${q}`;
  const st = await takeOAuthState(String(params.get('state') ?? ''));
  if (!st || st.platform !== platform) return { location: back(`login_error=state&platform=${platform}`) };
  if (params.get('error')) return { location: back(`login_error=denied&platform=${platform}`) };
  try {
    const who = platform === 'twitch' ? await twitchLink(String(params.get('code') ?? '')) : await kickLink(String(params.get('code') ?? ''), st.verifier);
    const me = { platform, userId: who.id, login: who.login };
    const ids = [me, ...readSession(cookieHeader).filter((x) => x.platform !== platform)];
    const claimed = st.room ? await claimRoom(st.room, ids) : 'no_room';
    return { location: back(`login=${platform}${claimed === 'not_owner' ? '&claim=not_owner' : ''}`), cookie: sessionCookie(ids) };
  } catch (err) {
    console.error(`login ${platform}:`, err?.message ?? err);
    return { location: back(`login_error=${encodeURIComponent(String(err?.message ?? 'failed').slice(0, 40))}&platform=${platform}`) };
  }
};

export const accountMe = async (cookieHeader) => {
  const ids = readSession(cookieHeader);
  const rooms = await roomsOwnedBy(ids);
  return {
    status: 200,
    body: {
      ...configured(),
      accounts: ids.map(({ platform, login }) => ({ platform, login })),
      panels: rooms.filter(roomExists).map((room) => ({ room, links: roomState(room)?.links ?? {} })),
    },
  };
};

export const accountClaim = async (body, cookieHeader) => {
  const ids = readSession(cookieHeader);
  if (!ids.length) return { status: 401, body: { error: 'login_required' } };
  const r = await claimRoom(resolveRoom(String(body?.key ?? '')), ids);
  return r === 'ok' ? { status: 200, body: { ok: true } } : { status: r === 'not_owner' ? 403 : 404, body: { error: r } };
};

export const accountUnlink = async (body, cookieHeader) => {
  const ids = readSession(cookieHeader);
  const room = String(body?.room ?? '');
  const platform = String(body?.platform ?? '');
  if (platform !== 'twitch' && platform !== 'kick') return { status: 400, body: { error: 'bad_platform' } };
  if (!ids.length || !(await isOwner(room, ids))) return { status: 403, body: { error: 'owner_login_required' } };
  const { userId, stillUsed } = await unlinkChannel(room, platform);
  if (platform === 'twitch' && userId && !stillUsed) await twitchUnsubscribeAll(userId).catch(() => {});
  const links = { ...(roomState(room)?.links ?? {}) };
  delete links[platform];
  pushEvent(room, { links });
  return { status: 200, body: { ok: true } };
};

export const accountRotate = async (body, cookieHeader) => {
  const ids = readSession(cookieHeader);
  const room = String(body?.room ?? '');
  if (!ids.length || !(await isOwner(room, ids))) return { status: 403, body: { error: 'owner_login_required' } };
  const r = rotateKey(room, String(body?.newKey ?? ''));
  return r.ok ? { status: 200, body: { ok: true } } : { status: 409, body: { error: r.error } };
};

export const accountLogout = () => ({ status: 200, body: { ok: true }, cookie: clearCookie() });

// ---------- Twitch ----------
let appToken = { value: '', exp: 0 };
const twitchAppToken = async () => {
  if (appToken.value && appToken.exp > Date.now() + 60_000) return appToken.value;
  const r = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: env('TWITCH_CLIENT_ID'), client_secret: env('TWITCH_CLIENT_SECRET'), grant_type: 'client_credentials' }),
  });
  const b = await json(r);
  if (!r.ok || !b.access_token) throw new Error('twitch_app_token');
  appToken = { value: b.access_token, exp: Date.now() + (Number(b.expires_in) || 3600) * 1000 };
  return appToken.value;
};
const helix = async (path, init = {}) => {
  const token = await twitchAppToken();
  return fetch(`https://api.twitch.tv/helix${path}`, {
    ...init, headers: { 'Client-Id': env('TWITCH_CLIENT_ID'), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
};

const twitchLink = async (code) => {
  const r = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env('TWITCH_CLIENT_ID'), client_secret: env('TWITCH_CLIENT_SECRET'), code, grant_type: 'authorization_code',
      redirect_uri: `${origin()}/api/connect/twitch/callback`,
    }),
  });
  const tok = await json(r);
  if (!r.ok || !tok.access_token) throw new Error('twitch_token');
  const u = await fetch('https://api.twitch.tv/helix/users', { headers: { 'Client-Id': env('TWITCH_CLIENT_ID'), Authorization: `Bearer ${tok.access_token}` } });
  const user = (await json(u)).data?.[0];
  if (!user?.id) throw new Error('twitch_user');
  await twitchSubscribe(user.id);
  // The user token is not needed any more: webhooks run on the app token.
  fetch('https://id.twitch.tv/oauth2/revoke', { method: 'POST', body: new URLSearchParams({ client_id: env('TWITCH_CLIENT_ID'), token: tok.access_token }) }).catch(() => {});
  return { id: String(user.id), login: String(user.display_name || user.login) };
};

const twitchSubscribe = async (id) => {
  const subs = [
    ['channel.follow', '2', { broadcaster_user_id: id, moderator_user_id: id }],
    ['channel.subscribe', '1', { broadcaster_user_id: id }],
    ['channel.subscription.message', '1', { broadcaster_user_id: id }],
    ['channel.subscription.gift', '1', { broadcaster_user_id: id }],
    ['channel.cheer', '1', { broadcaster_user_id: id }],
    ['channel.raid', '1', { to_broadcaster_user_id: id }],
    ['channel.channel_points_custom_reward_redemption.add', '1', { broadcaster_user_id: id }],
  ];
  for (const [type, version, condition] of subs) {
    const r = await helix('/eventsub/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ type, version, condition, transport: { method: 'webhook', callback: `${origin()}/api/eventsub/twitch`, secret: env('TWITCH_EVENTSUB_SECRET') } }),
    });
    // 409: already subscribed (another room listens to the same channel).
    if (!r.ok && r.status !== 409) console.error('eventsub subscribe', type, r.status, JSON.stringify(await json(r)).slice(0, 200));
  }
};

const twitchUnsubscribeAll = async (id) => {
  const r = await helix(`/eventsub/subscriptions?user_id=${encodeURIComponent(id)}`);
  for (const s of (await json(r)).data ?? []) await helix(`/eventsub/subscriptions?id=${encodeURIComponent(s.id)}`, { method: 'DELETE' });
};

const seen = new Map();
const firstTime = (id) => {
  const now = Date.now();
  if (seen.size > 5000) for (const [k, t] of seen) if (now - t > 15 * 60_000) seen.delete(k);
  if (!id || seen.has(id)) return false;
  seen.set(id, now);
  return true;
};
const safeEq = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Twitch event -> alert (kind, nick, number, note) and, for a mapped channel point reward, an effect. */
export const twitchAlert = (type, e) => {
  const name = (v) => String(v ?? '') || 'Anonim';
  switch (type) {
    case 'channel.follow': return { kind: 'follow', text: name(e.user_name) };
    case 'channel.subscribe': return e.is_gift ? null : { kind: 'sub', text: name(e.user_name), tier: e.tier };
    case 'channel.subscription.message': return { kind: 'sub', text: name(e.user_name), months: Number(e.cumulative_months) || 0, note: String(e.message?.text ?? '').slice(0, 120) };
    case 'channel.subscription.gift': return { kind: 'gift', text: e.is_anonymous ? 'Anonim' : name(e.user_name), amount: Number(e.total) || 1 };
    case 'channel.cheer': return { kind: 'bits', text: e.is_anonymous ? 'Anonim' : name(e.user_name), amount: Number(e.bits) || 0, note: String(e.message ?? '').slice(0, 120) };
    case 'channel.raid': return { kind: 'raid', text: name(e.from_broadcaster_user_name), amount: Number(e.viewers) || 0 };
    case 'channel.channel_points_custom_reward_redemption.add':
      return { kind: 'reward', text: name(e.user_name), reward: String(e.reward?.title ?? '').slice(0, 60), amount: Number(e.reward?.cost) || 0, note: String(e.user_input ?? '').slice(0, 120) };
    default: return null;
  }
};

/** What an event adds to the automatic counters (follows, subs, bits...) and to the goal bar / subathon. */
const tallies = (a) => {
  const n = Number(a.amount) || 0;
  switch (a.kind) {
    case 'follow': return { follows: 1 };
    case 'sub': return { subs: 1 };
    case 'gift': return { subs: n || 1, gifts: n || 1 };
    case 'bits': return { bits: n };
    case 'donate': return a.platform === 'kick' ? { kicks: n } : {};
    case 'raid': return { raids: 1 };
    default: return {};
  }
};

const deliver = async (platform, channelId, alert) => {
  if (!alert || !channelId) return;
  const add = tallies({ ...alert, platform });
  for (const room of await roomsForChannel(platform, channelId)) {
    const s = roomState(room);
    const fx = alert.kind === 'reward' ? s?.rewardFx?.[String(alert.reward ?? '').toLowerCase()] : undefined;
    pushEvent(room, { alert: { ...alert, platform }, fire: fx, tally: add });
  }
};

/** Raw body + headers in, { status, body, type } out. */
export const twitchWebhook = async (raw, headers) => {
  const id = String(headers['twitch-eventsub-message-id'] ?? '');
  const ts = String(headers['twitch-eventsub-message-timestamp'] ?? '');
  const sig = String(headers['twitch-eventsub-message-signature'] ?? '');
  const expected = `sha256=${createHmac('sha256', env('TWITCH_EVENTSUB_SECRET')).update(id + ts + raw).digest('hex')}`;
  if (!env('TWITCH_EVENTSUB_SECRET') || !safeEq(sig, expected)) return { status: 403, body: 'bad signature' };
  if (Math.abs(Date.now() - Date.parse(ts)) > 10 * 60_000) return { status: 403, body: 'stale' };
  let msg = {};
  try { msg = JSON.parse(raw); } catch { return { status: 400, body: 'bad json' }; }
  const kind = String(headers['twitch-eventsub-message-type'] ?? '');
  if (kind === 'webhook_callback_verification') return { status: 200, body: String(msg.challenge ?? ''), type: 'text/plain' };
  if (kind === 'revocation') return { status: 204, body: '' };
  if (kind !== 'notification' || !firstTime(id)) return { status: 204, body: '' };
  const type = String(msg.subscription?.type ?? '');
  const e = msg.event ?? {};
  const channel = String(e.broadcaster_user_id ?? e.to_broadcaster_user_id ?? '');
  await deliver('twitch', channel, twitchAlert(type, e));
  return { status: 204, body: '' };
};

// ---------- Kick ----------
const KICK_API = 'https://api.kick.com/public/v1';
const kickLink = async (code, verifier) => {
  const r = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', client_id: env('KICK_CLIENT_ID'), client_secret: env('KICK_CLIENT_SECRET'),
      redirect_uri: `${origin()}/api/connect/kick/callback`, code_verifier: String(verifier ?? ''), code,
    }),
  });
  const tok = await json(r);
  if (!r.ok || !tok.access_token) throw new Error('kick_token');
  const auth = { Authorization: `Bearer ${tok.access_token}`, Accept: 'application/json' };
  const user = (await json(await fetch(`${KICK_API}/users`, { headers: auth }))).data?.[0];
  if (!user?.user_id) throw new Error('kick_user');
  const sub = await fetch(`${KICK_API}/events/subscriptions`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ events: KICK_EVENTS, method: 'webhook' }),
  });
  if (!sub.ok) console.error('kick subscribe', sub.status, JSON.stringify(await json(sub)).slice(0, 200));
  return { id: String(user.user_id), login: String(user.name ?? user.username ?? user.user_id) };
};

let kickKey = { pem: '', at: 0 };
const kickPublicKey = async () => {
  if (kickKey.pem && Date.now() - kickKey.at < 6 * 3_600_000) return kickKey.pem;
  const b = await json(await fetch(`${KICK_API}/public-key`, { headers: { Accept: 'application/json' } }));
  const pem = String(b?.data?.public_key ?? b?.public_key ?? '');
  if (!pem.includes('BEGIN PUBLIC KEY')) throw new Error('kick_public_key');
  kickKey = { pem, at: Date.now() };
  return pem;
};

const userName = (u) => String(u?.username ?? u?.name ?? u?.slug ?? '') || 'Anonim';
/** Kick event -> alert. Field names follow Kick's webhook payloads; unknown shapes give no alert rather than a wrong one. */
export const kickAlert = (type, p) => {
  switch (type) {
    case 'channel.followed': return { kind: 'follow', text: userName(p.follower) };
    case 'channel.subscription.new': return { kind: 'sub', text: userName(p.subscriber), months: Number(p.duration) || 1 };
    case 'channel.subscription.renewal': return { kind: 'sub', text: userName(p.subscriber), months: Number(p.duration) || 0 };
    case 'channel.subscription.gifts': return { kind: 'gift', text: p.gifter?.is_anonymous || !p.gifter?.username ? 'Anonim' : userName(p.gifter), amount: Array.isArray(p.giftees) ? p.giftees.length : 1 };
    case 'kicks.gifted': return { kind: 'donate', text: userName(p.sender), amount: Number(p.gift?.amount) || 0, note: String(p.gift?.message ?? p.gift?.name ?? '').slice(0, 120) };
    case 'channel.reward.redemption.updated':
      // Kick sends this on every status change (pending, then accepted / rejected): one alert per redemption id,
      // and none for a rejected one.
      if (String(p.status ?? '').toLowerCase() === 'rejected') return null;
      if (p.id && !firstTime(`kr:${p.id}`)) return null;
      return { kind: 'reward', text: userName(p.redeemer), reward: String(p.reward?.title ?? '').slice(0, 60), amount: Number(p.reward?.cost) || 0, note: String(p.user_input ?? '').slice(0, 120) };
    default: return null;
  }
};

export const kickWebhook = async (raw, headers) => {
  const id = String(headers['kick-event-message-id'] ?? '');
  const ts = String(headers['kick-event-message-timestamp'] ?? '');
  const sig = String(headers['kick-event-signature'] ?? '');
  const type = String(headers['kick-event-type'] ?? '');
  let ok = false;
  try {
    const v = createVerify('SHA256');
    v.update(`${id}.${ts}.${raw}`);
    v.end();
    ok = Boolean(sig) && v.verify(await kickPublicKey(), Buffer.from(sig, 'base64'));
  } catch { ok = false; }
  if (!ok) return { status: 401, body: 'bad signature' };
  if (!firstTime(`k:${id}`)) return { status: 200, body: '' };
  let p = {};
  try { p = JSON.parse(raw); } catch { return { status: 400, body: 'bad json' }; }
  const channel = String(p.broadcaster?.user_id ?? '');
  await deliver('kick', channel, kickAlert(type, p));
  return { status: 200, body: '' };
};

