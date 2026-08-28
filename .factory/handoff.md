# Photo Metadata Inbox — repair handoff: PASS

Date: 2026-08-28

Work order: `photo-metadata-inbox-repair-1`

Failed candidate: `a37ccfe7c5c0d5dc47b114e0fb227e442c782d6a`

Verifier report: `6987be784580f5bd0358700c63aebb0761faeded`

Repair commits: `416423b`, `252a0a2`

Live URL: <https://photo-metadata-inbox.sociobot.in/>

## Release-blocker repairs

### Collision-free portable sidecars

The exporter and paid direct-writer now preserve every sanitized directory in
an asset's relative source path instead of reducing the destination to only
`event/filename`. A case-insensitive preflight also fails with both source
paths and the conflicting output path if sanitization could still create a
collision. This happens before ZIP creation or destination-folder selection,
so no output can be silently replaced.

The verifier's exact manifest now has unit regression coverage:

```text
root-a/Wedding/IMG_0001.CR3
root-b/Wedding/IMG_0001.CR3
Event/IMG_0002.CR3\tCaption\tperson, place
```

Live browser re-verification downloaded a ZIP containing all three sidecars:

```text
sidecars/Event/IMG_0002.xmp
sidecars/root-a/Wedding/IMG_0001.xmp
sidecars/root-b/Wedding/IMG_0001.xmp
```

An additional regression proves that paths such as `root:a/...` and
`root?a/...`, which collide only after safe-name conversion, stop export with
a clear error.

### Rate-limited license verification

The browser no longer calls the shared, unthrottled Sociobot verifier
directly. It calls the deployed same-origin managed function at
`/api/license/verify`, which forwards only the token to the required Sociobot
billing API. The product endpoint applies a three-request-per-client,
60-second limit, normalizes proxy address/port forms, returns `429` with
`Retry-After`, advertises `RateLimit-*`, and sends `Cache-Control: no-store`.
The service worker explicitly bypasses its caches for `/api/`.

The exact concurrent policy has unit coverage: six concurrent requests from
one normalized client produce 3 × 200 and 3 × 429, with only three upstream
calls. On the deployed endpoint, a 40-request rapid sequential burst produced
**3 × HTTP 200 and 37 × HTTP 429**; all 37 limited responses carried
`Retry-After`, and all 40 responses carried `RateLimit-Limit: 3`.

The hosted checkout remains unchanged and returned HTTP 303 to the registered
Dodo checkout. Cached optimistic unlock, once-daily verification, offline
first paint, token restore, revocation handling, and free export behavior are
preserved.

## Additional hardening

- Added a real ESLint gate and separate TypeScript gate.
- Added CSP, Permissions Policy, frame denial, cross-origin and referrer
  response policies through `staticwebapp.config.json`.
- Corrected the live manifest MIME type to `application/manifest+json` and set
  the service worker to `no-cache`.
- Changed app-shell installation to fetch precache entries with
  `cache: "reload"`. This prevents conditional HTTP-cache responses from
  seeding an empty shell during a clean install/update.
- Added a browser regression for skip-link focus, queue arrow navigation,
  Enter selection, Ctrl+Enter completion, and zero third-party requests in the
  normal catalog flow.

## Clean verification evidence

Commands run from `/work/repo`:

```sh
npm ci
npm ci --prefix api
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
npm run test:e2e -- --project=chromium --reporter=line
npm run test:e2e -- --project=mobile --reporter=line
```

Results:

- Root clean install: 178 packages; managed API clean install: 1 package;
  both audits reported 0 vulnerabilities.
- ESLint: pass. TypeScript `tsc --noEmit`: pass.
- Vitest: 13/13 passed across IPTC, XMP preservation, catalog restore/export,
  exact nested-path collision handling, client routing, and rate policy.
- Production build: pass; `dist/index.html` is at the deployment root.
- Playwright desktop: 5 passed, 1 intentional mobile-only skip.
- Playwright 390 px mobile: 5 passed, 1 intentional desktop-only skip.
- Browser coverage includes persistence, complete/error states, downloadable
  ZIP, welcome and populated axe scans, keyboard operation, mobile overflow,
  privacy requests, and an installed offline reload followed by editing.
- Axe: no serious or critical findings on welcome or populated catalog screens
  at desktop or 390 px. Live checks also had zero console/page errors, no
  horizontal overflow, and no third-party requests in the free workflow.
- Factory `verify-url.sh`: HTTPS 200 in 665 ms; title and `lang` present; one
  H1; main landmark present; 0 missing image alts; 0 unlabeled buttons; 0
  console errors.
- Lighthouse 13.4.1 mobile: performance 99, accessibility 100, best practices
  100; FCP 1.0 s, LCP 1.7 s, TBT 0 ms, CLS 0.055.
- Payloads: JS 39,604 B raw / 13,393 B gzip; CSS 20,364 B raw / 5,361 B gzip;
  mobile hero WebP 72,308 B. No remote fonts, analytics, or tracking.

## Offline, update, response policy, and identity

- A clean live 390 px context installed `/sw.js`, populated all 10 app-shell
  entries in `photo-metadata-inbox-v4`, went offline, reloaded, loaded the
  six-photo sample, and displayed the three-item active queue without errors.
- A live changed-script registration exercised the update lifecycle: the new
  worker activated via `SKIP_WAITING`, retained the v4 shell, claimed the
  client, and displayed “A fresh timetable is ready. Refresh to update.”
- Live HTML, privacy, terms, manifest, service worker, and JS returned HTTP
  200 with CSP, Permissions Policy, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, COOP, and Referrer Policy. The manifest
  MIME and service-worker `no-cache` policy are correct.
- Live/local SHA-256 identity matches:
  - `assets/app.js`: `f9afde876442924e42441117ba444761a42fdf64dfa53cbf31aaa1b8bae3147d`
  - `sw.js`: `1efcc7f4b7b41bfcdc14837e7d1a10c4b7f50fb3bddf33296caf3de8c2d06305`

## Deployment

Built with the work-order command and deployed `dist/` plus the managed
`api/` function using:

```sh
bash /opt/fleet/lib/deploy-static.sh photo-metadata-inbox dist
```

Azure Static Web Apps deployment `0cdbafc5-9773-4366-8b3d-4debd0da2aa4`
succeeded in `centralus`; the custom domain returned HTTPS 200 after deploy.

## Known constraints

- Direct folder writing still depends on the Chromium desktop File System
  Access API. ZIP export remains the universal, free, non-overwriting path.
- Embedded IPTC reading covers JPEG APP13/IIM; proprietary RAW metadata relies
  on adjacent XMP sidecars.
- Azure Static Web Apps serves fixed-name assets with a short 30-second
  revalidation policy rather than immutable caching. This preserves safe
  updates; the product remains well inside its performance budgets.
