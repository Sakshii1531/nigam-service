import { z } from 'zod';
import { BOOKING_TYPES, PRICING_UNITS, REQUIRED_INFO_TYPES, OFFERING_CODE_PATTERN } from './serviceOffering.model.js';

// Super-admin Master Catalogue request shapes. Amounts are rupees (converted
// to paise in the service). No defaults here — a partial update must never
// inject a default over a stored value.

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const nullableId = objectId.nullable();
const rupees = z.coerce.number().nonnegative().max(10_000_000);
const text = (max = 200) => z.string().trim().max(max);
const dimension = z.object({ key: text(40).min(1), label: text(60).min(1) }).nullable();
const boolFromQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const idParamSchema = z.object({ id: objectId });
export const statusSchema = z.object({ isActive: z.boolean() });

// ─── Categories ──────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  key: text(60).min(1),
  name: text(80).min(1),
  icon: z.string().max(500).optional(),
  color: text(20).optional(),
  lightBg: text(20).optional(),
  categoryNote: text(500).optional(),
  groups: z.array(text(40)).optional(),
  section: text(80).optional(),
  keywords: z.array(text(60)).optional(),
  isActive: z.boolean().optional(),
});
export const updateCategorySchema = createCategorySchema.omit({ key: true }).partial().strict();

// ─── Product types / services / variants ─────────────────────────────────
export const createProductTypeSchema = z.object({
  category: objectId,
  name: text(80).min(1),
  slug: text(60).optional(),
  icon: z.string().max(500).optional(),
  desc: text(300).optional(),
  variantDimension: dimension.optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const updateProductTypeSchema = createProductTypeSchema.omit({ category: true, slug: true }).partial().strict();

export const createServiceSchema = z.object({
  category: objectId,
  name: text(80).min(1),
  slug: text(60).optional(),
  icon: z.string().max(500).optional(),
  desc: text(300).optional(),
  keywords: z.array(text(60)).optional(),
  optionDimension: dimension.optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const updateServiceSchema = createServiceSchema.omit({ category: true, slug: true }).partial().strict();

export const createVariantSchema = z
  .object({
    productType: objectId.optional(),
    service: objectId.optional(),
    label: text(60).min(1),
    slug: text(60).optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .refine((v) => Boolean(v.productType) !== Boolean(v.service), { message: 'Give exactly one of productType or service' });
export const updateVariantSchema = z
  .object({ label: text(60).min(1), sortOrder: z.coerce.number().int(), isActive: z.boolean() })
  .partial()
  .strict();

// ─── Offerings ───────────────────────────────────────────────────────────
const offeringContentSchema = z.object({
  name: text(120).min(1),
  pricingUnit: z.enum(PRICING_UNITS),
  unitLabel: text(40),
  minQty: z.coerce.number().int().min(1),
  maxQty: z.coerce.number().int().min(1),
  express: z.object({ enabled: z.boolean() }),
  tax: z.object({ gstPercent: z.coerce.number().min(0).max(100).nullable(), sacCode: text(20) }).partial(),
  estimatedDurationMins: z.coerce.number().int().min(0).nullable(),
  description: text(2000),
  included: z.array(text(200)),
  excluded: z.array(text(200)),
  customerInstructions: text(2000),
  requiredInfo: z.array(
    z.object({
      key: text(40).min(1),
      label: text(120).min(1),
      type: z.enum(REQUIRED_INFO_TYPES),
      options: z.array(text(80)).optional(),
      required: z.boolean().optional(),
    }),
  ),
  internalNotes: text(2000),
  displayOrder: z.coerce.number().int(),
  serviceability: z.object({ mode: z.enum(['ALL', 'CITIES']), cities: z.array(text(80)) }),
  availableFrom: z.coerce.date().nullable(),
  availableUntil: z.coerce.date().nullable(),
  keywords: z.array(text(60)),
});

const initialRateSchema = z.object({
  customerPrice: rupees,
  spPayout: rupees,
  expressFee: rupees.optional(),
  expressSpIncentive: rupees.optional(),
  effectiveFrom: z.coerce.date().optional(),
  reason: text(300).optional(),
});

export const createOfferingSchema = offeringContentSchema.partial().extend({
  name: text(120).min(1),
  code: z.string().trim().toUpperCase().regex(OFFERING_CODE_PATTERN, 'Use uppercase letters/digits separated by hyphens').optional(),
  bookingType: z.enum(BOOKING_TYPES),
  category: objectId,
  productType: nullableId.optional(),
  variant: nullableId.optional(),
  service: objectId,
  isActive: z.boolean().optional(),
  initialRate: initialRateSchema,
});

// Strict: code, the combination (category/productType/variant/service) and
// commercial numbers are not editable here — the latter only via /rates.
export const updateOfferingSchema = offeringContentSchema.partial().strict();

// Where a rate applies: the default price list, one city, or one pincode.
export const rateScopeSchema = z
  .object({
    type: z.enum(['DEFAULT', 'CITY', 'PINCODE']),
    value: z.string().trim().max(80).nullable().optional(),
  })
  .strict()
  .superRefine((scope, ctx) => {
    if (scope.type === 'DEFAULT') return;
    if (!scope.value) ctx.addIssue({ code: 'custom', path: ['value'], message: `Choose the ${scope.type === 'CITY' ? 'city' : 'pincode'}` });
    else if (scope.type === 'PINCODE' && !/^\d{6}$/.test(scope.value)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A pincode is 6 digits' });
  });

export const changeRateSchema = z
  .object({
    customerPrice: rupees.optional(),
    spPayout: rupees.optional(),
    expressFee: rupees.optional(),
    expressSpIncentive: rupees.optional(),
    effectiveFrom: z.coerce.date().optional(),
    reason: text(300).min(3, 'Give a reason for the change'),
    scope: rateScopeSchema.optional(),
  })
  .strict()
  .refine((v) => ['customerPrice', 'spPayout', 'expressFee', 'expressSpIncentive'].some((k) => v[k] !== undefined), {
    message: 'Change at least one amount',
  });

export const endRateScopeSchema = z
  .object({ scope: rateScopeSchema, reason: text(300).min(3, 'Give a reason') })
  .strict();

export const duplicateOfferingSchema = z.object({
  variant: nullableId.optional(),
  service: objectId.optional(),
  name: text(120).optional(),
  code: z.string().trim().toUpperCase().regex(OFFERING_CODE_PATTERN).optional(),
});

export const listOfferingsQuerySchema = z.object({
  category: objectId.optional(),
  bookingType: z.enum(BOOKING_TYPES).optional(),
  active: boolFromQuery.optional(),
  needsRateReview: boolFromQuery.optional(),
  q: text(80).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const rateChangesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  field: z.enum(['customerPrice', 'spPayout', 'expressFee', 'expressSpIncentive']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const suggestCodeQuerySchema = z.object({
  category: objectId.optional(),
  productType: objectId.optional(),
  variant: objectId.optional(),
  service: objectId.optional(),
});
