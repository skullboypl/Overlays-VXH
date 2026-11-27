// "Now playing" from Last.fm, for the music widget.
//
// GET /api/nowplaying?lastfm=<user>   needs LASTFM_API_KEY (free key from last.fm/api)
// → {"playing": true|false, "title", "artist", "album", "cover", "url"}
//
// Spotify, Apple Music, YouTube Music, Deezer and others can scrobble to Last.fm, so this covers them without asking
// the streamer to log in anywhere. Cached for 8 s per user: many OBS sources of one streamer cost one call.

const USER = /^[A-Za-z0-9_-]{2,15}$/;
const TTL = 8_000;
const cache = new Map();
const pending = new Map();

const pickImage = (images) => {
  const list = Array.isArray(images) ? images : [];
  const url = String((list.find((i) => i.size === 'extralarge') ?? list.at(-1))?.['#text'] ?? '');
  return /^https:\/\/lastfm\.freetls\.fastly\.net\//.test(url) ? url : '';
};

export const nowPlaying = async (user, fetchImpl = fetch) => {
  const name = String(user ?? '').trim();
  if (!USER.test(name)) return { status: 400, body: { error: 'bad_user' } };
  const key = String(process.env.LASTFM_API_KEY ?? '').trim();
  if (!key) return { status: 503, body: { error: 'not_configured' } };
  const id = name.toLowerCase();
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit;
  if (pending.has(id)) return pending.get(id);
  const run = (async () => {
    let answer;
    try {
      const q = new URLSearchParams({ method: 'user.getrecenttracks', user: name, api_key: key, format: 'json', limit: '1' });
      const res = await fetchImpl(`https://ws.audioscrobbler.com/2.0/?${q}`);
      const data = await res.json().catch(() => ({}));
      if (data?.error === 6) answer = { status: 404, body: { error: 'user_not_found' } };
      else if (!res.ok) answer = { status: 503, body: { error: 'unavailable' } };
      else {
        const t = data?.recenttracks?.track?.[0] ?? data?.recenttracks?.track;
        const playing = t?.['@attr']?.nowplaying === 'true';
        answer = { status: 200, body: t ? {
          playing, title: String(t.name ?? '').slice(0, 120), artist: String(t.artist?.['#text'] ?? t.artist?.name ?? '').slice(0, 120),
          album: String(t.album?.['#text'] ?? '').slice(0, 120), cover: pickImage(t.image), url: /^https:\/\/www\.last\.fm\//.test(String(t.url)) ? String(t.url) : '',
        } : { playing: false, title: '', artist: '', album: '', cover: '', url: '' } };
      }
    } catch {
      answer = { status: 503, body: { error: 'unavailable' } };
    }
    const entry = { ...answer, at: Date.now() };
    if (cache.size > 2000) cache.clear();
    cache.set(id, entry);
    return entry;
  })();
  pending.set(id, run);
  try { return await run; } finally { pending.delete(id); }
};
