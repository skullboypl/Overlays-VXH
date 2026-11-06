"""Goal bar from the Twitch / YouTube API, and README: translations for patches-16.json + README env section."""
import json

LANGS = ['en', 'de', 'cs', 'es', 'fr', 'pt', 'ru', 'tr', 'uk']
D = {
    'Skąd liczba': ['Where the number comes from', 'Woher die Zahl kommt', 'Odkud číslo', 'De dónde sale el número', 'Source du nombre', 'De onde vem o número', 'Откуда число', 'Sayı nereden', 'Звідки число'],
    'Wpisuję sam': ['I type it myself', 'Ich trage sie selbst ein', 'Zadám sám', 'Lo escribo yo', 'Je la saisis moi-même', 'Eu digito', 'Ввожу сам', 'Kendim yazarım', 'Вводжу сам'],
    'Followy na Twitchu': ['Twitch followers', 'Twitch-Follower', 'Followeři na Twitchi', 'Seguidores de Twitch', 'Followers Twitch', 'Seguidores na Twitch', 'Фолловеры на Twitch', 'Twitch takipçileri', 'Фоловери на Twitch'],
    'Subskrypcje na YouTube': ['YouTube subscribers', 'YouTube-Abonnenten', 'Odběratelé na YouTube', 'Suscriptores de YouTube', 'Abonnés YouTube', 'Inscritos no YouTube', 'Подписчики на YouTube', 'YouTube aboneleri', 'Підписники на YouTube'],
    'Twitch i YouTube: liczba odświeża się sama co minutę. Wpisuję sam: np. zbiórka albo cel donejtów.': [
        'Twitch and YouTube: the number updates itself every minute. I type it myself: e.g. a fundraiser or donation goal.',
        'Twitch und YouTube: Die Zahl aktualisiert sich jede Minute selbst. Selbst eintragen: z. B. Spendenaktion oder Spendenziel.',
        'Twitch a YouTube: číslo se samo obnovuje každou minutu. Zadám sám: např. sbírka nebo cíl darů.',
        'Twitch y YouTube: el número se actualiza solo cada minuto. Lo escribo yo: p. ej. una colecta o meta de donaciones.',
        'Twitch et YouTube : le nombre se met à jour tout seul chaque minute. Je la saisis : par ex. une cagnotte ou un objectif de dons.',
        'Twitch e YouTube: o número se atualiza sozinho a cada minuto. Eu digito: ex. vaquinha ou meta de doações.',
        'Twitch и YouTube: число обновляется само раз в минуту. Ввожу сам: например, сбор или цель по донатам.',
        'Twitch ve YouTube: sayı her dakika kendiliğinden güncellenir. Kendim yazarım: ör. bağış kampanyası ya da bağış hedefi.',
        'Twitch і YouTube: число оновлюється саме щохвилини. Вводжу сам: наприклад, збір чи ціль донатів.'],
    'Kanał': ['Channel', 'Kanal', 'Kanál', 'Canal', 'Chaîne', 'Canal', 'Канал', 'Kanal', 'Канал'],
    'nick albo @handle': ['nick or @handle', 'Nick oder @Handle', 'nick nebo @handle', 'nick o @handle', 'pseudo ou @handle', 'nick ou @handle', 'ник или @handle', 'kullanıcı adı ya da @handle', 'нік або @handle'],
    'Pokaż avatar i nazwę kanału': ['Show channel avatar and name', 'Kanal-Avatar und -Name anzeigen', 'Ukázat avatar a název kanálu', 'Mostrar avatar y nombre del canal', 'Afficher l’avatar et le nom de la chaîne', 'Mostrar avatar e nome do canal', 'Показывать аватар и название канала', 'Kanal avatarını ve adını göster', 'Показувати аватар і назву каналу'],
    'Animacja „+1” przy nowym followie': ['“+1” animation on a new follow', '„+1“-Animation bei neuem Follow', 'Animace „+1“ při novém followu', 'Animación «+1» con cada nuevo seguidor', 'Animation « +1 » à chaque nouveau follow', 'Animação “+1” a cada novo seguidor', 'Анимация «+1» при новом фолловере', 'Yeni takipte “+1” animasyonu', 'Анімація «+1» при новому фоловері'],
    'Wkrótce': ['Coming soon', 'Demnächst', 'Brzy', 'Muy pronto', 'Bientôt', 'Em breve', 'Скоро', 'Yakında', 'Незабаром'],
    'Licznik followów z Twitcha pojawi się wkrótce': ['The Twitch follower counter is coming soon', 'Der Twitch-Follower-Zähler kommt bald', 'Počítadlo followerů z Twitche bude brzy', 'El contador de seguidores de Twitch llega pronto', 'Le compteur de followers Twitch arrive bientôt', 'O contador de seguidores da Twitch chega em breve', 'Счётчик фолловеров Twitch скоро появится', 'Twitch takipçi sayacı yakında geliyor', 'Лічильник фоловерів Twitch незабаром з’явиться'],
    'Licznik subskrypcji z YouTube pojawi się wkrótce': ['The YouTube subscriber counter is coming soon', 'Der YouTube-Abonnenten-Zähler kommt bald', 'Počítadlo odběratelů z YouTube bude brzy', 'El contador de suscriptores de YouTube llega pronto', 'Le compteur d’abonnés YouTube arrive bientôt', 'O contador de inscritos do YouTube chega em breve', 'Счётчик подписчиков YouTube скоро появится', 'YouTube abone sayacı yakında geliyor', 'Лічильник підписників YouTube незабаром з’явиться'],
    'Nie ma takiego kanału': ['No such channel', 'Kanal nicht gefunden', 'Takový kanál neexistuje', 'Ese canal no existe', 'Cette chaîne n’existe pas', 'Esse canal não existe', 'Такого канала нет', 'Böyle bir kanal yok', 'Такого каналу немає'],
    'Wpisz nazwę kanału': ['Type the channel name', 'Kanalnamen eingeben', 'Napiš název kanálu', 'Escribe el nombre del canal', 'Saisis le nom de la chaîne', 'Digite o nome do canal', 'Введи название канала', 'Kanal adını yaz', 'Введи назву каналу'],
    'Ten kanał ukrywa liczbę subskrypcji': ['This channel hides its subscriber count', 'Dieser Kanal verbirgt die Abonnentenzahl', 'Tento kanál skrývá počet odběratelů', 'Este canal oculta sus suscriptores', 'Cette chaîne masque son nombre d’abonnés', 'Este canal oculta os inscritos', 'Этот канал скрывает число подписчиков', 'Bu kanal abone sayısını gizliyor', 'Цей канал приховує кількість підписників'],
    'Nie udało się pobrać liczby, pokazuję wpisaną': ['Could not fetch the number, showing the typed one', 'Zahl konnte nicht geladen werden, zeige die eingetragene', 'Číslo se nepodařilo načíst, ukazuji zadané', 'No se pudo obtener el número, muestro el escrito', 'Impossible de récupérer le nombre, j’affiche celui saisi', 'Não foi possível buscar o número, mostrando o digitado', 'Не удалось получить число, показываю введённое', 'Sayı alınamadı, yazılanı gösteriyorum', 'Не вдалося отримати число, показую введене'],
}
out = {lang: {} for lang in LANGS}
for k, v in D.items():
    assert len(v) == 9, k
    for lang, t in zip(LANGS, v):
        out[lang][k] = t
with open(r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/i18n/patches-16.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

p = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/README.md'
s = open(p, encoding='utf-8').read()
a = ' Aplikacja nie potrzebuje żadnych zmiennych środowiskowych.'
b = ''' Strona działa bez zmiennych środowiskowych.

Opcjonalne zmienne (CapRover → aplikacja → **App Configs → Environmental Variables**), potrzebne tylko do paska celu z liczbą z API:

| Zmienna | Do czego |
|---|---|
| `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Followy z Twitcha (aplikacja z [dev.twitch.tv](https://dev.twitch.tv/console/apps), token aplikacji, bez logowania streamera) |
| `YOUTUBE_API_KEY` | Subskrypcje z YouTube (klucz YouTube Data API v3) |

Bez nich pasek celu przy Twitchu i YouTube pokazuje „Wkrótce”, a tryb „Wpisuję sam” działa normalnie. W tym samym kontenerze co nginx działa mały serwer [`deploy/stats-server.mjs`](deploy/stats-server.mjs): licznik overlayów otwartych w OBS (`/api/presence`) i liczba followów (`/api/followers`).'''
assert s.count(a) == 1
s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
