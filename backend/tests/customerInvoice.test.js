import { beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { seedSimpleOffering } from './helpers/catalogue.js';
import { jobFlow } from './helpers/jobFlow.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { ServiceOffering } from '../src/modules/catalog/serviceOffering.model.js';
import { PlatformSettings } from '../src/modules/super-admin/platformSettings.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { CustomerInvoice } from '../src/modules/booking/customerInvoice.model.js';
import { Counter } from '../src/modules/shared/counter.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { issueInvoice, issuerSchema, invoiceHtml, invoiceLines } from '../src/modules/booking/customerInvoice.service.js';
import { validGstin, businessBillingSchema } from '../src/modules/booking/gst.js';
let app; const flow=jobFlow(()=>app,{phoneStart:9411400000});
const auth=token=>({Authorization:`Bearer ${token}`});
// Synthetic GSTINs for fixture entities, with the required base-36 check digit.
function gstin(state='23') { const prefix=`${state}AAAAA0000A1Z`;for(const last of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')if(validGstin(prefix+last))return prefix+last;throw new Error('invalid fixture'); }
const business=(state='23')=>({gstin:gstin(state),legalName:'Test Business <script>',address:'12 Business Street',city:'Indore',pincode:'452001'});
const issuer=(state='23')=>({enabled:true,legalName:'Test Registered Supplier',gstin:gstin(state),address:'10 Registered Street, Indore',signatoryName:'Test Signatory',signatureUrl:'/uploads/test-signature.png',defaultSac:'998719',defaultPartsHsn:'8415',autoIssue:true,eInvoiceRequired:false});
beforeAll(async()=>{await registerAllModels();await mongoose.connect(testDbUri('customerInvoice'));await ensureIndexes();app=await listenOnLoopback(createApp());});
afterAll(async()=>{await awaitPendingDeliveries();await closeServer(app);await mongoose.connection.dropDatabase();await mongoose.disconnect();});
beforeEach(async()=>{await awaitPendingDeliveries();await Promise.all(Object.values(mongoose.models).map(model=>model.deleteMany({})));});
async function fixture({recipient='23',supplier='23',enabled=true,eInvoiceRequired=false,autoIssue=true}={}) {
  await PlatformSettings.create({customerInvoiceIssuer:{...issuer(supplier),enabled,eInvoiceRequired,autoIssue}});
  const offering=await seedSimpleOffering({price:1000,gstPercent:18});
  await ServiceOffering.updateOne({_id:offering._id},{$set:{'tax.sacCode':'998719'}});
  const sp=await flow.partner(['AC']);
  await ServiceProvider.updateOne({_id:sp.serviceProvider._id},{$set:{serviceCityName:'Indore',serviceStateName:'Madhya Pradesh'}});
  return flow.jobToBilling('TEST-REPAIR',{sp,bookingOptions:{businessBilling:business(recipient),address:{house:'10 Service Street',city:'Indore',state:'Madhya Pradesh',pincode:'452001'}}});
}
it('validates GSTIN checksum and required business details',()=>{
  expect(validGstin('27AAPFU0939F1ZV')).toBe(true);
  expect(businessBillingSchema.parse({...business(),gstin:gstin().toLowerCase()})).toMatchObject({gstin:gstin()});
  expect(businessBillingSchema.safeParse({...business(),gstin:gstin().slice(0,14)+'?'}).success).toBe(false);
  expect(businessBillingSchema.safeParse({...business(),legalName:''}).success).toBe(false);
  expect(issuerSchema.safeParse({...issuer(),signatureUrl:''}).success).toBe(false);
});
it('stores business billing without removing GST, issues after completion and prints an immutable invoice',async()=>{
  const w=await fixture();expect(w.booking.totalPrice).toBe(1180);expect(w.booking.commercial.sacCode).toBe('998719');expect(w.booking.businessBilling).toMatchObject(business());
  await request(app).post(`/api/v1/bookings/${w.booking.id}/invoice`).set(auth(w.cust.token)).send({}).expect(409);
  await flow.billAndCollect(w);
  const invoice=await CustomerInvoice.findOne({booking:w.booking.id});expect(invoice).toBeTruthy();
  expect(invoice.invoiceNo).toMatch(/^NC\/\d{4}\/\d{6}$/);
  expect(invoice.snapshot).toMatchObject({subtotal:1000,gst:180,cgst:90,sgst:90,igst:0,total:1180,localTax:'SGST'});
  const html=await request(app).get(`/api/v1/bookings/${w.booking.id}/invoice`).set(auth(w.cust.token)).expect(200);
  expect(html.headers['content-type']).toMatch(/text\/html/);expect(html.headers['cache-control']).toBe('no-store');
  expect(html.text).toContain('Test Business &lt;script&gt;');expect(html.text).not.toContain('spPayout');expect(html.text).not.toContain('nccMargin');
  await PlatformSettings.updateOne({},{$set:{'customerInvoiceIssuer.legalName':'Changed Supplier','defaultGstPercent':28}});
  await ServiceOffering.updateMany({},{$set:{'tax.gstPercent':28}});
  await request(app).post(`/api/v1/bookings/${w.booking.id}/invoice`).set(auth(w.cust.token)).send({}).expect(200);
  expect(await CustomerInvoice.countDocuments()).toBe(1);
  expect((await CustomerInvoice.findById(invoice._id)).snapshot.issuer.legalName).toBe('Test Registered Supplier');
  expect(invoiceHtml(invoice)).toContain('1,180.00');
});
it('refuses another customer, anonymous users and non-admin invoice controls',async()=>{
  const w=await fixture();await flow.billAndCollect(w);const other=await flow.customer();
  const providerView=await request(app).get(`/api/v1/service-provider/jobs/${w.jobId}`).set(w.auth).expect(200);
  expect(providerView.body.data.serviceRequest.booking.businessBilling).toBeUndefined();
  await request(app).get(`/api/v1/bookings/${w.booking.id}/invoice`).set(auth(other.token)).expect(403);
  await request(app).post(`/api/v1/bookings/${w.booking.id}/invoice`).set(auth(other.token)).send({}).expect(403);
  await request(app).get(`/api/v1/bookings/${w.booking.id}/invoice`).expect(401);
  await request(app).get('/api/v1/super-admin/customer-invoices').set(auth(w.cust.token)).expect(403);
});
it('uses IGST when the supplier registration is in another state',async()=>{
  const w=await fixture({supplier:'27'});await flow.billAndCollect(w);
  expect((await CustomerInvoice.findOne()).snapshot).toMatchObject({interState:true,igst:180,cgst:0,sgst:0,total:1180});
});
it('preserves paid completion but queues cross-state billing for accounts review',async()=>{
  const w=await fixture({recipient:'27'});await flow.billAndCollect(w);
  expect((await Booking.findById(w.booking.id)).status).toBe('Completed');expect(await CustomerInvoice.countDocuments()).toBe(0);
  await expect(issueInvoice(w.booking.id)).rejects.toThrow(/place of supply/);
  await expect(issueInvoice(w.booking.id,{placeOfSupply:'27'})).rejects.toThrow(/review reason/);
  const invoice=await issueInvoice(w.booking.id,{placeOfSupply:'27',reviewReason:'Reviewed registered business supply under applicable GST place-of-supply rules'});
  expect(invoice.snapshot).toMatchObject({placeOfSupply:'27',igst:180,total:1180});
});
it('does not issue before issuer setup or without the required IRP acknowledgment',async()=>{
  const w=await fixture({enabled:false});await flow.billAndCollect(w);
  expect(await CustomerInvoice.countDocuments()).toBe(0);
  await expect(issueInvoice(w.booking.id)).rejects.toThrow(/not enabled/);
  await PlatformSettings.updateOne({},{$set:{'customerInvoiceIssuer.enabled':true,'customerInvoiceIssuer.eInvoiceRequired':true}});
  await expect(issueInvoice(w.booking.id)).rejects.toThrow(/IRP/);
  const now=new Date();const year=now.getUTCFullYear();const fy=now.getUTCMonth()<3?year-1:year;const registeredNumber=`NC/${String(fy).slice(-2)}${String(fy+1).slice(-2)}/000050`;
  const invoice=await issueInvoice(w.booking.id,{externalInvoiceNo:registeredNumber,irn:'a'.repeat(64),acknowledgmentNo:'123456789012345',acknowledgmentAt:new Date(),qrCodeUrl:'/uploads/test-qr.png'});
  expect(invoice.snapshot.eInvoice.irn).toBe('a'.repeat(64));expect(invoice.invoiceNo).toBe(registeredNumber);expect((await Counter.findById(`customerTaxInvoice:${fy}`)).seq).toBe(50);
});
it('reports disabled issuance without an error and recovers an existing completed booking after setup',async()=>{
  const w=await fixture({enabled:false});await flow.billAndCollect(w);
  const path=`/api/v1/bookings/${w.booking.id}/invoice`;
  const before=await Counter.findOne({_id:/^customerTaxInvoice:/}).lean();
  const pending=await request(app).get(`${path}/status`).set(auth(w.cust.token)).expect(200);
  expect(pending.body.data.state).toBe('setup-required');
  expect(pending.headers['cache-control']).toBe('private, no-store');
  expect(JSON.stringify(pending.body.data)).not.toContain('Test Registered Supplier');
  expect((await Counter.findOne({_id:/^customerTaxInvoice:/}).lean())?.seq).toBe(before?.seq);
  await PlatformSettings.updateOne({},{$set:{'customerInvoiceIssuer.enabled':true}});
  expect((await request(app).get(`${path}/status`).set(auth(w.cust.token)).expect(200)).body.data.state).toBe('ready');
  await request(app).post(path).set(auth(w.cust.token)).send({}).expect(200);
  const issued=(await request(app).get(`${path}/status`).set(auth(w.cust.token)).expect(200)).body.data;
  expect(issued.state).toBe('issued');expect(issued.invoiceNo).toBeTruthy();
  await PlatformSettings.updateOne({},{$set:{'customerInvoiceIssuer.enabled':false}});
  expect((await request(app).get(`${path}/status`).set(auth(w.cust.token)).expect(200)).body.data).toEqual(issued);
  await request(app).get(path).set(auth(w.cust.token)).expect(200);
  const other=await flow.customer();
  await request(app).get(`${path}/status`).set(auth(other.token)).expect(403);
  await request(app).get(`${path}/status`).expect(401);
});
it('reports accounts review when automatic issuance is disabled',async()=>{
  const w=await fixture({autoIssue:false});await flow.billAndCollect(w);
  const response=await request(app).get(`/api/v1/bookings/${w.booking.id}/invoice/status`).set(auth(w.cust.token)).expect(200);
  expect(response.body.data).toMatchObject({state:'accounts-review',message:'Accounts review is required'});
  expect(await CustomerInvoice.countDocuments()).toBe(0);
});
it('prints labelled samples without consuming legal invoice numbers or blocking later real issuance',async()=>{
  const w=await fixture({enabled:false});await flow.billAndCollect(w);
  await PlatformSettings.updateOne({},{$set:{'customerInvoiceIssuer.enabled':true,'customerInvoiceIssuer.sample':true}});
  const path=`/api/v1/bookings/${w.booking.id}/invoice`;
  const sample=(await request(app).get(path).set(auth(w.cust.token)).expect(200)).text;
  expect(sample).toContain('SAMPLE — NOT A TAX INVOICE');
  expect(sample).toContain('Sample Invoice');
  expect(await CustomerInvoice.countDocuments()).toBe(0);
  expect((await Counter.findOne({_id:/^customerTaxInvoice:/}))?.seq || 0).toBe(0);
  expect((await request(app).get(`${path}/status`).set(auth(w.cust.token))).body.data).toMatchObject({state:'ready',sample:true});
  await PlatformSettings.updateOne({},{$set:{'customerInvoiceIssuer.sample':false}});
  await request(app).post(path).set(auth(w.cust.token)).send({}).expect(200);
  const real=await CustomerInvoice.findOne({booking:w.booking.id});
  expect(real.invoiceNo).toMatch(/\/000001$/);
  expect(invoiceHtml(real)).not.toContain('SAMPLE — NOT A TAX INVOICE');
});
it('reconciles add-ons and parts and retains their frozen taxes',async()=>{
  const w=await fixture();await seedSimpleOffering({code:'EXTRA-CLEAN',serviceName:'Extra clean',price:200,gstPercent:5});
  await flow.addAddOn(w,'EXTRA-CLEAN');await flow.billAndCollect({...w,parts:[{name:'Replacement component',price:100,checked:true}]});
  const invoice=await CustomerInvoice.findOne();
  expect(invoice.snapshot.lines.map(l=>l.rate)).toEqual([18,5,18]);
  expect(invoice.snapshot).toMatchObject({subtotal:1300,gst:208,total:1508,cgst:104,sgst:104});
});
it('allocates odd paise without charging GST twice or subtracting coins from tax',()=>{
  const booking={commercial:{offeringName:'Small service',quantity:1,taxableAmount:0.14,gstAmount:0.03,finalAmount:0.17,gstPercent:18,coinsApplied:0.1}};
  const job={activeStep:'completed',billingEstimate:{serviceCharge:0.17,total:0.17,sparePartsTotal:0,gstPercent:18},additionalServices:[],spareParts:[]};
  const lines=invoiceLines(booking,job,issuer());expect(lines[0]).toMatchObject({taxable:0.14,gst:0.03,total:0.17});
});
it('issues one invoice for concurrent customer requests and preserves admin-only issuer controls',async()=>{
  const w=await fixture({autoIssue:false});await flow.billAndCollect(w);
  const results=await Promise.all(Array.from({length:3},()=>issueInvoice(w.booking.id)));
  expect(new Set(results.map(i=>i.invoiceNo)).size).toBe(1);expect(await CustomerInvoice.countDocuments()).toBe(1);
  const admin=await User.create({role:'super_admin',name:'Accounts Admin',email:'gst-admin@test.local',passwordHash:await hashPassword('password123')});
  const token=await flow.loginAndVerify({role:'super_admin',identifier:admin.email});
  const queue=await request(app).get('/api/v1/super-admin/customer-invoices').set(auth(token)).expect(200);
  expect(queue.body.data[0].invoiceNo).toBe(results[0].invoiceNo);
});
