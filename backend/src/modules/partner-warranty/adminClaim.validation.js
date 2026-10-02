import { z } from 'zod';
import { CLAIM_STATUS } from './claimStatus.js';

// Super Admin warranty-claim request shapes (docs/partner-warranty Phase 8).

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const text = (max) => z.string().trim().max(max);
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
/** Every override needs a reason — it is what the audit trail records. */
const reason = text(1000).min(3, 'A reason is required');

export const claimIdParamSchema = z.object({ id: z.string().trim().min(1).max(40) });

export const listAdminClaimsQuerySchema = z.object({
  brand: objectId.optional(),
  category: text(60).optional(),
  productType: objectId.optional(),
  status: text(300).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  city: text(80).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/).optional(),
  escalated: bool.optional(),
  allocationFailed: bool.optional(),
  slaState: z.enum(['ok', 'warning', 'breached']).optional(),
  q: text(80).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt']).optional(),
});

export const slaSummaryQuerySchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });

export const reasonSchema = z.object({ reason });
export const assignSchema = z.object({ serviceProviderId: objectId, reason });
export const reassignSchema = z.object({ serviceProviderId: objectId.optional(), reason, force: z.boolean().optional() });
export const changeStatusSchema = z.object({ status: z.nativeEnum(CLAIM_STATUS), reason });
export const reopenSchema = z.object({ reason, to: z.enum([CLAIM_STATUS.BRAND_REVIEW, CLAIM_STATUS.JOB_CREATED]).optional() });
export const noteSchema = z.object({ note: text(1000).min(1) });
