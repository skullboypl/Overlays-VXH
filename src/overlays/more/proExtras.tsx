// Additions to the Pro start / BRB / end screens (proposals 1-20). Every setting here is new and off (or empty) by
// default, and every piece renders nothing in that state, so a Pro link made before shows exactly what it showed.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Field, Params } from '../schema';
import { ParticleLayer, type EffectKind } from '../ParticleLayer';
import { EFFECT_DEFAULTS } from '../SceneScreen';
import { lines, num, safeUrl, str, type Vars } from './common';

type Panel = { id: string; node: ReactNode };
const pad = (v: number) => String(v).padStart(2, '0');

/* ---------------- settings ---------------- */
const EFFECT2 = [
  { value: 'none', label: 'Brak' }, { value: 'stars', label: 'Gwiazdy' }, { value: 'snow', label: 'Śnieg' }, { value: 'fireflies', label: 'Świetliki' },
  { value: 'confetti', label: 'Konfetti' }, { value: 'petals', label: 'Płatki' }, { value: 'embers', label: 'Iskry' }, { value: 'bubbles', label: 'Bańki' },
  { value: 'bokeh', label: 'Bokeh' }, { value: 'sparkles', label: 'Błyski' }, { value: 'meteors', label: 'Spadające gwiazdy' }, { value: 'fog', label: 'Mgła' },
  { value: 'dust', label: 'Pyłki' }, { value: 'lightning', label: 'Błyskawice' },
];
const on = (key: string) => ({ key, is: [true] });

