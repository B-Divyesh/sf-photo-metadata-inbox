# Photo Metadata Inbox — verification 4 handoff: FAIL

Date: 2026-09-06

Work order: `photo-metadata-inbox-verify-4`

Implementation candidate: `90a6a8c92f13e49fbaa2553c49d1ce8a487d3f9a`

Documentation candidate: `e615b0477b1987ae3f8688a6eecc3a5162e69c49`

Live URL: <https://photo-metadata-inbox.sociobot.in/>

Demo URL: <https://photo-metadata-inbox.sociobot.in/demo>

## Outcome

The implementation is not accepted. Independent verification found a P1:
after an installed service worker visits `/terms/`, offline `/demo` can return
the Terms document instead of the app. The same cache behavior changes an
unknown online route from the designed HTTP 404 into Terms with HTTP 200.
This makes the public offline claim false for a normal navigation sequence.

There is also a P2 plain-words defect: route metaphors remain in visible
landing, Terms, and 404 headings. See `.factory/verification-4.md` for exact
evidence and repair steps.

## Verification that passed

The documentation SHA was cloned into a new temporary checkout. From that
checkout:

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

Results before the findings:

- Root install: 178 packages, 0 vulnerabilities. API install: 1 package, 0
  vulnerabilities.
- ESLint and strict TypeScript: pass.
- Vitest: 18/18 pass.
- Production build: pass; `dist/index.html` is present.
- Full Playwright matrix: 21 pass and 5 intentional cross-project skips.
- Build payloads: 45.13 KB JS raw / 15.09 KB gzip and 23.13 KB CSS raw /
  5.86 KB gzip. The mobile hero WebP remains 72,308 bytes.

Every command in `.factory/claims.json` was also run separately from that clean
checkout. All 11 claim IDs passed their current sandboxes: `demo-isolation`, `local-only`,
`offline-reload`, `metadata-workflow`, `portable-export`, `catalog-restore`,
`free-exports`, `paid-safety`, `daily-license`, `rate-limited-license`, and
`jpeg-read-limit`.

## Live verification that passed

The reviewed live assets match implementation candidate `90a6a8c`.

- The factory URL verifier passed: HTTPS 200, 684 ms browser load, correct
  title and language, one H1, a main landmark, no missing alt text, no
  unlabeled buttons, and no console errors.
- Live Axe integration found 0 violations on `/` and the populated `/demo`.
- Fresh 1366×900 desktop and phone contexts saw the job, named audience,
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
offline, edited metadata, and completed an asset. This clean-route success
does not cover the failed legal-page sequence described above.
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
- The live checkout returns its expected hosted-checkout redirect. Price and
  paid features are unchanged.

Live and local SHA-256 values match:

```text
app-DJU2VLLX.js   4b83eaf459f4f44d58e79dcf35dad9ad9d6d820dee8f6a87b68bd0d015355962
app-DrPbLigf.css  21b595dc86fd3ee400491b6b562e5cf6ec30285040399beca43ef5c4c74c81a2
sw.js             1ba12b6a4d25f9a71d1ada8928db4e005a48c9139fa333208bf37a4e7d9248b4
```

Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices
100, SEO 100; FCP 1.0 s, LCP 1.4 s, TBT 0 ms, CLS 0.002.

## Earlier finding disposition

- Verification 1 sidecar-path collisions remain covered by ZIP-content tests;
  both nested duplicate paths export separately. The live API limiter returns
  429 with `Retry-After`.
- Verification 2 claim registry, demo isolation, plain first read, manifest
  validation, routes/metadata, touch targets, 200% text, caching, service
  worker, and trusted-client limiter repairs all passed their current tests.
- Verification 3 heading order is fixed at its semantic cause and current live
  Axe checks report zero `heading-order` violations.

## Required next step

Repair the service-worker navigation cache and its regression coverage, then
replace the remaining metaphor headings with plain labels. Re-run the full
claims registry and the live installed-worker sequence before a new release
decision. No product code was changed in this verification.
