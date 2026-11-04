/**
 * Recordings made in a phone or desktop browser. The browser holds them as Blobs, so the
 * recording screen keeps each one here under an object URL: the URL is what travels to the
 * review screen (it plays in a <video> like any file URI), and the upload reads the Blob back
 * by that URL. Native builds never call this.
 */
const videos = new Map<string, Blob>();

/** Keeps a recorded or picked video and returns the object URL that stands for it. */
export function keepBrowserVideo(video: Blob): string {
  const url = URL.createObjectURL(video);
  videos.set(url, video);
  return url;
}

export function browserVideo(url: string): Blob | undefined {
  return videos.get(url);
}

export function forgetBrowserVideo(url: string) {
  if (videos.delete(url)) URL.revokeObjectURL(url);
}

/**
 * The content type to send for a browser recording: MediaRecorder reports types like
 * `video/webm;codecs=vp8,opus`, and whenue-api accepts only the bare type.
 */
export function browserVideoType(video: Blob): string {
  const type = video.type.split(';')[0].trim().toLowerCase();
  if (type === 'video/webm' || type === 'video/quicktime') return type;
  return 'video/mp4';
}
