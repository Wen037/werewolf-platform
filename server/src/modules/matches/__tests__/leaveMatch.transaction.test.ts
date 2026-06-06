import { describe, it, expect, beforeAll } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { MatchService } from '../coreLogic/MatchService';

setupMongoMemory();

const matchService = new MatchService();

describe('MatchService.leaveMatch — waitlist promotion', () => {
  it('TRANS-1: leave on Full match promotes first waitlisted user to registered', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());

    // Create match with max_pax = 2 (host + 1 player)
    const match = await createTestMatch({
      hostId: host._id.toString(),
      venueId: venue._id.toString(),
      maxPax: 2,
    });

    const player = await createTestUser();
    const waiter = await createTestUser();

    // Fill the match: add player (host is already in players[])
    await MatchModel.findByIdAndUpdate(match._id, { $push: { players: player._id } });
    await SessionInteractionModel.create({ userId: player._id, sessionId: match._id, status: 'registered' });
    await MatchModel.findByIdAndUpdate(match._id, { status: 'Full' });

    // Put waiter on waitlist
    await MatchModel.findByIdAndUpdate(match._id, { $push: { waitlist: waiter._id } });
    await SessionInteractionModel.create({ userId: waiter._id, sessionId: match._id, status: 'waitlisted', waitlistPosition: 1 });

    // Player leaves
    const result = await matchService.leaveMatch(match._id.toString(), player._id.toString());
    expect(result.isFailure).toBe(false);

    const updatedMatch = await MatchModel.findById(match._id);
    expect(updatedMatch!.players.map(p => p.toString())).toContain(waiter._id.toString());
    expect(updatedMatch!.players.map(p => p.toString())).not.toContain(player._id.toString());
    expect(updatedMatch!.waitlist.map(w => w.toString())).not.toContain(waiter._id.toString());

    const waiterInteraction = await SessionInteractionModel.findOne({
      userId: waiter._id,
      sessionId: match._id,
    });
    expect(waiterInteraction!.status).toBe('registered');
    expect(waiterInteraction!.waitlistPosition).toBeUndefined();
  });

  it('TRANS-2: leave on Open match (no waitlist) removes player, status stays Open', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 4 });

    const player = await createTestUser();
    await MatchModel.findByIdAndUpdate(match._id, { $push: { players: player._id } });
    await SessionInteractionModel.create({ userId: player._id, sessionId: match._id, status: 'registered' });

    const result = await matchService.leaveMatch(match._id.toString(), player._id.toString());
    expect(result.isFailure).toBe(false);

    const updatedMatch = await MatchModel.findById(match._id);
    expect(updatedMatch!.players.map(p => p.toString())).not.toContain(player._id.toString());
    expect(updatedMatch!.status).toBe('Open');

    const interaction = await SessionInteractionModel.findOne({ userId: player._id, sessionId: match._id });
    expect(interaction!.status).toBe('cancelled');
  });

  it('TRANS-3: concurrent leave calls — only one promotion occurs', async () => {
    const host = await createTestUser();
    const venue = await createTestVenue(host._id.toString());
    const match = await createTestMatch({ hostId: host._id.toString(), venueId: venue._id.toString(), maxPax: 2 });

    const p1 = await createTestUser();
    const p2 = await createTestUser();
    const waiter = await createTestUser();

    // Fill match: host + p1
    await MatchModel.findByIdAndUpdate(match._id, { $push: { players: p1._id } });
    await SessionInteractionModel.create({ userId: p1._id, sessionId: match._id, status: 'registered' });
    await MatchModel.findByIdAndUpdate(match._id, { status: 'Full' });

    // p2 on waitlist
    await MatchModel.findByIdAndUpdate(match._id, { $push: { waitlist: p2._id } });
    await SessionInteractionModel.create({ userId: p2._id, sessionId: match._id, status: 'waitlisted', waitlistPosition: 1 });

    // waiter on waitlist position 2
    await MatchModel.findByIdAndUpdate(match._id, { $push: { waitlist: waiter._id } });
    await SessionInteractionModel.create({ userId: waiter._id, sessionId: match._id, status: 'waitlisted', waitlistPosition: 2 });

    // p1 leaves (triggers promotion of p2)
    const result = await matchService.leaveMatch(match._id.toString(), p1._id.toString());
    expect(result.isFailure).toBe(false);

    const updatedMatch = await MatchModel.findById(match._id);
    // players should be [host, p2] — exactly 2 (max_pax)
    expect(updatedMatch!.players).toHaveLength(2);
    expect(updatedMatch!.players.map(p => p.toString())).toContain(p2._id.toString());
    expect(updatedMatch!.players.map(p => p.toString())).not.toContain(p1._id.toString());
    // waiter still on waitlist
    expect(updatedMatch!.waitlist.map(w => w.toString())).toContain(waiter._id.toString());
  });
});
