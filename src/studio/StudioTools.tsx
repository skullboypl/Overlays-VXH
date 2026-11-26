// Studio-only helpers (proposals 92-100): colour packs, "my style", palette from a logo, version history,
// a custom picture behind the preview and a PNG snapshot. None of this touches the overlay link format.
import { useEffect, useRef, useState } from 'react';
import { normalizeParams, type OverlayDef, type Params } from '../overlays/schema';
import { tx, useT } from '../i18n';

export type Palette = { accent: string; accent2: string; accent3: string; bg: string; text: string };

export const PACKS: { id: string; name: string; p: Palette }[] = [
  { id: 'vxh', name: tx('VXH (pomarańcz)'), p: { accent: '#ff5900', accent2: '#ff2d95', accent3: '#7a5cff', bg: '#111114', text: '#ffffff' } },
  { id: 'neon', name: tx('Neon'), p: { accent: '#00e5ff', accent2: '#ff2d95', accent3: '#b4ff39', bg: '#0b0618', text: '#ffffff' } },
  { id: 'pastel', name: tx('Pastel'), p: { accent: '#ff8fab', accent2: '#7ad7f0', accent3: '#ffd166', bg: '#fff7fb', text: '#3a2f4a' } },
  { id: 'mono', name: tx('Czerń i biel'), p: { accent: '#ffffff', accent2: '#9a9aa5', accent3: '#5c5c66', bg: '#0c0c0f', text: '#ffffff' } },
  { id: 'sunset', name: tx('Zachód słońca'), p: { accent: '#ff7a18', accent2: '#ff3d6e', accent3: '#ffd23f', bg: '#1d0b1f', text: '#fff4e6' } },
  { id: 'ocean', name: tx('Ocean'), p: { accent: '#00b4d8', accent2: '#48cae4', accent3: '#90e0ef', bg: '#03111f', text: '#e6faff' } },
  { id: 'forest', name: tx('Las'), p: { accent: '#52b788', accent2: '#b7e4c7', accent3: '#ffd166', bg: '#0b1a12', text: '#f1fff6' } },
  { id: 'gold', name: tx('Złoto'), p: { accent: '#f5c542', accent2: '#c9932e', accent3: '#fff1c1', bg: '#120e06', text: '#fffaf0' } },
  { id: 'cyber', name: tx('Cyber'), p: { accent: '#fcee0a', accent2: '#00f0ff', accent3: '#ff003c', bg: '#0a0a12', text: '#ffffff' } },
  { id: 'candy', name: tx('Cukierkowy'), p: { accent: '#ff5d8f', accent2: '#7a5cff', accent3: '#3bceac', bg: '#1a1030', text: '#ffffff' } },
];

const ROLE: [RegExp, keyof Palette][] = [
  [/^(accent2|colorB|titleColor2|accent2Color)$/i, 'accent2'],
  [/^(accent|colorA|lineColor|hud|titleColor|qrColor|barColor)$/i, 'accent'],
  [/^(bg|base|panel|film|bezelColor|body|labelBg)$/i, 'bg'],
  [/^(textColor|ink|fg|fontColor)$/i, 'text'],
];

/** Puts a palette on every colour setting whose name says what it is for. Unknown colour settings stay as they are. */
export const applyPalette = (def: OverlayDef, params: Params, pal: Palette): Params => {
  const next: Params = { ...params };
  for (const f of def.fields) {
    if (f.type === 'color') {
      const role = ROLE.find(([re]) => re.test(f.key))?.[1];
      if (role) next[f.key] = pal[role];
    } else if (f.type === 'colors') {
      const max = f.max ?? 5;
      next[f.key] = [pal.accent, pal.accent2, pal.accent3].slice(0, Math.max(1, Math.min(max, Array.isArray(params[f.key]) ? (params[f.key] as string[]).length : 3)));
    }
  }
  return normalizeParams(def.fields, next);
};

/** The colours of the current settings, read back the same way (for "save as my style"). */
export const paletteOf = (def: OverlayDef, params: Params): Palette => {
  const pal: Palette = { ...PACKS[0].p };
  for (const f of def.fields) {
    if (f.type === 'color') {
      const role = ROLE.find(([re]) => re.test(f.key))?.[1];
      if (role && typeof params[f.key] === 'string') pal[role] = params[f.key] as string;
    } else if (f.type === 'colors' && Array.isArray(params[f.key])) {
      const c = params[f.key] as string[];
      if (c[0]) pal.accent = c[0];
      if (c[1]) pal.accent2 = c[1];
      if (c[2]) pal.accent3 = c[2];
    }
  }
  return pal;
};

