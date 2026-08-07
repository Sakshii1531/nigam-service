import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { addressSchema } from '../auth/address.schema.js';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    productType: String,
    // Snapshot of the chosen catalog service at booking time (not a live ref) — prices/desc
    // shouldn't retroactively change on a customer's existing booking if the catalog is edited later.
    service: {
      slug: String,
      name: String,
      price: Number,
      desc: String,
      unit: String,
    },
    brand: String,
    quantity: { type: Number, default: 1 },
    scheduledDate: Date,
    timeSlot: { date: String, time: String },
    address: addressSchema, // snapshot, same reasoning as `service` above
    fullName: String,
    mobile: String,
    paymentMode: { type: String, enum: ['advance', 'after'], default: 'after' },
    advanceAmount: { type: Number, default: 0 },
    // Set only once the gateway signature has verified — the advance used to be
    // recorded as an amount with nothing tracking whether it was ever collected.
    advancePaid: { type: Boolean, default: false },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
      index: true,
    },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ user: 1, status: 1, createdAt: -1 });

applyStandardPlugins(bookingSchema, { prefix: ID_PREFIXES.BOOKING });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
