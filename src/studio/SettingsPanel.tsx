// Settings column: search, "changed only", collapsible groups with a jump bar, per-field reset, undo / redo.
// It only edits params; how they turn into a link stays in schema.ts, so links are not affected by anything here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { isFieldVisible, type Field, type OverlayDef, type Params } from '../overlays/schema';
import { FieldControl } from './Fields';
import { tx, useT } from '../i18n';

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const GENERAL = tx('Ogólne');

type Group = { name: string; fields: Field[] };

/** Fields without a group belong to the group above them (that is how the registry is written). */
const groupFields = (fields: Field[]): Group[] => {
  const out: Group[] = [];
  let current: Group | null = null;
  for (const f of fields) {
    const name: string = f.group ?? (current ? current.name : GENERAL);
    if (!current || current.name !== name) {
      current = out.find((g) => g.name === name) ?? null;
      if (!current) { current = { name, fields: [] }; out.push(current); }
    }
    current.fields.push(f);
  }
  return out;
};

const storeKey = (id: string) => `vxh-overlays:collapsed:${id}`;
const loadCollapsed = (id: string): string[] => {
  try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? '[]'); } catch { return []; }
};

export type History = { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void };

export const SettingsPanel = ({ def, params, defaults, onChange, onReset, history, searchRef }: {
  def: OverlayDef;
  params: Params;
  defaults: Params;
  onChange: (key: string, v: Params[string], continuous?: boolean) => void;
  onReset: () => void;
  history: History;
  searchRef: React.RefObject<HTMLInputElement>;
}) => {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>(() => loadCollapsed(def.id));
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    try { localStorage.setItem(storeKey(def.id), JSON.stringify(collapsed)); } catch { /* ignore */ }
  }, [def.id, collapsed]);

  const isChanged = (f: Field) => !same(params[f.key], defaults[f.key]);
  const visible = def.fields.filter((f) => isFieldVisible(f, params));
  const changedCount = visible.filter(isChanged).length;
  const q = fold(query.trim());
  const matches = (f: Field) => {
    if (onlyChanged && !isChanged(f)) return false;
    if (!q) return true;
    const words = [f.label, t(f.label), f.hint ?? '', f.hint ? t(f.hint) : '', f.group ?? '', f.group ? t(f.group) : '', f.key,
      ...(f.type === 'select' ? f.options.flatMap((o) => [o.label, t(o.label)]) : [])];
    return fold(words.join(' ')).includes(q);
  };
  const groups = useMemo(() => groupFields(visible).map((g) => ({ ...g, fields: g.fields.filter(matches) })).filter((g) => g.fields.length),
    [visible.map((f) => f.key).join(), q, onlyChanged, params, defaults]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtering = Boolean(q) || onlyChanged;
  const single = groupFields(visible).length === 1;

  const toggle = (name: string) => setCollapsed((c) => (c.includes(name) ? c.filter((x) => x !== name) : [...c, name]));
  const jump = (name: string) => {
    setCollapsed((c) => c.filter((x) => x !== name));
    requestAnimationFrame(() => groupRefs.current[name]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const allNames = groupFields(visible).map((g) => g.name);
  const allCollapsed = allNames.every((n) => collapsed.includes(n));

  return (
    <>
      <div className="st-settings-head">
        <h2>{t('Ustawienia')}</h2>
        <div className="st-settings-actions">
          <button type="button" className="st-icon-btn" onClick={history.undo} disabled={!history.canUndo} title={`${t('Cofnij')} (Ctrl+Z)`} aria-label={t('Cofnij')}>↶</button>
          <button type="button" className="st-icon-btn" onClick={history.redo} disabled={!history.canRedo} title={`${t('Ponów')} (Ctrl+Shift+Z)`} aria-label={t('Ponów')}>↷</button>
          <button type="button" className="st-btn ghost small" onClick={onReset} disabled={!changedCount} title={t('Wszystkie ustawienia wracają do domyślnych')}>{t('Resetuj')}</button>
        </div>
      </div>

      <div className="st-settings-tools">
        <div className="st-ssearch">
          <span aria-hidden>⌕</span>
          <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Szukaj ustawienia: kolor, czcionka...')} aria-label={t('Szukaj ustawienia')}
            onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur(); } }} />
          {query && <button type="button" onClick={() => setQuery('')} aria-label={t('Wyczyść')}>✕</button>}
        </div>
        <div className="st-settings-filters">
          <button type="button" className={`st-pill ${onlyChanged ? 'is-active' : ''}`} onClick={() => setOnlyChanged((v) => !v)} aria-pressed={onlyChanged}>
            <i className="st-dot" />{t('Zmienione')} <b>{changedCount}</b>
          </button>
          {!single && !filtering && (
            <button type="button" className="st-pill" onClick={() => setCollapsed(allCollapsed ? [] : allNames)}>
              {allCollapsed ? t('Rozwiń wszystko') : t('Zwiń wszystko')}
            </button>
          )}
        </div>
        {!single && !filtering && (
          <nav className="st-gnav" aria-label={t('Grupy ustawień')}>
            {groupFields(visible).map((g) => {
              const n = g.fields.filter(isChanged).length;
              return (
                <button key={g.name} type="button" onClick={() => jump(g.name)}>
                  {t(g.name)}{n > 0 && <i>{n}</i>}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="st-fields">
        {!groups.length && (
          <p className="st-empty">{onlyChanged && !q ? t('Nic jeszcze nie zmieniono: wszystko ma wartości domyślne.') : t('Nic nie pasuje. Spróbuj innego słowa.')}</p>
        )}
        {groups.map((g) => {
          const open = filtering || single || !collapsed.includes(g.name);
          const n = g.fields.filter(isChanged).length;
          return (
            <section key={g.name} ref={(el) => { groupRefs.current[g.name] = el; }} className={`st-gcard ${open ? 'is-open' : ''}`}>
              {!single && (
                <h3>
                  <button type="button" className="st-ghead" onClick={() => toggle(g.name)} aria-expanded={open} disabled={filtering}>
                    <span className="st-chev" aria-hidden>›</span>
                    <span className="st-ghead-title">{t(g.name)}</span>
                    {n > 0 && <span className="st-ghead-changed" title={t('Zmienione')}><i className="st-dot" />{n}</span>}
                    <em>{g.fields.length}</em>
                  </button>
                </h3>
              )}
              {open && (
                <div className="st-gbody">
                  {g.fields.map((f) => (
                    <FieldControl key={f.key} field={f} value={params[f.key]} params={params}
                      changed={isChanged(f)} onReset={() => onChange(f.key, defaults[f.key])}
                      onChange={(v, c) => onChange(f.key, v, c)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className="st-shortcuts">{t('Skróty: / szukaj ustawienia, R odtwórz podgląd od nowa, Ctrl+Z cofnij, Ctrl+Shift+Z ponów, Ctrl+K szukaj overlayu.')}</p>
    </>
  );
};
