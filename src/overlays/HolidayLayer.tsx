import type { Params } from './schema';
import { HolidayFrame } from './HolidayFrame';

/** Maps the "holiday*" settings of a scene onto a HolidayFrame drawn over the camera area. */
export const holidayParams = (p: Params): Params => ({
  _lang: p._lang,
  theme: p.holiday,
  variant: p.holidayVariant ?? 'real',
  showLabel: p.holidayLabelOn !== false,
  label: p.holidayLabel ?? 'auto',
  labelSize: Number(p.holidayLabelSize ?? 22),
  labelPos: p.holidayLabelPos ?? 'top',
  decorations: p.holidayDeco !== false,
  decoSize: Number(p.holidayDecoSize ?? 64),
  garland: p.holidayGarland !== false,
  particles: p.holidayParticles !== false,
  amount: Number(p.holidayAmount ?? 1.4),
  shine: true,
  depth: 1,
  showBorder: false,
  thickness: 6, radius: 18, glow: 0, speed: 0.6, inset: 30,
});

export const HolidayLayer = ({ params }: { params: Params }) =>
  params.holiday && params.holiday !== 'none' ? <div className="ov-fill hl-layer"><HolidayFrame params={holidayParams(params)} /></div> : null;
