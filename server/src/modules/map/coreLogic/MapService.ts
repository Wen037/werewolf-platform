import axios from 'axios';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { MatchModel } from '../../matches/DBSchemas/MatchSchema';
import {
  NearbyVenueDTO,
  NearbyEventDTO,
  GeocodeResultDTO,
  ReverseGeocodeResultDTO,
} from '../DTOs/MapDTOs';

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Singapore district lookup (reverse-geocode fallback) ─────────────────────
// Approximate district centroids — used when Nominatim returns no suburb/district
const SG_DISTRICTS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Ang Mo Kio',    lat: 1.3691, lng: 103.8454 },
  { name: 'Bedok',         lat: 1.3236, lng: 103.9273 },
  { name: 'Bishan',        lat: 1.3526, lng: 103.8352 },
  { name: 'Bukit Batok',   lat: 1.3590, lng: 103.7637 },
  { name: 'Bukit Timah',   lat: 1.3294, lng: 103.8021 },
  { name: 'Clementi',      lat: 1.3162, lng: 103.7649 },
  { name: 'Geylang',       lat: 1.3201, lng: 103.8918 },
  { name: 'Hougang',       lat: 1.3612, lng: 103.8863 },
  { name: 'Jurong East',   lat: 1.3329, lng: 103.7436 },
  { name: 'Jurong West',   lat: 1.3404, lng: 103.7090 },
  { name: 'Kallang',       lat: 1.3100, lng: 103.8651 },
  { name: 'Marine Parade', lat: 1.3020, lng: 103.9071 },
  { name: 'Novena',        lat: 1.3200, lng: 103.8439 },
  { name: 'Pasir Ris',     lat: 1.3721, lng: 103.9474 },
  { name: 'Punggol',       lat: 1.3984, lng: 103.9072 },
  { name: 'Queenstown',    lat: 1.2942, lng: 103.7861 },
  { name: 'Serangoon',     lat: 1.3554, lng: 103.8679 },
  { name: 'Sengkang',      lat: 1.3868, lng: 103.8914 },
  { name: 'Tampines',      lat: 1.3496, lng: 103.9568 },
  { name: 'Toa Payoh',     lat: 1.3343, lng: 103.8563 },
  { name: 'Woodlands',     lat: 1.4382, lng: 103.7891 },
  { name: 'Yishun',        lat: 1.4304, lng: 103.8354 },
  { name: 'Central',       lat: 1.2897, lng: 103.8501 },
];

function nearestDistrict(lat: number, lng: number): string {
  let closest = SG_DISTRICTS[0]!;
  let minDist = Infinity;
  for (const d of SG_DISTRICTS) {
    const dist = haversineKm(lat, lng, d.lat, d.lng);
    if (dist < minDist) { minDist = dist; closest = d; }
  }
  return closest.name;
}

// ─── MapService ───────────────────────────────────────────────────────────────

