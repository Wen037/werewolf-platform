import { Router, Request, Response } from 'express';
import { validate } from '../../../shared/middleware/validate';
import { MapService } from '../coreLogic/MapService';
import {
  NearbyVenueQuerySchema,
  NearbyEventQuerySchema,
  GeocodeQuerySchema,
  ReverseGeocodeQuerySchema,
} from '../DTOs/MapDTOs';

const router = Router();
const mapService = new MapService();

/**
 * GET /api/map/venues/nearby
 * Query: lat, lng, radiusKm (default 5), minRating?, verifiedOnly?
 */
router.get(
  '/map/venues/nearby',
  validate(NearbyVenueQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    const { lat, lng, radiusKm, minRating, verifiedOnly } = req.query as unknown as {
      lat: number; lng: number; radiusKm: number;
      minRating?: number; verifiedOnly: boolean;
    };
    const results = await mapService.getNearbyVenues(lat, lng, radiusKm, {
      ...(minRating !== undefined ? { minRating } : {}),
      verifiedOnly,
    });
    res.status(200).json(results);
  }
);

/**
 * GET /api/map/events/nearby
 * Query: lat, lng, radiusKm (default 5), proficiency?, date?, hideFull?
 */
router.get(
  '/map/events/nearby',
  validate(NearbyEventQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    const { lat, lng, radiusKm, proficiency, date, hideFull } = req.query as unknown as {
      lat: number; lng: number; radiusKm: number;
      proficiency?: number; date: string; hideFull: boolean;
    };
    const results = await mapService.getNearbyEvents(lat, lng, radiusKm, {
      ...(proficiency !== undefined ? { proficiency } : {}),
      date,
      hideFull,
    });
    res.status(200).json(results);
  }
);

/**
 * GET /api/map/geocode
 * Query: address — converts an address string to coordinates (Singapore only)
 */
router.get(
  '/map/geocode',
  validate(GeocodeQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    const { address } = req.query as { address: string };
    const result = await mapService.geocodeAddress(address);
    if (!result) {
      res.status(404).json({ message: 'Address not found in Singapore.' });
      return;
    }
    res.status(200).json(result);
  }
);

/**
 * GET /api/map/reverse-geocode
 * Query: lat, lng — returns the Singapore district name for a coordinate pair
 */
router.get(
  '/map/reverse-geocode',
  validate(ReverseGeocodeQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    const { lat, lng } = req.query as unknown as { lat: number; lng: number };
    const result = await mapService.reverseGeocode(lat, lng);
    res.status(200).json(result);
  }
);

export default router;
