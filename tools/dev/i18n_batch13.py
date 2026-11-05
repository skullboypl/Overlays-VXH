"""Neon frame versions: translations for patches-13.json."""
import json

KEYS = [
    'Neon: cienka linia',
    'Neon: girlanda',
    'Neon: pastelowe ikony',
    'Neon: retro synthwave',
    'Realistyczne (5 wersji), 3D, Kreskówka i Neony (kilka wersji) to ramki wygenerowane AI z animacją; 3D pływa w perspektywie, Neon migocze',
]
T = {
    'en': ['Neon: thin line', 'Neon: garland', 'Neon: pastel icons', 'Neon: retro synthwave',
           'Realistic (5 versions), 3D, Cartoon and Neons (several versions) are AI-generated frames with animation; 3D floats in perspective, Neon flickers'],
    'de': ['Neon: dünne Linie', 'Neon: Girlande', 'Neon: Pastell-Icons', 'Neon: Retro-Synthwave',
           'Realistisch (5 Versionen), 3D, Cartoon und Neons (mehrere Versionen) sind KI-generierte Rahmen mit Animation; 3D schwebt in der Perspektive, Neon flackert'],
    'cs': ['Neon: tenká linka', 'Neon: girlanda', 'Neon: pastelové ikony', 'Neon: retro synthwave',
           'Realistické (5 verzí), 3D, Kreslené a Neony (několik verzí) jsou rámečky vytvořené AI s animací; 3D se vznáší v perspektivě, Neon bliká'],
    'es': ['Neón: línea fina', 'Neón: guirnalda', 'Neón: iconos pastel', 'Neón: synthwave retro',
           'Realista (5 versiones), 3D, Dibujo y Neones (varias versiones) son marcos generados por IA con animación; el 3D flota en perspectiva y el Neón parpadea'],
    'fr': ['Néon : ligne fine', 'Néon : guirlande', 'Néon : icônes pastel', 'Néon : synthwave rétro',
           'Réaliste (5 versions), 3D, Cartoon et Néons (plusieurs versions) sont des cadres générés par IA et animés ; la 3D flotte en perspective, le Néon scintille'],
    'pt': ['Neon: linha fina', 'Neon: guirlanda', 'Neon: ícones pastel', 'Neon: synthwave retrô',
           'Realista (5 versões), 3D, Desenho e Neons (várias versões) são molduras geradas por IA com animação; o 3D flutua em perspectiva e o Neon pisca'],
    'ru': ['Неон: тонкая линия', 'Неон: гирлянда', 'Неон: пастельные иконки', 'Неон: ретро-синтвейв',
           'Реалистичные (5 версий), 3D, Мультяшная и Неоны (несколько версий) — рамки, созданные ИИ, с анимацией; 3D плывёт в перспективе, Неон мерцает'],
    'tr': ['Neon: ince çizgi', 'Neon: girlanda', 'Neon: pastel simgeler', 'Neon: retro synthwave',
           'Gerçekçi (5 sürüm), 3D, Çizgi film ve Neonlar (birkaç sürüm) animasyonlu, yapay zekâyla üretilmiş çerçevelerdir; 3D perspektifte süzülür, Neon titrer'],
    'uk': ['Неон: тонка лінія', 'Неон: гірлянда', 'Неон: пастельні іконки', 'Неон: ретро-синтвейв',
           'Реалістичні (5 версій), 3D, Мультяшна та Неони (кілька версій) — рамки, створені ШІ, з анімацією; 3D пливе в перспективі, Неон мерехтить'],
}
out = {lang: dict(zip(KEYS, v)) for lang, v in T.items() if len(v) == len(KEYS)}
assert len(out) == 9
with open(r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/i18n/patches-13.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('ok')
