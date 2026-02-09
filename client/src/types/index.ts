// Define what a User looks like
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: "player" | "admin";
  isVerified: boolean;
}

// Define what a Game Venue (Map Place) looks like
export interface GameVenue {
  id: string;
  name: string;
  address: string;
  description: string;
  imageUrl: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pricePerHour: number;
  amenities: string[]; // e.g. ["Wifi", "Projector"]
}

// Define a Game Session
export interface GameSession {
  id: string;
  hostId: string;
  venueId: string;
  title: string;
  date: string;
  maxPlayers: number;
  currentPlayers: number;
  status: "open" | "playing" | "finished";
}