import { Result } from '../../../shared/core/Result';
import { eventBus } from '../../../shared/infra/EventBus';
import { MatchModel, IMatchDocument } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { MatchInviteModel } from '../DBSchemas/MatchInviteSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { PlayerSpaceModel } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
import { Match, MatchStatus } from '../domain/Match';
import { calculateRank } from '../../users/domain/User';
import {
  CreateMatchDTO,
  GameSessionResponseDTO,
  InviteUsersDTO,
  LogAttendanceDTO,
  PROFICIENCY_TO_LABEL,
  RateMatchDTO,
  SessionInteractionDTO,
  toFrontendStatus,
} from '../DTOs/MatchDTOs';

type MatchDoc = IMatchDocument & { _id: { toString(): string } };

function reconstructMatch(doc: MatchDoc): Match {
  return Match.create(
    {
      host_id: doc.host_id.toString(),
      venue_id: doc.venue_id.toString(),
      title: doc.title,
      scheduledAt: doc.scheduledAt,
      config: doc.config,
      location: doc.location,
      status: doc.status,
      players: doc.players.map(p => p.toString()),
      waitlist: doc.waitlist.map(w => w.toString()),
      totalLikes: doc.totalLikes,
      cancelledAt: doc.cancelledAt,
    },
    doc._id.toString()
  );
}

async function enrichWithNamesAndInteraction(
  docs: MatchDoc[],
  requestingUserId?: string
): Promise<GameSessionResponseDTO[]> {
  if (docs.length === 0) return [];

  const hostIds = [...new Set(docs.map(d => d.host_id.toString()))];
  const venueIds = [...new Set(docs.map(d => d.venue_id.toString()))];

  const [hosts, venues] = await Promise.all([
    UserModel.find({ _id: { $in: hostIds } }, 'username'),
    PlayerSpaceModel.find({ _id: { $in: venueIds } }, 'name'),
  ]);

  const hostMap = new Map(hosts.map(h => [h._id.toString(), h.username]));
  const venueMap = new Map(venues.map(v => [v._id.toString(), v.name]));

  let interactionMap = new Map<string, SessionInteractionDTO>();
  if (requestingUserId) {
    const matchIds = docs.map(d => d._id);
    const interactions = await SessionInteractionModel.find({
      userId: requestingUserId,
      sessionId: { $in: matchIds },
    });
    interactionMap = new Map(
      interactions.map(i => [
        i.sessionId.toString(),
        {
          userId: i.userId.toString(),
          sessionId: i.sessionId.toString(),
          status: i.status,
          isLiked: i.isLiked,
          myRating: i.myRating,
          punctuality: i.punctuality,
          waitlistPosition: i.waitlistPosition,
        },
      ])
    );
  }

  return docs.map(d => ({
    id: d._id.toString(),
    hostId: d.host_id.toString(),
    venueId: d.venue_id.toString(),
    title: d.title,
    date: d.scheduledAt.toISOString(),
    maxPlayers: d.config.max_pax,
    currentPlayers: d.players.length,
    waitlistCount: d.waitlist.length,
    status: toFrontendStatus(d.status),
    totalLikes: d.totalLikes,
    hostName: hostMap.get(d.host_id.toString()),
    venueName: venueMap.get(d.venue_id.toString()),
    minPax: d.config.min_pax,
    externalPax: d.config.external_pax,
    gameType: d.config.game_type,
    judgeMethod: d.config.judge_method,
    proficiencyRequired: d.config.proficiency_required,
    proficiency: PROFICIENCY_TO_LABEL[d.config.proficiency_required] ?? 'All Welcome',
    myInteraction: interactionMap.get(d._id.toString()),
  }));
}

export class MatchService {
  async getActiveMatches(requestingUserId?: string): Promise<GameSessionResponseDTO[]> {
    const docs = await MatchModel.find({
      status: { $in: ['Open', 'Full', 'Started'] },
    }).sort({ scheduledAt: 1 }) as MatchDoc[];

    return enrichWithNamesAndInteraction(docs, requestingUserId);
  }

  async getMyEvents(userId: string): Promise<GameSessionResponseDTO[]> {
    const interactions = await SessionInteractionModel.find({ userId }).sort({ _id: -1 });
    const matchIds = interactions.map(i => i.sessionId);
    const docs = await MatchModel.find({ _id: { $in: matchIds } }) as MatchDoc[];

    const docMap = new Map(docs.map(d => [d._id.toString(), d]));
    const sorted = matchIds
      .map(id => docMap.get(id.toString()))
      .filter((d): d is MatchDoc => d !== undefined);

    return enrichWithNamesAndInteraction(sorted, userId);
  }

