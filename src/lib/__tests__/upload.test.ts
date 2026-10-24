import type { VideoUploadPart } from '@/graphql/operations';

import { PartUploadError, uploadVideo, UploadError, videoContentType, type PartTransport, type UploadApi } from '../upload';

const MB = 1024 * 1024;
const NOW = Date.parse('2026-10-24T12:00:00Z');
const later = new Date(NOW + 3600_000).toISOString();

function part(partNumber: number, expiresAt = later, version = 1): VideoUploadPart {
  return { partNumber, url: `https://s3.test/part${partNumber}?v=${version}`, expiresAt };
}

function fakeApi(partCount: number, partSize = 8 * MB, expiresAt = later) {
  const api = {
    start: jest.fn(async () => ({
      videoId: '7',
      partSize,
      parts: Array.from({ length: partCount }, (_, i) => part(i + 1, expiresAt)),
    })),
    refreshParts: jest.fn(async (_videoId: string, numbers: number[]) => numbers.map((n) => part(n, later, 2))),
    complete: jest.fn(async () => ({ status: 'UPLOADED' as const })),
    abort: jest.fn(async () => {}),
  } satisfies UploadApi;
  return api;
}

/** Answers each PUT with the next scripted outcome for that URL's part, then succeeds. */
function fakeTransport(size: number, failures: Record<number, Error[]> = {}) {
  const calls: { url: string; offset: number; length: number }[] = [];
  const transport: PartTransport = {
    size,
    put: async (url, offset, length, onProgress) => {
      calls.push({ url, offset, length });
      const partNumber = Number(url.match(/part(\d+)/)![1]);
      const failure = failures[partNumber]?.shift();
      if (failure) throw failure;
      onProgress(length);
      return `"etag-${partNumber}"`;
    },
  };
  return { transport, calls };
}

const options = { contentType: 'video/mp4', delay: async () => {}, now: () => NOW };

describe('uploadVideo', () => {
  it('uploads each slice and completes with the ETags', async () => {
    const api = fakeApi(3);
    const { transport, calls } = fakeTransport(20 * MB);
    const progress: number[] = [];

    await expect(uploadVideo(api, transport, { ...options, onProgress: (p) => progress.push(p) })).resolves.toEqual({
      videoId: '7',
    });

    expect(api.start).toHaveBeenCalledWith({ contentType: 'video/mp4', sizeBytes: 20 * MB });
    expect(calls.map(({ offset, length }) => [offset, length])).toEqual([
      [0, 8 * MB],
      [8 * MB, 8 * MB],
      [16 * MB, 4 * MB],
    ]);
    expect(api.complete).toHaveBeenCalledWith('7', [
      { partNumber: 1, etag: '"etag-1"' },
      { partNumber: 2, etag: '"etag-2"' },
      { partNumber: 3, etag: '"etag-3"' },
    ]);
    expect(progress.at(-1)).toBe(1);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });

  it('retries a failed part on its own', async () => {
    const api = fakeApi(2);
    const { transport, calls } = fakeTransport(10 * MB, { 2: [new Error('network'), new Error('network')] });

    await uploadVideo(api, transport, options);

    expect(calls.map((c) => c.url)).toEqual([
      'https://s3.test/part1?v=1',
      'https://s3.test/part2?v=1',
      'https://s3.test/part2?v=1',
      'https://s3.test/part2?v=1',
    ]);
    expect(api.complete).toHaveBeenCalled();
  });

  it('gets a new URL when storage says the old one expired', async () => {
    const api = fakeApi(1);
    const { transport, calls } = fakeTransport(MB, { 1: [new PartUploadError(403)] });

    await uploadVideo(api, transport, options);

    expect(api.refreshParts).toHaveBeenCalledWith('7', [1]);
    expect(calls.map((c) => c.url)).toEqual(['https://s3.test/part1?v=1', 'https://s3.test/part1?v=2']);
  });

  it('refreshes URLs that are about to expire before using them', async () => {
    const api = fakeApi(1, 8 * MB, new Date(NOW + 30_000).toISOString());
    const { transport, calls } = fakeTransport(MB);

    await uploadVideo(api, transport, options);

    expect(calls.map((c) => c.url)).toEqual(['https://s3.test/part1?v=2']);
  });

  it('gives up after the last attempt and aborts the upload', async () => {
    const api = fakeApi(1);
    const errors = Array.from({ length: 4 }, () => new Error('network'));
    const { transport, calls } = fakeTransport(MB, { 1: errors });

    await expect(uploadVideo(api, transport, options)).rejects.toThrow(UploadError);

    expect(calls).toHaveLength(4);
    expect(api.complete).not.toHaveBeenCalled();
    expect(api.abort).toHaveBeenCalledWith('7');
  });

  it('stops and aborts when cancelled', async () => {
    const api = fakeApi(2);
    const controller = new AbortController();
    const { transport } = fakeTransport(10 * MB);
    const put = transport.put;
    transport.put = async (...args) => {
      const etag = await put(...args);
      controller.abort();
      return etag;
    };

    await expect(uploadVideo(api, transport, { ...options, signal: controller.signal })).rejects.toThrow(
      'Upload cancelled.',
    );
    expect(api.complete).not.toHaveBeenCalled();
    expect(api.abort).toHaveBeenCalledWith('7');
  });

  it('reports a size mismatch from the API as a failed upload', async () => {
    const api = fakeApi(1);
    api.complete.mockResolvedValueOnce({ status: 'FAILED' } as never);
    const { transport } = fakeTransport(MB);

    await expect(uploadVideo(api, transport, options)).rejects.toThrow('incomplete');
  });

  it('refuses empty recordings without calling the API', async () => {
    const api = fakeApi(1);
    await expect(uploadVideo(api, fakeTransport(0).transport, options)).rejects.toThrow('empty');
    expect(api.start).not.toHaveBeenCalled();
  });
});

describe('videoContentType', () => {
  it('maps iOS .mov recordings to QuickTime', () => {
    expect(videoContentType('file:///tmp/Camera/ABC.mov')).toBe('video/quicktime');
  });

  it('defaults to mp4 (Android recordings)', () => {
    expect(videoContentType('file:///data/cache/Camera/abc.mp4')).toBe('video/mp4');
  });
});
