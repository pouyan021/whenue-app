import { useMutation } from '@apollo/client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, colors, ErrorText, typography } from '@/components/ui';
import { CREATE_TESTIMONIAL } from '@/graphql/operations';
import { uploadVideo } from '@/lib/upload';

type Phase = { kind: 'editing' } | { kind: 'uploading'; progress: number } | { kind: 'saving' };

export default function ReviewScreen() {
  const { visitId, uri } = useLocalSearchParams<{ visitId: string; uri: string }>();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });
  const [error, setError] = useState<string | null>(null);
  const [createTestimonial] = useMutation(CREATE_TESTIMONIAL);

  const busy = phase.kind !== 'editing';

  async function submit() {
    setError(null);
    try {
      player.pause();
      setPhase({ kind: 'uploading', progress: 0 });
      const { videoUrl } = await uploadVideo(uri, {
        onProgress: (progress) => setPhase({ kind: 'uploading', progress }),
      });
      setPhase({ kind: 'saving' });
      await createTestimonial({
        variables: { input: { visitId, videoUrl, rating, text: text.trim() || null } },
      });
      router.replace({ pathname: '/visit/[visitId]/done', params: { visitId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPhase({ kind: 'editing' });
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls />

        <Text style={typography.muted}>How would you rate your visit?</Text>
        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityLabel={`${value} star${value > 1 ? 's' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: rating === value }}
              disabled={busy}
              hitSlop={6}
              onPress={() => setRating(value)}
            >
              <Text style={[styles.star, rating !== null && value <= rating && styles.starOn]}>★</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          accessibilityLabel="Add a note (optional)"
          editable={!busy}
          multiline
          onChangeText={setText}
          placeholder="Add a note (optional)"
          style={styles.note}
          value={text}
        />

        {error && <ErrorText>{error}</ErrorText>}
        {phase.kind === 'uploading' && (
          <View accessibilityLabel={`Uploading, ${Math.round(phase.progress * 100)} percent`}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(phase.progress * 100)}%` }]} />
            </View>
          </View>
        )}

        <Button
          title={phase.kind === 'uploading' ? 'Uploading…' : phase.kind === 'saving' ? 'Saving…' : 'Submit'}
          loading={phase.kind === 'saving'}
          disabled={busy}
          onPress={submit}
        />
        <Button
          title="Record again"
          variant="secondary"
          disabled={busy}
          onPress={() => router.replace({ pathname: '/visit/[visitId]/record', params: { visitId } })}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, backgroundColor: colors.background },
  video: { width: '100%', aspectRatio: 9 / 16, maxHeight: 420, borderRadius: 16, backgroundColor: '#000' },
  stars: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 36, color: colors.border },
  starOn: { color: '#F59E0B' },
  note: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 96,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
});
