import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { AMCPlan } from './amcPlan.model.js';
import { AMCSubscription } from './amcSubscription.model.js';
import { ExtendedWarrantyPlan } from './extendedWarrantyPlan.model.js';
import { ExtendedWarrantyOrder } from './extendedWarrantyOrder.model.js';
import { ProtectionCheckout } from './protectionCheckout.model.js';
import { OwnedAppliance } from '../service-requests/ownedAppliance.model.js';
import { CatalogueBrand } from '../catalog/catalogueBrand.model.js';
import { Category } from '../catalog/category.model.js';
import { User } from '../auth/user.model.js';
import { Payment } from '../payments-wallet/payment.model.js';
import { createRazorpayOrder, verifyRazorpaySignature, verifyCapturedPayment, findCapturedPayment } from '../payments-wallet/paymentGateway.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';

const purchaseModel=kind=>kind==='amc'?AMCSubscription:ExtendedWarrantyOrder;
const targetType=kind=>kind==='amc'?'amc':'extended_warranty';
function endDate(months,now=new Date()){const end=new Date(now);const day=end.getDate();end.setDate(1);end.setMonth(end.getMonth()+months);const last=new Date(end.getFullYear(),end.getMonth()+1,0).getDate();end.setDate(Math.min(day,last));return end;}
const sum=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
async function owned(userId,key){const checkout=await ProtectionCheckout.findOne({user:userId,key});if(!checkout)throw new ApiError(404,'Checkout not found');return checkout;}
async function view(checkout){
  const purchase=await purchaseModel(checkout.kind).findOne({_id:checkout.purchase,user:checkout.user}).populate(checkout.kind==='amc'?'plan':'appliance');
  if(!purchase)throw new ApiError(404,'Protection purchase not found');
  const json=purchase.toJSON();
  const purchaseView=checkout.kind==='amc'&&purchase.planSnapshot?{...json,plan:{...json.plan,...json.planSnapshot}}:json;
  return {key:checkout.key,kind:checkout.kind,amount:checkout.amount,purchase:purchaseView,invoice:checkout.invoiceName?{name:checkout.invoiceName,mimeType:checkout.invoiceMimeType}:null};
}
export async function inspectCheckout(userId,key){return view(await owned(userId,key));}

