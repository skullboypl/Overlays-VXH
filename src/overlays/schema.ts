// Shared shape of every overlay: what it is called, which settings it has and how they map to the URL.

export type FieldBase = {
  key: string;
  label: string;
  hint?: string;
  /** Show the control only when another setting has one of these values. */
  when?: { key: string; is: (string | boolean)[] };
  /** Section heading in the settings panel; fields with the same group sit together. */
  group?: string;
};

export type Field =
  | (FieldBase & { type: 'range'; min: number; max: number; step: number; default: number; unit?: string })
  | (FieldBase & { type: 'color'; default: string })
  | (FieldBase & { type: 'colors'; default: string[]; max?: number })
  | (FieldBase & { type: 'toggle'; default: boolean })
  | (FieldBase & {
      type: 'select';
      default: string;
      options: { value: string; label: string }[];
      /** CSS background per option: shows a picture grid instead of buttons. */
      swatches?: Record<string, string>;
    })
  | (FieldBase & {
      type: 'text';
      default: string;
      maxLength?: number;
      placeholder?: string;
      /** Stored as "a | b | c" in the link, edited as rows: plain lines or service + nick. */
      list?: 'lines' | 'socials';
    });

export type Params = Record<string, number | string | boolean | string[]>;

export type Category = 'scene' | 'screen' | 'camera' | 'widget';

export type OverlayDef = {
  id: string;
  name: string;
  icon: string;
  category: Category;
  description: string;
  /** Browser Source size we suggest in OBS. */
  size: { w: number; h: number };
  fields: Field[];
};

export const isFieldVisible = (field: Field, params: Params) =>
  !field.when || field.when.is.includes(params[field.when.key] as string | boolean);

export const defaultParams = (def: OverlayDef): Params =>
  Object.fromEntries(def.fields.map((f) => [f.key, f.default]));

const isHex = (v: string) => /^[0-9a-f]{6}$/i.test(v);

/** Only settings that differ from the default go into the link, so links stay short. */
export const paramsToQuery = (def: OverlayDef, params: Params): string => {
  const q = new URLSearchParams();
  for (const f of def.fields) {
    const v = params[f.key];
    if (v === undefined || JSON.stringify(v) === JSON.stringify(f.default)) continue;
    if (f.type === 'color') q.set(f.key, String(v).replace('#', ''));
    else if (f.type === 'colors') q.set(f.key, (v as string[]).map((c) => c.replace('#', '')).join(','));
    else if (f.type === 'toggle') q.set(f.key, v ? '1' : '0');
    else q.set(f.key, String(v));
  }
  return q.toString();
};

export const queryToParams = (def: OverlayDef, search: URLSearchParams): Params => {
  const out = defaultParams(def);
  for (const f of def.fields) {
    const raw = search.get(f.key);
    if (raw === null) continue;
    switch (f.type) {
      case 'range': {
        const n = Number(raw);
        if (Number.isFinite(n)) out[f.key] = Math.min(f.max, Math.max(f.min, n));
        break;
      }
      case 'color':
        if (isHex(raw)) out[f.key] = `#${raw}`;
        break;
      case 'colors': {
        const list = raw.split(',').filter(isHex).map((c) => `#${c}`);
        if (list.length) out[f.key] = list;
        break;
      }
      case 'toggle':
        out[f.key] = raw === '1' || raw === 'true';
        break;
      case 'select':
        if (f.options.some((o) => o.value === raw)) out[f.key] = raw;
        break;
      case 'text':
        out[f.key] = raw.slice(0, f.maxLength ?? 120);
        break;
    }
  }
  return out;
};
