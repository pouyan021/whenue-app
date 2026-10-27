import type { MockLink } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GraphQLError } from 'graphql';
import type { ReactNode } from 'react';

import {
  CLUB,
  MY_MEMBERSHIP,
  MY_POINT_ENTRIES,
  REQUEST_MEMBER_LOGIN_CODE,
  SET_MY_CONSENTS,
  VERIFY_MEMBER_LOGIN_CODE,
  type Membership,
} from '@/graphql/operations';
import { fa } from '@/i18n/fa';
import { consentAnswer } from '@/lib/consents';
import { SessionsProvider, type ClubSession, type SessionStore } from '@/lib/sessions';

import MembershipScreen from '../club/[slug]/index';
import LoginScreen from '../club/[slug]/login';
import SettingsScreen from '../club/[slug]/settings';

const mockParams: { slug: string; ref?: string } = { slug: 'luna' };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: unknown }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`redirect ${JSON.stringify(href)}`}</Text>;
  },
}));

const store: SessionStore & { entries: Record<string, string> } = {
  entries: {},
  async get(key) {
    return this.entries[key] ?? null;
  },
  async set(key, value) {
    this.entries[key] = value;
  },
  async remove(key) {
    delete this.entries[key];
  },
};

const session: ClubSession = {
  slug: 'luna',
  clinic: 'Luna Clinic',
  memberId: '7',
  token: 'member-token',
  expiresAt: '2099-01-01T00:00:00Z',
};

const membership: Membership & { __typename: 'Member' } = {
  __typename: 'Member',
  id: '7',
  name: 'Sara',
  mobile: '+989121234567',
  email: null,
  memberSince: '2026-10-01T10:00:00Z',
  pointsBalance: 1250,
  referralCode: 'AB12CD',
  referrals: { pending: 1, qualified: 2 },
  consents: [{ purpose: 'CLUB_MEMBERSHIP', granted: true, textVersion: 'app-fa-v1', method: 'MEMBER_APP', recordedAt: '2026-10-01T10:00:00Z' }],
  organization: {
    id: '1',
    name: 'Luna Clinic',
    slug: 'luna',
    timeZone: 'Asia/Tehran',
    modules: [
      { module: 'TESTIMONIALS', enabled: true },
      { module: 'REFERRALS', enabled: true },
    ],
    loyaltyProgram: {
      pointsPerVisit: 10,
      spendUnitRial: 1_000_000,
      pointsPerSpendUnit: 5,
      referrerPoints: 200,
      friendPoints: 100,
      testimonialPoints: 50,
    },
    rewards: [
      { id: '1', name: 'Free consultation', description: null, pointsCost: 1000 },
      { id: '2', name: 'Skin care set', description: 'Cleanser and serum', pointsCost: 3000 },
    ],
  },
};

function renderWith(ui: ReactNode, mocks: MockLink.MockedResponse[], sessions: ClubSession[] = []) {
  return render(
    <SessionsProvider store={store} initial={sessions}>
      <MockedProvider mocks={mocks}>{ui}</MockedProvider>
    </SessionsProvider>,
  );
}

const clubMock: MockLink.MockedResponse = {
  request: { query: CLUB, variables: { slug: 'luna' } },
  result: { data: { club: { __typename: 'ClubInfo', slug: 'luna', name: 'Luna Clinic', referralsEnabled: true } } },
};

beforeEach(() => {
  jest.clearAllMocks();
  store.entries = {};
  delete mockParams.ref;
});

