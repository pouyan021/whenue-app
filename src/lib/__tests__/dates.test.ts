import { formatDate } from '../dates';

describe('formatDate', () => {
  it('shows a Solar Hijri date on the clinic wall clock', () => {
    expect(formatDate('2026-10-27T12:00:00Z')).toBe('۵ آبان ۱۴۰۵');
    // 22:00 UTC is already the next day in Tehran.
    expect(formatDate('2026-10-27T22:00:00Z', 'Asia/Tehran')).toBe('۶ آبان ۱۴۰۵');
    expect(formatDate('2026-10-27T22:00:00Z', 'UTC')).toBe('۵ آبان ۱۴۰۵');
  });
});
