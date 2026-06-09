import { z } from 'zod';

// ─── Zod Validation Schemas ───────────────────────────────────────────────────

export const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6),
  newPassword: z.string().min(8).max(100),
});

export const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only').optional(),
  skillLevel: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional(),
  bio: z.string().max(200).refine(v => !/<|>/.test(v), { message: 'No HTML allowed' }).optional(),
  contactNumber: z.string().max(20).optional(),
  avatarUrl: z.string().url().optional(),
  telegramChatId: z.string().optional(),
  notifPreferences: z.object({
    email: z.boolean().optional(),
    telegram: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  }).optional(),
});

// ─── Request DTO Types ────────────────────────────────────────────────────────

export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>;
export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type VerifyOtpDTO = z.infer<typeof VerifyOtpSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export type UpdateProfileDTO = z.infer<typeof UpdateProfileSchema>;

// ─── Response DTO Types (use explicit | undefined for exactOptionalPropertyTypes) ───

export interface UserResponseDTO {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | undefined;
  role: 'player' | 'admin' | 'web_admin';
  isVerified: boolean;
  skillLevel: string;
  bio: string | undefined;
  contactNumber: string | undefined;
  followersCount: number;
  followingCount: number;
  rank: string;
  creditScore: number;
  eventsAttended: number;
  eventsHosted: number;
  noshows: number;
  lateCount: number;
  notifPreferences: {
    email: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  telegramChatId: string | undefined;
}

export interface AuthResponseDTO {
  token: string;
  user: UserResponseDTO;
}

export interface FullUserProfileResponseDTO extends UserResponseDTO {
  pastEvents: unknown[];
  followedUsers: UserResponseDTO[];
  followedVenues: unknown[];
  likedGamesCount: number;
}
