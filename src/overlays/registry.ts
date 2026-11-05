import type { Field, OverlayDef } from './schema';
import { PHOTO_IDS } from './backgrounds';

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
};
const BG_OPTIONS = [
  { value: 'aurora', label: 'Zorza' }, { value: 'synth', label: 'Synthwave' }, { value: 'waves', label: 'Fale' },
  { value: 'space', label: 'Kosmos' }, { value: 'minimal', label: 'Minimal' }, { value: 'mesh', label: 'Gradient' },
  { value: 'rays', label: 'Promienie' }, { value: 'dots', label: 'Kropki' }, { value: 'lava', label: 'Lava' },
  ...PHOTO_IDS.map((id) => ({ value: id, label: PHOTO_LABELS[id] })),
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
  custom: 'repeating-linear-gradient(45deg, #222 0 6px, #2b2b2e 6px 12px)',
};

type SceneDefaults = {
  title: string; subtitle: string; timer: string; timerLabel: string; doneText: string;
  bg: string; colors: string[]; effect: string; titleAnim: string; next?: string;
};

const sceneFields = (d: SceneDefaults, ending = false): Field[] => [
  // ---- texts ----
  { group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: d.title, maxLength: 40 },
  { group: 'Teksty', key: 'subtitle', i18n: true, label: 'Podtytuł', type: 'text', default: d.subtitle, maxLength: 90 },
  { group: 'Teksty', key: 'kicker', label: 'Znaczek nad tytułem', type: 'text', default: 'skullboypl', maxLength: 40, hint: 'Nick albo nazwa kanału. Puste ukrywa.' },
  ...(ending ? [{ group: 'Teksty', key: 'next', i18n: true, label: 'Następny stream', type: 'text', default: d.next ?? '', maxLength: 80, placeholder: 'np. Piątek, 20:00' } as Field] : []),

  // ---- countdown ----
  { group: 'Odliczanie', key: 'timer', label: 'Licznik', type: 'select', default: d.timer, options: [
    { value: 'off', label: 'Brak' }, { value: 'countdown', label: 'Minuty' }, { value: 'clock', label: 'Do godziny' },
  ] },
  { group: 'Odliczanie', key: 'minutes', label: 'Ile minut', type: 'range', min: 1, max: 120, step: 1, default: 5, unit: ' min', when: { key: 'timer', is: ['countdown'] }, hint: 'Liczone od chwili, gdy OBS załaduje źródło' },
  { group: 'Odliczanie', key: 'at', label: 'Godzina startu', type: 'text', default: '20:00', maxLength: 5, placeholder: 'HH:MM', when: { key: 'timer', is: ['clock'] } },
  { group: 'Odliczanie', key: 'timerLabel', i18n: true, label: 'Napis nad licznikiem', type: 'text', default: d.timerLabel, maxLength: 30, when: { key: 'timer', is: ['countdown', 'clock'] } },
  { group: 'Odliczanie', key: 'doneText', i18n: true, label: 'Napis po odliczeniu', type: 'text', default: d.doneText, maxLength: 30, when: { key: 'timer', is: ['countdown', 'clock'] } },
  { group: 'Odliczanie', key: 'progress', label: 'Pasek postępu', type: 'toggle', default: true, when: { key: 'timer', is: ['countdown', 'clock'] } },

  // ---- socials ----
  { group: 'Sociale', key: 'socials', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.gg/skullmedia | youtube.com/@skullboypl', maxLength: 300, hint: 'Pokażą się na dole ekranu z ikonami. Usuń wszystkie, żeby ukryć pasek.' },

  // ---- chat ----
  { group: 'Czat', key: 'chat', label: 'Miejsce na czat', type: 'toggle', default: false, hint: 'Zostawia ramkę, na którą kładziesz źródło czatu w OBS' },
  { group: 'Czat', key: 'chatSide', label: 'Strona', type: 'select', default: 'right', when: { key: 'chat', is: [true] }, options: [
    { value: 'left', label: 'Lewa' }, { value: 'right', label: 'Prawa' },
  ] },
  { group: 'Czat', key: 'chatWidth', label: 'Szerokość', type: 'range', min: 18, max: 45, step: 1, default: 26, unit: '%', when: { key: 'chat', is: [true] } },
  { group: 'Czat', key: 'chatStyle', label: 'Wygląd ramki', type: 'select', default: 'glass', when: { key: 'chat', is: [true] }, options: [
    { value: 'glass', label: 'Szkło' }, { value: 'outline', label: 'Obramowanie' }, { value: 'cutout', label: 'Przezroczysta dziura' },
  ] },
  { group: 'Czat', key: 'chatTitle', i18n: true, label: 'Nagłówek', type: 'text', default: 'CZAT', maxLength: 30, when: { key: 'chat', is: [true] }, hint: 'Puste ukrywa nagłówek' },

  // ---- look ----
  { group: 'Tło', key: 'bg', label: 'Wybierz tło', type: 'select', default: d.bg, options: BG_OPTIONS, swatches: BG_SWATCHES },
  { group: 'Tło', key: 'bgImage', label: 'Adres obrazka', type: 'text', default: '', maxLength: 300, placeholder: 'https://...jpg', when: { key: 'bg', is: ['custom'] }, hint: 'Link do własnego obrazka (jpg, png, webp, gif)' },
  { group: 'Tło', key: 'bgMotion', label: 'Ruch obrazka', type: 'select', default: 'zoom', when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] }, options: [
    { value: 'zoom', label: 'Powolny zoom' }, { value: 'pan', label: 'Przesuw' }, { value: 'still', label: 'Bez ruchu' },
  ] },
  { group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] }, hint: 'Ciemniejsze tło = czytelniejszy tytuł' },
  { group: 'Tło', key: 'bgTint', label: 'Zabarw kolorami motywu', type: 'toggle', default: false, when: { key: 'bg', is: [...PHOTO_IDS, 'custom'] } },
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
  ] },
  { group: 'Dodatki', key: 'bars', label: 'Animowany equalizer', type: 'toggle', default: !ending },
  { group: 'Dodatki', key: 'vignette', label: 'Winieta', type: 'toggle', default: true },
];

