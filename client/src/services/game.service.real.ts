import { api } from './api';
import type { GameSessionDTO, GameVenueDTO, FullUserProfileDTO, GameVenue } from '../types';

export const RealGameService = {
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

  updateVenue: (id: string, fields: Partial<GameVenue>): Promise<GameVenueDTO> =>
    api.patch(`/venues/${id}`, fields),

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

  updateProfile: (fields: {
    skillLevel?: string;
    bio?: string;
    contactNumber?: string;
    avatarUrl?: string;
  }): Promise<void> =>
    api.patch('/users/me', fields),

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
};
