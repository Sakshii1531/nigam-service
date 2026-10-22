import { beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { ensureIndexes } from '../src/config/db.js';
import { testDbUri } from './helpers/testDb.js';
import { listenOnLoopback, closeServer } from './helpers/loopbackServer.js';
import { awaitPendingDeliveries } from '../src/modules/notifications/notification.service.js';
import { User } from '../src/modules/auth/user.model.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Job } from '../src/modules/service-provider/job.model.js';
import { Booking } from '../src/modules/booking/booking.model.js';
import { ServiceRequest } from '../src/modules/service-requests/serviceRequest.model.js';
import { seedSimpleOffering, offeringBooking } from './helpers/catalogue.js';
let app, phone=9461200000;
beforeAll(async () => { await registerAllModels(); await mongoose.connect(testDbUri('myAppliances')); await ensureIndexes(); app=await listenOnLoopback(createApp()); });
afterAll(async () => { await awaitPendingDeliveries(); await closeServer(app); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
beforeEach(async () => { await awaitPendingDeliveries(); await Promise.all(Object.values(mongoose.models).map(m=>m.deleteMany({}))); });
async function customer(role='customer') {
  const user=await User.create({ role, phone:String(phone++), name:'Appliance owner', passwordHash:'test-only' });
  return { user, auth:{Authorization:`Bearer ${signAccessToken({sub:String(user._id),role})}`} };
}
async function add(c, data={}) { return (await request(app).post('/api/v1/appliances').set(c.auth).send({category:'AC',brand:'Test Brand',nickname:'Bedroom AC',modelNumber:'M-1',...data}).expect(201)).body.data; }
const filePath=(a,d)=>`/api/v1/appliances/${a.id}/documents${d ? `/${d.fileId}` : ''}`;
it('supports any category and brand, editing, separate identical units and personal warranty dates without free coverage',async()=>{
  const c=await customer();await Brand.create({name:'Test Brand'});
  const a=await add(c,{category:'IT & Computer',createSeparateUnit:true,manufacturerWarrantyEndsOn:'2030-01-01'});
  const b=await add(c,{category:'IT & Computer',createSeparateUnit:true});expect(a.id).not.toBe(b.id);
  expect(a.warrantyStatus).toBe('Out of Warranty');
  const edited=await request(app).patch(`/api/v1/appliances/${a.id}`).set(c.auth).send({nickname:'Work laptop',serialNumber:'WORK-1',notes:'Upgraded RAM',purchaseDate:null}).expect(200);
  expect(edited.body.data).toMatchObject({nickname:'Work laptop',serialNumber:'WORK-1',notes:'Upgraded RAM'});
  for(const category of ['Electronics','Mobile & Gadgets','Bathware','Other personal products'])await add(c,{category,brand:'Any local manufacturer',createSeparateUnit:true});
  const list=await request(app).get('/api/v1/appliances').set(c.auth).expect(200);expect(list.body.data).toHaveLength(6);
});
it('requires customer ownership for every appliance, history and document operation',async()=>{
  const c=await customer(),other=await customer(),provider=await customer('service_provider'),a=await add(c);
  await request(app).get('/api/v1/appliances').expect(401);
  await request(app).get('/api/v1/appliances').set(provider.auth).expect(403);
  for(const method of ['get','patch','delete'])await request(app)[method](`/api/v1/appliances/${a.id}`).set(other.auth).send({nickname:'Intruder'}).expect(403);
  await request(app).get(`/api/v1/appliances/${a.id}/history`).set(other.auth).expect(403);
  await request(app).post(filePath(a)).set(other.auth).field('kind','invoice').attach('file',Buffer.from('%PDF-1.4\n%%EOF'),{filename:'invoice.pdf',contentType:'application/pdf'}).expect(404);
});
it('stores PDFs and real photos privately, downloads only for their owner and removes deleted files',async()=>{
  const c=await customer(),other=await customer(),a=await add(c);
  const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
  const saved=(await request(app).post(filePath(a)).set(c.auth).field('kind','invoice').attach('file',pdf,{filename:'purchase.pdf',contentType:'application/pdf'}).expect(201)).body.data;
  await request(app).get(filePath(a,saved)).expect(401);
  await request(app).get(filePath(a,saved)).set(other.auth).expect(404);
  const download=await request(app).get(filePath(a,saved)).set(c.auth).expect(200);
  expect(download.headers['cache-control']).toBe('private, no-store');expect(download.headers['content-type']).toContain('application/pdf');expect(download.body.equals(pdf)).toBe(true);
  const image=await sharp({create:{width:16,height:16,channels:3,background:'blue'}}).png().toBuffer();
  const photo=(await request(app).post(filePath(a)).set(c.auth).field('kind','photo').attach('file',image,{filename:'appliance.png',contentType:'image/png'}).expect(201)).body.data;
  await request(app).get(filePath(a,photo)).set(c.auth).expect('Content-Type',/image\/png/).expect(200);
  const b=await add(c,{serialNumber:'OTHER'});await request(app).get(filePath(b,saved)).set(c.auth).expect(404);
  await request(app).delete(filePath(a,saved)).set(c.auth).expect(200);
  await request(app).get(filePath(a,saved)).set(c.auth).expect(404);
  expect(await mongoose.connection.db.collection('applianceDocuments.files').findOne({_id:new mongoose.Types.ObjectId(saved.fileId)})).toBeNull();
  await request(app).delete(`/api/v1/appliances/${a.id}`).set(c.auth).expect(200);
  expect(await mongoose.connection.db.collection('applianceDocuments.files').findOne({_id:new mongoose.Types.ObjectId(photo.fileId)})).toBeNull();
});
it('refuses disguised or unsupported documents, invalid kinds and oversized uploads',async()=>{
  const c=await customer(),a=await add(c);
  for(const [kind,type,buffer] of [['photo','image/png',Buffer.from('not an image')],['invoice','application/pdf',Buffer.from('<script>bad</script>')],['unknown','application/pdf',Buffer.from('%PDF-1.4')],['photo','application/pdf',Buffer.from('%PDF-1.4')],['invoice','text/html',Buffer.from('<html>')]])await request(app).post(filePath(a)).set(c.auth).field('kind',kind).attach('file',buffer,{filename:'test.file',contentType:type}).expect(400);
  const large=await request(app).post(filePath(a)).set(c.auth).field('kind','invoice').attach('file',Buffer.alloc(10*1024*1024+1),{filename:'big.pdf',contentType:'application/pdf'}).expect(400);
  expect(large.body.error.message).toMatch(/10 MB/);
});
it('links the chosen unit only, keeps unsaved bookings separate and preserves history after deletion',async()=>{
  const c=await customer(),other=await customer();await seedSimpleOffering();
  const a=await add(c),b=await add(c,{serialNumber:'SECOND'});
  async function book(extra) { return (await request(app).post('/api/v1/bookings').set(c.auth).send(await offeringBooking('TEST-REPAIR',{brand:'Test Brand',paymentMode:'after',...extra})).expect(201)).body.data; }
  await request(app).post('/api/v1/bookings').set(c.auth).send(await offeringBooking('TEST-REPAIR',{applianceId:a.id,quantity:2,paymentMode:'after'})).expect(400);
  const first=await book({applianceId:a.id});const second=await book({applianceId:b.id});
  await Job.create({serviceRequest:second.serviceRequest.id,serviceProvider:new mongoose.Types.ObjectId(),type:'NCC Paid Service',activeStep:'completed',billingEstimate:{total:2250}});
  await Booking.updateOne({_id:second.booking.id},{$set:{status:'Completed'}});
  const secondHistory=(await request(app).get(`/api/v1/appliances/${b.id}/history`).set(c.auth).expect(200)).body.data;expect(secondHistory[0]).toMatchObject({total:2250,amountType:'final'});
  const unsaved=await book({newAppliance:true});
  expect(unsaved.serviceRequest.appliance).toBeNull();expect(await OwnedAppliance.countDocuments({user:c.user._id})).toBe(2);
  await request(app).post('/api/v1/bookings').set(other.auth).send(await offeringBooking('TEST-REPAIR',{applianceId:a.id,paymentMode:'after'})).expect(404);
  let history=(await request(app).get(`/api/v1/appliances/${a.id}/history`).set(c.auth).expect(200)).body.data;
  expect(history).toHaveLength(1);expect(history[0].bookingId).toBe(first.booking.id);
  await request(app).post(`/api/v1/bookings/${first.booking.id}/cancel`).set(c.auth).send({reason:'Test cancellation'}).expect(200);
  history=(await request(app).get(`/api/v1/appliances/${a.id}/history`).set(c.auth).expect(200)).body.data;expect(history[0].status).toBe('Cancelled');
  await request(app).delete(`/api/v1/appliances/${a.id}`).set(c.auth).expect(200);
  expect((await request(app).get('/api/v1/appliances').set(c.auth)).body.data).toHaveLength(1);
  expect((await ServiceRequest.findById(first.serviceRequest.id)).appliance.toString()).toBe(a.id);
  await request(app).get(`/api/v1/bookings/${first.booking.id}`).set(c.auth).expect(200);
  await request(app).post('/api/v1/bookings').set(c.auth).send(await offeringBooking('TEST-REPAIR',{applianceId:a.id,paymentMode:'after'})).expect(404);
});

it('handles simultaneous registration of the same serial without overwriting a saved unit',async()=>{
  const c=await customer();await Brand.create({name:'Test Brand'});
  const body={category:'AC',brand:'Test Brand',serialNumber:'UNIQUE-UNIT',createSeparateUnit:true};
  const responses=await Promise.all(['One','Two'].map(nickname=>request(app).post('/api/v1/appliances').set(c.auth).send({...body,nickname})));
  expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
  expect(await OwnedAppliance.countDocuments({user:c.user._id})).toBe(1);
});

it('paginates older service history without omissions or duplicate entries',async()=>{
  const c=await customer(),a=await add(c);
  await ServiceRequest.insertMany(Array.from({length:105},(_,i)=>({user:c.user._id,appliance:a.id,category:'AC',description:`Service ${i}`,createdAt:new Date('2026-01-01'),status:'Closed'})));
  const first=(await request(app).get(`/api/v1/appliances/${a.id}/history`).set(c.auth).expect(200)).body.data;
  expect(first).toHaveLength(100);const last=first.at(-1);
  const next=(await request(app).get(`/api/v1/appliances/${a.id}/history`).query({before:last.date,beforeId:last.id}).set(c.auth).expect(200)).body.data;
  expect(next).toHaveLength(5);expect(new Set([...first,...next].map(r=>r.id)).size).toBe(105);
});
