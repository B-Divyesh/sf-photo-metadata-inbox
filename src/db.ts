import { DEFAULT_SETTINGS, type ChangeEntry, type PhotoAsset, type Settings } from './types';

const REAL_DB_NAME = 'photo-metadata-inbox';
const DEMO_DB_NAME = 'demo:photo-metadata-inbox';
const DB_VERSION = 1;

let connection: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseNameForPath(location.pathname), DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local catalog.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('changes')) db.createObjectStore('changes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
    };
    request.onsuccess = () => resolve(request.result);
  });
  return connection;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local catalog operation failed.'));
  });
}

export async function getAssets(): Promise<PhotoAsset[]> {
  const db = await openDb();
  return requestResult(db.transaction('assets').objectStore('assets').getAll());
}

export async function putAssets(assets: PhotoAsset[]): Promise<void> {
  if (!assets.length) return;
  const db = await openDb();
  const tx = db.transaction('assets', 'readwrite');
  const store = tx.objectStore('assets');
  assets.forEach((asset) => store.put(asset));
  await transactionDone(tx);
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('assets', 'readwrite');
  tx.objectStore('assets').delete(id);
  await transactionDone(tx);
}

export async function clearCatalog(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['assets', 'changes'], 'readwrite');
  tx.objectStore('assets').clear();
  tx.objectStore('changes').clear();
  await transactionDone(tx);
}

export async function resetCatalog(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['assets', 'changes', 'settings'], 'readwrite');
  tx.objectStore('assets').clear();
  tx.objectStore('changes').clear();
  tx.objectStore('settings').clear();
  await transactionDone(tx);
}

export async function getChanges(): Promise<ChangeEntry[]> {
  const db = await openDb();
  return requestResult(db.transaction('changes').objectStore('changes').getAll());
}

export async function addChanges(changes: ChangeEntry[]): Promise<void> {
  if (!changes.length) return;
  const db = await openDb();
  const tx = db.transaction('changes', 'readwrite');
  const store = tx.objectStore('changes');
  changes.forEach((change) => store.put(change));
  await transactionDone(tx);
}

export async function getSettings(): Promise<Settings> {
  const db = await openDb();
  const value = await requestResult(db.transaction('settings').objectStore('settings').get('catalog'));
  return { ...DEFAULT_SETTINGS, ...(value as Partial<Settings> | undefined) };
}

export async function putSettings(settings: Settings): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('settings', 'readwrite');
  tx.objectStore('settings').put(settings, 'catalog');
  await transactionDone(tx);
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Local catalog transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Local catalog transaction was cancelled.'));
  });
}

export function resetDbConnectionForTests(): void {
  void connection?.then((db) => db.close());
  connection = undefined;
}

export function databaseNameForPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') === '/demo' ? DEMO_DB_NAME : REAL_DB_NAME;
}
