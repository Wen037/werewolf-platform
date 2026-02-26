import { MOCK_GAMES, MOCK_VENUES, MOCK_SESSION_INTERACTIONS, MOCK_USERS, MOCK_USER_SUBSCRIPTIONS, MOCK_VENUE_INTERACTIONS } from "../data/mockDB";
import type { GameSessionDTO, GameVenue, FullUserProfileDTO, User } from "../types";

// 模拟当前登录用户 ID
const CURRENT_USER_ID = "u1"; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const GameService = {
  // ... (保留之前的 getAllVenues, getVenueById, getActiveGames, getMyEvents, rateGame) ...

  getAllVenues: async (): Promise<GameVenue[]> => {
    await delay(300);
    return MOCK_VENUES;
  },

  getVenueById: async (id: string): Promise<GameVenue | undefined> => {
    await delay(200);
    return MOCK_VENUES.find(v => v.id === id);
  },

  getActiveGames: async (): Promise<GameSessionDTO[]> => {
    await delay(300);
    return MOCK_GAMES.map(game => ({
       ...game,
       myInteraction: MOCK_SESSION_INTERACTIONS.find(i => i.sessionId === game.id && i.userId === CURRENT_USER_ID)
    }));
  },

  getMyEvents: async (): Promise<GameSessionDTO[]> => {
    await delay(300);
    const myInteractions = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID);
    const myEvents = myInteractions.map(interaction => {
      const game = MOCK_GAMES.find(g => g.id === interaction.sessionId);
      if (!game) return null;
      return { ...game, myInteraction: interaction };
    }).filter(e => e !== null) as GameSessionDTO[];
    return myEvents;
  },

  rateGame: async (sessionId: string, rating: number) => {
     await delay(200);
     console.log(`[MockAPI] User ${CURRENT_USER_ID} rated session ${sessionId}: ${rating} stars`);
  },

  // --- 新增：获取完整个人资料 ---
  getMyFullProfile: async (): Promise<FullUserProfileDTO> => {
    await delay(300);
    
    // 1. 基本信息
    const user = MOCK_USERS.find(u => u.id === CURRENT_USER_ID)!;
    
    // 2. 历史战局 (Finished Games)
    const myInteractions = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID);
    const pastEvents = myInteractions
      .map(i => {
        const game = MOCK_GAMES.find(g => g.id === i.sessionId);
        if (game && game.status === "finished") {
           return { ...game, myInteraction: i };
        }
        return null;
      })
      .filter(e => e !== null) as GameSessionDTO[];

    // 3. 我关注的人
    const mySubs = MOCK_USER_SUBSCRIPTIONS.filter(s => s.followerId === CURRENT_USER_ID);
    const followedUsers = mySubs.map(s => MOCK_USERS.find(u => u.id === s.followingId)).filter(Boolean) as User[];

    // 4. 我收藏的地点
    const myVenueInters = MOCK_VENUE_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID && i.isSubscribed);
    const followedVenues = myVenueInters.map(i => MOCK_VENUES.find(v => v.id === i.venueId)).filter(Boolean) as GameVenue[];

    // 5. 点赞数统计
    const likedGamesCount = MOCK_SESSION_INTERACTIONS.filter(i => i.userId === CURRENT_USER_ID && i.isLiked).length;

    return {
      ...user,
      skillLevel: user.skillLevel || "Intermediate", 
      pastEvents,
      followedUsers,
      followedVenues,
      likedGamesCount
    };
  },

  // --- 新增：更新技能段位 ---
  updateSkillLevel: async (level: string) => {
    await delay(200);
    console.log(`[MockAPI] Updated skill to ${level}`);
  },

  // --- 新增：更新 Bio ---
  updateBio: async (bio: string) => {
    await delay(300);
    console.log(`[MockAPI] Updated bio to: ${bio}`);
  }
};