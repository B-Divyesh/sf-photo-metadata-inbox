import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('completes and persists a metadata job', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();
  await expect(page.getByRole('heading', { name: 'DSC_1042.NEF' })).toBeVisible();
  await page.locator('#caption').fill('A tram crossing Lisbon at blue hour.');
  await page.locator('#keywords').fill('Lisbon, tram, blue hour');
  await page.getByRole('button', { name: /Mark complete/ }).click();
  await expect(page.getByText('1 of 3 complete').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 of 3 complete').first()).toBeVisible();
});

test('has no serious accessibility violations on welcome and catalog', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto('/');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('downloads a portable XMP bundle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Download is covered once on desktop Chromium.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export XMP' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^metadata-inbox-\d{4}-\d{2}-\d{2}\.zip$/);
});

test('works after the network goes offline', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Offline install path is covered once on mobile Chromium.');
  await page.goto('/');
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  });
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Photo Metadata Inbox' })).toBeVisible();
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();
  await expect(page.getByLabel('3 assets in this view')).toBeVisible();
});

test('fits the 390px mobile workflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();
  await expect(page.locator('#caption')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('supports the primary keyboard path without third-party catalog requests', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') externalRequests.push(url.origin);
  });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();

  const firstTicket = page.locator('[data-queue-index="0"]');
  const secondTicket = page.locator('[data-queue-index="1"]');
  await firstTicket.focus();
  await page.keyboard.press('ArrowRight');
  await expect(secondTicket).toBeFocused();
  await secondTicket.press('Enter');
  await page.locator('#caption').fill('Keyboard-entered caption.');
  await page.locator('#keywords').fill('keyboard, archive');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('1 of 3 complete').first()).toBeVisible();
  expect(externalRequests).toEqual([]);
});
