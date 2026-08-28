import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { assetsFromList, importChange } from '../src/importer';
import { buildBundle, changesCsv, parseCatalog } from '../src/exporter';
import { DEFAULT_SETTINGS, type CatalogBackup } from '../src/types';

describe('catalog workflow', () => {
  it('imports tab-separated manifests and groups by folder', () => {
    const [asset] = assetsFromList('Wedding/IMG_001.CR3\tFirst dance\twedding, dance');
    expect(asset).toMatchObject({ filename: 'IMG_001.CR3', event: 'Wedding', caption: 'First dance', status: 'done' });
    expect(asset?.keywords).toEqual(['wedding', 'dance']);
  });

  it('exports merged sidecars, originals, CSV history, and restorable JSON', () => {
    const [asset] = assetsFromList('Trip/IMG_002.NEF\tBlue hour\ttravel, city');
    if (!asset) throw new Error('fixture missing');
    const change = importChange(asset);
    const bundle = unzipSync(buildBundle([asset], [change], DEFAULT_SETTINGS));
    expect(Object.keys(bundle)).toContain('sidecars/Trip/IMG_002.xmp');
    expect(strFromU8(bundle['metadata-inbox-changelog.csv'] ?? new Uint8Array())).toContain('IMG_002.NEF');
    const restored = parseCatalog(strFromU8(bundle['metadata-inbox-catalog.json'] ?? new Uint8Array()));
    expect(restored.assets).toHaveLength(1);
  });

  it('escapes spreadsheet values in the change log', () => {
    const [asset] = assetsFromList('IMG.jpg\tA "quoted" caption\tportrait');
    if (!asset) throw new Error('fixture missing');
    expect(changesCsv([importChange(asset)])).toContain('A ""quoted"" caption');
  });

  it('rejects unrelated JSON', () => {
    expect(() => parseCatalog('{"photos":[]}')).toThrow(/catalog JSON/);
    const valid: CatalogBackup = { version: 1, exportedAt: '', assets: [], changes: [], settings: DEFAULT_SETTINGS };
    expect(parseCatalog(JSON.stringify(valid)).version).toBe(1);
  });
});
