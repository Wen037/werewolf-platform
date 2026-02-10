import type{ 
  User, 
  GameVenue, 
  GameSession, 
  VenueInteraction, 
  SessionInteraction, 
  UserSubscription 
} from "../types";

// ==========================================
// TABLE 1: USERS (15 Users)
// ==========================================
export const MOCK_USERS: User[] = [
  { 
    id: "u1", 
    username: "AlphaWolf", 
    email: "alpha@wolf.sg", 
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha",
    role: "player", 
    isVerified: true,
    followersCount: 128,
    followingCount: 45,
    skillLevel: "Expert",
    bio: "Logic is my weapon. Silence is my shield. Hunting wolves since 2018.",
    contactNumber: "+65 9123 4567"
  },
  { 
    id: "u2", 
    username: "SeerSally", 
    email: "sally@seer.sg", 
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sally",
    role: "player", 
    isVerified: true,
    followersCount: 3400,
    followingCount: 12,
    skillLevel: "Advanced",
    bio: "I always check the person to my right first."
  },
  { 
    id: "u3", 
    username: "NoobHunter", 
    email: "hunter@game.sg", 
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hunter",
    role: "player", 
    isVerified: false,
    followersCount: 42,
    followingCount: 100,
    skillLevel: "Beginner",
    bio: "Just here for the snacks and chaos."
  },
  { id: "u4", username: "WitchHazel", email: "hazel@magic.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hazel", role: "player", isVerified: true, skillLevel: "Intermediate", followersCount: 890, followingCount: 50 },
  { id: "u5", username: "VillagerBoi", email: "villager@plain.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob", role: "player", isVerified: false, skillLevel: "Beginner", followersCount: 12, followingCount: 5 },
  { id: "u6", username: "ChaosMaker", email: "chaos@theory.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chaos", role: "player", isVerified: false, skillLevel: "Advanced", followersCount: 230, followingCount: 67 },
  { id: "u7", username: "SilentBob", email: "bob@silent.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Silent", role: "player", isVerified: true, skillLevel: "Expert", followersCount: 560, followingCount: 10 },
  { id: "u8", username: "ModeratorMike", email: "mike@host.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", role: "admin", isVerified: true, skillLevel: "Expert", followersCount: 5000, followingCount: 0, bio: "Official judge for SG Werewolf League." },
  { id: "u9", username: "LunaLove", email: "luna@moon.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", role: "player", isVerified: false, skillLevel: "Intermediate", followersCount: 150, followingCount: 150 },
  { id: "u10", username: "RedHood", email: "red@forest.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Red", role: "player", isVerified: true, skillLevel: "Advanced", followersCount: 999, followingCount: 22 },
  { id: "u11", username: "BigBadWolf", email: "big@bad.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bad", role: "player", isVerified: false, skillLevel: "Beginner", followersCount: 5, followingCount: 2 },
  { id: "u12", username: "SherlockH", email: "holmes@deduce.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sherlock", role: "player", isVerified: true, skillLevel: "Expert", followersCount: 1200, followingCount: 30 },
  { id: "u13", username: "DoctorStrange", email: "doc@heal.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Doc", role: "player", isVerified: false, skillLevel: "Intermediate", followersCount: 88, followingCount: 40 },
  { id: "u14", username: "JesterJack", email: "jack@fool.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack", role: "player", isVerified: false, skillLevel: "Beginner", followersCount: 20, followingCount: 10 },
  { id: "u15", username: "QueenBee", email: "queen@hive.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Queen", role: "player", isVerified: true, skillLevel: "Advanced", followersCount: 3000, followingCount: 5 }
];

