/**
 * Race condition test for MatchService.joinMatch
 *
 * Standard: CWE-362 (TOCTOU — Time-Of-Check to Time-Of-Use)
 *
 * Before the fix: joinMatch reads the document, checks capacity in JS, then writes.
 * Multiple concurrent requests all read "1 slot left" simultaneously, all pass the
 * JS check, and all push to players[] → oversell (more players than max_pax).
 *
 * After the fix: a single atomic findOneAndUpdate with $expr ensures only one
 * request can claim the last slot; the rest fall through to the waitlist.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MatchService } from '../coreLogic/MatchService';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';

let mongod: MongoMemoryServer;
const matchService = new MatchService();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key]!.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── helpers ────────────────────────────────────────────────────────────────

async function seedUsers(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const uid = new mongoose.Types.ObjectId().toString();
    await UserModel.create({
      _id: uid,
      username: `u_${uid.slice(-5)}`,
      email: `${uid.slice(-5)}@race.test`,
      passwordHash: 'hash',
    });
    ids.push(uid);
  }
  return ids;
}

async function seedVenue(ownerId: string): Promise<string> {
  const venue = await PlayerSpaceModel.create({
    owner_id: new mongoose.Types.ObjectId(ownerId),
    name: 'Race Test Venue',
    address: '1 Race St',
    type: 'house',
    location: { lat: 1.3, long: 103.8 },
    financials: { is_chargeable: false, approx_fee: 0, price_type: 'per_session' },
    amenities: [],
  });
  return venue._id.toString();
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('joinMatch — concurrency / CWE-362', () => {

  it('I-RACE-1: 10 concurrent joins with 1 slot remaining — players never exceed max_pax', async () => {
    const MAX_PAX = 12;
    const EXISTING = 11; // 1 slot left

    const allUserIds = await seedUsers(EXISTING + 10);
    const existingIds = allUserIds.slice(0, EXISTING);
    const joinerIds  = allUserIds.slice(EXISTING);      // 10 users racing for 1 slot
    const venueId    = await seedVenue(existingIds[0]!);

    const match = await MatchModel.create({
      host_id:     new mongoose.Types.ObjectId(existingIds[0]),
      venue_id:    new mongoose.Types.ObjectId(venueId),
      title:       'Race Match',
      scheduledAt: new Date(Date.now() + 86_400_000),
      config: { min_pax: 4, max_pax: MAX_PAX, game_type: 'standard', judge_method: 'host', proficiency_required: 0, external_pax: 0 },
      location:    { lat: 1.3, long: 103.8 },
      players:     existingIds.map(id => new mongoose.Types.ObjectId(id)),
      status:      'Open',
      approvalMode: 'open',
    });
    const matchId = match._id.toString();

    // Fire 10 concurrent requests simultaneously
    const results = await Promise.all(
      joinerIds.map(uid => matchService.joinMatch(matchId, uid))
    );

    const finalMatch = await MatchModel.findById(matchId);
    expect(finalMatch).not.toBeNull();

    // ── core invariant: players must never exceed max_pax ──
    expect(finalMatch!.players.length).toBeLessThanOrEqual(MAX_PAX);

    // ── should reach exactly max_pax (the 1 slot was claimed) ──
    expect(finalMatch!.players.length).toBe(MAX_PAX);

    // ── exactly 1 user registered (not waitlisted) ──
    const registered = results.filter(r => r.isSuccess && !r.getValue().wasWaitlisted);
    expect(registered).toHaveLength(1);

    // ── all 10 calls must succeed (either registered or waitlisted) ──
    const successes = results.filter(r => r.isSuccess);
    expect(successes).toHaveLength(10);

    // ── no duplicate entries in players[] ──
    const playerStrs = finalMatch!.players.map(p => p.toString());
    expect(new Set(playerStrs).size).toBe(playerStrs.length);
  });

  it('I-RACE-2: 50 concurrent joins with 2 slots remaining — players never exceed max_pax', async () => {
    const MAX_PAX = 12;
    const EXISTING = 10; // 2 slots left

    const allUserIds = await seedUsers(EXISTING + 50);
    const existingIds = allUserIds.slice(0, EXISTING);
    const joinerIds  = allUserIds.slice(EXISTING);
    const venueId    = await seedVenue(existingIds[0]!);

    const match = await MatchModel.create({
      host_id:     new mongoose.Types.ObjectId(existingIds[0]),
      venue_id:    new mongoose.Types.ObjectId(venueId),
      title:       'Stress Race Match',
      scheduledAt: new Date(Date.now() + 86_400_000),
      config: { min_pax: 4, max_pax: MAX_PAX, game_type: 'standard', judge_method: 'host', proficiency_required: 0, external_pax: 0 },
      location:    { lat: 1.3, long: 103.8 },
      players:     existingIds.map(id => new mongoose.Types.ObjectId(id)),
      status:      'Open',
      approvalMode: 'open',
    });

    await Promise.all(joinerIds.map(uid => matchService.joinMatch(match._id.toString(), uid)));

    const finalMatch = await MatchModel.findById(match._id);
    expect(finalMatch!.players.length).toBeLessThanOrEqual(MAX_PAX);

    const playerStrs = finalMatch!.players.map(p => p.toString());
    expect(new Set(playerStrs).size).toBe(playerStrs.length);
  });
});