export const proExtraFields = (kind: 'starting' | 'brb' | 'ending'): Field[] => [
  // more panels in the carousel
  { group: 'Więcej paneli', key: 'showGamePanel', label: 'Panel „Dziś gramy”', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'game', label: 'Gra', type: 'text', default: 'Minecraft', maxLength: 40, when: on('showGamePanel') },
  { group: 'Więcej paneli', key: 'gameCover', label: 'Okładka gry (link)', type: 'text', default: '', maxLength: 300, placeholder: 'https://...jpg', when: on('showGamePanel') },
  { group: 'Więcej paneli', key: 'gameNote', i18n: true, label: 'Dopisek', type: 'text', default: 'Hardcore, dzień 1', maxLength: 60, when: on('showGamePanel') },
  { group: 'Więcej paneli', key: 'showSponsorPanel', label: 'Panel sponsora', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'sponsorLogo', label: 'Logo sponsora (link)', type: 'text', default: '', maxLength: 300, placeholder: 'https://...png', when: on('showSponsorPanel') },
  { group: 'Więcej paneli', key: 'sponsorText', i18n: true, label: 'Tekst', type: 'text', default: 'Partner streama', maxLength: 60, when: on('showSponsorPanel') },
  { group: 'Więcej paneli', key: 'sponsorCode', label: 'Kod rabatowy', type: 'text', default: '', maxLength: 24, when: on('showSponsorPanel') },
  { group: 'Więcej paneli', key: 'showFactsPanel', label: 'Panel ciekawostek', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'facts', i18n: true, label: 'Ciekawostki', type: 'text', list: 'lines', default: 'Ośmiornice mają trzy serca. | Miód nigdy się nie psuje.', maxLength: 600, placeholder: 'Ciekawostka', when: on('showFactsPanel'), hint: 'Za każdym razem pokazuje się kolejna' },
  { group: 'Więcej paneli', key: 'showMusicPanel', label: 'Panel „Teraz gra”', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'musicTitle', label: 'Utwór', type: 'text', default: 'Lofi beats', maxLength: 60, when: on('showMusicPanel') },
  { group: 'Więcej paneli', key: 'musicArtist', label: 'Wykonawca', type: 'text', default: 'Chill Radio', maxLength: 60, when: on('showMusicPanel') },
  { group: 'Więcej paneli', key: 'showPollPanel', label: 'Panel ankiety', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'pollQuestion', i18n: true, label: 'Pytanie', type: 'text', default: 'W co gramy potem?', maxLength: 60, when: on('showPollPanel') },
  { group: 'Więcej paneli', key: 'pollOptions', i18n: true, label: 'Odpowiedzi i głosy', type: 'text', list: 'lines', default: 'Minecraft 12 | CS2 8 | Valorant 5', maxLength: 300, placeholder: 'Odpowiedź 0', when: on('showPollPanel') },
  { group: 'Więcej paneli', key: 'showSchedulePanel', label: 'Panel harmonogramu', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'schedule', i18n: true, label: 'Terminy', type: 'text', list: 'lines', default: 'Pon 20:00 | Śr 20:00 | Pt 21:00 | Nd 18:00', maxLength: 300, placeholder: 'Pon 20:00', when: on('showSchedulePanel') },
  { group: 'Więcej paneli', key: 'showGoalPanel', label: 'Panel celu', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'goalTitle', i18n: true, label: 'Cel', type: 'text', default: 'Followy', maxLength: 30, when: on('showGoalPanel') },
  { group: 'Więcej paneli', key: 'goalCurrent', label: 'Teraz', type: 'range', min: 0, max: 100000, step: 1, default: 64, when: on('showGoalPanel') },
  { group: 'Więcej paneli', key: 'goalTarget', label: 'Cel', type: 'range', min: 1, max: 100000, step: 1, default: 100, when: on('showGoalPanel') },
  { group: 'Więcej paneli', key: 'showWeatherPanel', label: 'Panel pogody', type: 'toggle', default: false },
  { group: 'Więcej paneli', key: 'weatherCity', label: 'Miasto', type: 'text', default: 'Warszawa', maxLength: 60, when: on('showWeatherPanel') },
  { group: 'Więcej paneli', key: 'showCredits', label: 'Napisy końcowe', type: 'toggle', default: false, hint: kind === 'ending' ? 'Przewijane podziękowania jak w kinie' : 'Przewijana lista podziękowań' },
  { group: 'Więcej paneli', key: 'credits', i18n: true, label: 'Podziękowania', type: 'text', list: 'lines', default: 'Moderatorzy: kasia_gra, ziomek | Top donate: widz123 | Raid: noob_pl | Dzięki, że byliście!', maxLength: 800, placeholder: 'Wiersz napisów', when: on('showCredits') },
  // intro, title, timer
  { group: 'Więcej efektów', key: 'logo', label: 'Logo w intro (link)', type: 'text', default: '', maxLength: 300, placeholder: 'https://...png', hint: 'Pokazuje się w intro i obok nicku' },
  { group: 'Więcej efektów', key: 'titleFx', label: 'Efekt tytułu', type: 'select', default: 'none', options: [
    { value: 'none', label: 'Jak w motywie' }, { value: 'gradient', label: 'Gradient z kolorów motywu' }, { value: 'stroke', label: 'Kontur' }, { value: 'glow', label: 'Poświata' }, { value: 'shine', label: 'Przelatujący połysk' },
  ] },
  { group: 'Więcej efektów', key: 'effect2', label: 'Drugi efekt', type: 'select', default: 'none', options: EFFECT2 },
  { group: 'Więcej efektów', key: 'parallax', label: 'Powolny ruch tła (parallax)', type: 'toggle', default: false },
  { group: 'Więcej efektów', key: 'bgVideo', label: 'Własne wideo w tle (link .mp4 / .webm)', type: 'text', default: '', maxLength: 300, placeholder: 'https://...mp4', hint: 'Zapętlone, bez dźwięku, nad wybranym tłem' },
  { group: 'Więcej efektów', key: 'afterDone', label: 'Po odliczeniu', type: 'select', default: 'text', options: [
    { value: 'text', label: 'Napis' }, { value: 'late', label: 'Licz spóźnienie (+MM:SS)' }, { value: 'hide', label: 'Ukryj licznik' },
  ] },
  { group: 'Więcej efektów', key: 'finalCount', label: 'Wielkie odliczanie 10 s', type: 'toggle', default: false },
  { group: 'Więcej efektów', key: 'beep', label: 'Pik w ostatnich sekundach', type: 'toggle', default: false, when: on('finalCount'), hint: 'W OBS zaznacz „Steruj dźwiękiem przez OBS”, żeby go słyszeć' },
  { group: 'Więcej efektów', key: 'showWaiting', label: 'Ilu widzów czeka (Kick)', type: 'toggle', default: false },
  { group: 'Więcej efektów', key: 'waitingChannel', label: 'Kanał na Kicku', type: 'text', default: 'skullboypl', maxLength: 40, when: on('showWaiting') },
];

