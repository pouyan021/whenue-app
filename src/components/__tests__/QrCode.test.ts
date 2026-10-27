import { qrPath } from '../QrCode';

describe('qrPath', () => {
  it('draws a member card code with a quiet zone', () => {
    const { path, size } = qrPath('whenue://member/42');
    // Version 2 (25 modules) for this length at level M, plus four modules each side.
    expect(size).toBe(33);
    // The top-left finder pattern starts right after the quiet zone.
    expect(path.startsWith('M4 4h1v1h-1z')).toBe(true);
  });
});
