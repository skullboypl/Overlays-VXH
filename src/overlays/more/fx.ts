// Canvas engines of the add-on effects. Each one: (canvas, getParams) -> { reset, stop }, sized off the canvas height
// (1080 = 1), so the studio preview and OBS look the same.
import type { Params } from '../schema';
import { runLoop } from '../sky';
import { pick, rand, type Engine } from './common';

type G = () => Params;
const n = (g: G, k: string, d: number) => (typeof g()[k] === 'number' ? (g()[k] as number) : d);
const s = (g: G, k: string, d: string) => (typeof g()[k] === 'string' ? (g()[k] as string) : d);
const cols = (g: G, d: string[]) => (Array.isArray(g().colors) && (g().colors as string[]).length ? (g().colors as string[]) : d);
const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
};
const spriteCache = new Map<string, HTMLCanvasElement>();
const sprite = (key: string, size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) => {
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d')!, size);
  spriteCache.set(key, cv);
  return cv;
};
const soft = (color: string, inner = 0.2) => sprite(`soft:${color}:${inner}`, 128, (c, z) => {
  const gr = c.createRadialGradient(z / 2, z / 2, 0, z / 2, z / 2, z / 2);
  gr.addColorStop(0, hexA(color, 1));
  gr.addColorStop(inner, hexA(color, 0.6));
  gr.addColorStop(1, hexA(color, 0));
  c.fillStyle = gr;
  c.fillRect(0, 0, z, z);
});

