import { translate, tx, type LangId } from '../i18n';
import './ai-notice.css';

/** EU AI Act (Regulation 2024/1689, art. 50): a visible note that the graphics were made with AI. */
export const AI_NOTICE_TITLE = tx('Treści wygenerowane przez AI');
export const AI_NOTICE_TEXT = tx('Wszystkie grafiki, tła, filmy, ramki i animowane postacie w VXH Overlays zostały wygenerowane lub utworzone z pomocą sztucznej inteligencji (AI). Informujemy o tym zgodnie z art. 50 rozporządzenia UE 2024/1689 (AI Act). Na overlayach w OBS oznaczenie jest domyślnie wyłączone; możesz je włączyć w ustawieniach overlaya („Oznaczenie AI”).');

export const AiNotice = ({ lang, compact = false }: { lang: LangId; compact?: boolean }) => (
  <aside className={`ai-notice ${compact ? 'is-compact' : ''}`} role="note">
    <span aria-hidden>🤖</span>
    <p><b>{translate(lang, AI_NOTICE_TITLE)}.</b> {translate(lang, AI_NOTICE_TEXT)}</p>
  </aside>
);