// ==========================================
// TABLE 2: VENUES (9 Locations in Singapore)
// ==========================================
export const MOCK_VENUES: GameVenue[] = [
  {
    id: "v1",
    name: "The Mind Café (Orchard)",
    address: "60A Prinsep Street, Singapore",
    description: "The classic central hub. High traffic, competitive games, and great coffee.",
    imageUrl: "https://images.unsplash.com/photo-1621360841013-c768371e93cf?q=80&w=1000&auto=format&fit=crop", 
    coordinates: { lat: 1.3005, lng: 103.8505 }, 
    pricePerHour: 12,
    amenities: ["Food", "Private Room", "Board Games", "WiFi"],
    averageRating: 4.8,
    totalLikes: 1240,
    totalSubscribers: 56
  },
  {
    id: "v2",
    name: "Battle Bunker (Bugis)",
    address: "201 Victoria St, Bugis+, Singapore",
    description: "Esports arena vibe. Noisy but energetic. Perfect for large groups.",
    imageUrl: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3013, lng: 103.8559 }, 
    pricePerHour: 10,
    amenities: ["Snacks", "Tournaments", "Aircon"],
    averageRating: 4.5,
    totalLikes: 890,
    totalSubscribers: 30
  },
  {
    id: "v3",
    name: "Play Nation (Jurong)",
    address: "2 Jurong East Central 1, JCube, Singapore",
    description: "West side stronghold. Cozy bean bags and relaxed atmosphere.",
    imageUrl: "https://images.unsplash.com/photo-1570701564993-e00652af8aa7?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3329, lng: 103.7436 }, 
    pricePerHour: 11,
    amenities: ["Console Games", "Drinks", "Student Discount"],
    averageRating: 4.2,
    totalLikes: 450,
    totalSubscribers: 12
  },
  {
    id: "v4",
    name: "Settlers Cafe (Serangoon)",
    address: "39A North Canal Rd, Singapore",
    description: "Vintage aesthetics with a huge collection of board games.",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3521, lng: 103.8198 }, // Approx Serangoon
    pricePerHour: 14,
    amenities: ["Alcohol", "Private Room", "Late Night"],
    averageRating: 4.6,
    totalLikes: 600,
    totalSubscribers: 45
  },
  {
    id: "v5",
    name: "King and the Pawn (City Hall)",
    address: "24 Purvis Street, Level 2, Singapore",
    description: "Bar and board game cafe. Excellent cocktails for night wolves.",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.2966, lng: 103.8550 },
    pricePerHour: 15,
    amenities: ["Cocktails", "Full Menu", "Date Night"],
    averageRating: 4.9,
    totalLikes: 1500,
    totalSubscribers: 120
  },
  {
    id: "v6",
    name: "Experience Point (Lavendar)",
    address: "803 King George's Ave, Singapore",
    description: "A hidden gem for hardcore strategy gamers.",
    imageUrl: "https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3075, lng: 103.8610 },
    pricePerHour: 8,
    amenities: ["Cheap", "Quiet", "Tabletop"],
    averageRating: 4.0,
    totalLikes: 200,
    totalSubscribers: 5
  },
  {
    id: "v7",
    name: "Team Board Game (Paya Lebar)",
    address: "11 Eunos Rd 8, Singapore",
    description: "Community driven space in the East.",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3195, lng: 103.8920 },
    pricePerHour: 9,
    amenities: ["Community Events", "Snacks"],
    averageRating: 4.3,
    totalLikes: 330,
    totalSubscribers: 20
  },
  {
    id: "v8",
    name: "Games Haven (Chinatown)",
    address: "736A Geylang Rd, Singapore",
    description: "Specializes in TCG but has great tables for social deduction.",
    imageUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.2843, lng: 103.8439 },
    pricePerHour: 10,
    amenities: ["Retail Shop", "Tournaments"],
    averageRating: 4.1,
    totalLikes: 250,
    totalSubscribers: 8
  },
  {
    id: "v9",
    name: "Wolf's Den (Yishun)",
    address: "925 Yishun Central 1, Singapore",
    description: "Enter at your own risk. Yishun's premier dedicated werewolf spot.",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.4299, lng: 103.8354 },
    pricePerHour: 6,
    amenities: ["Dark Room", "Costumes", "Sound Effects"],
    averageRating: 4.7,
    totalLikes: 2020,
    totalSubscribers: 300
  }
];

