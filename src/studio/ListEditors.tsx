import { BrandIcon, detectBrand, type Brand } from '../overlays/icons';
import { tx, useT } from '../i18n';

// Empty rows stay while editing; the overlays skip them when rendering.
// Strips only the single space join() adds, so spaces typed inside a row survive.
const split = (v: string) => (v.trim() ? v.split(/ ?\| ?/) : []);
const join = (rows: string[]) => rows.map((r) => r.replace(/\|/g, '/')).join(' | ');

const SERVICES: { brand: Brand; label: string; prefix: string; placeholder: string }[] = [
  { brand: 'twitch', label: 'Twitch', prefix: 'twitch.tv/', placeholder: tx('nick') },
  { brand: 'kick', label: 'Kick', prefix: 'kick.com/', placeholder: tx('nick') },
  { brand: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', placeholder: tx('kanał') },
  { brand: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', placeholder: tx('nick') },
  { brand: 'discord', label: 'Discord', prefix: 'discord.gg/', placeholder: tx('kod zaproszenia') },
  { brand: 'instagram', label: 'Instagram', prefix: 'instagram.com/', placeholder: tx('nick') },
  { brand: 'x', label: 'X / Twitter', prefix: 'x.com/', placeholder: tx('nick') },
  { brand: 'facebook', label: 'Facebook', prefix: 'facebook.com/', placeholder: tx('strona') },
  { brand: 'bluesky', label: 'Bluesky', prefix: 'bsky.app/profile/', placeholder: tx('nick') },
  { brand: 'threads', label: 'Threads', prefix: 'threads.net/@', placeholder: tx('nick') },
  { brand: 'spotify', label: 'Spotify', prefix: 'open.spotify.com/', placeholder: 'playlist/…' },
  { brand: 'steam', label: 'Steam', prefix: 'steamcommunity.com/id/', placeholder: tx('nick') },
  { brand: 'reddit', label: 'Reddit', prefix: 'reddit.com/r/', placeholder: 'subreddit' },
  { brand: 'github', label: 'GitHub', prefix: 'github.com/', placeholder: tx('nick') },
  { brand: 'patreon', label: 'Patreon', prefix: 'patreon.com/', placeholder: tx('nick') },
  { brand: 'kofi', label: 'Ko-fi', prefix: 'ko-fi.com/', placeholder: tx('nick') },
  { brand: 'paypal', label: 'PayPal', prefix: 'paypal.me/', placeholder: tx('nick') },
  { brand: 'tipply', label: 'Tipply', prefix: 'tipply.pl/@', placeholder: tx('nick') },
  { brand: 'patronite', label: 'Patronite', prefix: 'patronite.pl/', placeholder: tx('nick') },
  { brand: 'email', label: 'E-mail', prefix: '', placeholder: 'kontakt@…' },
  { brand: 'link', label: tx('Inny link / tekst'), prefix: '', placeholder: tx('np. sklep.pl albo !discord') },
];

const toRow = (entry: string) => {
  const brand = detectBrand(entry);
  const svc = SERVICES.find((s) => s.brand === brand) ?? SERVICES[SERVICES.length - 1];
  const bare = entry.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const nick = svc.prefix && bare.toLowerCase().startsWith(svc.prefix.toLowerCase()) ? bare.slice(svc.prefix.length) : bare;
  return { svc, nick };
};

const Row = ({ children, onUp, onRemove, first }: { children: React.ReactNode; onUp: () => void; onRemove: () => void; first: boolean }) => {
  const { t } = useT();
  return (
  <div className="st-listrow">
    {children}
    <button type="button" className="st-icon-btn" onClick={onUp} disabled={first} aria-label={t('Przesuń wyżej')} title={t('Wyżej')}>↑</button>
    <button type="button" className="st-icon-btn" onClick={onRemove} aria-label={t('Usuń')} title={t('Usuń')}>✕</button>
  </div>
  );
};

const moveUp = <T,>(list: T[], i: number) => {
  if (i === 0) return list;
  const next = [...list];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return next;
};

export const LinesEditor = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
  const { t } = useT();
  const rows = split(value);
  const set = (next: string[]) => onChange(join(next));
  return (
    <div className="st-list-editor">
      {rows.map((r, i) => (
        <Row key={i} first={i === 0} onUp={() => set(moveUp(rows, i))} onRemove={() => set(rows.filter((_, j) => j !== i))}>
          <input className="st-text" value={r} placeholder={placeholder && t(placeholder)} onChange={(e) => set(rows.map((x, j) => (j === i ? e.currentTarget.value : x)))} />
        </Row>
      ))}
      <button type="button" className="st-add-row" onClick={() => set([...rows, t('Nowy tekst')])}>+ {t('Dodaj tekst')}</button>
    </div>
  );
};

export const SocialsEditor = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t } = useT();
  const rows = split(value).map(toRow);
  const set = (next: { svc: (typeof SERVICES)[number]; nick: string }[]) =>
    onChange(join(next.map((r) => r.svc.prefix + r.nick)));
  return (
    <div className="st-list-editor">
      {rows.map((r, i) => (
        <Row key={i} first={i === 0} onUp={() => set(moveUp(rows, i))} onRemove={() => set(rows.filter((_, j) => j !== i))}>
          <label className="st-svc">
            <span className="st-svc-icon"><BrandIcon brand={r.svc.brand} /></span>
            <select
              value={r.svc.brand}
              aria-label={t('Serwis')}
              onChange={(e) => {
                const svc = SERVICES.find((s) => s.brand === e.currentTarget.value)!;
                set(rows.map((x, j) => (j === i ? { svc, nick: x.nick } : x)));
              }}
            >
              {SERVICES.map((s) => <option key={s.brand} value={s.brand}>{t(s.label)}</option>)}
            </select>
          </label>
          <div className="st-nick">
            {r.svc.prefix && <span>{r.svc.prefix}</span>}
            <input
              value={r.nick}
              placeholder={t(r.svc.placeholder)}
              aria-label={t('Nick lub adres')}
              onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, nick: e.currentTarget.value } : x)))}
            />
          </div>
        </Row>
      ))}
      <button type="button" className="st-add-row" onClick={() => set([...rows, { svc: SERVICES[0], nick: 'twojnick' }])}>+ {t('Dodaj serwis')}</button>
    </div>
  );
};
