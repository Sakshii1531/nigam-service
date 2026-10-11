import { WarrantyClaim } from '../partner-warranty/warrantyClaim.model.js';
import { appendEvent, flushAudit } from '../partner-warranty/claimTimeline.js';
// Append-only notification history must not invalidate a concurrently open decision.
// Both this write and normal claim saves use atomic timeline $push operations.
export async function recordTicketNotification(notification,channel,template) {
  if(!notification.warrantyClaim||!notification.recipient)return;
  const duplicate={action:'CUSTOMER_NOTIFIED','meta.notificationId':String(notification._id),'meta.channel':channel};
  const scope=notification.brand?{brand:notification.brand}:{};
  const c=await WarrantyClaim.findOne({_id:notification.warrantyClaim,customer:notification.recipient,...scope,timeline:{$not:{$elemMatch:duplicate}}});
  if(!c)return;
  appendEvent(c,{action:'CUSTOMER_NOTIFIED',actor:{kind:'system',name:'NCC'},visibility:'brand',note:`Customer notification: ${notification.title}`,meta:{notificationId:String(notification._id),title:notification.title,channel,template,delivery:'accepted'}});
  const result=await WarrantyClaim.updateOne({_id:c._id,...scope,timeline:{$not:{$elemMatch:duplicate}}},{$push:{timeline:c.timeline.at(-1).toObject()}});
  if(result.modifiedCount)await flushAudit(c);
}
