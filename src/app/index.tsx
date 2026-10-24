import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Button, colors, ErrorText, Screen, typography } from '@/components/ui';
import { parseVisitToken } from '@/lib/visitLink';

/**
 * Entry point when the app is opened without a deep link. Visitors normally
 * arrive via whenue://visit/<token> from a venue's notification; this screen lets
 * them paste that link instead.
 */
export default function HomeScreen() {
  const [link, setLink] = useState('');
  const [invalid, setInvalid] = useState(false);

  function open() {
    const token = parseVisitToken(link);
    setInvalid(!token);
    if (token) router.push({ pathname: '/visit/[token]', params: { token } });
  }

  return (
    <Screen>
      <Text style={typography.title}>Record a video testimony</Text>
      <Text style={typography.body}>
        Paste the link from the message the venue sent you to get started.
      </Text>
      <TextInput
        accessibilityLabel="Visit link"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onChangeText={setLink}
        onSubmitEditing={open}
        placeholder="Visit link"
        returnKeyType="go"
        style={styles.input}
        value={link}
      />
      {invalid && <ErrorText>That doesn’t look like a visit link. Copy the whole link from the message.</ErrorText>}
      <Button title="Continue" disabled={!link.trim()} onPress={open} />
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
