import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: String, enum: ['customer', 'technician', 'ai', 'agent'], required: true },
    text: String,
    attachmentUrl: String,
    // The original filename, so the chat bubble can label the attachment
    // instead of showing a bare storage URL.
    attachmentName: String,
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: 1 });

applyStandardPlugins(messageSchema);

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
