import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OVERLAYS } from '../overlays/registry';
import type { OverlayDef } from '../overlays/schema';
import { tx, useT } from '../i18n';
import { useLiveStats } from '../stats';

/** Order of the left menu: what people set up first comes first; the 16 effects get their own sub-groups. */
const GROUPS: { id: string; title: string; note: string; items?: string[]; sub?: { title: string; items: string[] }[]; compact?: boolean }[] = [
  { id: 'screens', title: tx('Ekrany na stream'), note: tx('Start, przerwa, koniec'), items: ['starting', 'brb', 'ending', 'videobg'] },
  { id: 'scenes', title: tx('Sceny z kamerką'), note: tx('Gotowy układ sceny'), items: ['camscene', 'fullcam'] },
  { id: 'frames', title: tx('Ramki na kamerkę'), note: tx('Na źródło kamerki'), items: ['proframe', 'faceitcam', 'holiday', 'neon', 'nametag', 'corners'] },
  { id: 'bars', title: tx('Paski i sociale'), note: tx('Info dla widzów'), items: ['socials', 'ticker'] },
  { id: 'tools', title: tx('Narzędzia streamera'), note: tx('Licznik, zegar, cel, QR'), items: ['timer', 'clock', 'goal', 'reminder', 'qr'] },
  {
    id: 'effects', title: tx('Efekty'), note: tx('Na całą scenę'), compact: true, sub: [
      { title: tx('Pogoda i natura'), items: ['snow', 'rain', 'petals', 'fireflies', 'bubbles'] },
      { title: tx('Impreza i święta'), items: ['confetti', 'balloons', 'fireworks', 'emoji'] },
      { title: tx('Światło i klimat'), items: ['bokeh', 'sparkles', 'embers', 'meteors', 'stars'] },
      { title: tx('Styl obrazu'), items: ['digital', 'grain'] },
    ],
  },
  { id: 'characters', title: tx('Postacie'), note: tx('Animowane w pętli'), items: ['character'] },
];

const BY_ID = new Map(OVERLAYS.map((o) => [o.id, o]));
const pick = (ids: string[]) => ids.map((id) => BY_ID.get(id)).filter((o): o is OverlayDef => Boolean(o));
const LISTED = new Set(GROUPS.flatMap((g) => [...(g.items ?? []), ...(g.sub ?? []).flatMap((s) => s.items)]));

const STORE = 'vxh-overlays:menu-closed';
const loadClosed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '[]'); } catch { return []; }
};

/** Diacritics-free, lower-case text for the search box. */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

export const OverlayMenu = ({ active, onPick }: { active: string; onPick: () => void }) => {
  const { t } = useT();
  const stats = useLiveStats();
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<string[]>(loadClosed);
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
  const item = (o: OverlayDef, compact = false) => (
    <Link key={o.id} to={`/${o.id}`} onClick={onPick} title={compact ? t(o.description) : undefined}
      className={`st-item ${compact ? 'is-compact' : ''} ${o.id === active ? 'is-active' : ''}`}>
      <span className="st-item-icon" aria-hidden>{o.icon}</span>
      <span className="st-item-text">
        <b>{t(o.name)}</b>
        {!compact && <small>{t(o.description)}</small>}
      </span>
      {live(o.id) > 0 && <span className="st-live-badge" title={t('Teraz w OBS')}><i />{live(o.id)}</span>}
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
      </div>

      {matches ? (
        <section className="st-mgroup">
          <h2 className="st-mhead is-static"><span>{t('Wyniki')}</span><small>{matches.length}</small></h2>
          {matches.length ? matches.map((o) => item(o)) : <p className="st-empty">{t('Nic nie pasuje. Spróbuj innego słowa.')}</p>}
        </section>
      ) : (
        <>
          {GROUPS.map((g) => {
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
