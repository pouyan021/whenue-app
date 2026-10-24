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
        <Stack.Screen name="visit/[token]/index" options={{ title: 'Share your experience' }} />
        <Stack.Screen name="visit/[token]/record" options={{ headerShown: false }} />
        <Stack.Screen name="visit/[token]/review" options={{ title: 'Review' }} />
        <Stack.Screen
          name="visit/[token]/done"
          options={{ title: 'Thank you', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
    </ApolloProvider>
  );
}
