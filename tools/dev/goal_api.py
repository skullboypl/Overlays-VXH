"""Goal bar: live follower count from /api/followers, with a "coming soon" placeholder while the server has no API keys."""
R = 'X:/INNE/DEV_PROGRAMOWANIE/overlays/src/'


def edit(f, pairs):
    s = open(R + f, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (f, a[:70])
        s = s.replace(a, b)
    open(R + f, 'w', encoding='utf-8').write(s)


edit('overlays/tools.tsx', [
    ("import { isLang } from '../i18n';", "import { isLang, translate } from '../i18n';"),
    ("""export const GoalWidget = ({ params: p }: { params: Params }) => {
  const lang = langOf(p);
  const current = num(p.current, 0);""",
     """type Channel = { name: string; avatar: string; count: number };
const ERRORS: Record<string, string> = {
  channel_not_found: 'Nie ma takiego kanału',
  bad_channel: 'Wpisz nazwę kanału',
  count_hidden: 'Ten kanał ukrywa liczbę subskrypcji',
};

/** Live follower / subscriber count from /api/followers, refreshed every minute. */
const useChannel = (platform: string, channel: string) => {
  const [state, setState] = useState<{ data: Channel | null; error: string }>({ data: null, error: '' });
  useEffect(() => {
    if (platform === 'manual') { setState({ data: null, error: '' }); return; }
    if (!channel.trim()) { setState({ data: null, error: 'bad_channel' }); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/followers?platform=${platform}&channel=${encodeURIComponent(channel.trim())}`);
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok) setState({ data: { name: body.name, avatar: body.avatar, count: Number(body.count) || 0 }, error: '' });
        else setState((s) => ({ data: s.data, error: body.error ?? 'upstream' }));
      } catch {
        if (alive) setState((s) => ({ data: s.data, error: 'upstream' }));
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [platform, channel]);
  return state;
};

export const GoalWidget = ({ params: p }: { params: Params }) => {
  const lang = langOf(p);
  const platform = String(p.source ?? 'manual');
  const live = useChannel(platform, String(p.channel ?? ''));
  // Without a working API answer the bar falls back to the number typed in the studio.
  const current = live.data ? live.data.count : num(p.current, 0);
  const prev = useRef<number | null>(null);
  const [bump, setBump] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    if (!live.data) return undefined;
    const before = prev.current;
    prev.current = live.data.count;
    if (before === null || live.data.count <= before || p.bump === false) return undefined;
    setBump({ n: live.data.count - before, key: Date.now() });
    const id = window.setTimeout(() => setBump(null), 4500);
    return () => window.clearTimeout(id);
  }, [live.data?.count]); // eslint-disable-line react-hooks/exhaustive-deps"""),
    ("""  return (
    <Shell p={p} kind="goal" className={`look-${look} ${reached && p.celebrate !== false ? 'is-reached' : ''}`}>""",
     """  // The server has no Twitch / YouTube keys yet: an honest "coming soon" card instead of made-up numbers.
  if (platform !== 'manual' && live.error === 'not_configured') {
    return (
      <Shell p={p} kind="goal" className="is-soon">
        <div className="tl-goal-head">
          <span className="tl-label">{String(p.title ?? '')}</span>
          <span className="tl-soon">{translate(lang, 'Wkrótce')}</span>
        </div>
        <div className="tl-goal-bar"><i style={{ width: '0%' }} /></div>
        <div className="tl-goal-error">{translate(lang, platform === 'twitch' ? 'Licznik followów z Twitcha pojawi się wkrótce' : 'Licznik subskrypcji z YouTube pojawi się wkrótce')}</div>
      </Shell>
    );
  }
  const who = live.data && p.showChannel !== false && (
    <span className="tl-goal-who">{live.data.avatar && <img src={live.data.avatar} alt="" />}<span>{live.data.name}</span></span>
  );
  const problem = platform !== 'manual' && live.error && p._preview === true && (
    <div className="tl-goal-error">{translate(lang, ERRORS[live.error] ?? 'Nie udało się pobrać liczby, pokazuję wpisaną')}</div>
  );
  return (
    <Shell p={p} kind="goal" className={`look-${look} ${reached && p.celebrate !== false ? 'is-reached' : ''}`}>
      {who}
      {bump && <span key={bump.key} className="tl-goal-bump">+{bump.n}</span>}"""),
    ("""      {reached && p.celebrate !== false && <div className="tl-confetti\"""",
     """      {problem}
      {reached && p.celebrate !== false && <div className="tl-confetti\""""),
])

edit('overlays/registry.ts', [
    ("""      { group: 'Cel', key: 'title', i18n: true, label: 'Nazwa celu', type: 'text', default: 'Cel followów', maxLength: 40 },
      { group: 'Cel', key: 'current', label: 'Teraz', type: 'text', default: '68', maxLength: 10, placeholder: '68', hint: 'Zmień liczbę tutaj i odśwież źródło w OBS' },""",
     """      { group: 'Cel', key: 'source', label: 'Skąd liczba', type: 'select', default: 'manual', options: [
        { value: 'manual', label: 'Wpisuję sam' }, { value: 'twitch', label: 'Followy na Twitchu' }, { value: 'youtube', label: 'Subskrypcje na YouTube' },
      ], hint: 'Twitch i YouTube: liczba odświeża się sama co minutę. Wpisuję sam: np. zbiórka albo cel donejtów.' },
      { group: 'Cel', key: 'channel', label: 'Kanał', type: 'text', default: 'skullboypl', maxLength: 32, placeholder: 'nick albo @handle', when: { key: 'source', is: ['twitch', 'youtube'] } },
      { group: 'Cel', key: 'showChannel', label: 'Pokaż avatar i nazwę kanału', type: 'toggle', default: true, when: { key: 'source', is: ['twitch', 'youtube'] } },
      { group: 'Cel', key: 'bump', label: 'Animacja „+1” przy nowym followie', type: 'toggle', default: true, when: { key: 'source', is: ['twitch', 'youtube'] } },
      { group: 'Cel', key: 'title', i18n: true, label: 'Nazwa celu', type: 'text', default: 'Cel followów', maxLength: 40 },
      { group: 'Cel', key: 'current', label: 'Teraz', type: 'text', default: '68', maxLength: 10, placeholder: '68', when: { key: 'source', is: ['manual'] }, hint: 'Zmień liczbę tutaj i odśwież źródło w OBS' },"""),
])

open(R + 'overlays/tools.css', 'a', encoding='utf-8').write('''
/* Goal from the Twitch / YouTube API: channel badge, "+1" on a new follow, notes, "coming soon" card. */
.tl-goal .tl-card { overflow: visible; }
.tl-goal-who { display: flex; align-items: center; gap: 0.3em; font-size: 0.45em; font-weight: 700; opacity: 0.9; align-self: flex-start; }
.tl-goal-who img { width: 1.6em; height: 1.6em; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 0.12em var(--accent); }
.tl-goal.look-ring .tl-goal-who { position: absolute; top: -0.9em; left: 0.4em; }
.tl-goal-bump {
  position: absolute;
  right: 0.4em;
  top: -0.3em;
  padding: 0.1em 0.45em;
  border-radius: 1em;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  font-size: 0.6em;
  box-shadow: 0 0 0.6em var(--accent);
  animation: tl-bump 4.5s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
@keyframes tl-bump {
  0% { transform: translateY(0.6em) scale(0.4); opacity: 0; }
  12% { transform: translateY(-0.2em) scale(1.15); opacity: 1; }
  20%, 80% { transform: none; opacity: 1; }
  100% { transform: translateY(-0.8em); opacity: 0; }
}
.tl-goal-error { font-size: 0.36em; opacity: 0.75; text-align: left; }
.tl-soon {
  font-size: 0.42em;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.25em 0.7em;
  border-radius: 1em;
  background: color-mix(in srgb, var(--accent) 25%, transparent);
  border: 1px solid var(--accent);
  color: var(--fg);
  animation: tl-soon 2.4s ease-in-out infinite;
}
@keyframes tl-soon { 50% { opacity: 0.55; } }
.tl-goal.is-soon .tl-goal-bar { background: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.08) 0 0.25em, rgba(255, 255, 255, 0.14) 0.25em 0.5em); }
''')
print('ok')
