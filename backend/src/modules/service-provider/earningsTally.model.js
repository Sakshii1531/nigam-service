import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// One doc per technician — a running cache updated whenever a Payout settles,
// so the dashboard doesn't have to aggregate the Payout collection on every render.
const earningsTallySchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, unique: true },
    today: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    completedToday: { type: Number, default: 0 },
    completedTotal: { type: Number, default: 0 },
    lastResetAt: { type: Date, default: Date.now }, // `today`/`completedToday` zeroed by a daily cron (Phase 6 `src/jobs/`)
  },
  { timestamps: true },
);

applyStandardPlugins(earningsTallySchema);

export const EarningsTally = mongoose.models.EarningsTally || mongoose.model('EarningsTally', earningsTallySchema);
