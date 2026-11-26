import { useEffect, useState } from 'react';
import { visibleOptions, type Field, type Params } from '../overlays/schema';
import { LinesEditor, SocialsEditor } from './ListEditors';
import { useT } from '../i18n';

type Props = {
  field: Field;
  value: Params[string];
  /** `continuous`: one of many events of a drag or of typing; the studio merges those into one undo step. */
  onChange: (v: Params[string], continuous?: boolean) => void;
  params?: Params;
  /** The value differs from the default: shows a dot and a reset button. */
  changed?: boolean;
  onReset?: () => void;
};

const fmt = (v: number, step: number) => (step < 1 ? v.toFixed(step < 0.1 ? 2 : 1) : String(v));
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

/** Colours offered next to every colour field: the studio palette plus the ones used most often on stream. */
const PALETTE = ['#ff5900', '#ff2d6f', '#7a5cff', '#3bceac', '#7aa2ff', '#ffd23f', '#9146ff', '#53fc18', '#ffffff', '#111114'];

const ColorInput = ({ value, onChange }: { value: string; onChange: (v: string, continuous?: boolean) => void }) => (
  <label className="st-swatch" style={{ background: value }}>
    <input type="color" value={value} onChange={(e) => onChange(e.currentTarget.value, true)} />
  </label>
);

/** Hex code you can type into; applied once it is a full #rrggbb. */
const HexInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [draft, setDraft] = useState(value.toUpperCase());
  useEffect(() => setDraft(value.toUpperCase()), [value]);
  return (
    <input className={`st-hex ${isHex(draft) ? '' : 'is-bad'}`} value={draft} maxLength={7} spellCheck={false} aria-label="HEX"
      onChange={(e) => {
        const v = e.currentTarget.value.startsWith('#') ? e.currentTarget.value : `#${e.currentTarget.value}`;
        setDraft(v.toUpperCase());
        if (isHex(v)) onChange(v.toLowerCase());
      }}
      onBlur={() => setDraft(value.toUpperCase())} />
  );
};

/** Number box next to a slider: type an exact value, clamped to the slider's range. */
const NumberInput = ({ value, field, onChange }: { value: number; field: Extract<Field, { type: 'range' }>; onChange: (v: number) => void }) => {
  const [draft, setDraft] = useState(fmt(value, field.step));
  useEffect(() => setDraft(fmt(value, field.step)), [value, field.step]);
  const commit = () => {
    const n = Number(draft.replace(',', '.'));
    if (Number.isFinite(n)) onChange(Math.min(field.max, Math.max(field.min, Math.round(n / field.step) * field.step)));
    else setDraft(fmt(value, field.step));
  };
  return (
    <span className="st-num">
      <input inputMode="decimal" value={draft} onChange={(e) => setDraft(e.currentTarget.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.min(field.max, Math.max(field.min, +(value + (e.key === 'ArrowUp' ? 1 : -1) * field.step * (e.shiftKey ? 10 : 1)).toFixed(4))));
          }
        }}
        aria-label={field.label} />
      {field.unit && <i>{field.unit.trim()}</i>}
    </span>
  );
};

/** Label row: name, "changed" dot, reset button and an optional value on the right. */
const Head = ({ label, changed, onReset, children }: { label: string; changed?: boolean; onReset?: () => void; children?: React.ReactNode }) => {
  const { t } = useT();
  return (
    <div className="st-field-head">
      <span className="st-label">
        {t(label)}
        {changed && onReset && (
          <button type="button" className="st-reset" onClick={(e) => { e.preventDefault(); onReset(); }} title={t('Przywróć domyślne')} aria-label={`${t('Przywróć domyślne')}: ${t(label)}`}>↺</button>
        )}
      </span>
      {children}
    </div>
  );
};

