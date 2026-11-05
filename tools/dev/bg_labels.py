"""Photo background list read from src/overlays/photo-bgs.json, Polish names for the new 4K backgrounds."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/overlays/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:90])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


edit('backgrounds.ts', [
    ("// Photo backgrounds generated locally (ComfyUI + Flux1-dev), stored as public/bg/<id>.webp and <id>-thumb.webp.\n"
     "export const PHOTO_IDS = ['cozy', 'city', 'winter', 'xmas', 'halloween', 'nebula', 'sunset', 'abstract', 'sakura', 'beach'];",
     "import photoBgs from './photo-bgs.json';\n\n"
     "// Photo backgrounds generated locally (ComfyUI + Flux1-dev + 4x-UltraSharp, 3840x2160), stored as\n"
     "// public/bg/<id>.webp and <id>-thumb.webp. tools/ai/gen_bgs.py adds each id to photo-bgs.json once its file exists.\n"
     "export const PHOTO_IDS: string[] = photoBgs;"),
])
edit('registry.ts', [
    ("  nebula: 'Mgławica', sunset: 'Zachód anime', abstract: 'Abstrakcja 3D', sakura: 'Sakura nocą', beach: 'Plaża',\n};",
     "  nebula: 'Mgławica', sunset: 'Zachód anime', abstract: 'Abstrakcja 3D', sakura: 'Sakura nocą', beach: 'Plaża',\n"
     "  'xmas-village': 'Święta: zimowe miasteczko', 'xmas-cabin': 'Święta: chatka z kominkiem', 'xmas-bokeh': 'Święta: lampki choinki',\n"
     "  'winter-lake': 'Zima: zamarznięte jezioro', 'winter-street': 'Zima: śnieżna ulica', 'winter-pines': 'Zima: las nocą',\n"
     "  'ny-fireworks': 'Sylwester: fajerwerki nad miastem', 'ny-party': 'Sylwester: szampan', 'ny-gold': 'Sylwester: złote konfetti',\n"
     "  'val-roses': 'Walentynki: róże i świece', 'val-hearts': 'Walentynki: serduszka', 'val-city': 'Walentynki: most o zmierzchu',\n"
     "  'easter-meadow': 'Wielkanoc: łąka z pisankami', 'easter-table': 'Wielkanoc: śniadanie', 'easter-garden': 'Wielkanoc: kwitnący ogród',\n"
     "  'hw-mansion': 'Halloween: nawiedzony dwór', 'hw-forest': 'Halloween: las z dyniami', 'hw-witch': 'Halloween: chatka czarownicy',\n"
     "  'pl-oldtown': '11.11: Stare Miasto', 'pl-flags': '11.11: flagi', 'pl-tatra': '11.11: Tatry o świcie',\n"
     "  'bday-party': 'Urodziny: impreza', 'bday-cake': 'Urodziny: tort', 'bday-neon': 'Urodziny: neonowy klub',\n"
     "  'gaming-room': 'Pokój gamingowy', 'space-window': 'Okno statku kosmicznego', 'rainy-cafe': 'Kawiarnia w deszczu',\n"
     "  'aurora-peaks': 'Zorza nad górami', 'cyber-alley': 'Cyberpunkowa uliczka', underwater: 'Rafa koralowa',\n};"),
])
print('ok')
