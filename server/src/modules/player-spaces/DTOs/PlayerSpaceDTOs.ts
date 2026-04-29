import { z } from 'zod';

export const CreatePlayerSpaceSchema = z.object({
  name: z.string().min(3).max(100),
  address: z.string().min(5).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(['house', 'work', 'school', 'boardgame_store', 'other']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_chargeable: z.boolean(),
  approx_fee: z.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
});

export const RateVenueSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export type CreatePlayerSpaceDTO = z.infer<typeof CreatePlayerSpaceSchema>;
export type RateVenueDTO = z.infer<typeof RateVenueSchema>;

export interface GameVenueResponseDTO {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  description: string;
  imageUrl: string;
  type: string;
  coordinates: { lat: number; lng: number };
  isVerified: boolean;
  pricePerHour: number;
  amenities: string[];
  rules: string | undefined;
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
  myInteraction: {
    isLiked: boolean;
    isSubscribed: boolean;
    myRating: number | undefined;
  } | undefined;
}
