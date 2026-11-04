import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText, Screen, typography } from '@/components/ui';
import { fa } from '@/i18n/fa';
import { keepBrowserVideo } from '@/lib/browserVideos';
import { config } from '@/lib/config';
import { toPersianDigits } from '@/lib/numbers';
import { keepRecording } from '@/lib/recordings';

/**
 * Recording in a phone browser, for visitors who open the visit link without the app: the
 * camera through getUserMedia and the file through MediaRecorder. iPhone Safari records MP4,
 * Chrome MP4 or WebM, Firefox WebM; whenue-api takes all three.
 */

// Most compatible first; vidEngine turns any of them into the same 720p MP4
const MIME_TYPES = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
// About 19 MB for a full minute: plenty for 720p and quick to upload on mobile data
const BITS_PER_SECOND = 2_500_000;

type Facing = 'user' | 'environment';
type Problem = 'denied' | 'failed' | 'empty' | 'tooLarge';

export default function RecordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [facing, setFacing] = useState<Facing>('user');
  // Which camera is showing; ready once it is the one asked for
  const [streaming, setStreaming] = useState<Facing | null>(null);
  const ready = streaming === facing;
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  // The browser's own error, shown small under ours so a failure on a real phone can be reported
  const [detail, setDetail] = useState<string | null>(null);

  // Also false on plain http, where browsers hide the camera
  const supported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  // Opens the camera, again whenever the person flips it, and closes it on leaving
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      .then((stream) => {
        if (cancelled) {
          stopTracks(stream);
          return;
        }
        streamRef.current = stream;
        const preview = videoRef.current;
        if (preview) {
          preview.srcObject = stream;
          // iOS Safari can leave a stream preview paused despite autoPlay
          preview.play().catch(() => {});
        }
        setProblem(null);
        setStreaming(facing);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        setDetail(describe(error));
        setProblem(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed');
      });
    return () => {
      cancelled = true;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.ondataavailable = null;
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      if (streamRef.current) stopTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [facing, supported]);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // Stops at the length limit, like the app's camera does
  useEffect(() => {
    if (recording && elapsed >= config.maxRecordingSeconds) recorderRef.current?.stop();
  }, [recording, elapsed]);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    setDetail(null);
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      // Hand over data every second, so a long recording isn't one big buffer at the end
      recorder = startRecorder(stream, (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
    } catch (error) {
      setDetail(describe(error));
      setProblem('failed');
      return;
    }
    const mimeType = recorder.mimeType;
    recorder.onerror = (event) => {
      setDetail(describe((event as Event & { error?: unknown }).error ?? event.type));
      setProblem('failed');
    };
    recorder.onstop = () => {
      setRecording(false);
      const video = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/mp4' });
      if (video.size === 0) {
        setProblem('empty');
        return;
      }
      if (video.size > config.maxUploadBytes) {
        setProblem('tooLarge');
        return;
      }
      keepRecording(token, keepBrowserVideo(video));
      router.replace({ pathname: '/visit/[token]/review', params: { token } });
    };
    recorderRef.current = recorder;
    setProblem(null);
    setElapsed(0);
    setRecording(true);
  }

  if (problem === 'denied' || !supported) {
    return (
      <Screen>
        <Text style={typography.title}>{fa.visit.cameraTitle}</Text>
        <ErrorText>{problem === 'denied' ? fa.visit.browserDenied : fa.visit.browserUnsupported}</ErrorText>
        <Button title={fa.common.cancel} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const remaining = Math.max(0, config.maxRecordingSeconds - elapsed);
  const message =
    problem === 'empty'
      ? fa.visit.recordingEmpty
      : problem === 'failed' || problem === 'tooLarge'
        ? fa.visit.recordingFailed
        : null;

  return (
    <View style={styles.camera}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        // A selfie preview reads naturally mirrored; the recording itself is not
        style={{ ...previewStyle, transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
      />
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          {!recording && (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.overlayText}>{fa.common.cancel}</Text>
            </Pressable>
          )}
          {recording && (
            <Text accessibilityLiveRegion="polite" style={styles.overlayText}>
              ● {toPersianDigits(`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`)}
            </Text>
          )}
          {!recording && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
              hitSlop={12}
            >
              <Text style={styles.overlayText}>{fa.visit.flip}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.bottomBar}>
          {message && <Text style={styles.errorText}>{message}</Text>}
          {message && detail && <Text style={styles.detailText}>{detail}</Text>}
          <Pressable
            accessibilityLabel={recording ? fa.visit.stopRecording : fa.visit.startRecording}
            accessibilityRole="button"
            disabled={!ready}
            onPress={() => (recording ? recorderRef.current?.stop() : startRecording())}
            style={[styles.shutter, !ready && { opacity: 0.4 }]}
          >
            <View style={recording ? styles.shutterStop : styles.shutterRecord} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Starts recording in the first format the browser both claims and actually accepts. Some
 * browsers report support for a type and then refuse it in the constructor or in start(), so
 * each candidate is tried for real, and last of all the browser's own default.
 */
function startRecorder(stream: MediaStream, onData: (event: BlobEvent) => void): MediaRecorder {
  const candidates: (MediaRecorderOptions | undefined)[] = [
    ...MIME_TYPES.filter((type) => MediaRecorder.isTypeSupported(type)).map((mimeType) => ({
      mimeType,
      videoBitsPerSecond: BITS_PER_SECOND,
    })),
    { videoBitsPerSecond: BITS_PER_SECOND },
    undefined,
  ];
  let lastError: unknown;
  for (const options of candidates) {
    try {
      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = onData;
      recorder.start(1000);
      return recorder;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

const previewStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  backgroundColor: '#000',
} as const;

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  bottomBar: { alignItems: 'center', paddingBottom: 32, gap: 12 },
  overlayText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  errorText: { color: '#FCA5A5', fontSize: 14, paddingHorizontal: 20, textAlign: 'center' },
  detailText: { color: '#D1D5DB', fontSize: 11, paddingHorizontal: 20, textAlign: 'center', writingDirection: 'ltr' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRecord: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#EF4444' },
  shutterStop: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#EF4444' },
});
