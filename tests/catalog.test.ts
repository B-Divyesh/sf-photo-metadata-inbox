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

  it('rejects non-photo and parent-traversal manifest entries', () => {
    expect(() => assetsFromList('../notes.txt')).toThrow(/safe, supported photo path/);
    expect(() => assetsFromList('../private/IMG_0001.CR3')).toThrow(/safe, supported photo path/);
    expect(() => assetsFromList('/absolute/IMG_0002.NEF')).toThrow(/safe, supported photo path/);
    expect(assetsFromList('safe/event/IMG_0003.ARW')).toHaveLength(1);
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

  it('preserves nested relative paths when event and filename pairs repeat', () => {
    const assets = assetsFromList([
      'root-a/Wedding/IMG_0001.CR3',
      'root-b/Wedding/IMG_0001.CR3',
      'Event/IMG_0002.CR3\tCaption\tperson, place'
    ].join('\n'));
    const bundle = unzipSync(buildBundle(assets, assets.map(importChange), DEFAULT_SETTINGS));
    const sidecars = Object.keys(bundle).filter((name) => name.startsWith('sidecars/')).sort();

    expect(sidecars).toEqual([
      'sidecars/Event/IMG_0002.xmp',
      'sidecars/root-a/Wedding/IMG_0001.xmp',
      'sidecars/root-b/Wedding/IMG_0001.xmp'
    ]);
  });

  it('fails clearly if sanitizing source paths would still collide', () => {
    const assets = assetsFromList(['root:a/IMG_0001.CR3', 'root?a/IMG_0001.CR3'].join('\n'));
    expect(() => buildBundle(assets, [], DEFAULT_SETTINGS)).toThrow(/both resolve to/);
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
