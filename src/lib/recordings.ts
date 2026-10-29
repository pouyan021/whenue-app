/**
 * The video waiting on the review screen, by visit token. It does not travel as a route
 * param because useLocalSearchParams runs decodeURIComponent on every param, which breaks
 * file URIs holding encoded percent signs. Expo Go's always do: its files live under
 * …/ExperienceData/%2540anonymous%252Fwhenue-app-…/, which turned into a path that does
 * not exist, so the review screen played nothing and the upload found an empty file.
 */
const recordings = new Map<string, string>();

export function keepRecording(token: string, uri: string) {
  recordings.set(token, uri);
}

export function recordingFor(token: string): string | undefined {
  return recordings.get(token);
}

export function forgetRecording(token: string) {
  recordings.delete(token);
}
