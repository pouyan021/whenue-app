import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Screen, typography } from '@/components/ui';
import { fa } from '@/i18n/fa';
import { config } from '@/lib/config';
import { toPersianDigits } from '@/lib/numbers';
import { keepRecording } from '@/lib/recordings';

export default function RecordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  if (!cameraPermission || !micPermission) {
    // Permission state is still loading.
    return <View style={styles.camera} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    const canAsk = cameraPermission.canAskAgain && micPermission.canAskAgain;
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Screen>
          <Text style={typography.title}>{fa.visit.cameraTitle}</Text>
          <Text style={typography.body}>{fa.visit.cameraBody}</Text>
          {canAsk ? (
            <Button
              title={fa.visit.allow}
              onPress={async () => {
                if (!cameraPermission.granted) await requestCameraPermission();
                if (!micPermission.granted) await requestMicPermission();
              }}
            />
          ) : (
            <ErrorText>{fa.visit.denied}</ErrorText>
          )}
          <Button title={fa.common.cancel} variant="secondary" onPress={() => router.back()} />
        </Screen>
      </SafeAreaView>
    );
  }

  async function startRecording() {
    if (!cameraRef.current) return;
    setError(null);
    setElapsed(0);
    setRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: config.maxRecordingSeconds,
        maxFileSize: config.maxUploadBytes,
      });
      if (!video?.uri) return;
      // expo-camera resolves even when the camera stopped sending frames (CameraX
      // ERROR_SOURCE_INACTIVE), leaving an empty file. Say so here rather than at upload.
      if (!(new File(video.uri).size ?? 0)) {
        setError(fa.visit.recordingEmpty);
        return;
      }
      keepRecording(token, video.uri);
      router.replace({ pathname: '/visit/[token]/review', params: { token } });
    } catch {
      setError(fa.visit.recordingFailed);
    } finally {
      setRecording(false);
    }
  }

  const remaining = config.maxRecordingSeconds - elapsed;

  return (
    <View style={styles.camera}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        // Enough for a testimony and keeps uploads small; vidEngine encodes 720p anyway
        videoQuality="720p"
        onCameraReady={() => setReady(true)}
        onMountError={(e) => setError(e.message)}
      />
      <SafeAreaView style={styles.overlay}>
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
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              hitSlop={12}
            >
              <Text style={styles.overlayText}>{fa.visit.flip}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.bottomBar}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            accessibilityLabel={recording ? fa.visit.stopRecording : fa.visit.startRecording}
            accessibilityRole="button"
            disabled={!ready}
            onPress={() => (recording ? cameraRef.current?.stopRecording() : startRecording())}
            style={[styles.shutter, !ready && { opacity: 0.4 }]}
          >
            <View style={recording ? styles.shutterStop : styles.shutterRecord} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  bottomBar: { alignItems: 'center', paddingBottom: 32, gap: 12 },
  overlayText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  errorText: { color: '#FCA5A5', fontSize: 14, paddingHorizontal: 20, textAlign: 'center' },
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
