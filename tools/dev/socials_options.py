"""Socials rotator: six layouts, eighteen looks, dimming toggle."""
p = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/registry.ts'
s = open(p, encoding='utf-8').read()

def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)

rep("""        { value: 'one', label: 'Jeden na raz' }, { value: 'row', label: 'Wszystkie w rzędzie' }, { value: 'column', label: 'Wszystkie w kolumnie' },
      ], hint: 'Przy rzędzie i kolumnie aktywny kanał jest podświetlany po kolei. Dla rzędu ustaw szersze źródło w OBS, np. 1400 × 100.' },""",
"""        { value: 'one', label: 'Jeden na raz' }, { value: 'row', label: 'Wszystkie w rzędzie' }, { value: 'column', label: 'Wszystkie w kolumnie' },
        { value: 'grid', label: 'Siatka 2 kolumny' }, { value: 'icons', label: 'Ikony, napis przy aktywnym' }, { value: 'marquee', label: 'Przewijane w pętli' },
      ], hint: 'Rozmiar dopasowuje się sam do źródła w OBS, więc nic się nie ucina. Do rzędu i przewijania najlepsze jest szerokie źródło, np. 1400 × 100, do kolumny wysokie, np. 420 × 320.' },""")
rep("""      { group: 'Kanały', key: 'every', label: 'Zmiana co', type: 'range', min: 2, max: 30, step: 1, default: 5, unit: 's' },""",
"""      { group: 'Kanały', key: 'every', label: 'Zmiana co', type: 'range', min: 2, max: 30, step: 1, default: 5, unit: 's', hint: 'Przy przewijaniu: tyle sekund na jeden kanał' },
      { group: 'Kanały', key: 'dimOthers', label: 'Przygaś nieaktywne', type: 'toggle', default: true, when: { key: 'layout', is: ['row', 'column', 'grid', 'icons'] } },""")
rep("""        { value: 'pill', label: 'Pigułka' }, { value: 'card', label: 'Karta' }, { value: 'glass', label: 'Szkło' }, { value: 'neon', label: 'Neon' },
        { value: 'gradient', label: 'Gradient' }, { value: 'outline', label: 'Kontur' }, { value: 'underline', label: 'Podkreślenie' }, { value: 'clean', label: 'Bez tła' },
      ] },""",
"""        { value: 'pill', label: 'Pigułka' }, { value: 'card', label: 'Karta' }, { value: 'glass', label: 'Szkło' }, { value: 'neon', label: 'Neon' },
        { value: 'gradient', label: 'Gradient' }, { value: 'outline', label: 'Kontur' }, { value: 'underline', label: 'Podkreślenie' }, { value: 'clean', label: 'Bez tła' },
        { value: 'brand', label: 'Kolor serwisu' }, { value: 'split', label: 'Ikona w bloku' }, { value: 'skew', label: 'Esport (skos)' }, { value: 'cut', label: 'Ścięte rogi' },
        { value: 'retro', label: 'Retro (twardy cień)' }, { value: 'light', label: 'Jasny' }, { value: 'button3d', label: 'Przycisk 3D' }, { value: 'tag', label: 'Etykieta' },
        { value: 'glow', label: 'Krążąca ramka' }, { value: 'shine', label: 'Połysk' },
      ] },""")
rep("""      { group: 'Wygląd', key: 'gap', label: 'Odstęp', type: 'range', min: 0, max: 60, step: 1, default: 14, unit: 'px', when: { key: 'layout', is: ['row', 'column'] } },
      { group: 'Wygląd', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 40, unit: 'px', when: { key: 'style', is: ['pill', 'glass', 'neon', 'gradient', 'outline'] } },""",
"""      { group: 'Wygląd', key: 'gap', label: 'Odstęp', type: 'range', min: 0, max: 60, step: 1, default: 14, unit: 'px', when: { key: 'layout', is: ['row', 'column', 'grid', 'icons', 'marquee'] } },
      { group: 'Wygląd', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 40, unit: 'px', when: { key: 'style', is: ['pill', 'glass', 'neon', 'gradient', 'outline', 'brand', 'light', 'button3d', 'glow', 'shine'] } },""")
rep("""      { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114', when: { key: 'style', is: ['pill', 'card', 'glass', 'neon', 'gradient'] } },
      { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
      { group: 'Kolory', key: 'progress', label: 'Pasek czasu', type: 'toggle', default: true },""",
"""      { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114', when: { key: 'style', is: ['pill', 'card', 'glass', 'neon', 'gradient', 'split', 'skew', 'cut', 'retro', 'button3d', 'tag', 'glow', 'shine'] } },
      { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff', when: { key: 'style', is: ['pill', 'card', 'glass', 'neon', 'gradient', 'outline', 'underline', 'clean', 'split', 'skew', 'cut', 'retro', 'button3d', 'tag', 'glow', 'shine'] } },
      { group: 'Kolory', key: 'progress', label: 'Pasek czasu', type: 'toggle', default: true, when: { key: 'layout', is: ['one', 'row', 'column', 'grid', 'icons'] } },""")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
