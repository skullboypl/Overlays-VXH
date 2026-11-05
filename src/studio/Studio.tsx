import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OVERLAYS, findOverlay } from '../overlays/registry';
import { defaultParams, isFieldVisible, paramsToQuery, queryToParams, type OverlayDef, type Params } from '../overlays/schema';
import { Overlay } from '../overlays/Overlay';
import { FieldControl } from './Fields';
import { OutputPanel } from './OutputPanel';
import { docsPath, seoFor } from '../seo/content';
import { translate, tx, useT } from '../i18n';
import { LangSelect } from './LangSelect';
import './studio.css';

const STORAGE = 'vxh-overlays:';
const BACKDROPS = [
  { id: 'scene', label: tx('Gra') },
  { id: 'checker', label: tx('Przezroczyste') },
  { id: 'dark', label: tx('Ciemne') },
  { id: 'light', label: tx('Jasne') },
] as const;
type Backdrop = (typeof BACKDROPS)[number]['id'];

const SECTIONS = [
  { id: 'scene', title: tx('Ekrany'), note: tx('Start, przerwa, koniec') },
  { id: 'screen', title: tx('Efekty'), note: tx('Na całą scenę') },
  { id: 'character', title: tx('Postacie'), note: tx('Animowane w pętli') },
  { id: 'camera', title: tx('Kamerka'), note: tx('Ramki i święta') },
  { id: 'widget', title: tx('Paski i napisy'), note: tx('Info dla widzów') },
] as const;

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

const Preview = ({ def, params, backdrop, camera, size }: {
  def: OverlayDef; params: Params; backdrop: Backdrop; camera: boolean; size: { w: number; h: number };
}) => {
  const isCam = def.category === 'camera';
  const { lang } = useT();
  const { ref, scale } = useFitScale(size.w, size.h, isCam ? 1.6 : 1);
  return (
    <div className={`st-preview bg-${backdrop}`} ref={ref}>
      {backdrop === 'scene' && <div className="st-scene" aria-hidden />}
      <div
        className="st-canvas"
        style={{ width: size.w, height: size.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {isCam && camera && <div className="st-cam" aria-hidden><span /></div>}
        <Overlay id={def.id} params={{ ...params, _lang: lang }} />
      </div>
    </div>
  );
};

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

  useEffect(() => {
    saveParams(def, params);
    // Keep the address bar in sync, so copying it from the browser also shares the setup.
    const onHome = window.location.pathname === '/' && !query;
    if (!onHome) window.history.replaceState(window.history.state, '', `/${def.id}${query ? `?${query}` : ''}`);
  }, [def, params, query]);

  const apply = (overlay: string, q: string) => {
    const target = findOverlay(overlay);
    if (!target) return;
    if (overlay === def.id) setParams(queryToParams(def, new URLSearchParams(q)));
    else navigate(`/${overlay}${q ? `?${q}` : ''}`);
  };

  const visible = def.fields.filter((f) => isFieldVisible(f, params));
  let currentGroup: string | undefined;

  const set = (key: string, v: Params[string]) => setParams((p) => ({ ...p, [key]: v }));

  return (
    <div className="studio">
      <header className="st-top">
        <Link to="/" className="st-logo">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span><b>Overlays</b><small>studio · vxh</small></span>
        </Link>
        <nav className="st-nav">
          <a href={docsPath(lang, def.id)}>{t('Poradnik i opis')}</a>
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
          {SECTIONS.map((sec) => (
            <section key={sec.id}>
              <h2>{t(sec.title)}<small>{t(sec.note)}</small></h2>
              {OVERLAYS.filter((o) => o.category === sec.id).map((o) => (
                <Link key={o.id} to={`/${o.id}`} onClick={() => setMenuOpen(false)} className={`st-item ${o.id === def.id ? 'is-active' : ''}`}>
                  <span className="st-item-icon" aria-hidden>{o.icon}</span>
                  <span className="st-item-text">
                    <b>{t(o.name)}</b>
                    <small>{t(o.description)}</small>
                  </span>
                </Link>
              ))}
            </section>
          ))}
        </aside>

        <main className="st-stage">
          <div className="st-stage-head">
            <div>
              <h1>{def.icon} {t(def.name)}</h1>
              <p>{t(def.description)}</p>
            </div>
            <div className="st-chips" role="group" aria-label={t('Tło podglądu')}>
              {def.category === 'camera' && (
                <button type="button" className={camera ? 'is-active' : ''} onClick={() => setCamera((c) => !c)}>
                  📷 {t('Kamera')}
                </button>
              )}
              {def.category !== 'scene' && BACKDROPS.map((b) => (
                <button key={b.id} type="button" className={b.id === backdrop ? 'is-active' : ''} onClick={() => setBackdrop(b.id)}>
                  {t(b.label)}
                </button>
              ))}
            </div>
          </div>

          <Preview def={def} params={params} backdrop={backdrop} camera={camera} size={size} />

          <OutputPanel def={def} query={query} size={size} setSize={setSize} onApply={apply} />
        </main>

        <aside className="st-settings" aria-label={t('Ustawienia')}>
          <div className="st-settings-head">
            <h2>{t('Ustawienia')}</h2>
            <button type="button" className="st-btn ghost small" onClick={() => setParams(localizedDefaults(def, t))}>{t('Resetuj')}</button>
          </div>
          <div className="st-fields">
            {visible.map((f) => {
              const heading = f.group && f.group !== currentGroup ? f.group : null;
              if (f.group) currentGroup = f.group;
              return (
                <Fragment key={f.key}>
                  {heading && <h3 className="st-group">{t(heading)}</h3>}
                  <FieldControl field={f} value={params[f.key]} onChange={(v) => set(f.key, v)} />
                </Fragment>
              );
            })}
          </div>
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
