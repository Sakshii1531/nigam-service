import mongoose from 'mongoose';
import { PartOrder } from '../service-provider/partOrder.model.js';
import { Job } from '../service-provider/job.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { BrandSettings } from '../brand-admin/brandSettings.model.js';
import { SparePartCatalog } from '../super-admin/sparePartCatalog.model.js';
import { User } from '../auth/user.model.js';
import { actorFromUser } from './actor.js';
import { loadBrandAccess } from './brandPermission.middleware.js';
import { appendEvent, persistClaim, flushAudit } from '../partner-warranty/claimTimeline.js';
import { syncClaimFromJob } from '../partner-warranty/claimDispatch.js';
import { runInTransaction } from '../../utils/transaction.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { isOwnUploadUrl } from '../shared/fileUpload.js';
import { sendAdHocPush } from '../notifications/notification.service.js';
import { getIO } from '../../sockets/io.js';
const key=id=>mongoose.isValidObjectId(id)?{_id:id}:{humanId:id};
const terminal=['Closed','Cancelled','Rejected'];
function event(c,p,action,actor,note){appendEvent(c,{action,actor,note,visibility:'brand',meta:{partOrderId:String(p._id),partName:p.partName,partNumber:p.partNumber,qty:p.qty,payer:p.payer,status:p.status,approval:p.approval?.brand?.status}});}
function history(p,status,actor){p.status=status;p.statusHistory.push({status,actor,at:new Date()});}
async function notify(c,providerId,approvalOnly=false){
 const users=approvalOnly?await User.find({brand:c.brand,role:'brand_admin',status:'Active'}).select('_id'):[];
 for(const u of users){const a=await loadBrandAccess(u._id);if(a?.permissions.has('parts:approve'))await sendAdHocPush({recipientId:u._id,brand:c.brand,warrantyClaim:c._id,title:'Part approval requested',body:`${c.humanId}: a technician requested spare parts`,cta:{label:'Review parts',route:'/brand-admin/part-requests'}}).catch(()=>{});}
 const provider=await ServiceProvider.findById(providerId).select('user');
 if(provider?.user){getIO()?.to(`user:${provider.user}`).emit('job:updated',{warrantyClaim:String(c._id)});if(!approvalOnly)await sendAdHocPush({recipientId:provider.user,brand:c.brand,warrantyClaim:c._id,title:'Part request updated',body:`Parts for ${c.humanId} have been updated`,cta:{label:'View job',route:'/service-provider/active-job'}}).catch(()=>{});}
}
// Parts actions already save their claim and synchronize its stage after the
// action commits. The generic Job hook must not update that same claim midway
// through the action on standalone MongoDB, where there is no session to defer it.
async function savePartsJob(job, session) {
 job.$locals.deferWarrantyStageSync = true;
 try { await job.save(session ? { session } : undefined); }
 finally { delete job.$locals.deferWarrantyStageSync; }
}
export async function requestWarrantyParts(providerId,jobId,input){
 const provider=await ServiceProvider.findById(providerId).select('user');const actor=await actorFromUser(provider.user,'partner');let c,job,orders;
 await runInTransaction(async session=>{
  job=await Job.findOne({...key(jobId),serviceProvider:providerId}).session(session||null);if(!job)throw new ApiError(404,'Job not found');
  const sr=await ServiceRequest.findById(job.serviceRequest).session(session||null);
  c=await WarrantyClaim.findById(sr?.warrantyClaim).session(session||null);
  if(!c||terminal.includes(c.status)||c.status==='On Hold'||!['inspection','spareapproval','repair','revisit_arrived'].includes(job.activeStep))throw new ApiError(409,'Parts can only be requested during diagnosis or repair');
  if(await PartOrder.exists({job:job._id,status:{$nin:['Installed','Rejected']}}).session(session||null))throw new ApiError(409,'Finish the existing part requests first');
  const items=input.parts?.length?input.parts:[{name:input.partName,sku:input.sku,price:input.price,qty:input.qty}];
  if(!items.length||items.length>10||items.some(i=>!i.name?.trim()||!Number.isFinite(Number(i.price))||Number(i.price)<0||!Number.isInteger(i.qty??1)||(i.qty??1)<1))throw new ApiError(400,'Supply up to ten named parts with a valid price and quantity');
  const settings=await BrandSettings.findOne({brand:c.brand}).session(session||null);
  const payer=c.coverageDecision==='goodwill'||(c.coverageDecision==='warranty'&&c.warranty?.policy?.coverage?.partsCovered===true)?'brand':'customer';
  // Customer-payable warranty parts require an explicit NCC-arranged customer consent;
  // do not invent consent merely because this ticket has no paid Booking.
  orders=[];
  for(const i of items){const sku=i.sku||input.sku;const catalog=sku?await SparePartCatalog.findOne({$or:[{code:sku},{humanId:sku}]}).session(session||null):null;
   const price=Number(i.price),qty=i.qty??input.qty??1,required=['ncc'];if(payer==='brand'&&price*qty>=(settings?.partsApprovalThreshold??0))required.unshift('brand');
   const [p]=await PartOrder.create([{serviceProvider:providerId,job:job._id,warrantyClaim:c._id,serviceRequest:sr._id,brand:c.brand,partName:i.name.trim(),sku,partNumber:catalog?.code||sku,price,qty,orderSource:input.orderSource||'NCC Warehouse',fulfillmentType:input.fulfillmentType||(input.orderSource==='Partner Brand'||input.orderSource==='Nearby Store'?'procurement':'in_stock'),payer,approval:{required,brand:{status:required.includes('brand')?'Pending':'Not Required'},ncc:{status:'Pending'}},customerApprovalStatus:payer==='brand'?'Approved':'Pending',statusHistory:[{status:'Pending',at:new Date(),actor}]}],session?{session}:{});
   orders.push(p);event(c,p,'PART_REQUESTED',actor,input.notes||`Requested ${p.partName}`);
  }
  job.spareParts=orders.map(p=>({name:p.partName,sku:p.sku,price:p.price,checked:true,source:'manual'}));job.activeStep='completed_pending';job.revisit={status:'Pending Approval',partOrderId:orders[0]._id,notes:input.notes};await savePartsJob(job,session);
  sr.status='Spare Ordered';sr.timeline.push({stepLabel:'Spare Ordered',done:true,timestamp:new Date(),description:'Parts awaiting required approvals'});await sr.save(session?{session}:undefined);
  await persistClaim(c,{session});
 });await flushAudit(c);await syncClaimFromJob(c.serviceRequest);await notify(c,providerId,true);
 if(orders.some(p=>p.payer==='customer'))await sendAdHocPush({recipientId:c.customer,brand:c.brand,warrantyClaim:c._id,title:'Approve spare part cost',body:`Review the replacement parts for ${c.humanId}`,cta:{label:'Review parts',route:`/partner-warranty/claims/${c.id}`}}).catch(()=>{});
 return {job,partOrders:orders};
}
async function resumeAfterRejection(p,session){
 const open=await PartOrder.exists({brand:p.brand,job:p.job,status:{$nin:['Rejected','Installed']}}).session(session||null);
 if(open)return;
 const job=await Job.findById(p.job).session(session||null);
 if(job?.activeStep!=='completed_pending')return;
 job.activeStep='spareapproval';job.spareParts.forEach(x=>{x.checked=false;});job.revisit={};await savePartsJob(job,session);
 const sr=await ServiceRequest.findById(p.serviceRequest).session(session||null);sr.status='Diagnosis Done';sr.timeline.push({stepLabel:'Parts Rejected',done:true,timestamp:new Date(),description:'All requested parts rejected; technician may revise diagnosis or request a replacement'});await sr.save(session?{session}:undefined);
}
export async function changePart({id,brand,providerId,jobId,actor,status,remarks,photoUrl}){
 let c,p,job;
 if(photoUrl&&!isOwnUploadUrl(photoUrl))throw new ApiError(400,'Upload the installation photo first');
 await runInTransaction(async session=>{
  p=await PartOrder.findOne({_id:id,...(brand?{brand}:{}),...(providerId?{serviceProvider:providerId}: {})}).session(session||null);
  if(!p?.warrantyClaim)throw new ApiError(404,'Warranty part request not found');
  c=await WarrantyClaim.findOne({_id:p.warrantyClaim,...(brand?{brand}:{})}).session(session||null);job=await Job.findById(p.job).session(session||null);
  if(jobId&&String(job._id)!==String(jobId)&&job.humanId!==jobId)throw new ApiError(404,'Part not found on this job');
  if(!c||terminal.includes(c.status)||c.status==='On Hold')throw new ApiError(409,'This ticket cannot be changed');
  let action;
  if(brand){
   if(!p.approval.required.includes('brand')||p.approval.brand.status!=='Pending'||['Installed','Rejected'].includes(p.status))throw new ApiError(409,'No pending brand approval');
   if(status==='Rejected'&&!['Pending','Approved'].includes(p.status))throw new ApiError(409,'The part has already been shipped or handed over');
   p.approval.brand={status,by:actor,at:new Date(),remarks};action=status==='Approved'?'PART_APPROVED':'PART_REJECTED';
   if(status==='Rejected')history(p,status,actor);else p.statusHistory.push({status:'Brand Approved',at:new Date(),actor});
  }else{
   if(providerId){
    if(p.approval.required.includes('brand')&&p.approval.brand.status!=='Approved')throw new ApiError(409,'Awaiting brand approval');
    if(p.approval.ncc.status!=='Approved')throw new ApiError(409,'Awaiting NCC approval');
    if(p.payer==='customer'&&p.customerApprovalStatus!=='Approved')throw new ApiError(409,'Awaiting customer approval');
    if(status==='Received'&&!['Delivered','Handed Over','Dispatched'].includes(p.status))throw new ApiError(409,'The part has not been dispatched or handed over');
    if(status==='Installed'&&!(p.status==='Received'||p.status==='Handed Over'&&p.fulfillmentType==='in_stock'))throw new ApiError(409,'Receive the part before installation');
   }else{
    if(p.approval.required.includes('brand')&&p.approval.brand.status!=='Approved')throw new ApiError(409,'Awaiting brand approval');
    if(status!=='Rejected'&&p.payer==='customer'&&p.customerApprovalStatus!=='Approved')throw new ApiError(409,'Awaiting customer approval');
    const ladder=p.fulfillmentType==='in_stock'?['Pending','Approved','Ready to Hand Over','Handed Over']:['Pending','Approved','Dispatched','Delivered'];
    if(status==='Rejected'){if(!['Pending','Approved'].includes(p.status))throw new ApiError(409,'This part can no longer be rejected');}
    else if(ladder.indexOf(status)!==ladder.indexOf(p.status)+1||!ladder.includes(status))throw new ApiError(409,'Follow the part fulfillment steps in order');
    if(status==='Approved'||status==='Rejected')p.approval.ncc={status,by:actor,at:new Date(),remarks};
   }
   history(p,status,actor);action=status==='Approved'?'PART_APPROVED':status==='Rejected'?'PART_REJECTED':status==='Received'?'PART_RECEIVED':status==='Installed'?'PART_INSTALLED':'PART_DISPATCHED';
   if(status==='Received')p.receivedAt=new Date();if(status==='Installed'){p.installedAt=new Date();p.installPhotoUrl=photoUrl;}
  }
  await p.save(session?{session}:undefined);if(p.status==='Rejected')await resumeAfterRejection(p,session);event(c,p,action,actor,remarks||`${p.partName}: ${brand?'Brand ':''}${status}`);
  // Only actual receipt releases the revisit. Approval/dispatch keep PARTS_REQUIRED.
  if(['Received','Handed Over'].includes(status)&&!brand&&job.activeStep==='completed_pending'){
   const remaining=await PartOrder.countDocuments({brand:p.brand,job:job._id,status:{$nin:['Received','Installed','Rejected','Handed Over']}}).session(session||null);
   if(!remaining){job.activeStep='revisit_scheduled';job.revisit={...job.revisit?.toObject(),status:'Scheduled',scheduledDate:job.revisit?.scheduledDate||new Date(Date.now()+86400000),timeSlot:job.revisit?.timeSlot||'10:00 AM - 01:00 PM',partReceivedAt:new Date()};await savePartsJob(job,session);const sr=await ServiceRequest.findById(p.serviceRequest).session(session||null);sr.status='Spare Received';sr.timeline.push({stepLabel:'Spare Received',done:true,timestamp:new Date(),description:'All requested parts received'});await sr.save(session?{session}:undefined);}
  }
  await persistClaim(c,{session});
 });await flushAudit(c);await syncClaimFromJob(c.serviceRequest);await notify(c,p.serviceProvider);return p;
}
export async function listParts(brand,query={}){
 const filter={brand};if(query.status)filter.status=query.status;if(query.approval)filter['approval.brand.status']=query.approval;
 if(query.tab==='awaiting'){filter['approval.brand.status']='Pending';filter.status={$nin:['Installed','Rejected']};}if(query.tab==='installed')filter.status='Installed';if(query.tab==='rejected')filter.status='Rejected';if(query.tab==='progress'){filter.status={$nin:['Installed','Rejected']};filter['approval.brand.status']={$ne:'Pending'};}
 if(query.from||query.to)filter.createdAt={...(query.from?{$gte:new Date(query.from)}:{}),...(query.to?{$lt:new Date(new Date(query.to).getTime()+86400000)}:{})};
 if(query.ticket){const ticket=await WarrantyClaim.findOne({...key(query.ticket),brand}).select('_id');filter.warrantyClaim=ticket?._id||null;}
 if(query.q){const re=new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');filter.$or=[{partName:re},{partNumber:re},{sku:re}];}
 const p=parsePagination(query);const [items,total]=await Promise.all([PartOrder.find(filter).populate({path:'warrantyClaim',select:'humanId brandTicketNo',match:{brand}}).populate('serviceRequest','humanId').populate('serviceProvider','name').sort({createdAt:-1}).skip(p.skip).limit(p.limit),PartOrder.countDocuments(filter)]);return {items,meta:paginationMeta({page:p.page,limit:p.limit,total})};
}
export async function ticketParts(id,brand){return PartOrder.find({warrantyClaim:id,brand}).populate('serviceProvider','name').sort({createdAt:1});}
export async function providerParts(providerId,jobId){const job=await Job.findOne({...key(jobId),serviceProvider:providerId});if(!job)throw new ApiError(404,'Job not found');return PartOrder.find({job:job._id,serviceProvider:providerId}).sort({createdAt:1});}

export async function customerParts(userId,ticketId){const c=await WarrantyClaim.findOne({...key(ticketId),customer:userId});if(!c)throw new ApiError(404,'Ticket not found');return PartOrder.find({warrantyClaim:c._id}).select('partName partNumber qty price payer status customerApprovalStatus');}
export async function respondCustomerPart(userId,ticketId,partId,approved){let c,p;const actor=await actorFromUser(userId,'customer');await runInTransaction(async session=>{c=await WarrantyClaim.findOne({...key(ticketId),customer:userId}).session(session||null);if(!c)throw new ApiError(404,'Ticket not found');p=await PartOrder.findOne({_id:partId,warrantyClaim:c._id,payer:'customer'}).session(session||null);if(!p)throw new ApiError(404,'Part request not found');if(terminal.includes(c.status)||p.status!=='Pending'||p.customerApprovalStatus!=='Pending')throw new ApiError(409,'This part request has already been answered');p.customerApprovalStatus=approved?'Approved':'Rejected';p.customerRespondedAt=new Date();if(!approved)history(p,'Rejected',actor);else p.statusHistory.push({status:'Customer Approved',at:new Date(),actor});await p.save(session?{session}:undefined);if(!approved)await resumeAfterRejection(p,session);event(c,p,approved?'PART_APPROVED':'PART_REJECTED',actor,approved?'Customer approved the part cost':'Customer declined the part cost');await persistClaim(c,{session});});await flushAudit(c);await syncClaimFromJob(c.serviceRequest);await notify(c,p.serviceProvider);return p;}