  async getMatchesByVenue(venueId: string, requestingUserId?: string): Promise<GameSessionResponseDTO[]> {
    const docs = await MatchModel.find({ venue_id: venueId })
      .sort({ scheduledAt: -1 }) as MatchDoc[];
    return enrichWithNamesAndInteraction(docs, requestingUserId);
  }

  async getMatchById(sessionId: string, requestingUserId?: string): Promise<Result<GameSessionResponseDTO>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    const results = await enrichWithNamesAndInteraction([doc], requestingUserId);
    const result = results[0];
    if (!result) return Result.fail('Match not found.');
    return Result.ok(result);
  }

  async createMatch(hostId: string, dto: CreateMatchDTO): Promise<Result<GameSessionResponseDTO>> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await MatchModel.countDocuments({
      host_id: hostId,
      createdAt: { $gte: sevenDaysAgo },
    });
    if (recentCount >= 3) return Result.fail('You can only create 3 events per 7 days.');

    const venue = await PlayerSpaceModel.findById(dto.venue_id);
    if (!venue) return Result.fail('Venue not found.');

    const doc = await MatchModel.create({
      host_id: hostId,
      venue_id: dto.venue_id,
      title: dto.title,
      scheduledAt: new Date(dto.scheduledAt),
      config: {
        min_pax: dto.min_pax,
        max_pax: dto.max_pax,
        game_type: dto.game_type ?? 'standard',
        judge_method: dto.judge_method ?? 'host',
        proficiency_required: dto.proficiency_required ?? 0,
        external_pax: 0,
      },
      location: { lat: venue.location.lat, long: venue.location.long },
      players: [hostId],
    }) as unknown as MatchDoc;

    await SessionInteractionModel.create({ userId: hostId, sessionId: doc._id });

    const results = await enrichWithNamesAndInteraction([doc], hostId);
    const result = results[0];
    if (!result) return Result.fail('Failed to create match.');
    return Result.ok(result);
  }

  async joinMatch(
    sessionId: string,
    userId: string
  ): Promise<Result<{ wasWaitlisted: boolean; waitlistPosition: number | undefined }>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.status === 'Cancelled' || doc.status === 'Completed' || doc.status === 'Started') {
      return Result.fail(`Cannot join a match with status: ${doc.status}`);
    }

    const match = reconstructMatch(doc);
    const joinResult = match.addPlayer(userId);
    if (joinResult.isFailure) return Result.fail(joinResult.getError());

    const { wasWaitlisted, waitlistPosition } = joinResult.getValue();

    if (wasWaitlisted) {
      await MatchModel.findByIdAndUpdate(sessionId, { $push: { waitlist: userId } });
      await SessionInteractionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { status: 'registered', waitlistPosition } },
        { upsert: true }
      );
    } else {
      const newStatus = match.status;
      await MatchModel.findByIdAndUpdate(sessionId, {
        $push: { players: userId },
        $set: { status: newStatus },
      });
      await SessionInteractionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { status: 'registered' } },
        { upsert: true }
      );
    }

    eventBus.publish({
      eventName: 'UserJoinedMatch',
      occurredOn: new Date(),
      payload: { userId, matchId: sessionId },
    });

    return Result.ok({ wasWaitlisted, waitlistPosition });
  }

  async leaveMatch(sessionId: string, userId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.status === 'Started' || doc.status === 'Completed') {
      return Result.fail('Cannot leave a match that has already started.');
    }

    const match = reconstructMatch(doc);
    const leaveResult = match.removePlayer(userId);
    if (leaveResult.isFailure) return Result.fail(leaveResult.getError());

    const { promotedUserId } = leaveResult.getValue();
    const newStatus = match.status;

    if (promotedUserId) {
      // MongoDB forbids $pull and $push on the same field in one operation — split into two updates
      await MatchModel.findByIdAndUpdate(sessionId, {
        $pull: { players: userId, waitlist: promotedUserId },
        $set: { status: newStatus },
      });
      await MatchModel.findByIdAndUpdate(sessionId, {
        $push: { players: promotedUserId },
      });
      await SessionInteractionModel.findOneAndUpdate(
        { userId: promotedUserId, sessionId },
        { $unset: { waitlistPosition: '' } }
      );
      eventBus.publish({
        eventName: 'WaitlistPromoted',
        occurredOn: new Date(),
        payload: { promotedUserId, matchId: sessionId },
      });
    } else {
      await MatchModel.findByIdAndUpdate(sessionId, {
        $pull: { players: userId, waitlist: userId },
        $set: { status: newStatus },
      });
    }

    await SessionInteractionModel.findOneAndUpdate(
      { userId, sessionId },
      { $set: { status: 'cancelled' } }
    );

    // Deduct 1 credit if quitting within 24 hours of the match
    const hoursUntilMatch = (doc.scheduledAt.getTime() - Date.now()) / 3_600_000;
    if (hoursUntilMatch < 24 && hoursUntilMatch > 0) {
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { creditScore: -1 },
      });
    }

    return Result.ok();
  }

  async rateMatch(sessionId: string, userId: string, dto: RateMatchDTO): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');

    await SessionInteractionModel.findOneAndUpdate(
      { userId, sessionId },
      { $set: { myRating: dto.rating } },
      { upsert: true }
    );

    const allRatings = await SessionInteractionModel.find({
      sessionId,
      myRating: { $exists: true },
    });
    const avg = allRatings.reduce((s, i) => s + (i.myRating ?? 0), 0) / (allRatings.length || 1);
    // MatchModel doesn't have averageRating in schema — store on interactions only
    void avg; // calculated for future use

    return Result.ok();
  }

  async toggleLike(sessionId: string, userId: string): Promise<Result<{ isLiked: boolean }>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');

    const interaction = await SessionInteractionModel.findOne({ userId, sessionId });
    const newLiked = !(interaction?.isLiked ?? false);
    const delta = newLiked ? 1 : -1;

    await SessionInteractionModel.findOneAndUpdate(
      { userId, sessionId },
      { $set: { isLiked: newLiked } },
      { upsert: true }
    );
    await MatchModel.findByIdAndUpdate(sessionId, { $inc: { totalLikes: delta } });

    if (delta > 0) {
      await UserModel.findByIdAndUpdate(doc.host_id, { $inc: { likesReceived: 1 } });
    }

    return Result.ok({ isLiked: newLiked });
  }

  async setExternalPax(sessionId: string, hostId: string, count: number): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can update this.');

    await MatchModel.findByIdAndUpdate(sessionId, { $set: { 'config.external_pax': count } });
    return Result.ok();
  }

  async updateMatchStatus(
    sessionId: string,
    hostId: string,
    newStatus: MatchStatus
  ): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can change the status.');

    const match = reconstructMatch(doc);
    const transitionResult = match.transitionTo(newStatus);
    if (transitionResult.isFailure) return Result.fail(transitionResult.getError());

    const update: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'Cancelled') {
      update['cancelledAt'] = new Date();
      await SessionInteractionModel.updateMany({ sessionId }, { $set: { status: 'cancelled' } });
    }

    if (newStatus === 'Completed') {
      await UserModel.findByIdAndUpdate(hostId, { $inc: { eventsHosted: 1 } });
      const host = await UserModel.findById(hostId);
      if (host) {
        const rank = calculateRank(host.eventsAttended, host.eventsHosted, host.noshows, host.lateCount);
        await UserModel.findByIdAndUpdate(hostId, { rank });
      }
    }

    await MatchModel.findByIdAndUpdate(sessionId, { $set: update });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: sessionId, newStatus, hostId },
    });

    return Result.ok();
  }

  async logAttendance(
    sessionId: string,
    hostId: string,
    dto: LogAttendanceDTO
  ): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can log attendance.');
    if (doc.status !== 'Started' && doc.status !== 'Completed') {
      return Result.fail('Can only log attendance for started or completed matches.');
    }

    for (const entry of dto.attendees) {
      const update: Record<string, unknown> = { status: entry.status };
      if (entry.punctuality !== undefined) update['punctuality'] = entry.punctuality;

      await SessionInteractionModel.findOneAndUpdate(
        { userId: entry.userId, sessionId },
        { $set: update },
        { upsert: true }
      );

      if (entry.status === 'no-show') {
        await UserModel.findByIdAndUpdate(entry.userId, { $inc: { noshows: 1 } });
      } else if (entry.status === 'attended') {
        const inc: Record<string, number> = { eventsAttended: 1, creditScore: 1 };
        if (entry.punctuality === 'late') inc['lateCount'] = 1;
        await UserModel.findByIdAndUpdate(entry.userId, { $inc: inc });
      }

      const user = await UserModel.findById(entry.userId);
      if (user) {
        const rank = calculateRank(user.eventsAttended, user.eventsHosted, user.noshows, user.lateCount);
        await UserModel.findByIdAndUpdate(entry.userId, { rank });
      }
    }

    return Result.ok();
  }

  async inviteUsers(
    sessionId: string,
    hostId: string,
    dto: InviteUsersDTO
  ): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can send invites.');

    for (const userId of dto.userIds) {
      try {
        await MatchInviteModel.findOneAndUpdate(
          { matchId: sessionId, invitedUserId: userId },
          { $setOnInsert: { invitedById: hostId, status: 'pending' } },
          { upsert: true }
        );
      } catch {
        // skip duplicate invite errors
      }

      eventBus.publish({
        eventName: 'MatchInvited',
        occurredOn: new Date(),
        payload: { invitedUserId: userId, matchId: sessionId, invitedById: hostId },
      });
    }

    return Result.ok();
  }
}
