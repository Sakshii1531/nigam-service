import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const advertisementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['App Header Banner', 'Category Popup', 'Cart Bottom Banner'], required: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    actionUrl: { type: String, trim: true },
    buttonText: { type: String, trim: true, default: 'Learn more' },
    backgroundColor: { type: String, trim: true, default: '#0B4EA2' },
    textColor: { type: String, trim: true, default: '#FFFFFF' },
    budget: Number,
    clicks: { type: Number, default: 0 },
    status: { type: String, enum: ['Running', 'Paused'], default: 'Running', index: true },
    startsAt: { type: Date, default: null, index: true },
    endsAt: { type: Date, default: null, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(advertisementSchema);

export const Advertisement = mongoose.models.Advertisement || mongoose.model('Advertisement', advertisementSchema);
