import { beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { User } from '../src/modules/auth/user.model.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { AMCVisit } from '../src/modules/warranty-amc-exchange/amcVisit.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { seedSimpleOffering } from './helpers/catalogue.js';
let app, phone=9461250000;
beforeAll(async()=>{ await registerAllModels();await mongoose.connect(testDbUri('protectionDetails'));await ensureIndexes();app=await listenOnLoopback(createApp()); });
afterAll(async()=>{await awaitPendingDeliveries();await closeServer(app);await mongoose.connection.dropDatabase();await mongoose.disconnect();});
beforeEach(async()=>{await Promise.all(Object.values(mongoose.models).map(m=>m.deleteMany({})));});
async function customer(role='customer') {const user=await User.create({name:'Plan owner',phone:String(++phone),role,passwordHash:'test-hash'});return {user,auth:{Authorization:`Bearer ${signAccessToken({sub:user.id,role:user.role})}`}};}
async function setup() {
  const c=await customer(), appliance=await OwnedAppliance.create({user:c.user._id,category:'AC',brand:'Any Brand',modelNumber:'AC-123',serialNumber:'UNIT-1'});
  const plan=await AMCPlan.create({name:'AC Silver Care',tier:'Silver',benefits:['Three maintenance visits'],price:0,visitsTotal:3,applianceCategory:'AC'});
  const amc=await AMCSubscription.create({user:c.user._id,plan:plan._id,appliance:appliance._id,applianceCategory:'AC',brand:'Any Brand',paid:true,expiryDate:new Date(Date.now()+86400000*100),visitsTotal:3,visitsRemaining:2});
  const ew=await ExtendedWarrantyOrder.create({user:c.user._id,appliance:appliance._id,applianceCategory:'AC',brand:'Any Brand',planName:'AC Extended Protect',price:0,paid:true,claimsTotal:2,claimsRemaining:2,validTill:new Date(Date.now()+86400000*100),coverage:['Electrical failures']});
  return {...c,appliance,plan,amc,ew};
}
const path=(id,kind='amc')=>`/api/v1/warranty-amc/${kind}/${kind==='amc'?'subscriptions':'orders'}/${id}`;
it('returns the real plan, covered appliance and allowance without private operational fields',async()=>{
 const c=await setup();await AMCVisit.create({subscription:c.amc._id,visitNumber:1,status:'Completed',tasks:[{label:'Coil cleaned',done:true}],notes:'Cleaned filter'});
 await ServiceRequest.create({user:c.user._id,amcSubscription:c.amc._id,category:'AC',status:'Closed',completionOtp:'1234'});
 const data=(await request(app).get(path(c.amc.id)).set(c.auth).expect(200)).body.data;
 expect(data.purchase.plan.name).toBe('AC Silver Care');expect(data.purchase.appliance.serialNumber).toBe('UNIT-1');expect(data.purchase.visitsRemaining).toBe(2);expect(data.recordedVisits[0].tasks[0].label).toBe('Coil cleaned');expect(data.history).toHaveLength(1);expect(JSON.stringify(data)).not.toContain('completionOtp');
 const ew=(await request(app).get(path(c.ew.id,'extended-warranty')).set(c.auth).expect(200)).body.data;expect(ew.purchase.coverage).toEqual(['Electrical failures']);expect(ew.purchase.claimsRemaining).toBe(2);
});
it('requires authenticated customer ownership and validates IDs/cursors',async()=>{
 const c=await setup(),other=await customer(),provider=await customer('service_provider');
 await request(app).get(path(c.amc.id)).expect(401);await request(app).get(path(c.amc.id)).set(other.auth).expect(404);await request(app).get(path(c.amc.id)).set(provider.auth).expect(403);
 await request(app).get(path('invalid')).set(c.auth).expect(400);await request(app).get(path(c.amc.id)).query({before:'yesterday'}).set(c.auth).expect(400);
});
it('reports payment, expiry, verification and exhausted allowances truthfully',async()=>{
 const c=await setup();for(const [update,state] of [[{paid:false},'Payment pending'],[{paid:true,expiryDate:new Date(0)},'Expired'],[{expiryDate:new Date(Date.now()+86400000),visitsRemaining:0},'Allowance used']]){
 await AMCSubscription.updateOne({_id:c.amc._id},{$set:update});const data=(await request(app).get(path(c.amc.id)).set(c.auth).expect(200)).body.data;expect(data.state).toBe(state);expect(data.eligible).toBe(false);}
 await ExtendedWarrantyOrder.updateOne({_id:c.ew._id},{$set:{verificationStatus:'Rejected'}});expect((await request(app).get(path(c.ew.id,'extended-warranty')).set(c.auth)).body.data.state).toBe('Verification rejected');
});
it('names the actual coverage in quotes and honors a chosen AMC even with an active extended warranty',async()=>{
 const c=await setup(),offering=await seedSimpleOffering();
 const body={lines:[{offeringId:offering.id,quantity:1}],warranty:{brand:'Any Brand',applianceId:c.appliance.id}};
 const auto=(await request(app).post('/api/v1/catalog/quote').set(c.auth).send(body).expect(200)).body.data;
 expect(auto.coverageSource).toMatchObject({kind:'extended-warranty',id:c.ew.id,name:'AC Extended Protect'});
 const selected={...body,warranty:{...body.warranty,protection:{kind:'amc',id:c.amc.id}}};
 const quote=(await request(app).post('/api/v1/catalog/quote').set(c.auth).send(selected).expect(200)).body.data;expect(quote.coverageSource).toMatchObject({kind:'amc',id:c.amc.id,name:'AC Silver Care'});expect(quote.totals.final).toBe(0);
 const result=(await request(app).post('/api/v1/bookings').set(c.auth).send({offeringId:offering.id,quantity:1,expectedFinalAmount:0,brand:'Any Brand',applianceId:c.appliance.id,protection:{kind:'amc',id:c.amc.id},issueDescription:'AC not cooling',paymentMode:'after',address:{city:'Indore'}}).expect(201)).body.data;
 expect(result.serviceRequest.amcSubscription).toBe(c.amc.id);expect(result.serviceRequest.extendedWarrantyOrder).toBeNull();expect(result.serviceRequest.description).toContain('AC not cooling');
 await request(app).post(`/api/v1/bookings/${result.booking.id}/cancel`).set(c.auth).send({reason:'Test cancellation'}).expect(200);
 const details=(await request(app).get(path(c.amc.id)).set(c.auth)).body.data;expect(details.history[0].status).toBe('Cancelled');expect(details.purchase.visitsRemaining).toBe(2);
 expect((await request(app).get(path(c.ew.id,'extended-warranty')).set(c.auth)).body.data.history).toHaveLength(0);
});
it('does not substitute another plan for a foreign, expired, exhausted or wrong-appliance selection',async()=>{
 const c=await setup(),other=await customer(),offering=await seedSimpleOffering();
 const body={lines:[{offeringId:offering.id,quantity:1}],warranty:{brand:'Any Brand',applianceId:c.appliance.id,protection:{kind:'amc',id:c.amc.id}}};
 await request(app).post('/api/v1/catalog/quote').set(other.auth).send({...body,warranty:{brand:'Any Brand',protection:body.warranty.protection}}).expect(404);
 await AMCSubscription.updateOne({_id:c.amc._id},{$set:{visitsRemaining:0}});await request(app).post('/api/v1/catalog/quote').set(c.auth).send(body).expect(400);
 await AMCSubscription.updateOne({_id:c.amc._id},{$set:{visitsRemaining:3,expiryDate:new Date(0)}});await request(app).post('/api/v1/catalog/quote').set(c.auth).send(body).expect(400);
 await AMCSubscription.updateOne({_id:c.amc._id},{$set:{expiryDate:new Date(Date.now()+86400000)}});const another=await OwnedAppliance.create({user:c.user._id,category:'AC',brand:'Any Brand',serialNumber:'UNIT-2'});
 await request(app).post('/api/v1/catalog/quote').set(c.auth).send({...body,warranty:{...body.warranty,applianceId:another.id}}).expect(400);
 await request(app).post('/api/v1/catalog/quote').set(c.auth).send({...body,lines:[{offeringId:offering.id,quantity:2}]}).expect(400);
});
it('paginates the complete plan service history without mixing another plan',async()=>{
 const c=await setup();await ServiceRequest.insertMany(Array.from({length:105},()=>({user:c.user._id,amcSubscription:c.amc._id,createdAt:new Date('2026-01-01')})));
 const first=(await request(app).get(path(c.amc.id)).set(c.auth).expect(200)).body.data;expect(first.history).toHaveLength(100);
 const next=(await request(app).get(path(c.amc.id)).query(first.nextCursor).set(c.auth).expect(200)).body.data;expect(next.history).toHaveLength(5);expect(new Set([...first.history,...next.history].map(h=>h.id)).size).toBe(105);
});

it('includes historical jobs linked to the policy even when their older service request has no policy reference',async()=>{
 const c=await setup(),foreign=await customer();
 for(const user of [c.user,foreign.user]) {
  const sr=await ServiceRequest.create({user:user._id,category:'AC',status:'Closed'});
  await Job.create({serviceRequest:sr._id,serviceProvider:new mongoose.Types.ObjectId(),type:'AMC Visit',amc:{amcSubscription:c.amc._id,visitNumber:1}});
 }
 const data=(await request(app).get(path(c.amc.id)).set(c.auth).expect(200)).body.data;
 expect(data.history).toHaveLength(1);expect(data.history[0].status).toBe('Closed');
});
