import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  bio?: string;
  contactNumber?: string;
  proficiency: number;
  eventsAttended: number;
  eventsHosted: number;
  noshows: number;
  lateCount: number;
  likesReceived: number;
  rank: string;
  followersCount: number;
  followingCount: number;
  is_verified_creator: boolean;
  notifPreferences: {
    email: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  telegramChatId?: string;
  whatsappPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 200 },
    contactNumber: { type: String },
    proficiency: { type: Number, default: 1, min: 1, max: 4 },
    eventsAttended: { type: Number, default: 0 },
    eventsHosted: { type: Number, default: 0 },
    noshows: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    likesReceived: { type: Number, default: 0 },
    rank: { type: String, default: 'Newcomer' },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    is_verified_creator: { type: Boolean, default: false },
    notifPreferences: {
      email: { type: Boolean, default: true },
      telegram: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    telegramChatId: { type: String },
    whatsappPhone: { type: String },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
