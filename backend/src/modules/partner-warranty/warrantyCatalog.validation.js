import { z } from 'zod';
import { mediaUrl } from '../shared/mediaUrl.js';

// Partner Warranty catalogue request shapes (docs/partner-warranty Phase 2).
// No defaults on update schemas — a partial update must never overwrite a
// stored value with a default.

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const text = (max = 200) => z.string().trim().max(max);
const hours = z.coerce.number().positive().max(24 * 90);

export const idParamSchema = z.object({ id: objectId });
export const brandIdParamSchema = z.object({ brandId: objectId });
export const categoryIdParamSchema = z.object({ categoryId: objectId });

export const listBrandsQuerySchema = z.object({
  group: text(80).optional(),
  q: text(80).optional(),
});
export const groupQuerySchema = z.object({ group: text(80).optional() });
export const issuesQuerySchema = z.object({ productType: objectId.optional() });

const groupFields = {
  name: text(80).min(1),
  slug: text(60).min(1).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes'),
  tagline: text(160).optional(),
  imageUrl: mediaUrl().nullable().optional(),
  categories: z.array(objectId).max(100).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
};
export const createGroupSchema = z.object(groupFields);
export const updateGroupSchema = z.object(groupFields).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const adminIssuesQuerySchema = z.object({
  category: objectId.optional(),
  // '' = only category-level issues
  productType: z.union([objectId, z.literal('')]).optional(),
});

const issueFields = {
  category: objectId,
  productType: objectId.nullable().optional(),
  name: text(80).min(1),
  icon: text(60).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
};
export const createIssueSchema = z.object(issueFields);
export const updateIssueSchema = z.object(issueFields).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const adminBrandSettingsSchema = z
  .object({
    warrantyEnabled: z.boolean().optional(),
    logoUrl: mediaUrl().nullable().optional(),
    coverage: z.array(objectId).max(200).optional(),
    warrantySla: z
      .object({
        approvalHours: hours.optional(),
        assignmentHours: hours.optional(),
        visitHours: hours.optional(),
        resolutionHours: hours.optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

// .strict(): a brand sending warrantyEnabled / warrantySla gets told no,
// instead of the field being dropped silently.
export const brandCoverageSchema = z
  .object({
    coverage: z.array(objectId).max(200).optional(),
    logoUrl: mediaUrl().nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