/** Picture grid (backgrounds, layouts). Long lists get a filter and fold to three rows, keeping the selected one in view. */
const Tiles = ({ field, value, params, onChange }: { field: Extract<Field, { type: 'select' }>; value: string; params: Params; onChange: (v: string) => void }) => {
  const { t } = useT();
  const [filter, setFilter] = useState('');
  const [all, setAll] = useState(false);
  const options = visibleOptions(field, params);
  const long = options.length > 12;
  const q = fold(filter.trim());
  const shown = q ? options.filter((o) => fold(`${o.label} ${t(o.label)} ${o.value}`).includes(q)) : options;
  const FOLD = 9;
  let list = shown;
  if (long && !all && !q) {
    list = shown.slice(0, FOLD);
    const sel = shown.find((o) => o.value === value);
    if (sel && !list.includes(sel)) list = [...list.slice(0, FOLD - 1), sel];
  }
  return (
    <>
      {long && (
        <input type="search" className="st-text st-tilefilter" value={filter} onChange={(e) => setFilter(e.currentTarget.value)}
          placeholder={t('Filtruj: święta, neon, wideo...')} aria-label={t('Filtruj')} />
      )}
      <div className="st-pick">
        {list.map((o) => (
          <button key={o.value} type="button" className={`st-tile ${o.value === value ? 'is-active' : ''}`} onClick={() => onChange(o.value)} title={t(o.label)}>
            <span className="st-tile-img" style={{ background: field.swatches![o.value] ?? '#222' }} />
            <span className="st-tile-label">{t(o.label)}</span>
          </button>
        ))}
      </div>
      {!shown.length && <p className="st-hint">{t('Nic nie pasuje. Spróbuj innego słowa.')}</p>}
      {long && !q && (
        <button type="button" className="st-more" onClick={() => setAll((v) => !v)}>
          {all ? t('Pokaż mniej') : `${t('Pokaż wszystkie')} (${options.length})`}
        </button>
      )}
    </>
  );
};

