// "Pro" start / BRB / end screens: a motion-graphics timeline instead of one static layout.
// Intro (nick reveal) -> main stage (title, countdown) -> a carousel of panels that take turns:
// social spotlight (with a call to action and a QR code), info, rewards / goals, next stream.
// Five themes change the shapes and the way panels come in; a light sweep crosses every so often.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Params } from './schema';
import { ParticleLayer, type EffectKind } from './ParticleLayer';
import { Background, EFFECT_DEFAULTS, SCENE_FONTS } from './SceneScreen';
import { BRAND_COLORS, BRAND_INK, BrandIcon, parseSocials, type Brand } from './icons';
import { QrSvg } from './tools';
import { isLang, translate } from '../i18n';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Kind = 'starting' | 'brb' | 'ending';

const pad = (n: number) => String(n).padStart(2, '0');
const lines = (v: unknown) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean);
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

const useNow = (active: boolean, ms = 250) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
};

/** Deadline for "N minutes from when OBS opened the source" or "until HH:MM" (same rules as the classic screens). */
const useDeadline = (mode: string, minutes: number, at: string) => {
  const opened = useRef(Date.now());
  if (mode === 'clock') {
    const [hh, mm] = at.split(':').map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    if (d.getTime() < Date.now() - 6 * 3600_000) d.setDate(d.getDate() + 1);
    return { start: opened.current, end: d.getTime() };
  }
  return { start: opened.current, end: opened.current + minutes * 60_000 };
};

/** Call to action that fits the service, in the studio's language. */
const CTA: Record<Brand, string> = {
  twitch: 'Obserwuj na Twitchu', youtube: 'Subskrybuj na YouTube', discord: 'Wbijaj na Discorda', tiktok: 'Obserwuj na TikToku',
  kick: 'Obserwuj na Kicku', instagram: 'Obserwuj na Instagramie', x: 'Śledź na X', facebook: 'Polub na Facebooku', link: 'Odwiedź stronę',
};
const urlOf = (label: string) => (/^https?:\/\//i.test(label) ? label : `https://${label.replace(/^\/+/, '')}`);

/** Letters with a stagger index, for the per-letter reveals. */
const Letters = ({ text, className = '' }: { text: string; className?: string }) => (
  <span className={`pr-letters ${className}`} aria-label={text}>
    {Array.from(text).map((ch, i) => (
      <span key={i} style={{ '--i': i } as Vars} className={ch === ' ' ? 'sp' : undefined}>{ch === ' ' ? '\u00a0' : ch}</span>
    ))}
  </span>
);

/** Countdown digits; each digit flips when it changes. */
const Digits = ({ ms }: { ms: number }) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const text = h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return (
    <span className="pr-digits">
      {Array.from(text).map((ch, i) => (ch === ':' ? <i key={i}>:</i> : <b key={`${i}-${ch}`}>{ch}</b>))}
    </span>
  );
};

type Panel = { id: string; node: ReactNode };

/** Scale (<= 1) that makes the letters of `ref` fit the width their parent gives them, like the classic screens' title. */
const useFitWidth = (ref: React.RefObject<HTMLElement>, deps: unknown[]) => {
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const current = parseFloat(getComputedStyle(el).getPropertyValue('--fit')) || 1;
      const letters = el.querySelectorAll<HTMLElement>('.pr-letters > span');
      const first = letters[0], last = letters[letters.length - 1];
      if (!first || !last) return;
      const natural = (last.offsetLeft + last.offsetWidth - first.offsetLeft) / current;
      const parent = el.parentElement!;
      const ps = getComputedStyle(parent);
      const room = parent.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
      const next = Math.min(1, (room / Math.max(1, natural)) * 0.98);
      setFit((f) => (Math.abs(f - next) > 0.002 ? next : f));
    };
    measure();
    document.fonts?.ready.then(measure);
    const late = setTimeout(measure, 900);
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement ?? el);
    return () => { ro.disconnect(); clearTimeout(late); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return fit;
};