// ---------- 71 light rays ----------
export const startRays = (canvas: HTMLCanvasElement, g: G): Engine => {
  let t = 0;
  const beams = Array.from({ length: 12 }, () => ({ a: rand(-1, 1), w: rand(0.04, 0.12), ph: rand(0, 6.28), sp: rand(0.2, 0.6) }));
  const stop = runLoop(canvas, () => {}, (ctx, dt, w, h) => {
    t += dt * n(g, 'speed', 1);
    ctx.clearRect(0, 0, w, h);
    const origin = s(g, 'origin', 'top');
    const ox = origin === 'left' ? -w * 0.05 : origin === 'right' ? w * 1.05 : w / 2;
    const oy = -h * 0.08;
    const color = s(g, 'color', '#fff1c9');
    const count = Math.round(n(g, 'count', 7));
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${Math.round(h / 1080 * 26)}px)`;
    for (let i = 0; i < Math.min(count, beams.length); i++) {
      const b = beams[i];
      const spread = n(g, 'spread', 0.6);
      const base = origin === 'left' ? 0.5 : origin === 'right' ? -0.5 : 0;
      const ang = Math.PI / 2 + base + b.a * spread + Math.sin(t * b.sp + b.ph) * 0.05;
      const len = Math.hypot(w, h) * 1.2;
      const half = b.w * (0.8 + 0.2 * Math.sin(t * b.sp * 1.7 + b.ph));
      const a = n(g, 'opacity', 0.35) * 0.55 * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * b.sp * 2 + b.ph)));
      const gr = ctx.createLinearGradient(ox, oy, ox + Math.cos(ang) * len, oy + Math.sin(ang) * len);
      gr.addColorStop(0, hexA(color, a));
      gr.addColorStop(0.7, hexA(color, a * 0.25));
      gr.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(ang - half) * len, oy + Math.sin(ang - half) * len);
      ctx.lineTo(ox + Math.cos(ang + half) * len, oy + Math.sin(ang + half) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  });
  return { reset: () => {}, stop };
};

// ---------- 72 smoke / 73 fire (rising soft particles) ----------
type Puff = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; rot: number; c: string };
const startRising = (canvas: HTMLCanvasElement, g: G, kind: 'smoke' | 'fire'): Engine => {
  let list: Puff[] = [];
  let sc = 1;
  let acc = 0;
  let warm = false;
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    const speed = n(g, 'speed', 1);
    const size = n(g, 'size', 1);
    const rate = n(g, 'count', kind === 'fire' ? 60 : 14) * (kind === 'fire' ? 3 : 1);
    acc += dt * rate;
    // Smoke starts already on screen (a few seconds of puffs), instead of an empty frame that slowly fills.
    const prewarm = !warm && kind === 'smoke';
    if (prewarm) { warm = true; acc += rate * 6; }
    const where = s(g, 'where', 'bottom');
    while (acc > 1) {
      acc -= 1;
      const x = where === 'left' ? rand(-w * 0.05, w * 0.25) : where === 'right' ? rand(w * 0.75, w * 1.05) : where === 'corners' ? (Math.random() < 0.5 ? rand(-w * 0.05, w * 0.18) : rand(w * 0.82, w * 1.05)) : rand(-w * 0.05, w * 1.05);
      const max = kind === 'fire' ? rand(0.6, 1.2) * n(g, 'height', 1) : rand(5, 9);
      const vy = -(kind === 'fire' ? rand(180, 320) : rand(45, 95)) * sc * speed;
      const born = prewarm ? rand(0, max * 0.9) : 0;
      list.push({
        x, y: h + (kind === 'fire' ? rand(0, 10) : rand(20, 80)) * sc + vy * born, vx: rand(-15, 15) * sc,
        vy,
        r: (kind === 'fire' ? rand(55, 110) : rand(90, 180)) * sc * size, life: born, max, rot: rand(0, 6.28),
        c: kind === 'fire' ? pick(['#fff3b0', '#ffb347', '#ff7a1a', '#ff3d00']) : s(g, 'color', '#b9bfcc'),
      });
    }
    if (list.length > 900) list = list.slice(-900);
    ctx.clearRect(0, 0, w, h);
    const op = n(g, 'opacity', kind === 'fire' ? 0.9 : 0.5);
    ctx.globalCompositeOperation = kind === 'fire' ? 'lighter' : 'source-over';
    list = list.filter((p) => {
      p.life += dt;
      if (p.life > p.max) return false;
      const k = p.life / p.max;
      p.x += (p.vx + Math.sin(p.life * 2 + p.rot) * 20 * sc + n(g, 'wind', 0) * (kind === 'smoke' ? 70 : 40) * sc) * dt;
      p.y += p.vy * dt;
      const r = kind === 'fire' ? p.r * (1 - k * 0.7) : p.r * (0.6 + k * 1.4);
      ctx.globalAlpha = op * (kind === 'fire' ? (1 - k) * 0.42 : Math.sin(k * Math.PI) * 0.6);
      const col = kind === 'fire' ? (k < 0.25 ? '#fff3b0' : k < 0.5 ? '#ffb347' : k < 0.75 ? '#ff7a1a' : '#ff3d00') : p.c;
      // Flames are taller than wide; smoke puffs are round.
      const ry = kind === 'fire' ? r * 1.7 : r;
      ctx.drawImage(soft(col, kind === 'fire' ? 0.15 : 0.35), p.x - r, p.y - ry, r * 2, ry * 2);
      return true;
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  });
  return { reset: () => { list = []; warm = false; }, stop };
};
export const startSmoke = (c: HTMLCanvasElement, g: G) => startRising(c, g, 'smoke');
export const startFire = (c: HTMLCanvasElement, g: G) => startRising(c, g, 'fire');

// ---------- 74 rain on glass ----------
type Drop = { x: number; y: number; r: number; v: number; slide: boolean; life: number; trail: { x: number; y: number; r: number }[] };
export const startGlass = (canvas: HTMLCanvasElement, g: G): Engine => {
  let drops: Drop[] = [];
  let sc = 1;
  const glassSprite = () => sprite('glassdrop', 64, (c, z) => {
    const gr = c.createRadialGradient(z * 0.42, z * 0.38, z * 0.05, z / 2, z / 2, z / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.35, 'rgba(210,225,255,0.25)');
    gr.addColorStop(0.85, 'rgba(20,30,50,0.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.beginPath(); c.arc(z / 2, z / 2, z / 2, 0, 6.28); c.fill();
  });
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    const target = Math.round(n(g, 'count', 120));
    while (drops.length < target) drops.push({ x: rand(0, w), y: rand(0, h), r: rand(4, 16) * sc * n(g, 'size', 1), v: 0, slide: false, life: rand(0, 6), trail: [] });
    if (drops.length > target) drops.length = target;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = n(g, 'opacity', 0.85);
    const sp = glassSprite();
    for (const d of drops) {
      d.life += dt;
      if (!d.slide && d.r > 10 * sc && Math.random() < dt * 0.25 * n(g, 'speed', 1)) d.slide = true;
      if (d.slide) {
        d.v = Math.min(d.v + 600 * sc * dt, 260 * sc * n(g, 'speed', 1));
        d.y += d.v * dt * (0.6 + Math.random() * 0.8);
        d.x += rand(-20, 20) * sc * dt;
        if (Math.random() < dt * 20) d.trail.push({ x: d.x, y: d.y - d.r, r: d.r * rand(0.25, 0.45) });
        if (d.y > h + 20) { Object.assign(d, { x: rand(0, w), y: rand(-20, h * 0.6), v: 0, slide: false, trail: [], r: rand(4, 16) * sc * n(g, 'size', 1) }); }
      }
      d.trail = d.trail.slice(-24);
      for (const tr of d.trail) ctx.drawImage(sp, tr.x - tr.r, tr.y - tr.r, tr.r * 2, tr.r * 2);
      ctx.drawImage(sp, d.x - d.r, d.y - d.r * 1.1, d.r * 2, d.r * 2.2);
    }
    ctx.globalAlpha = 1;
  });
  return { reset: () => { drops = []; }, stop };
};

// ---------- 75 snow drift (falling snow that piles up) ----------
export const startDrift = (canvas: HTMLCanvasElement, g: G): Engine => {
  let flakes: { x: number; y: number; r: number; v: number; ph: number }[] = [];
  let heights: number[] = [];
  let sc = 1, W = 1, H = 1;
  const COLS = 160;
  // A small pile from the start, so the drift reads as one before the snow has built it up.
  const seed = (h: number) => Array.from({ length: COLS }, (_, i) => h * (n(g, 'maxHeight', 12) / 100) * (0.22 + 0.1 * Math.sin(i / 9) + 0.06 * Math.sin(i / 3.3)));
  const stop = runLoop(canvas, (w, h) => { sc = h / 1080; W = w; H = h; if (heights.length !== COLS) heights = seed(h); }, (ctx, dt, w, h) => {
    const target = Math.round(n(g, 'count', 160));
    while (flakes.length < target) flakes.push({ x: rand(0, w), y: rand(-h, h), r: rand(1.5, 4.5) * sc * n(g, 'size', 1), v: rand(40, 110) * sc * n(g, 'speed', 1), ph: rand(0, 6.28) });
    if (flakes.length > target) flakes.length = target;
    const maxH = h * n(g, 'maxHeight', 12) / 100;
    const grow = n(g, 'grow', 1);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = s(g, 'color', '#ffffff');
    ctx.globalAlpha = n(g, 'opacity', 0.95);
    for (const f of flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(f.y / (40 * sc) + f.ph) * 20 * sc * dt;
      const ci = Math.max(0, Math.min(COLS - 1, Math.floor((f.x / W) * COLS)));
      if (f.y > H - heights[ci]) {
        // Settles: the pile at this column (and a bit around it) grows, up to the limit.
        for (let k = -2; k <= 2; k++) {
          const j = ci + k;
          if (j >= 0 && j < COLS) heights[j] = Math.min(maxH, heights[j] + (f.r * 0.12 * grow) / (1 + Math.abs(k)));
        }
        f.y = rand(-40, -5) * sc; f.x = rand(0, W);
      }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill();
    }
    // Smooth the pile so it looks like a drift, then draw it.
    for (let i = 1; i < COLS - 1; i++) heights[i] = heights[i] * 0.98 + (heights[i - 1] + heights[i + 1]) * 0.01;
    const gr = ctx.createLinearGradient(0, h - maxH, 0, h);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, s(g, 'shade', '#cfe0ff'));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let i = 0; i < COLS; i++) ctx.lineTo((i / (COLS - 1)) * w, h - heights[i]);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  });
  return { reset: () => { flakes = []; heights = seed(H); }, stop };
};

// ---------- 76 flyers: birds, bats, butterflies ----------
export const startFlyers = (canvas: HTMLCanvasElement, g: G): Engine => {
  let list: { x: number; y: number; v: number; ph: number; r: number; dir: number; c: string }[] = [];
  let sc = 1, t = 0;
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    t += dt;
    const target = Math.round(n(g, 'count', 9));
    const kind = s(g, 'kind', 'birds');
    // The default colour list means "colours of this kind": butterflies are colourful, birds and bats are silhouettes.
    const flyerColors = (k: string) => {
      const c = cols(g, ['#20232b']);
      if (c.length === 1 && c[0].toLowerCase() === '#20232b') return k === 'butterflies' ? ['#ffb703', '#ff6fb5', '#7ad7ff', '#b8f35b'] : k === 'bats' ? ['#1a1220'] : ['#20232b'];
      return c;
    };
    const spawn = () => {
      const dir = s(g, 'from', 'left') === 'right' ? -1 : s(g, 'from', 'left') === 'both' ? pick([1, -1]) : 1;
      return { x: dir > 0 ? rand(-w * 0.3, -20) : rand(w + 20, w * 1.3), y: rand(h * 0.08, h * 0.6), v: rand(90, 170) * sc * n(g, 'speed', 1), ph: rand(0, 6.28), r: rand(10, 20) * sc * n(g, 'size', 1), dir, c: pick(flyerColors(kind)) };
    };
    while (list.length < target) list.push(spawn());
    if (list.length > target) list.length = target;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = n(g, 'opacity', 0.9);
    for (const b of list) {
      b.x += b.dir * b.v * dt;
      b.y += Math.sin(t * 1.3 + b.ph) * 25 * sc * dt;
      if ((b.dir > 0 && b.x > w + 60) || (b.dir < 0 && b.x < -60)) Object.assign(b, spawn());
      const flap = Math.sin(t * (kind === 'bats' ? 16 : kind === 'butterflies' ? 12 : 8) + b.ph);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.dir, 1);
      ctx.fillStyle = b.c;
      ctx.strokeStyle = b.c;
      if (kind === 'birds') {
        ctx.lineWidth = Math.max(1.5, b.r * 0.18); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-b.r, -flap * b.r * 0.5); ctx.quadraticCurveTo(-b.r * 0.4, -b.r * 0.2, 0, 0); ctx.quadraticCurveTo(b.r * 0.4, -b.r * 0.2, b.r, -flap * b.r * 0.5); ctx.stroke();
      } else if (kind === 'bats') {
        const wy = flap * b.r * 0.6;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-b.r * 0.5, -b.r * 0.4 + wy, -b.r * 1.2, wy * 0.6); ctx.lineTo(-b.r * 0.8, b.r * 0.15); ctx.lineTo(-b.r * 0.5, b.r * 0.05); ctx.lineTo(-b.r * 0.25, b.r * 0.3);
        ctx.lineTo(0, b.r * 0.15); ctx.lineTo(b.r * 0.25, b.r * 0.3); ctx.lineTo(b.r * 0.5, b.r * 0.05); ctx.lineTo(b.r * 0.8, b.r * 0.15); ctx.lineTo(b.r * 1.2, wy * 0.6);
        ctx.quadraticCurveTo(b.r * 0.5, -b.r * 0.4 + wy, 0, 0); ctx.fill();
      } else {
        const k = 0.35 + 0.65 * Math.abs(flap);
        ctx.beginPath(); ctx.ellipse(-b.r * 0.45 * k, -b.r * 0.25, b.r * 0.5 * k, b.r * 0.6, -0.4, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.ellipse(b.r * 0.45 * k, -b.r * 0.25, b.r * 0.5 * k, b.r * 0.6, 0.4, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#222'; ctx.fillRect(-b.r * 0.06, -b.r * 0.6, b.r * 0.12, b.r * 0.9);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
  return { reset: () => { list = []; }, stop };
};

// ---------- 77 fireworks that write a text ----------
export const startWordworks = (canvas: HTMLCanvasElement, g: G): Engine => {
  type Pt = { x: number; y: number; tx: number; ty: number; c: string; life: number };
  let pts: Pt[] = [];
  let timer = 0.4, sc = 1;
  const targets = (text: string, w: number, h: number) => {
    const off = document.createElement('canvas');
    off.width = Math.round(w); off.height = Math.round(h * 0.4);
    const c = off.getContext('2d')!;
    let fs = h * 0.22;
    c.font = `900 ${fs}px Poppins, sans-serif`;
    while (c.measureText(text).width > w * 0.9 && fs > 10) { fs -= 4; c.font = `900 ${fs}px Poppins, sans-serif`; }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.fillText(text, off.width / 2, off.height / 2);
    const data = c.getImageData(0, 0, off.width, off.height).data;
    const out: { x: number; y: number }[] = [];
    const step = Math.max(4, Math.round(6 * sc));
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (data[(y * off.width + x) * 4 + 3] > 128) out.push({ x, y: y + h * 0.3 - off.height / 2 + h * 0.05 });
    return out;
  };
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    timer -= dt;
    if (timer <= 0) {
      const text = s(g, 'text', 'GG!');
      const c = cols(g, ['#ffd23f', '#ff5900', '#ff2d95', '#7aa2ff']);
      const ox = w / 2, oy = h * 0.35;
      pts = targets(text, w, h).map((t) => ({ x: ox + rand(-10, 10), y: oy + rand(-10, 10), tx: t.x, ty: t.y, c: pick(c), life: 0 }));
      timer = n(g, 'every', 6);
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 10)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const hold = n(g, 'hold', 2.5);
    pts = pts.filter((p) => {
      p.life += dt;
      const k = Math.min(1, p.life / 0.9);
      const e = 1 - (1 - k) ** 3;
      const fall = p.life > 0.9 + hold ? (p.life - 0.9 - hold) * 160 * sc : 0;
      const x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e + fall * (p.life - 0.9 - hold);
      const a = p.life > 0.9 + hold ? Math.max(0, 1 - (p.life - 0.9 - hold) / 1.2) : 1;
      if (a <= 0) return false;
      ctx.globalAlpha = a * n(g, 'opacity', 1) * (0.7 + 0.3 * Math.random());
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(x, y, 2.4 * sc * n(g, 'size', 1), 0, 6.28); ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  });
  return { reset: () => { pts = []; timer = 0.2; }, stop };
};

// ---------- 80 aurora: vertical curtains hanging from a wavy line ----------
export const startAurora = (canvas: HTMLCanvasElement, g: G): Engine => {
  let t = 0;
  const stop = runLoop(canvas, () => {}, (ctx, dt, w, h) => {
    t += dt * n(g, 'speed', 1) * 0.35;
    ctx.clearRect(0, 0, w, h);
    const c = cols(g, ['#3bffb0', '#4fc3ff', '#b26bff']);
    const base = h * n(g, 'height', 35) / 100;
    const op = n(g, 'opacity', 0.8);
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${Math.round(h / 1080 * 10)}px)`;
    const step = w / 140;
    c.forEach((col, i) => {
      for (let x = -step; x <= w + step; x += step) {
        const u = x / w;
        const y = base * (0.55 + 0.3 * i / c.length) + Math.sin(u * 5 + t * (1 + i * 0.25) + i * 1.7) * h * 0.06 + Math.sin(u * 11 - t * 1.4 + i) * h * 0.025;
        const len = h * (0.16 + 0.1 * (0.5 + 0.5 * Math.sin(u * 7 + t * 2 + i)));
        const a = op * 0.32 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(u * 17 + t * 3 + i * 2)));
        const gr = ctx.createLinearGradient(0, y - len, 0, y);
        gr.addColorStop(0, hexA(col, 0));
        gr.addColorStop(0.75, hexA(col, a));
        gr.addColorStop(1, hexA(col, a * 0.15));
        ctx.fillStyle = gr;
        ctx.fillRect(x, y - len, step + 1, len);
      }
    });
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  });
  return { reset: () => {}, stop };
};

