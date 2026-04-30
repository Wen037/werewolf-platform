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
  status: 'Created' | 'Open' | 'Full' | 'Started' | 'Completed' | 'Cancelled';
  players: mongoose.Types.ObjectId[];
  waitlist: mongoose.Types.ObjectId[];
  // Non-registered attendees (friends of host who don't have accounts)
  guests: IMatchGuest[];
  totalLikes: number;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatchDocument>(
  {
    host_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    venue_id: { type: Schema.Types.ObjectId, ref: 'PlayerSpace', required: true },
    title: { type: String, required: true, trim: true },
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
    status: {
      type: String,
      enum: ['Created', 'Open', 'Full', 'Started', 'Completed', 'Cancelled'],
      default: 'Open',
    },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    waitlist: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    guests: [{
      name: { type: String, required: true },
      addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      addedAt: { type: Date, default: Date.now },
    }],
    totalLikes: { type: Number, default: 0 },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

MatchSchema.index({ status: 1, scheduledAt: 1 });
MatchSchema.index({ host_id: 1, createdAt: -1 });

export const MatchModel = mongoose.model<IMatchDocument>('Match', MatchSchema);
