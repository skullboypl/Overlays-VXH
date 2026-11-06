import type { Params } from './schema';
import { Background, effectLayer } from './SceneScreen';
import { ParticleLayer } from './ParticleLayer';
import { GrainLayer } from './GrainLayer';

/** "Tło wideo": a looping realistic video on the whole scene, with optional effect, vignette and grain. */
export const VideoScene = ({ params }: { params: Params }) => {
  const colors = (params.colors as string[]) ?? ['#ff5900', '#ff2d6f', '#7a5cff'];
  const effect = String(params.effect ?? 'none');
  const fx = effectLayer(effect, colors);
  return (
    <div className="sc-root" style={{ '--c1': colors[0], '--c3': colors[2] ?? colors[0] } as React.CSSProperties}>
      <Background bg={String(params.bg)} colors={colors} params={params} />
      {fx && <ParticleLayer key={effect} kind={fx.kind} params={fx.params} />}
      {params.vignette && <div className="sc-vignette" />}
      {params.grain && <GrainLayer params={{ grain: 0.35, vignette: 0, scanlines: false, flicker: false }} />}
    </div>
  );
};
