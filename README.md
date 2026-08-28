# Photo Metadata Inbox

Photo Metadata Inbox is a private, offline-first work queue for photographers
who need to finish captions and keywords across a large backlog. It turns
folders into finite event queues, preserves imported XMP, records every
change, and exports portable sidecars instead of trying to become another DAM.

Live product: <https://photo-metadata-inbox.sociobot.in>

One-click demo: <https://photo-metadata-inbox.sociobot.in/demo>. The six-photo
sample uses a separate `demo:photo-metadata-inbox` IndexedDB database. Reset
returns the sample to its starting state; starting for real clears demo data.

## What v1 does

- Imports photo filenames from a local folder, with matching `.xmp` sidecars,
  or from a pasted manifest.
- Groups the backlog by event/folder and tracks explicit completion.
- Edits captions and keywords with a configurable controlled vocabulary.
- Preserves non-edited XMP fields and includes byte-for-byte originals in the
  export bundle.
- Exports XMP sidecars under their collision-safe relative folder paths, a CSV
  provenance log, and a restorable catalog JSON.
- Stores the queue in IndexedDB and works after an installed offline reload.
- Offers a US$12 one-time full-line pass for templates, event-level bulk apply,
  and direct folder writing with timestamped backups. Manual editing and every
  export remain free.

Image bytes are never stored or uploaded. Folder processing reads filenames,
sidecar text, and at most the first 2 MB of JPEGs to find embedded IPTC.

## Run locally

Requires a current Node.js release (20.19+ recommended).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Chromium-based desktop browsers provide
the most complete experience because direct sidecar writing uses the File
System Access API. ZIP export works in other evergreen browsers.

## Test and build

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

The exact production build command is `npm run build`. Static output lands in
`dist/`, with `dist/index.html` at its root. Browser tests use the pinned
Playwright 1.58.2 Chromium installation and cover persistence, 390 px layout,
axe accessibility checks, and offline reload.

Run each visitor-facing promise from `.factory/claims.json`, or run them all:

```sh
npm run test:claims
```

## Import manifest format

Use one path per line. Caption and keywords are optional tab-separated fields;
keywords may be comma- or semicolon-separated.

```text
2026-08-wedding/IMG_0001.CR3
2026-08-wedding/IMG_0002.CR3	First dance	wedding, dance, evening
```

## Data and sidecar safety

The app is static: there is no application server or catalog sync. Browser
storage uses IndexedDB. A generated XMP is merged into an imported sidecar so
unrelated namespaces/fields survive. ZIP bundles always retain original XMP in
`originals/`. Direct writing asks for an explicit destination and copies every
matching sidecar into `.metadata-inbox-backups/<timestamp>/` before replacing
it. Keep a separate photo-library backup before any bulk metadata operation.

License tokens are stored in localStorage and checked at most daily through a
rate-limited same-origin verification function that forwards only the token to
the Sociobot billing API. Checkout is hosted by Sociobot/Dodo; no payment
provider is embedded here.

## Product documents

- [Visual thesis](.factory/design.md)
- [Demo sandbox](.factory/demo.md)
- [Claim registry](.factory/claims.json)
- [Copy audit](.factory/copy-audit.md)
- [Privacy notice](privacy/index.html)
- [Terms](terms/index.html)
- [Build handoff](.factory/handoff.md)

## Deployment

Deploy `dist/` and the managed `api/` functions with the work order's static
deployment helper. `staticwebapp.config.json` handles `/demo`, legal pages, a
real 404 response, security headers, and immutable built assets.

## License

MIT. See [LICENSE](LICENSE).
