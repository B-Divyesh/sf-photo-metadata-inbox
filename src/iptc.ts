import { unique, type ParsedMetadata } from './xmp';

const EMPTY: ParsedMetadata = { caption: '', keywords: [] };

export async function parseEmbeddedIptc(file: File): Promise<ParsedMetadata> {
  if (!/\.jpe?g$/i.test(file.name)) return EMPTY;
  const bytes = new Uint8Array(await file.slice(0, 2 * 1024 * 1024).arrayBuffer());
  return parseJpegIptc(bytes);
}

export function parseJpegIptc(bytes: Uint8Array): ParsedMetadata {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return EMPTY;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xda || marker === 0xd9) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    const length = read16(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (marker === 0xed) {
      const result = parseApp13(bytes.subarray(offset + 2, offset + length));
      if (result.caption || result.keywords.length) return result;
    }
    offset += length;
  }
  return EMPTY;
}

function parseApp13(segment: Uint8Array): ParsedMetadata {
  const header = new TextDecoder('latin1').decode(segment.subarray(0, 14));
  if (header !== 'Photoshop 3.0\0') return parseIim(segment);
  let offset = 14;
  while (offset + 12 <= segment.length) {
    const signature = new TextDecoder('ascii').decode(segment.subarray(offset, offset + 4));
    if (signature !== '8BIM') break;
    const resourceId = read16(segment, offset + 4);
    const nameLength = segment[offset + 6] ?? 0;
    const nameBlockLength = 1 + nameLength + ((1 + nameLength) % 2);
    const sizeOffset = offset + 6 + nameBlockLength;
    if (sizeOffset + 4 > segment.length) break;
    const size = read32(segment, sizeOffset);
    const dataOffset = sizeOffset + 4;
    if (dataOffset + size > segment.length) break;
    if (resourceId === 0x0404) return parseIim(segment.subarray(dataOffset, dataOffset + size));
    offset = dataOffset + size + (size % 2);
  }
  return EMPTY;
}

function parseIim(data: Uint8Array): ParsedMetadata {
  let caption = '';
  const keywords: string[] = [];
  let utf8 = false;
  for (let offset = 0; offset + 5 <= data.length;) {
    if (data[offset] !== 0x1c) { offset += 1; continue; }
    const record = data[offset + 1];
    const dataset = data[offset + 2];
    let length = read16(data, offset + 3);
    let header = 5;
    if (length & 0x8000) {
      const count = length & 0x7fff;
      if (count < 1 || count > 4 || offset + 5 + count > data.length) break;
      length = 0;
      for (let index = 0; index < count; index += 1) length = (length << 8) | (data[offset + 5 + index] ?? 0);
      header += count;
    }
    const start = offset + header;
    const end = start + length;
    if (end > data.length) break;
    const valueBytes = data.subarray(start, end);
    if (record === 1 && dataset === 90) utf8 = new TextDecoder('ascii').decode(valueBytes) === '\u001b%G';
    if (record === 2 && (dataset === 120 || dataset === 25)) {
      const value = new TextDecoder(utf8 ? 'utf-8' : 'latin1').decode(valueBytes).replaceAll('\0', '').trim();
      if (dataset === 120) caption = value;
      if (dataset === 25 && value) keywords.push(value);
    }
    offset = end;
  }
  return { caption, keywords: unique(keywords) };
}

function read16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function read32(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] ?? 0) * 0x1000000) + ((bytes[offset + 1] ?? 0) << 16) + ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0)) >>> 0;
}
