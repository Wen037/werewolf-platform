import mongoose, { Schema, Document } from 'mongoose';

export interface IVenueInteractionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  venueId: mongoose.Types.ObjectId;
  isLiked: boolean;
  isSubscribed: boolean;
  myRating?: number;
}

const VenueInteractionSchema = new Schema<IVenueInteractionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  venueId: { type: Schema.Types.ObjectId, ref: 'PlayerSpace', required: true },
  isLiked: { type: Boolean, default: false },
  isSubscribed: { type: Boolean, default: false },
  myRating: { type: Number, min: 0, max: 5 },
});

VenueInteractionSchema.index({ userId: 1, venueId: 1 }, { unique: true });
VenueInteractionSchema.index({ userId: 1 });

export const VenueInteractionModel = mongoose.model<IVenueInteractionDocument>(
  'VenueInteraction',
  VenueInteractionSchema
);
