// EXPO_PUBLIC_* variables are inlined at build time. See .env.example.
export const config = {
  graphqlUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL ?? 'http://localhost:8080/graphql',
  uploadUrl: process.env.EXPO_PUBLIC_UPLOAD_URL ?? 'http://localhost:3000/upload',
  // Keep testimonies short and under vidEngine's 100MB upload limit.
  maxRecordingSeconds: 60,
  maxUploadBytes: 100 * 1024 * 1024,
};
