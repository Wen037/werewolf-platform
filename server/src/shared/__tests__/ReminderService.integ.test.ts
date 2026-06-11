/**
 * ReminderService — 24h reminder email job.
 * Resend is mocked at module level; sendReminders() is invoked directly
 * (the hourly cron just wraps it).
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Capture every email "sent" by the mocked Resend client
const sentEmails: Array<{ to: string; subject: string }> = [];
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: vi.fn(async (payload: { to: string; subject: string }) => {
        sentEmails.push({ to: payload.to, subject: payload.subject });
        return { id: 'mock' };
      }),
    };
  },
}));

import { setupMongoMemory } from '../../__tests__/helpers/setupMongoMemory';
import { createTestUser } from '../../__tests__/helpers/createTestUser';
import { createTestVenue } from '../../__tests__/helpers/createTestVenue';
import { createTestMatch } from '../../__tests__/helpers/createTestMatch';
import { MatchModel } from '../../modules/matches/DBSchemas/MatchSchema';
import { ReminderService } from '../infra/ReminderService';

setupMongoMemory();

const service = new ReminderService();
const HOURS = 60 * 60 * 1000;

let savedKey: string | undefined;
beforeAll(() => {
  savedKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-key'; // getResend() must return the mocked client
});
afterAll(() => {
  if (savedKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedKey;
});

beforeEach(() => {
  sentEmails.length = 0;
});

async function seedMatchAt(offsetMs: number, opts: { status?: 'Open' | 'Cancelled' | 'Started'; extraPlayerIds?: string[] } = {}) {
  const host = await createTestUser();
  const venue = await createTestVenue(host._id.toString());
  const match = await createTestMatch({
    hostId: host._id.toString(),
    venueId: venue._id.toString(),
    scheduledAtOffset: offsetMs,
    status: (opts.status ?? 'Open') as 'Open',
    extraPlayerIds: opts.extraPlayerIds ?? [],
  });
  return { host, match };
}

describe('ReminderService', () => {
  it('REM-1: emails every registered player of a match ~24h away', async () => {
    const p2 = await createTestUser();
    const { host, match } = await seedMatchAt(24 * HOURS, { extraPlayerIds: [p2._id.toString()] });

    await service.sendReminders();

    const recipients = sentEmails.map(e => e.to).sort();
    expect(recipients).toEqual([host.email, p2.email].sort());
    expect(sentEmails[0]!.subject).toContain('tomorrow');
    void match;
  });

  it('REM-2: no email for matches outside the 23-25h window', async () => {
    await seedMatchAt(10 * HOURS);       // too soon
    await seedMatchAt(48 * HOURS);       // too far

    await service.sendReminders();

    expect(sentEmails).toHaveLength(0);
  });

  it('REM-3: cancelled matches are skipped', async () => {
    const { match } = await seedMatchAt(24 * HOURS);
    await MatchModel.findByIdAndUpdate(match._id, { status: 'Cancelled' });

    await service.sendReminders();

    expect(sentEmails).toHaveLength(0);
  });

  it('REM-4: reminder is sent exactly once — second run does not re-send (double-send guard)', async () => {
    await seedMatchAt(24 * HOURS);

    await service.sendReminders();
    expect(sentEmails).toHaveLength(1);

    // The match is still inside the 23-25h window an hour later — without the
    // reminderSentAt guard the hourly cron would email everyone again
    await service.sendReminders();
    expect(sentEmails).toHaveLength(1);
  });

  it('REM-5: reminderSentAt is stamped on the match after sending', async () => {
    const { match } = await seedMatchAt(24 * HOURS);

    await service.sendReminders();

    const doc = await MatchModel.findById(match._id);
    expect(doc?.reminderSentAt).toBeInstanceOf(Date);
  });
});
