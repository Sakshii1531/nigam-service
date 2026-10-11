import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { ApiKey, INTAKE_SCOPES } from './apiKey.model.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { actorFromReq } from './actor.js';
import { recordAction } from '../shared/auditLog.js';
import { fieldDiff } from '../shared/auditContext.js';
import { ok } from '../../utils/respond.js';
export const keySchema = z.object({ name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(INTAKE_SCOPES)).min(1).max(4), allowedSources: z.array(z.enum(['whatsapp','api'])).min(1).max(2),
}).strict();
const view = k => ({ id: String(k._id), name: k.name, prefix: k.prefix, scopes: k.scopes, allowedSources: k.allowedSources,
  lastUsedAt: k.lastUsedAt || null, revokedAt: k.revokedAt || null, createdAt: k.createdAt });
export function apiKeyRouter({ platform = false } = {}) {
  const router = Router();
  if (platform) router.use(requireAuth, requireRole('super_admin'));
  const handle = fn => async (req,res,next) => { try { await fn(req,res); } catch(e) { next(e.name==='ZodError' ? new ApiError(400,'Validation failed',e.flatten()) : e); } };
  const tenant = req => platform ? null : req.user.brand;
  const audit = async (req, key, action, before) => recordAction({ brand: tenant(req), entityType: 'api_key', entityId: key._id,
    action, actor: await actorFromReq(req), meta: { prefix: key.prefix, changes: fieldDiff(before || {},view(key),['name','scopes','allowedSources','revokedAt']) } });
  router.get('/',handle(async(req,res)=>{const keys=await ApiKey.find({brand:tenant(req)}).sort({createdAt:-1}).lean();
    await recordAction({brand:tenant(req),entityType:'api_key',action:'api_key.listed',actor:await actorFromReq(req)}); ok(res,keys.map(view));}));
  router.post('/',handle(async(req,res)=>{const data=keySchema.parse(req.body),secret=randomBytes(16).toString('hex');
    const key=await ApiKey.create({...data,brand:tenant(req),createdBy:req.user.id,prefix:randomBytes(4).toString('hex'),hash:createHash('sha256').update(secret).digest('hex')});
    await audit(req,key,'api_key.created'); ok(res,{...view(key),secret:`ncc_live_${key.prefix}_${secret}`},{},201);}));
  router.patch('/:id',handle(async(req,res)=>{if(!/^[a-f\d]{24}$/i.test(req.params.id))throw new ApiError(404,'Key not found');
    const data=keySchema.partial().refine(d=>Object.keys(d).length>0).parse(req.body);
    const key=await ApiKey.findOne({_id:req.params.id,brand:tenant(req),revokedAt:null});if(!key)throw new ApiError(404,'Active key not found');
    const before=view(key);Object.assign(key,data);await key.save();await audit(req,key,'api_key.updated',before);ok(res,view(key));}));
  router.post('/:id/revoke',handle(async(req,res)=>{if(!/^[a-f\d]{24}$/i.test(req.params.id))throw new ApiError(404,'Key not found');
    const key=await ApiKey.findOne({_id:req.params.id,brand:tenant(req)});if(!key)throw new ApiError(404,'Key not found');
    const before=view(key);key.revokedAt ||= new Date();await key.save();await audit(req,key,'api_key.revoked',before);ok(res,view(key));}));
  return router;
}