/* ---------------- panels ---------------- */
const WMO: Record<number, string> = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 95: '⛈️' };
const useWeather = (city: string, active: boolean) => {
  const [w, setW] = useState<{ t: number; icon: string; name: string } | null>(null);
  useEffect(() => {
    if (!active || !city.trim()) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const g = (await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`)).json())?.results?.[0];
        if (!g) return;
        const fc = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,weather_code`)).json();
        if (alive) setW({ t: Math.round(fc.current.temperature_2m), icon: WMO[fc.current.weather_code] ?? '🌡️', name: g.name });
      } catch { /* offline: panel stays hidden */ }
    };
    void load();
    const id = window.setInterval(load, 15 * 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [city, active]);
  return w;
};

export const useProExtraPanels = (p: Params, t: (s: string) => string): Panel[] => {
  const weather = useWeather(str(p.weatherCity), p.showWeatherPanel === true);
  const facts = lines(p.facts);
  const [factIndex, setFactIndex] = useState(0);
  const factShown = useRef(0);
  return useMemo(() => {
    const out: Panel[] = [];
    if (p.showGamePanel === true && p.game) {
      const cover = safeUrl(p.gameCover);
      out.push({ id: 'x-game', node: (
        <div className="pr-panel mo-pro-game">
          {cover && <img src={cover} alt="" />}
          <div><small>{t('Dziś gramy')}</small><b>{str(p.game)}</b>{p.gameNote && <span>{str(p.gameNote)}</span>}</div>
        </div>
      ) });
    }
    if (p.showSponsorPanel === true) {
      const logo = safeUrl(p.sponsorLogo);
      out.push({ id: 'x-sponsor', node: (
        <div className="pr-panel mo-pro-sponsor">
          {logo && <img src={logo} alt="" />}
          {p.sponsorText && <b>{str(p.sponsorText)}</b>}
          {p.sponsorCode && <span>{t('Kod')} <code>{str(p.sponsorCode)}</code></span>}
        </div>
      ) });
    }
    if (p.showFactsPanel === true && facts.length) {
      out.push({ id: 'x-facts', node: <FactPanel facts={facts} index={factIndex} onShown={() => { factShown.current += 1; setFactIndex(factShown.current); }} title={t('Ciekawostka')} /> });
    }
    if (p.showMusicPanel === true && p.musicTitle) {
      out.push({ id: 'x-music', node: (
        <div className="pr-panel mo-pro-music">
          <div className="mo-eq" aria-hidden>{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ '--i': i } as Vars} />)}</div>
          <div><small>{t('Teraz gra')}</small><b>{str(p.musicTitle)}</b>{p.musicArtist && <span>{str(p.musicArtist)}</span>}</div>
        </div>
      ) });
    }
    if (p.showPollPanel === true) {
      const opts = lines(p.pollOptions).map((l) => { const m = /^(.*?)\s+(\d+)$/.exec(l); return m ? { label: m[1], v: Number(m[2]) } : { label: l, v: 0 }; });
      const total = opts.reduce((a, o) => a + o.v, 0) || 1;
      out.push({ id: 'x-poll', node: (
        <div className="pr-panel pr-list mo-pro-poll">
          <h3><i>📊</i>{str(p.pollQuestion)}</h3>
          {opts.map((o, i) => (
            <div key={i} className="mo-pro-poll-row" style={{ '--i': i } as Vars}><i style={{ width: `${(o.v / total) * 100}%` }} /><b>{o.label}</b><span>{Math.round((o.v / total) * 100)}%</span></div>
          ))}
        </div>
      ) });
    }
    if (p.showSchedulePanel === true && lines(p.schedule).length) {
      out.push({ id: 'x-schedule', node: (
        <div className="pr-panel pr-list mo-pro-schedule">
          <h3><i>📅</i>{t('Harmonogram')}</h3>
          <ul>{lines(p.schedule).map((l, i) => { const [d, ...r] = l.split(/\s+/); return <li key={i} style={{ '--i': i } as Vars}><b>{d}</b> {r.join(' ')}</li>; })}</ul>
        </div>
      ) });
    }
    if (p.showGoalPanel === true) {
      const cur = num(p.goalCurrent, 0), target = Math.max(1, num(p.goalTarget, 100));
      out.push({ id: 'x-goal', node: (
        <div className="pr-panel mo-pro-goal">
          <small>{t('Cel')}</small><b>{str(p.goalTitle)}</b>
          <div className="pr-rewards-bar"><i style={{ width: `${Math.min(100, (cur / target) * 100)}%` }} /></div>
          <span>{cur} / {target}</span>
        </div>
      ) });
    }
    if (p.showWeatherPanel === true && weather) {
      out.push({ id: 'x-weather', node: (
        <div className="pr-panel mo-pro-weather"><span aria-hidden>{weather.icon}</span><div><b>{weather.t}°C</b><small>{weather.name}</small></div></div>
      ) });
    }
    if (p.showCredits === true && lines(p.credits).length) {
      out.push({ id: 'x-credits', node: (
        <div className="pr-panel mo-pro-credits"><div className="mo-pro-roll">{lines(p.credits).map((l, i) => <p key={i}>{l}</p>)}</div></div>
      ) });
    }
    return out;
  }, [p.showGamePanel, p.game, p.gameCover, p.gameNote, p.showSponsorPanel, p.sponsorLogo, p.sponsorText, p.sponsorCode, p.showFactsPanel, p.facts, factIndex, // eslint-disable-line react-hooks/exhaustive-deps
    p.showMusicPanel, p.musicTitle, p.musicArtist, p.showPollPanel, p.pollQuestion, p.pollOptions, p.showSchedulePanel, p.schedule, p.showGoalPanel, p.goalTitle,
    p.goalCurrent, p.goalTarget, p.showWeatherPanel, weather, p.showCredits, p.credits, p._lang]);
};

