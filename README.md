# whenue-app

Member app for Whenue's clinic loyalty clubs. Members join a clinic's club by signing in
with a code texted to their mobile, show a QR member card at reception, follow their
points, rewards and referrals, and manage their consents. Clinics with the testimonials
module also send visit links, where a member records a short video about their visit for
the clinic to review.

The app is in Persian and laid out right to left (see [Language](#language)).

Built with [Expo](https://expo.dev) (SDK 58), React Native, TypeScript, Expo Router
and Apollo Client. Talks to [whenue-api](https://github.com/pouyan021/whenue-api)
over GraphQL and uploads video straight to its object storage (RustFS locally, any S3
in production) through presigned URLs. [vidEngine](https://github.com/pouyan021/vidEngine)
then transcodes it in the background.

## Club

1. **Open** the club link, `whenue://club/<slug>`, or paste it on the home screen. A
   member's invitation link adds `?ref=<code>`, which fills in the friend's referral code.
   The public `club(slug)` query names the clinic before sign-in.
2. **Sign in** with `requestMemberLoginCode`, then `verifyMemberLoginCode` with the
   texted code. When the API answers `CONSENT_REQUIRED`, the person is not a member yet:
   the app asks for their name, consent to membership (required) and to marketing SMS
   (optional), and an optional referral code, then sends the same code again.
3. **Member card**: a QR code holding `whenue://member/<id>` (what the clinic panel scans
   at check-in), the points balance, rewards with how many points are still needed, how to
   earn points, the referral code with a share button, and the points history.
4. **Consents and account**: name and email, each consent given or withdrawn on its own
   (`setMyConsents`), and leaving the club (withdrawing `CLUB_MEMBERSHIP`).

Member tokens are per clinic, so a person can belong to several clubs. Each sign-in is kept
in the device keychain (`expo-secure-store`; localStorage on the web) and each club gets
its own Apollo client, since `myMembership` answers for whichever token is sent.

Consent wording is in `src/lib/consents.ts`, version `app-fa-v1`, and is stored with each
answer. It says the same as the clinic panel's paper form and still needs a lawyer's review.

## Testimonial flow

1. **Open** `whenue://visit/<token>`, the link in the venue's message, or paste that
   link on the home screen. The token comes from whenue-api's `issueVisitToken` and
   expires after the campaign's `linkExpiration` (72 hours by default).
2. **Visit** screen loads the visit, venue and campaign incentive from `visitByToken`.
   An expired or altered link gets its own message. Recording only starts after the person
   agrees to the recording consent's wording.
3. **Record** up to 60 seconds at 720p with the front or back camera (`expo-camera`).
4. **Review** the clip (`expo-video`), add an optional 1 to 5 star rating and note,
   choose where the clinic may show it (in the clinic, on its website, on its social
   media; all optional) and whether their face should be blurred first.
5. **Submit**:
   - `startVideoUpload` returns an 8 MB part size and a presigned URL per part.
   - Each slice of the file is PUT to its URL with the native uploader
     (`expo-file-system`), so the bytes never go through JS as base64. A failed part is
     retried up to 4 times with backoff, and a URL that expired is swapped for a fresh
     one from `refreshVideoUploadParts`.
   - `completeVideoUpload` gets every part's ETag, then `createTestimonial` takes the
     `videoId`, the consents answered (`TESTIMONIAL_RECORDING` granted and each publishing
     purpose) and `blurFace`. The API queues the transcode, and the testimonial starts as `PENDING` for
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

### One command to the camera (Android emulator)

With the backend up (`tilt up` in whenue-deploy, or `./gradlew bootRun` in whenue-api):

```bash
npm run android:dev              # opens the record screen
npm run android:dev -- --visit   # opens the visit screen, as tapping the link would
```

It boots your Android Studio emulator if none is running (front camera on your webcam),
runs the `adb reverse` commands below, makes a fresh visit link on the local API, starts
Metro and opens the link in Expo Go, installing Expo Go the first time. The record screen
skips the visit screen's consent step, which is fine for trying the camera; use `--visit`
to go through the whole flow. The script's header lists its settings, such as
`WHENUE_AVD` to pick an emulator and `WHENUE_FRONT_CAMERA=emulated` without a webcam.
It needs macOS or Linux (on Windows, use WSL or Git Bash).

### Getting a visit link

`npm run visit-link` prints a fresh visit token from the local API. The first time, it
creates a test clinic (`dev-clinic`, with testimonials on) and venue, logging in as
whenue-deploy's bootstrap admin (`WHENUE_ADMIN_EMAIL` and `WHENUE_ADMIN_PASSWORD` change
that). To do it by hand in GraphiQL (http://localhost:8080/graphiql):
1. Log in as the bootstrap admin with `login`, and send the token as `Authorization: Bearer <token>`.
2. Create a clinic with the testimonials module, a venue and a visit if you have none.
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

`npm run android:dev` does this for you.

`adb reverse` lasts until the emulator restarts. Re-run it after a restart.

**iOS Simulator.** It has no camera. Development builds show a **Pick a saved video
(dev)** button on the visit screen instead; drag a video file onto the simulator to add
it to Photos first. `localhost` reaches your machine without any setup.

**Physical device.** `localhost` is the phone itself. Put your machine's LAN IP in
`EXPO_PUBLIC_GRAPHQL_URL`, and start whenue-api with
`WHENUE_S3_PUBLIC_ENDPOINT=http://<LAN IP>:9000` so presigned URLs point somewhere the
phone can reach.

## Language

Members are Iranian clinics' patients, so the app is Persian only for now, with every
string in `src/i18n/fa.ts`. Numbers show in Persian digits and dates in the Solar Hijri
calendar (`src/lib/jalali.ts`, checked against Intl in the tests), on the clinic's time zone.
Digits typed on a Persian keyboard are accepted everywhere.

The layout is right to left on every device. Development builds get this from the
`expo-localization` plugin (`forcesRTL`). Expo Go cannot set it before the first launch,
so the app calls `I18nManager.forceRTL` and the layout flips from the second launch.

### Getting a club link

Create a clinic in the panel or in GraphiQL (`createOrganization`); its slug is the club
link: `whenue://club/<slug>`. With whenue-api's default SMS provider `log`, sign-in codes
are written to the API's log instead of being texted.

## Scripts

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `npm start`           | Start the Metro dev server                              |
| `npm run android:dev` | Emulator, ports, visit link and Metro in one go         |
| `npm run visit-link`  | Print a fresh visit token from the local API            |
| `npm run lint`        | ESLint (`eslint-config-expo`)                           |
| `npm run typecheck`   | `tsc --noEmit`                                          |
| `npm test`            | Jest (`jest-expo` preset)                               |

## Project layout

```
src/
  app/          Expo Router screens (file-based routes)
    club/[slug]/      index (member card), login, settings
    visit/[token]/    index, record, review, done
  components/   Shared UI and the QR code
  graphql/      Operations and their TypeScript types
  i18n/         The app's Persian wording
  lib/          Apollo client, sessions, club and visit links, consents, dates and
                numbers, multipart video upload
```

## Known gaps

- **Uploads run in the foreground.** Leaving the review screen cancels the upload, and
  a killed app starts over. Resuming from the last finished part is possible because
  each part is separate, but isn't built yet.
- **No processing status for visitors.** The done screen doesn't follow the transcode;
  `Video.status` is available if we want to show it.
- **Testimonial consents name the branch, not the clinic.** `visitByToken` gives the
  venue only, so the wording says "شعبه ونک" where the club wording says the clinic.
- **Club links only open the app.** There is no web page behind `https://…/club/<slug>`
  yet, so a member without the app needs the store link first.
- **Types are hand-written** in `src/graphql/operations.ts`. Add graphql-codegen
  once the schema is published.
