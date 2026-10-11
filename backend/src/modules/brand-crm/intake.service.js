import { createHash, randomBytes } from 'node:crypto';
import { ApiError } from '../../middleware/errorHandler.js';
import { User } from '../auth/user.model.js';
import { hashPassword } from '../auth/password.js';
import { Brand } from '../super-admin/brand.model.js';
import { Category } from '../catalog/category.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { WarrantyIssue } from '../partner-warranty/warrantyIssue.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { createTicket, finishTicketCreation } from '../partner-warranty/ticketIntake.service.js';
import { customerStatusLabel } from '../partner-warranty/claimStatus.js';
import { ApiKey } from './apiKey.model.js';
import { IntakeRequest } from './intakeRequest.model.js';
import { IntakeUpload } from './intakeUpload.model.js';
import { BrandCustomer } from './brandCustomer.model.js';
import { runInTransaction } from '../../utils/transaction.js';
import { intakeTicketSchema } from './intake.validation.js';
import { formOptions } from './registration.service.js';
import { intakeAudit } from './intakeAuth.middleware.js';

export async function intakeBrand(integration,id) {
  if(integration.brand && String(integration.brand)!==String(id))throw new ApiError(403,'Key cannot access this brand');
  if(!/^[a-f\d]{24}$/i.test(id || ''))throw new ApiError(400,'Invalid brand');
  const brand=await Brand.findOne({_id:id,status:'Active',warrantyEnabled:true}).lean();
  if(!brand)throw new ApiError(404,'Warranty-enabled brand not found');
  return brand;
}
export async function catalog(integration,id) {
  await intakeBrand(integration,id);
  const {brand,categories,serviceTypes}=await formOptions(id);
  return {brand,categories,serviceTypes};
}
export async function selection(integration,data) {
  const brand=await intakeBrand(integration,data.brandId);
  const category=await Category.findOne({_id:data.categoryId,isActive:true}).lean();
  if(!category||!brand.coverage.some(id=>String(id)===String(category._id)))throw new ApiError(400,'Brand does not service this product');
  const productType=data.productTypeId ? await ProductType.findOne({_id:data.productTypeId,category:category._id,isActive:true}).lean() : null;
  if(data.productTypeId&&!productType)throw new ApiError(400,'Product type does not belong to this product');
  const issue=data.issueId ? await WarrantyIssue.findOne({_id:data.issueId,category:category._id,isActive:true}).lean() : null;
  if(data.issueId&&(!issue||(issue.productType&&String(issue.productType)!==data.productTypeId)))throw new ApiError(400,'Issue does not belong to this product type');
  return {brand,category,productType,issue};
}
export async function validateDocuments(integration,documents) {
  for(const doc of documents){
    let https=false;try{const u=new URL(doc.url);https=u.protocol==='https:'&&Boolean(u.hostname)&&!u.username&&!u.password;}catch{/* local upload */}
    if(!https&&!await IntakeUpload.exists({key:integration.keyId,url:doc.url}))throw new ApiError(400,'Documents must be HTTPS URLs or uploads made by this key');
  }
}
const stable = v => Array.isArray(v) ? v.map(stable) : v&&typeof v==='object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])) : v;
export const ticketView=c=>({ticketNo:c.humanId,brandTicketNo:c.brandTicketNo,status:c.status,customerStatusLabel:customerStatusLabel(c.status),warrantyStatus:c.warranty.status});
// Public labels deliberately combine internal allocation and offer states.
const PUBLIC_STAGE={PARTNER_FINDING:'Finding a service partner',JOB_OFFERED:'Finding a service partner',ALLOCATION_FAILED:'Finding a service partner',
 PARTNER_ASSIGNED:'Partner assigned',VISIT_SCHEDULED:'Visit scheduled',EN_ROUTE:'Technician on way',REACHED:'Technician reached',DIAGNOSIS:'Diagnosis',PARTS_REQUIRED:'Waiting for parts',REPAIR:'Repair in progress',COMPLETED:'Service completed',CUSTOMER_CONFIRMATION:'Awaiting your confirmation',CLOSED:'Closed',CANCELLED:'Cancelled'};
