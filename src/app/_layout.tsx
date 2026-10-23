import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { createApolloClient } from '@/lib/apollo';

export default function RootLayout() {
  const [client] = useState(() => createApolloClient());

  return (
    <ApolloProvider client={client}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Whenue' }} />
        <Stack.Screen name="visit/[visitId]/index" options={{ title: 'Share your experience' }} />
        <Stack.Screen name="visit/[visitId]/record" options={{ headerShown: false }} />
        <Stack.Screen name="visit/[visitId]/review" options={{ title: 'Review' }} />
        <Stack.Screen
          name="visit/[visitId]/done"
          options={{ title: 'Thank you', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
    </ApolloProvider>
  );
}
