import { Router } from 'express';
import { intakeAuth, intakeScope, intakeAudit } from './intakeAuth.middleware.js';
import { catalog, submitTicket, readTicket, intakeBrand, selection, validateDocuments } from './intake.service.js';
import { stepSchema, stepSchemas } from './intake.validation.js';
import { Brand } from '../super-admin/brand.model.js';
import { IntakeUpload } from './intakeUpload.model.js';
import { upload, storeUploadedFile } from '../shared/fileUpload.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { ok } from '../../utils/respond.js';
export const intakeRouter=Router();
intakeRouter.use(intakeAuth);
const handle=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
intakeRouter.get('/brands',intakeScope('catalog:read'),handle(async(req,res)=>{
 const filter={status:'Active',warrantyEnabled:true};if(req.integration.brand)filter._id=req.integration.brand;
 const brands=await Brand.find(filter).sort({name:1}).select('name logoUrl').lean();
 await intakeAudit(req,'intake.catalog_read');ok(res,brands.map(b=>({id:String(b._id),name:b.name,logoUrl:b.logoUrl||null})));}));
intakeRouter.get('/brands/:id/catalog',intakeScope('catalog:read'),handle(async(req,res)=>{const data=await catalog(req.integration,req.params.id);await intakeAudit(req,'intake.catalog_read');ok(res,data);}));
intakeRouter.post('/uploads',intakeScope('uploads:create'),upload.single('file'),handle(async(req,res)=>{
 if(!req.file)throw new ApiError(400,'Expected multipart field file');
 const url=await storeUploadedFile(req.file);await IntakeUpload.create({key:req.integration.keyId,url});await intakeAudit(req,'intake.uploaded');ok(res,{url});}));
intakeRouter.post('/tickets',intakeScope('tickets:create'),handle(async(req,res)=>{const result=await submitTicket(req);ok(res,result.data,{},result.replayed?200:201);}));
intakeRouter.get('/tickets/:ticketNo',intakeScope('tickets:read'),handle(async(req,res)=>{const data=await readTicket(req.integration,req.params.ticketNo);await intakeAudit(req,'intake.ticket_read');ok(res,data);}));
intakeRouter.post('/whatsapp/validate-step',intakeScope('tickets:create'),handle(async(req,res)=>{
 const {step,data}=stepSchema.parse(req.body),value=stepSchemas[step].parse(data);
 if(step==='brand')await intakeBrand(req.integration,value.brandId);
 if(step==='product')await selection(req.integration,value);
 if(step==='invoice'||step==='photos')await validateDocuments(req.integration,value);
 await intakeAudit(req,'intake.step_validated');ok(res,{valid:true,step,data:value});}));
intakeRouter.use((req,res,next)=>next(new ApiError(404,'Intake endpoint not found')));
intakeRouter.use(async(err,req,res,next)=>{try{if(err.name==='ZodError')err=new ApiError(400,'Validation failed',err.flatten());await intakeAudit(req,'intake.rejected',String(err.statusCode||err.status||(err.name==='ZodError'?400:500)));next(err);}catch(e){next(e);}});
