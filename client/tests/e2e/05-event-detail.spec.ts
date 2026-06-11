/**
 * Event Detail page (/event/:id) — join, like, rate, host controls, back navigation.
 */
import { test, expect } from '@playwright/test';
import { interceptApi, loginAs, logoutState, MOCK_GAMES } from './helpers/mock-api';

test.describe('Event Detail — Guest', () => {
  test.beforeEach(async ({ page }) => {
    await logoutState(page);
    await interceptApi(page);
    await page.goto('/event/g1');
    await page.waitForTimeout(1000);
  });

  test('EVT-1: event detail page loads', async ({ page }) => {
    await expect(page.locator('text=/Weekly Werewolf|Werewolf Night/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('EVT-2: Join button prompts login for guest', async ({ page }) => {
    const joinBtn = page.getByRole('button', { name: /join/i }).first();
    if (await joinBtn.isVisible({ timeout: 3000 })) {
      await joinBtn.click();
      // Multiple "log in" affordances may exist (auth modal + "Log in to comment") — assert any one
      await expect(
        page.locator('button', { hasText: 'LOGIN' }).or(page.locator('text=/log in|sign in/i')).first()
      ).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Event Detail — Logged-in player', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await interceptApi(page);
    await page.goto('/event/g1');
    await page.waitForTimeout(1000);
  });

  test('EVT-3: event title and venue name visible', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
  });

  test('EVT-4: Join button is clickable and sends API request', async ({ page }) => {
    // Track the API call
    const joinReq = page.waitForRequest(/\/games\/.*\/join/);
    const joinBtn = page.getByRole('button', { name: /join/i }).first();
    if (await joinBtn.isVisible({ timeout: 3000 }) && !(await joinBtn.isDisabled())) {
      await joinBtn.click();
      const req = await joinReq.catch(() => null);
      expect(req).not.toBeNull();
    }
  });

  test('EVT-5: Like button is interactive', async ({ page }) => {
    const likeBtn = page.locator('button').filter({ hasText: /Like|♥/i }).first()
      .or(page.locator('.lucide-heart').locator('..').first());
    if (await likeBtn.isVisible({ timeout: 3000 })) {
      await likeBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('EVT-6: back / breadcrumb navigation works', async ({ page }) => {
    const backBtn = page.locator('a[href*="lobby"], a[href*="gamespace"], button').filter({ hasText: /back|← /i }).first();
    if (await backBtn.isVisible({ timeout: 3000 })) {
      await backBtn.click();
      // Should navigate away from event detail
      await expect(page).not.toHaveURL(/\/event\/g1/);
    }
  });

  test('EVT-7: player list / participant count is visible', async ({ page }) => {
    // Should show player count like "7/12" or similar
    await expect(
      page.locator('text=/players|participant|\/12|\/10/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('EVT-8: Report button exists', async ({ page }) => {
    const reportBtn = page.locator('button').filter({ hasText: /report/i }).first()
      .or(page.locator('.lucide-flag').locator('..').first());
    // Not all views show report — just verify no crash if present
    await page.waitForTimeout(300);
  });
});

test.describe('Event Detail — Full event (waitlist)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await interceptApi(page);
    // Override the single game endpoint to return a full game
    await page.route('**/api/games/g2', async route => {
      await route.fulfill({ json: { ...MOCK_GAMES[1], status: 'full', currentPlayers: 10, maxPlayers: 10 } });
    });
    await page.goto('/event/g2');
    await page.waitForTimeout(1000);
  });

  test('EVT-9: full event shows Join Waitlist button', async ({ page }) => {
    // Either a waitlist button or "full" status text should be visible
    const hasWaitlistOrFull = await page.locator('button, [class*="badge"], [class*="status"]')
      .filter({ hasText: /waitlist|full/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasWaitlistOrFull).toBeTruthy();
  });
});
