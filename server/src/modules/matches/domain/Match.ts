import { Entity } from '../../../shared/core/Entity';
import { Result } from '../../../shared/core/Result';

export type MatchStatus = 'Created' | 'Open' | 'Full' | 'Started' | 'Completed' | 'Cancelled';

const ALLOWED_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  Created: ['Open', 'Cancelled'],  // reserved for future draft-match feature; not used by createMatch()
  Open: ['Full', 'Started', 'Cancelled'],
  Full: ['Open', 'Started', 'Cancelled'],
  Started: ['Completed'],
  Completed: [],
  Cancelled: [],
};

interface MatchProps {
  host_id: string;
  venue_id: string;
  title: string;
  scheduledAt: Date;
  config: {
    min_pax: number;
    max_pax: number;
    game_type: string;
    judge_method: string;
    proficiency_required: number;
    external_pax: number;
  };
  location: { lat: number; long: number };
  status: MatchStatus;
  players: string[];
  waitlist: string[];
  totalLikes: number;
  cancelledAt: Date | undefined;
}

export class Match extends Entity<MatchProps> {
  get id() { return this._id; }
  get status() { return this.props.status; }
  get players() { return this.props.players; }
  get waitlist() { return this.props.waitlist; }
  get hostId() { return this.props.host_id; }
  get maxPax() { return this.props.config.max_pax; }
  get isFull() { return this.props.players.length >= this.props.config.max_pax; }

  canStart(): boolean {
    return (
      this.props.players.length + this.props.config.external_pax >= this.props.config.min_pax
    );
  }

  canTransitionTo(newStatus: MatchStatus): boolean {
    return ALLOWED_TRANSITIONS[this.props.status].includes(newStatus);
  }

  transitionTo(newStatus: MatchStatus): Result<void> {
    if (!this.canTransitionTo(newStatus)) {
      return Result.fail(
        `Cannot transition from ${this.props.status} to ${newStatus}`
      );
    }
    if (newStatus === 'Started' && !this.canStart()) {
      return Result.fail(
        `Not enough players. Need at least ${this.props.config.min_pax} (including external).`
      );
    }
    (this.props as unknown as Record<string, unknown>)['status'] = newStatus;
    if (newStatus === 'Cancelled') {
      (this.props as unknown as Record<string, unknown>)['cancelledAt'] = new Date();
    }
    return Result.ok();
  }

  addPlayer(userId: string): Result<{ wasWaitlisted: boolean; waitlistPosition: number | undefined }> {
    if (this.props.players.includes(userId) || this.props.waitlist.includes(userId)) {
      return Result.fail('User already joined or on waitlist.');
    }

    if (this.isFull) {
      this.props.waitlist.push(userId);
      return Result.ok({ wasWaitlisted: true, waitlistPosition: this.props.waitlist.length });
    }

    this.props.players.push(userId);
    if (this.isFull && this.props.status === 'Open') {
      (this.props as unknown as Record<string, unknown>)['status'] = 'Full';
    }
    return Result.ok({ wasWaitlisted: false, waitlistPosition: undefined });
  }

  removePlayer(userId: string): Result<{ promotedUserId: string | undefined }> {
    const playerIdx = this.props.players.indexOf(userId);
    if (playerIdx === -1) {
      const waitlistIdx = this.props.waitlist.indexOf(userId);
      if (waitlistIdx !== -1) {
        this.props.waitlist.splice(waitlistIdx, 1);
        return Result.ok({ promotedUserId: undefined });
      }
      return Result.fail('User is not in this match.');
    }

    this.props.players.splice(playerIdx, 1);

    let promotedUserId: string | undefined;
    if (this.props.waitlist.length > 0) {
      promotedUserId = this.props.waitlist.shift();
      if (promotedUserId) {
        this.props.players.push(promotedUserId);
      }
    }

    // Only transition back to Open if nobody was promoted — if a promotion filled the
    // vacated slot the match is still at capacity and must stay Full.
    if (this.props.status === 'Full' && promotedUserId === undefined) {
      (this.props as unknown as Record<string, unknown>)['status'] = 'Open';
    }

    return Result.ok({ promotedUserId });
  }

  static create(props: MatchProps, id?: string): Match {
    return new Match(props, id);
  }
}
