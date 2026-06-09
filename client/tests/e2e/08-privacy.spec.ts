/**
 * Privacy page (/privacy) — content, links, sections.
 */
import { test, expect } from '@playwright/test';

test.describe('Privacy Policy page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy');
  });

  test('PRIV-1: Privacy Policy heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('PRIV-2: all required sections are present', async ({ page }) => {
    for (const keyword of ['Overview', 'Information We Collect', 'How We Use', 'Data Storage', 'Third-Party', 'Your Rights', 'Contact']) {
      await expect(page.locator('h2').filter({ hasText: keyword })).toBeVisible({ timeout: 3000 });
    }
  });

  test('PRIV-3: Google Privacy Policy link exists', async ({ page }) => {
    await expect(page.locator('a[href*="google.com/privacy"]')).toBeVisible();
  });

  test('PRIV-4: contact email link exists', async ({ page }) => {
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  });

  test('PRIV-5: back link returns to homepage', async ({ page }) => {
    await page.locator('a[href="/"]').click();
    await expect(page).toHaveURL('/');
  });

  test('PRIV-6: last updated date is shown', async ({ page }) => {
    await expect(page.locator('text=/Last updated/i')).toBeVisible();
  });
});