export async function assess(kind,planId,userId,applianceId,invoiceFileId){
  const plan=await (kind==='amc'?AMCPlan:ExtendedWarrantyPlan).findOne({_id:planId,isActive:true});
  if(!plan)throw new ApiError(404,'This plan is no longer available');
  const appliance=await OwnedAppliance.findOne({_id:applianceId,user:userId,deletedAt:null});
  if(!appliance)throw new ApiError(404,'Appliance not found');
  if(plan.applianceCategory&&plan.applianceCategory!==appliance.category)throw new ApiError(400,'This plan does not cover that appliance category');
  const [brand,category]=await Promise.all([
    CatalogueBrand.findOne({nameKey:String(appliance.brand||'').trim().toLowerCase(),categories:appliance.category,isActive:true}),
    Category.exists({key:appliance.category,isActive:true}),
  ]);
  if(!brand||!category)throw new ApiError(400,'This brand is not currently offered for protection in the selected category');
  const count=kind==='amc'?plan.visitsTotal:plan.claimsTotal;
  if(!(count>0))throw new ApiError(400,'No service allowance is configured for this plan. Contact NCC before purchasing.');
  if(!(appliance.modelNumber||appliance.model)?.trim())throw new ApiError(400,'Add the model number to your saved appliance');
  if(appliance.purchaseDate&&appliance.purchaseDate>new Date())throw new ApiError(400,'Purchase date cannot be in the future');
  const maxMonths=plan.maxApplianceAgeMonths;
  if(maxMonths!=null){
    if(!appliance.purchaseDate)throw new ApiError(400,'Add the appliance purchase date to check eligibility');
    if(endDate(maxMonths,appliance.purchaseDate)<new Date())throw new ApiError(400,`This plan covers appliances up to ${maxMonths} months old`);
  }
  const invoice=invoiceFileId?appliance.documents.find(d=>String(d.fileId)===invoiceFileId&&d.kind==='invoice'):null;
  if(invoiceFileId&&!invoice)throw new ApiError(400,'Choose a purchase invoice belonging to this appliance');
  if(plan.requiresInvoice&&!invoice)throw new ApiError(400,'This plan requires the appliance purchase invoice');
  return {plan,appliance,brand,invoice};
}
export async function prepareCheckout(userId,data){
  const fingerprint=sum({kind:data.kind,plan:data.plan,appliance:data.appliance,pincode:data.pincode,invoiceFileId:data.invoiceFileId||null});
  let checkout=await ProtectionCheckout.findOne({user:userId,key:data.key});
  if(checkout){if(checkout.fingerprint!==fingerprint)throw new ApiError(409,'This checkout already belongs to another selection. Start a new checkout.');return view(checkout);}
  const {plan,appliance,brand,invoice}=await assess(data.kind,data.plan,userId,data.appliance,data.invoiceFileId);
  if(plan.price!==data.expectedPrice)throw new ApiError(409,'The plan price changed. Reload and review the updated price before paying.');
  let invoiceData;
  if(invoice){
    if(invoice.size>10*1024*1024)throw new ApiError(400,'Invoice must be 10 MB or smaller');
    const bucket=new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'applianceDocuments'});
    if(!(await bucket.find({_id:invoice.fileId}).hasNext()))throw new ApiError(400,'The selected invoice is no longer available');
    const chunks=[];let size=0;for await(const chunk of bucket.openDownloadStream(invoice.fileId)){size+=chunk.length;if(size>10*1024*1024)throw new ApiError(400,'Invoice must be 10 MB or smaller');chunks.push(chunk);}invoiceData=Buffer.concat(chunks);
  }
  const user=await User.findById(userId).select('name phone email');
  const months=data.kind==='amc'?plan.durationMonths:plan.durationYears*12;
  const snapshot=data.kind==='amc'?{name:plan.name,tier:plan.tier,description:plan.description,benefits:plan.benefits,price:plan.price,durationMonths:months,visitsTotal:plan.visitsTotal,requiresInvoice:plan.requiresInvoice,maxApplianceAgeMonths:plan.maxApplianceAgeMonths}
    :{name:plan.name,description:plan.description,features:plan.features,price:plan.price,durationYears:plan.durationYears,claimsTotal:plan.claimsTotal,requiresInvoice:plan.requiresInvoice,maxApplianceAgeMonths:plan.maxApplianceAgeMonths};
  const session=await mongoose.startSession();
  try{await session.withTransaction(async()=>{
    const common={user:userId,appliance:appliance._id,applianceCategory:appliance.category,brand:brand.name,pincode:data.pincode,paid:plan.price===0,paidAt:plan.price===0?new Date():undefined,checkoutKey:data.key,planSnapshot:snapshot};
    const payload=data.kind==='amc'?{...common,plan:plan._id,model:appliance.modelNumber||appliance.model,installationDate:appliance.purchaseDate,expiryDate:endDate(months),visitsTotal:plan.visitsTotal,visitsRemaining:plan.visitsTotal}
      :{...common,tierId:plan.id,planName:plan.name,price:plan.price,fullName:user.name,mobile:user.phone,email:user.email,modelNumber:appliance.modelNumber||appliance.model,purchaseDate:appliance.purchaseDate,validTill:endDate(months),coverage:plan.features,terms:plan.description,claimsTotal:plan.claimsTotal,claimsRemaining:plan.claimsTotal};
    const [purchase]=await purchaseModel(data.kind).create([payload],{session});
    [checkout]=await ProtectionCheckout.create([{user:userId,key:data.key,kind:data.kind,fingerprint,purchase:purchase._id,amount:plan.price,durationMonths:months,invoiceName:invoice?.name,invoiceMimeType:invoice?.mimeType,invoiceData}],{session});
  });}catch(error){
    if(error.code!==11000)throw error;
    checkout=await ProtectionCheckout.findOne({user:userId,key:data.key});
    if(!checkout||checkout.fingerprint!==fingerprint)throw new ApiError(409,'Checkout is already being prepared. Retry shortly.');
  }finally{await session.endSession();}
  return view(checkout);
}
function gateway(payment){return {orderId:payment.gatewayRef,amount:Math.round(payment.amount*100),currency:'INR',keyId:env.razorpay.keyId};}
export async function initiatePayment(userId,key){
  const checkout=await owned(userId,key), model=purchaseModel(checkout.kind);
  const purchase=await model.findById(checkout.purchase);
  if(purchase.paid)return {...await view(checkout),razorpay:null};
  const filter={user:userId,targetType:targetType(checkout.kind),targetId:purchase._id};
  const existing=await Payment.findOne({...filter,status:{$in:['Pending','Success']}}).sort({createdAt:-1});
  if(existing)return {...await view(checkout),razorpay:gateway(existing)};
  const lock=await ProtectionCheckout.findOneAndUpdate({_id:checkout._id,$or:[{paymentPreparingAt:null},{paymentPreparingAt:{$lt:new Date(Date.now()-120000)}}]},{$set:{paymentPreparingAt:new Date()}});
  if(!lock)throw new ApiError(409,'Payment is being prepared. Retry shortly.');
  try{
    const already=await Payment.findOne({...filter,status:{$in:['Pending','Success']}}).sort({createdAt:-1});
    if(already)return {...await view(checkout),razorpay:gateway(already)};
    const order=await createRazorpayOrder({amount:checkout.amount,receipt:`${checkout.kind==='amc'?'amc':'ew'}_${purchase.id}`,notes:{protectionCheckout:key,targetId:purchase.id}});
    const payment=await Payment.create({...filter,amount:checkout.amount,method:'UPI',status:'Pending',gatewayRef:order.id});
    return {...await view(checkout),razorpay:gateway(payment)};
  }finally{await ProtectionCheckout.updateOne({_id:checkout._id},{$set:{paymentPreparingAt:null}});}
}
export async function confirmCheckout(userId,key,data,{reconcile=false}={}){
  const checkout=await owned(userId,key),model=purchaseModel(checkout.kind);
  const purchase=await model.findById(checkout.purchase);
  if(purchase.paid){
    if(data.razorpayPaymentId){const previous=await Payment.findOne({targetType:targetType(checkout.kind),targetId:purchase._id,status:'Success'});if(previous&&previous.razorpayPaymentId!==data.razorpayPaymentId)throw new ApiError(409,'Purchase was paid with another payment');}
    return view(checkout);
  }
  const payment=await Payment.findOne({user:userId,targetType:targetType(checkout.kind),targetId:purchase._id,status:{$in:['Pending','Success']}}).sort({createdAt:-1});
  if(!payment)throw new ApiError(400,'Start payment first');
  let paymentId=data.razorpayPaymentId;
  if(reconcile){paymentId=await findCapturedPayment(payment.gatewayRef);if(!paymentId)throw new ApiError(409,'No captured payment was found yet. Wait briefly and check again.');}
  else if(!verifyRazorpaySignature({orderId:payment.gatewayRef,paymentId,signature:data.razorpaySignature}))throw new ApiError(400,'Payment signature verification failed');
  const capture=await verifyCapturedPayment({orderId:payment.gatewayRef,paymentId,amount:checkout.amount});
  const session=await mongoose.startSession();
  try{await session.withTransaction(async()=>{
    const other=await Payment.exists({razorpayPaymentId:paymentId,status:'Success',_id:{$ne:payment._id}}).session(session);
    if(other)throw new ApiError(409,'This payment was already used');
    const paidAt=new Date();
    await Payment.updateOne({_id:payment._id},{$set:{status:'Success',razorpayPaymentId:paymentId,method:({card:'Card',netbanking:'NetBanking',wallet:'Wallet'})[capture.method]||'UPI'}},{session});
    await model.updateOne({_id:purchase._id,paid:false},{$set:{paid:true,paidAt,[checkout.kind==='amc'?'expiryDate':'validTill']:endDate(checkout.durationMonths,paidAt)}},{session});
  });}finally{await session.endSession();}
  return view(checkout);
}