describe('LoginScreen', () => {
  const requestCode: MockLink.MockedResponse = {
    request: { query: REQUEST_MEMBER_LOGIN_CODE, variables: { organizationSlug: 'luna', mobile: '09121234567' } },
    result: { data: { requestMemberLoginCode: true } },
  };
  const signedIn = {
    verifyMemberLoginCode: {
      __typename: 'MemberAuthPayload',
      token: 'member-token',
      expiresAt: '2099-01-01T00:00:00Z',
      member: { __typename: 'Member', id: '7', organization: { __typename: 'Organization', id: '1', name: 'Luna Clinic', slug: 'luna' } },
    },
  };

  async function enterCode() {
    await fireEvent.changeText(await screen.findByLabelText(fa.login.mobile), '۰۹۱۲۱۲۳۴۵۶۷');
    await fireEvent.press(screen.getByRole('button', { name: fa.login.sendCode }));
    await fireEvent.changeText(await screen.findByLabelText(fa.login.code), '۱۲۳۴۵۶');
  }

  it('signs a member in with the texted code', async () => {
    await renderWith(<LoginScreen />, [
      clubMock,
      requestCode,
      {
        request: {
          query: VERIFY_MEMBER_LOGIN_CODE,
          variables: { input: { organizationSlug: 'luna', mobile: '09121234567', code: '123456' } },
        },
        result: { data: signedIn },
      },
    ]);

    expect(await screen.findByText('Luna Clinic')).toBeOnTheScreen();
    await enterCode();
    await fireEvent.press(screen.getByRole('button', { name: fa.login.verify }));

    await screen.findByLabelText(fa.login.code);
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/club/[slug]', params: { slug: 'luna' } });
    expect(JSON.parse(store.entries['whenue.club.luna'])).toEqual(session);
    expect(JSON.parse(store.entries['whenue.clubs'])).toEqual(['luna']);
  });

  it('asks a new member for their name and consent, then joins with the same code', async () => {
    mockParams.ref = 'ab12cd';
    await renderWith(<LoginScreen />, [
      clubMock,
      requestCode,
      {
        request: {
          query: VERIFY_MEMBER_LOGIN_CODE,
          variables: { input: { organizationSlug: 'luna', mobile: '09121234567', code: '123456' } },
        },
        result: { errors: [new GraphQLError('CONSENT_REQUIRED: joining the club needs consent to CLUB_MEMBERSHIP')] },
      },
      {
        request: {
          query: VERIFY_MEMBER_LOGIN_CODE,
          variables: {
            input: {
              organizationSlug: 'luna',
              mobile: '09121234567',
              code: '123456',
              name: 'Sara',
              consents: [
                consentAnswer('CLUB_MEMBERSHIP', true, 'Luna Clinic'),
                consentAnswer('MARKETING_SMS', false, 'Luna Clinic'),
              ],
              referralCode: 'AB12CD',
            },
          },
        },
        result: { data: signedIn },
      },
    ]);

    await enterCode();
    await fireEvent.press(screen.getByRole('button', { name: fa.login.verify }));

    expect(await screen.findByText(fa.login.joinTitle)).toBeOnTheScreen();
    expect(screen.getByLabelText(fa.login.referralCode)).toHaveDisplayValue('ab12cd');
    await fireEvent.changeText(screen.getByLabelText(fa.login.name), 'Sara');
    await fireEvent.press(screen.getByRole('button', { name: fa.login.join }));
    expect(await screen.findByText(fa.login.mustAgree)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('checkbox', { name: fa.consent.agree }));
    await fireEvent.press(screen.getByRole('button', { name: fa.login.join }));

    await screen.findByText(fa.login.joinTitle);
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/club/[slug]', params: { slug: 'luna' } });
  });

  it('explains a wrong code in Persian', async () => {
    await renderWith(<LoginScreen />, [
      clubMock,
      requestCode,
      {
        request: {
          query: VERIFY_MEMBER_LOGIN_CODE,
          variables: { input: { organizationSlug: 'luna', mobile: '09121234567', code: '123456' } },
        },
        result: { errors: [new GraphQLError('The code is wrong or has expired. Ask for a new one.')] },
      },
    ]);

    await enterCode();
    await fireEvent.press(screen.getByRole('button', { name: fa.login.verify }));
    expect(await screen.findByText(fa.errors.wrongCode)).toBeOnTheScreen();
  });
});

