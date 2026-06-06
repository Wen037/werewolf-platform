import mongoose from 'mongoose';
import { MatchModel, IMatchDocument } from '../../modules/matches/DBSchemas/MatchSchema';
import { SessionInteractionModel } from '../../modules/matches/DBSchemas/SessionInteractionSchema';

interface CreateTestMatchOptions {
  hostId: string;
  venueId: string;
  maxPax?: number;
  minPax?: number;
  approvalMode?: 'open' | 'approval' | 'invite_only';
  status?: 'Open' | 'Full' | 'Started' | 'Completed' | 'Cancelled';
  extraPlayerIds?: string[];
  waitlistIds?: string[];
  scheduledAtOffset?: number; // ms from now, default +24h
}

export async function createTestMatch(opts: CreateTestMatchOptions): Promise<IMatchDocument> {
  const maxPax = opts.maxPax ?? 12;
  const minPax = opts.minPax ?? 4;
  const scheduledAt = new Date(Date.now() + (opts.scheduledAtOffset ?? 86_400_000));

  const playerIds = [opts.hostId, ...(opts.extraPlayerIds ?? [])];

  const match = await MatchModel.create({
    host_id: new mongoose.Types.ObjectId(opts.hostId),
    venue_id: new mongoose.Types.ObjectId(opts.venueId),
    title: 'Test Match',
    scheduledAt,
    config: {
      min_pax: minPax,
      max_pax: maxPax,
      game_type: 'standard',
      judge_method: 'host',
      proficiency_required: 0,
      external_pax: 0,
    },
    location: { lat: 1.3521, long: 103.8198 },
    geoLocation: { type: 'Point', coordinates: [103.8198, 1.3521] },
    status: opts.status ?? 'Open',
    approvalMode: opts.approvalMode ?? 'open',
    players: playerIds.map(id => new mongoose.Types.ObjectId(id)),
    waitlist: (opts.waitlistIds ?? []).map(id => new mongoose.Types.ObjectId(id)),
  });

  // Seed SessionInteraction for all players
  for (const uid of playerIds) {
    await SessionInteractionModel.findOneAndUpdate(
      { userId: uid, sessionId: match._id },
      { $setOnInsert: { status: 'registered' } },
      { upsert: true }
    );
  }

  return match;
}