const MY_STYLE = 'vxh-overlays:my-style';
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or private */ } };

/** Dominant colours of a picture (logo): bucket the pixels, skip near-white / near-black / transparent ones. */
export const paletteFromImage = (file: File): Promise<Palette> => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const c = document.createElement('canvas');
    const k = Math.min(1, 96 / Math.max(img.width, img.height));
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 128) continue;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max < 28 || min > 235 || max - min < 24) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n += 1; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
    }
    URL.revokeObjectURL(url);
    const hex = (e: { n: number; r: number; g: number; b: number }) => `#${[e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, '0')).join('')}`;
    const top = [...buckets.values()].sort((a, b) => b.n - a.n).map(hex);
    if (!top.length) { reject(new Error('no_colors')); return; }
    resolve({ ...PACKS[0].p, accent: top[0], accent2: top[1] ?? top[0], accent3: top[2] ?? top[1] ?? top[0] });
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad_image')); };
  img.src = url;
});

/* ---------------- the "Styl" popover ---------------- */
export const StylePopover = ({ def, params, onApply, onClose }: { def: OverlayDef; params: Params; onApply: (p: Params) => void; onClose: () => void }) => {
  const { t } = useT();
  const [mine, setMine] = useState<Palette | null>(() => load<Palette | null>(MY_STYLE, null));
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useOutside(onClose);
  return (
    <div className="st-pop st-style-pop" role="dialog" aria-label={t('Styl i kolory')}>
      <h4>{t('Paczki kolorów')}</h4>
      <div className="st-packs">
        {PACKS.map((pk) => (
          <button key={pk.id} type="button" onClick={() => onApply(applyPalette(def, params, pk.p))} title={t(pk.name)}>
            <span className="st-pack-sw" style={{ background: `linear-gradient(135deg, ${pk.p.accent} 0 33%, ${pk.p.accent2} 33% 66%, ${pk.p.accent3} 66%)`, outline: `3px solid ${pk.p.bg}` }} />
            <small>{t(pk.name)}</small>
          </button>
        ))}
      </div>
      <h4>{t('Mój styl')}</h4>
      <p className="st-pop-note">{t('Zapisz kolory tego overlayu i nakładaj je jednym kliknięciem na inne.')}</p>
      <div className="st-pop-row">
        <button type="button" onClick={() => { const p = paletteOf(def, params); save(MY_STYLE, p); setMine(p); }}>{t('Zapisz jako mój styl')}</button>
        <button type="button" className="is-primary" disabled={!mine} onClick={() => mine && onApply(applyPalette(def, params, mine))}>
          {mine && <span className="st-pack-sw sm" style={{ background: `linear-gradient(135deg, ${mine.accent} 0 50%, ${mine.accent2} 50%)` }} />}
          {t('Zastosuj mój styl')}
        </button>
      </div>
      <h4>{t('Kolory z logo')}</h4>
      <div className="st-pop-row">
        <button type="button" onClick={() => file.current?.click()}>🖼 {t('Wybierz obrazek logo')}</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (!f) return;
          try { setError(''); onApply(applyPalette(def, params, await paletteFromImage(f))); } catch { setError(t('Nie udało się odczytać kolorów z tego obrazka.')); }
        }} />
      </div>
      <p className="st-pop-note">{t('Obrazek zostaje w Twojej przeglądarce, nigdzie go nie wysyłamy.')}</p>
      {error && <p className="st-pop-error">{error}</p>}
    </div>
  );
};

const useOutside = (onClose: () => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest('.st-pop, .st-pop-btn')) onClose(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [onClose]);
};

/* ---------------- version history ---------------- */
type Version = { at: number; query: string };
const VERSIONS = 'vxh-overlays:versions:';
/** Keeps the last 20 versions of each overlay's settings, written 4 s after the last change. */
export const useVersions = (id: string, query: string) => {
  const [list, setList] = useState<Version[]>(() => load<Version[]>(VERSIONS + id, []));
  useEffect(() => { setList(load<Version[]>(VERSIONS + id, [])); }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cur = load<Version[]>(VERSIONS + id, []);
      if (cur[0]?.query === query) return;
      const next = [{ at: Date.now(), query }, ...cur.filter((v) => v.query !== query)].slice(0, 20);
      save(VERSIONS + id, next);
      setList(next);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [id, query]);
  return list;
};

