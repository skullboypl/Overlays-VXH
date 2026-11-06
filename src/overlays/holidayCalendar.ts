// "Automatycznie" for holiday frames: pick the occasion from today's date (Polish calendar),
// so one OBS link dresses the camera for every season without touching the settings.

/** Occasions the calendar can pick. Birthday has no fixed date, so it is never chosen automatically. */
export const AUTO_THEMES = ['xmas', 'newyear', 'winter', 'valentine', 'easter', 'halloween', 'independence'] as const;

/** Easter Sunday (Gregorian), anonymous Gregorian algorithm. Month is 0-based. */
const easterSunday = (year: number) => {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

const DAY = 86_400_000;

/** Occasion for a date, or null outside every holiday period (the frame then hides). */
export const themeForDate = (now: Date): string | null => {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  const today = new Date(y, now.getMonth(), d).getTime();
  const easter = easterSunday(y).getTime();
  // Holy Week from Palm Sunday to Easter Monday.
  if (today >= easter - 7 * DAY && today <= easter + DAY) return 'easter';
  if ((m === 12 && d >= 28) || (m === 1 && d === 1)) return 'newyear';
  if (m === 12) return 'xmas';
  if (m === 2 && d >= 7 && d <= 14) return 'valentine';
  if (m === 1 || m === 2) return 'winter';
  if ((m === 10 && d >= 15) || (m === 11 && d <= 1)) return 'halloween';
  if (m === 11 && d >= 5 && d <= 11) return 'independence';
  return null;
};

/** "auto" → today's occasion (or null); any other value passes through. */
export const resolveHolidayTheme = (theme: unknown, now = new Date()): string | null => {
  if (theme === 'auto') return themeForDate(now);
  return typeof theme === 'string' && theme !== 'none' ? theme : null;
};
