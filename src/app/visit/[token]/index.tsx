import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useQuery } from '@apollo/client/react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Checkbox, ErrorText, Loading, Screen, ScrollScreen, typography } from '@/components/ui';
import { VISIT_BY_TOKEN } from '@/graphql/operations';
import { fa } from '@/i18n/fa';
import { config } from '@/lib/config';
import { consentText } from '@/lib/consents';
import { formatDate } from '@/lib/dates';
import { keepRecording } from '@/lib/recordings';

export default function VisitScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, loading, error, refetch } = useQuery(VISIT_BY_TOKEN, {
    variables: { token },
  });
  // Recording needs the person's consent first; review sends it with the testimonial.
  const [agreed, setAgreed] = useState(false);

  if (loading) return <Loading />;

  // The API rejects an expired or altered token with a GraphQL error
  if (CombinedGraphQLErrors.is(error)) {
    return (
      <Screen>
        <Text style={typography.title}>{fa.visit.expiredTitle}</Text>
        <Text style={typography.body}>{fa.visit.expiredBody}</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorText>{fa.visit.loadFailed}</ErrorText>
        <Button title={fa.common.retry} onPress={() => refetch()} />
      </Screen>
    );
  }

  const visit = data?.visitByToken;
  if (!visit) {
    return (
      <Screen>
        <Text style={typography.title}>{fa.visit.notFoundTitle}</Text>
        <Text style={typography.body}>{fa.visit.notFoundBody}</Text>
        <Button title={fa.common.back} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (visit.testimonial) {
    return (
      <Screen>
        <Text style={typography.title}>{fa.visit.alreadyTitle(visit.user.name)}</Text>
        <Text style={typography.body}>{fa.visit.alreadyBody(visit.venue.name)}</Text>
      </Screen>
    );
  }

  const template = visit.campaign?.notificationTemplate;

  return (
    <ScrollScreen>
      <Text style={typography.title}>{fa.visit.title(visit.venue.name)}</Text>
      <Text style={typography.body}>{fa.visit.intro(visit.user.name, formatDate(visit.visitDate))}</Text>
      {template?.incentive ? (
        <View>
          <Text style={typography.muted}>{template.incentive}</Text>
        </View>
      ) : null}
      <Checkbox label={fa.consent.agree} checked={agreed} onChange={setAgreed}>
        <Text style={typography.muted}>{consentText('TESTIMONIAL_RECORDING', visit.venue.name)}</Text>
      </Checkbox>
      <Button
        title={template?.callToAction ?? fa.visit.record}
        disabled={!agreed}
        onPress={() => router.push({ pathname: '/visit/[token]/record', params: { token } })}
      />
      {__DEV__ && (
        // The iOS Simulator has no camera, so in development a saved video can stand in.
        <Button title={fa.visit.pickSaved} variant="secondary" disabled={!agreed} onPress={() => pickVideo(token)} />
      )}
    </ScrollScreen>
  );
}

async function pickVideo(token: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: config.maxRecordingSeconds,
  });
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  if (uri) {
    keepRecording(token, uri);
    router.push({ pathname: '/visit/[token]/review', params: { token } });
  }
}
