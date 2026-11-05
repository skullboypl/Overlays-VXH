import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { Studio } from './studio/Studio';
import { DocPage } from './studio/SeoSection';
import { FAQ_PAGE, GUIDE } from './seo/content';
import { Overlay } from './overlays/Overlay';
import { findOverlay } from './overlays/registry';
import { queryToParams } from './overlays/schema';
import './overlays/overlay.css';
import './overlays/scene.css';
import './overlays/holiday.css';
import './overlays/widgets.css';

/** What OBS loads: just the effect on a transparent page. */
const OverlayRoute = () => {
  const { id } = useParams();
  const [search] = useSearchParams();
  const def = findOverlay(id);
  if (!def) return null;
  return (
    <div className="ov-root">
      <Overlay id={def.id} params={queryToParams(def, search)} />
    </div>
  );
};

// Decided before the first paint, so OBS never sees the studio background flash.
if (location.pathname.startsWith('/o/')) document.documentElement.classList.add('is-overlay');

// Pre-rendered SEO markup sits in #root for crawlers; the app replaces it on load.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Studio />} />
      <Route path={GUIDE.path} element={<DocPage page={GUIDE} />} />
      <Route path={FAQ_PAGE.path} element={<DocPage page={FAQ_PAGE} />} />
      <Route path="/:id" element={<Studio />} />
      <Route path="/o/:id" element={<OverlayRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