export const ProScene = ({ kind, params: p }: { kind: Kind; params: Params }) => {
  const lang = isLang(p._lang) ? p._lang : 'pl';
  const t = (s: string) => translate(lang, s);
  const colors = (p.colors as string[]) ?? ['#ff5900', '#ff2d6f', '#7a5cff'];
  const theme = String(p.theme ?? 'cinematic');
  const timer = String(p.timer ?? 'off');
  const { start, end } = useDeadline(timer, num(p.minutes, 5), String(p.at ?? '20:00'));
  const now = useNow(true);
  const left = end - now;
  const done = timer !== 'off' && left <= 0;

  // ---- timeline: intro, then main; a sweep every `flourishEvery` seconds ----
  const introOn = p.intro !== false;
  const introMs = introOn ? 3400 : 0;
  const [phase, setPhase] = useState<'intro' | 'main'>(introOn ? 'intro' : 'main');
  useEffect(() => {
    if (!introOn) { setPhase('main'); return; }
    setPhase('intro');
    const id = window.setTimeout(() => setPhase('main'), introMs);
    return () => window.clearTimeout(id);
  }, [introOn, p.kicker, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sweep, setSweep] = useState(0);
  useEffect(() => {
    const every = Math.max(5, num(p.flourishEvery, 18)) * 1000;
    const id = window.setInterval(() => setSweep((n) => n + 1), every);
    return () => window.clearInterval(id);
  }, [p.flourishEvery]);

  // ---- panels ----
  const socials = parseSocials(String(p.socials ?? ''));
  const infos = lines(p.infos);
  const rewards = lines(p.rewards).map((l) => ({ done: /^[✓✔x]\s*/i.test(l), text: l.replace(/^[✓✔x]\s*/i, '') }));
  const panels: Panel[] = useMemo(() => {
    const out: Panel[] = [];
    if (p.showSocialsPanel !== false) {
      socials.forEach((s, i) => {
        const cta = p.socialCta === 'custom' && p.socialCtaText ? String(p.socialCtaText) : t(CTA[s.brand]);
        out.push({
          id: `social-${i}`,
          node: (
            <div className="pr-panel pr-social" style={{ '--brand': BRAND_COLORS[s.brand], '--ink': BRAND_INK[s.brand] } as Vars}>
              <div className="pr-social-head">
                <span className="pr-social-icon"><BrandIcon brand={s.brand} size="1em" /></span>
                <div className="pr-social-text">
                  <small>{cta}</small>
                  <b>{s.label}</b>
                </div>
              </div>
              {p.socialQr !== false && (
                <div className="pr-social-qr">
                  <QrSvg url={urlOf(s.label)} p={{ qrColor: '#111114', qrBg: '#ffffff', logo: true, modules: 'rounded', qrRounded: true }} />
                  <span>{t('Zeskanuj telefonem')}</span>
                </div>
              )}
            </div>
          ),
        });
      });
    }
    if (p.showInfoPanel !== false && infos.length) {
      out.push({
        id: 'info',
        node: (
          <div className="pr-panel pr-list">
            <h3><i>ℹ</i>{String(p.infoTitle ?? '')}</h3>
            <ul>{infos.map((l, i) => <li key={i} style={{ '--i': i } as Vars}>{l}</li>)}</ul>
          </div>
        ),
      });
    }
    if (p.showRewardsPanel !== false && rewards.length) {
      const doneCount = rewards.filter((r) => r.done).length;
      out.push({
        id: 'rewards',
        node: (
          <div className="pr-panel pr-list pr-rewards">
            <h3><i>🎁</i>{String(p.rewardsTitle ?? '')}<em>{doneCount}/{rewards.length}</em></h3>
            <ul>{rewards.map((r, i) => <li key={i} className={r.done ? 'is-done' : ''} style={{ '--i': i } as Vars}><span className="pr-check">{r.done ? '✓' : ''}</span>{r.text}</li>)}</ul>
            {p.rewardsBar !== false && <div className="pr-rewards-bar"><i style={{ width: `${(doneCount / rewards.length) * 100}%` }} /></div>}
          </div>
        ),
      });
    }
    if (p.showNextPanel !== false && p.next) {
      out.push({
        id: 'next',
        node: (
          <div className="pr-panel pr-next">
            <small>{String(p.nextLabel ?? '')}</small>
            <b>{String(p.next)}</b>
            {p.nextNote && <span>{String(p.nextNote)}</span>}
          </div>
        ),
      });
    }
    return out;
  }, [p.socials, p.infos, p.rewards, p.next, p.nextLabel, p.nextNote, p.infoTitle, p.rewardsTitle, p.showSocialsPanel, p.showInfoPanel, p.showRewardsPanel, p.showNextPanel, p.socialQr, p.socialCta, p.socialCtaText, p.rewardsBar, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const every = Math.max(3, num(p.panelEvery, 9)) * 1000;
  const [panelIndex, setPanelIndex] = useState(0);
  useEffect(() => {
    if (panels.length < 2) { setPanelIndex(0); return; }
    const id = window.setInterval(() => setPanelIndex((i) => (i + 1) % panels.length), every);
    return () => window.clearInterval(id);
  }, [panels.length, every]);
  const panel = panels.length ? panels[panelIndex % panels.length] : null;

  // ---- look ----
  const effect = String(p.effect ?? 'none');
  const effectParams: Params | null = effect !== 'none' && EFFECT_DEFAULTS[effect]
    ? { ...EFFECT_DEFAULTS[effect], ...(effect === 'confetti' || effect === 'fireworks' ? { colors } : {}) }
    : null;
  const style: Vars = {
    '--c1': colors[0], '--c2': colors[1] ?? colors[0], '--c3': colors[2] ?? colors[1] ?? colors[0],
    '--base': String(p.base ?? '#07070c'), '--fg': String(p.textColor ?? '#ffffff'),
    '--ts': num(p.titleSize, 1), '--font': SCENE_FONTS[String(p.font ?? 'poppins')] ?? SCENE_FONTS.poppins,
    '--every': `${every}ms`, '--cw': num(p.chatWidth, 26),
  };
  const chat = p.chat === true;
  const chatSide = String(p.chatSide ?? 'right');
  const panelAnim = p.panelAnim && p.panelAnim !== 'auto' ? String(p.panelAnim) : { cinematic: 'fade', esport: 'cut', neon: 'glitch', clean: 'rise', cozy: 'bounce' }[theme] ?? 'rise';
  const ticker = p.showTicker !== false ? lines(p.ticker) : [];
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleFit = useFitWidth(titleRef, [p.title, p.titleSize, p.font, p.layout, p.chat, p.chatWidth, theme, phase]);
  const cls = [
    'pr-root', `pr-${kind}`, `theme-${theme}`, `lay-${p.layout ?? 'split'}`, `phase-${phase}`, `panel-anim-${panelAnim}`,
    chat ? `has-chat chat-${chatSide}` : '', done ? 'is-done' : '', p.uppercase ? 'is-upper' : '',
  ].join(' ');

  return (
    <div className={cls} style={style}>
      <div className="pr-layers">
        <Background bg={String(p.bg ?? 'aurora')} colors={colors} params={p} />
        {effectParams && <ParticleLayer key={effect} kind={(effect === 'warp' ? 'stars' : effect) as EffectKind} params={effectParams} />}
        {done && p.celebrate !== false && <ParticleLayer kind="confetti" params={{ ...EFFECT_DEFAULTS.confetti, colors, mode: 'burst', every: 6, count: 160 }} />}
        {p.vignette !== false && <div className="pr-vignette" />}
        {theme === 'esport' && <div className="pr-scan" />}
        {theme === 'neon' && <div className="pr-neon-grid" />}
        <div key={sweep} className="pr-sweep" />
      </div>

      {introOn && (
        <div className={`pr-intro ${phase === 'main' ? 'is-leaving' : ''}`} aria-hidden={phase === 'main'}>
          <div className="pr-intro-line" />
          <div className="pr-intro-nick"><Letters text={String(p.kicker || ' ')} /></div>
          {p.introText && <div className="pr-intro-sub">{String(p.introText)}</div>}
          <div className="pr-intro-line r" />
        </div>
      )}

      {chat && (
        <div className="pr-chat">
          {p.showChatTitle !== false && p.chatTitle && <div className="pr-chat-head"><i />{String(p.chatTitle)}</div>}
          <div className="pr-chat-hint" aria-hidden>
            <p><b style={{ color: '#ff8a3d' }}>widz123:</b> siema!</p>
            <p><b style={{ color: '#7aa2ff' }}>kasia_gra:</b> czekam na start 🔥</p>
            <span>Tu połóż źródło czatu z OBS</span>
          </div>
        </div>
      )}

      <div className="pr-inner">
        <div className="pr-stage">
          <header className="pr-head">
            {p.showKicker !== false && p.kicker && (
              <div className="pr-kicker"><i className={kind === 'ending' ? 'off' : ''} />{String(p.kicker)}</div>
            )}
            {p.showTitle !== false && (
              <h1 ref={titleRef} className="pr-title" style={{ '--fit': titleFit } as Vars}>
                <Letters key={`${p.title}-${phase}`} text={String(p.title || ' ')} />
              </h1>
            )}
            {p.showSubtitle !== false && p.subtitle && <p className="pr-sub">{String(p.subtitle)}</p>}
            {timer !== 'off' && (
              <div className="pr-timer">
                {done ? <strong className="pr-done">{String(p.doneText ?? '')}</strong> : (
                  <>
                    {p.showTimerLabel !== false && p.timerLabel && <span>{String(p.timerLabel)}</span>}
                    <strong><Digits ms={left} /></strong>
                  </>
                )}
                {p.progress !== false && !done && (
                  <div className="pr-progress"><i style={{ width: `${Math.min(100, ((now - start) / Math.max(1, end - start)) * 100)}%` }} /></div>
                )}
              </div>
            )}
            {kind === 'ending' && p.showThanks !== false && p.thanks && <p className="pr-thanks">{String(p.thanks)}</p>}
          </header>

          {panel && (
            <aside className="pr-side">
              <div key={`${panel.id}-${panelIndex}`} className="pr-panel-wrap">{panel.node}</div>
              {panels.length > 1 && (
                <div className="pr-dots">
                  {panels.map((pn, i) => <i key={pn.id} className={i === panelIndex % panels.length ? 'on' : ''} />)}
                  {p.panelBar !== false && <b key={panelIndex} className="pr-panel-bar" />}
                </div>
              )}
            </aside>
          )}
        </div>

        {p.showSocialsRow !== false && socials.length > 0 && (
          <div className="pr-socials">
            {socials.map((s, i) => (
              <span key={i} className={`pr-soc ${panel?.id === `social-${i}` ? 'is-live' : ''}`} style={{ '--brand': BRAND_COLORS[s.brand], '--ink': BRAND_INK[s.brand], '--i': i } as Vars}>
                <BrandIcon brand={s.brand} />{s.label}
              </span>
            ))}
          </div>
        )}
        {ticker.length > 0 && (
          <div className="pr-ticker">
            <div className="pr-ticker-track">
              {[0, 1].map((k) => <span key={k}>{ticker.map((l, i) => <em key={i}>{l}<i>◆</i></em>)}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
