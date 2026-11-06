"""Live counter and the reorganised overlay menu: translations for patches-14.json."""
import json

KEYS = [
    'Ekrany na stream', 'Gotowy układ sceny', 'Impreza i święta',
    'Liczymy źródła otwarte w OBS w ostatnich 3 minutach, anonimowo.',
    'Na razie nikt nie ma otwartego overlayu. Bądź pierwszy!', 'Na źródło kamerki',
    'Nic nie pasuje. Spróbuj innego słowa.', 'Paski i sociale', 'Pogoda i natura', 'Rekord dziś',
    'Sceny z kamerką', 'Styl obrazu', 'Szukaj overlayu', 'Szukaj: śnieg, ramka, BRB...', 'Światło i klimat',
    'Teraz w OBS', 'w OBS teraz', 'Wyczyść', 'Wyniki',
]
T = {
    'en': ['Stream screens', 'Ready-made scene layout', 'Party and holidays',
           'We count sources open in OBS in the last 3 minutes, anonymously.',
           'Nobody has an overlay open yet. Be the first!', 'On the webcam source',
           'Nothing matches. Try another word.', 'Bars and socials', 'Weather and nature', 'Today’s peak',
           'Scenes with a webcam', 'Image style', 'Search overlays', 'Search: snow, frame, BRB...', 'Light and mood',
           'Live in OBS now', 'in OBS now', 'Clear', 'Results'],
    'de': ['Stream-Bildschirme', 'Fertiges Szenenlayout', 'Party und Feiertage',
           'Wir zählen anonym Quellen, die in den letzten 3 Minuten in OBS offen waren.',
           'Noch hat niemand ein Overlay offen. Sei der Erste!', 'Auf die Webcam-Quelle',
           'Nichts gefunden. Versuch ein anderes Wort.', 'Leisten und Socials', 'Wetter und Natur', 'Heutiger Rekord',
           'Szenen mit Webcam', 'Bildstil', 'Overlays suchen', 'Suche: Schnee, Rahmen, BRB...', 'Licht und Stimmung',
           'Jetzt in OBS', 'jetzt in OBS', 'Leeren', 'Ergebnisse'],
    'cs': ['Obrazovky na stream', 'Hotové rozvržení scény', 'Párty a svátky',
           'Anonymně počítáme zdroje otevřené v OBS za poslední 3 minuty.',
           'Zatím nikdo nemá otevřený overlay. Buď první!', 'Na zdroj kamery',
           'Nic neodpovídá. Zkus jiné slovo.', 'Lišty a sociální sítě', 'Počasí a příroda', 'Dnešní rekord',
           'Scény s kamerou', 'Styl obrazu', 'Hledat overlay', 'Hledat: sníh, rámeček, BRB...', 'Světlo a atmosféra',
           'Teď v OBS', 'teď v OBS', 'Vymazat', 'Výsledky'],
    'es': ['Pantallas del stream', 'Escena lista para usar', 'Fiesta y festivos',
           'Contamos de forma anónima las fuentes abiertas en OBS en los últimos 3 minutos.',
           'Todavía nadie tiene un overlay abierto. ¡Sé el primero!', 'Sobre la fuente de la cámara',
           'Nada coincide. Prueba otra palabra.', 'Barras y redes', 'Clima y naturaleza', 'Récord de hoy',
           'Escenas con cámara', 'Estilo de imagen', 'Buscar overlay', 'Buscar: nieve, marco, BRB...', 'Luz y ambiente',
           'Ahora en OBS', 'ahora en OBS', 'Borrar', 'Resultados'],
    'fr': ['Écrans du stream', 'Scène prête à l’emploi', 'Fête et jours fériés',
           'Nous comptons de façon anonyme les sources ouvertes dans OBS ces 3 dernières minutes.',
           'Personne n’a encore d’overlay ouvert. Sois le premier !', 'Sur la source webcam',
           'Aucun résultat. Essaie un autre mot.', 'Bandeaux et réseaux', 'Météo et nature', 'Record du jour',
           'Scènes avec webcam', 'Style d’image', 'Rechercher un overlay', 'Rechercher : neige, cadre, BRB...', 'Lumière et ambiance',
           'Dans OBS en ce moment', 'dans OBS maintenant', 'Effacer', 'Résultats'],
    'pt': ['Telas do stream', 'Layout de cena pronto', 'Festa e feriados',
           'Contamos anonimamente as fontes abertas no OBS nos últimos 3 minutos.',
           'Ninguém tem um overlay aberto ainda. Seja o primeiro!', 'Na fonte da câmera',
           'Nada encontrado. Tente outra palavra.', 'Barras e redes', 'Clima e natureza', 'Recorde de hoje',
           'Cenas com câmera', 'Estilo de imagem', 'Buscar overlay', 'Buscar: neve, moldura, BRB...', 'Luz e clima',
           'Agora no OBS', 'agora no OBS', 'Limpar', 'Resultados'],
    'ru': ['Экраны стрима', 'Готовая сцена', 'Праздники и вечеринки',
           'Анонимно считаем источники, открытые в OBS за последние 3 минуты.',
           'Пока ни у кого не открыт оверлей. Будь первым!', 'На источник камеры',
           'Ничего не найдено. Попробуй другое слово.', 'Плашки и соцсети', 'Погода и природа', 'Рекорд за сегодня',
           'Сцены с камерой', 'Стиль изображения', 'Поиск оверлея', 'Поиск: снег, рамка, BRB...', 'Свет и атмосфера',
           'Сейчас в OBS', 'сейчас в OBS', 'Очистить', 'Результаты'],
    'tr': ['Yayın ekranları', 'Hazır sahne düzeni', 'Parti ve bayramlar',
           'Son 3 dakikada OBS’te açık olan kaynakları anonim olarak sayıyoruz.',
           'Henüz kimsede açık bir overlay yok. İlk sen ol!', 'Kamera kaynağının üstüne',
           'Eşleşen bir şey yok. Başka bir kelime dene.', 'Bantlar ve sosyal medya', 'Hava ve doğa', 'Bugünün rekoru',
           'Kameralı sahneler', 'Görüntü stili', 'Overlay ara', 'Ara: kar, çerçeve, BRB...', 'Işık ve atmosfer',
           'Şu an OBS’te', 'şu an OBS’te', 'Temizle', 'Sonuçlar'],
    'uk': ['Екрани стріму', 'Готова сцена', 'Свята й вечірки',
           'Анонімно рахуємо джерела, відкриті в OBS за останні 3 хвилини.',
           'Поки ні в кого не відкритий оверлей. Будь першим!', 'На джерело камери',
           'Нічого не знайдено. Спробуй інше слово.', 'Плашки й соцмережі', 'Погода й природа', 'Рекорд за сьогодні',
           'Сцени з камерою', 'Стиль зображення', 'Пошук оверлею', 'Пошук: сніг, рамка, BRB...', 'Світло й атмосфера',
           'Зараз в OBS', 'зараз в OBS', 'Очистити', 'Результати'],
}
out = {}
for lang, v in T.items():
    assert len(v) == len(KEYS), (lang, len(v))
    out[lang] = dict(zip(KEYS, v))
with open(r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/i18n/patches-14.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('ok')
