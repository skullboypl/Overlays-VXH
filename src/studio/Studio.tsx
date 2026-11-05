import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { OVERLAYS, findOverlay } from '../overlays/registry';
import { defaultParams, isFieldVisible, paramsToQuery, queryToParams, type OverlayDef, type Params } from '../overlays/schema';
import { Overlay } from '../overlays/Overlay';
import { FieldControl } from './Fields';
import { OutputPanel } from './OutputPanel';
import { SeoSection } from './SeoSection';
import { seoFor } from '../seo/content';
import './studio.css';

const STORAGE = 'vxh-overlays:';
const BACKDROPS = [
  { id: 'scene', label: 'Gra' },
  { id: 'checker', label: 'Przezroczyste' },
  { id: 'dark', label: 'Ciemne' },
  { id: 'light', label: 'Jasne' },
] as const;
type Backdrop = (typeof BACKDROPS)[number]['id'];

const SECTIONS = [
  { id: 'scene', title: 'Ekrany', note: 'Start, przerwa, koniec' },
  { id: 'screen', title: 'Efekty', note: 'Na całą scenę' },
  { id: 'camera', title: 'Kamerka', note: 'Ramki i święta' },
  { id: 'widget', title: 'Paski i napisy', note: 'Info dla widzów' },
] as const;

// Settings survive a refresh in this browser; the link itself carries everything OBS needs.
const loadParams = (def: OverlayDef): Params => {
  try {
    const raw = localStorage.getItem(STORAGE + def.id);
    if (raw) return queryToParams(def, new URLSearchParams(raw));
  } catch { /* private mode: defaults are fine */ }
  return defaultParams(def);
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
  const { ref, scale } = useFitScale(size.w, size.h, isCam ? 1.6 : 1);
  return (
    <div className={`st-preview bg-${backdrop}`} ref={ref}>
      {backdrop === 'scene' && <div className="st-scene" aria-hidden />}
      <div
        className="st-canvas"
        style={{ width: size.w, height: size.h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {isCam && camera && <div className="st-cam" aria-hidden><span /></div>}
        <Overlay id={def.id} params={params} />
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
const initialParams = (def: OverlayDef): Params => {
  const search = new URLSearchParams(window.location.search);
  return [...search.keys()].length ? queryToParams(def, search) : loadParams(def);
};

const Editor = ({ def, home }: { def: OverlayDef; home: boolean }) => {
  const navigate = useNavigate();
  const [params, setParams] = useState<Params>(() => initialParams(def));
  const [backdrop, setBackdrop] = useState<Backdrop>('scene');
  const [camera, setCamera] = useState(true);
  const [size, setSize] = useState(def.size);

  useEffect(() => {
    if (!home) document.title = seoFor(def).title;
  }, [def, home]);

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
          <a href="https://vxh.pl/" target="_blank" rel="noreferrer">Inne narzędzia VXH</a>
          <a href="https://faceitbanner.vxh.pl/" target="_blank" rel="noreferrer">FACEIT Banner</a>
        </nav>
      </header>

      <div className="st-body">
        <aside className="st-list" aria-label="Lista overlayów">
          {SECTIONS.map((sec) => (
            <section key={sec.id}>
              <h2>{sec.title}<small>{sec.note}</small></h2>
              {OVERLAYS.filter((o) => o.category === sec.id).map((o) => (
                <Link key={o.id} to={`/${o.id}`} className={`st-item ${o.id === def.id ? 'is-active' : ''}`}>
                  <span className="st-item-icon" aria-hidden>{o.icon}</span>
                  <span className="st-item-text">
                    <b>{o.name}</b>
                    <small>{o.description}</small>
                  </span>
                </Link>
              ))}
            </section>
          ))}
        </aside>

        <main className="st-stage">
          <div className="st-stage-head">
            <div>
              <h1>{def.icon} {def.name}</h1>
              <p>{def.description}</p>
            </div>
            <div className="st-chips" role="group" aria-label="Tło podglądu">
              {def.category === 'camera' && (
                <button type="button" className={camera ? 'is-active' : ''} onClick={() => setCamera((c) => !c)}>
                  📷 Kamera
                </button>
              )}
              {def.category !== 'scene' && BACKDROPS.map((b) => (
                <button key={b.id} type="button" className={b.id === backdrop ? 'is-active' : ''} onClick={() => setBackdrop(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <Preview def={def} params={params} backdrop={backdrop} camera={camera} size={size} />

          <OutputPanel def={def} query={query} size={size} setSize={setSize} onApply={apply} />
        </main>

        <aside className="st-settings" aria-label="Ustawienia">
          <div className="st-settings-head">
            <h2>Ustawienia</h2>
            <button type="button" className="st-btn ghost small" onClick={() => setParams(defaultParams(def))}>Resetuj</button>
          </div>
          <div className="st-fields">
            {visible.map((f) => {
              const heading = f.group && f.group !== currentGroup ? f.group : null;
              if (f.group) currentGroup = f.group;
              return (
                <Fragment key={f.key}>
                  {heading && <h3 className="st-group">{heading}</h3>}
                  <FieldControl field={f} value={params[f.key]} onChange={(v) => set(f.key, v)} />
                </Fragment>
              );
            })}
          </div>
        </aside>
      </div>
      <SeoSection def={def} home={home} />
    </div>
  );
};
