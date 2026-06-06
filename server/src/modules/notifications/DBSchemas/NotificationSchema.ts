import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: 'WaitlistPromoted' | 'MatchJoined' | 'MatchStatusChanged' | 'MatchInvited' | 'VenueApproved' | 'VenueRejected' | 'UserRegistered' | 'General';
  message: string;
  isRead: boolean;
  channel: 'in-app' | 'email' | 'telegram';
  payload?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['WaitlistPromoted', 'MatchJoined', 'MatchStatusChanged', 'MatchInvited', 'VenueApproved', 'VenueRejected', 'UserRegistered', 'General'],
      required: true,
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    channel: { type: String, enum: ['in-app', 'email', 'telegram'], default: 'in-app' },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);
