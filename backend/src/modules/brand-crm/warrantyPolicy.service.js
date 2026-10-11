import mongoose from 'mongoose';
import { WarrantyPolicy } from './warrantyPolicy.model.js';
import { ProductSerial } from './productSerial.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { Category } from '../catalog/category.model.js';
import { ProductType } from '../catalog/productType.model.js';
import { WarrantyIssue } from '../partner-warranty/warrantyIssue.model.js';
import { fieldDiff } from '../shared/auditContext.js';
import { recordAction } from '../shared/auditLog.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { runInTransaction } from '../../utils/transaction.js';
import { evaluateResolvedWarranty } from './warrantyEvaluation.js';
import { policySchema } from './warrantyPolicy.validation.js';
const oid=id=>id?String(id):null;
const same=(a,b)=>oid(a)===oid(b);
export function matchesModel(pattern,model){
 const chunks=pattern.toUpperCase().split('*'),value=model.trim().toUpperCase();
 if(!value.startsWith(chunks[0]))return false;let offset=chunks[0].length;
 for(const chunk of chunks.slice(1)){const index=value.indexOf(chunk,offset);if(index<0)return false;offset=index+chunk.length;}return true;
}
export async function resolvePolicy(brand,{category,productType,model},at=new Date()){
 const brandId=brand._id||brand;
 const policies=await WarrantyPolicy.find({brand:brandId,isActive:true,$and:[{$or:[{effectiveFrom:null},{effectiveFrom:{$lte:at}}]},{$or:[{effectiveTo:null},{effectiveTo:{$gte:new Date(new Date(at).toISOString().slice(0,10))}}]}]}).lean();
 const matched=policies.filter(p=> (!p.appliesTo.category||same(p.appliesTo.category,category))&&(!p.appliesTo.productType||same(p.appliesTo.productType,productType))&&(!p.appliesTo.modelPattern||(model&&matchesModel(p.appliesTo.modelPattern,model))));
 const rank=p=>p.appliesTo.modelPattern?3:p.appliesTo.productType?2:p.appliesTo.category?1:0;
 matched.sort((a,b)=>rank(b)-rank(a)||new Date(b.effectiveFrom||0)-new Date(a.effectiveFrom||0)||b.version-a.version||String(a._id).localeCompare(String(b._id)));
 if(matched.length)return matched[0];
 const doc=brand.name?brand:await Brand.findById(brandId).lean();
 if(!doc)throw new ApiError(404,'Brand not found');
 return {synthetic:true,name:'Manufacturer duration (coverage unconfigured)',version:0,warrantyMonths:doc.warrantyMonths??12,requireInvoice:true,requireSerial:true,coverage:{}};
}
export async function evaluateWarranty(input,{at=new Date(),policy: frozenPolicy}={}){
 const brand=input.brand._id||input.brand;
 const [policy,registry]=await Promise.all([frozenPolicy || resolvePolicy(input.brand,input,at),input.serial?ProductSerial.findOne({brand,serialNumber:String(input.serial).trim().toUpperCase()}).lean():null]);
 return evaluateResolvedWarranty(input,{policy,registry,at});
}
async function assertScope(brand,data){
 const doc=await Brand.findById(brand).select('coverage').lean();if(!doc)throw new ApiError(404,'Brand not found');
 const {category,productType}=data.appliesTo;
 if(category&&!doc.coverage.some(c=>same(c,category)))throw new ApiError(400,'Policy category must belong to brand coverage');
 if(productType&&!await ProductType.exists({_id:productType,...(category?{category}:{category:{$in:doc.coverage}})}))throw new ApiError(400,'Product type does not belong to this policy scope');
 if(data.coverage.excludedIssues.length){const n=await WarrantyIssue.countDocuments({_id:{$in:[...new Set(data.coverage.excludedIssues)]},category:category||{$in:doc.coverage}});if(n!==new Set(data.coverage.excludedIssues).size)throw new ApiError(400,'Excluded issues must belong to policy scope');}
}
export async function createPolicy(brand,actor,input){const data=policySchema.parse(input);await assertScope(brand,data);const policy=await WarrantyPolicy.create({...data,brand,policyKey:new mongoose.Types.ObjectId(),version:1});await recordAction({brand,actor,type:'Warranty',entityType:'WarrantyPolicy',entityId:policy._id,action:'warranty_policy.created',meta:{name:policy.name,version:1}});return policy;}
export async function listPolicies(brand){return WarrantyPolicy.find({brand}).sort({name:1,version:-1});}
export async function findPolicy(brand,id){const p=await WarrantyPolicy.findOne({_id:id,brand});if(!p)throw new ApiError(404,'Policy not found');return p;}
export async function versionPolicy(brand,id,actor,input){const data=policySchema.parse(input);await assertScope(brand,data);let next;const prior=await findPolicy(brand,id);
 await runInTransaction(async session=>{const previous=await WarrantyPolicy.findOne({_id:id,brand,isActive:true}).session(session||null);if(!previous)throw new ApiError(409,'This policy version is no longer active');
  const changed=await WarrantyPolicy.updateOne({_id:previous._id,brand,isActive:true},{$set:{isActive:false}},{session});if(!changed.modifiedCount)throw new ApiError(409,'Policy was just changed; reload before editing');
  try{[next]=await WarrantyPolicy.create([{...data,brand,policyKey:previous.policyKey,version:previous.version+1}],{session});}catch(e){if(!session)await WarrantyPolicy.updateOne({_id:previous._id,brand},{$set:{isActive:true}});throw e;}
 });await recordAction({brand,actor,type:'Warranty',entityType:'WarrantyPolicy',entityId:next._id,action:'warranty_policy.versioned',meta:{previous:id,version:next.version,changes:fieldDiff(prior.toObject(),next.toObject(),Object.keys(data))}});return next;}
