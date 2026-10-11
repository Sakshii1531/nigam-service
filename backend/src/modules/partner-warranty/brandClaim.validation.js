import { z } from 'zod';
import {COVERAGE_DECISIONS,REJECTION_CODES,DOCUMENT_KINDS} from './ticketConstants.js';

// Brand-panel warranty claim request shapes (docs/partner-warranty Phase 4).

const text = (max) => z.string().trim().max(max);

export const claimIdParamSchema = z.object({ id: z.string().trim().min(1).max(40) });

export const listBrandClaimsQuerySchema = z.object({
  status: text(300).optional(), // one status or a comma-separated list
  q: text(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  category: text(60).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt']).optional(),
});

export const approveSchema = z.object({ coverageDecision:z.enum(COVERAGE_DECISIONS).default('warranty'),remarks:text(1000).optional() }).strict().refine(v=>v.coverageDecision!=='goodwill'||(v.remarks?.length>=5),'Goodwill approval requires remarks (at least 5 characters)');

// Min lengths are checked in the service too, so a direct caller gets the same rule.
export const rejectSchema = z.object({
  rejectionCode:z.enum(REJECTION_CODES),
  reason: text(1000).min(5, 'A rejection reason is required (at least 5 characters)'),
});

export const requestInfoSchema = z.object({
  documentKinds:z.array(z.enum(DOCUMENT_KINDS)).max(7).optional(),
  message: text(1000).min(5, 'Tell the customer what you need (at least 5 characters)'),
});

export const noteSchema = z.object({ note: text(1000).min(1) });
