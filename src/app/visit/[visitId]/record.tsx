import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Screen, typography } from '@/components/ui';
import { config } from '@/lib/config';

export default function RecordScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
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
          <Text style={typography.title}>Camera and microphone</Text>
          <Text style={typography.body}>
            We need access to your camera and microphone to record your testimony.
          </Text>
          {canAsk ? (
            <Button
              title="Allow access"
              onPress={async () => {
                if (!cameraPermission.granted) await requestCameraPermission();
                if (!micPermission.granted) await requestMicPermission();
              }}
            />
          ) : (
            <ErrorText>Access was denied. Enable it for Whenue in your device settings.</ErrorText>
          )}
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
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
      if (video?.uri) {
        router.replace({ pathname: '/visit/[visitId]/review', params: { visitId, uri: video.uri } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording failed.');
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
        onCameraReady={() => setReady(true)}
        onMountError={(e) => setError(e.message)}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          {!recording && (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.overlayText}>Cancel</Text>
            </Pressable>
          )}
          {recording && (
            <Text accessibilityLiveRegion="polite" style={styles.overlayText}>
              ● {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </Text>
          )}
          {!recording && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              hitSlop={12}
            >
              <Text style={styles.overlayText}>Flip</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.bottomBar}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
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
