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
  await page.goto('/');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Try a 6-photo sample' }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);
});

test('works after the network goes offline', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Offline install path is covered once on mobile Chromium.');
  await page.goto('/');
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
