import { recordAction } from '../shared/auditLog.js';
import { actorFromUser } from './actor.js';
export async function securityAudit(user, action, meta) {
  if (user?.role !== 'brand_admin') return;
  await recordAction({brand:user.brand,entityType:'user',entityId:user._id,action,actor:await actorFromUser(user._id,'brand'),meta});
}
