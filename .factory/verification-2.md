# Independent verification 2 — FAIL

Date: 2026-08-28

Work order: `photo-metadata-inbox-verify-2`

Candidate: `7fb14816e99fa8c3307f297dc8e6445d77f3eafb`

Live URL: <https://photo-metadata-inbox.sociobot.in/>

## Release decision

**FAIL. Do not release this candidate.** The candidate fails three explicit
preconditions: `.factory/claims.json` is absent, the cold first screen does
not say who the product is for in plain words, and the sample experience is
not an isolated, resettable demo. Fresh live evidence also shows that the API
rate limit can be bypassed with a caller-controlled client-address header.

The earlier export-collision defect is repaired, the normal unmodified-header
rate-limit check now reaches 429, and the live static build matches this
candidate. Those repairs do not override the new work order's mandatory
claims, first-read, and demo-sandbox gates.

## Release-blocking findings

### P0 — required claim registry and claim tests are absent

`.factory/claims.json` does not exist at the candidate commit. Therefore there
were no listed claim commands to run through the demo entry point. The work
order explicitly makes a missing registry release-blocking.

This is not merely missing documentation. The live page and README make many
observable promises without registered `@claim:<id>` tests, including:

- “No images uploaded” and “Private by design · nothing is uploaded.”
- “Original XMP preserved.”
- “Works without a connection.”
- CSV/change-log export, collision-safe paths, restorable JSON, and
  timestamped backups.
- Daily license verification and availability of every free export.

`.factory/demo.md` and `.factory/copy-audit.md` are also absent.

### P0 — cold first-read does not identify the user or state the job plainly

Cold live text begins with:

```text
A FINITE ROUTE THROUGH THE BACKLOG
EVERY PHOTOGRAPH DESERVES A DESTINATION.
Bring in filenames and XMP sidecars. Work event by event, keep every original,
and leave with portable metadata—not another photo library.
```

Observed first actions were “Open a local folder” and “Try a 6-photo sample.”
The screen gives a reasonable description of importing and editing metadata,
and it gives an action to click, but it never says that the product is for
photographers with a large Lightroom-style library. Its visual headline is a
metaphor, while the sole H1 is the product name in the header. This fails the
required job headline, named audience, and one-sentence situation test.

### P0 — the sample is not a demo sandbox

Clicking “Try a 6-photo sample” does load a useful six-asset queue in one
click, but it is not demo mode:

- The URL remains `/`; `/demo` is only the generic SPA fallback and has the
  normal home title and state.
- There is no persistent “Demo — sample data, nothing is saved” banner.
- There are no “Reset demo” or “Start for real” actions.
- Sample records are written to the production IndexedDB database named
  `photo-metadata-inbox`; there is no `demo:` namespace.
- A fresh probe counted 6 assets/6 history entries after loading the sample.
  Importing `My-real-library/ACTUAL_0001.CR3` then produced 7 assets/7 entries
  and “All events — 0 of 7 complete.” Sample and real records therefore mix.

This violates the acceptance contract's data-isolation guarantee and makes
the claim sandbox unavailable.

### P1 — rate limiting is bypassable with `X-Client-IP`

The ordinary live burst now behaves correctly: requests 1–3 returned 200;
request 4 and later returned 429 with `Retry-After: 60`,
`RateLimit-Limit: 3`, and `Cache-Control: no-store`.

However, the handler chooses the caller-supplied `X-Client-IP` before the
platform forwarding address. Six rapid requests with six distinct
`X-Client-IP: 198.51.100.x` values all returned 200 and each advertised two
remaining requests. The live platform passes that header through, so a client
can create an unlimited number of buckets. The required limiter is not an
effective enforcement boundary.

## Other findings

### P2 — invalid manifest entries become photo assets

Blank import is handled well: the dialog announces “Choose a folder or paste
at least one new filename.” In the same clean browser, `../notes.txt` was then
accepted, stored in IndexedDB, and shown as a photo queue item. Manifest input
does not enforce the photo extensions used by folder import or reject parent
path segments.

### P2 — mandatory site structure and metadata are incomplete

- No canonical URL, Open Graph metadata, Twitter card, SVG favicon, or
  apple-touch icon appears in the landing HTML.
- `/robots.txt` and `/sitemap.xml` return 404.
- An unknown route such as `/definitely-not-a-real-route` returns the app with
  HTTP 200; there is no designed 404 route.
- `/demo` does not set “Demo — Photo Metadata Inbox.”
- The landing page omits the required How it works, explicit non-goals/privacy,
  and visible paid-tier sections; price and features are hidden in a dialog.
- The footer omits “Built by Param Factory” and a version/build identifier.
- The managed API exposes no health or build-identity route; `/api/health`,
  `/api/healthz`, and `/api/version` all return 404.

### P2 — mobile accessibility details miss the baseline

At 390 px, the wordmark link is 38 px high, and footer Privacy/Terms targets
are approximately 18 px high. The visible checkbox itself is 20×20 px. These
miss the 44×44 px target requirement. With the root text size doubled to
simulate 200% text resize, event and queue labels are visibly clipped even
though the page hides horizontal overflow. Normal-size 390 px use has no
horizontal overflow.

