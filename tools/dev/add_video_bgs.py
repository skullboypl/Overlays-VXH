ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


open(ROOT + 'overlays/backgrounds.ts', 'a', encoding='utf-8').write("""
// Looping realistic video backgrounds (Wan 2.2 from the photo backgrounds), src/assets/videos/<photo id>.mp4.
const videoFiles = import.meta.glob<string>('../assets/videos/*.mp4', { eager: true, query: '?url', import: 'default' });
export const VIDEO_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(videoFiles).map(([path, url]) => [path.match(/([\\w-]+)\\.mp4$/)![1], url]),
);
/** Background ids of the videos: "v-cozy", "v-city"... */
export const VIDEO_IDS = Object.keys(VIDEO_URLS).map((id) => `v-${id}`);
""")

edit('overlays/SceneScreen.tsx', [
    ("import { PHOTO_IDS } from './backgrounds';", "import { PHOTO_IDS, VIDEO_URLS } from './backgrounds';"),
    ("export const Background = ({ bg, colors, params }: { bg: string; colors: string[]; params: Params }) => {\n  const [a, b = a, c = b] = colors;",
     "export const Background = ({ bg, colors, params }: { bg: string; colors: string[]; params: Params }) => {\n  const [a, b = a, c = b] = colors;\n  if (bg.startsWith('v-') && VIDEO_URLS[bg.slice(2)]) return <VideoBg src={VIDEO_URLS[bg.slice(2)]} poster={`/bg/${bg.slice(2)}.webp`} params={params} />;"),
    ("const Photo = ({ src, params }: { src: string; params: Params }) => (",
     """/** Looping video background: same dim/tint treatment as the photos, plus blur and speed. */
export const VideoBg = ({ src, poster, params }: { src: string; poster: string; params: Params }) => (
  <div className="sc-bg sc-photo sc-video">
    <video
      className="sc-video-el"
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      ref={(v) => { if (v) v.playbackRate = Number(params.bgSpeed ?? 1); }}
      style={{ filter: Number(params.bgBlur ?? 0) > 0 ? `blur(${params.bgBlur}px)` : undefined }}
    />
    {params.bgTint && <div className="sc-photo-tint" />}
    <div className="sc-photo-dim" style={{ opacity: (params.bgDim as number) ?? 0.35 }} />
  </div>
);

const Photo = ({ src, params }: { src: string; params: Params }) => ("""),
])
open(ROOT + 'overlays/scene.css', 'a', encoding='utf-8').write("""
/* ---------- video backgrounds ---------- */
.sc-video-el { position: absolute; inset: -2%; width: 104%; height: 104%; object-fit: cover; }
""")

p = ROOT + 'overlays/registry.ts'
s = open(p, encoding='utf-8').read()
s = s.replace("import { CHARACTERS, CHARACTER_LABELS, FRAME_URLS, PHOTO_IDS } from './backgrounds';",
              "import { CHARACTERS, CHARACTER_LABELS, FRAME_URLS, PHOTO_IDS, VIDEO_IDS } from './backgrounds';", 1)
a = "  ...PHOTO_IDS.map((id) => ({ value: id, label: PHOTO_LABELS[id] })),"
assert a in s
s = s.replace(a, a + "\n  ...VIDEO_IDS.map((id) => ({ value: id, label: `▶ ${PHOTO_LABELS[id.slice(2)] ?? id}` })),", 1)
a = "  ...Object.fromEntries(PHOTO_IDS.map((id) => [id, `url(/bg/${id}-thumb.webp) center / cover`])),"
assert a in s
s = s.replace(a, a + "\n  // A play badge in the corner marks the moving ones.\n  ...Object.fromEntries(VIDEO_IDS.map((id) => [id, `radial-gradient(circle at 86% 22%, #ff5900 0 11%, transparent 12%), url(/bg/${id.slice(2)}-thumb.webp) center / cover`])),", 1)
# image-only knobs: dim/tint also for video; motion only for photos; blur/speed only for video
s = s.replace("when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] } },\n  { group: 'Tło', key: 'bgDim'", "when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] } },\n  { group: 'Tło', key: 'bgDim'", 1)
s = s.replace("{ group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] }, hint: 'Ciemniejsze tło = czytelniejszy tytuł' },",
              "{ group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, ...VIDEO_IDS, 'custom'] }, hint: 'Ciemniejsze tło = czytelniejszy tytuł' },\n"
              "  { group: 'Tło', key: 'bgBlur', label: 'Rozmycie wideo', type: 'range', min: 0, max: 20, step: 1, default: 0, unit: 'px', when: { key: 'bg', is: VIDEO_IDS } },\n"
              "  { group: 'Tło', key: 'bgSpeed', label: 'Prędkość wideo', type: 'range', min: 0.25, max: 2, step: 0.05, default: 1, unit: '×', when: { key: 'bg', is: VIDEO_IDS } },", 1)
