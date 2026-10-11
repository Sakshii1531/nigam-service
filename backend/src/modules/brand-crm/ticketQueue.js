import {CLAIM_STATUS as S} from '../partner-warranty/claimStatus.js';
export const TICKET_BUCKETS=Object.freeze({pending_approval:'Pending Approval',awaiting_customer:'Awaiting Customer',on_hold:'On Hold',allocating:'Approved / Allocating',in_service:'In Service',closed:'Closed',rejected_cancelled:'Rejected / Cancelled',escalated:'Escalated',sla_breached:'SLA Breached'});
const pending=[S.SUBMITTED,S.BRAND_REVIEW];
const service=[S.PARTNER_ASSIGNED,S.VISIT_SCHEDULED,S.TECHNICIAN_ON_WAY,S.SERVICE_IN_PROGRESS,S.SERVICE_COMPLETED];
const openContact={contactRequests:{$elemMatch:{status:'open'}}};
export function bucketQuery(bucket){switch(bucket){
 case 'pending_approval':return {status:{$in:pending},$nor:[openContact]};
 case 'awaiting_customer':return {$or:[{status:S.INFO_REQUESTED},{$and:[{status:{$in:pending}},openContact]}]};
 case 'on_hold':return {status:S.ON_HOLD};
 case 'allocating':return {status:{$in:[S.APPROVED,S.JOB_CREATED]}};
 case 'in_service':return {status:{$in:service}};
 case 'closed':return {status:S.CLOSED};
 case 'rejected_cancelled':return {status:{$in:[S.REJECTED,S.CANCELLED]}};
 case 'escalated':return {'flags.escalated':true};
 case 'sla_breached':return {'sla.breaches.0':{$exists:true}};
 default:return {};
}}
export function ticketBucket(claim){if(claim.status===S.INFO_REQUESTED||(pending.includes(claim.status)&&claim.contactRequests?.some(r=>r.status==='open')))return 'awaiting_customer';if(pending.includes(claim.status))return 'pending_approval';if(claim.status===S.ON_HOLD)return 'on_hold';if([S.APPROVED,S.JOB_CREATED].includes(claim.status))return 'allocating';if(service.includes(claim.status))return 'in_service';if(claim.status===S.CLOSED)return 'closed';return 'rejected_cancelled';}
