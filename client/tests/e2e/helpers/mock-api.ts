/**
 * Shared Playwright helpers for Werewolf SG E2E tests.
 * All API calls are intercepted with page.route() — no real backend required.
 */
import { Page } from '@playwright/test';

// ── Mock data snapshots (mirrors src/data/mockDB.ts) ─────────────────────────

export const MOCK_USER = {
  id: 'u1', username: 'AlphaWolf', email: 'alpha@wolf.sg',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha',
  role: 'player', isVerified: true,
  followersCount: 128, followingCount: 45,
  skillLevel: 'Expert', bio: 'Logic is my weapon.', creditScore: 152,
  eventsAttended: 30, eventsHosted: 12, noshows: 0,
  notifPreferences: { email: true, telegram: false, whatsapp: false },
  // FullUserProfileDTO fields — GET /users/me must include these or MyProfilePage crashes
  pastEvents: [], followedUsers: [], followedVenues: [], likedGamesCount: 3,
};

export const MOCK_VENUES = [
  { id: 'v1', name: 'The Howling Den', address: '10 Wolf St, Singapore 123456',
    ownerId: 'u2', type: 'boardgame_store', status: 'Verified', isVerified: true,
    averageRating: 4.5, totalLikes: 44, totalSubscribers: 10,
    location: { lat: 1.3521, long: 103.8198 }, area: 'Toa Payoh',
    coordinates: { lat: 1.3521, lng: 103.8198 },
    imageUrl: 'https://placehold.co/400x200?text=The+Howling+Den',
    pricePerHour: 0, priceType: 'per_person',
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_person' },
    amenities: ['Air-conditioned', 'WiFi'], privacy: 'public' },
  { id: 'v2', name: 'Night Garden', address: '25 Orchard Rd, Singapore 238888',
    ownerId: 'u2', type: 'house', status: 'Verified', isVerified: true,
    averageRating: 4.8, totalLikes: 88, totalSubscribers: 22,
    location: { lat: 1.3050, long: 103.8322 }, area: 'Orchard',
    coordinates: { lat: 1.3050, lng: 103.8322 },
    imageUrl: 'https://placehold.co/400x200?text=Night+Garden',
    pricePerHour: 0, priceType: 'per_person',
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_person' },
    amenities: ['Parking'], privacy: 'approximate' },
];

export const MOCK_GAMES = [
  { id: 'g1', title: 'Weekly Werewolf Night', hostId: 'u2', venueId: 'v1',
    date: new Date(Date.now() + 86400000).toISOString(),
    maxPlayers: 12, currentPlayers: 7, status: 'open',
    proficiency: 'All Welcome', approvalMode: 'open', totalLikes: 5,
    hostName: 'SeerSally', venueName: 'The Howling Den', minPax: 6,
    location: { lat: 1.3521, long: 103.8198 } },
  { id: 'g2', title: 'Advanced Tactics Game', hostId: 'u7', venueId: 'v2',
    date: new Date(Date.now() + 172800000).toISOString(),
    maxPlayers: 10, currentPlayers: 10, status: 'full',
    proficiency: 'Expert', approvalMode: 'approval', totalLikes: 12,
    hostName: 'SilentBob', venueName: 'Night Garden', minPax: 8,
    location: { lat: 1.3050, long: 103.8322 } },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'MatchJoined', message: 'A new player joined your game!',
    isRead: false, createdAt: new Date().toISOString(), channel: 'in-app' },
];

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Inject a logged-in user into localStorage before the page loads. */
export async function loginAs(page: Page, user = MOCK_USER) {
  await page.addInitScript(({ token, userJson }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', userJson);
  }, { token: 'pw-test-token', userJson: JSON.stringify(user) });
}

/** Remove auth from localStorage (simulates guest / logged-out). */
export async function logoutState(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}

// ── Route intercepts ──────────────────────────────────────────────────────────

