import { useQuery } from '@apollo/client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, ErrorText, Screen, typography } from '@/components/ui';
import { VISIT_FOR_TESTIMONY } from '@/graphql/operations';

export default function VisitScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { data, loading, error, refetch } = useQuery(VISIT_FOR_TESTIMONY, {
    variables: { id: visitId },
  });

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <ActivityIndicator />
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

  const visit = data?.visit;
  if (!visit) {
    return (
      <Screen>
        <Text style={typography.title}>Visit not found</Text>
        <Text style={typography.body}>Double-check the code from your message.</Text>
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
        onPress={() => router.push({ pathname: '/visit/[visitId]/record', params: { visitId } })}
      />
    </Screen>
  );
}
