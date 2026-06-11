import { describe, it, expect, vi } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';

// Mock axios at top level so Vitest can hoist it before module imports
vi.mock('axios', () => ({
  default: { get: vi.fn().mockRejectedValue(new Error('Network error - use fallback')) },
}));
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { MatchModel } from '../../matches/DBSchemas/MatchSchema';
import { MapService } from '../coreLogic/MapService';

setupMongoMemory();

const mapService = new MapService();

// Singapore centre coordinates for tests
const SG_LAT = 1.3521;
const SG_LNG = 103.8198;

describe('MapService — getNearbyVenues', () => {
  it('MAP-1: returns only venues within radius, nearest first', async () => {
    const owner = await createTestUser();
    // Create venues at different distances from SG centre
    const near = await createTestVenue(owner._id.toString(), { lat: SG_LAT + 0.01, lng: SG_LNG + 0.01 }); // ~1.5 km
    const far = await createTestVenue(owner._id.toString(), { lat: SG_LAT + 0.1, lng: SG_LNG + 0.1 });    // ~15 km

    const result = await mapService.getNearbyVenues(SG_LAT, SG_LNG, 5);
    const ids = result.map(v => v.venueId);
    expect(ids).toContain(near._id.toString());
    expect(ids).not.toContain(far._id.toString());
  });

  it('MAP-2: getNearbyEvents excludes Full matches when hideFull=true', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString(), { lat: SG_LAT, lng: SG_LNG });
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    // Fill the match to Full
    const p2 = await createTestUser();
    await MatchModel.findByIdAndUpdate(match._id, {
      $push: { players: p2._id },
      status: 'Full',
    });

    // Full match is visible without the filter, hidden with hideFull=true
    const resultAll = await mapService.getNearbyEvents(SG_LAT, SG_LNG, 50);
    expect(resultAll.find(e => e.matchId === match._id.toString())).toBeDefined();

    const resultHideFull = await mapService.getNearbyEvents(SG_LAT, SG_LNG, 50, { hideFull: true });
    expect(resultHideFull.find(e => e.matchId === match._id.toString())).toBeUndefined();
  });

  it('MAP-3: getNearbyEvents excludes past events', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString(), { lat: SG_LAT, lng: SG_LNG });
    // Create a match scheduled in the past
    const pastMatch = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString() });
    await MatchModel.findByIdAndUpdate(pastMatch._id, {
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const result = await mapService.getNearbyEvents(SG_LAT, SG_LNG, 50);
    const found = result.find(e => e.matchId === pastMatch._id.toString());
    expect(found).toBeUndefined();
  });

  it('MAP-4: returns empty array when no venues exist within radius', async () => {
    const result = await mapService.getNearbyVenues(0, 0, 1);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe('MapService — reverseGeocode', () => {
  it('MAP-5: returns a district name from the fallback centroid table when Nominatim is unavailable', async () => {
    // axios is already mocked at top level to simulate network failure
    // Yishun coordinates
    const result = await mapService.reverseGeocode(1.4304, 103.8354);
    expect(result.area).toBeTruthy();
    expect(typeof result.area).toBe('string');
  });
});