export class MapService {
  /**
   * Find venues within radiusKm of (lat, lng).
   * Uses MongoDB $near with 2dsphere index for efficient server-side filtering.
   * Falls back to flat-field scan if geoLocation is not yet populated on a document.
   */
  async getNearbyVenues(
    lat: number,
    lng: number,
    radiusKm: number,
    opts: { minRating?: number; verifiedOnly?: boolean } = {}
  ): Promise<NearbyVenueDTO[]> {
    const radiusMetres = radiusKm * 1000;

    const filter: Record<string, unknown> = {
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMetres,
        },
      },
    };
    if (opts.verifiedOnly) filter['status'] = 'Verified';
    if (opts.minRating !== undefined) filter['averageRating'] = { $gte: opts.minRating };

    const venues = await PlayerSpaceModel.find(filter).limit(50);

    return venues.map(v => {
      const [vLng, vLat] = v.geoLocation?.coordinates ?? [v.location.long, v.location.lat];
      return {
        venueId: v._id.toString(),
        name: v.name,
        address: v.privacy === 'public' ? v.address : (v.area ?? 'Location hidden'),
        ...(v.area !== undefined ? { area: v.area } : {}),
        distanceKm: Math.round(haversineKm(lat, lng, vLat!, vLng!) * 10) / 10,
        lat: vLat!,
        lng: vLng!,
        ...(v.imageUrl !== undefined ? { imageUrl: v.imageUrl } : {}),
        averageRating: v.averageRating,
        isVerified: v.status === 'Verified',
        type: v.type,
      };
    });
  }

  /**
   * Find active events within radiusKm of (lat, lng).
   */
  async getNearbyEvents(
    lat: number,
    lng: number,
    radiusKm: number,
    opts: { proficiency?: number; date?: string; hideFull?: boolean } = {}
  ): Promise<NearbyEventDTO[]> {
    const radiusMetres = radiusKm * 1000;
    const now = new Date();

    const filter: Record<string, unknown> = {
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMetres,
        },
      },
      status: { $in: ['Open', 'Full'] },
      scheduledAt: { $gte: now },
    };

    if (opts.proficiency !== undefined) {
      filter['config.proficiency_required'] = { $in: [0, opts.proficiency] };
    }

    if (opts.date === 'today') {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      filter['scheduledAt'] = { $gte: now, $lte: endOfDay };
    } else if (opts.date === 'week') {
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filter['scheduledAt'] = { $gte: now, $lte: endOfWeek };
    }

    let matches = await MatchModel.find(filter).limit(100);

    if (opts.hideFull) {
      matches = matches.filter(
        m => m.players.length < m.config.max_pax
      );
    }

    return matches.map(m => {
      const [mLng, mLat] = m.geoLocation?.coordinates ?? [m.location.long, m.location.lat];
      return {
        matchId: m._id.toString(),
        title: m.title,
        distanceKm: Math.round(haversineKm(lat, lng, mLat!, mLng!) * 10) / 10,
        lat: mLat!,
        lng: mLng!,
        currentPlayers: m.players.length,
        maxPlayers: m.config.max_pax,
        gameDate: m.scheduledAt.toISOString(),
        proficiencyRequired: m.config.proficiency_required,
        status: m.status,
      };
    });
  }

  /**
   * Address → coordinates via Nominatim (OpenStreetMap, free, no API key).
   * Restricted to Singapore with `countrycodes=sg`.
   */
  async geocodeAddress(address: string): Promise<GeocodeResultDTO | null> {
    // ── 1. Try OneMap (SLA) — accurate for all Singapore postal codes & addresses ──
    try {
      const onemap = await axios.get<{
        found: number;
        results: Array<{ LATITUDE: string; LONGITUDE: string; ADDRESS: string }>;
      }>('https://www.onemap.gov.sg/api/common/elastic/search', {
        params: { searchVal: address, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: 1 },
        timeout: 5000,
      });

      const hit = onemap.data?.results?.[0];
      if (hit && hit.LATITUDE && hit.LONGITUDE) {
        return {
          lat: parseFloat(hit.LATITUDE),
          lng: parseFloat(hit.LONGITUDE),
          displayName: hit.ADDRESS,
        };
      }
    } catch (err) {
      console.warn('[MapService.geocodeAddress] OneMap error, falling back to Nominatim:', err);
    }

    // ── 2. Fallback: Nominatim (less accurate for SG postal codes) ──────────────
    try {
      const url = 'https://nominatim.openstreetmap.org/search';
      const resp = await axios.get<Array<{ lat: string; lon: string; display_name: string }>>(url, {
        params: { q: address, format: 'json', countrycodes: 'sg', limit: 1 },
        headers: { 'User-Agent': 'WerewolfSG/1.0 (werewolf.sg)' },
        timeout: 5000,
      });

      const result = resp.data[0];
      if (!result) return null;

      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch (err) {
      console.error('[MapService.geocodeAddress] Nominatim error:', err);
      return null;
    }
  }

  /**
   * Coordinates → Singapore district name via Nominatim with fallback to
   * the nearest-centroid lookup table.
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResultDTO> {
    try {
      const url = 'https://nominatim.openstreetmap.org/reverse';
      const resp = await axios.get<{
        display_name: string;
        address: { suburb?: string; city_district?: string; town?: string };
      }>(url, {
        params: { lat, lon: lng, format: 'json' },
        headers: { 'User-Agent': 'WerewolfSG/1.0 (werewolf.sg)' },
        timeout: 5000,
      });

      const addr = resp.data.address;
      const area = addr.suburb ?? addr.city_district ?? addr.town ?? nearestDistrict(lat, lng);

      return { area, displayName: resp.data.display_name };
    } catch {
      // Fallback to centroid lookup — works fully offline and in tests
      return { area: nearestDistrict(lat, lng), displayName: nearestDistrict(lat, lng) };
    }
  }
}
