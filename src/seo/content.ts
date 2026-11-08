// Docs (wiki) copy for search engines and answer engines. Written in Polish; every string is also the
// translation key, so /<lang>/docs pages come from src/i18n/locales. Pre-rendered to static HTML at build.

import { OVERLAYS } from '../overlays/registry';
import type { OverlayDef } from '../overlays/schema';
import { translate, type LangId } from '../i18n';

export const SITE = {
  url: 'https://overlays.vxh.pl',
  name: 'VXH Overlays',
  brand: 'VXH',
  author: 'skullboypl',
};

export type Faq = { q: string; a: string };
export type SeoPage = {
  lang: LangId;
  slug: string;
  path: string;
  overlay?: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  features?: string[];
  steps?: string[];
  faq: Faq[];
  keywords: string[];
};

const COMMON_FAQ: Faq[] = [
  {
    q: 'Czy overlaye są darmowe?',
    a: 'Tak. Wszystkie overlaye na overlays.vxh.pl są darmowe, bez rejestracji, bez znaku wodnego i bez limitu.',
  },
  {
    q: 'Czy działa to w Streamlabs, Meld i TikTok Live Studio?',
    a: 'Tak, w każdym programie, który ma źródło przeglądarki (Browser Source): OBS Studio, Streamlabs Desktop, Meld Studio, XSplit i TikTok Live Studio.',
  },
  {
    q: 'Gdzie są zapisane moje ustawienia?',
    a: 'Całe ustawienia są w samym linku do OBS. Dodatkowo możesz zapisać je pod nazwą w zakładce „Zapisane”, ale ten zapis jest tylko w pamięci tej przeglądarki (localStorage). Na innym komputerze go nie będzie, dlatego do przenoszenia służy kod udostępniania VXH1-.',
  },
  {
    q: 'Czy overlay obciąża komputer?',
    a: 'Efekty są rysowane na jednym canvasie lub w CSS i działają płynnie w OBS. Jeśli masz słabszy komputer, zmniejsz suwak „Ilość” albo rozmiar źródła.',
  },
];

type Copy = { title: string; description: string; intro: string[]; features: string[]; faq: Faq[]; keywords: string[] };

