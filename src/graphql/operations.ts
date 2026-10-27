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
  /** TESTIMONIAL_RECORDING must be granted here or earlier; publishing purposes are optional. */
  consents?: ConsentInput[];
  /** Blur the person's face before the testimonial can be used. */
  blurFace?: boolean;
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

// Member club

export type ConsentPurpose =
  | 'CLUB_MEMBERSHIP'
  | 'MARKETING_SMS'
  | 'TESTIMONIAL_RECORDING'
  | 'PUBLISH_IN_CLINIC'
  | 'PUBLISH_ON_WEBSITE'
  | 'PUBLISH_ON_SOCIAL_MEDIA';

export type ConsentMethod = 'MEMBER_APP' | 'STAFF_RECORDED' | 'VISIT_LINK';

/** A consent exactly as the person saw and answered it. */
export type ConsentInput = { purpose: ConsentPurpose; granted: boolean; textVersion: string; text: string };

export type Consent = {
  purpose: ConsentPurpose;
  granted: boolean;
  textVersion: string;
  method: ConsentMethod;
  recordedAt: string;
};

export type ClubModule = 'TESTIMONIALS' | 'REFERRALS';

export type PointKind =
  | 'VISIT'
  | 'SPEND'
  | 'REFERRAL_REFERRER'
  | 'REFERRAL_FRIEND'
  | 'TESTIMONIAL'
  | 'REDEMPTION'
  | 'REDEMPTION_CANCELLED'
  | 'ADJUSTMENT';

export type PointEntry = { id: string; points: number; kind: PointKind; note: string | null; createdAt: string };

export type Reward = { id: string; name: string; description: string | null; pointsCost: number };

export type LoyaltyProgram = {
  pointsPerVisit: number;
  spendUnitRial: number;
  pointsPerSpendUnit: number;
  referrerPoints: number;
  friendPoints: number;
  testimonialPoints: number;
};

export type Membership = {
  id: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
  memberSince: string | null;
  pointsBalance: number;
  referralCode: string | null;
  referrals: { pending: number; qualified: number };
  consents: Consent[];
  organization: {
    id: string;
    name: string;
    slug: string;
    timeZone: string;
    modules: { module: ClubModule; enabled: boolean }[];
    loyaltyProgram: LoyaltyProgram;
    rewards: Reward[];
  };
};

const CONSENT_FIELDS = gql`
  fragment ConsentFields on Consent {
    purpose
    granted
    textVersion
    method
    recordedAt
  }
`;

export const MY_MEMBERSHIP: TypedDocumentNode<{ myMembership: Membership | null }, Record<string, never>> = gql`
  query MyMembership {
    myMembership {
      id
      name
      mobile
      email
      memberSince
      pointsBalance
      referralCode
      referrals {
        pending
        qualified
      }
      consents {
        ...ConsentFields
      }
      organization {
        id
        name
        slug
        timeZone
        modules {
          module
          enabled
        }
        loyaltyProgram {
          pointsPerVisit
          spendUnitRial
          pointsPerSpendUnit
          referrerPoints
          friendPoints
          testimonialPoints
        }
        rewards {
          id
          name
          description
          pointsCost
        }
      }
    }
  }
  ${CONSENT_FIELDS}
`;

export const MY_POINT_ENTRIES: TypedDocumentNode<
  { myMembership: { id: string; pointEntries: PointEntry[] } | null },
  { size: number }
> = gql`
  query MyPointEntries($size: Int!) {
    myMembership {
      id
      pointEntries(page: 0, size: $size) {
        id
        points
        kind
        note
        createdAt
      }
    }
  }
`;

export const REQUEST_MEMBER_LOGIN_CODE: TypedDocumentNode<
  { requestMemberLoginCode: boolean },
  { organizationSlug: string; mobile: string }
> = gql`
  mutation RequestMemberLoginCode($organizationSlug: String!, $mobile: String!) {
    requestMemberLoginCode(organizationSlug: $organizationSlug, mobile: $mobile)
  }
`;

export type VerifyMemberLoginCodeInput = {
  organizationSlug: string;
  mobile: string;
  code: string;
  name?: string | null;
  consents?: ConsentInput[];
  referralCode?: string | null;
};

export const VERIFY_MEMBER_LOGIN_CODE: TypedDocumentNode<
  {
    verifyMemberLoginCode: {
      token: string;
      expiresAt: string;
      member: { id: string; organization: { id: string; name: string; slug: string } };
    };
  },
  { input: VerifyMemberLoginCodeInput }
> = gql`
  mutation VerifyMemberLoginCode($input: VerifyMemberLoginCodeInput!) {
    verifyMemberLoginCode(input: $input) {
      token
      expiresAt
      member {
        id
        organization {
          id
          name
          slug
        }
      }
    }
  }
`;

export const UPDATE_MY_PROFILE: TypedDocumentNode<
  { updateMyProfile: { id: string; name: string | null; email: string | null } },
  { input: { name?: string | null; email?: string | null } }
> = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      id
      name
      email
    }
  }
`;

export const SET_MY_CONSENTS: TypedDocumentNode<{ setMyConsents: Consent[] }, { consents: ConsentInput[] }> = gql`
  mutation SetMyConsents($consents: [ConsentInput!]!) {
    setMyConsents(consents: $consents) {
      ...ConsentFields
    }
  }
  ${CONSENT_FIELDS}
`;

/** What anyone with the club link sees before joining. */
export type ClubInfo = { slug: string; name: string; referralsEnabled: boolean };

export const CLUB: TypedDocumentNode<{ club: ClubInfo | null }, { slug: string }> = gql`
  query Club($slug: String!) {
    club(slug: $slug) {
      slug
      name
      referralsEnabled
    }
  }
`;
