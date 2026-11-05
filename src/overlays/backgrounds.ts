// Photo backgrounds generated locally (ComfyUI + Flux1-dev), stored as public/bg/<id>.webp and <id>-thumb.webp.
export const PHOTO_IDS = ['cozy', 'city', 'winter', 'xmas', 'halloween', 'nebula', 'sunset', 'abstract', 'sakura', 'beach'];

// AI holiday frames (Flux1-dev + RMBG-2.0) as src/assets/frames/<theme>-<variant>.webp.
// Bundled through Vite, so a variant shows up in the studio as soon as its file exists.
const frameFiles = import.meta.glob<string>('../assets/frames/*.webp', { eager: true, query: '?url', import: 'default' });
export const FRAME_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(frameFiles).map(([path, url]) => [path.match(/([\w-]+)\.webp$/)![1], url]),
);

// Looping characters (Flux1-dev still -> MiniMax H3 first/last-frame video -> RMBG-2.0), as
// src/assets/characters/<id>.webm (VP9 with alpha) and <id>.png (poster). Picked up automatically.
const charVideos = import.meta.glob<string>('../assets/characters/*.webm', { eager: true, query: '?url', import: 'default' });
const charPosters = import.meta.glob<string>('../assets/characters/*.png', { eager: true, query: '?url', import: 'default' });
const idOf = (path: string) => path.match(/([\w-]+)\.\w+$/)![1];
export const CHARACTERS: Record<string, { video: string; poster: string }> = Object.fromEntries(
  Object.entries(charVideos).map(([path, video]) => {
    const id = idOf(path);
    const poster = Object.entries(charPosters).find(([p]) => idOf(p) === id)?.[1] ?? '';
    return [id, { video, poster }];
  }),
);

/** Polish names (translation keys) of the characters we generate. */
export const CHARACTER_LABELS: Record<string, string> = {
  'santa-game': 'Mikołaj (gra 3D)',
  'santa-real': 'Mikołaj (realistyczny)',
  'elf-game': 'Elf',
  'snowman-game': 'Bałwan',
  'reindeer-game': 'Renifer',
  'pumpkin-game': 'Dyniogłowy',
  'witch-game': 'Czarownica',
  'bunny-game': 'Zajączek wielkanocny',
  'cupid-game': 'Amorek',
  'partygirl-game': 'Sylwestrowa impreza',
};
