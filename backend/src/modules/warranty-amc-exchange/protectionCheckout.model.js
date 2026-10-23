import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
const schema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  key:{type:String,required:true}, kind:{type:String,enum:['amc','extended-warranty'],required:true},
  fingerprint:{type:String,required:true}, purchase:{type:mongoose.Schema.Types.ObjectId,required:true},
  amount:{type:Number,required:true}, durationMonths:{type:Number,required:true},
  paymentPreparingAt:{type:Date,default:null},
  invoiceName:String,invoiceMimeType:String,invoiceData:{type:Buffer,select:false},
},{timestamps:true});
schema.index({key:1},{unique:true});
schema.index({user:1,createdAt:-1});
schema.index({purchase:1},{unique:true});
applyStandardPlugins(schema);
export const ProtectionCheckout=mongoose.models.ProtectionCheckout||mongoose.model('ProtectionCheckout',schema);
