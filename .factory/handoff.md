# Photo Metadata Inbox — repair 3 handoff: PASS

Date: 2026-09-06

Work order: `photo-metadata-inbox-repair-3`

Failed candidate: `97308923433ed1a2d184844ba688820f8f956120`

Verifier report commit: `8be7c21d4997de33e8f99a5ae9717ab63a2154f7`

Final implementation candidate: `90a6a8c83c92f13e49fbaa2553c49d1ce8a487d3f9a`

Implementation commits: `844c051`, `90a6a8c`

Live URL: <https://photo-metadata-inbox.sociobot.in/>

Demo URL: <https://photo-metadata-inbox.sociobot.in/demo>

## Outcome

The verification-3 heading defect is fixed and the final live home and demo
each report zero Axe violations. `Route queue` is now an `h2`, so the populated
catalog follows `h1 → h2 → h2 → h3` without skipping a level. The browser
regression runs Axe against rendered home and demo states and rejects any
`heading-order` result.

A fresh live-browser review also found that the first sample action fell below
the initial viewport. The welcome type and spacing are now tighter on desktop,
and mobile presents the job, audience, and sample action before the poster.
Both desktop and phone browser tests assert that the action is fully visible at
scroll position zero.

The clean install exposed a new moderate advisory in `fflate` 0.8.2. The exact
pin is now 0.8.3, and both root and API production audits report zero known
vulnerabilities.

## Clean verification

The final SHA was cloned into a new temporary checkout. From that checkout:

```sh
npm ci
npm ci --prefix api
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --reporter=line
npm audit --omit=dev
npm audit --omit=dev --prefix api
```

Results:

- Root install: 178 packages, 0 vulnerabilities. API install: 1 package, 0
  vulnerabilities.
- ESLint and strict TypeScript: pass.
- Vitest: 18/18 pass.
- Production build: pass; `dist/index.html` is present.
- Full Playwright matrix: 21 pass and 5 intentional cross-project skips.
- Build payloads: 45.13 KB JS raw / 15.09 KB gzip and 23.13 KB CSS raw /
  5.86 KB gzip. The mobile hero WebP remains 72,308 bytes.

Every command in `.factory/claims.json` was also run separately from that clean
checkout. All 11 claim IDs passed: `demo-isolation`, `local-only`,
`offline-reload`, `metadata-workflow`, `portable-export`, `catalog-restore`,
`free-exports`, `paid-safety`, `daily-license`, `rate-limited-license`, and
`jpeg-read-limit`.

## Live verification

Final deployment: Azure Static Web Apps deployment
`5044dae1-6a22-46d0-9a2d-7c548b0d21b9` in `centralus`. The existing managed
API configuration was preserved; the deployer skipped its identical function
artifact. No infrastructure, DNS, billing configuration, or other product was
changed.

- The factory URL verifier passed: HTTPS 200, 876 ms browser load, correct
  title and language, one H1, a main landmark, no missing alt text, no
  unlabeled buttons, and no console errors.
- Axe CLI 4.10.3 found 0 violations on `/` and the populated `/demo`.
- Fresh 1366×900 desktop and 390 px phone contexts saw the job, named audience,
  and sample action before scrolling. The action bounds were 602–654 px on
  desktop and 521–573 px in the 664 px phone viewport.
- The one-click sample loaded six realistic records with its persistent demo
  label. Edit and completion persisted, Reset demo restored the original
  caption, and Start for real left both demo and real asset counts at zero.
- The free flow made no cross-origin requests and logged no console/page
  errors. The real catalog remained unchanged during the sample flow.
- Unsafe `../notes.txt` input produced the documented recovery error. The
  caption field enforced its 2,000-character boundary.
- Keyboard checks passed for the skip link and queue arrow navigation. The
  skip-link focus outline measured 3 px. Reduced motion shortened transitions
  to 0.01 ms and disabled smooth scrolling.
- A fresh phone context installed the service worker, reloaded `/demo`
  offline, edited metadata, and completed an asset. There was no horizontal
  overflow.
- `/`, `/demo`, `/privacy/`, `/terms/`, `robots.txt`, `sitemap.xml`, the
  manifest, service worker, built assets, and health route return 200. The
  legal routes have distinct titles. An unknown route returns the designed
  page with HTTP 404.
- Security headers include CSP, HSTS, frame denial, nosniff, Referrer Policy,
  Permissions Policy, COOP, and CORP. The manifest MIME is correct; hashed
  assets are immutable for one year; the service worker uses `no-cache`.
- Six verification requests with forged, rotating `X-Client-IP` values
  returned `200, 200, 200, 429, 429, 429`. Limited responses included
  `Retry-After: 60`; only the first three requests reached the allowance.
- `/api/health/` reports `status: ok`, product `photo-metadata-inbox`, version
  `1.1.0`, and managed-API build `c887a3e3-543e-4ea8-aef4-fa4b8e249c84`.
- The live checkout returns HTTP 303 to the hosted Sociobot/Dodo checkout.
  Price and paid features are unchanged. Public offer metadata is in
  `/work/.evidence/billing-offer.json`; it contains no credential.

Live and local SHA-256 values match:

```text
app-DJU2VLLX.js   4b83eaf459f4f44d58e79dcf35dad9ad9d6d820dee8f6a87b68bd0d015355962
app-DrPbLigf.css  21b595dc86fd3ee400491b6b562e5cf6ec30285040399beca43ef5c4c74c81a2
sw.js             1ba12b6a4d25f9a71d1ada8928db4e005a48c9139fa333208bf37a4e7d9248b4
```

Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices
100, SEO 100; FCP 1.04 s, LCP 1.43 s, TBT 0 ms, CLS 0.

## Earlier finding disposition

- Verification 1 sidecar-path collisions remain covered by ZIP-content tests;
  both nested duplicate paths export separately. The live API limiter returns
  429 with `Retry-After`.
- Verification 2 claim registry, demo isolation, plain first read, manifest
  validation, routes/metadata, touch targets, 200% text, caching, service
  worker, and trusted-client limiter repairs all passed their current tests.
- Verification 3 heading order is fixed at its semantic cause and covered by
  rendered Axe checks on both browser projects.

## Product and offer

The free local workflow and the paid US$12 one-time full-line pass are
unchanged. Paid features remain templates, event bulk apply, and direct
sidecar writing with timestamped backups. Manual editing and every export
remain free. No mock entitlement or external credential was added.

`.factory/catalog-description.txt` is verb-first and under 120 characters; the
same text is copied to `/work/.evidence/catalog-description.txt`.

## Known constraints

- Direct folder writing requires the Chromium desktop File System Access API;
  ZIP export works in other evergreen browsers.
- Embedded IPTC reading covers JPEG APP13/IIM. Proprietary RAW metadata still
  relies on adjacent XMP sidecars.
- The health endpoint reports the managed function deployment identity, not a
  Git SHA. Static asset hashes above prove the deployed implementation.

No release-blocking gaps remain.
