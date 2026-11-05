import { useState } from 'react';
import { findOverlay } from '../overlays/registry';
import type { OverlayDef } from '../overlays/schema';
import { deletePreset, encodeBundle, encodeShare, listPresets, parseImport, savePreset, storageWorks, type Preset } from './presets';

type Size = { w: number; h: number };
type Props = {
  def: OverlayDef;
  query: string;
  size: Size;
  setSize: (fn: (s: Size) => Size) => void;
  /** Load a setup: same overlay updates in place, another one navigates. */
  onApply: (overlay: string, query: string) => void;
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
};

const CopyRow = ({ label, value, primary, openable }: { label: string; value: string; primary?: boolean; openable?: boolean }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await copyText(value);
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <div className="st-copyrow">
      <span className="st-copyrow-label">{label}</span>
      <div className="st-link">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label={label} />
        {openable && <a className="st-btn ghost" href={value} target="_blank" rel="noreferrer" title="Otwórz w nowej karcie">↗</a>}
        <button type="button" className={`st-btn ${primary ? 'primary' : 'ghost'} ${done ? 'is-done' : ''}`} onClick={copy}>
          {done ? 'Skopiowano ✓' : 'Kopiuj'}
        </button>
      </div>
    </div>
  );
};

const LocalNotice = () => (
  <p className="st-notice">
    <b>Zapis działa tylko w tej przeglądarce.</b> Ustawienia trzymamy w pamięci przeglądarki (localStorage), nie na serwerze.
    Na innym komputerze, w innej przeglądarce, w trybie incognito albo po wyczyszczeniu danych strony ich nie będzie.
    Żeby przenieść ustawienia, skopiuj <b>kod udostępniania</b> i wklej go na drugim urządzeniu.
  </p>
);

