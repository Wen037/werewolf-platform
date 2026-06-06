import { describe, it, expect } from 'vitest';
import { setupMongoMemory } from '../../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../../__tests__/helpers/createTestMatch';
import { MatchService } from '../coreLogic/MatchService';
import { MatchModel } from '../DBSchemas/MatchSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';

setupMongoMemory();

const svc = new MatchService();

async function setupCancelScenario(hoursUntil: number) {
  const host = await createTestUser({ creditScore: 100 });
  const venue = await createTestVenue(host._id.toString());
  const match = await createTestMatch({
    hostId: host._id.toString(),
    venueId: venue._id.toString(),
    scheduledAtOffset: hoursUntil * 3_600_000,
  });
  return { host, match };
}

describe('MatchService — cancelWithPenalty (tiered credit deduction)', () => {
  it('CANCEL-1: cancel 1h before start → penalty=0, creditScore unchanged', async () => {
    const { host, match } = await setupCancelScenario(1);

    await svc.cancelWithPenalty(match._id.toString(), host._id.toString());

    const updated = await UserModel.findById(host._id);
    expect(updated?.creditScore).toBe(100);
  });

  it('CANCEL-2: cancel 3h before start → penalty=−0.5', async () => {
    const { host, match } = await setupCancelScenario(3.5);

    await svc.cancelWithPenalty(match._id.toString(), host._id.toString());

    const updated = await UserModel.findById(host._id);
    expect(updated?.creditScore).toBeCloseTo(99.5);
  });

  it('CANCEL-3: cancel 6h before start → penalty=−1.0', async () => {
    const { host, match } = await setupCancelScenario(6);

    await svc.cancelWithPenalty(match._id.toString(), host._id.toString());

    const updated = await UserModel.findById(host._id);
    expect(updated?.creditScore).toBeCloseTo(99);
  });

  it('CANCEL-4: cancel 10h before start → penalty=−1.5', async () => {
    const { host, match } = await setupCancelScenario(10);

    await svc.cancelWithPenalty(match._id.toString(), host._id.toString());

    const updated = await UserModel.findById(host._id);
    expect(updated?.creditScore).toBeCloseTo(98.5);
  });

  it('CANCEL-5: sets match status to Cancelled and records cancelledAt timestamp', async () => {
    const { host, match } = await setupCancelScenario(6);
    const before = new Date();

    await svc.cancelWithPenalty(match._id.toString(), host._id.toString());

    const updated = await MatchModel.findById(match._id);
    expect(updated?.status).toBe('Cancelled');
    expect(updated?.cancelledAt).toBeDefined();
    expect(updated!.cancelledAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('CANCEL-6: returns failure and makes no changes when requester is not the host', async () => {
    const { match } = await setupCancelScenario(6);
    const rando = await createTestUser({ creditScore: 100 });

    const result = await svc.cancelWithPenalty(match._id.toString(), rando._id.toString());

    expect(result.isFailure).toBe(true);
    const doc = await MatchModel.findById(match._id);
    expect(doc?.status).not.toBe('Cancelled');
    const updatedRando = await UserModel.findById(rando._id);
    expect(updatedRando?.creditScore).toBe(100);
  });
});
