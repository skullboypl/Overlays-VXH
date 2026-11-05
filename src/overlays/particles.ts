// One small canvas engine for every falling/floating overlay. Speeds and sizes are tuned for 1080p
// and scaled by canvas height, so the studio preview looks like the real OBS source.

import type { Params } from './schema';

export type ParticleKind = 'snow' | 'rain' | 'confetti' | 'emoji' | 'fireflies' | 'petals'
  | 'embers' | 'bubbles' | 'bokeh' | 'sparkles' | 'balloons' | 'meteors' | 'digital';

type P = {
  x: number; y: number; vx: number; vy: number;
  r: number; z: number; rot: number; vr: number; phase: number; flip: number;
  color: string; sprite?: HTMLCanvasElement; life: number;
  chars?: string[];
};

type Splash = { x: number; y: number; life: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// ---------- sprites (drawn once, then stamped with drawImage) ----------

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

const dotSprite = (color: string, soft: boolean) =>
  sprite(`dot:${color}:${soft}`, 64, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, color);
    g.addColorStop(soft ? 0.15 : 0.55, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

const crystalSprite = (color: string) =>
  sprite(`crystal:${color}`, 64, (c, s) => {
    c.translate(s / 2, s / 2);
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      c.rotate(Math.PI / 3);
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(0, -26);
      c.moveTo(0, -14); c.lineTo(-7, -21);
      c.moveTo(0, -14); c.lineTo(7, -21);
      c.stroke();
    }
  });

const glowSprite = (color: string) =>
  sprite(`glow:${color}`, 128, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.08, color);
    g.addColorStop(0.25, color + '66');
    g.addColorStop(1, color + '00');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

const petalSprite = (color: string, shape: string) =>
  sprite(`petal:${color}:${shape}`, 64, (c, s) => {
    c.translate(s / 2, s / 2);
    c.fillStyle = color;
    c.beginPath();
    if (shape === 'leaf') {
      c.moveTo(0, -28);
      c.quadraticCurveTo(22, -6, 0, 28);
      c.quadraticCurveTo(-22, -6, 0, -28);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 26); c.stroke();
    } else {
      c.moveTo(0, 26);
      c.bezierCurveTo(-24, 10, -18, -22, -3, -26);
      c.lineTo(0, -19);
      c.lineTo(3, -26);
      c.bezierCurveTo(18, -22, 24, 10, 0, 26);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.ellipse(-5, 2, 4, 12, 0.3, 0, Math.PI * 2); c.fill();
    }
  });

const bubbleSprite = (color: string) =>
  sprite(`bubble:${color}`, 96, (c, s) => {
    const r = s / 2 - 2;
    const g = c.createRadialGradient(s * 0.5, s * 0.5, r * 0.6, s * 0.5, s * 0.5, r);
    g.addColorStop(0, color + '00');
    g.addColorStop(0.85, color + '55');
    g.addColorStop(1, color + 'cc');
    c.fillStyle = g;
    c.beginPath(); c.arc(s / 2, s / 2, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.ellipse(s * 0.36, s * 0.32, r * 0.22, r * 0.12, -0.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath(); c.arc(s * 0.66, s * 0.7, r * 0.07, 0, Math.PI * 2); c.fill();
  });

const bokehSprite = (color: string) =>
  sprite(`bokeh:${color}`, 128, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, color + '55');
    g.addColorStop(0.78, color + '70');
    g.addColorStop(0.9, color + '99');
    g.addColorStop(1, color + '00');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

const sparkleSprite = (color: string) =>
  sprite(`sparkle:${color}`, 96, (c, s) => {
    c.translate(s / 2, s / 2);
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, s / 2);
    glow.addColorStop(0, color + 'aa');
    glow.addColorStop(1, color + '00');
    c.fillStyle = glow;
    c.fillRect(-s / 2, -s / 2, s, s);
    c.fillStyle = '#ffffff';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? s * 0.46 : s * 0.07;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  });

const balloonSprite = (color: string) =>
  sprite(`balloon:${color}`, 128, (c, s) => {
    const cx = s / 2, cy = s * 0.34, rx = s * 0.24, ry = s * 0.3;
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy + ry + 4);
    c.bezierCurveTo(cx - 10, cy + ry + 24, cx + 10, cy + ry + 40, cx, s - 2); c.stroke();
    const g = c.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 2, cx, cy, ry * 1.1);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.18, color);
    g.addColorStop(1, color);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = color;
    c.beginPath(); c.moveTo(cx - 6, cy + ry + 6); c.lineTo(cx + 6, cy + ry + 6); c.lineTo(cx, cy + ry - 3); c.fill();
  });