export const FieldControl = ({ field, value, onChange, params = {}, changed, onReset }: Props) => {
  const { t } = useT();
  const cls = `st-field ${changed ? 'is-changed' : ''}`;
  switch (field.type) {
    case 'range': {
      const v = value as number;
      const pct = ((v - field.min) / (field.max - field.min)) * 100;
      return (
        <div className={cls}>
          <Head label={field.label} changed={changed} onReset={onReset}>
            <NumberInput value={v} field={field} onChange={onChange} />
          </Head>
          <input
            type="range"
            className="st-range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={v}
            style={{ '--pct': `${pct}%` } as React.CSSProperties}
            onChange={(e) => onChange(Number(e.currentTarget.value), true)}
            onDoubleClick={() => onReset?.()}
            aria-label={t(field.label)}
          />
          {field.hint && <p className="st-hint">{t(field.hint)}</p>}
        </div>
      );
    }
    case 'color':
      return (
        <div className={cls}>
          <Head label={field.label} changed={changed} onReset={onReset}>
            <div className="st-color">
              <HexInput value={value as string} onChange={onChange} />
              <ColorInput value={value as string} onChange={onChange} />
            </div>
          </Head>
          <div className="st-palette" role="group" aria-label={t('Szybkie kolory')}>
            {PALETTE.map((c) => (
              <button key={c} type="button" className={c === String(value).toLowerCase() ? 'is-active' : ''} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} title={c.toUpperCase()} />
            ))}
          </div>
          {field.hint && <p className="st-hint">{t(field.hint)}</p>}
        </div>
      );
    case 'colors': {
      const list = value as string[];
      const max = field.max ?? 6;
      return (
        <div className={cls}>
          <Head label={field.label} changed={changed} onReset={onReset}><output>{list.length}/{max}</output></Head>
          <div className="st-colors">
            {list.map((col, i) => (
              <div key={i} className="st-colors-item">
                <ColorInput value={col} onChange={(v, c2) => onChange(list.map((c, j) => (j === i ? v : c)), c2)} />
                {list.length > 1 && (
                  <button type="button" className="st-colors-x" aria-label={t('Usuń kolor')} onClick={() => onChange(list.filter((_, j) => j !== i))}>
                    ×
                  </button>
                )}
              </div>
            ))}
            {list.length < max && (
              <button type="button" className="st-colors-add" aria-label={t('Dodaj kolor')} onClick={() => onChange([...list, list[list.length - 1]])}>
                +
              </button>
            )}
            {list.length > 1 && (
              <button type="button" className="st-colors-add" title={t('Odwróć kolejność')} aria-label={t('Odwróć kolejność')} onClick={() => onChange([...list].reverse())}>⇄</button>
            )}
          </div>
          {field.hint && <p className="st-hint">{t(field.hint)}</p>}
        </div>
      );
    }
    case 'toggle':
      return (
        <label className={`${cls} st-field-row st-toggle-row`}>
          <span>
            <span className="st-label">
              {t(field.label)}
              {changed && onReset && <button type="button" className="st-reset" onClick={(e) => { e.preventDefault(); onReset(); }} title={t('Przywróć domyślne')} aria-label={t('Przywróć domyślne')}>↺</button>}
            </span>
            {field.hint && <p className="st-hint">{t(field.hint)}</p>}
          </span>
          <input type="checkbox" className="st-toggle" checked={value as boolean} onChange={(e) => onChange(e.currentTarget.checked)} />
        </label>
      );
    case 'select': {
      if (field.swatches)
        return (
          <div className={cls}>
            <Head label={field.label} changed={changed} onReset={onReset} />
            <Tiles field={field} value={value as string} params={params} onChange={onChange} />
            {field.hint && <p className="st-hint">{t(field.hint)}</p>}
          </div>
        );
      const options = visibleOptions(field, params);
      // Long lists (20 effects, 13 animations) as a dropdown; short ones stay one click away.
      if (options.length > 10)
        return (
          <div className={cls}>
            <Head label={field.label} changed={changed} onReset={onReset} />
            <div className="st-selectwrap">
              <select className="st-select" value={value as string} onChange={(e) => onChange(e.currentTarget.value)} aria-label={t(field.label)}>
                {options.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
              </select>
              <span className="st-select-step">
                {[-1, 1].map((d) => (
                  <button key={d} type="button" aria-label={d < 0 ? t('Poprzednia opcja') : t('Następna opcja')}
                    onClick={() => {
                      const i = options.findIndex((o) => o.value === value);
                      onChange(options[(i + d + options.length) % options.length].value);
                    }}>{d < 0 ? '‹' : '›'}</button>
                ))}
              </span>
            </div>
            {field.hint && <p className="st-hint">{t(field.hint)}</p>}
          </div>
        );
      return (
        <div className={cls}>
          <Head label={field.label} changed={changed} onReset={onReset} />
          <div className={`st-seg ${options.length > 3 ? 'is-wrap' : ''}`}>
            {options.map((o) => (
              <button key={o.value} type="button" className={o.value === value ? 'is-active' : ''} onClick={() => onChange(o.value)} aria-pressed={o.value === value}>
                {t(o.label)}
              </button>
            ))}
          </div>
          {field.hint && <p className="st-hint">{t(field.hint)}</p>}
        </div>
      );
    }
    case 'text': {
      if (field.list)
        return (
          <div className={cls}>
            <Head label={field.label} changed={changed} onReset={onReset} />
            {field.list === 'socials'
              ? <SocialsEditor value={value as string} onChange={onChange} />
              : <LinesEditor value={value as string} onChange={onChange} placeholder={field.placeholder && t(field.placeholder)} />}
            {field.hint && <p className="st-hint">{t(field.hint)}</p>}
          </div>
        );
      const text = value as string;
      const max = field.maxLength ?? 120;
      return (
        <div className={cls}>
          <Head label={field.label} changed={changed} onReset={onReset}>
            {text.length >= max * 0.85 && <output className={text.length >= max ? 'is-full' : ''}>{text.length}/{max}</output>}
          </Head>
          <input
            type="text"
            className="st-text"
            value={text}
            maxLength={max}
            placeholder={field.placeholder && t(field.placeholder)}
            onChange={(e) => onChange(e.currentTarget.value, true)}
            aria-label={t(field.label)}
          />
          {field.hint && <p className="st-hint">{t(field.hint)}</p>}
        </div>
      );
    }
  }
};
