import { useEffect, useRef } from 'react';
import type { Params } from './schema';
import { startParticles, type ParticleKind } from './particles';
import { startFireworks, startStars } from './sky';

export type EffectKind = ParticleKind | 'fireworks' | 'stars';
export const EFFECT_KINDS: EffectKind[] = ['snow', 'rain', 'confetti', 'emoji', 'fireflies', 'petals', 'fireworks', 'stars',
  'embers', 'bubbles', 'bokeh', 'sparkles', 'balloons', 'meteors', 'digital'];

// Settings read only when a particle spawns; changing them restarts the effect so the preview reacts at once.
const SPAWN_KEYS = ['color', 'colors', 'emoji', 'flakes', 'blur', 'shape', 'mode', 'area', 'from'];

const start = (kind: EffectKind, canvas: HTMLCanvasElement, get: () => Params) => {
  if (kind === 'fireworks') return startFireworks(canvas, get);
  if (kind === 'stars') return startStars(canvas, get);
  return startParticles(canvas, kind, get);
};

export const ParticleLayer = ({ kind, params }: { kind: EffectKind; params: Params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef(params);
  const engineRef = useRef<ReturnType<typeof start> | null>(null);
  paramsRef.current = params;

  useEffect(() => {
    const engine = start(kind, canvasRef.current!, () => paramsRef.current);
    engineRef.current = engine;
    return engine.stop;
  }, [kind]);

  const spawnKey = JSON.stringify(SPAWN_KEYS.map((k) => params[k]));
  useEffect(() => engineRef.current?.reset(), [spawnKey]);

  return <canvas ref={canvasRef} className="ov-fill" />;
};
