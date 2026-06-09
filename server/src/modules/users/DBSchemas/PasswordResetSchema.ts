import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordResetDocument extends Document {
  email: string;
  token: string;
  expiresAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordResetDocument>({
  email: { type: String, required: true, unique: true, lowercase: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetModel = mongoose.model<IPasswordResetDocument>(
  'PasswordReset',
  PasswordResetSchema
);
