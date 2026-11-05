// Gettext-style i18n: the Polish text is the key. Missing strings fall back to English, then Polish.
// Dictionaries live in ./locales/<id>.json as { "<polish>": "<translation>" }.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type LangId = 'pl' | 'en' | 'de' | 'cs' | 'es' | 'fr' | 'pt' | 'ru' | 'tr' | 'uk';

const ALL_LANGS: { id: LangId; name: string; locale: string }[] = [
  { id: 'pl', name: 'Polski', locale: 'pl_PL' },
  { id: 'en', name: 'English', locale: 'en_US' },
  { id: 'de', name: 'Deutsch', locale: 'de_DE' },
  { id: 'cs', name: 'Čeština', locale: 'cs_CZ' },
  { id: 'es', name: 'Español', locale: 'es_ES' },
  { id: 'fr', name: 'Français', locale: 'fr_FR' },
  { id: 'pt', name: 'Português', locale: 'pt_BR' },
  { id: 'ru', name: 'Русский', locale: 'ru_RU' },
  { id: 'tr', name: 'Türkçe', locale: 'tr_TR' },
  { id: 'uk', name: 'Українська', locale: 'uk_UA' },
];

type Dict = Record<string, string>;
const files = import.meta.glob<Dict>('./locales/*.json', { eager: true, import: 'default' });
const DICTS: Partial<Record<LangId, Dict>> = Object.fromEntries(
  Object.entries(files).map(([path, dict]) => [path.match(/(\w+)\.json$/)![1], dict]),
);

/** Only languages with a dictionary are offered; a new locales/<id>.json switches one on. */
export const LANGS = ALL_LANGS.filter((l) => l.id === 'pl' || DICTS[l.id]);

export const isLang = (v: unknown): v is LangId => LANGS.some((l) => l.id === v);

/** Translate one Polish string. `{0}`, `{1}` are replaced with params. */
export const translate = (lang: LangId, pl: string, params: (string | number)[] = []) => {
  let out = lang === 'pl' ? pl : DICTS[lang]?.[pl] || DICTS.en?.[pl] || pl;
  params.forEach((p, i) => (out = out.replace(`{${i}}`, String(p))));
  return out;
};

const STORAGE = 'vxh-overlays:lang';

/** ?lang= → saved choice → browser languages → English. */
export const detectLang = (): LangId => {
  if (typeof window === 'undefined') return 'pl';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  const fromPath = window.location.pathname.split('/')[1];
  if (isLang(fromPath)) return fromPath;
  try {
    const saved = localStorage.getItem(STORAGE);
    if (isLang(saved)) return saved;
  } catch { /* storage blocked */ }
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return 'en';
};

type Ctx = { lang: LangId; setLang: (l: LangId) => void; t: (pl: string, params?: (string | number)[]) => string };
const LangContext = createContext<Ctx>({ lang: 'pl', setLang: () => {}, t: (pl) => pl });

export const LangProvider = ({ children, initial }: { children: ReactNode; initial?: LangId }) => {
  const [lang, setLangState] = useState<LangId>(() => initial ?? detectLang());
  const value = useMemo<Ctx>(() => ({
    lang,
    setLang: (l) => {
      setLangState(l);
      try { localStorage.setItem(STORAGE, l); } catch { /* ignore */ }
      document.documentElement.lang = l;
    },
    t: (pl, params) => translate(lang, pl, params),
  }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useT = () => useContext(LangContext);

/** Marks a string for extraction without translating it here (used in data like the registry). */
export const tx = (pl: string) => pl;
