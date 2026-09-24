import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';
import { addressSchema } from '../auth/address.schema.js';

// The exact commercial terms a booking was created at (docs/master-catalogue
// ARCHITECTURE §5). Frozen — never recalculated — so a later catalogue price or
// payout change can't reach an existing booking (client Test 11). Amounts are
// rupees with 2 decimals (converted from the pricing engine's paise).
const refSchema = (labelField) =>
  new mongoose.Schema({ id: String, [labelField]: String }, { _id: false });

const commercialSchema = new mongoose.Schema(
  {
    offeringId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOffering' },
    offeringCode: String,
    offeringName: String,
    bookingType: { type: String, enum: ['PRODUCT_LINKED', 'STANDALONE'] },
    category: { key: String, name: String },
    productType: { type: refSchema('name'), default: null },
    variant: { type: refSchema('label'), default: null },
    service: { type: refSchema('name'), default: null },
    pricingUnit: String,
    unitLabel: String,
    quantity: Number,
    unitPrice: Number,
    baseAmount: Number,
    discount: { code: { type: String, default: null }, amount: { type: Number, default: 0 } },
    coverage: { type: { type: String, default: null }, amount: { type: Number, default: 0 } },
    isExpress: Boolean,
    expressFee: Number,
    taxableAmount: Number,
    gstPercent: Number,
    gstAmount: Number,
    finalAmount: Number,
    coinsApplied: { type: Number, default: 0 },
    // Internal — stripped from every JSON response (see toJSON below).
    spPayoutUnit: Number,
    expressSpIncentive: Number,
    spPayoutTotal: Number,
    nccMargin: Number,
    rate: { id: String, version: Number, scope: String },
    pricedAt: Date,
  },
  { _id: false },
);

const requiredInfoAnswerSchema = new mongoose.Schema(
  { key: String, label: String, value: String },
  { _id: false },
);

/** Commercial fields customers must never receive (client Req 24). */
export const INTERNAL_COMMERCIAL_FIELDS = Object.freeze(['spPayoutUnit', 'expressSpIncentive', 'spPayoutTotal', 'nccMargin']);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The catalogue offering booked, its full commercial snapshot, and the
    // customer's answers to the offering's required-info questions.
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOffering', default: null, index: true },
    commercial: { type: commercialSchema, default: undefined },
    isExpress: { type: Boolean, default: false },
    requiredInfo: { type: [requiredInfoAnswerSchema], default: [] },
    // Denormalised from `commercial` for every existing reader (notifications,
    // service requests, partner screens): category key, product type name,
    // service {slug,name,price=unit price,unit}, quantity, totalPrice = final.
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
      enum: ['Upcoming', 'Ongoing', 'Parts Pending', 'Rescheduled', 'Completed', 'Cancelled'],
      default: 'Upcoming',
      index: true,
    },
    completionOtp: { type: String, default: () => Math.floor(1000 + Math.random() * 9000).toString() },
    // The customer's own sign-off on a spare part the technician requested,
    // before it ever reaches the super-admin approval queue — a technician
    // used to be able to add a part costing real money to the bill with the
    // customer only informed after the fact, never asked.
    partApproval: {
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected', null], default: null },
      partNames: [String],
      amount: Number,
      requestedAt: Date,
      respondedAt: Date,
    },
    serviceProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', default: null, index: true },
    isAccepted: { type: Boolean, default: false, index: true },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
    isInstant: { type: Boolean, default: false },
    instantStatus: {
      type: String,
      enum: ['SEARCHING', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'PARTS_PENDING', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: null,
    },
    instantRequestedAt: Date,
    cancellationReason: { type: String, default: null },
    // When the hunt for a service provider gives up (booking.service.js
    // expireStaleSearches). Pushed out again on reschedule; cleared on accept.
    searchExpiresAt: { type: Date, default: null, index: true },
    // Why an expired search ended, so the customer app can say the right thing.
    searchEndReason: {
      type: String,
      enum: ['NO_PROVIDERS_NEARBY', 'PROVIDERS_NOT_ACCEPTING', null],
      default: null,
    },
    cancelledAt: { type: Date, default: null },
    rescheduledAt: { type: Date, default: null },
    rescheduleReason: { type: String, default: null },
    rescheduleCount: { type: Number, default: 0 },
    providerRescheduleStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'NONE',
    },
  },
  { timestamps: true },
);

bookingSchema.index({ user: 1, status: 1, createdAt: -1 });

applyStandardPlugins(bookingSchema, { prefix: ID_PREFIXES.BOOKING });

// Payout and margin live on the booking for reporting and for the partner's
// job snapshot, but no booking response — customer, partner or admin — ever
// carries them; they're read from the document directly where needed.
const baseToJSON = bookingSchema.get('toJSON');
bookingSchema.set('toJSON', {
  ...baseToJSON,
  transform: (doc, ret, options) => {
    const shaped = baseToJSON.transform(doc, ret, options) || ret;
    if (shaped.commercial) for (const field of INTERNAL_COMMERCIAL_FIELDS) delete shaped.commercial[field];
    return shaped;
  },
});

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
