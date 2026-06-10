import mongoose, { Schema, Document } from 'mongoose';

export interface IEventComment extends Document {
  matchId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventCommentSchema = new Schema<IEventComment>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    userId:  { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    text:    { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

EventCommentSchema.index({ matchId: 1, createdAt: 1 });

export const EventCommentModel = mongoose.model<IEventComment>('EventComment', EventCommentSchema);
