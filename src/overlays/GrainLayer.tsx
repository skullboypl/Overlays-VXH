import { useEffect, useRef } from 'react';
import type { Params } from './schema';

const NOISE = 220;

export const GrainLayer = ({ params }: { params: Params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grain = params.grain as number;
  const vignette = params.vignette as number;

  useEffect(() => {
    const cv = canvasRef.current!;
    cv.width = cv.height = NOISE;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(NOISE, NOISE);
    let raf = 0;
    let lastDraw = 0;
    const tick = (now: number) => {
      // Real film grain changes ~24 times a second; redrawing every frame only burns CPU in OBS.
      if (now - lastDraw > 42) {
        lastDraw = now;
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`ov-fill ${params.flicker ? 'ov-flicker' : ''}`}>
      <canvas ref={canvasRef} className="ov-fill ov-grain" style={{ opacity: grain * 0.35 }} />
      {params.scanlines && <div className="ov-fill ov-scanlines" />}
      <div
        className="ov-fill"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${55 - vignette * 30}%, rgba(0,0,0,${vignette * 0.85}) 100%)`,
        }}
      />
    </div>
  );
};
