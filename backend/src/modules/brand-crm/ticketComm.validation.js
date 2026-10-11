import { z } from 'zod';
import { preferredVisitSchema } from '../shared/preferredVisit.js';
import { DOCUMENT_KINDS } from '../partner-warranty/ticketConstants.js';
const text = z.string().trim().min(5).max(2000);
export const CONTACT_CHANNELS = ['phone', 'whatsapp', 'sms', 'email', 'in_person'];
export const CONTACT_OUTCOMES = ['connected', 'resolved', 'no_answer', 'busy', 'wrong_number', 'failed', 'callback_requested'];
export const contactSchema = z.object({ channel:z.enum(CONTACT_CHANNELS), direction:z.enum(['inbound','outbound']), outcome:z.enum(CONTACT_OUTCOMES), durationSec:z.number().int().min(0).max(86400).optional(), callbackAt:z.coerce.date().optional(), remarks:text, contactRequestId:z.string().regex(/^[a-f\d]{24}$/i).optional() }).strict().superRefine((v,c)=>{
  if (v.outcome === 'callback_requested' && (!v.callbackAt || v.callbackAt <= new Date())) c.addIssue({code:'custom',path:['callbackAt'],message:'Choose a future callback time'});
  if (v.outcome !== 'callback_requested' && v.callbackAt) c.addIssue({code:'custom',path:['callbackAt'],message:'Callback time requires callback requested outcome'});
});
export const rescheduleSchema = preferredVisitSchema.omit({notes:true}).extend({reason:text}).strict();
export const callSchema = z.object({to:z.literal('customer')}).strict();
export const documentSchema = z.object({documents:z.array(z.object({kind:z.enum(DOCUMENT_KINDS),url:z.string().min(1).max(2048),name:z.string().trim().max(200).optional()}).strict()).min(1).max(10)}).strict();
