// Fireworks and starfield: they don't fit the "spawn, fall, respawn" model of particles.ts,
// so they get their own loops with the same start/stop API.

import type { Params } from './schema';

type Engine = { reset: () => void; stop: () => void };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export const runLoop = (
  canvas: HTMLCanvasElement,
  onResize: (w: number, h: number) => void,
  onFrame: (ctx: CanvasRenderingContext2D, dt: number, w: number, h: number) => void,
) => {
  const ctx = canvas.getContext('2d')!;
  let w = 1, h = 1, raf = 0, last = performance.now();
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(w, h);
  };
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    onFrame(ctx, dt, w, h);
    raf = requestAnimationFrame(frame);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
};

// ---------- fireworks ----------

type Rocket = { x: number; y: number; vx: number; vy: number; color: string; targetY: number };
type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

export const startFireworks = (canvas: HTMLCanvasElement, getParams: () => Params): Engine => {
  let rockets: Rocket[] = [];
  let sparks: Spark[] = [];
  let timer = 0.2;
  let s = 1;
  const p = () => getParams();
  const num = (k: string, d: number) => (typeof p()[k] === 'number' ? (p()[k] as number) : d);
  const colors = () => (Array.isArray(p().colors) && (p().colors as string[]).length ? (p().colors as string[]) : ['#ffd23f']);

  const explode = (r: Rocket) => {
    const n = Math.round(rand(60, 110) * num('size', 1));
    const power = rand(220, 380) * s * num('size', 1);
    const shape = p().shape as string;
    const second = Math.random() < 0.35 ? pick(colors()) : r.color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
      let v = power * (shape === 'ring' ? rand(0.92, 1) : Math.sqrt(Math.random()));
      if (shape === 'heart') {
        // Parametric heart, scaled so it reads at any canvas size.
        const hx = 16 * Math.sin(a) ** 3;
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        const k = power / 17;
        sparks.push(spark(r.x, r.y, hx * k, hy * k, i % 2 ? r.color : second));
        continue;
      }
      if (shape === 'mixed' && Math.random() < 0.3) v *= 0.5;
      sparks.push(spark(r.x, r.y, Math.cos(a) * v, Math.sin(a) * v, i % 3 ? r.color : second));
    }
  };
  const spark = (x: number, y: number, vx: number, vy: number, color: string): Spark => {
    const max = rand(1.1, 1.9);
    return { x, y, px: x, py: y, vx, vy, life: max, max, color, size: rand(1.4, 2.6) * s * num('size', 1) };
  };

  const stop = runLoop(canvas, (_w, h) => { s = h / 1080; }, (ctx, dt, w, h) => {
    timer -= dt;
    if (timer <= 0) {
      const salvo = Math.max(1, Math.round(num('count', 3)));
      for (let i = 0; i < salvo; i++) {
        rockets.push({
          x: rand(w * 0.12, w * 0.88), y: h + 10, vx: rand(-40, 40) * s, vy: -rand(850, 1150) * s,
          color: pick(colors()), targetY: rand(h * 0.12, h * 0.45),
        });
      }
      timer = num('every', 2.5) * rand(0.7, 1.3);
    }

    // Fading the previous frame instead of clearing it leaves soft trails, but would also darken
    // a transparent OBS source; destination-out removes alpha so the page stays see-through.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 14)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const opacity = num('opacity', 1);

    rockets = rockets.filter((r) => {
      r.vy += 600 * s * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.2 * s * 1.5, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.targetY || r.vy >= -60 * s) { explode(r); return false; }
      return true;
    });

    const gravity = 160 * s;
    sparks = sparks.filter((sp) => {
      sp.life -= dt;
      if (sp.life <= 0) return false;
      sp.px = sp.x; sp.py = sp.y;
      sp.vx *= 1 - 1.5 * dt;
      sp.vy = sp.vy * (1 - 1.5 * dt) + gravity * dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      const k = sp.life / sp.max;
      ctx.globalAlpha = opacity * Math.min(1, k * 1.6) * (p().twinkle && Math.random() < 0.25 ? 0.3 : 1);
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = sp.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sp.px, sp.py);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();
      return true;
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  });

  return { reset: () => { rockets = []; sparks = []; timer = 0.2; }, stop };
};

