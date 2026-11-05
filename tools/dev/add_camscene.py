p = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/registry.ts'
s = open(p, encoding='utf-8').read()

# Layout thumbnails: dark box with orange cam, blue screen, grey chat, roughly matching camLayout().
def thumb(parts):
    layers = ', '.join(f'linear-gradient({c}, {c}) {x}% {y}% / {w}% {h}% no-repeat' for c, x, y, w, h in parts)
    return f"'{layers}, #15151a'"

CAM, SCR, CHT = '#ff5900', '#4f7cff', '#5b5b66'
THUMBS = {
    'screen-cam': thumb([(SCR, 4, 20, 64, 62), (CAM, 96, 20, 26, 28), (CHT, 96, 86, 26, 50)]),
    'cam-full': thumb([(CAM, 50, 50, 92, 72)]),
    'cam-screen': thumb([(CAM, 4, 50, 40, 72), (SCR, 96, 30, 50, 40)]),
    'cam-center': thumb([(CAM, 50, 50, 62, 62)]),
    'screen-corner': thumb([(SCR, 0, 0, 100, 100), (CAM, 4, 86, 30, 28)]),
    'split': thumb([(CAM, 4, 50, 45, 72), (SCR, 96, 50, 45, 72)]),
}
swatches = '{ ' + ', '.join(f"'{k}': {v}" for k, v in THUMBS.items()) + ' }'

