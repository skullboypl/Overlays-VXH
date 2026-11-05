import { OVERLAYS } from '../overlays/registry';
import { FAQ_PAGE, GUIDE, HOME, type SeoPage } from './content';

const CATEGORY_LABEL: Record<string, string> = {
  scene: 'Ekrany startu, przerwy i końca',
  screen: 'Efekty na cały ekran',
  camera: 'Ramki na kamerkę',
  widget: 'Paski i napisy',
};

/** Plain, link-rich article. Rendered by React under the studio and pre-rendered to static HTML. */
export const SeoArticle = ({ page, currentId }: { page: SeoPage; currentId?: string }) => (
  <article className="seo">
    <header>
      {page.h1 && <h2>{page.h1}</h2>}
      {page.intro.map((p, i) => <p key={i}>{p}</p>)}
    </header>

    {page.features && (
      <section>
        <h3>Co możesz ustawić</h3>
        <ul className="seo-features">{page.features.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>
    )}

    {page.steps && (
      <section>
        <h3>Jak dodać do OBS krok po kroku</h3>
        <ol className="seo-steps">{page.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>
    )}

    <section>
      <h3>Pytania i odpowiedzi</h3>
      <div className="seo-faq">
        {page.faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>

    <nav className="seo-links" aria-label="Wszystkie overlaye">
      {Object.entries(CATEGORY_LABEL).map(([cat, label]) => (
        <div key={cat}>
          <h3>{label}</h3>
          <ul>
            {OVERLAYS.filter((o) => o.category === cat).map((o) => (
              <li key={o.id}>
                {o.id === currentId ? <b>{o.icon} {o.name}</b> : <a href={`/${o.id}`}>{o.icon} {o.name}</a>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <h3>Pomoc</h3>
        <ul>
          <li><a href={GUIDE.path}>Jak dodać overlay do OBS</a></li>
          <li><a href={FAQ_PAGE.path}>Najczęstsze pytania</a></li>
          <li><a href={HOME.path}>Wszystkie overlaye</a></li>
          <li><a href="https://vxh.pl/">Inne narzędzia VXH dla streamerów</a></li>
        </ul>
      </div>
    </nav>
  </article>
);
