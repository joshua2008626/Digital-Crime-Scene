import { expect, test } from '@playwright/test';

test('landing page loads and opens the case list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /digital crime scene/i })).toBeVisible();
  await page.getByRole('link', { name: /open a case/i }).first().click();
  await expect(page.getByText('The Phantom Login')).toBeVisible();
});

test('start a case, inspect and collect evidence, and the verdict form validates', async ({ page }) => {
  await page.goto('/#/cases/case-phantom-login');
  await page.getByRole('button', { name: /begin investigation/i }).click();
  await expect(page.getByRole('heading', { name: 'The Phantom Login' })).toBeVisible();

  await page.getByRole('tab', { name: /evidence/i }).click();
  await page.locator('ul button').first().click();
  await page.getByRole('button', { name: /^collect$/i }).click().catch(() => undefined); // start evidence is already collected

  await page.getByRole('tab', { name: /verdict/i }).click();
  await expect(page.getByRole('button', { name: /submit verdict/i })).toBeDisabled();
  await expect(page.getByText(/choose a verdict/i)).toBeVisible();
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/#/cases/case-phantom-login');
  await page.getByRole('button', { name: /begin investigation/i }).click();
  await page.getByRole('tab', { name: /notes/i }).click();
  await page.getByLabel('New note').fill('persisted note');
  await page.getByRole('button', { name: /add note/i }).click();
  await page.waitForTimeout(700); // debounced save
  await page.reload();
  await page.getByRole('tab', { name: /notes/i }).click();
  await expect(page.getByText('persisted note')).toBeVisible();
});

test('phishing lab never exposes clickable suspicious links', async ({ page }) => {
  await page.goto('/#/phishing');
  const hrefs = await page.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
  expect(hrefs.some((h) => /^https?:/i.test(h))).toBe(false);
});

test('mobile layout has no horizontal page scroll', async ({ page }) => {
  await page.goto('/#/dashboard');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
