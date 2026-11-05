import { useEffect, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { CHARACTERS } from './backgrounds';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * A looping animated character (MiniMax H3 clip with a transparent background, VP9 WebM with alpha)
 * standing in a corner, either all the time or peeking in from the edge every few seconds.
 */
export const CharacterOverlay = ({ params }: { params: Params }) => {
  const id = String(params.char ?? '');
  const c = CHARACTERS[id] ?? Object.values(CHARACTERS)[0];
  const peek = params.mode === 'peek';
  const every = Math.max(3, Number(params.every ?? 20)) * 1000;
  const stay = Math.max(1, Number(params.stay ?? 6)) * 1000;
  const [shown, setShown] = useState(!peek);

  useEffect(() => {
    if (!peek) { setShown(true); return; }
    setShown(false);
    let hide: number | undefined;
    const cycle = () => {
      setShown(true);
      hide = window.setTimeout(() => setShown(false), stay);
    };
    const first = window.setTimeout(cycle, 1200);
    const loop = window.setInterval(cycle, every);
    return () => { clearTimeout(first); clearInterval(loop); clearTimeout(hide); };
  }, [peek, every, stay]);

  if (!c) return null;
  const pos = String(params.position ?? 'br');
  const style: Vars = {
    '--h': `${params.size ?? 45}%`,
    '--off': `${params.offset ?? 2}%`,
    '--shadow': params.shadow ? 'drop-shadow(0 14px 18px rgba(0,0,0,.55))' : 'none',
  };
  return (
    <div className={`ov-fill ch-root pos-${pos} ${peek ? 'is-peek' : ''} ${shown ? 'is-in' : 'is-out'}`} style={style}>
      <div className={`ch-actor ${params.mirror ? 'is-mirror' : ''}`}>
        <video key={c.video} src={c.video} poster={c.poster} autoPlay loop muted playsInline />
      </div>
    </div>
  );
};
