// Public follower / subscriber count of a channel, for the goal bar.
//
// GET /api/followers?platform=twitch&channel=<login>     needs TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (app token, no user login)
// GET /api/followers?platform=youtube&channel=@<handle>  needs YOUTUBE_API_KEY
// GET /api/followers?platform=kick&channel=<slug>        no key: kick.com's own channel endpoint (the official API has no follower count)
// → {"platform", "channel", "name", "avatar", "count"}
//
// Answers are cached, so a hundred OBS sources of one streamer cost one upstream call a minute.

const TTL = { twitch: 60_000, youtube: 5 * 60_000, kick: 60_000 };
const ERROR_TTL = 60_000;
const MAX_ENTRIES = 2000;
const TWITCH_LOGIN = /^[A-Za-z0-9_]{3,25}$/;
const YT_HANDLE = /^@?[A-Za-z0-9._-]{3,30}$/;
const KICK_SLUG = /^[A-Za-z0-9_-]{3,25}$/;

/** key → { at, status, body } (also failed answers, so a typo is not retried every second) */
const cache = new Map();
/** key → in-flight promise, so parallel requests share one upstream call */
const pending = new Map();
let twitchToken = { value: '', until: 0 };

const json = async (res) => {
  if (!res.ok) throw Object.assign(new Error(`upstream ${res.status}`), { status: res.status });
  return res.json();
};

const getTwitchToken = async (fetchImpl) => {
  if (twitchToken.value && Date.now() < twitchToken.until) return twitchToken.value;
  const body = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID ?? '',
    client_secret: process.env.TWITCH_CLIENT_SECRET ?? '',
    grant_type: 'client_credentials',
  });
  const data = await json(await fetchImpl('https://id.twitch.tv/oauth2/token', { method: 'POST', body }));
  twitchToken = { value: data.access_token, until: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 300) * 1000 };
  return twitchToken.value;
};

const twitch = async (login, fetchImpl) => {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return { status: 503, body: { error: 'not_configured' } };
  const call = async (path) => {
    const token = await getTwitchToken(fetchImpl);
    const res = await fetchImpl(`https://api.twitch.tv/helix/${path}`, { headers: { 'Client-Id': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` } });
    if (res.status === 401) twitchToken = { value: '', until: 0 };
    return json(res);
  };
  const users = await call(`users?login=${encodeURIComponent(login.toLowerCase())}`);
  const user = users.data?.[0];
  if (!user) return { status: 404, body: { error: 'channel_not_found' } };
  // With an app token Twitch returns only the total, which is all the goal bar needs.
  const follows = await call(`channels/followers?broadcaster_id=${user.id}&first=1`);
  return { status: 200, body: { platform: 'twitch', channel: user.login, name: user.display_name, avatar: user.profile_image_url, count: follows.total ?? 0 } };
};

const youtube = async (handle, fetchImpl) => {
  if (!process.env.YOUTUBE_API_KEY) return { status: 503, body: { error: 'not_configured' } };
  const h = handle.startsWith('@') ? handle : `@${handle}`;
  const data = await json(await fetchImpl(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(h)}&key=${process.env.YOUTUBE_API_KEY}`));
  const ch = data.items?.[0];
  if (!ch) return { status: 404, body: { error: 'channel_not_found' } };
  if (ch.statistics?.hiddenSubscriberCount) return { status: 409, body: { error: 'count_hidden' } };
  return { status: 200, body: { platform: 'youtube', channel: h, name: ch.snippet?.title ?? h, avatar: ch.snippet?.thumbnails?.default?.url ?? '', count: Number(ch.statistics?.subscriberCount ?? 0) } };
};

const kick = async (slug, fetchImpl) => {
  const res = await fetchImpl(`https://kick.com/api/v2/channels/${encodeURIComponent(slug.toLowerCase())}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; vxh-overlays)' },
  });
  if (res.status === 404) return { status: 404, body: { error: 'channel_not_found' } };
  // Kick sits behind Cloudflare, which can refuse server addresses: say "unavailable" rather than break the widget.
  if (!res.ok || !String(res.headers.get?.('content-type') ?? 'application/json').includes('json')) return { status: 503, body: { error: 'unavailable' } };
  const data = await res.json();
  if (data?.followers_count === undefined) return { status: 503, body: { error: 'unavailable' } };
  return { status: 200, body: { platform: 'kick', channel: data.slug, name: data.user?.username ?? data.slug, avatar: data.user?.profile_pic ?? '', count: Number(data.followers_count) || 0 } };
};

/** Resolves one request; `fetchImpl` is injectable for tests. */
export const followers = async (platform, channel, fetchImpl = fetch) => {
  const name = String(channel ?? '').trim();
  const valid = { twitch: TWITCH_LOGIN, youtube: YT_HANDLE, kick: KICK_SLUG }[platform];
  if (!valid || !valid.test(name)) {
    return { status: 400, body: { error: 'bad_channel' } };
  }
  const key = `${platform}:${name.toLowerCase()}`;
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < (hit.status === 200 ? TTL[platform] : ERROR_TTL)) return hit;
  if (pending.has(key)) return pending.get(key);
  const run = (async () => {
    let answer;
    try {
      answer = await ({ twitch, youtube, kick }[platform])(name, fetchImpl);
    } catch (e) {
      // A failed refresh keeps showing the last good number instead of an error.
      answer = hit?.status === 200 ? hit : { status: 502, body: { error: 'upstream', detail: String(e.status ?? '') } };
    }
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    const entry = { ...answer, at: answer.at ?? Date.now() };
    cache.set(key, entry);
    return entry;
  })().finally(() => pending.delete(key));
  pending.set(key, run);
  return run;
};
