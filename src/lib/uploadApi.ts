import type { ApolloClient } from '@apollo/client';

import {
  ABORT_VIDEO_UPLOAD,
  COMPLETE_VIDEO_UPLOAD,
  REFRESH_VIDEO_UPLOAD_PARTS,
  START_VIDEO_UPLOAD,
} from '@/graphql/operations';

import type { UploadApi } from './upload';

/** whenue-api's upload mutations for one visit, authorized by its visit token. */
export function createUploadApi(client: ApolloClient, visitToken: string): UploadApi {
  return {
    async start({ contentType, sizeBytes }) {
      const { data } = await client.mutate({
        mutation: START_VIDEO_UPLOAD,
        variables: { input: { visitToken, contentType, sizeBytes } },
      });
      const upload = data!.startVideoUpload;
      return { videoId: upload.video.id, partSize: upload.partSize, parts: upload.parts };
    },
    async refreshParts(videoId, partNumbers) {
      const { data } = await client.mutate({
        mutation: REFRESH_VIDEO_UPLOAD_PARTS,
        variables: { visitToken, videoId, partNumbers },
      });
      return data!.refreshVideoUploadParts;
    },
    async complete(videoId, parts) {
      const { data } = await client.mutate({
        mutation: COMPLETE_VIDEO_UPLOAD,
        variables: { input: { visitToken, videoId, parts } },
      });
      return data!.completeVideoUpload;
    },
    async abort(videoId) {
      await client.mutate({ mutation: ABORT_VIDEO_UPLOAD, variables: { visitToken, videoId } });
    },
  };
}
