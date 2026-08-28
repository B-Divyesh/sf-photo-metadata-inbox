import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';

afterEach(async () => {
  await Promise.all(['photo-metadata-inbox', 'demo:photo-metadata-inbox'].map((name) => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  })));
});
