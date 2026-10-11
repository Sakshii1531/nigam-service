import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { created, ok } from '../../utils/respond.js';
import { actorFromReq } from './actor.js';
import { registrationSchema,previewSchema,assignCceSchema,id } from './registration.validation.js';
import { z } from 'zod';
import {overrideSchema,editProductSchema} from './warrantyPolicy.validation.js';
import {overrideWarranty,editTicketProduct} from './ticketWarranty.service.js';
import * as service from './registration.service.js';
export const registrationRouter=Router();
registrationRouter.get('/form-options',async(req,res,next)=>{try{ok(res,await service.formOptions(req.user.brand));}catch(err){next(err);}});
registrationRouter.post('/preview-warranty',validate(previewSchema),async(req,res,next)=>{try{ok(res,await service.previewWarranty(req.user.brand,req.body));}catch(err){next(err);}});
registrationRouter.post('/',validate(registrationSchema),async(req,res,next)=>{try{created(res,await service.registerTicket(req.user.brand,await actorFromReq(req),req.body,{canApprove:req.brandAccess.permissions.has('tickets:approve'),canVerify:req.brandAccess.permissions.has('warranty:verify')}));}catch(err){next(err);}});
registrationRouter.post('/:id/assign-cce',validate(z.object({id}),'params'),validate(assignCceSchema),async(req,res,next)=>{try{ok(res,await service.assignCce(req.user.brand,req.params.id,await actorFromReq(req),req.body.userId));}catch(err){next(err);}});

registrationRouter.post('/:id/warranty/override',validate(z.object({id}),'params'),validate(overrideSchema),async(req,res,next)=>{try{ok(res,await overrideWarranty(req.user.brand,req.params.id,await actorFromReq(req),req.body));}catch(e){next(e);}});
registrationRouter.patch('/:id/product',validate(z.object({id}),'params'),validate(editProductSchema),async(req,res,next)=>{try{ok(res,await editTicketProduct(req.user.brand,req.params.id,await actorFromReq(req),req.body));}catch(e){next(e);}});
