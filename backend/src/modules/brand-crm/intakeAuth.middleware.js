import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiKey } from './apiKey.model.js';
import { IntakeWindow } from './intakeWindow.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { recordAction } from '../shared/auditLog.js';
export async function intakeAuth(req,res,next) {
  try {
    const match=/^Bearer ncc_live_([a-f\d]{8})_([a-f\d]{32})$/i.exec(req.headers.authorization || '');
    const key=match ? await ApiKey.findOne({prefix:match[1]}).select('+hash').lean() : null;
    const actual=createHash('sha256').update(match?.[2] || '').digest();
    const expected=Buffer.from(key?.hash || '0'.repeat(64),'hex');
    if(!timingSafeEqual(actual,expected)||!key||key.revokedAt){
      const minute=Math.floor(Date.now()/60000);
      await IntakeWindow.updateOne({_id:`auth:${minute}`},{$inc:{count:1},$set:{expiresAt:new Date((minute+2)*60000)}},{upsert:true});
      throw new ApiError(401,'Invalid or revoked integration key');
    }
    req.integration={keyId:key._id,brand:key.brand,scopes:key.scopes,allowedSources:key.allowedSources,actor:{kind:'integration',name:key.name}};
    const minute=Math.floor(Date.now()/60000);
    const window=await IntakeWindow.findOneAndUpdate({_id:`${key._id}:${minute}`},{$inc:{count:1},$set:{expiresAt:new Date((minute+2)*60000)}},{upsert:true,new:true});
    if(window.count>key.rateLimit){res.set('Retry-After',String(60-Math.floor(Date.now()/1000)%60));throw new ApiError(429,'Integration rate limit exceeded');}
    await ApiKey.updateOne({_id:key._id,$or:[{lastUsedAt:null},{lastUsedAt:{$lt:new Date(Date.now()-60000)}}]},{$set:{lastUsedAt:new Date()}});
    next();
  }catch(e){next(e);}
}
export const intakeScope = scope => (req,res,next) => req.integration.scopes.includes(scope) ? next() : next(new ApiError(403,`Missing scope: ${scope}`));
export async function intakeAudit(req,action,reason,entityId=null) {
  await recordAction({brand:req.integration?.brand || req.intakeBrand || null,entityType:'intake',entityId,action,
    actor:req.integration?.actor || {kind:'integration',name:'Unauthenticated'},reason,
    meta:{method:req.method,endpoint:req.route?.path || '/',integrationId:req.integration?.keyId ? String(req.integration.keyId) : null}});
}
