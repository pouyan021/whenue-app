import { parseVisitToken } from '../visitLink';

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.c2lnbmF0dXJl';

describe('parseVisitToken', () => {
  it('reads the token from an app link', () => {
    expect(parseVisitToken(`whenue://visit/${token}`)).toBe(token);
  });

  it('reads the token from a web link with a query string', () => {
    expect(parseVisitToken(` https://whenue.app/visit/${token}?utm=sms \n`)).toBe(token);
  });

  it('accepts a bare token', () => {
    expect(parseVisitToken(token)).toBe(token);
  });

  it('rejects text that is not a token', () => {
    expect(parseVisitToken('')).toBeNull();
    expect(parseVisitToken('hello there')).toBeNull();
    expect(parseVisitToken('https://example.com/other')).toBeNull();
  });
});
