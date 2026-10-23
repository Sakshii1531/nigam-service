import { beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback,closeServer } from './helpers/loopbackServer.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { User } from '../src/modules/auth/user.model.js';
import { CatalogueBrand } from '../src/modules/catalog/catalogueBrand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyPlan } from '../src/modules/warranty-amc-exchange/extendedWarrantyPlan.model.js';
import { ProtectionCheckout } from '../src/modules/warranty-amc-exchange/protectionCheckout.model.js';
import { Payment } from '../src/modules/payments-wallet/payment.model.js';
import { signForTesting } from '../src/modules/payments-wallet/paymentGateway.js';
import { listSubscriptions, getSummary } from '../src/modules/super-admin/adminAmc.service.js';
let app,phone=9461260000;
const root='/api/v1/warranty-amc/checkouts';
beforeAll(async()=>{await registerAllModels();await mongoose.connect(testDbUri('protectionCheckout'));await ensureIndexes();app=await listenOnLoopback(createApp());});
afterAll(async()=>{await closeServer(app);await mongoose.connection.dropDatabase();await mongoose.disconnect();});
beforeEach(async()=>{await Promise.all(Object.values(mongoose.models).map(m=>m.deleteMany({})));});
async function actor(role='customer'){const user=await User.create({name:'Real Customer',phone:String(++phone),email:`p${phone}@test.invalid`,role,passwordHash:'test-only'});return {user,auth:{Authorization:`Bearer ${signAccessToken({sub:user.id,role})}`}};}
async function fixture(kind='amc'){
 const c=await actor();await Category.create({key:'AC',name:'Air conditioning'});await CatalogueBrand.create({name:'Admin Brand Only',categories:['AC']});
 const appliance=await OwnedAppliance.create({user:c.user._id,category:'AC',brand:'Admin Brand Only',modelNumber:'MODEL-42',purchaseDate:new Date(Date.now()-86400000*30)});
 const plan=kind==='amc'?await AMCPlan.create({name:'Admin Silver',price:699,visitsTotal:3,durationMonths:18,applianceCategory:'AC',benefits:['Admin benefit'],requiresInvoice:false}):await ExtendedWarrantyPlan.create({name:'Admin Shield',price:899,durationYears:2,claimsTotal:3,applianceCategory:'AC',features:['Admin cover'],requiresInvoice:true,maxApplianceAgeMonths:12});
 return {...c,kind,appliance,plan,body:{key:randomUUID(),kind,plan:plan.id,appliance:appliance.id,pincode:'452001',expectedPrice:plan.price}};
}
async function upload(c){const doc=(await request(app).post(`/api/v1/appliances/${c.appliance.id}/documents`).set(c.auth).field('kind','invoice').attach('file',Buffer.from('%PDF-1.4\n%%EOF'),{filename:'invoice.pdf',contentType:'application/pdf'}).expect(201)).body.data;return doc;}
it('validates brands, age, invoice requirements and records all saved product/contact information',async()=>{
 const c=await fixture('extended-warranty');const absent={kind:c.kind,plan:c.plan.id,appliance:c.appliance.id,pincode:'452001'};await request(app).post(root+'/eligibility').set(c.auth).send(absent).expect(400);
 const invoice=await upload(c);c.body.invoiceFileId=invoice.fileId;
 const {key:_key,expectedPrice:_expectedPrice,...eligibility}=c.body;await request(app).post(root+'/eligibility').set(c.auth).send(eligibility).expect(200);expect(await ProtectionCheckout.countDocuments()).toBe(0);
 const result=(await request(app).post(root).set(c.auth).send(c.body).expect(200)).body.data;
 expect(result.purchase).toMatchObject({paid:false,fullName:'Real Customer',mobile:c.user.phone,email:c.user.email,modelNumber:'MODEL-42',appliance:{id:c.appliance.id},pincode:'452001',planName:'Admin Shield'});
 expect(result.purchase.purchaseDate).toBeTruthy();expect(result.purchase.planSnapshot.features).toEqual(['Admin cover']);expect(JSON.stringify(result)).not.toContain('invoiceData');
 await CatalogueBrand.updateOne({nameKey:'admin brand only'},{$set:{isActive:false}});await request(app).post(root).set(c.auth).send({...c.body,key:randomUUID()}).expect(400);
 await CatalogueBrand.updateOne({nameKey:'admin brand only'},{$set:{isActive:true,categories:['Refrigerator']}});await request(app).post(root).set(c.auth).send({...c.body,key:randomUUID()}).expect(400);
});
it('uses admin eligibility settings, refuses forged data, changed price, empty allowance and future dates',async()=>{
 const c=await fixture();
 await request(app).post(root).set(c.auth).send({...c.body,expectedPrice:1}).expect(409);
 await request(app).post(root).set(c.auth).send({...c.body,paid:true}).expect(400);
 await AMCPlan.updateOne({_id:c.plan._id},{$set:{maxApplianceAgeMonths:0}});await request(app).post(root).set(c.auth).send(c.body).expect(400);
 await AMCPlan.updateOne({_id:c.plan._id},{$set:{maxApplianceAgeMonths:null,visitsTotal:0}});await request(app).post(root).set(c.auth).send(c.body).expect(400);
 await AMCPlan.updateOne({_id:c.plan._id},{$set:{visitsTotal:3}});await OwnedAppliance.updateOne({_id:c.appliance._id},{$set:{purchaseDate:new Date(Date.now()+86400000)}});await request(app).post(root).set(c.auth).send(c.body).expect(400);
 expect(await AMCSubscription.countDocuments()).toBe(0);
});
it('creates one purchase for repeated/concurrent attempts and one resumable gateway order',async()=>{
 const c=await fixture();const responses=await Promise.all([1,2,3].map(()=>request(app).post(root).set(c.auth).send(c.body)));
 for(const r of responses)expect([200,409]).toContain(r.status);
 const current=(await request(app).post(root).set(c.auth).send(c.body).expect(200)).body.data;expect(await AMCSubscription.countDocuments()).toBe(1);expect(await ProtectionCheckout.countDocuments()).toBe(1);
 expect(await getSummary()).toMatchObject({totalSales:0,activeContracts:0,mostSoldPlan:null});
 await request(app).post(root).set(c.auth).send({...c.body,pincode:'110001'}).expect(409);
 const payments=await Promise.all([1,2,3].map(()=>request(app).post(`${root}/${current.key}/payment`).set(c.auth)));
 for(const r of payments)expect([200,409]).toContain(r.status);
 const payment=(await request(app).post(`${root}/${current.key}/payment`).set(c.auth).expect(200)).body.data;
 expect(await Payment.countDocuments()).toBe(1);expect(payment.razorpay.amount).toBe(69900);expect(payment.purchase.paid).toBe(false);
 const again=(await request(app).post(`${root}/${current.key}/payment`).set(c.auth).expect(200)).body.data;expect(again.razorpay.orderId).toBe(payment.razorpay.orderId);
});
it('activates only after signature verification, preserves purchased terms and cannot extend a paid purchase by replaying payment',async()=>{
 const c=await fixture();await request(app).post(root).set(c.auth).send(c.body).expect(200);
 const started=(await request(app).post(`${root}/${c.body.key}/payment`).set(c.auth).expect(200)).body.data;
 await request(app).post(`${root}/${c.body.key}/verify-payment`).set(c.auth).send({razorpayPaymentId:'pay_checkout',razorpaySignature:'forged'}).expect(400);
 expect((await AMCSubscription.findById(started.purchase.id)).paid).toBe(false);
 await request(app).post(`${root}/${c.body.key}/reconcile-payment`).set(c.auth).expect(409);
 await AMCPlan.updateOne({_id:c.plan._id},{$set:{name:'Revised Gold',price:1999,visitsTotal:9,durationMonths:3,benefits:['New benefit']}});
 const data={razorpayPaymentId:'pay_checkout',razorpaySignature:signForTesting({orderId:started.razorpay.orderId,paymentId:'pay_checkout'})};
 const paid=(await request(app).post(`${root}/${c.body.key}/verify-payment`).set(c.auth).send(data).expect(200)).body.data;
 expect(paid.purchase.paid).toBe(true);expect(paid.purchase.planSnapshot).toMatchObject({name:'Admin Silver',price:699,durationMonths:18,visitsTotal:3});
 expect(paid.purchase.plan.name).toBe('Admin Silver');
 const replay=(await request(app).post(`${root}/${c.body.key}/verify-payment`).set(c.auth).send(data).expect(200)).body.data;expect(replay.purchase.expiryDate).toBe(paid.purchase.expiryDate);
 expect((await request(app).get(`/api/v1/warranty-amc/amc/subscriptions/${paid.purchase.id}`).set(c.auth)).body.data.purchase.plan.name).toBe('Admin Silver');
 expect((await request(app).get('/api/v1/warranty-amc/amc/subscriptions').set(c.auth)).body.data[0].plan.name).toBe('Admin Silver');
 expect((await listSubscriptions()).items[0].plan.name).toBe('Admin Silver');
 expect(await getSummary()).toMatchObject({totalSales:699,mostSoldPlan:'Admin Silver'});
 await request(app).post(`${root}/${c.body.key}/verify-payment`).set(c.auth).send({...data,razorpayPaymentId:'different'}).expect(409);
 expect((await Payment.findOne({targetId:paid.purchase.id})).status).toBe('Success');
});
it('keeps invoice evidence private and available for authorized verification even after the original file is removed',async()=>{
 const c=await fixture('extended-warranty'),other=await actor(),admin=await actor('super_admin'),provider=await actor('service_provider'),invoice=await upload(c);c.body.invoiceFileId=invoice.fileId;
 await request(app).post(root).set(c.auth).send(c.body).expect(200);
 await request(app).delete(`/api/v1/appliances/${c.appliance.id}/documents/${invoice.fileId}`).set(c.auth).expect(200);
 const response=await request(app).get(`${root}/${c.body.key}/invoice`).set(c.auth).expect(200);expect(response.headers['cache-control']).toBe('private, no-store');
 await request(app).get(`${root}/${c.body.key}/invoice`).set(admin.auth).expect(200);await request(app).get(`${root}/${c.body.key}/invoice`).set(other.auth).expect(404);await request(app).get(`${root}/${c.body.key}/invoice`).set(provider.auth).expect(403);
 await request(app).get(`${root}/${c.body.key}`).set(other.auth).expect(404);await request(app).post(`${root}/${c.body.key}/payment`).set(other.auth).expect(404);
 await request(app).post(root).send(c.body).expect(401);await request(app).post(root).set(admin.auth).send(c.body).expect(403);
});
it('confirms an admin-priced free plan without fabricating a gateway payment',async()=>{
 const c=await fixture();await AMCPlan.updateOne({_id:c.plan._id},{$set:{price:0}});
 const result=(await request(app).post(root).set(c.auth).send({...c.body,expectedPrice:0}).expect(200)).body.data;
 expect(result.purchase.paid).toBe(true);expect(result.purchase.visitsRemaining).toBe(3);expect(await Payment.countDocuments()).toBe(0);
 expect((await request(app).get(`${root}/${c.body.key}`).set(c.auth)).body.data.purchase.paid).toBe(true);
});
