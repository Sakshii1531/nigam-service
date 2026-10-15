import { Brand } from '../super-admin/brand.model.js';
import { User } from '../auth/user.model.js';
import { Category } from '../catalog/category.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { WarrantyIssue } from '../partner-warranty/warrantyIssue.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { BrandCustomer } from './brandCustomer.model.js';
import { createCustomer, auditCustomerCreation } from './customer360.service.js';
import { isBrandCustomer } from './brandCustomer.service.js';
import { actorFromUser } from './actor.js';
import { createTicket, finishTicketCreation } from '../partner-warranty/ticketIntake.service.js';
import { appendEvent, saveClaim } from '../partner-warranty/claimTimeline.js';
import { evaluateWarranty } from './warrantyPolicy.service.js';
import { runInTransaction } from '../../utils/transaction.js';
import { isOwnUploadUrl } from '../shared/fileUpload.js';
import { emit as notify } from '../notifications/notification.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { registrationSchema } from './registration.validation.js';
import { SERVICE_TYPES, STAFF_SOURCES, TICKET_PRIORITIES, VISIT_SLOTS, MAX_TICKET_VIDEOS } from '../partner-warranty/ticketConstants.js';
import { visitDateRange } from '../shared/preferredVisit.js';
async function brandFor(id, { includeInactive = false } = {}) {
  const brand = await Brand.findOne({_id:id,...(includeInactive ? {} : {status:'Active'})}).lean();
  if (!brand) throw new ApiError(404,'Brand not found');
  return brand;
}
export async function formOptions(brandId, options = {}) {
  const brand = await brandFor(brandId, options);
  const categories = await Category.find({_id:{$in:brand.coverage},isActive:true}).sort({sortOrder:1,name:1}).lean();
  const ids = categories.map(c=>c._id);
  const [types,issues] = await Promise.all([ProductType.find({category:{$in:ids},isActive:true}).sort({sortOrder:1,name:1}).lean(), WarrantyIssue.find({category:{$in:ids},isActive:true}).sort({sortOrder:1,name:1}).lean()]);
  return { brand:{id:String(brand._id),name:brand.name}, categories:categories.map(c=>({id:String(c._id),key:c.key,name:c.name,
    productTypes:types.filter(t=>String(t.category)===String(c._id)).map(t=>({id:String(t._id),name:t.name})),
    issues:issues.filter(i=>String(i.category)===String(c._id)).map(i=>({id:String(i._id),name:i.name,productTypeId:i.productType?String(i.productType):null}))})),
    serviceTypes:SERVICE_TYPES,priorities:TICKET_PRIORITIES,slots:VISIT_SLOTS,sources:STAFF_SOURCES,visitDates:visitDateRange() };
}
export async function previewWarranty(brandId,{product={},documents=[],categoryId,productTypeId,issueId,serviceType='repair'}) {
  const brand=await brandFor(brandId);
  return evaluateWarranty({brand,category:categoryId,productType:productTypeId,issue:issueId,serviceType,model:product.modelNumber,serial:product.serialNumber,purchaseDate:product.purchaseDate,hasInvoice:documents.some(d=>d.kind==='invoice')});
}
export async function registerTicket(brandId,actor,input,{canApprove=false,canVerify=false}={}) {
  const data=registrationSchema.parse(input);
  if (data.approveNow && !canApprove) throw new ApiError(403,'Missing permission: tickets:approve');
  const brand=await brandFor(brandId);
  const category=await Category.findOne({_id:data.categoryId,isActive:true}).lean();
  if (!category || !brand.coverage.some(id=>String(id)===String(category._id))) throw new ApiError(400,'Brand does not service this product');
  const productType=data.productTypeId ? await ProductType.findOne({_id:data.productTypeId,category:category._id,isActive:true}).lean() : null;
  if (data.productTypeId && !productType) throw new ApiError(400,'That product type does not belong to this product');
  const issue=data.issueId ? await WarrantyIssue.findOne({_id:data.issueId,category:category._id,isActive:true}).lean() : null;
  if (data.issueId && (!issue || (issue.productType && String(issue.productType)!==data.productTypeId))) throw new ApiError(400,'That issue does not belong to this product type');
  if (data.documents.filter(d=>d.kind==='video').length>MAX_TICKET_VIDEOS) throw new ApiError(400,'A ticket can hold at most 2 videos');
  if (data.documents.some(d=>!isOwnUploadUrl(d.url))) throw new ApiError(400,'Documents must be uploaded through the app first');
  let address=data.address,product=data.product||{};
  if(data.customerId) {
    if (!await User.exists({_id:data.customerId,role:'customer',status:'Active'})) throw new ApiError(404,'Customer not found');
    if (typeof address==='string' || data.applianceId) {
      if (!await isBrandCustomer(brandId,data.customerId)) throw new ApiError(404,'Customer not found');
    }
    if(typeof address==='string') {
      const user=await User.findById(data.customerId).select('addresses').lean();
      const saved=user.addresses.find(a=>String(a._id)===address);
      if(!saved) throw new ApiError(400,'Address not found');
      address={name:saved.name,house:saved.house,landmark:saved.landmark,city:saved.city,state:saved.state,pincode:saved.pincode,latitude:saved.latitude,longitude:saved.longitude};
      if(!/^\d{6}$/.test(String(address.pincode||''))) throw new ApiError(400,'A 6-digit pincode is required for the service visit');
    }
    if(data.applianceId) {
      const appliance=await OwnedAppliance.findOne({_id:data.applianceId,user:data.customerId,brandRef:brandId,category:category.key}).lean();
      if(!appliance) throw new ApiError(404,'Product not found');
      product={modelNumber:appliance.modelNumber||appliance.model,serialNumber:appliance.serialNumber,purchaseDate:appliance.purchaseDate};
      if(appliance.invoiceFileUrl && !data.documents.some(d=>d.kind==='invoice')) data.documents.push({kind:'invoice',url:appliance.invoiceFileUrl});
    }
  } else if (typeof address==='string' || data.applianceId) throw new ApiError(400,'New customers need a visit address and new product');
  let creation,claim;
  await runInTransaction(async session=>{
    creation=null;
    try {
      if(data.newCustomer) creation=await createCustomer(brandId,actor,{...data.newCustomer,address},{session,transactionOwned:true,deferAudit:true});
      claim=await createTicket({customer:creation?.user._id||data.customerId,brand,category,productType,issue,issueName:data.issueName,
        ...product,serviceType:data.serviceType,priority:data.priority,remarks:data.remarks,preferredVisit:data.preferredVisit,address,
        documents:data.documents.map(d=>({...d,uploadedBy:actor.user,uploadedAt:new Date()}))},
      {source:data.source,actor,approveNow:data.approveNow,approval:data.approval,canVerify,session,transactionOwned:true,deferEffects:true});
    } catch(err) {
      if(!session && creation) {
        await Promise.all([User.deleteOne({_id:creation.user._id}),BrandCustomer.deleteOne({_id:creation.relationship._id}),
          WarrantyClaim.deleteMany({customer:creation.user._id}),OwnedAppliance.deleteMany({user:creation.user._id})]);
      }
      throw err;
    }
  });
  if(creation) await auditCustomerCreation(brandId,actor,creation);
  claim=await finishTicketCreation(claim,brand);
  await claim.populate('serviceRequest','humanId');
  return {id:claim.id,humanId:claim.humanId,brandTicketNo:claim.brandTicketNo,jobNo:claim.serviceRequest?.humanId||null,
    customerId:String(claim.customer),source:claim.source,status:claim.status,warranty:claim.warranty,registeredBy:claim.registeredBy,assignedCce:claim.assignedCce,createdAt:claim.createdAt};
}
export async function assignCce(brandId,id,actor,userId) {
  const claim=await WarrantyClaim.findOne({_id:id,brand:brandId});
  if(!claim) throw new ApiError(404,'Ticket not found');
  if(!await User.exists({_id:userId,brand:brandId,role:'brand_admin',status:'Active'})) throw new ApiError(400,'Choose an active user of this brand');
  const assignee=await actorFromUser(userId,'brand');
  const previous=claim.assignedCce?.user ? String(claim.assignedCce.user) : null;
  claim.assignedCce={...assignee,assignedAt:new Date()};
  appendEvent(claim,{action:'CCE_ASSIGNED',actor,visibility:'brand',note:`Assigned to ${assignee.name}`,meta:{userId,changes:{assignedCce:[previous,String(userId)]}}});
  await saveClaim(claim);
  await notify('brand.ticket_assigned',{user:userId,brand:brandId,warrantyClaim:claim._id,humanId:claim.humanId,cta:{label:'View ticket',route:`/brand-admin/warranty-claims/${claim.id}`}});
  return {id:claim.id,assignedCce:claim.assignedCce};
}
