import { z } from 'zod';

export const valuateSchema = z.object({
  category: z.string().min(1),
  baseValue: z.coerce.number().positive(),
  answers: z.record(z.string(), z.string()).optional().default({}),
  campaignId: z.string().optional(),
});

export const createExchangeRequestSchema = valuateSchema.extend({
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const brandListQuerySchema = z.object({
  status: z
    .enum(['Pending Inspection', 'Inspection Approved', 'Defective Received', 'Received at WH'])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});
export const categoryParamSchema = z.object({ category: z.string().min(1) });

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['Yes/No', 'Radio', 'Toggle']),
  options: z.array(z.string()).optional(),
  deductions: z.record(z.string(), z.number()).optional(),
});

export const createQuestionSetSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  questions: z.array(questionSchema).optional().default([]),
});

const EXCHANGE_STATUSES = ['Pending Inspection', 'Inspection Approved', 'Defective Received', 'Received at WH'];

export const listExchangeRequestsQuerySchema = z.object({
  status: z.enum(EXCHANGE_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const updateExchangeRequestStatusSchema = z.object({ status: z.enum(EXCHANGE_STATUSES) });

// ── Exchange merchandising config (super-admin's ExchangeOffers console) ───────

export const upsertCampaignSchema = z.object({
  name: z.string().min(1),
  badgeText: z.string().optional(),
  highlightColor: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  bonusAmount: z.coerce.number().nonnegative().optional(),
});

export const upsertProductConfigSchema = z.object({
  product: z.string().min(1),
  exchangeEnabled: z.boolean().optional(),
  supportedCategories: z.array(z.string()).optional(),
  questionSet: z.string().nullable().optional(),
  badgeText: z.string().optional(),
  campaign: z.string().nullable().optional(),
  maxValue: z.coerce.number().nonnegative().optional(),
});
