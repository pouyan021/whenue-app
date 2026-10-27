import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, colors, ErrorText, Field, ScrollScreen, typography } from '@/components/ui';
import { fa } from '@/i18n/fa';
import { parseClubLink } from '@/lib/clubLink';
import { useSessions } from '@/lib/sessions';
import { parseVisitToken } from '@/lib/visitLink';

/**
 * Entry point when the app is opened without a deep link: the clubs the person belongs to,
 * and fields to paste a club link (whenue://club/<slug>) or a visit link
 * (whenue://visit/<token>) from a clinic's message.
 */
export default function HomeScreen() {
  const { sessions } = useSessions();
  const [clubInput, setClubInput] = useState('');
  const [clubInvalid, setClubInvalid] = useState(false);
  const [visitInput, setVisitInput] = useState('');
  const [visitInvalid, setVisitInvalid] = useState(false);

  function openClub() {
    const link = parseClubLink(clubInput);
    setClubInvalid(!link);
    if (!link) return;
    router.push({
      pathname: '/club/[slug]',
      params: link.referralCode ? { slug: link.slug, ref: link.referralCode } : { slug: link.slug },
    });
  }

  function openVisit() {
    const token = parseVisitToken(visitInput);
    setVisitInvalid(!token);
    if (token) router.push({ pathname: '/visit/[token]', params: { token } });
  }

  return (
    <ScrollScreen>
      <Text style={typography.title}>{fa.home.title}</Text>
      {sessions.length === 0 ? (
        <Text style={typography.muted}>{fa.home.empty}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {sessions.map((session) => (
            <Pressable
              key={session.slug}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/club/[slug]', params: { slug: session.slug } })}
              style={({ pressed }) => [styles.club, pressed && { opacity: 0.8 }]}
            >
              <Text style={typography.heading}>{session.clinic}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Card>
        <Text style={typography.heading}>{fa.home.joinTitle}</Text>
        <Text style={typography.body}>{fa.home.joinBody}</Text>
        <Field
          label={fa.home.clubLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="whenue://club/…"
          returnKeyType="go"
          value={clubInput}
          onChangeText={setClubInput}
          onSubmitEditing={openClub}
        />
        {clubInvalid && <ErrorText>{fa.home.invalidLink}</ErrorText>}
        <Button title={fa.home.open} disabled={!clubInput.trim()} onPress={openClub} />
      </Card>

      <Card>
        <Text style={typography.heading}>{fa.home.visitTitle}</Text>
        <Text style={typography.body}>{fa.home.visitBody}</Text>
        <Field
          label={fa.home.visitLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="whenue://visit/…"
          returnKeyType="go"
          value={visitInput}
          onChangeText={setVisitInput}
          onSubmitEditing={openVisit}
        />
        {visitInvalid && <ErrorText>{fa.home.invalidVisitLink}</ErrorText>}
        <Button title={fa.home.open} variant="secondary" disabled={!visitInput.trim()} onPress={openVisit} />
      </Card>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  club: { borderRadius: 16, padding: 16, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: colors.primary },
});
