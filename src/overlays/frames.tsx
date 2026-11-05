import type { CSSProperties } from 'react';
import type { Params } from './schema';

const n = (v: Params[string]) => v as number;
const c = (v: Params[string]) => v as string;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export const NeonFrame = ({ params }: { params: Params }) => {
  const colors = params.colors as string[];
  const speed = n(params.speed);
  const style: Vars = {
    '--inset': `${n(params.inset)}px`,
    '--thick': `${n(params.thickness)}px`,
    '--radius': `${n(params.radius)}px`,
    '--glow': `${n(params.glow)}px`,
    '--grad': `conic-gradient(from var(--neon-angle), ${[...colors, colors[0]].join(', ')})`,
    '--spin': speed > 0 ? `${4 / speed}s` : '0s',
  };
  return (
    <div className={`ov-fill ov-neon ${speed > 0 ? 'is-spinning' : ''}`} style={style}>
      {n(params.glow) > 0 && <div className="ov-neon-ring ov-neon-glow" />}
      <div className="ov-neon-ring" />
    </div>
  );
};

export const CornersFrame = ({ params }: { params: Params }) => {
  const style: Vars = {
    '--inset': `${n(params.inset)}px`,
    '--len': `${n(params.length)}px`,
    '--thick': `${n(params.thickness)}px`,
    '--color': c(params.color),
    '--glow': `${n(params.glow)}px`,
  };
  return (
    <div className={`ov-fill ov-corners ${params.breathe ? 'is-breathing' : ''}`} style={style}>
      {['tl', 'tr', 'bl', 'br'].map((pos) => <span key={pos} className={`ov-corner ${pos}`} />)}
      {params.scan && <div className="ov-scan" />}
      {params.rec && (
        <div className="ov-rec">
          <i /> REC
        </div>
      )}
    </div>
  );
};

export const NameTagFrame = ({ params }: { params: Params }) => {
  const pos = c(params.position);
  const style: Vars = {
    '--inset': `${n(params.inset)}px`,
    '--thick': `${n(params.thickness)}px`,
    '--radius': `${n(params.radius)}px`,
    '--color': c(params.color),
    '--bg': c(params.bg),
    '--fg': c(params.textColor),
  };
  return (
    <div className="ov-fill ov-nametag" style={style}>
      <div className="ov-nametag-border" />
      {params.showTag !== false && (params.text || params.sub) && (
        <div className={`ov-tag pos-${pos} ${params.shine ? 'is-shining' : ''}`}>
          <div className="ov-tag-text">
            {params.text && <strong>{c(params.text)}</strong>}
            {params.showSub !== false && params.sub && <small>{c(params.sub)}</small>}
          </div>
        </div>
      )}
    </div>
  );
};
