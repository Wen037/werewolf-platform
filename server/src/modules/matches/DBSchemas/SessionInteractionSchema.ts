import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionInteractionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  status: 'registered' | 'attended' | 'no-show' | 'cancelled' | 'pending' | 'waitlisted';
  isLiked: boolean;
  myRating?: number;
  punctuality?: 'punctual' | 'late';
  waitlistPosition?: number;
}

const SessionInteractionSchema = new Schema<ISessionInteractionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  status: {
    type: String,
    enum: ['registered', 'attended', 'no-show', 'cancelled', 'pending', 'waitlisted'],
    default: 'registered',
  },
  isLiked: { type: Boolean, default: false },
  myRating: { type: Number, min: 0, max: 5 },
  punctuality: { type: String, enum: ['punctual', 'late'] },
  waitlistPosition: { type: Number },
});

SessionInteractionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
SessionInteractionSchema.index({ userId: 1 });
SessionInteractionSchema.index({ sessionId: 1 });

export const SessionInteractionModel = mongoose.model<ISessionInteractionDocument>(
  'SessionInteraction',
  SessionInteractionSchema
);
