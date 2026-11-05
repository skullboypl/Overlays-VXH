import type { Field, OverlayDef } from './schema';
import { CHARACTERS, CHARACTER_LABELS, FRAME_URLS, PHOTO_IDS, VIDEO_IDS } from './backgrounds';

const FULL_HD = { w: 1920, h: 1080 };
const CAM = { w: 640, h: 360 };

const density = (def: number, max = 600): Field => ({
  key: 'count', label: 'Ilość', type: 'range', min: 5, max, step: 5, default: def,
});
const speed = (def = 1): Field => ({
  key: 'speed', label: 'Prędkość', type: 'range', min: 0.2, max: 3, step: 0.1, default: def, unit: '×',
});
const size = (def = 1): Field => ({
  key: 'size', label: 'Rozmiar', type: 'range', min: 0.3, max: 3, step: 0.1, default: def, unit: '×',
});
const wind = (def = 0): Field => ({
  key: 'wind', label: 'Wiatr', type: 'range', min: -3, max: 3, step: 0.1, default: def, hint: 'Ujemny w lewo, dodatni w prawo',
});
const opacity = (def = 0.9): Field => ({
  key: 'opacity', label: 'Krycie', type: 'range', min: 0.1, max: 1, step: 0.05, default: def,
});
const area: Field = {
  key: 'area', label: 'Obszar', type: 'select', default: 'full',
  options: [
    { value: 'full', label: 'Cały ekran' },
    { value: 'left', label: 'Lewa połowa' },
    { value: 'right', label: 'Prawa połowa' },
    { value: 'edges', label: 'Tylko boki' },
  ],
};

const HOLIDAY_OPTIONS = [
  { value: 'xmas', label: '🎄 Boże Narodzenie' },
  { value: 'winter', label: '❄️ Zima' },
  { value: 'newyear', label: '🥂 Sylwester' },
  { value: 'valentine', label: '💘 Walentynki' },
  { value: 'easter', label: '🐣 Wielkanoc' },
  { value: 'halloween', label: '🎃 Halloween' },
  { value: 'independence', label: '🇵🇱 11 Listopada' },
  { value: 'birthday', label: '🎂 Urodziny' },
];

const PHOTO_LABELS: Record<string, string> = {
  cozy: 'Pokój nocą', city: 'Miasto neon', winter: 'Zimowy las', xmas: 'Święta', halloween: 'Halloween',
  nebula: 'Mgławica', sunset: 'Zachód anime', abstract: 'Abstrakcja 3D', sakura: 'Sakura nocą', beach: 'Plaża',
  'xmas-village': 'Święta: zimowe miasteczko', 'xmas-cabin': 'Święta: chatka z kominkiem', 'xmas-bokeh': 'Święta: lampki choinki',
  'winter-lake': 'Zima: zamarznięte jezioro', 'winter-street': 'Zima: śnieżna ulica', 'winter-pines': 'Zima: las nocą',
  'ny-fireworks': 'Sylwester: fajerwerki nad miastem', 'ny-party': 'Sylwester: szampan', 'ny-gold': 'Sylwester: złote konfetti',
  'val-roses': 'Walentynki: róże i świece', 'val-hearts': 'Walentynki: serduszka', 'val-city': 'Walentynki: most o zmierzchu',
  'easter-meadow': 'Wielkanoc: łąka z pisankami', 'easter-table': 'Wielkanoc: śniadanie', 'easter-garden': 'Wielkanoc: kwitnący ogród',
  'hw-mansion': 'Halloween: nawiedzony dwór', 'hw-forest': 'Halloween: las z dyniami', 'hw-witch': 'Halloween: chatka czarownicy',
  'pl-oldtown': '11.11: Stare Miasto', 'pl-flags': '11.11: flagi', 'pl-tatra': '11.11: Tatry o świcie',
  'bday-party': 'Urodziny: impreza', 'bday-cake': 'Urodziny: tort', 'bday-neon': 'Urodziny: neonowy klub',
  'gaming-room': 'Pokój gamingowy', 'space-window': 'Okno statku kosmicznego', 'rainy-cafe': 'Kawiarnia w deszczu',
  'aurora-peaks': 'Zorza nad górami', 'cyber-alley': 'Cyberpunkowa uliczka', underwater: 'Rafa koralowa',
};
const BG_OPTIONS = [
  { value: 'aurora', label: 'Zorza' }, { value: 'synth', label: 'Synthwave' }, { value: 'waves', label: 'Fale' },
  { value: 'space', label: 'Kosmos' }, { value: 'minimal', label: 'Minimal' }, { value: 'mesh', label: 'Gradient' },
  { value: 'rays', label: 'Promienie' }, { value: 'dots', label: 'Kropki' }, { value: 'lava', label: 'Lava' },
  ...PHOTO_IDS.map((id) => ({ value: id, label: PHOTO_LABELS[id] })),
  ...VIDEO_IDS.map((id) => ({ value: id, label: `▶ ${PHOTO_LABELS[id.slice(2)] ?? id}` })),
  { value: 'custom', label: 'Własny obrazek' },
];
const BG_SWATCHES: Record<string, string> = {
  aurora: 'radial-gradient(circle at 20% 30%, #ff5900, transparent 50%), radial-gradient(circle at 80% 40%, #7a5cff, transparent 50%), #07070c',
  synth: 'linear-gradient(#1a0b2e 0 50%, #2b0f3a 50%), radial-gradient(circle at 50% 50%, #ff2d95 0 18%, transparent 19%)',
  waves: 'linear-gradient(transparent 55%, #3bceac 55% 70%, #7aa2ff 70%), #07070c',
  space: 'radial-gradient(circle at 30% 30%, #7a5cff88, transparent 40%), radial-gradient(#fff 1px, transparent 1.5px) 0 0 / 12px 12px, #05050a',
  minimal: 'radial-gradient(circle, #ff590033, #07070c 60%)',
  mesh: 'radial-gradient(at 20% 20%, #ff5900, transparent 50%), radial-gradient(at 80% 30%, #ff2d6f, transparent 50%), radial-gradient(at 40% 90%, #7a5cff, transparent 55%), #07070c',
  rays: 'repeating-conic-gradient(#ff2d6f33 0 8deg, transparent 8deg 22deg), #12060f',
  dots: 'radial-gradient(#ff8a3d 1px, transparent 1.6px) 0 0 / 8px 8px, #0a0a12',
  lava: 'radial-gradient(circle at 30% 70%, #ff5900, transparent 30%), radial-gradient(circle at 70% 30%, #ff2d6f, transparent 30%), #07070c',
  ...Object.fromEntries(PHOTO_IDS.map((id) => [id, `url(/bg/${id}-thumb.webp) center / cover`])),
  // A play badge in the corner marks the moving ones.
  ...Object.fromEntries(VIDEO_IDS.map((id) => [id, `radial-gradient(circle at 86% 22%, #ff5900 0 11%, transparent 12%), url(/bg/${id.slice(2)}-thumb.webp) center / cover`])),
  custom: 'repeating-linear-gradient(45deg, #222 0 6px, #2b2b2e 6px 12px)',
};

// Shared knobs of "Ramka Pro" and "Kamerka + FACEIT".
const proFields = (d: { colors: string[]; shape?: string }): Field[] => [
  { group: 'Kształt', key: 'shape', label: 'Kształt', type: 'select', default: d.shape ?? 'rounded', options: [
    { value: 'rounded', label: 'Zaokrąglony' }, { value: 'rect', label: 'Prostokąt' }, { value: 'pill', label: 'Pigułka' }, { value: 'circle', label: 'Koło' },
  ] },
  { group: 'Kształt', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 120, step: 1, default: 22, unit: 'px', when: { key: 'shape', is: ['rounded'] } },
  { group: 'Kształt', key: 'inset', label: 'Margines', type: 'range', min: 0, max: 80, step: 1, default: 16, unit: 'px' },
  { group: 'Kształt', key: 'mask', label: 'Zasłoń tło wokół kształtu', type: 'toggle', default: false, hint: 'Przydatne przy okrągłej ramce: zakrywa rogi kamerki' },
  { group: 'Kształt', key: 'outsideColor', label: 'Kolor wokół', type: 'color', default: '#0b0b0c', when: { key: 'mask', is: [true] } },
  { group: 'Obramowanie', key: 'border', label: 'Styl obramowania', type: 'select', default: 'gradient', options: [
    { value: 'gradient', label: 'Gradient' }, { value: 'solid', label: 'Pełne' }, { value: 'double', label: 'Podwójne' },
    { value: 'dashed', label: 'Przerywane' }, { value: 'glass', label: 'Szkło' }, { value: 'none', label: 'Brak' },
  ] },
  { group: 'Obramowanie', key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: d.colors, when: { key: 'border', is: ['gradient', 'solid', 'double', 'dashed'] } },
  { group: 'Obramowanie', key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 30, step: 1, default: 6, unit: 'px', when: { key: 'border', is: ['gradient', 'solid', 'double', 'dashed', 'glass'] } },
  { group: 'Obramowanie', key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 50, step: 1, default: 14, unit: 'px', when: { key: 'border', is: ['gradient', 'solid', 'double', 'dashed'] } },
  { group: 'Obramowanie', key: 'shadow', label: 'Cień pod ramką', type: 'toggle', default: true },
  { group: 'Animacja', key: 'anim', label: 'Animacja', type: 'select', default: 'spin', options: [
    { value: 'none', label: 'Brak' }, { value: 'spin', label: 'Obrót gradientu' }, { value: 'pulse', label: 'Pulsowanie' },
    { value: 'breathe', label: 'Oddech' }, { value: 'hue', label: 'Tęcza' },
  ] },
  { group: 'Animacja', key: 'speed', label: 'Prędkość', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1, unit: '×', when: { key: 'anim', is: ['spin', 'pulse', 'breathe', 'hue'] } },
  { group: 'Akcenty', key: 'accent', label: 'Akcenty w rogach', type: 'select', default: 'none', options: [
    { value: 'none', label: 'Brak' }, { value: 'corners', label: 'Narożniki' }, { value: 'dots', label: 'Kropki' }, { value: 'tape', label: 'Taśma' },
  ] },
  { group: 'Akcenty', key: 'accentSize', label: 'Wielkość akcentów', type: 'range', min: 10, max: 70, step: 1, default: 28, unit: 'px', when: { key: 'accent', is: ['corners', 'dots', 'tape'] } },
];

// Full-screen webcam frame: a little thicker and rounder than on a 640×360 source.
const FULLCAM_DEFAULTS: Record<string, number> = { inset: 24, thickness: 8, radius: 28 };

