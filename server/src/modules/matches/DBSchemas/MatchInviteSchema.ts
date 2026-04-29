import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchInviteDocument extends Document {
  matchId: mongoose.Types.ObjectId;
  invitedById: mongoose.Types.ObjectId;
  invitedUserId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

const MatchInviteSchema = new Schema<IMatchInviteDocument>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MatchInviteSchema.index({ matchId: 1, invitedUserId: 1 }, { unique: true });
MatchInviteSchema.index({ invitedUserId: 1, status: 1 });

export const MatchInviteModel = mongoose.model<IMatchInviteDocument>('MatchInvite', MatchInviteSchema);
