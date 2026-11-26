// Everything in src/overlays/more, gathered for the registry (definitions) and Overlay.tsx (renderers).
// New overlays only: nothing here changes an overlay that already has published links.
import type { OverlayDef } from '../schema';
import type { Renderer } from './common';
import { EFFECT_DEFS, EFFECT_RENDERERS } from './effects';
import { WIDGET_DEFS, WIDGET_RENDERERS } from './widgets';
import { LIVE_DEFS, LIVE_RENDERERS } from './live';

export const MORE_DEFS: OverlayDef[] = [...EFFECT_DEFS, ...WIDGET_DEFS, ...LIVE_DEFS];
export const MORE_RENDERERS: Record<string, Renderer> = { ...EFFECT_RENDERERS, ...WIDGET_RENDERERS, ...LIVE_RENDERERS };
/** Menu placement: menu group id (and optional sub-group title) for each new overlay. */
export const MORE_MENU: Record<string, string[]> = {
  'effects:Pogoda i natura': ['smoke', 'fire', 'glassrain', 'drift', 'storm', 'autumn', 'waveslayer', 'flyers'],
  'effects:Światło i klimat': ['rays', 'auroralayer', 'flare', 'heartbeat', 'glitter', 'plexus'],
  'effects:Impreza i święta': ['wordworks', 'imagerain', 'burst', 'kickrain'],
  'effects:Styl obrazu': ['pixelsnow'],
  bars: ['duo', 'nowplaying', 'sponsors', 'discount', 'brbbadge'],
  tools: ['worldclock', 'streamgoal', 'livecount', 'weather', 'streak'],
  widgets: ['poll', 'giveaway', 'commands', 'facts', 'topdonors', 'leaderboard', 'checklist', 'dice', 'counter', 'scoreboard', 'subathon', 'wheel', 'alertbox'],
};
