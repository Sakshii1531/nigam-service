import { z } from 'zod';

const DOC_TYPES = [
  'Service Completion Letter',
  'Warranty Certificate',
  'FOC Approval Letter',
  'Replacement Authorization',
  'Customer Bill Copy',
];

export const generateDocumentSchema = z.object({
  type: z.enum(DOC_TYPES),
  serviceRequest: z.string().min(1),
  pdfUrl: z.string().optional(),
});

export const listQuerySchema = z.object({
  type: z.enum(DOC_TYPES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