const COPY: Record<string, Copy> = {
  starting: {
    title: 'Ekran „Zaraz startujemy” do OBS z odliczaniem – darmowy, animowany',
    description: 'Animowany ekran startowy streama do OBS: odliczanie do startu, sociale z ikonami, miejsce na czat, 5 teł i efekty. Ustaw i skopiuj link do Browser Source.',
    intro: [
      'Ekran „Zaraz startujemy” (starting soon) to pierwsza rzecz, jaką widzą widzowie. Tutaj zrobisz go w minutę: duży animowany tytuł, licznik do startu, Twoje kanały i miejsce na czat, żeby ludzie mogli się przywitać, zanim zaczniesz.',
      'Odliczanie może liczyć minuty od włączenia sceny albo do konkretnej godziny, np. 20:00. Po zakończeniu pokazuje własny napis, np. „Już startujemy!”.',
    ],
    features: ['Odliczanie w minutach albo do godziny', 'Pasek postępu', 'Sociale z ikonami Twitch, Kick, YouTube, Discord, TikTok', 'Miejsce na czat: szkło, obramowanie albo przezroczysta dziura', '19 teł: 9 animowanych (zorza, synthwave, fale, kosmos, lava...) i 10 obrazków (pokój nocą, miasto neon, święta, Halloween...) albo własny obrazek', '5 animacji tytułu i 6 czcionek'],
    faq: [
      { q: 'Jak zrobić odliczanie przed streamem w OBS?', a: 'Wybierz ekran „Zaraz startujemy”, w sekcji „Odliczanie” ustaw „Minuty” albo „Do godziny”, skopiuj link i dodaj go w OBS jako źródło Przeglądarka 1920×1080.' },
      { q: 'Czy odliczanie restartuje się po przełączeniu sceny?', a: 'Licznik w minutach startuje, gdy OBS wczyta źródło. Jeśli chcesz stałą godzinę startu niezależnie od sceny, wybierz „Do godziny”.' },
      { q: 'Jak dodać czat na ekran startowy?', a: 'Włącz „Miejsce na czat” w sekcji „Czat”, wybierz stronę i szerokość, a potem połóż w OBS swoje źródło czatu na zostawionej ramce.' },
    ],
    keywords: ['starting soon obs', 'ekran startowy stream', 'zaraz startujemy obs', 'odliczanie obs', 'countdown obs browser source'],
  },
  brb: {
    title: 'Ekran przerwy BRB do OBS – „Zaraz wracam” z licznikiem',
    description: 'Darmowy animowany ekran przerwy (BRB) do OBS z licznikiem powrotu, neonowym tytułem, socialami i miejscem na czat.',
    intro: [
      'Ekran przerwy trzyma widzów na streamie, kiedy idziesz po kawę. Neonowy napis „Zaraz wracam”, licznik powrotu i Twoje sociale wyglądają lepiej niż wyciszona kamera.',
      'Możesz zmienić tekst, tło, kolory i czcionkę, dodać efekt na wierzchu i zostawić miejsce na czat.',
    ],
    features: ['Licznik powrotu', 'Animowane tła CSS, 10 obrazków z powolnym ruchem albo własny obrazek', 'Neon, glitch, fala i inne animacje napisu', 'Miejsce na czat', 'Sociale z ikonami'],
    faq: [
      { q: 'Co to jest ekran BRB?', a: 'BRB to skrót od „be right back”, czyli „zaraz wracam”. To scena pokazywana widzom podczas przerwy w streamie.' },
      { q: 'Jak ustawić, za ile minut wracam?', a: 'W sekcji „Odliczanie” wybierz „Minuty” i ustaw suwak. Licznik ruszy, gdy przełączysz się na scenę z tym ekranem.' },
    ],
    keywords: ['brb obs', 'ekran przerwy stream', 'zaraz wracam obs', 'be right back screen', 'przerwa na streamie'],
  },
  ending: {
    title: 'Ekran końcowy streama do OBS – „Dzięki za dziś”, następny stream, sociale',
    description: 'Animowany ekran końca streama: podziękowanie, termin następnego streama, sociale z ikonami i miejsce na czat. Darmowy overlay do OBS.',
    intro: [
      'Ekran końcowy to dobre miejsce, żeby podziękować widzom, podać termin następnego streama i przypomnieć o Discordzie czy YouTube.',
      'Zostaw miejsce na czat, żeby widzowie mogli się pożegnać, i dodaj efekt, np. świetliki albo fajerwerki.',
    ],
    features: ['Pole „Następny stream”', 'Sociale z ikonami', 'Miejsce na czat', 'Animowane tła, obrazki i efekty', 'Opcjonalne odliczanie do końca'],
    faq: [
      { q: 'Co pokazać na ekranie końcowym streama?', a: 'Podziękowanie, termin kolejnego streama, linki do Discorda i innych kanałów oraz czat, żeby widzowie mogli się pożegnać.' },
      { q: 'Czy mogę dodać raid albo licznik do końca?', a: 'Możesz włączyć odliczanie, np. 2 minuty do końca streama. Raid robisz już na Twitchu komendą /raid.' },
    ],
    keywords: ['ekran końcowy stream', 'ending screen obs', 'koniec streama overlay', 'outro stream obs'],
  },
  snow: {
    title: 'Śnieg na stream do OBS – darmowy overlay padającego śniegu',
    description: 'Animowany śnieg na cały ekran do OBS i Streamlabs. Płatki, kryształki, wiatr, rozmycie głębi i przezroczyste tło. Skopiuj link do Browser Source.',
    intro: ['Padający śnieg to najprostszy sposób na zimowy klimat streama. Ustawisz ilość, wielkość, prędkość, wiatr i kształt płatków, a tło zostaje przezroczyste, więc śnieg pada nad grą i kamerką.'],
    features: ['Kropki, kryształki ❄ albo mieszane', 'Rozmycie głębi', 'Wiatr w lewo lub prawo', 'Śnieg tylko po bokach albo na pół ekranu'],
    faq: [{ q: 'Jak dodać śnieg na stream w OBS?', a: 'Ustaw wygląd śniegu, skopiuj link i dodaj go w OBS jako źródło Przeglądarka 1920×1080 nad pozostałymi warstwami.' }],
    keywords: ['śnieg obs', 'snow overlay obs', 'padający śnieg stream', 'zimowy overlay'],
  },
  rain: {
    title: 'Deszcz na stream do OBS – animowany overlay deszczu',
    description: 'Overlay deszczu do OBS: od mżawki po ulewę, ukośne krople, rozbryzgi i przezroczyste tło.',
    intro: ['Deszcz dodaje nastroju spokojnym streamom, lo-fi i horrorom. Ustawisz siłę opadu, kąt wiatru, kolor kropli i rozbryzgi na dole ekranu.'],
    features: ['Ilość od mżawki do ulewy', 'Wiatr i kąt kropli', 'Rozbryzgi', 'Własny kolor'],
    faq: [{ q: 'Czy deszcz zasłania grę?', a: 'Krople są półprzezroczyste. Krycie i ilość ustawisz suwakami, więc łatwo dobrać efekt, który nie przeszkadza.' }],
    keywords: ['deszcz obs', 'rain overlay', 'deszcz na stream'],
  },
  confetti: {
    title: 'Konfetti do OBS – overlay konfetti na stream, ciągłe lub wybuch',
    description: 'Wirujące konfetti do OBS: ciągły deszcz albo wybuch z rogów co kilka sekund, własne kolory i przezroczyste tło.',
    intro: ['Konfetti świetnie sprawdza się przy celebracjach: urodziny kanału, cel subów, wygrana. Wybierz ciągły deszcz albo wybuch z dolnych rogów ekranu co ustaloną liczbę sekund.'],
    features: ['Tryb ciągły albo wybuch', 'Do 6 własnych kolorów', 'Wiatr i prędkość'],
    faq: [{ q: 'Jak zrobić wybuch konfetti na streamie?', a: 'Ustaw tryb „Wybuch z dołu” i odstęp między wybuchami. Możesz też włączać źródło w OBS tylko wtedy, kiedy chcesz świętować.' }],
    keywords: ['konfetti obs', 'confetti overlay', 'konfetti na stream'],
  },
  emoji: {
    title: 'Unoszące się emoji i serduszka na stream – overlay do OBS',
    description: 'Serduszka, gwiazdki i dowolne emoji płynące po ekranie. Darmowy overlay do OBS z przezroczystym tłem.',
    intro: ['Wpisz dowolne emoji, a overlay będzie je losować i puszczać w górę albo w dół ekranu. Pasuje na walentynki, streamy just chatting i podziękowania dla widzów.'],
    features: ['Dowolne emoji', 'Kierunek w górę lub w dół', 'Ilość, rozmiar i prędkość'],
    faq: [{ q: 'Czy mogę użyć własnych emoji?', a: 'Tak, wpisz je w pole „Emoji”. Systemowe emoji wyglądają w OBS tak jak w Windowsie.' }],
    keywords: ['serduszka obs', 'emoji overlay', 'floating hearts obs'],
  },
  fireflies: {
    title: 'Świetliki na stream – świecące drobinki, overlay do OBS',
    description: 'Pulsujące świetliki błądzące po ekranie. Spokojny, klimatyczny overlay do OBS.',
    intro: ['Świetliki to delikatny efekt świecących drobinek, które powoli błądzą po ekranie i pulsują. Dobrze wyglądają na ekranach przerwy i spokojnych streamach.'],
    features: ['Kolor i siła poświaty', 'Ilość i rozmiar', 'Obszar: cały ekran albo boki'],
    faq: [{ q: 'Jak zmienić kolor świetlików?', a: 'Wybierz kolor w ustawieniach. Ciepłe żółte wyglądają naturalnie, zielone albo fioletowe pasują do Halloween.' }],
    keywords: ['świetliki obs', 'particles overlay', 'glowing particles stream'],
  },
  petals: {
    title: 'Płatki wiśni i jesienne liście – overlay do OBS',
    description: 'Opadające płatki sakury albo jesienne liście na stream. Własne kolory, wiatr, przezroczyste tło.',
    intro: ['Płatki wiśni na wiosnę, kolorowe liście na jesień. Wybierz kształt, kolory i siłę wiatru.'],
    features: ['Płatek albo liść', 'Do 5 kolorów', 'Wiatr i prędkość'],
    faq: [{ q: 'Jak zrobić jesienne liście?', a: 'Wybierz kształt „Liść” i ustaw kolory, np. pomarańczowy, czerwony i brązowy.' }],
    keywords: ['sakura obs', 'jesienne liście overlay', 'płatki wiśni stream'],
  },
  embers: {
    title: 'Iskry z ogniska na stream – żarzące się drobinki, overlay do OBS',
    description: 'Iskry unoszące się z dołu ekranu jak z ogniska. Darmowy overlay do OBS z przezroczystym tłem.',
    intro: ['Żarzące się iskry powoli wznoszą się z dołu ekranu, migoczą i gasną. Pasują do klimatycznych streamów, survivali i ekranów przerwy przy kominku.'],
    features: ['Do 5 kolorów żaru', 'Siła poświaty', 'Wiatr, ilość i prędkość'],
    faq: [{ q: 'Jak zrobić niebieskie iskry?', a: 'Zmień kolory na niebieskie i fioletowe. Wyjdzie magiczny ogień zamiast zwykłego ogniska.' }],
    keywords: ['iskry obs', 'embers overlay', 'ogień overlay stream'],
  },
  bubbles: {
    title: 'Bańki mydlane na stream – overlay do OBS',
    description: 'Opalizujące bańki mydlane płynące w górę ekranu. Darmowy overlay do OBS.',
    intro: ['Lekkie, opalizujące bańki płyną z dołu ekranu i kołyszą się na boki. Spokojny efekt na just chatting i ekrany przerwy.'],
    features: ['Własne kolory połysku', 'Ilość, rozmiar i prędkość', 'Obszar: cały ekran albo boki'],
    faq: [{ q: 'Czy bańki zasłaniają grę?', a: 'Są półprzezroczyste. Dla pewności ustaw obszar „Tylko boki”, wtedy środek ekranu zostaje czysty.' }],
    keywords: ['bańki mydlane obs', 'bubbles overlay', 'bubbles stream'],
  },
  bokeh: {
    title: 'Bokeh na stream – miękkie światła jak z obiektywu, overlay do OBS',
    description: 'Duże, rozmyte krążki światła powoli dryfujące po ekranie. Darmowy overlay do OBS.',
    intro: ['Bokeh to miękkie kółka światła jak z rozmytego tła na zdjęciu. Delikatnie pulsują i dryfują, nadając scenie ciepły, kinowy klimat.'],
    features: ['Do 5 kolorów świateł', 'Wielkość i ilość krążków', 'Przezroczystość'],
    faq: [{ q: 'Gdzie bokeh wygląda najlepiej?', a: 'Na ekranach startu i przerwy oraz nad kamerką na spokojnych streamach. Ustaw niską przezroczystość, żeby nie zasłaniał twarzy.' }],
    keywords: ['bokeh obs', 'bokeh overlay', 'light leaks stream'],
  },
  sparkles: {
    title: 'Błyski brokatu na stream – migoczące gwiazdki, overlay do OBS',
    description: 'Gwiazdki zapalające się i gasnące w losowych miejscach ekranu. Darmowy overlay do OBS.',
    intro: ['Błyski brokatu pojawiają się w losowych miejscach, rozbłyskują i gasną. Dodają scenie odrobinę magii, świetnie wyglądają na krawędziach ekranu.'],
    features: ['Do 5 kolorów', 'Obszar: cały ekran albo krawędzie', 'Szybkość migotania'],
    faq: [{ q: 'Jak zostawić środek ekranu bez błysków?', a: 'Wybierz obszar „Tylko boki”. Błyski pojawią się tylko przy krawędziach.' }],
    keywords: ['brokat obs', 'sparkles overlay', 'glitter stream'],
  },
  balloons: {
    title: 'Balony na stream – overlay do OBS na urodziny',
    description: 'Kolorowe balony lecące w górę ekranu. Darmowy overlay do OBS na urodziny i świętowanie.',
    intro: ['Kolorowe balony z błyszczącym odbiciem i sznurkiem lecą w górę i lekko się kołyszą. Idealne na urodziny kanału, setnego suba albo wygraną.'],
    features: ['Do 6 kolorów', 'Ilość, rozmiar i prędkość', 'Wiatr'],
    faq: [{ q: 'Jak puszczać balony tylko na chwilę?', a: 'Dodaj overlay jako osobne źródło i włączaj je w OBS skrótem klawiszowym albo w scenie na świętowanie.' }],
    keywords: ['balony obs', 'balloons overlay', 'urodziny stream overlay'],
  },
  meteors: {
    title: 'Spadające gwiazdy na stream – meteory, overlay do OBS',
    description: 'Meteory z jasnym ogonem przecinające niebo co kilka sekund. Darmowy overlay do OBS.',
    intro: ['Co kilka sekund przez ekran przelatuje meteor ze świecącym ogonem. Pięknie wygląda na nocnych tłach, ekranie startowym i nad kosmicznymi scenami.'],
    features: ['Przerwy między gwiazdami', 'Kierunek lotu', 'Kolory ogona'],
    faq: [{ q: 'Jak sprawić, żeby gwiazd było mniej?', a: 'Zmniejsz ilość i wydłuż przerwy między gwiazdami. Pojedynczy meteor raz na kilka sekund wygląda najładniej.' }],
    keywords: ['spadające gwiazdy obs', 'meteor overlay', 'shooting stars stream'],
  },
  digital: {
    title: 'Cyfrowy deszcz znaków na stream – overlay do OBS',
    description: 'Spadające kolumny znaków jak w hakerskim terminalu. Darmowy overlay do OBS.',
    intro: ['Kolumny znaków spadają z góry ekranu, a jasny znak na czele zostawia za sobą gasnący ślad. Pasuje do streamów o programowaniu, cyberpunku i grach hakerskich.'],
    features: ['Własny kolor znaków', 'Gęstość i prędkość', 'Wielkość znaków'],
    faq: [{ q: 'Czy mogę zrobić czerwony albo niebieski deszcz?', a: 'Tak, zmień kolor w ustawieniach. Klasyczny jest zielony, ale każdy kolor działa.' }],
    keywords: ['cyfrowy deszcz obs', 'digital rain overlay', 'hacker overlay stream'],
  },
  fireworks: {
    title: 'Fajerwerki na stream do OBS – overlay na Sylwestra',
    description: 'Animowane fajerwerki do OBS: salwy rakiet, wybuchy w kształcie pierścienia lub serca, własne kolory, przezroczyste tło.',
    intro: ['Fajerwerki na Sylwestra, cel subów albo zwycięstwo. Ustawisz liczbę rakiet w salwie, odstęp między salwami, kolory i kształt wybuchu.'],
    features: ['Salwy rakiet', 'Kształt: mieszany, pierścień, serce', 'Migotanie iskier'],
    faq: [{ q: 'Czy fajerwerki zostawiają ślad na ekranie?', a: 'Iskry mają krótkie smugi, które same znikają. Tło zostaje przezroczyste przez cały czas.' }],
    keywords: ['fajerwerki obs', 'fireworks overlay', 'sylwester stream'],
  },
  stars: {
    title: 'Gwiazdy i warp do OBS – animowane niebo na stream',
    description: 'Migoczące gwiazdy ze spadającymi gwiazdami albo efekt lotu w hiperprzestrzeń. Overlay do OBS.',
    intro: ['Dwa tryby: spokojne migoczące niebo ze spadającymi gwiazdami albo warp, czyli lot w hiperprzestrzeń. Dobre na ekrany przerwy i streamy sci-fi.'],
    features: ['Tryb migotania i warp', 'Spadające gwiazdy', 'Kolor, ilość, prędkość'],
    faq: [{ q: 'Jak zrobić efekt hiperprzestrzeni?', a: 'Wybierz tryb „Warp” i zwiększ prędkość.' }],
    keywords: ['gwiazdy obs', 'starfield overlay', 'warp effect obs'],
  },
  grain: {
    title: 'Ziarno filmowe, winieta i VHS – overlay do OBS',
    description: 'Filmowe ziarno, winieta, linie VHS i migotanie na stream. Overlay do OBS z przezroczystym tłem.',
    intro: ['Ziarno filmowe i winieta nadają obrazowi kinowy albo retro klimat. Dodaj linie VHS i migotanie, jeśli chcesz efektu starej kasety.'],
    features: ['Siła ziarna', 'Winieta', 'Linie VHS', 'Migotanie'],
    faq: [{ q: 'Czy ziarno obciąża OBS?', a: 'Szum jest generowany w małej rozdzielczości i odświeżany 24 razy na sekundę, więc obciążenie jest minimalne.' }],
    keywords: ['film grain obs', 'vhs overlay', 'winieta obs'],
  },
  neon: {
    title: 'Neonowa ramka na kamerkę do OBS – animowany gradient',
    description: 'Ramka na kamerkę z obracającym się gradientem i poświatą. Grubość, zaokrąglenie, kolory i prędkość do ustawienia.',
    intro: ['Neonowa ramka wokół kamerki z płynnie obracającym się gradientem RGB. Dobierzesz kolory pod swój branding, grubość, zaokrąglenie rogów i siłę poświaty.'],
    features: ['Do 5 kolorów gradientu', 'Poświata', 'Zaokrąglone rogi', 'Prędkość obrotu'],
    faq: [{ q: 'Jak dopasować ramkę do kamerki w OBS?', a: 'Ustaw w OBS ten sam rozmiar źródła co kamerki, połóż ramkę nad nią i ewentualnie zmień margines w ustawieniach.' }],
    keywords: ['ramka na kamerkę obs', 'webcam frame', 'neon webcam border', 'rgb ramka kamerki'],
  },
  corners: {
    title: 'Narożniki HUD na kamerkę – ramka w stylu gamingowym do OBS',
    description: 'Celownikowe narożniki wokół kamerki, linia skanu i kropka REC. Gamingowa ramka do OBS.',
    intro: ['Minimalistyczna ramka z samych narożników w stylu HUD z gier. Opcjonalnie z linią skanu i migającą kropką REC.'],
    features: ['Długość i grubość narożników', 'Linia skanu', 'Kropka REC', 'Oddychająca animacja'],
    faq: [{ q: 'Czy narożniki zasłaniają twarz?', a: 'Nie, rysowane są tylko rogi. Środek kamerki zostaje czysty.' }],
    keywords: ['hud webcam frame', 'narożniki kamerka', 'gaming webcam overlay'],
  },
  nametag: {
    title: 'Ramka na kamerkę z nickiem – overlay do OBS',
    description: 'Ramka na kamerkę z paskiem na nick i social. Pozycja paska, kolory, zaokrąglenie i błysk do ustawienia.',
    intro: ['Czysta ramka na kamerkę z paskiem, na którym widać Twój nick i np. adres kanału. Wybierz pozycję paska, kolory i zaokrąglenie.'],
    features: ['Nick i podpis', '5 pozycji paska', 'Błysk co kilka sekund'],
    faq: [{ q: 'Czy mogę wpisać polskie znaki?', a: 'Tak, nick i podpis obsługują polskie znaki i emoji.' }],
    keywords: ['ramka z nickiem', 'webcam name tag', 'nick na kamerce obs'],
  },
  holiday: {
    title: 'Świąteczne ramki na kamerkę do OBS – Boże Narodzenie, Halloween, Walentynki',
    description: 'Ramki na kamerkę na każde święto: Boże Narodzenie z lampkami, zima, Sylwester, Walentynki, Wielkanoc, Halloween, 11 Listopada i urodziny. Z efektami i dekoracjami.',
    intro: [
      'Jedna ramka na kamerkę, osiem okazji. Każdy motyw ma swoje kolory, dekoracje w rogach i efekt w środku: lampki choinkowe i śnieg na Boże Narodzenie, pajęczynę, nietoperze i dynię na Halloween, serduszka na Walentynki, chorągiewki i konfetti na urodziny.',
      'Napis „auto” wstawia życzenia pasujące do okazji, ale możesz wpisać własny.',
    ],
    features: ['Boże Narodzenie, zima, Sylwester, Walentynki, Wielkanoc, Halloween, 11 Listopada, urodziny', '5 wersji każdej ramki: animowana, realistyczna, 3D, kreskówka i neon', 'Lampki, chorągiewki albo czapa śniegu', 'Efekt w środku: śnieg, serca, konfetti, świetliki', 'Dekoracje w rogach z animacją'],
    faq: [
      { q: 'Jak zrobić świąteczną ramkę na kamerkę?', a: 'Wybierz „Ramki świąteczne”, ustaw okazję „Boże Narodzenie”, skopiuj link i dodaj go w OBS jako Przeglądarkę o rozmiarze kamerki.' },
      { q: 'Czy mogę szybko zmieniać ramki na różne święta?', a: 'Tak. Zapisz każdy motyw w zakładce „Zapisane” albo zrób w OBS kilka źródeł z różnymi linkami i włączaj ten, który pasuje.' },
    ],
    keywords: ['świąteczna ramka kamerka', 'christmas webcam frame', 'halloween webcam overlay', 'ramka na kamerkę boże narodzenie', 'walentynki overlay'],
  },
  ticker: {
    title: 'Przewijany pasek z tekstem do OBS – ticker na stream',
    description: 'Pasek z przesuwającym się tekstem na stream: harmonogram, komendy, zasady czatu. Etykieta, styl, prędkość i czcionka.',
    intro: ['Przewijany pasek (ticker) pokazuje po kolei Twoje komunikaty: kiedy streamujesz, jakie są komendy, link do Discorda. Każdy komunikat wpisujesz w osobnym wierszu.'],
    features: ['Lista komunikatów', 'Etykieta „INFO” z lewej', 'Styl pełny, szkło albo bez tła', 'Stała prędkość w px/s'],
    faq: [{ q: 'Jak zrobić przewijany tekst w OBS bez wtyczek?', a: 'Wpisz komunikaty w „Przewijany pasek”, skopiuj link i dodaj go jako Przeglądarkę 1920×64. Nie potrzebujesz filtra przewijania OBS.' }],
    keywords: ['przewijany tekst obs', 'ticker obs', 'pasek informacyjny stream', 'scrolling text overlay'],
  },
  timer: {
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
  fog: {
    title: 'Mgła do OBS – kłęby mgły na stream',
    description: 'Darmowy overlay mgły do OBS i Streamlabs: miękkie kłęby suną przy ziemi albo przez cały ekran, z wiatrem i własnym kolorem.',
    intro: ['Mgła dodaje klimatu horrorowym i jesiennym streamom. Kłęby są miękkie i półprzezroczyste, więc gra pod spodem pozostaje czytelna.'],
    features: ['Przy ziemi, na górze albo na całym ekranie', 'Wiatr, prędkość, gęstość i kolor', 'Przezroczyste tło'],
    faq: [{ q: 'Jak dodać mgłę na stream?', a: 'Wybierz „Mgła”, ustaw gęstość i miejsce, skopiuj link i wstaw go w OBS jako Przeglądarkę 1920×1080 nad grą.' }],
    keywords: ['mgła obs', 'fog overlay', 'efekt mgły na stream', 'halloween overlay'],
  },
  dust: {
    title: 'Pyłki w świetle – filmowy efekt kurzu do OBS',
    description: 'Overlay z drobinkami kurzu dryfującymi w świetle, jak w starym kinie. Delikatny, filmowy efekt na kamerkę i sceny just chatting.',
    intro: ['Drobinki unoszą się powoli i migoczą, co daje kameralny, filmowy nastrój bez przytłaczania obrazu.'],
    features: ['Migotanie i powolny dryf', 'Poświata, kolor, gęstość', 'Obszar: cały ekran albo boki'],
    faq: [{ q: 'Czy pyłki nie zasłonią kamerki?', a: 'Nie. Drobinki są małe i półprzezroczyste; zmniejsz „Ilość” albo „Krycie”, jeśli chcesz jeszcze subtelniej.' }],
    keywords: ['pyłki kurzu overlay', 'dust particles obs', 'filmowy efekt stream'],
  },
  lightning: {
    title: 'Błyskawice do OBS – pioruny i błysk na streamie',
    description: 'Overlay burzy do OBS: rozgałęzione pioruny i błysk na całym ekranie co kilka sekund. Łączy się z deszczem w jedną scenę burzową.',
    intro: ['Pioruny są rysowane na żywo, za każdym razem inaczej, z rozgałęzieniami i poświatą. Błysk można zostawić sam, jak burzę za oknem.'],
    features: ['Pioruny albo sam błysk', 'Częstotliwość, siła błysku, kolory', 'Do połowy ekranu albo do ziemi'],
    faq: [{ q: 'Jak zrobić burzę na streamie?', a: 'Dodaj dwa źródła Przeglądarka: „Deszcz” i „Błyskawice”, oba 1920×1080, nad grą albo tłem.' }],
    keywords: ['błyskawice obs', 'lightning overlay', 'burza na stream', 'pioruny overlay'],
  },
  glitch: {
    title: 'Glitch ekranu do OBS – zakłócenia obrazu na stream',
    description: 'Overlay z cyfrowymi zakłóceniami do OBS: rozdarcia w cyjanie i magencie, bloki szumu, linie skanowania. Idealny do cyberpunkowych i horrorowych scen.',
    intro: ['Zakłócenia pojawiają się seriami co kilka sekund, a między nimi obraz jest czysty. Siłę, kolory i częstotliwość ustawiasz na podglądzie.'],
    features: ['Rozdarcia RGB, bloki szumu, cienkie linie', 'Tryb delikatny albo z dużymi rozdarciami', 'Linie skanowania z przesuwającym się pasem'],
    faq: [{ q: 'Czy glitch zniekształca obraz z gry?', a: 'Nie. Źródło przeglądarki nie może przesuwać tego, co jest pod nim, więc zakłócenia są rysowane jako półprzezroczyste pasy i bloki na wierzchu.' }],
    keywords: ['glitch overlay obs', 'efekt glitch stream', 'zakłócenia obrazu overlay', 'cyberpunk overlay'],
  },
  glitchframe: {
    title: 'Ramka glitch na kamerkę – cyberpunkowy overlay do OBS',
    description: 'Cyberpunkowa ramka na kamerkę do OBS: rozjechane kanały RGB, rozdarcia, celownik i migający napis LIVE SIGNAL. Darmowa, z konfiguratorem.',
    intro: ['Trzy warstwy ramki co chwilę rozjeżdżają się w cyjan i magentę, a w rogu zmienia się kod HEX. Siłę zakłóceń i kolory ustawiasz sam.'],
    features: ['Kanały RGB, rozdarcia, drgania', 'Linie skanowania i pas szumu', 'Napis i zmieniający się kod HEX'],
    faq: [{ q: 'Jak dodać ramkę glitch na kamerkę?', a: 'Wybierz „Ramka glitch”, skopiuj link i wstaw go w OBS jako Przeglądarkę nad źródłem kamerki, o tym samym rozmiarze.' }],
    keywords: ['ramka glitch kamerka', 'glitch webcam frame', 'cyberpunk webcam overlay'],
  },
  retroframe: {
    title: 'Ramka CRT / VHS na kamerkę – retro telewizor do OBS',
    description: 'Ramka na kamerkę w stylu starego telewizora albo kasety VHS: linie skanowania, napis PLAY, licznik czasu, zakłócenia śledzenia. Darmowa do OBS.',
    intro: ['Trzy wersje: telewizor CRT z wygiętym ekranem, kaseta VHS i kamera VHS-C. Licznik czasu rusza, gdy OBS wczyta źródło.'],
    features: ['CRT, VHS albo kamera VHS-C', 'PLAY, licznik czasu, data, REC, numer kanału', 'Zakłócenia śledzenia i winieta kineskopu'],
    faq: [{ q: 'Czy linie skanowania nie zasłaniają twarzy?', a: 'Są bardzo delikatne, a można je wyłączyć w ustawieniach „Efekty”.' }],
    keywords: ['ramka vhs kamerka', 'crt webcam frame', 'retro overlay obs', 'vhs overlay'],
  },
  polaroid: {
    title: 'Ramka polaroid na kamerkę – zdjęcie z taśmą do OBS',
    description: 'Ramka na kamerkę jak zdjęcie natychmiastowe: papierowy brzeg, odręczny podpis, taśma albo pinezka i lekkie przekrzywienie. Darmowa do OBS.',
    intro: ['Ciepła, przytulna ramka na just chatting i sceny z kamerką. Podpis piszesz sam, papier i taśmę kolorujesz jak chcesz.'],
    features: ['Odręczny podpis', 'Taśma na górze, w rogach albo po bokach, pinezka', 'Przekrzywienie i lekkie kołysanie'],
    faq: [{ q: 'Jak zmienić kolor papieru?', a: 'W grupie „Papier” wybierz kolor; pastelowe odcienie dobrze wyglądają na jasnych scenach.' }],
    keywords: ['ramka polaroid kamerka', 'polaroid webcam frame', 'cozy webcam overlay'],
  },
  pixelframe: {
    title: 'Ramka 8-bit na kamerkę – pikselowy overlay jak z NES',
    description: 'Pikselowa ramka na kamerkę do OBS: serduszka życia, wynik, licznik monet i migający PRESS START. Retro gaming w kilka sekund.',
    intro: ['Ramka rysowana z „pikseli” o wybranej wielkości, z HUD-em jak w grach 8-bitowych. Liczbę serduszek i monet ustawiasz sam.'],
    features: ['Serduszka życia i wynik', 'Licznik monet i migający napis', 'Wielkość piksela i kolory'],
    faq: [{ q: 'Czy mogę zmienić napis PRESS START?', a: 'Tak, w grupie „Dodatki” włącz migający napis i wpisz własny tekst.' }],
    keywords: ['ramka 8-bit kamerka', 'pixel webcam frame', 'retro gaming overlay', 'nes overlay'],
  },
  lowerthird: {
    title: 'Belka z nazwiskiem (lower third) do OBS – animowany pasek z nickiem',
    description: 'Telewizyjna belka lower third do OBS: nick, podpis, ikona serwisu, 8 stylów i animacje wejścia, w tym glitch. Pokazuje się cały czas albo co jakiś czas.',
    intro: ['Belka pojawia się z animacją i może wracać co kilka minut, np. z przypomnieniem o socialach. Ikona serwisu dobiera się po adresie w podpisie.'],
    features: ['Klasyczna, szkło, neon, esport, minimal, gradient, wiadomości, cyber', 'Wjazd, odsłonięcie, glitch, pisanie, obrót i inne', 'Cały czas albo co jakiś czas z paskiem czasu'],
    faq: [{ q: 'Jak zrobić lower third w OBS?', a: 'Wybierz „Belka z nazwiskiem”, wpisz nick i podpis, skopiuj link i wstaw go jako Przeglądarkę 900×160 w lewym dolnym rogu sceny.' }],
    keywords: ['lower third obs', 'belka z nazwiskiem', 'pasek z nickiem na stream', 'animated lower third'],
  },
  schedule: {
    title: 'Harmonogram streamów do OBS – dni i godziny z podświetleniem',
    description: 'Overlay z harmonogramem streamów: dni i godziny w rzędzie, kolumnie albo siatce. Dzisiejszy dzień podświetla się sam.',
    intro: ['Wpisujesz dni i godziny, a overlay układa je w pigułki, karty albo jeden pasek. Dzisiejszy termin ma kolor akcentu i pulsującą kropkę.'],
    features: ['Rząd, kolumna albo siatka', 'Automatyczne podświetlenie dzisiejszego dnia', 'Dni wolne i tytuły streamów'],
    faq: [{ q: 'Jak overlay wie, który dzień jest dziś?', a: 'Rozpoznaje skróty dni po polsku, angielsku i niemiecku (Pon, Mon, Mo…) i porównuje je z datą na komputerze. Gwiazdka na początku wiersza wymusza podświetlenie.' }],
    keywords: ['harmonogram streamów obs', 'stream schedule overlay', 'plan streamów na ekranie'],
  },
  social: {
    title: 'Pojedynczy social do OBS – jeden kanał z animacją',
    description: 'Overlay z jednym kanałem: ikona serwisu, nick i zachęta do followa, z animacją w pętli: puls, kiwanie, połysk, poświata.',
    intro: ['Gdy rotator to za dużo, a chcesz stale pokazywać jeden adres. Ikona i kolor dobierają się same po adresie, 18 stylów i animacje w pętli.'],
    features: ['Twitch, Kick, YouTube, Discord, TikTok, Instagram, X, Facebook', 'Zachęta nad, pod albo obok kanału', 'Puls, kiwanie, podskok, poświata, połysk, powtarzane wejście'],
    faq: [{ q: 'Czym różni się od rotatora sociali?', a: 'Pokazuje jeden kanał na stałe, za to z animacjami w pętli i zachętą, np. „Zostaw followa”.' }],
    keywords: ['social overlay obs', 'follow me overlay', 'pojedynczy social na stream'],
  },
  qrrotator: {
    title: 'Rotator kodów QR do OBS – kilka linków na zmianę z efektami',
    description: 'Kilka kodów QR na zmianę na streamie: Discord, donejty, sklep. Przejścia glitch, obrót, kostka 3D, pikselizacja i inne, z tytułem i paskiem czasu.',
    intro: ['Każdy wiersz to link i tytuł. Kody zmieniają się co kilka sekund z wybranym przejściem, a logo serwisu pojawia się na środku.'],
    features: ['Glitch, obrót, kostka, pikselizacja, przesunięcie, rozmycie, odsłonięcie', 'Tytuł i podpis dla każdego kodu', 'Kropki i pasek czasu'],
    faq: [{ q: 'Czy kod zdąży się zeskanować?', a: 'Ustaw „Zmiana co” na 10–15 s; telefon czyta kod w ułamku sekundy, a widz ma czas sięgnąć po niego.' }],
    keywords: ['rotator kodów qr obs', 'qr code rotator overlay', 'kilka kodów qr na streamie'],
  },
  socials: {
    title: 'Rotator sociali do OBS – Twitch, YouTube, Discord, TikTok z ikonami',
    description: 'Overlay, który po kolei pokazuje Twoje kanały z ikonami serwisów: Twitch, Kick, YouTube, Discord, TikTok, Instagram, X.',
    intro: ['Rotator sociali pokazuje Twoje kanały po kolei: jeden na raz, w rzędzie, w kolumnie, w siatce, jako ikony albo przewijane w pętli. Ikona i kolor dobierają się same po wybranym serwisie, a rozmiar dopasowuje się do źródła w OBS.'],
    features: ['Twitch, Kick, YouTube, Discord, TikTok, Instagram, X, Facebook', '6 układów i 18 motywów wyglądu', '7 animacji zmiany', 'Pasek czasu'],
    faq: [{ q: 'Jak dodać sociale na stream?', a: 'W „Rotatorze sociali” dodaj serwisy i nicki, skopiuj link i wstaw go w OBS jako Przeglądarkę 560×100.' }],
    keywords: ['social media overlay obs', 'sociale na stream', 'rotator sociali', 'twitch youtube discord overlay'],
  },
};

/** Docs URL: Polish at /docs/<slug>, other languages at /<lang>/docs/<slug>. */
export const docsPath = (lang: LangId, slug = '') => `${lang === 'pl' ? '' : `/${lang}`}/docs${slug ? `/${slug}` : ''}`;

type Draft = Omit<SeoPage, 'path' | 'lang'>;

/** Every Polish string goes through the dictionary; the title gets the site name. */
const localize = (lang: LangId, d: Draft): SeoPage => {
  const tr = (s: string) => translate(lang, s);
  return {
    ...d,
    lang,
    path: docsPath(lang, d.slug),
    title: `${tr(d.title)} | ${SITE.name}`,
    description: tr(d.description),
    h1: tr(d.h1),
    intro: d.intro.map(tr),
    features: d.features?.map(tr),
    steps: d.steps?.map(tr),
    faq: d.faq.map((f) => ({ q: tr(f.q), a: tr(f.a) })),
    keywords: d.keywords.map(tr),
  };
};

const obsSteps = (lang: LangId, def: OverlayDef) => {
  const tr = (s: string, p: (string | number)[] = []) => translate(lang, s, p);
  return [
    tr('Wybierz „{0}” na liście i ustaw wygląd na podglądzie: kolory, teksty, prędkość i inne opcje.', [tr(def.name)]),
    tr('Kliknij „Kopiuj” przy linku do Browser Source.'),
    tr('W OBS Studio dodaj źródło: Źródła → + → Przeglądarka (Browser Source) i wklej link w pole URL.'),
    tr('Ustaw rozmiar źródła na {0}×{1} px. Tło jest przezroczyste, nie trzeba dodawać własnego CSS.', [def.size.w, def.size.h]),
    def.category === 'camera'
      ? tr('Ułóż źródło nad kamerką i dopasuj je do jej rozmiaru.')
      : def.category === 'scene'
        ? tr('Dodaj ekran jako osobną scenę w OBS i przełączaj się na nią przed streamem, w przerwie albo na koniec.')
        : tr('Przeciągnij źródło nad inne warstwy, żeby było widoczne na streamie.'),
  ];
};

export const seoFor = (def: OverlayDef, lang: LangId = 'pl'): SeoPage => {
  const c = COPY[def.id];
  const page = localize(lang, {
    slug: def.id,
    title: c?.title ?? def.name,
    description: c?.description ?? def.description,
    h1: def.name,
    intro: c?.intro ?? [def.description],
    features: c?.features,
    faq: [...(c?.faq ?? []), ...COMMON_FAQ],
    keywords: c?.keywords ?? [],
  });
  return { ...page, steps: obsSteps(lang, def), overlay: def.id };
};

const HOME: Draft = {
  slug: '',
  title: 'Darmowe overlaye do OBS: ekran startowy, ramki na kamerkę, śnieg',
  description: 'Darmowe animowane overlaye do OBS i Streamlabs: ekrany startu, przerwy i końca streama, świąteczne ramki na kamerkę, śnieg, konfetti, fajerwerki, pasek z tekstem i sociale. Ustaw na podglądzie i skopiuj link.',
  h1: 'Darmowe overlaye do OBS z konfiguratorem',
  intro: [
    'VXH Overlays to darmowe studio animowanych overlayów na stream. Wybierasz efekt, ustawiasz go na podglądzie i kopiujesz jeden link do źródła Przeglądarka (Browser Source) w OBS Studio, Streamlabs albo innym programie do streamowania.',
    'Bez rejestracji, bez instalowania wtyczek, bez znaku wodnego. Tło każdego overlaya jest przezroczyste, a wszystkie ustawienia siedzą w linku.',
  ],
  features: [
    'Ekrany: Zaraz startujemy, Przerwa / BRB, Koniec streama, z odliczaniem i miejscem na czat',
    'Efekty na cały ekran: śnieg, deszcz, konfetti, emoji, świetliki, płatki, fajerwerki, gwiazdy, mgła, błyskawice, glitch, ziarno filmowe',
    'Ramki na kamerkę: neon, narożniki HUD, ramka z nickiem, glitch, CRT / VHS, polaroid, 8-bit i 8 świątecznych motywów, każdy w 5 wersjach: animowanej, realistycznej, 3D, kreskówkowej i neonowej',
    'Paski i napisy: przewijany ticker, rotator sociali, pojedynczy social, belka z nazwiskiem i harmonogram',
    'Zapisywanie ustawień w przeglądarce i kody udostępniania do przenoszenia między komputerami',
    'Interfejs w 10 językach',
  ],
  faq: [
    { q: 'Jak dodać overlay do OBS?', a: 'Skopiuj link z konfiguratora, w OBS kliknij Źródła → + → Przeglądarka, wklej link w pole URL i ustaw rozmiar podany pod podglądem.' },
    ...COMMON_FAQ,
  ],
  keywords: ['overlay obs', 'darmowe overlaye', 'overlay na stream', 'ramka na kamerkę', 'starting soon', 'brb screen', 'overlay twitch'],
};

const GUIDE: Draft = {
  slug: 'obs',
  title: 'Jak dodać overlay do OBS (Browser Source) – poradnik krok po kroku',
  description: 'Jak dodać overlay z linku do OBS Studio i Streamlabs: źródło Przeglądarka, rozmiar, kolejność warstw, ramka na kamerkę i ekran startowy. Krótki poradnik z odpowiedziami na częste problemy.',
  h1: 'Jak dodać overlay do OBS',
  intro: [
    'Overlaye z overlays.vxh.pl to zwykłe strony internetowe z przezroczystym tłem. OBS wyświetla je przez źródło „Przeglądarka” (Browser Source), więc nie trzeba niczego instalować.',
  ],
  steps: [
    'Otwórz overlays.vxh.pl i wybierz overlay z listy po lewej.',
    'Ustaw wygląd w panelu „Ustawienia” po prawej. Podgląd zmienia się od razu.',
    'Pod podglądem kliknij „Kopiuj” przy „Link do Browser Source”.',
    'W OBS Studio w panelu „Źródła” kliknij +, wybierz „Przeglądarka” i nadaj nazwę.',
    'Wklej link w pole „URL”. Wpisz szerokość i wysokość podane pod podglądem (np. 1920×1080 albo 640×360 dla kamerki).',
    'Zatwierdź OK. Ustaw kolejność: efekty i ramki nad grą i kamerką, ekrany startu, przerwy i końca jako osobne sceny.',
    'Jeśli później zmienisz ustawienia, skopiuj nowy link i podmień go we właściwościach źródła.',
  ],
  faq: [
    { q: 'Overlay ma czarne tło zamiast przezroczystego. Co zrobić?', a: 'Upewnij się, że to źródło „Przeglądarka”, a nie „Okno” czy „Obraz”. We właściwościach źródła usuń własny CSS, jeśli ustawia tło.' },
    { q: 'Animacja się nie rusza albo zacina.', a: 'Zaznacz we właściwościach źródła „Wyłącz, gdy niewidoczne”, żeby niewidoczne overlaye nie obciążały komputera, i sprawdź, czy rozmiar źródła nie jest większy niż potrzeba.' },
    { q: 'Jak odświeżyć overlay po zmianie ustawień?', a: 'Wklej nowy link we właściwościach źródła albo kliknij „Odśwież pamięć podręczną bieżącej strony”.' },
    { q: 'Czy to działa w Streamlabs?', a: 'Tak. W Streamlabs Desktop dodaj źródło „Browser Source” i wklej ten sam link.' },
    ...COMMON_FAQ.slice(2),
  ],
  keywords: ['jak dodać overlay do obs', 'browser source obs', 'obs przeglądarka źródło', 'overlay streamlabs'],
};

const FAQ_DRAFT: Draft = {
  slug: 'faq',
  title: 'FAQ – najczęstsze pytania o overlaye do OBS',
  description: 'Odpowiedzi na pytania o darmowe overlaye do OBS: zapisywanie ustawień, kody udostępniania, Streamlabs, przezroczyste tło, ekrany startowe i ramki na kamerkę.',
  h1: 'Najczęstsze pytania',
  intro: ['Zebraliśmy tu odpowiedzi na pytania, które pojawiają się najczęściej przy dodawaniu overlayów do OBS.'],
  faq: [
    ...HOME.faq,
    { q: 'Jak przenieść ustawienia na inny komputer?', a: 'W zakładce „Udostępnij / import” skopiuj kod VXH1- i wklej go na drugim komputerze. Możesz też skopiować „Link do edycji”.' },
    { q: 'Czy mogę udostępnić swój overlay znajomemu?', a: 'Tak. Wyślij mu kod udostępniania albo link do edycji. Zobaczy dokładnie Twoje ustawienia i może je zmienić u siebie.' },
    { q: 'W jakich językach jest studio?', a: 'Po polsku, angielsku, niemiecku, czesku, hiszpańsku, francusku, portugalsku, rosyjsku, turecku i ukraińsku. Język zmienisz w prawym górnym rogu.' },
    ...OVERLAYS.flatMap((o) => (COPY[o.id]?.faq ?? []).slice(0, 1)),
  ].filter((f, i, all) => all.findIndex((x) => x.q === f.q) === i),
  keywords: ['overlay obs faq', 'pytania overlay'],
};

export const homePage = (lang: LangId = 'pl') => localize(lang, HOME);
export const guidePage = (lang: LangId = 'pl') => localize(lang, GUIDE);
export const faqPage = (lang: LangId = 'pl') => localize(lang, FAQ_DRAFT);

export const docsPage = (lang: LangId, slug = ''): SeoPage | null => {
  if (!slug) return homePage(lang);
  if (slug === 'obs') return guidePage(lang);
  if (slug === 'faq') return faqPage(lang);
  const def = OVERLAYS.find((o) => o.id === slug);
  return def ? seoFor(def, lang) : null;
};

export const DOC_SLUGS = ['', ...OVERLAYS.map((o) => o.id), 'obs', 'faq'];

/** Every Polish string the docs use, for the translation source file. */
export const docsSourceStrings = (): string[] => {
  const all = new Set<string>();
  const add = (d: Draft) => {
    [d.title, d.description, d.h1, ...d.intro, ...(d.features ?? []), ...(d.steps ?? []), ...d.keywords].forEach((s) => all.add(s));
    d.faq.forEach((f) => { all.add(f.q); all.add(f.a); });
  };
  [HOME, GUIDE, FAQ_DRAFT].forEach(add);
  Object.values(COPY).forEach((c) => add({ slug: '', h1: '', ...c }));
  [
    'Wybierz „{0}” na liście i ustaw wygląd na podglądzie: kolory, teksty, prędkość i inne opcje.',
    'Kliknij „Kopiuj” przy linku do Browser Source.',
    'W OBS Studio dodaj źródło: Źródła → + → Przeglądarka (Browser Source) i wklej link w pole URL.',
    'Ustaw rozmiar źródła na {0}×{1} px. Tło jest przezroczyste, nie trzeba dodawać własnego CSS.',
    'Ułóż źródło nad kamerką i dopasuj je do jej rozmiaru.',
    'Dodaj ekran jako osobną scenę w OBS i przełączaj się na nią przed streamem, w przerwie albo na koniec.',
    'Przeciągnij źródło nad inne warstwy, żeby było widoczne na streamie.',
  ].forEach((s) => all.add(s));
  return [...all];
};
