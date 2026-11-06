"""Docs / SEO copy for the five streamer tools in src/seo/content.ts."""
p = 'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/seo/content.ts'
s = open(p, encoding='utf-8').read()

COPY = r'''  timer: {
    title: 'Odliczanie do OBS – timer na stream, minutnik przerwy i stoper',
    description: 'Darmowy licznik do OBS: odliczanie do startu streama, minutnik przerwy, odliczanie do godziny, stoper i czas trwania streama.',
    intro: ['Licznik pokazuje, ile zostało do startu albo do końca przerwy, liczy w górę jak stoper albo pokazuje, jak długo trwa stream. Na koniec może wyświetlić własny tekst, zostać na 00:00 albo zniknąć.'],
    features: ['Odliczanie w minutach albo do konkretnej godziny', 'Stoper i czas trwania streama', 'Pasek postępu i pulsowanie w ostatnich 10 sekundach', 'Własny napis i tekst na koniec'],
    faq: [{ q: 'Jak zrestartować odliczanie w OBS?', a: 'Licznik startuje, gdy OBS wczyta źródło. Zaznacz we właściwościach źródła „Odśwież przeglądarkę, gdy scena staje się aktywna”, a odliczanie zacznie się od nowa przy każdym przełączeniu na tę scenę.' }],
    keywords: ['timer obs', 'odliczanie obs', 'countdown obs', 'minutnik na stream', 'stoper obs'],
  },
  clock: {
    title: 'Zegar do OBS – godzina i data na streamie',
    description: 'Darmowy zegar na stream: aktualna godzina i data, sekundy, format 12 lub 24 godziny i strefy czasowe.',
    intro: ['Zegar pokazuje godzinę streamera i datę w języku widzów. Możesz wybrać inną strefę czasową, na przykład gdy streamujesz dla widzów z innego kraju.'],
    features: ['Godzina z sekundami albo bez', 'Format 12 i 24 godziny', 'Data pod godziną albo obok', 'Strefy czasowe: Polska, Londyn, Nowy Jork, Tokio i inne'],
    faq: [{ q: 'Skąd zegar bierze godzinę?', a: 'Z komputera, na którym działa OBS. Jeśli wybierzesz strefę czasową, zegar przeliczy godzinę na tę strefę.' }],
    keywords: ['zegar obs', 'godzina na streamie', 'clock overlay obs', 'data na streamie'],
  },
  goal: {
    title: 'Pasek celu do OBS – cel subów, followów i donejtów',
    description: 'Darmowy pasek celu na stream: cel followów, subów albo zbiórki z animowanym paskiem, procentem i świętowaniem po osiągnięciu celu.',
    intro: ['Pasek celu pokazuje, ile już masz i ile brakuje do celu. Wpisujesz liczby w studiu, a po odświeżeniu źródła w OBS pasek wypełnia się z animacją. Po osiągnięciu celu świeci się i strzela konfetti.'],
    features: ['4 wyglądy: napis nad paskiem, w pasku, cienki pasek i koło', 'Liczby, procent i własna jednostka (zł, subów)', 'Animacja wypełniania i połysk', 'Napis i konfetti po osiągnięciu celu'],
    faq: [{ q: 'Jak zaktualizować pasek celu?', a: 'Zmień liczbę „Teraz” w studiu i skopiuj link jeszcze raz albo zaktualizuj adres w OBS. Pasek liczy z liczb w linku, nie łączy się z Twitchem.' }],
    keywords: ['pasek celu obs', 'sub goal obs', 'cel followów', 'goal bar overlay'],
  },
  reminder: {
    title: 'Przypominajka do OBS – „zostaw follow” i Discord co kilka minut',
    description: 'Darmowe wyskakujące okienko na stream: co kilka minut przypomina o followie, Discordzie albo komendach czatu, z ikoną serwisu.',
    intro: ['Przypominajka co kilka minut wysuwa okienko z jednym z Twoich komunikatów i chowa je po kilku sekundach. Gdy w tekście jest link do Discorda, Twitcha czy YouTube, sama dobiera ikonę i kolor.'],
    features: ['Dowolna liczba komunikatów, po kolei albo losowo', 'Co ile minut i na jak długo', '4 animacje wejścia i pasek czasu', 'Ikony i kolory serwisów'],
    faq: [{ q: 'Czy przypominajka zasłania stream?', a: 'Tylko na kilka sekund, które sam ustawiasz. Przez resztę czasu źródło jest całkiem przezroczyste.' }],
    keywords: ['przypominajka follow', 'follow reminder obs', 'popup obs', 'discord na streamie'],
  },
  qr: {
    title: 'Kod QR do OBS – Discord, donejty i sklep na streamie',
    description: 'Darmowy kod QR na stream: widzowie skanują go telefonem i wchodzą na Discorda, stronę donejtów albo do sklepu.',
    intro: ['Wklej link, a studio zrobi z niego kod QR z tytułem i podpisem. Dla Discorda, Twitcha, YouTube i innych serwisów na środku kodu pojawia się ich logo.'],
    features: ['Kod QR z dowolnego linku', 'Logo serwisu na środku', 'Tytuł i podpis pod kodem', 'Animacja skanowania, puls albo unoszenie'],
    faq: [{ q: 'Czy logo na środku nie psuje kodu?', a: 'Nie. Kod z logo jest generowany z najwyższą korekcją błędów, więc telefon odczyta go mimo zasłoniętego środka.' }],
    keywords: ['kod qr obs', 'qr code overlay', 'discord qr na streamie', 'kod qr donejty'],
  },
'''

anchor = '  socials: {\n    title: '
assert s.count(anchor) == 1
s = s.replace(anchor, COPY + anchor)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
