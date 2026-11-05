// Build step: static HTML for every docs page in every language (meta, hreflang, JSON-LD, readable
// article), light pages for the studio routes, plus sitemap.xml, robots.txt and llms.txt.
// Run after `vite build` via `vite build --ssr` (see package.json).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { OVERLAYS, findOverlay } from '../overlays/registry';
import type { Field } from '../overlays/schema';
import { LANGS, translate, type LangId } from '../i18n';
import { DOC_SLUGS, SITE, docsPage, docsPath, faqPage, guidePage, homePage, seoFor, type SeoPage } from './content';
import { DocsView } from '../docs/DocsPage';

const DIST = join(process.cwd(), 'dist');
const template = readFileSync(join(DIST, 'index.html'), 'utf8');
// Bare shell for OBS pages (/o/...): no article to flash before the effect mounts.
writeFileSync(join(DIST, 'app.html'), template);
const today = new Date().toISOString().slice(0, 10);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const abs = (path: string) => SITE.url + path;

const jsonLd = (page: SeoPage) => {
  const url = abs(page.path);
  const tr = (s: string) => translate(page.lang, s);
  const graph: Record<string, unknown>[] = [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: page.title, description: page.description, inLanguage: page.lang, isPartOf: { '@id': `${SITE.url}/#website` }, dateModified: today },
    { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@type': 'WebSite', '@id': `${SITE.url}/#website`, url: `${SITE.url}/`, name: SITE.name, publisher: { '@type': 'Organization', name: SITE.brand, url: 'https://vxh.pl/' } },
  ];
  const def = page.overlay ? findOverlay(page.overlay) : undefined;
  if (page.slug === '' || def) {
    graph.push({
      '@type': 'WebApplication',
      name: def ? `${tr(def.name)} – ${SITE.name}` : SITE.name,
      url: def ? `${SITE.url}/${def.id}` : `${SITE.url}/`,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Windows, macOS, Linux (OBS Studio, Streamlabs)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: page.description,
      inLanguage: LANGS.map((l) => l.id),
    });
  }
  if (page.steps) {
    graph.push({ '@type': 'HowTo', name: page.h1, totalTime: 'PT2M', step: page.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tr('Dokumentacja'), item: abs(docsPath(page.lang)) },
      ...(page.slug ? [{ '@type': 'ListItem', position: 2, name: page.h1, item: url }] : []),
    ],
  });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
};

type Head = { title: string; description: string; keywords?: string[]; canonical: string; lang: LangId; alternates?: string; ld?: string };
const head = (p: Head) => [
  `<title>${esc(p.title)}</title>`,
  `<meta name="description" content="${esc(p.description)}" />`,
  p.keywords?.length ? `<meta name="keywords" content="${esc(p.keywords.join(', '))}" />` : '',
  `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />`,
  `<link rel="canonical" href="${p.canonical}" />`,
  p.alternates ?? '',
  `<meta property="og:type" content="website" />`,
  `<meta property="og:site_name" content="${SITE.name}" />`,
  `<meta property="og:title" content="${esc(p.title)}" />`,
  `<meta property="og:description" content="${esc(p.description)}" />`,
  `<meta property="og:url" content="${p.canonical}" />`,
  `<meta property="og:locale" content="${LANGS.find((l) => l.id === p.lang)!.locale}" />`,
  `<meta name="twitter:card" content="summary_large_image" />`,
  p.ld ? `<script type="application/ld+json">${p.ld}</script>` : '',
].filter(Boolean).join('\n    ');

