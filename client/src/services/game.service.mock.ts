import { MOCK_GAMES, MOCK_VENUES, MOCK_SESSION_INTERACTIONS, MOCK_USERS, MOCK_USER_SUBSCRIPTIONS, MOCK_VENUE_INTERACTIONS } from "../data/mockDB";
import type { GameSessionDTO, GameVenueDTO, FullUserProfileDTO, GameVenue } from "../types";

// ── Current user resolved from localStorage (follows debug panel switches) ─
function getCurrentUserId(): string {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.id) return u.id;
    }
  } catch { /* ignore */ }
  return "u1"; // fallback: AlphaWolf
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockGameService = {
  getAllVenues: async (): Promise<GameVenueDTO[]> => {
    await delay(300);
    return MOCK_VENUES.map(v => {
      const pending = MOCK_GAMES.filter(
        g => g.venueId === v.id && g.status !== 'finished' && g.venueApprovalStatus === 'pending'
      ).length;
      return {
        ...v,
        myInteraction: MOCK_VENUE_INTERACTIONS.find(i => i.userId === getCurrentUserId() && i.venueId === v.id),
        pendingApplicationsCount: pending > 0 ? pending : undefined,
      };
    });
  },

  getVenueById: async (id: string): Promise<GameVenueDTO> => {
    await delay(200);
    const v = MOCK_VENUES.find(v => v.id === id)!;
    const pending = MOCK_GAMES.filter(
      g => g.venueId === id && g.status !== 'finished' && g.venueApprovalStatus === 'pending'
    ).length;
    return {
      ...v,
      myInteraction: MOCK_VENUE_INTERACTIONS.find(i => i.userId === getCurrentUserId() && i.venueId === id),
      pendingApplicationsCount: pending > 0 ? pending : undefined,
    };
  },

  likeVenue: async (id: string) => {
    await delay(200);
    const cur = MOCK_VENUE_INTERACTIONS.find(i => i.userId === getCurrentUserId() && i.venueId === id);
    const isLiked = cur ? !cur.isLiked : true;
    console.log(`[Mock] likeVenue ${id} → ${isLiked}`);
    return { isLiked };
  },

  subscribeVenue: async (id: string) => {
    await delay(200);
    const cur = MOCK_VENUE_INTERACTIONS.find(i => i.userId === getCurrentUserId() && i.venueId === id);
    const isSubscribed = cur ? !cur.isSubscribed : true;
    console.log(`[Mock] subscribeVenue ${id} → ${isSubscribed}`);
    return { isSubscribed };
  },

  rateVenue: async (id: string, rating: number) => {
    await delay(200);
    console.log(`[Mock] rateVenue ${id}: ${rating}`);
  },

  getSessionsByVenue: async (venueId: string): Promise<GameSessionDTO[]> => {
    await delay(200);
    const venue = MOCK_VENUES.find(v => v.id === venueId);
    return MOCK_GAMES
      .filter(g => g.venueId === venueId)
      .map(game => ({
        ...game,
        hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username,
        venueName: venue?.name,
        venueAddress: venue?.address,
        pricePerHour: venue?.pricePerHour,
        myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === game.id && i.userId === getCurrentUserId()),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getActiveGames: async (): Promise<GameSessionDTO[]> => {
    await delay(300);
    return MOCK_GAMES
      .filter(g => g.status === "open" || g.status === "playing")
      .map(game => ({
        ...game,
        hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username,
        venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name,
        myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === game.id && i.userId === getCurrentUserId()),
      }));
  },

  getGameById: async (sessionId: string): Promise<GameSessionDTO> => {
    await delay(200);
    const game = MOCK_GAMES.find(g => g.id === sessionId)!;
    return {
      ...game,
      hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username,
      venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name,
      myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === sessionId && i.userId === getCurrentUserId()),
    };
  },

  getMyEvents: async (): Promise<GameSessionDTO[]> => {
    await delay(300);
    const results: GameSessionDTO[] = [];
    const seen = new Set<string>();

    for (const i of MOCK_SESSION_INTERACTIONS.filter(i => i.userId === getCurrentUserId())) {
      const game = MOCK_GAMES.find(g => g.id === i.sessionId);
      if (!game) continue;
      seen.add(game.id);
      results.push({ ...game, hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username, venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name, myInteraction: i });
    }
    // Include events the user hosts but has no interaction record for
    for (const game of MOCK_GAMES.filter(g => g.hostId === getCurrentUserId() && !seen.has(g.id))) {
      results.push({ ...game, hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username, venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name });
    }
    return results;
  },

  joinGame: async (id: string) => {
    await delay(200);
    console.log(`[Mock] joinGame ${id}`);
    return { wasWaitlisted: false };
  },

  leaveGame: async (id: string) => {
    await delay(200);
    console.log(`[Mock] leaveGame ${id}`);
    return { message: "Left successfully." };
  },

  likeGame: async (id: string) => {
    await delay(200);
    const cur = MOCK_SESSION_INTERACTIONS.find(i => i.userId === getCurrentUserId() && i.sessionId === id);
    const isLiked = cur ? !cur.isLiked : true;
    console.log(`[Mock] likeGame ${id} → ${isLiked}`);
    return { isLiked };
  },

  rateGame: async (sessionId: string, rating: number) => {
    await delay(200);
    console.log(`[Mock] rateGame ${sessionId}: ${rating}`);
  },

  getMyFullProfile: async (): Promise<FullUserProfileDTO> => {
    await delay(300);
    const user = MOCK_USERS.find(u => u.id === getCurrentUserId())!;
    const myInteractions = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === getCurrentUserId());
    const pastEvents: GameSessionDTO[] = [];
    for (const i of myInteractions) {
      const game = MOCK_GAMES.find(g => g.id === i.sessionId);
      if (!game || game.status !== "finished") continue;
      pastEvents.push({ ...game, hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username, venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name, myInteraction: i });
    }
    const followedUsers = MOCK_USER_SUBSCRIPTIONS
      .filter(s => s.followerId === getCurrentUserId())
      .map(s => MOCK_USERS.find(u => u.id === s.followingId))
      .filter((u): u is NonNullable<typeof u> => u !== undefined);
    const followedVenues = MOCK_VENUE_INTERACTIONS
      .filter(i => i.userId === getCurrentUserId() && i.isSubscribed)
      .map(i => MOCK_VENUES.find(v => v.id === i.venueId))
      .filter((v): v is NonNullable<typeof v> => v !== undefined);
    const likedGamesCount = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === getCurrentUserId() && i.isLiked).length;
    return { ...user, skillLevel: user.skillLevel || "Intermediate", pastEvents, followedUsers, followedVenues, likedGamesCount };
  },

  updateVenue: async (id: string, fields: Partial<GameVenue>): Promise<GameVenueDTO> => {
    await delay(300);
    const idx = MOCK_VENUES.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('Venue not found');
    if (MOCK_VENUES[idx].ownerId !== getCurrentUserId()) throw new Error('Forbidden');
    Object.assign(MOCK_VENUES[idx], fields);
    console.log(`[Mock] updateVenue ${id}`, fields);
    return { ...MOCK_VENUES[idx], myInteraction: MOCK_VENUE_INTERACTIONS.find(i => i.userId === getCurrentUserId() && i.venueId === id) };
  },

  updateProfile: async (fields: object) => {
    await delay(200);
    console.log("[Mock] updateProfile", fields);
  },

  updateSkillLevel: async (skillLevel: string) => {
    await delay(200);
    console.log(`[Mock] updateSkillLevel → ${skillLevel}`);
  },

  updateBio: async (bio: string) => {
    await delay(200);
    console.log(`[Mock] updateBio → ${bio}`);
  },

  followUser: async (userId: string) => {
    await delay(200);
    console.log(`[Mock] followUser ${userId}`);
    return { message: "Followed." };
  },

  unfollowUser: async (userId: string) => {
    await delay(200);
    console.log(`[Mock] unfollowUser ${userId}`);
    return { message: "Unfollowed." };
  },

  adjustCredit: async (userId: string, delta: number) => {
    await delay(200);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) { user.creditScore = (user.creditScore ?? 100) + delta; }
    const newScore = user?.creditScore ?? 100;
    console.log(`[Mock] adjustCredit ${userId} by ${delta} → ${newScore}`);
    return { userId, creditScore: newScore };
  },

  // ── Host control methods ───────────────────────────────────────────────────

  getSessionRoster: async (sessionId: string) => {
    await delay(200);
    return MOCK_SESSION_INTERACTIONS
      .filter(i => i.sessionId === sessionId && i.status !== 'cancelled')
      .map(i => ({ user: MOCK_USERS.find(u => u.id === i.userId)!, interaction: i }))
      .filter(r => r.user !== undefined);
  },

  kickPlayer: async (sessionId: string, userId: string) => {
    await delay(200);
    const entry = MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === sessionId && i.userId === userId);
    if (entry) entry.status = 'cancelled';
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (game) game.currentPlayers = Math.max(0, game.currentPlayers - 1);
    console.log(`[Mock] kickPlayer ${userId} from ${sessionId}`);
  },

  addGuest: async (sessionId: string, name: string) => {
    await delay(200);
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (!game) throw new Error('Session not found');
    if (!game.guests) game.guests = [];
    game.guests.push({ name, addedBy: getCurrentUserId(), addedAt: new Date().toISOString() });
    game.currentPlayers += 1;
    console.log(`[Mock] addGuest "${name}" to ${sessionId}`);
    return { ...game };
  },

  removeGuest: async (sessionId: string, index: number) => {
    await delay(200);
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (!game || !game.guests) return;
    game.guests.splice(index, 1);
    game.currentPlayers = Math.max(0, game.currentPlayers - 1);
    console.log(`[Mock] removeGuest index ${index} from ${sessionId}`);
  },

  updateSessionStatus: async (sessionId: string, status: 'open' | 'playing' | 'finished') => {
    await delay(200);
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (game) game.status = status;
    console.log(`[Mock] updateSessionStatus ${sessionId} → ${status}`);
    return { status };
  },

  markAttendance: async (sessionId: string, records: { userId: string; status: 'attended' | 'no-show' }[]) => {
    await delay(300);
    for (const rec of records) {
      const entry = MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === sessionId && i.userId === rec.userId);
      if (entry) entry.status = rec.status;
    }
    console.log(`[Mock] markAttendance ${sessionId}`, records);
  },

  updateSession: async (sessionId: string, fields: Partial<{ title: string; date: string; maxPlayers: number; proficiency: string; description: string }>) => {
    await delay(300);
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (!game) throw new Error('Session not found');
    if (game.hostId !== getCurrentUserId()) throw new Error('Forbidden');
    Object.assign(game, fields);
    console.log(`[Mock] updateSession ${sessionId}`, fields);
    return { ...game };
  },

  updateApprovalMode: async (sessionId: string, mode: 'open' | 'approval' | 'invite_only') => {
    await delay(200);
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (game) game.approvalMode = mode;
    console.log(`[Mock] updateApprovalMode ${sessionId} → ${mode}`);
    return { approvalMode: mode };
  },

  sendMessageToPlayer: async (sessionId: string, userId: string, message: string) => {
    await delay(300);
    const user = MOCK_USERS.find(u => u.id === userId);
    console.log(`[Mock] sendMessageToPlayer → ${user?.username}: "${message}" (session: ${sessionId})`);
  },

  notifyPlayers: async (sessionId: string, message: string) => {
    await delay(400);
    console.log(`[Mock] notifyPlayers ${sessionId}: "${message}"`);
  },

  cancelSession: async (sessionId: string) => {
    await delay(300);
    const game = MOCK_GAMES.find(g => g.id === sessionId);
    if (game) game.status = 'finished';
    MOCK_SESSION_INTERACTIONS
      .filter(i => i.sessionId === sessionId && i.status === 'registered')
      .forEach(i => { i.status = 'cancelled'; });
    console.log(`[Mock] cancelSession ${sessionId}`);
  },
};
