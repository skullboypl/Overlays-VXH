// Build step: writes a static HTML page per route (title, meta, JSON-LD, readable article), plus
// sitemap.xml, robots.txt and llms.txt. Run after `vite build` via `vite build --ssr` (see package.json).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { OVERLAYS, findOverlay } from '../overlays/registry';
import type { Field } from '../overlays/schema';
import { ALL_PAGES, FAQ_PAGE, GUIDE, HOME, SITE, type SeoPage } from './content';
import { SeoArticle } from './SeoArticle';

const DIST = join(process.cwd(), 'dist');
const template = readFileSync(join(DIST, 'index.html'), 'utf8');
// Bare shell for OBS pages (/o/...): no article to flash before the effect mounts.
writeFileSync(join(DIST, 'app.html'), template);
const today = new Date().toISOString().slice(0, 10);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const jsonLd = (page: SeoPage) => {
  const url = SITE.url + (page.path === '/' ? '/' : page.path);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'pl-PL',
      isPartOf: { '@id': `${SITE.url}/#website` },
      dateModified: today,
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  if (page.path === '/') {
    graph.push(
      { '@type': 'WebSite', '@id': `${SITE.url}/#website`, url: `${SITE.url}/`, name: SITE.name, inLanguage: 'pl-PL', publisher: { '@id': `${SITE.url}/#org` } },
      { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.brand, url: 'https://vxh.pl/' },
    );
  }
  const def = findOverlay(page.path.slice(1));
  if (page.path === '/' || def) {
    graph.push({
      '@type': 'WebApplication',
      name: def ? `${def.name} – ${SITE.name}` : SITE.name,
      url,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Windows, macOS, Linux (OBS Studio, Streamlabs)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN' },
      description: page.description,
      inLanguage: 'pl-PL',
    });
  }
  if (page.steps) {
    graph.push({
      '@type': 'HowTo',
      name: def ? `Jak dodać ${def.name} do OBS` : 'Jak dodać overlay do OBS',
      totalTime: 'PT2M',
      step: page.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
    });
  }
  if (page.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url },
      ],
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
};

const renderPage = (page: SeoPage) => {
  const url = SITE.url + (page.path === '/' ? '/' : page.path);
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="keywords" content="${esc(page.keywords.join(', '))}" />`,
    `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="pl" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="pl_PL" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<script type="application/ld+json">${jsonLd(page)}</script>`,
  ].join('\n    ');

  const def = findOverlay(page.path.slice(1));
  const body = renderToStaticMarkup(
    <div className="seo-wrap seo-static">
      <h1>{def ? `${def.icon} ${page.h1} – overlay do OBS` : page.h1}</h1>
      {page.path !== '/' && !def && <p className="doc-lead">{page.description}</p>}
      <SeoArticle page={page.path === '/' || def ? page : { ...page, h1: '' }} currentId={def?.id} />
    </div>,
  );

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace(/<meta property="og:[^>]*>\s*/g, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  const dir = page.path === '/' ? DIST : join(DIST, page.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
};

for (const page of ALL_PAGES) renderPage(page);

// ---------- sitemap / robots ----------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ALL_PAGES.map((p) => `  <url><loc>${SITE.url}${p.path === '/' ? '/' : `${p.path}`}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p.path === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n# OBS pages are bare effects without text.\nDisallow: /o/\n\nSitemap: ${SITE.url}/sitemap.xml\n`,
);

// ---------- llms.txt (for AI assistants answering "how do I get X overlay") ----------
const describeField = (f: Field) => {
  const def = Array.isArray(f.default) ? f.default.map((c) => c.replace('#', '')).join(',') : String(f.default).replace('#', '');
  switch (f.type) {
    case 'range': return `\`${f.key}\` (${f.label}): liczba ${f.min}–${f.max}, domyślnie ${def}`;
    case 'select': return `\`${f.key}\` (${f.label}): ${f.options.map((o) => `${o.value}=${o.label}`).join(', ')}; domyślnie ${def}`;
    case 'toggle': return `\`${f.key}\` (${f.label}): 1 albo 0, domyślnie ${f.default ? 1 : 0}`;
    case 'color': return `\`${f.key}\` (${f.label}): kolor hex bez #, domyślnie ${def}`;
    case 'colors': return `\`${f.key}\` (${f.label}): kolory hex bez # po przecinku, domyślnie ${def}`;
    case 'text': return `\`${f.key}\` (${f.label}): tekst${f.list ? ', elementy oddzielone " | "' : ''}, domyślnie "${def}"`;
  }
};

const llms = `# ${SITE.name}

> Darmowe animowane overlaye do OBS Studio i Streamlabs (Browser Source) z konfiguratorem w przeglądarce: ekrany „Zaraz startujemy”, „Przerwa / BRB” i „Koniec streama” z odliczaniem i miejscem na czat, efekty na cały ekran (śnieg, deszcz, konfetti, fajerwerki, gwiazdy), ramki na kamerkę (neon, HUD, z nickiem, 8 świątecznych motywów) oraz przewijany pasek i rotator sociali. Bez rejestracji, przezroczyste tło, wszystkie ustawienia w linku.

## Jak to działa
- Studio: ${SITE.url}/<id> (np. ${SITE.url}/starting). Ustawienia zmienia się na podglądzie.
- Link dla OBS: ${SITE.url}/o/<id>?<parametry>. W OBS: Źródła → + → Przeglądarka, wklej link, ustaw rozmiar.
- Parametry pominięte w linku mają wartości domyślne. Kolory podaje się jako hex bez #.
- Zapisane ustawienia są tylko w localStorage przeglądarki; do przenoszenia służy kod udostępniania zaczynający się od VXH1-.

## Strony
- [Studio i lista overlayów](${SITE.url}/): ${HOME.description}
- [${GUIDE.h1}](${SITE.url}${GUIDE.path}): ${GUIDE.description}
- [${FAQ_PAGE.h1}](${SITE.url}${FAQ_PAGE.path}): ${FAQ_PAGE.description}

## Overlaye
${OVERLAYS.map((o) => `### ${o.name} (\`${o.id}\`)
${o.description} Rozmiar źródła: ${o.size.w}×${o.size.h}.
Studio: ${SITE.url}/${o.id} · OBS: ${SITE.url}/o/${o.id}
Parametry:
${o.fields.map((f) => `- ${describeField(f)}`).join('\n')}
`).join('\n')}
## Przykład
Ekran startowy z 10-minutowym odliczaniem, tłem synthwave i czatem po prawej:
${SITE.url}/o/starting?minutes=10&bg=synth&chat=1
`;
writeFileSync(join(DIST, 'llms.txt'), llms);

console.log(`prerendered ${ALL_PAGES.length} pages, sitemap.xml, robots.txt, llms.txt`);
