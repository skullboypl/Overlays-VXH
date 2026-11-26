// Writes the link contract of the current registry as JSON. Built with `vite build --ssr`, like the i18n extractor,
// because the registry imports assets through import.meta.glob.
//   node .ssr/compat/dump.js <out.json>
import { writeFileSync } from 'node:fs';
import { OVERLAYS } from '../overlays/registry';
import { buildContract } from './contract';

const out = process.argv[2] ?? 'contract.json';
writeFileSync(out, JSON.stringify(buildContract(OVERLAYS), null, 1) + '\n');
console.log(`${OVERLAYS.length} overlays -> ${out}`);
