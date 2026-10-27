import { clubLink, normalizeReferralCode, parseClubLink } from '../clubLink';

describe('parseClubLink', () => {
  it('reads the club from an app link', () => {
    expect(parseClubLink('whenue://club/luna')).toEqual({ slug: 'luna', referralCode: null });
  });

  it('reads a friend’s referral code from a shared link', () => {
    expect(parseClubLink(' whenue://club/luna-clinic?ref=ab12cd \n')).toEqual({
      slug: 'luna-clinic',
      referralCode: 'AB12CD',
    });
  });

  it('reads web links and bare club names', () => {
    expect(parseClubLink('https://whenue.app/club/Luna/')).toEqual({ slug: 'luna', referralCode: null });
    expect(parseClubLink('luna')).toEqual({ slug: 'luna', referralCode: null });
  });

  it('rejects text that is not a club link', () => {
    expect(parseClubLink('')).toBeNull();
    expect(parseClubLink('hello there')).toBeNull();
    expect(parseClubLink('whenue://club/-bad')).toBeNull();
  });

  it('round-trips the link a member shares', () => {
    expect(parseClubLink(clubLink('luna', 'AB12CD'))).toEqual({ slug: 'luna', referralCode: 'AB12CD' });
  });
});

describe('normalizeReferralCode', () => {
  it('accepts codes typed in Persian digits and with spaces', () => {
    expect(normalizeReferralCode(' ab ۱۲ ')).toBe('AB12');
    expect(normalizeReferralCode('  ')).toBeNull();
  });
});
