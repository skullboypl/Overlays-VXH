import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OVERLAYS } from '../overlays/registry';
import { MORE_MENU } from '../overlays/more';
import type { OverlayDef } from '../overlays/schema';
import { tx, useT } from '../i18n';
import { useLiveStats } from '../stats';

/** Order of the left menu: what people set up first comes first; the 20 effects get their own sub-groups. */
export const MENU_GROUPS: { id: string; title: string; note: string; items?: string[]; sub?: { title: string; items: string[] }[]; compact?: boolean }[] = [
  { id: 'screens', title: tx('Ekrany na stream'), note: tx('Start, przerwa, koniec'), items: ['startpro', 'brbpro', 'endpro', 'starting', 'brb', 'ending', 'videobg'] },
  { id: 'scenes', title: tx('Sceny z kamerką'), note: tx('Gotowy układ sceny'), items: ['camscene', 'fullcam'] },
  { id: 'frames', title: tx('Ramki na kamerkę'), note: tx('Na źródło kamerki'), items: ['proframe', 'faceitcam', 'holiday', 'neon', 'nametag', 'corners', 'glitchframe', 'retroframe', 'polaroid', 'pixelframe', 'hudframe', 'comicframe', 'doodleframe', 'ornateframe'] },
  { id: 'bars', title: tx('Paski i sociale'), note: tx('Info dla widzów'), items: ['socials', 'social', 'ticker', 'lowerthird', 'schedule', 'textfx', 'logo'] },
  { id: 'tools', title: tx('Narzędzia streamera'), note: tx('Licznik, zegar, cel, QR'), items: ['timer', 'clock', 'goal', 'reminder', 'qr', 'qrrotator'] },
  { id: 'widgets', title: tx('Widżety dla widzów'), note: tx('Ankiety, rankingi, giveaway'), items: [] },
  {
    id: 'effects', title: tx('Efekty'), note: tx('Na całą scenę'), compact: true, sub: [
      { title: tx('Pogoda i natura'), items: ['snow', 'rain', 'petals', 'fireflies', 'bubbles'] },
      { title: tx('Impreza i święta'), items: ['confetti', 'balloons', 'fireworks', 'emoji'] },
      { title: tx('Światło i klimat'), items: ['bokeh', 'sparkles', 'embers', 'meteors', 'stars', 'dust', 'fog', 'lightning'] },
      { title: tx('Styl obrazu'), items: ['digital', 'grain', 'glitch'] },
    ],
  },
  { id: 'characters', title: tx('Postacie'), note: tx('Animowane w pętli'), items: ['character'] },
];

/** Shown with a "new" badge in the menu. */
const NEW_IDS = new Set(['startpro', 'brbpro', 'endpro', 'hudframe', 'comicframe', 'doodleframe', 'ornateframe', 'glitchframe', 'retroframe',
  'polaroid', 'pixelframe', 'logo', 'textfx', 'social', 'lowerthird', 'schedule', 'qrrotator', 'fog', 'dust', 'lightning', 'glitch']);

// Add-on overlays (src/overlays/more) slot into their menu groups and count as new.
for (const [where, ids] of Object.entries(MORE_MENU)) {
  const [groupId, sub] = where.split(':');
  const g = MENU_GROUPS.find((x) => x.id === groupId);
  if (!g) continue;
  if (sub && g.sub) (g.sub.find((x) => x.title === tx(sub)) ?? g.sub[g.sub.length - 1]).items.push(...ids);
  else (g.items ??= []).push(...ids);
  ids.forEach((id) => NEW_IDS.add(id));
}

const BY_ID = new Map(OVERLAYS.map((o) => [o.id, o]));
const pick = (ids: string[]) => ids.map((id) => BY_ID.get(id)).filter((o): o is OverlayDef => Boolean(o));
const LISTED = new Set(MENU_GROUPS.flatMap((g) => [...(g.items ?? []), ...(g.sub ?? []).flatMap((s) => s.items)]));

const STORE = 'vxh-overlays:menu-closed';
const FAVS = 'vxh-overlays:favs';
const RECENT = 'vxh-overlays:recent';
const DENSE = 'vxh-overlays:menu-dense';
const loadList = (key: string): string[] => {
  try { const v = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
};
const saveList = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } };
const loadClosed = () => loadList(STORE);

/** Called by the editor when an overlay opens; the menu lists the last few. */
export const rememberRecent = (id: string) => {
  saveList(RECENT, [id, ...loadList(RECENT).filter((x) => x !== id)].slice(0, 8));
  window.dispatchEvent(new Event('vxh-recent'));
};

/** Diacritics-free, lower-case text for the search box. */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

