import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OVERLAYS, findOverlay } from '../overlays/registry';
import { defaultParams, normalizeParams, paramsToQuery, queryToParams, visibleOptions, type OverlayDef, type Params } from '../overlays/schema';
import { Overlay } from '../overlays/Overlay';
import { SettingsPanel } from './SettingsPanel';
import { OutputPanel } from './OutputPanel';
import { docsPath, seoFor } from '../seo/content';
import { translate, tx, useT } from '../i18n';
import { LangSelect } from './LangSelect';
import { OverlayMenu, rememberRecent } from './OverlayMenu';
import { LivePill } from './LivePill';
import { AiNotice } from '../seo/AiNotice';
import { StylePopover, VersionsPopover, exportPng, useCustomBackdrop, useVersions } from './StudioTools';
import './studio.css';

const STORAGE = 'vxh-overlays:';
const BACKDROPS = [
  { id: 'scene', label: tx('Gra') },
  { id: 'checker', label: tx('Przezroczyste') },
  { id: 'dark', label: tx('Ciemne') },
  { id: 'light', label: tx('Jasne') },
  { id: 'custom', label: tx('Własny obraz') },
] as const;
type Backdrop = (typeof BACKDROPS)[number]['id'];


// Settings survive a refresh in this browser; the link itself carries everything OBS needs.
type T = (pl: string) => string;

/** Defaults with phrases (titles, labels) in the visitor's language; nicks and URLs stay as they are. */
export const localizedDefaults = (def: OverlayDef, t: T): Params => {
  const out = defaultParams(def);
  for (const f of def.fields) {
    if (!f.i18n || typeof f.default !== 'string' || !f.default) continue;
    out[f.key] = f.type === 'text' && f.list === 'lines'
      ? f.default.split(/ ?\| ?/).map((line) => t(line)).join(' | ')
      : t(f.default);
  }
  return out;
};

const loadParams = (def: OverlayDef, t: T): Params => {
  try {
    const raw = localStorage.getItem(STORAGE + def.id);
    if (raw) return queryToParams(def, new URLSearchParams(raw), localizedDefaults(def, t));
  } catch { /* private mode: defaults are fine */ }
  return localizedDefaults(def, t);
};
const saveParams = (def: OverlayDef, params: Params) => {
  try { localStorage.setItem(STORAGE + def.id, paramsToQuery(def, params)); } catch { /* ignore */ }
};

