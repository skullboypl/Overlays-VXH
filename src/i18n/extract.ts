// Collects every Polish UI/docs string into src/i18n/source.json, the input for translators.
// Run: pnpm i18n:extract. Strings come from the registry, the docs copy and t('...') / tx('...') calls.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERLAYS } from '../overlays/registry';
import { HOLIDAY_THEMES } from '../overlays/HolidayFrame';
import { docsSourceStrings } from '../seo/content';
import { CATEGORY_LABEL } from '../seo/SeoArticle';

const SRC = join(process.cwd(), 'src');
const out = new Set<string>();
const add = (s?: string) => { if (s && /\p{L}/u.test(s)) out.add(s); };

for (const o of OVERLAYS) {
  add(o.name);
  add(o.description);
  for (const f of o.fields) {
    add(f.label); add(f.hint); add(f.group);
    if (f.type === 'select') f.options.forEach((op) => add(op.label));
    if (f.type === 'text') {
      add(f.placeholder);
      if (f.i18n) (f.list === 'lines' ? f.default.split(/ ?\| ?/) : [f.default]).forEach(add);
    }
  }
}
Object.values(HOLIDAY_THEMES).forEach((t) => add(t.label));
Object.values(CATEGORY_LABEL).forEach(add);
docsSourceStrings().forEach(add);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(n) ? [p] : [];
  });
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\b(?:t|tx|tr)\(\s*'((?:[^'\\]|\\.)*)'/g)) add(m[1].replace(/\\'/g, "'"));
}

const list = [...out].sort((a, b) => a.localeCompare(b, 'pl'));
writeFileSync(join(SRC, 'i18n', 'source.json'), JSON.stringify(list, null, 1) + '\n');
console.log(`${list.length} strings, ${list.join(' ').split(/\s+/).length} words -> src/i18n/source.json`);
