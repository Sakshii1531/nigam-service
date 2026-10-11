import {z} from 'zod';
import {id} from './registration.validation.js';
import {TICKET_SOURCES,TICKET_PRIORITIES,WARRANTY_STATUSES,JOB_STAGES} from '../partner-warranty/ticketConstants.js';
import {TICKET_BUCKETS} from './ticketQueue.js';
import {listBrandClaimsQuerySchema} from '../partner-warranty/brandClaim.validation.js';
const text=max=>z.string().trim().max(max);
export const queueSchema=listBrandClaimsQuerySchema.extend({dashboardKpi:z.enum(['approved','assigned','in_progress','completed','sla_breached']).optional(),bucket:z.enum(Object.keys(TICKET_BUCKETS)).optional(),jobStage:z.enum(JOB_STAGES).optional(),source:z.enum(TICKET_SOURCES).optional(),priority:z.enum(TICKET_PRIORITIES).optional(),warrantyStatus:z.enum(WARRANTY_STATUSES).optional(),categoryKey:text(60).optional(),city:text(80).optional(),state:text(80).optional(),assignedCce:z.union([id,z.literal('me')]).optional(),registeredBy:id.optional(),slaState:z.enum(['ok','warning','breached','paused']).optional(),escalated:z.enum(['true','false']).transform(v=>v==='true').optional()}).refine(v=>!v.from||!v.to||v.to>=v.from,'End must follow start');
export const reasonSchema=z.object({reason:text(1000).min(5)}).strict();
export const resumeSchema=z.object({remarks:text(1000).optional()}).strict();
export const prioritySchema=z.object({priority:z.enum(TICKET_PRIORITIES),remarks:text(1000).min(5)}).strict();

export const activitySchema=z.object({type:z.enum(['status','communication','job','parts','sla','billing','notes']).optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}).strict();

export const confirmOnBehalfSchema=z.object({method:z.literal('cce'),remarks:text(1000).min(5)}).strict();
