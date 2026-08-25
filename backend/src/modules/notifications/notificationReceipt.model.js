import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Per-user read state for a BROADCAST notification.
//
// A personally-addressed notification carries its own `read` flag, which works
// because it has exactly one reader. A broadcast has many, and the single
// shared flag on the document cannot represent "read by this technician, still
// unread for that one" — marking it read for one recipient would clear it for
// the entire role at once. That was a documented gap for as long as
// role-targeted broadcasts were invisible in every inbox; once they actually
// reach people, it becomes a visible bug.
//
// One row per (user, notification) pair, written the first time that user reads
// that broadcast. No row means unread — so this collection only ever grows by
// what people actually read, not by audience size.
const notificationReceiptSchema = new mongoose.Schema(
  {
    notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Unique so a double-tap on "mark read" is idempotent rather than duplicating
// rows; also the index the inbox aggregation's $lookup joins on.
notificationReceiptSchema.index({ user: 1, notification: 1 }, { unique: true });

applyStandardPlugins(notificationReceiptSchema);

export const NotificationReceipt =
  mongoose.models.NotificationReceipt || mongoose.model('NotificationReceipt', notificationReceiptSchema);