export const OutputPanel = ({ def, query, size, setSize, onApply }: Props) => {
  const [tab, setTab] = useState<'obs' | 'saved' | 'share'>('obs');
  const [presets, setPresets] = useState<Preset[]>(listPresets);
  const [name, setName] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const canStore = storageWorks();

  const origin = window.location.origin;
  const obsUrl = `${origin}/o/${def.id}${query ? `?${query}` : ''}`;
  const studioUrl = `${origin}/${def.id}${query ? `?${query}` : ''}`;
  const code = encodeShare(def.id, query);

  const save = () => {
    const n = name.trim() || `${def.name} ${new Date().toLocaleDateString('pl-PL')}`;
    setPresets(savePreset(def.id, n, query));
    setName('');
  };

  const runImport = () => {
    const res = parseImport(importText);
    if (!res) {
      setImportMsg({ ok: false, text: 'Nie rozpoznaję tego kodu ani linku. Wklej kod zaczynający się od VXH1- albo link z overlays.vxh.pl.' });
      return;
    }
    if (res.entries.length > 1) {
      let list = presets;
      for (const e of res.entries) list = savePreset(e.o, e.n ?? findOverlay(e.o)!.name, e.q);
      setPresets(list);
      setImportMsg({ ok: true, text: `Dodano ${res.entries.length} zapisanych ustawień do listy „Zapisane”.` });
    } else {
      const e = res.entries[0];
      if (e.n) setPresets(savePreset(e.o, e.n, e.q));
      onApply(e.o, e.q);
      setImportMsg({ ok: true, text: `Wczytano: ${findOverlay(e.o)!.name}${e.n ? ` („${e.n}”)` : ''}.` });
    }
    setImportText('');
  };

  return (
    <div className="st-out">
      <div className="st-tabs" role="tablist">
        {([['obs', 'Link do OBS'], ['saved', `Zapisane${presets.length ? ` (${presets.length})` : ''}`], ['share', 'Udostępnij / import']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'obs' && (
        <div className="st-tabpane">
          <CopyRow label="Link do Browser Source (OBS / Streamlabs)" value={obsUrl} primary openable />
          <div className="st-out-meta">
            <div className="st-size">
              <span>Rozmiar źródła</span>
              <input type="number" min={50} max={3840} value={size.w} aria-label="Szerokość"
                onChange={(e) => { const v = Number(e.currentTarget.value); setSize((s) => ({ ...s, w: Math.max(50, v || s.w) })); }} />
              <i>×</i>
              <input type="number" min={50} max={2160} value={size.h} aria-label="Wysokość"
                onChange={(e) => { const v = Number(e.currentTarget.value); setSize((s) => ({ ...s, h: Math.max(50, v || s.h) })); }} />
              <div className="st-size-presets">
                {(def.category === 'camera'
                  ? [[640, 360], [480, 270], [400, 400], [1280, 720]]
                  : def.category === 'widget'
                    ? [[def.size.w, def.size.h], [1280, def.size.h], [800, def.size.h]]
                    : [[1920, 1080], [1280, 720], [2560, 1440]]
                ).map(([w, h]) => (
                  <button key={`${w}x${h}`} type="button" onClick={() => setSize(() => ({ w, h }))} className={size.w === w && size.h === h ? 'is-active' : ''}>
                    {w}×{h}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="st-help-toggle" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
              Jak dodać do OBS? {showHelp ? '▴' : '▾'}
            </button>
          </div>
          {showHelp && (
            <ol className="st-help">
              <li>Skopiuj link przyciskiem <b>Kopiuj</b>.</li>
              <li>W OBS: <b>Źródła → + → Przeglądarka</b> (Browser Source), wklej link w pole URL.</li>
              <li>Ustaw szerokość <b>{size.w}</b> i wysokość <b>{size.h}</b>. Tło jest przezroczyste.</li>
              {def.category === 'camera' && <li>Połóż źródło nad kamerką i dopasuj je do jej rozmiaru.</li>}
              {def.category === 'scene' && <li>Ekran ma własne tło, zrób dla niego osobną scenę („Start”, „Przerwa”, „Koniec”). Czat połóż na zostawionej ramce.</li>}
              {def.category === 'screen' && <li>Przeciągnij źródło na górę listy, żeby efekt był nad grą i kamerką.</li>}
              <li>Zmieniłeś coś później? Skopiuj nowy link i podmień go we właściwościach źródła.</li>
            </ol>
          )}
          <CopyRow label="Link do edycji (otwiera to studio z tymi ustawieniami)" value={studioUrl} />
        </div>
      )}

      {tab === 'saved' && (
        <div className="st-tabpane">
          {!canStore && <p className="st-notice is-warn">Ta przeglądarka blokuje zapis (np. tryb prywatny). Używaj kodów udostępniania.</p>}
          <form className="st-save" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <input className="st-text" value={name} maxLength={40} onChange={(e) => setName(e.currentTarget.value)} placeholder={`Nazwa, np. ${def.name} na święta`} />
            <button type="submit" className="st-btn primary" disabled={!canStore}>Zapisz obecne</button>
          </form>
          <LocalNotice />
          {presets.length === 0 ? (
            <p className="st-empty">Nic jeszcze nie zapisałeś.</p>
          ) : (
            <ul className="st-presets">
              {presets.map((p) => {
                const o = findOverlay(p.overlay)!;
                return (
                  <li key={p.id} className={p.overlay === def.id && p.query === query ? 'is-current' : ''}>
                    <span className="st-presets-icon" aria-hidden>{o.icon}</span>
                    <span className="st-presets-text">
                      <b>{p.name}</b>
                      <small>{o.name} · {new Date(p.savedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}</small>
                    </span>
                    <button type="button" className="st-btn ghost small" onClick={() => onApply(p.overlay, p.query)}>Wczytaj</button>
                    <button type="button" className="st-btn ghost small" title="Kopiuj link do OBS"
                      onClick={() => copyText(`${origin}/o/${p.overlay}${p.query ? `?${p.query}` : ''}`)}>Link</button>
                    <button type="button" className="st-btn ghost small" title="Kopiuj kod udostępniania"
                      onClick={() => copyText(encodeShare(p.overlay, p.query, p.name))}>Kod</button>
                    <button type="button" className="st-btn ghost small danger" aria-label={`Usuń ${p.name}`}
                      onClick={() => setPresets(deletePreset(p.id))}>✕</button>
                  </li>
                );
              })}
            </ul>
          )}
          {presets.length > 1 && (
            <CopyRow label="Kod ze wszystkimi zapisanymi (przeniesiesz całą listę na inny komputer)" value={encodeBundle(presets)} />
          )}
        </div>
      )}

      {tab === 'share' && (
        <div className="st-tabpane">
          <CopyRow label="Kod udostępniania tych ustawień" value={code} primary />
          <p className="st-hint">Wyślij kod znajomemu albo wklej na drugim komputerze. Kod zawiera tylko ustawienia, bez danych osobowych.</p>
          <div className="st-copyrow">
            <span className="st-copyrow-label">Wczytaj kod lub link</span>
            <form className="st-save" onSubmit={(e) => { e.preventDefault(); runImport(); }}>
              <input className="st-text" value={importText} onChange={(e) => setImportText(e.currentTarget.value)} placeholder="VXH1-… albo https://overlays.vxh.pl/o/…" />
              <button type="submit" className="st-btn primary">Wczytaj</button>
            </form>
            {importMsg && <p className={`st-notice ${importMsg.ok ? 'is-ok' : 'is-warn'}`}>{importMsg.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
