// Brand marks for socials. Line icons from Tabler (MIT; Tipply uses the gift icon, Patronite the heart, Ko-fi the cup), Discord from its press kit shape.

export type Brand = 'twitch' | 'youtube' | 'discord' | 'tiktok' | 'kick' | 'instagram' | 'x' | 'facebook'
  | 'bluesky' | 'threads' | 'spotify' | 'steam' | 'reddit' | 'github' | 'patreon' | 'kofi' | 'paypal' | 'tipply' | 'patronite' | 'email' | 'link';

export const BRAND_COLORS: Record<Brand, string> = {
  twitch: '#9146ff', youtube: '#ff0033', discord: '#5865f2', tiktok: '#25f4ee', kick: '#53fc18',
  instagram: '#e1306c', x: '#ffffff', facebook: '#1877f2',
  bluesky: '#1185fe', threads: '#f2f2f2', spotify: '#1ed760', steam: '#66c0f4', reddit: '#ff4500', github: '#e6edf3',
  patreon: '#ff424d', kofi: '#ff5e5b', paypal: '#0070e0', tipply: '#ffc21a', patronite: '#e8174b', email: '#38bdf8',
  link: '#ff5900',
};

/** Colour for a glyph or text drawn on top of the brand colour. Light brand colours (X, TikTok cyan, Kick and Spotify green...) are too light for white. */
export const BRAND_INK: Record<Brand, string> = {
  twitch: '#fff', youtube: '#fff', discord: '#fff', tiktok: '#0f1419', kick: '#0f1419',
  instagram: '#fff', x: '#0f1419', facebook: '#fff',
  bluesky: '#fff', threads: '#0f1419', spotify: '#0f1419', steam: '#0f1419', reddit: '#fff', github: '#0f1419',
  patreon: '#fff', kofi: '#fff', paypal: '#fff', tipply: '#0f1419', patronite: '#fff', email: '#0f1419',
  link: '#fff',
};

