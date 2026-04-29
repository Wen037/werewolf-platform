import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingRegistrationDocument extends Document {
  email: string;
  username: string;
  passwordHash: string;
  otp: string;
  expiresAt: Date;
}

const PendingRegistrationSchema = new Schema<IPendingRegistrationDocument>({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL: auto-delete documents when expiresAt is reached
PendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingRegistrationModel = mongoose.model<IPendingRegistrationDocument>(
  'PendingRegistration',
  PendingRegistrationSchema
);
