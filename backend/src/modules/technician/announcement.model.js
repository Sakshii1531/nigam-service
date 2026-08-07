import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const announcementSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    severity: { type: String, enum: ['Info', 'Warning', 'Critical'], default: 'Info' },
    scope: { type: String, enum: ['all', 'city', 'role'], default: 'all' },
    // Human-readable audience for a narrowed scope, e.g. 'Delhi & NCR'. Empty
    // when scope is 'all' — the apps render 'All Regions' in that case.
    region: String,
  },
  { timestamps: true },
);

applyStandardPlugins(announcementSchema);

export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
