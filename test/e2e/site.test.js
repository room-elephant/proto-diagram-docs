const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CLI = path.resolve(__dirname, '../../bin/proto-diagram-docs.js');
const CONFIG = path.resolve(__dirname, '../../proto-diagrams.example.yaml');
const OUTPUT = path.resolve(__dirname, '../../dist-e2e-test');

test.beforeAll(() => {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  execFileSync('node', [CLI, 'generate', '--config', CONFIG, '--output', OUTPUT], {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'pipe',
  });
});

test.afterAll(() => {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
});

const siteUrl = () => `file://${path.join(OUTPUT, 'index.html')}`;

test('loads the site and shows catalog', async ({ page }) => {
  await page.goto(siteUrl());
  await expect(page.locator('text=Proto Diagram Docs')).toBeVisible();
});

test('catalog shows groups', async ({ page }) => {
  await page.goto(siteUrl());
  await expect(page.locator('.group-header', { hasText: 'Billing' })).toBeVisible();
  await expect(page.locator('.group-header', { hasText: 'Notifications' })).toBeVisible();
});

test('clicking a proto loads a diagram', async ({ page }) => {
  await page.goto(siteUrl());
  await page.locator('.proto-entry').first().click();
  await expect(page.locator('.viewer svg, .viewer img')).toBeVisible({ timeout: 5000 });
});

test('deep link navigates to correct diagram', async ({ page }) => {
  const index = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'search-index.json'), 'utf8'));
  const firstFile = index.find(e => e.type === 'file');
  const type = firstFile.diagramTypes[0];
  await page.goto(`${siteUrl()}#/${firstFile.id}/${type}`);
  await expect(page.locator('.viewer svg, .viewer img')).toBeVisible({ timeout: 5000 });
});

test('search filters catalog entries', async ({ page }) => {
  await page.goto(siteUrl());
  await page.fill('.search-input', 'billing');
  const visibleEntries = await page.locator('.proto-entry:visible').count();
  expect(visibleEntries).toBeGreaterThan(0);
});

test('zoom controls work', async ({ page }) => {
  await page.goto(siteUrl());
  await page.locator('.proto-entry').first().click();
  await expect(page.locator('.viewer svg, .viewer img')).toBeVisible({ timeout: 5000 });
  await page.locator('.zoom-in').click();
  await page.locator('.zoom-out').click();
  await page.locator('.zoom-fit').click();
  await page.locator('.zoom-reset').click();
});

test('hamburger toggles catalog visibility', async ({ page }) => {
  await page.goto(siteUrl());
  const catalog = page.locator('.catalog');
  await expect(catalog).toBeVisible();
  await page.locator('.hamburger').click();
  await expect(catalog).not.toBeVisible();
  await page.locator('.hamburger').click();
  await expect(catalog).toBeVisible();
});