const DIGITS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789ABCDEF';

const emojiSprite = (ch: string) =>
  sprite(`emoji:${ch}`, 96, (c, s) => {
    c.font = `${s * 0.8}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(ch, s / 2, s / 2 + s * 0.05);
  });

export const splitEmoji = (text: string): string[] => {
  const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment)
    : Array.from(text);
  return seg.filter((s) => s.trim().length > 0);
};

// ---------- engine ----------

export const startParticles = (canvas: HTMLCanvasElement, kind: ParticleKind, getParams: () => Params) => {
  const ctx = canvas.getContext('2d')!;
  let w = 0, h = 0, s = 1, dpr = 1;
  let list: P[] = [];
  let splashes: Splash[] = [];
  let raf = 0;
  let last = performance.now();
  let t = 0;
  let burstTimer = 0.4;

  const num = (k: string, d = 1) => (typeof getParams()[k] === 'number' ? (getParams()[k] as number) : d);
  const str = (k: string, d = '') => (typeof getParams()[k] === 'string' ? (getParams()[k] as string) : d);
  const colors = (): string[] => {
    const v = getParams().colors;
    return Array.isArray(v) && v.length ? v : [str('color', '#ffffff')];
  };

  const spawnX = () => {
    switch (str('area', 'full')) {
      case 'left': return rand(0, w / 2);
      case 'right': return rand(w / 2, w);
      case 'edges': return Math.random() < 0.5 ? rand(0, w * 0.2) : rand(w * 0.8, w);
      default: return rand(-w * 0.05, w * 1.05);
    }
  };

  const make = (initial: boolean): P => {
    const size = num('size');
    const speed = num('speed');
    const p: P = {
      x: spawnX(), y: 0, vx: 0, vy: 0, r: 1, z: Math.random(), rot: rand(0, Math.PI * 2),
      vr: rand(-2, 2), phase: rand(0, Math.PI * 2), flip: rand(0, Math.PI * 2), color: '#fff', life: 0,
    };
    switch (kind) {
      case 'snow': {
        p.r = (2.6 + p.z * 7) * size * s;
        p.vy = (35 + p.z * 75) * speed * s;
        p.y = initial ? rand(-h * 0.1, h) : rand(-60 * s, -10 * s);
        const shape = str('flakes', 'dots');
        const color = str('color', '#ffffff');
        const crystal = shape === 'crystals' || (shape === 'mix' && Math.random() < 0.35);
        p.sprite = crystal ? crystalSprite(color) : dotSprite(color, Boolean(getParams().blur) && p.z > 0.65);
        if (crystal) p.r *= 2.2;
        break;
      }
      case 'rain': {
        p.r = (14 + p.z * 22) * size * s;
        p.vy = (1100 + p.z * 700) * speed * s;
        p.y = initial ? rand(-h * 0.2, h) : rand(-h * 0.3, -20 * s);
        p.x = rand(-w * 0.25, w * 1.25);
        if (str('area') && str('area') !== 'full') p.x = spawnX();
        break;
      }
      case 'confetti': {
        p.r = rand(11, 19) * size * s;
        p.color = pick(colors());
        if (str('mode') === 'burst') {
          const left = Math.random() < 0.5;
          p.x = left ? rand(0, w * 0.15) : rand(w * 0.85, w);
          p.y = h + 10 * s;
          const ang = (left ? -1 : 1) * rand(0.15, 0.55);
          const v = rand(900, 1500) * s * Math.sqrt(speed);
          p.vx = (left ? 1 : -1) * Math.abs(Math.sin(ang)) * v;
          p.vy = -Math.cos(ang) * v;
        } else {
          p.vy = rand(70, 140) * speed * s;
          p.y = initial ? rand(-h, h) : rand(-80 * s, -10 * s);
        }
        p.vr = rand(-6, 6);
        break;
      }
      case 'emoji': {
        const chars = splitEmoji(str('emoji', '💜'));
        p.sprite = emojiSprite(pick(chars.length ? chars : ['💜']));
        p.r = rand(22, 40) * size * s;
        const down = str('from') === 'down';
        p.vy = (down ? 1 : -1) * rand(70, 130) * speed * s;
        p.y = initial ? rand(0, h) : down ? -p.r * 2 : h + p.r * 2;
        p.vr = rand(-0.6, 0.6);
        p.rot = rand(-0.3, 0.3);
        break;
      }
      case 'fireflies': {
        p.r = rand(2, 4.5) * size * s;
        p.y = rand(0, h);
        p.rot = rand(0, Math.PI * 2);
        p.vr = rand(0.6, 1.6);
        p.sprite = glowSprite(str('color', '#ffd36b'));
        break;
      }
      case 'petals': {
        p.r = rand(13, 22) * size * s;
        p.vy = rand(45, 95) * speed * s;
        p.y = initial ? rand(-h * 0.1, h) : rand(-80 * s, -20 * s);
        p.sprite = petalSprite(pick(colors()), str('shape', 'petal'));
        p.vr = rand(-1.5, 1.5);
        break;
      }
      case 'embers': {
        p.r = rand(1.6, 3.8) * size * s;
        p.vy = -rand(70, 170) * speed * s;
        p.y = initial ? rand(0, h) : h + rand(5, 40) * s;
        p.sprite = glowSprite(pick(colors()));
        p.vr = rand(2, 6);
        break;
      }
      case 'bubbles': {
        p.r = rand(10, 34) * size * s * (0.6 + p.z * 0.8);
        p.vy = -rand(40, 95) * speed * s;
        p.y = initial ? rand(0, h) : h + p.r * 2;
        p.sprite = bubbleSprite(pick(colors()));
        break;
      }
      case 'bokeh': {
        p.r = rand(28, 95) * size * s;
        p.x = rand(0, w);
        p.y = rand(0, h);
        p.vx = rand(-14, 14) * speed * s;
        p.vy = rand(-10, 10) * speed * s;
        p.sprite = bokehSprite(pick(colors()));
        p.vr = rand(0.2, 0.6);
        break;
      }
      case 'sparkles': {
        p.r = rand(8, 22) * size * s;
        p.y = str('area', 'full') === 'edges' ? (Math.random() < 0.5 ? rand(0, h * 0.18) : rand(h * 0.82, h)) : rand(0, h);
        p.sprite = sparkleSprite(pick(colors()));
        p.vr = rand(0.7, 1.8) / Math.max(0.1, speed); // lifetime in seconds
        p.life = initial ? rand(-p.vr, p.vr) : -rand(0, 1.2);
        break;
      }
      case 'balloons': {
        p.r = rand(34, 54) * size * s;
        p.vy = -rand(55, 105) * speed * s;
        p.y = initial ? rand(0, h * 1.1) : h + p.r * 2;
        p.sprite = balloonSprite(pick(colors()));
        break;
      }
      case 'meteors': {
        const dir = str('from', 'left') === 'right' ? -1 : 1;
        const v = rand(900, 1400) * speed * s;
        p.x = dir > 0 ? rand(-w * 0.2, w * 0.7) : rand(w * 0.3, w * 1.2);
        p.y = rand(-h * 0.1, h * 0.35);
        p.vx = dir * v;
        p.vy = v * rand(0.35, 0.55);
        p.r = rand(120, 260) * size * s; // tail length
        p.color = pick(colors());
        p.life = -rand(0, num('every', 3) * 2); // waits a while before it flies
        break;
      }
      case 'digital': {
        const fs = 20 * size * s;
        p.r = fs;
        p.x = Math.floor(rand(0, w) / fs) * fs;
        p.vy = rand(220, 620) * speed * s;
        p.y = initial ? rand(-h, h) : -rand(0, h * 0.5);
        p.chars = Array.from({ length: Math.floor(rand(8, 26)) }, () => pick([...DIGITS]));
        p.color = pick(colors());
        break;
      }
    }
    return p;
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const oldW = w, oldH = h;
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    // Keep particles spread over the whole area when the canvas grows or shrinks (preview zoom, OBS resize).
    if (oldW > 1 && (oldW !== w || oldH !== h)) {
      const kx = w / oldW, ky = h / oldH;
      for (const p of list) { p.x *= kx; p.y *= ky; p.r *= ky; p.vy *= ky; p.vx *= kx; }
    }
    // _ref lets a small canvas (a webcam frame) use bigger particles than a 1080p scene would.
    s = h / (typeof getParams()._ref === 'number' ? (getParams()._ref as number) : 1080);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const isBurst = () => kind === 'confetti' && str('mode') === 'burst';

  /** Returns false when the particle left the screen and should be replaced. */
  const step = (p: P, dt: number): boolean => {
    const wind = num('wind', 0) * 60 * s;
    const speed = num('speed');
    switch (kind) {
      case 'snow':
        p.x += (Math.sin(t * 0.9 + p.phase) * 18 * s * (0.4 + p.z) + wind * (0.5 + p.z)) * dt;
        p.y += p.vy * dt;
        return p.y < h + p.r * 2 && p.x > -w * 0.1 && p.x < w * 1.1;
      case 'rain':
        p.vx = wind * 3;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > h) {
          if (getParams().splash && Math.random() < 0.6) splashes.push({ x: p.x, y: h - rand(2, 14) * s, life: 0 });
          return false;
        }
        return true;
      case 'confetti': {
        p.rot += p.vr * dt;
        p.flip += dt * 6;
        if (isBurst()) {
          p.vy += 1300 * s * dt;
          p.vx *= 1 - 1.6 * dt;
          p.vy *= 1 - 1.4 * dt;
          p.x += (p.vx + wind + Math.sin(t * 3 + p.phase) * 30 * s) * dt;
          p.y += p.vy * dt;
          return p.y < h + 40 * s || p.vy < 0;
        }
        p.x += (Math.sin(t * 1.6 + p.phase) * 40 * s + wind) * dt;
        p.y += p.vy * dt;
        return p.y < h + 30 * s;
      }
      case 'emoji': {
        p.x += (Math.sin(t * 1.2 + p.phase) * 30 * s + wind) * dt;
        p.y += p.vy * dt;
        p.rot = Math.sin(t * 1.5 + p.phase) * 0.25;
        return p.vy < 0 ? p.y > -p.r * 2 : p.y < h + p.r * 2;
      }
      case 'fireflies': {
        p.rot += Math.sin(t * 0.7 + p.phase) * 1.4 * dt;
        const v = 22 * speed * s;
        p.x += Math.cos(p.rot) * v * dt;
        p.y += Math.sin(p.rot) * v * dt;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
        return true;
      }
      case 'petals':
        p.rot += p.vr * dt;
        p.flip += dt * 2.4;
        p.x += (Math.sin(t * 0.8 + p.phase) * 45 * s + wind * 1.4) * dt;
        p.y += p.vy * dt;
        return p.y < h + 40 * s && p.x > -w * 0.15 && p.x < w * 1.15;
      case 'embers':
        p.x += (Math.sin(t * 2.2 + p.phase) * 28 * s + wind) * dt;
        p.y += p.vy * dt;
        return p.y > -20 * s;
      case 'bubbles':
        p.x += (Math.sin(t * 1.3 + p.phase) * 22 * s + wind) * dt;
        p.y += p.vy * dt;
        return p.y > -p.r * 2;
      case 'bokeh':
        p.x += (p.vx + wind * 0.3) * dt;
        p.y += p.vy * dt;
        if (p.x < -p.r) p.x = w + p.r; else if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r; else if (p.y > h + p.r) p.y = -p.r;
        return true;
      case 'sparkles':
        p.life += dt;
        p.rot += dt * 0.8;
        return p.life < p.vr;
      case 'balloons':
        p.x += (Math.sin(t * 0.9 + p.phase) * 18 * s + wind) * dt;
        p.rot = Math.sin(t * 1.1 + p.phase) * 0.12;
        p.y += p.vy * dt;
        return p.y > -p.r * 3;
      case 'meteors':
        p.life += dt;
        if (p.life < 0) return true;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.y < h + p.r && p.x > -p.r * 2 && p.x < w + p.r * 2;
      case 'digital':
        p.y += p.vy * dt;
        if (Math.random() < dt * 8 && p.chars) p.chars[Math.floor(Math.random() * p.chars.length)] = pick([...DIGITS]);
        return p.y - (p.chars?.length ?? 0) * p.r < h;
    }
  };

  const draw = (p: P) => {
    switch (kind) {
      case 'snow':
      case 'fireflies': {
        let r = p.r;
        if (kind === 'fireflies') {
          ctx.globalAlpha = num('opacity') * (0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * p.vr * 2 + p.phase)) ** 2);
          r = p.r * (2 + num('glow', 1) * 4);
        }
        if (kind === 'snow' && str('flakes') !== 'dots') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + t * 0.3);
          ctx.drawImage(p.sprite!, -r, -r, r * 2, r * 2);
          ctx.restore();
          return;
        }
        ctx.drawImage(p.sprite!, p.x - r, p.y - r, r * 2, r * 2);
        return;
      }
      case 'rain': {
        const k = p.r / Math.hypot(p.vx, p.vy);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * k, p.y - p.vy * k);
        ctx.lineWidth = (0.8 + p.z * 1.2) * num('size') * s * 1.5;
        ctx.stroke();
        return;
      }
      case 'confetti': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
        return;
      }
      case 'emoji': {
        const edge = p.vy < 0 ? p.y / (h * 0.25) : (h - p.y) / (h * 0.25);
        ctx.globalAlpha = num('opacity') * Math.max(0, Math.min(1, edge));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.sprite!, -p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
        return;
      }
      case 'petals': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(0.35 + 0.65 * Math.abs(Math.cos(p.flip)), 1);
        ctx.drawImage(p.sprite!, -p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
        return;
      }
      case 'embers': {
        const fade = Math.max(0, Math.min(1, p.y / (h * 0.7)));
        ctx.globalAlpha = num('opacity') * fade * (0.45 + 0.55 * Math.sin(t * p.vr + p.phase) ** 2);
        const r = p.r * (3 + num('glow', 1) * 3);
        ctx.drawImage(p.sprite!, p.x - r, p.y - r, r * 2, r * 2);
        return;
      }
      case 'bubbles':
      case 'balloons': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const r = kind === 'balloons' ? p.r * 1.6 : p.r;
        ctx.drawImage(p.sprite!, -r, -r, r * 2, r * 2);
        ctx.restore();
        return;
      }
      case 'bokeh': {
        ctx.globalAlpha = num('opacity') * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.vr + p.phase)));
        ctx.drawImage(p.sprite!, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        return;
      }
      case 'sparkles': {
        if (p.life < 0) return;
        const k = Math.sin((p.life / p.vr) * Math.PI);
        ctx.globalAlpha = num('opacity') * k;
        const r = p.r * (0.3 + 0.7 * k);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.sprite!, -r, -r, r * 2, r * 2);
        ctx.restore();
        return;
      }
      case 'meteors': {
        if (p.life < 0) return;
        const len = Math.hypot(p.vx, p.vy);
        const tx = p.x - (p.vx / len) * p.r, ty = p.y - (p.vy / len) * p.r;
        const g = ctx.createLinearGradient(p.x, p.y, tx, ty);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.15, p.color);
        g.addColorStop(1, p.color + '00');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.6 * num('size') * s;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.drawImage(glowSprite(p.color), p.x - 14 * s, p.y - 14 * s, 28 * s, 28 * s);
        return;
      }
      case 'digital': {
        ctx.font = `600 ${p.r}px "JetBrains Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        const n = p.chars!.length;
        for (let i = 0; i < n; i++) {
          const y = p.y - i * p.r;
          if (y < -p.r || y > h + p.r) continue;
          ctx.globalAlpha = num('opacity') * (1 - i / n);
          ctx.fillStyle = i === 0 ? '#ffffff' : p.color;
          ctx.fillText(p.chars![i], p.x + p.r / 2, y);
        }
      }
    }
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const target = Math.round(num('count', 100));

    if (isBurst()) {
      burstTimer -= dt;
      if (burstTimer <= 0) {
        burstTimer = num('every', 8);
        for (let i = 0; i < target; i++) list.push(make(false));
      }
    } else {
      const firstFill = list.length === 0;
      while (list.length < target) list.push(make(firstFill));
      if (list.length > target) list.length = target;
    }

    list = list.filter((p) => {
      if (step(p, dt)) return true;
      if (isBurst()) return false;
      Object.assign(p, make(false));
      return true;
    });

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = num('opacity');
    if (kind === 'rain') {
      ctx.strokeStyle = str('color', '#a9c8ff');
      ctx.lineCap = 'round';
    }
    for (const p of list) draw(p);

    if (splashes.length) {
      ctx.strokeStyle = str('color', '#a9c8ff');
      ctx.lineWidth = 1.2 * s;
      splashes = splashes.filter((sp) => {
        sp.life += dt * 3.5;
        if (sp.life >= 1) return false;
        ctx.globalAlpha = num('opacity') * (1 - sp.life);
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, 2 + sp.life * 9 * s, 1 + sp.life * 2.5 * s, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        return true;
      });
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    /** Rebuild particles after a setting that is baked in at spawn time (shape, colors, emoji...). */
    reset: () => { list = []; splashes = []; burstTimer = 0.4; },
    stop: () => { cancelAnimationFrame(raf); ro.disconnect(); },
  };
};
