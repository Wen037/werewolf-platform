import { z } from 'zod';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const CreateMatchSchema = z.object({
  venue_id: z.string().length(24, 'Invalid venue ID'),
  title: z.string().min(3).max(80),
  scheduledAt: z.string().datetime({ message: 'Must be a valid ISO datetime' }),
  min_pax: z.number().int().min(2).max(50),
  max_pax: z.number().int().min(2).max(50),
  game_type: z.string().max(50).optional(),
  judge_method: z.string().max(50).optional(),
  proficiency_required: z.number().int().min(0).max(4).optional(),
  approvalMode: z.enum(['open', 'approval', 'invite_only']).optional(),
}).refine(data => data.max_pax >= data.min_pax, {
  message: 'max_pax must be >= min_pax',
  path: ['max_pax'],
});

export const RateMatchSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['Open', 'Started', 'Completed', 'Cancelled']),
});

export const ExternalPaxSchema = z.object({
  count: z.number().int().min(0).max(50),
});

export const InviteUsersSchema = z.object({
  userIds: z.array(z.string().length(24)).min(1).max(20),
});

export const LogAttendanceSchema = z.object({
  attendees: z.array(z.object({
    userId: z.string().length(24),
    status: z.enum(['attended', 'no-show']),
    punctuality: z.enum(['punctual', 'late']).optional(),
  })).min(1),
});

export const AddGuestSchema = z.object({
  name: z.string().min(1).max(60),
});

export const MessagePlayerSchema = z.object({
  userId: z.string().length(24),
  message: z.string().min(1).max(500),
});

export const NotifyAllSchema = z.object({
  message: z.string().min(1).max(500),
});

export const UpdateSessionSchema = z.object({
  title: z.string().min(3).max(80).optional(),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  max_pax: z.number().int().min(2).max(50).optional(),
  min_pax: z.number().int().min(2).max(50).optional(),
  proficiency_required: z.number().int().min(0).max(4).optional(),
  game_type: z.string().max(50).optional(),
  judge_method: z.string().max(50).optional(),
  approvalMode: z.enum(['open', 'approval', 'invite_only']).optional(),
  groupLink: z.string().url().optional().or(z.literal('')),
  groupType: z.enum(['telegram', 'whatsapp', 'wechat', 'facebook']).optional(),
});

// ─── Proficiency label map (0-4 → human-readable string) ─────────────────────
export const PROFICIENCY_TO_LABEL: Record<number, string> = {
  0: 'All Welcome',
  1: 'Newbie',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
};

// ─── DTO Types ────────────────────────────────────────────────────────────────

export type CreateMatchDTO = z.infer<typeof CreateMatchSchema>;
export type RateMatchDTO = z.infer<typeof RateMatchSchema>;
export type UpdateStatusDTO = z.infer<typeof UpdateStatusSchema>;
export type ExternalPaxDTO = z.infer<typeof ExternalPaxSchema>;
export type InviteUsersDTO = z.infer<typeof InviteUsersSchema>;
export type LogAttendanceDTO = z.infer<typeof LogAttendanceSchema>;
export type AddGuestDTO = z.infer<typeof AddGuestSchema>;
export type MessagePlayerDTO = z.infer<typeof MessagePlayerSchema>;
export type NotifyAllDTO = z.infer<typeof NotifyAllSchema>;
export type UpdateSessionDTO = z.infer<typeof UpdateSessionSchema>;

// ─── Response DTOs (use explicit | undefined for exactOptionalPropertyTypes) ──

export interface SessionInteractionDTO {
  userId: string;
  sessionId: string;
  status: 'registered' | 'attended' | 'no-show' | 'cancelled' | 'pending' | 'waitlisted';
  isLiked: boolean;
  myRating: number | undefined;
  punctuality: 'punctual' | 'late' | undefined;
  waitlistPosition: number | undefined;
}

export interface MatchGuestDTO {
  name: string;
  addedBy: string;
  addedAt: string;
}

export interface GameSessionResponseDTO {
  id: string;
  hostId: string;
  venueId: string;
  title: string;
  description: string | undefined;
  date: string;
  maxPlayers: number;
  currentPlayers: number;
  waitlistCount: number;
  status: 'open' | 'playing' | 'finished';
  totalLikes: number;
  hostName: string | undefined;
  venueName: string | undefined;
  minPax: number;
  externalPax: number;
  gameType: string;
  judgeMethod: string;
  proficiencyRequired: number;
  proficiency: string;
  approvalMode: 'open' | 'approval' | 'invite_only';
  venueApprovalStatus: 'pending' | 'confirmed' | 'rejected';
  groupLink: string | undefined;
  groupType: 'telegram' | 'whatsapp' | 'wechat' | 'facebook' | undefined;
  guests: MatchGuestDTO[];
  joinedPlayerAvatars: string[];
  venueImageUrl: string | undefined;
  myInteraction: SessionInteractionDTO | undefined;
}

export function toFrontendStatus(status: string): 'open' | 'playing' | 'finished' {
  if (status === 'Open' || status === 'Full') return 'open';
  if (status === 'Started') return 'playing';
  return 'finished';
}
