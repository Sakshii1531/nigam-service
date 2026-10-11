import mongoose from 'mongoose';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Job } from '../service-provider/job.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { User } from '../auth/user.model.js';
import { loadBrandAccess } from './brandPermission.middleware.js';
import { actorFromUser } from './actor.js';
import { appendEvent, saveClaim, persistClaim, flushAudit } from '../partner-warranty/claimTimeline.js';
import { reevaluateTicketWarranty } from './ticketWarranty.service.js';
import { toBrandSummary } from '../partner-warranty/brandClaim.service.js';
import { emit, emitToAdmins } from '../notifications/notification.service.js';
import { isOwnUploadUrl } from '../shared/fileUpload.js';
import { runInTransaction } from '../../utils/transaction.js';
import { transitionStatus } from '../service-requests/serviceRequest.service.js';
import { syncClaimFromJob } from '../partner-warranty/claimDispatch.js';
import { getIO } from '../../sockets/io.js';
import { ApiError } from '../../middleware/errorHandler.js';
const terminal = ['Closed','Cancelled','Rejected'];
export async function findTicket(user,id,session) {
  const key=mongoose.isValidObjectId(id)?{_id:id}:{humanId:String(id).toUpperCase()};
  const c=await WarrantyClaim.findOne({...key,brand:user.brand}).session(session||null);
  if(!c)throw new ApiError(404,'Ticket not found');return c;
}
export function applyContact(c,actor,input,meta={}) {
  const request=input.contactRequestId ? c.contactRequests.id(input.contactRequestId) : null;
  if(input.contactRequestId && !request)throw new ApiError(404,'Contact request not found');
  if(request && request.status!=='open')throw new ApiError(409,'Contact request is already closed');
  const now=new Date();
  if(request){request.status=['no_answer','busy','wrong_number','failed'].includes(input.outcome)?'failed':'done';request.outcome=input.outcome;request.doneBy=actor;request.doneAt=now;}
  if(!['no_answer','busy','wrong_number','failed'].includes(input.outcome))for(const cb of c.callbacks.filter(r=>String(r.assignedTo)===String(actor.user)&&r.dueAt<=now&&!r.completedAt))cb.completedAt=now;
  c.firstCustomerContactAt ||= now; c.firstBrandActionAt ||= now;
  appendEvent(c,{action:'CUSTOMER_CONTACTED',actor,visibility:'brand',note:input.remarks,meta:{...input,remarks:undefined,...meta}});
  if(input.callbackAt){if(terminal.includes(c.status))throw new ApiError(409,'Callbacks are only available for open tickets');c.callbacks.push({assignedTo:actor.user,dueAt:input.callbackAt,remarks:input.remarks,createdBy:actor});}
}
export async function logContact(user,id,input){const c=await findTicket(user,id);applyContact(c,await actorFromUser(user.id,'brand'),input);await saveClaim(c);return {id:c.id,contactRequests:c.contactRequests};}
export async function addDocuments(user,id,{documents}) {
  const c=await findTicket(user,id),actor=await actorFromUser(user.id,'brand');
  if(documents.some(d=>!isOwnUploadUrl(d.url)))throw new ApiError(400,'Documents must come from upload storage');
  const fresh=documents.filter((d,i)=>!c.documents.some(e=>e.kind===d.kind&&e.url===d.url)&&documents.findIndex(e=>e.kind===d.kind&&e.url===d.url)===i);
  if(!fresh.length)throw new ApiError(409,'These documents are already on the ticket');
  c.documents.push(...fresh.map(d=>({...d,uploadedBy:user.id,uploadedAt:new Date()})));
  appendEvent(c,{action:'DOCUMENT_ADDED',actor,visibility:'brand',note:`Added ${fresh.length} document(s)`,meta:{documents:fresh.map(d=>({kind:d.kind,name:d.name}))}});
  // After approval the coverage snapshot is frozen; supplementary reports still attach.
  if(!c.serviceRequest)await reevaluateTicketWarranty(c,actor);
  await saveClaim(c);return {id:c.id,warranty:c.warranty};
}
export async function reschedule(user,id,{date,slot,reason}) {
  let c,sr,job;const actor=await actorFromUser(user.id,'brand');
  await runInTransaction(async session=>{
    c=await findTicket(user,id,session);
    if(terminal.includes(c.status)||c.status==='On Hold')throw new ApiError(409,'This ticket cannot be rescheduled');
    sr=c.serviceRequest?await ServiceRequest.findById(c.serviceRequest).session(session||null):null;
    if(!sr?.isAccepted){c.preferredVisit={date,slot,notes:reason};appendEvent(c,{action:'RESCHEDULED',actor,visibility:'brand',note:reason,meta:{date,slot,preferred:true}});}
    else{
      if(!['Engineer Accepted','Visit Scheduled','Customer NA'].includes(sr.status))throw new ApiError(409,'Rescheduling is only available before the visit starts');
      if(c.pendingReschedule?.status==='pending')throw new ApiError(409,'A reschedule request is already awaiting the partner');
      job=await Job.findOne({serviceRequest:sr._id,serviceProvider:sr.serviceProvider}).session(session||null);
      if(!job||job.activeStep!=='assigned')throw new ApiError(409,'The visit has already started');
      c.pendingReschedule={date,slot,reason,status:'pending',requestedBy:actor,requestedAt:new Date()};
      job.providerRescheduleStatus='PENDING';job.reschedule={date,slot,reason};await job.save(session?{session}:undefined);
      appendEvent(c,{action:'RESCHEDULE_REQUESTED',actor,visibility:'brand',note:reason,meta:{date,slot}});
      await transitionStatus(sr._id,'Reschedule',{session,skipWarrantySync:true,description:`Brand requested ${date}, ${slot}: ${reason}`});
    }
    await persistClaim(c,{session});
  });
  await flushAudit(c);
  if(job){
    await syncClaimFromJob(sr._id);
    const provider=await ServiceProvider.findById(sr.serviceProvider).select('user').lean();
    const payload={brand:c.brand,warrantyClaim:c._id,humanId:c.humanId,date,slot,reason};
    if(provider?.user)await emit('brand.visit_reschedule',{...payload,user:provider.user,cta:{label:'Review visit',route:'/service-provider/dashboard'}});
    await emitToAdmins('brand.visit_reschedule',payload);
    getIO()?.to(`user:${provider?.user}`).emit('job:rescheduled',{jobId:job.id,serviceRequestId:sr.id,providerRescheduleStatus:'PENDING',scheduledDate:date,timeSlot:slot,reason});
  }
  return {id:c.id,preferredVisit:c.preferredVisit,pendingReschedule:c.pendingReschedule};
}
// Called by the existing partner response endpoint. The confirmed slot is applied only here.
export async function respondToTicketReschedule(serviceProviderId,job,action,reason) {
  const provider=await ServiceProvider.findById(serviceProviderId).select('user').lean();
  const actor=await actorFromUser(provider.user,'partner');let c;
  await runInTransaction(async session=>{
    c=await WarrantyClaim.findOne({serviceRequest:job.serviceRequest._id||job.serviceRequest}).session(session||null);
    if(!c||c.pendingReschedule?.status!=='pending'||terminal.includes(c.status)||c.status==='On Hold')throw new ApiError(409,'No pending reschedule for this job');
    const fresh=await Job.findById(job._id).session(session||null);
    if(fresh.providerRescheduleStatus!=='PENDING'||fresh.activeStep!=='assigned')throw new ApiError(409,'The visit has already started or this request was answered');
    c.pendingReschedule.status=action==='accept'?'accepted':'declined';c.pendingReschedule.respondedAt=new Date();
    if(action==='accept')c.visit={date:c.pendingReschedule.date,slot:c.pendingReschedule.slot};
    fresh.providerRescheduleStatus=action==='accept'?'ACCEPTED':'REJECTED';
    if(action==='reject')fresh.reschedule=c.visit?.date?{date:c.visit.date,slot:c.visit.slot}:undefined;
    await fresh.save(session?{session}:undefined);
    appendEvent(c,{action:action==='accept'?'RESCHEDULED':'RESCHEDULE_REQUESTED',actor,visibility:action==='accept'?'customer':'brand',note:action==='accept'?`Partner confirmed ${c.visit.date}, ${c.visit.slot}`:reason||'Partner cannot attend the requested slot',meta:{outcome:action,date:c.pendingReschedule.date,slot:c.pendingReschedule.slot}});
    // A declined proposal keeps the previous confirmed visit and partner; NCC can arrange another.
    await transitionStatus(c.serviceRequest,'Visit Scheduled',{session,skipWarrantySync:true,description:action==='accept'?'Partner confirmed requested slot':'Partner retained the original slot'});
    await persistClaim(c,{session});
  });await flushAudit(c);await syncClaimFromJob(c.serviceRequest);
  if(action==='reject')await emitToAdmins('brand.visit_reschedule',{brand:c.brand,warrantyClaim:c._id,humanId:c.humanId,date:c.pendingReschedule.date,slot:c.pendingReschedule.slot,reason:reason||'Partner declined; arrange another slot'});
  return {status:action==='accept'?'ACCEPTED':'REJECTED',visit:c.visit};
}
function indiaDay(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export async function myWork(user,now=new Date(),{countsOnly=false}={}) {
  const base={brand:user.brand,status:{$nin:terminal}},own={'assignedCce.user':user.id};
  const start=new Date(`${indiaDay(now)}T00:00:00+05:30`),end=new Date(start.getTime()+86400000);
  const queries={assigned:{...base,...own},contacts:{...base,...own,contactRequests:{$elemMatch:{status:'open'}}},callbacks:{...base,callbacks:{$elemMatch:{assignedTo:user.id,dueAt:{$gte:start,$lt:end},completedAt:null}}},awaitingCustomer:{...base,'registeredBy.user':user.id,status:'Info Requested'}};
  if(countsOnly) return {counts:Object.fromEntries(await Promise.all(Object.entries(queries).map(async([key,q])=>[key,await WarrantyClaim.countDocuments(q)])))};
  const sections={};
  await Promise.all(Object.entries(queries).map(async([key,q])=>{const [items,total]=await Promise.all([WarrantyClaim.find(q).select('humanId brandTicketNo status priority source productName issueName warranty registeredBy assignedCce createdAt callbacks contactRequests').sort({updatedAt:-1}).limit(100).lean(),WarrantyClaim.countDocuments(q)]);sections[key]={total,items:items.map(c=>({...toBrandSummary(c),id:String(c._id),callbacks:(c.callbacks||[]).filter(r=>String(r.assignedTo)===user.id&&r.dueAt>=start&&r.dueAt<end&&!r.completedAt).map(r=>({id:String(r._id),dueAt:r.dueAt,remarks:r.remarks,notifiedAt:r.notifiedAt||null})),contactRequests:(c.contactRequests||[]).filter(r=>r.status==='open').map(r=>({id:String(r._id),reason:r.reason}))}))};}));
  return {sections,counts:Object.fromEntries(Object.entries(sections).map(([k,v])=>[k,v.total]))};
}
export async function runCallbackSweep(now=new Date()) {
  const claims=await WarrantyClaim.find({status:{$nin:terminal},callbacks:{$elemMatch:{dueAt:{$lte:now},notifiedAt:null,completedAt:null}}}).select('_id');let sent=0;
  for(const item of claims){let c=await WarrantyClaim.findById(item._id);for(const cb of c.callbacks.filter(r=>!r.notifiedAt&&!r.completedAt&&r.dueAt<=now)){
    const recipient=await User.findOne({_id:cb.assignedTo,brand:c.brand,role:'brand_admin',status:'Active'}).select('_id').lean();if(!recipient)continue;
    const access=await loadBrandAccess(recipient._id);if(!access?.permissions.has('tickets:edit'))continue;
    const n=await emit('brand.callback_due',{user:recipient._id,brand:c.brand,warrantyClaim:c._id,humanId:c.humanId,remarks:cb.remarks,dedupeKey:`callback:${cb._id}`});if(!n)continue;
    cb.notifiedAt=now;try{await saveClaim(c);sent++;}catch(e){if(e.statusCode!==409)throw e;c=await WarrantyClaim.findById(item._id);}
  }}return {sent};
}
