import photoBgs from './photo-bgs.json';

// Photo backgrounds generated locally (ComfyUI + Flux1-dev + 4x-UltraSharp, 3840x2160), stored as
// public/bg/<id>.webp and <id>-thumb.webp. tools/ai/gen_bgs.py adds each id to photo-bgs.json once its file exists.
export const PHOTO_IDS: string[] = photoBgs;

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
  'gingerbread-game': 'Piernikowy ludzik',
  'penguin-game': 'Pingwin',
  'ghost-game': 'Duszek',
  'skeleton-game': 'Szkielet',
  'robot-game': 'Robot',
  'dragon-game': 'Smoczek',
  'cat-game': 'Kotek',
  'panda-game': 'Panda',
  'astronaut-game': 'Astronauta',
  'knight-game': 'Rycerz',
  'gamer-game': 'Gamer',
  'angel-game': 'Aniołek',
  'elf-real': 'Elf (realistyczny)',
  'witch-real': 'Czarownica (realistyczna)',
  'snowman-real': 'Bałwan (realistyczny)',
  'reindeer-real': 'Renifer (realistyczny)',
  'bunny-real': 'Zajączek (realistyczny)',
};

// Looping realistic video backgrounds (Wan 2.2 from the photo backgrounds), src/assets/videos/<photo id>.mp4.
const videoFiles = import.meta.glob<string>('../assets/videos/*.mp4', { eager: true, query: '?url', import: 'default' });
export const VIDEO_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(videoFiles).map(([path, url]) => [path.match(/([\w-]+)\.mp4$/)![1], url]),
);
/** Background ids of the videos: "v-cozy", "v-city"... */
export const VIDEO_IDS = Object.keys(VIDEO_URLS).map((id) => `v-${id}`);
