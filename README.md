# whenue-app

Mobile app for the Whenue video testimony platform. Visitors open a link from a
venue's notification, record a short video about their visit, and submit it for
the venue to review.

Built with [Expo](https://expo.dev) (SDK 58), React Native, TypeScript, Expo Router
and Apollo Client. Talks to [whenue-api](https://github.com/pouyan021/whenue-api)
over GraphQL and uploads video straight to its object storage (RustFS locally, any S3
in production) through presigned URLs. [vidEngine](https://github.com/pouyan021/vidEngine)
then transcodes it in the background.

## Flow

1. **Open** `whenue://visit/<token>`, the link in the venue's message, or paste that
   link on the home screen. The token comes from whenue-api's `issueVisitToken` and
   expires after the campaign's `linkExpiration` (72 hours by default).
2. **Visit** screen loads the visit, venue and campaign incentive from `visitByToken`.
   An expired or altered link gets its own message.
3. **Record** up to 60 seconds at 720p with the front or back camera (`expo-camera`).
4. **Review** the clip (`expo-video`), add an optional 1 to 5 star rating and note.
5. **Submit**:
   - `startVideoUpload` returns an 8 MB part size and a presigned URL per part.
   - Each slice of the file is PUT to its URL with the native uploader
     (`expo-file-system`), so the bytes never go through JS as base64. A failed part is
     retried up to 4 times with backoff, and a URL that expired is swapped for a fresh
     one from `refreshVideoUploadParts`.
   - `completeVideoUpload` gets every part's ETag, then `createTestimonial` takes the
     `videoId`. The API queues the transcode, and the testimonial starts as `PENDING` for
     venue moderation.
   - Cancelling or giving up calls `abortVideoUpload`. If only the save fails, Submit
     tries again without uploading the video again.

## Getting started

Run the backend first. In whenue-api, `./gradlew bootRun` starts Postgres, RustFS and
RabbitMQ through Docker Compose. In vidEngine, run `docker compose up --build` (see its
README) so uploaded videos get transcoded. Then:

```bash
npm install
cp .env.example .env.local   # only needed if the API isn't on localhost:8080
npm start
```

`expo-camera`, `expo-video`, `expo-file-system` and `expo-image-picker` are all in Expo
Go, so you can open the app in Expo Go from `npm start`. For a standalone build, use a
development build (`npx expo run:ios|android` or EAS).

### Getting a visit link

In GraphiQL (http://localhost:8080/graphiql):
1. Log in as the bootstrap admin with `login`, and send the token as `Authorization: Bearer <token>`.
2. Create a venue, a user and a visit if you have none.
3. Call `issueVisitToken(visitId: ...)`.

The link is `whenue://visit/<token>`. Paste it on the app's home screen, or open it
directly:

```bash
# Development build
adb shell am start -a android.intent.action.VIEW -d "whenue://visit/<token>"
xcrun simctl openurl booted "whenue://visit/<token>"
# Expo Go uses its own scheme
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081/--/visit/<token>"
```

### Emulators

Recording needs a camera, which decides the emulator.

**Android emulator (recommended).** It can record:
- In Android Studio's Device Manager, edit the virtual device and, under
  *Advanced settings*, set the front camera to **Webcam0** to use your computer's webcam.
- **VirtualScene** gives a 3D room you can walk around in. It works for the back camera.

Then point the emulator's `localhost` at your machine for the API and the storage that
presigned URLs use:

```bash
adb reverse tcp:8080 tcp:8080   # whenue-api
adb reverse tcp:9000 tcp:9000   # RustFS, the host in presigned upload URLs
```

`adb reverse` lasts until the emulator restarts. Re-run it after a restart.

**iOS Simulator.** It has no camera. Development builds show a **Pick a saved video
(dev)** button on the visit screen instead; drag a video file onto the simulator to add
it to Photos first. `localhost` reaches your machine without any setup.

**Physical device.** `localhost` is the phone itself. Put your machine's LAN IP in
`EXPO_PUBLIC_GRAPHQL_URL`, and start whenue-api with
`WHENUE_S3_PUBLIC_ENDPOINT=http://<LAN IP>:9000` so presigned URLs point somewhere the
phone can reach.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm start`         | Start the Metro dev server      |
| `npm run lint`      | ESLint (`eslint-config-expo`)   |
| `npm run typecheck` | `tsc --noEmit`                  |
| `npm test`          | Jest (`jest-expo` preset)       |

## Project layout

```
src/
  app/          Expo Router screens (file-based routes)
    visit/[token]/    index, record, review, done
  components/   Shared UI
  graphql/      Operations and their TypeScript types
  lib/          Apollo client, config, visit links, multipart video upload
```

## Known gaps

- **Uploads run in the foreground.** Leaving the review screen cancels the upload, and
  a killed app starts over. Resuming from the last finished part is possible because
  each part is separate, but isn't built yet.
- **No processing status for visitors.** The done screen doesn't follow the transcode;
  `Video.status` is available if we want to show it.
- **Types are hand-written** in `src/graphql/operations.ts`. Add graphql-codegen
  once the schema is published.
