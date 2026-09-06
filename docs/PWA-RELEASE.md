# Android and iOS release checklist

This repository prepares a public HTTPS PWA. No deployment has been performed.

## Build and publish later

Use Node.js 22 or newer. Run `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run check:pwa`, and `npm run test:e2e`. On PowerShell use `npm.cmd` if script execution is restricted. `npm run preview` serves the production build; development mode deliberately disables offline preparation.

When ready to publish, import the repository into Vercel as Vite, build with `npm run build`, and publish `dist`. No environment variables or backend are required. Choose one stable production hostname and deploy at `/`. Do not add catch-all rewrites that return HTML for missing scripts or audio. The supplied configuration revalidates `/`, `/index.html`, `/sw.js`, and the manifest. Verify HTTPS response headers and 404 responses on the actual host before release; local checks cannot validate Vercel's deployed behavior.

Localhost, Tailscale URLs, Vercel previews, and production each have separate origin storage. Export data from the old location and restore it at the new location if required. Changing the production hostname later does not migrate journals. On iOS, browser storage may also be separate from the installed home-screen app: export from Safari first, then import inside the installed app. No automatic transfer is promised.

## Device acceptance â€” pending

Use the production HTTPS candidate on the user's Android and iPhone. Keep personal journals out of test evidence. Record actual versions; older versions remain unverified.

| Field | Android | iPhone |
| --- | --- | --- |
| Device model / OS version | Pending | Pending |
| Chrome / Safari version | Pending | Pending |
| HTTPS URL / build / date | Pending | Pending |
| Tester / result / issue reference | Pending | Pending |

1. Visit in Chrome (Android) or Safari (iPhone). Confirm the persistent install banner, onboarding navigation, and SOS access. Rotate the device and open the keyboard; inputs and dialog controls must remain reachable.
2. Install from Chrome's prompt/menu or Safari Share â†’ Add to Home Screen, enabling Open as Web App where shown. Open the home-screen icon: the app must launch standalone with a legible icon and without the installation banner. Check notch and home-indicator spacing.
3. Keep the installed app online until **Sedia luar talian** appears. Installation alone does not mean its assets have finished downloading.
4. Create a test journal and check-in. Close the app, enable airplane mode, and reopen from its icon. Confirm entries, draft, all five soundscapes, breathing guidance and grounding work. SOS numbers must remain visible; do not place a test emergency call.
5. Interrupt audio with device locking or another app, then return and resume. Check that paused breathing does not silently advance and audio controls match playback.
6. Export a JSON backup and restore it using the phone's file picker while offline. Test Safari-to-installed-app transfer separately. Invalid files must leave existing data intact. Store exported files privately.
7. On the same HTTPS origin, publish a subsequent test build later. Leave a draft open, accept the update, then relaunch offline. Draft and history must survive. Rejecting or failing an update must leave the previous app usable.
8. Check VoiceOver / TalkBack, keyboard focus where available, menu navigation, text enlargement, and all modal close controls.

Do not mark release ready until both columns have recorded passing results and deployed HTTPS checks pass.

## Automated diagnostics

`npm run check:pwa` checks manifest identity, icon dimensions and maskable safe area, asset precache coverage, Apple icon linkage and revalidation configuration. `node scripts/icons.mjs` regenerates just the four existing-style icons; `npm run assets` also regenerates audio.

`npm run diagnose:webkit` uses a separate tiny HTTP server and service worker, without Calm Corner or Workbox. On this Windows environment WebKit's `context.setOffline(true)` produces an internal error on cached navigation and `NotReadableError` even for an in-memory Blob. The diagnostic returns a nonzero exit code on failed navigation. These limitations affect offline-reload and backup tests; those tests remain enabled and failing results must remain visible.

The additional origin-disconnection test closes the initial page, refuses server connections, and opens a new page to verify cached app, draft, all five audio responses, and export/restore using a real downloaded file. This is complementary evidence, not a substitute for airplane-mode testing on iPhone. See the latest validation record below for remaining failures.

The first-install retry defect was separate from offline emulation: WebKit could retain unreadable cache records after a failed precache. Repair now removes each unreadable asset entry before replacing it, then verifies all manifest entries before reporting ready. It does not clear IndexedDB or remove readable cached assets. The original retry test now passes on WebKit.

The preview server explicitly disables SPA fallback because navigation is hash-based. Missing JavaScript/audio files return 404 rather than app HTML. The phone layout reserves both page space and browser scroll padding for the fixed installation banner; automatic focus scrolling is immediate, while intentional check-in navigation retains its motion preference behavior.

## Validation environment â€” 2026-09-06

- Windows; Chromium 153.0.8010.12 (desktop and mobile emulation), installed Edge 152.0.4191.66, WebKit 26.6 (iPhone-sized emulation).
- Lint, 10 unit tests, production build and `check:pwa` pass. The offline bundle is approximately 1.71 MB.
- Final Chromium/Edge regression run: all 78 tests pass (26 desktop Chromium, 26 mobile Chromium, 26 Edge). Together with the final WebKit run, 99 of 104 browser checks pass. WebKit traces remain under `test-results/`; the final Chromium/Edge run uses `test-results/non-webkit-final/` to preserve them.
- Final WebKit run: 21 passed, 5 failed. The failures are offline relaunch after accepted/failed updates, missing-cache offline reload, cold offline reload, and offline backup file reading under `context.setOffline(true)`. The independent diagnostic reproduces both cached-navigation and Blob-reading failures without app code. The origin-disconnection test (including actual-file backup restore), initial-install retry, accessibility, and mobile interaction checks pass. The failing tests remain enabled; the complete suite is not green on Windows WebKit.
- Physical Android/iPhone, public HTTPS response headers, OS installation, and airplane-mode acceptance remain pending. No deployment was performed.

### Cafe audio validation (2026-09-06)

The café-only command (`npm run assets:cafe`) produces an original 16-bar, 80 BPM synthesized jazz loop. SHA-256 comparisons confirmed all other files in `public/audio` were preserved. The encoded file is 768,626 bytes; Chromium decoded duration is 48.039 seconds, peak amplitude 0.617 (no clipping), RMS 0.085, and the decoded endpoint amplitude difference is 0.0000022. Encoder padding means these measurements do not establish a perceptually seamless loop; listening review remains required.

Lint, production build, and PWA checks passed. Chromium passed an offline reload with the temporary origin server shut down, MP3 decoding, actual advancing playback, pause/resume, volume adjustment, and looping. The offline bundle is 2.43 MB.

Windows Playwright WebKit played both the new café recording and unchanged rain recording online with advancing playback clocks and no media errors. Its server-disconnected offline reload succeeded, but the café playback clock did not advance in the offline check. That check failed and remains unresolved; do not count it as passing offline audio acceptance. This WebKit build also exposes neither AudioContext nor webkitAudioContext, so waveform decoding measurements were performed in Chromium. Actual iPhone offline playback and subjective listening review remain pending.
