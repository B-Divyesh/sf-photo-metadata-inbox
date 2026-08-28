# Photo Metadata Inbox — repair 2 handoff: PASS

Date: 2026-08-28

Work order: `photo-metadata-inbox-repair-2`

Failed candidate: `7fb14816e99fa8c3307f297dc8e6445d77f3eafb`

Verifier report: `d427610bdeef0a957e720a1fb6f5658c3ac464f2`

Repair commits: `d571558`, `306fd0b`

Live URL: <https://photo-metadata-inbox.sociobot.in/>

Demo URL: <https://photo-metadata-inbox.sociobot.in/demo>

## Release-blocker repairs

- Added `.factory/claims.json` with 11 testable visitor promises and exactly
  one `@claim:<id>` test for each. Added `.factory/demo.md` and the required
  landing-copy audit.
- Replaced the metaphorical H1 with “Finish captions and keywords in your
  photo backlog.” The first sentence names photographers with large
  Lightroom-style libraries. The first action opens the isolated sample.
- `/demo` now seeds six realistic records in
  `demo:photo-metadata-inbox`. It never reads or writes the real catalog or a
  real license. Its persistent banner provides Reset demo and Start for real;
  leaving through Start for real clears the demo records.
- The license limiter ignores caller-controlled `X-Client-IP` and keys from
  the last platform-appended `X-Forwarded-For` address. The exact forged-header
  burst has unit and live coverage.

## Additional verifier findings repaired

- Manifest parsing rejects non-photo extensions, absolute paths, URLs,
  control characters, empty segments, and `.`/`..` traversal before storage.
- Added canonical/Open Graph/Twitter metadata, SVG favicon, Apple touch icon,
  1200×630 social image, `robots.txt`, `sitemap.xml`, route-specific demo
  metadata, a designed HTTP 404, full landing-page sections, Param Factory
  credit, and build version.
- Added `/api/health` with product, version, deployment identity, JSON content
  type, and `no-store` caching.
- Increased the wordmark, legal links, footer links, and checkbox hit areas to
  at least 44×44 CSS pixels. Queue/event labels wrap rather than clip at 200%
  text. The invalid `role=listitem` on event buttons was removed.
- Vite now emits content-hashed JS/CSS; shipped artwork also has content-hash
  names. `/assets/*` returns one-year immutable caching.
- The build injects hashed JS/CSS into a versioned service-worker precache.
  Cache matching ignores `Vary` so module requests resolve offline. This fixes
  the verifier's intermittent shell-only reload at its root cause.

## Clean verification evidence

Run from `/work/repo`:

```sh
npm ci
npm ci --prefix api
npm run lint
npm run typecheck
npm test
npm run build
npm run test:claims
npm run test:e2e -- --reporter=line
npm audit --omit=dev
npm audit --omit=dev --prefix api
```

Results:

- Clean root install: 178 packages, 0 vulnerabilities. Managed API install:
  1 package, 0 vulnerabilities.
- ESLint and strict TypeScript: pass.
- Vitest: 18/18 pass across import safety, nested collision handling, XMP and
  IPTC preservation, catalog restore, storage namespaces, daily license cache,
  trusted-client rate limiting, CSV, and export safety.
- Claims: all 11 registered IDs pass. The browser claim run reports 11 passes
  and 5 intentional cross-project skips; the unit claim filter reports 3
  passes and 15 non-claim skips.
- Production build: pass; `dist/index.html` is at the deployment root.
- Full Playwright matrix: 21 pass, 5 intentional project skips. It covers
  desktop Chromium and 390 px mobile, cold copy, demo isolation/reset/exit,
  actual ZIP/JSON downloads, restore, paid backup simulation, invalid paths,
  keyboard operation, text resize, axe, privacy, persistence, and offline.
- The offline claim passed three consecutive isolated reruns and the clean
  full matrix. A controlled changed worker also displayed “A fresh timetable
  is ready. Refresh to update.” and activated through `skipWaiting`.
- Live axe checks: 0 serious/critical findings on home and populated demo at
  desktop and 390 px. The prior `aria-allowed-role` finding is absent.
- Live browser checks: 0 console/page errors, 0 third-party requests during
  the free demo flow, no clipped queue/event labels at 200% text, and all
  measured wordmark/footer/checkbox targets are at least 44×44 CSS pixels.
- Factory `verify-url.sh`: HTTPS 200, 901 ms browser load, correct title and
  language, one H1, main landmark, 0 missing alts, 0 unlabeled buttons, and 0
  console errors.
- Live Lighthouse 12.8.2 mobile: performance 100, accessibility 100, best
  practices 100; FCP 1.3 s, LCP 1.5 s, TBT 0 ms, CLS 0.05.
- Payloads: initial JS 45,133 B raw / 15,014 B gzip; CSS 23,096 B raw /
  5,884 B gzip; mobile hero WebP 72,308 B; no downloaded font.

## Live response, privacy, and identity evidence

- `/`, `/demo`, `/privacy/`, `/terms/`, `/robots.txt`, `/sitemap.xml`, and
  `/api/health` return 200. An unknown route returns the designed HTML with
  HTTP 404.
- Hashed JS returns `Cache-Control: public, max-age=31536000, immutable`.
  `sw.js` returns `no-cache`; the manifest returns
  `application/manifest+json` and controlled revalidation.
- CSP, frame denial, nosniff, Referrer Policy, Permissions Policy, COOP, and
  CORP remain present. The normal demo workflow makes same-origin requests
  only and keeps data in the demo IndexedDB namespace.
- A fresh live 390 px context installed the worker, reloaded `/demo` offline,
  retained its six records, and accepted metadata edits without errors.
- Six live verification requests with six different forged `X-Client-IP`
  values returned `200, 200, 200, 429, 429, 429`; limited responses included
  `Retry-After: 60`, and remaining counts were `2, 1, 0`.
- `/api/health` returned `status: ok`, product `photo-metadata-inbox`, version
  `1.1.0`, and deployment build `c887a3e3-543e-4ea8-aef4-fa4b8e249c84`.
- Live and local SHA-256 match: app JS
  `32f9271a5eb656bdb9ed8bb947096bca224baa028c853e3433173f60c261c0f7`;
  service worker
  `3d898556c510e824857514804227ed5d3fd84499ab11b9225b4e1506e2b3cd55`.
- The registered checkout returned HTTP 303 to the hosted Dodo checkout. No
  payment provider is embedded in the product.

## Deployment

Built with `npm run build` and deployed `dist/` plus `api/` using:

```sh
bash /opt/fleet/lib/deploy-static.sh photo-metadata-inbox dist
```

Azure Static Web Apps deployment
`bf2f4661-3d46-4725-b355-6cab9a150aee` succeeded in `centralus`; the custom
domain returned HTTPS 200.

## Known constraints

- Direct folder writing requires the Chromium desktop File System Access API;
  free ZIP export works in evergreen browsers.
- Embedded IPTC reading covers JPEG APP13/IIM. Proprietary RAW metadata still
  relies on adjacent XMP sidecars.
- The health endpoint exposes the platform deployment identifier rather than
  a Git SHA because the static deployment helper does not inject commit data.

No release-blocking gaps remain from `.factory/verification-2.md`.
