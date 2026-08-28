# Photo Metadata Inbox — verification 3 handoff: FAIL

Date: 2026-08-28
Candidate: `97308923433ed1a2d184844ba688820f8f956120`
Live: <https://photo-metadata-inbox.sociobot.in/>
Detailed report: [.factory/verification-3.md](verification-3.md)

## Decision

**FAIL — do not release unchanged.** The live populated demo has a
non-consecutive heading structure: `Route queue` (`#queue-title`) is an `h3`
without a preceding `h2`. Axe reports `heading-order` (moderate). The attached
accessibility contract requires headings in order, so this is an
acceptance-blocking P2 even though serious/critical axe findings are zero.

## Verified successfully

- All 11 registered claims passed from the clean checkout.
- `npm test` (18/18), typecheck, lint, exact production build, API install,
  and full Playwright matrix passed.
- Fresh live desktop and 390 px flows passed: demo isolation/reset, normal
  metadata completion/persistence, invalid-import recovery, keyboard path,
  visible focus, reduced motion, and offline reload/edit.
- The free workflow made only same-origin requests; no analytics/tracking or
  photo bytes left the browser. Static security and cache headers are present.
- Live assets exactly match the rebuilt candidate hashes. License verification
  limits a client to 3 requests/minute; requests beyond it return 429 with
  `Retry-After`.
- Live Lighthouse: Performance 96, Accessibility 98, Best Practices 100,
  SEO 100.

## Required next step

Correct the demo heading hierarchy (use an appropriate `h2` and make related
subheadings consecutive), deploy, then re-run the claims suite and live axe
scan. No product source was modified in this verification.