describe('MembershipScreen', () => {
  const entries: MockLink.MockedResponse = {
    request: { query: MY_POINT_ENTRIES, variables: { size: 10 } },
    result: {
      data: {
        myMembership: {
          __typename: 'Member',
          id: '7',
          pointEntries: [
            { __typename: 'PointEntry', id: '2', points: -1000, kind: 'REDEMPTION', note: null, createdAt: '2026-10-20T10:00:00Z' },
            { __typename: 'PointEntry', id: '1', points: 120, kind: 'VISIT', note: null, createdAt: '2026-10-01T10:00:00Z' },
          ],
        },
      },
    },
  };

  it('shows the card, balance, rewards, referral and history', async () => {
    await renderWith(
      <MembershipScreen />,
      [{ request: { query: MY_MEMBERSHIP, variables: {} }, result: { data: { myMembership: membership } } }, entries],
      [session],
    );

    expect(await screen.findByText('۱٬۲۵۰')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: fa.club.cardHint })).toBeOnTheScreen();
    expect(screen.getByText(fa.club.redeemHint)).toBeOnTheScreen();
    expect(screen.getByText(fa.club.pointsToGo(1750))).toBeOnTheScreen();
    expect(screen.getByText(`• ${fa.club.earnSpend(5, 100_000)}`)).toBeOnTheScreen();
    expect(screen.getByText('AB12CD')).toBeOnTheScreen();
    expect(screen.getByText(fa.club.referrals(2, 1))).toBeOnTheScreen();
    expect(await screen.findByText('⁦−۱٬۰۰۰⁩')).toBeOnTheScreen();
    expect(screen.getByText(fa.pointKind.VISIT)).toBeOnTheScreen();
  });

  it('sends a member who is not signed in to sign-in, keeping the referral code', async () => {
    mockParams.ref = 'AB12CD';
    await renderWith(<MembershipScreen />, []);
    expect(
      screen.getByText(`redirect ${JSON.stringify({ pathname: '/club/[slug]/login', params: { slug: 'luna', ref: 'AB12CD' } })}`),
    ).toBeOnTheScreen();
  });

  it('signs out a member who left the club', async () => {
    await renderWith(
      <MembershipScreen />,
      [{ request: { query: MY_MEMBERSHIP, variables: {} }, result: { data: { myMembership: { ...membership, memberSince: null } } } }],
      [session],
    );
    expect(await screen.findByText(/redirect/)).toBeOnTheScreen();
  });
});

describe('SettingsScreen', () => {
  it('records a consent the member gives', async () => {
    await renderWith(
      <SettingsScreen />,
      [
        { request: { query: MY_MEMBERSHIP, variables: {} }, result: { data: { myMembership: membership } } },
        {
          request: { query: SET_MY_CONSENTS, variables: { consents: [consentAnswer('MARKETING_SMS', true, 'Luna Clinic')] } },
          result: {
            data: {
              setMyConsents: [
                ...membership.consents.map((c) => ({ __typename: 'Consent', ...c })),
                { __typename: 'Consent', purpose: 'MARKETING_SMS', granted: true, textVersion: 'app-fa-v1', method: 'MEMBER_APP', recordedAt: '2026-10-27T10:00:00Z' },
              ],
            },
          },
        },
      ],
      [session],
    );

    const marketing = await screen.findByRole('checkbox', { name: fa.consent.MARKETING_SMS });
    expect(marketing).not.toBeChecked();
    await fireEvent.press(marketing);
    expect(await screen.findByRole('checkbox', { name: fa.consent.MARKETING_SMS, checked: true })).toBeOnTheScreen();
    // Testimonials are switched on, so their consents are offered too.
    expect(screen.getByRole('checkbox', { name: fa.consent.PUBLISH_ON_WEBSITE })).toBeOnTheScreen();
  });
});
