import mongoose, { Schema, Document } from 'mongoose';

// Unregistered friends invited by the host — tracked by name, not user account
export interface IMatchGuest {
  name: string;
  addedBy: mongoose.Types.ObjectId; // host or co-host who added them
  addedAt: Date;
}

export interface IMatchDocument extends Document {
  host_id: mongoose.Types.ObjectId;
  venue_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
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
  geoLocation?: { type: 'Point'; coordinates: [number, number] };
  status: 'Created' | 'Open' | 'Full' | 'Started' | 'Completed' | 'Cancelled';
  approvalMode: 'open' | 'approval' | 'invite_only';
  venueApprovalStatus: 'pending' | 'confirmed' | 'rejected';
  groupLink?: string;
  groupType?: 'telegram' | 'whatsapp' | 'wechat' | 'facebook';
  players: mongoose.Types.ObjectId[];
  waitlist: mongoose.Types.ObjectId[];
  guests: IMatchGuest[];
  totalLikes: number;
  isPinned: boolean;
  cancelledAt?: Date;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  recap?: { text?: string };
  commentsLocked: boolean;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatchDocument>(
  {
    host_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'PlayerSpace', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    scheduledAt: { type: Date, required: true },
    config: {
      min_pax: { type: Number, required: true },
      max_pax: { type: Number, required: true },
      game_type: { type: String, default: 'standard' },
      judge_method: { type: String, default: 'host' },
      proficiency_required: { type: Number, default: 0 },
      external_pax: { type: Number, default: 0 },
    },
    location: {
      lat: { type: Number, required: true },
      long: { type: Number, required: true },
    },
    // GeoJSON point used for geospatial $near queries (Map domain).
    // Not set on old documents — sparse index skips those safely.
    geoLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },   // [lng, lat]
    },
    status: {
      type: String,
      enum: ['Created', 'Open', 'Full', 'Started', 'Completed', 'Cancelled'],
      default: 'Open',
    },
    approvalMode: {
      type: String,
      enum: ['open', 'approval', 'invite_only'],
      default: 'approval',
    },
    venueApprovalStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending',
    },
    groupLink: { type: String },
    groupType: {
      type: String,
      enum: ['telegram', 'whatsapp', 'wechat', 'facebook'],
    },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    waitlist: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    guests: [{
      name: { type: String, required: true },
      addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      addedAt: { type: Date, default: Date.now },
    }],
    totalLikes: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    recurrence: {
      type: String,
      enum: ['none', 'weekly', 'biweekly', 'monthly'],
      default: 'none',
    },
    recap: {
      text: { type: String, maxlength: 2000 },
    },
    commentsLocked: { type: Boolean, default: false },
    // Set once the 24h reminder email has gone out — prevents the hourly cron
    // from re-sending while the match is still inside the 23-25h window
    reminderSentAt: { type: Date },
  },
  { timestamps: true }
);

MatchSchema.index({ status: 1, scheduledAt: 1 });
MatchSchema.index({ host_id: 1, createdAt: -1 });
MatchSchema.index({ geoLocation: '2dsphere' }, { sparse: true });

export const MatchModel = mongoose.model<IMatchDocument>('Match', MatchSchema);
