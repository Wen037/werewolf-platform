import mongoose, { Schema, Document } from 'mongoose';

export interface ISpaceComment extends Document {
  venueId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpaceCommentSchema = new Schema<ISpaceComment>(
  {
    venueId: { type: Schema.Types.ObjectId, ref: 'PlayerSpace', required: true },
    userId:  { type: Schema.Types.ObjectId, ref: 'User',        required: true },
    text:    { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

SpaceCommentSchema.index({ venueId: 1, createdAt: 1 });

export const SpaceCommentModel = mongoose.model<ISpaceComment>('SpaceComment', SpaceCommentSchema);
