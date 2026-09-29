import { z } from 'zod';

// Customer warranty-claim request shapes (docs/partner-warranty Phase 3).

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const text = (max) => z.string().trim().max(max);

const documentSchema = z.object({
  kind: z.enum(['invoice', 'warranty_card', 'product_photo', 'additional']),
  url: z.string().trim().min(1).max(2048),
  name: text(200).optional(),
});

const addressSchema = z.object({
  name: text(80).optional(),
  house: text(200).optional(),
  landmark: text(200).optional(),
  city: text(80).optional(),
  state: text(80).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const createClaimSchema = z
  .object({
    brandId: objectId,
    groupId: objectId.optional(),
    categoryId: objectId,
    productTypeId: objectId.optional(),
    issueId: objectId,
    modelNumber: text(60).min(1, 'Model number is required'),
    serialNumber: text(60).min(1, 'Serial number is required'),
    purchaseDate: z.coerce.date({ errorMap: () => ({ message: 'Purchase date is required' }) }),
    remarks: text(1000).optional(),
    addressId: objectId.optional(),
    address: addressSchema.optional(),
    documents: z.array(documentSchema).min(1, 'Attach the purchase bill / invoice').max(10),
  })
  .refine((v) => Boolean(v.addressId) !== Boolean(v.address), {
    message: 'Send either a saved addressId or an address',
    path: ['address'],
  });

export const claimIdParamSchema = z.object({ id: z.string().trim().min(1).max(40) });

export const listMyClaimsQuerySchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const addDocumentsSchema = z.object({
  documents: z.array(documentSchema).min(1).max(10),
});

export const infoResponseSchema = z.object({
  message: text(1000).optional(),
  documents: z.array(documentSchema).max(10).optional(),
});
