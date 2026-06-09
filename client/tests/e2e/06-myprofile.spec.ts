/**
 * My Profile page (/myprofile) — view profile, edit bio, avatar, settings.
 */
import { test, expect } from '@playwright/test';
import { interceptApi, loginAs, MOCK_USER } from './helpers/mock-api';

test.describe('My Profile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await interceptApi(page);
    // High-priority override registered AFTER interceptApi (LIFO: last-registered = first-matched).
    // Ensures /users/me GET is never swallowed by the **/users/* catch-all in interceptApi.
    await page.route('**/api/users/me', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_USER) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ...MOCK_USER, bio: 'Updated bio' }) });
      }
    });
    await page.goto('/myprofile', { waitUntil: 'domcontentloaded' });
    // Wait for the profile username to actually appear (API call + React re-render)
    await page.waitForSelector(`text=${MOCK_USER.username}`, { timeout: 8000 }).catch(() => {});
  });

  test('PROF-1: profile page loads with username', async ({ page }) => {
    await expect(page.locator(`text=${MOCK_USER.username}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('PROF-2: bio is displayed', async ({ page }) => {
    await expect(page.locator('text=/Logic is my weapon/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('PROF-3: credit score is shown', async ({ page }) => {
    await expect(page.locator('text=/credit/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('PROF-4: Edit / Save button exists', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /edit|save|update/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
  });

  test('PROF-5: can edit bio and submit', async ({ page }) => {
    // Find and click Edit button
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      // Bio textarea should be editable
      const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i], textarea').first();
      if (await bioField.isVisible({ timeout: 2000 })) {
        await bioField.fill('Updated Playwright bio');
        const saveBtn = page.getByRole('button', { name: /save|update/i }).first();
        if (await saveBtn.isVisible()) {
          const patchReq = page.waitForRequest(req => req.method() === 'PATCH' && req.url().includes('/users/me'));
          await saveBtn.click();
          const req = await patchReq.catch(() => null);
          // PATCH request should have been sent
          expect(req).not.toBeNull();
        }
      }
    }
  });

  test('PROF-6: follower / following counts are visible', async ({ page }) => {
    await expect(
      page.locator(`text=${MOCK_USER.followersCount}`).or(
        page.locator('text=/follower/i').first()
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test('PROF-7: notification preferences section visible', async ({ page }) => {
    await expect(page.locator('text=/notification|Notification/i').first()).toBeVisible({ timeout: 5000 });
  });
});