// ---------- 83 gold glitter / 88 pixel snow (falling bits) ----------
const startBits = (canvas: HTMLCanvasElement, g: G, kind: 'glitter' | 'pixel'): Engine => {
  let list: { x: number; y: number; v: number; r: number; rot: number; vr: number; c: string; ph: number }[] = [];
  let sc = 1, t = 0;
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    t += dt;
    const target = Math.round(n(g, 'count', kind === 'pixel' ? 120 : 160));
    const c = cols(g, kind === 'pixel' ? ['#ffffff', '#cfe0ff'] : ['#ffd23f', '#fff1b0', '#e8b23a']);
    const px = Math.max(2, Math.round(n(g, 'pixel', 6) * sc));
    while (list.length < target) list.push({ x: rand(0, w), y: rand(-h, h), v: rand(40, 120) * sc * n(g, 'speed', 1), r: (kind === 'pixel' ? px * pick([1, 1, 2]) : rand(4, 9) * sc * n(g, 'size', 1)), rot: rand(0, 6.28), vr: rand(-4, 4), c: pick(c), ph: rand(0, 6.28) });
    if (list.length > target) list.length = target;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = kind !== 'pixel';
    for (const p of list) {
      p.y += p.v * dt;
      p.rot += p.vr * dt;
      if (kind === 'pixel') {
        // Moves in whole pixels, like an 8-bit game.
        if (p.y > h + 10) Object.assign(p, { y: -10, x: rand(0, w) });
        const sx = Math.round((p.x + Math.sin(t + p.ph) * 12 * sc) / px) * px, sy = Math.round(p.y / px) * px;
        ctx.globalAlpha = n(g, 'opacity', 0.95);
        ctx.fillStyle = p.c;
        ctx.fillRect(sx, sy, p.r, p.r);
      } else {
        p.x += Math.sin(t * 1.5 + p.ph) * 18 * sc * dt;
        if (p.y > h + 10) Object.assign(p, { y: -10, x: rand(0, w) });
        const flash = 0.5 + 0.5 * Math.sin(t * 8 + p.ph);
        ctx.globalAlpha = n(g, 'opacity', 1) * (0.35 + 0.65 * flash);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.rot * 2)) * 0.8 + 0.2);
        ctx.fillStyle = flash > 0.85 ? '#ffffff' : p.c;
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  });
  return { reset: () => { list = []; }, stop };
};
export const startGlitter = (c: HTMLCanvasElement, g: G) => startBits(c, g, 'glitter');
export const startPixelSnow = (c: HTMLCanvasElement, g: G) => startBits(c, g, 'pixel');

