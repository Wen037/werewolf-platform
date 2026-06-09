import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerSpaceDocument extends Document {
  owner_id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  // Privacy controls how much of the address is exposed to the public.
  // 'public' = full address shown; 'approximate' = district/area only; 'private' = area only + contact-to-visit
  privacy: 'public' | 'approximate' | 'private';
  area?: string;          // Human-readable district shown when privacy !== 'public' (e.g. "Yishun")
  description?: string;
  imageUrl?: string;
  images?: string[];      // Additional photos for the venue carousel
  wechatQrUrl?: string;  // QR code image for joining the venue's WeChat group
  socialLinks?: {         // Owner contact links shown in Contact Owner modal (PDPA-safe, text-based)
    wechatId?: string;
    telegramHandle?: string;
    facebookUrl?: string;
  };
  type: 'house' | 'work' | 'school' | 'boardgame_store' | 'other';
  location: { lat: number; long: number };
  geoLocation?: { type: 'Point'; coordinates: [number, number] };
  status: 'unVerified' | 'Verified';
  financials: { is_chargeable: boolean; approx_fee: number; price_type: 'per_person' | 'per_session' };
  openingHours?: string;
  maxPax?: number;        // Venue physical capacity (separate from per-session max_pax in Match)
  amenities: string[];
  rules?: string;
  averageRating: number;
  totalLikes: number;
  totalSubscribers: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSpaceSchema = new Schema<IPlayerSpaceDocument>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    privacy: { type: String, enum: ['public', 'approximate', 'private'], default: 'public' },
    area: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    images: [{ type: String }],
    wechatQrUrl: { type: String },
    socialLinks: {
      wechatId:        { type: String },
      telegramHandle:  { type: String },
      facebookUrl:     { type: String },
    },
    type: {
      type: String,
      enum: ['house', 'work', 'school', 'boardgame_store', 'other'],
      required: true,
    },
    location: {
      lat: { type: Number, required: true },
      long: { type: Number, required: true },
    },
    // GeoJSON point used for geospatial $near queries (Map domain).
    // Not set on old documents — sparse index skips those safely.
    geoLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },   // [lng, lat]
    },
    status: { type: String, enum: ['unVerified', 'Verified'], default: 'unVerified' },
    financials: {
      is_chargeable: { type: Boolean, default: false },
      approx_fee: { type: Number, default: 0 },
      price_type: { type: String, enum: ['per_person', 'per_session'], default: 'per_session' },
    },
    openingHours: { type: String },
    maxPax: { type: Number },
    amenities: [{ type: String }],
    rules: { type: String },
    averageRating: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalSubscribers: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PlayerSpaceSchema.index({ owner_id: 1 });
PlayerSpaceSchema.index({ geoLocation: '2dsphere' }, { sparse: true });

export const PlayerSpaceModel = mongoose.model<IPlayerSpaceDocument>('PlayerSpace', PlayerSpaceSchema);