s = s.replace("{ group: 'Tło', key: 'bgTint', label: 'Zabarw kolorami motywu', type: 'toggle', default: false, when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] } },",
              "{ group: 'Tło', key: 'bgTint', label: 'Zabarw kolorami motywu', type: 'toggle', default: false, when: { key: 'bg', is: [...PHOTO_IDS, ...VIDEO_IDS, 'custom'] } },", 1)
s = s.replace("{ group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] } },",
              "{ group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, ...VIDEO_IDS, 'custom'] } },", 1)

entry = """  {
    id: 'videobg', name: 'Tło wideo', icon: '🎬', category: 'scene', size: FULL_HD,
    description: 'Realistyczne zapętlone wideo na całą scenę: pokój nocą z deszczem, miasto neon, zimowy las, kominek i inne.',
    fields: [
      { group: 'Wideo', key: 'bg', label: 'Wybierz wideo', type: 'select', default: VIDEO_IDS[0] ?? 'v-cozy',
        options: BG_OPTIONS.filter((o) => o.value.startsWith('v-')), swatches: BG_SWATCHES },
      { group: 'Wideo', key: 'bgSpeed', label: 'Prędkość wideo', type: 'range', min: 0.25, max: 2, step: 0.05, default: 1, unit: '×' },
      { group: 'Wideo', key: 'bgBlur', label: 'Rozmycie wideo', type: 'range', min: 0, max: 20, step: 1, default: 0, unit: 'px' },
      { group: 'Wideo', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.15 },
      { group: 'Wideo', key: 'bgTint', label: 'Zabarw kolorami motywu', type: 'toggle', default: false },
      { group: 'Wideo', key: 'colors', label: 'Kolory motywu', type: 'colors', max: 3, default: ['#ff5900', '#ff2d6f', '#7a5cff'], when: { key: 'bgTint', is: [true] } },
      { group: 'Dodatki', key: 'effect', label: 'Efekt na wierzchu', type: 'select', default: 'none', options: [
        { value: 'none', label: 'Brak' }, { value: 'snow', label: 'Śnieg' }, { value: 'stars', label: 'Gwiazdy' }, { value: 'fireflies', label: 'Świetliki' },
        { value: 'petals', label: 'Płatki' }, { value: 'confetti', label: 'Konfetti' },
      ] },
      { group: 'Dodatki', key: 'vignette', label: 'Winieta', type: 'toggle', default: true },
      { group: 'Dodatki', key: 'grain', label: 'Ziarno filmowe', type: 'toggle', default: false },
    ],
  },
"""
a = "  {\n    id: 'camscene',"
assert a in s
s = s.replace(a, entry + a, 1)
s = s.replace("export const OVERLAYS = ALL_OVERLAYS.filter((o) => o.id !== 'character' || Object.keys(CHARACTERS).length > 0);",
              "export const OVERLAYS = ALL_OVERLAYS.filter((o) => (o.id !== 'character' || Object.keys(CHARACTERS).length > 0) && (o.id !== 'videobg' || VIDEO_IDS.length > 0));", 1)
open(p, 'w', encoding='utf-8').write(s)

edit('overlays/Overlay.tsx', [
    ("import { CamScene } from './CamScene';", "import { CamScene } from './CamScene';\nimport { VideoScene } from './VideoScene';"),
    ("    case 'camscene': return <CamScene params={params} />;", "    case 'camscene': return <CamScene params={params} />;\n    case 'videobg': return <VideoScene params={params} />;"),
])
open(ROOT + 'overlays/VideoScene.tsx', 'w', encoding='utf-8').write("""import type { Params } from './schema';
import { Background, EFFECT_DEFAULTS } from './SceneScreen';
import { ParticleLayer, type EffectKind } from './ParticleLayer';
import { GrainLayer } from './GrainLayer';

/** "Tło wideo": a looping realistic video on the whole scene, with optional effect, vignette and grain. */
export const VideoScene = ({ params }: { params: Params }) => {
  const colors = (params.colors as string[]) ?? ['#ff5900', '#ff2d6f', '#7a5cff'];
  const effect = String(params.effect ?? 'none');
  return (
    <div className="sc-root" style={{ '--c1': colors[0], '--c3': colors[2] ?? colors[0] } as React.CSSProperties}>
      <Background bg={String(params.bg)} colors={colors} params={params} />
      {effect !== 'none' && EFFECT_DEFAULTS[effect] && (
        <ParticleLayer key={effect} kind={effect as EffectKind} params={{ ...EFFECT_DEFAULTS[effect], ...(effect === 'confetti' ? { colors } : {}) }} />
      )}
      {params.vignette && <div className="sc-vignette" />}
      {params.grain && <GrainLayer params={{ grain: 0.35, vignette: 0, scanlines: false, flicker: false }} />}
    </div>
  );
};
""")
print('ok')
