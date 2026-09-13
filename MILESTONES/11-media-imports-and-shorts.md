# Controlled imports and collector Shorts

Implemented: server-side automatic import publication, bounded/optimised images,
content-hash storage reuse, transactional storage budgets, private video uploads,
automated publication gate, Shorts browsing, and daily expiry cleanup.

## Product specification: TinkerTown Shorts

### Goal

Give collectors a fast, visual way to share unboxings, shelf tours, new finds and
figure details without turning TinkerTown into a generic entertainment feed. Every
Short can optionally point back to a catalogue figure so discovery remains useful.

### Creator experience

- Entry points: **Short** in the Town Square composer, **Share a short** on `/shorts`,
  and the Shorts item in desktop and mobile navigation.
- A creator may record with the rear camera or choose one MP4 from their device.
- Captions and catalogue figure tags are optional; the video is the only required
  content. The figure picker uses the existing catalogue search and result cards.
- Before upload the browser rejects files over 20 MB, longer than 60 seconds, larger
  than 1920 pixels per side, unreadable files and formats other than MP4.
- Publishing shows upload percentage followed by the safety-check state. A Short is
  public only after server-side validation and Sightengine approval.

### Viewer experience

- `/shorts` presents a focused vertical stream with scroll snapping, muted playback,
  explicit controls, off-screen pausing and deferred loading near the viewport.
- A tagged Short shows a compact **Featured figure** card linking to the catalogue.
- Shorts retain TinkerTown's standard like, comment, save, share, report and delete
  actions. Video posts also render in Town Square, profiles and saved posts.
- Empty, loading, unavailable-media and moderation-error states provide a clear next
  action without exposing private media URLs.

### Acceptance criteria

- A signed-in, unsuspended collector can select a valid MP4, optionally tag a figure,
  publish it once, and see it in both Town Square and Shorts.
- Invalid type, size, duration, dimensions, ownership, catalogue tag or moderation
  result fails closed and does not create a public post.
- Playback supports byte ranges for seeking, never exposes the Blob token, pauses when
  off-screen or when the tab is hidden, and remains usable at mobile and desktop sizes.
- Retrying publication is idempotent; abandoned private uploads expire after seven
  days; deleting a Short removes the post immediately and queues safe blob cleanup.

## Deployment prerequisites

1. Configure Firebase Admin credentials and the existing private Vercel Blob store.
2. Deploy `firestore.rules` and `firestore.indexes.json` together with this application.
   Direct browser writes cannot create video posts or change video media, and users
   cannot remove account suspension. The Shorts query needs the new composite index.
3. Configure the settings in `.env.media.example`. Enable only sources whose images
   may be reused. Source IDs and exact product/image hostnames are separate allowlists;
   redirects must also land on an enabled image hostname. Defaults enable no sources.
4. Configure the Sightengine server credentials below. Without them, new images remain
   held and video upload tokens are refused. There is no unsafe bypass.
5. Set `CRON_SECRET` and deploy `vercel.json`; daily cleanup runs at 03:00 UTC. On other
   hosts schedule an authenticated GET to `/api/media/cleanup`. Cleanup handles up to
   100 expired media assets and 100 held candidates per invocation; run more frequently
   if that backlog grows. Failed deletes retain their storage reservations for retry.
6. Exercise approved/rejected media, video seeking, reporting and deletion in staging
   with the real services before allowing public uploads. No production data is seeded
   by these changes.

## Sightengine moderation

Set `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` as encrypted server variables.
TinkerTown sends raw private media bytes directly to Sightengine. Images use the image
check endpoint; MP4 Shorts use the synchronous video endpoint with nudity, violence,
gore, offensive, weapon, self-harm, drug, embedded-text and audio-profanity models.
The application decodes media locally, enforces dimensions and duration, applies its
policy thresholds to every returned frame, and fails closed on missing audio results,
timeouts, provider errors or malformed output. Sightengine receives the uploaded media;
its account retention and processing terms must match TinkerTown's privacy policy.

## Limits and behaviour

- One still WebP per imported item: maximum 1000 pixels per side and 200 KiB.
  Download limit is 5 MiB, checked against actual streamed bytes. Metadata is stripped.
  The original image is never stored; images exceeding the output cap are held.
- At most 100 candidates per call; three image operations in parallel. One import
  start every five minutes; unfinished candidates remain unpublished for a later run.
- Default new catalogue media budget: 2 GB; video budget: 5 GB. These ledgers cover
  media created by this pipeline, not legacy images, avatars or listing uploads.
  Allow for existing storage when setting the budgets. Lowering a budget pauses new
  reservations; it does not delete existing published content.
- Videos: one MP4, 60 seconds, 20 MiB, at most 1920 pixels per side, five upload
  attempts per account per UTC day. Maximum size is reserved before upload and adjusted
  to actual size at publication. No transcoding or adaptive bitrate service is included.
- Video checks are limited to three attempts per upload, at least one minute apart.
  Failed/abandoned uploads remain private and expire after seven days.
- Published videos use range-aware authenticated playback; deleted posts immediately
  lose playback access. File deletion waits for upload tokens to expire and daily cleanup.
- Identical processed catalogue images share one stored object. Duplicate product
  identities include name, manufacturer, series, scale and year. Automatic checks cannot
  prove every subtle variant correct; imported records retain community provenance.
- Saved/profile views link to videos. Shorts load only near the viewport, start muted,
  use explicit play, and pause offscreen or in a hidden tab. Likes/comments/share/report
  use the existing social mechanisms. Reports still use the existing moderation queue.
- Existing photo posts and other social content retain their existing moderation flow;
  these changes are not a full audit or automatic moderation of all historical content.
- The browser OCR identification flow is unchanged in this milestone.

## Validation

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Tests cover actual stream limits, private-network source rejection, moderation failures,
storage reservation/reuse/deletion accounting and placeholder-free automatic approval.
Live moderation and authenticated media upload/playback require the configuration above.

Local verification on 2026-09-07: 39 tests passed; typecheck, lint and production build
passed. Unauthenticated upload, publication, playback and cleanup requests returned 401.
The browser redirected `/shorts` to login. Signed-in responsive visual QA, live media
checks and Firestore emulator tests were not run. Existing Firebase dependency chains
still report six moderate npm audit advisories (zero high/critical); those dependencies
were not upgraded as part of this feature.
