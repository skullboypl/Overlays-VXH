import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { findOverlay } from '../overlays/registry';
import { useT } from '../i18n';
import { useLiveStats } from '../stats';

/** Header counter: how many overlays are open in OBS right now, with the most used ones on click. */
export const LivePill = () => {
  const { t } = useT();
  const stats = useLiveStats();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  // No counter locally or when the server is down: show nothing rather than a broken "0".
  if (!stats) return null;
  const top = Object.entries(stats.byType)
    .map(([id, n]) => ({ def: findOverlay(id), n }))
    .filter((r) => r.def)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.n));

  return (
    <div className="st-livewrap" ref={ref}>
      <button type="button" className={`st-live ${stats.live ? '' : 'is-zero'}`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="st-live-dot" aria-hidden><i /></span>
        <strong>{stats.live.toLocaleString()}</strong>
        <span className="st-live-label">{t('w OBS teraz')}</span>
      </button>
      {open && (
        <div className="st-live-pop" role="dialog" aria-label={t('Teraz w OBS')}>
          <div className="st-live-pop-head">
            <b>{t('Teraz w OBS')}</b>
            <span>{t('Rekord dziś')}: <strong>{stats.peakToday.toLocaleString()}</strong></span>
          </div>
          {top.length ? (
            <ul>
              {top.map(({ def, n }) => (
                <li key={def!.id}>
                  <Link to={`/${def!.id}`} onClick={() => setOpen(false)}>
                    <span aria-hidden>{def!.icon}</span>
                    <span className="st-live-name">{t(def!.name)}</span>
                    <span className="st-live-bar"><i style={{ width: `${(n / max) * 100}%` }} /></span>
                    <strong>{n}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p>{t('Na razie nikt nie ma otwartego overlayu. Bądź pierwszy!')}</p>}
          <small>{t('Liczymy źródła otwarte w OBS w ostatnich 3 minutach, anonimowo.')}</small>
        </div>
      )}
    </div>
  );
};
