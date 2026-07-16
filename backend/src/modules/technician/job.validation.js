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
});

const lineItemSchema = z.object({ name: z.string().min(1), price: z.number().min(0), checked: z.boolean().optional() });
const sparePartSchema = lineItemSchema.extend({
  sku: z.string().optional(),
  source: z.enum(['recommended_ai', 'manual']).optional(),
});

export const submitSparePartsSchema = z.object({
  parts: z.array(sparePartSchema).default([]),
  additionalServices: z.array(lineItemSchema).default([]),
});

export const collectPaymentSchema = z.object({
  paymentMethod: z.enum(['Card', 'UPI', 'NetBanking', 'Cash', 'Wallet']).optional(),
});
