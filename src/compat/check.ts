// Backward-compatibility guard for overlay links. Compares the registry with src/compat/baseline.json, the contract
// of everything already published, and fails on anything that would make an existing link look different.
//   pnpm compat:check            (also runs in pnpm build)
//   pnpm compat:update           after adding overlays / fields / options: records them, so they are protected too
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERLAYS } from '../overlays/registry';
import { buildContract, compareContracts, type Contract } from './contract';

const file = join(process.cwd(), 'src', 'compat', 'baseline.json');
const update = process.argv.includes('--update');
const current = buildContract(OVERLAYS);
const baseline: Contract = JSON.parse(readFileSync(file, 'utf8'));
const problems = compareContracts(baseline, current);

if (problems.length) {
  console.error(`\n✗ ${problems.length} change(s) would alter existing overlay links:\n`);
  for (const p of problems) console.error(`  ${p.overlay}${p.field ? `.${p.field}` : ''}: ${p.what}`);
  console.error(`
Old links only carry settings that differ from the defaults, so these changes reach every streamer already using them.
Add a NEW field / option / overlay instead (see README "Zgodność wsteczna linków").
`);
  process.exit(1);
}

const added = Object.keys(current.overlays).filter((id) => !baseline.overlays[id]);
const addedFields = Object.entries(current.overlays)
  .filter(([id]) => baseline.overlays[id])
  .flatMap(([id, o]) => Object.keys(o.fields).filter((k) => !baseline.overlays[id].fields[k]).map((k) => `${id}.${k}`));
console.log(`✓ links compatible: ${Object.keys(baseline.overlays).length} published overlays unchanged` +
  (added.length || addedFields.length ? `; new since baseline: ${[...added, ...addedFields].join(', ')}` : ''));

if (update) {
  writeFileSync(file, JSON.stringify(current, null, 1) + '\n');
  console.log(`baseline updated: ${Object.keys(current.overlays).length} overlays`);
}
