import { z } from 'zod';
import { createCustomerSchema } from './customer360.validation.js';
import { preferredVisitSchema } from '../shared/preferredVisit.js';
import { SERVICE_TYPES, STAFF_SOURCES, TICKET_PRIORITIES, DOCUMENT_KINDS } from '../partner-warranty/ticketConstants.js';
export const id = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const text = max => z.string().trim().max(max);
export const visitAddressSchema = z.object({
  name: text(80).optional(), house: text(200).min(1), landmark: text(200).optional(),
  city: text(80).min(1), state: text(80).min(1), pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(),
}).strict();
export const productSchema = z.object({ modelNumber: text(60).optional(), serialNumber: text(60).optional(),
  purchaseDate: z.coerce.date().refine(d => d.getTime() <= Date.now(), 'Purchase date cannot be in the future').optional() }).strict();
export const registrationSchema = z.object({
  customerId: id.optional(), newCustomer: createCustomerSchema.omit({ address: true }).optional(),
  source: z.enum(STAFF_SOURCES).default('toll_free'), categoryId: id, productTypeId: id.optional(), serviceType: z.enum(SERVICE_TYPES).default('repair'),
  applianceId: id.optional(), product: productSchema.optional(), issueId: id.optional(), issueName: text(200).min(1).optional(),
  remarks: text(1000).min(10, 'Describe the issue in at least 10 characters'), priority: z.enum(TICKET_PRIORITIES).default('Normal'),
  address: z.union([id, visitAddressSchema]), preferredVisit: preferredVisitSchema.optional(),
  documents: z.array(z.object({kind: z.enum(DOCUMENT_KINDS), url: z.string().min(1).max(2048), name: text(200).optional()}).strict()).max(10).default([]),
  approveNow: z.boolean().default(false),
  approval:z.object({coverageDecision:z.enum(['warranty','goodwill']),remarks:text(1000).optional()}).strict().optional(),
}).strict().refine(v => Boolean(v.customerId) !== Boolean(v.newCustomer), 'Choose a customer or provide a new customer')
  .refine(v => !(v.applianceId && v.product), 'Choose a registered product or enter a new one')
  .refine(v => Boolean(v.issueId) !== Boolean(v.issueName), 'Choose an issue or describe another issue');
export const previewSchema = z.object({ categoryId:id.optional(),productTypeId:id.optional(),issueId:id.optional(),serviceType:z.enum(SERVICE_TYPES).default('repair'),product: productSchema.default({}), documents: z.array(z.object({kind:z.enum(DOCUMENT_KINDS)})).default([]) }).strict();
export const assignCceSchema = z.object({userId:id}).strict();