/** Register all mock API routes. Call this BEFORE page.goto(). */
export async function interceptApi(page: Page) {
  const base = '**/api';

  // Auth
  await page.route(`${base}/auth/login`, async route => {
    const body = route.request().postDataJSON();
    if (body?.email === 'alpha@wolf.sg' && body?.password === 'password123') {
      await route.fulfill({ json: { token: 'pw-test-token', user: MOCK_USER } });
    } else {
      await route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    }
  });

  await page.route(`${base}/auth/register`, async route => {
    await route.fulfill({ json: { message: 'OTP sent to your email.' } });
  });

  await page.route(`${base}/auth/refresh`, async route => {
    await route.fulfill({ json: { token: 'pw-test-token-2', refreshToken: 'pw-refresh-2', user: MOCK_USER } });
  });

  await page.route(`${base}/auth/logout`, async route => {
    await route.fulfill({ json: { message: 'Logged out.' } });
  });

  await page.route(`${base}/auth/verify-otp`, async route => {
    const body = route.request().postDataJSON();
    if (body?.otp === '123456') {
      await route.fulfill({ json: { token: 'pw-test-token', user: MOCK_USER } });
    } else {
      await route.fulfill({ status: 400, json: { message: 'Invalid OTP.' } });
    }
  });

  // Users
  await page.route(`${base}/users/me`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: MOCK_USER });
    } else {
      await route.fulfill({ json: { ...MOCK_USER, bio: 'Updated bio' } });
    }
  });

  await page.route(`${base}/users/*/follow`, async route => {
    await route.fulfill({ json: { followersCount: 129 } });
  });

  // MyEventsPage: GameService.getMyEvents() expects a flat GameSessionDTO[]
  await page.route(`${base}/users/me/events`, async route => {
    await route.fulfill({ json: [...MOCK_GAMES] });
  });

  await page.route(`${base}/users/*`, async route => {
    await route.fulfill({ json: MOCK_USER });
  });

  // Games
  // NOTE: Playwright matches routes in REVERSE registration order (last registered wins).
  // Generic wildcards must be registered FIRST so specific routes take precedence —
  // `**/api/games/*` also matches `/api/games/active`.
  await page.route(`${base}/games/*`, async route => {
    const method = route.request().method();
    if (method === 'POST' && route.request().url().endsWith('/games')) {
      await route.fulfill({ status: 201, json: { ...MOCK_GAMES[0], id: 'g-new' } });
    } else if (method === 'DELETE') {
      await route.fulfill({ json: { success: true } });
    } else {
      await route.fulfill({ json: MOCK_GAMES[0] });
    }
  });

  await page.route(`${base}/games`, async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, json: { ...MOCK_GAMES[0], id: 'g-new' } });
    } else {
      await route.fulfill({ json: MOCK_GAMES });
    }
  });

  await page.route(`${base}/games/active`, async route => {
    await route.fulfill({ json: MOCK_GAMES });
  });

  await page.route(`${base}/games/*/join`, async route => {
    await route.fulfill({ json: { wasWaitlisted: false, waitlistPosition: undefined } });
  });

  await page.route(`${base}/games/*/leave`, async route => {
    await route.fulfill({ json: { success: true } });
  });

  await page.route(`${base}/games/*/like`, async route => {
    await route.fulfill({ json: { totalLikes: 6, isLiked: true } });
  });

  await page.route(`${base}/games/*/rate`, async route => {
    await route.fulfill({ json: { success: true } });
  });

  // Comments (must be before the generic games/* wildcard)
  await page.route(`${base}/games/*/comments/lock`, async route => {
    await route.fulfill({ json: { message: 'Comments locked.' } });
  });

  await page.route(`${base}/games/*/comments/*`, async route => {
    await route.fulfill({ json: { message: 'Comment deleted.' } });
  });

  await page.route(`${base}/games/*/comments`, async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, json: {
        id: 'c1', matchId: 'g1', userId: 'u1', username: 'AlphaWolf',
        text: 'Test comment', createdAt: new Date().toISOString(),
      }});
    } else {
      await route.fulfill({ json: [] });
    }
  });

  // Recap
  await page.route(`${base}/games/*/recap`, async route => {
    await route.fulfill({ json: { message: 'Recap updated.' } });
  });

  // Venues
  await page.route(`${base}/venues/*/like`, async route => {
    await route.fulfill({ json: { isLiked: true, totalLikes: 45 } });
  });

  await page.route(`${base}/venues/*/subscribe`, async route => {
    await route.fulfill({ json: { isSubscribed: true } });
  });

  await page.route(`${base}/venues/*/rate`, async route => {
    await route.fulfill({ json: { success: true } });
  });

  // Venue-owner cancel of an event at the space
  await page.route(`${base}/games/*/venue-cancel`, async route => {
    await route.fulfill({ json: { message: 'Session cancelled by venue.' } });
  });

  // Space comments: DELETE /comments/:id and PATCH /comments/lock both match the
  // two-segment pattern; GET/POST list matches the one-segment pattern
  await page.route(`${base}/venues/*/comments/*`, async route => {
    await route.fulfill({ json: { message: 'OK.' } });
  });

  await page.route(`${base}/venues/*/comments`, async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          id: 'sc-1', venueId: 'v1', userId: MOCK_USER.id, username: MOCK_USER.username,
          avatarUrl: MOCK_USER.avatarUrl, text: body?.text ?? '', createdAt: new Date().toISOString(),
        },
      });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.route(`${base}/venues/*`, async route => {
    await route.fulfill({ json: { ...MOCK_VENUES[0], pendingSessions: [] } });
  });

  await page.route(`${base}/venues`, async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, json: { ...MOCK_VENUES[0], id: 'v-new' } });
    } else {
      await route.fulfill({ json: MOCK_VENUES });
    }
  });

  // Notifications
  await page.route(`${base}/notifications/unread-count`, async route => {
    await route.fulfill({ json: { count: 1 } });
  });

  await page.route(`${base}/notifications*`, async route => {
    await route.fulfill({ json: { notifications: MOCK_NOTIFICATIONS, total: 1 } });
  });

  // Map
  await page.route(`${base}/map/**`, async route => {
    await route.fulfill({ json: [] });
  });

  // Upload
  await page.route(`${base}/upload/sign`, async route => {
    await route.fulfill({ json: { signature: 'sig', timestamp: 123, apiKey: 'key', cloudName: 'test' } });
  });
}
