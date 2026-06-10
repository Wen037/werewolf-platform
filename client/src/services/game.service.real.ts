import { api } from './api';
import type { EventComment, GameSessionDTO, GameVenueDTO, FullUserProfileDTO, GameVenue, UserProfileDTO } from '../types';

/**
 * The frontend's `GameVenue` shape uses `pricePerHour`/`priceType` (matching the
 * read DTO), but the backend's `UpdatePlayerSpaceSchema` expects the underlying
 * `financials` fields: `is_chargeable` / `approx_fee` / `price_type`. Without this
 * translation, `pricePerHour`/`priceType` are silently stripped by Zod validation
 * and price edits never persist (venue keeps showing "Free").
 */
function toUpdateVenuePayload(fields: Partial<GameVenue>): Record<string, unknown> {
  const { pricePerHour, priceType, ...rest } = fields;
  const payload: Record<string, unknown> = { ...rest };
  if (pricePerHour !== undefined) {
    payload['is_chargeable'] = pricePerHour > 0;
    payload['approx_fee'] = pricePerHour;
  }
  if (priceType !== undefined) {
    payload['price_type'] = priceType;
  }
  return payload;
}

// Frontend proficiency labels -> backend `proficiency_required` (0 = open to all)
const PROFICIENCY_LABEL_TO_LEVEL: Record<string, number> = {
  'All Welcome': 0,
  'Newbie': 1,
  'Intermediate': 2,
  'Advanced': 3,
  'Expert': 4,
};

export interface CreateSessionInput {
  venueId: string;
  title: string;
  /** ISO 8601 datetime string */
  scheduledAt: string;
  maxPlayers: number;
  minPlayers?: number;
  proficiency?: string;
  description?: string;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
}

/**
 * Translates the Create Event form's frontend-shaped fields into the backend's
 * `CreateMatchSchema` (snake_case `venue_id`/`min_pax`/`max_pax`/`proficiency_required`).
 * Mirrors the `toUpdateVenuePayload` pattern above — keeps the field-name mismatch
 * contained at the API boundary instead of leaking snake_case into the UI layer.
 */
function toCreateSessionPayload(input: CreateSessionInput): Record<string, unknown> {
  const maxPax = input.maxPlayers;
  const minPax = Math.min(input.minPlayers ?? 4, maxPax);
  const payload: Record<string, unknown> = {
    venue_id: input.venueId,
    title: input.title,
    scheduledAt: input.scheduledAt,
    min_pax: minPax,
    max_pax: maxPax,
  };
  if (input.proficiency !== undefined) {
    payload['proficiency_required'] = PROFICIENCY_LABEL_TO_LEVEL[input.proficiency] ?? 0;
  }
  if (input.description !== undefined && input.description.trim() !== '') {
    payload['description'] = input.description.trim();
  }
  if (input.recurrence !== undefined) {
    payload['recurrence'] = input.recurrence;
  }
  return payload;
}

