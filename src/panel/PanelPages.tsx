import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { OVERLAYS } from '../overlays/registry';
import { tx, useT } from '../i18n';
import { LangSelect } from '../studio/LangSelect';
import { MENU_GROUPS } from '../studio/OverlayMenu';
import {
  claim, claimPanel, createKey, drop, fetchMe, forgetKey, isKey, loginWith, logout, rememberRoom, roomFor, rotateKey, saveKey, saveState, savedKey,
  savedState, timerValue, unlinkChannel, update, useRoom, type Me, type PanelState,
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
  useEffect(() => { setRoom(null); if (key) void roomFor(key).then(setRoom); }, [key]);
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
const PLATFORM_NAME = { twitch: 'Twitch', kick: 'Kick' } as const;

/** Who is logged in, what the server can do, and the messages after a login round trip. */
const useAccount = () => {
  const [me, setMe] = useState<Me | null>(null);
  const refresh = () => fetchMe().then(setMe);
  useEffect(() => { void refresh(); }, []);
  return { me, refresh };
};

const AccountCard = ({ me, panelKey, onLogout }: { me: Me | null; panelKey: string | null; onLogout: () => void }) => {
  const { t } = useT();
  const [error, setError] = useState('');
  const notice = useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('claim') === 'not_owner') return { ok: false, text: t('Ten panel należy do innego konta. Zaloguj się kontem, które go utworzyło.') };
    if (q.get('login')) return { ok: true, text: `${t('Zalogowano przez')} ${q.get('login') === 'kick' ? 'Kick' : 'Twitch'}` };
    if (q.get('login_error')) return { ok: false, text: t('Logowanie się nie udało. Spróbuj jeszcze raz.') };
    return null;
  }, [t]);
  const login = async (platform: 'twitch' | 'kick') => {
    setError('');
    const err = await loginWith(platform, panelKey);
    if (err) setError(err === 'not_configured' ? t('Logowanie przez ten serwis nie jest jeszcze włączone na serwerze.') : t('Logowanie się nie udało. Spróbuj jeszcze raz.'));
  };
  const accounts = me?.accounts ?? [];
  return (
    <section className="pn-card pn-account">
      <h2>👤 {t('Konto')}</h2>
      {accounts.length ? (
        <p>{t('Zalogowano')}: {accounts.map((a) => <b key={a.platform} className={`pn-acc is-${a.platform}`}>{PLATFORM_NAME[a.platform]}: {a.login}</b>)}</p>
      ) : (
        <p>{t('Zaloguj się przez Twitch albo Kick. Konto zostaje właścicielem panelu: tylko ono podepnie albo odłączy kanał, zmieni klucz i usunie panel. Sam link docka wystarcza wyłącznie do sterowania overlayami.')}</p>
      )}
      {notice && <p className={notice.ok ? 'pn-ok' : 'pn-error'}>{notice.text}</p>}
      <div className="pn-row">
        {(['twitch', 'kick'] as const).filter((pl) => !accounts.some((a) => a.platform === pl)).map((pl) => (
          <button key={pl} type="button" className={`pn-login is-${pl}`} disabled={me ? !me[pl] : true} onClick={() => login(pl)}>
            {accounts.length ? `${t('Dodaj')} ${PLATFORM_NAME[pl]}` : `${t('Zaloguj przez')} ${PLATFORM_NAME[pl]}`}
          </button>
        ))}
        {accounts.length > 0 && <button type="button" className="pn-ghost" onClick={onLogout}>{t('Wyloguj')}</button>}
      </div>
      {me && !me.twitch && !me.kick && <p className="pn-note">{t('Logowanie nie jest jeszcze włączone na serwerze.')}</p>}
      {!me && <p className="pn-note">{t('Serwer nie odpowiada. Spróbuj za chwilę.')}</p>}
      {error && <p className="pn-error">{error}</p>}
    </section>
  );
};

