import type { CatalogBackup, ChangeEntry, PhotoAsset, Settings } from './types';
import { createXmp, sidecarName } from './xmp';

const encoder = new TextEncoder();

function safePart(value: string): string {
  return value.replace(/[\\:*?"<>|]/g, '-').replace(/^\.+/, '').trim() || 'Unsorted';
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function changesCsv(changes: ChangeEntry[]): string {
  const header = ['timestamp', 'filename', 'action', 'fields', 'caption_before', 'caption_after', 'keywords_before', 'keywords_after', 'status_before', 'status_after'];
  const rows = changes.sort((a, b) => a.at.localeCompare(b.at)).map((change) => [
    change.at, change.filename, change.action, change.fields.join(';'), change.before.caption,
    change.after.caption, change.before.keywords.join(';'), change.after.keywords.join(';'),
    change.before.status, change.after.status
  ].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function buildBundle(assets: PhotoAsset[], changes: ChangeEntry[], settings: Settings): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  assets.forEach((asset) => {
    const folder = safePart(asset.event);
    const sidecar = safePart(sidecarName(asset.filename));
    files[`sidecars/${folder}/${sidecar}`] = encoder.encode(createXmp(asset.originalXmp, asset.caption, asset.keywords));
    if (asset.originalXmp) files[`originals/${folder}/${sidecar}`] = encoder.encode(asset.originalXmp);
  });
  const backup: CatalogBackup = { version: 1, exportedAt: new Date().toISOString(), assets, changes, settings };
  files['metadata-inbox-changelog.csv'] = encoder.encode(changesCsv(changes));
  files['metadata-inbox-catalog.json'] = encoder.encode(JSON.stringify(backup, null, 2));
  files['README.txt'] = encoder.encode('Photo Metadata Inbox export\n\nsidecars/: merged portable XMP files\noriginals/: byte-for-byte original sidecars when one was imported\nmetadata-inbox-changelog.csv: visible provenance log\nmetadata-inbox-catalog.json: restorable local catalog\n');
  return zipStore(files);
}

function zipStore(files: Record<string, Uint8Array>): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const filename = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + filename.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, filename.length, true);
    local.set(filename, 30);
    local.set(data, 30 + filename.length);
    localParts.push(local);

    const central = new Uint8Array(46 + filename.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, filename.length, true);
    centralView.setUint32(42, offset, true);
    central.set(filename, 46);
    centralParts.push(central);
    offset += local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, localParts.length, true);
  endView.setUint16(10, localParts.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  [...localParts, ...centralParts, end].forEach((part) => { output.set(part, cursor); cursor += part.length; });
  return output;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCatalog(source: string): CatalogBackup {
  const value = JSON.parse(source) as Partial<CatalogBackup>;
  if (value.version !== 1 || !Array.isArray(value.assets) || !Array.isArray(value.changes) || !value.settings) {
    throw new Error('Choose a catalog JSON exported by Photo Metadata Inbox.');
  }
  return value as CatalogBackup;
}

interface WritableFileHandle {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

interface WritableDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<WritableDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<WritableFileHandle & { getFile(): Promise<File> }>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<WritableDirectoryHandle>;
  }
}

async function writeText(handle: WritableFileHandle, value: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(value);
  await writable.close();
}

export async function writeSidecarsWithBackups(assets: PhotoAsset[]): Promise<number> {
  if (!window.showDirectoryPicker) throw new Error('Direct folder writing needs a Chromium-based desktop browser. ZIP export works everywhere.');
  const root = await window.showDirectoryPicker({ mode: 'readwrite' });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const backups = await root.getDirectoryHandle('.metadata-inbox-backups', { create: true });
  const backupRun = await backups.getDirectoryHandle(timestamp, { create: true });
  let written = 0;
  for (const asset of assets) {
    const eventFolder = await root.getDirectoryHandle(safePart(asset.event), { create: true });
    const filename = safePart(sidecarName(asset.filename));
    try {
      const existing = await eventFolder.getFileHandle(filename);
      const original = await existing.getFile();
      const backupEvent = await backupRun.getDirectoryHandle(safePart(asset.event), { create: true });
      await writeText(await backupEvent.getFileHandle(filename, { create: true }), await original.text());
    } catch (error) {
      if (error instanceof DOMException && error.name !== 'NotFoundError') throw error;
    }
    await writeText(
      await eventFolder.getFileHandle(filename, { create: true }),
      createXmp(asset.originalXmp, asset.caption, asset.keywords)
    );
    written += 1;
  }
  return written;
}
