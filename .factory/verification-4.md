# Finish captions and keywords in a photo backlog — independent verification 4

Date: 2026-09-06

Implementation reviewed: `90a6a8c92f13e49fbaa2553c49d1ce8a487d3f9a`

Documentation reviewed: `e615b0477b1987ae3f8688a6eecc3a5162e69c49`

Live URL: <https://photo-metadata-inbox.sociobot.in/>

## Verdict: FAIL

There are two findings, including one P1 false public claim. Do not release
this image unchanged.

## First screen

Job: finish captions and keywords in a photo backlog.

Audience: photographers with large Lightroom-style libraries.

First action: **Try it with sample data**. It loads six sample photos in a
separate demo.

Fresh 1366 x 900 desktop and iPhone 13 contexts both showed the job, audience,
and first action at scroll position zero. The action was fully inside the
viewport on both.

## Findings

### P1 — a normal legal-page visit breaks the claimed offline demo

The landing page, README, and claim registry say “Works offline after the
first visit.” The registered `offline-reload` test passes, but its sandbox
only opens `/demo` before going offline. It misses this normal sequence:

1. In a new browser profile, open `/` and wait for the service worker to
   control the page.
2. Open `/terms/` while online.
3. Go offline, open a new page, and request `/demo?verification4=1`.

Live result: HTTP 200 with title **Terms — Photo Metadata Inbox**, H1 **Terms
of the line.**, and no demo banner. The demo cannot be used offline.

The same installed-worker state also turns an online request for
`/not-a-product-route` into HTTP 200 Terms rather than the designed 404. A
direct, non-worker HTTP request correctly returns the designed page with HTTP
404, so this is a service-worker navigation-cache defect.

`public/sw.js` stores every successful navigation response under
`/index.html`; after `/terms/`, its fallback cache entry is the Terms document.
It also falls back to that entry when a network response is 404. The result
both falsifies the offline claim and breaks 404 behavior after installation.

Fix the navigation strategy so only the app shell is stored as the app-shell
fallback. Cache legal pages using their own request URLs, and return a real
404 response rather than falling back to the shell for a live 404. Extend the
`@claim:offline-reload` scenario to visit a legal route before its offline
demo reload, and add an installed-worker 404 regression.

### P2 — visible headings use forbidden route metaphors

The plain-words contract forbids metaphor or mood headings on every page.
The live landing eyebrow says “A finite route through the backlog,” the Terms
H1 is “Terms of the line.,” and the 404 uses “Wrong platform” and “This route
is not on the line.” These phrases do not name their sections in plain words.

Replace them with direct labels such as “Photo metadata backlog,” “Terms,” and
“Page not found.” Update `.factory/copy-audit.md` to include every displayed
landing sentence; its current table omits the landing route eyebrow.

## Clean checkout and claims

A new checkout at documentation SHA `e615b0477b1987ae3f8688a6eecc3a5162e69c49`
was clean. Its only difference from implementation SHA
`90a6a8c92f13e49fbaa2553c49d1ce8a487d3f9a` is documentation:
`.factory/copy-audit.md` and `.factory/handoff.md`.

All declared setup and quality commands passed:

```sh
npm ci
npm ci --prefix api
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
npm audit --omit=dev --prefix api
npm run test:e2e -- --reporter=line
```

Results: 18/18 unit tests passed; production build created `dist/index.html`;
both audits found zero vulnerabilities; the full browser suite passed with 21
tests and 5 intentional project skips. The built payload was 45.13 KB JS raw
(15.09 KB gzip) and 23.15 KB CSS raw (5.87 KB gzip).

Each of the 11 commands in `.factory/claims.json` was run separately from that
checkout and passed: `demo-isolation`, `local-only`, `offline-reload`,
`metadata-workflow`, `portable-export`, `catalog-restore`, `free-exports`,
`paid-safety`, `daily-license`, `rate-limited-license`, and
`jpeg-read-limit`. The P1 is still a finding because the public offline claim
is false in the normal legal-page sequence that its registered test omits.
Untested claim count: **0**.

## Live checks

- `verify-url.sh` passed: HTTPS 200 in 684 ms, title and language present, one
  H1, main landmark, zero missing image alt attributes, zero unlabeled buttons,
  and zero console errors.
- Fresh desktop and phone contexts loaded the sample in one click. The
  persistent sample banner was visible. Completing the first Lisbon item moved
  its event from 1 of 3 to 2 of 3; Reset demo restored its starting caption;
  Start for real left the real catalog at zero assets.
- Live Axe scans reported zero violations on `/`, populated `/demo`,
  `/privacy/`, `/terms/`, and a fresh direct 404 page. Keyboard, 390 px layout,
  200% text, and reduced-motion checks pass in the clean browser suite.
- Free demo requests were same-origin only and produced no browser console or
  page errors. No image bytes were stored in the checked sample data.
- `/`, `/demo`, legal pages, manifest, worker, robots, sitemap, and PWA icons
  return 200. A direct unknown-route request returns the designed page with
  HTTP 404. The product checkout endpoint returns its expected redirect.
- The live license verifier admitted three requests, then returned three HTTP
  429 responses with `Retry-After: 60`, despite rotating untrusted
  `X-Client-IP` headers. `/api/health/` returned product
  `photo-metadata-inbox`, version `1.1.0`, and `status: ok`.
- Mobile Lighthouse 12.8.2: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.0 s, LCP 1.4 s, TBT 0 ms, CLS 0.002.
- Rebuilt and live SHA-256 values matched for `app-DJU2VLLX.js`,
  `app-DrPbLigf.css`, and `sw.js`, proving the live frontend is the reviewed
  implementation.

## Earlier finding disposition

- The duplicate-sidecar collision is covered by the passing portable-export
  claim; the test observes distinct nested output paths.
- The license limiter now enforces three requests per minute and sends
  `Retry-After`; the live forged-header check above confirms it.
- The former missing claim registry, non-isolated sample, missing first-screen
  audience/action, route metadata, touch-target, manifest, caching, and health
  issues are covered by current files and passed clean tests/live checks.
- The verification-3 skipped-heading issue is repaired: live Axe found no
  `heading-order` result on home or demo.

Those repairs remain effective. The service-worker sequence and plain-words
copy defects above are new findings in this verification.
