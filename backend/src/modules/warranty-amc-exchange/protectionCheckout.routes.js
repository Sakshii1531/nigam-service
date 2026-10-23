import { Router } from 'express';
import { z } from 'zod';
import { requireAuth,requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ProtectionCheckout } from './protectionCheckout.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as service from './protectionCheckout.service.js';
const id=z.string().regex(/^[a-f0-9]{24}$/i);
const key=z.string().uuid();
const prepare=z.object({key,kind:z.enum(['amc','extended-warranty']),plan:id,appliance:id,pincode:z.string().regex(/^[1-9][0-9]{5}$/,'Enter a valid 6-digit pincode'),invoiceFileId:id.optional(),expectedPrice:z.number().nonnegative()}).strict();
const byKey=validate(z.object({key}),'params');
const handle=fn=>async(req,res,next)=>{try{res.json({data:await fn(req)});}catch(e){next(e);}};
export const protectionCheckoutRouter=Router();
protectionCheckoutRouter.use(requireAuth);
protectionCheckoutRouter.get('/:key/invoice',byKey,requireRole('customer','super_admin'),async(req,res,next)=>{
  try{
    const checkout=await ProtectionCheckout.findOne({key:req.params.key,...(req.user.role==='customer'?{user:req.user.id}:{})}).select('+invoiceData');
    if(!checkout?.invoiceData)throw new ApiError(404,'Invoice not found');
    res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(checkout.invoiceName)}`});
    res.type(checkout.invoiceMimeType).send(checkout.invoiceData);
  }catch(e){next(e);}
});
protectionCheckoutRouter.use(requireRole('customer'));
protectionCheckoutRouter.post('/eligibility',validate(prepare.omit({key:true,expectedPrice:true})),handle(async req=>{const {plan}=await service.assess(req.body.kind,req.body.plan,req.user.id,req.body.appliance,req.body.invoiceFileId);return {eligible:true,plan};}));
protectionCheckoutRouter.post('/',validate(prepare),handle(req=>service.prepareCheckout(req.user.id,req.body)));
protectionCheckoutRouter.get('/:key',byKey,handle(req=>service.inspectCheckout(req.user.id,req.params.key)));
protectionCheckoutRouter.post('/:key/payment',byKey,handle(req=>service.initiatePayment(req.user.id,req.params.key)));
protectionCheckoutRouter.post('/:key/verify-payment',byKey,validate(z.object({razorpayPaymentId:z.string().min(1),razorpaySignature:z.string().min(1)}).strict()),handle(req=>service.confirmCheckout(req.user.id,req.params.key,req.body)));
protectionCheckoutRouter.post('/:key/reconcile-payment',byKey,handle(req=>service.confirmCheckout(req.user.id,req.params.key,{}, {reconcile:true})));
