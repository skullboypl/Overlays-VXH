// Photo backgrounds generated locally (ComfyUI + Flux1-dev), stored as public/bg/<id>.webp and <id>-thumb.webp.
export const PHOTO_IDS = ['cozy', 'city', 'winter', 'xmas', 'halloween', 'nebula', 'sunset', 'abstract', 'sakura', 'beach'];

// AI holiday frames (Flux1-dev + RMBG-2.0) as src/assets/frames/<theme>-<variant>.webp.
// Bundled through Vite, so a variant shows up in the studio as soon as its file exists.
const frameFiles = import.meta.glob<string>('../assets/frames/*.webp', { eager: true, query: '?url', import: 'default' });
export const FRAME_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(frameFiles).map(([path, url]) => [path.match(/([\w-]+)\.webp$/)![1], url]),
);
