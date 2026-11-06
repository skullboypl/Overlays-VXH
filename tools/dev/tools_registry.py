"""Registers the five streamer tools (clock, timer, goal, reminder, qr) in registry.ts, Overlay.tsx, main.tsx and the menu."""
R = 'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(f, pairs):
    s = open(R + f, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (f, a[:70])
        s = s.replace(a, b)
    open(R + f, 'w', encoding='utf-8').write(s)


LOOK = r'''// Shared look of the streamer tools (tools.tsx): card style, size, font and colours.
const toolLook = (style = 'glass', align = 'center'): Field[] => [
  { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: style, options: [
    { value: 'glass', label: 'Szkło' }, { value: 'solid', label: 'Pełny' }, { value: 'neon', label: 'Neon' },
    { value: 'gradient', label: 'Gradient' }, { value: 'outline', label: 'Kontur' }, { value: 'none', label: 'Bez tła' },
  ] },
  { group: 'Wygląd', key: 'scale', label: 'Wielkość', type: 'range', min: 40, max: 160, step: 5, default: 100, unit: '%', hint: 'Widżet rośnie też razem ze źródłem w OBS' },
  { group: 'Wygląd', key: 'align', label: 'Wyrównanie', type: 'select', default: align, options: [
    { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
  ] },
  { group: 'Wygląd', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 18, unit: 'px', when: { key: 'style', is: ['glass', 'solid', 'neon', 'gradient', 'outline'] } },
  { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: 'dm', options: [
    { value: 'dm', label: 'DM Sans' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' }, { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' },
  ] },
  { group: 'Wygląd', key: 'shadow', label: 'Cień', type: 'toggle', default: true },
  { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
  { group: 'Kolory', key: 'accent2', label: 'Drugi kolor', type: 'color', default: '#ff2d95' },
  { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114', when: { key: 'style', is: ['glass', 'solid', 'neon'] } },
  { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
];

'''

TOOLS = r'''  // ---------- streamer tools ----------
  {
    id: 'timer', name: 'Odliczanie i stoper', icon: '⏱️', category: 'widget', size: { w: 520, h: 180 },
    description: 'Odliczanie do startu, minutnik przerwy, stoper albo czas trwania streama.',
    fields: [
      { group: 'Licznik', key: 'mode', label: 'Tryb', type: 'select', default: 'countdown', options: [
        { value: 'countdown', label: 'Odliczanie (minuty)' }, { value: 'until', label: 'Do godziny' },
        { value: 'stopwatch', label: 'Stoper' }, { value: 'uptime', label: 'Czas streama od godziny' },
      ], hint: 'Odliczanie i stoper startują, gdy OBS wczyta źródło. W OBS zaznacz „Odśwież przeglądarkę, gdy scena staje się aktywna”, żeby liczyć od nowa przy każdym wejściu na scenę.' },
      { group: 'Licznik', key: 'minutes', label: 'Minuty', type: 'range', min: 0, max: 180, step: 1, default: 5, unit: ' min', when: { key: 'mode', is: ['countdown'] } },
      { group: 'Licznik', key: 'secs', label: 'Sekundy', type: 'range', min: 0, max: 59, step: 1, default: 0, unit: ' s', when: { key: 'mode', is: ['countdown'] } },
      { group: 'Licznik', key: 'loop', label: 'Zapętl', type: 'toggle', default: false, when: { key: 'mode', is: ['countdown'] } },
      { group: 'Licznik', key: 'at', label: 'Godzina końca', type: 'text', default: '20:00', maxLength: 5, placeholder: '20:00', when: { key: 'mode', is: ['until'] }, hint: 'Jeśli ta godzina już minęła, liczy do jutra' },
      { group: 'Licznik', key: 'since', label: 'Stream wystartował o', type: 'text', default: '20:00', maxLength: 5, placeholder: '20:00', when: { key: 'mode', is: ['uptime'] } },
      { group: 'Licznik', key: 'alwaysHours', label: 'Zawsze pokazuj godziny', type: 'toggle', default: false },
      { group: 'Teksty', key: 'showLabel', label: 'Pokaż napis nad licznikiem', type: 'toggle', default: true },
      { group: 'Teksty', key: 'label', i18n: true, label: 'Napis', type: 'text', default: 'Startujemy za', maxLength: 40, when: { key: 'showLabel', is: [true] } },
      { group: 'Teksty', key: 'onDone', label: 'Na koniec', type: 'select', default: 'text', when: { key: 'mode', is: ['countdown', 'until'] }, options: [
        { value: 'text', label: 'Pokaż tekst' }, { value: 'zero', label: 'Zostaw 00:00' }, { value: 'hide', label: 'Ukryj' },
      ] },
      { group: 'Teksty', key: 'doneText', i18n: true, label: 'Tekst na koniec', type: 'text', default: 'Zaczynamy!', maxLength: 40, when: [{ key: 'mode', is: ['countdown', 'until'] }, { key: 'onDone', is: ['text'] }] },
      { group: 'Teksty', key: 'progress', label: 'Pasek postępu', type: 'toggle', default: true, when: { key: 'mode', is: ['countdown', 'until'] } },
      { group: 'Teksty', key: 'urgent', label: 'Pulsowanie w ostatnich 10 s', type: 'toggle', default: true, when: { key: 'mode', is: ['countdown', 'until'] } },
      ...toolLook('glass'),
    ],
  },
  {
    id: 'clock', name: 'Zegar', icon: '🕒', category: 'widget', size: { w: 420, h: 150 },
    description: 'Aktualna godzina i data, także w innej strefie czasowej.',
    fields: [
      { group: 'Zegar', key: 'seconds', label: 'Pokaż sekundy', type: 'toggle', default: false },
      { group: 'Zegar', key: 'clock12', label: 'Zegar 12-godzinny (AM/PM)', type: 'toggle', default: false },
      { group: 'Zegar', key: 'blink', label: 'Migający dwukropek', type: 'toggle', default: true },
      { group: 'Zegar', key: 'tz', label: 'Strefa czasowa', type: 'select', default: 'local', options: [
        { value: 'local', label: 'Jak na komputerze' }, { value: 'Europe/Warsaw', label: 'Polska' }, { value: 'Europe/London', label: 'Londyn' },
        { value: 'Europe/Berlin', label: 'Berlin' }, { value: 'America/New_York', label: 'Nowy Jork' }, { value: 'America/Los_Angeles', label: 'Los Angeles' },
        { value: 'Asia/Tokyo', label: 'Tokio' }, { value: 'UTC', label: 'UTC' },
      ] },
      { group: 'Zegar', key: 'showDate', label: 'Pokaż datę', type: 'toggle', default: true },
      { group: 'Zegar', key: 'dateFormat', label: 'Format daty', type: 'select', default: 'long', when: { key: 'showDate', is: [true] }, options: [
        { value: 'long', label: 'Pełna nazwa dnia' }, { value: 'short', label: 'Skrót dnia' }, { value: 'numeric', label: 'Liczbowo z rokiem' },
      ] },
      { group: 'Zegar', key: 'layout', label: 'Układ', type: 'select', default: 'stack', when: { key: 'showDate', is: [true] }, options: [
        { value: 'stack', label: 'Data pod godziną' }, { value: 'inline', label: 'Data obok' },
      ] },
      { group: 'Zegar', key: 'showLabel', label: 'Pokaż napis', type: 'toggle', default: false },
      { group: 'Zegar', key: 'label', i18n: true, label: 'Napis', type: 'text', default: 'Czas u streamera', maxLength: 40, when: { key: 'showLabel', is: [true] } },
      ...toolLook('glass'),
    ],
  },
  {
    id: 'goal', name: 'Pasek celu', icon: '🎯', category: 'widget', size: { w: 640, h: 130 },
    description: 'Cel subów, followów albo donejtów z animowanym paskiem postępu.',
    fields: [
      { group: 'Cel', key: 'title', i18n: true, label: 'Nazwa celu', type: 'text', default: 'Cel followów', maxLength: 40 },
      { group: 'Cel', key: 'current', label: 'Teraz', type: 'text', default: '68', maxLength: 10, placeholder: '68', hint: 'Zmień liczbę tutaj i odśwież źródło w OBS' },
      { group: 'Cel', key: 'target', label: 'Cel', type: 'text', default: '100', maxLength: 10, placeholder: '100' },
      { group: 'Cel', key: 'unit', label: 'Jednostka', type: 'text', default: '', maxLength: 12, placeholder: 'zł, subów...' },
      { group: 'Cel', key: 'look', label: 'Wygląd paska', type: 'select', default: 'stacked', options: [
        { value: 'stacked', label: 'Napis nad paskiem' }, { value: 'bar', label: 'Napis w pasku' }, { value: 'thin', label: 'Cienki pasek' }, { value: 'ring', label: 'Koło' },
      ] },
      { group: 'Cel', key: 'showNumbers', label: 'Pokaż liczby', type: 'toggle', default: true },
      { group: 'Cel', key: 'showPercent', label: 'Pokaż procent', type: 'toggle', default: true, when: { key: 'look', is: ['stacked', 'bar', 'thin'] } },
      { group: 'Animacja', key: 'animate', label: 'Wypełnianie przy starcie', type: 'toggle', default: true },
      { group: 'Animacja', key: 'shimmer', label: 'Połysk na pasku', type: 'toggle', default: true, when: { key: 'look', is: ['stacked', 'bar', 'thin'] } },
      { group: 'Animacja', key: 'celebrate', label: 'Świętuj po osiągnięciu celu', type: 'toggle', default: true },
      { group: 'Animacja', key: 'reachedText', i18n: true, label: 'Napis po osiągnięciu', type: 'text', default: 'Cel osiągnięty! 🎉', maxLength: 40, when: { key: 'celebrate', is: [true] } },
      ...toolLook('glass'),
    ],
  },
  {
    id: 'reminder', name: 'Przypominajka', icon: '📣', category: 'widget', size: { w: 720, h: 150 },
    description: 'Co kilka minut wysuwa okienko: zostaw follow, wbijaj na Discorda, komendy czatu.',
    fields: [
      { group: 'Komunikaty', key: 'messages', i18n: true, label: 'Komunikaty', type: 'text', list: 'lines', placeholder: 'Treść komunikatu', default: 'Zostaw follow, jeśli Ci się podoba ❤️ | Wbijaj na Discorda: discord.skullmedia.pl | Wpisz !komendy na czacie', maxLength: 400, hint: 'Każdy wiersz to osobny komunikat. Link do Discorda, Twitcha itd. sam dobierze ikonę i kolor.' },
      { group: 'Komunikaty', key: 'showTitle', label: 'Pokaż nagłówek', type: 'toggle', default: true },
      { group: 'Komunikaty', key: 'title', i18n: true, label: 'Nagłówek', type: 'text', default: 'Hej!', maxLength: 24, when: { key: 'showTitle', is: [true] } },
      { group: 'Czas', key: 'every', label: 'Co ile', type: 'range', min: 1, max: 30, step: 0.5, default: 5, unit: ' min', hint: 'W podglądzie okienko wraca po 2 s, w OBS co tyle minut' },
      { group: 'Czas', key: 'duration', label: 'Jak długo widać', type: 'range', min: 4, max: 30, step: 1, default: 10, unit: ' s' },
      { group: 'Czas', key: 'delay', label: 'Pierwszy raz po', type: 'range', min: 0, max: 300, step: 5, default: 20, unit: ' s' },
      { group: 'Czas', key: 'order', label: 'Kolejność', type: 'select', default: 'seq', options: [
        { value: 'seq', label: 'Po kolei' }, { value: 'random', label: 'Losowo' },
      ] },
      { group: 'Animacja', key: 'anim', label: 'Wejście', type: 'select', default: 'slide', options: [
        { value: 'slide', label: 'Wjazd z boku' }, { value: 'up', label: 'Wjazd z dołu' }, { value: 'pop', label: 'Wyskok' }, { value: 'flip', label: 'Obrót' },
      ] },
      { group: 'Animacja', key: 'progress', label: 'Pasek czasu', type: 'toggle', default: true },
      { group: 'Ikona', key: 'showIcon', label: 'Pokaż ikonę', type: 'toggle', default: true },
      { group: 'Ikona', key: 'icon', label: 'Ikona, gdy nie ma linku', type: 'text', default: '❤️', maxLength: 4, when: { key: 'showIcon', is: [true] } },
      { group: 'Ikona', key: 'brandColors', label: 'Kolory serwisów', type: 'toggle', default: true, hint: 'Discord na niebiesko, Twitch na fioletowo itd.' },
      ...toolLook('solid', 'left'),
    ],
  },
  {
    id: 'qr', name: 'Kod QR', icon: '🔳', category: 'widget', size: { w: 320, h: 400 },
    description: 'Kod QR do Discorda, donejtów albo sklepu: widzowie skanują go telefonem.',
    fields: [
      { group: 'Kod', key: 'url', label: 'Link', type: 'text', default: 'https://discord.skullmedia.pl', maxLength: 300, placeholder: 'https://...' },
      { group: 'Kod', key: 'showTitle', label: 'Pokaż tytuł', type: 'toggle', default: true },
      { group: 'Kod', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: 'Wbijaj na Discorda', maxLength: 30, when: { key: 'showTitle', is: [true] } },
      { group: 'Kod', key: 'caption', label: 'Podpis pod kodem', type: 'select', default: 'url', options: [
        { value: 'url', label: 'Adres' }, { value: 'text', label: 'Własny tekst' }, { value: 'none', label: 'Brak' },
      ] },
      { group: 'Kod', key: 'captionText', i18n: true, label: 'Tekst pod kodem', type: 'text', default: 'Zeskanuj telefonem', maxLength: 40, when: { key: 'caption', is: ['text'] } },
      { group: 'Kod', key: 'logo', label: 'Logo serwisu w środku', type: 'toggle', default: true, hint: 'Działa dla Discorda, Twitcha, YouTube, TikToka, Kicka, Instagrama, X i Facebooka' },
      { group: 'Kod', key: 'anim', label: 'Animacja', type: 'select', default: 'scan', options: [
        { value: 'none', label: 'Brak' }, { value: 'scan', label: 'Linia skanowania' }, { value: 'pulse', label: 'Puls' }, { value: 'float', label: 'Unoszenie' },
      ] },
      { group: 'Kolory', key: 'qrColor', label: 'Kolor kodu', type: 'color', default: '#111114', hint: 'Ciemny kod na jasnym tle skanuje się najpewniej' },
      { group: 'Kolory', key: 'qrBg', label: 'Tło kodu', type: 'color', default: '#ffffff' },
      ...toolLook('glass'),
    ],
  },
'''

s = open(R + 'overlays/registry.ts', encoding='utf-8').read()
anchor = '\n// "Animowane postacie" appears once'
i = s.index(anchor)
j = s.rindex('];', 0, i)
s = s[:j] + TOOLS + s[j:]
k = s.index('// Versions of a holiday frame.')
s = s[:k] + LOOK + s[k:]
open(R + 'overlays/registry.ts', 'w', encoding='utf-8').write(s)

edit('overlays/Overlay.tsx', [
    ("import { SocialsWidget, TickerWidget } from './widgets';",
     "import { SocialsWidget, TickerWidget } from './widgets';\nimport { ClockWidget, GoalWidget, QrWidget, ReminderWidget, TimerWidget } from './tools';"),
    ("    case 'socials': return <SocialsWidget params={params} />;",
     "    case 'socials': return <SocialsWidget params={params} />;\n    case 'timer': return <TimerWidget params={params} />;\n    case 'clock': return <ClockWidget params={params} />;\n    case 'goal': return <GoalWidget params={params} />;\n    case 'reminder': return <ReminderWidget params={params} />;\n    case 'qr': return <QrWidget params={params} />;"),
])
edit('main.tsx', [("import './overlays/proframe.css';", "import './overlays/proframe.css';\nimport './overlays/tools.css';")])
edit('studio/OverlayMenu.tsx', [
    ("  { id: 'bars', title: tx('Paski i sociale'), note: tx('Info dla widzów'), items: ['socials', 'ticker'] },",
     "  { id: 'bars', title: tx('Paski i sociale'), note: tx('Info dla widzów'), items: ['socials', 'ticker'] },\n  { id: 'tools', title: tx('Narzędzia streamera'), note: tx('Licznik, zegar, cel, QR'), items: ['timer', 'clock', 'goal', 'reminder', 'qr'] },"),
])
print('ok')