Axe found no serious or critical issues on welcome or populated screens at
desktop or 390 px. It did report a minor `aria-allowed-role` issue on the
catalog. Keyboard-only checks passed: skip link, designed 3 px focus outline,
sample activation, queue arrow/Enter behavior, native dialog focus, Escape,
and Ctrl/Command+Enter completion all work.

### P2 — static asset caching does not meet the immutable-cache policy

Fixed-name `app.js`, `app.css`, and artwork responses use
`Cache-Control: public, must-revalidate, max-age=30`, not hashed immutable
assets with long-lived caching. The service worker makes repeat/offline use
functional, but the response policy still misses the stated performance
contract.

### P3 — the full E2E suite showed one transient offline failure

The first `npm run test:e2e -- --reporter=line` run failed the mobile offline
test after reload remained on “Opening your local catalog…”. The retained
trace is under ignored `test-results/`. The exact test passed in isolation,
and a complete rerun passed 10 tests with 2 intentional project skips. This
looks flaky rather than a repeatable offline defect, but the gate was not
deterministic on a clean run.

## Successful evidence

### Clean repository gates

The checkout began clean and exactly at the candidate SHA.

```text
npm ci                                      pass, 178 packages, 0 vulnerabilities
npm ci --prefix api                         pass, 0 vulnerabilities
npm run lint                                pass
npm run typecheck                           pass
npm test                                    pass, 13/13
npm run build                               pass, dist/index.html present
npm audit --omit=dev                        pass
npm audit --omit=dev --prefix api           pass
npm run test:e2e -- --reporter=line         first run 9 pass / 2 skip / 1 fail
isolated mobile offline rerun                pass
complete E2E rerun                           10 pass / 2 skip
```

### Smallest useful workflow

- Sample load showed two events and a finite six-asset queue.
- Empty completion focused Caption; caption-only completion focused Keywords.
- Caption input capped a 2,001-character boundary value at 2,000.
- Caption, de-duplicated keywords, completion, event progress, and local state
  persisted after reload.
- The downloaded ZIP contained all six sample XMP sidecars,
  `metadata-inbox-changelog.csv`, `metadata-inbox-catalog.json`, and README.
- Unit coverage passed for nested duplicate names, safe-name collisions,
  XMP merge/preservation, embedded JPEG IPTC, catalog restore, CSV escaping,
  same-origin license routing, and concurrent limiter behavior.

### Privacy, browser, PWA, and response checks

- Desktop and 390 px normal flows produced no console errors, page errors, or
  third-party requests. No remote fonts, analytics, or tracking were seen.
- The factory `verify-url.sh` passed: HTTPS 200 in 719 ms, title/lang/one H1/
  main present, 0 missing alts, 0 unlabeled buttons, 0 console errors.
- Security headers include CSP, HSTS, frame denial, nosniff, Referrer Policy,
  Permissions Policy, COOP, and CORP. Manifest MIME is correct; `sw.js` is
  `no-cache`.
- Fresh live install created `photo-metadata-inbox-v4` with all 10 shell
  entries. At 390 px, an offline reload loaded sample data, accepted edits,
  completed an asset, and showed “Offline · on device” without errors.
- A controlled local changed-worker response activated a new version, deleted
  the old cache, claimed the client, and emitted “A fresh timetable is ready.
  Refresh to update.”
- The hosted checkout returned 303 to the Sociobot/Dodo checkout. No sign-in
  exists, so the Entra authority requirement is not applicable.

### Performance and deployment identity

Lighthouse 12.8.2 mobile on the live page reported performance 100,
accessibility 100, best practices 100; FCP 1.0 s, LCP 1.5 s, TBT 20 ms,
CLS 0, and Speed Index 1.1 s.

Payloads are within budget: JS 39,604 B raw / 13.47 KB gzip, CSS 20,364 B raw
/ 5.35 KB gzip, hero WebP 72,308 B, and no font payload.

Fresh local build and live deployment are byte-identical:

```text
assets/app.js  f9afde876442924e42441117ba444761a42fdf64dfa53cbf31aaa1b8bae3147d
assets/app.css e0f08623540b49ef2910742ce0656ae31f7aed277f4908c002813436d6a86c70
sw.js          1efcc7f4b7b41bfcdc14837e7d1a10c4b7f50fb3bddf33296caf3de8c2d06305
```

## Required remediation

1. Add `.factory/claims.json`; give every visitor-facing promise exactly one
   observable `@claim` demo test, and add `.factory/demo.md`.
2. Replace the first-screen metaphor/product-name H1 with a plain job headline
   and name photographers with large libraries in the supporting sentence.
3. Implement `/demo` or `?demo=1` with a separate storage namespace, persistent
   demo banner, Reset demo, and Start for real. Never mix sample and real data.
4. Derive rate-limit identity only from a platform-trusted address or enforce
   the limit at the edge; ignore caller-supplied forwarding headers.
5. Reject non-photo and unsafe manifest paths; complete the mandatory route,
   metadata, touch-target, text-resize, and caching requirements.
