import { describe, expect, it } from 'vitest';
import { databaseNameForPath } from '../src/db';

describe('storage namespaces', () => {
  it('keeps demo records outside the real catalog database', () => {
    expect(databaseNameForPath('/')).toBe('photo-metadata-inbox');
    expect(databaseNameForPath('/demo')).toBe('demo:photo-metadata-inbox');
    expect(databaseNameForPath('/demo/')).toBe('demo:photo-metadata-inbox');
  });
});
