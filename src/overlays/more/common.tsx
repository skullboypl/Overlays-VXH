// Shared bits of the add-on overlays in src/overlays/more. Everything here is new: old overlays never import it,
// so nothing in this folder can change how an existing link looks.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Field, Params } from '../schema';
import { SCENE_FONTS } from '../SceneScreen';

export type Vars = CSSProperties & Record<`--${string}`, string | number>;
export type Renderer = (props: { params: Params }) => JSX.Element | null;
export type Engine = { reset: () => void; stop: () => void };

export const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
export const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
export const lines = (v: unknown) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
export const fontOf = (p: Params, d = 'poppins') => SCENE_FONTS[String(p.font ?? d)] ?? SCENE_FONTS[d];

/** Only http(s) URLs; anything else could break out of an attribute or CSS url(). */
export const safeUrl = (raw: unknown) => {
  const v = String(raw ?? '').trim();
  return /^https?:\/\/[^\s"'<>()\\]+$/i.test(v) ? v : '';
};

/** Re-renders every `ms`. */
export const useNow = (ms = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
};

/** Index that moves on every `ms`. */
export const useCycle = (count: number, ms: number) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2) return undefined;
    const id = window.setInterval(() => setI((v) => (v + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms]);
  return count ? i % count : 0;
};

/** A canvas driven by an engine; settings listed in `respawn` restart it, the rest are read live. */
export const CanvasFx = ({ start, params, respawn = [] }: { start: (c: HTMLCanvasElement, get: () => Params) => Engine; params: Params; respawn?: string[] }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const pRef = useRef(params);
  pRef.current = params;
  const key = JSON.stringify(respawn.map((k) => params[k]));
  useEffect(() => {
    const e = start(ref.current!, () => pRef.current);
    return e.stop;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="ov-fill" />;
};

/** Card look shared by the add-on widgets: same names as the streamer tools (tl-card styles). */
export const Card = ({ p, kind, children, className = '' }: { p: Params; kind: string; children: ReactNode; className?: string }) => (
  <div className={`ov-fill tl-root mo-${kind} align-${p.align ?? 'center'} ${className}`} style={lookVars(p)}>
    <div className={`tl-card style-${p.style ?? 'glass'} ${p.shadow === false ? 'no-shadow' : ''}`}>{children}</div>
  </div>
);
export const lookVars = (p: Params, extra: Vars = {}): Vars => ({
  '--accent': String(p.accent ?? '#ff5900'),
  '--accent2': String(p.accent2 ?? '#ff2d95'),
  '--bg': String(p.bg ?? '#111114'),
  '--fg': String(p.textColor ?? '#ffffff'),
  '--radius': `${num(p.radius, 18)}px`,
  '--s': num(p.scale, 100) / 100,
  '--font': fontOf(p, 'dm'),
  ...extra,
});

// ---------- field helpers (registry side) ----------
export const FONT_OPTIONS = [
  { value: 'dm', label: 'DM Sans' }, { value: 'poppins', label: 'Poppins' }, { value: 'bebas', label: 'Bebas' },
  { value: 'russo', label: 'Russo' }, { value: 'orbitron', label: 'Orbitron' }, { value: 'pacifico', label: 'Pacifico' },
];
export const POS4 = [
  { value: 'tl', label: 'Góra, lewo' }, { value: 'tr', label: 'Góra, prawo' }, { value: 'bl', label: 'Dół, lewo' }, { value: 'br', label: 'Dół, prawo' },
];
/** Card look of a widget: same option values as toolLook() in the registry. */
export const look = (style = 'glass', align = 'center', font = 'dm'): Field[] => [
  { group: 'Wygląd', key: 'style', label: 'Styl', type: 'select', default: style, options: [
    { value: 'glass', label: 'Szkło' }, { value: 'solid', label: 'Pełny' }, { value: 'neon', label: 'Neon' },
    { value: 'gradient', label: 'Gradient' }, { value: 'outline', label: 'Kontur' }, { value: 'none', label: 'Bez tła' },
  ] },
  { group: 'Wygląd', key: 'scale', label: 'Wielkość', type: 'range', min: 40, max: 160, step: 5, default: 100, unit: '%', hint: 'Widżet rośnie też razem ze źródłem w OBS' },
  { group: 'Wygląd', key: 'align', label: 'Wyrównanie', type: 'select', default: align, options: [
    { value: 'left', label: 'Lewo' }, { value: 'center', label: 'Środek' }, { value: 'right', label: 'Prawo' },
  ] },
  { group: 'Wygląd', key: 'radius', label: 'Zaokrąglenie', type: 'range', min: 0, max: 60, step: 1, default: 18, unit: 'px' },
  { group: 'Wygląd', key: 'font', label: 'Czcionka', type: 'select', default: font, options: FONT_OPTIONS },
  { group: 'Wygląd', key: 'shadow', label: 'Cień', type: 'toggle', default: true },
  { group: 'Kolory', key: 'accent', label: 'Akcent', type: 'color', default: '#ff5900' },
  { group: 'Kolory', key: 'accent2', label: 'Drugi kolor', type: 'color', default: '#ff2d95' },
  { group: 'Kolory', key: 'bg', label: 'Tło', type: 'color', default: '#111114' },
  { group: 'Kolory', key: 'textColor', label: 'Tekst', type: 'color', default: '#ffffff' },
];
export const rangeF = (key: string, label: string, min: number, max: number, step: number, def: number, unit?: string, group?: string, hint?: string): Field =>
  ({ key, label, type: 'range', min, max, step, default: def, ...(unit ? { unit } : {}), ...(group ? { group } : {}), ...(hint ? { hint } : {}) });
export const colorsF = (def: string[], label = 'Kolory', max = 5, group?: string): Field => ({ key: 'colors', label, type: 'colors', max, default: def, ...(group ? { group } : {}) });
export const opacityF = (def = 0.9): Field => rangeF('opacity', 'Krycie', 0.1, 1, 0.05, def);
export const speedF = (def = 1): Field => rangeF('speed', 'Prędkość', 0.2, 3, 0.1, def, '×');
export const sizeF = (def = 1): Field => rangeF('size', 'Rozmiar', 0.3, 3, 0.1, def, '×');
export const countF = (def: number, max = 300, min = 1): Field => rangeF('count', 'Ilość', min, max, 1, def);
