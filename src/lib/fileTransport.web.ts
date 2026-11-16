import { browserVideo } from './browserVideos';
import { config } from './config';
import { PartUploadError, type PartTransport } from './upload';

/**
 * The browser's version of fileTransport.ts: sends slices of a recording kept by
 * browserVideos.ts with XMLHttpRequest, which, unlike fetch, reports upload progress.
 * Storage must allow the page's origin (CORS) and expose the ETag header.
 *
 * A browser waits on a stalled request indefinitely, which left uploads spinning forever, so
 * a part that makes no progress for config.partStallMs is aborted and fails like a dropped
 * connection: upload.ts retries it, then aborts the whole upload.
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
        let stallTimer: ReturnType<typeof setTimeout> | undefined;
        const watchForStall = () => {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(() => {
            done();
            reject(new Error(`The part upload stalled for ${config.partStallMs / 1000}s`));
            request.abort();
          }, config.partStallMs);
        };
        const done = () => {
          clearTimeout(stallTimer);
          signal?.removeEventListener('abort', onAbort);
        };
        request.open('PUT', url);
        request.upload.onprogress = (event) => {
          watchForStall();
          onProgress(event.loaded);
        };
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
        watchForStall();
        request.send(slice);
      });
    },
  };
}
