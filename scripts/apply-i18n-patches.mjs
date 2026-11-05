// Merges src/i18n/patches.json into src/i18n/locales/<lang>.json, drops keys no longer in
// source.json, and lists strings still missing per language. Run after `pnpm i18n:extract`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const dir = 'src/i18n';
const source = JSON.parse(readFileSync(`${dir}/source.json`, 'utf8'));
const patches = JSON.parse(readFileSync(`${dir}/patches.json`, 'utf8'));

for (const [lang, add] of Object.entries(patches)) {
  if (lang.startsWith('_')) continue;
  const file = `${dir}/locales/${lang}.json`;
  if (!existsSync(file)) { console.log(lang, 'no locale file yet'); continue; }
  const dict = { ...JSON.parse(readFileSync(file, 'utf8')), ...add };
  const out = Object.fromEntries(source.filter((s) => dict[s]).map((s) => [s, dict[s]]));
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const missing = source.filter((s) => !out[s]);
  console.log(lang, Object.keys(out).length, 'keys', missing.length ? `missing: ${missing.join(' | ')}` : 'complete');
}
