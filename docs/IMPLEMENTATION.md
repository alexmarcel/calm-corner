# Calm Corner implementation

## Product boundaries

An adult, Bahasa Melayu self-reflection PWA for Malaysia. No authentication, backend, telemetry, text analysis, or clinical scoring. `resources/kit-sos-calmcorner.pdf` is the functional reference; the slide PDF provides product context. The PDFs are deliberately excluded from the deployed bundle.

Explicit safety answers alone control the support flow. Unsafe opens SOS immediately and pauses the tools. Unsure or reported distress offers support. No safety answer means unknown. A completed safe, no-distress check-in receives the reflection experience. Typed grounding responses and journal entries are not analyzed or monitored.

## Structure

- `src/data.ts`: schemas, backup validation, local repository, support routing. IndexedDB database `calm-corner`; v1 creates five tables, v2 adds the mood index without modifying records. Backup format has a separate version (1).
- `src/App.tsx`: onboarding, app shell, SOS and history. Dashboard and diary require adult/privacy confirmation; public calming tools and SOS are available immediately.
- `src/Diary.tsx`: debounced, serialized draft persistence and explicit journal CRUD. Save failure retains text. Export includes the in-memory draft even when draft writes fail.
- `src/Tools.tsx`: audio, phase-timed breathing, ephemeral grounding. Spoken instructions are bundled Malay synthesis, not network/browser speech recognition.
- `src/Settings.tsx`: contacts, JSON export/replace restore, persistent-storage request and local data deletion.
- `src/sw.ts`, `src/offline.ts`, `vite.config.ts`: Workbox build, transactional initial precaching, cache verification/repair, installation progress, update activation.

Personal data is stored in IndexedDB; Cache Storage contains only distributed app assets. The app does not encrypt personal data. Anyone using the same browser profile may access it. There is no automatic recovery if browser data is cleared; export a backup. Browser persistent storage is requested but may be refused. JSON backup contents are readable; restoration validates the complete payload before clearing tables in one transaction.

## Offline lifecycle

1. Visit the HTTPS site (localhost also works for development).
2. The service worker downloads the generated precache manifest. Progress counts completed files, not bytes. Failed downloads never show ready.
3. The activated worker verifies every required cache key before reporting `Sedia luar talian`.
4. Subsequent startup reads local data and serves app assets from cache. Network is not required. Missing cache entries are detected and can be repaired when online.
5. An update installs alongside the existing active worker. The user accepts it; the current draft is flushed and tools paused before activation/reload. A failed install leaves the old worker active. IndexedDB is not cleared by updates.

Fonts, icons, procedural soundscapes, cue WAVs and guidance are local. The complete bundle is approximately 1.7 MB; build fails above 25 MB. `dist/offline-assets.json` records asset paths and size for inspection. The manifest generator excludes the worker itself from precaching. Service-worker source is bundled with `process.env.NODE_ENV` replaced for browser execution.

The host must serve all asset requests correctly (never replace missing MP3/JS files with the app HTML). Use the provided Vercel static deployment configuration at the origin root. Keep `sw.js` and HTML revalidating. Keep the same origin across releases; browser data is origin-scoped.

## Assets and contact sources

`scripts/assets.mjs` reproducibly creates five original synthetic soundscapes (64 kbps mono MP3), three Malay cue WAV files using build-time eSpeak NG, and PNG installation icons. The audio is a synthetic interpretation, not a nature field recording. Assets are committed so normal builds do not require generation. Licensing and attribution are included in `public/audio/LICENSE.txt` and `public/THIRD_PARTY_LICENSES.txt`.

Help numbers: 999 and HEAL 15555. Source checked 2026-09-05: https://jknselangor.moh.gov.my/htar/en/pengumuman-awam/661-talian-heal-15555 . The source lists both numbers; no unverified opening hours are advertised. Help is available offline as text and telephone links. A dialer link is not proof of a connected call. External source links require internet; calls need phone service.

## Release validation

Automated tests cover repository migrations, backup rollback/validation, safety branching, cold offline reload, journal CRUD, all five audio tracks, backup restore, download failure/retry, worker updates, unavailable IndexedDB, persistence refusal, draft-write failure, accessibility, responsive layout and breathing timing.

Playwright projects: desktop Chromium, Android-sized Chromium, installed desktop Edge and iPhone-sized WebKit. Emulation is not proof of behavior on physical iOS/Android devices. Before public release, manually verify home-screen installation, real device audio/session interruption, OS dialer handoff (without placing a test emergency call), screen-reader usability and backup import/export on the target phones. Review Malay audio quality on actual speakers/headphones.

No public deployment is performed by a local build. Use a Vercel preview to verify HTTPS installation before promoting to production. No environment variables or secrets are needed.

Release preparation now includes separate standard/maskable icons, a 180px Apple touch icon, explicit HTTPS guidance, iOS backup-transfer instructions, activation-time cache repair, and `/` HTML revalidation. `npm run check:pwa` validates built metadata and cache coverage. See [PWA release acceptance](PWA-RELEASE.md) for current test results and pending phone checks.
