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

export const VISIT_FOR_TESTIMONY: TypedDocumentNode<
  { visit: VisitForTestimony | null },
  { id: string }
> = gql`
  query VisitForTestimony($id: ID!) {
    visit(id: $id) {
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

export type CreateTestimonialInput = {
  visitId: string;
  videoUrl: string;
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
