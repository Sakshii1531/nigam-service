import { z } from 'zod';
import { id, productSchema, visitAddressSchema } from './registration.validation.js';
import { createCustomerSchema } from './customer360.validation.js';
import { SERVICE_TYPES, DOCUMENT_KINDS } from '../partner-warranty/ticketConstants.js';
import { preferredVisitSchema } from '../shared/preferredVisit.js';
export const complaintSchema=z.object({issueId:id.optional(),issueName:z.string().trim().min(1).max(200).optional()}).strict()
  .refine(v=>Boolean(v.issueId)!==Boolean(v.issueName),'Choose an issue or describe another issue');
export const documentsSchema=z.array(z.object({kind:z.enum(DOCUMENT_KINDS),url:z.string().min(1).max(2048),name:z.string().trim().max(200).optional()}).strict()).max(10)
  .refine(ds=>ds.filter(d=>d.kind==='video').length<=2,'At most two videos');
export const intakeTicketSchema=z.object({brandId:id,categoryId:id,productTypeId:id.optional(),
  source:z.enum(['whatsapp','api']),customer:createCustomerSchema.omit({address:true}),address:visitAddressSchema,
  product:productSchema.default({}),issueId:id.optional(),issueName:z.string().trim().min(1).max(200).optional(),
  serviceType:z.enum(SERVICE_TYPES).default('repair'),remarks:z.string().trim().min(10).max(1000),
  preferredVisit:preferredVisitSchema.optional(),documents:documentsSchema.default([]),
}).strict().refine(v=>Boolean(v.issueId)!==Boolean(v.issueName),'Choose an issue or describe another issue');
export const stepSchemas={brand:z.object({brandId:id}).strict(),product:z.object({brandId:id,categoryId:id,productTypeId:id.optional()}).strict(),
  complaint:complaintSchema,customer:createCustomerSchema.omit({address:true}),warranty:productSchema,
  invoice:documentsSchema,problem:z.object({remarks:z.string().trim().min(10).max(1000)}).strict(),photos:documentsSchema};
export const stepSchema=z.object({step:z.enum(Object.keys(stepSchemas)),data:z.unknown()}).strict();
