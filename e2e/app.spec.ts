import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { strFromU8, unzipSync } from 'fflate';

test('cold first-read and routes match the product contract', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Photo Metadata Inbox — finish captions and keywords');
  await expect(page.getByRole('heading', { level: 1, name: 'Finish captions and keywords in your photo backlog' })).toBeVisible();
  await expect(page.getByText(/photographers with large Lightroom-style libraries/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Move each event to done' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your catalog stays yours' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'US$12 once' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://photo-metadata-inbox.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /social-card-7d83b68a\.jpg$/);

  await page.goto('/demo');
  await expect(page).toHaveTitle('Demo — Photo Metadata Inbox');
  await expect(page.getByText('Demo — sample data, nothing is saved to your catalog')).toBeVisible();

  await page.goto('/definitely-not-a-real-route');
  await expect(page).toHaveTitle('Page not found — Photo Metadata Inbox');
  await expect(page.getByRole('heading', { level: 1, name: 'This route is not on the line' })).toBeVisible();
});

test('@claim:demo-isolation keeps sample work separate, resettable, and disposable', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { level: 1, name: 'DSC_1043.NEF' })).toBeVisible();
  await page.locator('#caption').fill('Changed only inside the demo.');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#caption')).toHaveValue('Tram tracks after the rain.');

  const names = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(names).toContain('demo:photo-metadata-inbox');
  expect(names).not.toContain('photo-metadata-inbox');

  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Finish captions and keywords in your photo backlog' })).toBeVisible();
  const demoCount = await page.evaluate(async () => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('demo:photo-metadata-inbox');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const count = db.transaction('assets').objectStore('assets').count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    };
  }));
  expect(demoCount).toBe(0);
});

test('@claim:local-only keeps the demo flow on this origin and stores no image bytes', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url());
  });
  await page.goto('/demo');
  await page.locator('#caption').fill('A local-only caption.');
  await page.locator('#keywords').fill('private, local');
  await page.getByRole('button', { name: /Mark complete/ }).click();
  const stored = await page.evaluate(async () => new Promise<unknown[]>((resolve, reject) => {
    const request = indexedDB.open('demo:photo-metadata-inbox');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const values = request.result.transaction('assets').objectStore('assets').getAll();
      values.onsuccess = () => resolve(values.result);
      values.onerror = () => reject(values.error);
    };
  }));
  expect(JSON.stringify(stored)).not.toContain('data:image');
  expect(externalRequests).toEqual([]);
});

test('@claim:portable-export downloads all sidecars, originals, CSV, and JSON without path collisions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Bundle bytes are inspected once on desktop Chromium.');
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.locator('#manifest').fill('root-a/Wedding/IMG_0001.CR3\nroot-b/Wedding/IMG_0001.CR3\nEvent/IMG_0002.CR3\tCaption\tperson, place');
  await page.getByRole('button', { name: 'Import to inbox' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export XMP' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('Download path was not available.');
  const files = unzipSync(new Uint8Array(await readFile(path)));
  expect(Object.keys(files)).toEqual(expect.arrayContaining([
    'sidecars/root-a/Wedding/IMG_0001.xmp',
    'sidecars/root-b/Wedding/IMG_0001.xmp',
    'originals/Lisbon-2026/DSC_1042.xmp',
    'metadata-inbox-changelog.csv',
    'metadata-inbox-catalog.json'
  ]));
  expect(strFromU8(files['originals/Lisbon-2026/DSC_1042.xmp'] ?? new Uint8Array())).toContain('xmp:Rating="4"');
  expect(strFromU8(files['metadata-inbox-changelog.csv'] ?? new Uint8Array()).trim().split('\n')).toHaveLength(10);
  expect(JSON.parse(strFromU8(files['metadata-inbox-catalog.json'] ?? new Uint8Array())).assets).toHaveLength(9);
});

test('@claim:catalog-restore restores an exported edit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'File restoration is covered once on desktop Chromium.');
  await page.goto('/demo');
  await page.locator('#caption').fill('Restored caption from JSON.');
  await page.getByRole('button', { name: 'Open settings and license' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Catalog JSON only' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('Download path was not available.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Import' }).click();
  await page.locator('#catalog-file').setInputFiles(path);
  await page.getByRole('button', { name: 'Import to inbox' }).click();
  await expect(page.locator('#caption')).toHaveValue('Restored caption from JSON.');
});

test('@claim:free-exports keeps every export available without a license', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Downloads are covered once on desktop Chromium.');
  await page.goto('/demo');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:photo-metadata-inbox'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Export XMP' })).toBeVisible();
  await page.getByRole('button', { name: 'Open settings and license' }).click();
  await expect(page.getByRole('button', { name: 'Download XMP bundle' })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Catalog JSON only' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^metadata-inbox-catalog-/);
});

