import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
const schema=new mongoose.Schema({brand:{type:mongoose.Schema.Types.ObjectId,ref:'Brand',required:true},serialNumber:{type:String,trim:true,uppercase:true,required:true},modelNumber:{type:String,trim:true,uppercase:true},category:{type:mongoose.Schema.Types.ObjectId,ref:'Category'},manufacturedOn:Date,soldOn:Date,warrantyStartsOn:Date},{timestamps:true});
schema.index({brand:1,serialNumber:1},{unique:true});brandScopeGuard(schema);applyStandardPlugins(schema);
export const ProductSerial=mongoose.models.ProductSerial||mongoose.model('ProductSerial',schema);
