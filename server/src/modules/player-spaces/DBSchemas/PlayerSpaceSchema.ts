import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerSpaceDocument extends Document {
  owner_id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  description?: string;
  imageUrl?: string;
  type: 'house' | 'work' | 'school' | 'boardgame_store' | 'other';
  location: { lat: number; long: number };
  status: 'unVerified' | 'Verified';
  financials: { is_chargeable: boolean; approx_fee: number };
  amenities: string[];
  rules?: string;
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSpaceSchema = new Schema<IPlayerSpaceDocument>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    type: {
      type: String,
      enum: ['house', 'work', 'school', 'boardgame_store', 'other'],
      required: true,
    },
    location: {
      lat: { type: Number, required: true },
      long: { type: Number, required: true },
    },
    status: { type: String, enum: ['unVerified', 'Verified'], default: 'unVerified' },
    financials: {
      is_chargeable: { type: Boolean, default: false },
      approx_fee: { type: Number, default: 0 },
    },
    amenities: [{ type: String }],
    rules: { type: String },
    averageRating: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalSubscribers: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PlayerSpaceSchema.index({ owner_id: 1 });

export const PlayerSpaceModel = mongoose.model<IPlayerSpaceDocument>('PlayerSpace', PlayerSpaceSchema);
