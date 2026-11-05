import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { findOverlay } from '../overlays/registry';
import { Overlay } from '../overlays/Overlay';
import { defaultParams } from '../overlays/schema';
import { isLang, translate, useT, type LangId } from '../i18n';
import { docsPage, docsPath, type SeoPage } from '../seo/content';
import { DocsNav, SeoArticle } from '../seo/SeoArticle';
import { LangSelect } from '../studio/LangSelect';
import '../studio/studio.css';
import './docs.css';

/** Small live demo of the overlay on a docs page (defaults, fake webcam for frames). */
const LivePreview = ({ id }: { id: string }) => {
  const def = findOverlay(id)!;
  const [show, setShow] = useState(false);
  useEffect(() => setShow(true), []); // canvases need the browser; pre-rendered HTML keeps the box only
  return (
    <div className={`docs-preview cat-${def.category}`}>
      {def.category === 'camera' && <div className="st-cam" aria-hidden><span /></div>}
      {show && <Overlay id={def.id} params={defaultParams(def)} />}
    </div>
  );
};

/** Shared by the SPA route and the build-time pre-render. */
export const DocsView = ({ page, onLang }: { page: SeoPage; onLang?: (l: LangId) => void }) => {
  const tr = (s: string) => translate(page.lang, s);
  const studioHref = page.overlay ? `/${page.overlay}` : '/';
  return (
    <div className="docs">
      <header className="st-top">
        <a href="/" className="st-logo">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span><b>Overlays</b><small>docs · vxh</small></span>
        </a>
        <nav className="st-nav">
          <a className="docs-cta" href={studioHref}>{tr('Otwórz studio')} →</a>
          {onLang ? <LangSelect onPick={onLang} /> : null}
        </nav>
      </header>
      <div className="docs-body">
        <DocsNav page={page} />
        <main className="docs-main">
          <p className="docs-crumbs">
            <a href={docsPath(page.lang)}>{tr('Dokumentacja')}</a>
            {page.slug && <> / <span>{page.h1}</span></>}
          </p>
          <h1>{page.overlay ? `${findOverlay(page.overlay)!.icon} ${page.h1}` : page.h1}</h1>
          {page.overlay && (
            <>
              <LivePreview id={page.overlay} />
              <a className="st-btn primary docs-open" href={studioHref}>{tr('Ustaw i skopiuj link w studio')}</a>
            </>
          )}
          <SeoArticle page={page} />
        </main>
      </div>
    </div>
  );
};

export const DocsPage = () => {
  const { lang: langParam, slug = '' } = useParams();
  const navigate = useNavigate();
  const { lang: uiLang, setLang } = useT();
  const lang: LangId = isLang(langParam) ? langParam : 'pl';
  const page = docsPage(lang, slug);

  useEffect(() => {
    if (lang !== uiLang) setLang(lang);
    if (page) document.title = page.title;
    window.scrollTo(0, 0);
  }, [lang, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (langParam && !isLang(langParam)) return <Navigate to="/docs" replace />;
  if (!page) return <Navigate to={docsPath(lang)} replace />;
  return <DocsView page={page} onLang={(l) => navigate(docsPath(l, slug))} />;
};

