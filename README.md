# whenue-app

Mobile app for the Whenue video testimony platform. Visitors open a link from a
venue's notification, record a short video about their visit, and submit it for
the venue to review.

Built with [Expo](https://expo.dev) (SDK 58), React Native, TypeScript, Expo Router
and Apollo Client. Talks to [whenue-api](https://github.com/pouyan021/whenue-api)
over GraphQL and uploads video to a
[vidEngine](https://github.com/pouyan021/videngin)-compatible `POST /upload` endpoint.

## Flow

1. **Open** `whenue://visit/<visitId>` (or type the visit code on the home screen).
2. **Visit** screen loads the visit, venue and campaign incentive from `visit(id)`.
3. **Record** up to 60 seconds with the front or back camera (`expo-camera`).
4. **Review** the clip (`expo-video`), add an optional 1 to 5 star rating and note.
5. **Submit** uploads the file with progress, then calls `createTestimonial` with the
   returned `videoUrl`. The testimonial starts as `PENDING` for venue moderation.

## Getting started

```bash
npm install
cp .env.example .env.local   # point at your whenue-api and upload service
npm start
```

Camera recording needs a real device. `expo-camera` and `expo-video` are included in
Expo Go, so you can scan the QR code from `npm start` with Expo Go. For a
standalone build, use a development build (`npx expo run:ios|android` or EAS).

On a physical device, `localhost` is the phone itself. Use your computer's LAN IP
in `.env.local`.

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
    visit/[visitId]/  index, record, review, done
  components/   Shared UI
  graphql/      Operations and their TypeScript types
  lib/          Apollo client, config, video upload
```

## Known gaps

- **No auth.** whenue-api has none yet, so anyone with a visit id can submit. The
  deep link should carry a signed, expiring token once the API supports it
  (`NotificationTemplate.linkExpiration` already hints at this).
- **Upload target.** vidEngine's `/upload` transcodes to MP4 (audio copied) but
  responds only after encoding finishes, so long clips keep the request open. The
  client only depends on the multipart `video` field and a `download_url` in the
  response, so it can switch to a signed GCS upload URL from whenue-api without
  changing the screens.
- **Types are hand-written** in `src/graphql/operations.ts`. Add graphql-codegen
  once the schema is published.