const write = (path: string, html: string) => {
  const dir = path === '/' ? DIST : join(DIST, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
};

const fill = (headHtml: string, body: string, lang: LangId) =>
  template
    .replace('<html lang="pl">', `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace(/<meta property="og:[^>]*>\s*/g, '')
    .replace('</head>', `    ${headHtml}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

const hreflang = (slug: string) =>
  [...LANGS.map((l) => `<link rel="alternate" hreflang="${l.id}" href="${abs(docsPath(l.id, slug))}" />`),
    `<link rel="alternate" hreflang="x-default" href="${abs(docsPath('en', slug))}" />`].join('\n    ');

// ---------- docs: every slug × every language ----------
let count = 0;
for (const { id: lang } of LANGS) {
  for (const slug of DOC_SLUGS) {
    const page = docsPage(lang, slug)!;
    const body = renderToStaticMarkup(<DocsView page={page} />);
    write(page.path, fill(head({ ...page, canonical: abs(page.path), alternates: hreflang(slug), ld: jsonLd(page) }), body, lang));
    count++;
  }
}

// ---------- studio routes: meta + a pointer to the docs, no article under the configurator ----------
const studioBody = (title: string, description: string, docs: string) =>
  `<main class="seo-static" style="max-width:720px;margin:60px auto;padding:0 20px;font-family:sans-serif;color:#ddd">` +
  `<h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="${docs}" style="color:#ff5900">${esc(translate('pl', 'Dokumentacja'))}</a></p></main>`;

const home = homePage('pl');
write('/', fill(head({ title: home.title, description: home.description, keywords: home.keywords, canonical: `${SITE.url}/`, lang: 'pl', ld: jsonLd(home) }), studioBody(home.h1, home.description, '/docs'), 'pl'));
for (const def of OVERLAYS) {
  const page = seoFor(def, 'pl');
  write(`/${def.id}`, fill(head({ title: page.title, description: page.description, keywords: page.keywords, canonical: abs(`/${def.id}`), lang: 'pl' }), studioBody(page.h1, page.description, page.path), 'pl'));
}

// ---------- sitemap with language alternates ----------
const urlEntry = (loc: string, slug: string | null, priority: string) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>${slug === null ? '' : `
${LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l.id}" href="${abs(docsPath(l.id, slug))}" />`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(docsPath('en', slug))}" />`}
  </url>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntry(`${SITE.url}/`, null, '1.0')}
${OVERLAYS.map((o) => urlEntry(abs(`/${o.id}`), null, '0.7')).join('\n')}
${LANGS.flatMap((l) => DOC_SLUGS.map((slug) => urlEntry(abs(docsPath(l.id, slug)), slug, slug === '' ? '0.9' : '0.8'))).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n# OBS pages are bare effects without text.\nDisallow: /o/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

// ---------- llms.txt (for AI assistants answering "how do I get X overlay") ----------
const describeField = (f: Field) => {
  const def = Array.isArray(f.default) ? f.default.map((c) => c.replace('#', '')).join(',') : String(f.default).replace('#', '');
  const label = translate('en', f.label);
  switch (f.type) {
    case 'range': return `\`${f.key}\` (${label}): number ${f.min}-${f.max}, default ${def}`;
    case 'select': return `\`${f.key}\` (${label}): ${f.options.map((o) => `${o.value}=${translate('en', o.label)}`).join(', ')}; default ${def}`;
    case 'toggle': return `\`${f.key}\` (${label}): 1 or 0, default ${f.default ? 1 : 0}`;
    case 'color': return `\`${f.key}\` (${label}): hex color without #, default ${def}`;
    case 'colors': return `\`${f.key}\` (${label}): comma-separated hex colors without #, default ${def}`;
    case 'text': return `\`${f.key}\` (${label}): text${f.list ? ', items separated by " | "' : ''}, default "${def}"`;
  }
};
const en = homePage('en');
const llms = `# ${SITE.name}

> ${en.description}

Free animated overlays for OBS Studio and Streamlabs (Browser Source) with an in-browser configurator. No account, transparent background, every setting lives in the link. UI in ${LANGS.length} languages: ${LANGS.map((l) => l.name).join(', ')}.

## How it works
- Studio: ${SITE.url}/<id> (e.g. ${SITE.url}/starting). Change settings on the live preview.
- OBS link: ${SITE.url}/o/<id>?<params>. In OBS: Sources → + → Browser, paste the link, set the size.
- Params left out use their defaults. Colors are hex without #. Add \`lang=<code>\` for texts the overlay draws itself (holiday greetings); without it they are Polish.
- Saved setups live only in the browser's localStorage; share codes starting with VXH1- move them to another PC.

## Docs
- [${en.h1}](${abs(en.path)})
- [${guidePage('en').h1}](${abs(guidePage('en').path)})
- [${faqPage('en').h1}](${abs(faqPage('en').path)})
- Polish docs: ${abs(docsPath('pl'))} · other languages: ${LANGS.filter((l) => l.id !== 'pl' && l.id !== 'en').map((l) => abs(docsPath(l.id))).join(', ')}

## Overlays
${OVERLAYS.map((o) => `### ${translate('en', o.name)} (\`${o.id}\`)
${translate('en', o.description)} Source size: ${o.size.w}×${o.size.h}.
Studio: ${SITE.url}/${o.id} · OBS: ${SITE.url}/o/${o.id} · Docs: ${abs(docsPath('en', o.id))}
Params:
${o.fields.map((f) => `- ${describeField(f)}`).join('\n')}
`).join('\n')}
## Example
Starting screen with a 10 minute countdown, synthwave background and chat on the right:
${SITE.url}/o/starting?minutes=10&bg=synth&chat=1
`;
writeFileSync(join(DIST, 'llms.txt'), llms);

console.log(`prerendered ${count} docs pages in ${LANGS.length} languages, ${OVERLAYS.length + 1} studio pages, sitemap.xml, robots.txt, llms.txt`);
