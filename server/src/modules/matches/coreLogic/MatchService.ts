import mongoose from 'mongoose';
import { Result } from '../../../shared/core/Result';
import { eventBus } from '../../../shared/infra/EventBus';
import { MatchModel, IMatchDocument } from '../DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../DBSchemas/SessionInteractionSchema';
import { MatchInviteModel } from '../DBSchemas/MatchInviteSchema';
import { NotificationModel } from '../../notifications/DBSchemas/NotificationSchema';
import { UserModel } from '../../users/DBSchemas/UserSchema';
import { PlayerSpaceModel, IPlayerSpaceDocument } from '../../player-spaces/DBSchemas/PlayerSpaceSchema';
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
  UpdateSessionDTO,
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

  // Collect up to 5 player IDs per doc for avatar previews
  const previewPlayerIds = [...new Set(docs.flatMap(d => d.players.slice(0, 5).map(p => p.toString())))];

  const [hosts, venues, playerUsers] = await Promise.all([
    UserModel.find({ _id: { $in: hostIds } }, 'username'),
    PlayerSpaceModel.find({ _id: { $in: venueIds } }, 'name imageUrl'),
    UserModel.find({ _id: { $in: previewPlayerIds } }, 'avatarUrl'),
  ]);

  const hostMap = new Map(hosts.map(h => [h._id.toString(), h.username]));
  const venueMap = new Map(venues.map(v => [v._id.toString(), v.name]));
  const venueImageMap = new Map(venues.map(v => [v._id.toString(), (v as unknown as { imageUrl?: string }).imageUrl]));
  const playerAvatarMap = new Map(playerUsers.map(u => [u._id.toString(), u.avatarUrl]));

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
    description: d.description,
    date: d.scheduledAt.toISOString(),
    maxPlayers: d.config.max_pax,
    currentPlayers: d.players.length + (d.guests?.length ?? 0) + (d.config.external_pax ?? 0),
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
    approvalMode: d.approvalMode ?? 'approval',
    venueApprovalStatus: d.venueApprovalStatus ?? 'pending',
    groupLink: d.groupLink,
    groupType: d.groupType,
    guests: (d.guests ?? []).map(g => ({
      name: g.name,
      addedBy: g.addedBy.toString(),
      addedAt: g.addedAt.toISOString(),
    })),
    joinedPlayerAvatars: d.players.slice(0, 5)
      .map(p => playerAvatarMap.get(p.toString()))
      .filter((a): a is string => !!a),
    joinedPlayerIds: d.players.slice(0, 5).map(p => p.toString()),
    isPinned: d.isPinned ?? false,
    venueImageUrl: venueImageMap.get(d.venue_id.toString()),
    myInteraction: interactionMap.get(d._id.toString()),
  }));
}

