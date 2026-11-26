// Add-on full-screen effects (proposals 71-89).
import type { OverlayDef } from '../schema';
import { ParticleLayer } from '../ParticleLayer';
import { CanvasFx, colorsF, countF, num, opacityF, rangeF, sizeF, speedF, str, type Renderer, type Vars } from './common';
import * as fx from './fx';

const FULL = { w: 1920, h: 1080 };
const fxDef = (id: string, name: string, icon: string, description: string, fields: OverlayDef['fields']): OverlayDef =>
  ({ id, name, icon, category: 'screen', size: FULL, description, fields });

export const EFFECT_DEFS: OverlayDef[] = [
  fxDef('rays', 'Promienie światła', '🌅', 'Smugi światła padające z góry albo z boku, powoli falujące jak w katedrze czy lesie.', [
    countF(7, 12), speedF(1), opacityF(0.35),
    { key: 'color', label: 'Kolor', type: 'color', default: '#fff1c9' },
    { key: 'origin', label: 'Skąd świeci', type: 'select', default: 'top', options: [{ value: 'top', label: 'Z góry' }, { value: 'left', label: 'Z lewego rogu' }, { value: 'right', label: 'Z prawego rogu' }] },
    rangeF('spread', 'Rozpiętość', 0.1, 1.4, 0.05, 0.6),
  ]),
  fxDef('smoke', 'Dym / para', '💨', 'Miękkie kłęby dymu unoszące się z dołu albo z rogów ekranu.', [
    countF(14, 60), speedF(1), sizeF(1), opacityF(0.5),
    { key: 'color', label: 'Kolor', type: 'color', default: '#b9bfcc' },
    rangeF('wind', 'Wiatr', -3, 3, 0.1, 0.3),
    { key: 'where', label: 'Skąd', type: 'select', default: 'bottom', options: [{ value: 'bottom', label: 'Cały dół' }, { value: 'corners', label: 'Dolne rogi' }, { value: 'left', label: 'Lewy dół' }, { value: 'right', label: 'Prawy dół' }] },
  ]),
  fxDef('fire', 'Ogień', '🔥', 'Płomienie liżące dół ekranu, od żaru po ognisko.', [
    countF(60, 200), speedF(1), sizeF(1), opacityF(0.9), rangeF('height', 'Wysokość płomieni', 0.3, 2.5, 0.1, 1, '×'), rangeF('wind', 'Wiatr', -3, 3, 0.1, 0),
    { key: 'where', label: 'Gdzie', type: 'select', default: 'bottom', options: [{ value: 'bottom', label: 'Cały dół' }, { value: 'corners', label: 'Dolne rogi' }, { value: 'left', label: 'Lewy dół' }, { value: 'right', label: 'Prawy dół' }] },
  ]),
  fxDef('glassrain', 'Krople na szybie', '💧', 'Krople deszczu na szybie, część spływa w dół zostawiając ślad. Jak deszczowa noc za oknem.', [
    countF(120, 400), speedF(1), sizeF(1), opacityF(0.85),
  ]),
  fxDef('drift', 'Zaspa śniegu', '⛄', 'Padający śnieg, który zbiera się na dole ekranu w rosnącą zaspę.', [
    countF(160, 600), speedF(1), sizeF(1), opacityF(0.95),
    rangeF('maxHeight', 'Najwyższa zaspa', 2, 30, 1, 12, '%'), rangeF('grow', 'Tempo narastania', 0.2, 4, 0.1, 1, '×'),
    { key: 'color', label: 'Kolor płatków', type: 'color', default: '#ffffff' },
    { key: 'shade', label: 'Cień zaspy', type: 'color', default: '#cfe0ff' },
  ]),
  fxDef('flyers', 'Ptaki, nietoperze, motyle', '🦇', 'Stadko ptaków, nietoperzy na Halloween albo kolorowych motyli przelatujące przez ekran.', [
    { key: 'kind', label: 'Co leci', type: 'select', default: 'birds', options: [{ value: 'birds', label: 'Ptaki' }, { value: 'bats', label: 'Nietoperze' }, { value: 'butterflies', label: 'Motyle' }] },
    countF(9, 40), speedF(1), sizeF(1), opacityF(0.9),
    { key: 'from', label: 'Kierunek', type: 'select', default: 'left', options: [{ value: 'left', label: 'Z lewej' }, { value: 'right', label: 'Z prawej' }, { value: 'both', label: 'Z obu stron' }] },
    colorsF(['#20232b'], 'Kolory'),
  ]),
  fxDef('wordworks', 'Napis z fajerwerków', '🎇', 'Fajerwerki wybuchają i układają się w Twój napis: GG, nick, „Dzięki!”.', [
    { key: 'text', label: 'Napis', type: 'text', default: 'GG!', maxLength: 16 },
    rangeF('every', 'Co ile', 3, 30, 0.5, 6, 's'), rangeF('hold', 'Jak długo napis wisi', 0.5, 8, 0.5, 2.5, 's'), sizeF(1), opacityF(1),
    colorsF(['#ffd23f', '#ff5900', '#ff2d95', '#7aa2ff'], 'Kolory', 6),
  ]),
  fxDef('auroralayer', 'Zorza polarna', '🌌', 'Falujące wstęgi zorzy na górze ekranu, przezroczyste na grę albo kamerkę.', [
    speedF(1), opacityF(0.8), rangeF('height', 'Wysokość', 10, 70, 1, 35, '%'), colorsF(['#3bffb0', '#4fc3ff', '#b26bff'], 'Kolory', 4),
  ]),
  fxDef('heartbeat', 'Pulsująca winieta', '💓', 'Przyciemnione brzegi ekranu pulsujące jak bicie serca: na horror, napięcie albo walkę z bossem.', [
    { key: 'color', label: 'Kolor', type: 'color', default: '#b0001a' },
    rangeF('bpm', 'Tętno', 30, 180, 1, 70, ' BPM'), rangeF('strength', 'Siła', 0.1, 1, 0.05, 0.6), rangeF('size', 'Szerokość brzegu', 10, 60, 1, 30, '%'),
  ]),
  fxDef('flare', 'Lens flare', '🔆', 'Odblask obiektywu przesuwający się po ekranie, z kółkami jak w filmie.', [
    { key: 'color', label: 'Kolor', type: 'color', default: '#ffcf7a' }, speedF(1), rangeF('size', 'Wielkość', 0.4, 2.5, 0.1, 1, '×'), opacityF(0.8),
    { key: 'path', label: 'Tor', type: 'select', default: 'sweep', options: [{ value: 'sweep', label: 'Przelot przez ekran' }, { value: 'float', label: 'Delikatne pływanie' }] },
  ]),
  fxDef('glitter', 'Złoty brokat', '✨', 'Drobinki brokatu wirujące i błyskające w świetle.', [
    countF(160, 500), speedF(1), sizeF(1), opacityF(1), colorsF(['#ffd23f', '#fff1b0', '#e8b23a']),
  ]),
  fxDef('storm', 'Burza (gotowy zestaw)', '⛈️', 'Deszcz, błyskawice i mgła w jednym źródle, z jednym suwakiem siły burzy.', [
    rangeF('intensity', 'Siła burzy', 0.3, 2, 0.1, 1, '×'),
    { key: 'lightning', label: 'Błyskawice', type: 'toggle', default: true },
    { key: 'fog', label: 'Mgła', type: 'toggle', default: true },
    rangeF('wind', 'Wiatr', -3, 3, 0.1, 1),
  ]),
  fxDef('autumn', 'Jesienne liście', '🍂', 'Liście w kolorach jesieni spadające z wiatrem.', [
    countF(50, 250), speedF(1), sizeF(1.1), rangeF('wind', 'Wiatr', -3, 3, 0.1, 0.8), opacityF(0.95),
    colorsF(['#d9480f', '#f08c00', '#fab005', '#a61e4d', '#8f5b2b']),
  ]),
  fxDef('plexus', 'Konstelacje', '🕸️', 'Punkty dryfujące po ekranie i łączące się liniami, gdy są blisko. Technologiczne tło.', [
    countF(70, 200, 10), speedF(1), opacityF(0.9), rangeF('distance', 'Zasięg linii', 60, 320, 5, 160, 'px'),
    { key: 'color', label: 'Kolor', type: 'color', default: '#9fd3ff' },
  ]),
  fxDef('pixelsnow', 'Pikselowy śnieg', '👾', 'Śnieg z kwadratowych pikseli jak w grze 8-bit.', [
    countF(120, 500), speedF(1), opacityF(0.95), rangeF('pixel', 'Wielkość piksela', 2, 16, 1, 6, 'px'), colorsF(['#ffffff', '#cfe0ff']),
  ]),
  fxDef('waveslayer', 'Fale', '🌊', 'Warstwy fal kołyszące się na dole ekranu.', [
    speedF(1), opacityF(0.75), rangeF('height', 'Wysokość', 5, 50, 1, 18, '%'), colorsF(['#1e90ff', '#3bceac', '#7aa2ff'], 'Kolory', 4),
  ]),
  fxDef('imagerain', 'Własny obrazek jako efekt', '🖼️', 'Twoje logo, emotka kanału albo dowolny obrazek spadający jak śnieg albo unoszący się w górę.', [
    { key: 'image', label: 'Adres obrazka', type: 'text', default: '', maxLength: 300, placeholder: 'https://...png', hint: 'PNG z przezroczystym tłem, najlepiej kwadratowy' },
    countF(24, 120), speedF(1), sizeF(1), opacityF(0.95),
    { key: 'from', label: 'Kierunek', type: 'select', default: 'down', options: [{ value: 'down', label: 'Z góry w dół' }, { value: 'up', label: 'Z dołu w górę' }] },
    { key: 'spin', label: 'Obracanie', type: 'toggle', default: true },
  ]),
];

