import { describe, expect, it } from 'vitest';
import { createXmp, parseXmp, sidecarName } from '../src/xmp';

const original = `<?xml version="1.0"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:Rating="4">
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Original caption</rdf:li></rdf:Alt></dc:description>
      <dc:subject><rdf:Bag><rdf:li>Lisbon</rdf:li><rdf:li>night</rdf:li></rdf:Bag></dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;

describe('XMP handling', () => {
  it('reads captions and keywords', () => {
    expect(parseXmp(original)).toEqual({ caption: 'Original caption', keywords: ['Lisbon', 'night'] });
  });

  it('updates IPTC fields while preserving unrelated namespaces', () => {
    const output = createXmp(original, 'A new & accurate caption', ['travel', 'night']);
    expect(parseXmp(output)).toEqual({ caption: 'A new & accurate caption', keywords: ['travel', 'night'] });
    expect(output).toContain('xmp:Rating="4"');
  });

  it('creates portable sidecar names', () => {
    expect(sidecarName('IMG.2026.CR3')).toBe('IMG.2026.xmp');
  });
});
