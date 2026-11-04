import { browserVideo, browserVideoType, forgetBrowserVideo, keepBrowserVideo } from '../browserVideos';
import { videoContentType } from '../upload';

let next = 0;
beforeEach(() => {
  URL.createObjectURL = jest.fn(() => `blob:http://localhost/${++next}`);
  URL.revokeObjectURL = jest.fn();
});

test('keeps a browser recording under its object URL until forgotten', () => {
  const video = new Blob(['x'], { type: 'video/webm' });
  const url = keepBrowserVideo(video);

  expect(browserVideo(url)).toBe(video);
  forgetBrowserVideo(url);
  expect(browserVideo(url)).toBeUndefined();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
});

test('sends the bare type MediaRecorder reported', () => {
  expect(browserVideoType(new Blob([], { type: 'video/webm;codecs=vp8,opus' }))).toBe('video/webm');
  expect(browserVideoType(new Blob([], { type: 'video/mp4;codecs=avc1,mp4a' }))).toBe('video/mp4');
  expect(browserVideoType(new Blob([], { type: 'video/quicktime' }))).toBe('video/quicktime');
  // Some browsers leave the type empty; MP4 is the safe guess
  expect(browserVideoType(new Blob([]))).toBe('video/mp4');
});

test('videoContentType uses the recording type for an object URL and the extension otherwise', () => {
  const url = keepBrowserVideo(new Blob(['x'], { type: 'video/webm;codecs=vp9' }));

  expect(videoContentType(url)).toBe('video/webm');
  expect(videoContentType('file:///cache/clip.MOV')).toBe('video/quicktime');
  expect(videoContentType('file:///cache/clip.mp4')).toBe('video/mp4');
});
