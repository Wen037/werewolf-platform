import type { User, GameVenue, GameSession } from "../types";

export const MOCK_USERS: User[] = [
  { id: "u1", username: "AlphaWolf", email: "alpha@wolf.com", role: "player", isVerified: true },
  { id: "u2", username: "SeerSally", email: "sally@seer.com", role: "player", isVerified: false }
];

// --- REAL SINGAPORE VENUES ---
export const MOCK_VENUES: GameVenue[] = [
  {
    id: "v1",
    name: "The Mind Café (Orchard)",
    address: "60A Prinsep Street, Singapore",
    description: "Cozy board game cafe, popular for intense werewolf sessions.",
    imageUrl: "https://images.unsplash.com/photo-1621360841013-c768371e93cf?q=80&w=1000&auto=format&fit=crop", 
    coordinates: { lat: 1.3005, lng: 103.8505 }, // Prinsep St
    pricePerHour: 12,
    amenities: ["Food", "Private Room"]
  },
  {
    id: "v2",
    name: "Battle Bunker (Bugis)",
    address: "201 Victoria St, Bugis+",
    description: "Hardcore gaming arena. Good for competitive play.",
    imageUrl: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3013, lng: 103.8559 }, // Bugis+
    pricePerHour: 10,
    amenities: ["Snacks", "Tournaments"]
  },
  {
    id: "v3",
    name: "Settlers Cafe (Serangoon)",
    address: "39 North Canal Road",
    description: "Classic vibes, great for roleplay focused games.",
    imageUrl: "https://images.unsplash.com/photo-1570701564993-e00652af8aa7?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.2868, lng: 103.8485 }, // North Canal
    pricePerHour: 15,
    amenities: ["Alcohol", "Private Room"]
  }
];

// --- UPCOMING EVENTS ---
export const MOCK_GAMES: GameSession[] = [
  {
    id: "g1",
    hostId: "u1",
    venueId: "v1", // Hosted at Mind Cafe
    title: "Friday Night Bloodbath",
    date: "2026-03-14T19:00:00Z",
    maxPlayers: 12,
    currentPlayers: 8,
    status: "open"
  },
  {
    id: "g2",
    hostId: "u2",
    venueId: "v2", // Hosted at Battle Bunker
    title: "Beginner Friendly Wolf Hunt",
    date: "2026-03-15T14:00:00Z",
    maxPlayers: 9,
    currentPlayers: 3,
    status: "open"
  }
];