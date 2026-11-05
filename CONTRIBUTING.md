# Współpraca / Contributing

[Polski](#polski) · [English](#english)

## Polski

Dzięki, że chcesz pomóc. Projekt jest mały, więc zasady też są krótkie.

- **Błąd albo pomysł:** otwórz [issue](https://github.com/skullboypl/Overlays-VXH/issues/new/choose). Przy błędzie wklej link do OBS albo link do edycji z ustawieniami, przy których to widać, i dodaj zrzut ekranu.
- **Większa zmiana** (nowy overlay, przebudowa studia): najpierw issue, żeby ustalić kierunek, zanim spędzisz nad tym czas.
- **Przed PR** uruchom lokalnie:

  ```bash
  pnpm install
  pnpm build   # tsc --noEmit, vite build, prerender
  ```

  To samo sprawdza CI na każdym pushu i PR.
- **Nowy overlay:** wpis w `src/overlays/registry.ts` i renderer w `src/overlays/Overlay.tsx`. Szczegóły w [README](./README.md#jak-dodać-nowy-overlay).
- **Nie psuj istniejących linków.** Streamerzy mają je wklejone w OBS. Nie zmieniaj `id` overlaya, kluczy pól ani wartości domyślnych bez wyraźnego powodu (zmiana domyślnej wartości zmienia wygląd wszystkich linków, które jej nie nadpisują).
- **Styl:** TypeScript strict, mały i czytelny kod, bez nowych zależności, jeśli da się bez nich. Teksty w interfejsie po polsku.
- Jeden PR = jedna rzecz. Opisz, co zmieniasz, a przy zmianach wizualnych dodaj zrzut ekranu.

Wysyłając PR, zgadzasz się na udostępnienie zmian na licencji [MIT](./LICENSE).

## English

Thanks for helping. The project is small, so the rules are short too.

- **Bug or idea:** open an [issue](https://github.com/skullboypl/Overlays-VXH/issues/new/choose). For bugs, paste the OBS link or edit link with the settings that show the problem and add a screenshot.
- **Bigger change** (new overlay, studio rework): open an issue first to agree on the direction before you spend time on it.
- **Before a PR** run locally:

  ```bash
  pnpm install
  pnpm build   # tsc --noEmit, vite build, prerender
  ```

  CI runs the same on every push and PR.
- **New overlay:** an entry in `src/overlays/registry.ts` and a renderer in `src/overlays/Overlay.tsx`. Details in the [README](./README.en.md#adding-a-new-overlay).
- **Do not break existing links.** Streamers have them pasted into OBS. Do not change an overlay `id`, field keys or default values without a clear reason (changing a default changes every link that does not override it).
- **Style:** strict TypeScript, small readable code, no new dependencies unless really needed. UI copy is in Polish.
- One PR = one thing. Describe what you change and add a screenshot for visual changes.

By sending a PR you agree to license your changes under [MIT](./LICENSE).
