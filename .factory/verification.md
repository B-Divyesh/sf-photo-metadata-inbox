# Independent verification — FAIL

Date: 2026-08-28  
Candidate: `a37ccfe7c5c0d5dc47b114e0fb227e442c782d6a`  
Live URL: <https://photo-metadata-inbox.sociobot.in/>

## Release decision

**FAIL. Do not release this candidate.** The core portable-export guarantee
silently loses a sidecar for a valid nested-folder import, and the production
license-verification endpoint does not meet the required rate-limit contract.

## Reproduction evidence

### P1 — sidecar export silently overwrites assets with the same event/name

On the clean production build, imported this valid manifest:

```text
root-a/Wedding/IMG_0001.CR3
root-b/Wedding/IMG_0001.CR3
Event/IMG_0002.CR3	Caption	person, place
```

The app imported all three assets (the CSV contains three import rows), but
the downloaded ZIP had only these two generated sidecars:

```text
sidecars/Wedding/IMG_0001.xmp
sidecars/Event/IMG_0002.xmp
```

Both distinct paths are reduced to `event` (`Wedding`) plus filename, so the
second assignment overwrites the first in the export map without a warning.
This violates the researched brief's requirement to write sidecars and never
silently overwrite metadata. It can occur in ordinary nested libraries whose
different branches contain identically named event folders and images.

### P1 — required API rate limiting is absent

Against the live product unlock endpoint, a 100-request burst (25 concurrent)
using a deliberately invalid token returned **100 × HTTP 200**. No response
was HTTP 429 and none carried `Retry-After`; therefore no threshold was
observed. A preceding 40-request rapid sequential burst likewise returned
40 × HTTP 200. Endpoint tested:

```text
GET https://api.sociobot.in/api/v1/products/photo-metadata-inbox/verify?license=qa-invalid-rate-limit
```

The endpoint is part of the shipped paid-unlock flow, and the work order
explicitly requires a burst to begin returning `429` with `Retry-After`.

## Successful checks

- Clean checkout was already exactly at the candidate SHA with no changes.
- `npm ci` completed (99 packages; audit reported no vulnerabilities).
- `npm test`: **9/9 passed**.
- `npm run build`: passed (`tsc --noEmit` plus Vite); `dist/` was produced.
  No lint script exists in `package.json`.
- `npm run test:e2e -- --project=chromium --reporter=line`: **4 passed, 1
  intentional mobile-only skip**. The matching mobile invocation also gave
  **4 passed, 1 intentional desktop-only skip**. These cover persistence,
  sample completion, ZIP download, 390px fit, axe scans, and offline reload.
- Independent live desktop and 390px checks found no console/page errors and
  no serious or critical axe findings on both welcome and populated catalog
  screens. The normal free workflow made only first-party requests; source
  inspection confirms the only conditional external request is the documented
  Sociobot license verification after a license is supplied.
- Invalid blank import showed the recoverable message: “Choose a folder or
  paste at least one new filename.” Completion with missing caption/keywords
  was blocked and focused the required field. A normal sample caption/keyword
  completion persisted after reload.
- Reduced-motion CSS reduced transition duration to `0.01ms`; 390px had no
  horizontal overflow. Keyboard focus styles are present (`3px` brass
  `:focus-visible` outline), and the skip link is reachable.
- Live offline verification: after a fresh service-worker registration, a
  390px context was put offline, reloaded successfully to the app shell, and
  could load the sample queue. Active worker scope was the live origin and
  script `/sw.js`. The implementation includes `clients.claim`, cache cleanup,
  and an update-available toast/`SKIP_WAITING` handler; a real changed worker
  could not be injected into the live deployment for a transition test.
- Deployment identity matches candidate output: live and local rebuilt
  `assets/app.js` SHA-256 are both
  `070eb8d3adbbb108b3015c73f949f1e5aaa7d408d4471383ea735c5f5bf341ac`;
  live and local `sw.js` SHA-256 are both
  `afe1232bdfcfbea12b3356abd4e20ec57705dce77280d2b6b0c39920fd6bcfce`.
- Payloads meet stated static budgets: JS 38,604 B raw / 13,120 B gzip, CSS
  20,364 B raw / 5,350 B gzip, and mobile hero WebP 72,308 B. No remote fonts
  or analytics were observed.

## Non-blocking observations

- Live responses provide HSTS, `Referrer-Policy`, and `X-Content-Type-Options`,
  but no `Content-Security-Policy`, `Permissions-Policy`, frame-ancestors/XFO,
  or cross-origin isolation policy was returned.
- HTML, JS, CSS, manifest, and service-worker responses use only
  `Cache-Control: public, must-revalidate, max-age=30`. This is functional
  with the service-worker cache but does not satisfy the stated long-lived,
  immutable-cache guidance for static assets.
- The manifest is served as `application/octet-stream`, although Chromium did
  register it and the service worker successfully.

## Required remediation and re-verification

1. Preserve a collision-free relative output path (or fail import/export with
   a clear collision error) and add regression coverage for duplicate filename
   + event combinations.
2. Add rate limiting to the verification endpoint so a burst yields `429` and
   `Retry-After`; prove its threshold in the next verification.
3. Rebuild/redeploy, then re-run clean-install, functional, offline, and live
   rate-limit verification.
