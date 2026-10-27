import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Checkbox, colors, ErrorText, typography } from '@/components/ui';
import { CREATE_TESTIMONIAL, VISIT_BY_TOKEN, type ConsentPurpose } from '@/graphql/operations';
import { fa } from '@/i18n/fa';
import { consentAnswer, consentText, PUBLISH_PURPOSES } from '@/lib/consents';
import { errorMessage } from '@/lib/errors';
import { createFileTransport } from '@/lib/fileTransport';
import { uploadVideo, videoContentType } from '@/lib/upload';
import { createUploadApi } from '@/lib/uploadApi';

type Phase = { kind: 'editing' } | { kind: 'uploading'; progress: number } | { kind: 'saving' };

export default function ReviewScreen() {
  const { token, uri } = useLocalSearchParams<{ token: string; uri: string }>();
  const client = useApolloClient();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  // The visit screen already loaded the visit; its venue names the clinic in the consents.
  const clinic = useQuery(VISIT_BY_TOKEN, { variables: { token } }).data?.visitByToken?.venue.name ?? '';
  const [publish, setPublish] = useState<ConsentPurpose[]>([]);
  const [blurFace, setBlurFace] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });
  const [error, setError] = useState<string | null>(null);
  const [createTestimonial] = useMutation(CREATE_TESTIMONIAL);
  // Kept after a successful upload so a failed save is retried without uploading again.
  const uploadedVideoId = useRef<string | null>(null);
  const cancel = useRef<AbortController | null>(null);

  // Leaving the screen stops an upload in progress.
  useEffect(() => () => cancel.current?.abort(), []);

  const busy = phase.kind !== 'editing';

  async function submit() {
    setError(null);
    try {
      player.pause();
      if (!uploadedVideoId.current) {
        setPhase({ kind: 'uploading', progress: 0 });
        cancel.current = new AbortController();
        const { videoId } = await uploadVideo(createUploadApi(client, token), createFileTransport(uri), {
          contentType: videoContentType(uri),
          onProgress: (progress) => setPhase({ kind: 'uploading', progress }),
          signal: cancel.current.signal,
        });
        uploadedVideoId.current = videoId;
      }
      setPhase({ kind: 'saving' });
      await createTestimonial({
        variables: {
          input: {
            visitToken: token,
            videoId: uploadedVideoId.current,
            rating,
            text: text.trim() || null,
            // Recording was agreed to on the visit screen, with this wording, before recording.
            consents: [
              consentAnswer('TESTIMONIAL_RECORDING', true, clinic),
              ...PUBLISH_PURPOSES.map((purpose) => consentAnswer(purpose, publish.includes(purpose), clinic)),
            ],
            blurFace,
          },
        },
      });
      router.replace({ pathname: '/visit/[token]/done', params: { token } });
    } catch (e) {
      setError(errorMessage(e));
      setPhase({ kind: 'editing' });
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls />

        <Text style={typography.muted}>{fa.visit.rating}</Text>
        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityLabel={fa.visit.stars(value)}
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
          accessibilityLabel={fa.visit.note}
          editable={!busy}
          multiline
          onChangeText={setText}
          placeholder={fa.visit.note}
          style={styles.note}
          value={text}
        />

        <Card>
          <Text style={typography.heading}>{fa.visit.publishTitle}</Text>
          <Text style={typography.muted}>{fa.visit.publishBody}</Text>
          {PUBLISH_PURPOSES.map((purpose) => (
            <Checkbox
              key={purpose}
              label={fa.consent[purpose]}
              checked={publish.includes(purpose)}
              disabled={busy}
              onChange={(checked) =>
                setPublish((list) => (checked ? [...list, purpose] : list.filter((p) => p !== purpose)))
              }
            >
              <Text style={typography.muted}>{consentText(purpose, clinic)}</Text>
            </Checkbox>
          ))}
          <Checkbox label={fa.visit.blurFace} checked={blurFace} disabled={busy} onChange={setBlurFace} />
        </Card>

        {error && <ErrorText>{error}</ErrorText>}
        {phase.kind === 'uploading' && (
          <View accessibilityLabel={fa.visit.uploading(Math.round(phase.progress * 100))}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(phase.progress * 100)}%` }]} />
            </View>
          </View>
        )}

        <Button
          title={
            phase.kind === 'uploading'
              ? fa.visit.uploading(Math.round(phase.progress * 100))
              : phase.kind === 'saving'
                ? fa.visit.saving
                : fa.visit.submit
          }
          loading={phase.kind === 'saving'}
          disabled={busy}
          onPress={submit}
        />
        <Button
          title={fa.visit.again}
          variant="secondary"
          disabled={busy}
          onPress={() => router.replace({ pathname: '/visit/[token]/record', params: { token } })}
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
