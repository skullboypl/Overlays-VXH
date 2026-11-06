"""Kick in the goal bar: translations for patches-17.json."""
import json

LANGS = ['en', 'de', 'cs', 'es', 'fr', 'pt', 'ru', 'tr', 'uk']
D = {
    'Followy na Kicku': ['Kick followers', 'Kick-Follower', 'Followeři na Kicku', 'Seguidores de Kick', 'Followers Kick', 'Seguidores no Kick', 'Фолловеры на Kick', 'Kick takipçileri', 'Фоловери на Kick'],
    'Licznik followów z Kicka pojawi się wkrótce': ['The Kick follower counter is coming soon', 'Der Kick-Follower-Zähler kommt bald', 'Počítadlo followerů z Kicku bude brzy', 'El contador de seguidores de Kick llega pronto', 'Le compteur de followers Kick arrive bientôt', 'O contador de seguidores do Kick chega em breve', 'Счётчик фолловеров Kick скоро появится', 'Kick takipçi sayacı yakında geliyor', 'Лічильник фоловерів Kick незабаром з’явиться'],
    'Twitch, Kick i YouTube: liczba odświeża się sama co minutę. Wpisuję sam: np. zbiórka albo cel donejtów.': [
        'Twitch, Kick and YouTube: the number updates itself every minute. I type it myself: e.g. a fundraiser or donation goal.',
        'Twitch, Kick und YouTube: Die Zahl aktualisiert sich jede Minute selbst. Selbst eintragen: z. B. Spendenaktion oder Spendenziel.',
        'Twitch, Kick a YouTube: číslo se samo obnovuje každou minutu. Zadám sám: např. sbírka nebo cíl darů.',
        'Twitch, Kick y YouTube: el número se actualiza solo cada minuto. Lo escribo yo: p. ej. una colecta o meta de donaciones.',
        'Twitch, Kick et YouTube : le nombre se met à jour tout seul chaque minute. Je la saisis : par ex. une cagnotte ou un objectif de dons.',
        'Twitch, Kick e YouTube: o número se atualiza sozinho a cada minuto. Eu digito: ex. vaquinha ou meta de doações.',
        'Twitch, Kick и YouTube: число обновляется само раз в минуту. Ввожу сам: например, сбор или цель по донатам.',
        'Twitch, Kick ve YouTube: sayı her dakika kendiliğinden güncellenir. Kendim yazarım: ör. bağış kampanyası ya da bağış hedefi.',
        'Twitch, Kick і YouTube: число оновлюється саме щохвилини. Вводжу сам: наприклад, збір чи ціль донатів.'],
}
out = {lang: {} for lang in LANGS}
for k, v in D.items():
    assert len(v) == 9, k
    for lang, t in zip(LANGS, v):
        out[lang][k] = t
with open(r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/i18n/patches-17.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print('ok')
