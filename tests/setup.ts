import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('photo-metadata-inbox');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});
