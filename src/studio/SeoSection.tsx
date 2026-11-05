import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { OverlayDef } from '../overlays/schema';
import { HOME, seoFor, type SeoPage } from '../seo/content';
import { SeoArticle } from '../seo/SeoArticle';

export const SeoSection = ({ def, home }: { def: OverlayDef; home: boolean }) => (
  <div className="seo-wrap">
    <SeoArticle page={home ? HOME : seoFor(def)} currentId={home ? undefined : def.id} />
  </div>
);

/** Standalone text pages (guide, FAQ) with a link back to the studio. */
export const DocPage = ({ page }: { page: SeoPage }) => {
  useEffect(() => {
    document.title = page.title;
    window.scrollTo(0, 0);
  }, [page]);
  return (
    <div className="doc-page">
      <header className="st-top">
        <Link to="/" className="st-logo">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span><b>Overlays</b><small>studio · vxh</small></span>
        </Link>
        <nav className="st-nav">
          <Link to="/">Otwórz studio</Link>
        </nav>
      </header>
      <div className="seo-wrap">
        <h1 className="doc-title">{page.h1}</h1>
        <p className="doc-lead">{page.description}</p>
        <SeoArticle page={{ ...page, h1: '' }} />
      </div>
    </div>
  );
};
