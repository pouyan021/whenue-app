import { useQuery } from '@apollo/client/react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, Share, StyleSheet, Text, View } from 'react-native';

import { QrCode } from '@/components/QrCode';
import { Button, Card, colors, ErrorText, Loading, ScrollScreen, typography } from '@/components/ui';
import { MY_MEMBERSHIP, MY_POINT_ENTRIES, type Membership } from '@/graphql/operations';
import { fa } from '@/i18n/fa';
import { clubLink } from '@/lib/clubLink';
import { formatDate } from '@/lib/dates';
import { errorMessage, isSignedOut } from '@/lib/errors';
import { formatNumber, formatPointsChange, rialToToman } from '@/lib/numbers';
import { useSessions } from '@/lib/sessions';

const HISTORY_PAGE = 10;

/** The member's club card: QR code for reception, points, rewards, referrals and history. */
export default function MembershipScreen() {
  const { slug, ref } = useLocalSearchParams<{ slug: string; ref?: string }>();
  const { ready, session, signOut } = useSessions();
  const signedIn = session(slug);
  const { data, loading, error, refetch } = useQuery(MY_MEMBERSHIP, {
    skip: !signedIn,
    fetchPolicy: 'cache-and-network',
  });
  const membership = data?.myMembership;
  // A member who left the club, or whose sign-in was refused, signs in again.
  const lost = !!signedIn && ((!loading && data && !membership?.memberSince) || isSignedOut(error));

  useEffect(() => {
    if (lost) void signOut(slug);
  }, [lost, signOut, slug]);

  if (!ready) return <Loading />;
  if (!signedIn || lost) {
    return <Redirect href={{ pathname: '/club/[slug]/login', params: ref ? { slug, ref } : { slug } }} />;
  }
  if (!membership) {
    if (error) {
      return (
        <ScrollScreen>
          <ErrorText>{errorMessage(error)}</ErrorText>
          <Button title={fa.common.retry} onPress={() => refetch()} />
        </ScrollScreen>
      );
    }
    return <Loading />;
  }

  const enabled = (module: string) => membership.organization.modules.some((m) => m.module === module && m.enabled);

  return (
    <ScrollScreen refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refetch()} />}>
      <MemberCard membership={membership} />
      <Rewards membership={membership} />
      <HowToEarn membership={membership} testimonials={enabled('TESTIMONIALS')} referrals={enabled('REFERRALS')} />
      {enabled('REFERRALS') && membership.referralCode && <Referral membership={membership} />}
      <History timeZone={membership.organization.timeZone} />
      <Button
        title={fa.club.settings}
        variant="secondary"
        onPress={() => router.push({ pathname: '/club/[slug]/settings', params: { slug } })}
      />
      <Button
        title={fa.club.signOut}
        variant="secondary"
        onPress={async () => {
          await signOut(slug);
          router.replace('/');
        }}
      />
    </ScrollScreen>
  );
}

function MemberCard({ membership }: { membership: Membership }) {
  return (
    <Card style={styles.memberCard}>
      <Text style={typography.heading}>{membership.organization.name}</Text>
      <Text style={typography.body}>{membership.name}</Text>
      <QrCode value={`whenue://member/${membership.id}`} size={200} label={fa.club.cardHint} />
      <Text style={[typography.muted, styles.center]}>{fa.club.cardHint}</Text>
      <View style={styles.balance}>
        <Text style={typography.muted}>{fa.club.balance}</Text>
        <Text style={styles.balanceValue}>{formatNumber(membership.pointsBalance)}</Text>
      </View>
    </Card>
  );
}

function Rewards({ membership }: { membership: Membership }) {
  const rewards = membership.organization.rewards;
  return (
    <View style={styles.section}>
      <Text style={typography.heading}>{fa.club.rewards}</Text>
      {rewards.length === 0 ? (
        <Text style={typography.muted}>{fa.club.noRewards}</Text>
      ) : (
        rewards.map((reward) => {
          const missing = reward.pointsCost - membership.pointsBalance;
          return (
            <Card key={reward.id} style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={typography.body}>{reward.name}</Text>
                {reward.description ? <Text style={typography.muted}>{reward.description}</Text> : null}
                <Text style={[typography.muted, missing <= 0 && styles.ready]}>
                  {missing > 0 ? fa.club.pointsToGo(missing) : fa.club.redeemHint}
                </Text>
              </View>
              <Text style={styles.cost}>{fa.common.points(reward.pointsCost)}</Text>
            </Card>
          );
        })
      )}
    </View>
  );
}

