import { z } from 'zod';

export const createCategorySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  lightBg: z.string().optional(),
  categoryNote: z.string().optional(),
  brands: z.array(z.string()).optional(),
  whyBrandPoints: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  section: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().omit({ key: true });

export const categoryKeyParamSchema = z.object({ key: z.string().min(1) });

export const addProductTypeSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  desc: z.string().optional(),
});

export const updateProductTypeSchema = addProductTypeSchema.partial().omit({ slug: true });

export const addServiceItemSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  desc: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  unit: z.string().optional(),
});

export const updateServiceItemSchema = addServiceItemSchema.partial().omit({ slug: true }).extend({
  isActive: z.boolean().optional(),
});

export const productTypeIdParamSchema = z.object({ key: z.string().min(1), productTypeId: z.string().min(1) });
export const serviceItemIdParamSchema = z.object({ key: z.string().min(1), serviceItemId: z.string().min(1) });

// ─── Master catalogue (docs/master-catalogue Phase 2) ─────────────────────

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const locationQuerySchema = z.object({
  city: z.string().trim().min(1).optional(),
  pincode: z.string().trim().min(1).optional(),
});

export const offeringCodeParamSchema = z.object({ code: z.string().min(1).max(64) });

export const quoteSchema = z.object({
  lines: z
    .array(
      z.object({
        offeringId: objectId,
        variantId: objectId.nullish(),
        quantity: z.coerce.number().int().positive(),
        isExpress: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(10),
  couponCode: z.string().trim().min(1).max(40).nullish(),
  useCoins: z.boolean().optional(),
  paymentMode: z.enum(['advance', 'after']).optional(),
  location: locationQuerySchema.optional(),
  // The customer's appliance, for server-side warranty/AMC/EW detection
  // (signed-in only). Never a coverage claim — see quote.service.js.
  warranty: z
    .object({
      brand: z.string().trim().max(80).optional(),
      applianceId: z.string().max(40).optional(),
      serialNo: z.string().trim().max(80).optional(),
      purchaseDate: z.coerce.date().optional(),
    })
    .optional(),
});