export const PanelSetup = () => {
  const { t } = useT();
  const [key, setKey] = useState<string | null>(savedKey);
  const room = useRoomId(key);
  const { snap } = useRoom(room, true);
  const { me, refresh } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importText, setImportText] = useState('');
  const [claimState, setClaimState] = useState<'' | 'mine' | 'other' | 'unowned'>('');
  const dockUrl = key ? `${window.location.origin}/panel/dock#k=${key}` : '';
  const loggedIn = (me?.accounts.length ?? 0) > 0;
  const owns = Boolean(room && me?.panels.some((p) => p.room === room));

  useEffect(() => { document.title = `${t('Panel OBS')} | VXH Overlays`; }, [t]);

  // Logged in with this device's key: make the account the panel's owner (or find out it belongs to someone else).
  useEffect(() => {
    if (!key || !room || !me) return;
    if (owns) { setClaimState('mine'); return; }
    if (!loggedIn) { setClaimState('unowned'); return; }
    void claimPanel(key).then((r) => {
      if (r.ok) { setClaimState('mine'); void refresh(); } else setClaimState(r.status === 403 ? 'other' : 'unowned');
    });
  }, [key, room, me, owns, loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setBusy(true); setError('');
    try {
      const k = await createKey();
      setKey(k);
      await claimPanel(k);
      await refresh();
    } catch { setError(t('Nie udało się utworzyć panelu. Spróbuj za chwilę.')); }
    setBusy(false);
  };
  /** Logged-in owner on a device without the key (or after a leak): new key for the same panel. */
  const newKeyFor = async (target: string) => {
    if (!window.confirm(t('Stary link docka przestanie działać, linki overlayów w OBS zostają bez zmian. Utworzyć nowy klucz?'))) return;
    setBusy(true); setError('');
    const k = await rotateKey(target);
    if (k) setKey(k); else setError(t('Nie udało się utworzyć nowego klucza. Zaloguj się kontem właściciela.'));
    setBusy(false);
  };
  const regenerate = async () => {
    if (!key) return;
    if (owns && room) { await newKeyFor(room); return; }
    if (!window.confirm(t('Stary link docka i połączone overlaye przestaną działać. Utworzyć nowy klucz?'))) return;
    setBusy(true);
    const r = await drop(key).catch(() => null);
    if (r && !r.ok) { setError(t('Ten panel ma właściciela. Zaloguj się jego kontem, żeby zmienić klucz.')); setBusy(false); return; }
    forgetKey();
    try { const k = await createKey(); setKey(k); if (loggedIn) await claimPanel(k); await refresh(); } catch { setKey(null); setError(t('Nie udało się utworzyć panelu. Spróbuj za chwilę.')); }
    setBusy(false);
  };
  const importKey = async () => {
    const k = /#k=([A-Za-z0-9_-]{43})/.exec(importText)?.[1] ?? importText.trim();
    if (!isKey(k)) { setError(t('To nie jest link ani klucz panelu.')); return; }
    const r = await claim(k);
    if (!r.ok) { setError(r.status === 403 ? t('Ten klucz został zastąpiony nowym.') : t('Nie udało się utworzyć panelu. Spróbuj za chwilę.')); return; }
    if (typeof r.data?.room === 'string') await rememberRoom(k, r.data.room);
    saveKey(k); setKey(k); setImportText(''); setError('');
  };
  const doLogout = async () => { await logout(); await refresh(); setClaimState(key ? 'unowned' : ''); };

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

        <AccountCard me={me} panelKey={key} onLogout={doLogout} />

        {!key ? (
          <>
          <section className="pn-card">
            <h2>{t('Utwórz swój panel')}</h2>
            {loggedIn && me?.panels.length ? (
              <>
                <p>{t('Masz już panel na tym koncie. Utwórz dla tego komputera nowy link docka: linki overlayów w OBS zostają bez zmian, stary link docka przestanie działać.')}</p>
                {me.panels.map((pn) => (
                  <div key={pn.room} className="pn-row">
                    <span className="pn-linked">{Object.entries(pn.links).map(([pl, login]) => `${PLATFORM_NAME[pl as 'twitch' | 'kick']}: ${login}`).join(' · ') || pn.room.slice(0, 8)}</span>
                    <button type="button" className="pn-primary" disabled={busy} onClick={() => newKeyFor(pn.room)}>{t('Nowy link docka')}</button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p>{t('Twoja przeglądarka wylosuje tajny klucz. Serwer zna tylko jego skrót, więc nikt inny nie dostanie tego samego klucza ani nie zmieni Twoich overlayów.')}</p>
                <button type="button" className="pn-primary pn-big" disabled={busy || !loggedIn} onClick={create}>{busy ? '…' : t('Utwórz panel')}</button>
                {!loggedIn && <p className="pn-note">{t('Najpierw zaloguj się przez Twitch albo Kick: konto zostanie właścicielem panelu.')}</p>}
              </>
            )}
            <details className="pn-import">
              <summary>{t('Mam już panel na innym komputerze')}</summary>
              <div className="pn-copy">
                <input value={importText} onChange={(e) => setImportText(e.currentTarget.value)} placeholder={t('Wklej link docka')} />
                <button type="button" className="pn-primary" onClick={importKey}>{t('Użyj')}</button>
              </div>
            </details>
            {error && <p className="pn-error">{error}</p>}
          </section>
          <AppCard dockUrl="" />
          </>
        ) : (
          <>
            {claimState === 'other' && <p className="pn-error pn-banner">{t('Ten panel należy do innego konta. Zaloguj się kontem, które go utworzyło.')}</p>}
            {claimState === 'unowned' && !loggedIn && <p className="pn-warn pn-banner">🔓 {t('Ten panel nie ma jeszcze właściciela. Zaloguj się przez Twitch albo Kick, żeby nikt z samym linkiem docka nie mógł go przejąć.')}</p>}
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
              <div className="pn-row">
                {['counter', 'scoreboard', 'subathon', 'wheel', 'alertbox', 'burst'].map((id) => OVERLAYS.find((o) => o.id === id)).map((o) => o && (
                  <Link key={o.id} className="pn-ghost" to={`/${o.id}`}>{o.icon} {t(o.name)}</Link>
                ))}
              </div>
            </section>
            <ChannelsCard panelKey={key} room={room} owner={owns} me={me} state={snap?.state ?? null} />
            <AppCard dockUrl={dockUrl} />
            <section className="pn-card">
              <h2><span className="pn-step">4</span>{t('Sprawdź')}</h2>
              <p>{t('Otwórz panel tutaj w przeglądarce i pokliknij: zmiany od razu widać w OBS.')}</p>
              <a className="pn-ghost" href={dockUrl} target="_blank" rel="noreferrer">{t('Otwórz panel w nowej karcie')} ↗</a>
            </section>
            <section className="pn-card pn-danger">
              <h2>{t('Nowy klucz')}</h2>
              <p>{owns
                ? t('Gdy link docka wyciekł, utwórz nowy klucz. Stary link docka przestanie działać, a linki overlayów w OBS zostają bez zmian.')
                : t('Gdy klucz wyciekł, utwórz nowy. Stary link docka i podłączone overlaye przestaną działać, trzeba je podmienić w OBS.')}</p>
              <button type="button" className="pn-ghost" disabled={busy || claimState === 'other'} onClick={regenerate}>{t('Utwórz nowy klucz')}</button>
              {error && <p className="pn-error">{error}</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

/* ===================== linked Twitch / Kick channels ===================== */
const FX_OPTIONS: [string, string][] = [['confetti', tx('Konfetti')], ['hearts', tx('Serca')], ['stars', tx('Gwiazdki')], ['money', tx('Kasa')], ['wheel', tx('Zakręć kołem')]];
const GOAL_AUTO: [string, string][] = [['', tx('Ręcznie (z docka)')], ['follows', tx('Followy')], ['subs', tx('Suby')], ['bits', tx('Bitsy')], ['kicks', tx('Kicks')]];
const AUTO_TIME: [string, string][] = [['sub', tx('Sub')], ['gift', tx('Gift sub (za sztukę)')], ['bits100', tx('100 bitsów')], ['kicks100', tx('100 Kicks')], ['follow', tx('Follow')]];

const ChannelsCard = ({ panelKey, room, owner, me, state }: { panelKey: string; room: string | null; owner: boolean; me: Me | null; state: PanelState | null }) => {
  const { t } = useT();
  const [reward, setReward] = useState('');
  const [fx, setFx] = useState('confetti');
  const [error, setError] = useState('');
  const links = state?.links ?? {};
  const rewardFx = state?.rewardFx ?? {};
  const autoTime = (state as (PanelState & { autoTime?: Record<string, number> }) | null)?.autoTime ?? {};
  const goalAuto = (state?.goal as { auto?: string | null } | undefined)?.auto ?? '';
  const send = (patch: object) => void update(panelKey, patch);
  const link = async (platform: 'twitch' | 'kick') => {
    setError('');
    const err = await loginWith(platform, panelKey);
    if (err) setError(err === 'not_configured' ? t('Logowanie przez ten serwis nie jest jeszcze włączone na serwerze.') : t('Logowanie się nie udało. Spróbuj jeszcze raz.'));
  };
  const unlink = async (platform: 'twitch' | 'kick') => {
    if (!room) return;
    const r = await unlinkChannel(room, platform);
    if (!r.ok) setError(t('Odłączyć kanał może tylko zalogowany właściciel panelu.'));
  };
  return (
    <section className="pn-card">
      <h2><span className="pn-step">3</span>{t('Kanały Twitch i Kick')}</h2>
      <p>{t('Podpięty kanał sam wysyła follow, suby, gifty, bitsy, raidy i nagrody za punkty do „Alertów z panelu”, liczy je w licznikach, w pasku celu i w subathonie. Hasło ani token nie trafiają do linku OBS.')}</p>
      <div className="pn-connect">
        {(['twitch', 'kick'] as const).map((pl) => (
          <div key={pl} className={`pn-connect-row is-${pl}`}>
            <b>{PLATFORM_NAME[pl]}</b>
            {links[pl] ? (
              <>
                <span className="pn-linked">✓ {links[pl]}</span>
                {owner && <button type="button" className="pn-ghost" onClick={() => unlink(pl)}>{t('Odłącz')}</button>}
              </>
            ) : (
              <button type="button" className={`pn-login is-${pl}`} disabled={me ? !me[pl] : true} onClick={() => link(pl)}>{t('Zaloguj i podepnij')}</button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="pn-error">{error}</p>}

      <h3 className="pn-sub">{t('Automaty')}</h3>
      <div className="pn-auto">
        <label>{t('Pasek celu liczy sam')}
          <select value={goalAuto ?? ''} onChange={(e) => send({ goal: { auto: e.currentTarget.value } })}>
            {GOAL_AUTO.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
          </select>
        </label>
        <p className="pn-note">{t('Liczniki „follows”, „subs”, „bits”, „gifts”, „kicks” i „raids” rosną same; pokażesz je widżetem „Licznik” i wyzerujesz w docku.')}</p>
        <b className="pn-auto-head">{t('Subathon: ile minut dodać')}</b>
        <div className="pn-auto-grid">
          {AUTO_TIME.map(([k, l]) => (
            <label key={k}>{t(l)}
              <input type="number" min={0} max={120} step={0.5} defaultValue={autoTime[k] ?? ''} placeholder="0"
                onBlur={(e) => send({ autoTime: { [k]: Number(e.currentTarget.value) || 0 } })} />
            </label>
          ))}
        </div>
        <p className="pn-note">{t('Działa, gdy licznik w docku odlicza w dół (subathon albo odliczanie).')}</p>
      </div>

      <h3 className="pn-sub">{t('Nagroda kanału → efekt')}</h3>
      <p className="pn-note">{t('Wpisz nazwę nagrody dokładnie jak na Twitchu lub Kicku. Gdy ktoś ją odbierze, odpali się wybrany efekt.')}</p>
      {Object.entries(rewardFx).map(([title, f]) => (
        <div key={title} className="pn-row pn-fx-row">
          <span>{title}</span><b>→ {t(FX_OPTIONS.find((o) => o[0] === f)?.[1] ?? f)}</b>
          <button type="button" className="pn-ghost" onClick={() => send({ rewardFx: { [title]: null } })}>✕</button>
        </div>
      ))}
      <div className="pn-row">
        <input value={reward} maxLength={60} onChange={(e) => setReward(e.currentTarget.value)} placeholder={t('Nazwa nagrody')} />
        <select value={fx} onChange={(e) => setFx(e.currentTarget.value)}>{FX_OPTIONS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select>
        <button type="button" className="pn-ghost" disabled={!reward.trim()} onClick={() => { send({ rewardFx: { [reward.trim()]: fx } }); setReward(''); }}>{t('Dodaj')}</button>
      </div>
    </section>
  );
};

const APP_REPO = 'https://github.com/skullboypl/Overlays-VXH';
// shortcut: "latest" is fine while the repo only publishes app releases (tool-v*); if site releases appear, point this at the install script instead.
const APP_EXE = `${APP_REPO}/releases/latest/download/VXH.Overlays.Tool.exe`;
const INSTALL_CMD = 'irm https://overlays.vxh.pl/install.ps1 | iex';

/** The PC app (VXH Overlays Tool): one click hands it the dock link through the "vxh-tool://" link it registered. */
const AppCard = ({ dockUrl }: { dockUrl: string }) => {
  const { t } = useT();
  const ref = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState(false);
  // The app's "Connect to the panel" button opens /panel?app=connect: show this card first.
  // The site menu links to /panel#app.
  const fromApp = new URLSearchParams(window.location.search).get('app') === 'connect' || window.location.hash === '#app';
  useEffect(() => { if (fromApp) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [fromApp]);
  const connect = () => {
    setOpened(true);
    window.location.href = `vxh-tool://connect?link=${encodeURIComponent(dockUrl)}`;
  };
  return (
    <section ref={ref} id="app" className={`pn-card ${fromApp ? 'pn-highlight' : ''}`}>
      <h2>💻 {t('Aplikacja VXH Overlays Tool')}</h2>
      <p>{t('Aplikacja na Windows w zasobniku: „Teraz gra” ze Spotify i YouTube, !skip i !voteskip z czatu, czat TikTok LIVE z Twojego internetu.')}</p>
      <h3 className="pn-sub">{t('1. Zainstaluj (jedna komenda)')}</h3>
      <p className="pn-note">{t('Wklej w PowerShell (Win + X → Terminal) i naciśnij Enter. Bez praw administratora; ta sama komenda aktualizuje starszą wersję.')}</p>
      <CopyField value={INSTALL_CMD} />
      <div className="pn-row">
        <a className="pn-ghost" href={APP_EXE} rel="noreferrer">⬇ {t('Pobierz .exe')}</a>
        <a className="pn-ghost" href={`${APP_REPO}/releases`} target="_blank" rel="noreferrer">{t('Wszystkie wersje')} ↗</a>
        <a className="pn-ghost" href={`${APP_REPO}/tree/tool-v2.0.1/tools/overlays-tool`} target="_blank" rel="noreferrer">{t('Kod źródłowy (GitHub)')} ↗</a>
      </div>
      <p className="pn-note">✔ {t('Plik jest podpisany certyfikatem EV SkullMedia, a aplikacja sama się aktualizuje.')}</p>
      <h3 className="pn-sub">{t('2. Połącz z panelem')}</h3>
      {dockUrl ? (
        <div className="pn-row">
          <button type="button" className="pn-primary" onClick={connect}>{t('Połącz z VXH Overlays Tool')}</button>
        </div>
      ) : <p className="pn-note">{t('Najpierw utwórz panel powyżej, potem połączysz go z aplikacją jednym kliknięciem.')}</p>}
      {opened && <p className="pn-note">{t('Przeglądarka zapyta, czy otworzyć aplikację: zgódź się. Nic się nie stało? Zainstaluj aplikację albo w niej wybierz „Wklej link docka” po skopiowaniu linku z kroku 1.')}</p>}
      <p className="pn-note">🔒 {t('Link docka trafia tylko do aplikacji na tym komputerze, nie przez żaden serwer.')}</p>
    </section>
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

      <LiveControls state={s} send={send} />

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

/* Counters, score, one-shot effects and manual alerts (newer widgets: counter, scoreboard, wheel, burst, alertbox). */
const COUNTER_NAMES: [string, string, string][] = [
  ['deaths', '💀', tx('Śmierci')], ['wins', '🏆', tx('Wygrane')], ['losses', '❌', tx('Przegrane')], ['kills', '🎯', tx('Kille')], ['count', '🔢', tx('Licznik ogólny')],
  ['follows', '❤️', tx('Followy')], ['subs', '⭐', tx('Suby')], ['bits', '💎', tx('Bitsy')], ['gifts', '🎁', tx('Gift suby')], ['kicks', '🟢', tx('Kicks')], ['raids', '🚀', tx('Raidy')],
];
const BURSTS: [string, string, string][] = [['confetti', '🎉', tx('Konfetti')], ['hearts', '❤️', tx('Serca')], ['stars', '⭐', tx('Gwiazdki')], ['money', '💸', tx('Kasa')]];
const ALERT_KINDS: [string, string][] = [['follow', tx('Follow')], ['sub', tx('Sub')], ['donate', tx('Donacja')], ['raid', tx('Raid')], ['bits', tx('Bitsy')], ['custom', tx('Własny tekst')]];
const SHOWN_COUNTERS = 'vxh-overlays:panel-counters';

const LiveControls = ({ state: s, send }: { state: PanelState | null; send: (patch: object) => void }) => {
  const { t } = useT();
  const [shown, setShown] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem(SHOWN_COUNTERS) ?? 'null'); return Array.isArray(v) ? v : ['deaths', 'wins']; } catch { return ['deaths', 'wins']; } });
  const [custom, setCustom] = useState('');
  const [alertKind, setAlertKind] = useState('follow');
  const [alertText, setAlertText] = useState('');
  const counters = s?.counters ?? {};
  const toggle = (name: string) => setShown((list) => {
    const next = list.includes(name) ? list.filter((n) => n !== name) : [...list, name];
    try { localStorage.setItem(SHOWN_COUNTERS, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const names = [...new Set([...shown, ...Object.keys(counters).filter((n) => n !== 'left' && n !== 'right')])];
  const label = (n: string) => COUNTER_NAMES.find((c) => c[0] === n);
  return (
    <>
      <section className="pn-box">
        <h3>🔢 {t('Liczniki')}</h3>
        {names.map((n) => (
          <div key={n} className="pn-counter">
            <span>{label(n)?.[1] ?? '#'} {label(n) ? t(label(n)![2]) : n}</span>
            <b>{counters[n] ?? 0}</b>
            <button type="button" className="pn-ghost" onClick={() => send({ counters: { [n]: { add: -1 } } })}>−1</button>
            <button type="button" className="pn-primary" onClick={() => send({ counters: { [n]: { add: 1 } } })}>+1</button>
            <button type="button" className="pn-ghost" title={t('Reset')} onClick={() => send({ counters: { [n]: { set: 0 } } })}>↺</button>
          </div>
        ))}
        <div className="pn-chips">
          {COUNTER_NAMES.map(([n, icon, l]) => (
            <button key={n} type="button" className={`pn-chip ${shown.includes(n) ? '' : 'is-hidden'}`} onClick={() => toggle(n)}><span>{icon}</span>{t(l)}</button>
          ))}
        </div>
        <div className="pn-row">
          <input value={custom} onChange={(e) => setCustom(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16))} placeholder={t('Własna nazwa licznika')} />
          <button type="button" className="pn-ghost" disabled={!custom} onClick={() => { toggle(custom); send({ counters: { [custom]: { add: 0 } } }); setCustom(''); }}>{t('Dodaj')}</button>
        </div>
      </section>

      <section className="pn-box">
        <h3>🆚 {t('Tablica wyników')}</h3>
        <div className="pn-score">
          {(['left', 'right'] as const).map((side) => (
            <div key={side}>
              <b>{counters[side] ?? 0}</b>
              <div className="pn-row">
                <button type="button" className="pn-ghost" onClick={() => send({ counters: { [side]: { add: -1 } } })}>−1</button>
                <button type="button" className="pn-primary" onClick={() => send({ counters: { [side]: { add: 1 } } })}>+1</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="pn-link" onClick={() => send({ counters: { left: { set: 0 }, right: { set: 0 } } })}>{t('Wyzeruj wynik')}</button>
      </section>

      <section className="pn-box">
        <h3>🎉 {t('Efekty na przycisk')}</h3>
        <div className="pn-row pn-wrap">
          {BURSTS.map(([n, icon, l]) => <button key={n} type="button" className="pn-ghost" onClick={() => send({ fire: n })}>{icon} {t(l)}</button>)}
          <button type="button" className="pn-primary" onClick={() => send({ fire: 'wheel' })}>🎡 {t('Zakręć kołem')}</button>
          <button type="button" className="pn-primary" onClick={() => send({ fire: 'giveaway' })}>🎁 {t('Losuj giveaway')}</button>
        </div>
        <button type="button" className="pn-link" onClick={() => { if (window.confirm(t('Wyzerować ostatnie zdarzenia i ranking donatorów na nowy stream?'))) send({ resetStream: true }); }}>{t('Nowy stream: wyzeruj zdarzenia i ranking')}</button>
      </section>

      <section className="pn-box">
        <h3>🎵 {t('Muzyka (VXH Now Playing)')}</h3>
        <p className="pn-note">{t('Komendy obsługuje aplikacja VXH Now Playing na Twoim PC: czyta czat podpiętego kanału Twitch / Kick i przełącza utwór w Spotify, YouTube i innych odtwarzaczach.')}</p>
        <label className="pn-check"><input type="checkbox" checked={s?.musicCtl?.skip === true} onChange={(e) => send({ musicCtl: { skip: e.currentTarget.checked } })} />
          {t('Skip dla modów i streamera')} <code>{s?.musicCtl?.skipCmd ?? '!skip'}</code></label>
        <label className="pn-check"><input type="checkbox" checked={s?.musicCtl?.vote === true} onChange={(e) => send({ musicCtl: { vote: e.currentTarget.checked } })} />
          {t('Głosowanie widzów na następny')} <code>{s?.musicCtl?.voteCmd ?? '!voteskip'}</code></label>
        <div className="pn-row">
          <label className="pn-inline">{t('Ile głosów')}
            <input type="number" min={2} max={100} defaultValue={s?.musicCtl?.needed ?? 5} onBlur={(e) => send({ musicCtl: { needed: Number(e.currentTarget.value) || 5 } })} />
          </label>
          <label className="pn-inline">{t('Przerwa między skipami (s)')}
            <input type="number" min={0} max={600} defaultValue={s?.musicCtl?.cooldown ?? 20} onBlur={(e) => send({ musicCtl: { cooldown: Number(e.currentTarget.value) || 0 } })} />
          </label>
        </div>
        <div className="pn-row">
          <input defaultValue={s?.musicCtl?.skipCmd ?? '!skip'} maxLength={21} aria-label={t('Komenda skip')} onBlur={(e) => send({ musicCtl: { skipCmd: e.currentTarget.value } })} />
          <input defaultValue={s?.musicCtl?.voteCmd ?? '!voteskip'} maxLength={21} aria-label={t('Komenda głosowania')} onBlur={(e) => send({ musicCtl: { voteCmd: e.currentTarget.value } })} />
        </div>
        <div className="pn-row">
          <button type="button" className="pn-primary" onClick={() => send({ fire: 'musicnext' })}>⏭ {t('Następny utwór')}</button>
        </div>
        {s?.music?.title && <p className="pn-note">🎵 {s.music.title}{s.music.artist ? ` – ${s.music.artist}` : ''}{s.music.needed ? ` · ${t('głosy')}: ${s.music.votes ?? 0}/${s.music.needed}` : ''}</p>}
      </section>

      <section className="pn-box">
        <h3>🔔 {t('Alert')}</h3>
        <div className="pn-seg pn-wrap">
          {ALERT_KINDS.map(([k, l]) => <button key={k} type="button" className={alertKind === k ? 'is-on' : ''} onClick={() => setAlertKind(k)}>{t(l)}</button>)}
        </div>
        <div className="pn-row">
          <input value={alertText} maxLength={140} onChange={(e) => setAlertText(e.currentTarget.value)} placeholder={alertKind === 'custom' ? t('Treść alertu') : t('Nick')}
            onKeyDown={(e) => { if (e.key === 'Enter' && alertText.trim()) { send({ alert: { kind: alertKind, text: alertText } }); setAlertText(''); } }} />
          <button type="button" className="pn-primary" disabled={!alertText.trim()} onClick={() => { send({ alert: { kind: alertKind, text: alertText } }); setAlertText(''); }}>{t('Wyślij')}</button>
        </div>
        {s?.alert && <p className="pn-note">{t('Ostatni')}: {s.alert.text}</p>}
      </section>
    </>
  );
};

export const PANEL_LABEL = tx('Panel OBS');
