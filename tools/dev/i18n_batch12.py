"""Socials rotator layouts and looks: translations for patches-12.json."""
import json

KEYS = [
    '6 układów i 18 motywów wyglądu',
    '7 animacji zmiany',
    'Esport (skos)',
    'Ikona w bloku',
    'Ikony, napis przy aktywnym',
    'Jasny',
    'Kolor serwisu',
    'Krążąca ramka',
    'Połysk',
    'Przewijane w pętli',
    'Przy przewijaniu: tyle sekund na jeden kanał',
    'Przycisk 3D',
    'Przygaś nieaktywne',
    'Retro (twardy cień)',
    'Rotator sociali pokazuje Twoje kanały po kolei: jeden na raz, w rzędzie, w kolumnie, w siatce, jako ikony albo przewijane w pętli. Ikona i kolor dobierają się same po wybranym serwisie, a rozmiar dopasowuje się do źródła w OBS.',
    'Rozmiar dopasowuje się sam do źródła w OBS, więc nic się nie ucina. Do rzędu i przewijania najlepsze jest szerokie źródło, np. 1400 × 100, do kolumny wysokie, np. 420 × 320.',
    'Siatka 2 kolumny',
    'Ścięte rogi',
]

T = {
    'en': [
        '6 layouts and 18 looks', '7 change animations', 'Esports (slanted)', 'Icon in a block', 'Icons, text on the active one',
        'Light', 'Service colour', 'Running border', 'Shine', 'Scrolling loop', 'When scrolling: seconds per channel',
        '3D button', 'Dim the inactive ones', 'Retro (hard shadow)',
        'The socials rotator shows your channels in turn: one at a time, in a row, in a column, in a grid, as icons or scrolling in a loop. The icon and colour match the service automatically, and the size adapts to the OBS source.',
        'The size adapts to the OBS source on its own, so nothing gets cut off. A row or scrolling loop works best in a wide source, e.g. 1400 × 100, a column in a tall one, e.g. 420 × 320.',
        '2-column grid', 'Cut corners',
    ],
    'de': [
        '6 Layouts und 18 Designs', '7 Wechselanimationen', 'Esport (schräg)', 'Icon im Block', 'Icons, Text beim aktiven',
        'Hell', 'Farbe des Dienstes', 'Umlaufender Rahmen', 'Glanz', 'Endlos-Laufband', 'Beim Laufband: Sekunden pro Kanal',
        '3D-Button', 'Inaktive abdunkeln', 'Retro (harter Schatten)',
        'Der Social-Rotator zeigt deine Kanäle nacheinander: einzeln, in einer Reihe, in einer Spalte, im Raster, als Icons oder als Endlos-Laufband. Icon und Farbe passen sich automatisch an den Dienst an, die Größe an die OBS-Quelle.',
        'Die Größe passt sich automatisch an die OBS-Quelle an, damit nichts abgeschnitten wird. Für Reihe und Laufband eignet sich eine breite Quelle, z. B. 1400 × 100, für die Spalte eine hohe, z. B. 420 × 320.',
        'Raster mit 2 Spalten', 'Abgeschnittene Ecken',
    ],
    'cs': [
        '6 rozvržení a 18 vzhledů', '7 animací přechodu', 'Esport (zkosené)', 'Ikona v bloku', 'Ikony, text u aktivní',
        'Světlý', 'Barva služby', 'Obíhající rámeček', 'Lesk', 'Posuvná smyčka', 'Při posouvání: sekundy na jeden kanál',
        '3D tlačítko', 'Ztlumit neaktivní', 'Retro (tvrdý stín)',
        'Rotátor sociálních sítí ukazuje tvé kanály postupně: jeden po druhém, v řadě, ve sloupci, v mřížce, jako ikony nebo posuvné ve smyčce. Ikona a barva se nastaví podle služby a velikost se přizpůsobí zdroji v OBS.',
        'Velikost se sama přizpůsobí zdroji v OBS, takže se nic neusekne. Pro řadu a posouvání se hodí široký zdroj, např. 1400 × 100, pro sloupec vysoký, např. 420 × 320.',
        'Mřížka 2 sloupce', 'Seříznuté rohy',
    ],
    'es': [
        '6 diseños y 18 estilos', '7 animaciones de cambio', 'Esports (inclinado)', 'Icono en bloque', 'Iconos, texto en el activo',
        'Claro', 'Color del servicio', 'Borde giratorio', 'Brillo', 'Desplazamiento en bucle', 'Al desplazar: segundos por canal',
        'Botón 3D', 'Atenuar los inactivos', 'Retro (sombra dura)',
        'El rotador de redes muestra tus canales por turnos: de uno en uno, en fila, en columna, en cuadrícula, como iconos o desplazándose en bucle. El icono y el color se ajustan solos al servicio, y el tamaño se adapta a la fuente de OBS.',
        'El tamaño se adapta solo a la fuente de OBS, así que nada se corta. Para la fila y el desplazamiento usa una fuente ancha, p. ej. 1400 × 100; para la columna, una alta, p. ej. 420 × 320.',
        'Cuadrícula de 2 columnas', 'Esquinas cortadas',
    ],
    'fr': [
        '6 dispositions et 18 styles', '7 animations de transition', 'Esport (incliné)', 'Icône dans un bloc', 'Icônes, texte sur l’actif',
        'Clair', 'Couleur du service', 'Bordure tournante', 'Reflet', 'Défilement en boucle', 'En défilement : secondes par chaîne',
        'Bouton 3D', 'Atténuer les inactifs', 'Rétro (ombre dure)',
        'Le rotateur de réseaux affiche tes chaînes à tour de rôle : une à la fois, en ligne, en colonne, en grille, en icônes ou en défilement continu. L’icône et la couleur suivent le service choisi, et la taille s’adapte à la source OBS.',
        'La taille s’adapte toute seule à la source OBS, rien n’est coupé. Pour la ligne et le défilement, prends une source large, par ex. 1400 × 100 ; pour la colonne, une source haute, par ex. 420 × 320.',
        'Grille à 2 colonnes', 'Coins coupés',
    ],
    'pt': [
        '6 layouts e 18 estilos', '7 animações de troca', 'Esports (inclinado)', 'Ícone em bloco', 'Ícones, texto no ativo',
        'Claro', 'Cor do serviço', 'Borda giratória', 'Brilho', 'Rolagem em loop', 'Na rolagem: segundos por canal',
        'Botão 3D', 'Escurecer os inativos', 'Retrô (sombra dura)',
        'O rotador de redes mostra seus canais em sequência: um por vez, em linha, em coluna, em grade, como ícones ou rolando em loop. O ícone e a cor seguem o serviço escolhido, e o tamanho se ajusta à fonte do OBS.',
        'O tamanho se ajusta sozinho à fonte do OBS, então nada é cortado. Para linha e rolagem use uma fonte larga, ex. 1400 × 100; para coluna, uma alta, ex. 420 × 320.',
        'Grade de 2 colunas', 'Cantos cortados',
    ],
    'ru': [
        '6 макетов и 18 стилей', '7 анимаций смены', 'Киберспорт (наклон)', 'Иконка в блоке', 'Иконки, текст у активной',
        'Светлый', 'Цвет сервиса', 'Бегущая рамка', 'Блик', 'Бегущая строка', 'При прокрутке: секунд на один канал',
        '3D-кнопка', 'Приглушать неактивные', 'Ретро (жёсткая тень)',
        'Ротатор соцсетей показывает твои каналы по очереди: по одному, в ряд, в колонку, сеткой, иконками или бегущей строкой. Иконка и цвет подбираются по сервису, а размер подстраивается под источник в OBS.',
        'Размер сам подстраивается под источник в OBS, поэтому ничего не обрезается. Для ряда и прокрутки лучше широкий источник, например 1400 × 100, для колонки — высокий, например 420 × 320.',
        'Сетка в 2 колонки', 'Срезанные углы',
    ],
    'tr': [
        '6 düzen ve 18 görünüm', '7 geçiş animasyonu', 'Espor (eğik)', 'Blok içinde simge', 'Simgeler, yazı aktif olanda',
        'Açık', 'Servis rengi', 'Dönen çerçeve', 'Parlama', 'Döngüde kayan', 'Kayarken: kanal başına saniye',
        '3D düğme', 'Aktif olmayanları soluklaştır', 'Retro (sert gölge)',
        'Sosyal medya döndürücü kanallarını sırayla gösterir: tek tek, yan yana, alt alta, ızgarada, simge olarak ya da döngüde kayarak. Simge ve renk servise göre kendiliğinden seçilir, boyut da OBS kaynağına uyar.',
        'Boyut OBS kaynağına kendiliğinden uyar, böylece hiçbir şey kesilmez. Satır ve kayan düzen için geniş bir kaynak, ör. 1400 × 100, sütun için yüksek bir kaynak, ör. 420 × 320 kullan.',
        '2 sütunlu ızgara', 'Kesik köşeler',
    ],
    'uk': [
        '6 макетів і 18 стилів', '7 анімацій зміни', 'Кіберспорт (нахил)', 'Іконка в блоці', 'Іконки, текст в активної',
        'Світлий', 'Колір сервісу', 'Рухома рамка', 'Відблиск', 'Біжучий рядок', 'Під час прокрутки: секунд на один канал',
        '3D-кнопка', 'Приглушувати неактивні', 'Ретро (жорстка тінь)',
        'Ротатор соцмереж показує твої канали по черзі: по одному, в ряд, у колонку, сіткою, іконками або біжучим рядком. Іконка й колір підбираються за сервісом, а розмір підлаштовується під джерело в OBS.',
        'Розмір сам підлаштовується під джерело в OBS, тож нічого не обрізається. Для ряду та прокрутки краще широке джерело, наприклад 1400 × 100, для колонки — високе, наприклад 420 × 320.',
        'Сітка у 2 колонки', 'Зрізані кути',
    ],
}

out = {}
for lang, vals in T.items():
    assert len(vals) == len(KEYS), (lang, len(vals))
    out[lang] = dict(zip(KEYS, vals))
with open(r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/i18n/patches-12.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('ok')
