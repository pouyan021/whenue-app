import type { VideoStatus, VideoUploadPart } from '@/graphql/operations';

import { config } from './config';

/**
 * Multipart upload straight to object storage. whenue-api hands out a presigned URL per
 * part; each slice of the file is PUT to its URL and the ETag that comes back is reported
 * to completeVideoUpload. A failed part is retried on its own, so a dropped connection
 * near the end of a long video doesn't start the whole upload again.
 */

export class UploadError extends Error {}

/** The part of whenue-api the upload needs. See createUploadApi in uploadApi.ts. */
export type UploadApi = {
  start(input: { contentType: string; sizeBytes: number }): Promise<{
    videoId: string;
    partSize: number;
    parts: VideoUploadPart[];
  }>;
  refreshParts(videoId: string, partNumbers: number[]): Promise<VideoUploadPart[]>;
  complete(videoId: string, parts: UploadedPart[]): Promise<{ status: VideoStatus }>;
  abort(videoId: string): Promise<void>;
};

export type UploadedPart = { partNumber: number; etag: string };

/** Reads and sends slices of the local file. See createFileTransport in fileTransport.ts. */
export type PartTransport = {
  size: number;
  /** PUTs bytes [offset, offset + length) of the file to url and returns the ETag. */
  put(
    url: string,
    offset: number,
    length: number,
    onProgress: (bytesSent: number) => void,
    signal?: AbortSignal,
  ): Promise<string>;
};

/** A part PUT that storage answered with an error status. */
export class PartUploadError extends Error {
  constructor(readonly status: number) {
    super(`Storage answered ${status}`);
  }
}

type UploadOptions = {
  contentType: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  attempts?: number;
  /** Pause before retry number `attempt` (1-based). Replaced in tests. */
  delay?: (attempt: number) => Promise<void>;
  now?: () => number;
};

// Ask for a fresh URL rather than start a PUT this close to expiry.
const URL_EXPIRY_MARGIN_MS = 60_000;

export async function uploadVideo(
  api: UploadApi,
  transport: PartTransport,
  options: UploadOptions,
): Promise<{ videoId: string }> {
  const { signal, onProgress } = options;
  const attempts = options.attempts ?? config.partAttempts;
  const delay = options.delay ?? backoff;
  const now = options.now ?? Date.now;
  const size = transport.size;

  if (size <= 0) {
    throw new UploadError('The recording is empty.');
  }
  if (size > config.maxUploadBytes) {
    throw new UploadError('The video is too large to upload.');
  }

  const started = await api.start({ contentType: options.contentType, sizeBytes: size });
  const { videoId, partSize } = started;
  const urls = new Map(started.parts.map((part) => [part.partNumber, part]));
  const uploaded: UploadedPart[] = [];
  let sentBefore = 0;

  try {
    for (const partNumber of [...urls.keys()].sort((a, b) => a - b)) {
      const offset = (partNumber - 1) * partSize;
      const length = Math.min(partSize, size - offset);

      for (let attempt = 1; ; attempt++) {
        throwIfAborted(signal);
        let part = urls.get(partNumber)!;
        if (Date.parse(part.expiresAt) - now() < URL_EXPIRY_MARGIN_MS) {
          part = await refresh(api, videoId, partNumber, urls);
        }
        try {
          const etag = await transport.put(
            part.url,
            offset,
            length,
            (sent) => onProgress?.((sentBefore + Math.min(sent, length)) / size),
            signal,
          );
          uploaded.push({ partNumber, etag });
          break;
        } catch (error) {
          if (signal?.aborted || attempt >= attempts) throw error;
          // 403 is what storage says when a URL expired in flight
          if (error instanceof PartUploadError && error.status === 403) {
            await refresh(api, videoId, partNumber, urls);
          }
          await delay(attempt);
        }
      }
      sentBefore += length;
      onProgress?.(sentBefore / size);
    }

    throwIfAborted(signal);
    const video = await api.complete(videoId, uploaded);
    if (video.status === 'FAILED') {
      throw new UploadError('The upload was incomplete. Please try again.');
    }
    return { videoId };
  } catch (error) {
    // Frees the parts in storage; the API ignores an abort of a finished upload anyway.
    api.abort(videoId).catch(() => {});
    if (signal?.aborted) throw new UploadError('Upload cancelled.');
    if (error instanceof UploadError) throw error;
    throw new UploadError('The upload failed. Check your connection and try again.', { cause: error });
  }
}

async function refresh(
  api: UploadApi,
  videoId: string,
  partNumber: number,
  urls: Map<number, VideoUploadPart>,
): Promise<VideoUploadPart> {
  const [part] = await api.refreshParts(videoId, [partNumber]);
  urls.set(partNumber, part);
  return part;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new UploadError('Upload cancelled.');
}

function backoff(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
}

/** The content type whenue-api expects for a recording, from its file extension. */
export function videoContentType(fileUri: string): string {
  const extension = fileUri.split('?')[0].split('.').pop()?.toLowerCase();
  return extension === 'mov' ? 'video/quicktime' : 'video/mp4';
}
