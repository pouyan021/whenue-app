import { GraphQLError } from 'graphql';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react-native';

import { VISIT_BY_TOKEN, type VisitForTestimony } from '@/graphql/operations';

import VisitScreen from '../visit/[token]/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ token: 'tok' }),
}));

const baseVisit: VisitForTestimony = {
  id: '42',
  visitDate: '2026-10-20T18:30:00Z',
  user: { id: '7', name: 'Sam' },
  venue: { id: '3', name: 'Cafe Luna', logo: null },
  campaign: {
    id: '9',
    name: 'Autumn',
    notificationTemplate: { incentive: 'Get 10% off your next visit', callToAction: 'Record now' },
  },
  testimonial: null,
};

function renderWith(visit: VisitForTestimony | null) {
  return render(
    <MockedProvider
      mocks={[
        { request: { query: VISIT_BY_TOKEN, variables: { token: 'tok' } }, result: { data: { visitByToken: visit } } },
      ]}
    >
      <VisitScreen />
    </MockedProvider>,
  );
}

describe('VisitScreen', () => {
  it('invites the visitor to record, using the campaign copy', async () => {
    await renderWith(baseVisit);
    expect(await screen.findByText('How was Cafe Luna?')).toBeOnTheScreen();
    expect(screen.getByText('Get 10% off your next visit')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Record now' })).toBeOnTheScreen();
  });

  it('does not offer recording twice for the same visit', async () => {
    await renderWith({ ...baseVisit, testimonial: { id: '1', status: 'PENDING' } });
    expect(await screen.findByText('Thanks, Sam!')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('handles unknown visits', async () => {
    await renderWith(null);
    expect(await screen.findByText('Visit not found')).toBeOnTheScreen();
  });

  it('explains expired links', async () => {
    await render(
      <MockedProvider
        mocks={[
          {
            request: { query: VISIT_BY_TOKEN, variables: { token: 'tok' } },
            result: { errors: [new GraphQLError('Invalid or expired visit token')] },
          },
        ]}
      >
        <VisitScreen />
      </MockedProvider>,
    );
    expect(await screen.findByText('This link has expired')).toBeOnTheScreen();
  });
});
