"""Seven more full-screen effects in the particle engine, wired into the registry and the scenes."""
ROOT = r'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(path, pairs):
    p = ROOT + path
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:90])
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)


NEW_KINDS = ['embers', 'bubbles', 'bokeh', 'sparkles', 'balloons', 'meteors', 'digital']

# ---------------- particles.ts ----------------
edit('overlays/particles.ts', [
    ("export type ParticleKind = 'snow' | 'rain' | 'confetti' | 'emoji' | 'fireflies' | 'petals';",
     "export type ParticleKind = 'snow' | 'rain' | 'confetti' | 'emoji' | 'fireflies' | 'petals'\n"
     "  | 'embers' | 'bubbles' | 'bokeh' | 'sparkles' | 'balloons' | 'meteors' | 'digital';"),
    ("  color: string; sprite?: HTMLCanvasElement; life: number;\n};",
     "  color: string; sprite?: HTMLCanvasElement; life: number;\n  chars?: string[];\n};"),
    # sprites
    ("const emojiSprite = (ch: string) =>",
     """const bubbleSprite = (color: string) =>
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

const emojiSprite = (ch: string) =>"""),
    # spawn
    ("""      case 'petals': {
        p.r = rand(13, 22) * size * s;
        p.vy = rand(45, 95) * speed * s;
        p.y = initial ? rand(-h * 0.1, h) : rand(-80 * s, -20 * s);
        p.sprite = petalSprite(pick(colors()), str('shape', 'petal'));
        p.vr = rand(-1.5, 1.5);
        break;
      }
    }
    return p;""",
     """      case 'petals': {
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
    return p;"""),
    # step
    ("""      case 'petals':
        p.rot += p.vr * dt;
        p.flip += dt * 2.4;
        p.x += (Math.sin(t * 0.8 + p.phase) * 45 * s + wind * 1.4) * dt;
        p.y += p.vy * dt;
        return p.y < h + 40 * s && p.x > -w * 0.15 && p.x < w * 1.15;
    }
  };""",
     """      case 'petals':
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
  };"""),
    # draw
    ("""      case 'petals': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(0.35 + 0.65 * Math.abs(Math.cos(p.flip)), 1);
        ctx.drawImage(p.sprite!, -p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      }
    }
  };""",
     """      case 'petals': {
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
  };"""),
])

# ---------------- ParticleLayer ----------------
edit('overlays/ParticleLayer.tsx', [
    ("export const EFFECT_KINDS: EffectKind[] = ['snow', 'rain', 'confetti', 'emoji', 'fireflies', 'petals', 'fireworks', 'stars'];",
     "export const EFFECT_KINDS: EffectKind[] = ['snow', 'rain', 'confetti', 'emoji', 'fireflies', 'petals', 'fireworks', 'stars',\n"
     "  'embers', 'bubbles', 'bokeh', 'sparkles', 'balloons', 'meteors', 'digital'];"),
])

# ---------------- scene defaults ----------------
edit('overlays/SceneScreen.tsx', [
    ("  fireworks: { count: 2, every: 2.2, size: 1, opacity: 1, shape: 'mixed', twinkle: true },\n};",
     """  fireworks: { count: 2, every: 2.2, size: 1, opacity: 1, shape: 'mixed', twinkle: true },
  embers: { count: 90, speed: 1, size: 1, wind: 0.2, opacity: 0.9, glow: 1, colors: ['#ff7a1a', '#ffb347', '#ff3d00'] },
  bubbles: { count: 26, speed: 0.8, size: 1, wind: 0, opacity: 0.9, colors: ['#bfe9ff', '#ffd1f5', '#d9ffe8'] },
  bokeh: { count: 22, speed: 0.6, size: 1, opacity: 0.55, colors: ['#ffcf7a', '#ff8fb1', '#8fb8ff'] },
  sparkles: { count: 40, speed: 1, size: 1, opacity: 1, area: 'full', colors: ['#fff3b0', '#ffffff', '#ffd23f'] },
  balloons: { count: 14, speed: 0.8, size: 1, wind: 0, opacity: 1, colors: ['#ff5900', '#ffd23f', '#3bceac', '#7aa2ff', '#f26b8a'] },
  meteors: { count: 4, speed: 1, size: 1, opacity: 1, every: 3, from: 'left', colors: ['#bfe3ff', '#ffffff'] },
  digital: { count: 60, speed: 1, size: 1, opacity: 0.8, colors: ['#3bff7a'] },
};"""),
])