entry = f"""  {{
    id: 'camscene', name: 'Kamerka fullscreen', icon: '🎥', category: 'camscene', size: FULL_HD,
    description: 'Cała scena 1920×1080 z miejscem na kamerkę, grę i czat: różne układy, tła, ramki, napisy i staty FACEIT.',
    fields: [
      {{ group: 'Układ', key: 'layout', label: 'Układ sceny', type: 'select', default: 'screen-cam', swatches: {swatches}, options: [
        {{ value: 'screen-cam', label: 'Gra + kamerka + czat' }}, {{ value: 'cam-full', label: 'Kamera na cały ekran' }},
        {{ value: 'cam-screen', label: 'Kamerka + ekran' }}, {{ value: 'cam-center', label: 'Kamerka w centrum' }},
        {{ value: 'screen-corner', label: 'Gra z kamerką w rogu' }}, {{ value: 'split', label: 'Pół na pół' }},
      ] }},
      {{ group: 'Układ', key: 'mirror', label: 'Odwróć strony', type: 'toggle', default: false }},
      {{ group: 'Układ', key: 'chat', label: 'Miejsce na czat', type: 'toggle', default: true, when: {{ key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center'] }} }},
      {{ group: 'Układ', key: 'camSize', label: 'Wielkość kamerki', type: 'range', min: 0.6, max: 1.5, step: 0.05, default: 1, unit: '×', when: {{ key: 'layout', is: ['screen-cam', 'cam-screen', 'cam-center', 'screen-corner'] }} }},
      {{ group: 'Układ', key: 'camShape', label: 'Kształt kamerki', type: 'select', default: 'rect', options: [
        {{ value: 'rect', label: 'Prostokąt' }}, {{ value: 'circle', label: 'Koło' }},
      ] }},
      {{ group: 'Układ', key: 'gap', label: 'Odstępy', type: 'range', min: 0, max: 80, step: 2, default: 24, unit: 'px' }},
      {{ group: 'Układ', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 18, unit: 'px' }},
      {{ group: 'Ramki slotów', key: 'border', label: 'Styl ramek', type: 'select', default: 'gradient', options: [
        {{ value: 'gradient', label: 'Gradient' }}, {{ value: 'solid', label: 'Pełne' }}, {{ value: 'glow', label: 'Świecące' }},
        {{ value: 'glass', label: 'Szkło' }}, {{ value: 'none', label: 'Brak' }},
      ] }},
      {{ group: 'Ramki slotów', key: 'thickness', label: 'Grubość', type: 'range', min: 1, max: 20, step: 1, default: 4, unit: 'px', when: {{ key: 'border', is: ['gradient', 'solid', 'glow', 'glass'] }} }},
      {{ group: 'Ramki slotów', key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 40, step: 1, default: 14, unit: 'px', when: {{ key: 'border', is: ['gradient', 'solid', 'glow'] }} }},
      {{ group: 'Ramki slotów', key: 'anim', label: 'Obrót gradientu', type: 'select', default: 'spin', when: {{ key: 'border', is: ['gradient'] }}, options: [
        {{ value: 'spin', label: 'Tak' }}, {{ value: 'none', label: 'Nie' }},
      ] }},
      {{ group: 'Ramki slotów', key: 'speed', label: 'Prędkość obrotu', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1, unit: '×', when: [{{ key: 'border', is: ['gradient'] }}, {{ key: 'anim', is: ['spin'] }}] }},
      {{ group: 'Ramki slotów', key: 'frameChat', label: 'Ramka wokół czatu', type: 'toggle', default: true, when: [{{ key: 'chat', is: [true] }}, {{ key: 'border', is: ['gradient', 'solid', 'glow', 'glass'] }}] }},
      {{ group: 'Ramki slotów', key: 'showChatTitle', label: 'Pokaż nagłówek czatu', type: 'toggle', default: true, when: {{ key: 'chat', is: [true] }} }},
      {{ group: 'Ramki slotów', key: 'chatTitle', i18n: true, label: 'Nagłówek', type: 'text', default: 'CZAT', maxLength: 30, when: [{{ key: 'chat', is: [true] }}, {{ key: 'showChatTitle', is: [true] }}] }},
      {{ group: 'Tło', key: 'bg', label: 'Wybierz tło', type: 'select', default: 'aurora', options: BG_OPTIONS, swatches: BG_SWATCHES, when: {{ key: 'layout', is: ['screen-cam', 'cam-full', 'cam-screen', 'cam-center', 'split'] }} }},
      {{ group: 'Tło', key: 'bgImage', label: 'Adres obrazka', type: 'text', default: '', maxLength: 300, placeholder: 'https://...jpg', when: {{ key: 'bg', is: ['custom'] }} }},
      {{ group: 'Tło', key: 'bgDim', label: 'Przyciemnienie', type: 'range', min: 0, max: 0.9, step: 0.05, default: 0.35, when: {{ key: 'bg', is: [...PHOTO_IDS, 'custom'] }} }},
      {{ group: 'Tło', key: 'colors', label: 'Kolory motywu', type: 'colors', max: 3, default: ['#ff5900', '#ff2d6f', '#7a5cff'] }},
      {{ group: 'Tło', key: 'base', label: 'Kolor bazowy tła', type: 'color', default: '#07070c' }},
      {{ group: 'Tło', key: 'effect', label: 'Efekt na tle', type: 'select', default: 'none', options: [
        {{ value: 'none', label: 'Brak' }}, {{ value: 'stars', label: 'Gwiazdy' }}, {{ value: 'snow', label: 'Śnieg' }}, {{ value: 'fireflies', label: 'Świetliki' }},
        {{ value: 'confetti', label: 'Konfetti' }}, {{ value: 'petals', label: 'Płatki' }},
      ] }},
      {{ group: 'Tło', key: 'vignette', label: 'Winieta', type: 'toggle', default: true }},
      {{ group: 'Teksty', key: 'showTitle', label: 'Pokaż tytuł', type: 'toggle', default: true }},
      {{ group: 'Teksty', key: 'title', i18n: true, label: 'Tytuł', type: 'text', default: 'NA ŻYWO', maxLength: 50, when: {{ key: 'showTitle', is: [true] }} }},
      {{ group: 'Teksty', key: 'live', label: 'Kropka LIVE', type: 'toggle', default: true, when: {{ key: 'showTitle', is: [true] }} }},
      {{ group: 'Teksty', key: 'showClock', label: 'Pokaż zegar', type: 'toggle', default: true, when: {{ key: 'showTitle', is: [true] }} }},
      {{ group: 'Teksty', key: 'font', label: 'Czcionka', type: 'select', default: 'poppins', options: [
        {{ value: 'poppins', label: 'Poppins' }}, {{ value: 'bebas', label: 'Bebas' }}, {{ value: 'russo', label: 'Russo' }}, {{ value: 'orbitron', label: 'Orbitron' }}, {{ value: 'dm', label: 'DM Sans' }},
      ] }},
      {{ group: 'Teksty', key: 'showName', label: 'Pokaż podpis pod kamerką', type: 'toggle', default: true }},
      {{ group: 'Teksty', key: 'name', label: 'Nick', type: 'text', default: 'skullboypl', maxLength: 40, when: {{ key: 'showName', is: [true] }} }},
      {{ group: 'Teksty', key: 'showSub', label: 'Pokaż podpis', type: 'toggle', default: true, when: {{ key: 'showName', is: [true] }} }},
      {{ group: 'Teksty', key: 'sub', label: 'Podpis pod spodem', type: 'text', default: 'twitch.tv/skullboypl', maxLength: 60, when: [{{ key: 'showName', is: [true] }}, {{ key: 'showSub', is: [true] }}] }},
      {{ group: 'Teksty', key: 'textColor', label: 'Kolor tekstu', type: 'color', default: '#ffffff' }},
      {{ group: 'Sociale', key: 'showSocials', label: 'Pokaż sociale', type: 'toggle', default: true }},
      {{ group: 'Sociale', when: {{ key: 'showSocials', is: [true] }}, key: 'socials', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.gg/skullmedia | youtube.com/@skullboypl', maxLength: 300 }},
      {{ group: 'FACEIT', key: 'showFaceit', label: 'Pokaż staty FACEIT na kamerce', type: 'toggle', default: false }},
      {{ group: 'FACEIT', key: 'player', label: 'Nick albo player_id', type: 'text', default: '', maxLength: 300, placeholder: 'np. donk666', when: {{ key: 'showFaceit', is: [true] }} }},
      {{ group: 'FACEIT', key: 'look', label: 'Wygląd', type: 'select', default: 'pill', when: {{ key: 'showFaceit', is: [true] }}, options: [
        {{ value: 'card', label: 'Karta' }}, {{ value: 'pill', label: 'Pigułka' }}, {{ value: 'bar', label: 'Pasek' }},
        {{ value: 'minimal', label: 'Minimal' }}, {{ value: 'neon', label: 'Neon' }}, {{ value: 'hud', label: 'HUD' }},
      ] }},
      {{ group: 'FACEIT', key: 'statsPos', label: 'Pozycja', type: 'select', default: 'tr', when: {{ key: 'showFaceit', is: [true] }}, options: [
        {{ value: 'tl', label: 'Góra, lewo' }}, {{ value: 'tr', label: 'Góra, prawo' }}, {{ value: 'bl', label: 'Dół, lewo' }}, {{ value: 'br', label: 'Dół, prawo' }},
      ] }},
      {{ group: 'FACEIT', key: 'statsScale', label: 'Wielkość', type: 'range', min: 0.6, max: 3, step: 0.05, default: 1.4, unit: '×', when: {{ key: 'showFaceit', is: [true] }} }},
    ],
  }},
"""
anchor = "  {\n    id: 'fireworks',"
assert anchor in s
s = s.replace(anchor, entry + anchor, 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
