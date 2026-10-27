import { JALALI_MONTHS_FA, toJalali } from './jalali';
import { formatNumber, toPersianDigits } from './numbers';

// Dates in the Solar Hijri calendar, on the clinic's wall clock.

const gregorianParts = new Map<string, Intl.DateTimeFormat>();

function gregorianDateIn(instant: Date, timeZone: string) {
  let format = gregorianParts.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    gregorianParts.set(timeZone, format);
  }
  const parts: Record<string, number> = {};
  for (const part of format.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return { gy: parts.year, gm: parts.month, gd: parts.day };
}

/** An instant as a Solar Hijri date in a time zone, e.g. ۵ آبان ۱۴۰۵. */
export function formatDate(iso: string, timeZone = 'Asia/Tehran') {
  const { gy, gm, gd } = gregorianDateIn(new Date(iso), timeZone);
  const { jy, jm, jd } = toJalali(gy, gm, gd);
  return `${formatNumber(jd)} ${JALALI_MONTHS_FA[jm - 1]} ${toPersianDigits(String(jy))}`;
}
