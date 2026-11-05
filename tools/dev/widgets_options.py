"""Expanded options for the ticker and the socials rotator (registry fields)."""
p = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/registry.ts'
s = open(p, encoding='utf-8').read()


def block(id_):
    i = s.index(f"id: '{id_}'")
    j = s.index("    fields: [", i) + len("    fields: [")
    k = s.index("\n    ],\n  },", j)
    return j, k


TICKER = """
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
      { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },"""

SOCIALS = """
      { group: 'Kanały', key: 'items', label: 'Twoje kanały', type: 'text', list: 'socials', default: 'twitch.tv/skullboypl | discord.skullmedia.pl | youtube.com/@skullboypl | tiktok.com/@skullboypl', maxLength: 300 },
      { group: 'Kanały', key: 'layout', label: 'Układ', type: 'select', default: 'one', options: [
        { value: 'one', label: 'Jeden na raz' }, { value: 'row', label: 'Wszystkie w rzędzie' }, { value: 'column', label: 'Wszystkie w kolumnie' },
      ], hint: 'Przy rzędzie i kolumnie aktywny kanał jest podświetlany po kolei.' },
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
      { group: 'Kolory', key: 'progress', label: 'Pasek czasu', type: 'toggle', default: true },"""

j, k = block('ticker')
s = s[:j] + TICKER + s[k:]
j, k = block('socials')
s = s[:j] + SOCIALS + s[k:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
