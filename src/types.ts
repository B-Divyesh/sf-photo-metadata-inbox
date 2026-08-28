export type AssetStatus = 'inbox' | 'done';

export interface PhotoAsset {
  id: string;
  filename: string;
  relativePath: string;
  event: string;
  caption: string;
  keywords: string[];
  status: AssetStatus;
  source: 'folder' | 'list' | 'catalog';
  originalCaption: string;
  originalKeywords: string[];
  originalXmp?: string;
  importedAt: string;
  updatedAt: string;
}

export interface ChangeEntry {
  id: string;
  assetId: string;
  filename: string;
  at: string;
  action: 'import' | 'edit' | 'complete' | 'reopen' | 'template' | 'write';
  fields: string[];
  before: { caption: string; keywords: string[]; status: AssetStatus };
  after: { caption: string; keywords: string[]; status: AssetStatus };
}

export interface MetadataTemplate {
  id: string;
  name: string;
  caption: string;
  keywords: string[];
}

export interface Settings {
  vocabulary: string[];
  templates: MetadataTemplate[];
  activeEvent: string;
  showCompleted: boolean;
}

export interface CatalogBackup {
  version: 1;
  exportedAt: string;
  assets: PhotoAsset[];
  changes: ChangeEntry[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  vocabulary: [],
  templates: [],
  activeEvent: 'All events',
  showCompleted: false
};

export function snapshot(asset: PhotoAsset): ChangeEntry['before'] {
  return { caption: asset.caption, keywords: [...asset.keywords], status: asset.status };
}