export const OVERLAYS: OverlayDef[] = [
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
      { key: 'blur', label: 'Rozmycie głębi', type: 'toggle', default: true, hint: 'Bliższe płatki są większe i bardziej rozmyte' },
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
      { group: 'Teksty', key: 'text', label: 'Nick / tytuł', type: 'text', default: 'skullboypl', maxLength: 40 },
      { group: 'Teksty', key: 'sub', label: 'Podpis pod spodem', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 60, placeholder: 'np. social, opcjonalnie' },
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
        { value: 'anim', label: 'Animowana' }, { value: 'real', label: 'Realistyczna' }, { value: '3d', label: '3D' },
        { value: 'cartoon', label: 'Kreskówka' }, { value: 'neon', label: 'Neon' },
      ], hint: 'Realistyczna, 3D, Kreskówka i Neon to ramki wygenerowane AI z animacją; 3D pływa w perspektywie, Neon migocze' },
      { group: 'Okazja', key: 'label', label: 'Napis', type: 'text', default: 'auto', maxLength: 40, hint: '"auto" wstawia napis pasujący do okazji, puste pole ukrywa napis' },
      { group: 'Okazja', key: 'labelSize', label: 'Wielkość napisu', type: 'range', min: 10, max: 56, step: 1, default: 15, unit: 'px' },
      { group: 'Okazja', key: 'labelPos', label: 'Pozycja napisu', type: 'select', default: 'bottom', options: [
        { value: 'bottom', label: 'Na dole' }, { value: 'top', label: 'Na górze' },
      ] },
      { group: 'Dekoracje', key: 'decorations', label: 'Dekoracje w rogach', type: 'toggle', default: true },
      { key: 'decoSize', label: 'Wielkość dekoracji', type: 'range', min: 16, max: 90, step: 1, default: 44, unit: 'px', when: { key: 'decorations', is: [true] } },
      { key: 'garland', label: 'Girlanda / lampki', type: 'toggle', default: true, when: { key: 'variant', is: ['anim'] }, hint: 'Lampki, chorągiewki albo czapa śniegu, zależnie od okazji' },
      { key: 'shine', label: 'Błysk światła', type: 'toggle', default: true, when: { key: 'variant', is: ['real', '3d', 'cartoon', 'neon'] } },
      { key: 'depth', label: 'Siła ruchu', type: 'range', min: 0, max: 2.5, step: 0.1, default: 1, unit: '×', when: { key: 'variant', is: ['3d', 'cartoon', 'neon'] }, hint: '0 zatrzymuje ruch' },
      { key: 'particles', label: 'Efekt (śnieg, serca...)', type: 'toggle', default: true },
      { key: 'amount', label: 'Ilość efektu', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1, unit: '×', when: { key: 'particles', is: [true] } },
      { group: 'Ramka', key: 'thickness', label: 'Grubość ramki', type: 'range', min: 1, max: 24, step: 1, default: 6, unit: 'px', when: { key: 'variant', is: ['anim'] } },
      { key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 16, unit: 'px', when: { key: 'variant', is: ['anim'] } },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 40, step: 1, default: 12, unit: 'px', when: { key: 'variant', is: ['anim'] } },
      { key: 'speed', label: 'Obrót kolorów', type: 'range', min: 0, max: 3, step: 0.1, default: 0.6, unit: '×', when: { key: 'variant', is: ['anim'] } },
      { key: 'inset', label: 'Margines', type: 'range', min: 10, max: 70, step: 1, default: 30, unit: 'px', when: { key: 'variant', is: ['anim'] }, hint: 'Miejsce na dekoracje wystające poza ramkę' },
    ],
  },
  {
    id: 'ticker', name: 'Przewijany pasek', icon: '📰', category: 'widget', size: { w: 1920, h: 64 },
    description: 'Pasek z przesuwającym się tekstem: harmonogram, info, zasady czatu.',
    fields: [
      { group: 'Teksty', key: 'text', i18n: true, label: 'Komunikaty', type: 'text', list: 'lines', placeholder: 'Treść komunikatu', default: 'Streamy pon-pt od 20:00 | !discord po link do serwera | Dzięki za każdy follow ❤️', maxLength: 400, hint: 'Każdy wiersz to osobny komunikat, przewijane po kolei.' },
      { group: 'Teksty', key: 'label', i18n: true, label: 'Etykieta z lewej', type: 'text', default: 'INFO', maxLength: 16, hint: 'Puste ukrywa etykietę' },
      { group: 'Teksty', key: 'separator', label: 'Separator', type: 'text', default: '◆', maxLength: 3 },
      { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'solid', options: [
        { value: 'solid', label: 'Pełny' }, { value: 'glass', label: 'Szkło' }, { value: 'none', label: 'Bez tła' },
      ] },
      { key: 'speed', label: 'Prędkość', type: 'range', min: 20, max: 400, step: 10, default: 110, unit: ' px/s' },
      { key: 'fontSize', label: 'Wielkość tekstu', type: 'range', min: 14, max: 60, step: 1, default: 28, unit: 'px' },
      { key: 'font', label: 'Czcionka', type: 'select', default: 'dm', options: [
        { value: 'dm', label: 'DM Sans' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' },
      ] },
      { key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
      { key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
      { key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
    ],
  },
  {
    id: 'socials', name: 'Rotator sociali', icon: '🔗', category: 'widget', size: { w: 560, h: 100 },
    description: 'Po kolei pokazuje Twitch, Discord, YouTube, TikTok z ikonami.',
    fields: [
      { group: 'Kanały', key: 'items', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.gg/skullmedia | youtube.com/@skullboypl | tiktok.com/@skullboypl', maxLength: 300, hint: 'Pokazywane po kolei, jeden na raz.' },
      { group: 'Kanały', key: 'every', label: 'Zmiana co', type: 'range', min: 2, max: 30, step: 1, default: 5, unit: 's' },
      { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: 'pill', options: [
        { value: 'pill', label: 'Pigułka' }, { value: 'card', label: 'Karta' }, { value: 'clean', label: 'Bez tła' },
      ] },
      { key: 'anim', label: 'Animacja', type: 'select', default: 'slide', options: [
        { value: 'slide', label: 'Wjazd' }, { value: 'flip', label: 'Obrót' }, { value: 'fade', label: 'Zanik' },
      ] },
      { key: 'align', label: 'Wyrównanie', type: 'select', default: 'left', options: [
        { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
      ] },
      { key: 'fontSize', label: 'Wielkość', type: 'range', min: 14, max: 48, step: 1, default: 26, unit: 'px' },
      { key: 'brandColors', label: 'Kolory serwisów', type: 'toggle', default: true, hint: 'Fiolet Twitcha, czerwień YouTube itd.' },
      { key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900', when: { key: 'brandColors', is: [false] } },
      { key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
      { key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
      { key: 'progress', label: 'Pasek czasu', type: 'toggle', default: true },
    ],
  },
];

export const findOverlay = (id: string | undefined) => OVERLAYS.find((o) => o.id === id);
