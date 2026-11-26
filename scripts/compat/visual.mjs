// Visual backward-compatibility check: renders the same overlay links on two builds and reports the ones that differ.
//
//   node scripts/compat/visual.mjs <base dist> <head dist> <base contract.json> [--only=qr,socials] [--defaults] [--out=dir] [--jobs=6]
//
// Every link comes from the BASE contract: the defaults of each overlay, then one setting at a time (every other
// option of a select, a flipped toggle, the maximum of a range, another colour). Time, Math.random, timers,
// requestAnimationFrame, CSS animations and videos are frozen, so two identical builds give identical pixels.
// Needs Playwright (`require('playwright')` or PLAYWRIGHT=/path/to/playwright/index.js).
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opts = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v = '1'] = a.slice(2).split('='); return [k, v]; }));
if (args.length < 3) { console.error('usage: visual.mjs <base dist> <head dist> <base contract.json> [--only=a,b] [--defaults] [--out=dir] [--jobs=6]'); process.exit(2); }
const [baseDist, headDist, contractPath] = args.map((a) => resolve(a));
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const only = opts.only ? new Set(opts.only.split(',')) : null;
const outDir = resolve(opts.out ?? 'compat-report');
const JOBS = Number(opts.jobs ?? 6);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright');

// ---------- the links to test ----------
const variants = [];
for (const [id, o] of Object.entries(contract.overlays)) {
  if (only && !only.has(id)) continue;
  variants.push({ id, q: '', label: 'defaults' });
  if (opts.defaults) continue;
  for (const [key, f] of Object.entries(o.fields)) {
    const add = (v) => variants.push({ id, q: `${key}=${encodeURIComponent(v)}`, label: `${key}=${v}` });
    if (f.type === 'select') f.options.filter((v) => v !== f.default).forEach(add);
    else if (f.type === 'toggle') add(f.default ? '0' : '1');
    else if (f.type === 'range' && f.max !== f.default) add(f.max);
    else if (f.type === 'color') add(f.default === '#00c853' ? '2962ff' : '00c853');
    else if (f.type === 'colors') add('00c853,2962ff,ffab00');
  }
}