const Heartbeat: Renderer = ({ params: p }) => (
  <div className="ov-fill mo-heart" style={{ '--c': str(p.color, '#b0001a'), '--beat': `${60 / Math.max(20, num(p.bpm, 70))}s`, '--str': num(p.strength, 0.6), '--edge': `${100 - num(p.size, 30)}%` } as Vars} />
);
const Flare: Renderer = ({ params: p }) => (
  <div className={`ov-fill mo-flare path-${p.path ?? 'sweep'}`} style={{ '--c': str(p.color, '#ffcf7a'), '--dur': `${14 / Math.max(0.2, num(p.speed, 1))}s`, '--k': num(p.size, 1), opacity: num(p.opacity, 0.8) } as Vars}>
    <i className="f0" /><i className="f1" /><i className="f2" /><i className="f3" /><i className="f4" />
  </div>
);
const Storm: Renderer = ({ params: p }) => {
  const k = num(p.intensity, 1);
  const wind = num(p.wind, 1);
  return (
    <>
      {p.fog !== false && <ParticleLayer kind="fog" params={{ count: Math.round(10 * k), speed: 1, size: 1, wind: wind * 0.5, opacity: 0.45, color: '#aab4c4', where: 'bottom' }} />}
      <ParticleLayer kind="rain" params={{ count: Math.round(320 * k), speed: 1.3, size: 1, wind, opacity: 0.5, color: '#a9c8ff', splash: true, area: 'full' }} />
      {p.lightning !== false && <ParticleLayer kind="lightning" params={{ every: 6 / k, bolts: true, flash: 0.4, size: 1, opacity: 1, colors: ['#dfe9ff', '#b9c8ff'], flashColor: '#ffffff', from: 'top' }} />}
    </>
  );
};
const Autumn: Renderer = ({ params: p }) => (
  <ParticleLayer kind="petals" params={{ count: num(p.count, 50), speed: num(p.speed, 1), size: num(p.size, 1.1), wind: num(p.wind, 0.8), opacity: num(p.opacity, 0.95), shape: 'leaf', colors: p.colors as string[] }} />
);

