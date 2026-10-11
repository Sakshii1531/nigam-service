import { initialJobPayout } from './servicePartnerPayout.js';
import { resolveRate } from '../brand-crm/rateResolver.js';
import { Category } from '../catalog/category.model.js';
import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
export async function coveredVisitRate(serviceRequest){
 // Catalogue-backed work keeps its booking snapshot; this path is for covered complaints.
 const claim=serviceRequest?.warrantyClaim?await WarrantyClaim.findById(serviceRequest.warrantyClaim).select('category serviceType address').lean():null;
 const category=claim?.category|| (await Category.findOne({key:serviceRequest?.category}).select('_id').lean())?._id;
 if(!serviceRequest?.warrantyClaim&&(serviceRequest?.amcSubscription||serviceRequest?.extendedWarrantyOrder))return {amount:150,missing:false};
 if(!serviceRequest?.brand||!category)return {amount:0,missing:true};
 const result=await resolveRate({brand:serviceRequest.brand,categoryId:category,serviceType:claim?.serviceType||'repair',state:claim?.address?.state||serviceRequest.address?.state,city:claim?.address?.city||serviceRequest.address?.city});
 return {amount:result.row?.partnerPayout??0,missing:result.row?.partnerPayout==null};
}
export async function coveredVisitEarnings(serviceRequest){return (await coveredVisitRate(serviceRequest)).amount;}
export async function estimateServiceProviderEarnings(serviceRequest,booking){return (await initialJobPayout(serviceRequest,booking)).total;}
