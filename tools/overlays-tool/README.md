# VXH Overlays Tool

Mała aplikacja dla Windows (Rust, ok. 5 MB), która siedzi w zasobniku obok zegara i łączy Twój komputer z Panelem OBS:

- **Teraz gra**: czyta to, co Windows pokazuje jako „Teraz odtwarzane” (Spotify, YouTube w przeglądarce, Apple Music, Tidal, Deezer, VLC, foobar…) i wysyła tytuł, wykonawcę, okładkę i postęp do widżetu „Teraz gra” ze źródłem „Aplikacja”. Bez logowania do Spotify i bez kluczy API.
- **Skip i głosowanie z czatu**: `!skip` od moda albo streamera, `!voteskip` od widzów. Włączasz w docku panelu albo w oknie aplikacji. Czat Twitch / Kick jest czytany anonimowo, aplikacja nic na nim nie pisze.
- **Czat TikTok LIVE przez aplikację** (zalecane): aplikacja łączy się z TikTokiem z Twojego internetu, więc nie dzieli limitów z innymi streamerami na serwerze. W nakładce „Czat Twitch + Kick” ustaw „Połączenie z TikTokiem: Przez aplikację” i użyj linku ze „Steruj z Panelu OBS”. Gdy aplikacja nie działa, czat idzie przez serwer.

## Jak użyć

1. Zainstaluj jedną komendą w PowerShell (Win + X → Terminal), bez praw administratora; ta sama komenda aktualizuje:
   ```powershell
   irm https://overlays.vxh.pl/install.ps1 | iex
   ```
   Albo pobierz `VXH.Overlays.Tool.exe` z [wydań](https://github.com/skullboypl/Overlays-VXH/releases) (tag `tool-v*`). Plik jest podpisany certyfikatem EV SkullMedia Artur Spychalski, a aplikacja sama się potem aktualizuje.
2. W oknie aplikacji kliknij **Połącz z panelem**. Otworzy się Panel OBS: kliknij tam **Połącz z VXH Overlays Tool** i zgódź się na otwarcie aplikacji. Link docka trafia prosto do aplikacji na tym komputerze.
   Zamiast tego możesz skopiować link docka i w aplikacji kliknąć **Wklej link docka**.
3. TikTok: wpisz nick w karcie Konta i włącz „Czat TikTok przez aplikację”.

Zamknięcie okna chowa aplikację do zasobnika; „Zamknij” w menu ikony ją wyłącza. Stara aplikacja „VXH Now Playing” nie jest już potrzebna: nowa przejmuje jej link docka i wyłącza jej autostart.

## Wydanie

`release.ps1` (na komputerze z certyfikatem): testy, build, podpis EV (ten sam certyfikat co SmoothWizard), weryfikacja; z `-Publish` tworzy wydanie `tool-v<wersja z Cargo.toml>` na GitHubie. Zainstalowane aplikacje przy starcie same instalują nowsze wydanie, ale tylko z ważnym podpisem SkullMedia; w trakcie działania co 6 h sprawdzają i proponują aktualizację. CI nie publikuje wydań (nie ma dostępu do certyfikatu).

## Budowanie

```bash
cargo build --release                                   # na Windows
cargo build --release --target x86_64-pc-windows-gnu    # z Linuksa (mingw-w64)
cargo test
```

Test czytnika TikToka bez okna: `vxh-overlays-tool --tiktok-test <nick> [sekundy]`. Zmienne `VXH_TT_WEB` / `VXH_TT_SIGN` kierują go na lokalną atrapę serwerów.

Ustawienia: `%APPDATA%\VXH Overlays Tool\config.json`. Link docka zawiera klucz panelu i nie trafia nigdzie poza serwer panelu.

TikTok nie ma publicznego API do czatu LIVE. Aplikacja robi to samo co biblioteka tiktok-live-connector: numer pokoju z tiktok.com, podpisany adres WebSocket z Euler Stream (darmowy limit na IP), potem odczyt ramek protobuf. Gdy TikTok coś zmieni, aplikacja pokaże błąd w karcie TikTok i będzie ponawiać.
