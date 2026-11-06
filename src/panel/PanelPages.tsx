import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { OVERLAYS } from '../overlays/registry';
import { tx, useT } from '../i18n';
import { LangSelect } from '../studio/LangSelect';
import { MENU_GROUPS } from '../studio/OverlayMenu';
import {
  claim, createKey, drop, forgetKey, isKey, roomOf, saveKey, saveState, savedKey, savedState, timerValue, update, useRoom,
  type PanelState,
} from './panel';
import '../studio/studio.css';
import './panel.css';

const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
};

const useRoomId = (key: string | null) => {
  const [room, setRoom] = useState<string | null>(null);
  useEffect(() => { setRoom(null); if (key) void roomOf(key).then(setRoom); }, [key]);
  return room;
};

const CopyField = ({ value, secret }: { value: string; secret?: boolean }) => {
  const { t } = useT();
  const [shown, setShown] = useState(!secret);
  const [done, setDone] = useState(false);
  return (
    <div className="pn-copy">
      <input readOnly value={shown ? value : value.replace(/#k=.*/, '#k=••••••••••••••••')} onFocus={(e) => e.currentTarget.select()} />
      {secret && <button type="button" className="pn-ghost" onClick={() => setShown((v) => !v)}>{shown ? t('Ukryj') : t('Pokaż')}</button>}
      <button type="button" className="pn-primary" onClick={async () => { await copy(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? t('Skopiowano') : t('Kopiuj')}</button>
    </div>
  );
};

/* ===================== setup page: /panel ===================== */
export const PanelSetup = () => {
  const { t } = useT();
  const [key, setKey] = useState<string | null>(savedKey);
  const room = useRoomId(key);
  const { snap } = useRoom(room, true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importText, setImportText] = useState('');
  const dockUrl = key ? `${window.location.origin}/panel/dock#k=${key}` : '';

  useEffect(() => { document.title = `${t('Panel OBS')} | VXH Overlays`; }, [t]);

  const create = async () => {
    setBusy(true); setError('');
    try { setKey(await createKey()); } catch { setError(t('Nie udało się utworzyć panelu. Spróbuj za chwilę.')); }
    setBusy(false);
  };
  const regenerate = async () => {
    if (!key || !window.confirm(t('Stary link docka i połączone overlaye przestaną działać. Utworzyć nowy klucz?'))) return;
    setBusy(true);
    await drop(key).catch(() => {});
    forgetKey();
    try { setKey(await createKey()); } catch { setKey(null); setError(t('Nie udało się utworzyć panelu. Spróbuj za chwilę.')); }
    setBusy(false);
  };
  const importKey = async () => {
    const k = /#k=([A-Za-z0-9_-]{43})/.exec(importText)?.[1] ?? importText.trim();
    if (!isKey(k)) { setError(t('To nie jest link ani klucz panelu.')); return; }
    const r = await claim(k);
    if (!r.ok) { setError(t('Nie udało się utworzyć panelu. Spróbuj za chwilę.')); return; }
    saveKey(k); setKey(k); setImportText(''); setError('');
  };

  return (
    <div className="pn-page">
      <header className="st-top">
        <Link to="/" className="st-logo">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span><b>Overlays</b><small>studio · vxh</small></span>
        </Link>
        <nav className="st-nav"><Link to="/">{t('Wróć do studia')}</Link><LangSelect /></nav>
      </header>
      <main className="pn-main">
        <h1>🎛️ {t('Panel OBS')}</h1>
        <p className="pn-lead">{t('Dock w OBS, z którego na żywo sterujesz overlayami: licznik start/pauza, liczba w pasku celu, przypominajka „pokaż teraz” i ukrywanie widżetów. Bez wtyczek i bez zakładania konta.')}</p>

        {!key ? (
          <section className="pn-card">
            <h2>{t('Utwórz swój panel')}</h2>
            <p>{t('Twoja przeglądarka wylosuje tajny klucz. Serwer zna tylko jego skrót, więc nikt inny nie dostanie tego samego klucza ani nie zmieni Twoich overlayów.')}</p>
            <button type="button" className="pn-primary pn-big" disabled={busy} onClick={create}>{busy ? '…' : t('Utwórz panel')}</button>
            <details className="pn-import">
              <summary>{t('Mam już panel na innym komputerze')}</summary>
              <div className="pn-copy">
                <input value={importText} onChange={(e) => setImportText(e.currentTarget.value)} placeholder={t('Wklej link docka')} />
                <button type="button" className="pn-primary" onClick={importKey}>{t('Użyj')}</button>
              </div>
            </details>
            {error && <p className="pn-error">{error}</p>}
          </section>
        ) : (
          <>
            <section className="pn-card">
              <h2><span className="pn-step">1</span>{t('Dodaj dock w OBS')}</h2>
              <ol>
                <li>{t('W OBS otwórz menu Docki → Własne docki przeglądarki.')}</li>
                <li>{t('Nazwa: „VXH Panel”, adres: wklej link poniżej, kliknij Zastosuj.')}</li>
              </ol>
              <CopyField value={dockUrl} secret />
              <p className="pn-warn">🔒 {t('Ten link to Twój klucz. Nie pokazuj go na streamie i nie wysyłaj nikomu: kto go ma, steruje Twoimi overlayami.')}</p>
            </section>
            <section className="pn-card">
              <h2><span className="pn-step">2</span>{t('Podłącz overlaye')}</h2>
              <p>{t('W studiu, pod linkiem do OBS, włącz „Steruj z Panelu OBS” i skopiuj link jeszcze raz. Taki link pozwala tylko czytać ustawienia z panelu, więc nawet jeśli ktoś go zobaczy, niczego nie zmieni.')}</p>
              <div className="pn-status">
                <span className={`pn-dot ${snap?.sources ? 'is-on' : ''}`} />
                {t('Połączone źródła')}: <b>{snap ? snap.sources : '…'}</b>
              </div>
              <div className="pn-row">
                <Link className="pn-ghost" to="/timer">⏱️ {t('Odliczanie i stoper')}</Link>
                <Link className="pn-ghost" to="/goal">🎯 {t('Pasek celu')}</Link>
                <Link className="pn-ghost" to="/reminder">📣 {t('Przypominajka')}</Link>
              </div>
            </section>
            <section className="pn-card">
              <h2><span className="pn-step">3</span>{t('Sprawdź')}</h2>
              <p>{t('Otwórz panel tutaj w przeglądarce i pokliknij: zmiany od razu widać w OBS.')}</p>
              <a className="pn-ghost" href={dockUrl} target="_blank" rel="noreferrer">{t('Otwórz panel w nowej karcie')} ↗</a>
            </section>
            <section className="pn-card pn-danger">
              <h2>{t('Nowy klucz')}</h2>
              <p>{t('Gdy klucz wyciekł, utwórz nowy. Stary link docka i podłączone overlaye przestaną działać, trzeba je podmienić w OBS.')}</p>
              <button type="button" className="pn-ghost" disabled={busy} onClick={regenerate}>{t('Utwórz nowy klucz')}</button>
              {error && <p className="pn-error">{error}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

/* ===================== the dock: /panel/dock#k=... ===================== */
const VIS_GROUPS = MENU_GROUPS.map((g) => ({ title: g.title, ids: [...(g.items ?? []), ...(g.sub ?? []).flatMap((s) => s.items)] }));
const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p2(m)}:${p2(s % 60)}` : `${p2(m)}:${p2(s % 60)}`;
};

export const PanelDock = () => {
  const { t } = useT();
  const key = useMemo(() => {
    const fromHash = /k=([A-Za-z0-9_-]{43})/.exec(window.location.hash)?.[1];
    if (fromHash) saveKey(fromHash);
    return fromHash ?? savedKey();
  }, []);
  const room = useRoomId(key);
  const { snap, offset } = useRoom(room, true);
  const [, tick] = useState(0);
  const [minutes, setMinutes] = useState('5');
  const [goalInput, setGoalInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [openVis, setOpenVis] = useState(false);
  const restored = useRef(false);

  useEffect(() => { document.title = 'VXH Panel'; document.documentElement.classList.add('is-dock'); }, []);
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 250); return () => window.clearInterval(id); }, []);

  // Reopen the room; after a server restart it is empty, so the dock puts its own copy back.
  useEffect(() => {
    if (!key) return;
    void claim(key).then((r) => {
      const local = savedState();
      if (r.ok && r.data?.version === 0 && local && !restored.current) { restored.current = true; void update(key, { restore: local }); }
    });
  }, [key]);
  useEffect(() => { if (snap && snap.version > 0) saveState(snap.state); }, [snap]);

  if (!key) {
    return <div className="pn-dock"><p className="pn-error">{t('Brak klucza. Skopiuj link docka ze strony Panel OBS w studiu.')}</p></div>;
  }
  const send = (patch: object) => void update(key, patch);
  const s: PanelState | null = snap?.state ?? null;
  const tm = s?.timer ?? null;
  const serverNow = Date.now() + offset.current;
  const timerMs = tm ? timerValue(tm, serverNow) : 0;

  return (
    <div className="pn-dock">
      <header className="pn-dock-head">
        <b>🎛️ VXH Panel</b>
        <span className={`pn-dot ${snap?.sources ? 'is-on' : ''}`} title={t('Połączone źródła')} />
        <small>{snap ? `${t('Połączone źródła')}: ${snap.sources}` : t('Łączenie…')}</small>
      </header>

      <section className="pn-box">
        <h3>⏱️ {t('Licznik')}</h3>
        <div className={`pn-timer ${tm?.running ? 'is-running' : ''}`}>{tm ? fmt(timerMs) : '--:--'}</div>
        <div className="pn-seg">
          <button type="button" className={tm?.mode !== 'stopwatch' ? 'is-on' : ''} onClick={() => send({ timer: { action: 'mode', mode: 'countdown' } })}>{t('Odliczanie')}</button>
          <button type="button" className={tm?.mode === 'stopwatch' ? 'is-on' : ''} onClick={() => send({ timer: { action: 'mode', mode: 'stopwatch' } })}>{t('Stoper')}</button>
        </div>
        <div className="pn-row">
          {tm?.running
            ? <button type="button" className="pn-primary" onClick={() => send({ timer: { action: 'pause' } })}>⏸ {t('Pauza')}</button>
            : <button type="button" className="pn-primary" onClick={() => send({ timer: { action: 'start' } })}>▶ {t('Start')}</button>}
          <button type="button" className="pn-ghost" onClick={() => send({ timer: { action: 'reset' } })}>↺ {t('Reset')}</button>
        </div>
        {tm?.mode !== 'stopwatch' && (
          <>
            <div className="pn-row">
              <button type="button" className="pn-ghost" onClick={() => send({ timer: { action: 'add', ms: -60_000 } })}>−1 min</button>
              <button type="button" className="pn-ghost" onClick={() => send({ timer: { action: 'add', ms: 60_000 } })}>+1 min</button>
              <button type="button" className="pn-ghost" onClick={() => send({ timer: { action: 'add', ms: 300_000 } })}>+5 min</button>
            </div>
            <div className="pn-row">
              <input type="number" min={0} max={1440} value={minutes} onChange={(e) => setMinutes(e.currentTarget.value)} aria-label={t('Minuty')} />
              <button type="button" className="pn-ghost" onClick={() => send({ timer: { action: 'set', ms: Math.max(0, Number(minutes) || 0) * 60_000 } })}>{t('Ustaw minuty')}</button>
            </div>
          </>
        )}
        {tm && <button type="button" className="pn-link" onClick={() => send({ timer: { action: 'off' } })}>{t('Oddaj licznik ustawieniom z linku')}</button>}
      </section>

      <section className="pn-box">
        <h3>🎯 {t('Pasek celu')}</h3>
        <div className="pn-goal"><b>{s?.goal.current ?? '—'}</b><span>/ {s?.goal.target ?? t('z linku')}</span></div>
        <div className="pn-row">
          {[-1, 1, 5, 10].map((n) => <button key={n} type="button" className="pn-ghost" onClick={() => send({ goal: { add: n } })}>{n > 0 ? `+${n}` : n}</button>)}
        </div>
        <div className="pn-row">
          <input type="number" value={goalInput} onChange={(e) => setGoalInput(e.currentTarget.value)} placeholder={t('Teraz')} />
          <input type="number" value={targetInput} onChange={(e) => setTargetInput(e.currentTarget.value)} placeholder={t('Cel')} />
          <button type="button" className="pn-ghost" onClick={() => {
            const patch: Record<string, number> = {};
            if (goalInput !== '') patch.current = Number(goalInput);
            if (targetInput !== '') patch.target = Number(targetInput);
            send({ goal: patch }); setGoalInput(''); setTargetInput('');
          }}>{t('Ustaw')}</button>
        </div>
        {(s?.goal.current !== null || s?.goal.target !== null) && s && (
          <button type="button" className="pn-link" onClick={() => send({ goal: { current: null, target: null } })}>{t('Oddaj liczby linkowi lub API')}</button>
        )}
        <p className="pn-note">{t('Przy celu z Twitcha, Kicka lub YouTube liczba z API ma pierwszeństwo.')}</p>
      </section>

      <section className="pn-box">
        <h3>📣 {t('Przypominajka')}</h3>
        <div className="pn-row">
          <button type="button" className="pn-primary" onClick={() => send({ reminder: { fire: true } })}>{t('Pokaż teraz')}</button>
          <button type="button" className={`pn-ghost ${s?.reminder.paused ? 'is-on' : ''}`} onClick={() => send({ reminder: { paused: !s?.reminder.paused } })}>
            {s?.reminder.paused ? `▶ ${t('Wznów')}` : `⏸ ${t('Wstrzymaj')}`}
          </button>
        </div>
      </section>

      <section className="pn-box">
        <button type="button" className="pn-vis-toggle" onClick={() => setOpenVis((v) => !v)} aria-expanded={openVis}>
          <h3>👁️ {t('Pokaż / ukryj overlaye')}</h3><span>{openVis ? '▾' : '▸'}</span>
        </button>
        {openVis && VIS_GROUPS.map((g) => (
          <div key={g.title} className="pn-vis-group">
            <h4>{t(g.title)}</h4>
            <div className="pn-chips">
              {g.ids.map((id) => {
                const def = OVERLAYS.find((o) => o.id === id);
                if (!def) return null;
                const hidden = s?.hidden[id] === true;
                return (
                  <button key={id} type="button" className={`pn-chip ${hidden ? 'is-hidden' : ''}`} onClick={() => send({ hidden: { [id]: !hidden } })} title={hidden ? t('Ukryty') : t('Widoczny')}>
                    <span>{def.icon}</span>{t(def.name)}<i>{hidden ? '🙈' : '👁️'}</i>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <p className="pn-note pn-foot">{t('Działa z overlayami, które mają w linku „Steruj z Panelu OBS”.')}</p>
    </div>
  );
};

export const PANEL_LABEL = tx('Panel OBS');
