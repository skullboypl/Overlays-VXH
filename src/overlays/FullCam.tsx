import { useEffect, useState, type CSSProperties } from 'react';
import type { Params } from './schema';
import { ProFrame } from './ProFrame';
import { FaceitStats } from './FaceitStats';
import { ParticleLayer } from './ParticleLayer';
import { effectLayer, SCENE_FONTS } from './SceneScreen';
import { BRAND_COLORS, BrandIcon, parseSocials } from './icons';
import { HolidayLayer } from './HolidayLayer';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(id); }, []);
  return <span className="cs-clock">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
};

/** "Pełnoekranowa kamera": the webcam fills the scene; this is only the layer on top of it. */
export const FullCam = ({ params }: { params: Params }) => {
  const colors = (params.colors as string[]) ?? ['#ff5900', '#ff2d6f', '#7a5cff'];
  const effect = String(params.effect ?? 'none');
  const fx = effectLayer(effect, colors);
  const socials = parseSocials(String(params.socials ?? ''));
  const style: Vars = {
    '--c1': colors[0], '--c2': colors[1] ?? colors[0], '--c3': colors[2] ?? colors[0],
    '--fg': String(params.textColor ?? '#ffffff'),
    '--font': SCENE_FONTS[String(params.font ?? 'poppins')] ?? SCENE_FONTS.dm,
    '--inset': `${params.inset ?? 24}px`,
  };
  return (
    <div className="sc-root cs-root fc-root" style={style}>
      {params._preview && <div className="st-cam fc-preview-cam" aria-hidden><span /></div>}
      {fx && <ParticleLayer key={effect} kind={fx.kind} params={fx.params} />}
      {params.vignette && <div className="sc-vignette" style={{ opacity: Number(params.vignetteStrength ?? 0.6) }} />}
      <HolidayLayer params={params} />
      <ProFrame params={{ ...params, mask: false }}>
        {params.showFaceit && <FaceitStats params={{ ...params, source: 'api' }} />}
      </ProFrame>
      <div className="sc-inner cs-inner">
        {params.showTitle !== false && params.title && (
          <div className="cs-topbar fc-topbar">
            {params.live !== false && <i className="cs-live" />}
            <b>{String(params.title)}</b>
            {params.showClock && <Clock />}
          </div>
        )}
        {params.showName !== false && params.name && (
          <div className={`cs-name fc-name at-${params.namePos ?? 'bl'}`}>
            <b>{String(params.name)}</b>
            {params.showSub !== false && params.sub && <small>{String(params.sub)}</small>}
          </div>
        )}
        {params.showSocials !== false && socials.length > 0 && (
          <div className={`sc-socials cs-socials fc-socials align-${params.socialsAlign ?? 'right'}`}>
            {socials.map((s, i) => (
              <span key={i} className="sc-social" style={{ '--brand': BRAND_COLORS[s.brand], '--i': i } as Vars}>
                <BrandIcon brand={s.brand} />{s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