// Versions of a holiday frame. Picture versions only show up once their file exists (optionFilter).
const FRAME_VARIANTS = [
  { value: 'anim', label: 'Animowana' },
  { value: 'real', label: 'Realistyczna' },
  { value: 'real2', label: 'Realistyczna: narożniki' },
  { value: 'real3', label: 'Realistyczna: girlanda' },
  { value: 'real4', label: 'Realistyczna: złota' },
  { value: 'real5', label: 'Realistyczna: nocna magia' },
  { value: '3d', label: '3D' },
  { value: 'cartoon', label: 'Kreskówka' },
  { value: 'neon', label: 'Neon' },
];
const PHOTO_VARIANTS = ['real', 'real2', 'real3', 'real4', 'real5'];

// Holiday layer for the camera scenes (HolidayLayer): same art as "Ramki świąteczne".
const holidayFields = (): Field[] => [
  { group: 'Święta', key: 'holiday', label: 'Świąteczna oprawa', type: 'select', default: 'none', options: [{ value: 'none', label: 'Brak' }, ...HOLIDAY_OPTIONS] },
  { group: 'Święta', key: 'holidayVariant', label: 'Wersja ramki', type: 'select', default: 'real', when: { key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) },
    optionFilter: (p) => (v) => v === 'anim' || Boolean(FRAME_URLS[`${p.holiday}-${v}`]), options: [
    ...FRAME_VARIANTS,
  ] },
  { group: 'Święta', key: 'holidayLabelOn', label: 'Pokaż napis', type: 'toggle', default: true, when: { key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) } },
  { group: 'Święta', key: 'holidayLabel', label: 'Napis', type: 'text', default: 'auto', maxLength: 40, hint: '"auto" wstawia napis pasujący do okazji', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayLabelOn', is: [true] }] },
  { group: 'Święta', key: 'holidayLabelSize', label: 'Wielkość napisu', type: 'range', min: 12, max: 60, step: 1, default: 22, unit: 'px', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayLabelOn', is: [true] }] },
  { group: 'Święta', key: 'holidayLabelPos', label: 'Pozycja napisu', type: 'select', default: 'top', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayLabelOn', is: [true] }], options: [
    { value: 'bottom', label: 'Na dole' }, { value: 'top', label: 'Na górze' },
  ] },
  { group: 'Święta', key: 'holidayDeco', label: 'Dekoracje w rogach', type: 'toggle', default: true, when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayVariant', is: ['anim', '3d', 'cartoon'] }] },
  { group: 'Święta', key: 'holidayDecoSize', label: 'Wielkość dekoracji', type: 'range', min: 20, max: 140, step: 2, default: 64, unit: 'px', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayDeco', is: [true] }, { key: 'holidayVariant', is: ['anim', '3d', 'cartoon'] }] },
  { group: 'Święta', key: 'holidayGarland', label: 'Girlanda / lampki', type: 'toggle', default: true, when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayVariant', is: ['anim'] }] },
  { group: 'Święta', key: 'holidayParticles', label: 'Efekt (śnieg, serca...)', type: 'toggle', default: true, when: { key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) } },
  { group: 'Święta', key: 'holidayAmount', label: 'Ilość efektu', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1.4, unit: '×', when: [{ key: 'holiday', is: HOLIDAY_OPTIONS.map((o) => o.value) }, { key: 'holidayParticles', is: [true] }] },
];

type SceneDefaults = {
  title: string; subtitle: string; timer: string; timerLabel: string; doneText: string;
  bg: string; colors: string[]; effect: string; titleAnim: string; next?: string;
};

// Thumbnail of a screen layout: blocks as [x, y, w, h, colour] in % of the frame.
const layoutThumb = (blocks: [number, number, number, number, string][]) =>
  blocks.map(([x, y, w, h, c]) => `linear-gradient(${c}, ${c}) ${w >= 100 ? 0 : +(x / (100 - w) * 100).toFixed(1)}% ${h >= 100 ? 0 : +(y / (100 - h) * 100).toFixed(1)}% / ${w}% ${h}% no-repeat`).join(', ') + ', #15151a';
const T = '#e8e8ee', K = '#ff5900', S = '#5b5b66', P = 'rgba(255, 255, 255, 0.16)';
const SCREEN_LAYOUTS: Record<string, { label: string; thumb: string }> = {
  center: { label: 'Środek', thumb: layoutThumb([[25, 32, 50, 10, T], [38, 50, 24, 9, K], [30, 88, 40, 5, S]]) },
  left: { label: 'Do lewej', thumb: layoutThumb([[8, 34, 40, 10, T], [8, 50, 20, 9, K], [30, 88, 40, 5, S]]) },
  right: { label: 'Do prawej', thumb: layoutThumb([[52, 34, 40, 10, T], [72, 50, 20, 9, K], [30, 88, 40, 5, S]]) },
  lower: { label: 'Pasek dolny', thumb: layoutThumb([[6, 58, 44, 10, T], [6, 72, 18, 8, K], [30, 90, 40, 5, S]]) },
  top: { label: 'Na górze', thumb: layoutThumb([[25, 10, 50, 10, T], [38, 26, 24, 9, K], [30, 88, 40, 5, S]]) },
  split: { label: 'Tytuł i licznik obok', thumb: layoutThumb([[8, 38, 44, 12, T], [60, 32, 30, 24, K], [30, 88, 40, 5, S]]) },
  card: { label: 'Karta', thumb: layoutThumb([[20, 20, 60, 58, P], [28, 32, 44, 10, T], [38, 50, 24, 9, K], [30, 88, 40, 5, S]]) },
  banner: { label: 'Baner przez ekran', thumb: layoutThumb([[0, 38, 100, 24, P], [6, 44, 46, 12, T], [68, 44, 24, 12, K], [30, 88, 40, 5, S]]) },
  timer: { label: 'Wielki licznik', thumb: layoutThumb([[34, 20, 32, 7, T], [22, 36, 56, 26, K], [30, 88, 40, 5, S]]) },
  corner: { label: 'Róg ekranu', thumb: layoutThumb([[56, 64, 38, 8, T], [74, 76, 20, 7, K], [30, 90, 40, 5, S]]) },
};

const sceneFields = (d: SceneDefaults, ending = false): Field[] => [
  // ---- layout ----
  { group: 'Układ', key: 'layout', label: 'Układ ekranu', type: 'select', default: 'center',
    options: Object.entries(SCREEN_LAYOUTS).map(([value, l]) => ({ value, label: l.label })),
    swatches: Object.fromEntries(Object.entries(SCREEN_LAYOUTS).map(([value, l]) => [value, l.thumb])) },
  // ---- texts ----
  { group: 'Teksty', key: 'showTitle', label: 'Pokaż tytuł', type: 'toggle', default: true },
  { group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: d.title, maxLength: 40, when: { key: 'showTitle', is: [true] } },
  { group: 'Teksty', key: 'showSubtitle', label: 'Pokaż podtytuł', type: 'toggle', default: true },
  { group: 'Teksty', key: 'subtitle', i18n: true, label: 'Podtytuł', type: 'text', default: d.subtitle, maxLength: 90, when: { key: 'showSubtitle', is: [true] } },
  { group: 'Teksty', key: 'showKicker', label: 'Pokaż znaczek nad tytułem', type: 'toggle', default: true },
  { group: 'Teksty', key: 'kicker', label: 'Znaczek nad tytułem', type: 'text', default: 'skullboypl', maxLength: 40, hint: 'Nick albo nazwa kanału', when: { key: 'showKicker', is: [true] } },
  ...(ending ? [{ group: 'Teksty', key: 'showNext', label: 'Pokaż następny stream', type: 'toggle', default: true } as Field] : []),
  ...(ending ? [{ group: 'Teksty', when: { key: 'showNext', is: [true] }, key: 'next', i18n: true, label: 'Następny stream', type: 'text', default: d.next ?? '', maxLength: 80, placeholder: 'np. Piątek, 20:00' } as Field] : []),

  // ---- countdown ----
  { group: 'Odliczanie', key: 'timer', label: 'Licznik', type: 'select', default: d.timer, options: [
    { value: 'off', label: 'Brak' }, { value: 'countdown', label: 'Minuty' }, { value: 'clock', label: 'Do godziny' },
  ] },
  { group: 'Odliczanie', key: 'minutes', label: 'Ile minut', type: 'range', min: 1, max: 120, step: 1, default: 5, unit: ' min', when: { key: 'timer', is: ['countdown'] }, hint: 'Liczone od chwili, gdy OBS załaduje źródło' },
  { group: 'Odliczanie', key: 'at', label: 'Godzina startu', type: 'text', default: '20:00', maxLength: 5, placeholder: 'HH:MM', when: { key: 'timer', is: ['clock'] } },
  { group: 'Odliczanie', key: 'showTimerLabel', label: 'Pokaż napis nad licznikiem', type: 'toggle', default: true, when: { key: 'timer', is: ['countdown', 'clock'] } },
  { group: 'Odliczanie', key: 'timerLabel', i18n: true, label: 'Napis nad licznikiem', type: 'text', default: d.timerLabel, maxLength: 30, when: [{ key: 'timer', is: ['countdown', 'clock'] }, { key: 'showTimerLabel', is: [true] }] },
  { group: 'Odliczanie', key: 'doneText', i18n: true, label: 'Napis po odliczeniu', type: 'text', default: d.doneText, maxLength: 30, when: { key: 'timer', is: ['countdown', 'clock'] } },
  { group: 'Odliczanie', key: 'progress', label: 'Pasek postępu', type: 'toggle', default: true, when: { key: 'timer', is: ['countdown', 'clock'] } },

  // ---- socials ----
  { group: 'Sociale', key: 'showSocials', label: 'Pokaż sociale', type: 'toggle', default: true },
  { group: 'Sociale', when: { key: 'showSocials', is: [true] }, key: 'socials', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.skullmedia.pl | youtube.com/@skullboypl', maxLength: 300, hint: 'Pokażą się na dole ekranu z ikonami' },

  // ---- chat ----
  { group: 'Czat', key: 'chat', label: 'Miejsce na czat', type: 'toggle', default: false, hint: 'Zostawia ramkę, na którą kładziesz źródło czatu w OBS' },
  { group: 'Czat', key: 'chatSide', label: 'Miejsce czatu', type: 'select', default: 'right', when: { key: 'chat', is: [true] }, options: [
    { value: 'right', label: 'Prawa, cała wysokość' }, { value: 'left', label: 'Lewa, cała wysokość' },
    { value: 'right-top', label: 'Prawa, góra' }, { value: 'right-bottom', label: 'Prawa, dół' },
    { value: 'left-top', label: 'Lewa, góra' }, { value: 'left-bottom', label: 'Lewa, dół' },
    { value: 'bottom', label: 'Pas na dole' },
  ] },
  { group: 'Czat', key: 'chatWidth', label: 'Szerokość', type: 'range', min: 18, max: 45, step: 1, default: 26, unit: '%', when: [{ key: 'chat', is: [true] }, { key: 'chatSide', is: ['right', 'left', 'right-top', 'right-bottom', 'left-top', 'left-bottom'] }] },
  { group: 'Czat', key: 'chatStyle', label: 'Wygląd ramki', type: 'select', default: 'glass', when: { key: 'chat', is: [true] }, options: [
    { value: 'glass', label: 'Szkło' }, { value: 'outline', label: 'Obramowanie' }, { value: 'cutout', label: 'Przezroczysta dziura' },
  ] },
  { group: 'Czat', key: 'showChatTitle', label: 'Pokaż nagłówek czatu', type: 'toggle', default: true, when: { key: 'chat', is: [true] } },
  { group: 'Czat', key: 'chatTitle', i18n: true, label: 'Nagłówek', type: 'text', default: 'CZAT', maxLength: 30, when: [{ key: 'chat', is: [true] }, { key: 'showChatTitle', is: [true] }] },

  // ---- look ----
  { group: 'Tło', key: 'bg', label: 'Wybierz tło', type: 'select', default: d.bg, options: BG_OPTIONS, swatches: BG_SWATCHES },
  { group: 'Tło', key: 'bgImage', label: 'Adres obrazka', type: 'text', default: '', maxLength: 300, placeholder: 'https://...jpg', when: { key: 'bg', is: ['custom'] }, hint: 'Link do własnego obrazka (jpg, png, webp, gif)' },
  { group: 'Tło', key: 'bgMotion', label: 'Ruch obrazka', type: 'select', default: 'zoom', when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] }, options: [
    { value: 'zoom', label: 'Powolny zoom' }, { value: 'pan', label: 'Przesuw' }, { value: 'still', label: 'Bez ruchu' },
  ] },
  { group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, ...VIDEO_IDS, 'custom'] }, hint: 'Ciemniejsze tło = czytelniejszy tytuł' },
  { group: 'Tło', key: 'bgBlur', label: 'Rozmycie wideo', type: 'range', min: 0, max: 20, step: 1, default: 0, unit: 'px', when: { key: 'bg', is: VIDEO_IDS } },
  { group: 'Tło', key: 'bgSpeed', label: 'Prędkość wideo', type: 'range', min: 0.25, max: 2, step: 0.05, default: 1, unit: '×', when: { key: 'bg', is: VIDEO_IDS } },
  { group: 'Tło', key: 'bgTint', label: 'Zabarw kolorami motywu', type: 'toggle', default: false, when: { key: 'bg', is: [...PHOTO_IDS, ...VIDEO_IDS, 'custom'] } },
  { group: 'Wygląd', key: 'colors', label: 'Kolory motywu', type: 'colors', max: 3, default: d.colors },
  { group: 'Wygląd', key: 'base', label: 'Kolor bazowy tła', type: 'color', default: '#07070c' },
  { group: 'Wygląd', key: 'textColor', label: 'Kolor tekstu', type: 'color', default: '#ffffff' },
  { group: 'Wygląd', key: 'titleAnim', label: 'Animacja tytułu', type: 'select', default: d.titleAnim, options: [
    { value: 'rise', label: 'Wjazd' }, { value: 'wave', label: 'Fala' }, { value: 'pop', label: 'Pop' },
    { value: 'neon', label: 'Neon' }, { value: 'glitch', label: 'Glitch' },
  ] },
  { group: 'Wygląd', key: 'font', label: 'Czcionka tytułu', type: 'select', default: 'poppins', options: [
    { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' },
    { value: 'orbitron', label: 'Orbitron' }, { value: 'pacifico', label: 'Pacifico' }, { value: 'dm', label: 'DM Sans' },
  ] },
  { group: 'Wygląd', key: 'titleSize', label: 'Wielkość tytułu', type: 'range', min: 0.5, max: 1.6, step: 0.05, default: 1, unit: '×' },

  // ---- extras ----
  { group: 'Dodatki', key: 'effect', label: 'Efekt na wierzchu', type: 'select', default: d.effect, options: [
    { value: 'none', label: 'Brak' }, { value: 'stars', label: 'Gwiazdy' }, { value: 'warp', label: 'Warp' },
    { value: 'snow', label: 'Śnieg' }, { value: 'fireflies', label: 'Świetliki' }, { value: 'confetti', label: 'Konfetti' },
    { value: 'petals', label: 'Płatki' }, { value: 'emoji', label: 'Emoji' }, { value: 'fireworks', label: 'Fajerwerki' },
    { value: 'embers', label: 'Iskry' }, { value: 'bubbles', label: 'Bańki' }, { value: 'bokeh', label: 'Bokeh' }, { value: 'sparkles', label: 'Błyski' }, { value: 'balloons', label: 'Balony' }, { value: 'meteors', label: 'Spadające gwiazdy' }, { value: 'digital', label: 'Cyfrowy deszcz' },
  ] },
  { group: 'Dodatki', key: 'bars', label: 'Animowany equalizer', type: 'toggle', default: !ending },
  { group: 'Dodatki', key: 'vignette', label: 'Winieta', type: 'toggle', default: true },
];

