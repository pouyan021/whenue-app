import { useMutation, useQuery } from '@apollo/client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Checkbox, ErrorText, Field, Loading, ScrollScreen, typography } from '@/components/ui';
import {
  MY_MEMBERSHIP,
  SET_MY_CONSENTS,
  UPDATE_MY_PROFILE,
  type ConsentPurpose,
  type Membership,
} from '@/graphql/operations';
import { fa } from '@/i18n/fa';
import { confirm } from '@/lib/confirm';
import { consentAnswer, consentText, PUBLISH_PURPOSES } from '@/lib/consents';
import { errorMessage } from '@/lib/errors';
import { useSessions } from '@/lib/sessions';

/** The member's profile and consents, each of which they can give or withdraw at any time. */
export default function SettingsScreen() {
  const { data, error, refetch } = useQuery(MY_MEMBERSHIP);
  const membership = data?.myMembership;

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

  return (
    <ScrollScreen>
      <Profile membership={membership} />
      <Consents membership={membership} />
      <Leave membership={membership} />
    </ScrollScreen>
  );
}

function Profile({ membership }: { membership: Membership }) {
  const [update, { loading, error, data }] = useMutation(UPDATE_MY_PROFILE);
  const [name, setName] = useState(membership.name ?? '');
  const [email, setEmail] = useState(membership.email ?? '');

  return (
    <Card>
      <Text style={typography.heading}>{fa.settings.profile}</Text>
      <Field label={fa.settings.name} autoComplete="name" value={name} onChangeText={setName} />
      <Field
        label={fa.settings.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error && <ErrorText>{errorMessage(error)}</ErrorText>}
      {data && !loading && <Text style={typography.muted}>{fa.settings.saved}</Text>}
      <Button
        title={fa.common.save}
        disabled={!name.trim()}
        loading={loading}
        onPress={() =>
          void update({ variables: { input: { name: name.trim(), email: email.trim() } } }).catch(() => undefined)
        }
      />
    </Card>
  );
}

function useSetConsent(membership: Membership) {
  return useMutation(SET_MY_CONSENTS, {
    update(cache, { data }) {
      if (!data) return;
      cache.modify({
        id: cache.identify({ __typename: 'Member', id: membership.id }),
        fields: { consents: () => data.setMyConsents },
      });
    },
  });
}

function Consents({ membership }: { membership: Membership }) {
  const clinic = membership.organization.name;
  const [setConsents, { loading, error }] = useSetConsent(membership);
  const testimonials = membership.organization.modules.some((m) => m.module === 'TESTIMONIALS' && m.enabled);
  const purposes: ConsentPurpose[] = [
    'MARKETING_SMS',
    ...(testimonials ? (['TESTIMONIAL_RECORDING', ...PUBLISH_PURPOSES] as ConsentPurpose[]) : []),
  ];
  const granted = (purpose: ConsentPurpose) =>
    membership.consents.some((c) => c.purpose === purpose && c.granted);

  async function change(purpose: ConsentPurpose, grant: boolean) {
    if (!grant && purpose === 'TESTIMONIAL_RECORDING' && !(await confirm(fa.settings.withdrawRecordingConfirm))) {
      return;
    }
    void setConsents({ variables: { consents: [consentAnswer(purpose, grant, clinic)] } }).catch(() => undefined);
  }

  return (
    <Card>
      <Text style={typography.heading}>{fa.settings.consents}</Text>
      <Text style={typography.muted}>{fa.settings.consentsBody}</Text>
      {purposes.map((purpose) => (
        <Checkbox
          key={purpose}
          label={fa.consent[purpose]}
          checked={granted(purpose)}
          disabled={loading}
          onChange={(checked) => void change(purpose, checked)}
        >
          <Text style={typography.muted}>{consentText(purpose, clinic)}</Text>
        </Checkbox>
      ))}
      {error && <ErrorText>{errorMessage(error)}</ErrorText>}
    </Card>
  );
}

function Leave({ membership }: { membership: Membership }) {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { signOut } = useSessions();
  const [setConsents, { loading, error }] = useSetConsent(membership);

  async function leave() {
    if (!(await confirm(fa.settings.leaveConfirm))) return;
    try {
      await setConsents({
        variables: { consents: [consentAnswer('CLUB_MEMBERSHIP', false, membership.organization.name)] },
      });
      await signOut(slug);
      router.replace('/');
    } catch {
      // The error is shown below.
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={typography.muted}>{fa.settings.leaveBody}</Text>
      {error && <ErrorText>{errorMessage(error)}</ErrorText>}
      <Button title={fa.settings.leave} variant="secondary" loading={loading} onPress={leave} />
    </View>
  );
}
