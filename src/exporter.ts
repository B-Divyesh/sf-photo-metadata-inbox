import type { CatalogBackup, ChangeEntry, PhotoAsset, Settings } from './types';
import { createXmp, sidecarName } from './xmp';

const encoder = new TextEncoder();

function safePart(value: string): string {
  return [...value]
    .map((character) => character.charCodeAt(0) < 32 ? '-' : character)
    .join('')
    .replace(/[\\:*?"<>|]/g, '-')
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
    .trim() || 'Unsorted';
}

interface AssetOutputPath {
  directories: string[];
  filename: string;
  relative: string;
}

function outputPath(asset: PhotoAsset): AssetOutputPath {
  const pathParts = asset.relativePath.replaceAll('\\', '/').split('/').filter((part) => part && part !== '.' && part !== '..');
  const sourceDirectories = pathParts.length > 1 ? pathParts.slice(0, -1) : [asset.event];
  const directories = sourceDirectories.map(safePart);
  const filename = safePart(sidecarName(asset.filename));
  return { directories, filename, relative: [...directories, filename].join('/') };
}

function outputPaths(assets: PhotoAsset[]): Map<PhotoAsset, AssetOutputPath> {
  const paths = new Map<PhotoAsset, AssetOutputPath>();
  const owners = new Map<string, PhotoAsset>();
  for (const asset of assets) {
    const path = outputPath(asset);
    const collision = owners.get(path.relative.toLocaleLowerCase());
    if (collision) {
      throw new Error(`Cannot export “${asset.relativePath}” and “${collision.relativePath}” because both resolve to “${path.relative}”. Rename one source path and import again.`);
    }
    owners.set(path.relative.toLocaleLowerCase(), asset);
    paths.set(asset, path);
  }
  return paths;
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
  const paths = outputPaths(assets);
  assets.forEach((asset) => {
    const path = paths.get(asset);
    if (!path) throw new Error(`Could not plan an output path for “${asset.relativePath}”.`);
    files[`sidecars/${path.relative}`] = encoder.encode(createXmp(asset.originalXmp, asset.caption, asset.keywords));
    if (asset.originalXmp) files[`originals/${path.relative}`] = encoder.encode(asset.originalXmp);
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

async function nestedDirectory(root: WritableDirectoryHandle, names: string[]): Promise<WritableDirectoryHandle> {
  let directory = root;
  for (const name of names) directory = await directory.getDirectoryHandle(name, { create: true });
  return directory;
}

export async function writeSidecarsWithBackups(assets: PhotoAsset[]): Promise<number> {
  if (!window.showDirectoryPicker) throw new Error('Direct folder writing needs a Chromium-based desktop browser. ZIP export works everywhere.');
  const paths = outputPaths(assets);
  const root = await window.showDirectoryPicker({ mode: 'readwrite' });
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const backups = await root.getDirectoryHandle('.metadata-inbox-backups', { create: true });
  const backupRun = await backups.getDirectoryHandle(timestamp, { create: true });
  let written = 0;
  for (const asset of assets) {
    const path = paths.get(asset);
    if (!path) throw new Error(`Could not plan an output path for “${asset.relativePath}”.`);
    const destination = await nestedDirectory(root, path.directories);
    try {
      const existing = await destination.getFileHandle(path.filename);
      const original = await existing.getFile();
      const backupDirectory = await nestedDirectory(backupRun, path.directories);
      await writeText(await backupDirectory.getFileHandle(path.filename, { create: true }), await original.text());
    } catch (error) {
      if (error instanceof DOMException && error.name !== 'NotFoundError') throw error;
    }
    await writeText(
      await destination.getFileHandle(path.filename, { create: true }),
      createXmp(asset.originalXmp, asset.caption, asset.keywords)
    );
    written += 1;
  }
  return written;
}