export async function deactivatePolicy(brand,id,actor){const p=await findPolicy(brand,id);const before=p.isActive;p.isActive=false;await p.save();await recordAction({brand,actor,type:'Warranty',entityType:'WarrantyPolicy',entityId:p._id,action:'warranty_policy.deactivated',meta:{changes:{isActive:[before,false]}}});return p;}
/** Quoted CSV parser (commas, escaped quotes and embedded newlines). */
export function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;const value=text.replace(/^\uFEFF/,'');for(let i=0;i<value.length;i++){const c=value[i];if(c==='"'){if(quoted&&value[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&value[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw new ApiError(400,'CSV contains an unclosed quote');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;}
export async function importSerials(brand,actor,{csv,dryRun}){
 const rows=parseCsv(csv);if(!rows.length)throw new ApiError(400,'CSV is empty');if(rows.length>5001)throw new ApiError(400,'Import at most 5000 serials at a time');
 const headers=rows.shift().map(h=>h.toLowerCase());if(!headers.includes('serial'))throw new ApiError(400,'CSV requires a serial column');
 const brandDoc=await Brand.findById(brand).select('coverage').lean();if(!brandDoc)throw new ApiError(404,'Brand not found');const categories=await Category.find({_id:{$in:brandDoc.coverage}}).select('key').lean();const cats=new Map(categories.map(c=>[c.key.toLowerCase(),c._id]));const seen=new Set(),valid=[],errors=[];
 rows.forEach((cells,index)=>{const r=Object.fromEntries(headers.map((h,i)=>[h,cells[i]||'']));const serialNumber=r.serial.trim().toUpperCase();const messages=[];
  if(!serialNumber||serialNumber.length>60)messages.push('Serial is required (maximum 60 characters)');if(seen.has(serialNumber))messages.push('Duplicate serial in CSV');seen.add(serialNumber);
  const key=r['category key']||r.category||r.categorykey;const category=cats.get(key?.toLowerCase());if(!category)messages.push('Category must be in brand coverage');
  const doc={brand,serialNumber,modelNumber:r.model?.trim().toUpperCase(),category};for(const [header,field] of [['manufacturedon','manufacturedOn'],['soldon','soldOn'],['warrantystartson','warrantyStartsOn']])if(r[header]){const d=new Date(r[header]);if(!/^\d{4}-\d{2}-\d{2}$/.test(r[header])||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==r[header])messages.push(`${field}: use a valid YYYY-MM-DD date`);else doc[field]=d;}
  if(doc.manufacturedOn&&doc.soldOn&&doc.soldOn<doc.manufacturedOn)messages.push('Sold date precedes manufacture');
  if(messages.length)errors.push({row:index+2,messages});else valid.push(doc);
 });
 if(!dryRun&&errors.length)throw new ApiError(400,'Fix CSV errors before importing',{errors,ok:valid.length});
 if(!dryRun){if(valid.length)await ProductSerial.bulkWrite(valid.map(doc=>({updateOne:{filter:{brand,serialNumber:doc.serialNumber},update:{$set:doc},upsert:true}})));await recordAction({brand,actor,type:'Warranty',entityType:'ProductSerial',action:'serials.imported',meta:{rows:valid.length}});}
 return {dryRun,total:rows.length,ok:valid.length,errors,imported:dryRun?0:valid.length};
}
export async function listSerials(brand,q=''){const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return ProductSerial.find({brand,...(q?{$or:[{serialNumber:new RegExp(escaped,'i')},{modelNumber:new RegExp(escaped,'i')}]}:{})}).sort({serialNumber:1}).limit(200).populate('category','key name');}