const useFitScale = (w: number, h: number, maxScale: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useLayoutEffect(() => {
    const el = ref.current!;
    const update = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(maxScale, r.width / w, r.height / h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h, maxScale]);
  return { ref, scale };
};

type Guides = 'off' | 'safe' | 'thirds';
const Preview = ({ def, params, backdrop, camera, size, replay, guides, compare, customBg }: {
  def: OverlayDef; params: Params; backdrop: Backdrop; camera: boolean; size: { w: number; h: number }; replay: number; guides: Guides;
  compare: Params | null; customBg: string;
}) => {
  const isCam = def.category === 'camera';
  const { lang, t } = useT();
  const { ref, scale } = useFitScale(size.w, size.h, isCam ? 1.6 : 1);
  return (
    <div className={`st-preview bg-${backdrop}`} ref={ref} style={backdrop === 'custom' && customBg ? { backgroundImage: `url("${customBg}")` } : undefined}>
      {backdrop === 'scene' && <div className="st-scene" aria-hidden />}
      <div
        className="st-canvas"
        style={{ width: size.w, height: size.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {isCam && camera && <div className="st-cam" aria-hidden><span /></div>}
        {/* A new key mounts the overlay again: intros and enter animations play from the start. */}
        {compare
          ? <div className="st-compare-right"><Overlay key={replay} id={def.id} params={{ ...params, _lang: lang, _preview: true }} /></div>
          : <Overlay key={replay} id={def.id} params={{ ...params, _lang: lang, _preview: true }} />}
        {/* Before / after: the default look on the left half, the current one on the right. */}
        {compare && (
          <div className="st-compare" aria-hidden>
            <div className="st-compare-left"><Overlay key={`c${replay}`} id={def.id} params={{ ...compare, _lang: lang, _preview: true }} /></div>
            <i /><span className="l">{t('Domyślnie')}</span><span className="r">{t('Teraz')}</span>
          </div>
        )}
        {guides === 'safe' && <div className="st-guides" aria-hidden><i /><i /></div>}
        {guides === 'thirds' && <div className="st-thirds" aria-hidden><i /><i /><i /><i /></div>}
      </div>
      <span className="st-scale" aria-hidden>{size.w}×{size.h} · {Math.round(scale * 100)}%</span>
    </div>
  );
};

/** Undo / redo over the settings. Continuous edits of one field (a drag, typing; < 1.2 s apart) count as one step. */
const useHistory = (params: Params, setParams: (p: Params) => void) => {
  const ref = useRef({ past: [] as Params[], future: [] as Params[], key: '', at: 0 });
  const current = useRef(params);
  current.current = params;
  const [, bump] = useState(0);
  const commit = useCallback((next: Params, key = '*') => {
    const h = ref.current;
    const now = Date.now();
    if (!(key !== '*' && h.key === key && now - h.at < 1200)) {
      h.past.push(current.current);
      if (h.past.length > 120) h.past.shift();
    }
    h.key = key;
    h.at = now;
    h.future = [];
    setParams(next);
    bump((n) => n + 1);
  }, [setParams]);
  const undo = useCallback(() => {
    const h = ref.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(current.current);
    h.key = '';
    setParams(prev);
    bump((n) => n + 1);
  }, [setParams]);
  const redo = useCallback(() => {
    const h = ref.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(current.current);
    h.key = '';
    setParams(next);
    bump((n) => n + 1);
  }, [setParams]);
  return { commit, undo, redo, canUndo: ref.current.past.length > 0, canRedo: ref.current.future.length > 0 };
};

/** Look-only settings the dice may change; texts, sizes, timers and toggles stay as the streamer set them. */
const DICE_KEYS = new Set(['style', 'theme', 'anim', 'font', 'titleAnim', 'effect', 'bg', 'border', 'look', 'iconShape', 'labelStyle',
  'panelAnim', 'introStyle', 'timerStyle', 'transition', 'modules', 'frame', 'metal', 'tape', 'variant', 'flakes', 'shape', 'eyes', 'face']);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
/** Colours that go together: one random hue, its neighbours and a complement. */
const harmony = () => {
  const h = Math.floor(Math.random() * 360);
  const hsl = (hh: number, s: number, l: number) => {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => { const k = (n + hh / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  };
  return [hsl(h, 95, 55), hsl((h + 35) % 360, 90, 58), hsl((h + 180) % 360, 85, 62), hsl((h + 330) % 360, 90, 60)];
};
export const randomLook = (def: OverlayDef, params: Params): Params => {
  const pal = harmony();
  const next: Params = { ...params };
  let ci = 0;
  for (const f of def.fields) {
    if (f.group === 'Oznaczenie AI') continue;
    if (f.type === 'colors') next[f.key] = pal.slice(0, Math.max(2, Math.min(f.max ?? 3, (params[f.key] as string[]).length)));
    else if (f.type === 'color') {
      // Backgrounds and text stay readable: dark stays dark, white stays white.
      const cur = String(params[f.key]).toLowerCase();
      const dark = /^#[0-2][0-9a-f][0-2]/.test(cur);
      if (!dark && cur !== '#ffffff') next[f.key] = pal[ci++ % pal.length];
    } else if (f.type === 'select' && DICE_KEYS.has(f.key)) {
      const opts = visibleOptions(f, next).map((o) => o.value).filter((v) => v !== 'custom' && v !== 'none');
      if (opts.length) next[f.key] = pick(opts);
    }
  }
  return normalizeParams(def.fields, next);
};

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
  && !(el instanceof HTMLInputElement && ['checkbox', 'range', 'color', 'button'].includes(el.type));

export const Studio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const def = findOverlay(id) ?? OVERLAYS[0];

  useEffect(() => {
    if (id && !findOverlay(id)) navigate('/', { replace: true });
  }, [id, navigate]);

  // Keyed by overlay so switching starts from that overlay's saved settings, never the previous one's.
  return <Editor key={def.id} def={def} home={!id} />;
};

// A studio link (/snow?count=300) wins over what this browser remembered.
const initialParams = (def: OverlayDef, t: T): Params => {
  const search = new URLSearchParams(window.location.search);
  search.delete('lang');
  return [...search.keys()].length ? queryToParams(def, search) : loadParams(def, t);
};

// The editor remounts per overlay, so the list's scroll position is kept outside React.
let listScroll = 0;

const Editor = ({ def, home }: { def: OverlayDef; home: boolean }) => {
  const listRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listScroll;
  }, []);
  const navigate = useNavigate();
  const { t, lang } = useT();
  const [params, setParams] = useState<Params>(() => initialParams(def, t));
  const [backdrop, setBackdrop] = useState<Backdrop>('scene');
  const [camera, setCamera] = useState(true);
  const [size, setSize] = useState(def.size);
  const [menuOpen, setMenuOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const [guides, setGuides] = useState<Guides>('off');
  const [compare, setCompare] = useState(false);
  const [pop, setPop] = useState<'' | 'style' | 'versions'>('');
  const customBg = useCustomBackdrop();
  const bgFile = useRef<HTMLInputElement>(null);
  const previewWrap = useRef<HTMLDivElement>(null);
  const settingsSearch = useRef<HTMLInputElement>(null);
  const history = useHistory(params, setParams);
  const defaults = useMemo(() => localizedDefaults(def, t), [def, t]);
  useEffect(() => rememberRecent(def.id), [def.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenuOpen(true);
        document.querySelector<HTMLInputElement>('.st-search input')?.focus();
        return;
      }
      if (isTyping(e.target)) return;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) history.redo(); else history.undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); history.redo(); }
      else if (e.key === '/' && !mod) { e.preventDefault(); settingsSearch.current?.focus(); }
      else if (e.key.toLowerCase() === 'r' && !mod && !e.altKey) setReplay((n) => n + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const jumpTo = (selector: string) => {
    setMenuOpen(false);
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!home) document.title = seoFor(def, lang).title;
  }, [def, home, lang]);

  // Switching language swaps default phrases the user never edited (title, labels) to the new language.
  const prevLang = useRef(lang);
  useEffect(() => {
    if (prevLang.current === lang) return;
    const before = localizedDefaults(def, (s) => translate(prevLang.current, s));
    const after = localizedDefaults(def, t);
    prevLang.current = lang;
    setParams((p) => {
      const next = { ...p };
      for (const f of def.fields) if (f.i18n && p[f.key] === before[f.key]) next[f.key] = after[f.key];
      return next;
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useMemo(() => paramsToQuery(def, params), [def, params]);
  const versions = useVersions(def.id, query);

  useEffect(() => {
    saveParams(def, params);
    // Keep the address bar in sync, so copying it from the browser also shares the setup.
    const onHome = window.location.pathname === '/' && !query;
    if (!onHome) window.history.replaceState(window.history.state, '', `/${def.id}${query ? `?${query}` : ''}`);
  }, [def, params, query]);

  const apply = (overlay: string, q: string) => {
    const target = findOverlay(overlay);
    if (!target) return;
    if (overlay === def.id) history.commit(queryToParams(def, new URLSearchParams(q)));
    else navigate(`/${overlay}${q ? `?${q}` : ''}`);
  };

  // A drag, a colour pick or typing in one field is one undo step; a click (option, toggle, reset) is its own step.
  const set = (key: string, v: Params[string], continuous = false) =>
    history.commit(normalizeParams(def.fields, { ...params, [key]: v }), continuous ? key : '*');
  const chips = def.category !== 'scene';
  const fullscreen = () => {
    const el = previewWrap.current?.querySelector('.st-preview');
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el?.requestFullscreen?.();
  };

  return (
    <div className="studio">
      <header className="st-top">
        <Link to="/" className="st-logo">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span><b>Overlays</b><small>studio · vxh</small></span>
        </Link>
        <LivePill />
        <nav className="st-nav">
          <a href={docsPath(lang, def.id)}>{t('Poradnik i opis')}</a>
          <Link to="/panel#app" className="st-nav-app" title={t('Teraz gra, !skip i czat TikTok LIVE')}>💻 {t('Aplikacja na PC')}</Link>
          <a href="https://vxh.pl/" target="_blank" rel="noreferrer">{t('Inne narzędzia VXH')}</a>
          <LangSelect />
        </nav>
      </header>

      <div className="st-body">
        {menuOpen && <div className="st-backdrop" onClick={() => setMenuOpen(false)} aria-hidden />}
        <aside
          id="st-menu"
          ref={listRef}
          onScroll={(e) => { listScroll = e.currentTarget.scrollTop; }}
          className={`st-list ${menuOpen ? 'is-open' : ''}`}
          aria-label={t('Lista overlayów')}
        >
          <div className="st-sheet-head">
            <b>{t('Wszystkie overlaye')}</b>
            <button type="button" className="st-icon-btn" onClick={() => setMenuOpen(false)} aria-label={t('Zamknij menu')}>✕</button>
          </div>
          <OverlayMenu active={def.id} onPick={() => setMenuOpen(false)} />
        </aside>

        <main className="st-stage">
          <div className="st-stage-head">
            {/* Laptops 901-1279 px: the overlay list is a drawer opened from here. */}
            <button type="button" className="st-drawer-btn" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="st-menu">
              <span className="st-burger" aria-hidden><i /><i /><i /></span>{t('Overlaye')}
            </button>
            <div className="st-stage-title">
              <h1>{def.icon} {t(def.name)}</h1>
              <p>{t(def.description)}</p>
            </div>
            {chips && (
              <div className="st-chips" role="group" aria-label={t('Tło podglądu')}>
                {def.category === 'camera' && (
                  <button type="button" className={camera ? 'is-active' : ''} onClick={() => setCamera((c) => !c)}>
                    📷 {t('Kamera')}
                  </button>
                )}
                {def.category !== 'scene' && BACKDROPS.map((b) => (
                  <button key={b.id} type="button" className={b.id === backdrop ? 'is-active' : ''}
                    onClick={() => { if (b.id === 'custom' && (!customBg.url || backdrop === 'custom')) bgFile.current?.click(); setBackdrop(b.id === 'custom' && !customBg.url ? backdrop : b.id); }}
                    title={b.id === 'custom' ? t('Zrzut ekranu z Twojej gry albo sceny pod podglądem') : undefined}>
                    {t(b.label)}
                  </button>
                ))}
                <input ref={bgFile} type="file" accept="image/*" hidden onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) { customBg.pick(f); setBackdrop('custom'); } }} />
              </div>
            )}
          </div>

          <div className="st-preview-wrap" ref={previewWrap}>
            <Preview def={def} params={params} backdrop={backdrop} camera={camera} size={size} replay={replay} guides={guides} compare={compare ? defaults : null} customBg={customBg.url} />
            <div className="st-ptools" role="toolbar" aria-label={t('Podgląd')}>
              <button type="button" onClick={() => setReplay((n) => n + 1)} title={`${t('Odtwórz od nowa')} (R)`}>↻ <span>{t('Od nowa')}</span></button>
              <button type="button" className={guides !== 'off' ? 'is-active' : ''} onClick={() => setGuides((v) => (v === 'off' ? 'safe' : v === 'safe' ? 'thirds' : 'off'))} aria-pressed={guides !== 'off'}
                title={t('Linie: bezpieczny obszar, potem trójpodział, potem wyłączone')}>⌗ <span>{guides === 'thirds' ? t('Trójpodział') : t('Linie')}</span></button>
              <button type="button" className={compare ? 'is-active' : ''} onClick={() => setCompare((v) => !v)} aria-pressed={compare} title={t('Porównaj z ustawieniami domyślnymi')}>⇋ <span>{t('Porównaj')}</span></button>
              <button type="button" className={`st-pop-btn ${pop === 'style' ? 'is-active' : ''}`} onClick={() => setPop((v) => (v === 'style' ? '' : 'style'))} aria-expanded={pop === 'style'} title={t('Paczki kolorów, mój styl, kolory z logo')}>🎨 <span>{t('Styl')}</span></button>
              <button type="button" className={`st-pop-btn ${pop === 'versions' ? 'is-active' : ''}`} onClick={() => setPop((v) => (v === 'versions' ? '' : 'versions'))} aria-expanded={pop === 'versions'} title={t('Historia wersji')}>🕘 <span>{t('Wersje')}</span></button>
              <button type="button" onClick={() => { const el = previewWrap.current?.querySelector<HTMLElement>('.st-canvas'); if (el) void exportPng(el, size.w, size.h, def.id).catch(() => window.alert(t('Nie udało się zapisać obrazka w tej przeglądarce.'))); }} title={t('Zapisz klatkę podglądu jako PNG (beta)')}>⤓ <span>PNG</span></button>
              <button type="button" onClick={fullscreen} title={t('Pełny ekran')}>⛶ <span>{t('Pełny ekran')}</span></button>
            </div>
            {pop === 'style' && <StylePopover def={def} params={params} onApply={(p) => history.commit(p)} onClose={() => setPop('')} />}
            {pop === 'versions' && <VersionsPopover list={versions} current={query} onRestore={(q) => history.commit(queryToParams(def, new URLSearchParams(q), defaults))} onClose={() => setPop('')} />}
          </div>

          <OutputPanel def={def} query={query} size={size} setSize={setSize} onApply={apply} />
          <AiNotice lang={lang} compact />
        </main>

        <aside className="st-settings" aria-label={t('Ustawienia')}>
          <SettingsPanel def={def} params={params} defaults={defaults} onChange={set}
            onReset={() => history.commit(defaults)} onRandom={() => history.commit(randomLook(def, params))} history={history} searchRef={settingsSearch} />
        </aside>
      </div>

      {/* Phone / tablet: the overlay list lives in a bottom sheet behind this bar. */}
      <nav className="st-bottombar" aria-label={t('Nawigacja studia')}>
        <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-controls="st-menu">
          <span className="st-burger" aria-hidden><i /><i /><i /></span>
          <small>{t('Overlaye')}</small>
        </button>
        <button type="button" className="st-bottombar-current" onClick={() => jumpTo('.st-stage')}>
          <span aria-hidden>{def.icon}</span>
          <b>{t(def.name)}</b>
        </button>
        <button type="button" onClick={() => jumpTo('.st-settings')}>
          <span aria-hidden>⚙</span>
          <small>{t('Ustawienia')}</small>
        </button>
        <button type="button" onClick={() => jumpTo('.st-out')}>
          <span aria-hidden>🔗</span>
          <small>{t('Link')}</small>
        </button>
      </nav>
    </div>
  );
};
