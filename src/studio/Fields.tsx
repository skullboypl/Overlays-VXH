import type { Field, Params } from '../overlays/schema';
import { LinesEditor, SocialsEditor } from './ListEditors';

type Props = { field: Field; value: Params[string]; onChange: (v: Params[string]) => void };

const fmt = (v: number, step: number) => (step < 1 ? v.toFixed(step < 0.1 ? 2 : 1) : String(v));

const ColorInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <label className="st-swatch" style={{ background: value }}>
    <input type="color" value={value} onChange={(e) => onChange(e.currentTarget.value)} />
  </label>
);

export const FieldControl = ({ field, value, onChange }: Props) => {
  switch (field.type) {
    case 'range': {
      const v = value as number;
      const pct = ((v - field.min) / (field.max - field.min)) * 100;
      return (
        <div className="st-field">
          <div className="st-field-head">
            <span>{field.label}</span>
            <output>{fmt(v, field.step)}{field.unit ?? ''}</output>
          </div>
          <input
            type="range"
            className="st-range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={v}
            style={{ '--pct': `${pct}%` } as React.CSSProperties}
            onChange={(e) => onChange(Number(e.currentTarget.value))}
          />
          {field.hint && <p className="st-hint">{field.hint}</p>}
        </div>
      );
    }
    case 'color':
      return (
        <div className="st-field st-field-row">
          <span>{field.label}</span>
          <div className="st-color">
            <code>{(value as string).toUpperCase()}</code>
            <ColorInput value={value as string} onChange={onChange} />
          </div>
        </div>
      );
    case 'colors': {
      const list = value as string[];
      const max = field.max ?? 6;
      return (
        <div className="st-field">
          <div className="st-field-head"><span>{field.label}</span><output>{list.length}/{max}</output></div>
          <div className="st-colors">
            {list.map((col, i) => (
              <div key={i} className="st-colors-item">
                <ColorInput value={col} onChange={(v) => onChange(list.map((c, j) => (j === i ? v : c)))} />
                {list.length > 1 && (
                  <button type="button" className="st-colors-x" aria-label="Usuń kolor" onClick={() => onChange(list.filter((_, j) => j !== i))}>
                    ×
                  </button>
                )}
              </div>
            ))}
            {list.length < max && (
              <button type="button" className="st-colors-add" aria-label="Dodaj kolor" onClick={() => onChange([...list, list[list.length - 1]])}>
                +
              </button>
            )}
          </div>
        </div>
      );
    }
    case 'toggle':
      return (
        <label className="st-field st-field-row st-toggle-row">
          <span>
            {field.label}
            {field.hint && <p className="st-hint">{field.hint}</p>}
          </span>
          <input type="checkbox" className="st-toggle" checked={value as boolean} onChange={(e) => onChange(e.currentTarget.checked)} />
        </label>
      );
    case 'select':
      if (field.swatches)
        return (
          <div className="st-field">
            <div className="st-field-head"><span>{field.label}</span></div>
            <div className="st-tiles">
              {field.options.map((o) => (
                <button key={o.value} type="button" className={`st-tile ${o.value === value ? 'is-active' : ''}`} onClick={() => onChange(o.value)}>
                  <span className="st-tile-img" style={{ background: field.swatches![o.value] ?? '#222' }} />
                  <span className="st-tile-label">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      return (
        <div className="st-field">
          <div className="st-field-head"><span>{field.label}</span></div>
          <div className={`st-seg ${field.options.length > 3 ? 'is-wrap' : ''}`}>
            {field.options.map((o) => (
              <button
                key={o.value}
                type="button"
                className={o.value === value ? 'is-active' : ''}
                onClick={() => onChange(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    case 'text':
      if (field.list)
        return (
          <div className="st-field">
            <div className="st-field-head"><span>{field.label}</span></div>
            {field.list === 'socials'
              ? <SocialsEditor value={value as string} onChange={onChange} />
              : <LinesEditor value={value as string} onChange={onChange} placeholder={field.placeholder} />}
            {field.hint && <p className="st-hint">{field.hint}</p>}
          </div>
        );
      return (
        <div className="st-field">
          <div className="st-field-head"><span>{field.label}</span></div>
          <input
            type="text"
            className="st-text"
            value={value as string}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.currentTarget.value)}
          />
          {field.hint && <p className="st-hint">{field.hint}</p>}
        </div>
      );
  }
};
