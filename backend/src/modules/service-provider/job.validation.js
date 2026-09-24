import { z } from 'zod';

export const serviceRequestIdParamSchema = z.object({ serviceRequestId: z.string().min(1) });
export const jobIdParamSchema = z.object({ id: z.string().min(1) });

export const acceptJobSchema = z.object({
  type: z.enum(['NCC Paid Service', 'Brand Warranty', 'NCC Extended Warranty', 'AMC Visit']).optional(),
  amcSubscriptionId: z.string().optional(),
  extendedWarrantyOrderId: z.string().optional(),
});

export const submitDiagnosisSchema = z.object({
  checklistActions: z.record(z.string(), z.boolean()).optional(),
  notes: z.string().optional(),
  photos: z.object({ product: z.string().optional(), serial: z.string().optional(), issue: z.string().optional() }).optional(),
  // The technician's own on-site warranty check — e.g. from a physical warranty
  // card or invoice the customer produces — which can override the system's
  // computed guess (itself only ever a default when no purchase date/AMC/EW is
  // on record for this appliance).
  warrantyCheck: z.enum(['In Warranty', 'Out of Warranty']).optional(),
});

const lineItemSchema = z.object({ name: z.string().min(1), price: z.number().min(0), checked: z.boolean().optional() });
const sparePartSchema = lineItemSchema.extend({
  sku: z.string().optional(),
  source: z.enum(['recommended_ai', 'manual']).optional(),
});

// Extra work is added from the Master Catalogue (addJobAddOnSchema), not as
// free text here — an `additionalServices` field is ignored (stripped).
export const submitSparePartsSchema = z.object({
  parts: z.array(sparePartSchema).default([]),
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const addOnOfferingsQuerySchema = z.object({ category: z.string().trim().min(1).max(80).optional() });

export const addJobAddOnSchema = z.object({
  offeringId: objectId,
  quantity: z.coerce.number().int().positive().default(1),
});

export const jobAddOnParamSchema = z.object({ id: z.string().min(1), addOnId: objectId });

export const collectPaymentSchema = z.object({
  paymentMethod: z.enum(['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet', 'Online']).optional(),
  otp: z.union([z.string(), z.number()]).optional(),
  signatureUrl: z.string().nullable().optional(),
});

export const requestPartSchema = z.object({
  partName: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
  qty: z.number().int().positive().default(1),
  orderSource: z.enum(['NCC Warehouse', 'Partner Brand', 'Nearby Store']).default('NCC Warehouse'),
  fulfillmentType: z.enum(['in_stock', 'procurement']).optional(),
  parts: z.array(sparePartSchema).optional(),
  notes: z.string().optional(),
});

export const verifyJobPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