export const OverlayMenu = ({ active, onPick }: { active: string; onPick: () => void }) => {
  const { t } = useT();
  const stats = useLiveStats();
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<string[]>(loadClosed);
  const [favs, setFavs] = useState<string[]>(() => loadList(FAVS));
  const [recent, setRecent] = useState<string[]>(() => loadList(RECENT));
  const [dense, setDense] = useState(() => { try { return localStorage.getItem(DENSE) === '1'; } catch { return false; } });
  useEffect(() => {
    const on = () => setRecent(loadList(RECENT));
    window.addEventListener('vxh-recent', on);
    return () => window.removeEventListener('vxh-recent', on);
  }, []);
  const toggleFav = (id: string) => setFavs((f) => {
    const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
    saveList(FAVS, next);
    return next;
  });
  const toggleDense = () => setDense((d) => { try { localStorage.setItem(DENSE, d ? '0' : '1'); } catch { /* ignore */ } return !d; });
  const q = fold(query.trim());

  const toggle = (id: string) => setClosed((c) => {
    const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
    try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const matches = useMemo(() => {
    if (!q) return null;
    return OVERLAYS.filter((o) => fold(`${o.id} ${t(o.name)} ${t(o.description)} ${o.name}`).includes(q));
  }, [q, t]);

  const live = (id: string) => stats?.byType[id] ?? 0;
  const item = (o: OverlayDef, compact = false, keyPrefix = '') => (
    <Link key={keyPrefix + o.id} to={`/${o.id}`} onClick={onPick} title={compact || dense ? t(o.description) : undefined}
      className={`st-item ${compact ? 'is-compact' : ''} ${dense ? 'is-dense' : ''} ${o.id === active ? 'is-active' : ''}`}>
      <span className="st-item-icon" aria-hidden>
        {o.icon}
        {/* Small tiles: the live count sits on the icon, so it never covers the name. */}
        {compact && live(o.id) > 0 && <span className="st-live-badge is-on-icon"><i />{live(o.id)}</span>}
      </span>
      <span className="st-item-text">
        <b>{t(o.name)}{NEW_IDS.has(o.id) && <span className="st-new">{t('Nowe')}</span>}</b>
        {!compact && !dense && <small>{t(o.description)}</small>}
      </span>
      {!compact && live(o.id) > 0 && <span className="st-live-badge" title={t('Teraz w OBS')}><i />{live(o.id)}</span>}
      <button type="button" className={`st-fav ${favs.includes(o.id) ? 'is-on' : ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(o.id); }}
        aria-pressed={favs.includes(o.id)} aria-label={favs.includes(o.id) ? t('Usuń z ulubionych') : t('Dodaj do ulubionych')}
        title={favs.includes(o.id) ? t('Usuń z ulubionych') : t('Dodaj do ulubionych')}>★</button>
    </Link>
  );

  // Overlays added to the registry but not placed in GROUPS yet still show up, at the end.
  const rest = OVERLAYS.filter((o) => !LISTED.has(o.id));

  return (
    <>
      <div className="st-search">
        <span aria-hidden>⌕</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Szukaj: śnieg, ramka, BRB...')} aria-label={t('Szukaj overlayu')} />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={t('Wyczyść')}>✕</button>}
        <button type="button" className={`st-dense ${dense ? 'is-active' : ''}`} onClick={toggleDense} aria-pressed={dense}
          title={dense ? t('Pokaż opisy') : t('Ukryj opisy (lista kompaktowa)')} aria-label={t('Lista kompaktowa')}>☰</button>
      </div>

      {!q && (
        <Link to="/panel" className="st-panel-entry" onClick={onPick}>
          <span aria-hidden>🎛️</span>
          <span><b>{t('Panel OBS')}</b><small>{t('Steruj overlayami z docka w OBS')}</small></span>
        </Link>
      )}
      {matches ? (
        <section className="st-mgroup">
          <h2 className="st-mhead is-static"><span>{t('Wyniki')}</span><small>{matches.length}</small></h2>
          {matches.length ? matches.map((o) => item(o)) : <p className="st-empty">{t('Nic nie pasuje. Spróbuj innego słowa.')}</p>}
        </section>
      ) : (
        <>
          {(favs.length > 0 || recent.filter((id) => id !== active).length > 0) && (
            <section className="st-mgroup is-open st-quick">
              {favs.length > 0 && (
                <div className="st-sub">
                  <h3>★ {t('Ulubione')}</h3>
                  <div className="st-tiles">{pick(favs).map((o) => item(o, true, 'fav-'))}</div>
                </div>
              )}
              {recent.filter((id) => id !== active && !favs.includes(id)).length > 0 && (
                <div className="st-sub">
                  <h3>🕘 {t('Ostatnio otwierane')}</h3>
                  <div className="st-tiles">{pick(recent.filter((id) => id !== active && !favs.includes(id)).slice(0, 4)).map((o) => item(o, true, 'rec-'))}</div>
                </div>
              )}
            </section>
          )}
          {MENU_GROUPS.map((g) => {
            const all = pick([...(g.items ?? []), ...(g.sub ?? []).flatMap((s) => s.items)]);
            const isOpen = !closed.includes(g.id) || all.some((o) => o.id === active);
            const sum = all.reduce((n, o) => n + live(o.id), 0);
            return (
              <section key={g.id} className={`st-mgroup ${isOpen ? 'is-open' : ''}`}>
                <h2>
                  <button type="button" className="st-mhead" onClick={() => toggle(g.id)} aria-expanded={isOpen} title={t(g.note)}>
                    <span className="st-chev" aria-hidden>›</span>
                    <span className="st-mhead-title">{t(g.title)}</span>
                    {sum > 0 && <span className="st-live-badge" title={t('Teraz w OBS')}><i />{sum}</span>}
                    <em>{all.length}</em>
                  </button>
                </h2>
                {isOpen && (g.sub ? g.sub.map((s) => (
                  <div key={s.title} className="st-sub">
                    <h3>{t(s.title)}</h3>
                    <div className="st-tiles">{pick(s.items).map((o) => item(o, true))}</div>
                  </div>
                )) : pick(g.items ?? []).map((o) => item(o)))}
              </section>
            );
          })}
          {rest.length > 0 && <section className="st-mgroup is-open">{rest.map((o) => item(o))}</section>}
        </>
      )}
    </>
  );
};
