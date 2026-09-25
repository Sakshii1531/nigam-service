import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Every change to a spare part's central stock, with who did it and why
// (docs/master-catalogue Phase 21). Append-only: the Inventory detail page's
// stock history, and the answer to "where did 12 units go?".
export const STOCK_MOVEMENT_TYPES = Object.freeze(['OPENING', 'RESTOCK', 'ADJUSTMENT', 'ISSUE']);

const stockMovementSchema = new mongoose.Schema(
  {
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePartCatalog', required: true, index: true },
    type: { type: String, enum: STOCK_MOVEMENT_TYPES, required: true },
    quantity: { type: Number, required: true }, // signed: +in, −out
    stockAfter: { type: Number, required: true },
    reason: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ part: 1, createdAt: -1 });
applyStandardPlugins(stockMovementSchema);

export const SparePartStockMovement =
  mongoose.models.SparePartStockMovement || mongoose.model('SparePartStockMovement', stockMovementSchema);
