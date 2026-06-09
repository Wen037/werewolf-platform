
// ── Enums / Union types ────────────────────────────────────────────────────

export type VenueSpaceType = 'boardgame_store' | 'house' | 'work' | 'school' | 'other';
export type VenuePrivacy   = 'public' | 'approximate' | 'private';

export const VENUE_TYPE_LABELS: Record<VenueSpaceType, string> = {
  boardgame_store: 'Board Game Café',
  house:           'Home',
  work:            'Office / Co-work',
  school:          'School / Campus',
  other:           'Other',
};

// Default privacy per venue type — a sensible starting point for new listings
export const DEFAULT_PRIVACY: Record<VenueSpaceType, VenuePrivacy> = {
  boardgame_store: 'public',
  house:           'private',
  work:            'approximate',
  school:          'approximate',
  other:           'public',
};

// ── Core entities ──────────────────────────────────────────────────────────

// ── Credit rank system ─────────────────────────────────────────────────────
// creditScore default = 100. Earned by attending events (+1 each).
// Penalty: quit within 24 hr before event starts → -1.
// Rank boundaries: <100 Flagged | 100 Recruit | 110 Trusted | 120 Reliable | 130 Tactician | 140 Elite | 150 Grandmaster

export type CreditRank = 'Flagged' | 'Recruit' | 'Trusted' | 'Reliable' | 'Tactician' | 'Elite' | 'Grandmaster';

export interface CreditInfo {
  rank:        CreditRank;
  label:       string;   // display label
  color:       string;   // tailwind text-* class
  bgColor:     string;   // tailwind bg-*/border-* classes for badge
  borderClass: string;   // border-* class for the credit widget border
  barColor:    string;   // bg-* class for the progress bar fill
}

// DNF equipment grade color palette — low to high:
// grey → white → blue → green → purple → orange → gold → black-gold (admin)
export function getCreditInfo(score: number): CreditInfo {
  if (score < 100) return { rank: 'Flagged',     label: '⚠ Flagged',   color: 'text-slate-400',  bgColor: 'bg-slate-500/15 border-slate-500/30',    borderClass: 'border-slate-500/30',   barColor: 'bg-slate-400' };
  if (score < 110) return { rank: 'Recruit',     label: 'Recruit',     color: 'text-white',      bgColor: 'bg-white/10 border-white/20',            borderClass: 'border-white/25',       barColor: 'bg-white' };
  if (score < 120) return { rank: 'Trusted',     label: 'Trusted',     color: 'text-blue-400',   bgColor: 'bg-blue-500/15 border-blue-500/30',      borderClass: 'border-blue-500/40',    barColor: 'bg-blue-400' };
  if (score < 130) return { rank: 'Reliable',    label: 'Reliable',    color: 'text-green-400',  bgColor: 'bg-green-500/15 border-green-500/30',    borderClass: 'border-green-500/40',   barColor: 'bg-green-400' };
  if (score < 140) return { rank: 'Tactician',   label: 'Tactician',   color: 'text-purple-400', bgColor: 'bg-purple-500/15 border-purple-500/30',  borderClass: 'border-purple-500/40',  barColor: 'bg-purple-400' };
  if (score < 150) return { rank: 'Elite',       label: 'Elite',       color: 'text-pink-400',   bgColor: 'bg-pink-500/15 border-pink-500/30',      borderClass: 'border-pink-500/40',    barColor: 'bg-pink-400' };
  return             { rank: 'Grandmaster', label: 'Grandmaster', color: 'text-orange-400', bgColor: 'bg-orange-500/15 border-orange-400/30',   borderClass: 'border-orange-400/50',  barColor: 'bg-gradient-to-r from-orange-400 to-amber-300' };
}

/** Returns the Tailwind class for displaying a username based on role + credit. */
export function getUsernameColor(user: Pick<User, 'role' | 'creditScore'>): string {
  // web_admin: black-gold — bright gold with dark glow (DNF legendary grade)
  if (user.role === 'web_admin') return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.75)]';
  return getCreditInfo(user.creditScore ?? 100).color;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: 'player' | 'admin' | 'web_admin';
  isVerified: boolean;
  followersCount?: number;
  followingCount?: number;
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  bio?: string;
  contactNumber?: string;
  creditScore?: number;  // default 100; see getCreditInfo()
}

export interface GameVenue {
  id: string;
  name: string;
  address: string;
  // Privacy controls how the address is displayed publicly:
  // 'public' → full address; 'approximate' / 'private' → district area only
  privacy?: VenuePrivacy;
  area?: string;         // District label shown when privacy !== 'public' (e.g. "Yishun")
  description: string;
  imageUrl: string;
  images?: string[];
  wechatQrUrl?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  isVerified: boolean;
  pricePerHour: number;
  priceType?: 'per_person' | 'per_session';
  type?: VenueSpaceType;
  openingHours?: string;
  maxPax?: number;       // Venue's physical capacity (not per-session player cap)
  rules?: string;
  amenities: string[];
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
  ownerId?: string;
}

