# VXH Overlays

**overlays.vxh.pl** – darmowe animowane overlaye do OBS / Streamlabs z konfiguratorem w stylu FACEIT Banner Studio.

Wybierasz efekt, ustawiasz wygląd na podglądzie i kopiujesz link do **Browser Source**. Tło strony overlaya jest przezroczyste.

## Overlaye

| Pełny ekran (1920×1080) | Kamerka (640×360) |
| --- | --- |
| Śnieg, Deszcz, Konfetti (deszcz / wybuch), Unoszące się emoji, Świetliki, Płatki / liście, Ziarno + winieta | Neonowa ramka, Narożniki HUD, Ramka z podpisem |

## Jak to działa

- `/` i `/:id` – studio (lista, podgląd, ustawienia, link).
- `/o/:id?…` – sam overlay dla OBS. W linku są tylko ustawienia różne od domyślnych, kolory bez `#`.
- Nowy overlay = wpis w [`src/overlays/registry.ts`](src/overlays/registry.ts) (pola konfiguratora) + render w [`src/overlays/Overlay.tsx`](src/overlays/Overlay.tsx).
  Efekty cząsteczkowe mają wspólny silnik canvas w [`src/overlays/particles.ts`](src/overlays/particles.ts), ramki są w CSS ([`frames.tsx`](src/overlays/frames.tsx), [`overlay.css`](src/overlays/overlay.css)).
- Ustawienia każdego overlaya zapisują się w `localStorage` przeglądarki.

## Uruchomienie

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # dist/
```

## Deploy (CapRover)

`captain-definition` → `Dockerfile` (build Vite, potem nginx z fallbackiem SPA z [`deploy/nginx.conf`](deploy/nginx.conf)). Domena: `overlays.vxh.pl`.
# Overlays-VXH
