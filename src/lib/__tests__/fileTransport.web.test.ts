import { keepBrowserVideo } from '../browserVideos';
import { config } from '../config';
import { createFileTransport } from '../fileTransport.web';

/** Stands in for XMLHttpRequest; tests drive its events by hand. */
class FakeRequest {
  static last: FakeRequest;
  upload: { onprogress?: (event: { loaded: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  status = 0;
  aborted = false;
  headers: Record<string, string> = {};

  constructor() {
    FakeRequest.last = this;
  }
  open() {}
  send() {}
  getResponseHeader(name: string) {
    return this.headers[name] ?? null;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

const realRequest = global.XMLHttpRequest;
beforeEach(() => {
  jest.useFakeTimers();
  URL.createObjectURL = jest.fn(() => 'blob:http://localhost/1');
  global.XMLHttpRequest = FakeRequest as unknown as typeof XMLHttpRequest;
});
afterEach(() => {
  jest.useRealTimers();
  global.XMLHttpRequest = realRequest;
});

function put() {
  const transport = createFileTransport(keepBrowserVideo(new Blob(['0123456789'])));
  return transport.put('https://storage/part', 0, 10, () => {});
}

test('gives up on a part that stalls, so the upload can retry it', async () => {
  const result = put();
  jest.advanceTimersByTime(config.partStallMs);

  await expect(result).rejects.toThrow('stalled');
  expect(FakeRequest.last.aborted).toBe(true);
});

test('keeps waiting while the part is still sending', async () => {
  const result = put();
  const request = FakeRequest.last;
  jest.advanceTimersByTime(config.partStallMs - 1);
  request.upload.onprogress?.({ loaded: 5 });
  jest.advanceTimersByTime(config.partStallMs - 1);

  request.status = 200;
  request.headers.ETag = '"abc"';
  request.onload?.();

  await expect(result).resolves.toBe('"abc"');
  expect(request.aborted).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});
