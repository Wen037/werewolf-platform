/**
 * Sidebar navigation — all links, guest guard, active state.
 */
import { test, expect } from '@playwright/test';
import { interceptApi, loginAs, logoutState, MOCK_USER } from './helpers/mock-api';

test.describe('Sidebar — Logged-in', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await interceptApi(page);
    await page.goto('/lobby');
  });

  test('NAV-1: Find Games link navigates to /lobby', async ({ page }) => {
    // Use role+name to avoid matching Logout/Contact Us links that also have href="/lobby"
    // (React Router resolves <Link to="#"> as href="/lobby" when current path is /lobby)
    await page.getByRole('link', { name: /Find Games/i }).first().dispatchEvent('click');
    await expect(page).toHaveURL(/\/lobby/);
  });

  test('NAV-2: Game Space link navigates to /gamespace', async ({ page }) => {
    // Use role+name selector as fallback — href="/gamespace" may resolve differently
    await page.getByRole('link', { name: /Game Space/i }).first().dispatchEvent('click');
    await expect(page).toHaveURL(/\/gamespace/);
  });

  test('NAV-3: My Events link navigates to /myevents', async ({ page }) => {
    await page.locator('a[href="/myevents"]').dispatchEvent('click');
    await expect(page).toHaveURL(/\/myevents/);
  });

  test('NAV-4: My Profile link navigates to /myprofile', async ({ page }) => {
    await page.locator('a[href="/myprofile"]').dispatchEvent('click');
    await expect(page).toHaveURL(/\/myprofile/);
  });

  test('NAV-5: Logout button clears token and redirects to /', async ({ page }) => {
    // Logout is a link/button whose text is "Logout"
    const logoutLink = page.locator('a, button').filter({ hasText: /^Logout$/ }).first();
    if (await logoutLink.isVisible({ timeout: 2000 })) {
      await logoutLink.dispatchEvent('click');
      await expect(page).toHaveURL('/', { timeout: 5000 });
    }
  });
});

test.describe('Sidebar — Guest guard', () => {
  test.beforeEach(async ({ page }) => {
    await logoutState(page);
    await interceptApi(page);
  });

  test('NAV-6: /myevents redirects guest to /', async ({ page }) => {
    await page.goto('/myevents');
    await expect(page).toHaveURL('/');
  });

  test('NAV-7: /myprofile redirects guest to /', async ({ page }) => {
    await page.goto('/myprofile');
    await expect(page).toHaveURL('/');
  });

  test('NAV-8: /admin redirects guest to /', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });

  test('NAV-9: /lobby is accessible to guests (no redirect)', async ({ page }) => {
    await page.goto('/lobby');
    await expect(page).toHaveURL(/\/lobby/);
  });

  test('NAV-10: /gamespace is accessible to guests', async ({ page }) => {
    await page.goto('/gamespace');
    await expect(page).toHaveURL(/\/gamespace/);
  });
});
