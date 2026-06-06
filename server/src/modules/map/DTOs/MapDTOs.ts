import { z } from 'zod';

// ─── Query validation schemas ─────────────────────────────────────────────────

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(50).default(5),
});

export const NearbyVenueQuerySchema = NearbyQuerySchema.extend({
  minRating: z.coerce.number().min(0).max(5).optional(),
  verifiedOnly: z.coerce.boolean().default(false),
});

export const NearbyEventQuerySchema = NearbyQuerySchema.extend({
  proficiency: z.coerce.number().int().min(0).max(4).optional(),
  date: z.enum(['any', 'today', 'week']).default('any'),
  hideFull: z.coerce.boolean().default(false),
});

export const GeocodeQuerySchema = z.object({
  address: z.string().min(3).max(200),
});

export const ReverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// ─── Response DTO types ───────────────────────────────────────────────────────

export interface NearbyVenueDTO {
  venueId: string;
  name: string;
  address: string;
  area?: string;
  distanceKm: number;
  lat: number;
  lng: number;
  imageUrl?: string;
  averageRating: number;
  isVerified: boolean;
  type: string;
}

export interface NearbyEventDTO {
  matchId: string;
  title: string;
  distanceKm: number;
  lat: number;
  lng: number;
  currentPlayers: number;
  maxPlayers: number;
  gameDate: string;        // ISO string
  proficiencyRequired: number;
  status: string;
}

export interface GeocodeResultDTO {
  lat: number;
  lng: number;
  displayName: string;    // full address from Nominatim
}

export interface ReverseGeocodeResultDTO {
  area: string;           // Singapore district name, e.g. "Yishun"
  displayName: string;
}
