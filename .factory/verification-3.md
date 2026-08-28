# Independent verification 3 — FAIL

Date: 2026-08-28
Candidate commit: `97308923433ed1a2d184844ba688820f8f956120`
Live URL: <https://photo-metadata-inbox.sociobot.in/>
Demo URL: <https://photo-metadata-inbox.sociobot.in/demo>

## Release decision

**FAIL — do not release this candidate unchanged.** The demo violates the
non-negotiable accessibility semantic-structure requirement: its `Route queue`
heading is an `h3` with no preceding `h2`. This is an axe `heading-order`
violation. Axe classifies it as moderate (not serious/critical), but the work
order explicitly requires a real, non-skipping heading outline, so it remains
an acceptance blocker.

## Defects

### P2 / acceptance blocker — heading levels skip on the populated demo

Reproduced on the live `/demo` in a fresh browser context and in the rebuilt
candidate. Axe reports:

```text
heading-order  moderate
target: #queue-title
summary: Heading order invalid
```

The page has the selected asset as its `h1`, then uses `h3` for `Route queue`
without an intervening `h2`. Screen-reader heading navigation therefore exposes
an invalid outline. Change this heading and the related hierarchy to a
consecutive, meaningful outline, then rerun live axe.

No serious or critical axe violations were found on either `/` or `/demo`.

## Required claims — run first from clean checkout

`npm ci` completed with 0 reported vulnerabilities. Every command declared in
`.factory/claims.json` passed against the shipped demo entry point:

| Claim | Exact declared test | Result |
| --- | --- | --- |
| `demo-isolation` | `npm run test:e2e -- --grep @claim:demo-isolation --project=chromium` | PASS |
| `local-only` | `npm run test:e2e -- --grep @claim:local-only --project=chromium` | PASS |
| `offline-reload` | `npm run test:e2e -- --grep @claim:offline-reload --project=mobile` | PASS |
| `metadata-workflow` | `npm run test:e2e -- --grep @claim:metadata-workflow --project=chromium` | PASS |
| `portable-export` | `npm run test:e2e -- --grep @claim:portable-export --project=chromium` | PASS |
| `catalog-restore` | `npm run test:e2e -- --grep @claim:catalog-restore --project=chromium` | PASS |
| `free-exports` | `npm run test:e2e -- --grep @claim:free-exports --project=chromium` | PASS |
| `paid-safety` | `npm run test:e2e -- --grep @claim:paid-safety --project=chromium` | PASS |
| `daily-license` | `npm test -- --testNamePattern @claim:daily-license` | PASS |
| `rate-limited-license` | `npm test -- --testNamePattern @claim:rate-limited-license` | PASS |
| `jpeg-read-limit` | `npm test -- --testNamePattern @claim:jpeg-read-limit` | PASS |

## Other local quality gates

- `npm test`: **18/18 passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Exact production build, `npm run build`: passed and produced `dist/`.
- Full Playwright matrix, `npm run test:e2e -- --reporter=line`: passed
  (`test-results/.last-run.json` records `status: passed`; 21 executed tests
  and 5 intentional cross-project skips).
- `npm ci --prefix api` and `npm audit --omit=dev --prefix api`: passed; 0
  vulnerabilities.

The build budgets are comfortably met: initial JS is 45,133 B raw / 15,100 B
gzip, CSS is 23,096 B raw / 5,860 B gzip, and the hero WebP is 72,308 B.

## Cold first-read and functional evidence

Cold live first read: it plainly says it **finishes captions and keywords in a
photo backlog**, is **for photographers with large Lightroom-style
libraries**, and presents **Try it with sample data** as the first action,
explaining that it loads six sample photos in a separate demo. This satisfies
the first-screen plain-words and one-click-demo contract.

Fresh live desktop flow at `/demo`: edited caption/keywords, marked the Lisbon
asset complete (progress changed from 1/3 to 2/3), reloaded and retained that
state, reset the demo (restored `DSC_1043.NEF` / “Tram tracks after the rain.”),
and rejected `../notes.txt` with the recoverable error “Line 1 is not a safe,
supported photo path.” Keyboard testing reached the skip link first, displayed
the 3 px brass focus outline, and ArrowRight moved queue focus. At 390 px
there was no horizontal overflow; reduced motion set transitions to 0.01 ms
and smooth scrolling to `auto`.

## Live privacy, PWA, deployment, and headers

- A fresh live demo flow made only same-origin requests (`/demo`, hashed JS,
  and CSS); no analytics, trackers, image uploads, or third-party requests
  were observed. The demo IndexedDB namespace was only
  `demo:photo-metadata-inbox`.
- A fresh 390 px context registered `/sw.js`, went offline, reloaded `/demo`,
  retained the demo banner and edited/completed an asset (Lisbon became 2/3),
  with no console or page errors. `registration.update()` completed and the
  current worker was active; the deployed code includes the update toast and
  `SKIP_WAITING` path.
- The free-flow browser console/page error log was empty on desktop and mobile.
- Live `/`, `/demo`, `/privacy/`, `/terms/`, manifest, worker, assets, and
  internal links returned successfully; an unknown route returned HTTP 404.
  Static responses have CSP, HSTS, XFO, nosniff, Referrer Policy, COOP, CORP,
  Permissions Policy; hashed assets are `max-age=31536000, immutable`, and
  `/sw.js` is `no-cache`.
- The deployment matches the candidate frontend exactly: live and rebuilt
  `app-BfvROA1h.js` SHA-256 are both
  `32f9271a5eb656bdb9ed8bb947096bca224baa028c853e3433173f60c261c0f7`;
  live and rebuilt `app-DnZOQqQA.css` SHA-256 are both
  `9be67cb4990d68d46480067d2a88dcc565c2b4c339ac392b40d371efba9c1656c`.
  `/api/health/` reports product `photo-metadata-inbox`, version `1.1.0`, and
  its deployment identity `c887a3e3-543e-4ea8-aef4-fa4b8e249c84`.
- The same-origin license endpoint allowance is **3 requests per client per
  minute**. After the allowance, fresh observed responses were HTTP 429 with
  `Retry-After: 56`, `RateLimit-Limit: 3`, and
  `RateLimit-Remaining: 0` (three consecutive 429 responses observed).

## Lighthouse

Live mobile Lighthouse 12.8.2: Performance **96**, Accessibility **98**, Best
Practices **100**, SEO **100**; FCP 1.2 s, LCP 1.3 s, CLS 0, TBT 210 ms. The
accessibility score reduction is consistent with the heading-order finding.

## Retest

After correcting the heading hierarchy, rerun the full claims registry, full
Playwright matrix, and live axe scan of `/` and `/demo`. No product-code change
was made during this verification.
