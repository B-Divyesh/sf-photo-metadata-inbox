# Photo Metadata Inbox — independent verification 2: FAIL

Date: 2026-08-28

Work order: `photo-metadata-inbox-verify-2`

Tested commit: `7fb14816e99fa8c3307f297dc8e6445d77f3eafb`

Tested URL: <https://photo-metadata-inbox.sociobot.in/>

## Decision

**FAIL — do not release.** See
[`.factory/verification-2.md`](verification-2.md) for complete evidence.

Release blockers:

1. Required `.factory/claims.json` is missing; all live/README claims are
   unregistered and there are no demo claim commands to run.
2. The cold first screen does not identify photographers with large libraries,
   and its headline is metaphorical rather than the job in plain words.
3. “Try a 6-photo sample” writes into the real `photo-metadata-inbox`
   IndexedDB, remains on `/`, has no demo banner/reset/exit, and mixes sample
   and real records. `.factory/demo.md` is missing.
4. The live three-request limiter is bypassable: changing caller-controlled
   `X-Client-IP` produced 6/6 HTTP 200 responses.

Additional defects: non-photo `../notes.txt` manifest input is accepted; site
metadata/robots/sitemap/404/demo title and backend health/build identity are
missing; several mobile targets are under 44 px; 200% text clips queue text;
fixed-name assets are cached for only 30 seconds; and the first combined E2E
run had one transient mobile-offline timeout.

## Verification summary

- Clean installs and audits: pass, 0 vulnerabilities.
- Lint and TypeScript: pass.
- Unit tests: 13/13 pass.
- Exact production build: pass; `dist/index.html` produced.
- E2E: first full run 9 pass / 2 skip / 1 fail; isolated failing test passed;
  full rerun 10 pass / 2 skip.
- Normal workflow: import/sample, validation, edit, completion, persistence,
  XMP/CSV/JSON ZIP export all pass.
- Live axe: no serious/critical issues at desktop or 390 px; one minor issue.
- Keyboard, visible focus, reduced motion, normal mobile fit: pass.
- Offline reload/edit and controlled service-worker update: pass.
- No console/page errors or third-party requests in the normal catalog flow.
- Normal rate burst: requests 1–3 HTTP 200, request 4 onward HTTP 429 with
  `Retry-After: 60`; forged `X-Client-IP` bypasses it.
- Lighthouse mobile: 100 performance / 100 accessibility / 100 best practices;
  LCP 1.5 s, TBT 20 ms, CLS 0.
- Budgets: JS 39,604 B, CSS 20,364 B, hero WebP 72,308 B.
- Live/local JS, CSS, and service-worker SHA-256 hashes match exactly.

## How to reproduce

```sh
npm ci
npm ci --prefix api
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- --reporter=line
```

Open the live URL in a fresh profile. The missing audience is visible on the
first screen. Click “Try a 6-photo sample,” then inspect IndexedDB and import a
real manifest row to observe a single mixed seven-asset catalog. Burst
`/api/license/verify?license=invalid` normally to see the 3-request threshold;
repeat while changing `X-Client-IP` to reproduce the bypass.

## Repository state

No product code was changed. This verification report and handoff are the only
intended modifications. The candidate remains buildable. No deployment,
infrastructure, DNS, billing, or product data was modified.
