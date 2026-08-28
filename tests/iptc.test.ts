import { describe, expect, it, vi } from 'vitest';
import { parseEmbeddedIptc, parseJpegIptc } from '../src/iptc';

const text = new TextEncoder();

function dataset(record: number, id: number, value: string): number[] {
  const bytes = [...text.encode(value)];
  return [0x1c, record, id, bytes.length >> 8, bytes.length & 0xff, ...bytes];
}

describe('embedded IPTC', () => {
  it('reads caption and repeated keywords from a JPEG APP13 resource', () => {
    const iim = new Uint8Array([
      ...dataset(1, 90, '\u001b%G'),
      ...dataset(2, 120, 'A finish-line photograph'),
      ...dataset(2, 25, 'archive'),
      ...dataset(2, 25, 'night')
    ]);
    const payload = new Uint8Array(14 + 4 + 2 + 2 + 4 + iim.length + (iim.length % 2));
    payload.set(text.encode('Photoshop 3.0\0'), 0);
    payload.set(text.encode('8BIM'), 14);
    payload.set([0x04, 0x04, 0, 0], 18);
    new DataView(payload.buffer).setUint32(22, iim.length, false);
    payload.set(iim, 26);
    const jpeg = new Uint8Array(2 + 2 + 2 + payload.length + 2);
    jpeg.set([0xff, 0xd8, 0xff, 0xed, (payload.length + 2) >> 8, (payload.length + 2) & 0xff], 0);
    jpeg.set(payload, 6);
    jpeg.set([0xff, 0xda], 6 + payload.length);

    expect(parseJpegIptc(jpeg)).toEqual({ caption: 'A finish-line photograph', keywords: ['archive', 'night'] });
  });

  it('ignores non-JPEG data safely', () => {
    expect(parseJpegIptc(text.encode('not a photograph'))).toEqual({ caption: '', keywords: [] });
  });

  it('@claim:jpeg-read-limit reads no more than 2 MB of a selected JPEG', async () => {
    const slice = vi.fn(() => ({ arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xda]).buffer }));
    const file = { name: 'sample.jpg', slice } as unknown as File;
    await parseEmbeddedIptc(file);
    expect(slice).toHaveBeenCalledWith(0, 2 * 1024 * 1024);
  });
});
