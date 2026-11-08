import type { Params } from './schema';
import { CornersFrame, NameTagFrame, NeonFrame } from './frames';
import { GrainLayer } from './GrainLayer';
import { SceneScreen } from './SceneScreen';
import { HolidayFrame } from './HolidayFrame';
import { FaceitCam, ProFrame } from './ProFrame';
import { CharacterOverlay } from './Character';
import { CamScene } from './CamScene';
import { VideoScene } from './VideoScene';
import { FullCam } from './FullCam';
import { SocialsWidget, TickerWidget } from './widgets';
import { ClockWidget, GoalWidget, QrWidget, ReminderWidget, TimerWidget } from './tools';
import { LowerThirdWidget, QrRotatorWidget, ScheduleWidget, SingleSocialWidget } from './bars';
import { ComicFrame, DoodleFrame, GlitchFrame, HudFrame, OrnateFrame, PixelFrame, PolaroidFrame, RetroFrame } from './frames2';
import { ProScene } from './ProScene';
import { EFFECT_KINDS, ParticleLayer, type EffectKind } from './ParticleLayer';

/** Overlay plus the optional "made with AI" label (EU AI Act), drawn only when the streamer turns it on. */
export const Overlay = ({ id, params }: { id: string; params: Params }) => (
  <>
    <OverlayBody id={id} params={params} />
    {params.aiLabel === true && (
      <div className={`ov-ai-label at-${params.aiLabelPos ?? 'br'}`}>🤖 {String(params.aiLabelText ?? '')}</div>
    )}
  </>
);

const OverlayBody = ({ id, params }: { id: string; params: Params }) => {
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
    case 'camscene': return <CamScene params={params} />;
    case 'videobg': return <VideoScene params={params} />;
    case 'fullcam': return <FullCam params={params} />;
    case 'ticker': return <TickerWidget params={params} />;
    case 'socials': return <SocialsWidget params={params} />;
    case 'timer': return <TimerWidget params={params} />;
    case 'clock': return <ClockWidget params={params} />;
    case 'goal': return <GoalWidget params={params} />;
    case 'reminder': return <ReminderWidget params={params} />;
    case 'qr': return <QrWidget params={params} />;
    case 'lowerthird': return <LowerThirdWidget params={params} />;
    case 'schedule': return <ScheduleWidget params={params} />;
    case 'social': return <SingleSocialWidget params={params} />;
    case 'qrrotator': return <QrRotatorWidget params={params} />;
    case 'glitchframe': return <GlitchFrame params={params} />;
    case 'retroframe': return <RetroFrame params={params} />;
    case 'polaroid': return <PolaroidFrame params={params} />;
    case 'pixelframe': return <PixelFrame params={params} />;
    case 'hudframe': return <HudFrame params={params} />;
    case 'comicframe': return <ComicFrame params={params} />;
    case 'doodleframe': return <DoodleFrame params={params} />;
    case 'ornateframe': return <OrnateFrame params={params} />;
    case 'startpro': return <ProScene kind="starting" params={params} />;
    case 'brbpro': return <ProScene kind="brb" params={params} />;
    case 'endpro': return <ProScene kind="ending" params={params} />;
    default: return null;
  }
};