# ---------------- registry ----------------
p = ROOT + 'overlays/registry.ts'
s = open(p, encoding='utf-8').read()

ADD_OPTS = ("{ value: 'embers', label: 'Iskry' }, { value: 'bubbles', label: 'Bańki' }, { value: 'bokeh', label: 'Bokeh' }, "
            "{ value: 'sparkles', label: 'Błyski' }, { value: 'balloons', label: 'Balony' }, { value: 'meteors', label: 'Spadające gwiazdy' }, "
            "{ value: 'digital', label: 'Cyfrowy deszcz' },")
n = 0
i = 0
while True:
    i = s.find("key: 'effect', label: 'Efekt", i)
    if i < 0:
        break
    j = s.index("{ value: 'fireworks', label: 'Fajerwerki' },", i) + len("{ value: 'fireworks', label: 'Fajerwerki' },")
    s = s[:j] + "\n    " + ADD_OPTS + s[j:]
    n += 1
    i = j
assert n == 4, n

entries = """  {
    id: 'embers', name: 'Iskry z ogniska', icon: '🔥', category: 'screen', size: FULL_HD,
    description: 'Żarzące się iskry unoszące się z dołu ekranu.',
    fields: [
      density(90, 400), speed(1), size(1), wind(0.2), opacity(0.9),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#ff7a1a', '#ffb347', '#ff3d00'] },
      { key: 'glow', label: 'Poświata', type: 'range', min: 0, max: 3, step: 0.1, default: 1, unit: '×' },
      area,
    ],
  },
  {
    id: 'bubbles', name: 'Bańki mydlane', icon: '🫧', category: 'screen', size: FULL_HD,
    description: 'Opalizujące bańki płynące w górę.',
    fields: [
      density(26, 150), speed(0.8), size(1), wind(0), opacity(0.9),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#bfe9ff', '#ffd1f5', '#d9ffe8'] },
      area,
    ],
  },
  {
    id: 'bokeh', name: 'Bokeh', icon: '🔆', category: 'screen', size: FULL_HD,
    description: 'Duże, miękkie krążki światła jak z obiektywu, powoli dryfujące.',
    fields: [
      density(22, 120), speed(0.6), size(1), opacity(0.55),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#ffcf7a', '#ff8fb1', '#8fb8ff'] },
    ],
  },
  {
    id: 'sparkles', name: 'Błyski brokatu', icon: '💫', category: 'screen', size: FULL_HD,
    description: 'Gwiazdki zapalające się i gasnące w losowych miejscach.',
    fields: [
      density(40, 300), speed(1), size(1), opacity(1),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 5, default: ['#fff3b0', '#ffffff', '#ffd23f'] },
      area,
    ],
  },
  {
    id: 'balloons', name: 'Balony', icon: '🎈', category: 'screen', size: FULL_HD,
    description: 'Kolorowe balony lecące w górę, na urodziny i świętowanie subów.',
    fields: [
      density(14, 80), speed(0.8), size(1), wind(0), opacity(1),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 6, default: ['#ff5900', '#ffd23f', '#3bceac', '#7aa2ff', '#f26b8a'] },
      area,
    ],
  },
  {
    id: 'meteors', name: 'Spadające gwiazdy', icon: '☄️', category: 'screen', size: FULL_HD,
    description: 'Meteory z jasnym ogonem przecinające niebo co kilka sekund.',
    fields: [
      density(4, 30), speed(1), size(1), opacity(1),
      { key: 'every', label: 'Przerwy między gwiazdami', type: 'range', min: 0.5, max: 15, step: 0.5, default: 3, unit: 's' },
      { key: 'from', label: 'Kierunek', type: 'select', default: 'left', options: [
        { value: 'left', label: 'Z lewej' }, { value: 'right', label: 'Z prawej' },
      ] },
      { key: 'colors', label: 'Kolory', type: 'colors', max: 4, default: ['#bfe3ff', '#ffffff'] },
    ],
  },
  {
    id: 'digital', name: 'Cyfrowy deszcz', icon: '💻', category: 'screen', size: FULL_HD,
    description: 'Spadające kolumny znaków jak w hakerskim terminalu.',
    fields: [
      density(60, 240), speed(1), size(1), opacity(0.8),
      { key: 'colors', label: 'Kolory', type: 'colors', max: 4, default: ['#3bff7a'] },
    ],
  },
"""
a = "  {\n    id: 'videobg',"
assert a in s
s = s.replace(a, entries + a, 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
