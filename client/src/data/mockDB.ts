import type {
  User,
  GameVenue,
  GameSession,
  VenueInteraction,
  SessionInteraction,
  UserSubscription,
} from "../types";

// ==========================================
// TABLE 1: USERS
// creditScore default = 100. Ranks: <100 Flagged | 100 Recruit | 110 Trusted | 120 Reliable | 130 Tactician | 140 Elite | 150 Grandmaster
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
    contactNumber: "+65 9123 4567",
    creditScore: 152,
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
    bio: "I always check the person to my right first.",
    creditScore: 138,
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
    bio: "Just here for the snacks and chaos.",
    creditScore: 100,
  },
  { id: "u4", username: "WitchHazel", email: "hazel@magic.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hazel", role: "player", isVerified: true, skillLevel: "Intermediate", followersCount: 890, followingCount: 50, creditScore: 115 },
  { id: "u5", username: "VillagerBoi", email: "villager@plain.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob", role: "player", isVerified: false, skillLevel: "Beginner", followersCount: 12, followingCount: 5, creditScore: 100 },
  { id: "u6", username: "ChaosMaker", email: "chaos@theory.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chaos", role: "player", isVerified: false, skillLevel: "Advanced", followersCount: 230, followingCount: 67, creditScore: 128 },
  { id: "u7", username: "SilentBob", email: "bob@silent.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Silent", role: "player", isVerified: true, skillLevel: "Expert", followersCount: 560, followingCount: 10, creditScore: 144 },
  { id: "u8", username: "ModeratorMike", email: "mike@host.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", role: "admin", isVerified: true, skillLevel: "Expert", followersCount: 5000, followingCount: 0, bio: "Official judge for SG Werewolf League.", creditScore: 200 },
  { id: "u9", username: "LunaLove", email: "luna@moon.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", role: "player", isVerified: false, skillLevel: "Intermediate", followersCount: 150, followingCount: 150, creditScore: 112 },
  { id: "u10", username: "RedHood", email: "red@forest.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Red", role: "player", isVerified: true, skillLevel: "Advanced", followersCount: 999, followingCount: 22, creditScore: 131 },
  { id: "u11", username: "BigBadWolf", email: "big@bad.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bad", role: "player", isVerified: false, skillLevel: "Beginner", followersCount: 5, followingCount: 2, creditScore: 100 },
  { id: "u12", username: "SherlockH", email: "holmes@deduce.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sherlock", role: "player", isVerified: true, skillLevel: "Expert", followersCount: 1200, followingCount: 30, creditScore: 156 },
  { id: "u13", username: "DoctorStrange", email: "doc@heal.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Doc", role: "player", isVerified: false, skillLevel: "Intermediate", followersCount: 88, followingCount: 40, creditScore: 108 },
  // ⚠ JesterJack has low credit — shows as Flagged (red) to warn hosts
  { id: "u14", username: "JesterJack", email: "jack@fool.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack", role: "player", isVerified: false, skillLevel: "Beginner", followersCount: 20, followingCount: 10, creditScore: 96 },
  { id: "u15", username: "QueenBee", email: "queen@hive.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Queen", role: "player", isVerified: true, skillLevel: "Advanced", followersCount: 3000, followingCount: 5, creditScore: 148 },
  // ── DEBUG ACCOUNTS ─────────────────────────────────────────────────────────
  { id: "u16", username: "WolfDenOwner", email: "owner@wolfsden.sg", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=WolfDenOwner", role: "player", isVerified: true, skillLevel: "Intermediate", followersCount: 80, followingCount: 12, bio: "Owner of Wolf's Den — Yishun's dedicated werewolf venue.", contactNumber: "+65 9888 7766", creditScore: 120 },
  // u17 = platform web admin (Wen037) — gold name, full admin powers
  { id: "u17", username: "Wen037", email: "e1062715@u.nus.edu", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wen037", role: "web_admin", isVerified: true, skillLevel: "Expert", followersCount: 0, followingCount: 0, bio: "Platform administrator.", creditScore: 999 },
];

// ==========================================
// TABLE 2: VENUES (9 Locations in Singapore)
// ==========================================
export const MOCK_VENUES: GameVenue[] = [
  {
    id: "v1", ownerId: "u2",
    name: "The Mind Café (Orchard)",
    address: "60A Prinsep Street, Singapore",
    area: "Orchard", privacy: "public", type: "boardgame_store",
    description: "The classic central hub. High traffic, competitive games, and great coffee.",
    imageUrl: "https://images.unsplash.com/photo-1621360841013-c768371e93cf?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3005, lng: 103.8505 },
    pricePerHour: 12, priceType: "per_person",
    openingHours: "Mon–Sun 11am–11pm", maxPax: 30,
    amenities: ["Food", "Private Room", "Board Games", "WiFi"],
    rules: "No outside food. Reservations recommended for groups of 6+.",
    averageRating: 4.8, totalLikes: 1240, isVerified: true, totalSubscribers: 56
  },
  {
    id: "v2", ownerId: "u6",
    name: "Battle Bunker (Bugis)",
    address: "201 Victoria St, Bugis+, Singapore",
    area: "Bugis", privacy: "public", type: "boardgame_store",
    description: "Esports arena vibe. Noisy but energetic. Perfect for large groups.",
    imageUrl: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3013, lng: 103.8559 },
    pricePerHour: 10, priceType: "per_session",
    openingHours: "Mon–Sun 12pm–12am", maxPax: 40,
    amenities: ["Snacks", "Tournaments", "Aircon"],
    averageRating: 4.5, totalLikes: 890, isVerified: false, totalSubscribers: 30
  },
  {
    id: "v3", ownerId: "u7",
    name: "Play Nation (Jurong)",
    address: "2 Jurong East Central 1, JCube, Singapore",
    area: "Jurong East", privacy: "public", type: "boardgame_store",
    description: "West side stronghold. Cozy bean bags and relaxed atmosphere.",
    imageUrl: "https://images.unsplash.com/photo-1570701564993-e00652af8aa7?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3329, lng: 103.7436 },
    pricePerHour: 11, priceType: "per_person",
    openingHours: "Mon–Sun 11am–10pm", maxPax: 25,
    amenities: ["Console Games", "Drinks", "Student Discount"],
    averageRating: 4.2, totalLikes: 450, isVerified: true, totalSubscribers: 12
  },
  {
    id: "v4", ownerId: "u4",
    name: "Settlers Cafe (Serangoon)",
    address: "39A North Canal Rd, Singapore",
    area: "Serangoon", privacy: "public", type: "boardgame_store",
    description: "Vintage aesthetics with a huge collection of board games.",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3521, lng: 103.8198 },
    pricePerHour: 14, priceType: "per_person",
    openingHours: "Mon–Sun 1pm–1am", maxPax: 35,
    amenities: ["Alcohol", "Private Room", "Late Night"],
    averageRating: 4.6, totalLikes: 600, isVerified: true, totalSubscribers: 45
  },
  {
    id: "v5", ownerId: "u10",
    name: "King and the Pawn (City Hall)",
    address: "24 Purvis Street, Level 2, Singapore",
    area: "City Hall", privacy: "public", type: "boardgame_store",
    description: "Bar and board game cafe. Excellent cocktails for night wolves.",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.2966, lng: 103.8550 },
    pricePerHour: 15, priceType: "per_person",
    openingHours: "Mon–Sun 5pm–2am", maxPax: 20,
    amenities: ["Cocktails", "Full Menu", "Date Night"],
    averageRating: 4.9, totalLikes: 1500, isVerified: false, totalSubscribers: 120
  },
  {
    id: "v6", ownerId: "u12",
    name: "Experience Point (Lavender)",
    address: "803 King George's Ave, Singapore",
    area: "Lavender", privacy: "public", type: "boardgame_store",
    description: "A hidden gem for hardcore strategy gamers.",
    imageUrl: "https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3075, lng: 103.8610 },
    pricePerHour: 8, priceType: "per_person",
    openingHours: "Wed–Sun 2pm–11pm", maxPax: 15,
    amenities: ["Cheap", "Quiet", "Tabletop"],
    averageRating: 4.0, totalLikes: 200, isVerified: true, totalSubscribers: 5
  },
  {
    id: "v7", ownerId: "u8",
    name: "Team Board Game (Paya Lebar)",
    address: "11 Eunos Rd 8, Singapore",
    area: "Paya Lebar", privacy: "public", type: "other",
    description: "Community driven space in the East.",
    imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.3195, lng: 103.8920 },
    pricePerHour: 9, priceType: "per_session",
    openingHours: "Weekends 10am–8pm", maxPax: 25,
    amenities: ["Community Events", "Snacks"],
    averageRating: 4.3, totalLikes: 330, isVerified: false, totalSubscribers: 20
  },
  {
    id: "v8", ownerId: "u15",
    name: "Games Haven (Chinatown)",
    address: "736A Geylang Rd, Singapore",
    area: "Chinatown", privacy: "public", type: "boardgame_store",
    description: "Specializes in TCG but has great tables for social deduction.",
    imageUrl: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.2843, lng: 103.8439 },
    pricePerHour: 10, priceType: "per_session",
    openingHours: "Mon–Sun 12pm–10pm", maxPax: 20,
    amenities: ["Retail Shop", "Tournaments"],
    averageRating: 4.1, totalLikes: 250, isVerified: false, totalSubscribers: 8
  },
  {
    // Home venue — address is withheld from public; only district is shown.
    // To test owner editing: set CURRENT_USER_ID = "u16" in game.service.mock.ts
    id: "v9", ownerId: "u16",
    name: "Wolf's Den (Yishun)",
    address: "925 Yishun Central 1, Singapore",  // kept private
    area: "Yishun", privacy: "private", type: "house",
    description: "Enter at your own risk. Yishun's premier dedicated werewolf spot. Contact owner to get the exact address after joining a session.",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop",
    coordinates: { lat: 1.4299, lng: 103.8354 },
    pricePerHour: 0, priceType: "per_session",
    openingHours: "Fri–Sun 6pm–2am", maxPax: 20,
    rules: "No spectators during active games. Respect the host's ruling at all times. Do not share the address publicly.",
    amenities: ["Dark Room", "Costumes", "Sound Effects"],
    averageRating: 4.7, isVerified: false, totalLikes: 2020, totalSubscribers: 300
  }
];

