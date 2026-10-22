import mongoose from 'mongoose';
import { z } from 'zod';
import { Booking } from './booking.model.js';
import { CustomerInvoice } from './customerInvoice.model.js';
import { Job } from '../service-provider/job.model.js';
import { Counter } from '../shared/counter.model.js';
import { PlatformSettings } from '../super-admin/platformSettings.model.js';
import { getSettings } from '../super-admin/platformSettings.service.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { runInTransaction } from '../../utils/transaction.js';
import { logAudit } from '../shared/auditLog.js';
import { mediaUrl } from '../shared/mediaUrl.js';
import { isOwnUploadUrl } from '../shared/fileUpload.js';
const invoiceImage = () => mediaUrl().refine(isOwnUploadUrl, 'Upload this image through the app first');
import { businessBillingSchema, gstinSchema, GST_STATES, serviceStateCode } from './gst.js';

const text = max => z.string().trim().max(max);
export const issuerSchema = z.object({
  enabled: z.boolean(), legalName: text(160), gstin: z.union([z.literal(''), gstinSchema]),
  address: text(500), signatoryName: text(100), signatureUrl: z.union([z.literal(''), invoiceImage()]),
  defaultSac: z.union([z.literal(''), z.string().regex(/^\d{6}$/)]),
  defaultPartsHsn: z.union([z.literal(''), z.string().regex(/^\d{4}(\d{2})?(\d{2})?$/)]),
  eInvoiceRequired: z.boolean(), autoIssue: z.boolean(),
}).strict().superRefine((v, ctx) => {
  if (v.enabled) for (const field of ['legalName','gstin','address','signatoryName','signatureUrl']) if (!v[field]) ctx.addIssue({ code:'custom', path:[field], message:'Required before enabling customer invoices' });
});
export const EMPTY_ISSUER = { enabled:false, legalName:'', gstin:'', address:'', signatoryName:'', signatureUrl:'', defaultSac:'', defaultPartsHsn:'', eInvoiceRequired:false, autoIssue:true };
export const issueSchema = z.object({
  placeOfSupply: z.string().refine(v => Boolean(GST_STATES[v]), 'Choose a place of supply').optional(),
  classifications: z.array(z.object({ index:z.number().int().nonnegative(), code:z.string().regex(/^\d{4}(\d{2})?(\d{2})?$/) }).strict()).max(100).optional(),
  reviewReason: z.string().trim().min(3).max(500).optional(),
  externalInvoiceNo: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9/-]{0,15}$/, 'Enter the invoice number registered with the IRP (maximum 16 characters)').optional(),
  irn: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(), acknowledgmentNo:z.string().regex(/^\d{15}$/).optional(),
  acknowledgmentAt:z.coerce.date().refine(v=>v<=new Date(),'Acknowledgment cannot be in the future').optional(), qrCodeUrl:invoiceImage().optional(),
}).strict().superRefine((v,ctx)=>{
  if([v.externalInvoiceNo,v.irn,v.acknowledgmentNo,v.acknowledgmentAt,v.qrCodeUrl].some(Boolean)) for(const key of ['externalInvoiceNo','irn','acknowledgmentNo','acknowledgmentAt','qrCodeUrl']) if(!v[key])ctx.addIssue({code:'custom',path:[key],message:'Complete all IRP acknowledgment fields'});
});
const paise = value => { const n=Number(value); if (!Number.isFinite(n)||n<0) throw new ApiError(409,'The final bill needs an accounts review'); return Math.round(n*100); };
const amount = n => n/100;
const pending = message => { throw new ApiError(409,message); };
export async function invoiceSettings() {
  const settings=await getSettings();
  return { issuer:{...EMPTY_ISSUER,...settings.customerInvoiceIssuer}, states:GST_STATES };
}
export async function saveInvoiceSettings(body, userId) {
  const issuer=issuerSchema.parse(body), settings=await getSettings();
  settings.customerInvoiceIssuer=issuer; await settings.save();
  await logAudit({user:userId,type:'System',action:'Updated customer invoice issuer settings'});
  return invoiceSettings();
}
export async function ownedBooking(userId, ref) {
  const booking=await Booking.findOne(mongoose.isValidObjectId(ref)?{_id:ref}:{humanId:ref});
  if (!booking) throw new ApiError(404,'Booking not found');
  if (String(booking.user)!==String(userId)) throw new ApiError(403,'This invoice belongs to another customer');
  return booking;
}
export function invoiceLines(booking, job, issuer, classifications=[]) {
  const c=booking.commercial, bill=job.billingEstimate;
  if (!c || !bill || job.activeStep!=='completed') pending('The completed service bill is not ready for invoicing');
  const lines=[];
  const add=(name,quantity,taxable,tax,total,rate,code,kind)=>{
    const base=paise(taxable), gst=paise(tax), gross=paise(total);
    if (base+gst!==gross || !Number.isFinite(rate)||rate<0||rate>100) pending('The final bill needs an accounts review');
    lines.push({name,quantity,taxable:amount(base),gst:amount(gst),total:amount(gross),rate,code:code||'',kind});
  };
  if (paise(bill.serviceCharge)>0 || paise(c.finalAmount)===0) {
    if (paise(bill.serviceCharge)!==paise(c.finalAmount)) pending('The booked service does not match the final bill');
    add(c.offeringName,c.quantity,c.taxableAmount,c.gstAmount,c.finalAmount,c.gstPercent,c.sacCode||issuer.defaultSac,'service');
  }
  for (const a of job.additionalServices||[]) if(a.checked!==false) add(a.name,a.quantity,a.taxableAmount,a.gstAmount,a.finalAmount,a.gstPercent,a.sacCode||issuer.defaultSac,'service');
  const parts=(job.spareParts||[]).filter(p=>p.checked), base=parts.reduce((s,p)=>s+paise(p.price),0);
  const partTax=paise(bill.sparePartsTotal)-base;
  if(partTax<0) pending('The spare-parts bill needs an accounts review');
  let allocated=0, accrued=0;
  for(const p of parts) {
    accrued+=paise(p.price); const next=base?Math.round(partTax*accrued/base):0, tax=next-allocated; allocated=next;
    add(p.name,1,p.price,amount(tax),amount(paise(p.price)+tax),bill.gstPercent,issuer.defaultPartsHsn,'goods');
  }
  if(lines.reduce((s,l)=>s+paise(l.total),0)!==paise(bill.total)) pending('The invoice does not reconcile with the final service bill');
  for(const entry of classifications) { if(!lines[entry.index]) pending('Unknown invoice line'); lines[entry.index].code=entry.code; }
  return lines;
}
export async function issueInvoice(bookingId, {actorId=null, automatic=false, ...options}={}) {
  const existing=await CustomerInvoice.findOne({booking:bookingId}); if(existing)return existing;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'numeric'}).formatToParts(new Date());
  const year=Number(parts.find(p=>p.type==='year').value), fy=Number(parts.find(p=>p.type==='month').value)<4?year-1:year;
  const counterKey=`customerTaxInvoice:${fy}`;
  await Counter.updateOne({_id:counterKey},{$setOnInsert:{seq:0}},{upsert:true}).catch(error=>{if(error.code!==11000)throw error;});
  return runInTransaction(async session=>{
    const previous=await CustomerInvoice.findOne({booking:bookingId}).session(session); if(previous)return previous;
    const booking=await Booking.findById(bookingId).session(session);
    if(!booking)throw new ApiError(404,'Booking not found');
    if(booking.status!=='Completed')pending('A final invoice is available after service completion');
    if(!booking.businessBilling)pending('Business GST details were not supplied for this booking');
    const recipient=businessBillingSchema.parse(booking.businessBilling.toObject());
    const settings=await PlatformSettings.findOne().session(session), issuer={...EMPTY_ISSUER,...settings?.customerInvoiceIssuer};
    if(!issuer.enabled)pending('Accounts has not enabled customer tax invoices yet. Please contact support.');
    issuerSchema.parse(issuer);
    if(automatic&&!issuer.autoIssue)pending('Accounts review is required');
    const state=serviceStateCode(booking.address?.state), recipientState=recipient.gstin.slice(0,2);
    if(!options.placeOfSupply && state!==recipientState)pending('Accounts must confirm the place of supply for this billing address');
    const placeOfSupply=options.placeOfSupply||recipientState;
    if(options.placeOfSupply && (state!==recipientState || options.placeOfSupply!==recipientState) && !options.reviewReason) pending('Record the accounts review reason for this place of supply');
    if(!GST_STATES[placeOfSupply])pending('Choose a valid place of supply');
    if(issuer.eInvoiceRequired&&(!options.externalInvoiceNo||!options.irn||!options.acknowledgmentNo||!options.acknowledgmentAt||!options.qrCodeUrl))pending('Accounts must add the IRP acknowledgment and signed QR code before issuing this e-invoice');
    const job=await Job.findOne({serviceRequest:booking.serviceRequest}).session(session);
    if(!job)pending('The final service bill is not ready');
    const lines=invoiceLines(booking,job,issuer,options.classifications);
    if(!lines.length)pending('There are no customer charges to invoice');
    for(const l of lines)if(!(l.kind==='service'?/^\d{6}$/:/^\d{4}(\d{2})?(\d{2})?$/).test(l.code))pending('Accounts must supply SAC / HSN classification for every invoice line');
    const interState=issuer.gstin.slice(0,2)!==placeOfSupply, localTax=['04','26','31','35','38'].includes(placeOfSupply)?'UTGST':'SGST';
    for(const l of lines){const g=paise(l.gst);l.igst=interState?l.gst:0;l.cgst=interState?0:amount(Math.floor(g/2));l.sgst=interState?0:amount(g-Math.floor(g/2));}
    const sum=k=>amount(lines.reduce((s,l)=>s+paise(l[k]),0));
    const counter=await Counter.findOneAndUpdate({_id:counterKey},{$inc:{seq:1}},{new:true,session});
    if(counter.seq>999999)pending('Invoice sequence is exhausted; contact accounts');
    const invoiceNo=options.externalInvoiceNo || `NC/${String(fy).slice(-2)}${String(fy+1).slice(-2)}/${String(counter.seq).padStart(6,'0')}`;
    // Keep externally registered invoices in our namespace from colliding with a later automatic number.
    const externalSequence=options.externalInvoiceNo?.match(/^NC\/(\d{4})\/(\d{6})$/);
    if(externalSequence?.[1]===`${String(fy).slice(-2)}${String(fy+1).slice(-2)}`) await Counter.updateOne({_id:counterKey},{$max:{seq:Number(externalSequence[2])}},{session});
    const [invoice]=await CustomerInvoice.create([{booking:booking._id,user:booking.user,invoiceNo,issuedAt:new Date(),issuedBy:actorId,snapshot:{
      reviewReason:options.reviewReason||null,bookingNo:booking.humanId,serviceDate:booking.completedAt,issuer,recipient,serviceAddress:booking.address?.toObject?.()||{},placeOfSupply,placeOfSupplyName:GST_STATES[placeOfSupply],interState,localTax,lines,
      subtotal:sum('taxable'),gst:sum('gst'),cgst:sum('cgst'),sgst:sum('sgst'),igst:sum('igst'),total:sum('total'),coinsApplied:booking.commercial.coinsApplied||0,advancePaid:booking.advancePaid?booking.advanceAmount:0,
      ...(options.irn?{eInvoice:{irn:options.irn,acknowledgmentNo:options.acknowledgmentNo,acknowledgmentAt:options.acknowledgmentAt,qrCodeUrl:options.qrCodeUrl}}:{}),
    }}],{session});
    await logAudit({user:actorId,type:'System',entityType:'CustomerInvoice',entityId:invoice._id,action:`Issued customer invoice ${invoiceNo}`,reason:options.reviewReason||null,meta:{bookingId:String(booking._id)}},{session});
    return invoice;
  },{required:true});
}
export async function invoiceQueue() {
  const pending=await Booking.aggregate([
    {$match:{'businessBilling.gstin':{$exists:true},status:'Completed'}},
    {$lookup:{from:CustomerInvoice.collection.name,localField:'_id',foreignField:'booking',as:'issued'}},
    {$match:{'issued.0':{$exists:false}}},{$sort:{completedAt:1,_id:1}},{$limit:100},
    {$project:{humanId:1,businessBilling:1,completedAt:1}},
  ]);
  const recent=await CustomerInvoice.find().sort({issuedAt:-1}).limit(25).populate('booking','humanId businessBilling completedAt').lean();
  return [...pending.map(b=>({...b,id:String(b._id),invoiceNo:null})),...recent.filter(i=>i.booking).map(i=>({...i.booking,id:String(i.booking._id),invoiceNo:i.invoiceNo}))];
}
export async function invoicePreview(bookingId) {
  const booking=await Booking.findById(bookingId); if(!booking)throw new ApiError(404,'Booking not found');
  const {issuer,states}=await invoiceSettings(), job=await Job.findOne({serviceRequest:booking.serviceRequest});
  return {bookingNo:booking.humanId,recipient:booking.businessBilling,serviceAddress:booking.address,states,issuer,lines:job?invoiceLines(booking,job,issuer):[]};
}
const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function invoiceHtml(invoice) {
  const d=invoice.snapshot, r=d.recipient, s=d.issuer, money=n=>Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${h(invoice.invoiceNo)}</title><style>body{font:14px system-ui;max-width:980px;margin:32px auto;padding:16px;color:#17243a}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ddd;text-align:left}dl{display:grid;grid-template-columns:1fr 1fr;gap:20px}small{color:#506078}img{max-width:180px;max-height:90px}@media print{button{display:none}body{margin:0}}</style><body><button onclick="window.print()">Print / Save as PDF</button><h1>Tax Invoice</h1><p><b>${h(invoice.invoiceNo)}</b> · Issued ${h(new Date(invoice.issuedAt).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}))} · Booking ${h(d.bookingNo)}</p><dl><div><h2>${h(s.legalName)}</h2><p>GSTIN: ${h(s.gstin)}<br>${h(s.address)}</p></div><div><h2>Bill to: ${h(r.legalName)}</h2><p>GSTIN: ${h(r.gstin)}<br>${h(r.address)}, ${h(r.city)}, ${h(GST_STATES[r.gstin.slice(0,2)])} ${h(r.pincode)}</p></div></dl><p>Place of supply: ${h(d.placeOfSupplyName)} (${h(d.placeOfSupply)}) · Reverse charge: No</p><p>Service address: ${h([d.serviceAddress.house,d.serviceAddress.city,d.serviceAddress.state,d.serviceAddress.pincode].filter(Boolean).join(', '))}</p><table><thead><tr><th>Service / goods</th><th>SAC / HSN</th><th>Qty</th><th>Taxable value</th><th>GST rate</th>${d.interState?'<th>IGST</th>':`<th>CGST</th><th>${h(d.localTax)}</th>`}<th>Total</th></tr></thead><tbody>${d.lines.map(l=>`<tr><td>${h(l.name)}</td><td>${h(l.code)}</td><td>${h(l.quantity)}</td><td>₹${money(l.taxable)}</td><td>${h(l.rate)}%</td>${d.interState?`<td>₹${money(l.igst)}</td>`:`<td>₹${money(l.cgst)} (${h(l.rate/2)}%)</td><td>₹${money(l.sgst)} (${h(l.rate/2)}%)</td>`}<td>₹${money(l.total)}</td></tr>`).join('')}</tbody></table><h3>Taxable value (excluding GST): ₹${money(d.subtotal)}</h3><p>GST: ₹${money(d.gst)} · <b>Invoice total: ₹${money(d.total)}</b></p><p>Paid: ₹${money(d.total)} · Balance due: ₹0.00</p><small>Advance payments and NCC coins are included in the paid amount; they do not reduce the taxable value. Input tax credit is subject to applicable GST eligibility.</small>${d.eInvoice?`<p>IRN: ${h(d.eInvoice.irn)}<br>Acknowledgment: ${h(d.eInvoice.acknowledgmentNo)} · ${h(new Date(d.eInvoice.acknowledgmentAt).toLocaleDateString('en-IN'))}</p><img alt="IRP signed QR code" src="${h(d.eInvoice.qrCodeUrl)}">`:''}<p><img alt="Authorised signature" src="${h(s.signatureUrl)}"><br>${h(s.signatoryName)}<br>Authorised signatory</p></body></html>`;
}
