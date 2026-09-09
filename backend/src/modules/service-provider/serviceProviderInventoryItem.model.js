import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const serviceProviderInventoryItemSchema = new mongoose.Schema(
  {
    serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true, index: true },
    name: { type: String, required: true },
    sku: String,
    qty: { type: Number, default: 0 },
    price: Number,
  },
  { timestamps: true },
);

// status (In/Low/Out of Stock) is derived from qty at read time (0 / 1 / >1 thresholds
// per the frontend's Inventory.jsx), not stored — avoids it drifting out of sync with qty.
serviceProviderInventoryItemSchema.virtual('status').get(function status() {
  if (this.qty <= 0) return 'Out of Stock';
  if (this.qty === 1) return 'Low Stock';
  return 'In Stock';
});

applyStandardPlugins(serviceProviderInventoryItemSchema, { prefix: ID_PREFIXES.SKU });

export const ServiceProviderInventoryItem = mongoose.models.ServiceProviderInventoryItem || mongoose.model('ServiceProviderInventoryItem', serviceProviderInventoryItemSchema);
