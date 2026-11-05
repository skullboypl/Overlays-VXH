import { OVERLAYS } from '../overlays/registry';
import { translate } from '../i18n';
import { docsPath, type SeoPage } from './content';

export const CATEGORY_LABEL: Record<string, string> = {
  scene: 'Ekrany startu, przerwy i końca',
  screen: 'Efekty na cały ekran',
  camera: 'Ramki na kamerkę',
  widget: 'Paski i napisy',
};

/** Docs article body. Rendered by React on /docs and pre-rendered to static HTML for crawlers. */
export const SeoArticle = ({ page }: { page: SeoPage }) => {
  const tr = (s: string) => translate(page.lang, s);
  return (
    <article className="seo">
      {page.intro.map((p, i) => <p key={i} className={i === 0 ? 'seo-lead' : undefined}>{p}</p>)}

      {page.features && (
        <section>
          <h2>{tr('Co możesz ustawić')}</h2>
          <ul className="seo-features">{page.features.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}

      {page.steps && (
        <section>
          <h2>{tr('Jak dodać do OBS krok po kroku')}</h2>
          <ol className="seo-steps">{page.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
      )}

      {page.slug === '' && (
        <section>
          <h2>{tr('Wszystkie overlaye')}</h2>
          <div className="seo-cards">
            {OVERLAYS.map((o) => (
              <a key={o.id} className="seo-card" href={docsPath(page.lang, o.id)}>
                <span aria-hidden>{o.icon}</span>
                <b>{tr(o.name)}</b>
                <small>{tr(o.description)}</small>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>{tr('Pytania i odpowiedzi')}</h2>
        <div className="seo-faq">
          {page.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
};

/** Wiki sidebar: start pages, then every overlay grouped by category. */
export const DocsNav = ({ page }: { page: SeoPage }) => {
  const tr = (s: string) => translate(page.lang, s);
  const link = (slug: string, label: string, icon?: string) => (
    <li key={slug || 'home'}>
      <a href={docsPath(page.lang, slug)} className={page.slug === slug ? 'is-active' : undefined} aria-current={page.slug === slug ? 'page' : undefined}>
        {icon && <span aria-hidden>{icon}</span>} {label}
      </a>
    </li>
  );
  return (
    <nav className="docs-nav" aria-label={tr('Dokumentacja')}>
      <h3>{tr('Start')}</h3>
      <ul>
        {link('', tr('Wszystkie overlaye'), '🏠')}
        {link('obs', tr('Jak dodać overlay do OBS'), '📘')}
        {link('faq', tr('Najczęstsze pytania'), '❓')}
      </ul>
      {Object.entries(CATEGORY_LABEL).map(([cat, label]) => (
        <div key={cat}>
          <h3>{tr(label)}</h3>
          <ul>{OVERLAYS.filter((o) => o.category === cat).map((o) => link(o.id, tr(o.name), o.icon))}</ul>
        </div>
      ))}
    </nav>
  );
};