// ---------- 87 constellations (plexus) ----------
export const startPlexus = (canvas: HTMLCanvasElement, g: G): Engine => {
  let list: { x: number; y: number; vx: number; vy: number }[] = [];
  let sc = 1;
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    const target = Math.round(n(g, 'count', 70));
    while (list.length < target) list.push({ x: rand(0, w), y: rand(0, h), vx: rand(-20, 20) * sc, vy: rand(-20, 20) * sc });
    if (list.length > target) list.length = target;
    ctx.clearRect(0, 0, w, h);
    const color = s(g, 'color', '#9fd3ff');
    const dist = n(g, 'distance', 160) * sc;
    const sp = n(g, 'speed', 1);
    for (const p of list) {
      p.x += p.vx * dt * sp; p.y += p.vy * dt * sp;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    ctx.lineWidth = 1.2 * sc;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const dx = list[i].x - list[j].x, dy = list[i].y - list[j].y;
        const d = Math.hypot(dx, dy);
        if (d < dist) {
          ctx.strokeStyle = hexA(color, (1 - d / dist) * 0.6 * n(g, 'opacity', 0.9));
          ctx.beginPath(); ctx.moveTo(list[i].x, list[i].y); ctx.lineTo(list[j].x, list[j].y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = n(g, 'opacity', 0.9);
    for (const p of list) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * sc, 0, 6.28); ctx.fill(); }
    ctx.globalAlpha = 1;
  });
  return { reset: () => { list = []; }, stop };
};