export const detectBrand = (text: string): Brand => {
  const t = text.toLowerCase();
  if (t.includes('twitch')) return 'twitch';
  if (t.includes('youtu')) return 'youtube';
  if (t.includes('discord')) return 'discord';
  if (t.includes('tiktok')) return 'tiktok';
  if (t.includes('kick')) return 'kick';
  if (t.includes('insta')) return 'instagram';
  if (t.includes('facebook') || t.includes('fb.')) return 'facebook';
  if (/(^|[\s/])x\.com|twitter/.test(t)) return 'x';
  if (t.includes('bsky') || t.includes('bluesky')) return 'bluesky';
  if (t.includes('threads.')) return 'threads';
  if (t.includes('spotify')) return 'spotify';
  if (t.includes('steam')) return 'steam';
  if (t.includes('reddit')) return 'reddit';
  if (t.includes('github')) return 'github';
  if (t.includes('patreon')) return 'patreon';
  if (t.includes('ko-fi') || t.includes('kofi')) return 'kofi';
  if (t.includes('paypal')) return 'paypal';
  if (t.includes('tipply')) return 'tipply';
  if (t.includes('patronite')) return 'patronite';
  if (t.startsWith('mailto:') || /^[^\s/@|]+@[^\s/@|]+\.[a-z]{2,}$/.test(t)) return 'email';
  return 'link';
};

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const BrandIcon = ({ brand, size = '1em' }: { brand: Brand; size?: string | number }) => {
  switch (brand) {
    case 'discord':
      return (
        <svg viewBox="0 0 256 199" width={size} height={size} fill="currentColor" aria-hidden>
          <path d="M216.86 16.6A208.5 208.5 0 0 0 164.04 0c-2.27 4.11-4.93 9.65-6.76 14.05a194 194 0 0 0-58.54 0C96.91 9.65 94.19 4.11 91.9 0A207.8 207.8 0 0 0 39.04 16.64C5.62 67.15-3.44 116.4 1.09 164.96c22.17 16.55 43.65 26.61 64.77 33.19a161 161 0 0 0 13.87-22.85 136 136 0 0 1-21.85-10.63c1.83-1.36 3.62-2.78 5.36-4.24 42.12 19.7 87.89 19.7 129.51 0 1.75 1.46 3.54 2.88 5.36 4.24a136 136 0 0 1-21.89 10.65c4.01 8.02 8.64 15.67 13.87 22.85 21.14-6.58 42.65-16.64 64.82-33.21 5.31-56.29-9.08-105.09-38.05-148.36ZM85.47 135.09c-12.64 0-23.01-11.8-23.01-26.18s10.15-26.2 23.01-26.2 23.24 11.8 23.02 26.2c.02 14.38-10.15 26.18-23.02 26.18Zm85.05 0c-12.64 0-23.01-11.8-23.01-26.18s10.15-26.2 23.01-26.2 23.24 11.8 23.01 26.2c0 14.38-10.15 26.18-23.01 26.18Z" />
        </svg>
      );
    case 'kick':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
          <path d="M3 3h6v4h2V5h2V3h6v6h-2v2h-2v2h2v2h2v6h-6v-2h-2v-2H9v4H3z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} {...line} aria-hidden>
          {brand === 'twitch' && <><path d="M5 4l-2 4v11h4v3l3-3h4l5-5V4z" /><path d="M10 9v3M14 9v3" /></>}
          {brand === 'youtube' && <><path d="M2 8.5A2.5 2.5 0 0 1 4.5 6h15A2.5 2.5 0 0 1 22 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 15.5z" /><path d="M10 9l5 3-5 3z" /></>}
          {brand === 'tiktok' && <path d="M9 12a4 4 0 1 0 4 4V7a5 5 0 0 0 5 5" />}
          {brand === 'x' && <><path d="M4 4l11.73 16H20L8.27 4z" /><path d="M4 20l6.77-6.77m2.46-2.46L20 4" /></>}
          {brand === 'instagram' && <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><path d="M16.5 7.5v.01" /></>}
          {brand === 'facebook' && <path d="M7 10v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3V3h-3a5 5 0 0 0-5 5v2z" />}
          {brand === 'bluesky' && <path d="M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .35 4.953 .556 5.661c.713 2.463 3.13 2.75 5.444 2.369c-4.045 .665 -4.889 3.208 -2.667 5.41c1.03 1.018 1.913 1.59 2.667 1.59c2 0 3.134 -2.769 3.5 -3.5c.333 -.667 .5 -1.167 .5 -1.5c0 .333 .167 .833 .5 1.5c.366 .731 1.5 3.5 3.5 3.5c.754 0 1.637 -.571 2.667 -1.59c2.222 -2.203 1.378 -4.746 -2.667 -5.41c2.314 .38 4.73 .094 5.444 -2.369c.206 -.708 .556 -5.072 .556 -5.661c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.76 5.048 -5.665 6.856c-.905 -1.808 -3.372 -5.194 -5.665 -6.856" />}
          {brand === 'threads' && <path d="M19 7.5c-1.333 -3 -3.667 -4.5 -7 -4.5c-5 0 -8 2.5 -8 9s3.5 9 8 9s7 -3 7 -5s-1 -5 -7 -5c-2.5 0 -3 1.25 -3 2.5c0 1.5 1 2.5 2.5 2.5c2.5 0 3.5 -1.5 3.5 -5s-2 -4 -3 -4s-1.833 .333 -2.5 1" />}
          {brand === 'spotify' && <><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M8 11.973c2.5 -1.473 5.5 -.973 7.5 .527" /><path d="M9 15c1.5 -1 4 -1 5 .5" /><path d="M7 9c2 -1 6 -2 10 .5" /></>}
          {brand === 'steam' && <><path d="M16.5 5a4.5 4.5 0 1 1 -.653 8.953l-4.347 3.009l0 .038a3 3 0 0 1 -2.824 3l-.176 0a3 3 0 0 1 -2.94 -2.402l-2.56 -1.098v-3.5l3.51 1.755a2.989 2.989 0 0 1 2.834 -.635l2.727 -3.818a4.5 4.5 0 0 1 4.429 -5.302" /><path d="M15.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" fill="currentColor" /></>}
          {brand === 'reddit' && <><path d="M12 8c2.648 0 5.028 .826 6.675 2.14a2.5 2.5 0 0 1 2.326 4.36c0 3.59 -4.03 6.5 -9 6.5c-4.875 0 -8.845 -2.8 -9 -6.294l-1 -.206a2.5 2.5 0 0 1 2.326 -4.36c1.646 -1.313 4.026 -2.14 6.674 -2.14l.999 0" /><path d="M12 8l1 -5l6 1" /><path d="M18 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M8.5 13a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor" /><path d="M14.5 13a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor" /><path d="M10 17c.667 .333 1.333 .5 2 .5s1.333 -.167 2 -.5" /></>}
          {brand === 'github' && <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />}
          {brand === 'patreon' && <path d="M20 8.408c-.003 -2.299 -1.746 -4.182 -3.79 -4.862c-2.54 -.844 -5.888 -.722 -8.312 .453c-2.939 1.425 -3.862 4.545 -3.896 7.656c-.028 2.559 .22 9.297 3.92 9.345c2.75 .036 3.159 -3.603 4.43 -5.356c.906 -1.247 2.071 -1.599 3.506 -1.963c2.465 -.627 4.146 -2.626 4.142 -5.273" />}
          {brand === 'kofi' && <><path d="M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1" /><path d="M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" /><path d="M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2" /><path d="M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5" /><path d="M16.746 16.726a3 3 0 1 0 .252 -5.555" /></>}
          {brand === 'paypal' && <path d="M10 13l2.5 0c2.5 0 5 -2.5 5 -5c0 -3 -1.9 -5 -5 -5h-5.5c-.5 0 -1 .5 -1 1l-2 14c0 .5 .5 1 1 1h2.8l1.2 -5c.1 -.6 .4 -1 1 -1m7.5 -5.8c1.7 1 2.5 2.8 2.5 4.8c0 2.5 -2.5 4.5 -5 4.5h-2.6l-.6 3.6a1 1 0 0 1 -1 .8l-2.7 0a.5 .5 0 0 1 -.5 -.6l.2 -1.4" />}
          {brand === 'tipply' && <><path d="M3 9a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -2" /><path d="M12 8l0 13" /><path d="M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5" /></>}
          {brand === 'patronite' && <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />}
          {brand === 'email' && <><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" /><path d="M3 7l9 6l9 -6" /></>}
          {brand === 'link' && <><path d="M9 15l6-6" /><path d="M11 6l.46-.54a5 5 0 0 1 7.07 7.07L18 13" /><path d="M13 18l-.4.54a5.07 5.07 0 0 1-7.12 0 4.97 4.97 0 0 1 0-7.07L6 11" /></>}
        </svg>
      );
  }
};

/** "twitch.tv/x | discord.gg/y" → list of entries with a detected brand. */
export const parseSocials = (text: string) =>
  text.split('|').map((s) => s.trim()).filter(Boolean).map((label) => ({ label, brand: detectBrand(label) }));
