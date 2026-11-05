import type { Params } from './schema';
import { Background, EFFECT_DEFAULTS } from './SceneScreen';
import { ParticleLayer, type EffectKind } from './ParticleLayer';
import { GrainLayer } from './GrainLayer';

/** "Tło wideo": a looping realistic video on the whole scene, with optional effect, vignette and grain. */
export const VideoScene = ({ params }: { params: Params }) => {
  const colors = (params.colors as string[]) ?? ['#ff5900', '#ff2d6f', '#7a5cff'];
  const effect = String(params.effect ?? 'none');
  return (
    <div className="sc-root" style={{ '--c1': colors[0], '--c3': colors[2] ?? colors[0] } as React.CSSProperties}>
      <Background bg={String(params.bg)} colors={colors} params={params} />
      {effect !== 'none' && EFFECT_DEFAULTS[effect] && (
        <ParticleLayer key={effect} kind={effect as EffectKind} params={{ ...EFFECT_DEFAULTS[effect], ...(effect === 'confetti' ? { colors } : {}) }} />
      )}
      {params.vignette && <div className="sc-vignette" />}
      {params.grain && <GrainLayer params={{ grain: 0.35, vignette: 0, scanlines: false, flicker: false }} />}
    </div>
  );
};
