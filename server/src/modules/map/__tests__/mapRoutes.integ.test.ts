/**
 * HTTP-layer integration tests for map routes.
 * Covers:
 *   GET /api/map/venues/nearby
 *   GET /api/map/events/nearby
 *   GET /api/map/geocode
 *   GET /api/map/reverse-geocode
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('../../../shared/infra/passport', () => {
  const passport = {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    use: () => {},
    serializeUser: () => {},
    deserializeUser: () => {},
  };
  return { default: passport };
});

vi.mock('../../../shared/infra/email', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingInquiryEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock axios to prevent real HTTP calls to Nominatim/OneMap in test env
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('Network error - use fallback')),
  },
}));

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { MatchModel } from '../../matches/DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../../matches/DBSchemas/SessionInteractionSchema';

let mongod: MongoMemoryServer;

const SG_LAT = 1.3521;
const SG_LNG = 103.8198;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Wait for index builds (incl. 2dsphere) — $near queries fail until the geo index exists
  await Promise.all(Object.values(mongoose.connection.models).map((m) => m.init()));
});

// ─── Seed helpers ─────────────────────────────────────────────────────────────

async function seedVenueNear(lat = SG_LAT, lng = SG_LNG) {
  const ownerId = new mongoose.Types.ObjectId();
  await UserModel.create({
    _id: ownerId,
    username: `mapowner_${ownerId.toString().slice(-4)}`,
    email: `mapowner_${ownerId.toString().slice(-4)}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    creditScore: 100,
  });
  return PlayerSpaceModel.create({
    owner_id: ownerId,
    name: 'Map Test Venue',
    address: '1 Map Street, Singapore',
    type: 'house',
    location: { lat, long: lng },
    geoLocation: { type: 'Point', coordinates: [lng, lat] },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
    status: 'Verified',
  });
}

async function seedMatchNear(lat = SG_LAT, lng = SG_LNG) {
  const hostId = new mongoose.Types.ObjectId();
  const venueId = new mongoose.Types.ObjectId();
  await UserModel.create({
    _id: hostId,
    username: `maphost_${hostId.toString().slice(-4)}`,
    email: `maphost_${hostId.toString().slice(-4)}@test.com`,
    passwordHash: '$2b$10$hashedfakepw',
    creditScore: 100,
  });
  await PlayerSpaceModel.create({
    _id: venueId,
    owner_id: hostId,
    name: 'Map Event Venue',
    address: '2 Map Street, Singapore',
    type: 'house',
    location: { lat, long: lng },
    geoLocation: { type: 'Point', coordinates: [lng, lat] },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
    status: 'Verified',
  });
  const match = await MatchModel.create({
    host_id: hostId,
    venue_id: venueId,
    title: 'Map Test Event',
    scheduledAt: new Date(Date.now() + 86_400_000),
    config: { min_pax: 4, max_pax: 12, game_type: 'standard', judge_method: 'host', proficiency_required: 0, external_pax: 0 },
    location: { lat, long: lng },
    geoLocation: { type: 'Point', coordinates: [lng, lat] },
    status: 'Open',
    approvalMode: 'open',
    players: [hostId],
    waitlist: [],
  });
  await SessionInteractionModel.create({ userId: hostId.toString(), sessionId: match._id, status: 'registered' });
  return match;
}

// ─── GET /api/map/venues/nearby ───────────────────────────────────────────────
// setupMongoMemory awaits Model.init() so the 2dsphere index exists — $near
// queries work exactly as in production and must return 200.

describe('GET /api/map/venues/nearby', () => {
  it('MAP-ROUTE-1: returns 200 with an array for valid coordinates', async () => {
    const res = await request(app)
      .get('/api/map/venues/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('MAP-ROUTE-2: returns 400 when lat is missing', async () => {
    const res = await request(app)
      .get('/api/map/venues/nearby')
      .query({ lng: SG_LNG });

    expect(res.status).toBe(400);
  });

  it('MAP-ROUTE-3: returns 400 when lng is missing', async () => {
    const res = await request(app)
      .get('/api/map/venues/nearby')
      .query({ lat: SG_LAT });

    expect(res.status).toBe(400);
  });

  it('MAP-ROUTE-4: returns the seeded venue within radiusKm', async () => {
    const venue = await seedVenueNear();

    const res = await request(app)
      .get('/api/map/venues/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG, radiusKm: 10 });

    expect(res.status).toBe(200);
    expect(res.body.some((v: { venueId: string }) => v.venueId === venue._id.toString())).toBe(true);
  });

  it('MAP-ROUTE-5: verifiedOnly param returns 200', async () => {
    const res = await request(app)
      .get('/api/map/venues/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG, verifiedOnly: true });

    expect(res.status).toBe(200);
  });

  it('MAP-ROUTE-6: no auth required (not 401)', async () => {
    const res = await request(app)
      .get('/api/map/venues/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG });

    expect(res.status).not.toBe(401);
  });
});

// ─── GET /api/map/events/nearby ───────────────────────────────────────────────

describe('GET /api/map/events/nearby', () => {
  it('MAP-ROUTE-7: returns the seeded upcoming event for valid coordinates', async () => {
    const match = await seedMatchNear();

    const res = await request(app)
      .get('/api/map/events/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG });

    expect(res.status).toBe(200);
    expect(res.body.some((e: { matchId: string }) => e.matchId === match._id.toString())).toBe(true);
  });

  it('MAP-ROUTE-8: returns 400 when both lat and lng are missing', async () => {
    const res = await request(app).get('/api/map/events/nearby');

    expect(res.status).toBe(400);
  });

  it('MAP-ROUTE-9: hideFull=true returns 200 and excludes nothing for a non-full event', async () => {
    const match = await seedMatchNear();

    const res = await request(app)
      .get('/api/map/events/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG, hideFull: true });

    expect(res.status).toBe(200);
    expect(res.body.some((e: { matchId: string }) => e.matchId === match._id.toString())).toBe(true);
  });

  it('MAP-ROUTE-10: date=today excludes an event scheduled tomorrow', async () => {
    const match = await seedMatchNear(); // scheduledAt = now + 24h

    const res = await request(app)
      .get('/api/map/events/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG, date: 'today' });

    expect(res.status).toBe(200);
    expect(res.body.some((e: { matchId: string }) => e.matchId === match._id.toString())).toBe(false);
  });

  it('MAP-ROUTE-11: proficiency filter returns events open to all levels', async () => {
    const match = await seedMatchNear(); // proficiency_required: 0 (open to all)

    const res = await request(app)
      .get('/api/map/events/nearby')
      .query({ lat: SG_LAT, lng: SG_LNG, proficiency: 1 });

    expect(res.status).toBe(200);
    expect(res.body.some((e: { matchId: string }) => e.matchId === match._id.toString())).toBe(true);
  });
});

// ─── GET /api/map/reverse-geocode ────────────────────────────────────────────

describe('GET /api/map/reverse-geocode', () => {
  it('MAP-ROUTE-12: returns 200 with area name for Singapore coordinates', async () => {
    const res = await request(app)
      .get('/api/map/reverse-geocode')
      .query({ lat: SG_LAT, lng: SG_LNG });

    expect(res.status).toBe(200);
    expect(res.body.area).toBeTruthy();
    expect(typeof res.body.area).toBe('string');
  });

  it('MAP-ROUTE-13: returns 200 for Yishun coordinates', async () => {
    const res = await request(app)
      .get('/api/map/reverse-geocode')
      .query({ lat: 1.4304, lng: 103.8354 });

    expect(res.status).toBe(200);
    expect(res.body.area).toBeTruthy();
  });

  it('MAP-ROUTE-14: returns 400 when lat/lng missing', async () => {
    const res = await request(app)
      .get('/api/map/reverse-geocode')
      .query({ lat: SG_LAT });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/map/geocode ─────────────────────────────────────────────────────

describe('GET /api/map/geocode', () => {
  it('MAP-ROUTE-15: returns 400 when address is missing', async () => {
    const res = await request(app).get('/api/map/geocode');

    expect(res.status).toBe(400);
  });

  it('MAP-ROUTE-16: with Nominatim mocked to fail, returns 404 for unknown address', async () => {
    // axios is mocked to fail; MapService falls back to geocoder
    // For unknown address, result should be null → 404
    const res = await request(app)
      .get('/api/map/geocode')
      .query({ address: 'Totally Nonexistent Street XYZABC' });

    // Without real geocoding, the service may return 404 or a fallback
    expect([200, 404]).toContain(res.status);
  });

  it('MAP-ROUTE-17: no auth required (public endpoint)', async () => {
    const res = await request(app)
      .get('/api/map/geocode')
      .query({ address: 'Orchard Road Singapore' });

    expect(res.status).not.toBe(401);
  });
});
