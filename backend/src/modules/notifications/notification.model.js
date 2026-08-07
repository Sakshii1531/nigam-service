import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const notificationSchema = new mongoose.Schema(
  {
    // Either a single recipient, or a role-wide broadcast (super-admin's push composer) — not both.
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    broadcastRole: { type: String, enum: ['All', 'Technicians', 'Brands', 'Customers'], default: null, index: true },

    type: {
      type: String,
      enum: ['assigned', 'created', 'payment', 'completed', 'jobs', 'claims', 'payments', 'service', 'tech', 'dispatch', 'promo'],
      required: true,
    },
    title: { type: String, required: true },
    message: String,
    detail: String,
    cta: { label: String, route: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

applyStandardPlugins(notificationSchema);

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