// ---------- two static servers with an SPA fallback ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json', '.woff2': 'font/woff2' };
const serve = (root) => new Promise((ok) => {
  const srv = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    if (path.startsWith('/api/')) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  srv.listen(0, '127.0.0.1', () => ok({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
});

// ---------- deterministic render ----------
const FREEZE_RANDOM = () => {
  let s = 0x2f6b1d;
  Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const shot = async (browser, base, v, size) => {
  const scale = Math.min(1, 960 / size.w, 720 / size.h);
  const viewport = { width: Math.round(size.w * scale), height: Math.max(40, Math.round(size.h * scale)) };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  try {
    await page.addInitScript(FREEZE_RANDOM);
    await page.clock.install({ time: new Date('2026-11-23T19:30:00') });
    // Frozen from the first script on: only runFor() moves time, timers and requestAnimationFrame. The clock runs for
    // a few ms between install() and pauseAt(), so pause a second later: always the same instant, whatever that drift.
    await page.clock.pauseAt(new Date('2026-11-23T19:30:01'));
    // Fake rAF ticks land on a 16 ms grid whose offset depends on how long install() took, so the first frame comes
    // 11-14 ms after the canvas engine started. Count frames instead: performance.now() is 16 ms per frame, 0 before.
    await page.addInitScript(() => {
      let first = null, vt = 0;
      performance.now = () => vt;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((ts) => {
        if (first === null) first = ts;
        vt = 16 * (1 + Math.round((ts - first) / 16));
        cb(vt);
      });
    });
    await page.goto(`${base}/o/${v.id}${v.q ? `?${v.q}` : ''}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // React mounts and runs its effects on real time (MessageChannel); let that settle while the fake clock stands
    // still, so every canvas engine starts at fake t = 0 and runs exactly the same number of frames.
    // A canvas engine has started once it has sized its canvas (the default is 300 wide).
    await page.waitForFunction(() => document.querySelector('#root')?.children.length
      && [...document.querySelectorAll('canvas')].every((c) => c.width !== 300), null, { polling: 50, timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(300);
    // A video frame depends on decoding speed, not on the link: hide videos in both builds.
    await page.addStyleTag({ content: 'video { visibility: hidden !important; }' });
    // One frame per step: a single runFor(2600) fits 162 or 163 frames depending on the grid offset.
    for (let i = 0; i < 162; i++) await page.clock.runFor(16);
    await page.evaluate(async () => {
      await Promise.all([...document.querySelectorAll('video')].map((el) => new Promise((done) => {
        el.pause();
        if (el.readyState < 1) { done(); return; }
        el.addEventListener('seeked', () => done(), { once: true });
        el.currentTime = 0;
        setTimeout(done, 1500);
      })));
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = 2600; }
    });
    // Web fonts come in per Unicode range, fetched only when a glyph first shows up (ę, ą...), and background
    // pictures decode late: wait for both on real time, with the fake clock standing still.
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { polling: 50, timeout: 10_000 }).catch(() => {});
    await page.evaluate(async () => {
      const urls = [...document.querySelectorAll('*')].map((el) => getComputedStyle(el).backgroundImage).join(' ').match(/url\("?([^")]+)"?\)/g) ?? [];
      await Promise.all([
        ...[...document.images].map((img) => img.decode().catch(() => {})),
        ...urls.map((u) => { const img = new Image(); img.src = u.slice(4, -1).replace(/^"|"$/g, ''); return img.decode().catch(() => {}); }),
      ]);
    });
    // Fit-to-source boxes (bars.tsx FitBox) ignore changes under 0.4%, so where they settle depends on the order the
    // font files arrived in. Squeeze them and let go once every font is in: both builds then settle on the exact fit.
    if (await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.br-fit')];
      boxes.forEach((b) => b.style.setProperty('width', '50%', 'important'));
      return boxes.length;
    })) {
      await page.waitForTimeout(150);
      await page.evaluate(() => document.querySelectorAll('.br-fit').forEach((b) => b.style.removeProperty('width')));
    }
    await page.waitForTimeout(150);
    return await page.screenshot();
  } finally {
    await page.close();
  }
};

// ---------- pixel diff in a browser canvas (no image library needed) ----------
const diffPage = async (browser) => {
  const page = await browser.newPage();
  await page.setContent('<canvas id="a"></canvas><canvas id="b"></canvas>');
  return async (a, b) => page.evaluate(async ([a64, b64]) => {
    const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${src}`; });
    const [ia, ib] = await Promise.all([load(a64), load(b64)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { ratio: 1, size: true };
    const px = (img, id) => { const c = document.getElementById(id); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
    const da = px(ia, 'a'), db = px(ib, 'b');
    let bad = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) > 12 || Math.abs(da[i + 1] - db[i + 1]) > 12 || Math.abs(da[i + 2] - db[i + 2]) > 12 || Math.abs(da[i + 3] - db[i + 3]) > 12) bad++;
    }
    return { ratio: bad / (da.length / 4), size: false };
  }, [a.toString('base64'), b.toString('base64')]);
};

const [A, B] = await Promise.all([serve(baseDist), serve(headDist)]);
const browser = await chromium.launch();
const diff = await diffPage(browser);
mkdirSync(outDir, { recursive: true });
const failures = [];
let done = 0;
const queue = [...variants];
const worker = async () => {
  for (let v = queue.shift(); v; v = queue.shift()) {
    const size = contract.overlays[v.id].size ?? { w: 1280, h: 720 };
    let a, b, d;
    // A real change repeats on every render; rare leftovers (a star twinkling a frame apart) do not: retry and keep
    // the closest pair.
    for (let attempt = 0; attempt < 3; attempt++) {
      const [x, y] = await Promise.all([shot(browser, A.url, v, size), shot(browser, B.url, v, size)]);
      const dd = await diff(x, y);
      if (!d || dd.ratio < d.ratio) { a = x; b = y; d = dd; }
      if (d.ratio <= 0.0005) break;
    }
    if (d.ratio > 0.0005) {
      const name = `${v.id}__${v.label.replace(/[^\w=.-]+/g, '_')}`.slice(0, 120);
      writeFileSync(join(outDir, `${name}.base.png`), a);
      writeFileSync(join(outDir, `${name}.head.png`), b);
      failures.push({ ...v, ratio: d.ratio });
    }
    if (++done % 50 === 0) console.log(`${done}/${variants.length} checked, ${failures.length} differ`);
  }
};
await Promise.all(Array.from({ length: JOBS }, worker));
await browser.close();
A.srv.close(); B.srv.close();
writeFileSync(join(outDir, 'report.json'), JSON.stringify(failures, null, 1));
console.log(`\n${variants.length} links checked, ${failures.length} render differently${failures.length ? ` (screenshots in ${outDir})` : ''}`);
for (const f of failures) console.log(`  ${(f.ratio * 100).toFixed(2).padStart(6)}%  /o/${f.id}${f.q ? `?${f.q}` : ''}`);
process.exit(failures.length ? 1 : 0);