export async function readTicket(integration,no) {
  const filter={humanId:no};
  if(integration.brand){filter.brand=integration.brand;filter['sourceRef.apiKey']={$in:await ApiKey.find({brand:integration.brand}).distinct('_id')};}
  else filter['sourceRef.apiKey']=integration.keyId;
  const c=await WarrantyClaim.findOne(filter).select('humanId brandTicketNo status warranty.status jobStage createdAt updatedAt').lean();
  if(!c)throw new ApiError(404,'Ticket not found');
  return {...ticketView(c),jobStage:PUBLIC_STAGE[c.jobStage]||null,createdAt:c.createdAt,updatedAt:c.updatedAt};
}
async function replayTicket(req,filter,bodyHash) {
  for(let attempt=0;attempt<40;attempt++){
      const prior=await IntakeRequest.findOne(filter).lean();
      if(!prior)throw new ApiError(409,'Previous attempt failed; retry this request');
      req.intakeBrand=prior.brand;
      if(prior.bodyHash!==bodyHash)throw new ApiError(409,'Idempotency-Key was already used with a different body');
      if(prior.response){await intakeAudit(req,'intake.replayed',null,prior.ticket);return {data:prior.response,replayed:true};}
      // Recover a committed ticket after a process stopped before recording its response.
      const saved=await WarrantyClaim.findOne({'sourceRef.apiKey':req.integration.keyId,'sourceRef.externalId':filter.externalId}).lean();
      if(saved){const response=ticketView(saved);await IntakeRequest.updateOne(filter,{$set:{ticket:saved._id,response}});await intakeAudit(req,'intake.replayed',null,saved._id);return {data:response,replayed:true};}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new ApiError(409,'Request is still processing; retry with the same key and body');
}
export async function submitTicket(req) {
  const integration=req.integration,externalId=req.get('Idempotency-Key');
  if(!externalId||!/^[\x21-\x7e]{1,128}$/.test(externalId))throw new ApiError(400,'Idempotency-Key must contain 1–128 printable non-space characters');
  const bodyHash=createHash('sha256').update(JSON.stringify(stable(req.body ?? null))).digest('hex');
  const filter={key:integration.keyId,externalId};
  if(await IntakeRequest.exists(filter))return replayTicket(req,filter,bodyHash);
  const data=intakeTicketSchema.parse(req.body);
  if(!integration.allowedSources.includes(data.source))throw new ApiError(403,'Source is not allowed for this key');
  const picks=await selection(integration,data);req.intakeBrand=picks.brand._id;
  await validateDocuments(integration,data.documents);
  let reservation;
  try{reservation=await IntakeRequest.create({...filter,bodyHash,brand:picks.brand._id});}
  catch(e){
    if(e.code!==11000)throw e;
    return replayTicket(req,filter,bodyHash);
  }
  let claim, newCustomerId;
  try {
    const passwordHash=await hashPassword(randomBytes(32).toString('hex'));
    // Identity and ticket commit together. Retry a phone-index race using the
    // winning identity, without changing its name or contact information.
    for(let attempt=0;attempt<3;attempt++) {
      try {
        await runInTransaction(async session=>{
          newCustomerId=null;
          let customer=await User.findOne({phone:data.customer.phone,role:'customer'}).session(session);
          if(!customer){customer=new User({...data.customer,email:data.customer.email||undefined,role:'customer',passwordHash});
            await customer.save(session?{session}:undefined);newCustomerId=customer._id;}
          if(customer.status!=='Active')throw new ApiError(400,'Customer account is not active');
          await BrandCustomer.updateOne({brand:picks.brand._id,customer:customer._id},{$setOnInsert:{createdBy:null}},{upsert:true,session});
          claim=await createTicket({...picks,customer:customer._id,customerSnapshot:data.customer,...data.product,serviceType:data.serviceType,
            remarks:data.remarks,address:data.address,preferredVisit:data.preferredVisit,issueName:data.issueName,documents:data.documents.map(d=>({...d,uploadedAt:new Date()}))},
            {source:data.source,sourceRef:{apiKey:integration.keyId,externalId},actor:integration.actor,session,transactionOwned:true,deferEffects:true});
          await IntakeRequest.updateOne({_id:reservation._id},{$set:{ticket:claim._id,response:ticketView(claim)}},{session});
        });
        break;
      } catch(e) {
        if(e.code!==11000||attempt===2)throw e;
        if(!await User.exists({phone:data.customer.phone,role:'customer'}))throw new ApiError(409,'Customer email already registered');
      }
    }
  }catch(e){
    const saved=await WarrantyClaim.findOne({'sourceRef.apiKey':integration.keyId,'sourceRef.externalId':externalId});
    if(!saved){
      await IntakeRequest.deleteOne({_id:reservation._id});
      // Only needed for the transaction helper's standalone development fallback.
      if(newCustomerId){await BrandCustomer.deleteMany({customer:newCustomerId});await User.deleteOne({_id:newCustomerId});}
    }
    throw e;
  }
  await intakeAudit(req,'intake.ticket_created',null,claim._id);
  await finishTicketCreation(claim,picks.brand,{autoApproveSources:[]});
  return {data:ticketView(claim),replayed:false};
}
