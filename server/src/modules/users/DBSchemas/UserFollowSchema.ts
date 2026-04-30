import mongoose, { Schema, Document } from 'mongoose';

export interface IUserFollowDocument extends Document {
  followerId: mongoose.Types.ObjectId;
  followingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const UserFollowSchema = new Schema<IUserFollowDocument>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
UserFollowSchema.index({ followingId: 1 });

export const UserFollowModel = mongoose.model<IUserFollowDocument>('UserFollow', UserFollowSchema);
