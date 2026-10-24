// EXPO_PUBLIC_* variables are inlined at build time. See .env.example.
export const config = {
  graphqlUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL ?? 'http://localhost:8080/graphql',
  maxRecordingSeconds: 60,
  // whenue-api's limit (whenue.video.max-size). A minute of 720p is far below it.
  maxUploadBytes: 500 * 1024 * 1024,
  // Tries per part before the upload gives up, with a growing pause between them.
  partAttempts: 4,
};
