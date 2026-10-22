import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../config/constants.js';
import { ok } from '../../utils/respond.js';
import { CustomerInvoice } from './customerInvoice.model.js';
import * as invoices from './customerInvoice.service.js';
const handle=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(error){next(error);}};
export const customerInvoiceAdminRouter=Router();
customerInvoiceAdminRouter.use(requireAuth,requireRole(ROLES.SUPER_ADMIN));
customerInvoiceAdminRouter.get('/settings',handle(async(req,res)=>ok(res,await invoices.invoiceSettings())));
customerInvoiceAdminRouter.put('/settings',validate(invoices.issuerSchema),handle(async(req,res)=>ok(res,await invoices.saveInvoiceSettings(req.body,req.user.id))));
customerInvoiceAdminRouter.get('/',handle(async(req,res)=>ok(res,await invoices.invoiceQueue())));
customerInvoiceAdminRouter.get('/:id/preview',handle(async(req,res)=>ok(res,await invoices.invoicePreview(req.params.id))));
customerInvoiceAdminRouter.post('/:id/issue',validate(invoices.issueSchema),handle(async(req,res)=>{
  const invoice=await invoices.issueInvoice(req.params.id,{...req.body,actorId:req.user.id});ok(res,{invoiceNo:invoice.invoiceNo});
}));
customerInvoiceAdminRouter.get('/:id/print',handle(async(req,res)=>{
  const invoice=await CustomerInvoice.findOne({booking:req.params.id});
  if(!invoice)return res.status(404).json({error:{message:'Invoice not yet issued'}});
  res.set('Cache-Control','no-store').type('html').send(invoices.invoiceHtml(invoice));
}));
export function addCustomerInvoiceRoutes(router) {
  router.post('/:id/invoice',handle(async(req,res)=>{
    const booking=await invoices.ownedBooking(req.user.id,req.params.id);
    const invoice=await invoices.issueInvoice(booking._id,{automatic:true});ok(res,{invoiceNo:invoice.invoiceNo});
  }));
  router.get('/:id/invoice',handle(async(req,res)=>{
    const booking=await invoices.ownedBooking(req.user.id,req.params.id);
    const invoice=await CustomerInvoice.findOne({booking:booking._id});
    if(!invoice)return res.status(404).json({error:{message:'Your business invoice is not yet issued. Accounts can review it after service completion.'}});
    res.set('Cache-Control','no-store').type('html').send(invoices.invoiceHtml(invoice));
  }));
}