export const VersionsPopover = ({ list, current, onRestore, onClose }: { list: Version[]; current: string; onRestore: (q: string) => void; onClose: () => void }) => {
  const { t, lang } = useT();
  useOutside(onClose);
  const when = (at: number) => new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' }).format(at);
  return (
    <div className="st-pop st-versions-pop" role="dialog" aria-label={t('Historia wersji')}>
      <h4>{t('Historia wersji')}</h4>
      <p className="st-pop-note">{t('Ostatnie 20 wersji ustawień, zapisywane same w tej przeglądarce.')}</p>
      {!list.length && <p className="st-pop-note">{t('Jeszcze nic. Zmień coś w ustawieniach.')}</p>}
      <ul>
        {list.map((v) => (
          <li key={v.at}>
            <span>{when(v.at)}</span>
            <code title={v.query || t('ustawienia domyślne')}>{v.query ? `${v.query.split('&').length} ${t('zmian')}` : t('domyślne')}</code>
            <button type="button" disabled={v.query === current} onClick={() => onRestore(v.query)}>{v.query === current ? t('Teraz') : t('Przywróć')}</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------------- custom preview background ---------------- */
const BACKDROP_IMG = 'vxh-overlays:preview-bg';
export const useCustomBackdrop = () => {
  const [url, setUrl] = useState<string>(() => { try { return localStorage.getItem(BACKDROP_IMG) ?? ''; } catch { return ''; } });
  const pick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result ?? '');
      setUrl(data);
      // Small pictures survive a refresh; big ones live until the tab closes.
      try { if (data.length < 2_500_000) localStorage.setItem(BACKDROP_IMG, data); else localStorage.removeItem(BACKDROP_IMG); } catch { /* full */ }
    };
    reader.readAsDataURL(file);
  };
  const clear = () => { setUrl(''); try { localStorage.removeItem(BACKDROP_IMG); } catch { /* ignore */ } };
  return { url, pick, clear };
};

/* ---------------- PNG snapshot ---------------- */
const inlineStyles = (src: Element, dst: Element) => {
  const cs = getComputedStyle(src);
  let text = '';
  for (let i = 0; i < cs.length; i++) { const k = cs[i]; text += `${k}:${cs.getPropertyValue(k)};`; }
  (dst as HTMLElement).setAttribute('style', text);
  const a = src.children, b = dst.children;
  for (let i = 0; i < a.length && i < b.length; i++) inlineStyles(a[i], b[i]);
};

/**
 * A still of the preview as PNG, drawn through an SVG <foreignObject>. Canvases are copied as pictures.
 * Pictures from other sites, and fonts, may be missing: the browser blocks reading them.
 */
export const exportPng = async (canvasEl: HTMLElement, w: number, h: number, name: string) => {
  const clone = canvasEl.cloneNode(true) as HTMLElement;
  inlineStyles(canvasEl, clone);
  // Appended last: the copied logical insets (inset-inline-start...) would otherwise win over left / top.
  clone.setAttribute('style', `${clone.getAttribute('style') ?? ''}position:relative;inset:0 auto auto 0;transform:none;translate:none;margin:0;`);
  const srcCanvases = canvasEl.querySelectorAll('canvas'), dstCanvases = clone.querySelectorAll('canvas');
  srcCanvases.forEach((c, i) => {
    try {
      const img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.setAttribute('style', dstCanvases[i].getAttribute('style') ?? '');
      dstCanvases[i].replaceWith(img);
    } catch { /* tainted canvas */ }
  });
  clone.querySelectorAll('video, .st-compare, .st-guides, .st-thirds, .st-cam').forEach((v) => v.remove());
  clone.querySelectorAll('.st-compare-right').forEach((n) => n.setAttribute('style', `${n.getAttribute('style') ?? ''}clip-path:none;`));
  const xml = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const a = document.createElement('a');
  a.download = `${name}.png`;
  a.href = out.toDataURL('image/png');
  a.click();
};
