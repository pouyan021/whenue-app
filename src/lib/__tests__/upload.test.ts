import { describeVideoFile, parseUploadResponse, UploadError } from '../upload';

const uploadUrl = 'http://videngin.local:3000/upload';

describe('parseUploadResponse', () => {
  it('resolves vidEngine relative download URLs against the upload host', () => {
    const body = JSON.stringify({ success: true, message: 'ok', download_url: '/static/processed/abc.mp4' });
    expect(parseUploadResponse(200, body, uploadUrl)).toEqual({
      videoUrl: 'http://videngin.local:3000/static/processed/abc.mp4',
    });
  });

  it('keeps absolute download URLs as they are', () => {
    const body = JSON.stringify({ success: true, download_url: 'https://cdn.example.com/v.mp4' });
    expect(parseUploadResponse(201, body, uploadUrl).videoUrl).toBe('https://cdn.example.com/v.mp4');
  });

  it('surfaces the server message on failure', () => {
    const body = JSON.stringify({ success: false, message: 'File too large' });
    expect(() => parseUploadResponse(413, body, uploadUrl)).toThrow(new UploadError('File too large'));
  });

  it('rejects non-JSON error bodies with the status code', () => {
    expect(() => parseUploadResponse(502, '<html>Bad gateway</html>', uploadUrl)).toThrow(
      'Upload failed with status 502.',
    );
  });

  it('rejects a success response with no URL', () => {
    expect(() => parseUploadResponse(200, JSON.stringify({ success: true }), uploadUrl)).toThrow(
      'no video URL',
    );
  });
});

describe('describeVideoFile', () => {
  it('maps iOS .mov recordings to QuickTime', () => {
    expect(describeVideoFile('file:///tmp/Camera/ABC.mov')).toEqual({
      name: 'testimony.mov',
      type: 'video/quicktime',
    });
  });

  it('defaults to mp4 (Android recordings)', () => {
    expect(describeVideoFile('file:///data/cache/Camera/abc.mp4').type).toBe('video/mp4');
  });
});
