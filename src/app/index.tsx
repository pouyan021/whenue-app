import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Button, colors, Screen, typography } from '@/components/ui';

/**
 * Entry point when the app is opened without a deep link. Visitors normally
 * arrive via whenue://visit/<id> from a venue's notification; this screen lets
 * them type the code from that message instead.
 */
export default function HomeScreen() {
  const [visitId, setVisitId] = useState('');
  const trimmed = visitId.trim();

  return (
    <Screen>
      <Text style={typography.title}>Record a video testimony</Text>
      <Text style={typography.body}>
        Enter the visit code from the message the venue sent you to get started.
      </Text>
      <TextInput
        accessibilityLabel="Visit code"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="number-pad"
        onChangeText={setVisitId}
        onSubmitEditing={() => trimmed && router.push(`/visit/${trimmed}`)}
        placeholder="Visit code"
        returnKeyType="go"
        style={styles.input}
        value={visitId}
      />
      <Button title="Continue" disabled={!trimmed} onPress={() => router.push(`/visit/${trimmed}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    fontSize: 16,
  },
});
