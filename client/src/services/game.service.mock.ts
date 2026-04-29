import { MOCK_GAMES, MOCK_VENUES, MOCK_SESSION_INTERACTIONS, MOCK_USERS, MOCK_USER_SUBSCRIPTIONS, MOCK_VENUE_INTERACTIONS } from "../data/mockDB";
import type { GameSessionDTO, GameVenueDTO, FullUserProfileDTO } from "../types";

const CURRENT_USER_ID = "u1";
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MockGameService = {
  getAllVenues: async (): Promise<GameVenueDTO[]> => {
    await delay(300);
    return MOCK_VENUES.map(v => ({
      ...v,
      myInteraction: MOCK_VENUE_INTERACTIONS.find(i => i.userId === CURRENT_USER_ID && i.venueId === v.id),
    }));
  },

  getVenueById: async (id: string): Promise<GameVenueDTO> => {
    await delay(200);
    const v = MOCK_VENUES.find(v => v.id === id)!;
    return { ...v, myInteraction: MOCK_VENUE_INTERACTIONS.find(i => i.userId === CURRENT_USER_ID && i.venueId === id) };
  },

  likeVenue: async (id: string) => {
    await delay(200);
    const cur = MOCK_VENUE_INTERACTIONS.find(i => i.userId === CURRENT_USER_ID && i.venueId === id);
    const isLiked = cur ? !cur.isLiked : true;
    console.log(`[Mock] likeVenue ${id} → ${isLiked}`);
    return { isLiked };
  },

  subscribeVenue: async (id: string) => {
    await delay(200);
    const cur = MOCK_VENUE_INTERACTIONS.find(i => i.userId === CURRENT_USER_ID && i.venueId === id);
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
        myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === game.id && i.userId === CURRENT_USER_ID),
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
        myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === game.id && i.userId === CURRENT_USER_ID),
      }));
  },

  getGameById: async (sessionId: string): Promise<GameSessionDTO> => {
    await delay(200);
    const game = MOCK_GAMES.find(g => g.id === sessionId)!;
    return {
      ...game,
      hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username,
      venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name,
      myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === sessionId && i.userId === CURRENT_USER_ID),
    };
  },

  getMyEvents: async (): Promise<GameSessionDTO[]> => {
    await delay(300);
    const results: GameSessionDTO[] = [];
    for (const i of MOCK_SESSION_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID)) {
      const game = MOCK_GAMES.find(g => g.id === i.sessionId);
      if (!game) continue;
      results.push({ ...game, hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username, venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name, myInteraction: i });
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
    const cur = MOCK_SESSION_INTERACTIONS.find(i => i.userId === CURRENT_USER_ID && i.sessionId === id);
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
    const user = MOCK_USERS.find(u => u.id === CURRENT_USER_ID)!;
    const myInteractions = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID);
    const pastEvents: GameSessionDTO[] = [];
    for (const i of myInteractions) {
      const game = MOCK_GAMES.find(g => g.id === i.sessionId);
      if (!game || game.status !== "finished") continue;
      pastEvents.push({ ...game, hostName: MOCK_USERS.find(u => u.id === game.hostId)?.username, venueName: MOCK_VENUES.find(v => v.id === game.venueId)?.name, myInteraction: i });
    }
    const followedUsers = MOCK_USER_SUBSCRIPTIONS
      .filter(s => s.followerId === CURRENT_USER_ID)
      .map(s => MOCK_USERS.find(u => u.id === s.followingId))
      .filter((u): u is NonNullable<typeof u> => u !== undefined);
    const followedVenues = MOCK_VENUE_INTERACTIONS
      .filter(i => i.userId === CURRENT_USER_ID && i.isSubscribed)
      .map(i => MOCK_VENUES.find(v => v.id === i.venueId))
      .filter((v): v is NonNullable<typeof v> => v !== undefined);
    const likedGamesCount = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID && i.isLiked).length;
    return { ...user, skillLevel: user.skillLevel || "Intermediate", pastEvents, followedUsers, followedVenues, likedGamesCount };
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
};