function HowToEarn({
  membership,
  testimonials,
  referrals,
}: {
  membership: Membership;
  testimonials: boolean;
  referrals: boolean;
}) {
  const program = membership.organization.loyaltyProgram;
  const lines = [
    program.pointsPerVisit > 0 && fa.club.earnVisit(program.pointsPerVisit),
    program.pointsPerSpendUnit > 0 &&
      fa.club.earnSpend(program.pointsPerSpendUnit, rialToToman(program.spendUnitRial)),
    testimonials && program.testimonialPoints > 0 && fa.club.earnTestimonial(program.testimonialPoints),
    referrals && program.referrerPoints > 0 && fa.club.earnReferral(program.referrerPoints),
  ].filter((line): line is string => !!line);
  if (lines.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={typography.heading}>{fa.club.howToEarn}</Text>
      {lines.map((line) => (
        <Text key={line} style={typography.body}>{`• ${line}`}</Text>
      ))}
    </View>
  );
}

function Referral({ membership }: { membership: Membership }) {
  const { organization, referralCode, referrals } = membership;
  const program = organization.loyaltyProgram;
  return (
    <Card>
      <Text style={typography.heading}>{fa.club.referTitle}</Text>
      <Text style={typography.body}>{fa.club.referBody(program.referrerPoints, program.friendPoints)}</Text>
      <Text style={typography.muted}>{fa.club.yourCode}</Text>
      <Text selectable style={styles.code}>
        {referralCode}
      </Text>
      <Button
        title={fa.club.share}
        onPress={() =>
          void Share.share({
            message: fa.club.shareMessage(
              organization.name,
              referralCode!,
              clubLink(organization.slug, referralCode),
            ),
          })
        }
      />
      <Text style={typography.muted}>{fa.club.referrals(referrals.qualified, referrals.pending)}</Text>
    </Card>
  );
}

function History({ timeZone }: { timeZone: string }) {
  const [size, setSize] = useState(HISTORY_PAGE);
  const { data, loading } = useQuery(MY_POINT_ENTRIES, { variables: { size }, fetchPolicy: 'cache-and-network' });
  const entries = data?.myMembership?.pointEntries ?? [];
  return (
    <View style={styles.section}>
      <Text style={typography.heading}>{fa.club.history}</Text>
      {entries.length === 0 && !loading && <Text style={typography.muted}>{fa.club.noHistory}</Text>}
      {entries.map((entry) => (
        <View key={entry.id} style={styles.historyRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.body}>{fa.pointKind[entry.kind]}</Text>
            <Text style={typography.muted}>
              {formatDate(entry.createdAt, timeZone)}
              {entry.note ? ` · ${entry.note}` : ''}
            </Text>
          </View>
          <Text style={[styles.change, entry.points < 0 ? styles.spent : styles.earned]}>
            {formatPointsChange(entry.points)}
          </Text>
        </View>
      ))}
      {entries.length === size && (
        <Button title={fa.club.showMore} variant="secondary" onPress={() => setSize(size + HISTORY_PAGE)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  memberCard: { alignItems: 'center', backgroundColor: '#EFF6FF' },
  center: { textAlign: 'center' },
  balance: { alignItems: 'center' },
  balanceValue: { fontSize: 40, fontWeight: '700', color: colors.primary },
  section: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cost: { fontSize: 15, fontWeight: '700', color: colors.primary },
  ready: { color: colors.success },
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 4, color: colors.text, textAlign: 'center' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  change: { fontSize: 16, fontWeight: '700' },
  earned: { color: colors.success },
  spent: { color: colors.danger },
});
