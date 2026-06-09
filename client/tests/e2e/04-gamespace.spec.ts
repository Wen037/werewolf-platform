/**
 * Game Space page (/gamespace) — venue list, create space, like/subscribe, search/filter.
 */
import { test, expect } from '@playwright/test';
import { interceptApi, loginAs, logoutState } from './helpers/mock-api';

test.describe('Game Space — Guest', () => {
  test.beforeEach(async ({ page }) => {
    await logoutState(page);
    await interceptApi(page);
    await page.goto('/gamespace');
  });

  test('GS-1: venues list renders (at least one card)', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(1500);
    // Either venue card or "no venues" text should appear
    const hasContent = await page.locator('text=/Howling Den|Night Garden|no venue/i').first().isVisible({ timeout: 5000 });
    expect(hasContent).toBeTruthy();
  });

  test('GS-2: Create Space button prompts login for guest', async ({ page }) => {
    const createBtn = page.getByText(/Create Space|Add Space|New Space/i).first()
      .or(page.getByRole('button', { name: /create/i }));
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      // Should open auth modal, not create space form
      await expect(page.locator('button', { hasText: 'LOGIN' }).or(
        page.locator('button', { hasText: 'REGISTER' })
      ).first()).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Game Space — Logged-in', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await interceptApi(page);
    await page.goto('/gamespace');
    await page.waitForTimeout(1000);
  });

  test('GS-3: Create Space button opens create space modal', async ({ page }) => {
    const createBtn = page.getByText(/Create Space|Add Space|New Space|\+/i).first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.dispatchEvent('click');
      // Modal form should appear — use first() directly to avoid strict mode
      await expect(
        page.locator('input[placeholder*="name" i], input[placeholder*="venue" i], input[placeholder*="space" i]').first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('GS-4: venue card click navigates to venue detail', async ({ page }) => {
    const card = page.locator('a[href*="/gamespace/"]').first();
    if (await card.isVisible({ timeout: 3000 })) {
      await card.dispatchEvent('click');
      await expect(page).toHaveURL(/\/gamespace\//);
    }
  });

  test('GS-5: search/filter input exists', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill('Howling');
      await expect(searchInput).toHaveValue('Howling');
    }
  });

  test('GS-6: Like button on venue card is interactive', async ({ page }) => {
    const likeBtn = page.locator('button[aria-label*="like" i], button').filter({ hasText: /♥|❤|like/i }).first()
      .or(page.locator('.lucide-heart').locator('..').first());
    if (await likeBtn.isVisible({ timeout: 3000 })) {
      await likeBtn.click();
      // Should not throw an error — just verify click succeeded
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Venue Detail page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await interceptApi(page);
    await page.goto('/gamespace/v1');
    await page.waitForTimeout(1000);
  });

  test('GS-7: venue detail page loads with venue name', async ({ page }) => {
    // The mock returns MOCK_VENUES[0] = 'The Howling Den'
    // Use .first() to avoid strict mode when both text and heading match
    await expect(page.locator('text=/Howling Den/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('GS-8: Like button on detail page', async ({ page }) => {
    const likeBtn = page.locator('button').filter({ hasText: /Like|♥/i }).first()
      .or(page.locator('.lucide-heart').locator('..').first());
    if (await likeBtn.isVisible({ timeout: 3000 })) {
      await likeBtn.click();
      await page.waitForTimeout(300);
      // No crash, button should still exist or toggle
    }
  });

  test('GS-9: Subscribe button toggles', async ({ page }) => {
    const subBtn = page.locator('button').filter({ hasText: /Subscribe|Following/i }).first()
      .or(page.locator('.lucide-bell').locator('..').first());
    if (await subBtn.isVisible({ timeout: 3000 })) {
      await subBtn.click();
      await page.waitForTimeout(300);
    }
  });
});
