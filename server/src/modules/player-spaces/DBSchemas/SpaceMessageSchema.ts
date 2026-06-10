import mongoose, { Schema, Document } from 'mongoose';

export interface ISpaceMessageDocument extends Document {
  venue_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
}

const SpaceMessageSchemaDefinition = new Schema<ISpaceMessageDocument>(
  {
    venue_id:  { type: Schema.Types.ObjectId, ref: 'PlayerSpace', required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User',        required: true },
    message:   { type: String, required: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One message per user per venue
SpaceMessageSchemaDefinition.index({ venue_id: 1, sender_id: 1 }, { unique: true });

export const SpaceMessageModel = mongoose.model<ISpaceMessageDocument>('SpaceMessage', SpaceMessageSchemaDefinition);
