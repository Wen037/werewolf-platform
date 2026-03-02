
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: "player" | "admin";
  isVerified: boolean;
  followersCount?: number;
  followingCount?: number;
  skillLevel?: "Beginner" | "Intermediate" | "Advanced" | "Expert"; 
  bio?: string;
  contactNumber?: string;
}

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
  isVerified: boolean;
  pricePerHour: number;
  amenities: string[];
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
}

export interface GameSession {
  id: string;
  hostId: string;
  venueId: string;
  title: string;
  date: string;
  maxPlayers: number;
  currentPlayers: number;
  status: "open" | "playing" | "finished";
  // 公共统计数据
  totalLikes: number;
}

// ==========================================
// 2. 交互记录 (对应数据库关联表 Join Tables)
// ==========================================

// 用户 -> 场馆的交互 (User <-> Venue)
export interface VenueInteraction {
  userId: string;
  venueId: string;
  isLiked: boolean;       // 是否点赞
  isSubscribed: boolean;  // 是否订阅/关注该场馆
  myRating?: number;      // 我的评分 (0-5)
}

// 用户 -> 游戏的交互 (User <-> GameSession)
export interface SessionInteraction {
  userId: string;
  sessionId: string;
  status: "registered" | "attended" | "no-show" | "cancelled";
  isLiked: boolean;       // 是否点赞
  myRating?: number;      // 我的评分 (0-5)
  punctuality?: "punctual" | "late"; 
}

// 用户 -> 用户的交互 (User <-> User)
export interface UserSubscription {
  followerId: string;     // 谁点的关注 (我)
  followingId: string;    // 关注了谁 (大神)
  createdAt: string;
}

// ==========================================
// 3. 前端使用的 DTO (Data Transfer Objects)
// ==========================================

// 场馆 DTO: 包含场馆信息 + 我的交互状态
export interface GameVenueDTO extends GameVenue {
  myInteraction?: VenueInteraction; 
}

// 游戏 DTO: 包含游戏信息 + 我的交互状态
export interface GameSessionDTO extends GameSession {
  myInteraction?: SessionInteraction;
  // 为了方便前端展示，通常也会把 Host 和 Venue 的简略信息带回来
  hostName?: string;
  venueName?: string; 
}

// 用户资料 DTO: 包含用户信息 + 我是否关注了他
export interface UserProfileDTO extends User {
  isFollowedByMe: boolean; // Derived from UserSubscription table
}

export interface FullUserProfileDTO extends User {
  pastEvents: GameSessionDTO[];   
  followedUsers: User[];         
  followedVenues: GameVenue[];    
  likedGamesCount: number;        
}