import { describe, it, expect } from 'vitest';
import { Match, MatchStatus } from '../domain/Match';

// Helper to build a minimal Match with sensible defaults
function makeMatch(overrides: {
  players?: string[];
  waitlist?: string[];
  status?: MatchStatus;
  maxPax?: number;
  minPax?: number;
  externalPax?: number;
} = {}): Match {
  return Match.create({
    host_id: 'host1',
    venue_id: 'venue1',
    title: 'Test Game',
    scheduledAt: new Date(Date.now() + 86_400_000),
    config: {
      min_pax: overrides.minPax ?? 4,
      max_pax: overrides.maxPax ?? 6,
      game_type: 'standard',
      judge_method: 'host',
      proficiency_required: 0,
      external_pax: overrides.externalPax ?? 0,
    },
    location: { lat: 1.35, long: 103.82 },
    status: overrides.status ?? 'Open',
    players: overrides.players ?? [],
    waitlist: overrides.waitlist ?? [],
    totalLikes: 0,
    cancelledAt: undefined,
  });
}

describe('Match domain entity', () => {

  // ── addPlayer ────────────────────────────────────────────────────────────────

  describe('addPlayer', () => {
    it('U-1: adds first player, not waitlisted', () => {
      const match = makeMatch();
      const result = match.addPlayer('u1');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().wasWaitlisted).toBe(false);
      expect(result.getValue().waitlistPosition).toBeUndefined();
      expect(match.players).toContain('u1');
    });

    it('U-2: filling last slot transitions Open → Full', () => {
      // max_pax=2, already 1 player
      const match = makeMatch({ maxPax: 2, players: ['u1'] });
      const result = match.addPlayer('u2');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().wasWaitlisted).toBe(false);
      expect(match.status).toBe('Full');
    });

    it('U-3: waitlists when match is Full', () => {
      const match = makeMatch({ maxPax: 2, players: ['u1', 'u2'], status: 'Full' });
      const result = match.addPlayer('u3');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().wasWaitlisted).toBe(true);
      expect(result.getValue().waitlistPosition).toBe(1);
      expect(match.waitlist).toContain('u3');
      expect(match.players).not.toContain('u3');
    });

    it('U-4: rejects duplicate player already in players[]', () => {
      const match = makeMatch({ players: ['u1'] });
      const result = match.addPlayer('u1');
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toMatch(/already/i);
    });

    it('U-5: rejects user already on waitlist', () => {
      const match = makeMatch({ maxPax: 1, players: ['u1'], status: 'Full', waitlist: ['u2'] });
      const result = match.addPlayer('u2');
      expect(result.isFailure).toBe(true);
    });
  });

  // ── removePlayer ─────────────────────────────────────────────────────────────

  describe('removePlayer', () => {
    it('U-6: promotes first waitlisted user when player leaves', () => {
      const match = makeMatch({
        maxPax: 2,
        players: ['u1', 'u2'],
        status: 'Full',
        waitlist: ['u3', 'u4'],
      });
      const result = match.removePlayer('u1');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().promotedUserId).toBe('u3');
      expect(match.players).toContain('u3');
      expect(match.waitlist).not.toContain('u3');
      expect(match.waitlist).toContain('u4');
    });

    it('U-7: Full + empty waitlist → transitions to Open', () => {
      const match = makeMatch({ maxPax: 2, players: ['u1', 'u2'], status: 'Full' });
      const result = match.removePlayer('u1');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().promotedUserId).toBeUndefined();
      expect(match.status).toBe('Open');
    });

    it('U-8: Full + waitlist promotes → stays Full (not Open)', () => {
      const match = makeMatch({
        maxPax: 2,
        players: ['u1', 'u2'],
        status: 'Full',
        waitlist: ['u3'],
      });
      const result = match.removePlayer('u1');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().promotedUserId).toBe('u3');
      // Match is still at capacity (2 players after promotion) — must stay Full
      expect(match.status).toBe('Full');
    });

    it('U-9: removes user from waitlist directly', () => {
      const match = makeMatch({
        maxPax: 2,
        players: ['u1', 'u2'],
        status: 'Full',
        waitlist: ['u3'],
      });
      const result = match.removePlayer('u3');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().promotedUserId).toBeUndefined();
      expect(match.waitlist).not.toContain('u3');
    });

    it('U-10: rejects unknown userId', () => {
      const match = makeMatch({ players: ['u1'] });
      const result = match.removePlayer('unknown');
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toMatch(/not in this match/i);
    });
  });

  // ── transitionTo ─────────────────────────────────────────────────────────────

  describe('transitionTo', () => {
    it('U-11a: Created → Open succeeds', () => {
      expect(makeMatch({ status: 'Created' }).transitionTo('Open').isSuccess).toBe(true);
    });

    it('U-11b: Open → Full succeeds', () => {
      const match = makeMatch({ maxPax: 2, players: ['u1', 'u2'], status: 'Open' });
      expect(match.transitionTo('Full').isSuccess).toBe(true);
    });

    it('U-11c: Open → Cancelled succeeds', () => {
      expect(makeMatch({ status: 'Open' }).transitionTo('Cancelled').isSuccess).toBe(true);
    });

    it('U-11d: Full → Cancelled succeeds', () => {
      expect(makeMatch({ maxPax: 1, players: ['u1'], status: 'Full' }).transitionTo('Cancelled').isSuccess).toBe(true);
    });

    it('U-11e: Started → Completed succeeds', () => {
      const match = makeMatch({
        status: 'Started',
        minPax: 1,
        players: ['u1'],
      });
      expect(match.transitionTo('Completed').isSuccess).toBe(true);
    });

    it('U-12a: Completed → Cancelled is invalid', () => {
      const r = makeMatch({ status: 'Completed' }).transitionTo('Cancelled');
      expect(r.isFailure).toBe(true);
      expect(r.getError()).toMatch(/cannot transition/i);
    });

    it('U-12b: Cancelled → Open is invalid', () => {
      expect(makeMatch({ status: 'Cancelled' }).transitionTo('Open').isFailure).toBe(true);
    });

    it('U-12c: Started → Open is invalid', () => {
      expect(makeMatch({ status: 'Started' }).transitionTo('Open').isFailure).toBe(true);
    });

    it('U-13: Open → Started fails when below min_pax', () => {
      // min_pax=4, only 1 player (host), external_pax=0
      const match = makeMatch({ minPax: 4, players: ['u1'], status: 'Open' });
      const result = match.transitionTo('Started');
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toMatch(/not enough players/i);
    });

    it('U-11f: Open → Started succeeds when players + external_pax >= min_pax', () => {
      // min_pax=4, 4 players
      const match = makeMatch({ minPax: 4, players: ['u1', 'u2', 'u3', 'u4'], status: 'Open' });
      expect(match.transitionTo('Started').isSuccess).toBe(true);
    });
  });

  // ── canStart ─────────────────────────────────────────────────────────────────

  describe('canStart', () => {
    it('U-14: true when players + external_pax >= min_pax', () => {
      const match = makeMatch({ minPax: 5, players: ['u1', 'u2', 'u3'], externalPax: 2 });
      expect(match.canStart()).toBe(true);
    });

    it('U-15: false when below min_pax', () => {
      const match = makeMatch({ minPax: 4, players: ['u1', 'u2'], externalPax: 0 });
      expect(match.canStart()).toBe(false);
    });
  });
});
