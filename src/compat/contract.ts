// The "link contract": everything that decides how an existing overlay link is read back.
// A link only carries settings that differ from the defaults (schema.ts paramsToQuery), so an old link keeps
// looking the same only while ids, keys, types, defaults and the accepted values stay as they were.

import type { Field, OverlayDef } from '../overlays/schema';

export type FieldContract = {
  type: Field['type'];
  default: unknown;
  min?: number;
  max?: number;
  options?: string[];
  maxLength?: number;
  list?: string;
};
/** `size` is informational (it only suggests the OBS source size); the visual check uses it as the viewport. */
export type OverlayContract = { category: string; size: { w: number; h: number }; fields: Record<string, FieldContract> };
export type Contract = { overlays: Record<string, OverlayContract> };

const fieldContract = (f: Field): FieldContract => {
  const base: FieldContract = { type: f.type, default: f.default };
  if (f.type === 'range') return { ...base, min: f.min, max: f.max };
  if (f.type === 'select') return { ...base, options: f.options.map((o) => o.value) };
  if (f.type === 'text') return { ...base, maxLength: f.maxLength ?? 120, ...(f.list ? { list: f.list } : {}) };
  return base;
};

export const buildContract = (overlays: OverlayDef[]): Contract => ({
  overlays: Object.fromEntries(overlays.map((o) => [o.id, {
    category: o.category,
    size: o.size,
    // A key can appear twice in a registry entry (the first one wins when the link is read); keep the first.
    fields: o.fields.reduce<Record<string, FieldContract>>((acc, f) => (f.key in acc ? acc : { ...acc, [f.key]: fieldContract(f) }), {}),
  }])),
});

export type Problem = { overlay: string; field?: string; what: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Everything in `next` that would make a link written against `base` show something else.
 * Adding overlays, fields and options is always fine; removing or changing them is not.
 */
export const compareContracts = (base: Contract, next: Contract): Problem[] => {
  const out: Problem[] = [];
  for (const [id, b] of Object.entries(base.overlays)) {
    const n = next.overlays[id];
    if (!n) { out.push({ overlay: id, what: 'overlay removed (its /o/ link would show nothing)' }); continue; }
    for (const [key, bf] of Object.entries(b.fields)) {
      const nf = n.fields[key];
      if (!nf) { out.push({ overlay: id, field: key, what: 'field removed (links that set it lose the setting)' }); continue; }
      if (nf.type !== bf.type) { out.push({ overlay: id, field: key, what: `type ${bf.type} -> ${nf.type}` }); continue; }
      if (!same(nf.default, bf.default)) out.push({ overlay: id, field: key, what: `default ${JSON.stringify(bf.default)} -> ${JSON.stringify(nf.default)} (every link without this key changes)` });
      if (bf.min !== undefined && nf.min !== undefined && nf.min > bf.min) out.push({ overlay: id, field: key, what: `min ${bf.min} -> ${nf.min} (old values get clamped)` });
      if (bf.max !== undefined && nf.max !== undefined && nf.max < bf.max) out.push({ overlay: id, field: key, what: `max ${bf.max} -> ${nf.max} (old values get clamped)` });
      const gone = (bf.options ?? []).filter((v) => !(nf.options ?? []).includes(v));
      if (gone.length) out.push({ overlay: id, field: key, what: `options removed: ${gone.join(', ')} (links with them fall back to the default)` });
      if (bf.maxLength !== undefined && nf.maxLength !== undefined && nf.maxLength < bf.maxLength) out.push({ overlay: id, field: key, what: `maxLength ${bf.maxLength} -> ${nf.maxLength} (old texts get cut)` });
      if ((bf.list ?? '') !== (nf.list ?? '')) out.push({ overlay: id, field: key, what: `list format ${bf.list ?? 'none'} -> ${nf.list ?? 'none'}` });
    }
  }
  return out;
};
