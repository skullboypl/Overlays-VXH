import type { Params } from './schema';
import { CornersFrame, NameTagFrame, NeonFrame } from './frames';
import { GrainLayer } from './GrainLayer';
import { SceneScreen } from './SceneScreen';
import { HolidayFrame } from './HolidayFrame';
import { FaceitCam, ProFrame } from './ProFrame';
import { CharacterOverlay } from './Character';
import { SocialsWidget, TickerWidget } from './widgets';
import { EFFECT_KINDS, ParticleLayer, type EffectKind } from './ParticleLayer';

export const Overlay = ({ id, params }: { id: string; params: Params }) => {
  if ((EFFECT_KINDS as string[]).includes(id)) return <ParticleLayer kind={id as EffectKind} params={params} />;
  switch (id) {
    case 'starting':
    case 'brb':
    case 'ending':
      return <SceneScreen kind={id} params={params} />;
    case 'grain': return <GrainLayer params={params} />;
    case 'neon': return <NeonFrame params={params} />;
    case 'corners': return <CornersFrame params={params} />;
    case 'nametag': return <NameTagFrame params={params} />;
    case 'holiday': return <HolidayFrame params={params} />;
    case 'proframe': return <ProFrame params={params} />;
    case 'faceitcam': return <FaceitCam params={params} />;
    case 'character': return <CharacterOverlay params={params} />;
    case 'ticker': return <TickerWidget params={params} />;
    case 'socials': return <SocialsWidget params={params} />;
    default: return null;
  }
};
