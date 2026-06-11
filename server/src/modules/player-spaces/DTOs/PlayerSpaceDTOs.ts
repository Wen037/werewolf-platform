import { z } from 'zod';

export const LeaveOwnerMessageSchema = z.object({
  message: z.string().min(1).max(500),
});

const SocialLinksSchema = z.object({
  wechatId:       z.string().max(100).optional(),
  telegramHandle: z.string().max(100).optional(),
  facebookUrl:    z.string().url().optional().or(z.literal('')),
}).optional();

export const CreatePlayerSpaceSchema = z.object({
  name: z.string().min(3).max(100),
  address: z.string().min(5).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(['house', 'work', 'school', 'boardgame_store', 'other']),
  privacy: z.enum(['public', 'approximate', 'private']).default('public'),
  area: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_chargeable: z.boolean(),
  approx_fee: z.number().min(0).optional(),
  price_type: z.enum(['per_person', 'per_session']).optional(),
  openingHours: z.string().max(200).optional(),
  maxPax: z.number().int().min(1).max(500).optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  wechatQrUrl: z.string().url().optional(),
  socialLinks: SocialLinksSchema,
});

// Owners can update all mutable properties; verified status and owner can only be changed by admin
export const UpdatePlayerSpaceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  address: z.string().min(5).max(200).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['house', 'work', 'school', 'boardgame_store', 'other']).optional(),
  privacy: z.enum(['public', 'approximate', 'private']).optional(),
  area: z.string().max(100).optional(),
  is_chargeable: z.boolean().optional(),
  approx_fee: z.number().min(0).optional(),
  price_type: z.enum(['per_person', 'per_session']).optional(),
  openingHours: z.string().max(200).optional(),
  maxPax: z.number().int().min(1).max(500).optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  wechatQrUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: SocialLinksSchema,
});

export const RateVenueSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const AddVenueCommentSchema = z.object({
  text: z.string().min(1).max(500),
});

export type CreatePlayerSpaceDTO = z.infer<typeof CreatePlayerSpaceSchema>;
export type UpdatePlayerSpaceDTO = z.infer<typeof UpdatePlayerSpaceSchema>;
export type RateVenueDTO = z.infer<typeof RateVenueSchema>;

export interface GameVenueResponseDTO {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  privacy: 'public' | 'approximate' | 'private';
  area?: string;
  description: string;
  imageUrl: string;
  type: string;
  coordinates: { lat: number; lng: number };
  isVerified: boolean;
  pricePerHour: number;
  priceType: 'per_person' | 'per_session';
  openingHours?: string;
  maxPax?: number;
  images: string[];
  wechatQrUrl: string | undefined;
  isPinned: boolean;
  commentsLocked: boolean;
  amenities: string[];
  rules: string | undefined;
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
  /** Social/contact links set by the owner — PDPA-safe text links, no phone numbers */
  socialLinks?: {
    wechatId?: string;
    telegramHandle?: string;
    facebookUrl?: string;
  };
  myInteraction: {
    isLiked: boolean;
    isSubscribed: boolean;
    myRating: number | undefined;
  } | undefined;
}

export interface VenueCommentResponseDTO {
  id: string;
  venueId: string;
  userId: string;
  username: string;
  avatarUrl: string | undefined;
  text: string;
  createdAt: string;
}
