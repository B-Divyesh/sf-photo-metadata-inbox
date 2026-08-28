# Demo sandbox

Demo URL: <https://photo-metadata-inbox.sociobot.in/demo>

`/demo` opens a ready-to-use six-photo catalog with Lisbon street work and a
studio portrait session. Some records are complete, some have partial
metadata, and one includes an original XMP packet. This makes completion,
export, original preservation, restore, offline use, and paid safety behavior
testable without setup.

Demo records use the IndexedDB database `demo:photo-metadata-inbox`. Real work
uses `photo-metadata-inbox`; demo mode never reads or writes that database or
the stored real license. The persistent banner identifies demo mode. **Reset
demo** clears and reseeds only the demo database. **Start for real** clears the
demo database before opening `/`. The demo exposes paid tools without reading
or writing a license token, so direct-write safety can also be tested there.

Run every registered claim from a clean state with the command in
`.factory/claims.json`, or run the combined gate with `npm run test:claims`.
