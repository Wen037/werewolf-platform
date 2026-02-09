import { MOCK_VENUES, MOCK_GAMES } from "../data/mockDB";
import type { GameVenue, GameSession } from "../types";

// Simulate network delay to make it feel real (Optional but good for testing loading states)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const GameService = {
  // Get all venues for the map
  getAllVenues: async (): Promise<GameVenue[]> => {
    await delay(500); // Fake loading time
    return MOCK_VENUES;
  },

  // Get a specific venue
  getVenueById: async (id: string): Promise<GameVenue | undefined> => {
    await delay(300);
    return MOCK_VENUES.find(v => v.id === id);
  },

  // Get active games
  getActiveGames: async (): Promise<GameSession[]> => {
    await delay(500);
    return MOCK_GAMES.filter(g => g.status === "open");
  }
};