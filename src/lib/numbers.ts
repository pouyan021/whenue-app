// Digits and amounts the way people in Iran read and type them.

/** Digits typed on a Persian or Arabic keyboard, as ASCII digits. Everything else is kept. */
export function toLatinDigits(text: string) {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** ASCII digits shown as Persian digits. */
export function toPersianDigits(text: string) {
  return text.replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

/**
 * A whole number in Persian digits with Persian thousands separators. Written out by hand
 * rather than with Intl, whose Persian support differs between Hermes builds.
 */
export function formatNumber(n: number) {
  const digits = String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return (n < 0 ? '−' : '') + toPersianDigits(digits);
}

/**
 * A change in points with its sign, kept left to right inside right-to-left text so the
 * sign stays in front of the number.
 */
export function formatPointsChange(n: number) {
  return `⁦${n > 0 ? '+' : ''}${formatNumber(n)}⁩`;
}

export const RIAL_PER_TOMAN = 10;

export function rialToToman(rial: number) {
  return Math.round(rial / RIAL_PER_TOMAN);
}

/** A stored +98 mobile number the way people in Iran write it, in Persian digits: ۰۹۱۲ ۱۲۳ ۴۵۶۷. */
export function nationalMobile(mobile: string) {
  if (!mobile.startsWith('+98') || mobile.length !== 13) return mobile;
  const n = '0' + mobile.slice(3);
  return toPersianDigits(`${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`);
}
