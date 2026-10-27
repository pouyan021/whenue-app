import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';

import { fa } from '@/i18n/fa';
import { createApolloClient } from '@/lib/apollo';
import { SessionsProvider } from '@/lib/sessions';

// The app is in Persian, so it is laid out right to left whatever the phone's language.
// Development builds get this from the expo-localization plugin (forcesRTL); in Expo Go it
// takes effect from the next launch.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const [client] = useState(() => createApolloClient());

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.lang = 'fa';
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <SessionsProvider>
      <ApolloProvider client={client}>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Whenue' }} />
          <Stack.Screen name="club/[slug]" options={{ headerShown: false }} />
          <Stack.Screen name="visit/[token]/index" options={{ title: fa.visit.consentTitle }} />
          <Stack.Screen name="visit/[token]/record" options={{ headerShown: false }} />
          <Stack.Screen name="visit/[token]/review" options={{ title: fa.visit.reviewTitle }} />
          <Stack.Screen
            name="visit/[token]/done"
            options={{ title: fa.visit.doneTitle, headerBackVisible: false, gestureEnabled: false }}
          />
        </Stack>
      </ApolloProvider>
    </SessionsProvider>
  );
}
