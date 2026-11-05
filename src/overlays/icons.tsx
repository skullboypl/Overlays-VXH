// Brand marks for socials. Line icons from Tabler (MIT), Discord from its press kit shape.

export type Brand = 'twitch' | 'youtube' | 'discord' | 'tiktok' | 'kick' | 'instagram' | 'x' | 'facebook' | 'link';

export const BRAND_COLORS: Record<Brand, string> = {
  twitch: '#9146ff', youtube: '#ff0033', discord: '#5865f2', tiktok: '#25f4ee', kick: '#53fc18',
  instagram: '#e1306c', x: '#ffffff', facebook: '#1877f2', link: '#ff5900',
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
          {brand === 'link' && <><path d="M9 15l6-6" /><path d="M11 6l.46-.54a5 5 0 0 1 7.07 7.07L18 13" /><path d="M13 18l-.4.54a5.07 5.07 0 0 1-7.12 0 4.97 4.97 0 0 1 0-7.07L6 11" /></>}
        </svg>
      );
  }
};

/** "twitch.tv/x | discord.gg/y" → list of entries with a detected brand. */
export const parseSocials = (text: string) =>
  text.split('|').map((s) => s.trim()).filter(Boolean).map((label) => ({ label, brand: detectBrand(label) }));