// ==========================================
// TABLE 3: GAMES (5 Sessions)
// ==========================================
export const MOCK_GAMES: GameSession[] = [
  // --- UPCOMING ---
  {
    id: "g1",
    hostId: "u2", // SeerSally
    venueId: "v1", // Mind Cafe
    title: "Friday Night Bloodbath",
    date: "2026-02-20T19:00:00Z", // Future
    maxPlayers: 12,
    currentPlayers: 11,
    status: "open",
    totalLikes: 45
  },
  {
    id: "g2",
    hostId: "u8", // Mod Mike
    venueId: "v5", // King and Pawn
    title: "SG League Qualifiers",
    date: "2026-02-22T14:00:00Z", // Future
    maxPlayers: 9,
    currentPlayers: 9,
    status: "open", // Full but open
    totalLikes: 120
  },
  // --- PAST ---
  {
    id: "g3",
    hostId: "u4", // WitchHazel
    venueId: "v9", // Wolf's Den
    title: "Yishun Chaos Night",
    date: "2026-02-05T20:00:00Z", // Past
    maxPlayers: 15,
    currentPlayers: 15,
    status: "finished",
    totalLikes: 200
  },
  {
    id: "g4",
    hostId: "u1", // Me
    venueId: "v3", // Play Nation
    title: "Beginner Friendly Game",
    date: "2026-01-28T18:00:00Z", // Past
    maxPlayers: 10,
    currentPlayers: 8,
    status: "finished",
    totalLikes: 30
  },
  {
    id: "g5",
    hostId: "u7", // SilentBob
    venueId: "v2", // Battle Bunker
    title: "Silent Mode: No Talking",
    date: "2026-01-15T19:30:00Z", // Past
    maxPlayers: 12,
    currentPlayers: 12,
    status: "finished",
    totalLikes: 85
  }
];

// ==========================================
// TABLE 4: VENUE INTERACTIONS (u1's view)
// ==========================================
export const MOCK_VENUE_INTERACTIONS: VenueInteraction[] = [
  { userId: "u1", venueId: "v1", isLiked: true, isSubscribed: true, myRating: 5 },
  { userId: "u1", venueId: "v5", isLiked: true, isSubscribed: true, myRating: 4 },
  { userId: "u1", venueId: "v9", isLiked: false, isSubscribed: false, myRating: 3 },
  { userId: "u1", venueId: "v2", isLiked: true, isSubscribed: false }, // Liked but not subbed
];

// ==========================================
// TABLE 5: SESSION INTERACTIONS (u1's view)
// ==========================================
export const MOCK_SESSION_INTERACTIONS: SessionInteraction[] = [
  // Joined Upcoming
  { userId: "u1", sessionId: "g1", status: "registered", isLiked: true },
  
  // Attended Past
  { userId: "u1", sessionId: "g3", status: "attended", isLiked: true, myRating: 5, result: "win" }, // Yishun Chaos
  { userId: "u1", sessionId: "g4", status: "attended", isLiked: false, myRating: 4, result: "loss" }, // My own game
  { userId: "u1", sessionId: "g5", status: "attended", isLiked: true, myRating: 5, result: "win" }  // Silent Mode
];

// ==========================================
// TABLE 6: USER SUBSCRIPTIONS (u1's follows)
// ==========================================
export const MOCK_USER_SUBSCRIPTIONS: UserSubscription[] = [
  { followerId: "u1", followingId: "u2", createdAt: "2026-01-15T10:00:00Z" }, // Following SeerSally
  { followerId: "u1", followingId: "u8", createdAt: "2026-01-20T10:00:00Z" }, // Following Mod Mike
  { followerId: "u1", followingId: "u15", createdAt: "2026-02-01T10:00:00Z" }, // Following QueenBee
];