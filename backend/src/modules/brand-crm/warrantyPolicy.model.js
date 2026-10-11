import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
import { SERVICE_TYPES } from '../partner-warranty/ticketConstants.js';
const schema=new mongoose.Schema({
 brand:{type:mongoose.Schema.Types.ObjectId,ref:'Brand',required:true,index:true},
 policyKey:{type:mongoose.Schema.Types.ObjectId,required:true},name:{type:String,required:true},version:{type:Number,default:1},isActive:{type:Boolean,default:true},
 appliesTo:{category:{type:mongoose.Schema.Types.ObjectId,ref:'Category',default:null},productType:{type:mongoose.Schema.Types.ObjectId,ref:'ProductType',default:null},modelPattern:{type:String,default:null}},
 warrantyMonths:{type:Number,required:true},partsWarrantyMonths:Number,labourWarrantyMonths:Number,
 coverage:{coveredServices:[{type:String,enum:SERVICE_TYPES}],nonCoveredServices:[{type:String,enum:SERVICE_TYPES}],partsCovered:Boolean,labourCovered:Boolean,
  visitCharge:{payer:{type:String,enum:['brand','customer','none'],default:'brand'},amount:{type:Number,default:0}},excludedIssues:[{type:mongoose.Schema.Types.ObjectId,ref:'WarrantyIssue'}],conditions:String},
 requireInvoice:{type:Boolean,default:true},requireSerial:{type:Boolean,default:true},requireSerialInRegistry:{type:Boolean,default:false},effectiveFrom:Date,effectiveTo:Date,
},{timestamps:true});
schema.index({brand:1,policyKey:1,version:1},{unique:true});
schema.index({brand:1,policyKey:1},{unique:true,partialFilterExpression:{isActive:true}});
brandScopeGuard(schema);
applyStandardPlugins(schema);
export const WarrantyPolicy=mongoose.models.WarrantyPolicy||mongoose.model('WarrantyPolicy',schema);