// ---------- stars ----------

type Star = { x: number; y: number; z: number; phase: number; rate: number };
type Shooting = { x: number; y: number; vx: number; vy: number; life: number };

export const startStars = (canvas: HTMLCanvasElement, getParams: () => Params): Engine => {
  let stars: Star[] = [];
  let shooting: Shooting[] = [];
  let t = 0;
  let s = 1;
  let W = 1, H = 1;
  const p = () => getParams();
  const num = (k: string, d: number) => (typeof p()[k] === 'number' ? (p()[k] as number) : d);

  const fill = () => {
    const n = Math.round(num('count', 250));
    while (stars.length < n) stars.push(newStar(true));
    if (stars.length > n) stars.length = n;
  };
  const newStar = (anywhere: boolean): Star => {
    const warp = p().mode === 'warp';
    return {
      x: warp ? rand(-1, 1) : Math.random(),
      y: warp ? rand(-1, 1) : Math.random(),
      z: warp ? (anywhere ? rand(0.05, 1) : 1) : Math.random(),
      phase: rand(0, Math.PI * 2),
      rate: rand(0.6, 2.4),
    };
  };

  const stop = runLoop(canvas, (w, h) => { W = w; H = h; s = h / 1080; }, (ctx, dt, w, h) => {
    t += dt;
    fill();
    ctx.clearRect(0, 0, w, h);
    const color = (p().color as string) || '#ffffff';
    const size = num('size', 1);
    const opacity = num('opacity', 1);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    if (p().mode === 'warp') {
      // Round caps: far-away stars move < 1px a frame, and a butt-capped short line draws nothing.
      ctx.lineCap = 'round';
      const cx = W / 2, cy = H / 2;
      const speed = num('speed', 1) * 0.6;
      for (const st of stars) {
        const prevZ = st.z;
        st.z -= speed * dt;
        if (st.z <= 0.02) { Object.assign(st, newStar(false)); continue; }
        // Small focal length: stars start in a cloud around the centre and streak outward.
        const k = Math.max(W, H) * 0.16;
        const x = cx + (st.x / st.z) * k, y = cy + (st.y / st.z) * k;
        const px = cx + (st.x / prevZ) * k, py = cy + (st.y / prevZ) * k;
        if (x < -50 || x > W + 50 || y < -50 || y > H + 50) { Object.assign(st, newStar(false)); continue; }
        ctx.globalAlpha = opacity * Math.min(1, 0.15 + (1 - st.z) * 1.8);
        ctx.lineWidth = ((1 - st.z) * 3.2 * s + 0.7) * size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else {
      for (const st of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.rate * num('speed', 1) * 2 + st.phase));
        ctx.globalAlpha = opacity * tw * (0.4 + st.z * 0.6);
        const r = (0.6 + st.z * 1.8) * s * size * 1.5;
        ctx.beginPath();
        ctx.arc(st.x * W, st.y * H, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p().shooting && Math.random() < dt * 0.35) {
        shooting.push({ x: rand(0, W * 0.7), y: rand(0, H * 0.4), vx: rand(700, 1100) * s, vy: rand(250, 450) * s, life: 1 });
      }
      shooting = shooting.filter((sh) => {
        sh.life -= dt * 1.6;
        if (sh.life <= 0) return false;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        const g = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 0.18, sh.y - sh.vy * 0.18);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = opacity * sh.life;
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.2 * s * size;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 0.18, sh.y - sh.vy * 0.18);
        ctx.stroke();
        ctx.strokeStyle = color;
        return true;
      });
    }
    ctx.globalAlpha = 1;
  });

  return { reset: () => { stars = []; shooting = []; }, stop };
};
