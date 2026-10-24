import { File, FileMode, Paths, UploadType } from 'expo-file-system';

import { PartUploadError, type PartTransport } from './upload';

/**
 * Sends slices of a local file with the native uploader. Each slice is copied to a cache
 * file first, so the bytes go from disk to the network without passing through the JS
 * bridge as base64.
 */
export function createFileTransport(fileUri: string): PartTransport {
  const source = new File(fileUri);
  return {
    size: source.size ?? 0,
    async put(url, offset, length, onProgress, signal) {
      const handle = source.open(FileMode.ReadOnly);
      let bytes: Uint8Array;
      try {
        handle.offset = offset;
        bytes = await handle.readBytes(length);
      } finally {
        handle.close();
      }

      const slice = new File(Paths.cache, `upload-part-${Date.now()}-${offset}`);
      try {
        await slice.write(bytes);
        const result = await slice.upload(url, {
          httpMethod: 'PUT',
          uploadType: UploadType.BINARY_CONTENT,
          onProgress: ({ bytesSent }) => onProgress(bytesSent),
          sessionType: 'foreground',
          signal,
        });
        if (result.status < 200 || result.status >= 300) {
          throw new PartUploadError(result.status);
        }
        const etag = headerValue(result.headers, 'etag');
        if (!etag) {
          throw new Error('Storage returned no ETag for the part');
        }
        return etag;
      } finally {
        if (slice.exists) slice.delete();
      }
    },
  };
}

export function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key === undefined ? undefined : headers[key];
}
