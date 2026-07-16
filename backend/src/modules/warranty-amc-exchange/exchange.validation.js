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
