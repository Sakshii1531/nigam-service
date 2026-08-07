import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
});

export const openBrandConversationSchema = z.object({ customerId: z.string().min(1) });

export const sendMessageSchema = z.object({
  text: z.string().max(4000).optional(),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
});

export const conversationStatusSchema = z.object({ status: z.enum(['Open', 'Closed']) });