export const RealGameService = {
  // ── Create ────────────────────────────────────────────────────────────────

  createSession: (input: CreateSessionInput): Promise<GameSessionDTO> =>
    api.post('/games', toCreateSessionPayload(input)),

  // ── Venues ────────────────────────────────────────────────────────────────

  getAllVenues: (): Promise<GameVenueDTO[]> =>
    api.get('/venues'),

  getVenueById: (id: string): Promise<GameVenueDTO> =>
    api.get(`/venues/${id}`),

  likeVenue: (id: string): Promise<{ isLiked: boolean }> =>
    api.post(`/venues/${id}/like`, {}),

  subscribeVenue: (id: string): Promise<{ isSubscribed: boolean }> =>
    api.post(`/venues/${id}/subscribe`, {}),

  rateVenue: (id: string, rating: number): Promise<void> =>
    api.post(`/venues/${id}/rate`, { rating }),

  bookingInquiry: (
    id: string,
    payload: { date: string; time: string; duration: string; pax: number; name: string; contact: string; notes?: string }
  ): Promise<{ autoConfirmed: boolean }> =>
    api.post(`/venues/${id}/booking-inquiry`, payload),

  leaveOwnerMessage: (venueId: string, message: string): Promise<void> =>
    api.post(`/venues/${venueId}/owner-message`, { message }),

  updateVenue: (id: string, fields: Partial<GameVenue>): Promise<GameVenueDTO> =>
    api.patch(`/venues/${id}`, toUpdateVenuePayload(fields)),

  getSessionsByVenue: (venueId: string): Promise<GameSessionDTO[]> =>
    api.get(`/venues/${venueId}/sessions`),

  // ── Games ─────────────────────────────────────────────────────────────────

  getActiveGames: (): Promise<GameSessionDTO[]> =>
    api.get('/games/active'),

  getGameById: (sessionId: string): Promise<GameSessionDTO> =>
    api.get(`/games/${sessionId}`),

  getMyEvents: (): Promise<GameSessionDTO[]> =>
    api.get('/users/me/events'),

  joinGame: (id: string): Promise<{ wasWaitlisted: boolean; waitlistPosition?: number }> =>
    api.post(`/games/${id}/join`, {}),

  leaveGame: (id: string): Promise<{ message: string }> =>
    api.delete(`/games/${id}/leave`),

  likeGame: (id: string): Promise<{ isLiked: boolean }> =>
    api.post(`/games/${id}/like`, {}),

  rateGame: (sessionId: string, rating: number): Promise<void> =>
    api.post(`/games/${sessionId}/rate`, { rating }),

  // ── Users / Profile ───────────────────────────────────────────────────────

  getMyFullProfile: (): Promise<FullUserProfileDTO> =>
    api.get('/users/me'),

  getPublicProfile: (userId: string): Promise<UserProfileDTO> =>
    api.get(`/users/${userId}`),

  updateProfile: (fields: {
    username?: string;
    skillLevel?: string;
    bio?: string;
    contactNumber?: string;
    avatarUrl?: string;
  }): Promise<void> =>
    api.patch('/users/me', fields),

  updateUsername: (username: string): Promise<void> =>
    api.patch('/users/me', { username }),

  updateSkillLevel: (skillLevel: string): Promise<void> =>
    api.patch('/users/me', { skillLevel }),

  updateBio: (bio: string): Promise<void> =>
    api.patch('/users/me', { bio }),

  followUser: (userId: string): Promise<{ message: string }> =>
    api.post(`/users/${userId}/follow`, {}),

  unfollowUser: (userId: string): Promise<{ message: string }> =>
    api.delete(`/users/${userId}/follow`),

  // Admin only
  adjustCredit: (userId: string, delta: number): Promise<{ userId: string; creditScore: number }> =>
    api.patch(`/admin/users/${userId}/credit`, { delta }),

  // ── Host control ──────────────────────────────────────────────────────────

  getSessionRoster: async (sessionId: string) => {
    // Backend returns { roster: [...], pending: [...], guests: [...] }
    // Frontend RosterTab expects RosterEntry[] = { user, interaction }[]
    const raw = await api.get(`/games/${sessionId}/roster`);
    type RawItem = {
      userId: string; username: string; avatarUrl?: string;
      creditScore?: number; role?: string; interactionStatus: string;
      punctuality?: string; isWaitlisted?: boolean; waitlistPosition?: number;
    };
    const toEntry = (item: RawItem) => ({
      user: { id: item.userId, username: item.username, avatarUrl: item.avatarUrl ?? '', creditScore: item.creditScore ?? 100, role: item.role ?? 'player', email: '', bio: '' },
      interaction: { userId: item.userId, sessionId, status: item.interactionStatus, isLiked: false, waitlistPosition: item.waitlistPosition, punctuality: item.punctuality },
    });
    const combined: ReturnType<typeof toEntry>[] = [
      ...((raw as { roster?: RawItem[] }).roster ?? []).map(toEntry),
      ...((raw as { pending?: RawItem[] }).pending ?? []).map(toEntry),
    ];
    return combined;
  },

  kickPlayer: (sessionId: string, userId: string) =>
    api.delete(`/games/${sessionId}/players/${userId}`),

  addGuest: (sessionId: string, name: string) =>
    api.post(`/games/${sessionId}/guests`, { name }),

  removeGuest: (sessionId: string, index: number) =>
    api.delete(`/games/${sessionId}/guests/${index}`),

  updateSessionStatus: (sessionId: string, status: string) =>
    api.patch(`/games/${sessionId}/status`, { status }),

  markAttendance: (sessionId: string, records: { userId: string; status: string }[]) =>
    api.patch(`/games/${sessionId}/attendance`, { records }),

  cancelSession: (sessionId: string) =>
    api.patch(`/games/${sessionId}/status`, { status: "cancelled" }),

  updateSession: (sessionId: string, fields: object) =>
    api.patch(`/games/${sessionId}`, fields),

  notifyPlayers: (sessionId: string, message: string) =>
    api.post(`/games/${sessionId}/notify`, { message }),

  updateApprovalMode: (sessionId: string, mode: string) =>
    api.patch(`/games/${sessionId}`, { approvalMode: mode }),

  sendMessageToPlayer: (sessionId: string, userId: string, message: string) =>
    api.post(`/games/${sessionId}/message`, { userId, message }),

  // ── Applicant approval (approvalMode === 'approval') ─────────────────────

  approveApplicant: (sessionId: string, userId: string) =>
    api.patch(`/games/${sessionId}/applicants/${userId}/approve`, {}),

  rejectApplicant: (sessionId: string, userId: string) =>
    api.patch(`/games/${sessionId}/applicants/${userId}/reject`, {}),

  // ── Admin pin ─────────────────────────────────────────────────────────────

  pinVenue: (id: string): Promise<{ isPinned: boolean }> =>
    api.patch(`/admin/venues/${id}/pin`, {}),

  pinGame: (sessionId: string): Promise<{ isPinned: boolean }> =>
    api.patch(`/admin/games/${sessionId}/pin`, {}),

  // ── Comments ──────────────────────────────────────────────────────────────

  getComments: (sessionId: string): Promise<EventComment[]> =>
    api.get(`/games/${sessionId}/comments`),

  addComment: (sessionId: string, text: string): Promise<EventComment> =>
    api.post(`/games/${sessionId}/comments`, { text }),

  deleteComment: (sessionId: string, commentId: string): Promise<void> =>
    api.delete(`/games/${sessionId}/comments/${commentId}`),

  // ── Post-event recap ──────────────────────────────────────────────────────

  updateRecap: (sessionId: string, text: string): Promise<void> =>
    api.patch(`/games/${sessionId}/recap`, { text }),
};