export const EFFECT_RENDERERS: Record<string, Renderer> = {
  rays: ({ params }) => <CanvasFx start={fx.startRays} params={params} />,
  smoke: ({ params }) => <CanvasFx start={fx.startSmoke} params={params} />,
  fire: ({ params }) => <CanvasFx start={fx.startFire} params={params} />,
  glassrain: ({ params }) => <CanvasFx start={fx.startGlass} params={params} respawn={['size']} />,
  drift: ({ params }) => <CanvasFx start={fx.startDrift} params={params} respawn={['size']} />,
  flyers: ({ params }) => <CanvasFx start={fx.startFlyers} params={params} respawn={['kind', 'colors', 'from', 'size']} />,
  wordworks: ({ params }) => <CanvasFx start={fx.startWordworks} params={params} respawn={['text', 'colors']} />,
  auroralayer: ({ params }) => <CanvasFx start={fx.startAurora} params={params} />,
  heartbeat: Heartbeat,
  flare: Flare,
  glitter: ({ params }) => <CanvasFx start={fx.startGlitter} params={params} respawn={['colors', 'size']} />,
  storm: Storm,
  autumn: Autumn,
  plexus: ({ params }) => <CanvasFx start={fx.startPlexus} params={params} />,
  pixelsnow: ({ params }) => <CanvasFx start={fx.startPixelSnow} params={params} respawn={['colors', 'pixel']} />,
  waveslayer: ({ params }) => <CanvasFx start={fx.startWaves} params={params} />,
  imagerain: ({ params }) => <CanvasFx start={fx.startImageRain} params={params} respawn={['image', 'size', 'spin']} />,
};