// ==========================================
// TABLE 3: GAMES
// ==========================================
export const MOCK_GAMES: GameSession[] = [
  // --- UPCOMING ---
  {
    id: "g1",
    hostId: "u2", // SeerSally — hosts her own venue (v1.ownerId = u2) → confirmed
    venueId: "v1", // Mind Cafe
    title: "Friday Night Bloodbath",
    date: "2026-05-09T19:00:00+08:00",
    maxPlayers: 12,
    currentPlayers: 11,
    status: "open",
    totalLikes: 45,
    proficiency: "Advanced",
    venueApprovalStatus: "confirmed",
    description: "Bring your A-game. No mercy for new players. Strict no-phone rule enforced.",
    groupLink: "https://t.me/+friday_bloodbath_sg",
    groupType: "telegram",
  },
  {
    id: "g2",
    hostId: "u8", // ModeratorMike — v5.ownerId = u10 → pending
    venueId: "v5", // King and Pawn
    title: "SG League Qualifiers",
    date: "2026-05-15T14:00:00+08:00",
    maxPlayers: 9,
    currentPlayers: 9,
    status: "open",
    totalLikes: 120,
    proficiency: "Advanced",
    venueApprovalStatus: "pending",
    description: "Official SG League qualifier round. Strict rules apply. Results count toward rankings."
  },
  {
    id: "g6",
    hostId: "u10", // RedHood — v2.ownerId = u6 → pending
    venueId: "v2", // Battle Bunker
    title: "Bugis Brawl Night",
    date: "2026-05-08T20:00:00+08:00",
    maxPlayers: 15,
    currentPlayers: 6,
    status: "open",
    totalLikes: 38,
    proficiency: "All Welcome",
    venueApprovalStatus: "pending",
    description: "Energetic open session at Battle Bunker. Newcomers welcome — experienced players encouraged to mentor."
  },
  {
    id: "g7",
    hostId: "u4", // WitchHazel — v9.ownerId = u16 → pending
    venueId: "v9", // Wolf's Den
    title: "Full Moon Ritual",
    date: "2026-05-21T21:00:00+08:00",
    maxPlayers: 15,
    currentPlayers: 9,
    status: "open",
    totalLikes: 77,
    proficiency: "Intermediate",
    venueApprovalStatus: "pending",
    description: "Moonlit ritual game at Wolf's Den. Costumes strongly encouraged. Full immersion format."
  },
  {
    id: "g8",
    hostId: "u12", // SherlockH — v1.ownerId = u2 → pending
    venueId: "v1", // Mind Cafe
    title: "Deduction Masters Vol.3",
    date: "2026-06-01T15:00:00+08:00",
    maxPlayers: 10,
    currentPlayers: 3,
    status: "open",
    totalLikes: 22,
    proficiency: "Expert",
    venueApprovalStatus: "pending",
    description: "High-level deduction only. Apply logic or go home. Third instalment of the Deduction Masters series."
  },
  {
    id: "g9",
    hostId: "u15", // QueenBee — v4.ownerId = u4 → pending
    venueId: "v4", // Settlers Cafe
    title: "Vintage Wolves Night",
    date: "2026-05-18T18:30:00+08:00",
    maxPlayers: 12,
    currentPlayers: 7,
    status: "open",
    venueApprovalStatus: "pending",
    totalLikes: 55,
    proficiency: "All Welcome",
    description: "Relaxed vintage evening with cocktails at Settlers. Casual pace, great vibes."
  },
  // --- PAST ---
  {
    id: "g3",
    hostId: "u4", // WitchHazel
    venueId: "v9", // Wolf's Den
    title: "Yishun Chaos Night",
    date: "2026-04-05T20:00:00+08:00",
    maxPlayers: 15,
    currentPlayers: 15,
    status: "finished",
    totalLikes: 200,
    proficiency: "Intermediate",
    description: "Chaotic Yishun session — anything goes. Sound effects, costumes, and maximum drama."
  },
  {
    id: "g4",
    hostId: "u1", // AlphaWolf
    venueId: "v3", // Play Nation
    title: "Beginner Friendly Game",
    date: "2026-03-28T18:00:00+08:00",
    maxPlayers: 10,
    currentPlayers: 8,
    status: "finished",
    totalLikes: 30,
    proficiency: "Newbie",
    description: "Soft intro game for first-timers. Rules explained thoroughly. No judgment zone."
  },
  {
    id: "g5",
    hostId: "u7", // SilentBob
    venueId: "v2", // Battle Bunker
    title: "Silent Mode: No Talking",
    date: "2026-03-15T19:30:00+08:00",
    maxPlayers: 12,
    currentPlayers: 12,
    status: "finished",
    totalLikes: 85,
    proficiency: "Advanced",
    description: "No verbal communication allowed. Cards and gestures only. SilentBob's signature format."
  },
  {
    id: "g10",
    hostId: "u1", // AlphaWolf
    venueId: "v1", // Mind Cafe
    title: "Midnight Logic Duel",
    date: "2026-04-12T20:00:00+08:00",
    maxPlayers: 12,
    currentPlayers: 10,
    status: "finished",
    totalLikes: 61,
    proficiency: "Expert",
    description: "Logic duel format — short fast rounds, elimination style. Only the sharpest survive."
  },
  {
    id: "g11",
    hostId: "u6", // ChaosMaker
    venueId: "v5", // King and Pawn
    title: "Cocktails & Conspiracies",
    date: "2026-04-01T19:00:00+08:00",
    maxPlayers: 10,
    currentPlayers: 10,
    status: "finished",
    totalLikes: 143,
    proficiency: "All Welcome",
    description: "Cocktails mandatory. Deception encouraged. ChaosMaker's infamous April night."
  },
  {
    id: "g12",
    hostId: "u7", // SilentBob
    venueId: "v9", // Wolf's Den
    title: "The Silent Hunt",
    date: "2026-04-19T21:30:00+08:00",
    maxPlayers: 12,
    currentPlayers: 11,
    status: "finished",
    totalLikes: 99,
    proficiency: "Intermediate",
    description: "SilentBob's signature silent hunt format. Communication via written notes only."
  },
  // g13: AlphaWolf's own hosted upcoming event (for host control panel testing)
  {
    id: "g13",
    hostId: "u1",
    venueId: "v6", // Experience Point
    title: "AlphaWolf's Logic Duel",
    date: "2026-05-16T20:00:00+08:00",
    maxPlayers: 10,
    currentPlayers: 4,  // only 4 registered (u4, u7, u12, u15); u3 & u5 are pending approval
    status: "open",
    totalLikes: 12,
    proficiency: "Expert",
    venueApprovalStatus: "pending",
    waitlistCount: 0,
    description: "High-level session. Approval required to join. Expect brutal deduction and zero mercy.",
    approvalMode: "approval",  // changed from invite_only — default mode per UX requirement
    guests: [],
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
// TABLE 5: SESSION INTERACTIONS
// Covers u1's own events + roster entries for all sessions
// ==========================================
export const MOCK_SESSION_INTERACTIONS: SessionInteraction[] = [
  // ── u1 (AlphaWolf) own interactions ───────────────────────────────────────
  { userId: "u1", sessionId: "g1", status: "registered", isLiked: true },
  { userId: "u1", sessionId: "g3", status: "attended", isLiked: true, myRating: 5, punctuality: "late" },
  { userId: "u1", sessionId: "g4", status: "attended", isLiked: false, myRating: 4, punctuality: "punctual" },
  { userId: "u1", sessionId: "g5", status: "attended", isLiked: true, myRating: 5, punctuality: "punctual" },

  // ── g1 roster (SeerSally's Friday Night Bloodbath) ─────────────────────────
  { userId: "u4",  sessionId: "g1", status: "registered", isLiked: false },
  { userId: "u6",  sessionId: "g1", status: "registered", isLiked: true  },
  { userId: "u9",  sessionId: "g1", status: "registered", isLiked: false },
  { userId: "u10", sessionId: "g1", status: "registered", isLiked: true  },
  { userId: "u14", sessionId: "g1", status: "registered", isLiked: false }, // JesterJack — flagged
  { userId: "u7",  sessionId: "g1", status: "registered", isLiked: false },

  // ── g6 roster (RedHood's Bugis Brawl Night) ────────────────────────────────
  { userId: "u3",  sessionId: "g6", status: "registered", isLiked: false },
  { userId: "u5",  sessionId: "g6", status: "registered", isLiked: false },
  { userId: "u11", sessionId: "g6", status: "registered", isLiked: false },
  { userId: "u13", sessionId: "g6", status: "registered", isLiked: false },
  { userId: "u15", sessionId: "g6", status: "registered", isLiked: true  },

  // ── g13 roster (AlphaWolf's Logic Duel — hosted by u1) ────────────────────
  { userId: "u4",  sessionId: "g13", status: "registered", isLiked: true  },
  { userId: "u7",  sessionId: "g13", status: "registered", isLiked: true  },
  { userId: "u12", sessionId: "g13", status: "registered", isLiked: false },
  { userId: "u15", sessionId: "g13", status: "registered", isLiked: true  },
  // Pending applicants — waiting for host to approve
  { userId: "u3",  sessionId: "g13", status: "pending", isLiked: false },
  { userId: "u5",  sessionId: "g13", status: "pending", isLiked: false },
];

// ==========================================
// TABLE 6: USER SUBSCRIPTIONS (u1's follows)
// ==========================================
export const MOCK_USER_SUBSCRIPTIONS: UserSubscription[] = [
  { followerId: "u1", followingId: "u2", createdAt: "2026-01-15T10:00:00Z" }, // Following SeerSally
  { followerId: "u1", followingId: "u8", createdAt: "2026-01-20T10:00:00Z" }, // Following Mod Mike
  { followerId: "u1", followingId: "u15", createdAt: "2026-02-01T10:00:00Z" }, // Following QueenBee
];