import { z } from 'zod';
import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import { claimIdParamSchema } from '../partner-warranty/brandClaim.validation.js';
import * as service from './ticketComm.service.js';
import { CallLog } from '../calls/callLog.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { initiateBrandCall, brandCallEnabled } from '../calls/call.service.js';
import { contactSchema, rescheduleSchema, documentSchema, callSchema, CONTACT_CHANNELS, CONTACT_OUTCOMES } from './ticketComm.validation.js';
export const ticketCommRouter=Router();
const handle=fn=>async(req,res,next)=>{try{ok(res,await fn(req));}catch(e){next(e);}};
ticketCommRouter.get('/my-work',handle(req=>service.myWork(req.user)));
ticketCommRouter.get('/tickets/communication-options',handle(()=>({channels:CONTACT_CHANNELS,outcomes:CONTACT_OUTCOMES,callEnabled:brandCallEnabled()})));
for(const [path,schema,fn] of [['contacts',contactSchema,service.logContact],['reschedule',rescheduleSchema,service.reschedule],['documents',documentSchema,service.addDocuments],['call',callSchema,initiateBrandCall]])ticketCommRouter.post(`/tickets/:id/${path}`,validate(claimIdParamSchema,'params'),validate(schema),handle(req=>fn(req.user,req.params.id,req.body)));

ticketCommRouter.get('/tickets/:id/calls/:callId',validate(claimIdParamSchema.extend({callId:z.string().regex(/^[a-f\d]{24}$/i)}),'params'),handle(async req=>{const c=await service.findTicket(req.user,req.params.id);const log=await CallLog.findOne({_id:req.params.callId,warrantyClaim:c._id}).select('status duration startedAt endedAt');if(!log)throw new ApiError(404,'Call not found');return log;}));
