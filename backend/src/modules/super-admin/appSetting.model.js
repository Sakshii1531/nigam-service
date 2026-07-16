import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Flat key/value config store per app, e.g. app='technician', key='autoAssign', value=true.
// Simple-schema/wide-rows over one giant settings blob — new toggles need no migration.
const appSettingSchema = new mongoose.Schema(
  {
    app: { type: String, enum: ['customer', 'technician'], required: true, index: true },
    key: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

appSettingSchema.index({ app: 1, key: 1 }, { unique: true });

applyStandardPlugins(appSettingSchema);

export const AppSetting = mongoose.models.AppSetting || mongoose.model('AppSetting', appSettingSchema);
