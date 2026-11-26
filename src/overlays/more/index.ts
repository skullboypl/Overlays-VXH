// Everything in src/overlays/more, gathered for the registry (definitions) and Overlay.tsx (renderers).
// New overlays only: nothing here changes an overlay that already has published links.
import type { OverlayDef } from '../schema';
import type { Renderer } from './common';
import { EFFECT_DEFS, EFFECT_RENDERERS } from './effects';

export const MORE_DEFS: OverlayDef[] = [...EFFECT_DEFS];
export const MORE_RENDERERS: Record<string, Renderer> = { ...EFFECT_RENDERERS };
/** Menu placement: menu group id (and optional sub-group title) for each new overlay. */
export const MORE_MENU: Record<string, string[]> = {
  'effects:Pogoda i natura': ['smoke', 'fire', 'glassrain', 'drift', 'storm', 'autumn', 'waveslayer', 'flyers'],
  'effects:Światło i klimat': ['rays', 'auroralayer', 'flare', 'heartbeat', 'glitter', 'plexus'],
  'effects:Impreza i święta': ['wordworks', 'imagerain'],
  'effects:Styl obrazu': ['pixelsnow'],
};