const ALL_OVERLAYS: OverlayDef[] = [
  {
    id: 'starting', name: 'Zaraz startujemy', icon: '⏳', category: 'scene', size: FULL_HD,
    description: 'Ekran przed streamem z odliczaniem, socialami i animowanym tłem.',
    fields: sceneFields({
      title: 'ZARAZ STARTUJEMY', subtitle: 'Rozgość się, nalej coś do picia i daj znać na czacie, że jesteś',
      timer: 'countdown', timerLabel: 'Start za', doneText: 'Już startujemy!', bg: 'aurora',
      colors: ['#ff5900', '#ff2d6f', '#7a5cff'], effect: 'stars', titleAnim: 'rise',
    }),
  },
  {
    id: 'brb', name: 'Przerwa / BRB', icon: '☕', category: 'scene', size: FULL_HD,
    description: 'Ekran przerwy z licznikiem powrotu i neonowym tytułem.',
    fields: sceneFields({
      title: 'ZARAZ WRACAM', subtitle: 'Krótka przerwa, nie uciekaj',
      timer: 'countdown', timerLabel: 'Wracam za', doneText: 'Już jestem!', bg: 'synth',
      colors: ['#ff2d95', '#ffb347', '#3a1c71'], effect: 'none', titleAnim: 'neon',
    }),
  },
  {
    id: 'ending', name: 'Koniec streama', icon: '👋', category: 'scene', size: FULL_HD,
    description: 'Ekran końcowy z podziękowaniem, terminem następnego streama i socialami.',
    fields: sceneFields({
      title: 'DZIĘKI ZA DZIŚ!', subtitle: 'Do zobaczenia na następnym streamie',
      timer: 'off', timerLabel: 'Koniec za', doneText: 'Pa pa!', bg: 'waves',
      colors: ['#3bceac', '#7aa2ff', '#ff5900'], effect: 'fireflies', titleAnim: 'wave', next: 'Następny stream: piątek, 20:00',
    }, true),
  },
  {
    id: 'snow', name: 'Śnieg', icon: '❄️', category: 'screen', size: FULL_HD,
    description: 'Miękko padające płatki z lekkim kołysaniem.',
    fields: [
      density(180), speed(1), size(1), wind(0.3), opacity(0.85),
      { key: 'color', label: 'Kolor', type: 'color', default: '#ffffff' },
      { key: 'blur', label: 'Rozmycie głębi', type: 'toggle', default: true, when: { key: 'flakes', is: ['dots', 'mix'] }, hint: 'Bliższe płatki są większe i bardziej rozmyte' },
      { key: 'flakes', label: 'Kształt', type: 'select', default: 'dots', options: [
        { value: 'dots', label: 'Kropki' }, { value: 'crystals', label: 'Kryształki ❄' }, { value: 'mix', label: 'Mieszane' },
      ] },
      area,
    ],
  },
  {
    id: 'rain', name: 'Deszcz', icon: '🌧️', category: 'screen', size: FULL_HD,
    description: 'Ukośne krople, od mżawki po ulewę.',
    fields: [
      density(260, 900), speed(1.2), size(1), wind(0.8), opacity(0.45),
      { key: 'color', label: 'Kolor', type: 'color', default: '#a9c8ff' },
      { key: 'splash', label: 'Rozbryzgi na dole', type: 'toggle', default: true },
      area,
    ],
  },
  {
    id: 'confetti', name: 'Konfetti', icon: '🎉', category: 'screen', size: FULL_HD,
    description: 'Wirujące paski papieru, ciągle albo wybuchem co kilka sekund.',
    fields: [
      density(140), speed(1), size(1), wind(0), opacity(1),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 6, default: ['#ff5900', '#ffd23f', '#3bceac', '#7aa2ff', '#f26b8a'] },
      { key: 'mode', label: 'Tryb', type: 'select', default: 'rain', options: [
        { value: 'rain', label: 'Ciągły deszcz' }, { value: 'burst', label: 'Wybuch z dołu' },
      ] },
      { key: 'every', label: 'Wybuch co', type: 'range', min: 2, max: 60, step: 1, default: 8, unit: 's', when: { key: 'mode', is: ['burst'] } },
    ],
  },
  {
    id: 'emoji', name: 'Unoszące się emoji', icon: '💜', category: 'screen', size: FULL_HD,
    description: 'Serduszka, gwiazdki albo dowolne emoji płynące w górę.',
    fields: [
      density(40, 200), speed(1), size(1), wind(0), opacity(0.95),
      { key: 'emoji', label: 'Emoji', type: 'text', default: '💜❤️✨', maxLength: 40, hint: 'Wpisz kilka - będą losowane' },
      { key: 'from', label: 'Kierunek', type: 'select', default: 'up', options: [
        { value: 'up', label: 'Z dołu w górę' }, { value: 'down', label: 'Z góry w dół' },
      ] },
      area,
    ],
  },
  {
    id: 'fireflies', name: 'Świetliki', icon: '✨', category: 'screen', size: FULL_HD,
    description: 'Pulsujące, świecące drobinki błądzące po ekranie.',
    fields: [
      density(60, 300), speed(0.8), size(1), opacity(0.9),
      { key: 'color', label: 'Kolor', type: 'color', default: '#ffd36b' },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 3, step: 0.1, default: 1.4, unit: '×' },
      area,
    ],
  },
  {
    id: 'petals', name: 'Płatki / liście', icon: '🌸', category: 'screen', size: FULL_HD,
    description: 'Opadające płatki wiśni albo jesienne liście.',
    fields: [
      density(60, 300), speed(1), size(1), wind(0.6), opacity(0.95),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#ffb7c9', '#ff9fb8', '#ffd1dc'] },
      { key: 'shape', label: 'Kształt', type: 'select', default: 'petal', options: [
        { value: 'petal', label: 'Płatek' }, { value: 'leaf', label: 'Liść' },
      ] },
    ],
  },
  {
    id: 'embers', name: 'Iskry z ogniska', icon: '🔥', category: 'screen', size: FULL_HD,
    description: 'Żarzące się iskry unoszące się z dołu ekranu.',
    fields: [
      density(90, 400), speed(1), size(1), wind(0.2), opacity(0.9),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#ff7a1a', '#ffb347', '#ff3d00'] },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 3, step: 0.1, default: 1, unit: '×' },
      area,
    ],
  },
  {
    id: 'bubbles', name: 'Bańki mydlane', icon: '🫧', category: 'screen', size: FULL_HD,
    description: 'Opalizujące bańki płynące w górę.',
    fields: [
      density(26, 150), speed(0.8), size(1), wind(0), opacity(0.9),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#bfe9ff', '#ffd1f5', '#d9ffe8'] },
      area,
    ],
  },
  {
    id: 'bokeh', name: 'Bokeh', icon: '🔆', category: 'screen', size: FULL_HD,
    description: 'Duże, miękkie krążki światła jak z obiektywu, powoli dryfujące.',
    fields: [
      density(22, 120), speed(0.6), size(1), opacity(0.55),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#ffcf7a', '#ff8fb1', '#8fb8ff'] },
    ],
  },
  {
    id: 'sparkles', name: 'Błyski brokatu', icon: '💫', category: 'screen', size: FULL_HD,
    description: 'Gwiazdki zapalające się i gasnące w losowych miejscach.',
    fields: [
      density(40, 300), speed(1), size(1), opacity(1),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#fff3b0', '#ffffff', '#ffd23f'] },
      area,
    ],
  },
  {
    id: 'balloons', name: 'Balony', icon: '🎈', category: 'screen', size: FULL_HD,
    description: 'Kolorowe balony lecące w górę, na urodziny i świętowanie subów.',
    fields: [
      density(14, 80), speed(0.8), size(1), wind(0), opacity(1),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 6, default: ['#ff5900', '#ffd23f', '#3bceac', '#7aa2ff', '#f26b8a'] },
      area,
    ],
  },
  {
    id: 'meteors', name: 'Spadające gwiazdy', icon: '☄️', category: 'screen', size: FULL_HD,
    description: 'Meteory z jasnym ogonem przecinające niebo co kilka sekund.',
    fields: [
      density(4, 30), speed(1), size(1), opacity(1),
      { key: 'every', label: 'Przerwy między gwiazdami', type: 'range', min: 0.5, max: 15, step: 0.5, default: 3, unit: 's' },
      { key: 'from', label: 'Kierunek', type: 'select', default: 'left', options: [
        { value: 'left', label: 'Z lewej' }, { value: 'right', label: 'Z prawej' },
      ] },
      { key: 'colors', label: 'Kolory', type: 'colors', max: 4, default: ['#bfe3ff', '#ffffff'] },
    ],
  },
  {
    id: 'digital', name: 'Cyfrowy deszcz', icon: '💻', category: 'screen', size: FULL_HD,
    description: 'Spadające kolumny znaków jak w hakerskim terminalu.',
    fields: [
      density(60, 240), speed(1), size(1), opacity(0.8),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 4, default: ['#3bff7a'] },
    ],
  },
  {
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
    { value: 'embers', label: 'Iskry' }, { value: 'bubbles', label: 'Bańki' }, { value: 'bokeh', label: 'Bokeh' }, { value: 'sparkles', label: 'Błyski' }, { value: 'balloons', label: 'Balony' }, { value: 'meteors', label: 'Spadające gwiazdy' }, { value: 'digital', label: 'Cyfrowy deszcz' },
      ] },
      { group: 'Dodatki', key: 'vignette', label: 'Winieta', type: 'toggle', default: true },
      { group: 'Dodatki', key: 'grain', label: 'Ziarno filmowe', type: 'toggle', default: false },
    ],
  },
  {
    id: 'fullcam', name: 'Pełnoekranowa kamera', icon: '📹', category: 'camscene', size: FULL_HD,
    description: 'Kamera na cały ekran, a nad nią tylko warstwa: ramka, tytuł z zegarem, nick, sociale, staty FACEIT i efekty.',
    fields: [
      ...proFields({ colors: ['#ff5900', '#ff2d6f', '#7a5cff'] }).map((f) => ({ ...f, ...(FULLCAM_DEFAULTS[f.key] !== undefined ? { default: FULLCAM_DEFAULTS[f.key] } : {}) }) as Field),
      { group: 'Teksty', key: 'showTitle', label: 'Pokaż tytuł', type: 'toggle', default: true },
      { group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: 'NA ŻYWO', maxLength: 50, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'live', label: 'Kropka LIVE', type: 'toggle', default: true, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'showClock', label: 'Pokaż zegar', type: 'toggle', default: true, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [
        { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' }, { value: 'dm', label: 'DM Sans' },
      ] },
      { group: 'Teksty', key: 'showName', label: 'Pokaż podpis na kamerce', type: 'toggle', default: true },
      { group: 'Teksty', key: 'name', label: 'Nick', type: 'text', default: 'skullboypl', maxLength: 40, when: { key: 'showName', is: [true] } },
      { group: 'Teksty', key: 'namePos', label: 'Róg podpisu na kamerce', type: 'select', default: 'bl', when: { key: 'showName', is: [true] }, options: [
        { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' }, { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' },
      ] },
      { group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: { key: 'showName', is: [true] } },
      { group: 'Teksty', key: 'sub', label: 'Podpis pod spodem', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 60, when: [{ key: 'showName', is: [true] }, { key: 'showSub', is: [true] }] },
      { group: 'Teksty', key: 'textColor', label: 'Kolor tekstu', type: 'color', default: '#ffffff' },
      { group: 'Sociale', key: 'showSocials', label: 'Pokaż sociale', type: 'toggle', default: true },
      { group: 'Sociale', when: { key: 'showSocials', is: [true] }, key: 'socials', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.skullmedia.pl', maxLength: 300 },
      { group: 'Sociale', key: 'socialsAlign', label: 'Wyrównanie', type: 'select', default: 'right', when: { key: 'showSocials', is: [true] }, optionFilter: (p) => (v) => p.showName === false || !(v === 'left' && (p.namePos ?? 'bl') === 'bl') && !(v === 'right' && p.namePos === 'br'), options: [
        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
      ] },
      ...holidayFields(),
      { group: 'FACEIT', key: 'showFaceit', label: 'Pokaż staty FACEIT na kamerce', type: 'toggle', default: false, hint: 'Po włączeniu wpisz swój nick FACEIT poniżej' },
      { group: 'FACEIT', key: 'player', label: 'Nick FACEIT', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'showFaceit', is: [true] }, hint: 'Nick z faceit.com, player_id albo link z faceitbanner.vxh.pl' },
      { group: 'FACEIT', key: 'look', label: 'Wygląd', type: 'select', default: 'card', when: { key: 'showFaceit', is: [true] }, options: [
        { value: 'card', label: 'Karta' }, { value: 'pill', label: 'Pigułka' }, { value: 'bar', label: 'Pasek' },
        { value: 'minimal', label: 'Minimal' }, { value: 'neon', label: 'Neon' }, { value: 'hud', label: 'HUD' },
      ] },
      { group: 'FACEIT', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'tr', when: { key: 'showFaceit', is: [true] }, optionFilter: (p) => (v) => (p.showName === false || v !== (p.namePos ?? 'bl')) && (p.showTitle === false || v !== 'tl'), options: [
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' },
      ] },
      { group: 'FACEIT', key: 'statsScale', label: 'Wielkość', type: 'range', min: 0.6, max: 3, step: 0.05, default: 1.6, unit: '×', when: { key: 'showFaceit', is: [true] } },
      { group: 'Efekty', key: 'effect', label: 'Efekt nad kamerą', type: 'select', default: 'none', options: [
        { value: 'none', label: 'Brak' }, { value: 'snow', label: 'Śnieg' }, { value: 'stars', label: 'Gwiazdy' }, { value: 'fireflies', label: 'Świetliki' },
        { value: 'confetti', label: 'Konfetti' }, { value: 'petals', label: 'Płatki' }, { value: 'fireworks', label: 'Fajerwerki' },
    { value: 'embers', label: 'Iskry' }, { value: 'bubbles', label: 'Bańki' }, { value: 'bokeh', label: 'Bokeh' }, { value: 'sparkles', label: 'Błyski' }, { value: 'balloons', label: 'Balony' }, { value: 'meteors', label: 'Spadające gwiazdy' }, { value: 'digital', label: 'Cyfrowy deszcz' },
      ] },
      { group: 'Efekty', key: 'vignette', label: 'Winieta przy krawędziach', type: 'toggle', default: false },
      { group: 'Efekty', key: 'vignetteStrength', label: 'Siła winiety', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.6, when: { key: 'vignette', is: [true] } },
    ],
  },
  {
    id: 'camscene', name: 'Kamerka fullscreen', icon: '🎥', category: 'camscene', size: FULL_HD,
    description: 'Cała scena 1920×1080 z miejscem na kamerkę, grę i czat: różne układy, tła, ramki, napisy i staty FACEIT.',
    fields: [
      { group: 'Układ', key: 'layout', label: 'Układ sceny', type: 'select', default: 'screen-cam', swatches: { 'screen-cam': 'linear-gradient(#4f7cff, #4f7cff) 4% 20% / 64% 62% no-repeat, linear-gradient(#ff5900, #ff5900) 96% 20% / 26% 28% no-repeat, linear-gradient(#5b5b66, #5b5b66) 96% 86% / 26% 50% no-repeat, #15151a', 'cam-full': 'linear-gradient(#ff5900, #ff5900) 50% 50% / 92% 72% no-repeat, #15151a', 'cam-screen': 'linear-gradient(#ff5900, #ff5900) 4% 50% / 40% 72% no-repeat, linear-gradient(#4f7cff, #4f7cff) 96% 30% / 50% 40% no-repeat, #15151a', 'cam-center': 'linear-gradient(#ff5900, #ff5900) 50% 50% / 62% 62% no-repeat, #15151a', 'screen-corner': 'linear-gradient(#4f7cff, #4f7cff) 0% 0% / 100% 100% no-repeat, linear-gradient(#ff5900, #ff5900) 4% 86% / 30% 28% no-repeat, #15151a', 'split': 'linear-gradient(#ff5900, #ff5900) 4% 50% / 45% 72% no-repeat, linear-gradient(#4f7cff, #4f7cff) 96% 50% / 45% 72% no-repeat, #15151a', 'duo': 'linear-gradient(#ff5900, #ff5900) 4% 50% / 45% 60% no-repeat, linear-gradient(#ff5900, #ff5900) 96% 50% / 45% 60% no-repeat, #15151a', 'squad': 'linear-gradient(#ff5900, #ff5900) 4% 18% / 45% 40% no-repeat, linear-gradient(#ff5900, #ff5900) 96% 18% / 45% 40% no-repeat, linear-gradient(#ff5900, #ff5900) 4% 86% / 45% 40% no-repeat, linear-gradient(#ff5900, #ff5900) 96% 86% / 45% 40% no-repeat, #15151a', 'game-duo': 'linear-gradient(#4f7cff, #4f7cff) 4% 25% / 68% 62% no-repeat, linear-gradient(#ff5900, #ff5900) 96% 18% / 25% 40% no-repeat, linear-gradient(#ff5900, #ff5900) 96% 86% / 25% 40% no-repeat, #15151a', 'vertical': 'linear-gradient(#ff5900, #ff5900) 4% 50% / 22% 80% no-repeat, linear-gradient(#4f7cff, #4f7cff) 70% 25% / 60% 55% no-repeat, linear-gradient(#5b5b66, #5b5b66) 96% 50% / 14% 80% no-repeat, #15151a', 'theater': 'linear-gradient(#4f7cff, #4f7cff) 25% 20% / 58% 58% no-repeat, linear-gradient(#ff5900, #ff5900) 13% 87% / 21% 21% no-repeat, linear-gradient(#5b5b66, #5b5b66) 87% 45% / 20% 81% no-repeat, #15151a', 'screen-top': 'linear-gradient(#4f7cff, #4f7cff) 50% 12% / 62% 64% no-repeat, linear-gradient(#ff5900, #ff5900) 4% 94% / 28% 26% no-repeat, linear-gradient(#5b5b66, #5b5b66) 96% 94% / 66% 26% no-repeat, #15151a' }, options: [
        { value: 'screen-cam', label: 'Gra + kamerka + czat' }, { value: 'cam-full', label: 'Kamera na cały ekran' },
        { value: 'cam-screen', label: 'Kamerka + ekran' }, { value: 'cam-center', label: 'Kamerka w centrum' },
        { value: 'screen-corner', label: 'Gra z kamerką w rogu' }, { value: 'split', label: 'Pół na pół' },
        { value: 'duo', label: 'Duet: 2 kamerki' }, { value: 'squad', label: 'Ekipa: 4 kamerki' }, { value: 'game-duo', label: 'Gra + 2 kamerki' }, { value: 'vertical', label: 'Pionowa kamerka + gra' }, { value: 'theater', label: 'Kino: gra w centrum' }, { value: 'screen-top', label: 'Gra na górze, kamerka na dole' },
      ] },
      { group: 'Układ', key: 'mirror', label: 'Odwróć strony', type: 'toggle', default: false },
      { group: 'Układ', key: 'chat', label: 'Miejsce na czat', type: 'toggle', default: true, when: { key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center', 'duo', 'squad', 'vertical', 'theater', 'screen-top'] } },
      { group: 'Układ', key: 'camCorner', label: 'Róg kamerki', type: 'select', default: 'bl', when: { key: 'layout', is: ['screen-corner', 'theater'] }, options: [
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' },
      ] },
      { group: 'Układ', key: 'camSize', label: 'Wielkość kamerki', type: 'range', min: 0.6, max: 1.5, step: 0.05, default: 1, unit: '×', when: { key: 'layout', is: ['screen-cam', 'cam-screen', 'cam-center', 'screen-corner', 'game-duo', 'vertical', 'theater', 'screen-top'] } },
      { group: 'Układ', key: 'camShape', label: 'Kształt kamerki', type: 'select', default: 'rect', options: [
        { value: 'rect', label: 'Prostokąt' }, { value: 'circle', label: 'Koło' },
      ] },
      { group: 'Układ', key: 'gap', label: 'Odstępy', type: 'range', min: 0, max: 80, step: 2, default: 24, unit: 'px' },
      { group: 'Układ', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 18, unit: 'px' },
      { group: 'Ramki slotów', key: 'border', label: 'Styl ramek', type: 'select', default: 'gradient', options: [
        { value: 'gradient', label: 'Gradient' }, { value: 'solid', label: 'Pełne' }, { value: 'glow', label: 'Świecące' },
        { value: 'glass', label: 'Szkło' }, { value: 'none', label: 'Brak' },
      ] },
      { group: 'Ramki slotów', key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 20, step: 1, default: 4, unit: 'px', when: { key: 'border', is: ['gradient', 'solid', 'glow', 'glass'] } },
      { group: 'Ramki slotów', key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 40, step: 1, default: 14, unit: 'px', when: { key: 'border', is: ['gradient', 'solid', 'glow'] } },
      { group: 'Ramki slotów', key: 'anim', label: 'Obrót gradientu', type: 'select', default: 'spin', when: { key: 'border', is: ['gradient'] }, options: [
        { value: 'spin', label: 'Tak' }, { value: 'none', label: 'Nie' },
      ] },
      { group: 'Ramki slotów', key: 'speed', label: 'Prędkość obrotu', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1, unit: '×', when: [{ key: 'border', is: ['gradient'] }, { key: 'anim', is: ['spin'] }] },
      { group: 'Ramki slotów', key: 'frameChat', label: 'Ramka wokół czatu', type: 'toggle', default: true, when: [{ key: 'chat', is: [true] }, { key: 'border', is: ['gradient', 'solid', 'glow', 'glass'] }] },
      { group: 'Ramki slotów', key: 'frameScreen', label: 'Ramka wokół ekranu gry', type: 'toggle', default: true, when: { key: 'border', is: ['gradient', 'solid', 'glow', 'glass'] } },
      { group: 'Ramki slotów', key: 'camCorners', label: 'Narożniki na kamerce', type: 'toggle', default: false, hint: 'Akcenty w rogach kamerki w pierwszym kolorze' },
      { group: 'Ramki slotów', key: 'slotShadow', label: 'Cień pod slotami', type: 'toggle', default: true },
      { group: 'Ramki slotów', key: 'showChatTitle', label: 'Pokaż nagłówek czatu', type: 'toggle', default: true, when: { key: 'chat', is: [true] } },
      { group: 'Ramki slotów', key: 'chatTitle', i18n: true, label: 'Nagłówek', type: 'text', default: 'CZAT', maxLength: 30, when: [{ key: 'chat', is: [true] }, { key: 'showChatTitle', is: [true] }] },
      { group: 'Tło', key: 'bg', label: 'Wybierz tło', type: 'select', default: 'aurora', options: BG_OPTIONS, swatches: BG_SWATCHES, when: { key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center', 'split', 'duo', 'squad', 'game-duo', 'vertical', 'theater', 'screen-top'] } },
      { group: 'Tło', key: 'bgImage', label: 'Adres obrazka', type: 'text', default: '', maxLength: 300, placeholder: 'https://...jpg', when: { key: 'bg', is: ['custom'] } },
      { group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, ...VIDEO_IDS, 'custom'] } },
      { group: 'Tło', key: 'colors', label: 'Kolory motywu', type: 'colors', max: 3, default: ['#ff5900', '#ff2d6f', '#7a5cff'] },
      { group: 'Tło', key: 'base', label: 'Kolor bazowy tła', type: 'color', default: '#07070c' },
      { group: 'Tło', key: 'effect', label: 'Efekt na tle', type: 'select', default: 'none', options: [
        { value: 'none', label: 'Brak' }, { value: 'stars', label: 'Gwiazdy' }, { value: 'snow', label: 'Śnieg' }, { value: 'fireflies', label: 'Świetliki' },
        { value: 'confetti', label: 'Konfetti' }, { value: 'petals', label: 'Płatki' },
    { value: 'embers', label: 'Iskry' }, { value: 'bubbles', label: 'Bańki' }, { value: 'bokeh', label: 'Bokeh' }, { value: 'sparkles', label: 'Błyski' }, { value: 'balloons', label: 'Balony' }, { value: 'meteors', label: 'Spadające gwiazdy' }, { value: 'digital', label: 'Cyfrowy deszcz' },
      ] },
      { group: 'Tło', key: 'vignette', label: 'Winieta', type: 'toggle', default: true },
      { group: 'Tło', key: 'bgMotion', label: 'Powolny ruch tła', type: 'toggle', default: false, hint: 'Delikatne przybliżanie i przesuwanie tła' },
      { group: 'Teksty', key: 'showTitle', label: 'Pokaż tytuł', type: 'toggle', default: true },
      { group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: 'NA ŻYWO', maxLength: 50, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'live', label: 'Kropka LIVE', type: 'toggle', default: true, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'showClock', label: 'Pokaż zegar', type: 'toggle', default: true, when: { key: 'showTitle', is: [true] } },
      { group: 'Teksty', key: 'showUptime', label: 'Pokaż czas streamu', type: 'toggle', default: false, when: { key: 'showTitle', is: [true] }, hint: 'Liczy od włączenia źródła w OBS' },
      { group: 'Teksty', key: 'titlePos', label: 'Położenie tytułu', type: 'select', default: 'left', when: { key: 'showTitle', is: [true] }, options: [
        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
      ] },
      { group: 'Teksty', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [
        { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' }, { value: 'dm', label: 'DM Sans' },
      ] },
      { group: 'Teksty', key: 'showName', label: 'Pokaż podpis na kamerce', type: 'toggle', default: true },
      { group: 'Teksty', key: 'name', label: 'Nick', type: 'text', default: 'skullboypl', maxLength: 40, when: { key: 'showName', is: [true] } },
      { group: 'Teksty', key: 'namePos', label: 'Róg podpisu na kamerce', type: 'select', default: 'bl', when: { key: 'showName', is: [true] }, options: [
        { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' }, { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' },
      ] },
      { group: 'Teksty', key: 'nameStyle', label: 'Styl podpisu', type: 'select', default: 'bar', when: { key: 'showName', is: [true] }, options: [
        { value: 'bar', label: 'Belka' }, { value: 'pill', label: 'Pigułka' }, { value: 'tag', label: 'Etykieta w kolorze' }, { value: 'plain', label: 'Sam tekst' },
      ] },
      { group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: { key: 'showName', is: [true] } },
      { group: 'Teksty', key: 'sub', label: 'Podpis pod spodem', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 60, when: [{ key: 'showName', is: [true] }, { key: 'showSub', is: [true] }] },
      { group: 'Teksty', key: 'textColor', label: 'Kolor tekstu', type: 'color', default: '#ffffff' },
      { group: 'Sociale', key: 'showSocials', label: 'Pokaż sociale', type: 'toggle', default: true },
      { group: 'Sociale', when: { key: 'showSocials', is: [true] }, key: 'socials', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.skullmedia.pl | youtube.com/@skullboypl', maxLength: 300 },
      { group: 'Sociale', key: 'socialsAlign', label: 'Wyrównanie', type: 'select', default: 'center', when: { key: 'showSocials', is: [true] }, options: [
        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
      ] },
      ...holidayFields(),
      { group: 'FACEIT', key: 'showFaceit', label: 'Pokaż staty FACEIT na kamerce', type: 'toggle', default: false, hint: 'Po włączeniu wpisz swój nick FACEIT poniżej' },
      { group: 'FACEIT', key: 'player', label: 'Nick FACEIT', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'showFaceit', is: [true] }, hint: 'Nick z faceit.com, player_id albo link z faceitbanner.vxh.pl' },
      { group: 'FACEIT', key: 'look', label: 'Wygląd', type: 'select', default: 'pill', when: { key: 'showFaceit', is: [true] }, options: [
        { value: 'card', label: 'Karta' }, { value: 'pill', label: 'Pigułka' }, { value: 'bar', label: 'Pasek' },
        { value: 'minimal', label: 'Minimal' }, { value: 'neon', label: 'Neon' }, { value: 'hud', label: 'HUD' },
      ] },
      { group: 'FACEIT', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'tr', when: { key: 'showFaceit', is: [true] }, optionFilter: (p) => (v) => p.showName === false || v !== (p.namePos ?? 'bl'), options: [
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' },
      ] },
      { group: 'FACEIT', key: 'statsScale', label: 'Wielkość', type: 'range', min: 0.6, max: 3, step: 0.05, default: 1.4, unit: '×', when: { key: 'showFaceit', is: [true] } },
    ],
  },
  {
    id: 'fireworks', name: 'Fajerwerki', icon: '🎆', category: 'screen', size: FULL_HD,
    description: 'Rakiety z wybuchami, idealne na Sylwestra i suby.',
    fields: [
      { key: 'count', label: 'Rakiet na salwę', type: 'range', min: 1, max: 8, step: 1, default: 2 },
      { key: 'every', label: 'Salwa co', type: 'range', min: 0.5, max: 15, step: 0.5, default: 2.2, unit: 's' },
      size(1), opacity(1),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 6, default: ['#ffd23f', '#ff5900', '#ff2d6f', '#7aa2ff', '#3bceac'] },
      { key: 'shape', label: 'Kształt wybuchu', type: 'select', default: 'mixed', options: [
        { value: 'mixed', label: 'Mieszany' }, { value: 'ring', label: 'Pierścień' }, { value: 'heart', label: 'Serce' },
      ] },
      { key: 'twinkle', label: 'Migotanie iskier', type: 'toggle', default: true },
    ],
  },
  {
    id: 'stars', name: 'Gwiazdy / warp', icon: '🌌', category: 'screen', size: FULL_HD,
    description: 'Migoczące niebo ze spadającymi gwiazdami albo lot w hiperprzestrzeń.',
    fields: [
      { key: 'mode', label: 'Tryb', type: 'select', default: 'twinkle', options: [
        { value: 'twinkle', label: 'Migotanie' }, { value: 'warp', label: 'Warp' },
      ] },
      density(260, 900), speed(1), size(1), opacity(0.9),
      { key: 'color', label: 'Kolor', type: 'color', default: '#ffffff' },
      { key: 'shooting', label: 'Spadające gwiazdy', type: 'toggle', default: true, when: { key: 'mode', is: ['twinkle'] } },
    ],
  },
  {
    id: 'grain', name: 'Ziarno + winieta', icon: '🎞️', category: 'screen', size: FULL_HD,
    description: 'Filmowe ziarno, przyciemnione rogi i opcjonalne linie VHS.',
    fields: [
      { key: 'grain', label: 'Ziarno', type: 'range', min: 0, max: 1, step: 0.05, default: 0.35 },
      { key: 'vignette', label: 'Winieta', type: 'range', min: 0, max: 1, step: 0.05, default: 0.55 },
      { key: 'scanlines', label: 'Linie VHS', type: 'toggle', default: false },
      { key: 'flicker', label: 'Migotanie', type: 'toggle', default: false },
    ],
  },
  {
    id: 'character', name: 'Animowane postacie', icon: '🎅', category: 'character', size: FULL_HD,
    description: 'Mikołaj, elf, bałwan, dynia i inne postacie animowane w pętli, z przezroczystym tłem.',
    fields: [
      { group: 'Postać', key: 'charStyle', label: 'Styl postaci', type: 'select', default: 'all', options: [
        { value: 'all', label: 'Wszystkie' }, { value: 'game', label: 'Gra 3D' }, { value: 'real', label: 'Realistyczne' },
      ].filter((o) => o.value === 'all' || Object.keys(CHARACTERS).some((id) => id.endsWith(`-${o.value}`))) },
      { group: 'Postać', key: 'char', label: 'Postać', type: 'select', default: Object.keys(CHARACTERS)[0] ?? 'santa-game',
        optionFilter: (p) => (v) => !p.charStyle || p.charStyle === 'all' || v.endsWith(`-${p.charStyle}`),
        options: Object.keys(CHARACTERS).map((id) => ({ value: id, label: CHARACTER_LABELS[id] ?? id })),
        swatches: Object.fromEntries(Object.entries(CHARACTERS).map(([id, c]) => [id, `url(${c.poster}) center / contain no-repeat, #1a1a1c`])) },
      { group: 'Postać', key: 'mirror', label: 'Odbicie lustrzane', type: 'toggle', default: false },
      { group: 'Postać', key: 'shadow', label: 'Cień', type: 'toggle', default: true },
      { group: 'Ułożenie', key: 'position', label: 'Pozycja', type: 'select', default: 'br', options: [
        { value: 'bl', label: 'Dół, lewo' }, { value: 'bc', label: 'Dół, środek' }, { value: 'br', label: 'Dół, prawo' },
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' },
      ] },
      { group: 'Ułożenie', key: 'size', label: 'Wielkość', type: 'range', min: 10, max: 100, step: 1, default: 45, unit: '%', hint: 'Procent wysokości źródła' },
      { group: 'Ułożenie', key: 'offset', label: 'Odsunięcie od krawędzi', type: 'range', min: 0, max: 30, step: 0.5, default: 2, unit: '%' },
      { group: 'Pojawianie się', key: 'mode', label: 'Tryb', type: 'select', default: 'loop', options: [
        { value: 'loop', label: 'Zawsze widoczna' }, { value: 'peek', label: 'Wychodzi co jakiś czas' },
      ] },
      { group: 'Pojawianie się', key: 'every', label: 'Co ile', type: 'range', min: 5, max: 300, step: 5, default: 30, unit: 's', when: { key: 'mode', is: ['peek'] } },
      { group: 'Pojawianie się', key: 'stay', label: 'Jak długo zostaje', type: 'range', min: 2, max: 60, step: 1, default: 8, unit: 's', when: { key: 'mode', is: ['peek'] } },
    ],
  },
  {
    id: 'neon', name: 'Neonowa ramka', icon: '🌈', category: 'camera', size: CAM,
    description: 'Obracający się gradient wokół kamerki z poświatą.',
    fields: [
      { key: 'colors', label: 'Kolory gradientu', type: 'colors', max: 5, default: ['#ff5900', '#ffd23f', '#f26b8a', '#7aa2ff'] },
      { key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 30, step: 1, default: 6, unit: 'px' },
      { key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 80, step: 1, default: 18, unit: 'px' },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 60, step: 1, default: 18, unit: 'px' },
      { key: 'speed', label: 'Prędkość obrotu', type: 'range', min: 0, max: 3, step: 0.1, default: 1, unit: '×', hint: '0 zatrzymuje animację' },
      { key: 'inset', label: 'Margines', type: 'range', min: 0, max: 60, step: 1, default: 20, unit: 'px', hint: 'Miejsce na poświatę w źródle OBS' },
    ],
  },
  {
    id: 'corners', name: 'Narożniki HUD', icon: '⌜', category: 'camera', size: CAM,
    description: 'Celownikowe narożniki z opcjonalną linią skanu i napisem REC.',
    fields: [
      { key: 'showCorners', label: 'Pokaż narożniki', type: 'toggle', default: true },
      { key: 'color', label: 'Kolor', type: 'color', default: '#ff5900' },
      { key: 'length', label: 'Długość narożnika', type: 'range', min: 10, max: 200, step: 2, default: 56, unit: 'px' },
      { key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 16, step: 1, default: 4, unit: 'px' },
      { key: 'inset', label: 'Margines', type: 'range', min: 0, max: 60, step: 1, default: 12, unit: 'px' },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 40, step: 1, default: 10, unit: 'px' },
      { key: 'scan', label: 'Linia skanu', type: 'toggle', default: true },
      { key: 'rec', label: 'Kropka REC', type: 'toggle', default: true },
      { key: 'breathe', label: 'Oddychanie narożników', type: 'toggle', default: true },
    ],
  },
  {
    id: 'nametag', name: 'Ramka z podpisem', icon: '🏷️', category: 'camera', size: CAM,
    description: 'Czysta ramka z paskiem na nick, social albo tekst.',
    fields: [
      { group: 'Teksty', key: 'showTag', label: 'Pokaż pasek z napisem', type: 'toggle', default: true },
      { group: 'Teksty', key: 'text', label: 'Nick / tytuł', type: 'text', default: 'skullboypl', maxLength: 40, when: { key: 'showTag', is: [true] } },
      { group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: { key: 'showTag', is: [true] } },
      { group: 'Teksty', when: [{ key: 'showTag', is: [true] }, { key: 'showSub', is: [true] }], key: 'sub', label: 'Podpis pod spodem', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 60, placeholder: 'np. social, opcjonalnie' },
      { group: 'Wygląd', key: 'showBorder', label: 'Pokaż ramkę', type: 'toggle', default: true },
      { group: 'Wygląd', key: 'color', label: 'Kolor ramki', type: 'color', default: '#ff5900' },
      { key: 'bg', label: 'Tło paska', type: 'color', default: '#111114' },
      { key: 'textColor', label: 'Kolor tekstu', type: 'color', default: '#ffffff' },
      { key: 'position', label: 'Pozycja paska', type: 'select', default: 'bl', options: [
        { value: 'bl', label: 'Dół, lewo' }, { value: 'bc', label: 'Dół, środek' }, { value: 'br', label: 'Dół, prawo' },
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' },
      ] },
      { key: 'thickness', label: 'Grubość', type: 'range', min: 0, max: 20, step: 1, default: 4, unit: 'px' },
      { key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 14, unit: 'px' },
      { key: 'inset', label: 'Margines', type: 'range', min: 0, max: 60, step: 1, default: 10, unit: 'px' },
      { key: 'shine', label: 'Błysk co kilka sekund', type: 'toggle', default: true },
    ],
  },
  {
    id: 'holiday', name: 'Ramki świąteczne', icon: '🎄', category: 'camera', size: CAM,
    description: 'Boże Narodzenie, Sylwester, Walentynki, Wielkanoc, Halloween, 11.11 i urodziny.',
    fields: [
      { group: 'Okazja', key: 'theme', label: 'Święto', type: 'select', default: 'xmas', options: HOLIDAY_OPTIONS },
      { group: 'Okazja', key: 'variant', label: 'Wersja ramki', type: 'select', default: 'anim', options: [
        ...FRAME_VARIANTS,
      ], optionFilter: (p) => (v) => v === 'anim' || Boolean(FRAME_URLS[`${p.theme}-${v}`]), hint: 'Realistyczne (5 wersji), 3D, Kreskówka i Neon to ramki wygenerowane AI z animacją; 3D pływa w perspektywie, Neon migocze' },
      { group: 'Okazja', key: 'showLabel', label: 'Pokaż napis', type: 'toggle', default: true },
      { group: 'Okazja', key: 'label', label: 'Napis', type: 'text', default: 'auto', maxLength: 40, hint: '"auto" wstawia napis pasujący do okazji', when: { key: 'showLabel', is: [true] } },
      { group: 'Okazja', key: 'labelSize', label: 'Wielkość napisu', type: 'range', min: 10, max: 56, step: 1, default: 15, unit: 'px', when: { key: 'showLabel', is: [true] } },
      { group: 'Okazja', key: 'labelPos', label: 'Pozycja napisu', type: 'select', default: 'bottom', when: { key: 'showLabel', is: [true] }, options: [
        { value: 'bottom', label: 'Na dole' }, { value: 'top', label: 'Na górze' },
      ] },
      { group: 'Dekoracje', key: 'decorations', label: 'Dekoracje w rogach', type: 'toggle', default: true, when: { key: 'variant', is: ['anim', '3d', 'cartoon'] } },
      { key: 'decoSize', label: 'Wielkość dekoracji', type: 'range', min: 16, max: 90, step: 1, default: 44, unit: 'px', when: [{ key: 'decorations', is: [true] }, { key: 'variant', is: ['anim', '3d', 'cartoon'] }] },
      { key: 'garland', label: 'Girlanda / lampki', type: 'toggle', default: true, when: { key: 'variant', is: ['anim'] }, hint: 'Lampki, chorągiewki albo czapa śniegu, zależnie od okazji' },
      { key: 'shine', label: 'Błysk światła', type: 'toggle', default: true, when: { key: 'variant', is: [...PHOTO_VARIANTS, '3d', 'cartoon'] } },
      { key: 'depth', label: 'Siła ruchu', type: 'range', min: 0, max: 2.5, step: 0.1, default: 1, unit: '×', when: { key: 'variant', is: ['3d', 'cartoon', 'neon'] }, hint: '0 zatrzymuje ruch' },
      { key: 'particles', label: 'Efekt (śnieg, serca...)', type: 'toggle', default: true },
      { key: 'amount', label: 'Ilość efektu', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1, unit: '×', when: { key: 'particles', is: [true] } },
      { group: 'Ramka', key: 'showBorder', label: 'Pokaż ramkę', type: 'toggle', default: true, when: { key: 'variant', is: ['anim'] } },
      { group: 'Ramka', key: 'thickness', label: 'Grubość ramki', type: 'range', min: 1, max: 24, step: 1, default: 6, unit: 'px', when: [{ key: 'variant', is: ['anim'] }, { key: 'showBorder', is: [true] }] },
      { key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 16, unit: 'px', when: [{ key: 'variant', is: ['anim'] }, { key: 'showBorder', is: [true] }] },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 40, step: 1, default: 12, unit: 'px', when: [{ key: 'variant', is: ['anim'] }, { key: 'showBorder', is: [true] }] },
      { key: 'speed', label: 'Obrót kolorów', type: 'range', min: 0, max: 3, step: 0.1, default: 0.6, unit: '×', when: [{ key: 'variant', is: ['anim'] }, { key: 'showBorder', is: [true] }] },
      { key: 'inset', label: 'Margines', type: 'range', min: 10, max: 70, step: 1, default: 30, unit: 'px', when: { key: 'variant', is: ['anim'] }, hint: 'Miejsce na dekoracje wystające poza ramkę' },
    ],
  },
  {
    id: 'proframe', name: 'Ramka Pro', icon: '🟧', category: 'camera', size: CAM,
    description: 'Ramka z wieloma opcjami: kształt, styl obramowania, animacja, akcenty i maska wokół.',
    fields: proFields({ colors: ['#ff5900', '#ff2d6f', '#7a5cff'] }),
  },
  {
    id: 'faceitcam', name: 'Kamerka + FACEIT', icon: '🎯', category: 'camera', size: { w: 640, h: 360 },
    description: 'Ramka na kamerkę z banerem z faceitbanner.vxh.pl: ELO, level i wybrane staty.',
    fields: [
      { group: 'FACEIT', key: 'source', label: 'Skąd dane', type: 'select', default: 'api', options: [
        { value: 'api', label: 'Nick FACEIT (staty w ramce)' }, { value: 'link', label: 'Link do banera z FACEIT Banner' },
      ] },
      { group: 'FACEIT', key: 'player', label: 'Nick FACEIT', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: { key: 'source', is: ['api'] }, hint: 'Nick z faceit.com, player_id albo link z faceitbanner.vxh.pl' },
      { group: 'Wygląd statów', key: 'look', label: 'Wygląd', type: 'select', default: 'card', when: { key: 'source', is: ['api'] }, options: [
        { value: 'card', label: 'Karta' }, { value: 'pill', label: 'Pigułka' }, { value: 'bar', label: 'Pasek' },
        { value: 'minimal', label: 'Minimal' }, { value: 'neon', label: 'Neon' }, { value: 'hud', label: 'HUD' },
      ] },
      { group: 'Wygląd statów', key: 'showLevel', label: 'Pokaż level', type: 'toggle', default: true, when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'pill', 'bar', 'neon', 'hud'] }] },
      { group: 'Wygląd statów', key: 'showNick', label: 'Pokaż nick', type: 'toggle', default: true, when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'hud'] }] },
      { group: 'Wygląd statów', key: 'showElo', label: 'Pokaż ELO', type: 'toggle', default: true, when: { key: 'source', is: ['api'] } },
      { group: 'Wygląd statów', key: 'stats', label: 'Staty', type: 'select', default: 'kd,wr,hs', when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'bar', 'neon', 'hud'] }], options: [
        { value: 'kd,wr,hs', label: 'K/D, WR, HS' }, { value: 'kd,adr,hs', label: 'K/D, ADR, HS' }, { value: 'kd,kills,wr', label: 'K/D, średnie kille, WR' },
        { value: 'kd', label: 'Tylko K/D' }, { value: 'kd,wr,hs,adr,kills', label: 'Wszystkie' }, { value: 'none', label: 'Bez statów' },
      ] },
      { group: 'Wygląd statów', key: 'matches', label: 'Z ilu ostatnich meczów', type: 'range', min: 5, max: 50, step: 1, default: 20, when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'bar', 'neon', 'hud'] }] },
      { group: 'Wygląd statów', key: 'form', label: 'Forma W/L (5 ostatnich)', type: 'toggle', default: true, when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'pill', 'bar', 'neon', 'hud'] }] },
      { group: 'Wygląd statów', key: 'session', label: 'Zmiana ELO na streamie', type: 'toggle', default: true, when: { key: 'source', is: ['api'] }, hint: 'Liczona od chwili, gdy OBS wczyta źródło' },
      { group: 'Wygląd statów', key: 'avatar', label: 'Avatar', type: 'toggle', default: true, when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card'] }] },
      { group: 'Wygląd statów', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'bl', when: { key: 'source', is: ['api'] }, options: [
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tc', label: 'Góra, środek' }, { value: 'tr', label: 'Góra, prawo' },
        { value: 'bl', label: 'Dół, lewo' }, { value: 'bc', label: 'Dół, środek' }, { value: 'br', label: 'Dół, prawo' }, { value: 'below', label: 'Pod kamerką' },
      ] },
      { group: 'Wygląd statów', key: 'statsScale', label: 'Wielkość', type: 'range', min: 0.5, max: 2.5, step: 0.05, default: 1, unit: '×', when: { key: 'source', is: ['api'] } },
      { group: 'Wygląd statów', key: 'statsAccent', label: 'Akcent', type: 'color', default: '#ff5500', when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'bar', 'minimal', 'neon', 'hud'] }] },
      { group: 'Wygląd statów', key: 'panel', label: 'Tło panelu', type: 'color', default: '#111114', when: [{ key: 'source', is: ['api'] }, { key: 'look', is: ['card', 'pill', 'bar', 'hud'] }] },
      { group: 'Wygląd statów', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff', when: { key: 'source', is: ['api'] } },
      { group: 'Wygląd statów', key: 'refresh', label: 'Odświeżanie co', type: 'range', min: 30, max: 600, step: 10, default: 60, unit: 's', when: { key: 'source', is: ['api'] } },
      { group: 'Baner (link)', when: { key: 'source', is: ['link'] }, key: 'banner', label: 'Link do banera FACEIT', type: 'text', default: '', maxLength: 2000, placeholder: 'https://faceitbanner.vxh.pl/widget/?player_id=...', hint: 'Zrób baner na faceitbanner.vxh.pl (ELO, level, staty), skopiuj jego link do OBS i wklej tutaj' },
      { group: 'Baner (link)', when: { key: 'source', is: ['link'] }, key: 'bannerPos', label: 'Pozycja banera', type: 'select', default: 'bl', options: [
        { value: 'tl', label: 'Góra, lewo' }, { value: 'tc', label: 'Góra, środek' }, { value: 'tr', label: 'Góra, prawo' },
        { value: 'bl', label: 'Dół, lewo' }, { value: 'bc', label: 'Dół, środek' }, { value: 'br', label: 'Dół, prawo' },
        { value: 'below', label: 'Pod kamerką' },
      ] },
      { group: 'Baner (link)', when: { key: 'source', is: ['link'] }, key: 'bannerScale', label: 'Skala banera', type: 'range', min: 0.3, max: 2, step: 0.05, default: 0.8, unit: '×' },
      { group: 'Baner (link)', when: { key: 'source', is: ['link'] }, key: 'bannerW', label: 'Szerokość banera', type: 'range', min: 150, max: 1200, step: 10, default: 420, unit: 'px', hint: 'Ta sama co w FACEIT Banner' },
      { group: 'Baner (link)', when: { key: 'source', is: ['link'] }, key: 'bannerH', label: 'Wysokość banera', type: 'range', min: 40, max: 600, step: 5, default: 120, unit: 'px' },
      ...proFields({ colors: ['#ff5500', '#ffffff'] }),
    ],
  },
  {
    id: 'ticker', name: 'Przewijany pasek', icon: '📰', category: 'widget', size: { w: 1920, h: 64 },
    description: 'Pasek z przesuwającym się tekstem: harmonogram, info, zasady czatu.',
    fields: [
      { group: 'Teksty', key: 'text', i18n: true, label: 'Komunikaty', type: 'text', list: 'lines', placeholder: 'Treść komunikatu', default: 'Streamy pon-pt od 20:00 | !discord po link do serwera | Dzięki za każdy follow ❤️', maxLength: 400, hint: 'Każdy wiersz to osobny komunikat.' },
      { group: 'Teksty', key: 'mode', label: 'Tryb', type: 'select', default: 'scroll', options: [
        { value: 'scroll', label: 'Przewijanie' }, { value: 'rotate', label: 'Po jednym komunikacie' },
      ] },
      { group: 'Teksty', key: 'every', label: 'Zmiana co', type: 'range', min: 2, max: 30, step: 1, default: 6, unit: 's', when: { key: 'mode', is: ['rotate'] } },
      { group: 'Teksty', key: 'rotateAnim', label: 'Animacja zmiany', type: 'select', default: 'up', when: { key: 'mode', is: ['rotate'] }, options: [
        { value: 'up', label: 'Wjazd z dołu' }, { value: 'slide', label: 'Wjazd z boku' }, { value: 'fade', label: 'Zanik' }, { value: 'type', label: 'Pisanie' },
      ] },
      { group: 'Teksty', key: 'direction', label: 'Kierunek', type: 'select', default: 'left', when: { key: 'mode', is: ['scroll'] }, options: [
        { value: 'left', label: 'W lewo' }, { value: 'right', label: 'W prawo' },
      ] },
      { group: 'Teksty', key: 'speed', label: 'Prędkość', type: 'range', min: 20, max: 400, step: 10, default: 110, unit: ' px/s', when: { key: 'mode', is: ['scroll'] } },
      { group: 'Teksty', key: 'showSeparator', label: 'Pokaż separator', type: 'toggle', default: true, when: { key: 'mode', is: ['scroll'] } },
      { group: 'Teksty', key: 'separator', label: 'Separator', type: 'text', default: '◆', maxLength: 3, when: [{ key: 'mode', is: ['scroll'] }, { key: 'showSeparator', is: [true] }] },
      { group: 'Teksty', key: 'uppercase', label: 'Wielkie litery', type: 'toggle', default: false },
      { group: 'Etykieta', key: 'showLabel', label: 'Pokaż etykietę z lewej', type: 'toggle', default: true },
      { group: 'Etykieta', key: 'label', i18n: true, label: 'Etykieta z lewej', type: 'text', default: 'INFO', maxLength: 16, when: { key: 'showLabel', is: [true] } },
      { group: 'Etykieta', key: 'labelStyle', label: 'Kształt etykiety', type: 'select', default: 'angled', when: { key: 'showLabel', is: [true] }, options: [
        { value: 'angled', label: 'Ścięta' }, { value: 'flat', label: 'Prosta' }, { value: 'rounded', label: 'Zaokrąglona' }, { value: 'outline', label: 'Kontur' },
      ] },
      { group: 'Etykieta', key: 'liveDot', label: 'Migająca kropka LIVE', type: 'toggle', default: false, when: { key: 'showLabel', is: [true] } },
      { group: 'Etykieta', key: 'showClock', label: 'Zegar z prawej', type: 'toggle', default: false },
      { group: 'Etykieta', key: 'clock12', label: 'Zegar 12-godzinny', type: 'toggle', default: false, when: { key: 'showClock', is: [true] } },
      { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'solid', options: [
        { value: 'solid', label: 'Pełny' }, { value: 'glass', label: 'Szkło' }, { value: 'gradient', label: 'Gradient' }, { value: 'neon', label: 'Neon' },
        { value: 'outline', label: 'Kontur' }, { value: 'lower', label: 'Pływający pasek' }, { value: 'none', label: 'Bez tła' },
      ] },
      { group: 'Wygląd', key: 'borderPos', label: 'Linia akcentu', type: 'select', default: 'top', when: { key: 'style', is: ['solid'] }, options: [
        { value: 'top', label: 'Na górze' }, { value: 'bottom', label: 'Na dole' }, { value: 'none', label: 'Brak' },
      ] },
      { group: 'Wygląd', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 40, step: 1, default: 14, unit: 'px', when: { key: 'style', is: ['glass', 'neon', 'outline', 'lower'] } },
      { group: 'Wygląd', key: 'fadeEdges', label: 'Wygaszanie krawędzi tekstu', type: 'toggle', default: true },
      { group: 'Wygląd', key: 'fontSize', label: 'Wielkość tekstu', type: 'range', min: 14, max: 60, step: 1, default: 28, unit: 'px' },
      { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'dm', options: [
        { value: 'dm', label: 'DM Sans' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' },
      ] },
      { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
      { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114', when: { key: 'style', is: ['solid', 'glass', 'gradient', 'neon', 'lower'] } },
      { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
    ],
  },
  {
    id: 'socials', name: 'Rotator sociali', icon: '🔗', category: 'widget', size: { w: 560, h: 100 },
    description: 'Po kolei pokazuje Twitch, Discord, YouTube, TikTok z ikonami.',
    fields: [
      { group: 'Kanały', key: 'items', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.skullmedia.pl | youtube.com/@skullboypl | tiktok.com/@skullboypl', maxLength: 300 },
      { group: 'Kanały', key: 'layout', label: 'Układ', type: 'select', default: 'one', options: [
        { value: 'one', label: 'Jeden na raz' }, { value: 'row', label: 'Wszystkie w rzędzie' }, { value: 'column', label: 'Wszystkie w kolumnie' },
      ], hint: 'Przy rzędzie i kolumnie aktywny kanał jest podświetlany po kolei. Dla rzędu ustaw szersze źródło w OBS, np. 1400 × 100.' },
      { group: 'Kanały', key: 'every', label: 'Zmiana co', type: 'range', min: 2, max: 30, step: 1, default: 5, unit: 's' },
      { group: 'Kanały', key: 'shuffle', label: 'Losowa kolejność', type: 'toggle', default: false },
      { group: 'Kanały', key: 'textMode', label: 'Tekst', type: 'select', default: 'full', options: [
        { value: 'full', label: 'Cały adres' }, { value: 'handle', label: 'Sam nick' },
      ], hint: 'Sam nick zamienia twitch.tv/skullboypl na skullboypl' },
      { group: 'Kanały', key: 'showPrefix', label: 'Pokaż tekst przed kanałem', type: 'toggle', default: false },
      { group: 'Kanały', key: 'prefix', i18n: true, label: 'Tekst przed kanałem', type: 'text', default: 'Obserwuj:', maxLength: 24, when: { key: 'showPrefix', is: [true] } },
      { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'pill', options: [
        { value: 'pill', label: 'Pigułka' }, { value: 'card', label: 'Karta' }, { value: 'glass', label: 'Szkło' }, { value: 'neon', label: 'Neon' },
        { value: 'gradient', label: 'Gradient' }, { value: 'outline', label: 'Kontur' }, { value: 'underline', label: 'Podkreślenie' }, { value: 'clean', label: 'Bez tła' },
      ] },
      { group: 'Wygląd', key: 'anim', label: 'Animacja', type: 'select', default: 'slide', when: { key: 'layout', is: ['one'] }, options: [
        { value: 'slide', label: 'Wjazd' }, { value: 'flip', label: 'Obrót' }, { value: 'fade', label: 'Zanik' }, { value: 'zoom', label: 'Powiększenie' },
        { value: 'bounce', label: 'Podskok' }, { value: 'drop', label: 'Spadnięcie' }, { value: 'blur', label: 'Rozmycie' },
      ] },
      { group: 'Wygląd', key: 'align', label: 'Wyrównanie', type: 'select', default: 'left', options: [
        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
      ] },
      { group: 'Wygląd', key: 'gap', label: 'Odstęp', type: 'range', min: 0, max: 60, step: 1, default: 14, unit: 'px', when: { key: 'layout', is: ['row', 'column'] } },
      { group: 'Wygląd', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 40, unit: 'px', when: { key: 'style', is: ['pill', 'glass', 'neon', 'gradient', 'outline'] } },
      { group: 'Wygląd', key: 'fontSize', label: 'Wielkość', type: 'range', min: 14, max: 48, step: 1, default: 26, unit: 'px' },
      { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'dm', options: [
        { value: 'dm', label: 'DM Sans' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' },
      ] },
      { group: 'Wygląd', key: 'uppercase', label: 'Wielkie litery', type: 'toggle', default: false },
      { group: 'Wygląd', key: 'shadow', label: 'Cień', type: 'toggle', default: true },
      { group: 'Ikona', key: 'showIcon', label: 'Pokaż ikonę serwisu', type: 'toggle', default: true },
      { group: 'Ikona', key: 'iconShape', label: 'Kształt ikony', type: 'select', default: 'circle', when: { key: 'showIcon', is: [true] }, options: [
        { value: 'circle', label: 'Koło' }, { value: 'rounded', label: 'Zaokrąglony kwadrat' }, { value: 'square', label: 'Kwadrat' },
      ] },
      { group: 'Kolory', key: 'brandColors', label: 'Kolory serwisów', type: 'toggle', default: true, hint: 'Fiolet Twitcha, czerwień YouTube itd.' },
      { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900', when: { key: 'brandColors', is: [false] } },
      { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114', when: { key: 'style', is: ['pill', 'card', 'glass', 'neon', 'gradient'] } },
      { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
      { group: 'Kolory', key: 'progress', label: 'Pasek czasu', type: 'toggle', default: true },
    ],
  },
];

// "Animowane postacie" appears once at least one character clip has been generated.
export const OVERLAYS = ALL_OVERLAYS.filter((o) => (o.id !== 'character' || Object.keys(CHARACTERS).length > 0) && (o.id !== 'videobg' || VIDEO_IDS.length > 0));

export const findOverlay = (id: string | undefined) => OVERLAYS.find((o) => o.id === id);
