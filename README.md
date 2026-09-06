<p align="center">
  <img src="public/icons/icon-192.png" alt="Calm Corner icon" width="88" height="88" />
</p>

# Calm Corner

A Bahasa Melayu wellbeing app for everyday reflection. Install it on Android or iPhone, prepare it online, and use its core features offline. Journals, check-ins, and trusted contacts stay on your device, with no account or backend required.

**Release status:** PWA release preparation is implemented. Public deployment and physical Android/iPhone acceptance testing are pending. See the [release checklist](docs/PWA-RELEASE.md) for validation results and known limitations.

## Features

- **Daily check-in:** reflect on emotions, contributing factors, and support needs.
- **Private diary:** write and edit journals, save drafts, and revisit your history.
- **Calming tools:** five bundled soundscapes, guided breathing with Malay audio, and 5-4-3-2-1 grounding.
- **Daily encouragement:** short messages for a moment of reflection.
- **SOS support:** help numbers and trusted contacts available as text and telephone links.
- **Backup and restore:** export local data as JSON and restore it on another browser or device.
- **Installable PWA:** home-screen access, offline readiness checks, download repair, and updates that preserve drafts.

## Quick start

Requires **Node.js 22 or newer** and npm. From your local checkout:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. Service workers are disabled in development.

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if execution policy blocks the corresponding PowerShell scripts.

### Run the production PWA locally

```sh
npm run build
npm run check:pwa
npm run preview
```

Open `http://localhost:4173`. Wait for **Sedia luar talian** before disconnecting from the internet and reloading. Keep the preview terminal open while serving the app.

## Install on a phone

Use an **HTTPS URL**. A phone accessing the PC's plain HTTP LAN or Tailscale IP can view the page, but cannot test the complete service-worker offline experience. `localhost` on your phone refers to the phone itself.

| Platform             | Installation                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Android Chrome       | Tap **Pasang aplikasi** when offered, or use the browser menu's **Install app / Add to Home screen** option. |
| iPhone / iPad Safari | Tap **Share ? Add to Home Screen**. Enable **Open as Web App** if shown, then tap **Add**.                   |

Open the installed app from its home-screen icon while online and wait for its own **Sedia luar talian** confirmation. Installing an icon does not mean all offline assets are ready. The installation banner is hidden in standalone mode.

Existing Safari data may not transfer into the home-screen app. Export a backup first, then restore it inside the installed app. Different hostnames, preview URLs, and browser profiles also have separate data storage.

## Development commands

| Command                   | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`             | Start the development server.                                                      |
| `npm run build`           | Type-check and build the app and service worker into `dist/`.                      |
| `npm run preview`         | Serve the production build locally.                                                |
| `npm run lint`            | Run ESLint.                                                                        |
| `npm test`                | Run repository and data-validation unit tests.                                     |
| `npm run check:pwa`       | Validate built manifest, icons, precache coverage, and revalidation configuration. |
| `npm run test:e2e`        | Run Playwright browser tests against the production preview.                       |
| `npm run diagnose:webkit` | Run the independent Windows WebKit offline-emulation reproduction.                 |
| `npm run assets`          | Regenerate bundled procedural audio and installation icons.                        |

Audio and icons are included in the repository; normal builds do not require regeneration. To regenerate icons alone, run `node scripts/icons.mjs`.

### Validation

```sh
npm run lint
npm test
npm run build
npm run check:pwa
npx playwright install chromium webkit
npm run test:e2e
```

The full suite includes desktop Chromium, mobile Chromium, installed Microsoft Edge, and iPhone-sized WebKit. The Edge project requires Microsoft Edge to be installed. Tests start the preview server automatically; build first.

For Chromium-only checks:

```sh
npm run test:e2e -- --project=desktop --project=mobile
```

The recorded validation run passed lint, 10 unit tests, the build, PWA checks, and 99 of 104 browser checks. Five Windows WebKit offline-emulation failures remain enabled and documented. A separate test verifies cached launch and backup restore with the actual origin server disconnected. Emulation does not replace testing on physical phones; see the [validation record](docs/PWA-RELEASE.md).

## Deploy to Vercel

The repository is prepared for deployment at the domain root:

| Setting               | Value           |
| --------------------- | --------------- |
| Framework             | Vite            |
| Build command         | `npm run build` |
| Output directory      | `dist`          |
| Environment variables | None required   |

Use one stable HTTPS production hostname. The supplied `vercel.json` configures revalidation and response headers. Do not add a catch-all rewrite that serves app HTML for missing scripts or audio. Verify the deployed headers, installation, and offline behavior before public release.

Follow the [Android and iOS release checklist](docs/PWA-RELEASE.md) for deployment preparation and device acceptance. Reference PDFs under `resources/` are not included in the deployed bundle.

## Project structure

```text
src/         React interface, local data repository, and service worker
public/      Bundled audio, icons, manifest, and asset notices
scripts/     Asset generation and PWA validation utilities
tests/       Unit tests and Playwright browser tests
docs/        Architecture, release procedures, and validation results
resources/   Product reference documents
```

Built with React, TypeScript, Vite, Dexie/IndexedDB, and Workbox. See [implementation notes](docs/IMPLEMENTATION.md) for architecture and offline lifecycle details.

## Privacy and support boundaries

Personal data is stored locally and is not uploaded or encrypted by the app. Someone using the same browser profile may access it. Clearing browser data can remove entries; exported JSON backups are readable and should be stored privately. There is no automatic cloud recovery or cross-device synchronization.

Calm Corner is a self-reflection tool, not a diagnosis or a replacement for professional support. Entries are not monitored or clinically assessed. SOS telephone links require available phone service; offline access to a number does not guarantee a connected call.

## Asset attribution

The soundscapes are original procedural compositions; Malay breathing cues are synthesized locally at build time. Asset-specific licensing and attribution are documented in [audio notices](public/audio/LICENSE.txt) and [third-party notices](public/THIRD_PARTY_LICENSES.txt). These notices do not establish a repository-wide source-code license.
