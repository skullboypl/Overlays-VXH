import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { Studio } from './studio/Studio';
import { DocsPage } from './docs/DocsPage';
import { Overlay } from './overlays/Overlay';
import { findOverlay } from './overlays/registry';
import { queryToParams } from './overlays/schema';
import { LangProvider, isLang } from './i18n';
import { startPresence } from './stats';
import './overlays/overlay.css';
import './overlays/scene.css';
import './overlays/holiday.css';
import './overlays/widgets.css';
import './overlays/proframe.css';

/** What OBS loads: just the effect on a transparent page. */
const OverlayRoute = () => {
  const { id } = useParams();
  const [search] = useSearchParams();
  const def = findOverlay(id);
  // Anonymous heartbeat for the live counter in the studio header.
  useEffect(() => (def ? startPresence(def.id) : undefined), [def]);
  if (!def) return null;
  // No ?lang means Polish: OBS's own browser language must never change what viewers see.
  const lang = search.get('lang');
  return (
    <div className="ov-root">
      <Overlay id={def.id} params={{ ...queryToParams(def, search), _lang: isLang(lang) ? lang : 'pl' }} />
    </div>
  );
};

// Decided before the first paint, so OBS never sees the studio background flash.
if (location.pathname.startsWith('/o/')) document.documentElement.classList.add('is-overlay');

// Pre-rendered docs markup sits in #root for crawlers; the app replaces it on load.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <LangProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:slug" element={<DocsPage />} />
        <Route path="/:lang/docs" element={<DocsPage />} />
        <Route path="/:lang/docs/:slug" element={<DocsPage />} />
        <Route path="/jak-dodac-overlay-do-obs" element={<Navigate to="/docs/obs" replace />} />
        <Route path="/faq" element={<Navigate to="/docs/faq" replace />} />
        <Route path="/o/:id" element={<OverlayRoute />} />
        <Route path="/:id" element={<Studio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </LangProvider>,
);