export type SocialGroupType = 'telegram' | 'whatsapp' | 'wechat' | 'facebook';

export interface GameSession {
  id: string;
  hostId: string;
  venueId: string;
  title: string;
  date: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'open' | 'playing' | 'finished';
  totalLikes: number;
  proficiency?: 'All Welcome' | 'Newbie' | 'Intermediate' | 'Advanced' | 'Expert';
  description?: string;
  waitlistCount?: number;
  minPax?: number;
  externalPax?: number;
  gameType?: string;
  judgeMethod?: string;
  hostName?: string;
  venueName?: string;
  // 'confirmed' when host === venue owner; 'pending' when awaiting owner approval
  venueApprovalStatus?: 'confirmed' | 'pending';
  // Non-registered attendees added by the host
  guests?: Array<{ name: string; addedBy: string; addedAt: string }>;
  // Social group link shared with registered players
  groupLink?: string;
  groupType?: SocialGroupType;
  // Who can join: open (anyone), approval (host must approve), invite_only (host invites)
  approvalMode?: 'open' | 'approval' | 'invite_only';
}

// ── Interaction / join-table records ──────────────────────────────────────

export interface VenueInteraction {
  userId: string;
  venueId: string;
  isLiked: boolean;
  isSubscribed: boolean;
  myRating?: number;
}

export interface SessionInteraction {
  userId: string;
  sessionId: string;
  // 'pending' = applied to join, awaiting host approval (approvalMode === 'approval')
  // 'waitlisted' = event full, placed on waitlist
  status: 'registered' | 'attended' | 'no-show' | 'cancelled' | 'pending' | 'waitlisted';
  waitlistPosition?: number;
  isLiked: boolean;
  myRating?: number;
  punctuality?: 'punctual' | 'late';
}

export interface UserSubscription {
  followerId: string;
  followingId: string;
  createdAt: string;
}

// ── DTOs (venue + session + user with auth context) ───────────────────────

export interface GameVenueDTO extends GameVenue {
  myInteraction?: VenueInteraction;
  // Count of event applications awaiting approval from the venue owner
  pendingApplicationsCount?: number;
}

export interface GameSessionDTO extends GameSession {
  myInteraction?: SessionInteraction;
  hostName?: string;
  venueName?: string;
  venueAddress?: string;
  pricePerHour?: number;
  joinedPlayerAvatars?: string[];
  venueImageUrl?: string;
}

export interface UserProfileDTO extends User {
  isFollowedByMe: boolean;
}

export interface FullUserProfileDTO extends User {
  pastEvents: GameSessionDTO[];
  followedUsers: User[];
  followedVenues: GameVenue[];
  likedGamesCount: number;
}

// ── Resource-level permission helpers (computed, never stored) ─────────────
//
// Authorization design:
//   Platform roles  : 'player' | 'admin'  (stored on User.role)
//   Resource owners : venue.ownerId === currentUser.id
//                     session.hostId === currentUser.id
//
// These interfaces describe what a specific user CAN do on a given resource.
// Compute them in components using helpers below — don't store them in state.

export interface VenuePermissions {
  canEdit:   boolean;  // owner only
  canVerify: boolean;  // admin only — marks venue as trusted/verified
  canDelete: boolean;  // owner or admin
}

export interface SessionPermissions {
  canManage:    boolean;  // host: open/close/cancel session
  canInvite:    boolean;  // host: send invites or add guests
  canKickPlayer: boolean; // host: remove a registered player
  canAddGuest:  boolean;  // host: add a non-registered attendee by name
  canJoin:      boolean;  // authenticated user who is not already a player/host
  canLeave:     boolean;  // current player who wants to drop out
}

export function getVenuePermissions(venue: GameVenue, currentUser: User | null): VenuePermissions {
  const isOwner = !!currentUser && venue.ownerId === currentUser.id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'web_admin';
  return {
    canEdit:   isOwner || isAdmin,
    canVerify: isAdmin,
    canDelete: isOwner || isAdmin,
  };
}

export function getSessionPermissions(
  session: GameSession,
  currentUser: User | null,
  isAlreadyPlayer: boolean,
): SessionPermissions {
  const isHost  = !!currentUser && session.hostId === currentUser.id;
  const canJoin = !!currentUser && !isHost && !isAlreadyPlayer && session.status === 'open';
  return {
    canManage:    isHost,
    canInvite:    isHost,
    canKickPlayer: isHost,
    canAddGuest:  isHost,
    canJoin,
    canLeave:     !!currentUser && isAlreadyPlayer && !isHost,
  };
}

// ── Display helpers ────────────────────────────────────────────────────────

/** Returns the address string that should be shown publicly for a venue. */
export function getDisplayAddress(venue: Pick<GameVenue, 'address' | 'privacy' | 'area'>): string {
  if (!venue.privacy || venue.privacy === 'public') return venue.address;
  return venue.area ? `${venue.area} area` : 'Location withheld';
}
