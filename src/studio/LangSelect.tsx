import { useEffect, useRef, useState } from 'react';
import { LANGS, useT, type LangId } from '../i18n';

/** Compact dropdown: one entry per language, so the header does not grow with each new translation. */
export const LangSelect = ({ onPick }: { onPick?: (l: LangId) => void }) => {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const current = LANGS.find((l) => l.id === lang)!;
  return (
    <div className="lang-select" ref={root}>
      <button type="button" className="lang-trigger" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t('Język')}: ${current.name}`} onClick={() => setOpen((v) => !v)}>
        <span className="lang-code">{current.id.toUpperCase()}</span>
        <span className="lang-name">{current.name}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="lang-list" role="listbox" aria-label={t('Język')}>
          {LANGS.map((l) => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={l.id === lang}
                onClick={() => { setOpen(false); setLang(l.id); onPick?.(l.id); }}>
                <span className="lang-code">{l.id.toUpperCase()}</span> {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
