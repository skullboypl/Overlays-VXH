# VXH Now Playing

Mała aplikacja w zasobniku Windows. Czyta to, co Windows pokazuje jako „Teraz odtwarzane” (Spotify, YouTube i YouTube Music w przeglądarce, Apple Music, Tidal, Deezer, VLC, foobar…), i wysyła tytuł, wykonawcę, okładkę i postęp utworu do Twojego Panelu OBS. Widżet „Teraz gra” ze źródłem „Aplikacja” pokazuje to na streamie.

Bez logowania do Spotify, bez kluczy API.

## Jak użyć

1. Pobierz `VXH Now Playing.exe` (Actions → ostatni build „VXH Now Playing app” → artefakt, albo wydanie `nowplaying-v*`).
2. Uruchom. Windows może ostrzec, że aplikacja nie jest podpisana: „Więcej informacji” → „Uruchom mimo to”.
3. Na stronie **Panel OBS** kliknij „Kopiuj” przy linku docka.
4. Kliknij ikonę w zasobniku → **Wklej link docka ze schowka**.
5. W studiu w widżecie **Teraz gra** ustaw **Źródło: Aplikacja** i skopiuj link z „Steruj z Panelu OBS”.

W menu ikony: wybór źródła (wszystko / tylko Spotify / tylko przeglądarka / programy muzyczne), uruchamianie z Windows, zamknięcie.

## Skip i głosowanie z czatu

W docku Panelu OBS, w sekcji **Muzyka (VXH Now Playing)**, włączasz osobno:

- **Skip dla modów i streamera**: `!skip` od moderatora albo streamera od razu przełącza utwór.
- **Głosowanie widzów na następny**: `!voteskip` od widzów; po zebraniu ustawionej liczby głosów (jeden głos na osobę na utwór) utwór się przełącza.

Tam też ustawisz liczbę głosów, przerwę między skipami i nazwy komend, a przyciskiem „Następny utwór” przełączysz utwór z docka. Aplikacja czyta czat kanałów Twitch / Kick podpiętych w panelu (anonimowo, nic nie pisze na czacie) i wysyła do odtwarzacza systemowe „następny”. Działa w Spotify, playlistach YouTube i w większości odtwarzaczy. Widżet pokazuje pasek głosów i kto pominął utwór (opcja „Pokaż głosowanie !voteskip i skipy”).

## Budowanie

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -o out
```

Działa też na Linuksie (`EnableWindowsTargeting`), bo aplikacja nie używa WinForms ani WPF: ikona w zasobniku idzie przez Windows API.

Ustawienia: `%APPDATA%\VXH Now Playing\config.json`. Link docka zawiera klucz panelu i nie trafia nigdzie poza serwer panelu.
