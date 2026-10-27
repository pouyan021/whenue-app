import { toLatinDigits } from './numbers';

export type ClubLink = { slug: string; referralCode: string | null };

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The club and an optional friend's referral code from what someone pastes or opens: the
 * club link (whenue://club/<slug>?ref=<code> or an https link ending in /club/<slug>) or the
 * bare club name.
 */
export function parseClubLink(input: string): ClubLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/club\/([^/?#\s]+)\/?(?:\?([^#\s]*))?/i);
  const slug = (match ? match[1] : trimmed).toLowerCase();
  if (!SLUG.test(slug)) return null;
  const ref = match?.[2] ? new URLSearchParams(match[2]).get('ref') : null;
  return { slug, referralCode: normalizeReferralCode(ref) };
}

/** A referral code as typed, without spaces and in ASCII; null when empty. */
export function normalizeReferralCode(code: string | null | undefined) {
  const clean = toLatinDigits(code ?? '').replace(/\s/g, '').toUpperCase();
  return clean || null;
}

/** The link a member shares to invite a friend to their club. */
export function clubLink(slug: string, referralCode?: string | null) {
  return `whenue://club/${slug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`;
}
