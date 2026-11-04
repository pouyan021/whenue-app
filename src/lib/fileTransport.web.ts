import { browserVideo } from './browserVideos';
import { PartUploadError, type PartTransport } from './upload';

/**
 * The browser's version of fileTransport.ts: sends slices of a recording kept by
 * browserVideos.ts with XMLHttpRequest, which, unlike fetch, reports upload progress.
 * Storage must allow the page's origin (CORS) and expose the ETag header.
 */
export function createFileTransport(uri: string): PartTransport {
  const video = browserVideo(uri);
  return {
    size: video?.size ?? 0,
    put(url, offset, length, onProgress, signal) {
      if (!video) return Promise.reject(new Error('The recording is no longer in memory'));
      const slice = video.slice(offset, offset + length);
      return new Promise<string>((resolve, reject) => {
        const request = new XMLHttpRequest();
        const onAbort = () => request.abort();
        const done = () => signal?.removeEventListener('abort', onAbort);
        request.open('PUT', url);
        request.upload.onprogress = (event) => onProgress(event.loaded);
        request.onload = () => {
          done();
          if (request.status < 200 || request.status >= 300) {
            reject(new PartUploadError(request.status));
            return;
          }
          const etag = request.getResponseHeader('ETag');
          if (etag) resolve(etag);
          else reject(new Error('Storage returned no ETag for the part; is ETag exposed by its CORS rules?'));
        };
        // A blocked CORS request lands here too, with status 0
        request.onerror = () => {
          done();
          reject(new Error('The part upload failed'));
        };
        request.onabort = () => {
          done();
          reject(new DOMException('Upload cancelled', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort);
        request.send(slice);
      });
    },
  };
}
