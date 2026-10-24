import { gql, type TypedDocumentNode } from '@apollo/client';

// Hand-written types mirroring whenue-api's schema.graphqls. Swap for
// graphql-codegen once the schema is published from the API.

export type TestimonialStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type VisitForTestimony = {
  id: string;
  visitDate: string;
  user: { id: string; name: string };
  venue: { id: string; name: string; logo: string | null };
  campaign: {
    id: string;
    name: string;
    notificationTemplate: { incentive: string | null; callToAction: string };
  } | null;
  testimonial: { id: string; status: TestimonialStatus } | null;
};

export const VISIT_BY_TOKEN: TypedDocumentNode<
  { visitByToken: VisitForTestimony | null },
  { token: string }
> = gql`
  query VisitByToken($token: String!) {
    visitByToken(token: $token) {
      id
      visitDate
      user {
        id
        name
      }
      venue {
        id
        name
        logo
      }
      campaign {
        id
        name
        notificationTemplate {
          incentive
          callToAction
        }
      }
      testimonial {
        id
        status
      }
    }
  }
`;

export type VideoStatus = 'UPLOADING' | 'UPLOADED' | 'QUEUED' | 'READY' | 'FAILED';

export type VideoUploadPart = { partNumber: number; url: string; expiresAt: string };

export const START_VIDEO_UPLOAD: TypedDocumentNode<
  {
    startVideoUpload: {
      video: { id: string; status: VideoStatus };
      partSize: number;
      parts: VideoUploadPart[];
    };
  },
  { input: { visitToken: string; contentType: string; sizeBytes: number } }
> = gql`
  mutation StartVideoUpload($input: StartVideoUploadInput!) {
    startVideoUpload(input: $input) {
      video {
        id
        status
      }
      partSize
      parts {
        partNumber
        url
        expiresAt
      }
    }
  }
`;

export const REFRESH_VIDEO_UPLOAD_PARTS: TypedDocumentNode<
  { refreshVideoUploadParts: VideoUploadPart[] },
  { visitToken: string; videoId: string; partNumbers: number[] }
> = gql`
  mutation RefreshVideoUploadParts($visitToken: String!, $videoId: ID!, $partNumbers: [Int!]!) {
    refreshVideoUploadParts(visitToken: $visitToken, videoId: $videoId, partNumbers: $partNumbers) {
      partNumber
      url
      expiresAt
    }
  }
`;

export const COMPLETE_VIDEO_UPLOAD: TypedDocumentNode<
  { completeVideoUpload: { id: string; status: VideoStatus } },
  {
    input: {
      visitToken: string;
      videoId: string;
      parts: { partNumber: number; etag: string }[];
    };
  }
> = gql`
  mutation CompleteVideoUpload($input: CompleteVideoUploadInput!) {
    completeVideoUpload(input: $input) {
      id
      status
    }
  }
`;

export const ABORT_VIDEO_UPLOAD: TypedDocumentNode<
  { abortVideoUpload: boolean },
  { visitToken: string; videoId: string }
> = gql`
  mutation AbortVideoUpload($visitToken: String!, $videoId: ID!) {
    abortVideoUpload(visitToken: $visitToken, videoId: $videoId)
  }
`;

export type CreateTestimonialInput = {
  visitToken: string;
  videoId: string;
  rating?: number | null;
  text?: string | null;
};

export const CREATE_TESTIMONIAL: TypedDocumentNode<
  { createTestimonial: { id: string; status: TestimonialStatus } },
  { input: CreateTestimonialInput }
> = gql`
  mutation CreateTestimonial($input: CreateTestimonialInput!) {
    createTestimonial(input: $input) {
      id
      status
    }
  }
`;
