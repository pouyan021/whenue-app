import { config } from './config';

export type UploadResult = {
  /** Absolute URL of the stored video, ready to save as Testimonial.videoUrl. */
  videoUrl: string;
};

export class UploadError extends Error {}

type UploadOptions = {
  uploadUrl?: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/**
 * Uploads a recorded video as multipart/form-data under the "video" field,
 * which is the contract of vidEngine's POST /upload. XMLHttpRequest is used
 * instead of fetch because React Native's fetch doesn't report upload progress.
 */
export function uploadVideo(fileUri: string, options: UploadOptions = {}): Promise<UploadResult> {
  const uploadUrl = options.uploadUrl ?? config.uploadUrl;
  const { name, type } = describeVideoFile(fileUri);

  const form = new FormData();
  // React Native's FormData accepts a { uri, name, type } descriptor for files.
  form.append('video', { uri: fileUri, name, type } as unknown as Blob);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      try {
        resolve(parseUploadResponse(xhr.status, xhr.responseText, uploadUrl));
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new UploadError('Network error while uploading the video.'));
    xhr.onabort = () => reject(new UploadError('Upload cancelled.'));

    options.signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });
}

export function describeVideoFile(fileUri: string): { name: string; type: string } {
  const extension = fileUri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'mov') {
    return { name: 'testimony.mov', type: 'video/quicktime' };
  }
  return { name: 'testimony.mp4', type: 'video/mp4' };
}

export function parseUploadResponse(status: number, body: string, uploadUrl: string): UploadResult {
  let json: { success?: boolean; message?: string; download_url?: string | null } | undefined;
  try {
    json = JSON.parse(body);
  } catch {
    // Fall through: handled below.
  }

  if (status < 200 || status >= 300 || !json || json.success === false) {
    throw new UploadError(json?.message ?? `Upload failed with status ${status}.`);
  }
  if (!json.download_url) {
    throw new UploadError('Upload succeeded but the server returned no video URL.');
  }
  // vidEngine returns a path relative to its own host, e.g. /static/processed/x.mp4.
  return { videoUrl: new URL(json.download_url, uploadUrl).toString() };
}
