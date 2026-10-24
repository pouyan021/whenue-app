import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useQuery } from '@apollo/client/react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, ErrorText, Screen, typography } from '@/components/ui';
import { VISIT_BY_TOKEN } from '@/graphql/operations';
import { config } from '@/lib/config';

export default function VisitScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, loading, error, refetch } = useQuery(VISIT_BY_TOKEN, {
    variables: { token },
  });

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ActivityIndicator />
      </Screen>
    );
  }

  // The API rejects an expired or altered token with a GraphQL error
  if (CombinedGraphQLErrors.is(error)) {
    return (
      <Screen>
        <Text style={typography.title}>This link has expired</Text>
        <Text style={typography.body}>
          Links to share a testimony only work for a few days. Ask the venue to send you a new one.
        </Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorText>We couldn’t load your visit. Check your connection and try again.</ErrorText>
        <Button title="Retry" onPress={() => refetch()} />
      </Screen>
    );
  }

  const visit = data?.visitByToken;
  if (!visit) {
    return (
      <Screen>
        <Text style={typography.title}>Visit not found</Text>
        <Text style={typography.body}>Double-check the link from your message.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (visit.testimonial) {
    return (
      <Screen>
        <Text style={typography.title}>Thanks, {visit.user.name}!</Text>
        <Text style={typography.body}>
          You’ve already shared a testimony for {visit.venue.name}.
        </Text>
      </Screen>
    );
  }

  const template = visit.campaign?.notificationTemplate;

  return (
    <Screen>
      <Text style={typography.title}>How was {visit.venue.name}?</Text>
      <Text style={typography.body}>
        Hi {visit.user.name}, record a short video (up to a minute) about your visit on{' '}
        {new Date(visit.visitDate).toLocaleDateString()}.
      </Text>
      {template?.incentive ? (
        <View>
          <Text style={typography.muted}>{template.incentive}</Text>
        </View>
      ) : null}
      <Button
        title={template?.callToAction ?? 'Record my testimony'}
        onPress={() => router.push({ pathname: '/visit/[token]/record', params: { token } })}
      />
      {__DEV__ && (
        // The iOS Simulator has no camera, so in development a saved video can stand in.
        <Button title="Pick a saved video (dev)" variant="secondary" onPress={() => pickVideo(token)} />
      )}
    </Screen>
  );
}

async function pickVideo(token: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: config.maxRecordingSeconds,
  });
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  if (uri) {
    router.push({ pathname: '/visit/[token]/review', params: { token, uri } });
  }
}
