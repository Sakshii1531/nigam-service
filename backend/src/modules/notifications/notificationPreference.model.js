import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    bookingUpdates: { type: Boolean, default: true },
    whatsAppPromo: { type: Boolean, default: true },
    emailPromo: { type: Boolean, default: false },
    securityAlerts: { type: Boolean, default: true },
  },
  { timestamps: true },
);

applyStandardPlugins(notificationPreferenceSchema);

export const NotificationPreference =
  mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', notificationPreferenceSchema);
