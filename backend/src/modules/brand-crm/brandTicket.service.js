import { DASHBOARD_STAGES, slaExpressions, approvalMatch, OPEN_STATUSES } from './dashboardQueries.js';
import { runInTransaction } from '../../utils/transaction.js';
import { Brand } from '../super-admin/brand.model.js';
import { changeSlaPriority, PRIORITY_FACTORS, slaStages, SLA_STAGES } from '../partner-warranty/claimSla.js';
import mongoose from 'mongoose';
import {WarrantyClaim} from '../partner-warranty/warrantyClaim.model.js';
import {User} from '../auth/user.model.js';
import {ServiceRequest} from '../service-requests/serviceRequest.model.js';
import {Escalation} from '../super-admin/escalation.model.js';
import {toBrandSummary} from '../partner-warranty/brandClaim.service.js';
import {appendEvent,saveClaim,persistClaim,flushAudit} from '../partner-warranty/claimTimeline.js';
import {CLAIM_STATUS as S} from '../partner-warranty/claimStatus.js';
import {actorFromUser} from './actor.js';
import {loadBrandAccess} from './brandPermission.middleware.js';
import {emit as notify} from '../notifications/notification.service.js';
import {ApiError} from '../../middleware/errorHandler.js';
import {parsePagination,paginationMeta} from '../../utils/pagination.js';
import {escapeRegex} from '../shared/brandWarranty.js';
import {TICKET_BUCKETS,bucketQuery,ticketBucket} from './ticketQueue.js';
const populate=[{path:'customer',select:'name phone'},{path:'serviceRequest',select:'humanId status serviceProvider isAccepted',populate:{path:'serviceProvider',select:'name'}}];
export async function queueQuery(user,f={}){
 const query={brand:user.brand},and=[];
 if(f.bucket&&f.bucket!=='escalated')and.push(bucketQuery(f.bucket));
 const escalated=f.bucket==='escalated'?true:f.escalated;
 if(f.status)query.status={$in:f.status.split(',').map(s=>s.trim())};
 for(const key of ['source','priority','jobStage'])if(f[key])query[key]=f[key];
 if(f.warrantyStatus)query['warranty.status']=f.warrantyStatus;
 if(f.categoryKey||f.category)query.categoryKey=f.categoryKey||f.category;
 for(const key of ['city','state'])if(f[key])query[`address.${key}`]=new RegExp(`^${escapeRegex(f[key])}$`,'i');
 if(f.pincode)query['address.pincode']=f.pincode;
 if(f.assignedCce)query['assignedCce.user']=f.assignedCce==='me'?user.id:f.assignedCce;
 if(f.registeredBy)query['registeredBy.user']=f.registeredBy;
 if(f.slaState==='paused')query['sla.pausedAt']={$ne:null};
 else if(f.slaState){
  query['sla.pausedAt']=null;
  const overdue=SLA_STAGES.map(s=>({$and:[{$ne:[{$ifNull:[`$sla.${s.dueField}`,null]},null]},{$eq:[{$ifNull:[`$sla.met.${s.key}`,null]},null]},{$lte:[`$sla.${s.dueField}`,new Date()]}]}));
  const warning=SLA_STAGES.map(s=>({$and:[{$ne:[{$ifNull:[`$sla.${s.dueField}`,null]},null]},{$eq:[{$ifNull:[`$sla.met.${s.key}`,null]},null]},{$lte:[{$subtract:[`$sla.${s.dueField}`,{$multiply:[{$ifNull:[`$sla.hours.${s.hoursKey}`,0]},720000]}]},new Date()]}]}));
  query.$expr=f.slaState==='breached'?{$or:overdue}:f.slaState==='warning'?{$and:[{$not:[{$or:overdue}]},{$or:warning}]}:{$not:[{$or:warning}]};
 }
 if(f.dashboardKpi==='approved'){and.push(approvalMatch(f.from||new Date(0),f.to?new Date(+new Date(f.to)+1):new Date('9999-01-01')));}
 else if(f.from||f.to){query.createdAt={};if(f.from)query.createdAt.$gte=f.from;if(f.to)query.createdAt.$lte=f.to;}
 if(DASHBOARD_STAGES[f.dashboardKpi])query.jobStage={$in:DASHBOARD_STAGES[f.dashboardKpi]};
 if(f.dashboardKpi==='sla_breached'){query.status=OPEN_STATUSES;and.push({$expr:slaExpressions(new Date()).breached});}
 if(escalated!==undefined){const open=await Escalation.find({brand:user.brand,warrantyClaim:{$ne:null},status:{$ne:'Resolved'}}).distinct('warrantyClaim');and.push(escalated?{$or:[{'flags.escalated':true},{_id:{$in:open}}]}:{$and:[{'flags.escalated':{$ne:true}},{_id:{$nin:open}}]});}
 if(f.q){const rx=new RegExp(escapeRegex(f.q),'i');const [customers,jobs]=await Promise.all([User.find({role:'customer',$or:[{name:rx},{phone:rx}]}).select('_id').lean(),ServiceRequest.find({brand:user.brand,warrantyClaim:{$ne:null},humanId:rx}).select('warrantyClaim').lean()]);and.push({$or:[{humanId:rx},{brandTicketNo:rx},{serialNumber:rx},{modelNumber:rx},{productName:rx},{issueName:rx},{customer:{$in:customers.map(c=>c._id)}},{_id:{$in:jobs.map(j=>j.warrantyClaim)}}]});}
 if(and.length)query.$and=and;return query;
}
function row(c){
 const stages=slaStages(c),next=stages.filter(s=>s.started&&!s.metAt).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt))[0];
 const state=c.sla?.pausedAt?'paused':stages.some(s=>s.state==='breached')?'breached':stages.some(s=>s.state==='warning')?'warning':'ok';
 return {...toBrandSummary(c),customer:c.customer?{id:String(c.customer._id),name:c.customer.name,phone:c.customer.phone?`******${c.customer.phone.slice(-4)}`:null}:null,bucket:ticketBucket(c),statusLabel:c.status===S.SUBMITTED?'Pending Approval':c.status,jobNo:c.serviceRequest?.humanId||null,jobStage:c.jobStage,assignedCce:c.assignedCce||null,registeredBy:c.registeredBy||null,partner:c.serviceRequest?.isAccepted?c.serviceRequest.serviceProvider?.name||null:null,sla:{state,nextDueAt:next?.dueAt||null,nextStage:next?.label||null,remainingMs:next?.remainingMs??null}};
}
export async function listTickets(user,filters){const query=await queueQuery(user,filters),p=parsePagination(filters);const [items,total,counts]=await Promise.all([WarrantyClaim.find(query).populate(populate).sort(p.sort).skip(p.skip).limit(p.limit),WarrantyClaim.countDocuments(query),Promise.all(Object.keys(TICKET_BUCKETS).map(async key=>[key,await WarrantyClaim.countDocuments(await queueQuery(user,{bucket:key}))]))]);return {items:items.map(row),meta:{...paginationMeta({page:p.page,limit:p.limit,total}),counts:Object.fromEntries(counts)}};}
const csvCell=v=>{const text=String(v??'');return `"${(/^[=+\-@\t\r]/.test(text)?"'":'')+text.replaceAll('"','""')}"`;};
export async function exportTickets(user,filters){const items=await WarrantyClaim.find(await queueQuery(user,filters)).populate(populate).sort(parsePagination(filters).sort).limit(10001);if(items.length>10000)throw new ApiError(400,'Narrow filters to export at most 10000 tickets');const headers=['Master Ticket','Brand Ticket','NCC Job','Source','Customer','Mobile','Product','Issue','Warranty','Priority','Status','Job Stage','Assigned CCE','SLA','Created'];return '\uFEFF'+[headers,...items.map(c=>{const r=row(c);return [r.humanId,r.brandTicketNo,r.jobNo,r.source,r.customer?.name,r.customer?.phone,r.productName,r.issueName,r.warrantyStatus,r.priority,r.status,r.jobStage,r.assignedCce?.name,r.sla.state,r.createdAt.toISOString()];})].map(r=>r.map(csvCell).join(',')).join('\r\n');}
async function claimFor(user,id,session=null){const key=mongoose.isValidObjectId(id)?{_id:id}:{humanId:id.toUpperCase()};const c=await WarrantyClaim.findOne({...key,brand:user.brand}).session(session);if(!c)throw new ApiError(404,'Ticket not found');return c;}
function preApproval(c){if(![S.SUBMITTED,S.BRAND_REVIEW,S.INFO_REQUESTED,S.ON_HOLD].includes(c.status)||c.serviceRequest)throw new ApiError(409,'This action is only available before approval');}
export async function hold(user,id,{reason}){const c=await claimFor(user,id);preApproval(c);if(c.status===S.ON_HOLD)throw new ApiError(409,'Ticket is already on hold');const actor=await actorFromUser(user.id,'brand');c.holdReason=reason;c.heldBy=actor;appendEvent(c,{action:'PUT_ON_HOLD',toStatus:S.ON_HOLD,actor,note:reason});await saveClaim(c);return {id:c.id,status:c.status};}
export async function resume(user,id,{remarks}){const c=await claimFor(user,id);preApproval(c);if(c.status!==S.ON_HOLD)throw new ApiError(409,'Ticket is not on hold');appendEvent(c,{action:'RESUMED',toStatus:c.statusBeforeHold||S.BRAND_REVIEW,actor:await actorFromUser(user.id,'brand'),note:remarks});c.holdReason=null;c.heldBy=null;await saveClaim(c);return {id:c.id,status:c.status};}
export async function priority(user,id,{priority,remarks}){
 const actor=await actorFromUser(user.id,'brand'),brand=await Brand.findById(user.brand);
 const claim=await runInTransaction(async session=>{
  const c=await claimFor(user,id,session);
  if([S.CLOSED,S.CANCELLED,S.REJECTED].includes(c.status))throw new ApiError(409,'Ticket is terminal');
  const previous=c.priority,deadlines=Object.fromEntries(SLA_STAGES.map(s=>[s.key,c.sla?.[s.dueField]]));
  c.priority=priority;
  changeSlaPriority(c,{...PRIORITY_FACTORS,...brand?.warrantySla?.priorityFactor?.toObject?.()});
  const escalations=await Escalation.find({warrantyClaim:c._id,brand:user.brand,status:{$ne:'Resolved'}}).session(session);
  for(const e of escalations){
   const stage=SLA_STAGES.find(s=>s.key===e.slaStage),oldDue=deadlines[e.slaStage];
   if(stage&&oldDue&&e.dueAt)e.dueAt=new Date(+new Date(c.sla[stage.dueField])+(+new Date(e.dueAt)-+new Date(oldDue)));
   e.priority=priority;e.history.push({action:'priority_changed',actor,note:remarks});
   await e.save(session?{session}:undefined);
  }
  appendEvent(c,{action:'PRIORITY_CHANGED',actor,visibility:'brand',note:remarks,meta:{previous,priority}});
  await persistClaim(c,{session});return c;
 });
 await flushAudit(claim);return {id:claim.id,priority};
}
export async function requestContact(user,id,{reason}){const c=await claimFor(user,id);preApproval(c);if(c.contactRequests.some(r=>r.status==='open'))throw new ApiError(409,'A contact request is already open');const actor=await actorFromUser(user.id,'brand');c.contactRequests.push({reason,requestedBy:actor,requestedAt:new Date(),status:'open'});appendEvent(c,{action:'CONTACT_REQUESTED',actor,visibility:'brand',note:reason});await saveClaim(c);
 const candidates=c.assignedCce?.user?[c.assignedCce.user]:(await User.find({brand:user.brand,role:'brand_admin',status:'Active',department:'Customer Care'}).select('_id').lean()).map(u=>u._id);
 for(const recipient of candidates){const access=await loadBrandAccess(recipient);if(access?.status==='Active'&&access.brand===String(user.brand)&&access.permissions.has('tickets:edit'))await notify('brand.contact_requested',{user:recipient,brand:c.brand,warrantyClaim:c._id,humanId:c.humanId,reason,cta:{label:'Contact customer',route:`/brand-admin/tickets/${c.id}`}});}
 return {id:c.id,contactRequests:c.contactRequests};}
