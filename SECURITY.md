# Security / Bezpieczeństwo

## Zgłaszanie / Reporting

**PL:** Jeśli znajdziesz problem z bezpieczeństwem (np. XSS przez parametry linku albo kod `VXH1-`), nie zakładaj publicznego issue. Zgłoś go prywatnie przez [GitHub Security Advisories](https://github.com/skullboypl/Overlays-VXH/security/advisories/new). Opisz, jak to odtworzyć (najlepiej z linkiem), i daj chwilę na poprawkę przed upublicznieniem.

**EN:** If you find a security issue (for example XSS through link parameters or a `VXH1-` code), please do not open a public issue. Report it privately via [GitHub Security Advisories](https://github.com/skullboypl/Overlays-VXH/security/advisories/new). Describe how to reproduce it (ideally with a link) and allow some time for a fix before disclosure.

## Zakres / Scope

VXH Overlays to statyczna strona bez backendu, kont i bazy danych. Ustawienia są w linku i w `localStorage` przeglądarki. Wspierana jest tylko aktualna wersja z gałęzi `main`, wdrożona na [overlays.vxh.pl](https://overlays.vxh.pl/).

VXH Overlays is a static site with no backend, accounts or database. Settings live in the link and in the browser's `localStorage`. Only the current `main` branch, deployed at [overlays.vxh.pl](https://overlays.vxh.pl/), is supported.

## Sekrety / Secrets

Projekt nie potrzebuje kluczy API ani tokenów. Nie commituj plików `.env*`, kluczy, tokenów ani danych logowania (są w `.gitignore`). Jeśli coś takiego trafi do repozytorium, zgłoś to jak wyżej.

The project needs no API keys or tokens. Do not commit `.env*` files, keys, tokens or credentials (they are in `.gitignore`). If something like that ends up in the repository, report it as above.
