/**
 * The visit token from what a visitor pastes: the link from the venue's message
 * (whenue://visit/<token> or an https link ending in /visit/<token>) or the bare token.
 */
export function parseVisitToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/visit\/([^/?#\s]+)/);
  let token = trimmed;
  if (match) {
    try {
      token = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  // Tokens are URL-safe (JWTs: base64url segments joined by dots).
  return /^[A-Za-z0-9._~-]+$/.test(token) ? token : null;
}
