# Photo Metadata Inbox — build handoff

Date: 2026-08-28

Work order: `photo-metadata-inbox-build-1`

Build command: `npm run build`
Deploy directory: `dist/`

## What shipped

- A responsive, installable art-deco PWA centered on a finite event-by-event
  metadata queue rather than a general photo browser.
- Local folder import for common photo/RAW filenames and matching XMP
  sidecars, plus pasted tab-separated manifests and restorable catalog JSON.
- Local embedded IPTC caption/keyword reading for JPEG APP13 metadata. Only the
  first 2 MB is read in memory; image bytes are never retained or uploaded.
- Explicit inbox/complete states, overall and per-event progress, next/previous
  navigation, queue arrow-key navigation, and `Ctrl/⌘ + Enter` completion.
- Caption and keyword editing, controlled vocabulary, imported-metadata
  warnings, and confirmation before an imported caption/keyword is replaced.
- IndexedDB persistence for assets, settings, templates, and visible change
  history.
- Portable ZIP export containing merged XMP sidecars, byte-for-byte imported
  originals, a CSV provenance log, a restorable JSON catalog, and an export
  README. Export and catalog backup are never paywalled.
- A US$12 one-time Sociobot license flow: hosted buy link, query-token capture,
  local token storage, daily verification caching, offline optimistic unlock,
  revoked-license handling, and paste-to-restore.
- Paid acceleration features: reusable templates, per-event bulk application,
  and direct directory writing. Direct writes finish and close a timestamped
  backup before opening an existing sidecar for replacement.
- Versioned service worker, app-shell precache, asset cache, navigation
  fallback, offline status, update toast, manifest, and original maskable/app
  icons.
- Product-specific visual thesis and original generated poster art with source,
  prompt, review notes, and provenance in `.factory/design.md` and
  `assets/src/`.
- Dedicated privacy and terms pages, expanded README, and MIT license.

## Verification

Run from `/work/repo`:

```sh
npm install
npm test
npm run build
npm run test:e2e
npm audit
```

Results at handoff:

- Unit tests: 9 passed across IPTC parsing, XMP parse/merge/preservation,
  manifest grouping, CSV escaping, ZIP contents, and catalog restore validation.
- Playwright 1.58.2: 8 passed, 2 intentionally skipped duplicates (desktop
  repeat of the mobile Chromium offline-install test and mobile repeat of the
  desktop download test). Covered persistent
  editing/completion, downloadable XMP bundle, welcome and populated axe scans,
  zero console/page errors, 390 px overflow, and a real offline reload followed
  by continued editing.
- Production build: passed; `dist/index.html` exists at the deploy root.
- `npm audit`: 0 vulnerabilities.
- Production payload: app JS 38.60 KB raw / 13.12 KB gzip; CSS 20.36 KB raw /
  5.35 KB gzip; hero WebP 71 KB; PNG fallback 267 KB. No runtime CDN, remote
  font, analytics, or tracking request.
- Lighthouse 12.8.2 mobile against the production preview:
  performance 99, accessibility 100, best practices 100. FCP 0.9 s, LCP 1.7 s,
  TBT 10 ms, CLS 0.055, interactive 1.7 s.
- Manual visual review completed for the 1280 px welcome screen and 1440 px
  populated catalog. Generated art was checked for text artifacts, people,
  brands, seams, and unintended symbols.

## Safety and privacy notes

- No photo or metadata network upload exists. The only external request is a
  license verification call after a user supplies/purchases a license.
- ZIP export is the universal, non-overwriting path. Original XMP is included
  unchanged, and generated XMP merges only caption/subject nodes into the
  imported document so unrelated namespaces survive.
- Direct writing is explicitly confirmed and available only after a paid
  unlock. The chosen destination receives `.metadata-inbox-backups/<timestamp>`
  before any matching sidecar is replaced.

## Known gaps / next steps

- The web File System Access API is currently a Chromium desktop feature;
  Safari and Firefox users should use the complete ZIP export instead.
- Embedded IPTC import currently covers JPEG APP13/IIM. Proprietary RAW formats
  rely on their adjacent XMP sidecars; decoding every maker-specific embedded
  metadata block would require a larger WASM parser and was intentionally kept
  out of the first-load budget.
- Browsers do not expose a cross-platform atomic rename primitive. Direct write
  safety therefore means the backup file is fully written and closed before
  the destination writer opens; ZIP export never overwrites source files.
- The factory still needs to register the production paid product/price and
  return URL in Sociobot billing. The client intentionally hardcodes no product
  ID and already uses the slug-based production contract.
- Pilot validation against the stated 500-assets-in-30-days measure remains a
  product/research follow-up rather than a build task.
