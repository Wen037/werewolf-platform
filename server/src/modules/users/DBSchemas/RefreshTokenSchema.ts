import mongoose, { Schema, Document } from 'mongoose';

/**
 * Rotating refresh tokens (one document per issued token).
 * - Only the SHA-256 hash is stored — a DB leak does not expose usable tokens.
 * - Rotation: each use revokes the old token and issues a new one (replacedByHash).
 * - Reuse detection: presenting an already-revoked token means the token was
 *   stolen (or replayed) — the whole user's token family is revoked.
 */
export interface IRefreshTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByHash?: string;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByHash: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL: drop tokens once expired (revoked ones linger until expiry for reuse detection)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model<IRefreshTokenDocument>(
  'RefreshToken',
  RefreshTokenSchema
);