test('@claim:paid-safety enables templates and backs up existing sidecars before direct writes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'File System Access behavior is covered once on desktop Chromium.');
  await page.addInitScript(() => {
    type TestWindow = Window & { __writes: string[] };
    const testWindow = window as TestWindow;
    testWindow.__writes = [];
    const directory = (path: string): unknown => ({
      getDirectoryHandle: async (name: string) => directory(`${path}/${name}`),
      getFileHandle: async (name: string) => ({
        getFile: async () => new File(['existing sidecar'], name),
        createWritable: async () => ({
          write: async () => { testWindow.__writes.push(`${path}/${name}`); },
          close: async () => undefined
        })
      })
    });
    Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: async () => directory('') });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'See the paid features' }).click();
  await expect(page.getByText('US$12', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buy the full-line pass' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/photo-metadata-inbox/checkout');
  await page.goto('/demo');
  await expect(page.getByRole('button', { name: 'Save current as template' })).toBeVisible();
  await page.getByRole('button', { name: 'Open settings and license' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Choose destination folder' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __writes: string[] }).__writes)).toContainEqual(expect.stringMatching(/\.metadata-inbox-backups\/[^/]+\/Lisbon-2026\/DSC_1042\.xmp$/));
  expect(await page.evaluate(() => (window as Window & { __writes: string[] }).__writes)).toContain('/Lisbon-2026/DSC_1042.xmp');
});

test('@claim:offline-reload edits the demo after an installed offline reload', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Offline install is covered once on mobile Chromium.');
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Demo — sample data, nothing is saved to your catalog')).toBeVisible();
  await page.locator('#caption').fill('Edited with the network offline.');
  await page.locator('#keywords').fill('offline, demo');
  await page.getByRole('button', { name: /Mark complete/ }).click();
  await expect(page.getByText('2 of 3 complete').first()).toBeVisible();
});

test('rejects unsafe and non-photo manifest paths without changing the queue', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.locator('#manifest').fill('../notes.txt');
  await page.getByRole('button', { name: 'Import to inbox' }).click();
  await expect(page.getByRole('alert')).toContainText('not a safe, supported photo path');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('3 assets in this view')).toBeVisible();
});

test('has no serious accessibility violations and no invalid ARIA roles', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto('/');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
  expect(results.violations.map((issue) => issue.id)).not.toContain('aria-allowed-role');
  await page.goto('/demo');
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
  expect(results.violations.map((issue) => issue.id)).not.toContain('aria-allowed-role');
  expect(consoleErrors).toEqual([]);
});

test('supports the primary keyboard path', async ({ page }) => {
  await page.goto('/demo');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  const firstTicket = page.locator('[data-queue-index="0"]');
  const secondTicket = page.locator('[data-queue-index="1"]');
  await firstTicket.focus();
  await page.keyboard.press('ArrowRight');
  await expect(secondTicket).toBeFocused();
  await secondTicket.press('Enter');
  await page.locator('#caption').fill('Keyboard-entered caption.');
  await page.locator('#keywords').fill('keyboard, archive');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('2 of 3 complete').first()).toBeVisible();
});

test('fits 390px, keeps touch targets, and does not clip labels at 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  for (const selector of ['.brand', 'footer a', '.switch input']) {
    const boxes = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(boxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const clipped = await page.locator('.event-stop strong,.event-stop small,.queue-ticket strong,.queue-ticket small').evaluateAll((nodes) => nodes.some((node) => node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth));
  expect(clipped).toBe(false);
});

test('@claim:metadata-workflow persists completed metadata across reload', async ({ page }) => {
  await page.goto('/demo');
  await page.locator('#caption').fill('A tram crossing Lisbon at blue hour.');
  await page.locator('#keywords').fill('Lisbon, tram, blue hour');
  await page.getByRole('button', { name: /Mark complete/ }).click();
  await expect(page.getByText('2 of 3 complete').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('2 of 3 complete').first()).toBeVisible();
});
