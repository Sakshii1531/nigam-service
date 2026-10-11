import {PartOrder} from '../service-provider/partOrder.model.js';
import {Job} from '../service-provider/job.model.js';
import {ServiceRequest} from '../service-requests/serviceRequest.model.js';
import {WarrantyClaim} from '../partner-warranty/warrantyClaim.model.js';
import {BrandSettings} from '../brand-admin/brandSettings.model.js';
// Idempotent upgrade for pre-Phase-10 orders. Never infer a brand decision from
// a legacy NCC status, or replace historical shipping/receipt timestamps.
export async function backfillWarrantyParts({dryRun=true}={}){
 let matched=0,updated=0;
 const cursor=PartOrder.find({warrantyClaim:{$exists:false},job:{$ne:null}}).cursor();
 for await(const p of cursor){const job=await Job.findById(p.job).select('serviceRequest');const sr=job?await ServiceRequest.findById(job.serviceRequest).select('warrantyClaim'):null;const c=sr?.warrantyClaim?await WarrantyClaim.findById(sr.warrantyClaim):null;if(!c)continue;matched++;
  const settings=await BrandSettings.findOne({brand:c.brand});const payer=c.coverageDecision==='goodwill'||c.coverageDecision==='warranty'&&c.warranty?.policy?.coverage?.partsCovered===true?'brand':'customer';const required=['ncc'];if(payer==='brand'&&(p.price||0)*(p.qty||1)>=(settings?.partsApprovalThreshold??0))required.unshift('brand');
  if(dryRun)continue;
  const result=await PartOrder.updateOne({_id:p._id,warrantyClaim:{$exists:false}},{$set:{warrantyClaim:c._id,serviceRequest:sr._id,brand:c.brand,partNumber:p.sku,payer,approval:{required,brand:{status:required.includes('brand')?'Pending':'Not Required'},ncc:{status:p.status==='Pending'?'Pending':p.status==='Rejected'?'Rejected':'Approved'}},...(payer==='brand'?{customerApprovalStatus:'Approved'}:{})}});updated+=result.modifiedCount;
 }return {dryRun,matched,updated};
}
