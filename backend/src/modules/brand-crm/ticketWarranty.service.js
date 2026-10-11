import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { evaluateWarranty } from './warrantyPolicy.service.js';
import { appendEvent,saveClaim } from '../partner-warranty/claimTimeline.js';
import { CLAIM_STATUS } from '../partner-warranty/claimStatus.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { Category } from '../catalog/category.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { WarrantyPolicy } from './warrantyPolicy.model.js';
import { upsertTicketAppliance } from '../service-requests/ownedAppliance.service.js';
import { runInTransaction } from '../../utils/transaction.js';
import { persistClaim,flushAudit } from '../partner-warranty/claimTimeline.js';
export async function reevaluateTicketWarranty(claim,actor,{force=false}={}){
 if(claim.warranty?.verifiedBy?.user&&!force)return;
 const previous=claim.warranty?.status;
 const policy=claim.warranty?.policy?.id?await WarrantyPolicy.findOne({_id:claim.warranty.policy.id,brand:claim.brand}).lean():undefined;
 const verdict=await evaluateWarranty({brand:claim.brand,category:claim.category,productType:claim.productType,model:claim.modelNumber,serial:claim.serialNumber,purchaseDate:claim.purchaseDate,hasInvoice:claim.documents.some(d=>d.kind==='invoice'),issue:claim.issue,serviceType:claim.serviceType},{policy});
 claim.warranty=verdict;
 if(previous!==verdict.status)appendEvent(claim,{action:'WARRANTY_VERIFIED',actor,visibility:'brand',note:`${previous} → ${verdict.status}`,meta:{reasons:verdict.reasons,policy:verdict.policy,changes:{'warranty.status':[previous,verdict.status]}}});
}
const beforeApproval=[CLAIM_STATUS.SUBMITTED,CLAIM_STATUS.BRAND_REVIEW,CLAIM_STATUS.INFO_REQUESTED,CLAIM_STATUS.ON_HOLD];
export async function overrideWarranty(brand,id,actor,{status,note}){
 const claim=await WarrantyClaim.findOne({_id:id,brand});if(!claim)throw new ApiError(404,'Ticket not found');
 if(!beforeApproval.includes(claim.status)||claim.serviceRequest)throw new ApiError(409,'Warranty can only be verified before approval');
 const previous=claim.warranty.status;
 claim.warranty.status=status;claim.warranty.verifiedBy=actor;claim.warranty.verifiedAt=new Date();claim.warranty.overrideNote=note;
 appendEvent(claim,{action:'WARRANTY_OVERRIDDEN',actor,visibility:'brand',note,meta:{status,changes:{'warranty.status':[previous,status]}}});await saveClaim(claim);return claim.warranty;
}
export async function editTicketProduct(brand,id,actor,input){
 let claim;await runInTransaction(async session=>{
  claim=await WarrantyClaim.findOne({_id:id,brand}).session(session||null);if(!claim)throw new ApiError(404,'Ticket not found');
  if(!beforeApproval.includes(claim.status)||claim.serviceRequest)throw new ApiError(409,'Product can only be edited before approval');
  const changes={};const brandDoc=await Brand.findById(brand).lean();
  if(input.categoryId){const c=await Category.findOne({_id:input.categoryId,isActive:true}).lean();if(!c||!brandDoc.coverage.some(i=>String(i)===String(c._id)))throw new ApiError(400,'Brand does not service this product');changes.category=[String(claim.category),String(c._id)];claim.category=c._id;claim.categoryKey=c.key;claim.productName=c.name;claim.productType=null;claim.issue=null;claim.issueName='Product details updated; issue requires review';}
  if(input.productTypeId!==undefined){if(input.productTypeId&&!await ProductType.exists({_id:input.productTypeId,category:claim.category,isActive:true}))throw new ApiError(400,'Product type does not belong to category');changes.productType=[claim.productType?String(claim.productType):null,input.productTypeId];claim.productType=input.productTypeId;}
  for(const key of ['modelNumber','serialNumber','purchaseDate'])if(input[key]!==undefined){changes[key]=[claim[key]??null,input[key]];claim[key]=input[key];}
  // Changing scope selects a policy for that scope; unchanged scope keeps its version.
  if(input.categoryId||input.productTypeId!==undefined||input.modelNumber!==undefined)claim.warranty.policy=null;
  await reevaluateTicketWarranty(claim,actor,{force:true});
  appendEvent(claim,{action:'PRODUCT_UPDATED',actor,visibility:'brand',meta:{changes}});
  await persistClaim(claim,{session});await upsertTicketAppliance(claim,brandDoc,{session});
 });await flushAudit(claim);return {id:claim.id,product:{categoryId:claim.category,productTypeId:claim.productType,modelNumber:claim.modelNumber,serialNumber:claim.serialNumber,purchaseDate:claim.purchaseDate},warranty:claim.warranty};
}