export class MatchService {
  async getActiveMatches(requestingUserId?: string): Promise<GameSessionResponseDTO[]> {
    const docs = await MatchModel.find({
      status: { $in: ['Open', 'Full', 'Started'] },
    }).sort({ isPinned: -1, scheduledAt: 1 }) as MatchDoc[];

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

    // Auto-confirm venue approval when:
    //  (a) the host IS the venue owner — hosting in their own space needs no approval
    //  (b) the venue is a public/institutional type (school, boardgame_store) — open spaces
    const PUBLIC_VENUE_TYPES: IPlayerSpaceDocument['type'][] = ['school', 'boardgame_store'];
    const isVenueOwner  = venue.owner_id.toString() === hostId;
    const isPublicVenue = PUBLIC_VENUE_TYPES.includes(venue.type);
    const venueApprovalStatus = (isVenueOwner || isPublicVenue) ? 'confirmed' : 'pending';

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
      geoLocation: {
        type: 'Point',
        coordinates: [venue.location.long, venue.location.lat],  // GeoJSON: [lng, lat]
      },
      ...(dto.approvalMode !== undefined && { approvalMode: dto.approvalMode }),
      venueApprovalStatus,
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
  ): Promise<Result<{ wasWaitlisted: boolean; waitlistPosition: number | undefined; status?: string }>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.status === 'Cancelled' || doc.status === 'Completed' || doc.status === 'Started') {
      return Result.fail(`Cannot join a match with status: ${doc.status}`);
    }

    // invite_only: user must have a pending invite
    if (doc.approvalMode === 'invite_only') {
      const invite = await MatchInviteModel.findOne({
        matchId: sessionId,
        invitedUserId: userId,
        status: 'pending',
      });
      if (!invite) return Result.fail('This event is invite-only.');
    }

    // approval mode: queue as pending applicant, don't add to players[]
    if (doc.approvalMode === 'approval') {
      const existing = await SessionInteractionModel.findOne({ userId, sessionId });
      if (existing && existing.status !== 'cancelled') {
        return Result.fail('You have already applied or are registered.');
      }
      await SessionInteractionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { status: 'pending' } },
        { upsert: true }
      );
      return Result.ok({ wasWaitlisted: false, waitlistPosition: undefined, status: 'pending' });
    }

    // Atomic slot claim (CWE-362 fix): the $expr condition and $push execute in a
    // single round-trip. If two requests race for the last slot, MongoDB guarantees
    // only one write succeeds; the other gets null back and falls through to waitlist.
    const slotClaimed = await MatchModel.findOneAndUpdate(
      {
        _id: sessionId,
        status: { $nin: ['Cancelled', 'Completed', 'Started'] },
        $expr: { $lt: [{ $size: '$players' }, '$config.max_pax'] },
        players:  { $nin: [userId] },
        waitlist: { $nin: [userId] },
      },
      { $push: { players: userId } },
      { new: true }
    ) as MatchDoc | null;

    if (slotClaimed) {
      // Slot won — update status to Full if this push reached max capacity
      if (slotClaimed.players.length >= slotClaimed.config.max_pax && slotClaimed.status === 'Open') {
        await MatchModel.findByIdAndUpdate(sessionId, { $set: { status: 'Full' } });
      }
      await SessionInteractionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { status: 'registered' } },
        { upsert: true }
      );
      eventBus.publish({
        eventName: 'UserJoinedMatch',
        occurredOn: new Date(),
        payload: { userId, matchId: sessionId },
      });
      return Result.ok({ wasWaitlisted: false, waitlistPosition: undefined });
    }

    // Slot was not claimed — determine why
    const freshDoc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!freshDoc) return Result.fail('Match not found.');

    const alreadyIn = freshDoc.players.some(p => p.toString() === userId)
      || freshDoc.waitlist.some(w => w.toString() === userId);
    if (alreadyIn) return Result.fail('User already joined or on waitlist.');

    // Match is genuinely full — add to waitlist
    const updatedDoc = await MatchModel.findByIdAndUpdate(
      sessionId,
      { $push: { waitlist: userId } },
      { new: true }
    ) as MatchDoc | null;
    const waitlistPosition = updatedDoc
      ? updatedDoc.waitlist.findIndex(w => w.toString() === userId) + 1
      : freshDoc.waitlist.length + 1;

    await SessionInteractionModel.findOneAndUpdate(
      { userId, sessionId },
      { $set: { status: 'waitlisted', waitlistPosition } },
      { upsert: true }
    );
    eventBus.publish({
      eventName: 'UserJoinedMatch',
      occurredOn: new Date(),
      payload: { userId, matchId: sessionId },
    });
    return Result.ok({ wasWaitlisted: true, waitlistPosition });
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
      // Use a MongoDB session/transaction so the two-step $pull + $push are atomic.
      // In test mode (standalone mongod) transactions are not supported — we skip the session
      // but the operations still execute sequentially and are correct for single-threaded tests.
      const useTransaction = process.env.NODE_ENV !== 'test';
      let session: mongoose.ClientSession | undefined;

      try {
        if (useTransaction) {
          session = await mongoose.startSession();
          session.startTransaction();
        }
        const opts = session ? { session } : {};

        // Step 1: remove leaving player from players[], remove promoted user from waitlist[]
        await MatchModel.findByIdAndUpdate(sessionId, {
          $pull: { players: userId, waitlist: promotedUserId },
          $set: { status: newStatus },
        }, opts);
        // Step 2: add promoted user to players[] (cannot combine $pull + $push on same field)
        await MatchModel.findByIdAndUpdate(sessionId, {
          $push: { players: promotedUserId },
        }, opts);
        // Step 3: update promoted user's interaction record
        await SessionInteractionModel.findOneAndUpdate(
          { userId: promotedUserId, sessionId },
          { $set: { status: 'registered' }, $unset: { waitlistPosition: '' } },
          { ...opts, upsert: false }
        );

        if (session) await session.commitTransaction();
      } catch (err) {
        if (session) await session.abortTransaction();
        console.error('[MatchService.leaveMatch] transaction failed:', err);
        return Result.fail('Failed to process leave. Please try again.');
      } finally {
        if (session) await session.endSession();
      }

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

  async getRoster(sessionId: string, requesterId: string): Promise<Result<unknown>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== requesterId) return Result.fail('Only the host can view the roster.');

    const allUserIds = [
      ...doc.players.map(p => p.toString()),
      ...doc.waitlist.map(w => w.toString()),
    ];

    const [users, interactions] = await Promise.all([
      UserModel.find({ _id: { $in: allUserIds } }, 'username avatarUrl creditScore role'),
      SessionInteractionModel.find({ sessionId }),
    ]);

    const interactionMap = new Map(interactions.map(i => [i.userId.toString(), i]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // pending applicants (approval mode)
    const pendingInteractions = interactions.filter(i => i.status === 'pending');
    const pendingUserIds = pendingInteractions.map(i => i.userId.toString());
    const pendingUsers = await UserModel.find(
      { _id: { $in: pendingUserIds } },
      'username avatarUrl creditScore role'
    );
    const pendingUserMap = new Map(pendingUsers.map(u => [u._id.toString(), u]));

    const roster = allUserIds.map(uid => {
      const user = userMap.get(uid);
      const interaction = interactionMap.get(uid);
      return {
        userId: uid,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
        creditScore: user?.creditScore,
        role: user?.role,
        interactionStatus: interaction?.status ?? 'registered',
        punctuality: interaction?.punctuality,
        isWaitlisted: doc.waitlist.some(w => w.toString() === uid),
        waitlistPosition: interaction?.waitlistPosition,
      };
    });

    const pending = pendingUserIds.map(uid => {
      const user = pendingUserMap.get(uid);
      return {
        userId: uid,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
        creditScore: user?.creditScore,
        role: user?.role,
        interactionStatus: 'pending',
        isWaitlisted: false,
        waitlistPosition: undefined,
      };
    });

    return Result.ok({ roster, pending, guests: doc.guests });
  }

  async kickPlayer(sessionId: string, hostId: string, targetUserId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can kick players.');
    if (targetUserId === hostId) return Result.fail('Host cannot kick themselves.');

    await MatchModel.findByIdAndUpdate(sessionId, {
      $pull: { players: targetUserId, waitlist: targetUserId },
    });
    await SessionInteractionModel.findOneAndUpdate(
      { userId: targetUserId, sessionId },
      { $set: { status: 'cancelled' } }
    );
    await UserModel.findByIdAndUpdate(targetUserId, { $inc: { creditScore: -0.5 } });

    return Result.ok();
  }

  async addGuest(sessionId: string, hostId: string, name: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can add guests.');

    await MatchModel.findByIdAndUpdate(sessionId, {
      $push: { guests: { name, addedBy: hostId, addedAt: new Date() } },
    });
    return Result.ok();
  }

  async removeGuest(sessionId: string, hostId: string, index: number): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can remove guests.');
    if (index < 0 || index >= doc.guests.length) return Result.fail('Invalid guest index.');

    // Remove by index: unset then pull null
    const unsetKey = `guests.${index}`;
    await MatchModel.findByIdAndUpdate(sessionId, { $unset: { [unsetKey]: 1 } });
    await MatchModel.findByIdAndUpdate(sessionId, { $pull: { guests: null } });
    return Result.ok();
  }

  async messagePlayer(
    sessionId: string,
    hostId: string,
    targetUserId: string,
    message: string
  ): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can message players.');

    await NotificationModel.create({
      recipientId: targetUserId,
      type: 'General',
      message,
      channel: 'in-app',
      payload: { matchId: sessionId, fromHostId: hostId },
    });
    return Result.ok();
  }

  async notifyAll(sessionId: string, hostId: string, message: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can send notifications.');

    const recipientIds = doc.players
      .map(p => p.toString())
      .filter(id => id !== hostId);

    await NotificationModel.insertMany(
      recipientIds.map(recipientId => ({
        recipientId,
        type: 'General',
        message,
        channel: 'in-app',
        payload: { matchId: sessionId, fromHostId: hostId },
      }))
    );
    return Result.ok();
  }

  async updateSession(
    sessionId: string,
    hostId: string,
    dto: UpdateSessionDTO
  ): Promise<Result<GameSessionResponseDTO>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can update this session.');

    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update['title'] = dto.title;
    if (dto.description !== undefined) update['description'] = dto.description;
    if (dto.scheduledAt !== undefined) update['scheduledAt'] = new Date(dto.scheduledAt);
    if (dto.max_pax !== undefined) update['config.max_pax'] = dto.max_pax;
    if (dto.min_pax !== undefined) update['config.min_pax'] = dto.min_pax;
    if (dto.proficiency_required !== undefined) update['config.proficiency_required'] = dto.proficiency_required;
    if (dto.game_type !== undefined) update['config.game_type'] = dto.game_type;
    if (dto.judge_method !== undefined) update['config.judge_method'] = dto.judge_method;
    if (dto.approvalMode !== undefined) update['approvalMode'] = dto.approvalMode;
    if (dto.groupLink !== undefined) update['groupLink'] = dto.groupLink;
    if (dto.groupType !== undefined) update['groupType'] = dto.groupType;

    const updated = await MatchModel.findByIdAndUpdate(
      sessionId,
      { $set: update },
      { new: true }
    ) as MatchDoc | null;
    if (!updated) return Result.fail('Match not found after update.');

    const results = await enrichWithNamesAndInteraction([updated], hostId);
    const result = results[0];
    if (!result) return Result.fail('Failed to fetch updated match.');
    return Result.ok(result);
  }

  async approveApplicant(sessionId: string, hostId: string, userId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can approve applicants.');

    const interaction = await SessionInteractionModel.findOne({ userId, sessionId });
    if (!interaction || interaction.status !== 'pending') {
      return Result.fail('No pending application found for this user.');
    }

    // Check capacity
    if (doc.players.length >= doc.config.max_pax) {
      // Add to waitlist instead
      await MatchModel.findByIdAndUpdate(sessionId, { $push: { waitlist: userId } });
      await SessionInteractionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { status: 'waitlisted', waitlistPosition: doc.waitlist.length + 1 } }
      );
    } else {
      await MatchModel.findByIdAndUpdate(sessionId, { $push: { players: userId } });
      await SessionInteractionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { status: 'registered' }, $unset: { waitlistPosition: '' } }
      );
    }

    await NotificationModel.create({
      recipientId: userId,
      type: 'MatchJoined',
      message: `Your request to join "${doc.title}" has been approved.`,
      channel: 'in-app',
      payload: { matchId: sessionId },
    });

    return Result.ok();
  }

  async rejectApplicant(sessionId: string, hostId: string, userId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can reject applicants.');

    await SessionInteractionModel.findOneAndUpdate(
      { userId, sessionId },
      { $set: { status: 'cancelled' } }
    );

    await NotificationModel.create({
      recipientId: userId,
      type: 'General',
      message: `Your request to join "${doc.title}" was not accepted.`,
      channel: 'in-app',
      payload: { matchId: sessionId },
    });

    return Result.ok();
  }

  async cancelWithPenalty(sessionId: string, hostId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== hostId) return Result.fail('Only the host can cancel this session.');
    if (doc.status === 'Cancelled' || doc.status === 'Completed') {
      return Result.fail('Session is already finished.');
    }

    const hoursUntil = (doc.scheduledAt.getTime() - Date.now()) / 3_600_000;
    let penalty = 0;
    if (hoursUntil >= 9) penalty = -1.5;
    else if (hoursUntil >= 5) penalty = -1;
    else if (hoursUntil >= 3) penalty = -0.5;
    // 0-2 hours: no penalty

    if (penalty < 0) {
      await UserModel.findByIdAndUpdate(hostId, { $inc: { creditScore: penalty } });
    }

    await MatchModel.findByIdAndUpdate(sessionId, {
      $set: { status: 'Cancelled', cancelledAt: new Date() },
    });
    await SessionInteractionModel.updateMany({ sessionId }, { $set: { status: 'cancelled' } });

    eventBus.publish({
      eventName: 'MatchStatusChanged',
      occurredOn: new Date(),
      payload: { matchId: sessionId, newStatus: 'Cancelled', hostId },
    });

    return Result.ok();
  }

  async approveVenueSession(sessionId: string, venueOwnerId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');

    const venue = await PlayerSpaceModel.findById(doc.venue_id);
    if (!venue) return Result.fail('Venue not found.');
    if (venue.owner_id.toString() !== venueOwnerId) {
      return Result.fail('Only the venue owner can approve sessions.');
    }

    await MatchModel.findByIdAndUpdate(sessionId, {
      $set: { venueApprovalStatus: 'confirmed' },
    });

    await NotificationModel.create({
      recipientId: doc.host_id.toString(),
      type: 'General',
      message: `Your session "${doc.title}" has been approved by the venue.`,
      channel: 'in-app',
      payload: { matchId: sessionId },
    });

    return Result.ok();
  }

  /**
   * Permanently delete a match. Only the host may delete it.
   * Can only be deleted when status is 'Open' or 'Cancelled'.
   */
  async deleteMatch(sessionId: string, requesterId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');
    if (doc.host_id.toString() !== requesterId) return Result.fail('Only the host can delete this event.');
    if (doc.status !== 'Open' && doc.status !== 'Cancelled') {
      return Result.fail(`Cannot delete a match with status: ${doc.status}. Only Open or Cancelled matches can be deleted.`);
    }

    await MatchModel.findByIdAndDelete(sessionId);
    await SessionInteractionModel.deleteMany({ sessionId });

    return Result.ok();
  }

  async rejectVenueSession(sessionId: string, venueOwnerId: string): Promise<Result<void>> {
    const doc = await MatchModel.findById(sessionId) as MatchDoc | null;
    if (!doc) return Result.fail('Match not found.');

    const venue = await PlayerSpaceModel.findById(doc.venue_id);
    if (!venue) return Result.fail('Venue not found.');
    if (venue.owner_id.toString() !== venueOwnerId) {
      return Result.fail('Only the venue owner can reject sessions.');
    }

    await MatchModel.findByIdAndUpdate(sessionId, {
      $set: { venueApprovalStatus: 'rejected' },
    });

    await NotificationModel.create({
      recipientId: doc.host_id.toString(),
      type: 'General',
      message: `Your session "${doc.title}" was not approved by the venue.`,
      channel: 'in-app',
      payload: { matchId: sessionId },
    });

    return Result.ok();
  }

  /**
   * Admin-only: toggle the pin status of a match.
   * Pinned matches always appear first in the active matches listing.
   */
  async pinMatch(sessionId: string, adminId: string): Promise<Result<{ isPinned: boolean }>> {
    const requestingUser = await UserModel.findById(adminId, 'role');
    if (!requestingUser || !['admin', 'web_admin'].includes(requestingUser.role ?? '')) {
      return Result.fail('Forbidden: admin access required.');
    }

    const doc = await MatchModel.findById(sessionId);
    if (!doc) return Result.fail('Match not found.');

    const newPinned = !doc.isPinned;
    await MatchModel.findByIdAndUpdate(sessionId, { $set: { isPinned: newPinned } });
    return Result.ok({ isPinned: newPinned });
  }
}
