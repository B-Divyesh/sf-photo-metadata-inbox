import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { URL } from 'node:url';

const indexPath = new URL('../dist/index.html', import.meta.url);
const workerPath = new URL('../dist/sw.js', import.meta.url);
const html = await readFile(indexPath, 'utf8');
const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]))];
const buildId = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);
const worker = (await readFile(workerPath, 'utf8'))
  .replace('photo-metadata-inbox-__BUILD_ID__', `photo-metadata-inbox-${buildId}`)
  .replace('const BUILT_ASSETS = [];', `const BUILT_ASSETS = ${JSON.stringify(assets)};`);

await writeFile(workerPath, worker);
