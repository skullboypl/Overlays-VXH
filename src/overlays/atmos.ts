// Lightning and a screen glitch: short bursts on a timer rather than a steady stream of particles.
// Both draw on a transparent canvas, so the game or camera under the source stays visible.

import type { Params } from './schema';
import { runLoop } from './sky';

type Engine = { reset: () => void; stop: () => void };
type Pt = { x: number; y: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// ---------- lightning ----------

type Bolt = { points: Pt[]; branches: Pt[][]; life: number; max: number; width: number; color: string };

/** A jagged line from (x0, y0) to (x1, y1) that wanders sideways by up to `spread`. */
const jagged = (x0: number, y0: number, x1: number, y1: number, spread: number, segments: number): Pt[] => {
  const pts: Pt[] = [{ x: x0, y: y0 }];
  for (let i = 1; i < segments; i++) {
    const k = i / segments;
    pts.push({ x: x0 + (x1 - x0) * k + rand(-spread, spread) * (1 - k * 0.5), y: y0 + (y1 - y0) * k + rand(-spread * 0.3, spread * 0.3) });
  }
  pts.push({ x: x1, y: y1 });
  return pts;
};

export const startLightning = (canvas: HTMLCanvasElement, getParams: () => Params): Engine => {
  let bolts: Bolt[] = [];
  let flash = 0;
  let timer = 0.8;
  let s = 1;
  const p = () => getParams();
  const num = (k: string, d: number) => (typeof p()[k] === 'number' ? (p()[k] as number) : d);
  const str = (k: string, d: string) => (typeof p()[k] === 'string' ? (p()[k] as string) : d);
  const colors = () => (Array.isArray(p().colors) && (p().colors as string[]).length ? (p().colors as string[]) : ['#dfe9ff']);

  const strike = (w: number, h: number) => {
    const from = str('from', 'top');
    const x0 = rand(w * 0.1, w * 0.9);
    const x1 = x0 + rand(-w * 0.15, w * 0.15);
    const y1 = from === 'top' ? rand(h * 0.45, h * 0.95) : h;
    const main = jagged(x0, -10, x1, y1, 60 * s * num('size', 1), 14);
    const branches: Pt[][] = [];
    const count = Math.round(rand(1, 4));
    for (let i = 0; i < count; i++) {
      const start = main[Math.floor(rand(2, main.length - 3))];
      const dir = Math.random() < 0.5 ? -1 : 1;
      branches.push(jagged(start.x, start.y, start.x + dir * rand(60, 200) * s, start.y + rand(80, 260) * s, 30 * s, 6));
    }
    const max = rand(0.25, 0.45);
    bolts.push({ points: main, branches, life: max, max, width: rand(2, 4) * s * num('size', 1), color: pick(colors()) });
    flash = Math.max(flash, num('flash', 0.5));
  };

  const stroke = (ctx: CanvasRenderingContext2D, pts: Pt[]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };

  const stop = runLoop(canvas, (_w, h) => { s = h / 1080; }, (ctx, dt, w, h) => {
    timer -= dt;
    if (timer <= 0 && p().bolts !== false) {
      const n = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < n; i++) strike(w, h);
      timer = num('every', 4) * rand(0.5, 1.5);
    } else if (timer <= 0) {
      flash = Math.max(flash, num('flash', 0.5));
      timer = num('every', 4) * rand(0.5, 1.5);
    }
    ctx.clearRect(0, 0, w, h);
    const opacity = num('opacity', 1);

    if (flash > 0.01) {
      // Two or three quick flickers, like a real flash, then a decay.
      const flick = flash > 0.3 && Math.random() < 0.25 ? 0.4 : 1;
      ctx.globalAlpha = Math.min(1, flash * flick * opacity);
      ctx.fillStyle = str('flashColor', '#ffffff');
      ctx.fillRect(0, 0, w, h);
      flash *= 1 - 7 * dt;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    bolts = bolts.filter((b) => {
      b.life -= dt;
      if (b.life <= 0) return false;
      const k = b.life / b.max;
      const a = (k > 0.7 ? 1 : k / 0.7) * opacity;
      // Glow pass, then the hot white core.
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 24 * s;
      ctx.lineWidth = b.width * 4;
      stroke(ctx, b.points);
      ctx.lineWidth = b.width * 2;
      for (const br of b.branches) stroke(ctx, br);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = b.width;
      stroke(ctx, b.points);
      ctx.lineWidth = b.width * 0.5;
      for (const br of b.branches) stroke(ctx, br);
      return true;
    });
    ctx.globalAlpha = 1;
  });

  return { reset: () => { bolts = []; flash = 0; timer = 0.5; }, stop };
};

// ---------- screen glitch ----------

type Slice = { y: number; h: number; dx: number; color: string; life: number; max: number; kind: 'bar' | 'block' | 'line' | 'noise' };

/**
 * Glitch bursts: horizontal tears in cyan / magenta, block noise and thin lines, a few times a minute.
 * A Browser Source cannot displace what is under it, so the tears are drawn as translucent bands.
 */
export const startGlitch = (canvas: HTMLCanvasElement, getParams: () => Params): Engine => {
  let slices: Slice[] = [];
  let timer = 0.6;
  let burst = 0;
  let s = 1;
  let scan = 0;
  const p = () => getParams();
  const num = (k: string, d: number) => (typeof p()[k] === 'number' ? (p()[k] as number) : d);
  const colors = () => (Array.isArray(p().colors) && (p().colors as string[]).length ? (p().colors as string[]) : ['#00f0ff', '#ff00a8']);

  const spawn = (w: number, h: number) => {
    const intensity = num('intensity', 1);
    const n = Math.round(rand(3, 8) * intensity);
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      const kind: Slice['kind'] = roll < 0.4 ? 'bar' : roll < 0.65 ? 'block' : roll < 0.85 ? 'line' : 'noise';
      const max = rand(0.05, 0.22);
      slices.push({
        y: rand(0, h), h: kind === 'line' ? rand(1, 3) * s : kind === 'block' ? rand(12, 60) * s : rand(6, 40) * s * intensity,
        dx: rand(-0.08, 0.08) * w * intensity, color: pick(colors()), life: max, max, kind,
      });
    }
    if (p().mode !== 'subtle' && Math.random() < 0.35) {
      // One big tear across the whole screen.
      slices.push({ y: rand(0, h * 0.9), h: rand(60, 160) * s, dx: rand(-0.15, 0.15) * w, color: pick(colors()), life: 0.12, max: 0.12, kind: 'bar' });
    }
  };

  const stop = runLoop(canvas, (_w, h) => { s = h / 1080; }, (ctx, dt, w, h) => {
    timer -= dt;
    if (timer <= 0) {
      // A burst is a few spawns in quick succession, then quiet.
      spawn(w, h);
      burst -= 1;
      timer = burst > 0 ? rand(0.04, 0.14) : num('every', 5) * rand(0.6, 1.4);
      if (burst <= 0) burst = Math.round(rand(2, 5));
    }
    ctx.clearRect(0, 0, w, h);
    const opacity = num('opacity', 0.8);

    if (p().scanlines !== false) {
      scan = (scan + dt * 120 * s) % (6 * s);
      ctx.globalAlpha = 0.07 * opacity;
      ctx.fillStyle = '#000';
      for (let y = scan - 6 * s; y < h; y += 6 * s) ctx.fillRect(0, y, w, 2 * s);
      // Rolling bright band.
      const band = (performance.now() / 20) % (h + 200 * s) - 100 * s;
      const g = ctx.createLinearGradient(0, band - 80 * s, 0, band + 80 * s);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = opacity;
      ctx.fillStyle = g;
      ctx.fillRect(0, band - 80 * s, w, 160 * s);
    }

    slices = slices.filter((sl) => {
      sl.life -= dt;
      if (sl.life <= 0) return false;
      const a = (sl.life / sl.max) * opacity;
      switch (sl.kind) {
        case 'bar': {
          ctx.globalAlpha = a * 0.55;
          ctx.fillStyle = sl.color;
          ctx.fillRect(sl.dx, sl.y, w, sl.h);
          ctx.globalAlpha = a * 0.35;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sl.dx * 0.5, sl.y, w, Math.max(1, sl.h * 0.15));
          break;
        }
        case 'block': {
          ctx.globalAlpha = a * 0.7;
          const n = Math.round(rand(2, 7));
          for (let i = 0; i < n; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? sl.color : '#ffffff';
            ctx.fillRect(rand(0, w), sl.y + rand(-sl.h, sl.h), rand(20, 220) * s, rand(3, 14) * s);
          }
          break;
        }
        case 'line': {
          ctx.globalAlpha = a;
          ctx.fillStyle = sl.color;
          ctx.fillRect(0, sl.y, w, sl.h);
          break;
        }
        case 'noise': {
          ctx.globalAlpha = a * 0.8;
          for (let i = 0; i < 40; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? '#fff' : sl.color;
            ctx.fillRect(rand(0, w), sl.y + rand(-sl.h * 2, sl.h * 2), rand(2, 10) * s, rand(1, 4) * s);
          }
          break;
        }
      }
      return true;
    });
    ctx.globalAlpha = 1;
  });

  return { reset: () => { slices = []; timer = 0.4; burst = 0; }, stop };
};