// ---------- 89 waves at the bottom ----------
export const startWaves = (canvas: HTMLCanvasElement, g: G): Engine => {
  let t = 0;
  const stop = runLoop(canvas, () => {}, (ctx, dt, w, h) => {
    t += dt * n(g, 'speed', 1);
    ctx.clearRect(0, 0, w, h);
    const c = cols(g, ['#1e90ff', '#3bceac', '#7aa2ff']);
    const height = h * n(g, 'height', 18) / 100;
    c.forEach((col, i) => {
      const base = h - height + i * height * 0.22;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 80) ctx.lineTo(x, base + Math.sin(x / w * (4 + i) * Math.PI + t * (1.2 + i * 0.35) + i) * height * 0.16);
      ctx.lineTo(w, h); ctx.closePath();
      ctx.fillStyle = hexA(col, n(g, 'opacity', 0.75) * (0.55 + i * 0.15));
      ctx.fill();
    });
  });
  return { reset: () => {}, stop };
};

// ---------- 79 your own picture as particles ----------
export const startImageRain = (canvas: HTMLCanvasElement, g: G): Engine => {
  let list: { x: number; y: number; v: number; r: number; rot: number; vr: number; ph: number }[] = [];
  let sc = 1, t = 0;
  const img = new Image();
  const url = s(g, 'image', '');
  if (/^https?:\/\//.test(url)) img.src = url;
  const stop = runLoop(canvas, (_w, h) => { sc = h / 1080; }, (ctx, dt, w, h) => {
    t += dt;
    const target = Math.round(n(g, 'count', 24));
    const up = s(g, 'from', 'down') === 'up';
    while (list.length < target) list.push({ x: rand(0, w), y: rand(0, h), v: rand(60, 130) * sc * n(g, 'speed', 1), r: rand(22, 46) * sc * n(g, 'size', 1), rot: rand(0, 6.28), vr: rand(-1, 1) * (g().spin === false ? 0 : 1), ph: rand(0, 6.28) });
    if (list.length > target) list.length = target;
    ctx.clearRect(0, 0, w, h);
    // No picture yet: the studio preview shows stars so the settings can be tried; OBS shows nothing.
    const placeholder = (!img.complete || !img.naturalWidth) && g()._preview === true;
    if (!placeholder && (!img.complete || !img.naturalWidth)) return;
    ctx.globalAlpha = n(g, 'opacity', 0.95);
    const ratio = placeholder ? 1 : img.naturalHeight / img.naturalWidth;
    for (const p of list) {
      p.y += (up ? -1 : 1) * p.v * dt;
      p.x += Math.sin(t + p.ph) * 20 * sc * dt;
      p.rot += p.vr * dt;
      if (!up && p.y > h + p.r * 2) Object.assign(p, { y: -p.r * 2, x: rand(0, w) });
      if (up && p.y < -p.r * 2) Object.assign(p, { y: h + p.r * 2, x: rand(0, w) });
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (placeholder) { ctx.font = `${p.r * 1.6}px system-ui, "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', 0, 0); }
      else ctx.drawImage(img, -p.r, -p.r * ratio, p.r * 2, p.r * 2 * ratio);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
  return { reset: () => { list = []; }, stop };
};
