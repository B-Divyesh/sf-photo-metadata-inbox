import type { ChangeEntry, PhotoAsset } from './types';
import { parseXmp, unique } from './xmp';
import { parseEmbeddedIptc } from './iptc';

const PHOTO_EXTENSIONS = /\.(jpe?g|png|tiff?|heic|heif|avif|webp|dng|cr2|cr3|nef|arw|orf|raf)$/i;

function id(): string {
  return crypto.randomUUID();
}

function eventFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? parts.at(-2) ?? 'Unsorted' : 'Unsorted';
}

function basePath(path: string): string {
  return path.replace(/\.[^.]+$/, '').toLowerCase();
}

export async function assetsFromFiles(files: File[]): Promise<{ assets: PhotoAsset[]; errors: string[] }> {
  const xmpFiles = new Map<string, File>();
  const photos: File[] = [];
  files.forEach((file) => {
    const path = file.webkitRelativePath || file.name;
    if (/\.xmp$/i.test(file.name)) xmpFiles.set(basePath(path), file);
    else if (PHOTO_EXTENSIONS.test(file.name)) photos.push(file);
  });
  const errors: string[] = [];
  const assets = await Promise.all(photos.map(async (file) => {
    const path = file.webkitRelativePath || file.name;
    const sidecar = xmpFiles.get(basePath(path));
    let originalXmp: string | undefined;
    let caption = '';
    let keywords: string[] = [];
    if (sidecar) {
      try {
        originalXmp = await sidecar.text();
        ({ caption, keywords } = parseXmp(originalXmp));
      } catch (error) {
        errors.push(`${sidecar.name}: ${error instanceof Error ? error.message : 'Could not read sidecar.'}`);
      }
    } else if (/\.jpe?g$/i.test(file.name)) {
      try {
        ({ caption, keywords } = await parseEmbeddedIptc(file));
      } catch {
        errors.push(`${file.name}: embedded IPTC could not be read; the filename was still imported.`);
      }
    }
    return makeAsset(file.name, path, 'folder', caption, keywords, originalXmp);
  }));
  return { assets, errors };
}

export function assetsFromList(value: string): PhotoAsset[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => {
    const [path = '', caption = '', keywords = ''] = line.split('\t');
    const filename = path.split('/').at(-1) ?? path;
    return makeAsset(filename, path, 'list', caption, unique(keywords.split(/[;,]/)));
  });
}

export function importChange(asset: PhotoAsset): ChangeEntry {
  const state = { caption: asset.caption, keywords: [...asset.keywords], status: asset.status };
  return {
    id: id(), assetId: asset.id, filename: asset.filename, at: asset.importedAt, action: 'import',
    fields: ['filename', ...(asset.caption ? ['caption'] : []), ...(asset.keywords.length ? ['keywords'] : [])],
    before: { caption: '', keywords: [], status: 'inbox' }, after: state
  };
}

function makeAsset(
  filename: string,
  relativePath: string,
  source: PhotoAsset['source'],
  caption: string,
  keywords: string[],
  originalXmp?: string
): PhotoAsset {
  const now = new Date().toISOString();
  return {
    id: id(), filename, relativePath, event: eventFromPath(relativePath), caption, keywords,
    status: caption && keywords.length ? 'done' : 'inbox', source,
    originalCaption: caption, originalKeywords: [...keywords], originalXmp, importedAt: now, updatedAt: now
  };
}
