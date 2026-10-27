import { ApolloProvider, useApolloClient } from '@apollo/client/react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { fa } from '@/i18n/fa';
import { createApolloClient } from '@/lib/apollo';
import { config } from '@/lib/config';
import { useSessions } from '@/lib/sessions';

/** A clinic's club. Signed-in screens talk to the API as the member, with a client of their own. */
export default function ClubLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const publicClient = useApolloClient();
  const session = useSessions().session(slug);
  const token = session?.token;
  const memberClient = useMemo(() => (token ? createApolloClient(config.graphqlUrl, token) : null), [token]);

  return (
    <ApolloProvider client={memberClient ?? publicClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: session?.clinic ?? fa.club.member }} />
        <Stack.Screen name="login" options={{ title: fa.login.title }} />
        <Stack.Screen name="settings" options={{ title: fa.settings.title }} />
      </Stack>
    </ApolloProvider>
  );
}