/** A new fact every time the panel comes back. */
const FactPanel = ({ facts, index, onShown, title }: { facts: string[]; index: number; onShown: () => void; title: string }) => {
  useEffect(() => () => onShown(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pr-panel pr-list mo-pro-fact">
      <h3><i>💡</i>{title}</h3>
      <p>{facts[index % facts.length]}</p>
    </div>
  );
};

/* ---------------- layers, intro logo, classes ---------------- */
export const proExtraClass = (p: Params) => [
  p.titleFx && p.titleFx !== 'none' ? `mo-tfx-${String(p.titleFx)}` : '',
  p.parallax === true ? 'mo-parallax' : '',
].filter(Boolean).join(' ');

export const ProExtraLayers = ({ p, colors }: { p: Params; colors: string[] }) => {
  const video = safeUrl(p.bgVideo);
  const e2 = str(p.effect2, 'none');
  const e2Params = e2 !== 'none' && EFFECT_DEFAULTS[e2] ? { ...EFFECT_DEFAULTS[e2], ...(e2 === 'confetti' ? { colors } : {}) } : null;
  if (!video && !e2Params) return null;
  return (
    <>
      {video && <video className="mo-pro-video" src={video} autoPlay muted loop playsInline style={{ opacity: 1 - num(p.bgDim, 0.45) * 0.6 }} />}
      {e2Params && <ParticleLayer key={`e2-${e2}`} kind={e2 as EffectKind} params={e2Params} />}
    </>
  );
};

export const ProIntroLogo = ({ p }: { p: Params }) => {
  const logo = safeUrl(p.logo);
  return logo ? <img className="mo-pro-logo" src={logo} alt="" /> : null;
};

/** Big 10..1 in the middle of the screen, optionally with a short beep each second. */
export const ProFinalCount = ({ left, active, beep }: { left: number; active: boolean; beep: boolean }) => {
  const s = Math.ceil(left / 1000);
  const show = active && s > 0 && s <= 10;
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!show || !beep) return;
    try {
      ctx.current ??= new AudioContext();
      const a = ctx.current, o = a.createOscillator(), g = a.createGain();
      o.frequency.value = s <= 3 ? 1320 : 880;
      g.gain.setValueAtTime(0.2, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.2);
    } catch { /* no audio */ }
  }, [s, show, beep]);
  if (!show) return null;
  return <div className="mo-pro-final" aria-hidden><b key={s}>{s}</b></div>;
};

/** "+MM:SS" after the countdown ended (option "Licz spóźnienie"). */
export const lateText = (ms: number) => {
  const sec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `+${h ? `${h}:` : ''}${pad(m)}:${pad(sec % 60)}`;
};

/** "👀 12 czeka" chip from the Kick viewer count. */
export const ProWaiting = ({ p, t }: { p: Params; t: (s: string) => string }) => {
  const channel = str(p.waitingChannel).trim();
  const active = p.showWaiting === true && Boolean(channel);
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    const load = () => fetch(`/api/followers?platform=kick&channel=${encodeURIComponent(channel)}`).then((r) => r.json()).then((b) => { if (alive && typeof b.viewers === 'number') setN(b.viewers); }).catch(() => {});
    load();
    const id = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [active, channel]);
  if (!active || n === null) return null;
  return <div className="mo-pro-waiting">👀 <b>{n}</b> {t('czeka na start')}</div>;
};
